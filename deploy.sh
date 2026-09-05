#!/bin/bash
# ERKAK shop — деплой на прод. Два пути, любой из них достаточен.
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site + домен erkak.com
#   ./deploy.sh vps     → VPS 62.238.59.42: статика в /var/www/erkak.com, API в /opt/erkak (systemd), nginx + certbot
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
else
  echo "Использование: ./deploy.sh pages | vps"; exit 1
fi
