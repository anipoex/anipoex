import { useFragment } from "@apollo/client/react";
import { Box, Column, LazyRow, Row } from "@expo/ui/jetpack-compose";
import {
  align,
  background,
  clip,
  combinedClickable,
  matchParentSize,
  padding,
  Shapes,
  semantics,
  size,
  weight,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { memo } from "react";
import { GUTTER } from "@/components/native/constants";
import { Image } from "@/components/native/jetpack-compose/image";
import { SectionHeader } from "@/components/native/jetpack-compose/section-header";
import { Text } from "@/components/native/jetpack-compose/text";
import { Badge } from "@/components/ui/badge";
import { Icon, Icons } from "@/components/ui/icon";
import { ContextMenu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { MangaMediaFragmentDoc } from "@/features/manga/graphql/manga-fragments.generated";
import { useThemeM3Colors } from "@/hooks/use-theme/use-theme.android";
import type { ContinueSectionProps } from "./continue-section";
import { useContinueActions } from "./hooks/use-continue-actions";

const CARD_WIDTH = 250;

/** Tonal cards that open the reader at the next chapter. */
export function ContinueSection({ title, items }: ContinueSectionProps) {
  return (
    <Column>
      <SectionHeader title={title} />
      <LazyRow
        horizontalArrangement={{ spacedBy: 8 }}
        contentPadding={{ start: GUTTER, end: GUTTER }}
      >
        <LazyRow.Items
          data={items}
          keyExtractor={(item) => String(item.mangaId)}
          estimatedItemSize={CARD_WIDTH}
        >
          {({ item }) => (
            <ContinueCard
              mangaId={item.mangaId}
              unread={item.unread}
              chapterId={item.next.id}
              chapterNumber={item.next.number}
            />
          )}
        </LazyRow.Items>
      </LazyRow>
    </Column>
  );
}

// Values, not the item: the list's items are rebuilt whenever one changes.
const ContinueCard = memo(function ContinueCard(props: CardValues) {
  const { read, menu } = useContinueActions(
    props.mangaId,
    props.chapterId,
    props.chapterNumber,
  );
  return (
    <ContextMenu items={menu}>
      <Card {...props} onPress={read} />
    </ContextMenu>
  );
});

interface CardValues {
  mangaId: number;
  unread: number;
  chapterId: string;
  chapterNumber: number;
}

/** The tonal card; `ContextMenu` hands it the long press. */
function Card({
  mangaId,
  unread,
  chapterNumber,
  onPress,
  onLongPress,
}: CardValues & {
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const m3 = useThemeM3Colors();
  const { data } = useFragment({
    fragment: MangaMediaFragmentDoc,
    fragmentName: "MangaMedia",
    from: { __typename: "Media", id: mangaId },
  });
  const read = data.mediaListEntry?.progress ?? 0;
  const name = data.title?.userPreferred ?? "";
  const cover = data.coverImage?.medium;
  const caption = `Chapter ${chapterNumber} · ${unread} new`;

  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: 12 }}
      modifiers={[
        width(CARD_WIDTH),
        clip(Shapes.RoundedCorner(24)),
        background(m3.surfaceContainer),
        combinedClickable({ onClick: onPress, onLongClick: onLongPress }),
        semantics({ contentDescription: `Continue ${name}, ${caption}` }),
        padding(12, 12, 12, 12),
      ]}
    >
      <Box
        modifiers={[
          size(52, 76),
          clip(Shapes.RoundedCorner(14)),
          background(data.coverImage?.color ?? m3.surfaceContainerHighest),
        ]}
      >
        {cover && (
          <Image source={{ uri: cover }} modifiers={[matchParentSize()]} />
        )}
        {/* M3 Expressive: a shaped container marks the one action, resume. */}
        <Box
          contentAlignment="center"
          modifiers={[
            align("center"),
            size(30, 30),
            clip(Shapes.Material.Cookie9Sided),
            background(m3.primaryContainer),
          ]}
        >
          <Icon name={Icons.play} size={18} color={m3.onPrimaryContainer} />
        </Box>
      </Box>
      <Column verticalArrangement={{ spacedBy: 2 }} modifiers={[weight(1)]}>
        <Text
          style={{ typography: "titleSmall" }}
          maxLines={1}
          overflow="ellipsis"
        >
          {name}
        </Text>
        <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 6 }}>
          <Text style={{ typography: "bodySmall" }} color={m3.onSurfaceVariant}>
            Read
          </Text>
          <Badge>c.{read}</Badge>
          <Badge color="primary">+{unread}</Badge>
        </Row>
        <Box modifiers={[padding(0, 8, 0, 0)]}>
          <Progress value={(read / (read + unread)) * 100} size="sm" />
        </Box>
      </Column>
    </Row>
  );
}
