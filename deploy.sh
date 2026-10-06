#!/bin/bash
# ERKAK shop — деплой на прод. Два пути, любой из них достаточен.
#   ./deploy.sh pages   → GitHub Pages: репозиторий xiplo/erkak-site + домен erkak.com
#   ./deploy.sh vps     → VPS 62.238.59.42: статика в /var/www/erkak.com, API в /opt/erkak (systemd), nginx + certbot
#   ./deploy.sh teaser  → заглушка apps/teaser вместо магазина (магазин сохраняется в /var/www/erkak.com-shop)
#   ./deploy.sh wellness-check → только проверка сервера перед выкладкой экосистемы, ничего не меняет
#   ./deploy.sh wellness → экосистема ERKAK (wellness/) на erkak.com + API заявок (магазин сохраняется в /var/www/erkak.com-shop)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${DOMAIN:-erkak.com}"
MODE="${1:-pages}"
cd "$DIR"
ASSET_VERSION="$(date +%Y%m%d%H%M)"
# Сброс кэша ассетов магазина — только для выкладки магазина
case "$MODE" in pages|vps)
  sed -i "" -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${ASSET_VERSION}#g" *.html 2>/dev/null || sed -i -E "s#(assets/(site\.css|catalog\.js|site\.js))(\?v=[0-9]+)?#\1?v=${ASSET_VERSION}#g" *.html ;;
esac

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
elif [ "$MODE" = "wellness" ] || [ "$MODE" = "wellness-check" ]; then
  # Экосистема ERKAK (wellness/) на erkak.com. На сервере живут и другие проекты, поэтому:
  #   ./deploy.sh wellness-check — только смотрит сервер и печатает отчёт, ничего не меняет;
  #   ./deploy.sh wellness       — та же проверка, выкладка — только если она прошла.
  # Выкладка трогает только своё:
  #   /var/www/${DOMAIN}               сайт; прежнее содержимое — в резервной копии, магазин — в /var/www/${DOMAIN}-shop;
  #   /opt/erkak-wellness              API заявок и оплаты, служба erkak-wellness на 127.0.0.1:8796;
  #   /etc/nginx/snippets/erkak-wellness.conf и одна строка include в конфиге ${DOMAIN};
  #   /var/backups/erkak-wellness      резервная копия перед каждой выкладкой (хранятся последние 5).
  # Конфиги, папки и службы других сайтов не трогаются, node на сервере не обновляется.
  # nginx перезагружается (reload, без обрыва соединений) только если nginx -t проходит.
  # При любой ошибке всё возвращается как было, в том числе если после выкладки изменился ответ другого сайта.
  VPS="${VPS_USER:-root}@${VPS_HOST:-62.238.59.42}"
  SSHO="-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=20"
  SSH="ssh $SSHO $VPS"
  CONF="${NGINX_CONF:-/etc/nginx/sites-available/${DOMAIN}.conf}"
  # Сборка всех языков (STRICT: недописанный перевод — ошибка) и проверки: переводы, ссылки, hreflang, JSON-LD.
  # Всё это — до первого обращения к серверу.
  (cd "$DIR/wellness" && STRICT=1 node build.mjs && node tools/check-i18n.mjs && node tools/check.mjs)
  NEED_MB=$(( $(du -sm "$DIR/wellness/public" | cut -f1) * 3 + 300 ))
  # REPORT=short (так в CI для публичного репозитория): без списка портов, контейнеров и чужих доменов в логе
  $SSH "DOMAIN='${DOMAIN}' CONF='${CONF}' NEED_MB=${NEED_MB} REPORT='${REPORT:-full}' ALLOW_UNKNOWN_WEBROOT='${ALLOW_UNKNOWN_WEBROOT:-}' bash -s" <<'PREFLIGHT' || { echo "Выкладка остановлена: на сервере ничего не изменено."; exit 1; }
