#!/bin/bash
# ERKAK shop — деплой на прод. Два пути, любой из них достаточен.
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site + домен erkak.com
#   ./deploy.sh vps     → VPS 62.238.59.42: статика в /var/www/erkak.com, API в /opt/erkak (systemd), nginx + certbot
#   ./deploy.sh teaser  → заглушка apps/teaser вместо магазина (магазин сохраняется в /var/www/erkak.com-shop)
#   ./deploy.sh wellness → экосистема ERKAK (wellness/) на erkak.com + API заявок (магазин сохраняется в /var/www/erkak.com-shop)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${DOMAIN:-erkak.com}"
MODE="${1:-pages}"
cd "$DIR"
ASSET_VERSION="$(date +%Y%m%d%H%M)"
sed -i "" -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${ASSET_VERSION}#g" *.html 2>/dev/null || sed -i -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${ASSET_VERSION}#g" *.html

if [ "$MODE" = "pages" ]; then
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q -b main
  git add -A && git -c user.name=xiplo -c user.email=unlimpint@gmail.com commit -q -m "deploy $(date +%F)" || true
  if ! git remote get-url origin >/dev/null 2>&1; then
    gh repo create xiplo/erkak-site --public --source=. --remote=origin --push --description "ERKAK shop — ${DOMAIN}"
  else
    git push -u origin main
  fi
  # Включить Pages из ветки main, корень, с доменом и HTTPS.
  gh api -X POST repos/xiplo/erkak-site/pages -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 || true
  gh api -X PUT  repos/xiplo/erkak-site/pages -f "cname=${DOMAIN}" >/dev/null
  sleep 20
  gh api -X PUT  repos/xiplo/erkak-site/pages -F https_enforced=true >/dev/null 2>&1 || true
  echo "Готово: https://${DOMAIN}  (сертификат GitHub выпустит после DNS, до 15 минут)"
  echo "DNS для ${DOMAIN}:  A 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153"
  echo "DNS для www:        CNAME xiplo.github.io"
elif [ "$MODE" = "vps" ]; then
  VPS="${VPS_USER:-root}@${VPS_HOST:-62.238.59.42}"
  SSH="ssh -o StrictHostKeyChecking=no $VPS"
  echo "[vps] статика → /var/www/${DOMAIN}, API → /opt/erkak, nginx, systemd, TLS"
  $SSH "mkdir -p /var/www/${DOMAIN} /opt/erkak/data"
  rsync -az --delete --exclude 'img/*.png' --exclude '.git' --exclude 'server' --exclude 'deploy.sh' -e "ssh -o StrictHostKeyChecking=no" "$DIR/" "$VPS:/var/www/${DOMAIN}/"
  rsync -az -e "ssh -o StrictHostKeyChecking=no" "$DIR/server/" "$VPS:/opt/erkak/"
  $SSH "DOMAIN='${DOMAIN}' bash -s" <<'REMOTE'
set -e
[ -f /opt/erkak/.env ] || { printf 'SUPPORT_EMAIL=care@erkak.com\n# ERKAK_TG_CHAT=\n# PAYME_MERCHANT=\n# CLICK_SERVICE_ID=\n# CLICK_MERCHANT_ID=\n# STRIPE_LINK=\n' > /opt/erkak/.env; chmod 600 /opt/erkak/.env; }
cp /opt/erkak/erkak-api.service /etc/systemd/system/erkak-api.service
systemctl daemon-reload; systemctl enable erkak-api >/dev/null 2>&1 || true; systemctl restart erkak-api
sleep 1; curl -sf http://127.0.0.1:8795/api/health >/dev/null || { journalctl -u erkak-api -n 20 --no-pager; exit 1; }
[ -f /etc/nginx/sites-available/${DOMAIN}.conf ] || cp /opt/erkak/nginx.erkak.conf /etc/nginx/sites-available/${DOMAIN}.conf
ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/${DOMAIN}.conf
nginx -t && systemctl reload nginx
if [ ! -d /etc/letsencrypt/live/${DOMAIN} ]; then
  certbot --nginx -n --agree-tos --register-unsafely-without-email -d ${DOMAIN} -d www.${DOMAIN} --redirect && echo "TLS выпущен" || echo "TLS не выпущен: DNS ещё не указывает на этот сервер. Повторить позже: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect"
fi
echo "API: $(curl -s http://127.0.0.1:8795/api/health)"
REMOTE
  echo "Готово: http(s)://${DOMAIN}   DNS: A ${DOMAIN} → ${VPS_HOST:-62.238.59.42}, CNAME www → ${DOMAIN}"
elif [ "$MODE" = "teaser" ]; then
  # Заглушка вместо магазина: магазин уезжает в /var/www/${DOMAIN}-shop, API и nginx не трогаем.
  VPS="${VPS_USER:-root}@${VPS_HOST:-62.238.59.42}"
  ssh -o StrictHostKeyChecking=no "$VPS" "set -e; [ -f /var/www/${DOMAIN}/catalog.html ] && { rm -rf /var/www/${DOMAIN}-shop; mv /var/www/${DOMAIN} /var/www/${DOMAIN}-shop; }; mkdir -p /var/www/${DOMAIN}"
  rsync -az --delete -e "ssh -o StrictHostKeyChecking=no" "$DIR/../teaser/" "$VPS:/var/www/${DOMAIN}/"
  echo "Заглушка на https://${DOMAIN}. Вернуть магазин: ./deploy.sh vps"
