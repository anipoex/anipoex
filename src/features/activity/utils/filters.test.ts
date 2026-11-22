import { describe, expect, test } from "bun:test";
import {
  type ActivityIds,
  activityCount,
  countsOf,
  emptyKind,
  headerIndices,
  parseFilter,
  toRows,
  visibleSections,
} from "./filters";

const ids = (over: Partial<ActivityIds> = {}): ActivityIds => ({
  running: [],
  queue: [],
  downloads: [],
  skipped: [],
  entries: [],
  unsent: [],
  sync: [],
  ...over,
});

describe("activity filters", () => {
  test("parseFilter keeps a known filter and falls back to all", () => {
    expect(parseFilter("downloads")).toBe("downloads");
    expect(parseFilter(undefined)).toBe("all");
    expect(parseFilter("foo")).toBe("all");
  });

  test("countsOf leaves skipped sources out of scans", () => {
    expect(
      countsOf(
        ids({
          running: ["1"],
          queue: ["2", "3"],
          skipped: ["s"],
          entries: ["4"],
          unsent: ["5"],
          sync: ["gist"],
          downloads: ["d"],
        }),
      ),
    ).toEqual({ all: 7, scans: 3, downloads: 1, send: 2, sync: 1 });
  });

  test("visibleSections keeps the order and drops empty sections", () => {
    const all = ids({ running: ["1"], skipped: ["s"], unsent: ["5"] });
    expect(visibleSections(all, "all")).toEqual([
      "running",
      "skipped",
      "unsent",
    ]);
    expect(visibleSections(all, "scans")).toEqual(["running", "skipped"]);
    expect(visibleSections(all, "send")).toEqual(["unsent"]);
  });

  test("toRows keys a manga apart in each section", () => {
    const rows = toRows(ids({ running: ["12"], entries: ["12"] }), "all");
    expect(rows.map((r) => r.key)).toEqual([
      "header-running",
      "running:12",
      "header-entries",
      "entries:12",
    ]);
    expect(headerIndices(rows)).toEqual([0, 2]);
  });

  test("toRows shows a long queue whole", () => {
    const many = Array.from({ length: 200 }, (_, i) => String(i));
    const rows = toRows(ids({ downloads: many }), "downloads");
    expect(rows).toHaveLength(201);
    expect(rows[200]).toMatchObject({ kind: "item", index: 199, count: 200 });
  });

  test("toRows puts an open group's chapters under it", () => {
    const rows = toRows(ids({ downloads: ["1/a", "2/a"] }), "downloads", {
      "1/a": ["1/a/x", "1/a/y"],
    });
    expect(rows.map((r) => r.key)).toEqual([
      "header-downloads",
      "downloads:1/a",
      "child:downloads:1/a/x",
      "child:downloads:1/a/y",
      "downloads:2/a",
    ]);
    expect(rows[1]).toMatchObject({ index: 0, count: 2, last: false });
    expect(rows[3]).toMatchObject({
      kind: "child",
      section: "downloads",
      index: 1,
      count: 2,
    });
    expect(rows.map((r) => r.kind !== "header" && r.last)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  test("toRows ends the section on the last open group's last chapter", () => {
    const rows = toRows(ids({ downloads: ["1/a"] }), "all", {
      "1/a": ["1/a/x"],
    });
    expect(rows.map((r) => r.kind !== "header" && r.last)).toEqual([
      false,
      false,
      true,
    ]);
  });

  test("toRows opens only download and running groups", () => {
    const rows = toRows(ids({ entries: ["1/a"] }), "all", { "1/a": ["x"] });
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ kind: "item", last: true });
  });

  test("toRows puts an open running manga's sources under it", () => {
    const rows = toRows(ids({ running: ["12"] }), "all", {
      "12": ["12/s1", "12/s2"],
    });
    expect(rows.map((r) => r.key)).toEqual([
      "header-running",
      "running:12",
      "child:running:12/s1",
      "child:running:12/s2",
    ]);
    expect(rows[3]).toMatchObject({
      kind: "child",
      section: "running",
      last: true,
    });
  });

  test("emptyKind tells a filter with nothing from an idle queue", () => {
    const some = ids({ entries: ["4"] });
    expect(emptyKind(some, "downloads", false)).toBe("filter");
    expect(emptyKind(some, "all", false)).toBeNull();
    expect(emptyKind(ids(), "all", false)).toBe("all");
    expect(emptyKind(ids(), "all", true)).toBe("filter");
  });

  test("emptyKind counts skipped sources as rows", () => {
    const skipped = ids({ skipped: ["s"] });
    expect(emptyKind(skipped, "all", false)).toBeNull();
    expect(emptyKind(skipped, "downloads", false)).toBe("filter");
  });
});

describe("activityCount", () => {
  test("pluralizes", () => {
    expect([0, 1, 2].map(activityCount)).toEqual([
      "0 activities",
      "1 activity",
      "2 activities",
    ]);
  });
});
