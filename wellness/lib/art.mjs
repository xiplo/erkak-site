// ERKAK · графика: SVG-спрайт (монограмма, линейные рыбы, глифы направлений, иконки), постеры, циферблат, эхолот, карта.
import { esc } from './util.mjs';

// ── Рыбы: силуэт тонкой линией + лёгкая заливка (гравюра) ─────────────
const FISH = {
  sailfish:['M6,30Q20,44 34,50Q20,56 6,70Q15,58 15,50Q15,42 6,30ZM34,50Q70,40 120,42Q160,40 186,46L236,49L186,53Q160,60 120,60Q70,61 34,50ZM64,45Q74,10 104,6Q146,6 176,45Q130,40 64,45ZM138,58L124,86L148,60ZM170,54L148,68L168,55ZM96,59L104,70L112,60Z', [[179,48,1.6]], ['M168,44Q164,50 168,56','M80,40Q110,18 150,30','M92,42Q118,26 146,36']],
  marlin:['M4,22Q22,42 38,50Q22,58 4,78Q16,60 17,50Q16,40 4,22ZM38,50Q76,34 128,36Q170,36 192,44L238,49L192,54Q170,64 128,64Q76,66 38,50ZM120,37Q130,14 146,10Q154,24 162,38ZM60,43L70,38L72,44ZM146,62L132,84L154,63ZM176,55L150,70L172,57ZM92,63L100,74L108,63Z', [[184,47,1.8]], ['M172,42Q167,50 172,58','M60,50Q120,46 176,50']],
  gt:['M6,20Q22,42 40,50Q22,58 6,80Q20,62 22,50Q20,38 6,20ZM40,50Q64,38 96,25Q142,8 186,22Q208,32 214,48Q212,60 200,65Q168,80 120,76Q78,70 40,50ZM100,22Q108,8 130,8Q146,10 160,16Q128,14 100,22ZM78,63Q100,84 132,78Q116,74 100,66ZM66,44L50,48L66,47Z', [[196,38,2.2]], ['M182,30Q176,48 184,62','M176,52Q156,44 142,46','M60,52Q120,56 176,58']],
  tuna:['M4,22Q26,42 42,50Q26,58 4,78Q18,60 20,50Q18,40 4,22ZM42,50Q80,28 140,29Q192,31 224,48Q226,52 222,54Q192,69 140,71Q80,72 42,50ZM118,31Q124,6 134,2Q134,18 140,30ZM118,69Q124,94 134,98Q134,82 140,70ZM150,31Q166,18 186,33ZM56,44L62,39L64,45ZM68,41L74,36L76,42ZM80,38L86,33L88,39ZM96,36L102,31L104,37ZM56,56L62,61L64,55ZM68,59L74,64L76,58ZM80,62L86,67L88,61ZM96,64L102,69L104,63Z', [[206,45,2]], ['M194,38Q188,50 194,62','M186,51Q156,54 128,62']],
  mahi:['M4,24Q22,44 36,50Q22,56 4,76Q15,60 17,50Q15,40 4,24ZM36,50Q52,44 84,40Q146,30 202,22Q218,26 218,44Q218,58 206,64Q150,68 84,63Q52,58 36,50ZM48,45Q60,34 92,30Q150,16 204,21L198,26Q140,30 84,40ZM50,56Q72,72 124,68L112,64Z', [[206,38,2]], ['M194,30Q188,46 196,60']],
  barracuda:['M6,32Q18,46 30,50Q18,54 6,68Q14,57 14,50Q14,43 6,32ZM30,50Q62,43 120,42Q190,41 234,48L236,52Q204,57 190,57Q120,59 60,57Q42,55 30,50ZM148,43L156,32L166,43ZM58,47L66,37L76,46ZM62,56L70,65L80,57ZM166,56L154,64L170,57Z', [[214,47,1.6]], ['M200,44Q197,50 200,56','M70,50Q140,48 196,50']],
  catfish:['M4,32Q20,44 32,50Q20,58 4,70Q12,58 12,50Q12,42 4,32ZM32,50Q60,36 120,32Q182,30 216,46Q222,52 216,58Q182,72 120,70Q60,66 32,50ZM150,33L160,16L174,33ZM212,57Q228,60 236,72Q224,64 211,60ZM214,54Q230,52 238,58Q226,56 214,56ZM60,62Q90,74 130,70Z', [[200,46,1.8]], ['M188,40Q184,52 190,62']],
  snakehead:['M8,38Q0,50 8,62Q22,64 30,50Q22,36 8,38ZM28,50Q42,40 100,38Q170,36 216,44Q228,50 216,58Q170,66 100,64Q42,62 28,50ZM38,44Q100,24 184,36L184,39Q100,38 38,46ZM38,56Q92,72 156,64Q100,62 38,54Z', [[208,46,1.6]], ['M196,42Q193,50 197,58']],
  carp:['M6,24Q22,42 38,50Q22,58 6,76Q18,60 20,50Q18,40 6,24ZM38,50Q60,32 110,22Q160,16 196,32Q214,42 214,52Q210,64 190,70Q150,82 104,76Q60,68 38,50ZM92,24Q110,6 150,14L160,20Q124,18 92,24ZM80,70L92,84L108,74Z', [[196,42,2]], ['M182,34Q176,50 184,64']],
  ray:['M58,50Q66,12 128,10Q196,12 206,50Q196,88 128,90Q66,88 58,50ZM60,49L2,52L60,52Z', [[170,42,1.8],[170,58,1.8]], ['M140,30Q120,50 140,70','M100,24Q84,50 100,76']],
  grouper:['M8,30Q12,50 8,70Q24,64 38,52Q24,38 8,30ZM36,52Q56,30 110,26Q170,22 208,40Q220,48 216,58Q204,72 160,76Q96,80 36,52ZM70,34Q110,12 176,26L170,30Q120,26 70,36ZM84,70L100,84L120,74Z', [[198,42,2.2]], ['M182,34Q176,52 186,66','M216,54L204,56']]
};

