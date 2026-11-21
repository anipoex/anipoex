import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Electron's package is only its binary's path outside Electron.
mock.module("electron", () => ({ app: {}, net: {} }));
const { SWAP } = await import("./update.js");

/** Runs the swap with a finished pid and an `open` that only records. */
async function swap(withNext) {
  const root = await mkdtemp(path.join(tmpdir(), "anipoex-swap-"));
  const target = path.join(root, "Applications/anipoex.app");
  const dir = path.join(root, "update");
  const next = path.join(dir, "anipoex.app");
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "version"), "old");
  await mkdir(dir);
  if (withNext) {
    await mkdir(next);
    await writeFile(path.join(next, "version"), "new");
  }
  const bin = path.join(root, "bin");
  await mkdir(bin);
  await writeFile(
    path.join(bin, "open"),
    `#!/bin/sh\necho "$1" > "${root}/opened"\n`,
  );
  await chmod(path.join(bin, "open"), 0o755);
  const done = spawnSync("true");
  spawnSync(
    "/bin/sh",
    ["-c", SWAP, "sh", String(done.pid), target, next, dir],
    {
      env: { PATH: `${bin}:/bin:/usr/bin` },
    },
  );
  return { root, target, dir };
}

test("puts the new app in place of the old one and opens it", async () => {
  const { root, target, dir } = await swap(true);
  expect(await readFile(path.join(target, "version"), "utf8")).toBe("new");
  expect(existsSync(`${target}.old`)).toBe(false);
  expect(existsSync(dir)).toBe(false);
  expect((await readFile(path.join(root, "opened"), "utf8")).trim()).toBe(
    target,
  );
});

test("keeps the old app when the new one can't move in", async () => {
  const { root, target } = await swap(false);
  expect(await readFile(path.join(target, "version"), "utf8")).toBe("old");
  expect((await readFile(path.join(root, "opened"), "utf8")).trim()).toBe(
    target,
  );
});
