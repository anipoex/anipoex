import type { QueuedDownload } from "@/features/downloads";

/** The chapter as the source names it, or its number when it has no name. */
export const chapterLabel = (number: number, name: string) =>
  name || (number >= 0 ? `Chapter ${number}` : "Chapter");

/** Under the chapter when it isn't running: its state. */
export function downloadLine(
  state: QueuedDownload["state"],
  error: string | undefined,
  paused: boolean,
) {
  if (state === "failed") return error || "Failed";
  return state === "paused" || paused ? "Paused" : "Queued";
}
