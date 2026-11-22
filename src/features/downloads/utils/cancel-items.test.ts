import { describe, expect, mock, test } from "bun:test";

// The registry requires native assets; the menu only needs a name per icon.
mock.module("@/components/ui/icon", () => ({
  Icons: new Proxy({}, { get: (_, name) => String(name) }),
}));

const { cancelQueueItems } = await import("./cancel-items");

describe("cancelQueueItems", () => {
  test("cancels the manga at once and asks before cancelling all", () => {
    const group = () => {};
    const all = () => {};
    const [one, every] = cancelQueueItems(group, all);
    expect(one).toMatchObject({ destructive: true, onPress: group });
    expect(one.onPressMode).toBeUndefined();
    expect(every).toMatchObject({
      destructive: true,
      onPressMode: "dialog",
      onPress: all,
    });
  });
});
