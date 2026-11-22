import { Button, HStack, SwipeActions, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityValue,
  buttonStyle,
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
import { Icon, Icons, sfSymbol } from "@/components/ui/icon";
import { ContextMenu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { useThemeColor } from "@/hooks/use-theme-color";
import { cancelGroupDownloads } from "../../utils/actions";
import { downloadGroupMenu } from "../../utils/row-menu";
import { toggleExpanded } from "../../utils/state";
import type { DownloadGroupProps } from "./download-group";
import { useDownloadGroup } from "./hooks/use-download-group";

export const DownloadGroup = memo(function DownloadGroup({
  id,
}: DownloadGroupProps) {
  const { title, cover, expanded, group, open, summary } = useDownloadGroup(id);
  const destructive = useThemeColor("destructive");

  return (
    <SwipeActions>
      <ContextMenu items={downloadGroupMenu(group, { expanded, open })}>
        <Button
          onPress={() => toggleExpanded(id)}
          modifiers={[
            buttonStyle("plain"),
            accessibilityValue(expanded ? "Expanded" : "Collapsed"),
          ]}
        >
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
            <Icon
              name={expanded ? Icons.chevronDown : Icons.chevronRight}
              size={13}
              muted
            />
          </HStack>
        </Button>
      </ContextMenu>
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
        <Button
          label="Cancel"
          systemImage={sfSymbol(Icons.close)}
          modifiers={[tint(destructive)]}
          onPress={() => cancelGroupDownloads(group.mangaId, group.sourceId)}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
});