// ── Глифы направлений (64×64, линия) ──────────────────────────────────
const GLYPH = {
  glove:'<path d="M17 33c0-12 8-20 20-20 9 0 15 6 15 15v6c0 8-6 13-14 13H25"/><path d="M17 33c0 7 4 12 11 12h7"/><path d="M22 47h19v8H22z"/><path d="M31 23c3-1 7-1 10 1"/>',
  kettle:'<path d="M21 28c-3-10 3-17 11-17s14 7 11 17"/><circle cx="32" cy="40" r="15"/><path d="M24 55h16"/>',
  pulse:'<path d="M32 52S11 40 11 25a10 10 0 0 1 21-4 10 10 0 0 1 21 4c0 15-21 27-21 27z"/><path d="M14 33h10l4-8 6 14 4-6h12"/>',
  leaf:'<path d="M13 51C13 27 29 14 52 12c0 25-13 39-39 39z"/><path d="M13 51l24-24M28 36h9M22 42v-9"/>',
  snow:'<path d="M32 9v46M12 20l40 24M12 44l40-24M26 13l6 6 6-6M26 51l6-6 6 6M12 28l8-2-2-8M52 36l-8 2 2 8"/>',
  enso:'<path d="M50 30A19 19 0 1 1 40 15"/><circle cx="46" cy="18" r="2.5"/><path d="M26 38c3 3 9 3 12 0"/>',
  mountain:'<path d="M5 52l19-30 10 15 8-11 17 26z"/><path d="M19 30l5 5 4-5M38 32l4 4 3-4"/>',
  wave:'<path d="M6 36c6 0 6-6 13-6s7 6 13 6 7-6 13-6 7 6 13 6M6 47c6 0 6-6 13-6s7 6 13 6 7-6 13-6 7 6 13 6"/><path d="M30 26c0-9 7-15 16-15"/>',
  flag:'<path d="M24 54V10l21 8-21 8"/><path d="M13 54h24"/><circle cx="46" cy="49" r="3"/>',
  spark:'<path d="M30 9l5 16 16 5-16 5-5 16-5-16-16-5 16-5z"/><path d="M49 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  capsule:'<path d="M20 44l22-22a9 9 0 0 1 13 13L33 57a9 9 0 0 1-13-13z"/><path d="M31 33l13 13"/><circle cx="16" cy="18" r="6"/><path d="M12 22l8-8"/>',
  duo:'<circle cx="22" cy="18" r="6"/><circle cx="44" cy="26" r="5"/><path d="M10 54c0-11 5-19 12-19s12 8 12 19M34 54c0-8 4-14 10-14s10 6 10 14"/>',
  case:'<rect x="9" y="21" width="46" height="31" rx="2"/><path d="M24 21v-6h16v6M9 34h46M29 34v5h6v-5"/>',
  compass:'<circle cx="32" cy="32" r="22"/><path d="M32 6v6M32 52v6M6 32h6M52 32h6"/><path d="M40 24l-5 11-11 5 5-11z"/>',
  globe:'<circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10c7 7 10 14 10 22s-3 15-10 22c-7-7-10-14-10-22s3-15 10-22z"/>',
  book:'<path d="M32 18c-6-5-14-6-22-4v34c8-2 16-1 22 4 6-5 14-6 22-4V14c-8-2-16-1-22 4z"/><path d="M32 18v34"/>'
};

