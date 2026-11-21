import type { ConfigContext, ExpoConfig } from "expo/config";
import { AndroidConfig, withStringsXml } from "expo/config-plugins";

/**
 * The name under the icon. app.json's `name` stays lowercase: prebuild also
 * names the iOS project after it (`anipoex.xcworkspace`, `anipoex.app`).
 */
const DISPLAY_NAME = "Anipoex";

// Expo writes app_name from `name`, with no override of its own.
const withAndroidDisplayName = (config: ExpoConfig) =>
  withStringsXml(config, (mod) => {
    mod.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: "app_name", translatable: "false" }, _: DISPLAY_NAME }],
      mod.modResults,
    );
    return mod;
  });

// CI passes the release tag (vX.Y.Z); local builds keep app.json's version.
export default ({ config }: ConfigContext): ExpoConfig => {
  const version =
    process.env.RELEASE_TAG?.replace(/^v/, "") ?? config.version ?? "";
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(version);
  if (!match) throw new Error(`Version "${version}" isn't X.Y.Z`);
  const [major, minor, patch] = match.slice(1).map(Number);
  // X.Y.Z → XYYYZZZ, so every release installs over the one before it.
  const buildNumber = major * 1_000_000 + minor * 1_000 + patch;

  return withAndroidDisplayName({
    ...config,
    name: config.name ?? "anipoex",
    slug: config.slug ?? "anipoex",
    version,
    android: { ...config.android, versionCode: buildNumber },
    ios: {
      ...config.ios,
      buildNumber: String(buildNumber),
      // Expo leaves a CFBundleDisplayName set here as it is.
      infoPlist: {
        ...config.ios?.infoPlist,
        CFBundleDisplayName: DISPLAY_NAME,
      },
    },
    // Settings → About shows it; CI sets GITHUB_SHA.
    extra: { ...config.extra, commit: process.env.GITHUB_SHA?.slice(0, 7) },
  });
};
