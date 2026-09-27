// SIAM STRIKE · сборка статических страниц из assets/data.js и assets/art.js.
// Запуск: node build.mjs  → index.html, tours/*.html, privacy.html, sitemap.xml
// Без зависимостей. HTML получается полностью статичным (SEO), app.js добавляет интерактив.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const load = (f, name) => vm.runInNewContext(fs.readFileSync(path.join(DIR, 'assets', f), 'utf8') + `;${name}`, {});
const D = load('data.js', 'DATA');
const ART = load('art.js', 'ART');
const V = Date.now().toString(36);

// ── Утилиты ──────────────────────────────────────────────────────
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
const usd = n => '≈ $' + fmt(Math.round(n / D.rates.USD / 10) * 10);
const PER = { boat:'за лодку', person:'за рыболова', group:'за программу' };
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const tourById = Object.fromEntries(D.tours.map(t => [t.id, t]));
const spotById = Object.fromEntries(D.spots.map(s => [s.id, s]));
const tg = D.contacts.telegram ? `https://t.me/${D.contacts.telegram}` : '';
const wa = D.contacts.whatsapp ? `https://wa.me/${D.contacts.whatsapp}` : '';
const priceHtml = (t, cls = '') => `<div class="price ${cls}"><small>от · ${PER[t.per]}</small><span data-thb="${t.price}">${fmt(t.price)} THB</span><span class="alt" data-usd="${t.price}">${usd(t.price)}</span></div>`;
const tags = t => [t.hot && '<span class="tag hot">Хит сезона</span>', t.lux && '<span class="tag lux">Премиум</span>', `<span class="tag">${esc(t.kind)}</span>`].filter(Boolean).join('');
const poster = (t, big) => `<div class="poster">${ART.posterBg(t.tone)}${t.photo ? `<img src="${t.photo}" alt="${esc(t.title)}" loading="lazy">` : ART.fish(t.fish)}<div class="tags">${tags(t)}</div>${big ? '' : `<div class="gauge"><span>${esc(t.dur.toUpperCase())}</span><span>${esc(t.group.toUpperCase())}</span></div>`}</div>`;

function tourCard(t, pre = ''){
  return `<a class="tour rv" href="${pre}tours/${t.id}.html" data-cat="${t.cat}">
  ${poster(t)}
  <div class="tour-body">
    <span class="where">${esc(t.where)}</span>
    <h3>${esc(t.title)}</h3>
    <p>${esc(t.short)}</p>
    <div class="specs">${t.species.slice(0,4).map(s => `<span>${esc(s)}</span>`).join('')}</div>
    <div class="tour-foot">${priceHtml(t)}<span class="go" aria-hidden="true">${ART.icon('arrow')}</span></div>
  </div></a>`;
}

