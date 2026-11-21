# Desktop

macOS and Windows app: Electron loads the web app and runs extensions in a separate JVM process (the sidecar, [sidecar.js](sidecar.js)).

`host/` holds what the JVM asks the app for, and `assets/` what the window loads.

## Development

1. Build the extension server and its JVM (`bun run desktop` does it on its first run, generating `android/` if missing; again by hand whenever `modules/extension-runtime/jvm` changes; restart Electron afterwards: a sidecar left running loses its own classes, so `server.log` fills with `NoClassDefFoundError` and no extension lists or installs):

   ```bash
   JAVA_HOME=<jdk ≥ 17> android/gradlew -p modules/extension-runtime/jvm installDist jlinkRuntime
   ```

2. Install Electron:

   ```bash
   bun install --cwd desktop
   ```

3. Start Metro (`bun start`) and open the app from the repo root:

   ```bash
   bun run desktop
   ```

   It loads `http://localhost:8081`; set `ANIPOEX_URL` to load another URL.

Without `modules/extension-runtime/jvm/build/jre`, it uses the system `java`, which must be 21 or newer.

Tests: `bun test desktop/`.

## Packaged app

```bash
JAVA_HOME=<jdk ≥ 17> bun run --cwd desktop dist
```

This exports the web app (`build:web`, with the `EXPO_PUBLIC_*` values from `.env.local`), builds the server and the JVM (`build:runtime`, needs a generated `android/`), and produces `desktop/dist/anipoex-<version>-arm64.dmg` (and `desktop/dist/mac-arm64/anipoex.app`). Inside the `.app`, `Contents/Resources/` holds `web/` (served as `app://anipoex/` by [serve.js](assets/serve.js)), `server/` and `jre/`; it needs neither Metro nor an installed Java.

Unsigned: a local build opens normally. A downloaded copy is quarantined and macOS may call it damaged; clear the flag with `xattr -cr /Applications/anipoex.app`.

Updates: Settings → About finds the latest release's DMG, and [update.js](update.js) copies the app out of it, swaps it in after the app quits and opens it again. Electron's `autoUpdater` would need a Developer ID signature. The app must run from a folder it can write to (Applications), not from a translocated copy opened straight from Downloads. To try it, run an older build (`RELEASE_TAG=v0.0.9 bun run desktop:dmg -c.extraMetadata.version=0.0.9`) from Applications.

### Windows

```bash
bun run desktop:exe
```

On a Windows machine with a JDK 21 and a generated `android/`, this produces `desktop/dist/anipoex-<version>-x64-setup.exe`, an NSIS installer that installs for the current user (no admin) and opens the app. CI builds it for each release; a Mac can't, since the bundled JVM is built for the machine that builds it. Unsigned: SmartScreen warns on the first run ("More info" → "Run anyway"). Updates download the release's setup and run it silently over the app (`--updated /S --force-run`, as electron-updater does), which reopens it.

## Data and log

In development everything lives in `~/Library/Application Support/anipoex-desktop/` (the name comes from `package.json`, so don't change it or the AniList session and the extensions are lost); the packaged app uses `~/Library/Application Support/anipoex/` (its `productName`), with its own session and extensions:

- `extensions/`: the installed extensions.
- `extensions/server.log`: the server's stderr. It is emptied when the server first starts in each app run; if the server crashes and restarts, it keeps appending.
