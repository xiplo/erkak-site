// ERKAK shop API · Node 22, без зависимостей: http + node:sqlite + SMTP + Telegram.
// Запуск: node server.mjs            (переменные из /opt/erkak/.env через systemd)
// CLI:    node server.mjs status EK-260905-1234 shipped [трек]
//         node server.mjs orders [n]
//         node server.mjs payments [n]
// Оплата: Payme Merchant API, Click SHOP API, Stripe Checkout. Статус «Оплачен» ставится по подтверждению платёжной системы.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import tls from 'node:tls';
import net from 'node:net';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

const ENV = process.env;
const PORT = +(ENV.PORT || 8795);
const DATA_DIR = ENV.DATA_DIR || path.join(process.cwd(), 'data');
const STATIC_DIR = ENV.STATIC_DIR || '/var/www/erkak.com';
const ORIGIN = ENV.PUBLIC_ORIGIN || 'https://erkak.com';
const BRAND = 'ERKAK';
const SUPPORT = ENV.SUPPORT_EMAIL || 'care@erkak.com';
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Каталог: тот же файл, что грузит браузер ─────────────────────
// В режиме заглушки (deploy.sh teaser) магазин лежит в соседней папке «-shop»: API должен запускаться и тогда.
function loadCatalog(){
  const file = [STATIC_DIR, STATIC_DIR.replace(/\/+$/, '') + '-shop'].map(d => path.join(d, 'assets', 'catalog.js')).find(f => fs.existsSync(f));
  if (!file) throw new Error(`Нет каталога: ${STATIC_DIR}/assets/catalog.js`);
  return vm.runInNewContext(fs.readFileSync(file, 'utf8') + ';CATALOG', {});
}
let CATALOG = loadCatalog();
setInterval(() => { try { CATALOG = loadCatalog(); } catch {} }, 60_000).unref();

