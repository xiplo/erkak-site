// Тесты API: заказ, Payme, Click, Stripe, лимиты, CLI, Telegram, автоматика, подписки, копии базы.
// Запуск: node --test server/test.mjs
// Поднимает настоящий server.mjs на временной базе; Stripe, Telegram и почтовый сервер заменены локальными заглушками.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'erkak-test-'));
const PORT = 20000 + (process.pid % 20000), STRIPE_PORT = PORT + 1, SMTP_PORT = PORT + 2, TG_PORT = PORT + 3, TRON_PORT = PORT + 4, TG_CHAT = '-100500';
// Настоящий по формату адрес TRON: 0x41 + 20 байт + контрольная сумма, в Base58.
const tronAddress = () => { const body = Buffer.concat([Buffer.from([0x41]), crypto.randomBytes(20)]), sha = b => crypto.createHash('sha256').update(b).digest();
  let n = BigInt('0x' + Buffer.concat([body, sha(sha(body)).subarray(0, 4)]).toString('hex')), out = ''; while (n > 0n) { out = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Number(n % 58n)] + out; n /= 58n; } return out; };
const WALLET = tronAddress(), USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BASE = `http://127.0.0.1:${PORT}`;
const KEYS = { PAYME_MERCHANT: 'merchant123', PAYME_KEY: 'payme-test-key', CLICK_SERVICE_ID: '777', CLICK_MERCHANT_ID: '555', CLICK_SECRET_KEY: 'click-secret',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_API: `http://127.0.0.1:${STRIPE_PORT}` };
const MAIL = { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(SMTP_PORT), SMTP_FROM: 'shop@shop.test' };
const ENV = { ...process.env, ...KEYS, ...MAIL, PORT: String(PORT), DATA_DIR: TMP, STATIC_DIR: path.join(HERE, '..'), PUBLIC_ORIGIN: 'https://shop.test', NODE_NO_WARNINGS: '1',
  ERKAK_TG_TOKEN: 'ops-token', ERKAK_TG_CHAT: TG_CHAT, TELEGRAM_API: `http://127.0.0.1:${TG_PORT}`, DIGEST_HOUR: '0',
  USDT_TRC20_ADDRESS: WALLET, TRON_API: `http://127.0.0.1:${TRON_PORT}` };

let server, stripeMock, smtpMock, tgMock, tronMock, db;
const stripeCalls = [], mails = [], tgCalls = [], tgUpdates = [], tronTransfers = [], tronQueries = [];
const transfer = (value, over = {}) => { const t = { transaction_id: crypto.randomBytes(32).toString('hex'), token_info: { symbol: 'USDT', address: USDT_CONTRACT, decimals: 6 }, block_timestamp: Date.now() - 120e3, from: tronAddress(), to: WALLET, type: 'Transfer', value: String(value), ...over }; tronTransfers.push(t); return t; };
let updateId = 1;
// Команды запускаются асинхронно: заглушки почты и Telegram живут в этом же процессе и должны успевать отвечать.
const cli = (args, env = ENV, cwd = HERE) => new Promise(res => { const p = spawn(process.execPath, [path.join(HERE, 'server.mjs'), ...args], { env, cwd }); let stdout = '', stderr = '';
  p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d); p.on('close', status => res({ status, stdout, stderr })); });
const until = async (fn, what) => { for (let i = 0; i < 100; i++) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, 30)); } assert.fail('не дождались: ' + what); };
const mailTo = (to, re) => until(() => mails.find(m => m.to === to && re.test(m.subject)), `письмо ${re} для ${to}`);
const tgSend = update => tgUpdates.push({ update_id: updateId++, ...update });
const tgPress = (data, message_id = 1, chat = TG_CHAT) => tgSend({ callback_query: { id: 'cb' + updateId, data, from: { id: 42, username: 'owner' }, message: { message_id, chat: { id: +chat } } } });
const tgSaw = (method, test) => until(() => tgCalls.find(c => c.method === method && test(c.body)), `Telegram ${method}`);
const shift = (number, sets) => db.prepare(`update orders set ${Object.keys(sets).map(k => k + ' = ?').join(', ')} where number = ?`).run(...Object.values(sets), number);
const ago = ms => new Date(Date.now() - ms).toISOString();
let ipSeq = 0;
const freshIp = () => `10.0.${ipSeq >> 8}.${ipSeq++ & 255}`;

