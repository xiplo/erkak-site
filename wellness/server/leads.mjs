// ERKAK · приём заявок. Node 22, без зависимостей: http + node:sqlite + Telegram.
// Запуск:  node server/leads.mjs                 (API на 127.0.0.1:8796, за nginx)
//          STATIC_DIR=. node server/leads.mjs    (локально: API + статика сайта)
// CLI:     node server/leads.mjs list [n]        последние заявки
//          node server/leads.mjs tg-test          тестовое сообщение в группу заявок
//          node server/leads.mjs status <id> <new|contacted|quoted|deposit|done|lost> [заметка]
//          node server/leads.mjs stats            воронка, источники, языки за 30 дней
//          node server/leads.mjs export [дней] > leads.csv   выгрузка в CSV (по умолчанию 90 дней)
// Переменные: PORT, DATA_DIR, STATIC_DIR, TELEGRAM_BOT_TOKEN, LEADS_TG_CHAT, ALLOWED_ORIGIN,
//             STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_ORIGIN (по умолчанию https://erkak.com)
// Оплата: POST /api/checkout — предоплата 30% за тур через Stripe Checkout; POST /api/stripe — вебхук Stripe.
// Цены берутся только из prices.json (его пишет build.mjs), а не из запроса браузера.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ENV = process.env;
const PORT = +(ENV.PORT || 8796);
const DATA_DIR = ENV.DATA_DIR || path.join(process.cwd(), 'data');
const STATIC_DIR = ENV.STATIC_DIR ? path.resolve(ENV.STATIC_DIR) : '';
fs.mkdirSync(DATA_DIR, { recursive:true });

const db = new DatabaseSync(path.join(DATA_DIR, 'leads.db'));
db.exec(`
pragma journal_mode = wal;
create table if not exists leads (
  id integer primary key autoincrement,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  type text not null, tour text, name text, contact text not null, channel text, date text, guests text,
  answers text, summary text, page text, utm text, ref text, ip text, ua text,
  status text not null default 'new', note text, updated_at text
);
create index if not exists leads_created on leads(created_at desc);`);
// Миграции: колонки, появившиеся с многоязычным сайтом
const cols = new Set(db.prepare('pragma table_info(leads)').all().map(c => c.name));
for (const [c, def] of [['lang', 'text'], ['currency', 'text']]) if (!cols.has(c)) db.exec(`alter table leads add column ${c} ${def}`);
const q = {
  insert: db.prepare(`insert into leads (type,tour,name,contact,channel,date,guests,answers,summary,page,utm,ref,ip,ua,lang,currency) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  last: db.prepare(`select id,created_at,lang,type,tour,name,contact,date,status from leads order by id desc limit ?`),
  exportAll: db.prepare(`select id,created_at,lang,type,tour,name,contact,channel,date,guests,summary,currency,page,json_extract(utm,'$.utm_source') utm_source,json_extract(utm,'$.utm_campaign') utm_campaign,ref,status,note from leads where created_at > datetime('now', ?) order by id`),
  langs: db.prepare(`select coalesce(lang,'?') lang, count(*) n from leads where created_at > datetime('now','-30 days') group by lang order by n desc`),
  setStatus: db.prepare(`update leads set status = ?, note = coalesce(?, note), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ?`),
  funnel: db.prepare(`select status, count(*) n from leads where created_at > datetime('now','-30 days') group by status`),
  sources: db.prepare(`select coalesce(json_extract(utm,'$.utm_source'), case when ref = '' then 'direct' else 'referral' end) src, count(*) n from leads where created_at > datetime('now','-30 days') group by src order by n desc`),
  tours: db.prepare(`select tour, count(*) n from leads where created_at > datetime('now','-30 days') group by tour order by n desc`)
};

const TYPES = new Set(['quiz','tour','guide','eco','waitlist','plan']);
const LANGS = new Set(['ru','en','de','ar','zh','uz']);
const STATUSES = ['new','contacted','quoted','deposit','done','lost'];
const clip = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rate = new Map();
const limited = ip => { const now = Date.now(); const a = (rate.get(ip) || []).filter(t => now - t < 3_600_000); a.push(now); rate.set(ip, a); return a.length > 8; };

// Отправка в Telegram-группу заявок. Возвращает ответ API, чтобы tg-test мог показать ошибку.
async function tg(text){
  const token = ENV.TELEGRAM_BOT_TOKEN, chat = ENV.LEADS_TG_CHAT;
  if (!token || !chat) return { ok:false, description:'TELEGRAM_BOT_TOKEN или LEADS_TG_CHAT не заданы' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ chat_id:chat, text, parse_mode:'HTML', disable_web_page_preview:true }) });
    const j = await r.json(); if (!j.ok) console.error('telegram:', j.description); return j;
  } catch (e) { console.error('telegram:', e.message); return { ok:false, description:e.message }; }
}

async function notify(lead, id){
  const u = lead.utm || {};
  const text = [
    `${({ waitlist:'📝', eco:'🧭', plan:'🗺' })[lead.type] || '🎣'} <b>Заявка #${id}</b> · ${esc(lead.type)} · ${esc((lead.lang || '?').toUpperCase())}`,
    lead.tourTitle && `Программа: <b>${esc(lead.tourTitle)}</b>`,
    lead.name && `Имя: ${esc(lead.name)}`,
    `Контакт: <code>${esc(lead.contact)}</code>${lead.channel ? ' · ' + esc(lead.channel) : ''}`,
    lead.date && `Даты: ${esc(lead.date)}`,
    lead.guests && `Гостей: ${esc(lead.guests)}`,
    lead.currency && `Валюта на сайте: ${esc(lead.currency)}`,
    lead.summary && `Квиз: ${esc(lead.summary)}`,
    lead.guide && 'Хочет гайд по Андаману',
    (u.utm_source || u.ref) && `Источник: ${esc([u.utm_source, u.utm_campaign, u.ref].filter(Boolean).join(' / '))}`,
    '⏱ Ответить в течение 15 минут'
  ].filter(Boolean).join('\n');
  await tg(text);
}

