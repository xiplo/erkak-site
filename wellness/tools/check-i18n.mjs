// ERKAK · проверка переводов против русского эталона (content/ru).
// Запуск: node tools/check-i18n.mjs            → все языки, кроме ru
//         node tools/check-i18n.mjs de ar      → выбранные
//         node tools/check-i18n.mjs de --file=catalog   → только один файл языка (ui, catalog, fishing, site, guides)
// Ошибки (✗) ломают сборку или смысл; предупреждения (!) стоит посмотреть глазами.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const onlyFile = (args.find(a => a.startsWith('--file=')) || '').split('=')[1];
let langs = args.filter(a => !a.startsWith('--'));
// Без аргументов — все готовые языки. Папка без index.mjs — перевод ещё пишется: сборка её пропускает, проверка тоже
// (чтобы проверить такой перевод, назовите язык явно: node tools/check-i18n.mjs th).
if (!langs.length) {
  const dirs = fs.readdirSync(path.join(ROOT, 'content')).filter(d => d !== 'ru' && fs.statSync(path.join(ROOT, 'content', d)).isDirectory());
  langs = dirs.filter(d => fs.existsSync(path.join(ROOT, 'content', d, 'index.mjs')));
  for (const d of dirs) if (!langs.includes(d)) console.log(`· ${d}: нет index.mjs — перевод в работе, пропущен`);
}

const FILES = ['ui', 'catalog', 'fishing', 'site', 'guides', 'ring', 'private'];
const CYR = /[Ѐ-ӿ]/;
const PH = s => (s.match(/\{\w+\}/g) || []).map(x => x === '{np}' ? '{n}' : x).sort().join(' '); // {np} = {n} + слово «программ» в нужной форме
const LINKS = s => (s.match(/\]\(([^)]+)\)/g) || []).join(' ');
const load = async (code, f) => { const p = path.join(ROOT, 'content', code, f + '.mjs'); return fs.existsSync(p) ? import(p + '?t=' + Date.now()) : null; };
const fontPrefixes = fs.readdirSync(path.join(ROOT, 'src/fonts')).filter(f => f.endsWith('.woff2')).map(f => f.replace(/\.[0-9a-f]{8}\.woff2$/, ''));

