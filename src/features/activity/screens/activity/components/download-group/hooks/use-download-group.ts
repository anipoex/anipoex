import { useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { groupDownloadIds } from "@/features/activity/utils/ids";
import { split } from "@/features/activity/utils/state";
import { downloadFraction, downloadQueue$ } from "@/features/downloads";
import { groupProgress } from "../../../utils/progress";
import { expanded$ } from "../../../utils/state";

/** A download group's leaves; `summary` reads the progress, for a `Computed`. */
export function useDownloadGroup(id: string) {
  const keys = split(useValue(() => groupDownloadIds(id)));
  const first$ = downloadQueue$[keys[0] ?? ""];
  const title = useValue(() => first$.manga.title.get()) ?? "";
  const cover = useValue(() => first$.manga.cover.get());
  const source = useValue(() => first$.source.name.get()) ?? "";
  const expanded = useValue(() => !!expanded$[id].get());
  const slash = id.indexOf("/");
  const mangaId = Number(id.slice(0, slash));

  return {
    title,
    cover,
    expanded,
    group: { id, mangaId, sourceId: id.slice(slash + 1) },
    open: () => router.navigate(`/manga/${mangaId}`),
    summary: () =>
      groupProgress(
        source,
        keys.map((key) => ({
          state: downloadQueue$[key].state.get() ?? "queued",
          fraction: downloadFraction(key),
        })),
      ),
  };
}
