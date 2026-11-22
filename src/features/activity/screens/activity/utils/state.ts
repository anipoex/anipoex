import { observable } from "@legendapp/state";
import type {
  GroupSection,
  OpenGroups,
} from "@/features/activity/utils/filters";
import {
  downloadIds,
  downloads,
  groupDownloadIds,
  runningIds,
} from "@/features/activity/utils/ids";
import { split } from "@/features/activity/utils/state";
import { downloadQueue$ } from "@/features/downloads";
import { activeScans$ } from "@/features/manga/state/active-scans";
import { readingRun$ } from "@/features/manga/state/reading-queue";

/**
 * The rows that show what's under them: a running manga's sources by manga
 * id, a download group's chapters by group id; not persisted.
 */
export const expanded$ = observable<Record<string, boolean>>({});

export const toggleExpanded = (id: number | string) =>
  expanded$[id].set((open) => !open);

const sourceIds = (mangaId: string) =>
  Object.keys(activeScans$[mangaId].marks.get(true) ?? {})
    .map((sourceId) => `${mangaId}/${sourceId}`)
    .join();

/**
 * Each open group and its child ids, `id:child,child`, joined by `;`: a
 * download group's chapter keys, a running manga's `mangaId/sourceId`s. The
 * list's rows change only when a group opens, closes or changes.
 */
export const openGroupIds = (section?: GroupSection) =>
  [
    ...(section !== "running"
      ? split(downloadIds())
          .filter((group) => expanded$[group].get())
          .map((group) => `${group}:${groupDownloadIds(group)}`)
      : []),
    ...(section !== "downloads"
      ? split(runningIds())
          .filter((mangaId) => expanded$[mangaId].get())
          .map((mangaId) => `${mangaId}:${sourceIds(mangaId)}`)
      : []),
  ].join(";");

/** A running source row's id, `mangaId/sourceId`, as SourceItem's props. */
export const sourceOf = (id: string) => {
  const at = id.indexOf("/");
  return { mangaId: id.slice(0, at), sourceId: id.slice(at + 1) };
};

export const openGroups = (ids: string): OpenGroups =>
  Object.fromEntries(
    (ids ? ids.split(";") : []).map((open) => {
      const at = open.indexOf(":");
      return [open.slice(0, at), split(open.slice(at + 1))];
    }),
  );

/** Whether a scan runs: of any manga, or the Reading scan. */
export const hasScans = () =>
  Object.keys(activeScans$.get(true)).length > 0 ||
  readingRun$.get(true) != null;

export const downloadsFailed = () =>
  downloads().some((d) => d.state === "failed");

/** Whether a queued download comes before this queued one. */
export const canMoveUp = (key: string) =>
  downloadQueue$[key].state.get() === "queued" &&
  downloadsView$.firstQueued.get() !== key;

/**
 * Computed once per queue change, so each row's check stays O(1). Empty when
 * nothing is queued: an optional result types as a lookup, with no `get`.
 */
export const downloadsView$ = observable({
  firstQueued: (): string => {
    let first: { key: string; order: number } | undefined;
    for (const d of Object.values(downloadQueue$.get()))
      if (d.state === "queued" && (!first || d.order < first.order)) first = d;
    return first?.key ?? "";
  },
});
