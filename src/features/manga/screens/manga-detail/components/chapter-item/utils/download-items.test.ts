import { describe, expect, it, mock } from "bun:test";

// The registry requires native assets; the menu only needs a name per icon.
mock.module("@/components/ui/icon", () => ({
  Icons: new Proxy({}, { get: (_, name) => String(name) }),
}));

const { chapterItems, downloadItems } = await import("./download-items");

const actions = {
  download: () => {},
  cancel: () => {},
  retry: () => {},
  pause: () => {},
  resume: () => {},
  remove: () => {},
  cancelGroup: () => {},
  cancelAll: () => {},
};
const labels = (state: Parameters<typeof chapterItems>[0]) =>
  chapterItems(state, actions).map((item) => item.label);

describe("chapterItems", () => {
  it("offers what each state can do", () => {
    expect(labels("none")).toEqual(["Download"]);
    expect(labels("queued")).toEqual(["Cancel download"]);
    expect(labels("running")).toEqual(["Pause download", "Cancel download"]);
    expect(labels("paused")).toEqual(["Resume download", "Cancel download"]);
    expect(labels("failed")).toEqual(["Retry download", "Cancel download"]);
    expect(labels("local")).toEqual(["Delete download"]);
    expect(labels("cloud")).toEqual(["Delete download"]);
  });

  it("confirms a delete in the menu's dialog unless the caller does", () => {
    const [confirmed] = chapterItems("local", actions);
    expect(confirmed).toMatchObject({
      destructive: true,
      onPressMode: "dialog",
      dialogConfig: { confirmLabel: "Delete" },
    });
    const [plain] = chapterItems("local", actions, false);
    expect(plain.onPressMode).toBeUndefined();
    expect(plain.onPress).toBe(actions.remove);
  });
});

describe("downloadItems", () => {
  it("adds the queue's cancel rows while the chapter is in it", () => {
    for (const state of ["queued", "running", "paused", "failed"] as const) {
      const items = downloadItems(state, actions);
      const group = items.at(-1);
      expect(group && "items" in group && group.items.length).toBe(2);
    }
    expect(downloadItems("none", actions)).toEqual(
      chapterItems("none", actions),
    );
    expect(downloadItems("local", actions)).toHaveLength(1);
  });
});
