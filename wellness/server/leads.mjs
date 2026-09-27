// ERKAK · приём заявок. Node 22, без зависимостей: http + node:sqlite + Telegram.
// Запуск:  node server/leads.mjs                 (API на 127.0.0.1:8796, за nginx)
//          STATIC_DIR=. node server/leads.mjs    (локально: API + статика сайта)
// CLI:     node server/leads.mjs list [n]        последние заявки
//          node server/leads.mjs status <id> <new|contacted|quoted|deposit|done|lost> [заметка]
//          node server/leads.mjs stats            воронка и источники за 30 дней
// Переменные: PORT, DATA_DIR, STATIC_DIR, TELEGRAM_BOT_TOKEN, LEADS_TG_CHAT, ALLOWED_ORIGIN
import http from 'node:http';
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
const q = {
  insert: db.prepare(`insert into leads (type,tour,name,contact,channel,date,guests,answers,summary,page,utm,ref,ip,ua) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  last: db.prepare(`select id,created_at,type,tour,name,contact,channel,date,status from leads order by id desc limit ?`),
  setStatus: db.prepare(`update leads set status = ?, note = coalesce(?, note), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ?`),
  funnel: db.prepare(`select status, count(*) n from leads where created_at > datetime('now','-30 days') group by status`),
  sources: db.prepare(`select coalesce(json_extract(utm,'$.utm_source'), case when ref = '' then 'direct' else 'referral' end) src, count(*) n from leads where created_at > datetime('now','-30 days') group by src order by n desc`),
  tours: db.prepare(`select tour, count(*) n from leads where created_at > datetime('now','-30 days') group by tour order by n desc`)
};

const TYPES = new Set(['quiz','tour','guide','eco','waitlist']);
const STATUSES = ['new','contacted','quoted','deposit','done','lost'];
const clip = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rate = new Map();
const limited = ip => { const now = Date.now(); const a = (rate.get(ip) || []).filter(t => now - t < 3_600_000); a.push(now); rate.set(ip, a); return a.length > 8; };

async function notify(lead, id){
  const token = ENV.TELEGRAM_BOT_TOKEN, chat = ENV.LEADS_TG_CHAT;
  if (!token || !chat) return;
  const u = lead.utm || {};
  const text = [
    `${lead.type === 'waitlist' ? '📝' : lead.type === 'eco' ? '🧭' : '🎣'} <b>Заявка #${id}</b> · ${esc(lead.type)}`,
    lead.tourTitle && `Программа: <b>${esc(lead.tourTitle)}</b>`,
    lead.name && `Имя: ${esc(lead.name)}`,
    `Контакт: <code>${esc(lead.contact)}</code>${lead.channel ? ' · ' + esc(lead.channel) : ''}`,
    lead.date && `Даты: ${esc(lead.date)}`,
    lead.guests && `Гостей: ${esc(lead.guests)}`,
    lead.summary && `Квиз: ${esc(lead.summary)}`,
    lead.guide && 'Хочет гайд по Андаману',
    (u.utm_source || u.ref) && `Источник: ${esc([u.utm_source, u.utm_campaign, u.ref].filter(Boolean).join(' / '))}`,
    '⏱ Ответить в течение 15 минут'
  ].filter(Boolean).join('\n');
  try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ chat_id:chat, text, parse_mode:'HTML', disable_web_page_preview:true }) }); } catch {}
}

function json(res, code, body){ res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(body)); }
function readBody(req, max = 16_384){
  return new Promise((ok, fail) => { let s = ''; req.on('data', c => { s += c; if (s.length > max) { fail(new Error('too large')); req.destroy(); } }); req.on('end', () => ok(s)); req.on('error', fail); });
}

async function postLead(req, res){
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return json(res, 429, { error:'Слишком много заявок. Напишите нам в мессенджер.' });
  let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error:'Неверный запрос' }); }
  if (b.company) return json(res, 200, { ok:true }); // ловушка для ботов
  const lead = {
    type: TYPES.has(b.type) ? b.type : 'quiz', tour: clip(b.tour, 200), tourTitle: clip(b.tourTitle, 300), name: clip(b.name, 80), contact: clip(b.contact, 120),
    channel: clip(b.channel, 20), date: clip(b.date, 120), guests: clip(b.guests, 20), summary: clip(b.summary, 400), guide: !!b.guide,
    answers: b.answers && typeof b.answers === 'object' ? b.answers : {}, utm: b.utm && typeof b.utm === 'object' ? b.utm : {}, page: clip(b.page, 200), ref: clip(b.ref, 300)
  };
  if (lead.contact.length < 4) return json(res, 400, { error:'Укажите контакт' });
  const r = q.insert.run(lead.type, lead.tour, lead.name, lead.contact, lead.channel, lead.date, lead.guests, JSON.stringify(lead.answers).slice(0, 2000), lead.summary, lead.page, JSON.stringify(lead.utm).slice(0, 1000), lead.ref, ip, clip(req.headers['user-agent'] || '', 300));
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
if (cmd === 'list') {
  console.table(q.last.all(+(process.argv[3] || 20)));
} else if (cmd === 'status') {
  const [, , , id, st, ...note] = process.argv;
  if (!STATUSES.includes(st)) { console.error('Статусы: ' + STATUSES.join(', ')); process.exit(1); }
  const r = q.setStatus.run(st, note.join(' ') || null, +id); console.log(r.changes ? `#${id} → ${st}` : `Нет заявки #${id}`);
} else if (cmd === 'stats') {
  console.log('Воронка за 30 дней:'); console.table(q.funnel.all());
  console.log('Источники:'); console.table(q.sources.all());
  console.log('Туры:'); console.table(q.tours.all());
} else {
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    cors(req, res);
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (url.pathname === '/api/lead' && req.method === 'POST') return await postLead(req, res);
      if (url.pathname === '/api/health') return json(res, 200, { ok:true });
      if (STATIC_DIR && req.method === 'GET') return serveStatic(req, res, url);
      json(res, 404, { error:'Не найдено' });
    } catch (e) { console.error(e); json(res, 500, { error:'Внутренняя ошибка' }); }
  }).listen(PORT, STATIC_DIR ? '0.0.0.0' : '127.0.0.1', () => console.log(`erkak-fishing-leads on :${PORT}${STATIC_DIR ? ' + static ' + STATIC_DIR : ''}`));
}
