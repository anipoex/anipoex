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

const { CONFIRM_ALL_ABOVE, deferredDownloadMenu, downloadMenu } = await import(
  "./download-menu"
);
const { chapterHash } = await import("./paths");

import type { Chapter } from "@/features/manga/utils/to-chapters";

const ch = (number: number) =>
  ({
    id: `https://example.com/c/${number}`,
    number,
    title: `Chapter ${number}`,
    date: "",
    scanlator: null,
    memo: "",
  }) as Chapter;

const chapters = Array.from({ length: 12 }, (_, i) => ch(12 - i));
const manga = { id: 314, title: "Manga" };
const source = { id: "source-1", name: "Source A" };

function build(
  downloaded: Chapter[] = [],
  progress = 0,
  enqueued?: number,
  failRemove = false,
) {
  const calls = {
    enqueued: [] as unknown[][],
    started: 0,
    messages: [] as string[],
    removed: [] as unknown[][],
  };
  const { menu, remove } = downloadMenu({
    manga,
    source,
    chapters,
    progress,
    downloadedHashes: new Set(downloaded.map((c) => chapterHash(c.id))),
    notify: (m) => calls.messages.push(m),
    enqueue: (items) => {
      calls.enqueued.push(items);
      return enqueued ?? items.length;
    },
    start: () => calls.started++,
    remove: (async (...args: unknown[]) => {
      calls.removed.push(args);
      if (failRemove) throw new Error("denied");
    }) as never,
  });
  const row = (label: string) => menu.items.find((i) => i.label === label);
  return { menu, remove, calls, row };
}

describe("downloadMenu", () => {
  test("with everything downloaded the five download rows are disabled", () => {
    const { menu } = build(chapters);
    expect(menu.items.slice(0, 5).map((i) => i.disabled)).toEqual(
      Array(5).fill(true),
    );
    expect(menu.items[5]).toMatchObject({ label: "Delete downloads" });
    expect(menu.items[5].disabled).toBeFalsy();
  });

  test("with no downloads, delete is left out", () => {
    const { row } = build();
    expect(row("Delete downloads")).toBeUndefined();
    expect(row("Next 5")?.disabled).toBe(false);
  });

  test("Next 5 enqueues 5, starts and says so", () => {
    const { row, calls } = build();
    row("Next 5")?.onPress();
    expect(calls.enqueued[0]).toHaveLength(5);
    expect(calls.started).toBe(1);
    expect(calls.messages).toEqual(["Downloading 5 chapters"]);
  });

  test("a single chapter is singular", () => {
    const { row, calls } = build();
    row("Next chapter")?.onPress();
    expect(calls.messages).toEqual(["Downloading 1 chapter"]);
  });

  test("nothing added means no start and no toast", () => {
    const { row, calls } = build([], 0, 0);
    row("Next 5")?.onPress();
    expect(calls.started).toBe(0);
    expect(calls.messages).toEqual([]);
  });

  test("a failed delete is toasted", async () => {
    const { remove, calls } = build([ch(1)], 0, undefined, true);
    remove.onPress();
    await Bun.sleep(0);
    expect(calls.messages).toEqual(["Couldn't delete the downloads"]);
  });

  test("delete confirms and removes every downloaded hash", () => {
    const done = [ch(1), ch(2)];
    const { row, remove: item, calls } = build(done);
    expect(row("Delete downloads")).toBe(item);
    expect(item.onPressMode).toBe("dialog");
    expect(item.destructive).toBe(true);
    item.onPress();
    expect(calls.removed[0]).toEqual([
      314,
      "source-1",
      done.map((c) => chapterHash(c.id)),
    ]);
  });

  test("All runs at once up to the threshold", () => {
    const { row } = build();
    expect(row("All")?.onPressMode).toBeUndefined();
  });

  test("All confirms first above the threshold, with the count", () => {
    const many = Array.from({ length: CONFIRM_ALL_ABOVE + 1 }, (_, i) =>
      ch(i + 1),
    );
    const enqueued: unknown[][] = [];
    const all = downloadMenu({
      manga,
      source,
      chapters: many,
      progress: 0,
      downloadedHashes: new Set(),
      enqueue: (items) => {
        enqueued.push(items);
        return items.length;
      },
      start: () => {},
    }).menu.items.find((i) => i.label === "All");
    expect(all?.onPressMode).toBe("dialog");
    expect(all?.dialogConfig?.title).toBe(
      `Download ${CONFIRM_ALL_ABOVE + 1} chapters?`,
    );
    all?.onPress();
    expect(enqueued[0]).toHaveLength(CONFIRM_ALL_ABOVE + 1);
  });

  test("offers the cancel rows only while this manga has chapters queued", () => {
    const labels = (queued: boolean) =>
      downloadMenu({
        manga,
        source,
        chapters,
        progress: 0,
        downloadedHashes: new Set(),
        queued,
      }).menu.items.map((i) => i.label);
    expect(labels(false)).not.toContain("Cancel all downloads");
    expect(labels(true).slice(-2)).toEqual([
      "Cancel this manga's downloads",
      "Cancel all downloads",
    ]);
  });
});

