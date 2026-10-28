// Generate the original ACOG mark as a PNG-backed Windows icon, without image tooling.
const fs = require("node:fs");
const zlib = require("node:zlib");
const size = 256;
const rows = Buffer.alloc((size * 4 + 1) * size);
const polygon = [
  [128, 24],
  [237, 224],
  [173, 224],
  [128, 141],
  [83, 224],
  [19, 224],
];
function inside(x, y) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i],
      [c, d] = polygon[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) hit = !hit;
  }
  return hit;
}
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    const mark =
      inside(x, y) || Math.abs(x - 128) / 20 + Math.abs(y - 201) / 29 < 1;
    rows.set(mark ? [180, 160, 251, 255] : [17, 19, 25, 255], offset);
  }
function crc(b) {
  let c = 0xffffffff;
  for (const byte of b) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([t, data])), 8 + data.length);
  return out;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(rows)),
  chunk("IEND", Buffer.alloc(0)),
]);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18);
fs.mkdirSync("app/assets", { recursive: true });
fs.writeFileSync("app/assets/icon.png", png);
fs.writeFileSync("app/assets/icon.ico", Buffer.concat([ico, png]));