let fails = 0;
for (const code of langs) {
  const E = [], W = [];
  const err = (p, m) => E.push(`✗ ${p}: ${m}`), warn = (p, m) => W.push(`! ${p}: ${m}`);
  const X = {}, R = {};
  for (const f of FILES) {
    if (onlyFile && f !== onlyFile) continue;
    R[f] = await load('ru', f);
    try { X[f] = await load(code, f); } catch (e) { err(f + '.mjs', 'не импортируется: ' + e.message.split('\n')[0]); X[f] = null; continue; }
    if (!X[f]) { err(f + '.mjs', 'файла нет'); continue; }
    for (const k of Object.keys(R[f])) if (!(k in X[f])) err(`${f}.${k}`, 'нет экспорта');
  }
  const meta = X.ui && X.ui.meta;
  const locale = meta && meta.locale || code;

  // meta: обязательные поля и шрифты
  if (X.ui && meta) {
    for (const k of ['code', 'name', 'locale', 'htmlLang', 'hreflang', 'ogLocale', 'dir', 'currency', 'messengers', 'preload']) if (meta[k] == null) err('ui.meta.' + k, 'нет поля');
    if (meta.code !== code) err('ui.meta.code', `должно быть «${code}»`);
    for (const f of meta.preload || []) if (!fontPrefixes.includes(f)) err('ui.meta.preload', `нет шрифта ${f} (есть: ${fontPrefixes.join(', ')})`);
    try { new Intl.NumberFormat(meta.locale); } catch { err('ui.meta.locale', 'неверная локаль'); }
  }
  // Склонения: нужны все категории PluralRules языка
  if (X.ui) {
    const cats = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    for (const grp of ['units', 'nouns']) for (const k of Object.keys(R.ui[grp])) {
      const v = X.ui[grp] && X.ui[grp][k];
      if (!v) { err(`ui.${grp}.${k}`, 'нет'); continue; }
      if (typeof v === 'string') continue;
      for (const c of cats) if (!v[c]) err(`ui.${grp}.${k}.${c}`, `нет формы «${c}» (для ${locale} нужны: ${cats.join(', ')})`);
    }
  }

  // Структура и строки
  const walk = (r, x, p) => {
    if (typeof r === 'string') {
      if (typeof x !== 'string') return err(p, `ожидалась строка, а тут ${Array.isArray(x) ? 'массив' : typeof x}`);
      if (r && !x.trim()) return err(p, 'пустая строка');
      // Технические значения (id, якоря, диапазоны бюджета, коды) не переводятся
      if (/^[a-z0-9_#/.-]+$/.test(r) && /[a-z0-9]/.test(r) && x !== r) return err(p, `служебное значение «${r}» изменено на «${x}»`);
      if (PH(r) !== PH(x)) err(p, `подстановки ${PH(r) || '—'} ≠ ${PH(x) || '—'}`);
      if (LINKS(r) !== LINKS(x)) err(p, `ссылки ${LINKS(r) || '—'} ≠ ${LINKS(x) || '—'}`);
      if ((x.match(/\*/g) || []).length % 2) err(p, 'непарная звёздочка * (разметка курсива)');
      if (/\*/.test(r) && !/\*/.test(x) && /(title|Title)$/.test(p.split('.').pop())) warn(p, 'в заголовке пропал акцент *курсив*');
      if (code !== 'ru' && CYR.test(x) && !/^ui\.meta\.name$/.test(p)) err(p, `кириллица: «${x.slice(0, 60)}»`);
      if (code !== 'ru' && x === r && CYR.test(r)) err(p, 'не переведено');
      const last = p.split('.').pop();
      if (last === 'metaTitle' && x.length > 72) warn(p, `title ${x.length} зн. (лучше ≤ 65)`);
      if ((last === 'metaDesc' || (last === 'desc' && p.startsWith('guides'))) && x.length > 175) warn(p, `description ${x.length} зн. (лучше ≤ 160)`);
      return;
    }
    if (typeof r === 'number' || typeof r === 'boolean' || r === null) { if (x !== r) err(p, `значение ${JSON.stringify(x)} ≠ ${JSON.stringify(r)} (числа не переводятся)`); return; }
    if (Array.isArray(r)) {
      if (!Array.isArray(x)) return err(p, 'ожидался массив');
      if (r.length !== x.length) err(p, `длина ${x.length} ≠ ${r.length}`);
      r.forEach((v, i) => i < x.length && walk(v, x[i], `${p}[${i}]`));
      return;
    }
    if (r && typeof r === 'object') {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return err(p, 'ожидался объект');
      for (const k of Object.keys(r)) {
        if (!(k in x)) { if (!(k === 'kicker' && p.startsWith('guides.'))) err(`${p}.${k}`, 'нет ключа'); continue; }
        walk(r[k], x[k], `${p}.${k}`);
      }
      for (const k of Object.keys(x)) if (!(k in r)) warn(`${p}.${k}`, 'лишний ключ (нет в ru)');
    }
  };
  for (const f of FILES) {
    if (!X[f] || !R[f]) continue;
    for (const k of Object.keys(R[f])) {
      if (!(k in X[f])) continue;
      if (f === 'ui' && ['meta', 'units', 'nouns'].includes(k)) continue;
      const r = k === 'default' ? R[f].default : R[f][k], x = k === 'default' ? X[f].default : X[f][k];
      walk(r, x, f === 'fishing' || f === 'guides' ? f : `${k}`);
    }
  }
  // Индекс языка собирается?
  if (!onlyFile) {
    try { const I = (await import(path.join(ROOT, 'content', code, 'index.mjs') + '?t=' + Date.now())).default; for (const k of ['meta', 'ui', 'client', 'catalog', 'fishing', 'hub', 'guides']) if (!I[k]) err('index.mjs', `нет ${k}`); }
    catch (e) { err('index.mjs', e.message.split('\n')[0]); }
  }
  console.log(`\n── ${code}: ${E.length} ошибок, ${W.length} предупреждений`);
  for (const m of E.slice(0, 80)) console.log(m);
  if (E.length > 80) console.log(`… и ещё ${E.length - 80}`);
  for (const m of W.slice(0, 40)) console.log(m);
  fails += E.length;
}
process.exit(fails ? 1 : 0);
