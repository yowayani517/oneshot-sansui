/**
 * Capture short site demos → GIF for README.
 * Usage: node scripts/capture-readme-gifs.mjs
 * Requires: npm run dev on :5173
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "readme-media");
const tmpDir = path.join(outDir, "_tmp");
const BASE = process.env.SITE_URL || "http://localhost:5173/";

fs.mkdirSync(tmpDir, { recursive: true });

function webmToGif(webm, gif, { fps = 12, width = 720, start = 0, duration } = {}) {
  const args = [
    "-y",
    "-ss",
    String(start),
    ...(duration ? ["-t", String(duration)] : []),
    "-i",
    webm,
    "-vf",
    `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
    "-loop",
    "0",
    gif,
  ];
  const r = spawnSync(ffmpegPath, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${gif}`);
}

async function recordClip(name, run) {
  const clipDir = path.join(tmpDir, name);
  fs.rmSync(clipDir, { recursive: true, force: true });
  fs.mkdirSync(clipDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: clipDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  // skip / wait out loader
  await page.waitForTimeout(3200);
  await run(page);
  await page.waitForTimeout(400);
  await context.close();
  await browser.close();

  const files = fs.readdirSync(clipDir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`No webm for ${name}`);
  const webm = path.join(clipDir, files[0]);
  const gif = path.join(outDir, `${name}.gif`);
  webmToGif(webm, gif, { fps: 10, width: 800 });
  console.log("Wrote", gif, `(${(fs.statSync(gif).size / 1024 / 1024).toFixed(2)} MB)`);
  return gif;
}

async function main() {
  console.log("Capturing from", BASE);

  await recordClip("01-hero", async (page) => {
    await page.waitForTimeout(4500);
  });

  await recordClip("02-scroll-teachings", async (page) => {
    // smooth-ish scroll through early sections
    for (let i = 0; i < 18; i++) {
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(280);
    }
  });

  await recordClip("03-gallery-koi", async (page) => {
    await page.locator("#garden").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    // linger on koi panel while video plays / floats
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(3500);
  });

  await recordClip("04-suminagashi", async (page) => {
    await page.locator(".cta__btn, .nav__cta").first().click();
    await page.waitForTimeout(1500);
    const box = page.viewportSize();
    const cx = (box?.width || 1280) / 2;
    const cy = (box?.height || 720) / 2;
    // draw ink swirls
    await page.mouse.move(cx - 120, cy);
    await page.mouse.down();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      await page.mouse.move(cx + Math.cos(a) * (80 + i * 3), cy + Math.sin(a) * (50 + i * 2));
      await page.waitForTimeout(40);
    }
    await page.mouse.up();
    await page.waitForTimeout(2000);
  });

  console.log("Done. GIFs in docs/readme-media/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
