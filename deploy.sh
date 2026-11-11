#!/bin/bash
# ERKAK shop — деплой на прод.
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site + домен erkak.com
#   ./deploy.sh vps     → VPS: сайт магазина в /var/www/erkak.com, API в /opt/erkak, nginx + certbot
#   ./deploy.sh api     → VPS: только API и его сервисы. Сайт и заглушка не меняются
#   ./deploy.sh teaser  → заглушка apps/teaser вместо магазина (магазин сохраняется в /var/www/erkak.com-shop)
# Переменные: VPS_HOST, VPS_USER, DOMAIN. ENV_FILE=путь — заменить /opt/erkak/.env этим файлом (ключи оплаты, бот).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${DOMAIN:-erkak.com}"
MODE="${1:-pages}"
VPS="${VPS_USER:-root}@${VPS_HOST:-62.238.59.42}"
# accept-new: незнакомый сервер запоминается, а сменившийся ключ известного сервера останавливает деплой.
RSH="ssh -o StrictHostKeyChecking=accept-new"
cd "$DIR"

# Новая метка версии у стилей и скриптов, чтобы браузеры не держали старые.
bump_assets(){
  local v; v="$(date +%Y%m%d%H%M)"
  sed -i "" -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${v}#g" *.html 2>/dev/null || sed -i -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${v}#g" *.html
}
# API: прежняя версия сохраняется в .prev, install.sh вернёт её, если новая не поднимется.
deploy_api(){
  echo "[api] → $VPS:/opt/erkak"
  $RSH "$VPS" "mkdir -p /opt/erkak/data /opt/erkak/.prev && cd /opt/erkak && { [ ! -f server.mjs ] || cp -p server.mjs .prev/; } && { [ ! -f /etc/systemd/system/erkak-api.service ] || cp -p /etc/systemd/system/erkak-api.service .prev/; }"
  rsync -az --exclude 'test.mjs' -e "$RSH" "$DIR/server/" "$VPS:/opt/erkak/"
  if [ -n "${ENV_FILE:-}" ]; then rsync -az --chmod=F600 -e "$RSH" "$ENV_FILE" "$VPS:/opt/erkak/.env"; echo "[api] /opt/erkak/.env заменён"; fi
  $RSH "$VPS" "bash /opt/erkak/install.sh"
}

if [ "$MODE" = "pages" ]; then
  bump_assets
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
  bump_assets
  echo "[vps] сайт → /var/www/${DOMAIN}, API → /opt/erkak, nginx, TLS"
  $RSH "$VPS" "mkdir -p /var/www/${DOMAIN}"
  # В веб-корень идёт только сайт: README с адресом сервера, служебные файлы и тесты туда не попадают, а уже лежащие там удаляются.
  rsync -az --delete --delete-excluded --exclude 'img/*.png' --exclude '.git' --exclude '.github' --exclude '.gitignore' --exclude 'README.md' --exclude 'CNAME' --exclude 'server' --exclude 'deploy.sh' -e "$RSH" "$DIR/" "$VPS:/var/www/${DOMAIN}/"
  deploy_api
  $RSH "$VPS" "DOMAIN='${DOMAIN}' bash -s" <<'REMOTE'
set -e
[ -f /etc/nginx/sites-available/${DOMAIN}.conf ] || cp /opt/erkak/nginx.erkak.conf /etc/nginx/sites-available/${DOMAIN}.conf
ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/${DOMAIN}.conf
nginx -t && systemctl reload nginx
if [ ! -d /etc/letsencrypt/live/${DOMAIN} ]; then
  certbot --nginx -n --agree-tos --register-unsafely-without-email -d ${DOMAIN} -d www.${DOMAIN} --redirect && echo "TLS выпущен" || echo "TLS не выпущен: DNS ещё не указывает на этот сервер. Повторить позже: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect"
fi
REMOTE
  echo "Готово: http(s)://${DOMAIN}   DNS: A ${DOMAIN} → ${VPS_HOST:-62.238.59.42}, CNAME www → ${DOMAIN}"
elif [ "$MODE" = "api" ]; then
  deploy_api
  echo "Готово: API обновлён, сайт не менялся."
elif [ "$MODE" = "teaser" ]; then
  # Заглушка вместо магазина: магазин уезжает в /var/www/${DOMAIN}-shop, API и nginx не трогаем.
  $RSH "$VPS" "set -e; [ -f /var/www/${DOMAIN}/catalog.html ] && { rm -rf /var/www/${DOMAIN}-shop; mv /var/www/${DOMAIN} /var/www/${DOMAIN}-shop; }; mkdir -p /var/www/${DOMAIN}"
  rsync -az --delete -e "$RSH" "$DIR/../teaser/" "$VPS:/var/www/${DOMAIN}/"
  echo "Заглушка на https://${DOMAIN}. Вернуть магазин: ./deploy.sh vps"
else
  echo "Использование: ./deploy.sh pages | vps | api | teaser"; exit 1
fi
