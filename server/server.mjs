// ERKAK shop API · Node 22, без зависимостей: http + node:sqlite + SMTP + Telegram.
// Запуск: node server.mjs            (переменные из /opt/erkak/.env через systemd)
// CLI:    node server.mjs status EK-260905-1234 shipped [трек]
//         node server.mjs orders [n]
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
function loadCatalog(){
  const src = fs.readFileSync(path.join(STATIC_DIR, 'assets', 'catalog.js'), 'utf8');
  return vm.runInNewContext(src + ';CATALOG', {});
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
};
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
function payUrl(method, order){
  const tiyin = order.total_uzs * 100;
  if (method === 'payme' && ENV.PAYME_MERCHANT) return `https://checkout.paycom.uz/${Buffer.from(`m=${ENV.PAYME_MERCHANT};ac.order_id=${order.number};a=${tiyin};c=${ORIGIN}/account.html`).toString('base64')}`;
  if (method === 'click' && ENV.CLICK_SERVICE_ID) return `https://my.click.uz/services/pay?service_id=${ENV.CLICK_SERVICE_ID}&merchant_id=${ENV.CLICK_MERCHANT_ID}&amount=${order.total_uzs}&transaction_param=${order.number}&return_url=${encodeURIComponent(ORIGIN + '/account.html')}`;
  if (method === 'card' && ENV.STRIPE_LINK) return `${ENV.STRIPE_LINK}?client_reference_id=${order.number}&prefilled_email=${encodeURIComponent(order.email)}`;
  return null;
}
const STATUS_RU = { new:'Новый', awaiting_payment:'Ожидает оплаты', paid:'Оплачен', packed:'Собран', shipped:'Отправлен', delivered:'Доставлен', cancelled:'Отменён', refunded:'Возврат' };
const PAY_RU = { payme:'Payme', click:'Click', card:'Карта', cod:'При получении' };

// ── HTTP ─────────────────────────────────────────────────────────
const json = (res, code, obj) => { res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((res, rej) => { let d = ''; req.on('data', c => { d += c; if (d.length > 64e3) { rej(new Error('too large')); req.destroy(); } }); req.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch { rej(new Error('bad json')); } }); });
const isEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
const rate = new Map(); // key → [timestamps]
function limited(key, n, windowMs){ const now = Date.now(); const arr = (rate.get(key) || []).filter(t => now - t < windowMs); arr.push(now); rate.set(key, arr); return arr.length > n; }
setInterval(() => { const now = Date.now(); for (const [k, v] of rate) if (!v.some(t => now - t < 3600e3)) rate.delete(k); }, 600e3).unref();
function sessionEmail(req){
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization || ''); if (!m) return null;
  const s = q.session.get(m[1]); if (!s || s.expires_at < Date.now()) return null; return { email: s.email, token: m[1] };
}
function orderNumber(){ const d = new Date(); const ymd = d.toISOString().slice(2, 10).replace(/-/g, ''); return `EK-${ymd}-${crypto.randomInt(1000, 9999)}`; }

const routes = {
  'GET /api/health': async (req, res) => json(res, 200, { ok:true, products: CATALOG.products.length }),

  'POST /api/orders': async (req, res) => {
    const ip = ipOf(req); if (limited('order:' + ip, 10, 3600e3)) return json(res, 429, { error:'Слишком много заказов с этого адреса. Попробуйте позже.' });
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const str = (k, max = 200) => String(b[k] || '').trim().slice(0, max);
    if (!isEmail(email)) return json(res, 400, { error:'Укажите почту.' });
    for (const k of ['name','country','city','address']) if (!str(k)) return json(res, 400, { error:'Заполните имя, страну, город и адрес.' });
    if (!Array.isArray(b.items) || !b.items.length) return json(res, 400, { error:'Корзина пуста.' });
    const method = ['payme','click','card','cod'].includes(b.pay_method) ? b.pay_method : 'card';
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
    if (limited('order-login:' + ipOf(req), 20, 3600e3)) return json(res, 429, { error:'Слишком много попыток. Подождите.' });
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
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const key = `${req.method} ${url.pathname.replace(/\/$/, '')}`;
  const h = routes[key];
  if (!h) return json(res, 404, { error:'Не найдено' });
  try { await h(req, res, url); } catch (e) { audit('system', 'error', key, { error: e.message }); json(res, 500, { error:'Внутренняя ошибка. Попробуйте ещё раз.' }); }
}).listen(PORT, '127.0.0.1', () => console.log(`erkak-api on 127.0.0.1:${PORT}`));

// ── CLI ──────────────────────────────────────────────────────────
if (process.argv[2] === 'status') {
  const [, , , number, status, tracking] = process.argv;
  if (!STATUS_RU[status]) { console.error('Статусы: ' + Object.keys(STATUS_RU).join(', ')); process.exit(1); }
  const o = q.orderByNumber.get(number); if (!o) { console.error('Нет заказа ' + number); process.exit(1); }
  q.setStatus.run(status, tracking || null, number); audit('cli', 'order.status', number, { status, tracking });
  const text = { paid:`Оплата заказа ${number} получена. Собираем и отправляем в течение рабочего дня.`, packed:`Заказ ${number} собран и передаётся в доставку.`, shipped:`Заказ ${number} отправлен.${tracking ? ' Трек-номер: ' + tracking + '.' : ''} Статус в кабинете: ${ORIGIN}/account.html`, delivered:`Заказ ${number} доставлен. Через 90 дней напомним о контрольном анализе.`, cancelled:`Заказ ${number} отменён. Если это ошибка, ответьте на это письмо.`, refunded:`Возврат по заказу ${number} оформлен. Деньги вернутся тем же способом в течение 5–10 рабочих дней.` }[status];
  const done = () => { console.log(`${number} → ${STATUS_RU[status]}${tracking ? ' · ' + tracking : ''}`); process.exit(0); };
  if (text) sendMail({ to: o.email, subject: `${BRAND}: заказ ${number} — ${STATUS_RU[status].toLowerCase()}`, text, html: mailHtml(`Заказ ${number}: ${STATUS_RU[status].toLowerCase()}`, `<p>${esc(text)}</p>`) }).then(done, e => { console.error('mail:', e.message); done(); }); else done();
} else if (process.argv[2] === 'orders') {
  console.table(q.lastOrders.all(+(process.argv[3] || 20))); process.exit(0);
}
