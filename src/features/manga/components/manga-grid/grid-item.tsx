import { useFragment } from "@apollo/client/react";
import { useValue } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { memo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icon";
import {
  ContextMenu,
  type MenuAction,
  type MenuItem,
} from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { downloaded$, mangaDownloads } from "@/features/downloads";
import {
  type DownloadMenuArgs,
  deferredDownloadMenu,
} from "@/features/downloads/utils/download-menu";
import { pickFlags } from "@/features/downloads/utils/pick-chapters";
import {
  installed$,
  isRuntimeAvailable,
  toSources,
} from "@/features/extensions";
import {
  MangaCard,
  type TitlePosition,
} from "@/features/manga/components/manga-card";
import { PUBLICATION_STATUSES } from "@/features/manga/constants";
import { MangaMediaFragmentDoc } from "@/features/manga/graphql/manga-fragments.generated";
import { useUnreadCount } from "@/features/manga/hooks/use-unread-count";
import { chapters$, chaptersKey } from "@/features/manga/state/chapters";
import { scanManga } from "@/features/manga/state/library-scan";
import { isScanBusy } from "@/features/manga/state/probes";
import { source$ } from "@/features/manga/state/source";
import { mediaKey } from "@/features/manga/utils/msu";
import { toProgress } from "@/features/manga/utils/progress";
import { readMatch } from "@/features/manga/utils/source-match";
import { toChapters } from "@/features/manga/utils/to-chapters";
import type { MangaEntry } from "@/features/manga/utils/to-entries";
import { MediaStatus } from "@/graphql/types.generated";
import { shareUrl } from "@/utils/copy-url";
import { openExternal } from "@/utils/open-external";

/**
 * Progress from the cache, so it updates without a refetch: shown, spoken,
 * and the chapters left in the chosen source.
 */
function useProgress({
  id,
  __typename,
}: Pick<MangaEntry, "id" | "__typename">) {
  const { data } = useFragment({
    fragment: MangaMediaFragmentDoc,
    fragmentName: "MangaMedia",
    from: { __typename, id },
  });
  const read = data.mediaListEntry?.progress ?? 0;
  const unread = useUnreadCount(id, read);
  if (!data.mediaListEntry) {
    return {
      label: undefined,
      spoken: undefined,
      fraction: undefined,
      unread,
      read,
    };
  }
  return { ...toProgress(read, data.chapters), unread, read };
}

/**
 * Which Download rows have something to take: "unread", "missing" (All), or
 * both; "" with no matched source. A list not stored yet leaves them on, and
 * pressing one says to open the manga.
 */
function downloadFlags(mangaId: number, progress: number) {
  const match = readMatch(source$[mangaId].get());
  if (!match?.manga) return "";
  const key = chaptersKey(mangaId, match.sourceId);
  const stored = chapters$[key].get();
  if (stored?.manga.url !== match.manga.url) return "unread missing";
  const { unread, missing } = pickFlags(
    stored.chapters,
    stored.manga.title,
    progress,
    new Set(Object.keys(downloaded$[key].get() ?? {})),
  );
  return `${unread ? "unread" : ""} ${missing ? "missing" : ""}`;
}

/** What the Download rows need, read when one is pressed. */
function downloadArgs(
  item: MangaEntry,
  progress: number,
): DownloadMenuArgs | undefined {
  const match = readMatch(source$[item.id].peek());
  if (!match?.manga) return undefined;
  const key = chaptersKey(item.id, match.sourceId);
  const stored = chapters$[key].peek();
  const source = toSources(installed$.peek(), { all: true }).find(
    ({ id }) => id === match.sourceId,
  );
  return {
    manga: {
      id: item.id,
      title: item.title?.userPreferred ?? "",
      cover: item.coverImage?.extraLarge ?? item.coverImage?.large ?? undefined,
    },
    source: { id: match.sourceId, name: source?.name ?? match.sourceId },
    // None stored leaves the picks empty; Delete needs only the downloads.
    chapters:
      stored?.manga.url === match.manga.url
        ? toChapters(stored.chapters, match.manga.title)
        : [],
    progress,
    downloadedHashes: new Set(Object.keys(downloaded$[key].peek() ?? {})),
    notify: toast,
  };
}

/**
 * On native it navigates on press, since `Link.Trigger` can't live in the
 * grid's Host. The label is a string: native `Text` drops component children.
 */
export const GridItem = memo(function GridItem({
  item,
  titlePosition,
  width,
}: {
  item: MangaEntry;
  titlePosition?: TitlePosition;
  /** Required in the native grids: the card's height comes from it. */
  width?: number;
}) {
  const router = useRouter();
  const progress = useProgress(item);
  // Any scan of the manga: a Scan all, a rescan or a title match.
  const scanning = useValue(() => isScanBusy(mediaKey(item.id)));
  const downloads = useValue(() => mangaDownloads(item.id));
  const flags = useValue(() => downloadFlags(item.id, progress.read));
  // A row's dialog is known only once pressed, so the menu can't arm it.
  const [confirming, setConfirming] = useState<MenuAction | null>(null);
  const title = item.title?.userPreferred;

  const card = (
    <MangaCard
      style={width ? { width } : undefined}
      cover={item.coverImage?.medium}
      coverColor={item.coverImage?.color}
      // Most of a list is still releasing: only the exceptions get a tag.
      status={item.status === MediaStatus.Releasing ? undefined : item.status}
      title={title}
      label={progress.label}
      progress={progress.fraction}
      unread={progress.unread}
      downloads={downloads}
      scanning={scanning}
      titlePosition={titlePosition}
      tilt
      // The badge is a letter and the label a fraction: say both in words.
      accessibilityLabel={[
        title,
        item.status && PUBLICATION_STATUSES[item.status],
        progress.spoken,
        progress.unread === 0
          ? "up to date"
          : progress.unread && `${progress.unread} unread`,
        downloads > 0 && `${downloads} downloaded`,
        scanning && "scanning sources",
      ]
        .filter(Boolean)
        .join(", ")}
      testID={`manga-card-${item.id}`}
      onPress={() => router.push(`/manga/${item.id}`)}
    />
  );

  const url = `https://anilist.co/manga/${item.id}`;
  const config =
    confirming?.onPressMode === "dialog" ? confirming.dialogConfig : undefined;
  // manga-detail's More menu, after the Reading toolbar's scan for this manga
  // alone; a plain browser has no sources, so neither scans nor downloads.
  const items: MenuItem[] = [
    ...(isRuntimeAvailable
      ? [
          {
            heading: title ?? undefined,
            items: [
              {
                label: "Scan for new chapters",
                icon: Icons.scanList,
                disabled: scanning,
                onPress: () => void scanManga(item, progress.read),
              },
              {
                label: "Rescan everything",
                icon: Icons.refresh,
                disabled: scanning,
                onPress: () =>
                  void scanManga(item, progress.read, { everything: true }),
              },
            ],
          },
        ]
      : []),
    { label: "Share", icon: Icons.share, onPress: () => shareUrl(url) },
    ...(isRuntimeAvailable && flags
      ? [
          deferredDownloadMenu(
            () => downloadArgs(item, progress.read),
            {
              unread: flags.includes("unread"),
              missing: flags.includes("missing"),
              downloaded: downloads > 0,
            },
            setConfirming,
          ),
        ]
      : []),
    {
      label: "History",
      icon: Icons.history,
      onPress: () =>
        router.push({
          pathname: "/manga/history",
          params: { mediaId: item.id },
        }),
    },
    {
      label: "View on AniList",
      icon: Icons.openExternal,
      onPress: () => openExternal(url),
    },
  ];

  // The menu is the dialog's trigger, as the house menu hangs its own: a
  // sibling would be another cell in a SwiftUI grid.
  return (
    <Dialog
      title={config?.title ?? ""}
      description={config?.description}
      confirmLabel={config?.confirmLabel ?? ""}
      role={confirming?.destructive ? "destructive" : undefined}
      onConfirm={() => confirming?.onPress()}
      open={!!config}
      onOpenChange={(open) => !open && setConfirming(null)}
      alert
    >
      <Dialog.Trigger>
        <ContextMenu items={items}>{card}</ContextMenu>
      </Dialog.Trigger>
    </Dialog>
  );
});
