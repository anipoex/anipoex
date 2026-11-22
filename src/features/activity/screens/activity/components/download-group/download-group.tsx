import { Computed } from "@legendapp/state/react";
import { Image } from "expo-image";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { memo } from "react";
import { View } from "react-native";
import { Icon, Icons } from "@/components/ui/icon";
import { ContextMenu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { cancelGroupDownloads } from "../../utils/actions";
import { downloadGroupMenu } from "../../utils/row-menu";
import { toggleExpanded } from "../../utils/state";
import { useDownloadGroup } from "./hooks/use-download-group";

export interface DownloadGroupProps {
  /** `mangaId/sourceId`. */
  id: string;
  /**
   * Its place in the section, for its corners.
   * @platform android
   */
  index?: number;
  /** @platform android */
  count?: number;
}

/** One manga's downloads from one source; a tap lists its chapters under it. */
export const DownloadGroup = memo(function DownloadGroup({
  id,
}: DownloadGroupProps) {
  const { title, cover, expanded, group, open, summary } = useDownloadGroup(id);

  return (
    <View>
      <ContextMenu items={downloadGroupMenu(group, { expanded, open })}>
        <Frame.Row
          onClick={() => toggleExpanded(id)}
          aria-expanded={expanded}
          className="pe-27"
        >
          <Frame.Media>
            <Image
              source={cover}
              contentFit="cover"
              className="aspect-2/3 w-8 rounded-sm"
            />
          </Frame.Media>
          <Frame.Content>
            <Frame.Title as="p">{title}</Frame.Title>
            <Computed>
              {() => {
                const { value, line } = summary();
                return (
                  <Progress label={line} value={value} maxValue={1} size="sm" />
                );
              }}
            </Computed>
          </Frame.Content>
        </Frame.Row>
      </ContextMenu>
      <Frame.Actions className="absolute inset-y-0 inset-e-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={open}
          aria-label={`Open ${title}`}
        >
          <Icon name={Icons.openExternal} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => cancelGroupDownloads(group.mangaId, group.sourceId)}
          aria-label={`Cancel ${title}'s downloads`}
        >
          <Icon name={Icons.close} className="text-destructive" />
        </Button>
      </Frame.Actions>
    </View>
  );
});
