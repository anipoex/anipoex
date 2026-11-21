---
type: Concept
title: App updates
description: Which version the app runs, where newer ones come from, and when the Android, iOS and desktop apps offer one.
resource: ../../src/features/updates/state/updates.ts
tags: [updates, releases, version]
generated: { by: claude-code, at: 2026-11-20T00:00:00Z }
---

**Version.** Each build carries a version `X.Y.Z`, taken from the GitHub release tag
`vX.Y.Z` it was built for. A build made without a release (a local or development build)
keeps the version in the app config.

**Where updates come from.** Releases are published by hand on the app's GitHub repo, and
CI attaches the built apps to each one. The newest **published, non-prerelease** release is
the one offered. Prereleases and drafts are never offered.

**When the app offers one.** The Android, iOS and desktop apps offer a release when:

- its version is newer than the running one, comparing major, minor and patch as numbers
  (`0.10.0` is newer than `0.9.9`);
- its file for that platform is already attached (the APK on Android, the IPA on iOS,
  the DMG on the Mac, the setup on Windows):
  right after publishing, CI is still building them, and the release is skipped until
  the file is there.

They look by themselves at most **once a day**, when the app opens or comes back, while
the device setting `updateCheck` is on (the default) and the app is online
([Settings](../stores/settings.md)). Development builds never look by themselves. The user
can always look from Settings → About.

An update shows its release notes. On Android it installs through the package installer,
which asks the user to confirm (and, the first time, to allow installs from the app). On
iOS, the store on the device installs it over the app, keeping its data: SideStore if it
has it, else AltStore; with neither, the release page offers the IPA. SideStore and AltStore also find new versions by themselves through
the source each release carries.

On the Mac, the app downloads the DMG, puts the new app where it runs from and restarts,
keeping its data. It can't while it runs from somewhere it can't write, like a copy opened
straight from Downloads: the user moves it to Applications first. A browser always loads
the latest web app and offers nothing. On Windows, the app runs the release's installer
silently over itself, which opens it again, keeping its data.
