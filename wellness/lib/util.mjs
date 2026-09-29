// ERKAK · общие утилиты сборки.
import crypto from 'node:crypto';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const attr = esc;
export const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
export const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);

// Типограф: неразрывные пробелы после коротких слов и перед тире, «ёлочки» уже в текстах.
const SHORT = {
  ru: /(^|[\s(«"„])((?:[вксуояиа]|во|ко|со|об|от|до|на|за|по|из|не|ни|но|для|без|при|про|над|под)) (?=[^\s])/giu,
  kk: /(^|[\s(«"])((?:[ав]|мен|және|да|де|та|те|не|бұл|сол)) (?=[^\s])/giu,
  uz: /(^|[\s(«"])((?:va|bu|u|bir|ham|har)) (?=[^\s])/giu,
  de: /(^|[\s("„])((?:in|im|am|an|zu|zum|zur|um|ab|bei|mit|von|vom|für|und|oder|der|die|das|den|dem|des|ein|eine|nur|ab)) (?=[^\s])/giu,
  en: /(^|[\s("“])((?:a|an|to|in|on|of|at|by|or|and|the|is|we|for|up)) (?=[^\s])/giu
};
export function typo(s, lang){
  if (!s || typeof s !== 'string') return s;
  let out = s.replace(/ — /g, ' — ').replace(/ – /g, ' – ');
  const re = SHORT[lang];
  if (re) { out = out.replace(re, (m, a, b) => `${a}${b} `); out = out.replace(re, (m, a, b) => `${a}${b} `); }
  // цифра + единица / валюта не разрываются
  out = out.replace(/(\d) (?=(?:%|₽|\$|€|฿|кг|км|м\b|THB|USD|дн|час|мин|kg|km|m\b|h\b|days?\b|Tage?|nights?))/g, '$1 ');
  return out;
}

// Глубокое применение типографа ко всем строкам объекта (контент языка).
export function typoDeep(obj, lang){
  if (typeof obj === 'string') return typo(obj, lang);
  if (Array.isArray(obj)) return obj.map(x => typoDeep(x, lang));
  if (obj && typeof obj === 'object') { const o = {}; for (const k of Object.keys(obj)) o[k] = /^(slug|href|url|id|code|locale|dir|currency|font|fonts|hreflang|og|key|img|icon)$/.test(k) ? obj[k] : typoDeep(obj[k], lang); return o; }
  return obj;
}

// Минимальная разметка в текстах: **жирный**, *курсив*, [ссылка](url)
export function inline(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

// Мета-описание без обрыва на полуслове: режем по концу предложения, иначе по слову с «…».
// Для китайского (без пробелов) считаем по символам и режем по «。».
export function clip(s, max = 160){
  s = String(s || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('؟ '), cut.lastIndexOf('! '));
  if (end > max * 0.55) return cut.slice(0, end + 1).trim();
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut.slice(0, max)).replace(/[\s,;:—–-]+$/, '') + '…';
}
