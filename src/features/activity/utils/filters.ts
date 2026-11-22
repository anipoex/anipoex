export const ACTIVITY_FILTERS = [
  "all",
  "scans",
  "downloads",
  "send",
  "sync",
] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const FILTER_TITLES: Record<ActivityFilter, string> = {
  all: "All",
  scans: "Scans",
  downloads: "Downloads",
  send: "To send",
  sync: "Sync",
};

export const activityCount = (count: number) =>
  `${count} ${count === 1 ? "activity" : "activities"}`;

export function parseFilter(param: string | undefined): ActivityFilter {
  return ACTIVITY_FILTERS.find((filter) => filter === param) ?? "all";
}

// Display order; each belongs to one filter.
export const SECTIONS = [
  "running",
  "queue",
  "downloads",
  "skipped",
  "entries",
  "unsent",
  "sync",
] as const;
export type ActivitySection = (typeof SECTIONS)[number];

export const SECTION_FILTER: Record<
  ActivitySection,
  Exclude<ActivityFilter, "all">
> = {
  running: "scans",
  queue: "scans",
  skipped: "scans",
  downloads: "downloads",
  entries: "send",
  unsent: "send",
  sync: "sync",
};

export type ActivityIds = Record<ActivitySection, string[]>;
export type ActivityCounts = Record<ActivityFilter, number>;

// Skipped sources are listed but never counted: they are not work in flight.
export function countsOf(ids: ActivityIds): ActivityCounts {
  const scans = ids.running.length + ids.queue.length;
  const send = ids.entries.length + ids.unsent.length;
  const downloads = ids.downloads.length;
  const sync = ids.sync.length;
  return { all: scans + downloads + send + sync, scans, downloads, send, sync };
}

export function visibleSections(
  ids: ActivityIds,
  filter: ActivityFilter,
): ActivitySection[] {
  return SECTIONS.filter(
    (section) =>
      ids[section].length > 0 &&
      (filter === "all" || SECTION_FILTER[section] === filter),
  );
}

export type ActivityItemRow =
  | {
      kind: "item";
      key: string;
      section: ActivitySection;
      id: string;
      index: number;
      count: number;
      /** The section's last row: no open group's rows follow it. */
      last: boolean;
    }
  | {
      /**
       * A row of an open group, right under it: a download group's chapter
       * (its key), or a running manga's source (`mangaId/sourceId`).
       */
      kind: "child";
      key: string;
      section: GroupSection;
      id: string;
      /** Its place in its group. */
      index: number;
      count: number;
      last: boolean;
    };

/** The sections whose rows open into rows of their own. */
export type GroupSection = "downloads" | "running";

export type ActivityRow =
  | { kind: "header"; key: string; section: ActivitySection; count: number }
  | ActivityItemRow;

/** Each open group's child ids, by its row's id. */
export type OpenGroups = Record<string, string[]>;

// Keys carry the section: one manga can sit in two sections at once.
export function toRows(
  ids: ActivityIds,
  filter: ActivityFilter,
  open: OpenGroups = {},
): ActivityRow[] {
  return visibleSections(ids, filter).flatMap((section): ActivityRow[] => [
    {
      kind: "header",
      key: `header-${section}`,
      section,
      count: ids[section].length,
    },
    ...sectionRows(section, ids[section], open),
  ]);
}

/** A section's rows: an open group's rows follow it. */
export function sectionRows(
  section: ActivitySection,
  list: string[],
  open: OpenGroups = {},
): ActivityItemRow[] {
  return list.flatMap((id, index): ActivityItemRow[] => {
    const children =
      ((section === "downloads" || section === "running") && open[id]) || [];
    const end = index === list.length - 1;
    return [
      {
        kind: "item",
        key: `${section}:${id}`,
        section,
        id,
        index,
        count: list.length,
        last: end && children.length === 0,
      },
      ...children.map(
        (child, i): ActivityItemRow => ({
          kind: "child",
          key: `child:${section}:${child}`,
          section: section as GroupSection,
          id: child,
          index: i,
          count: children.length,
          last: end && i === children.length - 1,
        }),
      ),
    ];
  });
}

export function headerIndices(rows: ActivityRow[]): number[] {
  return rows.flatMap((row, index) => (row.kind === "header" ? [index] : []));
}

// A status card over no rows still counts as "filter": the screen shows
// "Nothing here" under it, never the global empty state.
export function emptyKind(
  ids: ActivityIds,
  filter: ActivityFilter,
  statusShown: boolean,
): "all" | "filter" | null {
  if (visibleSections(ids, "all").length === 0 && !statusShown) return "all";
  return visibleSections(ids, filter).length === 0 ? "filter" : null;
}