// ── Иконки интерфейса (24×24, линия) ───────────────────────────────────
const ICON = {
  arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',
  card:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  'arrow-up':'<path d="M7 17L17 7M9 7h8v8"/>',
  chevron:'<path d="M6 9l6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z"/>',
  plan:'<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 6M18 14.2c1.8.7 2.8 2.6 3 5.3"/>',
  shield:'<path d="M12 3l7.5 3v5.5c0 4.8-3.3 8-7.5 9.5-4.2-1.5-7.5-4.7-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  boat:'<path d="M3 16.5l2 3h14l2-3M5.5 16.5l1-6h11l1 6M10 10.5V5l5 2.5-5 2"/>',
  rod:'<path d="M4 20L18 4M18 4v9a3 3 0 0 1-3 3M7 17l-2 2"/>',
  cam:'<rect x="3" y="7" width="18" height="13" rx="1"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/>',
  chef:'<path d="M6.5 14a4 4 0 1 1 1.8-7.5A4 4 0 0 1 15.7 6a4 4 0 1 1 1.8 8v6h-11z"/><path d="M6.5 17h11"/>',
  car:'<path d="M3.5 16l2-6h13l2 6v3h-17zM7 19v2M17 19v2"/>',
  home:'<path d="M3.5 11l8.5-7 8.5 7v9h-17z"/><path d="M9.5 20v-5.5h5V20"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  medic:'<rect x="3.5" y="6.5" width="17" height="13" rx="1"/><path d="M9 6.5V4.5h6v2M12 10v6M9 13h6"/>',
  phone:'<path d="M5 3.5h4l2 5-2.8 1.8a11 11 0 0 0 5.5 5.5L15.5 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="M4 6.5l8 6.5 8-6.5"/>',
  menu:'<path d="M4 8h16M4 16h16"/>',
  tg:'<path fill="currentColor" stroke="none" d="M21.5 4.5L2.8 11.7c-1 .4-1 1.8.1 2.1l4.7 1.5 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.9 3.6c.8.6 2 .1 2.2-.9l3-15.1c.2-1.2-.9-2.1-2.6-1.8zM9.3 15l9-7.8-7.2 9.2-.4 3.3z"/>',
  wa:'<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/>',
  wechat:'<path fill="currentColor" stroke="none" d="M9.2 4C5.2 4 2 6.7 2 10c0 1.9 1 3.6 2.7 4.7L4 17l2.7-1.4c.8.2 1.6.4 2.5.4h.4a5.6 5.6 0 0 1-.2-1.5c0-3.3 3.1-6 7-6h.4C16.1 5.9 13 4 9.2 4zM6.8 8.9a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8zm4.8 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8zM22 14.5c0-2.8-2.7-5-6-5s-6 2.2-6 5 2.7 5 6 5c.7 0 1.4-.1 2-.3l2.3 1.2-.6-2c1.4-1 2.3-2.3 2.3-3.9zm-8-.7a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zm4 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z"/>'
};

