import { Icons } from "@/components/ui/icon";
import type { ExtensionFilter } from "@/features/extensions";

export const FILTER_ICONS = {
  all: Icons.extension,
  installed: Icons.checkCircle,
  available: Icons.downloadCircle,
  updates: Icons.update,
} satisfies Record<ExtensionFilter, unknown>;
