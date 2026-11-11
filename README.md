# apps/shop · магазин ERKAK

Статический фронт + API без зависимостей на том же VPS. Supabase не используется.

## Прод
- Сервер `root@62.238.59.42` (Hetzner, nginx на хосте, Node 22).
- Статика: `/var/www/erkak.com`. API: `/opt/erkak/server.mjs`, systemd `erkak-api`, порт 8795, база SQLite `/opt/erkak/data/erkak.db`.
- API работает от пользователя `erkak` и может писать только в `/opt/erkak/data`. Пользователя и права создаёт `server/install.sh` при деплое.
- nginx: `/etc/nginx/sites-available/erkak.com.conf`, `/api/` проксируется на API.

## Деплой
```bash
./deploy.sh api      # только API и его сервисы; сайт и заглушка не меняются
./deploy.sh vps      # сайт магазина + API + nginx + certbot
./deploy.sh teaser   # заглушка вместо магазина
./deploy.sh pages    # зеркало статики без API на GitHub Pages
```
Перед заменой прежняя версия API сохраняется в `/opt/erkak/.prev`. Если новая не ответила на `/api/health`, `install.sh` возвращает прежнюю и деплой завершается с ошибкой.

### Деплой кнопкой
GitHub → Actions → Deploy → Run workflow. Сначала идут тесты, потом тот же `deploy.sh`. Нужно один раз задать в Settings → Secrets and variables → Actions:

| Имя | Тип | Что это |
|---|---|---|
| `VPS_SSH_KEY` | secret, обязателен | Приватный SSH-ключ с доступом к серверу. Лучше отдельный, выпущенный только для деплоя |
| `ERKAK_ENV` | secret | Полное содержимое `/opt/erkak/.env`. Если задан, каждый деплой **заменяет** файл на сервере целиком |
| `VPS_KNOWN_HOSTS` | secret | Строка из `ssh-keyscan 62.238.59.42`: деплой остановится, если сервер подменили |
| `VPS_HOST`, `VPS_USER` | variable | Если сервер или пользователь другие |
| `MONITOR_URL` | variable | `https://erkak.com/api/health` включает проверку каждые 30 минут; при сбое GitHub пришлёт письмо |

## Настройки (`/opt/erkak/.env`)
```
SUPPORT_EMAIL=care@erkak.com
SMTP_HOST=          # письма: заказ, код входа, статусы, напоминания, подписка
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=          # адрес отправителя на домене SMTP-аккаунта
SMTP_SECURE=false   # true для порта 465
ERKAK_TG_TOKEN=     # свой бот из @BotFather: уведомления с кнопками управления заказами
ERKAK_TG_CHAT=      # чат или группа, куда пишет бот и откуда принимаются команды
PAYME_MERCHANT=     # ID кассы Payme: ссылка на оплату в письме и кабинете
PAYME_KEY=          # ключ кассы: без него Payme не сможет подтвердить оплату
PAYME_TEST=         # true на время проверки в песочнице test.paycom.uz
CLICK_SERVICE_ID=
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=   # секретный ключ сервиса Click: проверка подписи
STRIPE_SECRET_KEY=      # sk_live_…: карты вне Узбекистана, сумма в USD
STRIPE_WEBHOOK_SECRET=  # whsec_…: проверка подписи вебхука
UNPAID_REMIND_HOURS=24  # через сколько часов напомнить об оплате; 0 выключает
UNPAID_CANCEL_DAYS=3    # через сколько дней отменить неоплаченный заказ; 0 выключает
CONTROL_DAYS=90         # письмо о контрольном анализе после доставки; 0 выключает
SUB_LEAD_DAYS=10        # за сколько дней до конца упаковки писать о продлении подписки
BACKUP_KEEP=14          # сколько ночных копий базы хранить
```
После правок: `systemctl restart erkak-api`. Что подключено, видно в `curl -s https://erkak.com/api/health` → поле `pay`.

Почта и общий Telegram-бот берутся из настроек соседнего проекта: `install.sh` выписывает из `/opt/pactum/.env.production` только `SMTP_*`, `MAIL_FROM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID` в `/opt/erkak/.env.shared`. Значения из `.env` главнее. После смены почты в pactum нужен повторный `./deploy.sh api`.

Без SMTP заказы принимаются, вход в кабинет работает по номеру заказа, а письма-напоминания и автоотмена не запускаются.

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

