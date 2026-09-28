// ERKAK · IndexNow: сообщить Bing, Yandex и другим поисковикам об адресах сайта сразу после выкладки.
// Запуск: node tools/indexnow.mjs            → все адреса из public/sitemap-*.xml
//         node tools/indexnow.mjs /ru/ /en/   → только перечисленные пути
// Ключ — SITE.indexnow; файл <ключ>.txt кладёт в корень сайта build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../content/core.mjs';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const host = new URL(SITE.origin).host;
let urls = process.argv.slice(2).map(p => SITE.origin + p);
if (!urls.length) for (const f of fs.readdirSync(PUB).filter(f => /^sitemap-\w+\.xml$/.test(f))) urls.push(...[...fs.readFileSync(path.join(PUB, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
if (!SITE.indexnow || !urls.length) { console.log('IndexNow: нечего отправлять'); process.exit(0); }

for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch('https://api.indexnow.org/indexnow', { method:'POST', headers:{ 'content-type':'application/json; charset=utf-8' },
    body:JSON.stringify({ host, key:SITE.indexnow, keyLocation:`${SITE.origin}/${SITE.indexnow}.txt`, urlList:urls.slice(i, i + 10000) }) });
  console.log(`IndexNow: ${res.status} ${res.statusText} · ${Math.min(10000, urls.length - i)} адресов`);
  if (res.status >= 400 && res.status !== 422) process.exitCode = 1;
}