async function call(method, url, { json, form, headers = {}, ip } = {}){
  const res = await fetch(BASE + url, { method, redirect: 'manual', headers: { 'x-forwarded-for': ip || freshIp(), ...(json ? { 'content-type': 'application/json' } : {}), ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), ...headers },
    body: json ? JSON.stringify(json) : form ? new URLSearchParams(form).toString() : undefined });
  const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, text, headers: res.headers };
}
async function newOrder(pay_method, extra = {}){
  const r = await call('POST', '/api/orders', { json: { email: 'buyer@example.com', name: 'Тест Покупатель', country: pay_method === 'card' ? 'Германия' : 'Узбекистан', city: 'Город', address: 'Улица 1',
    items: [{ sku: 'zinc', qty: 2 }, { sku: 'd3k2', qty: 1, subscription: true }], pay_method, ...extra } });
  assert.equal(r.status, 201, r.text);
  return r.data;
}
const orderRow = number => db.prepare('select * from orders where number = ?').get(number);
const payme = (method, params, key = KEYS.PAYME_KEY) => call('POST', '/api/pay/payme', { json: { jsonrpc: '2.0', id: 7, method, params }, headers: { authorization: 'Basic ' + Buffer.from('Paycom:' + key).toString('base64') } }).then(r => { assert.equal(r.status, 200); return r.data; });
function clickForm(o, { action, click_trans_id, merchant_prepare_id, amount = String(o.total_uzs), error = '0', secret = KEYS.CLICK_SECRET_KEY, number = o.number }){
  const f = { click_trans_id: String(click_trans_id), service_id: KEYS.CLICK_SERVICE_ID, click_paydoc_id: '9001', merchant_trans_id: number, amount, action: String(action), error, error_note: '', sign_time: '2026-01-01 10:00:00' };
  if (action === 1) f.merchant_prepare_id = String(merchant_prepare_id);
  f.sign_string = crypto.createHash('md5').update(f.click_trans_id + f.service_id + secret + f.merchant_trans_id + (action === 1 ? f.merchant_prepare_id : '') + f.amount + f.action + f.sign_time).digest('hex');
  return f;
}
function stripeEvent(type, object, { secret = KEYS.STRIPE_WEBHOOK_SECRET, at = Math.floor(Date.now() / 1000) } = {}){
  const payload = JSON.stringify({ id: 'evt_' + crypto.randomUUID(), type, data: { object } });
  const sig = crypto.createHmac('sha256', secret).update(`${at}.${payload}`).digest('hex');
  return fetch(BASE + '/api/pay/stripe', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${at},v1=${sig}` }, body: payload });
}

before(async () => {
  stripeMock = http.createServer((req, res) => { let d = ''; req.on('data', c => d += c); req.on('end', () => {
    const params = Object.fromEntries(new URLSearchParams(d)); stripeCalls.push({ url: req.url, auth: req.headers.authorization, params });
    const id = 'cs_test_' + stripeCalls.length; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id, url: 'https://checkout.stripe.test/' + id }));
  }); }).listen(STRIPE_PORT, '127.0.0.1');
  // Почтовая заглушка: принимает письмо и разбирает адресата, тему и текстовую часть.
  smtpMock = net.createServer(sock => { let buf = '', data = null; sock.write('220 test\r\n'); sock.on('error', () => {});
    sock.on('data', d => { buf += d; for (;;) {
      if (data !== null) { const end = buf.indexOf('\r\n.\r\n'); if (end < 0) return; const raw = buf.slice(0, end); buf = buf.slice(end + 5); data = null;
        const b64 = /Content-Type: text\/plain[^]*?\r\n\r\n([^]*?)\r\n\r\n--/.exec(raw)?.[1] || '';
        mails.push({ to: /^To: <(.*)>$/m.exec(raw)?.[1], subject: Buffer.from(/^Subject: =\?UTF-8\?B\?(.*)\?=$/m.exec(raw)?.[1] || '', 'base64').toString(), text: Buffer.from(b64.replace(/\s/g, ''), 'base64').toString() });
        sock.write('250 queued\r\n'); continue; }
      const nl = buf.indexOf('\r\n'); if (nl < 0) return; const line = buf.slice(0, nl); buf = buf.slice(nl + 2);
      if (/^DATA/i.test(line)) { data = ''; sock.write('354 go\r\n'); } else if (/^QUIT/i.test(line)) { sock.write('221 bye\r\n'); sock.end(); } else sock.write('250 ok\r\n');
    } }); }).listen(SMTP_PORT, '127.0.0.1');
  // Заглушка Telegram Bot API: копит вызовы, отдаёт очередь обновлений в getUpdates.
  tgMock = http.createServer((req, res) => { let d = ''; req.on('data', c => d += c); req.on('end', async () => {
    const method = req.url.split('/').pop(), body = JSON.parse(d || '{}'); let result = true;
    if (method === 'getUpdates') { if (!tgUpdates.length) await new Promise(r => setTimeout(r, 40)); result = tgUpdates.splice(0); } else tgCalls.push({ method, body, token: req.url.split('/')[1] });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, result }));
  }); }).listen(TG_PORT, '127.0.0.1');
  // Заглушка TronGrid: отдаёт накопленные переводы на адрес, новые сверху, как настоящий API.
  tronMock = http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); tronQueries.push(u);
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ success: true, data: [...tronTransfers].reverse(), meta: { at: Date.now(), page_size: tronTransfers.length } })); }).listen(TRON_PORT, '127.0.0.1');
  server = spawn(process.execPath, [path.join(HERE, 'server.mjs')], { env: ENV, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => { server.stdout.once('data', res); server.once('exit', c => rej(new Error('server exited ' + c))); });
  db = new DatabaseSync(path.join(TMP, 'erkak.db'));
});
after(() => { server?.kill(); stripeMock?.close(); smtpMock?.close(); tgMock?.closeAllConnections?.(); tgMock?.close(); tronMock?.close(); db?.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

test('health показывает подключённые способы оплаты', async () => {
  const r = await call('GET', '/api/health');
  assert.deepEqual(r.data.pay, { payme: true, click: true, card: true, usdt: ['cis', 'eu', 'world'] });
});

test('заказ: страна не из списка и битый JSON отклоняются', async () => {
  const bad = await call('POST', '/api/orders', { json: { email: 'a@b.co', name: 'T', country: '<img src=x onerror=alert(1)>', city: 'C', address: 'A', items: [{ sku: 'zinc', qty: 1 }], pay_method: 'card' } });
  assert.equal(bad.status, 400);
  const broken = await call('POST', '/api/orders', { headers: { 'content-type': 'application/json' }, form: { not: 'json{' } });
  assert.equal(broken.status, 400);
});

test('заказ: цены считает сервер, ссылка Payme на точную сумму', async () => {
  const o = await newOrder('payme', { total_uzs: 1, items: [{ sku: 'zinc', qty: 2, price_uzs: 1 }, { sku: 'd3k2', qty: 1, subscription: true }] });
  assert.equal(o.status, 'awaiting_payment');
  assert.ok(o.total_uzs > 400000, 'клиентская сумма проигнорирована');
  const decoded = Buffer.from(new URL(o.pay_url).pathname.slice(1), 'base64').toString();
  assert.equal(new URL(o.pay_url).host, 'checkout.paycom.uz');
  assert.equal(decoded, `m=merchant123;ac.order_id=${o.number};a=${o.total_uzs * 100};c=https://shop.test/account.html?paid=${o.number}`);
});

