// Тесты API: заказ, Payme, Click, Stripe, лимиты, CLI. Запуск: node --test server/test.mjs
// Поднимает настоящий server.mjs на временной базе; Stripe API заменён локальной заглушкой.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'erkak-test-'));
const PORT = 20000 + (process.pid % 20000), STRIPE_PORT = PORT + 1;
const BASE = `http://127.0.0.1:${PORT}`;
const KEYS = { PAYME_MERCHANT: 'merchant123', PAYME_KEY: 'payme-test-key', CLICK_SERVICE_ID: '777', CLICK_MERCHANT_ID: '555', CLICK_SECRET_KEY: 'click-secret',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_API: `http://127.0.0.1:${STRIPE_PORT}` };
const ENV = { ...process.env, ...KEYS, PORT: String(PORT), DATA_DIR: TMP, STATIC_DIR: path.join(HERE, '..'), PUBLIC_ORIGIN: 'https://shop.test', NODE_NO_WARNINGS: '1', SMTP_HOST: '' };

let server, stripeMock, db;
const stripeCalls = [];
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
  server = spawn(process.execPath, [path.join(HERE, 'server.mjs')], { env: ENV, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => { server.stdout.once('data', res); server.once('exit', c => rej(new Error('server exited ' + c))); });
  db = new DatabaseSync(path.join(TMP, 'erkak.db'));
});
after(() => { server?.kill(); stripeMock?.close(); db?.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

test('health показывает подключённые способы оплаты', async () => {
  const r = await call('GET', '/api/health');
  assert.deepEqual(r.data.pay, { payme: true, click: true, card: true });
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
  const cli = spawnSync(process.execPath, [path.join(HERE, 'server.mjs'), 'status', o.number, 'shipped', 'TRACK123'], { env: ENV, encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr); assert.match(cli.stdout, /Отправлен · TRACK123/);
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
