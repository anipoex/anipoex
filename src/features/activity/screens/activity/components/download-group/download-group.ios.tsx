import {
  Button,
  DisclosureGroup,
  HStack,
  SwipeActions,
  VStack,
} from "@expo/ui/swift-ui";
import {
  clipShape,
  foregroundStyle,
  frame,
  lineLimit,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { Computed } from "@legendapp/state/react";
import { memo } from "react";
import { ROW_FILL } from "@/components/native/swift-ui/constants";
import { Image } from "@/components/native/swift-ui/image";
import { Text } from "@/components/native/swift-ui/text";
import { Icons, sfSymbol } from "@/components/ui/icon";
import { ContextMenu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { useThemeColor } from "@/hooks/use-theme-color";
import { cancelGroupDownloads } from "../../utils/actions";
import { downloadGroupMenu } from "../../utils/row-menu";
import { expanded$ } from "../../utils/state";
import { DownloadItem } from "../download-item";
import type { DownloadGroupProps } from "./download-group";
import { useDownloadGroup } from "./hooks/use-download-group";

export const DownloadGroup = memo(function DownloadGroup({
  id,
}: DownloadGroupProps) {
  const { keys, title, cover, expanded, group, open, summary } =
    useDownloadGroup(id);
  const destructive = useThemeColor("destructive");

  return (
    <DisclosureGroup
      isExpanded={expanded}
      onIsExpandedChange={(open) => expanded$[id].set(open)}
    >
      <DisclosureGroup.Label>
        <SwipeActions>
          <ContextMenu items={downloadGroupMenu(group, { expanded, open })}>
            <HStack spacing={12} modifiers={ROW_FILL}>
              {cover ? (
                <Image
                  source={{ uri: cover }}
                  modifiers={[
                    frame({ width: 34, height: 48 }),
                    clipShape("roundedRectangle", 5),
                  ]}
                />
              ) : null}
              <VStack alignment="leading" spacing={4}>
                <Text weight="medium" modifiers={[lineLimit(1)]}>
                  {title}
                </Text>
                <Computed>
                  {() => {
                    const { value, line } = summary();
                    return (
                      <VStack alignment="leading" spacing={4}>
                        <Progress value={value} maxValue={1} size="sm" />
                        <Text
                          textStyle="subheadline"
                          modifiers={[foregroundStyle("secondary")]}
                        >
                          {line}
                        </Text>
                      </VStack>
                    );
                  }}
                </Computed>
              </VStack>
            </HStack>
          </ContextMenu>
          <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
            <Button
              label="Cancel"
              systemImage={sfSymbol(Icons.close)}
              modifiers={[tint(destructive)]}
              onPress={() =>
                cancelGroupDownloads(group.mangaId, group.sourceId)
              }
            />
          </SwipeActions.Actions>
        </SwipeActions>
      </DisclosureGroup.Label>
      {expanded && keys.map((key) => <DownloadItem key={key} id={key} />)}
    </DisclosureGroup>
  );
});
