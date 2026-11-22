import { Icons } from "@/components/ui/icon";
import { MediaListStatus } from "@/graphql/types.generated";

/** Each list's icon in the list menu. */
export const LIST_ICONS = {
  [MediaListStatus.Current]: Icons.cover,
  [MediaListStatus.Planning]: Icons.bookmark,
  [MediaListStatus.Completed]: Icons.checkCircle,
  [MediaListStatus.Paused]: Icons.pauseCircle,
  [MediaListStatus.Dropped]: Icons.closeCircle,
  [MediaListStatus.Repeating]: Icons.repeat,
} satisfies Record<MediaListStatus, unknown>;