// ── База ─────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(DATA_DIR, 'erkak.db'));
db.exec(`
pragma journal_mode = wal;
create table if not exists orders (
  number text primary key, email text not null, name text not null, phone text,
  country text not null, city text not null, address text not null, postcode text,
  items text not null, subtotal_uzs integer not null, shipping_uzs integer not null,
  total_uzs integer not null, total_usd integer not null, currency text not null default 'UZS',
  pay_method text not null, status text not null default 'new', note text, tracking text,
  pay_url text, ip text, created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists orders_email on orders(email, created_at desc);
create table if not exists login_codes (
  email text not null, code_hash text not null, expires_at integer not null, attempts integer not null default 0,
  created_at integer not null
);
create index if not exists login_codes_email on login_codes(email);
create table if not exists sessions (
  token text primary key, email text not null, created_at integer not null, expires_at integer not null
);
create table if not exists payments (
  id integer primary key autoincrement, provider text not null, ext_id text not null, order_number text not null,
  amount integer not null, state integer not null, reason integer, ext_time integer, ref text,
  create_time integer not null, perform_time integer not null default 0, cancel_time integer not null default 0,
  unique (provider, ext_id)
);
create index if not exists payments_order on payments(order_number);
create table if not exists meta (key text primary key, value text not null);
create table if not exists audit (
  id integer primary key autoincrement, at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor text, action text not null, subject text, detail text
);`);
const q = {
  insertOrder: db.prepare(`insert into orders (number,email,name,phone,country,city,address,postcode,items,subtotal_uzs,shipping_uzs,total_uzs,total_usd,currency,pay_method,status,note,pay_url,ip)
    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  ordersByEmail: db.prepare(`select number,status,items,total_uzs,total_usd,pay_method,country,city,tracking,pay_url,created_at from orders where email = ? order by created_at desc limit 100`),
  orderByNumber: db.prepare(`select * from orders where number = ?`),
  setStatus: db.prepare(`update orders set status = ?, tracking = coalesce(?, tracking), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where number = ?`),
  lastOrders: db.prepare(`select number,email,status,total_uzs,pay_method,country,created_at from orders order by created_at desc limit ?`),
  insertCode: db.prepare(`insert into login_codes (email,code_hash,expires_at,created_at) values (?,?,?,?)`),
  latestCode: db.prepare(`select rowid, * from login_codes where email = ? order by created_at desc limit 1`),
  bumpAttempts: db.prepare(`update login_codes set attempts = attempts + 1 where rowid = ?`),
  killCodes: db.prepare(`delete from login_codes where email = ?`),
  insertSession: db.prepare(`insert into sessions (token,email,created_at,expires_at) values (?,?,?,?)`),
  session: db.prepare(`select email, expires_at from sessions where token = ?`),
  dropSession: db.prepare(`delete from sessions where token = ?`),
  audit: db.prepare(`insert into audit (actor,action,subject,detail) values (?,?,?,?)`),
  purgeSessions: db.prepare(`delete from sessions where expires_at < ?`),
  purgeCodes: db.prepare(`delete from login_codes where expires_at < ?`),
  payInsert: db.prepare(`insert into payments (provider,ext_id,order_number,amount,state,ext_time,ref,create_time,perform_time) values (?,?,?,?,?,?,?,?,?)`),
  payGet: db.prepare(`select * from payments where provider = ? and ext_id = ?`),
  payById: db.prepare(`select * from payments where provider = ? and id = ?`),
  payByRef: db.prepare(`select * from payments where provider = ? and ref = ?`),
  payActive: db.prepare(`select * from payments where provider = ? and order_number = ? and state = 1 and ext_id <> ?`),
  payPerform: db.prepare(`update payments set state = 2, perform_time = ? where id = ?`),
  payCancel: db.prepare(`update payments set state = ?, reason = ?, cancel_time = ? where id = ?`),
  payPaidCount: db.prepare(`select count(*) n from payments where order_number = ? and state = 2`),
  payStatement: db.prepare(`select * from payments where provider = 'payme' and ext_time between ? and ? order by ext_time`),
  lastPayments: db.prepare(`select id,provider,order_number,amount,state,reason,create_time,perform_time,cancel_time from payments order by id desc limit ?`),
  metaGet: db.prepare(`select value from meta where key = ?`),
  metaSet: db.prepare(`insert or ignore into meta (key,value) values (?,?)`),
};
// Секрет для подписи ссылок на оплату: создаётся один раз и живёт в базе.
q.metaSet.run('secret', crypto.randomBytes(32).toString('hex'));
const SECRET = q.metaGet.get('secret').value;
setInterval(() => { try { q.purgeSessions.run(Date.now()); q.purgeCodes.run(Date.now()); } catch {} }, 3600e3).unref();
const audit = (actor, action, subject, detail) => q.audit.run(actor || null, action, subject || null, detail ? JSON.stringify(detail).slice(0, 2000) : null);

// ── SMTP (минимальный клиент) ────────────────────────────────────
async function sendMail({ to, subject, text, html }){
  const host = ENV.SMTP_HOST, port = +(ENV.SMTP_PORT || 587), user = ENV.SMTP_USER, pass = ENV.SMTP_PASS;
  const from = ENV.MAIL_FROM || ENV.SMTP_FROM || user;
  if (!host) throw new Error('SMTP не настроен');
  const secure = String(ENV.SMTP_SECURE) === 'true' || port === 465;
  let sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
  await new Promise((res, rej) => { sock.once(secure ? 'secureConnect' : 'connect', res); sock.once('error', rej); });
  let buf = '';
  const read = () => new Promise((res, rej) => {
    const onData = d => { buf += d.toString(); const lines = buf.split('\r\n'); const last = lines.filter(Boolean).pop() || '';
      if (/^\d{3} /.test(last)) { sock.off('data', onData); const out = buf; buf = ''; res(out); } };
    sock.on('data', onData); sock.once('error', rej);
  });
  const cmd = async (line, ok = /^[23]\d\d/) => { if (line) sock.write(line + '\r\n'); const r = await read(); if (!ok.test(r.trim().split('\r\n').pop())) throw new Error('SMTP: ' + r.trim().slice(0, 200)); return r; };
  await cmd(null);
  let ehlo = await cmd('EHLO erkak.com');
  if (!secure && /STARTTLS/i.test(ehlo)) {
    await cmd('STARTTLS');
    sock = await new Promise((res, rej) => { const s = tls.connect({ socket: sock, servername: host }, () => res(s)); s.once('error', rej); });
    buf = ''; ehlo = await cmd('EHLO erkak.com');
  }
  if (user && pass) { await cmd('AUTH LOGIN', /^334/); await cmd(Buffer.from(user).toString('base64'), /^334/); await cmd(Buffer.from(pass).toString('base64'), /^235/); }
  await cmd(`MAIL FROM:<${from.replace(/^.*<|>.*$/g, '')}>`); await cmd(`RCPT TO:<${to}>`); await cmd('DATA', /^354/);
  const boundary = 'b' + crypto.randomBytes(8).toString('hex');
  const b64 = s => Buffer.from(s, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  const msg = [
    `From: ${BRAND} <${from.replace(/^.*<|>.*$/g, '')}>`, `To: <${to}>`, `Reply-To: ${SUPPORT}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@erkak.com>`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(text), '',
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html || `<pre style="font:16px/1.5 sans-serif">${esc(text)}</pre>`), '',
    `--${boundary}--`, '.',
  ].join('\r\n');
  await cmd(msg); await cmd('QUIT', /^221/).catch(() => {}); sock.end();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
function mailHtml(title, bodyHtml){
  return `<!doctype html><body style="margin:0;background:#FAF8F3;font-family:'Golos Text',Arial,sans-serif;color:#14201C">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font:700 20px/1 Onest,Arial,sans-serif;letter-spacing:.18em;margin-bottom:24px"><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#0E6E5A;vertical-align:-1px;margin-right:10px"></span>${BRAND}</div>
    <div style="background:#fff;border:1px solid #E4E0D6;border-radius:14px;padding:28px">
      <h1 style="font:700 24px/1.2 Onest,Arial,sans-serif;margin:0 0 16px">${esc(title)}</h1>
      <div style="font-size:17px;line-height:1.6">${bodyHtml}</div>
    </div>
    <p style="font-size:13px;color:#8E9993;margin-top:20px">Письмо отправлено автоматически. Вопросы: <a href="mailto:${SUPPORT}" style="color:#0E6E5A">${SUPPORT}</a>. ${BRAND}, Ташкент.</p>
  </div></body>`;
}

// ── Telegram ─────────────────────────────────────────────────────
async function tg(text){
  const token = ENV.TELEGRAM_BOT_TOKEN, chat = ENV.ERKAK_TG_CHAT || ENV.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chat) return;
  try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ chat_id: chat, text, parse_mode:'HTML', disable_web_page_preview:true }) }); } catch {}
}

// ── Деньги и цены (серверный пересчёт) ───────────────────────────
const money = uzs => uzs.toLocaleString('ru-RU').replace(/ /g, ' ') + ' сум';
function priceLines(items){
  const out = [];
  for (const it of items) {
    const p = CATALOG.products.find(x => x.sku === it.sku); if (!p) throw new Error('Неизвестный товар: ' + it.sku);
    const qty = Math.max(1, Math.min(20, Math.floor(+it.qty || 1))); const sub = !!it.subscription;
    const k = sub ? 1 - CATALOG.subscriptionDiscount : 1;
    out.push({ sku: p.sku, name: `${BRAND} ${p.name}`, qty, subscription: sub, price_uzs: Math.round(p.priceUZS * k / 1000) * 1000, price_usd: Math.round(p.priceUSD * k) });
  }
  return out;
}
function zoneFor(country){ return CATALOG.zones.find(z => z.countries.includes(country)) || CATALOG.zones[CATALOG.zones.length - 1]; }
const cardKey = number => crypto.createHmac('sha256', SECRET).update('card:' + number).digest('hex').slice(0, 32);
function payUrl(method, order){
  const tiyin = order.total_uzs * 100, back = `${ORIGIN}/account.html?paid=${order.number}`;
  if (method === 'payme' && ENV.PAYME_MERCHANT) return `https://${ENV.PAYME_TEST === 'true' ? 'test' : 'checkout'}.paycom.uz/${Buffer.from(`m=${ENV.PAYME_MERCHANT};ac.order_id=${order.number};a=${tiyin};c=${back}`).toString('base64')}`;
  if (method === 'click' && ENV.CLICK_SERVICE_ID) return `https://my.click.uz/services/pay?service_id=${ENV.CLICK_SERVICE_ID}&merchant_id=${ENV.CLICK_MERCHANT_ID}&amount=${order.total_uzs}&transaction_param=${order.number}&return_url=${encodeURIComponent(back)}`;
  // Карта: ссылка ведёт на наш адрес, который каждый раз открывает свежую сессию Stripe Checkout на точную сумму заказа.
  if (method === 'card' && ENV.STRIPE_SECRET_KEY) return `${ORIGIN}/api/pay/card?o=${order.number}&k=${cardKey(order.number)}`;
  if (method === 'card' && ENV.STRIPE_LINK) return `${ENV.STRIPE_LINK}?client_reference_id=${order.number}&prefilled_email=${encodeURIComponent(order.email)}`;
  return null;
}
const STATUS_RU = { new:'Новый', awaiting_payment:'Ожидает оплаты', paid:'Оплачен', packed:'Собран', shipped:'Отправлен', delivered:'Доставлен', cancelled:'Отменён', refunded:'Возврат' };
const PAY_RU = { payme:'Payme', click:'Click', card:'Карта', cod:'При получении' };
const PROVIDER_RU = { payme:'Payme', click:'Click', stripe:'карта, Stripe' };
const safeEq = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());

