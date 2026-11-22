import { describe, expect, mock, test } from "bun:test";

// The registry requires native assets; the menu only needs a name per icon.
mock.module("@/components/ui/icon", () => ({
  Icons: new Proxy({}, { get: (_, name) => String(name) }),
}));
mock.module("@/state/observable-persist", () => ({
  ObservablePersist: class {
    getTable() {
      return {};
    }
    set() {}
    deleteTable() {}
    getMetadata() {
      return {};
    }
    setMetadata() {}
    deleteMetadata() {}
  },
}));

const {
  cancelAllDownloads,
  pauseDownloads,
  resumeDownloads,
  retryAllDownloads,
} = await import("@/features/downloads");
const { downloadActions } = await import("./download-actions");

const labels = (...args: Parameters<typeof downloadActions>) =>
  downloadActions(...args).map((a) => a.label);

describe("downloadActions", () => {
  test("offers Retry all only when one failed", () => {
    expect(labels(false, true, false)).toEqual(["Pause", "Cancel all"]);
    expect(labels(false, false, true)).toEqual(["Retry all", "Cancel all"]);
    expect(labels(false, true, true)).toEqual([
      "Retry all",
      "Pause",
      "Cancel all",
    ]);
    expect(labels(false, false, false)).toEqual(["Cancel all"]);
  });

  test("Resume while paused, whatever is pending", () => {
    expect(labels(true, false, false)).toEqual(["Resume", "Cancel all"]);
  });

  test("each label runs its action", () => {
    const [retry, pause] = downloadActions(false, true, true);
    expect(retry.onPress).toBe(retryAllDownloads);
    expect(pause.onPress).toBe(pauseDownloads);
    expect(downloadActions(true, false, false)[0].onPress).toBe(
      resumeDownloads,
    );
  });

  test("Cancel all asks first", () => {
    const cancel = downloadActions(false, true, false).at(-1);
    expect(cancel?.onPress).toBe(cancelAllDownloads);
    expect(cancel?.confirm?.confirmLabel).toBe("Cancel all");
  });
});
