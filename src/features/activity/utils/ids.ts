import { downloadQueue$, type QueuedDownload } from "@/features/downloads";
import { activeScans$ } from "@/features/manga/state/active-scans";
import {
  readingQueue$,
  readingRun$,
} from "@/features/manga/state/reading-queue";

/** Every download, in queue order. */
export const downloads = () =>
  Object.values(downloadQueue$.get()).sort((a, b) => a.order - b.order);

/** `mangaId/sourceId`: one manga's downloads from one source. */
const groupOf = (d: QueuedDownload) => `${d.manga.id}/${d.source.id}`;

/** Each download group, in the order of its first chapter, joined. */
export const downloadIds = () => [...new Set(downloads().map(groupOf))].join();

/** A group's download keys in queue order, joined. */
export const groupDownloadIds = (group: string) =>
  downloads()
    .filter((d) => groupOf(d) === group)
    .map((d) => d.key)
    .join();

/** The running manga's ids, joined: changes only when one starts or ends. */
export const runningIds = () => Object.keys(activeScans$.get(true)).join();

/** The queued manga's ids in order, joined. */
export const queuedIds = () =>
  Object.values(readingQueue$.get())
    .filter((m) => m.state === "queued")
    .sort((a, b) => a.order - b.order)
    .map((m) => m.id)
    .join();

/** The sources skipped as slow, joined. */
export const skippedIds = () =>
  Object.keys(readingRun$.skipped.get(true) ?? {}).join();
