import { Icons } from "@/components/ui/icon";
import type { MenuAction, MenuSubmenu } from "@/components/ui/menu";
import type { Chapter } from "@/features/manga/utils/to-chapters";
import { enqueue as enqueueDownloads } from "../state/download-queue";
import {
  cancelAllDownloads,
  cancelGroupDownloads,
  startDownloads,
} from "../state/run-downloads";
import { cancelQueueItems } from "./cancel-items";
import { chapterToQueued, deleteDownloads } from "./download-actions";
import {
  type DownloadPick,
  pickChapters,
  preferredScanlator,
} from "./pick-chapters";

const PICKS: { label: string; pick: DownloadPick }[] = [
  { label: "Next chapter", pick: "next" },
  { label: "Next 5", pick: "next5" },
  { label: "Next 10", pick: "next10" },
  { label: "Unread", pick: "unread" },
  { label: "All", pick: "all" },
];

const REMOVE_LABEL = "Delete downloads";

/** Download > All asks first when it would queue more chapters than this. */
export const CONFIRM_ALL_ABOVE = 50;

export interface DownloadMenuArgs {
  manga: { id: number; title: string; cover?: string };
  source: { id: string; name: string };
  /** Newest first, as the source lists them. */
  chapters: Chapter[];
  progress: number;
  downloadedHashes: Set<string>;
  /** Whether a chapter of this manga from this source is in the queue. */
  queued?: boolean;
  notify?: (message: string) => void;
  enqueue?: typeof enqueueDownloads;
  start?: () => void;
  remove?: typeof deleteDownloads;
}

export function downloadMenu({
  manga,
  source,
  chapters,
  progress,
  downloadedHashes,
  queued = false,
  notify,
  enqueue = enqueueDownloads,
  start = startDownloads,
  remove: removeDownloads = deleteDownloads,
}: DownloadMenuArgs): { menu: MenuSubmenu; remove: MenuAction } {
  const scanlator = preferredScanlator(chapters, progress, downloadedHashes);

  const items: MenuAction[] = PICKS.map(({ label, pick }) => {
    const picked = pickChapters(
      chapters,
      pick,
      progress,
      downloadedHashes,
      scanlator,
    );
    const row = {
      label,
      icon: Icons.download,
      disabled: picked.length === 0,
      onPress: () => {
        const n = enqueue(
          picked.map((chapter) => chapterToQueued(manga, source, chapter)),
        );
        if (n === 0) return;
        start();
        notify?.(`Downloading ${n} chapter${n === 1 ? "" : "s"}`);
      },
    };
    return pick === "all" && picked.length > CONFIRM_ALL_ABOVE
      ? {
          ...row,
          onPressMode: "dialog",
          dialogConfig: {
            title: `Download ${picked.length} chapters?`,
            description:
              "They take space on this device until you delete them.",
            confirmLabel: "Download",
          },
        }
      : row;
  });

  const remove: MenuAction = {
    label: REMOVE_LABEL,
    icon: Icons.trash,
    destructive: true,
    disabled: downloadedHashes.size === 0,
    onPressMode: "dialog",
    dialogConfig: {
      title: "Delete downloads?",
      description: "Removes this manga's downloaded chapters from this source.",
      confirmLabel: "Delete",
    },
    onPress: () => {
      removeDownloads(manga.id, source.id, [...downloadedHashes]).catch(() =>
        notify?.("Couldn't delete the downloads"),
      );
    },
  };

  const cancel = queued
    ? cancelQueueItems(
        () => cancelGroupDownloads(manga.id, source.id),
        cancelAllDownloads,
      )
    : [];

  return {
    menu: { label: "Download", items: [...items, ...cancel, remove] },
    remove,
  };
}

/**
 * The same submenu for a row that can't afford the chapters at render (a grid
 * card: reading each card's stored list parses it whole): a row builds the
 * menu from `args()` when pressed and hands one that confirms first to
 * `confirm`. Rows wait on counts instead: `unread` chapters for the picks
 * past progress, any `missing` for All, any `downloaded` for Delete.
 * shortcut: counts, not the list, so a pick whose chapters are all downloaded
 * stays enabled and says "Nothing to download"; read the list if that confuses.
 */
export function deferredDownloadMenu(
  args: () => DownloadMenuArgs | undefined,
  {
    unread,
    missing,
    downloaded,
  }: { unread: boolean; missing: boolean; downloaded: boolean },
  confirm: (row: MenuAction) => void,
): MenuSubmenu {
  const press = (label: string) => () => {
    const built = args();
    const row = built
      ? downloadMenu(built).menu.items.find((item) => item.label === label)
      : undefined;
    if (!built || !row) return;
    if (row.disabled)
      built.notify?.(
        row.destructive
          ? "No downloads here"
          : built.chapters.length === 0
            ? "Open this manga once to load its chapters"
            : "Nothing to download",
      );
    else if (row.onPressMode === "dialog") confirm(row);
    else row.onPress();
  };

  return {
    label: "Download",
    items: [
      ...PICKS.map(({ label, pick }) => ({
        label,
        icon: Icons.download,
        disabled: !(pick === "all" ? missing : unread),
        onPress: press(label),
      })),
      {
        label: REMOVE_LABEL,
        icon: Icons.trash,
        destructive: true,
        disabled: !downloaded,
        onPress: press(REMOVE_LABEL),
      },
    ],
  };
}
