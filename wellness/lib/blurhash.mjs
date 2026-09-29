// ERKAK · BlurHash → крошечный PNG (data URI) для подложки под фото, пока оно грузится.
// Декодер по спецификации https://github.com/woltapp/blurhash (MIT), PNG собираем сами через zlib.
import zlib from 'node:zlib';

const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
const d83 = s => { let v = 0; for (const c of s) v = v * 83 + CH.indexOf(c); return v; };
const toLin = v => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = v => { const x = Math.max(0, Math.min(1, v)); return Math.round((x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255); };
const signPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

export function decode(hash, w = 32, h = 20){
  const size = d83(hash[0]), nx = (size % 9) + 1, ny = Math.floor(size / 9) + 1;
  const maxAc = (d83(hash[1]) + 1) / 166;
  const colors = [];
  const dc = d83(hash.slice(2, 6));
  colors.push([toLin(dc >> 16), toLin((dc >> 8) & 255), toLin(dc & 255)]);
  for (let i = 1; i < nx * ny; i++) {
    const v = d83(hash.slice(4 + i * 2, 6 + i * 2));
    const q = [Math.floor(v / 361), Math.floor(v / 19) % 19, v % 19];
    colors.push(q.map(c => signPow((c - 9) / 9, 2) * maxAc));
  }
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const basis = Math.cos(Math.PI * x * i / w) * Math.cos(Math.PI * y * j / h), c = colors[i + j * nx];
      r += c[0] * basis; g += c[1] * basis; b += c[2] * basis;
    }
    const o = (y * w + x) * 3; px[o] = toSrgb(r); px[o + 1] = toSrgb(g); px[o + 2] = toSrgb(b);
  }
  return { w, h, px };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function png({ w, h, px }){
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level:9 })), chunk('IEND', Buffer.alloc(0))]);
}
export const blurUri = (hash, w = 32, h = 20) => 'data:image/png;base64,' + png(decode(hash, w, h)).toString('base64');
