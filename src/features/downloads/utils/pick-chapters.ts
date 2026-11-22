import { type Chapter, isRead } from "@/features/manga/utils/to-chapters";
import { chapterHash } from "./paths";

// The menu rebuilds on each finished or deleted download and hashed every
// chapter six times a build (~100 ms of a dev build's toolbar for 201 chapters).
const hashes = new WeakMap<Chapter, string>();
const hashOf = (chapter: Chapter) => {
  let hash = hashes.get(chapter);
  if (hash === undefined) {
    hash = chapterHash(chapter.id);
    hashes.set(chapter, hash);
  }
  return hash;
};

export type DownloadPick = "next" | "next5" | "next10" | "unread" | "all";

const COUNT: Record<DownloadPick, number> = {
  next: 1,
  next5: 5,
  next10: 10,
  unread: Infinity,
  all: Infinity,
};

/**
 * Newest-first chapters → oldest-first picks: one row per number, none
 * already downloaded.
 */
export function pickChapters(
  chapters: Chapter[],
  pick: DownloadPick,
  progress: number,
  downloadedHashes: Set<string>,
  preferScanlator: string | null,
): Chapter[] {
  // An unnumbered chapter is its own group, keyed by id.
  const groups = new Map<string | number, Chapter[]>();
  for (const c of chapters) {
    const key = c.number < 0 ? c.id : c.number;
    const group = groups.get(key);
    if (group) group.push(c);
    else groups.set(key, [c]);
  }

  const picked: Chapter[] = [];
  for (const group of groups.values()) {
    if (group.some((c) => downloadedHashes.has(hashOf(c)))) continue;
    if (pick !== "all" && !(group[0].number >= 0 && group[0].number > progress))
      continue;
    picked.push(
      group.find((c) => preferScanlator && c.scanlator === preferScanlator) ??
        group[0],
    );
  }

  const known = picked
    .filter((c) => c.number >= 0)
    .sort((a, b) => a.number - b.number);
  const unknown = picked.filter((c) => c.number < 0).reverse();
  return [...known, ...unknown].slice(0, COUNT[pick]);
}

/**
 * The scanlator of the highest-numbered chapter read (≤ progress) or
 * downloaded; null if none.
 */
export function preferredScanlator(
  chapters: Chapter[],
  progress: number,
  downloadedHashes: Set<string>,
): string | null {
  let best: Chapter | null = null;
  for (const c of chapters) {
    if (c.number < 0) continue;
    const used = isRead(progress, c.number) || downloadedHashes.has(hashOf(c));
    if (used && (!best || c.number > best.number)) best = c;
  }
  return best?.scanlator ?? null;
}

/**
 * Whether any pick past `progress` has a chapter left (`unread`) and whether
 * All has (`missing`), from a source's stored list as it came: only unread
 * chapters are hashed, so a grid card can afford it. Numbers are the source's
 * own, as the card's +N reads them.
 */
type StoredChapter = { url: string; number: number };

// A card re-reads these on every render: a stored list is replaced, never
// edited, so its group count and each chapter's hash are worked out once.
const groupCounts = new WeakMap<StoredChapter[], number>();
const storedHashes = new WeakMap<StoredChapter, string>();

const storedHashOf = (chapter: StoredChapter) => {
  let hash = storedHashes.get(chapter);
  if (hash === undefined) {
    hash = chapterHash(chapter.url);
    storedHashes.set(chapter, hash);
  }
  return hash;
};

export function pickFlags(
  chapters: StoredChapter[],
  progress: number,
  downloadedHashes: Set<string>,
) {
  const covered = new Map<number, boolean>();
  for (const c of chapters) {
    if (!(c.number > progress) || covered.get(c.number)) continue;
    covered.set(c.number, downloadedHashes.has(storedHashOf(c)));
  }
  let groups = groupCounts.get(chapters);
  if (groups === undefined) {
    groups = new Set(chapters.map((c) => (c.number < 0 ? c.url : c.number)))
      .size;
    groupCounts.set(chapters, groups);
  }
  return {
    unread: [...covered.values()].some((done) => !done),
    missing: groups > downloadedHashes.size,
  };
}