// ── Оплата: Stripe Checkout, предоплата 30% ─────────────────────────
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRICES_FILE = path.join(HERE, 'prices.json');
const PRICES = fs.existsSync(PRICES_FILE) ? JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8')) : { tours:{} };
const ORIGIN = (ENV.SITE_ORIGIN || 'https://erkak.com').replace(/\/$/, '');
const DEPOSIT = PRICES.deposit || 0.3;
const money = (n, cur) => new Intl.NumberFormat('ru-RU').format(n) + ' ' + cur;

async function stripe(pathname, form){
  const body = new URLSearchParams(form);
  const r = await fetch('https://api.stripe.com/v1/' + pathname, { method:'POST', headers:{ authorization:'Bearer ' + ENV.STRIPE_SECRET_KEY, 'content-type':'application/x-www-form-urlencoded' }, body });
  const j = await r.json(); if (!r.ok) throw new Error(j.error ? j.error.message : 'Stripe ' + r.status); return j;
}

async function postCheckout(req, res){
  if (!ENV.STRIPE_SECRET_KEY) return json(res, 503, { error:'payments_off' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return json(res, 429, { error:'Слишком много попыток. Напишите нам в мессенджер.' });
  let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error:'Неверный запрос' }); }
  if (b.company) return json(res, 200, { ok:true });
  const t = PRICES.tours[clip(b.tour, 60)];
  if (!t || !t.online) return json(res, 400, { error:'Для этой программы онлайн-оплата недоступна' });
  const lang = LANGS.has(b.lang) ? b.lang : 'en';
  const guests = Math.max(1, Math.min(t.max || 6, parseInt(b.guests, 10) || 1));
  const contact = clip(b.contact, 120);
  if (contact.length < 4) return json(res, 400, { error:'Укажите контакт' });
  const total = t.per === 'person' ? t.price * guests : t.price;
  const deposit = Math.round(total * DEPOSIT);
  const title = (t.title && (t.title[lang] || t.title.en)) || b.tour;
  const lead = { type:'tour', tour:b.tour, tourTitle:title, name:clip(b.name, 80), contact, channel:'', date:clip(b.date, 120), guests:String(guests), summary:`Онлайн-предоплата ${money(deposit, t.cur)} из ${money(total, t.cur)}`,
    answers:{}, utm:b.utm && typeof b.utm === 'object' ? b.utm : {}, page:clip(b.page, 200), ref:clip(b.ref, 300), lang, currency:t.cur };
  const r = q.insert.run(lead.type, lead.tour, lead.name, lead.contact, 'stripe', lead.date, lead.guests, '{}', lead.summary, lead.page, JSON.stringify(lead.utm).slice(0, 1000), lead.ref, ip, clip(req.headers['user-agent'] || '', 300), lead.lang, lead.currency);
  const id = Number(r.lastInsertRowid);
  const back = ORIGIN + (lead.page && lead.page.startsWith('/') ? lead.page.split('?')[0] : `/${lang}/`);
  try {
    const cs = await stripe('checkout/sessions', {
      mode:'payment', locale:'auto', client_reference_id:String(id),
      success_url:`${ORIGIN}/${lang}/pay/done/?session_id={CHECKOUT_SESSION_ID}`, cancel_url:back + '?pay=cancel',
      'line_items[0][quantity]':'1', 'line_items[0][price_data][currency]':t.cur.toLowerCase(), 'line_items[0][price_data][unit_amount]':String(deposit * 100),
      'line_items[0][price_data][product_data][name]':`${Math.round(DEPOSIT * 100)}% · ${title}`,
      'line_items[0][price_data][product_data][description]':[lead.date, t.per === 'person' ? `× ${guests}` : ''].filter(Boolean).join(' · ') || title,
      'metadata[lead_id]':String(id), 'metadata[tour]':lead.tour, 'payment_intent_data[metadata][lead_id]':String(id)
    });
    q.setStatus.run('new', `Stripe: ${cs.id}`, id);
    notify({ ...lead, summary:lead.summary + ' — ждём оплату' }, id);
    json(res, 200, { ok:true, id, url:cs.url });
  } catch (e) {
    console.error('stripe:', e.message);
    notify({ ...lead, summary:lead.summary + ' — Stripe недоступен, связаться вручную' }, id);
    json(res, 502, { error:'payments_failed', id });
  }
}

