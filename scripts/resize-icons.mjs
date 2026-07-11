import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const resourcesDir = path.join(root, "resources");
const source = path.join(iconsDir, "icon-1024.png");

const sizes = [192, 512];

await mkdir(resourcesDir, { recursive: true });

for (const size of sizes) {
  const out = path.join(iconsDir, `icon-${size}.png`);
  await sharp(source).resize(size, size).png().toFile(out);
  console.log(`Wrote ${out}`);
}

const resourcesOut = path.join(resourcesDir, "icon-512.png");
await copyFile(path.join(iconsDir, "icon-512.png"), resourcesOut);
console.log(`Copied to ${resourcesOut}`);