// ── Статусы заказа: одна точка для CLI и платёжных систем ────────
const STATUS_TEXT = {
  paid: n => `Оплата заказа ${n} получена. Собираем и отправляем в течение рабочего дня.`,
  packed: n => `Заказ ${n} собран и передаётся в доставку.`,
  shipped: (n, tracking) => `Заказ ${n} отправлен.${tracking ? ' Трек-номер: ' + tracking + '.' : ''} Статус в кабинете: ${ORIGIN}/account.html`,
  delivered: n => `Заказ ${n} доставлен. Через 90 дней напомним о контрольном анализе.`,
  cancelled: n => `Заказ ${n} отменён. Если это ошибка, ответьте на это письмо.`,
  refunded: n => `Возврат по заказу ${n} оформлен. Деньги вернутся тем же способом в течение 5–10 рабочих дней.`,
};
// Меняет статус, пишет аудит и отправляет письмо клиенту. mail: промис с ошибкой отправки или null.
function setOrderStatus(number, status, { tracking, actor } = {}){
  const o = q.orderByNumber.get(number); if (!o) return null;
  q.setStatus.run(status, tracking || null, number); audit(actor || 'system', 'order.status', number, { status, tracking });
  const text = STATUS_TEXT[status]?.(number, tracking);
  const mail = !text ? Promise.resolve(null) : sendMail({ to: o.email, subject: `${BRAND}: заказ ${number} — ${STATUS_RU[status].toLowerCase()}`, text, html: mailHtml(`Заказ ${number}: ${STATUS_RU[status].toLowerCase()}`, `<p>${esc(text)}</p>`) })
    .then(() => null, e => { audit('system', 'mail.fail', number, { error: e.message }); return e; });
  return { order: o, mail };
}
// Оплата подтверждена платёжной системой. Повторный вызов безопасен: срабатывает только из «Ожидает оплаты».
function orderPaid(o, provider){
  if (q.orderByNumber.get(o.number)?.status !== 'awaiting_payment') return;
  setOrderStatus(o.number, 'paid', { actor: provider });
  tg(`✅ <b>Оплачен ${o.number}</b> · ${esc(money(o.total_uzs))} · ${PROVIDER_RU[provider]}\n${esc(o.name)} · ${esc(o.email)}\n${esc(o.country)}, ${esc(o.city)}`);
}
// Платёжная система вернула деньги. Заказ уходит в «Возврат», если по нему не осталось других проведённых платежей.
function orderRefunded(o, provider){
  if (q.payPaidCount.get(o.number).n > 0 || ['refunded', 'cancelled'].includes(q.orderByNumber.get(o.number)?.status)) { tg(`↩️ Возврат платежа по заказу ${o.number} · ${PROVIDER_RU[provider]}. Статус заказа не менялся.`); return; }
  setOrderStatus(o.number, 'refunded', { actor: provider });
  tg(`↩️ <b>Возврат ${o.number}</b> · ${esc(money(o.total_uzs))} · ${PROVIDER_RU[provider]}`);
}
// Заказ можно оплатить только из «Ожидает оплаты». Возвращает null или причину отказа.
const unpayable = o => o.status === 'awaiting_payment' ? null : ['cancelled', 'refunded', 'new'].includes(o.status) ? 'closed' : 'paid';

