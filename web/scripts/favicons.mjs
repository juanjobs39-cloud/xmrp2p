// Genera los íconos que piden Google y los navegadores a partir de public/favicon.svg:
// favicon.ico (16, 32 y 48 px), favicon-96.png y favicon-192.png (múltiplos de 48, como pide Google)
// y apple-touch-icon.png (180 px, con fondo para iPhone). Uso: node scripts/favicons.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const pub = (f) => fileURLToPath(new URL(`../public/${f}`, import.meta.url));
const svg = await readFile(pub("favicon.svg"));
const png = (size, bg) => {
  let img = sharp(svg, { density: Math.ceil((72 * size) / 64) * 4 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (bg) img = img.flatten({ background: bg });
  return img.png({ compressionLevel: 9 }).toBuffer();
};

for (const s of [96, 192]) await writeFile(pub(`favicon-${s}.png`), await png(s));
await writeFile(pub("apple-touch-icon.png"), await png(180, "#ffffff"));

// .ico con imágenes PNG dentro (formato aceptado por todos los navegadores modernos).
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map((s) => png(s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e);
  head.writeUInt8(s, e + 1);
  head.writeUInt16LE(1, e + 4);
  head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8);
  head.writeUInt32LE(offset, e + 12);
  offset += imgs[i].length;
});
await writeFile(pub("favicon.ico"), Buffer.concat([head, ...imgs]));
console.log("íconos: favicon.ico, favicon-96.png, favicon-192.png, apple-touch-icon.png");