test('Payme: полный цикл оплаты и возврата', async () => {
  const o = await newOrder('payme'), amount = o.total_uzs * 100, account = { order_id: o.number }, id = 'pm-' + crypto.randomUUID(), time = Date.now();
  assert.equal((await payme('CheckPerformTransaction', { amount, account }, 'wrong-key')).error.code, -32504);
  assert.equal((await payme('NoSuchMethod', {})).error.code, -32601);
  assert.equal((await payme('constructor', {})).error.code, -32601);
  const noOrder = await payme('CheckPerformTransaction', { amount, account: { order_id: 'EK-000000-0000' } });
  assert.equal(noOrder.error.code, -31050); assert.equal(noOrder.error.data, 'order_id'); assert.equal(noOrder.id, 7);
  assert.equal((await payme('CheckPerformTransaction', { amount: amount - 100, account })).error.code, -31001);
  assert.deepEqual((await payme('CheckPerformTransaction', { amount, account })).result, { allow: true });
  assert.equal((await payme('PerformTransaction', { id })).error.code, -31003);

  const created = (await payme('CreateTransaction', { id, time, amount, account })).result;
  assert.equal(created.state, 1); assert.equal(typeof created.transaction, 'string');
  assert.deepEqual((await payme('CreateTransaction', { id, time, amount, account })).result, created, 'повтор возвращает ту же транзакцию');
  assert.equal((await payme('CreateTransaction', { id: id + '-2', time, amount, account })).error.code, -31099, 'вторая транзакция по тому же заказу');
  assert.equal(orderRow(o.number).status, 'awaiting_payment');

  const done = (await payme('PerformTransaction', { id })).result;
  assert.equal(done.state, 2); assert.equal(orderRow(o.number).status, 'paid');
  assert.deepEqual((await payme('PerformTransaction', { id })).result, done, 'повтор не меняет время проведения');
  assert.equal((await payme('CheckPerformTransaction', { amount, account })).error.code, -31051);
  const check = (await payme('CheckTransaction', { id })).result;
  assert.deepEqual(check, { create_time: created.create_time, perform_time: done.perform_time, cancel_time: 0, transaction: created.transaction, state: 2, reason: null });
  const st = (await payme('GetStatement', { from: time - 1000, to: time + 1000 })).result.transactions.find(t => t.id === id);
  assert.equal(st.amount, amount); assert.deepEqual(st.account, account); assert.equal(st.time, time);

  const cancelled = (await payme('CancelTransaction', { id, reason: 5 })).result;
  assert.equal(cancelled.state, -2); assert.equal(orderRow(o.number).status, 'refunded');
  assert.deepEqual((await payme('CancelTransaction', { id, reason: 5 })).result, cancelled);
  assert.equal((await payme('CheckTransaction', { id })).result.reason, 5);
});

test('Payme: отмена до оплаты оставляет заказ открытым, отмена после отправки запрещена', async () => {
  const o = await newOrder('payme'), amount = o.total_uzs * 100, account = { order_id: o.number }, time = Date.now();
  await payme('CreateTransaction', { id: 'pm-a-' + o.number, time, amount, account });
  assert.equal((await payme('CancelTransaction', { id: 'pm-a-' + o.number, reason: 3 })).result.state, -1);
  assert.equal(orderRow(o.number).status, 'awaiting_payment');
  assert.equal((await payme('CreateTransaction', { id: 'pm-a-' + o.number, time, amount, account })).error.code, -31008, 'отменённую транзакцию нельзя создать заново');
  assert.equal((await payme('CreateTransaction', { id: 'pm-b-' + o.number, time, amount, account })).result.state, 1);
  assert.equal((await payme('PerformTransaction', { id: 'pm-b-' + o.number })).result.state, 2);
  // CLI при работающем сервере: статус меняется, процесс завершается штатно
  const run = (await cli(['status', o.number, 'shipped', 'TRACK123']));
  assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /Отправлен · TRACK123/);
  assert.match((await mailTo('buyer@example.com', new RegExp(`${o.number} — отправлен`))).text, /Трек-номер: TRACK123/, 'команда дождалась отправки письма');
  assert.equal(orderRow(o.number).tracking, 'TRACK123');
  assert.equal((await payme('CancelTransaction', { id: 'pm-b-' + o.number, reason: 5 })).error.code, -31007);
  assert.equal(orderRow(o.number).status, 'shipped');
});