set -u
W=/var/www/$DOMAIN; BAD=0; WARN=0
bad(){ echo "  ✗ $*"; BAD=$((BAD+1)); }
warn(){ echo "  ! $*"; WARN=$((WARN+1)); }
ok(){ echo "  ✓ $*"; }
ENABLED=$(ls -1 /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null)
echo "== Сервер: $(hostname), $(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-?}"), $(uptime -p 2>/dev/null)"
echo "== Включённых конфигов nginx: $(echo "$ENABLED" | grep -c . )"
if [ "$REPORT" = full ]; then
  for f in $ENABLED; do echo "  $(basename "$f"): $(grep -v '^\s*#' "$f" | grep -oE 'server_name[[:space:]][^;]+' | sed -E 's/^server_name[[:space:]]+//' | tr '\n' ' ' | tr -s ' ')"; done
  echo "== /var/www:"; ls -1 /var/www 2>/dev/null | sed 's/^/  /'
  echo "== /opt:"; ls -1 /opt 2>/dev/null | sed 's/^/  /'
  echo "== Слушают порты:"; ss -ltnpH 2>/dev/null | awk '{print $4, $6}' | sed -E 's/users:\(\("([^"]+)".*/\1/' | sort -u | sed 's/^/  /'
  command -v docker >/dev/null && { echo "== Docker:"; docker ps --format '  {{.Names}} {{.Ports}}' 2>/dev/null; }
fi
echo "== Службы erkak:"; systemctl list-units --all --no-legend 'erkak*' 2>/dev/null | awk '{print "  " $1, $3, $4}'
echo
echo "== Проверки"
# nginx и порты сайта
if ! command -v nginx >/dev/null; then bad "nginx не установлен"
elif nginx -t >/dev/null 2>&1; then ok "nginx -t проходит (до наших правок)"
else bad "nginx -t не проходит уже сейчас, до наших правок: чужой конфиг сломан, reload нельзя"; nginx -t 2>&1 | tail -3 | sed 's/^/    /'; fi
o80=$(ss -ltnpH 'sport = :80' 2>/dev/null | grep -oE 'users:\(\("[^"]+"' | head -1 | cut -d'"' -f2)
[ "$o80" = nginx ] && ok "порт 80 — nginx" || bad "порт 80: «${o80:-никто}», а не nginx — схема выкладки не подходит"
o443=$(ss -ltnpH 'sport = :443' 2>/dev/null | grep -oE 'users:\(\("[^"]+"' | head -1 | cut -d'"' -f2)
[ -z "$o443" ] || [ "$o443" = nginx ] && ok "порт 443 — ${o443:-не слушается}" || bad "порт 443: «$o443», а не nginx"
# Конфиг домена
if [ -f "$CONF" ]; then
  ok "конфиг домена: $CONF"
  live=$(grep -lE "server_name[^;]*[[:space:]]${DOMAIN}[[:space:];]" $ENABLED 2>/dev/null | xargs -r readlink -f | sort -u)
  if [ -z "$live" ]; then bad "$DOMAIN не найден ни в одном включённом конфиге"
  elif [ "$live" = "$(readlink -f "$CONF")" ]; then ok "$DOMAIN обслуживает только этот конфиг"
  else bad "$DOMAIN описан в других конфигах: $(echo $live) — непонятно, какой главный"; fi
  if grep -q 'snippets/erkak-wellness.conf' "$CONF"; then ok "сниппет ERKAK уже подключён"
  elif grep -qE "^\s*root /var/www/$DOMAIN;" "$CONF"; then ok "есть «root /var/www/$DOMAIN;» — после неё добавится одна строка include"
  else bad "в конфиге нет строки «root /var/www/$DOMAIN;» — не знаю, куда подключить сниппет"; fi
else
  bad "нет $CONF (другой путь: NGINX_CONF=…)"
  grep -lE "server_name[^;]*$DOMAIN" $ENABLED 2>/dev/null | sed 's/^/    домен упоминается в: /'
