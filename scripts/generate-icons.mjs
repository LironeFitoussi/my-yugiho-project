// Generates the PWA icons with pure Node (no dependencies).
// Usage: node scripts/generate-icons.mjs
// Draws a dark rounded square with a gold card outline and a stylised "Y".
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = [10, 10, 10]; // #0a0a0a
const CARD = [24, 22, 18];
const GOLD = [212, 175, 55];

// ---------- PNG encoding ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba, alpha) {
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc((size * channels + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * channels + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const o = row + 1 + x * channels;
      for (let c = 0; c < channels; c++) raw[o + c] = rgba[i + c];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // RGBA or RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- geometry (signed distance, unit square coords 0..1) ----------
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}
const cover = (d, aa) => Math.min(1, Math.max(0, 0.5 - d / aa));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * @param size  pixel size
 * @param opts.full  fill the whole square (maskable / apple) instead of a rounded tile
 * @param opts.scale  mark scale (maskable keeps the mark inside the 80% safe zone)
 */
function render(size, { full = false, scale = 1, alpha = true } = {}) {
  const px = new Uint8ClampedArray(size * size * 4);
  const aa = 1.5 / size;
  const s = scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      // background tile
      const tile = full ? 1 : cover(sdRoundRect(u, v, 0.5, 0.5, 0.5, 0.5, 0.2), aa);
      let col = BG;
      // card body (portrait) + gold border
      const cd = sdRoundRect(u, v, 0.5, 0.5, 0.26 * s, 0.36 * s, 0.04 * s);
      col = mix(col, CARD, cover(cd, aa));
      const border = Math.abs(cd + 0.012 * s) - 0.012 * s;
      col = mix(col, GOLD, cover(border, aa));
      // stylised "Y"
      const w = 0.035 * s;
      const yd = Math.min(
        sdSegment(u, v, 0.5 - 0.13 * s, 0.5 - 0.17 * s, 0.5, 0.5),
        sdSegment(u, v, 0.5 + 0.13 * s, 0.5 - 0.17 * s, 0.5, 0.5),
        sdSegment(u, v, 0.5, 0.5, 0.5, 0.5 + 0.19 * s),
      ) - w;
      col = mix(col, GOLD, cover(yd, aa));
      const i = (y * size + x) * 4;
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
      px[i + 3] = alpha ? Math.round(tile * 255) : 255;
    }
  }
  return encodePng(size, px, alpha);
}

const outputs = [
  ["public/icons/icon-192.png", render(192)],
  ["public/icons/icon-512.png", render(512)],
  // maskable: full-bleed background, mark shrunk into the 80% safe zone
  ["public/icons/icon-maskable-512.png", render(512, { full: true, scale: 0.8 })],
  // iOS: opaque, full-bleed (iOS applies its own rounding)
  ["public/apple-touch-icon.png", render(180, { full: true, scale: 0.9, alpha: false })],
];

for (const [rel, buf] of outputs) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  console.log(`wrote ${rel} (${buf.length} bytes)`);
}
