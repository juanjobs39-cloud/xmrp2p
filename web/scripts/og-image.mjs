// Genera public/og.png (1200×630) sin dependencias: fondo de marca y una franja. Reemplázala por
// una imagen diseñada cuando exista la marca definitiva (docs/PUBLICAR.md).
import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const W = 1200, H = 630;
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const i = y * (W * 3 + 1) + 1 + x * 3;
    const band = y > 380 && y < 420 && x > 120 && x < 1080;
    const [r, g, b] = band ? [255, 255, 255] : [0x1b + (x * 0x30) / W, 0x1d, 0x21 + (y * 0x20) / H];
    raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    if (y > 200 && y < 340 && x > 120 && x < 260) { raw[i] = 0xe2; raw[i + 1] = 0x59; raw[i + 2] = 0x1b; }
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
await writeFile(fileURLToPath(new URL("../public/og.png", import.meta.url)), png);
console.log(`public/og.png (${png.length} bytes)`);
