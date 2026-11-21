import { Typography } from "panelui-native/components/typography";
import { View } from "react-native";
import { type Block, parseNotes } from "../../../utils/release-notes";

export interface ReleaseNotesProps {
  /** The release notes, in Markdown. */
  markdown: string;
}

const line = ({ spans }: Block) =>
  spans.map((span, j) =>
    span.bold ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the spans never move.
      <Typography key={j} type="body-sm" weight="bold">
        {span.text}
      </Typography>
    ) : (
      span.text
    ),
  );

/** A release's Markdown notes: headings, bullets, bold. */
export function ReleaseNotes({ markdown }: ReleaseNotesProps) {
  return (
    <View className="gap-1.5">
      {parseNotes(markdown).map((block, i) =>
        block.kind === "heading" ? (
          <Typography
            // biome-ignore lint/suspicious/noArrayIndexKey: the lines never move.
            key={i}
            type="body"
            weight="semibold"
            // A heading after a list stands apart from it.
            className={i > 0 ? "text-primary pt-2.5" : "text-primary"}
          >
            {line(block)}
          </Typography>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: same as above.
          <View key={i} className="flex-row gap-2">
            {block.kind === "bullet" ? (
              <Typography type="body-sm">•</Typography>
            ) : null}
            <Typography type="body-sm" className="flex-1">
              {line(block)}
            </Typography>
          </View>
        ),
      )}
    </View>
  );
}
