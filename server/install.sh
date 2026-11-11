#!/bin/bash
# Установка API на сервере. Запускает deploy.sh от root после копирования файлов в /opt/erkak.
# Создаёт пользователя erkak, выставляет права, ставит сервис и ночную копию базы, проверяет запуск.
# Если новая версия не поднялась, возвращает прежние server.mjs и сервис и завершается с ошибкой.
set -euo pipefail
APP=/opt/erkak
PORT=8795
NODE=/usr/bin/node
UNITS=/etc/systemd/system
health(){ for _ in 1 2 3 4 5 6 7 8 9 10; do curl -sf "http://127.0.0.1:${PORT}/api/health" && return 0; sleep 1; done; return 1; }

id erkak >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin erkak
mkdir -p "$APP/data"
chown root:root "$APP" "$APP"/server.mjs "$APP"/install.sh "$APP"/erkak-*.service "$APP"/erkak-*.timer
chmod 755 "$APP"; chmod 644 "$APP"/server.mjs "$APP"/erkak-*.service "$APP"/erkak-*.timer

# Настройки ERKAK: создаются один раз, читает их только root (systemd и команды CLI).
[ -f "$APP/.env" ] || printf 'SUPPORT_EMAIL=care@erkak.com\n# ERKAK_TG_TOKEN=\n# ERKAK_TG_CHAT=\n# PAYME_MERCHANT=\n# PAYME_KEY=\n# CLICK_SERVICE_ID=\n# CLICK_MERCHANT_ID=\n# CLICK_SECRET_KEY=\n# STRIPE_SECRET_KEY=\n# STRIPE_WEBHOOK_SECRET=\n# USDT_TRC20_ADDRESS=\n' > "$APP/.env"
chown root:root "$APP/.env"; chmod 600 "$APP/.env"
# Из общих настроек сервера берём только почту и Telegram: остальные секреты соседнего проекта сервису не нужны.
if [ -f /opt/pactum/.env.production ]; then
  { grep -E '^(SMTP_[A-Z_]+|MAIL_FROM|TELEGRAM_BOT_TOKEN|TELEGRAM_NOTIFY_CHAT_ID)=' /opt/pactum/.env.production || true; } > "$APP/.env.shared"
  chown root:root "$APP/.env.shared"; chmod 600 "$APP/.env.shared"
fi

# До любых изменений в сервисе убеждаемся, что пользователь erkak может запустить Node с SQLite.
runuser -u erkak -- "$NODE" -e "require('node:sqlite')" 2>/dev/null || { echo "Пользователь erkak не может запустить $NODE с node:sqlite. Сервис не тронут, работает прежняя версия."; exit 1; }
chown -R erkak:erkak "$APP/data"; chmod 750 "$APP/data"

cp "$APP"/erkak-api.service "$APP"/erkak-backup.service "$APP"/erkak-backup.timer "$UNITS"/
systemctl daemon-reload
systemctl enable erkak-api >/dev/null 2>&1 || true
systemctl restart erkak-api
if ! health >/dev/null; then
  echo "Новая версия не поднялась:"; journalctl -u erkak-api -n 30 --no-pager || true
  if [ -f "$APP/.prev/server.mjs" ] && [ -f "$APP/.prev/erkak-api.service" ]; then
    cp "$APP/.prev/server.mjs" "$APP/server.mjs"; cp "$APP/.prev/erkak-api.service" "$UNITS/erkak-api.service"
    systemctl daemon-reload; systemctl restart erkak-api
    health >/dev/null && echo "Откат выполнен: работает прежняя версия." || echo "Откат не помог: API не отвечает, смотрите journalctl -u erkak-api."
  fi
  exit 1
fi
systemctl enable --now erkak-backup.timer >/dev/null 2>&1 || true
echo "API: $(health)"
journalctl -u erkak-api -n 20 --no-pager 2>/dev/null | grep -F 'подтверждения оплаты приниматься не будут' || true