const VE = s => s.replace(/<(path|circle|rect|line|polyline|ellipse)(?![^>]*vector-effect)/g, '<$1 vector-effect="non-scaling-stroke"');

export const LOGO_D = 'M9 0h14a9 9 0 0 1 9 9v14a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9V9a9 9 0 0 1 9-9ZM7 23.5h4.3L16 14.6l4.7 8.9H25L16 6.8Z';
export function sprite(){
  const sym = (id, vb, inner) => `<symbol id="${id}" viewBox="${vb}">${inner}</symbol>`;
  const out = [];
  // Знак ERKAK: скруглённый квадрат с вырезанной вершиной «Λ» — буква A и образ «выше, дальше»
  out.push(sym('logo', '0 0 32 32', `<path fill="currentColor" fill-rule="evenodd" d="${LOGO_D}"/>`));
  for (const [k, [body, eyes, lines]] of Object.entries(FISH)) {
    out.push(sym(`fish-${k}`, '0 0 240 100',
      `<path d="${body}" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
      `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-opacity=".7">${lines.map(d => `<path d="${d}" vector-effect="non-scaling-stroke"/>`).join('')}</g>` +
      eyes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`).join('')));
  }
  for (const [k, inner] of Object.entries(GLYPH)) out.push(sym(`g-${k}`, '0 0 64 64', `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${VE(inner)}</g>`));
  for (const [k, inner] of Object.entries(ICON)) out.push(sym(`i-${k}`, '0 0 24 24', `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${VE(inner)}</g>`));
  return `<svg xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}

// ── Помощники разметки ────────────────────────────────────────────────
let SPRITE = '/assets/sprite.svg';
export const setSprite = url => { SPRITE = url; };
export const use = (id, cls = 'ico', label) => `<svg class="${cls}"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'} focusable="false"><use href="${SPRITE}#${id}"/></svg>`;
export const icon = (name, cls = 'ico') => use(`i-${name}`, cls);
export const artId = a => a.startsWith('fish-') || a.startsWith('g-') ? a : (FISH[a] ? `fish-${a}` : `g-${a}`);
export const isFish = a => artId(a).startsWith('fish-');

