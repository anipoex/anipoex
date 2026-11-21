import { useValue } from "@legendapp/state/react";
import { Typography } from "panelui-native/components/typography";
import { Button } from "panelui-web/button";
import { Sheet } from "panelui-web/sheet";
import { View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Progress } from "@/components/ui/progress";
import { desktop } from "@/utils/desktop";
import { openExternal } from "@/utils/open-external";
import { installUpdate, updates$ } from "../../state/updates";
import { ReleaseNotes } from "./release-notes";
import { megabytes } from "./utils";

const close = () => updates$.open.set(false);

/** The desktop app's update offer; a browser always runs the latest. */
export function UpdateSheet() {
  const open = useValue(updates$.open);
  const update = useValue(updates$.available);
  const progress = useValue(updates$.progress);
  const error = useValue(updates$.error);

  if (!desktop) return null;
  return (
    <BottomSheet isPresented={open && !!update} onDismiss={close}>
      {update ? (
        <>
          <Sheet.Header
            title="Update available"
            description={`Anipoex ${update.version} · ${megabytes(update.fileSize)}`}
            className="p-4"
          />
          <Sheet.Body className="min-w-0! px-4 pb-4">
            {/* The body's own children don't take a gap. */}
            <View className="gap-4">
              {progress === undefined ? (
                <View className="flex-row gap-2">
                  <Button onClick={() => void installUpdate()}>
                    Update and restart
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => openExternal(update.url)}
                  >
                    View on GitHub
                  </Button>
                </View>
              ) : (
                <View className="gap-2">
                  <Typography type="body-sm" muted>
                    {progress < 1
                      ? `Downloading… ${Math.round(progress * 100)}%`
                      : "Installing…"}
                  </Typography>
                  <Progress value={progress * 100} />
                </View>
              )}
              {error ? (
                <Typography type="body-sm" className="text-destructive">
                  {error}
                </Typography>
              ) : null}
              <ReleaseNotes markdown={update.notes} />
            </View>
          </Sheet.Body>
        </>
      ) : null}
    </BottomSheet>
  );
}