// ── Payme Merchant API (JSON-RPC, всегда HTTP 200) ───────────────
const PAYME_TIMEOUT = 43_200_000; // 12 часов на оплату созданной транзакции
const PM = { // код, ru, uz, en, поле счёта
  auth: [-32504, 'Недостаточно привилегий', 'Ruxsat yetarli emas', 'Insufficient privileges'],
  parse: [-32700, 'Ошибка разбора JSON', 'JSON xatosi', 'Parse error'],
  request: [-32600, 'Неверный запрос', "Noto'g'ri so'rov", 'Invalid request'],
  method: [-32601, 'Метод не найден', 'Metod topilmadi', 'Method not found'],
  internal: [-32400, 'Внутренняя ошибка', 'Ichki xato', 'Internal error'],
  amount: [-31001, 'Неверная сумма', "Noto'g'ri summa", 'Invalid amount'],
  notx: [-31003, 'Транзакция не найдена', 'Tranzaksiya topilmadi', 'Transaction not found'],
  nocancel: [-31007, 'Заказ отправлен, отмена невозможна', "Buyurtma jo'natilgan, bekor qilib bo'lmaydi", 'Order shipped, cannot cancel'],
  cant: [-31008, 'Невозможно выполнить операцию', "Operatsiyani bajarib bo'lmaydi", 'Unable to perform operation'],
  noorder: [-31050, 'Заказ не найден', 'Buyurtma topilmadi', 'Order not found', 'order_id'],
  paid: [-31051, 'Заказ уже оплачен', "Buyurtma allaqachon to'langan", 'Order already paid', 'order_id'],
  closed: [-31052, 'Заказ недоступен для оплаты', "Buyurtma to'lov uchun mavjud emas", 'Order is not payable', 'order_id'],
  busy: [-31099, 'Заказ ожидает оплату по другой транзакции', "Buyurtma boshqa tranzaksiya bo'yicha to'lovni kutmoqda", 'Order is awaiting another transaction', 'order_id'],
};
class PaymeError extends Error { constructor(k){ super(k); this.k = k; } }
const pmFail = k => { throw new PaymeError(k); };
const pmExpire = t => { q.payCancel.run(-1, 4, Date.now(), t.id); audit('payme', 'pay.expire', t.order_number, { id: t.ext_id }); };
const pmGet = p => q.payGet.get('payme', String(p.id || '')) || pmFail('notx');
function pmOrder(p){ // общая проверка счёта и суммы для Check и Create
  const o = q.orderByNumber.get(String(p.account?.order_id || '').trim().toUpperCase()); if (!o) pmFail('noorder');
  const why = unpayable(o); if (why) pmFail(why);
  if (Number(p.amount) !== o.total_uzs * 100) pmFail('amount');
  return o;
}
const paymeMethods = {
  CheckPerformTransaction(p){ pmOrder(p); return { allow: true }; },
  CreateTransaction(p){
    const id = String(p.id || ''), now = Date.now(); if (!id) pmFail('request');
    const t = q.payGet.get('payme', id);
    if (t) {
      if (t.state !== 1) pmFail('cant');
      if (now - t.create_time > PAYME_TIMEOUT) { pmExpire(t); pmFail('cant'); }
      return { create_time: t.create_time, transaction: String(t.id), state: 1 };
    }
    const o = pmOrder(p);
    if (now - +p.time > PAYME_TIMEOUT) pmFail('cant');
    for (const other of q.payActive.all('payme', o.number, id)) { if (now - other.create_time > PAYME_TIMEOUT) pmExpire(other); else pmFail('busy'); }
    const r = q.payInsert.run('payme', id, o.number, o.total_uzs * 100, 1, +p.time || now, null, now, 0);
    audit('payme', 'pay.create', o.number, { id });
    return { create_time: now, transaction: String(r.lastInsertRowid), state: 1 };
  },
  PerformTransaction(p){
    const t = pmGet(p), o = q.orderByNumber.get(t.order_number), now = Date.now();
    if (t.state === 2) { orderPaid(o, 'payme'); return { transaction: String(t.id), perform_time: t.perform_time, state: 2 }; }
    if (t.state !== 1) pmFail('cant');
    if (now - t.create_time > PAYME_TIMEOUT) { pmExpire(t); pmFail('cant'); }
    if (unpayable(o)) pmFail('cant'); // заказ успели оплатить иначе или отменить: Payme отменит транзакцию и вернёт деньги
    q.payPerform.run(now, t.id); audit('payme', 'pay.perform', o.number, { id: t.ext_id });
    orderPaid(o, 'payme');
    return { transaction: String(t.id), perform_time: now, state: 2 };
  },
  CancelTransaction(p){
    const t = pmGet(p), now = Date.now();
    if (t.state < 0) return { transaction: String(t.id), cancel_time: t.cancel_time, state: t.state };
    const o = q.orderByNumber.get(t.order_number);
    if (t.state === 2 && ['shipped', 'delivered'].includes(o.status)) pmFail('nocancel');
    q.payCancel.run(-t.state, Number.isInteger(p.reason) ? p.reason : null, now, t.id);
    audit('payme', 'pay.cancel', o.number, { id: t.ext_id, reason: p.reason, state: -t.state });
    if (t.state === 2) orderRefunded(o, 'payme');
    return { transaction: String(t.id), cancel_time: now, state: -t.state };
  },
  CheckTransaction(p){ const t = pmGet(p); return { create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: String(t.id), state: t.state, reason: t.reason ?? null }; },
  GetStatement(p){
    return { transactions: q.payStatement.all(+p.from || 0, +p.to || Date.now()).map(t => ({ id: t.ext_id, time: t.ext_time, amount: t.amount, account: { order_id: t.order_number },
      create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: String(t.id), state: t.state, reason: t.reason ?? null })) };
  },
};