test('Payme: просроченная транзакция отменяется с причиной 4', async () => {
  const o = await newOrder('payme'), amount = o.total_uzs * 100, account = { order_id: o.number }, id = 'pm-old-' + o.number;
  await payme('CreateTransaction', { id, time: Date.now(), amount, account });
  db.prepare('update payments set create_time = create_time - 43200001 where ext_id = ?').run(id);
  assert.equal((await payme('PerformTransaction', { id })).error.code, -31008);
  const t = (await payme('CheckTransaction', { id })).result;
  assert.equal(t.state, -1); assert.equal(t.reason, 4); assert.equal(orderRow(o.number).status, 'awaiting_payment');
});

test('Click: подпись, сумма, Prepare и Complete', async () => {
  const o = await newOrder('click');
  assert.match(o.pay_url, new RegExp(`^https://my\\.click\\.uz/services/pay\\?service_id=777&merchant_id=555&amount=${o.total_uzs}&transaction_param=${o.number}&`));
  const post = (step, f) => call('POST', '/api/pay/click/' + step, { form: f }).then(r => { assert.equal(r.status, 200); return r.data; });
  assert.equal((await post('prepare', clickForm(o, { action: 0, click_trans_id: 1001, secret: 'wrong' }))).error, -1);
  assert.equal((await post('prepare', clickForm(o, { action: 0, click_trans_id: 1001, amount: String(o.total_uzs - 1) }))).error, -2);
  assert.equal((await post('prepare', clickForm(o, { action: 0, click_trans_id: 1001, number: 'EK-000000-0000' }))).error, -5);
  assert.equal((await post('prepare', clickForm(o, { action: 2, click_trans_id: 1001 }))).error, -3);
  const prep = await post('prepare', clickForm(o, { action: 0, click_trans_id: 1001, amount: o.total_uzs + '.00' }));
  assert.equal(prep.error, 0); assert.equal(prep.click_trans_id, 1001); assert.equal(prep.merchant_trans_id, o.number); assert.ok(prep.merchant_prepare_id > 0);
  assert.equal((await post('prepare', clickForm(o, { action: 0, click_trans_id: 1001 }))).merchant_prepare_id, prep.merchant_prepare_id, 'повтор Prepare');
  assert.equal((await post('complete', clickForm(o, { action: 1, click_trans_id: 1001, merchant_prepare_id: prep.merchant_prepare_id + 999 }))).error, -6);
  assert.equal(orderRow(o.number).status, 'awaiting_payment');
  const done = await post('complete', clickForm(o, { action: 1, click_trans_id: 1001, merchant_prepare_id: prep.merchant_prepare_id }));
  assert.equal(done.error, 0); assert.equal(done.merchant_confirm_id, prep.merchant_prepare_id);
  assert.equal(orderRow(o.number).status, 'paid');
  assert.equal((await post('complete', clickForm(o, { action: 1, click_trans_id: 1001, merchant_prepare_id: prep.merchant_prepare_id }))).error, -4);
  assert.equal((await post('prepare', clickForm(o, { action: 0, click_trans_id: 1002 }))).error, -4);

  const o2 = await newOrder('click');
  const prep2 = await post('prepare', clickForm(o2, { action: 0, click_trans_id: 2001 }));
  assert.equal((await post('complete', clickForm(o2, { action: 1, click_trans_id: 2001, merchant_prepare_id: prep2.merchant_prepare_id, error: '-5017' }))).error, -9);
  assert.equal(orderRow(o2.number).status, 'awaiting_payment', 'неуспешный платёж не закрывает заказ');
  const prep3 = await post('prepare', clickForm(o2, { action: 0, click_trans_id: 2002 }));
  assert.equal((await post('complete', clickForm(o2, { action: 1, click_trans_id: 2002, merchant_prepare_id: prep3.merchant_prepare_id }))).error, 0);
  assert.equal(orderRow(o2.number).status, 'paid');
});

