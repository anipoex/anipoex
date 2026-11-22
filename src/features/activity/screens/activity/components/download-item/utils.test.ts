import { describe, expect, test } from "bun:test";
import { chapterLabel, downloadLine } from "./utils";

describe("chapterLabel", () => {
  test("prefers the chapter's name, then its number", () => {
    expect(chapterLabel(12, "Ch. 12: The Duel")).toBe("Ch. 12: The Duel");
    expect(chapterLabel(12, "")).toBe("Chapter 12");
    expect(chapterLabel(-1, "")).toBe("Chapter");
  });
});

describe("downloadLine", () => {
  test("shows the state, or why it failed", () => {
    expect(downloadLine("queued", undefined, false)).toBe("Queued");
    expect(downloadLine("queued", undefined, true)).toBe("Paused");
    expect(downloadLine("failed", "Timed out", true)).toBe("Timed out");
    expect(downloadLine("failed", "", false)).toBe("Failed");
  });
});