// ── Click SHOP API (Prepare и Complete, подпись MD5) ─────────────
function clickHandle(b){ // шаг определяется полем action, поэтому оба адреса принимают оба запроса
  const complete = String(b.action) === '1', cid = String(b.click_trans_id || ''), out = (error, error_note, extra) => ({ click_trans_id: /^\d{1,15}$/.test(cid) ? +cid : cid, merchant_trans_id: b.merchant_trans_id ?? null, ...extra, error, error_note });
  const secret = ENV.CLICK_SECRET_KEY;
  const sign = crypto.createHash('md5').update(`${b.click_trans_id}${b.service_id}${secret}${b.merchant_trans_id}${complete ? b.merchant_prepare_id : ''}${b.amount}${b.action}${b.sign_time}`).digest('hex');
  if (!secret || String(b.service_id) !== String(ENV.CLICK_SERVICE_ID) || !safeEq(sign, String(b.sign_string || '').toLowerCase())) return out(-1, 'SIGN CHECK FAILED!');
  if (!['0', '1'].includes(String(b.action))) return out(-3, 'Action not found');
  const o = q.orderByNumber.get(String(b.merchant_trans_id || '').trim().toUpperCase()); if (!o) return out(-5, 'User does not exist');
  if (!(Math.abs(parseFloat(b.amount) - o.total_uzs) < 0.01)) return out(-2, 'Incorrect parameter amount');
  const why = unpayable(o), now = Date.now();
  if (!complete) {
    if (why) return why === 'paid' ? out(-4, 'Already paid') : out(-9, 'Transaction cancelled');
    let t = q.payGet.get('click', cid);
    if (t && (t.state < 0 || t.order_number !== o.number)) return out(-9, 'Transaction cancelled');
    if (!t) { q.payInsert.run('click', cid, o.number, o.total_uzs, 1, now, String(b.click_paydoc_id || '') || null, now, 0); t = q.payGet.get('click', cid); audit('click', 'pay.create', o.number, { id: cid }); }
    return out(0, 'Success', { merchant_prepare_id: t.id });
  }
  const t = q.payById.get('click', +b.merchant_prepare_id || 0);
  if (!t || t.ext_id !== cid || t.order_number !== o.number) return out(-6, 'Transaction does not exist');
  if (t.state === 2) { orderPaid(o, 'click'); return out(-4, 'Already paid'); }
  if (t.state < 0) return out(-9, 'Transaction cancelled');
  if (+b.error < 0) { q.payCancel.run(-1, null, now, t.id); audit('click', 'pay.cancel', o.number, { id: cid, error: b.error }); return out(-9, 'Transaction cancelled'); }
  if (why) return why === 'paid' ? out(-4, 'Already paid') : out(-9, 'Transaction cancelled');
  q.payPerform.run(now, t.id); audit('click', 'pay.perform', o.number, { id: cid });
  orderPaid(o, 'click');
  return out(0, 'Success', { merchant_confirm_id: t.id });
}