test('Stripe: сессия на точную сумму, подпись вебхука, оплата и возврат', async () => {
  const o = await newOrder('card');
  const link = new URL(o.pay_url); assert.equal(link.origin + link.pathname, 'https://shop.test/api/pay/card');
  assert.equal((await call('GET', `/api/pay/card?o=${o.number}&k=${'0'.repeat(32)}`)).status, 404);
  const go = await call('GET', link.pathname + link.search);
  assert.equal(go.status, 303); assert.match(go.headers.get('location'), /^https:\/\/checkout\.stripe\.test\/cs_test_/);
  const sent = stripeCalls.at(-1);
  assert.equal(sent.url, '/v1/checkout/sessions'); assert.equal(sent.auth, 'Bearer sk_test_x');
  assert.equal(sent.params.client_reference_id, o.number); assert.equal(sent.params.customer_email, 'buyer@example.com'); assert.equal(sent.params['line_items[0][price_data][currency]'], 'usd');
  let cents = 0; for (let i = 0; sent.params[`line_items[${i}][quantity]`]; i++) cents += sent.params[`line_items[${i}][price_data][unit_amount]`] * sent.params[`line_items[${i}][quantity]`];
  assert.equal(cents, o.total_usd * 100, 'позиции и доставка в сумме дают итог заказа');

  const session = { id: 'cs_test_paid_' + o.number, payment_status: 'paid', client_reference_id: o.number, amount_total: o.total_usd * 100, currency: 'usd', payment_intent: 'pi_' + o.number };
  assert.equal((await stripeEvent('checkout.session.completed', session, { secret: 'whsec_wrong' })).status, 400);
  assert.equal((await stripeEvent('checkout.session.completed', session, { at: Math.floor(Date.now() / 1000) - 3600 })).status, 400, 'старая подпись');
  assert.equal((await stripeEvent('checkout.session.completed', { ...session, id: 'cs_cheap', amount_total: 100 })).status, 200);
  assert.equal(orderRow(o.number).status, 'awaiting_payment', 'сумма не совпала — заказ не оплачен');
  assert.equal((await stripeEvent('checkout.session.completed', { ...session, payment_status: 'unpaid' })).status, 200);
  assert.equal(orderRow(o.number).status, 'awaiting_payment');
  assert.equal((await stripeEvent('checkout.session.completed', session)).status, 200);
  assert.equal(orderRow(o.number).status, 'paid');
  assert.equal((await stripeEvent('checkout.session.completed', session)).status, 200);
  assert.equal(db.prepare(`select count(*) n from payments where order_number = ?`).get(o.number).n, 1, 'повтор события не создаёт второй платёж');
  assert.equal((await call('GET', link.pathname + link.search)).headers.get('location'), 'https://shop.test/account.html', 'оплаченный заказ не открывает новую сессию');

  assert.equal((await stripeEvent('charge.refunded', { id: 'ch_1', payment_intent: session.payment_intent, refunded: false, amount_refunded: 500 })).status, 200);
  assert.equal(orderRow(o.number).status, 'paid', 'частичный возврат не меняет статус');
  assert.equal((await stripeEvent('charge.refunded', { id: 'ch_1', payment_intent: session.payment_intent, refunded: true, amount_refunded: o.total_usd * 100 })).status, 200);
  assert.equal(orderRow(o.number).status, 'refunded');
});

test('вход по номеру заказа: лимит по почте и по адресу, подмена X-Forwarded-For не помогает', async () => {
  const o = await newOrder('cod');
  assert.equal(o.status, 'new'); assert.equal(o.pay_url, null);
  const ok = await call('POST', '/api/auth/order', { json: { email: 'buyer@example.com', number: o.number } });
  assert.equal(ok.status, 200); assert.match(ok.data.token, /^[a-f0-9]{64}$/);
  const mine = await call('GET', '/api/me/orders', { headers: { authorization: 'Bearer ' + ok.data.token } });
  assert.ok(mine.data.orders.some(x => x.number === o.number));
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await call('POST', '/api/auth/order', { json: { email: 'victim@example.com', number: 'EK-000000-' + (1000 + i) } })).status);
  assert.deepEqual(codes, [400, 400, 400, 400, 400, 429], 'не больше 5 попыток в час на одну почту');
  const spoofed = [];
  for (let i = 0; i < 21; i++) spoofed.push((await call('POST', '/api/auth/order', { ip: `1.2.3.${i}, 203.0.113.9`, json: { email: `u${i}@example.com`, number: 'EK-000000-0000' } })).status);
  assert.equal(spoofed.at(-1), 429, 'учитывается адрес, который дописал nginx, а не присланный клиентом');
});

