import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localAdb = path.join(
  process.env.LOCALAPPDATA || "",
  "Android",
  "Sdk",
  "platform-tools",
  "adb.exe",
);
const adb = existsSync(localAdb) ? localAdb : "adb";

const apkCandidates = [
  path.join(root, "release", "sansui-debug.apk"),
  path.join(root, "sansui-debug.apk"),
  path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
];
const apk = apkCandidates.find((p) => existsSync(p));
if (!apk) {
  console.error("No APK found. Run: npm run android:apk");
  process.exit(1);
}

const run = (args) =>
  spawnSync(adb, args, { stdio: "inherit", shell: false, env: process.env });

console.log("Looking for USB device...");
let devices = run(["devices"]);
if (devices.status !== 0) {
  console.error("adb not found. Install Android platform-tools.");
  process.exit(1);
}

const list = spawnSync(adb, ["devices"], { encoding: "utf8" }).stdout || "";
const lines = list
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("*"));
const ready = lines.filter((l) => l.endsWith("\tdevice") || l.includes("\tdevice"));
const unauthorized = lines.filter((l) => l.includes("unauthorized"));

if (unauthorized.length) {
  console.error("Phone is connected but unauthorized.");
  console.error("Unlock the phone and tap「許可」on the USB debugging prompt.");
  process.exit(1);
}

if (!ready.length) {
  console.error("No Android device over USB.");
  console.error("1. Connect USB cable");
  console.error("2. Enable Developer options → USB debugging");
  console.error("3. Set USB mode to File transfer (MTP)");
  console.error("4. Run again: npm run android:install");
  process.exit(1);
}

console.log("Installing", apk);
const install = run(["install", "-r", apk]);
if (install.status !== 0) {
  console.error("Install failed.");
  process.exit(install.status ?? 1);
}

console.log("Launching app...");
run(["shell", "am", "start", "-n", "app.sansui.ink/.MainActivity"]);
console.log("Done. Open 山水 on the phone.");