// ── Каркас страницы ──────────────────────────────────────────────
function page({ title, desc, canonical, body, pre = '', ld = [], og = '' }){
  const nav = [['Туры', 'index.html#tours'], ['Кому', 'index.html#who'], ['Консьерж', 'index.html#concierge'], ['Где ловим', 'index.html#map'], ['Сезон', 'index.html#season'], ['Вопросы', 'index.html#faq']];
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${D.origin}/${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${D.origin}/${canonical}">
${og ? `<meta property="og:image" content="${og}">` : ''}
<meta name="theme-color" content="#03111A">
<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="${pre}assets/strike.css?v=${V}">
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head>
<body>
<header class="top" id="top"><div class="wrap">
  <a class="logo" href="${pre}index.html" aria-label="${D.brand} — на главную">${ART.logo}<span>${D.brand}<small>${D.tagline.toUpperCase()}</small></span></a>
  <nav class="nav" id="nav" aria-label="Разделы">${nav.map(([n, h]) => `<a href="${pre}${h}">${n}</a>`).join('')}</nav>
  <a class="btn btn-cta" href="${pre}index.html#pick">Подобрать тур</a>
  <button class="burger" id="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
</div></header>
<main>
${body}
</main>
${footer(pre)}
<div class="dock" id="dock">${tg ? `<a class="tg" href="${tg}" target="_blank" rel="noopener" aria-label="Написать в Telegram">${ART.icon('tg')}</a>` : ''}${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">${ART.icon('wa')}</a>` : ''}</div>
<div class="mbar" id="mbar"><a class="btn btn-cta" href="${pre}index.html#pick">Подобрать тур за 60 сек</a></div>
<script src="${pre}assets/data.js?v=${V}"></script>
<script src="${pre}assets/art.js?v=${V}"></script>
<script src="${pre}assets/app.js?v=${V}"></script>
</body>
</html>
`;
}

function footer(pre){
  const L = D.legal, C = D.contacts;
  const legal = [L.operator, L.tat && `Лицензия TAT № ${L.tat}`, L.insurance].filter(Boolean).map(esc).join(' · ');
  return `<footer class="foot"><div class="wrap">
  <div><a class="logo" href="${pre}index.html">${ART.logo}<span>${D.brand}<small>${D.tagline.toUpperCase()}</small></span></a>
    <p style="margin-top:18px;max-width:340px">Профессиональная спортивная рыбалка и консьерж-сервис в Таиланде. Андаманское море, Сиамский залив, пресные гиганты. На русском, легально, под ключ.</p></div>
  <div><h4>Море</h4>${D.tours.filter(t => t.cat === 'sea').map(t => `<a href="${pre}tours/${t.id}.html">${esc(t.title)}</a>`).join('')}</div>
  <div><h4>Пресная вода и VIP</h4>${D.tours.filter(t => t.cat !== 'sea').map(t => `<a href="${pre}tours/${t.id}.html">${esc(t.title)}</a>`).join('')}</div>
  <div><h4>Связь</h4>${tg ? `<a href="${tg}" target="_blank" rel="noopener">Telegram @${esc(C.telegram)}</a>` : ''}${wa ? `<a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${C.phone ? `<a href="tel:${C.phone.replace(/\s/g,'')}">${esc(C.phone)}</a>` : ''}${C.email ? `<a href="mailto:${C.email}">${esc(C.email)}</a>` : ''}<a>${esc(C.city)}</a></div>
  <div class="legal"><span>© ${new Date().getFullYear()} ${D.brand}${legal ? ' · ' + legal : ''}</span><span>Рыбалка только вне морских нацпарков и заказников · Catch &amp; release для billfish · <a href="${pre}privacy.html" style="display:inline;padding:0">Конфиденциальность</a></span></div>
</div></footer>`;
}

// ── Карта Андамана (схема) ───────────────────────────────────────
function mapSvg(){
  const B = { w0:97.45, w1:99.25, n:9.55, s:6.95 }, K = 300;
  const W = (B.w1 - B.w0) * K, H = (B.n - B.s) * K;
  const P = (lat, lon) => [((lon - B.w0) * K).toFixed(1), ((B.n - lat) * K).toFixed(1)];
  const poly = pts => pts.map(([a, o], i) => (i ? 'L' : 'M') + P(a, o).join(',')).join('') + 'Z';
  const main = [[9.6,98.47],[9.35,98.38],[9.2,98.32],[9.0,98.27],[8.85,98.27],[8.65,98.24],[8.45,98.23],[8.3,98.26],[8.2,98.29],[8.22,98.4],[8.3,98.5],[8.28,98.6],[8.15,98.7],[8.1,98.78],[8.05,98.82],[8.0,98.9],[7.95,99.0],[7.85,99.05],[7.75,99.1],[7.6,99.2],[7.45,99.3],[7.3,99.45],[6.9,99.7],[6.9,99.9],[9.6,99.9]];
  const phuket = [[8.19,98.3],[8.1,98.28],[8.0,98.27],[7.95,98.28],[7.9,98.29],[7.84,98.29],[7.8,98.3],[7.76,98.31],[7.77,98.34],[7.81,98.36],[7.84,98.4],[7.88,98.41],[7.95,98.42],[8.05,98.43],[8.12,98.38],[8.19,98.33]];
  const isl = [
    [[7.66,99.03],[7.55,99.02],[7.47,99.06],[7.55,99.1],[7.66,99.08]],
    [[8.12,98.6],[7.96,98.57],[7.9,98.62],[8.05,98.64]],
    [[7.78,98.75],[7.73,98.74],[7.68,98.77],[7.72,98.79],[7.77,98.78]],
    [[7.62,98.36],[7.59,98.355],[7.585,98.37],[7.61,98.38]],
    [[7.5,98.31],[7.48,98.305],[7.475,98.325],[7.495,98.33]],
    [[8.72,97.63],[8.6,97.63],[8.58,97.66],[8.7,97.66]],
    [[9.45,97.85],[9.38,97.85],[9.37,97.9],[9.44,97.91]],
    [[7.24,99.06],[7.2,99.05],[7.2,99.09],[7.23,99.09]]
  ];
  let grid = '';
  for (let lat = 7; lat <= 9.5; lat += 0.5) { const [, y] = P(lat, B.w0); grid += `<line x1="0" x2="${W}" y1="${y}" y2="${y}"/><text x="8" y="${+y - 6}">${lat.toFixed(1)}°N</text>`; }
  for (let lon = 97.5; lon <= 99.2; lon += 0.5) { const [x] = P(B.s, lon); grid += `<line y1="0" y2="${H}" x1="${x}" x2="${x}"/><text x="${+x + 6}" y="${H - 10}">${lon.toFixed(1)}°E</text>`; }
  const pins = D.spots.map(s => { const [x, y] = P(s.lat, s.lon); const c = s.ok ? '#14C4B4' : '#FF5A36';
    return `<g class="pin" data-spot="${s.id}" tabindex="0" role="button" aria-label="${esc(s.name)}: ${s.ok ? 'рыбалка разрешена' : 'рыбалка запрещена'}">${s.ok ? '' : `<circle cx="${x}" cy="${y}" r="34" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-opacity=".5" stroke-dasharray="4 4"/>`}<circle class="ring" cx="${x}" cy="${y}" r="11" fill="${c}" fill-opacity=".22"/><circle cx="${x}" cy="${y}" r="5.5" fill="${c}"/><text x="${s.la === 'l' ? x - 16 : s.la === 't' ? x : +x + 16}" y="${s.la === 't' ? y - 18 : +y + 5}" text-anchor="${s.la === 'l' ? 'end' : s.la === 't' ? 'middle' : 'start'}" fill="#E8F2F4" font-size="15" font-weight="700">${esc(s.name)}</text></g>`; }).join('');
  const [cx, cy] = P(7.82, 98.36);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Схема Андаманского моря: разрешённые точки и зоны запрета">
  <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="8" stroke="#0E2F3E" stroke-width="3"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="#061823"/>
  <path d="M0,${H * .55}Q${W * .25},${H * .5} ${W * .3},${H * .8}T${W * .2},${H}L0,${H}Z" fill="#051420"/>
  <g stroke="#0F3140" stroke-width="1" font-family="JetBrains Mono,monospace" font-size="11" fill="#3E6574">${grid}</g>
  <path d="${poly(main)}" fill="#0C2A39" stroke="#1C4B5E" stroke-width="1.5"/>
  <path d="${poly(main)}" fill="url(#hatch)" opacity=".5"/>
  <path d="${poly(phuket)}" fill="#12384A" stroke="#2A6378" stroke-width="1.5"/>
  ${isl.map(p => `<path d="${poly(p)}" fill="#12384A" stroke="#2A6378"/>`).join('')}
  <g font-family="Unbounded,sans-serif" font-size="13" fill="#6D8791" letter-spacing="2"><text x="${P(8.0, 98.12)[0]}" y="${P(8.0, 98.12)[1]}">ПХУКЕТ</text><text x="${P(8.5, 98.62)[0]}" y="${P(8.5, 98.62)[1]}">ТАИЛАНД</text><text x="${P(7.1, 97.6)[0]}" y="${P(7.1, 97.6)[1]}">АНДАМАНСКОЕ МОРЕ</text></g>
  <g><circle cx="${cx}" cy="${cy}" r="4" fill="#F2B544"/><text x="${cx - 10}" y="${+cy + 4}" text-anchor="end" fill="#F2B544" font-size="12" font-family="JetBrains Mono,monospace">ЧАЛОНГ</text></g>
  ${pins}
  <g transform="translate(${W - 60},60)" stroke="#3E6574" fill="none"><circle r="26"/><path d="M0,-34V34M-34,0H34"/><path d="M0,-26L6,0 0,26 -6,0Z" fill="#14C4B4" stroke="none" opacity=".8"/><text y="-40" text-anchor="middle" fill="#6D8791" stroke="none" font-size="12" font-family="JetBrains Mono,monospace">N</text></g>
</svg>`;
}

// ── Эхолот ───────────────────────────────────────────────────────
function sonarSvg(){
  const seg = dx => `M${dx},380Q${dx + 60},352 ${dx + 120},370T${dx + 240},346T${dx + 360},374T${dx + 500},380`;
  const arcs = [[70,150,1],[130,210,0],[210,120,1],[300,250,0],[340,180,1],[420,290,0],[460,140,1]];
  const arc = (x, y, big) => `<path d="M${x - (big ? 14 : 9)},${y}q${big ? 14 : 9},-${big ? 11 : 7} ${big ? 28 : 18},0" stroke="${big ? '#FF5A36' : '#8CEBDF'}" stroke-width="${big ? 4 : 3}" fill="none" stroke-linecap="round" class="${big ? 'blip' : ''}"/>`;
  const layer = dx => `<path d="${seg(dx)}L${dx + 500},520L${dx},520Z" fill="url(#bottom)"/><path d="${seg(dx)}" stroke="#F2B544" stroke-width="3" fill="none"/>${arcs.map(([x, y, b]) => arc(x + dx, y, b)).join('')}`;
  const noise = Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 97) % 1000}" cy="${60 + (i * 53) % 280}" r="${i % 3 ? .8 : 1.3}" fill="#8CEBDF" opacity="${.15 + (i % 5) / 12}"/>`).join('');
  let scale = ''; for (let m = 0; m <= 80; m += 20) { const y = 70 + m * 3.9; scale += `<line x1="0" x2="500" y1="${y}" y2="${y}" stroke="#0F3140" stroke-dasharray="2 6"/><text x="488" y="${y - 6}" text-anchor="end">${m} м</text>`; }
  return `<svg viewBox="0 0 500 510" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5A36" stop-opacity=".9"/><stop offset=".25" stop-color="#F2B544" stop-opacity=".55"/><stop offset=".6" stop-color="#14C4B4" stop-opacity=".18"/><stop offset="1" stop-color="#03111A" stop-opacity="0"/></linearGradient></defs>
  <g font-family="JetBrains Mono,monospace" font-size="11" fill="#3E6574">${scale}</g>
  <line x1="0" x2="500" y1="70" y2="70" stroke="#14C4B4" stroke-opacity=".5"/>
  <g class="scan">${layer(0)}${layer(500)}${noise}</g>
  <line x1="470" x2="470" y1="70" y2="510" stroke="#14C4B4" stroke-opacity=".25"/>
</svg>`;
}

// ── Главная ──────────────────────────────────────────────────────
function indexPage(){
  const nowM = new Date().getMonth();
  const pains = [
    ['Экскурсия на 40 человек','Баркас, толпа, леска на палке и двадцать минут у воды между перекусами и снорклингом.','Приватные лодки и мини-группы до 6 рыболовов. Время — на рыбалку.'],
    ['Штраф за рыбалку в нацпарке','Рыбалку на Симиланах и Пхи-Пхи до сих пор продают, хотя она запрещена законом: штраф до 500 000 THB и уголовная статья.','Только разрешённые точки: шельф, FAD, Рача. Лицензированный оператор и тайский гид на борту.'],
    ['Капитан не понимает, что вы хотите','Жесты, переводчик в телефоне и выход «куда обычно» вместо вашей рыбы.','Консьерж на русском на связи до, во время и после. Бриф с капитаном готовим заранее.'],
    ['Пустой выход не в сезон','Вам продают парусника в месяц, когда его нет, и ветер, при котором не выйти за рифы.','Дату и формат подбираем по календарю клёва, прогнозу и фазе луны. Честно скажем, если ваша рыба не в сезон.'],
    ['Снасти не выдержали трофей','Уставший шнур, ржавые крючки, катушка, которая сдаётся первой рыбе на 20 кг.','Shimano Stella и Daiwa Saltiga, PE 6–10, свежие шнуры и крючки на каждый Pro-выход.'],
    ['Нечем заплатить из России','Карты не проходят, а переводить «капитану на карту» страшно.','Рубли через партнёра, USDT, наличные на месте. Предоплата 30%, счёт и договор на русском.']
  ];
  const segTabs = D.segments.map((s, i) => `<button role="tab" id="tab-${s.id}" aria-controls="seg-${s.id}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${esc(s.label)}</button>`).join('');
  const segPanels = D.segments.map((s, i) => `<div class="seg-panel" role="tabpanel" id="seg-${s.id}" aria-labelledby="tab-${s.id}"${i ? ' hidden' : ''}>
    <div class="seg-who"><h3>${esc(s.title)}</h3><p class="quote">${esc(s.quote)}</p><ul>${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <div class="seg-picks">${s.picks.map(id => tourById[id]).map(t => `<a class="seg-pick" href="tours/${t.id}.html">${ART.fish(t.fish)}<div><strong>${esc(t.title)}</strong><span>${esc(t.where)} · ${esc(t.dur)}</span></div><div class="p"><span data-thb="${t.price}">${fmt(t.price)} THB</span><small>от · ${PER[t.per]}</small></div></a>`).join('')}
    <a class="btn btn-cta btn-lg" href="#pick" data-seg="${s.id}" style="justify-self:start;margin-top:8px">Собрать мой вариант <span class="arrow">${ART.icon('arrow')}</span></a></div>
  </div>`).join('');
  const ladder = [
    ['01 · БЕСПЛАТНО','Гайд и календарь клёва','0 THB','Легальные точки, сезоны, что взять с собой. Присылаем в мессенджер.', 8],
    ['02 · ПОПРОБОВАТЬ','Первый страйк', `${fmt(4900)} THB`,'Мини-группа до 6 человек. Идеально, чтобы понять, ваше ли это.', 22],
    ['03 · ПРИВАТНО','Семейный день · Pro Day', `${fmt(24000)}–${fmt(38000)}`,'Лодка только ваша. От спокойного дня с детьми до поппинга GT.', 45],
    ['04 · ТРОФЕЙ','Big Game · Ночь на шельфе', `${fmt(89000)}+`,'Спортфишер, шеф, парусник и марлин. Главный шанс на трофей.', 72],
    ['05 · SIGNATURE','Турнир · Signature Week', `${fmt(390000)}+`,'Консьерж, вилла, флот, фильм. Всё решено ещё до прилёта.', 100]
  ].map(([l, h, p, d, w]) => `<div class="step"><span class="lvl">${l}</span><h3>${h}</h3><span class="p">${p}</span><p>${d}</p><div class="bar"><i style="width:${w}%"></i></div></div>`).join('');
  const cgItems = [['boat','Лодка и капитан под цель','Сравниваем флот по скорости, снастям и отзывам. Бронируем пиковые даты заранее.'],['rod','Снасти премиум-класса','Stella, Saltiga, свежие шнуры. Или подготовим ваши.'],['car','Трансферы бизнес-класса','Встреча в аэропорту, авто к пирсу, водитель на все дни.'],['home','Вилла у моря','Рядом с Чалонгом или в Као Лаке — чтобы спать дольше.'],['chef','Шеф и меню из улова','Сашими на борту, ужин из трофея на вилле.'],['cam','Фото, дрон, фильм','Оператор на борту и ролик за 48 часов.'],['shield','Страховка и документы','Проверенные лодки, договор, счёт для компании.'],['star','Программа для семьи','Спа, острова, слоны — пока вы в океане.']]
    .map(([i, t, d]) => `<div class="cg-item">${ART.icon(i)}<strong>${t}</strong><span>${d}</span></div>`).join('');
  const cal = `<table><thead><tr><th></th>${MONTHS.map((m, i) => `<th class="${i === nowM ? 'now' : ''}" data-m="${i}">${m.toUpperCase()}</th>`).join('')}</tr></thead><tbody>
    ${D.season.map(([n, how, v]) => `<tr><th>${esc(n)}<small>${esc(how)}</small></th>${v.map((x, i) => `<td class="l${x}${i === nowM ? ' now' : ''}" data-m="${i}" title="${esc(n)} · ${MONTHS[i]}: ${['нет','бывает','хорошо','пик'][x]}"></td>`).join('')}</tr>`).join('')}
    <tr><th>Спокойное море<small>Андаман</small></th>${D.seaState.map((x, i) => `<td class="l${x}${i === nowM ? ' now' : ''}" data-m="${i}"></td>`).join('')}</tr>
  </tbody></table>`;
  const faq = D.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const reviews = D.reviews.length ? `<section class="sand"><div class="wrap"><div class="head"><span class="eyebrow">Гости о нас</span><h2 class="h2">Что говорят после выхода</h2></div><div class="reviews">${D.reviews.map(r => `<figure class="review"><p>«${esc(r.text)}»</p><footer><b>${esc(r.name)}</b> · ${esc(r.meta)}</footer></figure>`).join('')}</div></div></section>` : '';
  const opt = (name, val, label, sub, ico, type = 'radio') => `<div class="opt"><input type="${type}" name="${name}" id="${name}-${val}" value="${val}"><label for="${name}-${val}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></label></div>`;

  const body = `
<section class="hero">
  <div class="wrap">
    <div>
      <span class="live" id="live"><i></i><span>Сезон открыт · Андаманское море</span></span>
      <h1>Трофейная рыбалка в Таиланде. <em>Легально, на&nbsp;русском, под&nbsp;ключ.</em></h1>
      <p class="lead">Парусник, марлин, гигантский каранкс и тунец Андаманского моря. Приватные лодки, снасти уровня Stella, лицензированный гид и консьерж, который решает всё — от трансфера до ужина из улова.</p>
      <div class="hero-cta">
        <a class="btn btn-cta btn-lg" href="#pick">Подобрать тур за 60 секунд <span class="arrow">${ART.icon('arrow')}</span></a>
        ${tg ? `<a class="btn btn-ghost btn-lg" href="${tg}" target="_blank" rel="noopener">${ART.icon('tg')} Спросить в Telegram</a>` : ''}
      </div>
      <div class="hero-proof">
        <div><b>0</b> выходов в нацпарки</div>
        <div><b>≤6</b> рыболовов в группе</div>
        <div><b>30%</b> предоплата</div>
        <div><b>24/7</b> на русском</div>
      </div>
    </div>
    <div class="sonar" aria-label="Эхолот: рыба на глубине 40 метров">
      <div class="sonar-bar"><div>ГЛУБИНА<b>42.6 м</b></div><div>ВОДА<b>28.4 °C</b></div><div>СКОРОСТЬ<b>7.2 уз</b></div><div>ТОЧКА<b>7°29′N 98°19′E</b></div></div>
      ${sonarSvg()}
      <div class="sonar-tag">${ART.fish('gt')}<p><strong>Цель на 38 м — похоже на GT</strong>Рача Ной · утро · прилив. Ставим поппер.</p></div>
    </div>
  </div>
</section>
<div class="ticker" aria-hidden="true"><div>${[0, 1].map(() => `<span>Парусник</span><span>Чёрный марлин</span><span>Гигантский каранкс</span><span>Желтопёрый тунец</span><span>Ваху</span><span>Корифена</span><span>Меконгский сом</span><span>Гигантский скат</span><span>Лицензированные гиды</span><span>Catch &amp; release</span>`).join('')}</div></div>

<section class="sand" aria-labelledby="h-pain">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Почему рыбалка в Таиланде разочаровывает</span><h2 class="h2" id="h-pain">Шесть способов потерять день в&nbsp;океане. <span class="accent">Мы&nbsp;закрыли каждый.</span></h2></div>
    <div class="pains">${pains.map(([h, p, f], i) => `<article class="pain rv"><span class="no">ПРОБЛЕМА 0${i + 1}</span><h3>${h}</h3><p>${p}</p><p class="fix">${f}</p></article>`).join('')}</div>
  </div>
</section>

<section class="dark" id="who" aria-labelledby="h-who">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Кому подходит</span><h2 class="h2" id="h-who">Выберите, кто вы — покажем ваш формат</h2></div>
    <div class="seg-tabs" role="tablist" aria-label="Тип гостя">${segTabs}</div>
    ${segPanels}
  </div>
</section>

<section id="tours" aria-labelledby="h-tours">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Туры и цены</span><h2 class="h2" id="h-tours">От первой поклёвки до&nbsp;экспедиции за&nbsp;марлином</h2><p class="lead">Цены открыты и включают лодку, снасти, трансфер, питание, страховку и лицензированного гида. Итог фиксируем в подтверждении — без доплат на пирсе.</p></div>
    <div class="filters" role="group" aria-label="Фильтр туров">
      <button aria-pressed="true" data-f="all">Все</button><button aria-pressed="false" data-f="sea">Море</button><button aria-pressed="false" data-f="fresh">Пресная вода</button><button aria-pressed="false" data-f="group">Компании</button><button aria-pressed="false" data-f="vip">VIP</button>
      <button class="cur" id="cur" aria-label="Валюта цен" style="margin-left:auto">THB</button>
    </div>
    <div class="tours">${D.tours.map(t => tourCard(t)).join('')}</div>
  </div>
</section>

<section class="abyss" aria-labelledby="h-ladder">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Пять уровней</span><h2 class="h2" id="h-ladder">Начните с малого или&nbsp;сразу с&nbsp;трофея</h2><p class="lead">Большинство гостей начинают с «Первого страйка» или «Семейного дня», а через год возвращаются за парусником.</p></div>
    <div class="ladder">${ladder}</div>
  </div>
</section>

<section class="sand" id="concierge" aria-labelledby="h-cg">
  <div class="wrap cg">
    <div>
      <div class="head" style="margin-bottom:32px"><span class="eyebrow">Консьерж-сервис</span><h2 class="h2" id="h-cg">Вы ловите рыбу. Остальное — наша работа.</h2><p class="lead">Один человек на русском отвечает за весь ваш рыболовный отпуск: от выбора даты до трофея на стене.</p></div>
      <div class="cg-list">${cgItems}</div>
    </div>
    <div class="cg-card">
      <span class="mono">SIGNATURE WEEK · 7 ДНЕЙ</span>
      <h3>Неделя лучшей рыбалки Таиланда без единого звонка</h3>
      <ul><li>Big Game на спортфишере и ночь на шельфе</li><li>Джунгли Кхао Сок и рекордные озёра Бангкока</li><li>Вилла, шеф, водитель, фото и фильм</li><li>Личный консьерж 24/7 и бронь лучших лодок в пик сезона</li></ul>
      ${priceHtml(tourById['signature-week'], 'on-deep')}
      <div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn btn-cta" href="tours/signature-week.html">Программа недели</a><a class="btn btn-ghost" href="#pick" data-seg="vip">Обсудить с консьержем</a></div>
      <p class="small">Консьерж к любому туру — от 15 000 THB в день. Клубная карта для зимовщиков: 5 выходов за сезон со скидкой 15% и приоритет на даты.</p>
    </div>
  </div>
</section>

<section class="dark" id="map" aria-labelledby="h-map">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Где ловим — и где никогда</span><h2 class="h2" id="h-map">Честная карта Андамана</h2><p class="lead">В морских нацпарках рыбалка запрещена законом. Мы ловим на шельфе, у FAD и островов Рача, а в парки заходим только на стоянку и снорклинг. Нажмите на точку.</p></div>
    <div class="map-wrap">
      <div class="chart">${mapSvg()}</div>
      <div class="spot-side">
        <div class="spot-card" id="spotCard" aria-live="polite"></div>
        <div class="legend"><span><i style="background:var(--sea)"></i>Рыбалка разрешена</span><span><i style="background:var(--coral)"></i>Нацпарк или заказник: запрещена</span><span><i style="background:var(--gold)"></i>Пирс отправления</span></div>
        <div class="spot-list" id="spotList">${D.spots.map(s => `<button data-spot="${s.id}">${esc(s.name)}</button>`).join('')}</div>
      </div>
    </div>
  </div>
</section>

<section id="season" aria-labelledby="h-season">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Календарь клёва</span><h2 class="h2" id="h-season">Когда ехать за вашей рыбой</h2><p class="lead">Андаманское море: спокойный сезон — ноябрь–апрель, муссон — май–октябрь. Оранжевая рамка — текущий месяц.</p></div>
    <div class="cal">${cal}</div>
    <div class="cal-key"><span><i style="background:var(--sand)"></i>Нет / редко</span><span><i style="background:#BFEDE6"></i>Бывает</span><span><i style="background:var(--sea)"></i>Хорошо</span><span><i style="background:var(--sea-2)"></i>Пик</span></div>
    <div class="cal-note"><div><b>Май–октябрь: муссон</b>Волна 2–3 м, дальние выходы часто отменяют. Работают укрытый залив Пханг Нга, пресная вода и окна хорошей погоды — следим за прогнозом за вас.</div><div><b>Сроки парусника зависят от года</b>Операторы видят пики и в январе–марте, и в июне–ноябре. Скажите нам даты — ответим, что клюёт именно сейчас, по свежим отчётам капитанов.</div></div>
  </div>
</section>

<section class="dark" aria-labelledby="h-flow">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Как это работает</span><h2 class="h2" id="h-flow">От заявки до трофея — четыре шага</h2></div>
    <ol class="flow">
      <li><h3>Заявка за 60 секунд</h3><p>Квиз или сообщение в Telegram. Даты, состав, цель, бюджет.</p></li>
      <li><h3>План за 15 минут</h3><p>Лодка, точки, прогноз и фиксированная цена. Отвечаем на русском, в рабочие часы 09:00–22:00.</p></li>
      <li><h3>Бронь с предоплатой 30%</h3><p>Договор и подтверждение. За 48 часов — прогноз, чек-лист, контакт водителя.</p></li>
      <li><h3>Выход и видео</h3><p>Трансфер, день в океане, фото и видео в течение 48 часов. Сертификат catch &amp; release.</p></li>
    </ol>
  </div>
</section>

<section class="sand" aria-labelledby="h-guar">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Гарантии</span><h2 class="h2" id="h-guar">Риски — на нас</h2></div>
    <div class="guar">
      <div><b>100%</b><strong>Возврат при отмене из‑за погоды</strong><span>Или бесплатный перенос. Решение — за капитаном и прогнозом.</span></div>
      <div><b>7 дней</b><strong>Бесплатная отмена</strong><span>Позже — перенос даты без доплаты в пределах сезона.</span></div>
      <div><b>0 THB</b><strong>Доплат на пирсе</strong><span>Всё, что включено, указано в подтверждении.</span></div>
      <div><b>48 ч</b><strong>Фото и видео дня</strong><span>Или скидка 20% на следующий выход.</span></div>
    </div>
    <div class="pay"><span>Рубли через партнёра</span><span>USDT</span><span>Карты иностранных банков</span><span>Наличные THB / USD</span><span>Счёт для компании</span></div>
  </div>
</section>
${reviews}
<section aria-label="Бесплатный гайд" style="padding-bottom:0">
  <div class="wrap">
    <div class="magnet">
      <div class="doc">ГАЙД<br>АНДАМАН<div><i></i><i></i><i style="width:70%"></i><i></i><i style="width:50%"></i></div></div>
      <div><h3>Бесплатно: где законно ловить на&nbsp;Андамане и&nbsp;когда клюёт</h3><p>Точки, сезоны по месяцам, что взять с собой и как не попасть на штраф в нацпарке. Пришлём в мессенджер.</p></div>
      <a class="btn btn-lg" href="#pick" data-guide="1">Получить гайд</a>
    </div>
  </div>
</section>

<section class="quiz-sec" id="pick" aria-labelledby="h-pick">
  <div class="wrap">
    <div class="head center"><span class="eyebrow">Подбор за 60 секунд</span><h2 class="h2" id="h-pick">Соберём ваш идеальный выход</h2><p class="lead">Пять вопросов — и мы пришлём вариант с лодкой, точкой, прогнозом и ценой.</p></div>
    <form class="quiz" id="quiz" novalidate>
      <div class="q-prog"><span id="qNum">1 / 6</span><div class="track"><i id="qBar"></i></div></div>
      <div class="q-step" data-step="1"><h3>Кто едет?</h3><p class="hint">Выберите один вариант</p><div class="opts">
        ${opt('who','solo','Я один','или с другом','🎣')}${opt('who','couple','Пара','вдвоём','🛥️')}${opt('who','family','Семья с детьми','дети от 5 лет','👨‍👩‍👧')}${opt('who','friends','Компания 4–8','друзья, мужской отдых','🍻')}${opt('who','corp','Корпоратив 8+','команда, партнёры','🏆')}${opt('who','vip','VIP-поездка','нужен консьерж на всё','✦')}
      </div></div>
      <div class="q-step" data-step="2" hidden><h3>Ваш опыт в рыбалке?</h3><p class="hint">Подберём снасти и формат</p><div class="opts">
        ${opt('exp','zero','Никогда не ловил','хочу попробовать','🌱')}${opt('exp','casual','Иногда рыбачу','дома, на отдыхе','🐟')}${opt('exp','pro','Опытный спиннингист','поппинг, джиг','🎯')}${opt('exp','trophy','Трофейщик','big game, экспедиции','🏅')}
      </div></div>
      <div class="q-step" data-step="3" hidden><h3>Что для вас главное?</h3><p class="hint">Цель определяет лодку и точку</p><div class="opts">
        ${opt('goal','fun','Отдых и улов на ужин','без напряжения','🍣')}${opt('goal','gt','Трофей: GT и тунец','поппинг, джиг','💪')}${opt('goal','billfish','Парусник или марлин','big game','⚓')}${opt('goal','fresh','Пресноводные гиганты','сом, карп, скат','🌿')}${opt('goal','event','Событие для команды','турнир, призы','🎉')}${opt('goal','all','Всё и сразу','неделя, консьерж','✦')}
      </div></div>
      <div class="q-step" data-step="4" hidden><h3>Где и когда?</h3><p class="hint">Если ещё не решили — подскажем лучшее окно</p><div class="opts">
        ${opt('where','phuket','Пхукет','Чалонг, Раваи','🏝️')}${opt('where','khaolak','Као Лак / Краби','север и восток','🌊')}${opt('where','bkk','Бангкок / Паттайя','пресная вода, залив','🏙️')}${opt('where','any','Ещё не решили','посоветуйте','🧭')}
      </div>
      <div class="field" style="margin-top:18px"><label for="qDate">Даты или месяц</label><input id="qDate" name="date" placeholder="Например, 10–17 января или «март»" autocomplete="off"></div></div>
      <div class="q-step" data-step="5" hidden><h3>Бюджет на рыбалку</h3><p class="hint">Чтобы не предлагать лишнего</p><div class="opts">
        ${opt('budget','b1','До 10 000 THB на человека','групповой выход','💵')}${opt('budget','b2','20 000 – 40 000 THB','приватная лодка на день','💳')}${opt('budget','b3','50 000 – 200 000 THB','спортфишер, ночёвка','💎')}${opt('budget','b4','Бюджет не главное','нужен лучший результат','👑')}
      </div></div>
      <div class="q-step" data-step="6" hidden>
        <div class="result"><div class="pick" id="qPick"></div>
        <h3 style="margin-top:6px">Куда прислать план и цену?</h3>
        <div class="fields">
          <div class="field"><label for="qName">Имя</label><input id="qName" name="name" autocomplete="given-name" required placeholder="Как к вам обращаться"></div>
          <div class="field"><label for="qContact">Telegram, WhatsApp или телефон</label><input id="qContact" name="contact" required placeholder="@username или +7…" autocomplete="tel"></div>
        </div>
        <div class="ch" role="radiogroup" aria-label="Удобный мессенджер">${opt('channel','telegram','Telegram')}${opt('channel','whatsapp','WhatsApp')}${opt('channel','call','Звонок')}</div>
        <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="small">Нажимая кнопку, вы соглашаетесь с <a href="privacy.html">политикой конфиденциальности</a>. Никакого спама — только ваш план.</p></div>
      </div>
      <div class="q-done" hidden id="qDone"></div>
      <div class="q-nav"><button type="button" class="btn btn-ghost" id="qBack" disabled>Назад</button><button type="button" class="btn btn-cta" id="qNext" disabled>Дальше <span class="arrow">${ART.icon('arrow')}</span></button></div>
    </form>
  </div>
</section>

<section id="faq" aria-labelledby="h-faq">
  <div class="wrap">
    <div class="head center"><span class="eyebrow">Вопросы</span><h2 class="h2" id="h-faq">Отвечаем до того, как вы спросите</h2></div>
    <div class="faq">${faq}</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:40px"><a class="btn btn-cta btn-lg" href="#pick">Подобрать тур</a>${tg ? `<a class="btn btn-line btn-lg" href="${tg}" target="_blank" rel="noopener">Задать вопрос в Telegram</a>` : ''}</div>
  </div>
</section>`;

  const ld = [
    { '@context':'https://schema.org', '@type':'TravelAgency', name:D.brand, url:D.origin, description:'Спортивная рыбалка и консьерж-сервис в Таиланде: Андаманское море, пресная вода, VIP.', areaServed:'Thailand', address:{ '@type':'PostalAddress', addressLocality:'Phuket', addressCountry:'TH' }, ...(D.contacts.email ? { email:D.contacts.email } : {}) },
    { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:D.faq.map(([q, a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } })) }
  ];
  return page({ title:`Рыбалка в Таиланде и Андаманском море — туры и консьерж | ${D.brand}`, desc:'Трофейная рыбалка на Пхукете, в Као Лаке и Бангкоке: парусник, марлин, GT, тунец, меконгский сом. Приватные лодки, лицензированный гид, консьерж на русском. Цены от 4 900 THB.', canonical:'', body, ld });
}

// ── Страница тура ────────────────────────────────────────────────
function tourPage(t){
  const spot = spotById[t.spot];
  const related = D.tours.filter(x => x.id !== t.id && (x.cat === t.cat || Math.abs(x.tier - t.tier) <= 1)).slice(0, 3);
  const months = MONTHS.map((m, i) => `<span style="${t.months.includes(i + 1) ? 'background:var(--sea);color:var(--abyss)' : 'opacity:.45'}">${m}</span>`).join('');
  const body = `
<section class="t-hero">
  <div class="wrap">
    <div>
      <nav class="crumbs" aria-label="Навигация"><a href="../index.html">Главная</a><span>/</span><a href="../index.html#tours">Туры</a><span>/</span><span>${esc(t.title)}</span></nav>
      <span class="eyebrow">${esc(t.where)}</span>
      <h1>${esc(t.title)}</h1>
      <p class="lead" style="margin-top:20px">${esc(t.short)}</p>
      <dl class="facts"><div><dt>Длительность</dt><dd>${esc(t.dur)}</dd></div><div><dt>Группа</dt><dd>${esc(t.group)}</dd></div><div><dt>Формат</dt><dd>${esc(t.kind)}</dd></div><div><dt>Цена</dt><dd data-thb="${t.price}">от ${fmt(t.price)} THB</dd></div></dl>
    </div>
    ${poster(t, true)}
  </div>
</section>
<section style="padding-top:56px">
  <div class="wrap t-grid">
    <div class="t-main">
      <div><h2>Почему этот формат</h2><p>${esc(t.pitch)}</p></div>
      <div><h2>Кого ловим</h2><div class="specs">${t.species.map(s => `<span>${esc(s)}</span>`).join('')}</div>
        <h3 style="font-size:16px;margin:22px 0 10px;font-family:var(--font-body);font-weight:800">Лучшие месяцы</h3><div class="specs">${months}</div></div>
      <div><h2>Как проходит</h2><ol class="timeline">${t.day.map(([h, d]) => `<li><b>${esc(h)}</b>${esc(d)}</li>`).join('')}</ol></div>
      <div><h2>Включено</h2><ul class="incl">${t.incl.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h3 style="font-size:16px;margin:24px 0 12px;font-family:var(--font-body);font-weight:800">Не включено</h3><ul class="incl ex">${t.excl.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      ${spot ? `<div><h2>Где ловим</h2><p><b>${esc(spot.name)}</b> · ${esc(spot.run)}. ${esc(spot.note)}</p><p class="note" style="margin-top:14px">Мы не ловим в морских нацпарках и заказниках: Симиланы, Сурин, Пхи-Пхи, Ко Рок, Хин Даенг, Шарк Пойнт. Это закон Таиланда, и это защищает вас.</p></div>` : ''}
      <div><h2>Можно добавить</h2><div class="upsell">${t.upsell.map(([a, b]) => `<div><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div></div>
      <div><h2>Частые вопросы</h2><div class="faq" style="margin:0">${D.faq.slice(0, 4).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div>
    </div>
    <aside class="book" id="book">
      ${priceHtml(t)}
      <div class="opt-row"><div><span>Длительность</span><span>${esc(t.dur)}</span></div><div><span>Группа</span><span>${esc(t.group)}</span></div><div><span>Предоплата</span><span>30%</span></div><div><span>Отмена</span><span>бесплатно за 7 дней</span></div></div>
      <form class="book-form" data-tour="${t.id}" novalidate style="display:grid;gap:12px">
        <label class="sr" for="bDate">Дата</label><input id="bDate" name="date" placeholder="Дата или месяц" class="in">
        <label class="sr" for="bGuests">Гостей</label><input id="bGuests" name="guests" placeholder="Сколько гостей" inputmode="numeric" class="in">
        <label class="sr" for="bContact">Контакт</label><input id="bContact" name="contact" placeholder="Telegram, WhatsApp или телефон" required class="in">
        <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn btn-cta btn-lg btn-block" type="submit">Проверить дату</button>
      </form>
      ${tg ? `<a class="btn btn-line btn-block" href="${tg}" target="_blank" rel="noopener">${ART.icon('tg')} Спросить в Telegram</a>` : ''}
      <p class="small">Ответим с планом и прогнозом за 15 минут в рабочие часы. Бронь фиксируется после предоплаты.</p>
    </aside>
  </div>
</section>
<section class="sand">
  <div class="wrap"><div class="head"><span class="eyebrow">Похожие форматы</span><h2 class="h2">Ещё может подойти</h2></div>
  <div class="tours">${related.map(x => tourCard(x, '../')).join('')}</div></div>
</section>`;
  const ld = [{ '@context':'https://schema.org', '@type':'TouristTrip', name:t.title, description:t.short, touristType:t.kind, itinerary:{ '@type':'Place', name:t.where },
    offers:{ '@type':'Offer', price:t.price, priceCurrency:'THB', availability:'https://schema.org/InStock', url:`${D.origin}/tours/${t.id}.html` }, provider:{ '@type':'TravelAgency', name:D.brand, url:D.origin } }];
  return page({ title:`${t.title}: рыбалка ${t.where} — от ${fmt(t.price)} THB | ${D.brand}`, desc:`${t.short} ${t.dur}, ${t.group}. Цена от ${fmt(t.price)} THB ${PER[t.per]}. Лицензированный гид, трансфер, снасти, страховка.`, canonical:`tours/${t.id}.html`, body, pre:'../', ld });
}

function privacyPage(){
  const body = `<section class="t-hero" style="padding-bottom:40px"><div class="wrap" style="display:block"><h1>Политика конфиденциальности</h1></div></section>
<section style="padding-top:48px"><div class="wrap" style="max-width:780px;display:grid;gap:16px;color:var(--muted)">
<p>${D.brand} собирает только данные, которые вы сами отправляете через формы сайта: имя, контакт в мессенджере или телефон, даты и пожелания к поездке.</p>
<p>Данные используются, чтобы подготовить предложение, забронировать тур и связаться с вами по поездке. Мы передаём их только тем, кто проводит вашу поездку: оператору, капитану, водителю, отелю — и только в нужном объёме.</p>
<p>Мы не продаём данные и не отправляем рекламные рассылки без вашего согласия. Чтобы удалить свои данные, напишите на ${esc(D.contacts.email || 'наш контакт')}.</p>
<p>Сайт не использует рекламные трекеры. Выбор валюты хранится в вашем браузере.</p>
</div></section>`;
  return page({ title:`Политика конфиденциальности | ${D.brand}`, desc:'Как SIAM STRIKE обрабатывает данные из заявок.', canonical:'privacy.html', body });
}

// ── Запись ───────────────────────────────────────────────────────
const out = (f, s) => { fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive:true }); fs.writeFileSync(path.join(DIR, f), s); };
out('index.html', indexPage());
for (const t of D.tours) out(`tours/${t.id}.html`, tourPage(t));
out('privacy.html', privacyPage());
out('404.html', page({ title:`Страница не найдена | ${D.brand}`, desc:'Страница не найдена.', canonical:'404.html', body:`<section class="t-hero" style="min-height:70vh;display:flex;align-items:center"><div class="wrap" style="display:block"><span class="eyebrow">404 · пустой заброс</span><h1>Здесь не клюёт</h1><p class="lead" style="margin:20px 0 32px">Такой страницы нет. Зато есть туры, где клюёт по-настоящему.</p><div class="hero-cta"><a class="btn btn-cta btn-lg" href="/index.html#tours">Смотреть туры</a><a class="btn btn-ghost btn-lg" href="/index.html#pick">Подобрать тур</a></div></div></section>` }).replace(/(href|src)="(?!https?:|\/|#|mailto:|tel:)/g, '$1="/'));
const urls = ['', ...D.tours.map(t => `tours/${t.id}.html`), 'privacy.html'];
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${D.origin}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${D.origin}/sitemap.xml\n`);
console.log(`Собрано: index.html, ${D.tours.length} туров, privacy.html, sitemap.xml`);