test('команды читают настройки из .env рядом с собой', async () => {
  const o = await newOrder('cod', { email: 'envfile@example.com' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'erkak-cwd-'));
  fs.writeFileSync(path.join(dir, '.env'), Object.entries(MAIL).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  const bare = Object.fromEntries(Object.entries(ENV).filter(([k]) => !(k in MAIL)));
  const run = (await cli(['status', o.number, 'packed'], bare, dir));
  assert.equal(run.status, 0, run.stderr); assert.doesNotMatch(run.stderr, /mail:/);
  await mailTo('envfile@example.com', new RegExp(`${o.number} — собран`));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Telegram: кнопки статусов, трек-номер ответом, отмена с подтверждением, чужой чат', async () => {
  const o = await newOrder('cod', { email: 'tg@example.com' });
  const card = await tgSaw('sendMessage', b => b.text.includes(o.number) && b.reply_markup);
  assert.equal(card.token, 'botops-token'); assert.equal(card.body.chat_id, TG_CHAT);
  assert.deepEqual(card.body.reply_markup.inline_keyboard[0].map(b => b.callback_data), [`st:${o.number}:paid`, `st:${o.number}:packed`, `st:${o.number}:cancelled`]);
  assert.match(card.body.text, /Улица 1/, 'в карточке есть адрес для сборки');

  tgPress(`st:${o.number}:packed`, 7, '999');
  await tgSaw('answerCallbackQuery', b => b.text === 'Нет доступа');
  assert.equal(orderRow(o.number).status, 'new', 'кнопка из чужого чата не работает');

  tgPress(`st:${o.number}:packed`, 7);
  const edit = await tgSaw('editMessageText', b => b.message_id === 7 && b.text.includes('Собран'));
  assert.deepEqual(edit.body.reply_markup.inline_keyboard[0].map(b => b.callback_data), [`st:${o.number}:shipped`, `st:${o.number}:cancelled`]);
  assert.equal(orderRow(o.number).status, 'packed');
  assert.equal(db.prepare(`select actor from audit where subject = ? and action = 'order.status' order by id desc`).get(o.number).actor, 'tg:owner');

  tgPress(`st:${o.number}:shipped`, 7);
  const ask = await tgSaw('sendMessage', b => b.text.startsWith(`Трек-номер для ${o.number}?`) && b.reply_markup?.force_reply);
  assert.equal(orderRow(o.number).status, 'packed', 'до трек-номера статус не меняется');
  tgSend({ message: { message_id: 8, chat: { id: +TG_CHAT }, from: { id: 42, username: 'owner' }, text: 'RR123456789UZ', reply_to_message: { text: ask.body.text } } });
  await until(() => orderRow(o.number).status === 'shipped', 'статус «Отправлен»');
  assert.equal(orderRow(o.number).tracking, 'RR123456789UZ');
  assert.match((await mailTo('tg@example.com', /отправлен/)).text, /RR123456789UZ/);

  const o2 = await newOrder('cod', { email: 'tg2@example.com' });
  tgPress(`st:${o2.number}:cancelled`, 9);
  const confirm = await tgSaw('editMessageText', b => b.message_id === 9 && b.reply_markup.inline_keyboard[0][0].callback_data === `ok:${o2.number}:cancelled`);
  assert.ok(confirm); assert.equal(orderRow(o2.number).status, 'new', 'первое нажатие только спрашивает');
  tgPress(`ok:${o2.number}:cancelled`, 9);
  await until(() => orderRow(o2.number).status === 'cancelled', 'отмена после подтверждения');
  tgPress(`st:${o2.number}:packed`, 9);
  await tgSaw('answerCallbackQuery', b => b.text === 'Заказ уже «Отменён»');

  tgSend({ message: { message_id: 10, chat: { id: +TG_CHAT }, from: { id: 42 }, text: '/orders' } });
  await tgSaw('sendMessage', b => b.text.includes(o.number) && b.text.includes('Отправлен') && b.reply_markup?.inline_keyboard[0][0].callback_data === `st:${o.number}:delivered`);
});

test('автоматика: напоминание об оплате, автоотмена, контрольный анализ, сводка', async () => {
  const fresh = await newOrder('payme', { email: 'fresh@example.com' }), late = await newOrder('payme', { email: 'late@example.com' }), busy = await newOrder('payme', { email: 'busy@example.com' });
  shift(late.number, { created_at: ago(25 * 3600e3) }); shift(busy.number, { created_at: ago(25 * 3600e3) });
  const first = (await cli(['jobs'])); assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /reminded: 2/); assert.match(first.stdout, /digest: 1/);
  const reminder = await mailTo('late@example.com', /ждёт оплаты/);
  assert.match(reminder.text, /https:\/\/checkout\.paycom\.uz\//); assert.match(reminder.text, /в течение 48 ч/);
  assert.ok(!mails.some(m => m.to === 'fresh@example.com' && /ждёт оплаты/.test(m.subject)), 'свежему заказу не напоминаем');
  await tgSaw('sendMessage', b => b.text.includes('Заказы на сегодня'));
  const second = (await cli(['jobs']));
  assert.match(second.stdout, /reminded: 0/); assert.match(second.stdout, /cancelled: 0/); assert.match(second.stdout, /digest: 0/, 'сводка раз в день');

  // Прошло трое суток: напоминание было двое суток назад. По заказу busy платёж в процессе — его не трогаем.
  for (const o of [late, busy]) shift(o.number, { created_at: ago(73 * 3600e3), reminded_at: Date.now() - 49 * 3600e3 });
  await payme('CreateTransaction', { id: 'pm-busy-' + busy.number, time: Date.now(), amount: busy.total_uzs * 100, account: { order_id: busy.number } });
  assert.match((await cli(['jobs'])).stdout, /cancelled: 1/);
  assert.equal(orderRow(late.number).status, 'cancelled'); assert.equal(orderRow(busy.number).status, 'awaiting_payment'); assert.equal(orderRow(fresh.number).status, 'awaiting_payment');
  assert.match((await mailTo('late@example.com', /отменён/)).text, /оплата не поступила/);
  assert.equal((await payme('CheckPerformTransaction', { amount: late.total_uzs * 100, account: { order_id: late.number } })).error.code, -31052, 'отменённый заказ оплатить нельзя');

  const cod = await newOrder('cod', { email: 'control@example.com' });
  assert.equal((await cli(['status', cod.number, 'delivered'])).status, 0);
  assert.ok(orderRow(cod.number).delivered_at > 0);
  assert.match((await cli(['jobs'])).stdout, /control: 0/);
  shift(cod.number, { delivered_at: Date.now() - 91 * 86400e3 });
  assert.match((await cli(['jobs'])).stdout, /control: 1/);
  assert.match((await mailTo('control@example.com', /контрольный анализ/)).text, /доставлен 90 дней назад[^]*цинк/);
  assert.match((await cli(['jobs'])).stdout, /control: 0/);
});

test('подписка: создаётся после оплаты, письмо с кнопками, продление по POST, остановка', async () => {
  const email = 'sub@example.com', o = await newOrder('payme', { email }), account = { order_id: o.number };
  assert.equal(db.prepare('select count(*) n from subscriptions where email = ?').get(email).n, 0, 'до оплаты подписки нет');
  await payme('CreateTransaction', { id: 'pm-sub-' + o.number, time: Date.now(), amount: o.total_uzs * 100, account });
  await payme('PerformTransaction', { id: 'pm-sub-' + o.number });
  const sub = db.prepare('select * from subscriptions where email = ?').get(email);
  assert.equal(sub.days, 90); assert.deepEqual(JSON.parse(sub.items), [{ sku: 'd3k2', qty: 1 }], 'в подписке только позиции, взятые по подписке');
  assert.ok(Math.abs(sub.next_at - (Date.now() + 80 * 86400e3)) < 60e3, 'письмо за 10 дней до конца банки');

  const login = await call('POST', '/api/auth/order', { json: { email, number: o.number } }), auth = { authorization: 'Bearer ' + login.data.token };
  const cab = (await call('GET', '/api/me/orders', { headers: auth })).data;
  assert.deepEqual(cab.subs, [{ id: sub.id, title: 'ERKAK D3 + K2 × 1', next_at: sub.next_at }]);

  db.prepare('update subscriptions set next_at = ? where id = ?').run(Date.now() - 1000, sub.id);
  assert.match((await cli(['jobs'])).stdout, /subs: 1/);
  const letter = await mailTo(email, /продлить подписку/);
  const [renew, stop] = [/отправку[^\n]*: (https:\/\/shop\.test\S+)/, /Остановить подписку: (https:\/\/shop\.test\S+)/].map(re => new URL(re.exec(letter.text)[1]));
  assert.match((await cli(['jobs'])).stdout, /subs: 0/, 'следующее письмо не раньше чем через неделю');

  const before = db.prepare('select count(*) n from orders where email = ?').get(email).n;
  const view = await call('GET', renew.pathname + renew.search);
  assert.equal(view.status, 200); assert.match(view.text, /Подтвердить отправку/);
  assert.equal(db.prepare('select count(*) n from orders where email = ?').get(email).n, before, 'открытие ссылки заказ не создаёт');
  assert.equal((await call('GET', `/api/sub?s=${sub.id}&k=${'0'.repeat(32)}&a=renew`)).status, 404);

  const form = { s: renew.searchParams.get('s'), k: renew.searchParams.get('k'), a: 'renew' };
  const go = await call('POST', '/api/sub', { form });
  assert.equal(go.status, 303); assert.match(go.headers.get('location'), /^https:\/\/checkout\.paycom\.uz\//);
  const renewed = db.prepare('select * from subscriptions where id = ?').get(sub.id), next = orderRow(renewed.last_order);
  assert.notEqual(next.number, o.number); assert.equal(next.address, 'Улица 1'); assert.equal(next.status, 'awaiting_payment');
  assert.deepEqual(JSON.parse(next.items).map(l => [l.sku, l.qty, l.subscription]), [['d3k2', 1, true]]);
  assert.equal(renewed.nudges, 0); assert.ok(renewed.next_at > Date.now() + 79 * 86400e3);
  await tgSaw('sendMessage', b => b.text.startsWith('🔁 Продление подписки') && b.text.includes(next.number));
  assert.equal((await call('POST', '/api/sub', { form })).status, 303);
  assert.equal(db.prepare('select count(*) n from orders where email = ?').get(email).n, before + 1, 'повторное нажатие второй заказ не создаёт');

  await payme('CreateTransaction', { id: 'pm-sub-' + next.number, time: Date.now(), amount: next.total_uzs * 100, account: { order_id: next.number } });
  await payme('PerformTransaction', { id: 'pm-sub-' + next.number });
  assert.equal(db.prepare('select count(*) n from subscriptions where email = ?').get(email).n, 1, 'оплата продления не плодит подписки');

  assert.equal((await call('POST', '/api/me/subs/stop', { json: { id: sub.id }, headers: auth })).status, 200);
  assert.equal(db.prepare('select status from subscriptions where id = ?').get(sub.id).status, 'stopped');
  assert.deepEqual((await call('GET', '/api/me/orders', { headers: auth })).data.subs, []);
  assert.match((await call('GET', stop.pathname + stop.search)).text, /Подписка остановлена/);
  assert.equal((await call('POST', '/api/me/subs/stop', { json: { id: sub.id } })).status, 401);
});

test('подписка: остановка по ссылке из письма и засыпание без ответа', async () => {
  const email = 'sub2@example.com', o = await newOrder('cod', { email });
  assert.equal((await cli(['status', o.number, 'delivered'])).status, 0);
  const sub = db.prepare('select * from subscriptions where email = ?').get(email);
  assert.ok(sub, 'при оплате курьеру подписка стартует с доставки');
  db.prepare('update subscriptions set next_at = ?, nudges = 2 where id = ?').run(Date.now() - 1000, sub.id);
  (await cli(['jobs']));
  assert.equal(db.prepare('select status from subscriptions where id = ?').get(sub.id).status, 'lapsed', 'после двух писем без ответа больше не пишем');
  db.prepare(`update subscriptions set status = 'active', nudges = 0 where id = ?`).run(sub.id);
  (await cli(['jobs']));
  const link = new URL(/Остановить подписку: (\S+)/.exec((await mailTo(email, /продлить подписку/)).text)[1]);
  const done = await call('POST', '/api/sub', { form: { s: link.searchParams.get('s'), k: link.searchParams.get('k'), a: 'stop' } });
  assert.equal(done.status, 200); assert.match(done.text, /Подписка остановлена/);
  assert.equal(db.prepare('select status from subscriptions where id = ?').get(sub.id).status, 'stopped');
});

test('копия базы: целая, старые удаляются', async () => {
  const dir = path.join(TMP, 'backups'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'erkak-20200101-0000.db'), 'old'); fs.writeFileSync(path.join(dir, 'erkak-20200102-0000.db'), 'old');
  const run = (await cli(['backup'], { ...ENV, BACKUP_KEEP: '2' }));
  assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /заказов: \d+ · удалено старых копий: 1/);
  const files = fs.readdirSync(dir).sort(); assert.equal(files.length, 2); assert.equal(files[0], 'erkak-20200102-0000.db');
  const copy = new DatabaseSync(path.join(dir, files[1]));
  assert.equal(copy.prepare('select count(*) n from orders').get().n, db.prepare('select count(*) n from orders').get().n); copy.close();
});