// Вебхук: подпись Stripe-Signature (HMAC-SHA256 от «t.тело»), допуск 5 минут
function stripeVerified(raw, header){
  const secret = ENV.STRIPE_WEBHOOK_SECRET; if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map(x => x.split('=')).filter(x => x.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!parts.t || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const want = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  return sigs.some(s => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

async function postStripe(req, res){
  const raw = await readBody(req, 262_144);
  if (!stripeVerified(raw, req.headers['stripe-signature'])) return json(res, 400, { error:'bad signature' });
  const ev = JSON.parse(raw), o = ev.data && ev.data.object || {};
  if (ev.type === 'checkout.session.completed' && o.payment_status === 'paid') {
    const id = Number(o.client_reference_id || (o.metadata && o.metadata.lead_id));
    const paid = money(Math.round(o.amount_total / 100), String(o.currency || '').toUpperCase());
    if (id) q.setStatus.run('deposit', `Оплачено ${paid} · ${o.id}`, id);
    await tg(`💳 <b>Предоплата получена</b> · заявка #${esc(id || '?')}\nСумма: <b>${esc(paid)}</b>\n${o.customer_details && o.customer_details.email ? 'E-mail: ' + esc(o.customer_details.email) + '\n' : ''}${o.customer_details && o.customer_details.phone ? 'Телефон: ' + esc(o.customer_details.phone) + '\n' : ''}⏱ Подтвердить бронь клиенту`);
  }
  json(res, 200, { received:true });
}

function json(res, code, body){ res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(body)); }
function readBody(req, max = 16_384){
  // Собираем байты целиком: иначе многобайтовый символ на стыке кусков испортит текст (и подпись Stripe)
  return new Promise((ok, fail) => { const parts = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { fail(new Error('too large')); req.destroy(); } else parts.push(c); }); req.on('end', () => ok(Buffer.concat(parts).toString('utf8'))); req.on('error', fail); });
}