## Что происходит само
Раз в 10 минут сервер проверяет заказы. Разовый прогон руками: `node server.mjs jobs`.

| Событие | Действие |
|---|---|
| Заказ не оплачен 24 часа | Письмо со ссылкой на оплату. Заказам, созданным до подключения оплаты, ссылка выдаётся в этот момент |
| После напоминания прошло ещё 48 часов | Заказ отменяется, клиенту уходит письмо. Заказы без напоминания и с платежом в процессе не отменяются |
| Заказ доставлен 90 дней назад | Письмо о контрольном анализе с показателями по купленным позициям |
| Заказ с подпиской оплачен или доставлен | Появляется подписка. Срок берётся из `days` товара в `assets/catalog.js` |
| До конца упаковки 10 дней | Письмо с кнопками «Подтвердить отправку» и «Остановить подписку». Без подтверждения ничего не создаётся и не списывается. Два письма без ответа — подписка засыпает |
| Каждое утро после 09:00 по Ташкенту | Сводка в Telegram: что подтвердить, собрать и отправить. Не приходит, если делать нечего |
| Каждую ночь в 03:17 | Копия базы в `/opt/erkak/data/backups`, хранится 14 последних |

Копии лежат на том же диске: от потери сервера они не спасают. Для этого включите Backups в панели Hetzner.

## Заказы в Telegram
Нужен свой бот: создать в @BotFather, токен в `ERKAK_TG_TOKEN`, чат в `ERKAK_TG_CHAT`. Общий бот сервера для этого не подходит: его обновления читает другой проект.

- Каждый новый заказ приходит карточкой с кнопками: «Оплачен», «Собран», «Отправлен», «Доставлен», «Отменить».
- «Отправлен» спрашивает трек-номер: ответьте на сообщение бота номером или «-». Клиент получает письмо с треком.
- «Отменить» срабатывает со второго нажатия.
- `/orders` — заказы в работе. Номер заказа сообщением — его карточка.
- Кнопки работают только в чате `ERKAK_TG_CHAT`. Кто нажал, пишется в таблицу `audit`.

## Команды на сервере
Запасной путь, если бот недоступен. Команды сами читают `/opt/erkak/.env` и работают от пользователя `erkak`.
```bash
cd /opt/erkak
node server.mjs orders 20                       # последние заказы
node server.mjs payments 20                     # последние платежи: 1 создан, 2 проведён, −1 и −2 отменён
node server.mjs status EK-260905-1234 paid      # статусы: paid, packed, shipped, delivered, cancelled, refunded
node server.mjs status EK-260905-1234 shipped 1234567890   # с трек-номером, клиенту уйдёт письмо
node server.mjs backup                          # копия базы сейчас
node server.mjs jobs                            # прогон автоматики сейчас
```
Восстановление из копии: `systemctl stop erkak-api`, заменить `data/erkak.db` файлом из `data/backups`, удалить `data/erkak.db-wal` и `data/erkak.db-shm`, `systemctl start erkak-api`.

## API
`POST /api/orders` · `POST /api/auth/code` · `POST /api/auth/verify` · `POST /api/auth/order` · `GET /api/me/orders` · `POST /api/me/subs/stop` · `POST /api/auth/logout` · `GET /api/health`.
Оплата: `POST /api/pay/payme` · `POST /api/pay/click/prepare` · `POST /api/pay/click/complete` · `GET /api/pay/card` · `POST /api/pay/stripe`.
Подписка по ссылке из письма: `GET /api/sub` показывает кнопку, `POST /api/sub` выполняет действие.
Цены пересчитываются на сервере из `assets/catalog.js`, клиентские суммы не принимаются. Все действия пишутся в таблицу `audit`.

## Тесты
```bash
node --test server/test.mjs   # Node 22, без зависимостей
```
Покрыто: заказ, Payme, Click, Stripe, лимиты, команды, бот, автоматика, подписки, копии базы. Те же тесты идут в GitHub Actions на каждый push и перед деплоем кнопкой.

## Что заменить до запуска
- Цены, составы и сроки `days` в `assets/catalog.js` — черновик до договора с производством.
- Фото товаров сгенерированы, заменить на съёмку реальных упаковок.
- `https://t.me/erkak_bot` на сайте — бот не создан.
- Оферта и политика в `offer.html`, `privacy.html` — проверить юристом.
- Для фискальных чеков Payme нужны коды ИКПУ товаров.
