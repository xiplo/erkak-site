// ERKAK · сгенерировать фото по content/PHOTO-PROMPTS.md → photos-src/<слот>.jpg
// Дальше: node tools/photos.mjs (нарезка), node tools/og.mjs (соцсети), node build.mjs.
//
// Провайдеры:
//   pollinations — бесплатно, без ключа (image.pollinations.ai, модель Flux). По умолчанию.
//   gemini       — Google Gemini API, нужен ключ в переменной окружения GEMINI_API_KEY
//                  (aistudio.google.com → Get API key). Модель: GEMINI_IMAGE_MODEL, по умолчанию gemini-2.5-flash-image.
//
// Запуск:
//   node tools/generate.mjs                        — все слоты без готового файла
//   node tools/generate.mjs --only=hero,dir-golf   — только эти
//   node tools/generate.mjs --force                — перегенерировать
//   node tools/generate.mjs --provider=gemini      — через Gemini
//   node tools/generate.mjs --dry                  — показать промпты и размеры, ничего не скачивать
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'photos-src');
const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
const flag = n => process.argv.includes(`--${n}`);
const provider = arg('provider') || (process.env.GEMINI_API_KEY ? 'gemini' : 'pollinations');
const only = arg('only') ? new Set(arg('only').split(',')) : null;

// Промпты и общий стиль — из одного документа, чтобы не расходились
const md = fs.readFileSync(path.join(ROOT, 'content/PHOTO-PROMPTS.md'), 'utf8');
const style = (md.match(/### Общий стиль[\s\S]*?```\n([\s\S]*?)\n```/) || [])[1];
if (!style) throw new Error('Не нашёл блок «Общий стиль» в PHOTO-PROMPTS.md');
const slots = [...md.matchAll(/^\| `([a-z0-9-]+)` \|.*\| (.+?) \|$/gm)].map(([, name, prompt]) => ({ name, prompt:prompt.trim() }))
  .filter(s => !only || only.has(s.name));
// Первый экран — 16:9, остальное — 3:2 (сайт кадрирует от центра)
const size = name => name === 'hero' ? [1920, 1080, '16:9'] : [1800, 1200, '3:2'];
const seed = name => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 100000;

async function pollinations(prompt, [w, h], name){
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&private=true&seed=${seed(name)}`;
  const res = await fetch(url, { signal:AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`Pollinations: HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Pollinations вернул не картинку (${type})`);
  return Buffer.from(await res.arrayBuffer());
}

async function gemini(prompt, [, , ratio]){
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Нет GEMINI_API_KEY');
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method:'POST', signal:AbortSignal.timeout(180000),
    headers:{ 'content-type':'application/json', 'x-goog-api-key':key },
    body:JSON.stringify({ contents:[{ parts:[{ text:prompt }] }], generationConfig:{ responseModalities:['IMAGE'], imageConfig:{ aspectRatio:ratio } } })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini: HTTP ${res.status} ${j.error ? j.error.message : ''}`.trim());
  const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
  if (!part) throw new Error('Gemini не вернул изображение (возможно, сработал фильтр — смягчите промпт)');
  return Buffer.from(part.inlineData.data, 'base64');
}

fs.mkdirSync(OUT, { recursive:true });
const have = n => fs.readdirSync(OUT).some(f => f.replace(/\.\w+$/, '') === n);
const todo = slots.filter(s => flag('force') || !have(s.name));
console.log(`Провайдер: ${provider}. Слотов: ${slots.length}, к генерации: ${todo.length}`);
let ok = 0; const failed = [];
for (const [i, s] of todo.entries()) {
  const prompt = `${s.prompt} ${style}`, sz = size(s.name);
  if (flag('dry')) { console.log(`\n${s.name} (${sz[2]}): ${prompt}`); continue; }
  let buf, err;
  for (let attempt = 1; attempt <= 3 && !buf; attempt++) {
    try { buf = await (provider === 'gemini' ? gemini(prompt, sz) : pollinations(prompt, sz, s.name)); }
    catch (e) { err = e; if (attempt < 3) await new Promise(r => setTimeout(r, 8000 * attempt)); }
  }
  if (!buf) { failed.push(s.name); console.warn(`✗ ${s.name}: ${err.cause ? err.cause.code || err.cause.message : err.message}`); continue; }
  const ext = buf[0] === 0x89 ? 'png' : buf[0] === 0xFF ? 'jpg' : 'webp';
  fs.writeFileSync(path.join(OUT, `${s.name}.${ext}`), buf); ok++;
  console.log(`✓ ${i + 1}/${todo.length} ${s.name}.${ext} (${Math.round(buf.length / 1024)} КБ)`);
  if (provider === 'pollinations') await new Promise(r => setTimeout(r, 4000)); // бесплатный лимит: не чаще раза в несколько секунд
}
if (!flag('dry')) console.log(`\nГотово: ${ok}, не получилось: ${failed.length}${failed.length ? ` (${failed.join(', ')}) — запустите ещё раз, готовые пропустятся` : ''}.\nДальше: node tools/photos.mjs && node tools/og.mjs && node build.mjs`);
