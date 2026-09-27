# fishing/ · сайт рыболовных туров на erkak.com

Статический сайт и API заявок без зависимостей. Бренд — SIAM STRIKE, меняется в `assets/data.js`. Стратегия, исследование, воронка и трафик описаны в [STRATEGY.md](STRATEGY.md).

## Структура
| Файл | Что внутри |
|---|---|
| `assets/data.js` | Всё содержимое: контакты, юрданные, курсы валют, 12 туров, сегменты, споты карты, календарь сезонов, FAQ, отзывы |
| `assets/art.js` | Силуэты рыб (SVG), иконки, логотип, фоны постеров |
| `assets/app.js` | Интерактив: меню, фильтры, вкладки аудиторий, карта, валюта THB/USD/RUB, квиз, формы, UTM |
| `assets/strike.css` | Дизайн-система |
| `build.mjs` | Генерирует `index.html`, `tours/*.html`, `privacy.html`, `404.html`, `sitemap.xml`, `robots.txt` |
| `server/leads.mjs` | Приём заявок: SQLite, уведомления в Telegram, CLI-воронка |

HTML-файлы — результат сборки. Правьте `data.js` или `build.mjs`, затем запускайте `node build.mjs`.

## Локально
```bash
cd fishing
node build.mjs
STATIC_DIR=. node server/leads.mjs      # http://localhost:8796 — сайт и API
```

## Деплой на erkak.com
```bash
./deploy.sh fishing
```
Команда запускается из корня репозитория и делает следующее:
1. Собирает сайт и кладёт статику в `/var/www/erkak.com`. Если там лежит магазин, он переносится в `/var/www/erkak.com-shop`, как в режиме `teaser`.
2. Кладёт API заявок в `/opt/erkak-fishing` и поднимает сервис systemd `erkak-fishing` на порту 8796.
3. Подключает `snippets/erkak-fishing.conf` в nginx-конфиг erkak.com и перед правкой сохраняет его копию `.bak`. Location `= /api/lead` имеет приоритет над `/api/` магазина. TLS не трогается.

Вернуть магазин: `./deploy.sh vps`.

API магазина (`erkak-api`) читает `catalog.js` из `/var/www/erkak.com`, поэтому пока на домене рыболовный сайт, API магазина не перезапускайте.

Если API недоступен (например, на GitHub Pages), заявка всё равно не теряется: после квиза или формы клиент получает кнопки Telegram и WhatsApp с готовым текстом.

## Уведомления о заявках
Файл `/opt/erkak-fishing/.env`:
```
TELEGRAM_BOT_TOKEN=     # токен бота
LEADS_TG_CHAT=          # чат менеджеров
```
После правки: `systemctl restart erkak-fishing`.

## Работа с заявками
```bash
cd /opt/erkak-fishing
DATA_DIR=data node leads.mjs list 20                   # последние
DATA_DIR=data node leads.mjs status 12 quoted "3 варианта отправлены"
DATA_DIR=data node leads.mjs stats                     # воронка, источники (UTM/ref), туры за 30 дней
```
Статусы: `new`, `contacted`, `quoted`, `deposit`, `done`, `lost`.

Партнёрские ссылки делаются так: `https://erkak.com/?ref=villa_kamala`. Источник сохраняется в заявке.

## До запуска заменить
- [ ] `contacts` в `data.js`: реальные Telegram (сейчас заглушка `siamstrike`), WhatsApp (`66000000000`) и телефон.
- [ ] `legal`: оператор, номер лицензии TAT, страховка. Пока поля пустые, они не показываются. Лицензия нужна по закону, см. STRATEGY.md §7.
- [ ] Цены туров: согласовать себестоимость с операторами. Сейчас это расчётный черновик.
- [ ] Обещания и условия проверить и оставить только те, что вы готовы выполнять:
  - 7 дней бесплатной отмены;
  - 100% возврат при отмене из-за погоды;
  - видео за 48 часов, иначе −20%;
  - ответ за 15 минут;
  - консьерж от 15 000 THB в день;
  - клубная карта −15%;
  - способы оплаты (рубли через партнёра, USDT).
- [ ] Фото: поле `photo` у тура (например, `img/pro-gt.webp`) заменяет силуэт на постере реальным снимком.
- [ ] `reviews`: только реальные отзывы с разрешения гостей. Пустой массив скрывает блок.
- [ ] Курсы `rates` в `data.js`.
- [ ] Схема карты ориентировочная. Границы нацпарков проверять по данным DNP.
- [ ] Метрика: `app.js` отправляет события `lead` и `quiz_step` в `dataLayer`, а при заданном `DATA.metrika` — цели в `ym`. Остаётся добавить счётчик в `<head>` в `build.mjs`.
