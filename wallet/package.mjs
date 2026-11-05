// Empaqueta dist/chromium y dist/firefox en .zip DETERMINISTAS: archivos en orden fijo, fecha
// fija y sin metadatos del sistema. Así, quien compile el mismo código obtiene el mismo SHA-256 y
// puede comprobar que lo publicado en las tiendas o en monerop2p.app es exactamente este código.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const out = join(root, "release");
await mkdir(out, { recursive: true });

async function files(dir) {
  const list = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) list.push(...(await files(p)));
    else list.push(p);
  }
  return list;
}

// 1980-01-01 00:00 en formato DOS.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

async function zip(dir) {
  const names = (await files(dir)).map((f) => relative(dir, f).split(sep).join("/")).sort();
  const local = [];
  const central = [];
  let offset = 0;
  for (const name of names) {
    const data = await readFile(join(dir, name));
    const comp = deflateRawSync(data, { level: 9 });
    const useComp = comp.length < data.length;
    const body = useComp ? comp : data;
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data) >>> 0;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    h.writeUInt16LE(useComp ? 8 : 0, 8);
    h.writeUInt16LE(DOS_TIME, 10);
    h.writeUInt16LE(DOS_DATE, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(body.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nameBuf.length, 26);
    h.writeUInt16LE(0, 28);
    local.push(h, nameBuf, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(useComp ? 8 : 0, 10);
    c.writeUInt16LE(DOS_TIME, 12);
    c.writeUInt16LE(DOS_DATE, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += h.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

const lines = [];
for (const target of ["chromium", "firefox"]) {
  const buf = await zip(join(root, "dist", target));
  const name = `monerop2p-wallet-${version}-${target}.zip`;
  await writeFile(join(out, name), buf);
  const sha = createHash("sha256").update(buf).digest("hex");
  lines.push(`${sha}  ${name}`);
  console.log(`${name}  ${(buf.length / 1048576).toFixed(1)} MB  sha256 ${sha}`);
}
await writeFile(join(out, "SHA256SUMS"), lines.join("\n") + "\n");