elif [ "$MODE" = "wellness" ]; then
  # Экосистема ERKAK (wellness/): хаб, направления, 100 программ, раздел /fishing/ — в корень домена.
  # Магазин уезжает в /var/www/${DOMAIN}-shop, API магазина не трогаем.
  # Заявки: wellness/server/leads.mjs → /opt/erkak-wellness (systemd erkak-wellness, порт 8796), nginx: location = /api/lead.
  VPS="${VPS_USER:-root}@${VPS_HOST:-62.238.59.42}"
  SSH="ssh -o StrictHostKeyChecking=no $VPS"
  # Сборка всех языков (STRICT: недописанный перевод — ошибка) и проверки: переводы, ссылки, hreflang, JSON-LD
  (cd "$DIR/wellness" && STRICT=1 node build.mjs && node tools/check-i18n.mjs && node tools/check.mjs)
  $SSH "set -e; [ -f /var/www/${DOMAIN}/catalog.html ] && { rm -rf /var/www/${DOMAIN}-shop; mv /var/www/${DOMAIN} /var/www/${DOMAIN}-shop; }; mkdir -p /var/www/${DOMAIN} /opt/erkak-wellness/data"
  # Выкладывается только собранный сайт (wellness/public/)
  rsync -az --delete -e "ssh -o StrictHostKeyChecking=no" "$DIR/wellness/public/" "$VPS:/var/www/${DOMAIN}/"
  rsync -az -e "ssh -o StrictHostKeyChecking=no" "$DIR/wellness/server/" "$VPS:/opt/erkak-wellness/"
  # Секреты — только из переменных окружения вашего терминала, в git и в логи не попадают:
  #   TELEGRAM_BOT_TOKEN=… LEADS_TG_CHAT=… STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… ./deploy.sh wellness
  # Заданные переменные дописываются (или заменяются) в /opt/erkak-wellness/.env; остальные строки файла не трогаем.
  ENVFRAG=""
  for k in TELEGRAM_BOT_TOKEN LEADS_TG_CHAT STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SITE_ORIGIN; do
    v="${!k:-}"; [ -n "$v" ] && ENVFRAG+="$k=$v"$'\n'
  done
  [ -n "$ENVFRAG" ] && printf '%s' "$ENVFRAG" | $SSH 'set -e; f=/opt/erkak-wellness/.env; umask 077; touch "$f"; while IFS= read -r line; do k="${line%%=*}"; [ -n "$k" ] || continue; grep -v -E "^#? *${k}=" "$f" > "$f.tmp" || true; printf "%s\n" "$line" >> "$f.tmp"; mv "$f.tmp" "$f"; done; chmod 600 "$f"; echo "Настройки сервера обновлены: $(cut -d= -f1 "$f" | grep -v "^#" | tr "\n" " ")"'
  $SSH "DOMAIN='${DOMAIN}' bash -s" <<'REMOTE'
set -e
[ -f /opt/erkak-wellness/.env ] || { printf '# TELEGRAM_BOT_TOKEN=\n# LEADS_TG_CHAT=\n# STRIPE_SECRET_KEY=\n# STRIPE_WEBHOOK_SECRET=\n' > /opt/erkak-wellness/.env; chmod 600 /opt/erkak-wellness/.env; }
chown -R www-data:www-data /opt/erkak-wellness/data
cp /opt/erkak-wellness/erkak-wellness.service /etc/systemd/system/erkak-wellness.service
systemctl daemon-reload; systemctl enable erkak-wellness >/dev/null 2>&1 || true; systemctl restart erkak-wellness
sleep 1; curl -sf http://127.0.0.1:8796/api/health >/dev/null || { journalctl -u erkak-wellness -n 20 --no-pager; exit 1; }
SNIP=/etc/nginx/snippets/erkak-wellness.conf
[ -f "$SNIP" ] && cp "$SNIP" "$SNIP.prev"
cp /opt/erkak-wellness/nginx.wellness-snippet.conf "$SNIP"
CONF=/etc/nginx/sites-available/${DOMAIN}.conf
grep -q 'snippets/erkak-wellness.conf' "$CONF" || { cp "$CONF" "$CONF.bak.$(date +%s)"; sed -i "s#^\(\s*root /var/www/${DOMAIN};\)#\1\n    include snippets/erkak-wellness.conf;#" "$CONF"; }
# Если сниппет конфликтует с конфигом сервера (например, свой location /assets/) — откат к прежнему
if ! nginx -t 2>/dev/null; then
  echo "! nginx -t не прошёл со сниппетом ERKAK — откат"; if [ -f "$SNIP.prev" ]; then mv "$SNIP.prev" "$SNIP"; else rm -f "$SNIP"; fi; nginx -t
fi
systemctl reload nginx
echo "Заявки: $(curl -s http://127.0.0.1:8796/api/health)"
# Проверка Telegram: одно тестовое сообщение в группу заявок, если бот настроен
(set -a; . /opt/erkak-wellness/.env; set +a; cd /opt/erkak-wellness && node leads.mjs tg-test) || echo "! Telegram: проверьте TELEGRAM_BOT_TOKEN и LEADS_TG_CHAT в /opt/erkak-wellness/.env"
REMOTE
  # IndexNow (Bing, Yandex, Seznam…): сообщаем о всех адресах из карт сайта. Отключить: NO_INDEXNOW=1
  [ -n "${NO_INDEXNOW:-}" ] || (cd "$DIR/wellness" && node tools/indexnow.mjs) || echo "! IndexNow не ответил — не критично"
  echo "Готово: https://${DOMAIN} — экосистема ERKAK на 6 языках (/ru/ /en/ /de/ /ar/ /zh/ /uz/). Вернуть магазин: ./deploy.sh vps"
else
  echo "Использование: ./deploy.sh pages | vps | teaser | wellness"; exit 1
fi
