import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync, existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

// Keep APK out of webDir so Capacitor does not ship an APK inside the APK.
const publicApk = path.join(root, "public", "sansui.apk");
const releaseDir = path.join(root, "release");
const releaseApk = path.join(releaseDir, "sansui.apk");
if (existsSync(publicApk)) {
  mkdirSync(releaseDir, { recursive: true });
  try {
    renameSync(publicApk, releaseApk);
  } catch {
    // ignore if locked
  }
}

const env = { ...process.env, CAPACITOR: "1" };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx", ["tsc", "-b"]);
run("npx", ["vite", "build"]);

// Strip any leftover service worker artifacts just in case
for (const f of ["sw.js", "registerSW.js", "workbox-249c42c5.js", "manifest.webmanifest"]) {
  try {
    rmSync(path.join(root, "dist", f), { force: true });
  } catch {
    // ignore
  }
}

console.log("Android web build ready (no service worker).");