fi
# Папка сайта
if [ -L "$W" ]; then bad "$W — ссылка на $(readlink -f "$W"), не трогаю"
elif [ ! -e "$W" ] || [ -z "$(ls -A "$W" 2>/dev/null)" ]; then ok "$W пуста или её нет"
elif [ -f "$W/.erkak-wellness" ]; then ok "$W — сайт ERKAK, выложен $(cat "$W/.erkak-wellness")"
elif [ -f "$W/catalog.html" ]; then
  warn "$W — сейчас магазин: он переедет в $W-shop (не удаляется), на домене станет экосистема"
  [ -e "$W-shop" ] && warn "старая $W-shop будет переименована в $W-shop.<дата>, не удалена"
elif [ -f "$W/ru/index.html" ] && grep -q 'ERKAK' "$W/ru/index.html" 2>/dev/null; then ok "$W — прежняя версия экосистемы ERKAK"
elif [ -n "$ALLOW_UNKNOWN_WEBROOT" ]; then warn "в $W незнакомые файлы (разрешено ALLOW_UNKNOWN_WEBROOT): уйдут в резервную копию"
else bad "в $W незнакомые файлы: $(ls -A "$W" | head -8 | tr '\n' ' ') — не трогаю (если это можно заменить: ALLOW_UNKNOWN_WEBROOT=1)"; fi
[ -d "$W/.well-known" ] && ok "$W/.well-known (подтверждение сертификата) сохранится"
rn=$(grep -l "$DOMAIN" /etc/letsencrypt/renewal/*.conf 2>/dev/null | head -1)
[ -n "$rn" ] && ok "сертификат: $(basename "$rn"), способ продления: $(grep -hoE '^authenticator\s*=\s*\S+' "$rn" | awk '{print $3}')"
# Порт и служба API
pid=$(ss -ltnpH 'sport = :8796' 2>/dev/null | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
mine=$(systemctl show -p MainPID --value erkak-wellness 2>/dev/null)
if [ -z "$pid" ]; then ok "порт 8796 свободен"
elif [ "$pid" = "$mine" ]; then ok "порт 8796 — наша служба erkak-wellness"
else bad "порт 8796 занят другим процессом: $(ps -o comm= -p "$pid")"; fi
U=/etc/systemd/system/erkak-wellness.service
if [ -f "$U" ] && ! grep -q '/opt/erkak-wellness/leads.mjs' "$U"; then bad "служба erkak-wellness уже есть и запускает что-то другое"; fi
if [ -x /usr/bin/node ]; then
  if /usr/bin/node -e "require('node:sqlite')" >/dev/null 2>&1; then ok "node $(/usr/bin/node -v) с node:sqlite"
  else bad "node $(/usr/bin/node -v) слишком старый: нужен 22.13+ (node:sqlite). Обновлять не буду — им могут пользоваться другие проекты"; fi
else bad "нет /usr/bin/node (нужен Node 22.13+)"; fi
command -v rsync >/dev/null && ok "rsync есть" || bad "на сервере нет rsync"
id www-data >/dev/null 2>&1 || bad "нет пользователя www-data"
avail=$(df -Pm /var/www 2>/dev/null | awk 'NR==2{print $4}')
[ "${avail:-0}" -ge "$NEED_MB" ] && ok "свободно на диске: ${avail} МБ (нужно ~${NEED_MB})" || bad "мало места: ${avail:-?} МБ, нужно ~${NEED_MB}"
echo
if [ "$BAD" -gt 0 ]; then echo "ИТОГ: выкладка заблокирована, проблем: $BAD"; exit 3; fi
echo "ИТОГ: можно выкладывать (предупреждений: $WARN)"
PREFLIGHT
  [ "$MODE" = "wellness-check" ] && { echo "Проверка закончена, на сервере ничего не изменено."; exit 0; }

  # Загрузка в служебные папки рядом (их nginx не отдаёт); рабочий сайт пока не меняется
  STAGE="/var/www/.${DOMAIN}-next"
  $SSH "mkdir -p '$STAGE' /opt/erkak-wellness/.next"
  rsync -rlptz --delete --chmod=D755,F644 -e "ssh $SSHO" "$DIR/wellness/public/" "$VPS:$STAGE/"
  rsync -rlptz --delete --chmod=D755,F644 -e "ssh $SSHO" "$DIR/wellness/server/" "$VPS:/opt/erkak-wellness/.next/"
  # Секреты — только из переменных окружения (терминал или секреты GitHub), в git и в логи не попадают:
  #   TELEGRAM_BOT_TOKEN=… LEADS_TG_CHAT=… STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… ./deploy.sh wellness
  # Заданные переменные дописываются (или заменяются) в /opt/erkak-wellness/.env; остальные строки файла не трогаем.
  ENVFRAG=""
  for k in TELEGRAM_BOT_TOKEN LEADS_TG_CHAT STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SITE_ORIGIN; do
    v="${!k:-}"; [ -n "$v" ] && ENVFRAG+="$k=$v"$'\n'
  done
  printf '%s' "$ENVFRAG" | $SSH 'umask 077; cat > /opt/erkak-wellness/.incoming.env'

  $SSH "DOMAIN='${DOMAIN}' CONF='${CONF}' bash -s" <<'REMOTE'
set -eu -o pipefail
W=/var/www/$DOMAIN; STAGE=/var/www/.$DOMAIN-next; PREV=/var/www/.$DOMAIN-prev
O=/opt/erkak-wellness; U=/etc/systemd/system/erkak-wellness.service; SNIP=/etc/nginx/snippets/erkak-wellness.conf
TS=$(date +%Y%m%d-%H%M%S); B=/var/backups/erkak-wellness
mkdir -p "$B"; chmod 700 "$B"
STEP=start; DONE=0; MOVED_SHOP=0; OLD_SHOP=0; SWAPPED=0; CODE_BAK=0; UNIT=keep; SNIP_STATE=none; CONF_BAK=""

# Откат — ловушкой на выход: срабатывает один раз, в главном процессе, при любой ошибке или обрыве связи.
# Ничего не удаляет, кроме только что выложенной папки с меткой этого запуска.
on_exit(){
  [ "$DONE" = 1 ] && return
  set +e
  echo "!!! Ошибка на шаге «$STEP» — возвращаю всё как было"
  [ -n "$CONF_BAK" ] && cp -a "$CONF_BAK" "$CONF"
  case "$SNIP_STATE" in replaced) cp -a "$B/snippet.$TS" "$SNIP";; created) rm -f "$SNIP";; esac
  if [ "$SWAPPED" = 1 ]; then
    if [ "$(cat "$W/.erkak-wellness" 2>/dev/null)" = "$TS" ]; then rm -rf "$W"; elif [ -e "$W" ]; then mv "$W" "/var/www/.$DOMAIN-failed.$TS"; fi
    [ -d "$PREV" ] && [ ! -e "$W" ] && mv "$PREV" "$W"
  fi
  [ "$MOVED_SHOP" = 1 ] && [ ! -e "$W" ] && [ -d "$W-shop" ] && mv "$W-shop" "$W"
  [ "$OLD_SHOP" = 1 ] && [ ! -e "$W-shop" ] && [ -d "$W-shop.$TS" ] && mv "$W-shop.$TS" "$W-shop"
  [ "$CODE_BAK" = 1 ] && cp -a "$O/.prev/." "$O/"
  case "$UNIT" in
    new) systemctl disable --now erkak-wellness >/dev/null 2>&1; rm -f "$U"; systemctl daemon-reload;;
    replaced) cp -a "$B/unit.$TS" "$U"; systemctl daemon-reload; systemctl restart erkak-wellness
      for _ in 1 2 3 4 5 6 7 8 9 10; do curl -sf -m 3 http://127.0.0.1:8796/api/health >/dev/null && break; sleep 1; done
      echo "API заявок (прежняя версия): $(curl -s -m 3 http://127.0.0.1:8796/api/health || echo 'не отвечает')";;
  esac
  if nginx -t >/dev/null 2>&1; then systemctl reload nginx; echo "nginx: прежний конфиг, перезагружен"; else echo "!!! nginx -t не проходит даже после отката — проверьте вручную: nginx -t"; fi
  echo "Откат закончен. Полная копия до выкладки: $B/$TS.tgz"
  exit 1
}
trap on_exit EXIT
trap 'exit 1' HUP INT TERM

# Ответы других сайтов этого сервера до выкладки — сравним после
OTHERS=$(nginx -T 2>/dev/null | grep -v '^\s*#' | grep -oE 'server_name[[:space:]][^;]+' | sed -E 's/^server_name[[:space:]]+//' | tr ' ' '\n' \
  | grep -E '^[a-z0-9.-]+\.[a-z]{2,}$' | grep -vxF -e "$DOMAIN" -e "www.$DOMAIN" | sort -u | head -40 || true)
probe(){ for d in $OTHERS; do
  c=$(curl -sk -o /dev/null -m 8 -w '%{http_code}' --resolve "$d:443:127.0.0.1" "https://$d/" 2>/dev/null || true)
  [ "$c" = 000 ] && c=$(curl -s -o /dev/null -m 8 -w '%{http_code}' --resolve "$d:80:127.0.0.1" "http://$d/" 2>/dev/null || true)
  printf '%s %s\n' "$d" "$c"; done; }
BEFORE=$(probe)

STEP="резервная копия"
paths=""; for p in "$W" "$CONF" "$SNIP" "$O" "$U"; do [ -e "$p" ] && paths+=" ${p#/}"; done
[ -n "$paths" ] && tar -czf "$B/$TS.tgz" -C / --exclude="${O#/}/.next" --exclude="${O#/}/.prev" --exclude="${O#/}/.incoming.env" $paths
[ -f "$B/$TS.tgz" ] && echo "Резервная копия: $B/$TS.tgz ($(du -h "$B/$TS.tgz" | cut -f1))"

STEP="сайт"
[ -d "$W/.well-known" ] && cp -a "$W/.well-known" "$STAGE/"
echo "$TS" > "$STAGE/.erkak-wellness"
if [ -f "$W/catalog.html" ]; then
  if [ -e "$W-shop" ]; then mv "$W-shop" "$W-shop.$TS"; OLD_SHOP=1; fi
  mv "$W" "$W-shop"; MOVED_SHOP=1; echo "Магазин перенесён в $W-shop"
fi
rm -rf "$PREV"
[ -e "$W" ] && mv "$W" "$PREV"
mv "$STAGE" "$W"; SWAPPED=1

STEP="API заявок"
rm -rf "$O/.prev"; mkdir -p "$O/.prev" && cp -a "$O"/*.mjs "$O"/*.json "$O"/*.service "$O"/*.conf "$O"/.env "$O/.prev/" 2>/dev/null || true; CODE_BAK=1
cp -a "$O/.next/." "$O/"; rm -rf "$O/.next"
umask 077; touch "$O/.env"
while IFS= read -r line; do k="${line%%=*}"; [ -n "$k" ] || continue
  grep -v -E "^#? *${k}=" "$O/.env" > "$O/.env.tmp" || true; printf '%s\n' "$line" >> "$O/.env.tmp"; mv "$O/.env.tmp" "$O/.env"
done < "$O/.incoming.env"
rm -f "$O/.incoming.env"; chmod 600 "$O/.env"; umask 022
KEYS=$(grep -v '^#' "$O/.env" | cut -d= -f1 | tr '\n' ' ' || true); echo "Настройки API: ${KEYS:-не заданы}"
mkdir -p "$O/data"; chown -R www-data:www-data "$O/data"
if [ -f "$U" ]; then cp -a "$U" "$B/unit.$TS"; UNIT=replaced; else UNIT=new; fi
cp "$O/erkak-wellness.service" "$U"
systemctl daemon-reload; systemctl enable erkak-wellness >/dev/null 2>&1; systemctl restart erkak-wellness
up=0; for _ in 1 2 3 4 5 6 7 8 9 10; do curl -sf -m 3 http://127.0.0.1:8796/api/health >/dev/null && { up=1; break; }; sleep 1; done
[ "$up" = 1 ] || { journalctl -u erkak-wellness -n 20 --no-pager; false; }

STEP="nginx"
mkdir -p "$(dirname "$SNIP")"
if [ -f "$SNIP" ]; then cp -a "$SNIP" "$B/snippet.$TS"; SNIP_STATE=replaced; else SNIP_STATE=created; fi
cp "$O/nginx.wellness-snippet.conf" "$SNIP"
if ! grep -q 'snippets/erkak-wellness.conf' "$CONF"; then
  CONF_BAK="$B/$(basename "$CONF").$TS"; cp -a "$CONF" "$CONF_BAK"
  sed -i "s#^\(\s*root /var/www/${DOMAIN};\)#\1\n    include snippets/erkak-wellness.conf;#" "$CONF"
fi
if ! nginx -t >/dev/null 2>&1; then nginx -t 2>&1 | tail -5; false; fi
systemctl reload nginx; sleep 2

STEP="проверка"
code(){ curl -sk -o /dev/null -m 10 -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" --resolve "$DOMAIN:80:127.0.0.1" "$@" 2>/dev/null || true; }
page=$(code "https://$DOMAIN/ru/"); [ "$page" = 200 ] || page=$(code "http://$DOMAIN/ru/")
echo "Сайт /ru/: $page"; [ "$page" = 200 ]
api=$(code -X POST -H 'content-type: application/json' -d '{}' "https://$DOMAIN/api/lead"); case "$api" in 2??|4??) ;; *) api=$(code -X POST -H 'content-type: application/json' -d '{}' "http://$DOMAIN/api/lead");; esac
echo "Заявки через nginx: $api (400 на пустую заявку — норма)"; case "$api" in 400|429) ;; *) false;; esac
AFTER=$(probe)
if [ "$BEFORE" != "$AFTER" ]; then
  sleep 3; AGAIN=$(probe)
  if [ "$BEFORE" != "$AGAIN" ]; then
    echo "Другие сайты ответили иначе, чем до выкладки:"; diff <(echo "$BEFORE") <(echo "$AGAIN") | grep '^[<>]' | sed 's/^/  /' || true
    false
  fi
fi
echo "Другие сайты сервера ($(echo "$OTHERS" | grep -c . || true)): ответы те же, что до выкладки"
DONE=1
set +e  # дальше — необязательные шаги, выкладка уже прошла

# Хранятся последние 5 копий
ls -1t "$B"/*.tgz 2>/dev/null | tail -n +6 | xargs -r rm -f
find "$B" -maxdepth 1 -type f ! -name '*.tgz' -mtime +30 -delete
echo "Заявки: $(curl -s http://127.0.0.1:8796/api/health)"
# Проверка Telegram: одно тестовое сообщение в группу заявок, если бот настроен
if grep -q '^TELEGRAM_BOT_TOKEN=' "$O/.env"; then
  (set -a; . "$O/.env"; set +a; cd "$O" && /usr/bin/node leads.mjs tg-test) || echo "! Telegram: проверьте TELEGRAM_BOT_TOKEN и LEADS_TG_CHAT"
fi
REMOTE
  # IndexNow (Bing, Yandex, Seznam…): сообщаем о всех адресах из карт сайта. Отключить: NO_INDEXNOW=1
  [ -n "${NO_INDEXNOW:-}" ] || (cd "$DIR/wellness" && node tools/indexnow.mjs) || echo "! IndexNow не ответил — не критично"
  echo "Готово: https://${DOMAIN} — экосистема ERKAK на 9 языках. Прежняя версия: /var/www/.${DOMAIN}-prev, резервные копии: /var/backups/erkak-wellness (как вернуть — wellness/README.md, «Деплой»)"
else
  echo "Использование: ./deploy.sh pages | vps | teaser | wellness-check | wellness"; exit 1
fi
