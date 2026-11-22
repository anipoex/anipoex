import { Icons } from "@/components/ui/icon";
import type { MenuAction, MenuItemDialogConfig } from "@/components/ui/menu";

/** Cancel all asks first wherever it's offered. */
export const CANCEL_ALL_DIALOG: MenuItemDialogConfig = {
  title: "Cancel all downloads?",
  description: "Every chapter leaves the download queue, from every manga.",
  confirmLabel: "Cancel all",
};

/** One manga's queued chapters from its source, then the whole queue, which asks first. */
export function cancelQueueItems(
  cancelGroup: () => void,
  cancelAll: () => void,
): MenuAction[] {
  return [
    {
      label: "Cancel this manga's downloads",
      icon: Icons.close,
      destructive: true,
      onPress: cancelGroup,
    },
    {
      label: "Cancel all downloads",
      icon: Icons.closeCircle,
      destructive: true,
      onPressMode: "dialog",
      dialogConfig: CANCEL_ALL_DIALOG,
      onPress: cancelAll,
    },
  ];
}
