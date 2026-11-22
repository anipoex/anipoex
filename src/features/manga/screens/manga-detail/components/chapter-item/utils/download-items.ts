import { Icons } from "@/components/ui/icon";
import type {
  MenuAction,
  MenuItem,
  MenuItemDialogConfig,
} from "@/components/ui/menu";
import type { DownloadState } from "@/features/downloads";
import { cancelQueueItems } from "@/features/downloads/utils/cancel-items";

export const DELETE_DIALOG: MenuItemDialogConfig = {
  title: "Delete download",
  description: "Delete this chapter's download?",
  confirmLabel: "Delete",
};

const LABELS: Record<DownloadState, string> = {
  none: "Download chapter",
  queued: "Download queued: chapter",
  running: "Downloading chapter",
  paused: "Resume download of chapter",
  failed: "Retry download of chapter",
  local: "Downloaded chapter",
  cloud: "In the cloud: chapter",
};

/** Running and paused draw their progress instead. */
export const STATE_ICONS = {
  none: Icons.download,
  queued: Icons.hourglass,
  failed: Icons.error,
  local: Icons.downloaded,
  cloud: Icons.cloud,
};

/** The row button's accessibility label. */
export const downloadLabel = (state: DownloadState, title: string) =>
  `${LABELS[state]} ${title}`;

export interface DownloadActions {
  download: () => void;
  cancel: () => void;
  retry: () => void;
  pause: () => void;
  resume: () => void;
  remove: () => void;
  /** This manga's chapters from this source. */
  cancelGroup: () => void;
  cancelAll: () => void;
}

/** `confirm: false` leaves the dialog to the caller (an iOS swipe opens it too). */
export function deleteItem(onPress: () => void, confirm = true): MenuAction {
  const row = {
    label: "Delete download",
    icon: Icons.trash,
    destructive: true,
    onPress,
  };
  return confirm
    ? { ...row, onPressMode: "dialog", dialogConfig: DELETE_DIALOG }
    : row;
}

/** The chapter's own rows in this state: an iOS swipe shows these. */
export function chapterItems(
  state: DownloadState,
  actions: DownloadActions,
  confirm = true,
): MenuAction[] {
  const cancel = {
    label: "Cancel download",
    icon: Icons.close,
    onPress: actions.cancel,
  };
  switch (state) {
    case "none":
      return [
        { label: "Download", icon: Icons.download, onPress: actions.download },
      ];
    case "queued":
      return [cancel];
    case "running":
      return [
        { label: "Pause download", icon: Icons.pause, onPress: actions.pause },
        cancel,
      ];
    case "paused":
      return [
        { label: "Resume download", icon: Icons.play, onPress: actions.resume },
        cancel,
      ];
    case "failed":
      return [
        {
          label: "Retry download",
          icon: Icons.refresh,
          onPress: actions.retry,
        },
        cancel,
      ];
    default:
      return [deleteItem(actions.remove, confirm)];
  }
}

/**
 * The long-press menu: the chapter's rows and, while it's in the queue, a
 * group to cancel its manga's chapters or the whole queue.
 */
export function downloadItems(
  state: DownloadState,
  actions: DownloadActions,
  confirm = true,
): MenuItem[] {
  const own = chapterItems(state, actions, confirm);
  if (state === "none" || state === "local" || state === "cloud") return own;
  return [
    ...own,
    { items: cancelQueueItems(actions.cancelGroup, actions.cancelAll) },
  ];
}