describe("deferredDownloadMenu", () => {
  const args = (
    messages: string[],
    enqueued: unknown[][],
    done = [] as Chapter[],
  ) => ({
    manga,
    source,
    chapters,
    progress: 0,
    downloadedHashes: new Set(done.map((c) => chapterHash(c.id))),
    notify: (m: string) => messages.push(m),
    enqueue: (items: unknown[]) => {
      enqueued.push(items);
      return items.length;
    },
    start: () => {},
  });

  test("picks wait for unread chapters, All for missing ones", () => {
    const states = (flags: {
      unread: boolean;
      missing: boolean;
      downloaded: boolean;
    }) =>
      deferredDownloadMenu(
        () => undefined,
        flags,
        () => {},
      ).items.map((i) => !!i.disabled);
    expect(states({ unread: false, missing: true, downloaded: false })).toEqual(
      [true, true, true, true, false],
    );
    expect(states({ unread: true, missing: true, downloaded: true })).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(states({ unread: false, missing: false, downloaded: true })).toEqual(
      [true, true, true, true, true, false],
    );
  });

  test("a pick without stored chapters says to open the manga", () => {
    const messages: string[] = [];
    const menu = deferredDownloadMenu(
      () => ({ ...args(messages, []), chapters: [] }),
      { unread: true, missing: true, downloaded: false },
      () => {},
    );
    menu.items.find((i) => i.label === "Next 5")?.onPress();
    expect(messages).toEqual(["Open this manga once to load its chapters"]);
  });

  test("a pick builds the menu when pressed and runs its row", () => {
    const messages: string[] = [];
    const enqueued: unknown[][] = [];
    let built = 0;
    const menu = deferredDownloadMenu(
      () => {
        built++;
        return args(messages, enqueued);
      },
      { unread: true, missing: true, downloaded: false },
      () => {},
    );
    expect(built).toBe(0);
    menu.items.find((i) => i.label === "Next 5")?.onPress();
    expect(built).toBe(1);
    expect(enqueued[0]).toHaveLength(5);
    expect(messages).toEqual(["Downloading 5 chapters"]);
  });

  test("a row that confirms goes to confirm, not run", () => {
    const enqueued: unknown[][] = [];
    const confirmed: string[] = [];
    const menu = deferredDownloadMenu(
      () => args([], enqueued, [ch(1)]),
      { unread: true, missing: true, downloaded: true },
      (row) => confirmed.push(row.label),
    );
    menu.items.find((i) => i.label === "Delete downloads")?.onPress();
    expect(confirmed).toEqual(["Delete downloads"]);
  });

  test("a pick with nothing left says so", () => {
    const messages: string[] = [];
    const enqueued: unknown[][] = [];
    const menu = deferredDownloadMenu(
      () => args(messages, enqueued, chapters),
      { unread: true, missing: true, downloaded: true },
      () => {},
    );
    menu.items.find((i) => i.label === "Next chapter")?.onPress();
    expect(enqueued).toEqual([]);
    expect(messages).toEqual(["Nothing to download"]);
  });
});
