import { router, Stack } from "expo-router";
import { useState } from "react";
import { Toolbar } from "@/components/layout/toolbar";
import { Dialog } from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icon";
import type { MenuAction } from "@/components/ui/menu";
import type { SourceMatch } from "@/features/manga/utils/source-match";
import type { Chapter } from "@/features/manga/utils/to-chapters";
import type { MangaDetail } from "@/features/manga/utils/to-detail";
import { useThemeColor } from "@/hooks/use-theme-color";
import { shareUrl } from "@/utils/copy-url";
import { openExternal } from "@/utils/open-external";
import { useDownloadMenu } from "./hooks/use-download-menu";

interface DetailToolbarProps {
  id: string;
  manga: MangaDetail;
  chapters: Chapter[];
  match: SourceMatch | undefined;
  sourceName: string;
  refreshing: boolean;
  onRefresh: () => void;
}

/** Its own component: a download finishing rebuilds only the header. */
export function DetailToolbar({
  id,
  manga,
  chapters,
  match,
  sourceName,
  refreshing,
  onRefresh,
}: DetailToolbarProps) {
  const mutedForeground = useThemeColor("muted-foreground");
  const download = useDownloadMenu(manga, chapters, match, sourceName);
  // A toolbar menu can't hang a dialog: confirming rows open this one.
  const [confirming, setConfirming] = useState<MenuAction | null>(null);
  const config =
    confirming?.onPressMode === "dialog" ? confirming.dialogConfig : undefined;
  const url = `https://anilist.co/manga/${id}`;

  return (
    <>
      <Toolbar loading={refreshing}>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={Icons.refresh}
            onPress={onRefresh}
            disabled={refreshing}
            tintColor={refreshing ? mutedForeground : undefined}
            accessibilityLabel="Refresh"
          />
          <Stack.Toolbar.Menu
            icon={Icons.more}
            accessibilityLabel="More options"
          >
            <Stack.Toolbar.MenuAction
              icon={Icons.share}
              onPress={() => shareUrl(url)}
            >
              Share
            </Stack.Toolbar.MenuAction>
            {download && (
              <Stack.Toolbar.Menu
                title={download.menu.label}
                icon={Icons.download}
              >
                {download.menu.items.map((item) => (
                  <Stack.Toolbar.MenuAction
                    key={item.label}
                    // From `Icons`, typed as the menu's wider `IconName`.
                    icon={item.icon as typeof Icons.download}
                    destructive={item.destructive}
                    disabled={item.disabled}
                    onPress={
                      item.onPressMode === "dialog"
                        ? () => setConfirming(item)
                        : item.onPress
                    }
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                ))}
              </Stack.Toolbar.Menu>
            )}
            <Stack.Toolbar.MenuAction
              icon={Icons.history}
              onPress={() =>
                router.push({
                  pathname: "/manga/history",
                  params: { mediaId: id },
                })
              }
            >
              History
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={Icons.openExternal}
              onPress={() => openExternal(url)}
            >
              {/* The destination names itself better than "Website" did. */}
              View on AniList
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Toolbar>
      {download && (
        <Dialog
          open={!!config}
          onOpenChange={(open) => !open && setConfirming(null)}
          title={config?.title ?? ""}
          description={config?.description}
          confirmLabel={config?.confirmLabel ?? ""}
          role={confirming?.destructive ? "destructive" : undefined}
          onConfirm={() => confirming?.onPress()}
        />
      )}
    </>
  );
}
