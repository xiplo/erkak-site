// ERKAK shop API · Node 22, без зависимостей: http + node:sqlite + SMTP + Telegram.
// Запуск: node server.mjs            (переменные из /opt/erkak/.env через systemd)
// CLI:    node server.mjs status EK-260905-1234 shipped [трек]
//         node server.mjs orders [n]
//         node server.mjs payments [n]
//         node server.mjs backup               копия базы в data/backups (ставится на таймер)
//         node server.mjs jobs                 разовый прогон автоматики: напоминания, автоотмена, подписки
//         node server.mjs usdt                 разовая сверка поступлений USDT на кошелёк
// Оплата: Payme Merchant API, Click SHOP API, Stripe Checkout. Статус «Оплачен» ставится по подтверждению платёжной системы.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import tls from 'node:tls';
import net from 'node:net';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

const CLI = ['status', 'orders', 'payments', 'backup', 'jobs', 'usdt'].includes(process.argv[2]) ? process.argv[2] : null;
// Команды запускают руками из /opt/erkak: настройки берём из тех же файлов, что и сервис. Уже заданные переменные не меняются.
if (CLI) for (const f of ['.env', '.env.shared']) { try { process.loadEnvFile(path.join(process.cwd(), f)); } catch {} }
const ENV = process.env;
const PORT = +(ENV.PORT || 8795);
const DATA_DIR = ENV.DATA_DIR || path.join(process.cwd(), 'data');
const STATIC_DIR = ENV.STATIC_DIR || '/var/www/erkak.com-shop';
// Магазин живёт в подпапке основного сайта. ORIGIN — полный адрес магазина для писем и возврата с оплаты,
// BASE — его путь на домене ('' или '/shop') для ссылок со страниц, которые отдаёт сам API.
const ORIGIN = (ENV.PUBLIC_ORIGIN || 'https://erkak.com/shop').replace(/\/+$/, '');
const BASE = new URL(ORIGIN).pathname.replace(/\/+$/, '');
const BRAND = 'ERKAK';
const SUPPORT = ENV.SUPPORT_EMAIL || 'care@erkak.com';
fs.mkdirSync(DATA_DIR, { recursive: true });
// Запуск от root (команда на сервере): дальше работаем от владельца папки с базой, чтобы не оставить в ней файлы root.
if (process.getuid?.() === 0) { const st = fs.statSync(DATA_DIR); if (st.uid !== 0) { process.setgroups([st.gid]); process.setgid(st.gid); process.setuid(st.uid); } }
const num = (v, d) => (v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const HOUR = 3600e3, DAY = 86400e3;
const CFG = { digestHour: num(ENV.DIGEST_HOUR, 9), remindHours: num(ENV.UNPAID_REMIND_HOURS, 24), cancelDays: num(ENV.UNPAID_CANCEL_DAYS, 3), controlDays: num(ENV.CONTROL_DAYS, 90), subLeadDays: num(ENV.SUB_LEAD_DAYS, 10), backupKeep: num(ENV.BACKUP_KEEP, 14) };

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
create table if not exists subscriptions (
  id integer primary key autoincrement, email text not null, items text not null, days integer not null,
  status text not null default 'active', next_at integer not null, nudges integer not null default 0,
  first_order text not null, last_order text not null, created_at integer not null, renewed_at integer, stopped_at integer
);
create index if not exists subscriptions_email on subscriptions(email);
create table if not exists audit (
  id integer primary key autoincrement, at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor text, action text not null, subject text, detail text
);`);
for (const col of ['reminded_at', 'delivered_at', 'control_at', 'crypto_amount']) if (!db.prepare(`select 1 from pragma_table_info('orders') where name = ?`).get(col)) db.exec(`alter table orders add column ${col} integer`);
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
  setCrypto: db.prepare(`update orders set crypto_amount = ?, pay_url = ? where number = ?`),
  cryptoTaken: db.prepare(`select 1 from orders where crypto_amount = ? and created_at > ? limit 1`),
  cryptoAwaiting: db.prepare(`select * from orders where status = 'awaiting_payment' and crypto_amount = ?`),
  cryptoLast: db.prepare(`select number, status from orders where crypto_amount = ? order by created_at desc limit 1`),
  cryptoNearest: db.prepare(`select number, crypto_amount from orders where status = 'awaiting_payment' and crypto_amount is not null order by abs(crypto_amount - ?) limit 1`),
  cryptoOpen: db.prepare(`select count(*) n from orders where status = 'awaiting_payment' and crypto_amount is not null`),
  metaPut: db.prepare(`insert into meta (key,value) values (?,?) on conflict(key) do update set value = excluded.value`),
  payPending: db.prepare(`select 1 from payments where order_number = ? and state = 1 limit 1`),
  setPayUrl: db.prepare(`update orders set pay_url = ? where number = ?`),
  setReminded: db.prepare(`update orders set reminded_at = ? where number = ?`),
  setDelivered: db.prepare(`update orders set delivered_at = coalesce(delivered_at, ?) where number = ?`),
  setControl: db.prepare(`update orders set control_at = ? where number = ?`),
  unpaidToRemind: db.prepare(`select * from orders where status = 'awaiting_payment' and reminded_at is null and created_at < ?`),
  unpaidToCancel: db.prepare(`select * from orders where status = 'awaiting_payment' and reminded_at < ? and created_at < ?`),
  controlDue: db.prepare(`select * from orders where status = 'delivered' and control_at is null and delivered_at < ?`),
  ordersOpen: db.prepare(`select * from orders where status in ('new','paid','packed','shipped') order by created_at limit 20`),
  countByStatus: db.prepare(`select status, count(*) n from orders where status in ('new','awaiting_payment','paid','packed') group by status`),
  subInsert: db.prepare(`insert into subscriptions (email,items,days,next_at,first_order,last_order,created_at) values (?,?,?,?,?,?,?)`),
  subGet: db.prepare(`select * from subscriptions where id = ?`),
  subByOrder: db.prepare(`select * from subscriptions where first_order = ? or last_order = ?`),
  subsByEmail: db.prepare(`select * from subscriptions where email = ? and status = 'active' order by next_at`),
  subsDue: db.prepare(`select * from subscriptions where status = 'active' and next_at <= ?`),
  subNudged: db.prepare(`update subscriptions set nudges = nudges + 1, next_at = ? where id = ?`),
  subRenewed: db.prepare(`update subscriptions set status = 'active', nudges = 0, last_order = ?, next_at = ?, renewed_at = ? where id = ?`),
  subStatus: db.prepare(`update subscriptions set status = ?, stopped_at = ? where id = ?`),
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
// Свой бот ERKAK_TG_TOKEN даёт кнопки управления заказами; без него уведомления идут через общий бот сервера, без кнопок.
const TG = { token: ENV.ERKAK_TG_TOKEN || ENV.TELEGRAM_BOT_TOKEN, chat: ENV.ERKAK_TG_CHAT || ENV.TELEGRAM_NOTIFY_CHAT_ID, ops: !!(ENV.ERKAK_TG_TOKEN && ENV.ERKAK_TG_CHAT), api: ENV.TELEGRAM_API || 'https://api.telegram.org' };
async function tgCall(method, payload){
  if (!TG.token) return null;
  try { const r = await fetch(`${TG.api}/bot${TG.token}/${method}`, { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(method === 'getUpdates' ? 65_000 : 15_000) }); return await r.json(); } catch { return null; }
}
function tg(text, buttons){
  if (!TG.chat) return null;
  const p = tgCall('sendMessage', { chat_id: TG.chat, text, parse_mode:'HTML', disable_web_page_preview:true, ...(buttons?.length && TG.ops ? { reply_markup: { inline_keyboard: buttons } } : {}) });
  if (CLI) pending.push(p); return p;
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
const usdtKey = number => crypto.createHmac('sha256', SECRET).update('usdt:' + number).digest('hex').slice(0, 32);
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
const PAY_RU = { payme:'Payme', click:'Click', card:'Карта', cod:'При получении', usdt:'USDT TRC-20' };
const PROVIDER_RU = { payme:'Payme', click:'Click', stripe:'карта, Stripe', usdt:'USDT TRC-20' };
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
// Все письма идут через send: ошибка пишется в аудит, а команды CLI дожидаются отправки перед выходом.
const pending = [];
const plural = (n, one, few, many) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many}`;
function send(to, subject, text, bodyHtml, ref){
  const p = sendMail({ to, subject: `${BRAND}: ${subject}`, text, html: mailHtml(subject[0].toUpperCase() + subject.slice(1), bodyHtml || `<p>${esc(text)}</p>`) }).then(() => null, e => { audit('system', 'mail.fail', ref || to, { error: e.message }); return e; });
  if (CLI) pending.push(p); return p;
}
const button = (url, label) => `<p><a href="${esc(url)}" style="display:inline-block;background:#0E6E5A;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600">${esc(label)}</a></p>`;
// Меняет статус, пишет аудит и отправляет письмо клиенту. mail: промис с ошибкой отправки или null.
function setOrderStatus(number, status, { tracking, actor, text } = {}){
  const o = q.orderByNumber.get(number); if (!o) return null;
  q.setStatus.run(status, tracking || null, number); audit(actor || 'system', 'order.status', number, { status, tracking });
  if (status === 'delivered') q.setDelivered.run(Date.now(), number);
  if (status === 'paid' || status === 'delivered') subStart(o);
  if (status === 'cancelled' || status === 'refunded') { const sub = q.subByOrder.get(number, number); if (sub?.status === 'active' && sub.last_order === number) q.subStatus.run('stopped', Date.now(), sub.id); }
  text ||= STATUS_TEXT[status]?.(number, tracking);
  return { order: o, mail: text ? send(o.email, `заказ ${number} — ${STATUS_RU[status].toLowerCase()}`, text, null, number) : Promise.resolve(null) };
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

// ── USDT в сети TRON на собственный кошелёк ──────────────────────
// Сервер знает только публичный адрес: ключ и сид-фраза остаются у владельца, с сервера деньги вывести нельзя.
// Заказ узнаётся по сумме: у каждого своя, на 1–99 центов меньше итога. Поступления сверяются по блокчейну через TronGrid.
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // официальный контракт USDT в сети TRON
// Адрес TRON: Base58Check, 21 байт с префиксом 0x41 и 4 байта контрольной суммы. Опечатка в адресе — потерянные деньги, поэтому проверяем.
function tronAddressOk(a){
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a || '')) return false;
  let n = 0n; for (const c of a) n = n * 58n + BigInt('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.indexOf(c));
  const raw = Buffer.from(n.toString(16).padStart(50, '0'), 'hex'), sha = b => crypto.createHash('sha256').update(b).digest();
  return raw.length === 25 && raw[0] === 0x41 && sha(sha(raw.subarray(0, 21))).subarray(0, 4).equals(raw.subarray(21));
}
const USDT = { address: (ENV.USDT_TRC20_ADDRESS || '').trim(), api: ENV.TRON_API || 'https://api.trongrid.io', zones: (ENV.USDT_ZONES || 'cis,eu,world').split(',').map(z => z.trim()).filter(Boolean) };
USDT.on = tronAddressOk(USDT.address);
if (USDT.address && !USDT.on) console.warn('USDT: адрес USDT_TRC20_ADDRESS не прошёл проверку, оплата USDT выключена');
const usdtText = micro => { const [a, b = ''] = (micro / 1e6).toFixed(6).split('.'); return `${a}.${b.replace(/0+$/, '').padEnd(2, '0')}`; };
// Свободная сумма: итог минус 1–99 центов; если все заняты — с точностью до тысячных. Суммы не повторяются 30 дней, чтобы поздний платёж по старому заказу не закрыл новый.
function usdtAmount(totalUsd){
  const base = totalUsd * 1e6, since = new Date(Date.now() - 30 * DAY).toISOString();
  for (const step of [10_000, 1_000]) {
    const max = Math.min(Math.floor((base - 1) / step), step === 10_000 ? 99 : 999), start = crypto.randomInt(0, Math.max(max, 1));
    for (let i = 0; i < max; i++) { const amount = base - (1 + (start + i) % max) * step; if (!q.cryptoTaken.get(amount, since)) return amount; }
  }
  throw new HttpError(400, 'Сейчас не получается выдать сумму для оплаты USDT. Выберите другой способ или попробуйте позже.');
}
// Сверка: новые подтверждённые переводы USDT на адрес. Совпала сумма с ожидающим заказом — заказ оплачен; не совпала — сообщение владельцу.
async function usdtScan(){
  const out = { seen: 0, paid: 0, unmatched: 0 }; if (!USDT.on) return out;
  const now = Date.now(), since = +(q.metaGet.get('usdt_since')?.value || now - 3 * DAY);
  let newest = since, fingerprint = '';
  for (let pageNo = 0; pageNo < 5; pageNo++) {
    const url = `${USDT.api}/v1/accounts/${USDT.address}/transactions/trc20?only_confirmed=true&only_to=true&limit=200&contract_address=${USDT_CONTRACT}&min_timestamp=${since - 5 * 60e3}${fingerprint ? '&fingerprint=' + encodeURIComponent(fingerprint) : ''}`;
    const r = await fetch(url, { headers: ENV.TRON_API_KEY ? { 'TRON-PRO-API-KEY': ENV.TRON_API_KEY } : {}, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error('TronGrid HTTP ' + r.status);
    const d = await r.json(); if (!Array.isArray(d.data)) throw new Error('TronGrid: неожиданный ответ');
    for (const t of d.data) {
      // Фильтры запроса не считаются гарантией: получатель, контракт и тип проверяются здесь. Свежие переводы ждут минуту до необратимости.
      if (t.type !== 'Transfer' || t.to !== USDT.address || t.token_info?.address !== USDT_CONTRACT || !/^\d{1,15}$/.test(t.value || '') || !/^[0-9a-f]{64}$/i.test(t.transaction_id || '')) continue;
      if (!(t.block_timestamp <= now - 60e3)) continue;
      newest = Math.max(newest, t.block_timestamp); out.seen++;
      if (q.payGet.get('usdt', t.transaction_id)) continue;
      const value = +t.value, o = q.cryptoAwaiting.get(value);
      q.payInsert.run('usdt', t.transaction_id, o?.number || '', value, o ? 2 : 0, t.block_timestamp, String(t.from || '') || null, now, o ? now : 0);
      if (o) { audit('usdt', 'pay.perform', o.number, { tx: t.transaction_id, from: t.from }); orderPaid(o, 'usdt'); out.paid++; continue; }
      const late = q.cryptoLast.get(value), near = q.cryptoNearest.get(value);
      audit('usdt', 'pay.unmatched', late?.number || null, { tx: t.transaction_id, value, from: t.from });
      tg(`⚠️ USDT: пришло <b>${usdtText(value)}</b> от ${esc(t.from)}, заказ не найден.\n` +
        (late ? `Такая сумма была у заказа ${late.number}, он «${STATUS_RU[late.status]}».` : near ? `Ближайший ожидающий заказ: ${near.number} на ${usdtText(near.crypto_amount)}. Возможно, биржа удержала комиссию из суммы.` : 'Ожидающих оплаты USDT заказов нет.') +
        `\nПеревод: https://tronscan.org/#/transaction/${t.transaction_id}\nЕсли это оплата заказа, отметьте его вручную.`);
      out.unmatched++;
    }
    fingerprint = d.meta?.fingerprint || ''; if (!fingerprint) break;
  }
  if (newest > since) q.metaPut.run('usdt_since', String(newest));
  return out;
}

// ── Заказы в Telegram: карточка, кнопки статусов, трек-номер ответом ──
const NEXT = { new:['paid', 'packed', 'cancelled'], awaiting_payment:['paid', 'cancelled'], paid:['packed', 'shipped', 'cancelled'], packed:['shipped', 'cancelled'], shipped:['delivered'] };
const BTN = { paid:'💳 Оплачен', packed:'📦 Собран', shipped:'🚚 Отправлен', delivered:'✅ Доставлен', cancelled:'✖ Отменить' };
function orderButtons(number, status){ const next = NEXT[status] || []; return next.length ? [next.map(st => ({ text: BTN[st], callback_data: `st:${number}:${st}` }))] : []; }
function orderCard(o){
  const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
  return `🧾 <b>${o.number}</b> · ${STATUS_RU[o.status]} · ${esc(money(o.total_uzs))} · ${PAY_RU[o.pay_method]}\n${esc(o.name)} · ${esc(o.email)}${o.phone ? ' · ' + esc(o.phone) : ''}\n${esc([o.country, o.city, o.address, o.postcode].filter(Boolean).join(', '))}\n` +
    items.map(l => esc(`${l.name}${l.subscription ? ' (подписка)' : ''} × ${l.qty}`)).join('\n') + (o.tracking ? `\nТрек: ${esc(o.tracking)}` : '') + (o.note ? `\n💬 ${esc(o.note)}` : '');
}
async function tgUpdate(u){
  const cb = u.callback_query, msg = u.message, who = 'tg:' + ((cb || msg)?.from?.username || (cb || msg)?.from?.id || '?');
  if (cb) {
    const answer = text => tgCall('answerCallbackQuery', { callback_query_id: cb.id, text });
    if (String(cb.message?.chat?.id) !== String(TG.chat)) return answer('Нет доступа');
    const [kind, number, status] = String(cb.data || '').split(':'), o = q.orderByNumber.get(number || '');
    const redraw = (row, keyboard) => tgCall('editMessageText', { chat_id: TG.chat, message_id: cb.message.message_id, text: orderCard(row), parse_mode:'HTML', disable_web_page_preview:true, reply_markup: { inline_keyboard: keyboard || orderButtons(row.number, row.status) } });
    if (!o || !['st', 'ok', 'no'].includes(kind)) return answer('Заказ не найден');
    if (kind === 'no') { await redraw(o); return answer('Заказ не тронут'); }
    if (!(NEXT[o.status] || []).includes(status)) { await redraw(o); return answer(`Заказ уже «${STATUS_RU[o.status]}»`); }
    if (kind === 'st' && status === 'cancelled') { await redraw(o, [[{ text:'Да, отменить заказ', callback_data:`ok:${number}:cancelled` }, { text:'Назад', callback_data:`no:${number}:x` }]]); return answer('Подтвердите отмену'); }
    if (kind === 'st' && status === 'shipped') { await tgCall('sendMessage', { chat_id: TG.chat, text:`Трек-номер для ${number}? Ответьте на это сообщение. Без трека: «-».`, reply_markup: { force_reply: true } }); return answer('Жду трек-номер'); }
    setOrderStatus(number, status, { actor: who }); await redraw(q.orderByNumber.get(number)); return answer(`${number} → ${STATUS_RU[status]}`);
  }
  if (!msg || String(msg.chat?.id) !== String(TG.chat)) return;
  const text = String(msg.text || '').trim(), show = o => tg(orderCard(o), orderButtons(o.number, o.status));
  const ask = /^Трек-номер для (EK-\d{6}-\d{4})\?/.exec(msg.reply_to_message?.text || '');
  if (ask) {
    const o = q.orderByNumber.get(ask[1]);
    if (!o || !(NEXT[o.status] || []).includes('shipped')) return tg(`${ask[1]}: ${o ? `статус «${STATUS_RU[o.status]}», отправить нельзя` : 'заказ не найден'}.`);
    setOrderStatus(o.number, 'shipped', { tracking: text === '-' ? null : text.slice(0, 60), actor: who }); return show(q.orderByNumber.get(o.number));
  }
  if (/^\/orders\b/.test(text)) { const list = q.ordersOpen.all(); if (!list.length) return tg('Заказов в работе нет.'); for (const o of list) await show(o); return; }
  const m = /EK-\d{6}-\d{4}/i.exec(text), found = m && q.orderByNumber.get(m[0].toUpperCase());
  if (found) return show(found);
  if (text.startsWith('/')) return tg('/orders — заказы в работе с кнопками статусов.\nНомер заказа (EK-…) — карточка заказа.\n«Отправлен» спросит трек-номер, клиенту уйдёт письмо.');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tgPoll(){
  await tgCall('setMyCommands', { commands: [{ command:'orders', description:'Заказы в работе' }] });
  for (let offset = 0;;) {
    const r = await tgCall('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
    if (!r?.ok || !Array.isArray(r.result)) { await sleep(5000); continue; }
    for (const u of r.result) { offset = u.update_id + 1; try { await tgUpdate(u); } catch (e) { audit('system', 'error', 'tg', { error: e.message }); } }
  }
}

// ── Подписка: письмо перед концом курса, подтверждение и остановка по ссылке ──
const subKey = id => crypto.createHmac('sha256', SECRET).update('sub:' + id).digest('hex').slice(0, 32);
const subLink = (sub, a) => `${ORIGIN}/api/sub?s=${sub.id}&k=${subKey(sub.id)}&a=${a}`;
const subFromLink = (id, key) => { const sub = q.subGet.get(+id || 0); return sub && safeEq(key || '', subKey(sub.id)) ? sub : null; };
const subNext = days => Date.now() + Math.max(days - CFG.subLeadDays, 7) * DAY;
const subTitle = sub => JSON.parse(sub.items).map(i => `${BRAND} ${CATALOG.products.find(p => p.sku === i.sku)?.name || i.sku} × ${i.qty}`).join(', ');
// Подписка появляется, когда заказ с позициями «по подписке» оплачен или доставлен. Срок — по самой короткой банке.
function subStart(o){
  const items = JSON.parse(o.items).filter(l => l.subscription); if (!items.length || q.subByOrder.get(o.number, o.number)) return;
  const days = Math.min(...items.map(l => CATALOG.products.find(p => p.sku === l.sku)?.days || 60));
  q.subInsert.run(o.email, JSON.stringify(items.map(l => ({ sku: l.sku, qty: l.qty }))), days, subNext(days), o.number, o.number, Date.now());
  audit(o.email, 'sub.start', o.number, { days });
}
function subStop(sub, actor){ if (sub.status === 'stopped') return; q.subStatus.run('stopped', Date.now(), sub.id); audit(actor, 'sub.stop', String(sub.id), null); }
// Продление: новый заказ на тот же адрес по текущим ценам. Повторное нажатие в течение суток второй заказ не создаёт.
function subRenew(sub, ip){
  const last = q.orderByNumber.get(sub.last_order);
  if (sub.renewed_at && Date.now() - sub.renewed_at < DAY) return last;
  const order = placeOrder({ email: last.email, name: last.name, phone: last.phone, country: last.country, city: last.city, address: last.address, postcode: last.postcode, currency: last.currency, pay_method: last.pay_method,
    items: JSON.parse(sub.items).map(i => ({ ...i, subscription: true })) }, ip, 'subscription');
  q.subRenewed.run(order.number, subNext(sub.days), Date.now(), sub.id); audit(sub.email, 'sub.renew', order.number, { sub: sub.id });
  return q.orderByNumber.get(order.number);
}

// ── Автоматика: автоотмена, напоминание об оплате, контрольный анализ, подписки, утренняя сводка ──
function runJobs(){
  const now = Date.now(), done = { cancelled: 0, reminded: 0, control: 0, subs: 0, digest: 0 }, canMail = !!ENV.SMTP_HOST, iso = ms => new Date(ms).toISOString();
  const graceHours = Math.max(Math.round(CFG.cancelDays * 24 - CFG.remindHours), 1);
  // 1. Автоотмена: только заказы, которым уже напоминали со ссылкой, и только если платёж не в процессе.
  if (CFG.cancelDays > 0) for (const o of q.unpaidToCancel.all(now - graceHours * HOUR, iso(now - CFG.cancelDays * DAY))) {
    if (q.payPending.get(o.number)) continue;
    setOrderStatus(o.number, 'cancelled', { actor: 'auto', text: `Заказ ${o.number} отменён: оплата не поступила. Оформить заново можно в каталоге: ${ORIGIN}/catalog.html. Если вы оплатили, ответьте на это письмо.` });
    done.cancelled++;
  }
  // 2. Напоминание об оплате со ссылкой. Заказам, созданным до подключения оплаты, ссылка выдаётся здесь же.
  if (canMail && CFG.remindHours > 0) for (const o of q.unpaidToRemind.all(iso(now - CFG.remindHours * HOUR))) {
    const url = o.pay_url || payUrl(o.pay_method, o); if (!url) continue;
    if (!o.pay_url) q.setPayUrl.run(url, o.number);
    q.setReminded.run(now, o.number);
    const tail = CFG.cancelDays > 0 ? `Если оплата не поступит в течение ${graceHours} ч, заказ отменится автоматически.` : '';
    send(o.email, `заказ ${o.number} ждёт оплаты`, `Заказ ${o.number} ждёт оплаты: ${money(o.total_uzs)}.\nОплатить: ${url}\n${tail}`, `<p>Заказ ${o.number} ждёт оплаты: <b>${esc(money(o.total_uzs))}</b>.</p>${button(url, `Оплатить ${money(o.total_uzs)}`)}<p style="color:#5A6862;font-size:15px">${tail}</p>`, o.number);
    done.reminded++;
  }
  // 3. Контрольный анализ: письмо через 90 дней после доставки.
  if (canMail && CFG.controlDays > 0) for (const o of q.controlDue.all(now - CFG.controlDays * DAY)) {
    q.setControl.run(now, o.number);
    const metrics = [...new Set(JSON.parse(o.items).map(l => CATALOG.products.find(p => p.sku === l.sku)?.metric).filter(Boolean))].join('; ');
    send(o.email, 'пора сдать контрольный анализ', `Заказ ${o.number} доставлен ${plural(CFG.controlDays, 'день', 'дня', 'дней')} назад. Самое время сдать контрольный анализ и сравнить цифры с исходными.${metrics ? ` Показатели по вашему заказу: ${metrics}.` : ''} По результату решите с врачом, продолжать ли курс. Каталог: ${ORIGIN}/catalog.html`, null, o.number);
    done.control++;
  }
  // 4. Подписки: письмо с кнопками «Подтвердить» и «Остановить». Два письма без ответа — подписка засыпает.
  if (canMail) for (const sub of q.subsDue.all(now)) {
    if (sub.nudges >= 2) { q.subStatus.run('lapsed', now, sub.id); audit('auto', 'sub.lapse', String(sub.id), null); continue; }
    q.subNudged.run(now + 7 * DAY, sub.id);
    const off = Math.round(CATALOG.subscriptionDiscount * 100), title = subTitle(sub);
    send(sub.email, 'пора продлить подписку', `Курс по подписке подходит к концу: ${title}.\nПодтвердить следующую отправку со скидкой ${off}%: ${subLink(sub, 'renew')}\nОстановить подписку: ${subLink(sub, 'stop')}`,
      `<p>Курс по подписке подходит к концу: <b>${esc(title)}</b>.</p>${button(subLink(sub, 'renew'), `Подтвердить отправку со скидкой ${off}%`)}<p style="color:#5A6862;font-size:15px">Без подтверждения ничего не отправим и не спишем. <a href="${esc(subLink(sub, 'stop'))}" style="color:#0E6E5A">Остановить подписку</a></p>`, 'sub:' + sub.id);
    done.subs++;
  }
  // 5. Утренняя сводка в Telegram: раз в день после 09:00 по Ташкенту и только если есть что делать.
  const local = new Date(now + 5 * HOUR), day = local.toISOString().slice(0, 10);
  if (TG.chat && local.getUTCHours() >= CFG.digestHour && q.metaGet.get('digest')?.value !== day) {
    q.metaPut.run('digest', day);
    const n = Object.fromEntries(q.countByStatus.all().map(r => [r.status, r.n]));
    if (n.new || n.paid || n.packed) { tg(`☀️ <b>Заказы на сегодня</b>\nПодтвердить (оплата при получении): ${n.new || 0}\nСобрать (оплачены): ${n.paid || 0}\nОтправить (собраны): ${n.packed || 0}\nЖдут оплаты: ${n.awaiting_payment || 0}${TG.ops ? '\nСписок с кнопками: /orders' : ''}`); done.digest = 1; }
  }
  return done;
}

// ── HTTP ─────────────────────────────────────────────────────────
// Страница без зависимостей от статики: ошибки оплаты, подтверждение и остановка подписки.
function page(res, code, title, bodyHtml){
  res.writeHead(code, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' });
  res.end(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} — ${BRAND}</title>
<body style="margin:0;background:#FAF8F3;font:17px/1.6 Arial,sans-serif;color:#14201C"><div style="max-width:560px;margin:10vh auto;padding:0 20px">
<div style="font:700 20px/1 Arial,sans-serif;letter-spacing:.18em;margin-bottom:24px">${BRAND}</div>
<div style="background:#fff;border:1px solid #E4E0D6;border-radius:14px;padding:28px"><h1 style="font:700 24px/1.2 Arial,sans-serif;margin:0 0 16px">${esc(title)}</h1>${bodyHtml}</div>
<p style="font-size:14px;color:#5A6862;margin-top:20px"><a href="${ORIGIN}/account.html" style="color:#0E6E5A">Кабинет и заказы</a> · <a href="mailto:${SUPPORT}" style="color:#0E6E5A">${SUPPORT}</a></p></div></body></html>`);
}
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

// Создаёт заказ: проверка полей, серверный пересчёт цен, письмо покупателю и уведомление в Telegram.
// Общая точка для сайта и продления подписки. Ошибка в данных — HttpError 400 с текстом для покупателя.
function placeOrder(b, ip, source = 'site'){
  const bad = msg => { throw new HttpError(400, msg); };
  const email = String(b.email || '').trim().toLowerCase(), str = (k, max = 200) => String(b[k] || '').trim().slice(0, max);
  if (!isEmail(email)) bad('Укажите почту.');
  for (const k of ['name', 'country', 'city', 'address']) if (!str(k)) bad('Заполните имя, страну, город и адрес.');
  if (!Array.isArray(b.items) || !b.items.length) bad('Корзина пуста.');
  const method = ['payme', 'click', 'card', 'cod', 'usdt'].includes(b.pay_method) ? b.pay_method : 'card';
  if (!CATALOG.zones.some(z => z.countries.includes(str('country')))) bad('Выберите страну из списка.');
  const zone = zoneFor(str('country'));
  if (method === 'usdt' && !(USDT.on && USDT.zones.includes(zone.id))) bad('Оплата USDT для этой страны недоступна. Выберите другой способ.');
  if (!['card', 'usdt'].includes(method) && zone.id !== 'uz') bad('Для доставки за пределы Узбекистана доступна только оплата картой.');
  let items; try { items = priceLines(b.items); } catch (e) { bad(e.message); }
  const subtotal_uzs = items.reduce((a, l) => a + l.price_uzs * l.qty, 0), subtotal_usd = items.reduce((a, l) => a + l.price_usd * l.qty, 0);
  const free = zone.freeFrom && subtotal_uzs >= zone.freeFrom, shipping_uzs = free ? 0 : zone.uzs, shipping_usd = free ? 0 : zone.usd;
  const order = { number: orderNumber(), email, name: str('name', 120), phone: str('phone', 40) || null, country: str('country', 80), city: str('city', 120), address: str('address', 400), postcode: str('postcode', 20) || null,
    items, subtotal_uzs, shipping_uzs, total_uzs: subtotal_uzs + shipping_uzs, total_usd: subtotal_usd + shipping_usd, currency: b.currency === 'USD' ? 'USD' : 'UZS',
    pay_method: method, status: method === 'cod' ? 'new' : 'awaiting_payment', note: str('note', 1000) || null };
  order.pay_url = payUrl(method, order);
  if (method === 'usdt') { order.crypto_amount = usdtAmount(order.total_usd); order.pay_url = `${ORIGIN}/api/pay/usdt?o=${order.number}&k=${usdtKey(order.number)}`; }
  q.insertOrder.run(order.number, order.email, order.name, order.phone, order.country, order.city, order.address, order.postcode, JSON.stringify(items), order.subtotal_uzs, order.shipping_uzs, order.total_uzs, order.total_usd, order.currency, order.pay_method, order.status, order.note, order.pay_url, ip);
  if (order.crypto_amount) q.setCrypto.run(order.crypto_amount, order.pay_url, order.number);
  audit(email, 'order.create', order.number, { total: order.total_uzs, method, zone: zone.id, source });
  const lines = items.map(l => `${l.name}${l.subscription ? ' (подписка)' : ''} × ${l.qty} — ${money(l.price_uzs * l.qty)}`);
  const how = order.pay_url ? `Оплатить: ${order.pay_url}` : ({ payme:'Ссылка на оплату Payme придёт отдельным письмом в течение рабочего дня.', click:'Ссылка на оплату Click придёт отдельным письмом в течение рабочего дня.', card:'Защищённая ссылка на оплату картой придёт отдельным письмом в течение рабочего дня. Сумма в долларах по курсу на день заказа.', cod:'Курьер свяжется для согласования времени. Оплата при получении.' }[method]);
  const text = `Заказ ${order.number} принят.\n\n${lines.join('\n')}\nДоставка: ${free ? 'бесплатно' : money(shipping_uzs)} (${zone.name}, ${zone.days})\nИтого: ${money(order.total_uzs)}\n\n${how}\n\nСтатус заказа: ${ORIGIN}/account.html (вход по этой почте, без пароля).`;
  send(email, `заказ ${order.number} принят`, text, `<p>${lines.map(esc).join('<br>')}</p><p>Доставка: ${free ? 'бесплатно' : esc(money(shipping_uzs))} · ${esc(zone.name)}, ${esc(zone.days)}<br><b>Итого: ${esc(money(order.total_uzs))}</b></p>` +
    (order.pay_url ? button(order.pay_url, `Оплатить ${money(order.total_uzs)}`) : `<p>${esc(how)}</p>`) +
    `<p style="color:#5A6862;font-size:15px">Статус заказа в кабинете: <a href="${ORIGIN}/account.html" style="color:#0E6E5A">${ORIGIN}/account.html</a>, вход по этой почте без пароля.</p>`, order.number);
  tg((source === 'subscription' ? '🔁 Продление подписки\n' : '') + orderCard(order), orderButtons(order.number, order.status));
  return order;
}

const routes = {
  'GET /api/health': async (req, res) => json(res, 200, { ok:true, products: CATALOG.products.length,
    pay: { payme: !!(ENV.PAYME_MERCHANT && ENV.PAYME_KEY), click: !!(ENV.CLICK_SERVICE_ID && ENV.CLICK_SECRET_KEY), card: !!(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_WEBHOOK_SECRET), usdt: USDT.on ? USDT.zones : false } }),

  'POST /api/orders': async (req, res) => {
    const ip = ipOf(req); if (limited('order:' + ip, 10, 3600e3)) return json(res, 429, { error:'Слишком много заказов с этого адреса. Попробуйте позже.' });
    const order = placeOrder(await body(req), ip);
    json(res, 201, { number: order.number, email: order.email, total_uzs: order.total_uzs, total_usd: order.total_usd, status: order.status, pay_url: order.pay_url });
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
    json(res, 200, { email: s.email,
      orders: q.ordersByEmail.all(s.email).map(o => ({ ...o, items: JSON.parse(o.items), pay_url: o.status !== 'awaiting_payment' ? null : o.pay_url || payUrl(o.pay_method, { ...o, email: s.email }) })),
      subs: q.subsByEmail.all(s.email).map(sub => ({ id: sub.id, title: subTitle(sub), next_at: sub.next_at })) });
  },
  'POST /api/me/subs/stop': async (req, res) => {
    const s = sessionEmail(req); if (!s) return json(res, 401, { error:'Нужно войти.' });
    const sub = q.subGet.get(+(await body(req)).id || 0); if (!sub || sub.email !== s.email) return json(res, 404, { error:'Подписка не найдена.' });
    subStop(sub, s.email); json(res, 200, { ok:true });
  },

  // Ссылки из письма о подписке. GET только показывает кнопку: почтовые сканеры открывают ссылки сами, действие — по POST.
  'GET /api/sub': async (req, res, url) => {
    const sub = subFromLink(url.searchParams.get('s'), url.searchParams.get('k')), stop = url.searchParams.get('a') === 'stop';
    if (!sub) return page(res, 404, 'Ссылка не подошла', '<p>Ссылка устарела или скопирована не полностью. Подпиской можно управлять в кабинете.</p>');
    if (sub.status === 'stopped') return page(res, 200, 'Подписка остановлена', '<p>Напоминаний и отправок по ней больше не будет. Возобновить можно новым заказом с подпиской.</p>');
    const form = (a, label, primary) => `<form method="post" action="${BASE}/api/sub" style="margin:0 0 12px"><input type="hidden" name="s" value="${sub.id}"><input type="hidden" name="k" value="${subKey(sub.id)}"><input type="hidden" name="a" value="${a}"><button style="font:600 17px Arial,sans-serif;cursor:pointer;padding:14px 24px;border-radius:999px;border:1px solid #0E6E5A;background:${primary ? '#0E6E5A' : '#fff'};color:${primary ? '#fff' : '#0E6E5A'}">${label}</button></form>`;
    if (stop) return page(res, 200, 'Остановить подписку?', `<p>${esc(subTitle(sub))}</p>${form('stop', 'Остановить подписку', true)}<p style="font-size:15px;color:#5A6862">Напоминаний и отправок больше не будет. Уже оплаченные заказы приедут как обычно.</p>`);
    page(res, 200, 'Следующая отправка по подписке', `<p>${esc(subTitle(sub))}</p><p style="font-size:15px;color:#5A6862">Адрес и способ оплаты — как в прошлом заказе, цена со скидкой ${Math.round(CATALOG.subscriptionDiscount * 100)}%.</p>${form('renew', 'Подтвердить отправку', true)}${form('stop', 'Остановить подписку', false)}`);
  },
  'POST /api/sub': async (req, res) => {
    const ip = ipOf(req), b = await formBody(req), sub = subFromLink(b.s, b.k);
    if (!sub) return page(res, 404, 'Ссылка не подошла', '<p>Ссылка устарела или скопирована не полностью. Подпиской можно управлять в кабинете.</p>');
    if (limited('sub:' + ip, 20, HOUR)) return page(res, 429, 'Слишком много попыток', '<p>Подождите час и попробуйте ещё раз.</p>');
    if (b.a === 'stop') { subStop(sub, sub.email); return page(res, 200, 'Подписка остановлена', '<p>Напоминаний и отправок по ней больше не будет. Возобновить можно новым заказом с подпиской.</p>'); }
    let o; try { o = subRenew(sub, ip); } catch (e) { if (!(e instanceof HttpError)) throw e; return page(res, 400, 'Не получилось оформить', `<p>${esc(e.message)} Напишите на <a href="mailto:${SUPPORT}">${SUPPORT}</a>, оформим вручную.</p>`); }
    if (o.status === 'awaiting_payment' && o.pay_url) { res.writeHead(303, { location: o.pay_url, 'cache-control':'no-store' }); return res.end(); }
    page(res, 200, `Заказ ${o.number} оформлен`, `<p>${o.pay_method === 'cod' ? 'Курьер свяжется для согласования времени. Оплата при получении.' : 'Ссылка на оплату придёт на почту в течение рабочего дня.'}</p><p>Подтверждение отправлено на ${esc(o.email)}.</p>`);
  },

  // Payme → кабинет Payme Business, «Endpoint URL»: https://erkak.com/shop/api/pay/payme
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

  // USDT: страница с адресом кошелька и точной суммой. Сама проверяет, пришла ли оплата.
  'GET /api/pay/usdt': async (req, res, url) => {
    const number = String(url.searchParams.get('o') || '').toUpperCase(), o = safeEq(url.searchParams.get('k') || '', usdtKey(number)) ? q.orderByNumber.get(number) : null;
    if (!o || !o.crypto_amount) return page(res, 404, 'Ссылка не подошла', '<p>Ссылка устарела или скопирована не полностью. Откройте её из письма о заказе или из кабинета.</p>');
    if (o.status !== 'awaiting_payment') { res.writeHead(303, { location: `${ORIGIN}/account.html?paid=${number}`, 'cache-control':'no-store' }); return res.end(); }
    if (!USDT.on) return page(res, 503, 'Оплата USDT временно недоступна', `<p>Напишите на <a href="mailto:${SUPPORT}">${SUPPORT}</a> и укажите номер заказа ${esc(number)}.</p>`);
    const amount = usdtText(o.crypto_amount), row = (label, value, id) => `<p style="margin:0 0 4px;color:#5A6862;font-size:14px">${label}</p><p style="margin:0 0 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b ${id ? `id="${id}"` : ''} style="font:600 18px/1.4 Menlo,Consolas,monospace;word-break:break-all">${esc(value)}</b>${id ? `<button type="button" data-copy="${id}" style="font:600 14px Arial,sans-serif;cursor:pointer;padding:8px 14px;border-radius:999px;border:1px solid #0E6E5A;background:#fff;color:#0E6E5A">Скопировать</button>` : ''}</p>`;
    page(res, 200, `Оплата заказа ${number}`, `${row('Сеть', 'TRON (TRC-20)')}${row('Адрес', USDT.address, 'addr')}${row('Сумма, USDT', amount, 'sum')}
<p style="font-size:15px;border-left:4px solid #C98A1B;padding:2px 0 2px 14px">Отправьте ровно <b>${amount} USDT</b> в сети TRON (TRC-20). По сумме мы узнаём ваш платёж, поэтому получатель должен получить её целиком: комиссию кошелёк или биржа берёт сверху. Другая сеть или другая монета до нас не дойдут.</p>
<p id="state" style="font-size:15px;color:#5A6862">Ждём перевод. Страница обновится сама, обычно через 1–3 минуты после отправки.</p>
<script>
document.querySelectorAll('[data-copy]').forEach(function(b){ b.onclick = function(){ navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent).then(function(){ b.textContent = 'Скопировано'; setTimeout(function(){ b.textContent = 'Скопировать'; }, 1500); }); }; });
setInterval(function(){ fetch('${BASE}/api/pay/usdt/status' + location.search).then(function(r){ return r.json(); }).then(function(d){ if (d.status && d.status !== 'awaiting_payment') location.href = '${BASE}/account.html?paid=${number}'; }).catch(function(){}); }, 15000);
</script>`);
  },
  'GET /api/pay/usdt/status': async (req, res, url) => {
    const number = String(url.searchParams.get('o') || '').toUpperCase(), o = safeEq(url.searchParams.get('k') || '', usdtKey(number)) ? q.orderByNumber.get(number) : null;
    if (!o) return json(res, 404, { error:'Не найдено' });
    json(res, 200, { status: o.status });
  },

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
      page(res, 502, 'Не удалось открыть оплату', `<p>Обновите страницу через минуту. Если не помогает, напишите на <a href="mailto:${SUPPORT}">${SUPPORT}</a> и укажите номер заказа ${esc(number)}.</p>`);
    }
  },

  // Stripe → Developers → Webhooks: https://erkak.com/shop/api/pay/stripe, события checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
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
  const tick = () => { try { runJobs(); } catch (e) { audit('system', 'error', 'jobs', { error: e.message }); } };
  setTimeout(tick, 30_000).unref(); setInterval(tick, 600_000).unref();
  if (TG.ops) tgPoll();
  // USDT: раз в минуту, пока есть ожидающие заказы; иначе раз в 10 минут, чтобы заметить поздний перевод.
  let usdtAt = 0, usdtBusy = false;
  if (USDT.on) setInterval(async () => {
    if (usdtBusy || (!q.cryptoOpen.get().n && Date.now() - usdtAt < 600e3)) return;
    usdtBusy = true; usdtAt = Date.now();
    try { await usdtScan(); } catch (e) { audit('system', 'error', 'usdt', { error: e.message }); } finally { usdtBusy = false; }
  }, 60_000).unref();
}

// ── CLI ──────────────────────────────────────────────────────────
const finish = async code => { await Promise.allSettled(pending); process.exit(code); };
if (CLI === 'status') {
  const [, , , number, status, tracking] = process.argv;
  if (!STATUS_RU[status]) { console.error('Статусы: ' + Object.keys(STATUS_RU).join(', ')); process.exit(1); }
  const r = setOrderStatus(number, status, { tracking, actor: 'cli' }); if (!r) { console.error('Нет заказа ' + number); process.exit(1); }
  r.mail.then(e => { if (e) console.error('mail:', e.message); console.log(`${number} → ${STATUS_RU[status]}${tracking ? ' · ' + tracking : ''}`); finish(0); });
} else if (CLI === 'orders') {
  console.table(q.lastOrders.all(+(process.argv[3] || 20))); process.exit(0);
} else if (CLI === 'payments') {
  const at = ms => ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '';
  console.table(q.lastPayments.all(+(process.argv[3] || 20)).map(p => ({ ...p, create_time: at(p.create_time), perform_time: at(p.perform_time), cancel_time: at(p.cancel_time) }))); process.exit(0);
} else if (CLI === 'backup') {
  // Целостная копия работающей базы; хранится BACKUP_KEEP последних (0 — хранить все).
  const dir = path.join(DATA_DIR, 'backups'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `erkak-${new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}.db`);
  fs.rmSync(file, { force: true }); db.exec(`vacuum into '${file.replaceAll("'", "''")}'`); fs.chmodSync(file, 0o600);
  const copy = new DatabaseSync(file), check = copy.prepare('pragma integrity_check').get().integrity_check, n = copy.prepare('select count(*) n from orders').get().n; copy.close();
  if (check !== 'ok') { console.error(`Копия повреждена: ${check}`); process.exit(1); }
  const old = CFG.backupKeep > 0 ? fs.readdirSync(dir).filter(f => /^erkak-\d{8}-\d{4}\.db$/.test(f)).sort().slice(0, -CFG.backupKeep) : [];
  for (const f of old) fs.rmSync(path.join(dir, f));
  console.log(`Копия: ${file} · заказов: ${n} · удалено старых копий: ${old.length}`); process.exit(0);
} else if (CLI === 'usdt') {
  if (!USDT.on) { console.error(USDT.address ? 'Адрес USDT_TRC20_ADDRESS не прошёл проверку.' : 'USDT_TRC20_ADDRESS не задан.'); process.exit(1); }
  usdtScan().then(r => { console.log(r); finish(0); }, e => { console.error('usdt:', e.message); process.exit(1); });
} else if (CLI === 'jobs') {
  console.log(runJobs()); finish(0);
}
