// ERKAK · скачать фото из content/photos.mjs к себе (src/img/photos/*.webp), чтобы не зависеть от CDN Unsplash:
// GDPR (запросы к стороннему серверу из ЕС), Китай и скорость. Запуск (нужен интернет): node tools/photos.mjs
// Уже скачанные файлы пропускаются; чтобы обновить кадр, удалите его файлы или поменяйте src.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTOS } from '../content/photos.mjs';
import { WIDTHS, fileName } from '../lib/photo.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/img/photos');
fs.mkdirSync(OUT, { recursive:true });
let got = 0, kb = 0;
for (const [key, p] of Object.entries(PHOTOS)) for (const w of WIDTHS) {
  const file = path.join(OUT, fileName(key, w));
  if (fs.existsSync(file)) continue;
  const res = await fetch(`${p.src}?fm=webp&fit=crop&w=${w}&q=72`);
  if (!res.ok) throw new Error(`${res.status} для ${key} (${p.src})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf); got++; kb += buf.length / 1024;
}
console.log(`Фото: скачано ${got} файлов, ${Math.round(kb)} КБ → src/img/photos/`);
