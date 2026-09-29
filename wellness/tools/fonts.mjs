// ERKAK · собственные шрифты вместо Google Fonts.
// Зачем: GDPR (загрузка с серверов Google из ЕС без согласия — риск), доступность из Китая
// (fonts.googleapis.com там заблокирован) и скорость (нет стороннего соединения).
// Запуск (нужен интернет, один раз или при смене набора): node tools/fonts.mjs
// Результат: src/fonts/*.woff2 и src/fonts/fonts.css — сборка вставляет @font-face в общий CSS.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Семейство → запрос CSS2 и нужные подмножества. Китайский — системными шрифтами (см. erkak.css).
const SETS = [
  // Один шрифт на весь сайт: Golos Text — кириллица рисовалась первой, спокойный продуктовый гротеск
  { q:'Golos+Text:wght@400..700', subsets:['latin', 'latin-ext', 'cyrillic'] },
  // Арабский: IBM Plex Sans Arabic — та же логика, гротеск без декора
  { q:'IBM+Plex+Sans+Arabic:wght@400;600;700', subsets:['arabic'] }
];

fs.rmSync(OUT, { recursive:true, force:true });
fs.mkdirSync(OUT, { recursive:true });
const files = new Map(); // url → локальное имя
let css = '/* Сгенерировано tools/fonts.mjs — не редактировать вручную */\n';
let bytes = 0;

for (const set of SETS) {
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${set.q}&display=swap`, { headers:{ 'user-agent':UA } });
  if (!res.ok) throw new Error(`Google Fonts ${res.status} для ${set.q}`);
  const text = await res.text();
  // Блоки вида: /* cyrillic */ @font-face { ... }
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const [, subset, body] = m;
    if (!set.subsets.includes(subset)) continue;
    const url = (body.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!url) continue;
    const family = body.match(/font-family:\s*'([^']+)'/)[1];
    const style = body.match(/font-style:\s*(\w+)/)[1];
    const weight = body.match(/font-weight:\s*([\d ]+)/)[1].trim();
    const range = body.match(/unicode-range:\s*([^;]+);/)[1].trim();
    if (!files.has(url)) {
      const buf = Buffer.from(await (await fetch(url, { headers:{ 'user-agent':UA } })).arrayBuffer());
      // Имя с хешем содержимого: файлы можно кэшировать «навсегда»
      const name = `${family.toLowerCase().replace(/\s+/g, '-')}-${subset}-${style}-${weight.split(' ')[0]}.${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8)}.woff2`;
      fs.writeFileSync(path.join(OUT, name), buf);
      bytes += buf.length;
      files.set(url, name);
    }
    css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(/assets/fonts/${files.get(url)}) format('woff2');unicode-range:${range}}\n`;
  }
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css);
console.log(`Шрифты: ${files.size} файлов, ${(bytes / 1024).toFixed(0)} КБ → src/fonts/`);
