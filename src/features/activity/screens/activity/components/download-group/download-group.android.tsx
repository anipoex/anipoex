import { Box, Column } from "@expo/ui/jetpack-compose";
import {
  clip,
  padding,
  Shapes,
  size,
} from "@expo/ui/jetpack-compose/modifiers";
import { Computed } from "@legendapp/state/react";
import { memo } from "react";
import { GUTTER } from "@/components/native/constants";
import { Image } from "@/components/native/jetpack-compose/image";
import {
  SEGMENTED_GAP,
  SegmentedListItem,
} from "@/components/native/jetpack-compose/segmented-list-item";
import { Text } from "@/components/native/jetpack-compose/text";
import { Icon, Icons } from "@/components/ui/icon";
import { ContextMenu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { useThemeM3Colors } from "@/hooks/use-theme/use-theme.android";
import { downloadGroupMenu } from "../../utils/row-menu";
import { toggleExpanded } from "../../utils/state";
import type { DownloadGroupProps } from "./download-group";
import { useDownloadGroup } from "./hooks/use-download-group";

export const DownloadGroup = memo(function DownloadGroup({
  id,
  index = 0,
  count = 1,
}: DownloadGroupProps) {
  const { title, cover, expanded, group, open, summary } = useDownloadGroup(id);
  const m3 = useThemeM3Colors();

  return (
    <Box
      modifiers={[padding(GUTTER, index > 0 ? SEGMENTED_GAP : 0, GUTTER, 0)]}
    >
      <ContextMenu items={downloadGroupMenu(group, { expanded, open })}>
        <SegmentedListItem
          index={index}
          count={count}
          colors={{ containerColor: m3.surfaceContainerHigh }}
          onPress={() => toggleExpanded(id)}
        >
          <SegmentedListItem.Leading>
            {cover ? (
              <Image
                source={{ uri: cover }}
                modifiers={[size(34, 48), clip(Shapes.RoundedCorner(6))]}
              />
            ) : (
              <Box modifiers={[size(34, 48)]} />
            )}
          </SegmentedListItem.Leading>
          <Text style={{ fontWeight: "500" }} maxLines={1} overflow="ellipsis">
            {title}
          </Text>
          <SegmentedListItem.Supporting>
            <Computed>
              {() => {
                const { value, line } = summary();
                return (
                  <Column verticalArrangement={{ spacedBy: 4 }}>
                    <Text style={{ typography: "bodyMedium" }}>{line}</Text>
                    <Progress value={value} maxValue={1} size="sm" />
                  </Column>
                );
              }}
            </Computed>
          </SegmentedListItem.Supporting>
          {/* Kept mounted: a Compose slot added later doesn't show. */}
          <SegmentedListItem.Trailing>
            <Icon
              name={expanded ? Icons.chevronDown : Icons.chevronRight}
              color="inherit"
            />
          </SegmentedListItem.Trailing>
        </SegmentedListItem>
      </ContextMenu>
    </Box>
  );
});
