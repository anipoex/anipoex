import type { QueuedDownload } from "@/features/downloads";
import type { ActiveMark } from "@/features/manga/state/active-scans";

export const isBusy = (m: ActiveMark) =>
  m.state === "pending" || m.state === "scanning";

/** A running manga's share of sources done, and its line. */
export function scanProgress(marks: ActiveMark[]) {
  const done = marks.filter((m) => !isBusy(m)).length;
  const found = marks.filter((m) => m.state === "found").length;
  return {
    value: marks.length ? done / marks.length : 0,
    line: `${done}/${marks.length} sources${found ? ` · ${found} found` : ""}`,
  };
}

/** A download group's share done, the mean of its chapters', and its line. */
export function groupProgress(
  source: string,
  chapters: { state: QueuedDownload["state"]; fraction: number }[],
) {
  const n = chapters.length;
  const failed = chapters.filter((c) => c.state === "failed").length;
  return {
    value: n ? chapters.reduce((sum, c) => sum + c.fraction, 0) / n : 0,
    line: `${source} · ${n} chapter${n === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}`,
  };
}

export type StatusTone = "success" | "warning" | "destructive" | "muted";

/** What a source's row shows at its end; scanning shows a spinner instead. */
export function sourceStatus(mark: ActiveMark): {
  label: string;
  tone: StatusTone;
} {
  switch (mark.state) {
    case "found":
      return {
        label: mark.unread ? `+${mark.unread}` : "Found",
        tone: "success",
      };
    case "error":
      return { label: "Error", tone: "destructive" };
    case "skipped":
      return { label: "Slow · skipped", tone: "warning" };
    case "stopped":
      return { label: "Stopped", tone: "muted" };
    case "nomatch":
      return { label: "No match", tone: "muted" };
    case "scanning":
      return { label: "Scanning", tone: "muted" };
    default:
      return { label: "Waiting", tone: "muted" };
  }
}
