# Memory

How much memory the app uses on Android, iOS and desktop, what we fixed, and what's still left. Measured on 2026-11-22.

## In short

- **The app's memory grows most during a source scan,** above all "Scan all sources" followed by "Search titles → Search all". It reads every source's chapters and searches every source's catalog at once.
- **Most of that growth isn't data the app keeps.** The JavaScript engine (Hermes) reserves room for the busiest moment and doesn't give it back afterwards. The real fix is to make that busiest moment lighter.
- **Five fixes landed:**
  - **Covers on Android:** they're freed once they stop showing.
  - **Title search on Android:** it only builds the result cards you can see.
  - **Extension runtime (iOS and desktop):** it gives memory back after a scan.
  - **Desktop anti-bot pages:** they close sooner.
  - **Continue reading:** a change to one manga no longer redraws every card.
- **Typical numbers:**
  - **Android phone:** about 650 MB at startup and about 1 GB after a heavy scan.
  - **Desktop:** about 510 MB at startup and 670 MB once a scan has settled.

## What we measure

The same four steps on every platform, so runs can be compared:

1. Open the app and wait on Home.
2. Manga tab, Reading list, scroll to the end.
3. Open a **Planning** manga, open its sources, run **Scan all sources**, then **Search titles → Search all**.
4. Go back to Home and wait a minute.

A Planning manga is used so a scan never changes the source of something you're reading.

**Turn off the manga list's filters first** (List options → Filter): a filter such as "Unread: only" shows a fraction of the cards, and step 2 then measures less. List options are kept per device, so check them on each one.

The library and sources behind these numbers (2026-11-22, one AniList account synced to every device):

- **Library:** 235 manga on AniList: 76 Reading, 16 Planning, 52 Completed, 41 Paused, 50 Dropped. Step 2 scrolls the 76 Reading ones.
- **The scanned manga:** Kagurabachi, with 140 chapters, and 36–37 sources across the installed extensions: 17–19 of them available (scanned by Scan all) and the rest excluded. Search all searches all 37.
- **Extensions installed:** 18 on the Android phone, 30–31 on the iOS simulator and desktop.

## Android

Measured on a Samsung S23 Ultra with the release APK, after the fixes, with no filters on the list (2026-11-23):

| Step | Memory |
|---|---|
| Home after opening | ~650 MB |
| Reading list scrolled (all 76) | ~790 MB |
| After Scan all + Search all | ~930 MB |
| Back on Home, a minute later | ~980 MB |

The runs before and after the fixes had the list filtered to unread manga (25–30 of the 76 cards), so they only compare with each other: the fixes took the end of a heavy scan from ~1.1 GB to ~1 GB, about 70 MB. Most of the growth is still there (see "Still open").

The app never got killed for using too much memory; the crashes seen back then were a separate Compose bug.

What changed:

- **Covers** weren't released once loaded, so every cover ever shown stayed in memory. Now they're freed when they leave the screen (119 MB of covers in a browse → about 90 MB, and it stays there).
- **Title search** showed every result card of every source at once. It now builds only the visible ones, and the engine's reserved memory after a scan went from 208 to 180 MB.

## iOS

Measured on the iPhone simulator with a development build. That build compiles the app's code while it runs, which adds about 430 MB a real install doesn't have, so only the growth between steps matters here. The list looks to have been filtered to unread manga in these runs too, so step 2 is likely low:

| Step | Memory |
|---|---|
| Home after opening | ~720 MB |
| Reading list scrolled | ~880 MB |
| After Scan all + Search all | ~1.3 GB |
| Back on Home | ~1.3 GB, nothing given back |

What changed:

- **The extension runtime** kept all the memory a scan needed, forever. Now it gives it back about 30 seconds after the last source call. A minute after a scan it holds about 30 MB instead of 64, and about 44 MB instead of 73 after Search all.

## Desktop

Measured with the packaged app and a synced library:

| Moment | Memory |
|---|---|
| Startup | ~510 MB |
| During Scan all | ~2.2 GB |
| Back on Home, 1 minute later | ~1.9 GB |
| Back on Home, 11 minutes later | ~670 MB |

Most of the jump came from **anti-bot check pages**. When a site asks for a check, desktop keeps that page open so the site's later requests go through it. A scan that met 14 of them kept ~830 MB for 10 minutes. They now close after **3 minutes**; going back to such a site later means passing its check again.

The extension runtime gives memory back on desktop too (294 → 133 MB after the scan).

## Also fixed

- **Continue reading on Home** redrew all its cards and menus whenever one manga in it changed, which happens a lot during a scan. Now only the card that changed redraws: for one changed manga, 1 card instead of 6.

## Still open

