#!/bin/bash
# ERKAK shop — деплой на прод. Два пути, любой из них достаточен.
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site + домен erkak.com
#   ./deploy.sh vps     → VPS orche: /var/www/erkak.com за Caddy или nginx
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${DOMAIN:-erkak.com}"
MODE="${1:-pages}"
cd "$DIR"

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
  VPS="${VPS_USER:-root}@${VPS_HOST:-76.13.251.52}"
  ssh -o StrictHostKeyChecking=no "$VPS" "mkdir -p /var/www/${DOMAIN}"
  rsync -az --delete --exclude 'img/*.png' --exclude '.git' -e "ssh -o StrictHostKeyChecking=no" "$DIR/" "$VPS:/var/www/${DOMAIN}/"
  ssh -o StrictHostKeyChecking=no "$VPS" "DOMAIN='${DOMAIN}' bash -s" <<'REMOTE'
set -e
if command -v caddy >/dev/null 2>&1; then
  grep -q "^${DOMAIN}" /etc/caddy/Caddyfile 2>/dev/null || cat >> /etc/caddy/Caddyfile <<CADDY

${DOMAIN}, www.${DOMAIN} {
    root * /var/www/${DOMAIN}
    encode zstd gzip
    file_server
    header /img/* Cache-Control "public, max-age=604800, immutable"
    header /assets/* Cache-Control "public, max-age=86400"
}
CADDY
  systemctl reload caddy && echo "Caddy: https://${DOMAIN}"
else
  cat > /etc/nginx/sites-available/${DOMAIN} <<NGX
server { listen 80; server_name ${DOMAIN} www.${DOMAIN}; root /var/www/${DOMAIN}; index index.html;
  gzip on; gzip_types text/html text/css application/javascript image/svg+xml;
  location /img/ { expires 7d; } location / { try_files \$uri \$uri/ /404.html; } }
NGX
  ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
  nginx -t && systemctl reload nginx && echo "nginx: http://${DOMAIN}  → certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi
REMOTE
  echo "DNS: A ${DOMAIN} → ${VPS_HOST:-76.13.251.52}"
else
  echo "Использование: ./deploy.sh pages | vps"; exit 1
fi
