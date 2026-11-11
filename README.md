# apps/shop · магазин ERKAK

Статический фронт + API без зависимостей на том же VPS. Supabase не используется.

## Прод
- Сервер `root@62.238.59.42` (Hetzner, nginx на хосте, Node 22).
- Статика: `/var/www/erkak.com`. API: `/opt/erkak/server.mjs`, systemd `erkak-api`, порт 8795, база SQLite `/opt/erkak/data/erkak.db`.
- nginx: `/etc/nginx/sites-available/erkak.com.conf`, `/api/` проксируется на API.
- Деплой: `./deploy.sh vps` (rsync статики и сервера, перезапуск, nginx, certbot).
- Зеркало статики без API: `./deploy.sh pages` → GitHub Pages `xiplo/erkak-site`.

## Настройка на сервере (`/opt/erkak/.env`)
```
SMTP_HOST=          # письма: подтверждение заказа, код входа, статусы
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=          # адрес отправителя на домене SMTP-аккаунта
SMTP_SECURE=false   # true для порта 465
SUPPORT_EMAIL=care@erkak.com
ERKAK_TG_CHAT=      # чат для уведомлений о заказах; токен бота берётся из pactum
PAYME_MERCHANT=     # ID кассы Payme: ссылка на оплату в письме и кабинете
PAYME_KEY=          # ключ кассы: без него Payme не сможет подтвердить оплату
PAYME_TEST=         # true на время проверки в песочнице test.paycom.uz
CLICK_SERVICE_ID=
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=   # секретный ключ сервиса Click: проверка подписи
STRIPE_SECRET_KEY=      # sk_live_…: карты вне Узбекистана, сумма в USD
STRIPE_WEBHOOK_SECRET=  # whsec_…: проверка подписи вебхука
```
После правок: `systemctl restart erkak-api`. Без SMTP заказы принимаются, а вход в кабинет работает по номеру заказа.
Что подключено, видно в `curl -s https://erkak.com/api/health` → поле `pay`.

## Оплата
Заказ создаётся в статусе «Ожидает оплаты» и получает ссылку на оплату. Статус «Оплачен» ставит сам сервер, когда платёжная система подтвердила платёж: клиенту уходит письмо, в Telegram приходит уведомление. Сумму сверяет сервер, заказ с другой суммой не оплачивается.

| Система | Что указать в её кабинете | Переменные |
|---|---|---|
| Payme | Endpoint URL: `https://erkak.com/api/pay/payme`, поле счёта: `order_id` | `PAYME_MERCHANT`, `PAYME_KEY` |
| Click | Prepare URL: `https://erkak.com/api/pay/click/prepare`, Complete URL: `https://erkak.com/api/pay/click/complete` | `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` |
| Stripe | Webhook: `https://erkak.com/api/pay/stripe`, события `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

- Payme: сначала касса в песочнице (`PAYME_TEST=true`, тестовый ключ в `PAYME_KEY`), пройти сценарии песочницы, затем боевой ключ и `PAYME_TEST` убрать.
- Возврат, сделанный в кабинете Payme или Stripe, сам переводит заказ в «Возврат». Отменить оплату отправленного заказа через Payme нельзя.
- Повторная оплата одного заказа и платёж с чужой суммой статус не меняют: приходит предупреждение в Telegram.
- Наложенный платёж и ручная отметка работают как раньше: `node server.mjs status … paid`.

## Операции
```bash
cd /opt/erkak
node server.mjs orders 20                       # последние заказы
node server.mjs status EK-260905-1234 paid      # статусы: paid, packed, shipped, delivered, cancelled, refunded
node server.mjs status EK-260905-1234 shipped 1234567890   # с трек-номером, клиенту уйдёт письмо
node server.mjs payments 20                     # последние платежи: система, заказ, состояние (1 создан, 2 проведён, −1 и −2 отменён)
```

## API
`POST /api/orders` · `POST /api/auth/code` · `POST /api/auth/verify` · `POST /api/auth/order` · `GET /api/me/orders` · `POST /api/auth/logout` · `GET /api/health`.
Оплата: `POST /api/pay/payme` · `POST /api/pay/click/prepare` · `POST /api/pay/click/complete` · `GET /api/pay/card` · `POST /api/pay/stripe`.
Цены пересчитываются на сервере из `assets/catalog.js`, клиентские суммы не принимаются. Все действия пишутся в таблицу `audit`.

## Тесты
```bash
node --test server/test.mjs   # Node 22, без зависимостей: заказ, Payme, Click, Stripe, лимиты, CLI
```
Те же тесты идут в GitHub Actions на каждый push и pull request.

## Что заменить до запуска
- Цены и составы в `assets/catalog.js` — черновик до договора с производством.
- Фото товаров сгенерированы, заменить на съёмку реальных упаковок.
- `https://t.me/erkak_bot` — бот не создан.
- Оферта и политика в `offer.html`, `privacy.html` — проверить юристом.
