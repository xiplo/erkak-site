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
PAYME_MERCHANT=     # появятся ссылки на оплату в письме и кабинете
CLICK_SERVICE_ID=
CLICK_MERCHANT_ID=
STRIPE_LINK=        # Stripe Payment Link для карт вне Узбекистана
```
После правок: `systemctl restart erkak-api`. Без SMTP заказы принимаются, а вход в кабинет работает по номеру заказа.

## Операции
```bash
cd /opt/erkak
node server.mjs orders 20                       # последние заказы
node server.mjs status EK-260905-1234 paid      # статусы: paid, packed, shipped, delivered, cancelled, refunded
node server.mjs status EK-260905-1234 shipped 1234567890   # с трек-номером, клиенту уйдёт письмо
```

## API
`POST /api/orders` · `POST /api/auth/code` · `POST /api/auth/verify` · `POST /api/auth/order` · `GET /api/me/orders` · `POST /api/auth/logout` · `GET /api/health`.
Цены пересчитываются на сервере из `assets/catalog.js`, клиентские суммы не принимаются. Все действия пишутся в таблицу `audit`.

## Что заменить до запуска
- Цены и составы в `assets/catalog.js` — черновик до договора с производством.
- Фото товаров сгенерированы, заменить на съёмку реальных упаковок.
- `https://t.me/erkak_bot` — бот не создан.
- Оферта и политика в `offer.html`, `privacy.html` — проверить юристом.