test('USDT: своя сумма у каждого заказа, сверка по блокчейну, чужие токены и неточные суммы не проходят', async () => {
  const uz = await call('POST', '/api/orders', { json: { email: 'usdt@example.com', name: 'Т', country: 'Узбекистан', city: 'Г', address: 'А', items: [{ sku: 'zinc', qty: 1 }], pay_method: 'usdt' } });
  assert.equal(uz.status, 400, 'внутри Узбекистана USDT по умолчанию не предлагается');
  const a = await newOrder('usdt', { email: 'usdt@example.com', country: 'Германия' }), b = await newOrder('usdt', { email: 'usdt2@example.com', country: 'Германия' });
  const [ra, rb] = [orderRow(a.number), orderRow(b.number)];
  for (const r of [ra, rb]) { assert.ok(r.crypto_amount < r.total_usd * 1e6 && r.crypto_amount >= (r.total_usd - 0.99) * 1e6 - 1, 'сумма на 1–99 центов меньше итога'); assert.equal(r.crypto_amount % 10000, 0); }
  assert.notEqual(ra.crypto_amount, rb.crypto_amount, 'у двух заказов на одну сумму разные суммы к оплате');

  const link = new URL(a.pay_url); assert.equal(link.pathname, '/api/pay/usdt');
  assert.equal((await call('GET', `/api/pay/usdt?o=${a.number}&k=${'0'.repeat(32)}`)).status, 404);
  const pay = await call('GET', link.pathname + link.search), shown = (ra.crypto_amount / 1e6).toFixed(2);
  assert.equal(pay.status, 200); assert.ok(pay.text.includes(WALLET)); assert.ok(pay.text.includes(`${shown} USDT`)); assert.match(pay.text, /TRON \(TRC-20\)/);
  assert.match((await mailTo('usdt@example.com', new RegExp(`${a.number} принят`))).text, /\/api\/pay\/usdt\?o=/);

  transfer(ra.crypto_amount, { token_info: { symbol: 'USDT', address: tronAddress(), decimals: 6 } }); // поддельный токен с тем же названием
  transfer(ra.crypto_amount, { to: tronAddress() });                                                    // перевод не нам
  transfer(ra.crypto_amount, { block_timestamp: Date.now() - 5e3 });                                    // ещё не подтверждён
  const short = transfer(ra.crypto_amount - 1_000_000);                                                 // биржа удержала комиссию
  const first = await cli(['usdt']); assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /paid: 0/); assert.match(first.stdout, /unmatched: 1/);
  assert.equal(orderRow(a.number).status, 'awaiting_payment');
  const alert = await tgSaw('sendMessage', m => m.text.includes('USDT: пришло') && m.text.includes(short.transaction_id));
  assert.ok(alert.body.text.includes(`Ближайший ожидающий заказ: ${a.number}`));
  const q = tronQueries.at(-1); assert.equal(q.pathname, `/v1/accounts/${WALLET}/transactions/trc20`); assert.equal(q.searchParams.get('contract_address'), USDT_CONTRACT);

  const good = transfer(ra.crypto_amount);
  const second = await cli(['usdt']); assert.match(second.stdout, /paid: 1/); assert.match(second.stdout, /unmatched: 0/, 'о неопознанном переводе сообщаем один раз');
  assert.equal(orderRow(a.number).status, 'paid'); assert.equal(orderRow(b.number).status, 'awaiting_payment');
  assert.equal(db.prepare(`select ext_id from payments where provider = 'usdt' and order_number = ?`).get(a.number).ext_id, good.transaction_id);
  await mailTo('usdt@example.com', new RegExp(`${a.number} — оплачен`));
  assert.match((await cli(['usdt'])).stdout, /paid: 0/, 'повторная сверка тот же перевод не засчитывает');
  assert.deepEqual((await call('GET', '/api/pay/usdt/status' + link.search)).data, { status: 'paid' });
  assert.equal((await call('GET', link.pathname + link.search)).status, 303, 'оплаченный заказ страницу оплаты не показывает');

  // Поздний перевод по отменённому заказу: заказ не оживает, владельцу уходит сообщение с номером.
  assert.equal((await cli(['status', b.number, 'cancelled'])).status, 0);
  const late = transfer(rb.crypto_amount);
  assert.match((await cli(['usdt'])).stdout, /unmatched: 1/);
  assert.equal(orderRow(b.number).status, 'cancelled');
  await tgSaw('sendMessage', m => m.text.includes(late.transaction_id) && m.text.includes(`у заказа ${b.number}, он «Отменён»`));
});

test('USDT: адрес с опечаткой выключает способ оплаты', async () => {
  const typo = WALLET.slice(0, -1) + (WALLET.at(-1) === 'a' ? 'b' : 'a');
  const run = await cli(['usdt'], { ...ENV, USDT_TRC20_ADDRESS: typo });
  assert.equal(run.status, 1); assert.match(run.stderr, /не прошёл проверку/);
  assert.equal((await cli(['usdt'], { ...ENV, USDT_TRC20_ADDRESS: USDT_CONTRACT })).status, 0, 'настоящий адрес из сети проходит проверку');
});
