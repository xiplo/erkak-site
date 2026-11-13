#!/bin/bash
# ERKAK shop — деплой на прод.
#   ./deploy.sh shop    → основной способ: магазин на https://erkak.com/shop/. Статика в /var/www/erkak.com-shop,
#                         API в /opt/erkak, блок nginx snippets/erkak-shop.conf. Основной сайт на домене не меняется
#   ./deploy.sh api     → только API и его сервисы. Страницы и nginx не меняются
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site (зеркало статики без API)
#   ./deploy.sh vps     → магазин В КОРЕНЬ домена, /var/www/erkak.com. Сотрёт сайт, который там лежит: только с FORCE=1
#   ./deploy.sh teaser  → заглушка apps/teaser в корень домена. Тоже только с FORCE=1
# Переменные: VPS_HOST, VPS_USER, DOMAIN. ENV_FILE=путь — заменить /opt/erkak/.env этим файлом (ключи оплаты, бот).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${DOMAIN:-erkak.com}"
MODE="${1:-}"
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

# В корне домена живёт другой сайт (экосистема ERKAK). Режимы, которые пишут в корень, без FORCE=1 туда не идут.
guard_root(){
  [ "${FORCE:-}" = "1" ] && return 0
  # Ответ сервера должен прийти явно: оборванное соединение не считается разрешением.
  local state; state="$($RSH "$VPS" "if [ -e /var/www/${DOMAIN}/index.html ] && [ ! -e /var/www/${DOMAIN}/catalog.html ]; then echo other; else echo free; fi" || true)"
  if [ "$state" != "free" ]; then
    if [ "$state" = "other" ]; then echo "Стоп: в /var/www/${DOMAIN} лежит не магазин, а другой сайт. Режим '$MODE' его сотрёт."; else echo "Стоп: не удалось проверить, что лежит в /var/www/${DOMAIN}."; fi
    echo "Магазин выкладывается в подпапку: ./deploy.sh shop. Если корень нужно заменить намеренно: FORCE=1 ./deploy.sh $MODE"
    exit 1
  fi
}
# Только файлы сайта: README с адресом сервера, служебные файлы и тесты в веб-папку не попадают, а уже лежащие там удаляются.
sync_static(){
  local dest="$1"
  $RSH "$VPS" "mkdir -p '$dest'"
  rsync -az --delete --delete-excluded --exclude 'img/*.png' --exclude '.git' --exclude '.github' --exclude '.gitignore' --exclude 'README.md' --exclude 'CNAME' --exclude 'data' --exclude '.env' --exclude '.env.*' --exclude '.DS_Store' --exclude 'server' --exclude 'deploy.sh' -e "$RSH" "$DIR/" "$VPS:$dest/"
  # rsync с Mac переносит владельца файлов как есть; на сервере они должны принадлежать root и читаться всеми.
  $RSH "$VPS" "chown -R root:root '$dest' && chmod -R u=rwX,go=rX '$dest'"
}
# Блок nginx для /shop/: ставится в server-блок домена. Если nginx -t не проходит, конфиг возвращается как был.
install_shop_nginx(){
  $RSH "$VPS" "DOMAIN='${DOMAIN}' bash -s" <<'REMOTE'
set -euo pipefail
CONF="$(readlink -f /etc/nginx/sites-enabled/${DOMAIN}.conf)"
SNIP=/etc/nginx/snippets/erkak-shop.conf
[ -f "$CONF" ] || { echo "Нет конфига nginx для ${DOMAIN}: магазин в подпапке ставится только на уже работающий сайт."; exit 1; }
nginx -t 2>/dev/null || { echo "nginx -t не проходит ещё до изменений. Ничего не меняю."; nginx -t; exit 1; }
BAK="$(mktemp -d /root/.erkak-shop-nginx.XXXXXX)"
cp -p "$CONF" "$BAK/site.conf"; [ ! -f "$SNIP" ] || cp -p "$SNIP" "$BAK/snippet.conf"
restore(){ cp -p "$BAK/site.conf" "$CONF"; if [ -f "$BAK/snippet.conf" ]; then cp -p "$BAK/snippet.conf" "$SNIP"; else rm -f "$SNIP"; fi; }
cp /opt/erkak/nginx.shop-snippet.conf "$SNIP"
# Строка include добавляется один раз, в server-блок с сертификатом (первая строка «root …» этого домена).
grep -q 'include snippets/erkak-shop.conf;' "$CONF" || sed -i "0,/^\s*root \/var\/www\/${DOMAIN};/s//&\n    include snippets\/erkak-shop.conf;/" "$CONF"
grep -q 'include snippets/erkak-shop.conf;' "$CONF" || { restore; rm -rf "$BAK"; echo "Не нашёл в $CONF строку «root /var/www/${DOMAIN};»: блок магазина не подключён, конфиг не менялся."; exit 1; }
if ! nginx -t 2>"$BAK/test.log"; then cat "$BAK/test.log"; restore; rm -rf "$BAK"; echo "nginx -t не прошёл: конфиг возвращён как был, nginx не перезагружался."; exit 1; fi
systemctl reload nginx
code(){ curl -s -o /dev/null -m 10 -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}$1"; }
# reload возвращается сразу, а новые процессы nginx начинают отвечать через несколько секунд: ждём до 40 с.
for _ in $(seq 1 20); do
  main="$(code /)"; shop="$(code /shop/)"; api="$(code /shop/api/health)"
  [ "$main" = 200 ] && [ "$shop" = 200 ] && [ "$api" = 200 ] && break
  sleep 2
done
if [ "$main" != 200 ] || [ "$shop" != 200 ] || [ "$api" != 200 ]; then
  restore; nginx -t 2>/dev/null && systemctl reload nginx; rm -rf "$BAK"
  echo "Проверка после включения не прошла (сайт $main, магазин $shop, API $api): конфиг nginx возвращён как был."; exit 1
fi
rm -rf "$BAK"
echo "nginx: /shop/ подключён. Сайт $main, магазин $shop, API $api"
REMOTE
}

if [ "$MODE" = "shop" ]; then
  bump_assets
  echo "[shop] страницы → /var/www/${DOMAIN}-shop, API → /opt/erkak, адрес https://${DOMAIN}/shop/"
  sync_static "/var/www/${DOMAIN}-shop"
  deploy_api
  install_shop_nginx
  echo "Готово: https://${DOMAIN}/shop/"
elif [ "$MODE" = "pages" ]; then
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
  guard_root
  bump_assets
  echo "[vps] сайт → /var/www/${DOMAIN}, API → /opt/erkak, nginx, TLS"
  sync_static "/var/www/${DOMAIN}"
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
  guard_root
  $RSH "$VPS" "set -e; [ -f /var/www/${DOMAIN}/catalog.html ] && { rm -rf /var/www/${DOMAIN}-shop; mv /var/www/${DOMAIN} /var/www/${DOMAIN}-shop; }; mkdir -p /var/www/${DOMAIN}"
  rsync -az --delete -e "$RSH" "$DIR/../teaser/" "$VPS:/var/www/${DOMAIN}/"
  echo "Заглушка на https://${DOMAIN}. Вернуть магазин: ./deploy.sh vps"
else
  echo "Использование: ./deploy.sh shop | api | pages | vps | teaser"; exit 1
fi