- **The engine keeps its peak.** Making a scan and search lighter at their busiest moment would bring the most back on every platform.
- **Android's native memory** (~300–350 MB in a release build) is mostly unexplained: covers are only ~100 MB of it. It needs a profiling build to see the rest.
- **Android graphics** (~190 MB): every tab keeps its screens alive.
- **Covers on iOS** aren't freed when their screen goes away.

Working notes live in bead `anipoex-fn4e`.

---

The sections below are for agents and anyone repeating the measurements.

<details>
<summary><b>How to measure: Android</b></summary>

- **Totals:** `adb shell dumpsys meminfo <package>`, App Summary (Java heap, native heap, graphics, unknown) and `TOTAL PSS` / `TOTAL RSS`. Release is `com.anipoex.app`, dev `com.anipoex.app.dev`.
- **Measure totals on release builds.** A dev build interprets Compose and compiles JS at runtime. Dev builds find *what* grows, not *how much*.
- **Hermes:** run `HermesInternal.getInstrumentedStats()` through Metro's debugger. `js_heapSize` is reserved, `js_allocatedBytes` in use, `js_peakAllocatedBytes` / `js_peakLiveAfterGC` the peaks.
- **Heap snapshots:** CDP `HeapProfiler.takeHeapSnapshot`, collecting `HeapProfiler.addHeapSnapshotChunk` events. Hermes rejects `HeapProfiler.enable`; skip it. Compare two snapshots by summing `self_size` per node type and name.
- **Re-renders:** wrap `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` and count per component the fibers that rendered (see "Fine-grained reactivity" in [AGENTS.md](../AGENTS.md)). Warm up with one commit first: the first commit after installing the hook also counts fibers from earlier ones.
- **Metro's debugger from a script:** the WebSocket needs `Origin: http://127.0.0.1:8081`. Without it the upgrade gets a 401; with `localhost` or the LAN address it opens and drops.
- **Don't run a real Reading scan to test:** it can change a Reading manga's source, and sync carries that to other devices. Simulate the write instead (set one manga's stored chapters, then restore them).

</details>

<details>
<summary><b>How to measure: iOS</b></summary>

- A simulator app is a Mac process: `footprint -p <pid>` (physical footprint, counts compressed and swapped pages) and `vmmap --summary <pid>`, pid from `pgrep -f 'anipoex.app/anipoex$'`.
- The embedded JVM's heap is the read-write part of its 512 MB reservation in `vmmap`.
- **No JS debugger attached while measuring:** React Native then keeps the bundle URL for every captured stack frame (~100 MB by the end of the scenario).
- **No `lldb`:** a memory dump left the app stopped for minutes.
- A Debug build compiles the bundle at runtime (~430 MB at cold start a Release doesn't pay): compare growth between steps, not totals.

</details>

<details>
<summary><b>How to measure: desktop</b></summary>

- Build the packaged app with `bun run desktop:dmg` and run `desktop/dist/mac-arm64/Anipoex.app`.
- Physical footprint (`footprint -p`) of each of its processes: main, GPU helper, the app's renderer, the JVM sidecar, and every other renderer.
- **The other renderers are hidden pages** the runtime opens: anti-bot check pages (`desktop/host/challenge.js`) and sources' WebViews (`desktop/host/webview/`). Count them; they can outweigh the app.

</details>

<details>
<summary><b>Detailed numbers: Android</b></summary>

Release APK at `debf4ce7`, no list filters, PSS / RSS MB:

| Step | PSS | RSS | Biggest parts |
|---|---|---|---|
| 1. Home, cold start | 532 | 652 | graphics 161, native 160, Java 59 |
| 2. Reading grid, end (76 cards) | 665 | 789 | native 228, graphics 216 |
| 3. Scan all + Search all | 781 | 928 | native 333 |
| 4. Home, +60 s | 836 | 982 | native 299, graphics 183, Java 102 |

The runs below had the list filtered to "Unread: only" (25–30 cards at step 2; the before run most likely too). Before the fixes:

| Step | PSS | RSS | Biggest parts |
|---|---|---|---|
| 1. Home, cold start | 516 | 641 | native 154, graphics 152, other 96, Java 51 |
| 2. Reading grid, end | 602 | 727 | native 191, graphics 187 |
| 3. Scan all + Search all | 906 | 995 | native 282, other 198, Java 103; 293 bitmaps = 99 MB |
| 4. Home, +20 s | 995 | 1086 | native 352, graphics 192, unknown 157; 468 bitmaps = 164 MB |

- **Covers (`0957f3c3`):** the image module never cleared Glide's `submit()` targets. Same browse: 480 bitmaps / 119 MB → 247–268 / 88–94 MB, bounded.
- **JS heap, dev build snapshots before/after step 3:** live self size 140 → 156 MB, spread thin (no type over 4 MB). After: `js_heapSize` 208 MB, allocated 69 MB, `js_peakAllocatedBytes` 193 MB. Hermes keeps the segments its peak needed.
- **Title search rails (`285b1b37`):** `LazyRow.Items` with `overscanCount={2}` instead of mapping every card. Hermes reserved 208 → 180 MB, live peak 116 → 99–102 MB (two runs, same scenario).
- **After the fixes (release APK at `debf4ce7`, filtered), PSS / RSS:** 528/645 at Home (native 167, graphics 160); 616/734 after the grid; 798/949 right after Scan all + Search all (native 301); 874/1019 on Home a minute later (native 298, graphics 195, Java 104; 4170 Views). Native at the end went 352 → 298 MB.
- **Stores are small:** serialized, extensions 924 KB, probes 460 KB, Apollo cache 289 KB, sync meta 259 KB, chapters 169 KB.
- **Native heap attribution:** heapprofd on the dev build disconnected (client error 2). Of 55 MB retained when it stopped, ~47 MB was React Native's JS task execution, plus ART interpreter frames (debug only). Needs a profileable release build.

</details>

<details>
<summary><b>Detailed numbers: iOS</b></summary>

Simulator, Debug build, `footprint -p` MB (steps 3–4 minus ~100 MB from an attached debugger; the list likely filtered to unread):

| Step | Footprint | Biggest parts |
|---|---|---|
| 1. Home, cold start | 716 | malloc 460, Hermes heap 184 |
| 2. Reading grid, end | 876 | malloc 546, Hermes 188, JVM heap 61 |
| 3. Scan all + Search all | ~1320 | malloc 811, Hermes ~256, JVM ~138, CG images 44 |
| 4. Home, +20 s | ~1300 | the same |

- **Debug-only cold start cost:** 226 MB of 16 KB `CodeBlock`s (one per function as it first runs), 137 MB of compiler data, a 17 MB source copy.
- **Hermes:** heap 188 → 257 MB; live after GC 136 → 173 MB; external 36 → 96 MB during the scan, 80 MB on Home.
- **JVM (`468b7395`):** SerialGC returns heap only after a full GC. `Bridge.call` now runs `System.gc()` 30 s after the last call ends (a new call cancels it); flags `-Xms16m -XX:MinHeapFreeRatio=20 -XX:MaxHeapFreeRatio=40 -XX:-ShrinkHeapInSteps` in `modules/extension-runtime/ios/JvmHost.m`.

  | JVM committed heap | Before | After |
  |---|---|---|
  | Home, cold start | 64 MB | 17–29 MB |
  | Scan, Home, +60 s | 64 MB | 29.5 MB |
  | Search all, Home, +60 s | 72.6 MB | 43.5 MB |
  | Peak during work | 64 MB | 75 MB |

- **Other:** decoded covers 11 → 44 MB held after leaving; the challenge page's WebKit ~21 MB stays alive (`idleSeconds` = 10 min in `ChallengeHost.swift`).

</details>

<details>
<summary><b>Detailed numbers: desktop</b></summary>

Packaged app at `468b7395`, synced library, physical footprint MB:

| Moment | Main | GPU | App window | JVM | Hidden pages |
|---|---|---|---|---|---|
| Start | 85 | 176 | 230 | 261 | — |
| Start, +60 s | 69 | 175 | 185 | 75 | — |
| During Scan all | 148 | 524 | 353 | 312 | ~830 (14) |
| Home, +60 s | 123 | 334 | 284 | 294 | ~830 |
| Home, +4 min | 121 | 238 | 291 | 142 | ~780 |
| Home, +11 min | 112 | 192 | 232 | 133 | closed |

- Earlier packaged 0.1.0 (smaller library, no fixes): main 52, GPU 172, renderer 112, JVM 71 = ~407 MB at start; 52 / 278 / 167 / 109 = ~606 MB after the scan.
- The JVM sidecar runs HotSpot's default G1; the same idle `System.gc()` applies.
- Check pages: `IDLE_MS` in `desktop/host/challenge.js`, 10 → 3 minutes.

</details>

<details>
<summary><b>Detailed numbers: Continue reading re-renders</b></summary>

`bc4e8d57`. `useContinueReading` returns `JSON.parse` of the list's key, so any change to one manga gave every item a new object; the Android and iOS cards took the whole item, so every card's `memo` failed. They now take the values they show, as the web card does.

Measured on the Samsung dev build by changing one Continue manga's stored chapters (then restoring them), one commit:

| | Cards | Menus | Menu rows |
|---|---|---|---|
| Before | 6 | 6 | 12 |
| After | 1 | 1 | 2 |

</details>
