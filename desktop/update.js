import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, constants, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { app, net } from "electron";

const run = promisify(execFile);

// Only a release's own DMG: the page can't make main download anything else.
const DMG_URL =
  /^https:\/\/github\.com\/anipoex\/anipoex\/releases\/download\/v[\d.]+\/[\w.-]+\.dmg$/;
const BUNDLE_ID = "app.anipoex.desktop";

/**
 * Waits for this process to exit, then puts the new app where the old one
 * was (back again if that fails) and opens it.
 */
export const SWAP = `while kill -0 "$1" 2>/dev/null; do sleep 0.2; done
rm -rf "$2.old"
mv "$2" "$2.old" && { mv "$3" "$2" || mv "$2.old" "$2"; }
rm -rf "$2.old" "$4"
open "$2"`;

/** The .app this process runs from: …/anipoex.app/Contents/MacOS/anipoex. */
const runningBundle = () => path.resolve(app.getPath("exe"), "../../..");

async function download(url, file, onProgress) {
  const response = await net.fetch(url);
  if (!response.ok || !response.body)
    throw new Error(`GitHub answered ${response.status}`);
  const total = Number(response.headers.get("content-length")) || 0;
  let done = 0;
  const body = Readable.fromWeb(response.body).on("data", (chunk) => {
    done += chunk.length;
    if (total) onProgress(done / total);
  });
  await pipeline(body, createWriteStream(file));
}

/**
 * Replaces the running app with the one in a release's DMG, then quits; the
 * new one opens by itself. Electron's autoUpdater would do this, but on macOS
 * it only installs into an app signed with a Developer ID, and the DMG is
 * ad-hoc signed. Downloaded by the app, not a browser, the new app carries no
 * quarantine, so Gatekeeper doesn't stop it.
 * @see https://www.electronjs.org/docs/latest/api/auto-updater#macos
 */
export async function installUpdate(url, onProgress) {
  if (typeof url !== "string" || !DMG_URL.test(url))
    throw new Error("Not a release DMG");
  const target = runningBundle();
  if (!app.isPackaged || !target.endsWith(".app"))
    throw new Error("Only the packaged app updates itself");
  // A copy opened from Downloads runs from a read-only translocated path.
  if (target.includes("/AppTranslocation/"))
    throw new Error("Move Anipoex to Applications, open it, then update");
  try {
    await access(path.dirname(target), constants.W_OK);
  } catch {
    throw new Error(`Can't write to ${path.dirname(target)}`);
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "anipoex-update-"));
  try {
    const dmg = path.join(dir, "update.dmg");
    await download(url, dmg, onProgress);
    const mount = path.join(dir, "mount");
    const next = path.join(dir, path.basename(target));
    await run("hdiutil", [
      "attach",
      dmg,
      "-nobrowse",
      "-readonly",
      "-mountpoint",
      mount,
    ]);
    try {
      await run("ditto", [path.join(mount, "anipoex.app"), next]);
    } finally {
      await run("hdiutil", ["detach", mount, "-force"]).catch(() => {});
    }
    const { stdout } = await run("defaults", [
      "read",
      path.join(next, "Contents/Info"),
      "CFBundleIdentifier",
    ]);
    if (stdout.trim() !== BUNDLE_ID) throw new Error("Not an Anipoex DMG");
    spawn(
      "/bin/sh",
      ["-c", SWAP, "sh", String(process.pid), target, next, dir],
      {
        detached: true,
        stdio: "ignore",
      },
    ).unref();
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
  app.quit();
}
