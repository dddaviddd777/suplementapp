// Genera les icones PNG de l'app sense dependències: `node tools/genera-icones.mjs`
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VERD = [31, 122, 90];
const BLANC = [255, 255, 255];
const MENTA = [176, 232, 202];

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (tipus, dades) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(dades.length);
  const td = Buffer.concat([Buffer.from(tipus), dades]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(mida, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(mida, 0); ihdr.writeUInt32BE(mida, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const files = Buffer.alloc(mida * (mida * 4 + 1));
  for (let y = 0; y < mida; y++) pixels.copy(files, y * (mida * 4 + 1) + 1, y * mida * 4, (y + 1) * mida * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(files, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Color d'un punt (coordenades 0..1). Retorna [r,g,b,a].
function mostra(x, y, maskable) {
  // Fons: quadrat arrodonit (o ple si és maskable)
  if (!maskable) {
    const r = 0.22, dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
    if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];
  }
  // Càpsula girada 45°
  const escala = maskable ? 0.72 : 1;
  const cx = (x - 0.5) / escala, cy = (y - 0.5) / escala;
  const a = Math.SQRT1_2;
  const u = cx * a + cy * a;   // eix llarg
  const v = -cx * a + cy * a;  // eix curt
  const L = 0.2, R = 0.13;
  const du = Math.max(Math.abs(u) - L, 0);
  if (du * du + v * v <= R * R) return [...(u < 0 ? BLANC : MENTA), 255];
  // Contorn fi al voltant de la càpsula
  if (du * du + v * v <= (R + 0.025) * (R + 0.025)) return [...BLANC, 255];
  return [...VERD, 255];
}

function icona(mida, maskable) {
  const px = Buffer.alloc(mida * mida * 4);
  const SS = 4; // supermostreig per suavitzar vores
  for (let y = 0; y < mida; y++) {
    for (let x = 0; x < mida; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = mostra((x + (sx + 0.5) / SS) / mida, (y + (sy + 0.5) / SS) / mida, maskable);
          acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
        }
      }
      const i = (y * mida + x) * 4;
      const alfa = acc[3] / (SS * SS);
      px[i] = acc[3] ? acc[0] / acc[3] : 0;
      px[i + 1] = acc[3] ? acc[1] / acc[3] : 0;
      px[i + 2] = acc[3] ? acc[2] / acc[3] : 0;
      px[i + 3] = Math.round(alfa);
    }
  }
  return png(mida, px);
}

const dir = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(dir + 'icon-192.png', icona(192, false));
writeFileSync(dir + 'icon-512.png', icona(512, false));
writeFileSync(dir + 'icon-maskable-512.png', icona(512, true));
console.log('Icones generades a', dir);
