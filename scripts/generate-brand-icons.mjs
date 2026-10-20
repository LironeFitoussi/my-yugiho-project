// Generates all app icons from the DuelVault logo. Run: node scripts/generate-brand-icons.mjs
// Source: public/icons/DuelVault.png (690×690, rounded tile on opaque black corners).
import { mkdir } from "node:fs/promises";

import sharp from "sharp";

const SRC = "public/icons/DuelVault.png";
// The logo's corners are opaque black, so icon backgrounds use black to stay seamless.
const BG = "#000000";
// Bounding box of the rounded tile inside the source (measured): used for the in-app mark.
const TILE = { left: 49, top: 47, width: 591, height: 585 };

await mkdir("public/brand", { recursive: true });

const square = (size) => sharp(SRC).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

// PWA "any" icons: the full logo.
await square(192).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile("public/icons/icon-192.png");
await square(512).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile("public/icons/icon-512.png");

// Maskable: logo inside the 80% safe zone on a solid background, so launchers can crop freely.
const inner = await square(410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: inner, gravity: "center" }])
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile("public/icons/icon-maskable-512.png");

// iOS ignores transparency (renders it black) and applies its own corner mask: flatten full-bleed.
await square(180).flatten({ background: BG }).png().toFile("public/apple-touch-icon.png");

// Browser tab icon (Next.js app/icon.png file convention).
await square(64).png().toFile("src/app/icon.png");

// In-app brand mark (sidebar, login): the tile only (no black corners); CSS rounds it. Small, optimized.
await sharp(SRC)
  .extract(TILE)
  .resize(256, 256, { fit: "cover" })
  .webp({ quality: 88 })
  .toFile("public/brand/duelvault-256.webp");

console.log("DuelVault icons generated.");
