import { Icons } from "@/components/ui/icon";
import type { ActivityFilter } from "@/features/activity/utils/filters";

export const FILTER_ICONS = {
  all: Icons.inbox,
  scans: Icons.scanList,
  downloads: Icons.downloadCircle,
  send: Icons.uploading,
  sync: Icons.cloudSync,
} satisfies Record<ActivityFilter, unknown>;
