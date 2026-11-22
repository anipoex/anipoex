import type { MenuItemDialogConfig } from "@/components/ui/menu";
import {
  cancelAllDownloads,
  pauseDownloads,
  resumeDownloads,
  retryAllDownloads,
} from "@/features/downloads";
import { CANCEL_ALL_DIALOG } from "@/features/downloads/utils/cancel-items";

export interface HeaderAction {
  label: string;
  onPress: () => void;
  /** A destructive action: runs `onPress` only once this dialog confirms. */
  confirm?: MenuItemDialogConfig;
}

/**
 * The Downloads header's buttons: Retry all once one failed, Pause or Resume,
 * and Cancel all.
 */
export function downloadActions(
  paused: boolean,
  pending: boolean,
  failed: boolean,
): HeaderAction[] {
  const actions: HeaderAction[] = [];
  if (failed) actions.push({ label: "Retry all", onPress: retryAllDownloads });
  if (paused) actions.push({ label: "Resume", onPress: resumeDownloads });
  else if (pending) actions.push({ label: "Pause", onPress: pauseDownloads });
  actions.push({
    label: "Cancel all",
    onPress: cancelAllDownloads,
    confirm: CANCEL_ALL_DIALOG,
  });
  return actions;
}