// Короткое место для карточки: «Пхукет, Сой Та-Иад» → «Пхукет»
export const placeShort = where => String(where || '').split(/\s*[,·(（、،/]\s*|\s+(?:or|and|oder|und|или|и|yoki|va|أو)\s+|[或和]/)[0].trim();

// ── Схема Андаманского моря ─────────────────────────────────────────────
export function andamanMap(spots, names, I){
  // Подписи на карте (карта всегда LTR): арабский текст — отдельным RTL-фрагментом, чтобы «… وFAD» не переставлялось
  const iso = s => I.dir === 'rtl' ? '\u2067' + esc(s) + '\u2069' : esc(s);
  const B = { w0:97.45, w1:99.25, n:9.55, s:6.95 }, K = 300;
  const W = (B.w1 - B.w0) * K, H = (B.n - B.s) * K;
  const P = (lat, lon) => [((lon - B.w0) * K).toFixed(1), ((B.n - lat) * K).toFixed(1)];
  const poly = pts => pts.map(([a, o], i) => (i ? 'L' : 'M') + P(a, o).join(',')).join('') + 'Z';
  const main = [[9.6,98.47],[9.35,98.38],[9.2,98.32],[9.0,98.27],[8.85,98.27],[8.65,98.24],[8.45,98.23],[8.3,98.26],[8.2,98.29],[8.22,98.4],[8.3,98.5],[8.28,98.6],[8.15,98.7],[8.1,98.78],[8.05,98.82],[8.0,98.9],[7.95,99.0],[7.85,99.05],[7.75,99.1],[7.6,99.2],[7.45,99.3],[7.3,99.45],[6.9,99.7],[6.9,99.9],[9.6,99.9]];
  const phuket = [[8.19,98.3],[8.1,98.28],[8.0,98.27],[7.95,98.28],[7.9,98.29],[7.84,98.29],[7.8,98.3],[7.76,98.31],[7.77,98.34],[7.81,98.36],[7.84,98.4],[7.88,98.41],[7.95,98.42],[8.05,98.43],[8.12,98.38],[8.19,98.33]];
  const isl = [[[7.66,99.03],[7.55,99.02],[7.47,99.06],[7.55,99.1],[7.66,99.08]],[[8.12,98.6],[7.96,98.57],[7.9,98.62],[8.05,98.64]],[[7.78,98.75],[7.73,98.74],[7.68,98.77],[7.72,98.79],[7.77,98.78]],[[7.62,98.36],[7.59,98.355],[7.585,98.37],[7.61,98.38]],[[7.5,98.31],[7.48,98.305],[7.475,98.325],[7.495,98.33]],[[8.72,97.63],[8.6,97.63],[8.58,97.66],[8.7,97.66]],[[9.45,97.85],[9.38,97.85],[9.37,97.9],[9.44,97.91]],[[7.24,99.06],[7.2,99.05],[7.2,99.09],[7.23,99.09]]];
  let grid = '';
  for (let lat = 7; lat <= 9.5; lat += 0.5) { const [, y] = P(lat, B.w0); grid += `<line x1="0" x2="${W}" y1="${y}" y2="${y}"/><text x="10" y="${+y - 7}">${lat.toFixed(1)}°N</text>`; }
  for (let lon = 97.5; lon <= 99.2; lon += 0.5) { const [x] = P(B.s, lon); grid += `<line y1="0" y2="${H}" x1="${x}" x2="${x}"/><text x="${+x + 7}" y="${H - 12}">${lon.toFixed(1)}°E</text>`; }
  const pins = spots.map(s => { const [x, y] = P(s.lat, s.lon), n = names[s.id];
    const tx = s.la === 'l' ? x - 16 : s.la === 't' ? x : +x + 16, ty = s.la === 't' ? y - 18 : +y + 5, anchor = s.la === 'l' ? 'end' : s.la === 't' ? 'middle' : 'start';
    return `<g class="pin ${s.ok ? 'ok' : 'no'}" data-spot="${s.id}" tabindex="0" role="button" aria-label="${esc(n.name)}: ${esc(s.ok ? I.t('fishing.map.allowed') : I.t('fishing.map.banned'))}">${s.ok ? '' : `<circle class="zone" cx="${x}" cy="${y}" r="34"/>`}<circle class="ring" cx="${x}" cy="${y}" r="11"/><circle class="dot" cx="${x}" cy="${y}" r="4.5"/><text x="${tx}" y="${ty}" text-anchor="${anchor}">${iso(n.name)}</text></g>`; }).join('');
  const [cx, cy] = P(7.82, 98.36);
  const lbl = (lat, lon, s) => { const [x, y] = P(lat, lon); return `<text x="${x}" y="${y}">${iso(s)}</text>`; };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(I.t('fishing.map.aria'))}">
  <defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="7" stroke="#E7E2D8" stroke-width="2"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="#EAF4F8"/>
  <g class="grid">${grid}</g>
  <path d="${poly(main)}" fill="#FBFAF7" stroke="#C9D3DC" stroke-width="1"/>
  <path d="${poly(main)}" fill="url(#hatch)" opacity=".6"/>
  <path d="${poly(phuket)}" fill="#F3F1EC" stroke="#B9C4CE" stroke-width="1"/>
  ${isl.map(p => `<path d="${poly(p)}" fill="#F3F1EC" stroke="#B9C4CE"/>`).join('')}
  <g class="geo">${lbl(8.0, 98.1, I.t('fishing.map.phuket'))}${lbl(8.5, 98.62, I.t('fishing.map.thailand'))}${lbl(7.1, 97.6, I.t('fishing.map.sea'))}</g>
  <g class="pier"><circle cx="${cx}" cy="${cy}" r="3.5"/><text x="${cx - 10}" y="${+cy + 4}" text-anchor="end">${iso(I.t('fishing.map.pier'))}</text></g>
  ${pins}
  <g transform="translate(${W - 60},62)" class="rose"><circle r="24"/><path d="M0,-32V32M-32,0H32"/><path d="M0,-24L5,0 0,24 -5,0Z" class="needle"/><text y="-38" text-anchor="middle">N</text></g>
</svg>`;
}

