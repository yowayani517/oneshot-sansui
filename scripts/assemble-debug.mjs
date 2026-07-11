import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const apkOut = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const releaseDir = path.join(root, "release");
const releaseApk = path.join(releaseDir, "sansui-debug.apk");

const jdk21 = "C:\\Program Files\\Microsoft\\jdk-21.0.11.10-hotspot";
const env = { ...process.env };
if (existsSync(jdk21)) {
  env.JAVA_HOME = jdk21;
  env.PATH = `${path.join(jdk21, "bin")};${env.PATH || ""}`;
}

process.chdir(androidDir);
const r = spawnSync(
  process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew",
  ["assembleDebug"],
  { stdio: "inherit", shell: true, env },
);
if (r.status !== 0) process.exit(r.status ?? 1);

if (!existsSync(apkOut)) {
  console.error("APK not found:", apkOut);
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
copyFileSync(apkOut, releaseApk);
copyFileSync(apkOut, path.join(root, "sansui-debug.apk"));
console.log("APK ready:");
console.log(" ", releaseApk);
console.log(" ", path.join(root, "sansui-debug.apk"));