async function postLead(req, res){
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return json(res, 429, { error:'Слишком много заявок. Напишите нам в мессенджер.' });
  let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error:'Неверный запрос' }); }
  if (b.company) return json(res, 200, { ok:true }); // ловушка для ботов
  const lead = {
    type: TYPES.has(b.type) ? b.type : 'quiz', tour: clip(b.tour, 200), tourTitle: clip(b.tourTitle, 300), name: clip(b.name, 80), contact: clip(b.contact, 120),
    channel: clip(b.channel, 20), date: clip(b.date, 120), guests: clip(b.guests, 20), summary: clip(b.summary, 400), guide: !!b.guide,
    answers: b.answers && typeof b.answers === 'object' ? b.answers : {}, utm: b.utm && typeof b.utm === 'object' ? b.utm : {}, page: clip(b.page, 200), ref: clip(b.ref, 300),
    lang: LANGS.has(b.lang) ? b.lang : '', currency: /^[A-Z]{3}$/.test(b.currency || '') ? b.currency : ''
  };
  if (lead.contact.length < 4) return json(res, 400, { error:'Укажите контакт' });
  const r = q.insert.run(lead.type, lead.tour, lead.name, lead.contact, lead.channel, lead.date, lead.guests, JSON.stringify(lead.answers).slice(0, 2000), lead.summary, lead.page, JSON.stringify(lead.utm).slice(0, 1000), lead.ref, ip, clip(req.headers['user-agent'] || '', 300), lead.lang, lead.currency);
  const id = Number(r.lastInsertRowid);
  notify(lead, id);
  json(res, 200, { ok:true, id });
}

const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png', '.xml':'application/xml', '.txt':'text/plain' };
function serveStatic(req, res, url){
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(STATIC_DIR, '.' + p);
  if (!file.startsWith(STATIC_DIR + path.sep)) return json(res, 403, { error:'Запрещено' });
  fs.readFile(file, (err, buf) => { if (err) return json(res, 404, { error:'Не найдено' }); res.writeHead(200, { 'content-type':MIME[path.extname(file)] || 'application/octet-stream' }); res.end(buf); });
}

function cors(req, res){
  const o = ENV.ALLOWED_ORIGIN; if (!o) return;
  res.setHeader('access-control-allow-origin', o); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
}

const cmd = process.argv[2];
if (cmd === 'tg-test') {
  const r = await tg('✅ <b>ERKAK</b>: заявки с сайта будут приходить сюда.');
  console.log(r.ok ? 'Telegram: тестовое сообщение отправлено' : 'Telegram: ' + r.description); process.exitCode = r.ok ? 0 : 1;
} else if (cmd === 'list') {
  console.table(q.last.all(+(process.argv[3] || 20)));
} else if (cmd === 'status') {
  const [, , , id, st, ...note] = process.argv;
  if (!STATUSES.includes(st)) { console.error('Статусы: ' + STATUSES.join(', ')); process.exit(1); }
  const r = q.setStatus.run(st, note.join(' ') || null, +id); console.log(r.changes ? `#${id} → ${st}` : `Нет заявки #${id}`);
} else if (cmd === 'stats') {
  console.log('Воронка за 30 дней:'); console.table(q.funnel.all());
  console.log('Источники:'); console.table(q.sources.all());
  console.log('Туры:'); console.table(q.tours.all());
  console.log('Языки:'); console.table(q.langs.all());
} else if (cmd === 'export') {
  const rows = q.exportAll.all(`-${+(process.argv[3] || 90)} days`);
  const cell = v => { const t = v == null ? '' : String(v); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const head = rows.length ? Object.keys(rows[0]) : ['id'];
  process.stdout.write('\uFEFF' + [head.join(','), ...rows.map(r => head.map(k => cell(r[k])).join(','))].join('\n') + '\n');
} else {
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    cors(req, res);
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (url.pathname === '/api/lead' && req.method === 'POST') return await postLead(req, res);
      if (url.pathname === '/api/checkout' && req.method === 'POST') return await postCheckout(req, res);
      if (url.pathname === '/api/stripe' && req.method === 'POST') return await postStripe(req, res);
      if (url.pathname === '/api/health') return json(res, 200, { ok:true, payments:!!ENV.STRIPE_SECRET_KEY });
      if (STATIC_DIR && req.method === 'GET') return serveStatic(req, res, url);
      json(res, 404, { error:'Не найдено' });
    } catch (e) { console.error(e); json(res, 500, { error:'Внутренняя ошибка' }); }
  }).listen(PORT, STATIC_DIR ? '0.0.0.0' : '127.0.0.1', () => console.log(`erkak-leads on :${PORT}${STATIC_DIR ? ' + static ' + STATIC_DIR : ''}`));
}