// ── Stripe Checkout (карты вне Узбекистана, сумма в USD) ─────────
async function stripe(path, params){
  const r = await fetch(`${ENV.STRIPE_API || 'https://api.stripe.com'}/v1/${path}`, { method:'POST', headers:{ authorization:'Bearer ' + ENV.STRIPE_SECRET_KEY, 'content-type':'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString(), signal: AbortSignal.timeout(15_000) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error?.message || 'Stripe HTTP ' + r.status); return d;
}
function stripeSessionParams(o){
  const items = JSON.parse(o.items), ship = o.total_usd - items.reduce((a, l) => a + l.price_usd * l.qty, 0);
  const lines = items.map(l => [l.name + (l.subscription ? ' (подписка)' : ''), l.price_usd, l.qty]); if (ship > 0) lines.push(['Доставка', ship, 1]);
  const p = { mode:'payment', client_reference_id: o.number, customer_email: o.email, success_url: `${ORIGIN}/account.html?paid=${o.number}`, cancel_url: `${ORIGIN}/account.html`,
    'metadata[order]': o.number, 'payment_intent_data[metadata][order]': o.number, 'payment_intent_data[description]': `${BRAND} ${o.number}` };
  lines.forEach(([name, usd, qty], i) => { const k = `line_items[${i}]`; p[`${k}[price_data][currency]`] = 'usd'; p[`${k}[price_data][unit_amount]`] = String(usd * 100); p[`${k}[price_data][product_data][name]`] = name; p[`${k}[quantity]`] = String(qty); });
  return p;
}
function stripePaid(s){
  if (s.payment_status !== 'paid') return;
  const number = String(s.client_reference_id || s.metadata?.order || '').toUpperCase(), o = q.orderByNumber.get(number);
  if (!o) return audit('stripe', 'pay.unknown', number, { session: s.id });
  if (q.payGet.get('stripe', String(s.id))) return orderPaid(o, 'stripe'); // событие уже обработано
  if (s.amount_total !== o.total_usd * 100 || s.currency !== 'usd') {
    audit('stripe', 'pay.mismatch', number, { session: s.id, amount: s.amount_total, currency: s.currency, expected: o.total_usd * 100 });
    return tg(`⚠️ Stripe: оплата по заказу ${number} на ${esc(s.amount_total / 100)} ${esc(String(s.currency).toUpperCase())}, а заказ на $${o.total_usd}. Статус не менялся, проверьте вручную.`);
  }
  const now = Date.now(), dup = unpayable(o);
  q.payInsert.run('stripe', String(s.id), number, s.amount_total, 2, now, typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id || null, now, now);
  audit('stripe', dup ? 'pay.duplicate' : 'pay.perform', number, { session: s.id });
  if (dup) return tg(`⚠️ Stripe: повторная оплата заказа ${number} (статус «${STATUS_RU[o.status]}»). Верните лишний платёж в кабинете Stripe.`);
  orderPaid(o, 'stripe');
}
function stripeRefunded(c){
  const t = c.payment_intent && q.payByRef.get('stripe', String(c.payment_intent)); if (!t) return;
  if (!c.refunded) { audit('stripe', 'pay.refund.partial', t.order_number, { charge: c.id, amount: c.amount_refunded }); return tg(`↩️ Stripe: частичный возврат $${esc(c.amount_refunded / 100)} по заказу ${t.order_number}. Статус заказа не менялся.`); }
  if (t.state !== 2) return;
  q.payCancel.run(-2, null, Date.now(), t.id); audit('stripe', 'pay.cancel', t.order_number, { charge: c.id });
  orderRefunded(q.orderByNumber.get(t.order_number), 'stripe');
}

// ── HTTP ─────────────────────────────────────────────────────────
const json = (res, code, obj) => { res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(obj)); };
class HttpError extends Error { constructor(code, msg){ super(msg); this.code = code; } }
const raw = req => new Promise((res, rej) => { const parts = []; let n = 0; req.on('data', c => { n += c.length; if (n > 64e3) { rej(new HttpError(413, 'Слишком большой запрос.')); req.destroy(); } else parts.push(c); }); req.on('end', () => res(Buffer.concat(parts))); req.on('error', rej); });
const body = async req => { const d = (await raw(req)).toString('utf8'); let v; try { v = d ? JSON.parse(d) : {}; } catch { throw new HttpError(400, 'Неверный формат запроса.'); } return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
const formBody = async req => /json/i.test(req.headers['content-type'] || '') ? body(req) : Object.fromEntries(new URLSearchParams((await raw(req)).toString('utf8')));
const isEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);
// За nginx настоящий адрес клиента — последний в X-Forwarded-For: его дописывает nginx, всё левее присылает сам клиент.
const ipOf = req => String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress;
const rate = new Map(); // key → [timestamps]
function limited(key, n, windowMs){ const now = Date.now(); const arr = (rate.get(key) || []).filter(t => now - t < windowMs); arr.push(now); rate.set(key, arr); return arr.length > n; }
setInterval(() => { const now = Date.now(); for (const [k, v] of rate) if (!v.some(t => now - t < 3600e3)) rate.delete(k); }, 600e3).unref();
function sessionEmail(req){
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization || ''); if (!m) return null;
  const s = q.session.get(m[1]); if (!s || s.expires_at < Date.now()) return null; return { email: s.email, token: m[1] };
}
function orderNumber(){
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  for (let i = 0; i < 50; i++) { const n = `EK-${ymd}-${crypto.randomInt(1000, 10000)}`; if (!q.orderByNumber.get(n)) return n; }
  throw new Error('нет свободных номеров заказа на сегодня');
}

const routes = {
  'GET /api/health': async (req, res) => json(res, 200, { ok:true, products: CATALOG.products.length,
    pay: { payme: !!(ENV.PAYME_MERCHANT && ENV.PAYME_KEY), click: !!(ENV.CLICK_SERVICE_ID && ENV.CLICK_SECRET_KEY), card: !!(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_WEBHOOK_SECRET) } }),

  'POST /api/orders': async (req, res) => {
    const ip = ipOf(req); if (limited('order:' + ip, 10, 3600e3)) return json(res, 429, { error:'Слишком много заказов с этого адреса. Попробуйте позже.' });
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const str = (k, max = 200) => String(b[k] || '').trim().slice(0, max);
    if (!isEmail(email)) return json(res, 400, { error:'Укажите почту.' });
    for (const k of ['name','country','city','address']) if (!str(k)) return json(res, 400, { error:'Заполните имя, страну, город и адрес.' });
    if (!Array.isArray(b.items) || !b.items.length) return json(res, 400, { error:'Корзина пуста.' });
    const method = ['payme','click','card','cod'].includes(b.pay_method) ? b.pay_method : 'card';
    if (!CATALOG.zones.some(z => z.countries.includes(str('country')))) return json(res, 400, { error:'Выберите страну из списка.' });
    const zone = zoneFor(str('country'));
    if (method !== 'card' && zone.id !== 'uz') return json(res, 400, { error:'Для доставки за пределы Узбекистана доступна только оплата картой.' });
    let items; try { items = priceLines(b.items); } catch (e) { return json(res, 400, { error: e.message }); }
    const subtotal_uzs = items.reduce((a, l) => a + l.price_uzs * l.qty, 0), subtotal_usd = items.reduce((a, l) => a + l.price_usd * l.qty, 0);
    const free = zone.freeFrom && subtotal_uzs >= zone.freeFrom;
    const shipping_uzs = free ? 0 : zone.uzs, shipping_usd = free ? 0 : zone.usd;
    const order = { number: orderNumber(), email, name: str('name', 120), phone: str('phone', 40) || null, country: str('country', 80), city: str('city', 120), address: str('address', 400), postcode: str('postcode', 20) || null,
      items, subtotal_uzs, shipping_uzs, total_uzs: subtotal_uzs + shipping_uzs, total_usd: subtotal_usd + shipping_usd, currency: b.currency === 'USD' ? 'USD' : 'UZS',
      pay_method: method, status: method === 'cod' ? 'new' : 'awaiting_payment', note: str('note', 1000) || null };
    order.pay_url = payUrl(method, order);
    q.insertOrder.run(order.number, order.email, order.name, order.phone, order.country, order.city, order.address, order.postcode, JSON.stringify(items), order.subtotal_uzs, order.shipping_uzs, order.total_uzs, order.total_usd, order.currency, order.pay_method, order.status, order.note, order.pay_url, ip);
    audit(email, 'order.create', order.number, { total: order.total_uzs, method, zone: zone.id });
    const lines = items.map(l => `${l.name}${l.subscription ? ' (подписка)' : ''} × ${l.qty} — ${money(l.price_uzs * l.qty)}`);
    const how = order.pay_url ? `Оплатить: ${order.pay_url}` : ({ payme:'Ссылка на оплату Payme придёт отдельным письмом в течение рабочего дня.', click:'Ссылка на оплату Click придёт отдельным письмом в течение рабочего дня.', card:'Защищённая ссылка на оплату картой придёт отдельным письмом в течение рабочего дня. Сумма в долларах по курсу на день заказа.', cod:'Курьер свяжется для согласования времени. Оплата при получении.' }[method]);
    const text = `Заказ ${order.number} принят.\n\n${lines.join('\n')}\nДоставка: ${free ? 'бесплатно' : money(shipping_uzs)} (${zone.name}, ${zone.days})\nИтого: ${money(order.total_uzs)}\n\n${how}\n\nСтатус заказа: ${ORIGIN}/account.html (вход по этой почте, без пароля).`;
    const html = mailHtml(`Заказ ${order.number} принят`, `<p>${lines.map(esc).join('<br>')}</p><p>Доставка: ${free ? 'бесплатно' : esc(money(shipping_uzs))} · ${esc(zone.name)}, ${esc(zone.days)}<br><b>Итого: ${esc(money(order.total_uzs))}</b></p>` +
      (order.pay_url ? `<p><a href="${order.pay_url}" style="display:inline-block;background:#0E6E5A;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600">Оплатить ${esc(money(order.total_uzs))}</a></p>` : `<p>${esc(how)}</p>`) +
      `<p style="color:#5A6862;font-size:15px">Статус заказа в кабинете: <a href="${ORIGIN}/account.html" style="color:#0E6E5A">${ORIGIN}/account.html</a>, вход по этой почте без пароля.</p>`);
    sendMail({ to: email, subject: `${BRAND}: заказ ${order.number} принят`, text, html }).catch(e => audit('system', 'mail.fail', order.number, { error: e.message }));
    tg(`🧾 <b>Заказ ${order.number}</b> · ${esc(money(order.total_uzs))} · ${PAY_RU[method]}\n${esc(order.name)} · ${esc(email)}${order.phone ? ' · ' + esc(order.phone) : ''}\n${esc(order.country)}, ${esc(order.city)}\n${lines.map(esc).join('\n')}${order.note ? '\n💬 ' + esc(order.note) : ''}`);
    json(res, 201, { number: order.number, email, total_uzs: order.total_uzs, total_usd: order.total_usd, status: order.status, pay_url: order.pay_url });
  },

  'POST /api/auth/code': async (req, res) => {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase();
    if (!isEmail(email)) return json(res, 400, { error:'Укажите почту.' });
    if (limited('code:' + email, 3, 600e3) || limited('code-ip:' + ipOf(req), 20, 3600e3)) return json(res, 429, { error:'Код уже отправлен. Подождите несколько минут.' });
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    q.killCodes.run(email); q.insertCode.run(email, crypto.createHash('sha256').update(email + ':' + code).digest('hex'), Date.now() + 15 * 60e3, Date.now());
    try {
      await sendMail({ to: email, subject: `${BRAND}: код для входа ${code}`, text: `Код для входа в кабинет: ${code}\nДействует 15 минут. Если вы не запрашивали вход, просто не вводите код.`,
        html: mailHtml('Код для входа', `<p style="font:500 38px/1 'JetBrains Mono',Menlo,monospace;letter-spacing:.2em;margin:8px 0 16px">${code}</p><p>Действует 15 минут. Если вы не запрашивали вход, просто не вводите код.</p>`) });
    } catch (e) { audit('system', 'mail.fail', email, { error: e.message }); return json(res, 502, { error:'Не удалось отправить письмо. Напишите на ' + SUPPORT + '.' }); }
    audit(email, 'auth.code', null, null);
    json(res, 200, { ok:true });
  },

  'POST /api/auth/verify': async (req, res) => {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(), code = String(b.code || '').replace(/\D/g, '');
    const row = q.latestCode.get(email);
    if (!row || row.expires_at < Date.now() || row.attempts >= 5) return json(res, 400, { error:'Код устарел. Запросите новый.' });
    q.bumpAttempts.run(row.rowid);
    if (crypto.createHash('sha256').update(email + ':' + code).digest('hex') !== row.code_hash) return json(res, 400, { error:'Код не подошёл.' });
    q.killCodes.run(email);
    const token = crypto.randomBytes(32).toString('hex');
    q.insertSession.run(token, email, Date.now(), Date.now() + 30 * 86400e3);
    audit(email, 'auth.login', null, null);
    json(res, 200, { token, email });
  },

  'POST /api/auth/order': async (req, res) => {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(), number = String(b.number || '').trim().toUpperCase();
    if (limited('order-login:' + ipOf(req), 20, 3600e3) || limited('order-login:' + email, 5, 3600e3)) return json(res, 429, { error:'Слишком много попыток. Подождите.' });
    const o = q.orderByNumber.get(number);
    if (!o || o.email !== email) return json(res, 400, { error:'Заказ с таким номером и почтой не найден.' });
    const token = crypto.randomBytes(32).toString('hex');
    q.insertSession.run(token, email, Date.now(), Date.now() + 30 * 86400e3);
    audit(email, 'auth.login.order', number, null);
    json(res, 200, { token, email });
  },

  'POST /api/auth/logout': async (req, res) => { const s = sessionEmail(req); if (s) q.dropSession.run(s.token); json(res, 200, { ok:true }); },

  'GET /api/me/orders': async (req, res) => {
    const s = sessionEmail(req); if (!s) return json(res, 401, { error:'Нужно войти.' });
    audit(s.email, 'orders.read', null, null);
    json(res, 200, { email: s.email, orders: q.ordersByEmail.all(s.email).map(o => ({ ...o, items: JSON.parse(o.items) })) });
  },

  // Payme → кабинет Payme Business, «Endpoint URL»: https://erkak.com/api/pay/payme
  'POST /api/pay/payme': async (req, res) => {
    let rpc = null;
    const reply = (result, k) => { const [code, ru, uz, en, data] = k ? PM[k] : []; json(res, 200, { jsonrpc:'2.0', id: rpc?.id ?? null, ...(k ? { error: { code, message: { ru, uz, en }, ...(data ? { data } : {}) } } : { result }) }); };
    try { rpc = JSON.parse((await raw(req)).toString('utf8')); } catch (e) { if (e instanceof HttpError) throw e; return reply(null, 'parse'); }
    const m = /^Basic\s+(\S+)$/.exec(req.headers.authorization || '');
    if (!ENV.PAYME_KEY || !m || !safeEq(Buffer.from(m[1], 'base64').toString('utf8'), 'Paycom:' + ENV.PAYME_KEY)) return reply(null, 'auth');
    if (!rpc || typeof rpc !== 'object' || typeof rpc.method !== 'string') return reply(null, 'request');
    if (!Object.hasOwn(paymeMethods, rpc.method)) return reply(null, 'method');
    try { reply(paymeMethods[rpc.method](rpc.params && typeof rpc.params === 'object' ? rpc.params : {})); }
    catch (e) { if (e instanceof PaymeError) return reply(null, e.k); audit('system', 'error', 'payme ' + rpc.method, { error: e.message }); reply(null, 'internal'); }
  },

  // Click → кабинет merchant.click.uz: Prepare URL и Complete URL
  'POST /api/pay/click/prepare': async (req, res) => json(res, 200, clickHandle(await formBody(req))),
  'POST /api/pay/click/complete': async (req, res) => json(res, 200, clickHandle(await formBody(req))),

  // Карта: открывает свежую сессию Stripe Checkout на сумму заказа и перенаправляет на неё
  'GET /api/pay/card': async (req, res, url) => {
    const number = String(url.searchParams.get('o') || '').toUpperCase();
    const go = to => { res.writeHead(303, { location: to, 'cache-control':'no-store' }); res.end(); };
    if (!ENV.STRIPE_SECRET_KEY || !safeEq(url.searchParams.get('k') || '', cardKey(number))) return json(res, 404, { error:'Не найдено' });
    if (limited('card:' + ipOf(req), 30, 3600e3)) return json(res, 429, { error:'Слишком много попыток. Подождите.' });
    const o = q.orderByNumber.get(number); if (!o) return json(res, 404, { error:'Не найдено' });
    if (unpayable(o)) return go(`${ORIGIN}/account.html`);
    try { const s = await stripe('checkout/sessions', stripeSessionParams(o)); audit(o.email, 'pay.session', number, { session: s.id }); go(s.url); }
    catch (e) {
      audit('system', 'pay.fail', number, { error: e.message });
      res.writeHead(502, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' });
      res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title><body style="font:17px/1.6 Arial,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#14201C"><p>Не удалось открыть страницу оплаты. Обновите страницу через минуту. Если не помогает, напишите на <a href="mailto:${SUPPORT}">${SUPPORT}</a> и укажите номер заказа ${esc(number)}.</p>`);
    }
  },

  // Stripe → Developers → Webhooks: https://erkak.com/api/pay/stripe, события checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
  'POST /api/pay/stripe': async (req, res) => {
    const buf = await raw(req), secret = ENV.STRIPE_WEBHOOK_SECRET, sig = String(req.headers['stripe-signature'] || '');
    const t = /(?:^|,)\s*t=(\d+)/.exec(sig)?.[1], v1 = [...sig.matchAll(/(?:^|,)\s*v1=([a-f0-9]+)/g)].map(x => x[1]);
    const want = secret && t ? crypto.createHmac('sha256', secret).update(t + '.').update(buf).digest('hex') : null;
    if (!want || Math.abs(Date.now() / 1000 - +t) > 300 || !v1.some(v => safeEq(v, want))) return json(res, 400, { error:'bad signature' });
    let ev; try { ev = JSON.parse(buf.toString('utf8')); } catch { return json(res, 400, { error:'bad json' }); }
    const obj = ev?.data?.object || {};
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') stripePaid(obj);
    else if (ev.type === 'charge.refunded') stripeRefunded(obj);
    json(res, 200, { received:true });
  },
};

// ── Запуск: сервер или команда CLI ───────────────────────────────
const CLI = ['status', 'orders', 'payments'].includes(process.argv[2]);
if (!CLI) {
  for (const [name, link, key] of [['Payme', 'PAYME_MERCHANT', 'PAYME_KEY'], ['Click', 'CLICK_SERVICE_ID', 'CLICK_SECRET_KEY'], ['Stripe', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']])
    if (ENV[link] && !ENV[key]) console.warn(`${name}: задан ${link}, но нет ${key} — ссылки на оплату выдаются, а подтверждения оплаты приниматься не будут`);
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); const key = `${req.method} ${url.pathname.replace(/\/$/, '')}`;
    const h = Object.hasOwn(routes, key) ? routes[key] : null;
    if (!h) return json(res, 404, { error:'Не найдено' });
    try { await h(req, res, url); } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return json(res, e.code, { error: e.message });
      audit('system', 'error', key, { error: e.message }); json(res, 500, { error:'Внутренняя ошибка. Попробуйте ещё раз.' });
    }
  }).listen(PORT, '127.0.0.1', () => console.log(`erkak-api on 127.0.0.1:${PORT}`));
}

// ── CLI ──────────────────────────────────────────────────────────
if (process.argv[2] === 'status') {
  const [, , , number, status, tracking] = process.argv;
  if (!STATUS_RU[status]) { console.error('Статусы: ' + Object.keys(STATUS_RU).join(', ')); process.exit(1); }
  const r = setOrderStatus(number, status, { tracking, actor: 'cli' }); if (!r) { console.error('Нет заказа ' + number); process.exit(1); }
  r.mail.then(e => { if (e) console.error('mail:', e.message); console.log(`${number} → ${STATUS_RU[status]}${tracking ? ' · ' + tracking : ''}`); process.exit(0); });
} else if (process.argv[2] === 'orders') {
  console.table(q.lastOrders.all(+(process.argv[3] || 20))); process.exit(0);
} else if (process.argv[2] === 'payments') {
  const at = ms => ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '';
  console.table(q.lastPayments.all(+(process.argv[3] || 20)).map(p => ({ ...p, create_time: at(p.create_time), perform_time: at(p.perform_time), cancel_time: at(p.cancel_time) }))); process.exit(0);
}
