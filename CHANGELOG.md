# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2026-09-21

### Changed

- **Content resolves against our own fork.** The catalog repository constant in
  `packages/runtime/src/main/marketplace.ts` and the manifest/raw URLs in all four
  installers now read `linyeping/BetterAitigravity` instead of `YashjitPal/BetterGravity`.
  Two things follow: the Community page installs the plugins this fork publishes, not
  upstream's; and a future upstream patcher release can no longer overwrite the runtime
  bundle this installer carries.
- **Embedded patcher version raised to 3.0.2.** The bootstrapper only prefers a cached
  bundle when it is strictly newer than the embedded one, so a `PatcherCache` populated by
  3.0.1 is now ignored rather than trusted. A freshly installed 3.0.2 exe runs its own
  bundle offline and never fetches the patcher.

The Gemini App plugin content in this fork's catalog is at **0.5.4** (sidebar collapse
button, project title drift, and account avatar fixes). Plugin versions remain independent
of the installer version and are delivered through the Community page.

## [3.0.1] - 2026-09-21

### Fixed

- **Gemini App 0.5.1 — Sidebar project titles and the account avatar**:
  - A collapsed project header lost its first letter. `getReferenceLeft` aligns the
    title with the conversation rows below it, and falls back to the rail's own
    14px when there are none — which is the case whenever every project is
    collapsed. That fallback asked for a negative `margin-left`, and the
    `overflow: hidden` boxes around the title turn a negative margin into a
    clip: `GemMate` rendered as `emMate` until the project was expanded again.
    The title's left edge now comes from the button's padding (14px, the same
    place Willow's own sidebar puts it), and `applySubheadingOffset` never moves
    a title left of that edge — it only ever nudges one right, which is harmless.
  - The account avatar in the sidebar footer was drawn offset, with a blue sliver
    down the right of the circle. The picture and the initial were laid out as
    flex siblings inside the 28px circle, so two 28px boxes overflowed a 28px
    centred row: the image was dragged 4.5px left and the initial was pushed off
    the right edge. The two layers are now stacked with `inset: 0`, and which one
    is painted is decided by `data-avatar` on the pill. The old inline
    `display: none` never worked at all — the stylesheet shows the image with
    `!important`, which outranks an inline declaration.

## [3.0.0] - 2026-09-19

### Added

- **Intelligent Online Bootstrapper Engine across All Platforms**:
  - Installers for Windows (WPF), macOS (SwiftUI), Linux (GTK4), and Electron now dynamically check and pull the latest patcher runtime and manifests directly from GitHub.
  - Background SHA-256 hash validation with atomic caching (`%LOCALAPPDATA%\BetterGravity\PatcherCache` on Windows, `~/Library/Caches/BetterGravity` on macOS, `~/.cache/BetterGravity` on Linux).
  - Instant offline fallback to embedded runtime bundles when disconnected or offline.
  - Real-time sync status indicator pill (`SYNCING`, `LATEST`, `OFFLINE`) seamlessly integrated into the Willow design system header on all platforms.

### Fixed

- **Antigravity 2.15.0 Compatibility & Startup Blank Screen Fix**:
  - Resolved startup crash and blank window ("full null") caused by Antigravity 2.15.0's new loopback frame separation and internal `loadingOverlay` (`data:text/html`).
  - Runtime preload bridge strictly verifies loopback origin protocols (`127.0.0.1`, `localhost`, `[::1]`) before injecting runtime bridges, safely ignoring data-URI loading frames.
  - Main overlay window management allows `about:blank` transitions and destroys failed/crashed webviews cleanly.
  - Updated AST source patches for 2.15.0 compatibility while preserving full backward compatibility with 2.14.x.
  - Added defensive DOM observers in `gemini-app` and `in-built-browser` plugins guarding against unmounted document bodies.

## [2.0.2] - 2026-09-17

### Added

- **Antigravity IDE Rejection & Guidance (Issue #12)**:
  - Added detection and informative feedback for **Antigravity IDE** (`Antigravity IDE.exe`).
  - BetterGravity is specifically engineered for the standalone **Antigravity 2.0** desktop app; attempting to patch the VS Code-based Antigravity IDE is safely prevented to avoid corrupting the editor workbench.
  - The installer presents a clear banner guiding users to select their standalone Antigravity 2.0 installation folder.
  - Added compatibility notices across documentation (`README.md` and `docs/installation.md`).

## [2.0.1] - 2026-09-16

### Fixed

- **Windows Installer Node Runner & Path Encoding (Issues #10, #11)**:
  - Fixed Windows installer failing when Node.js was not globally installed by automatically resolving and executing `Antigravity.exe` as the bundled Node runner (`ELECTRON_RUN_AS_NODE=1`).
  - Fixed standard I/O UTF-8 encoding in `ProcessStartInfo` to prevent mojibake corruption on non-ASCII usernames and paths (e.g. `Hernán`).
  - Added multi-source installation detection supporting standard paths and Windows Registry discovery (`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall`).
  - Fixed monorepo runtime source resolution in `patcher-cli.cjs`.
  - Added cross-platform Windows drive-letter path detection in `paths.ts`.
- **In-Built Browser**:
  - Automatically prune destroyed browser tabs and allow safe recovery when closing detached or crashed tabs.

## [2.0.0] - 2026-09-14

### Added

- **Installer 2.0 Redesign across All Platforms.** Re-architected and redesigned installers for
  Windows, macOS, and Linux built natively with platform-first UI toolkits for near-instant launches
  and tiny file sizes:
  - **Windows**: Built with WPF and .NET 10 as a single-file, self-contained native executable.
  - **macOS**: Built with native SwiftUI and AppKit with Cocoa integration and SF Symbols.
  - **Linux**: Built with GTK4 and Libadwaita styling matching the Willow design system.
  - **Universal Fallback**: Cross-platform Web/Electron installer updated with 1:1 visual parity.
- **Willow Design System & Minimalist Aesthetic**:
  - 100% borderless surfaces across titlebar, host status card, action cards, and footer.
  - Minimal indicator dot replacing the bulky status text pill.
  - Circular icon containers and optically balanced vector open chevron arrows (`—>`).
  - Elevated pill controls for secondary installation folder selection and footer actions.
- **Search Wildcard Sanitation in Gemini App**:
  - Added real-time sanitation for bare search query wildcards (`*`, `**/*`, `"*"`), hiding raw wildcard query text while preserving meaningful queries and match count badges.

## [0.1.5] - 2026-09-14

### Added

- **Linux support and multi-format installers.** Native support for Linux (`x64` and `arm64`)
  with automated electron-builder packaging generating `.AppImage`, `.deb`, and `.tar.gz`
  installers alongside Windows and macOS.
- **Linux host discovery and process management.** Automatic detection of Antigravity in
  `/opt/Antigravity`, `/usr/share/antigravity`, and user directories (`~/.local/share/Antigravity`).
  POSIX process scanning and graceful termination with system monitor guidance.
- **Marketplace OS compatibility.** Automatic platform filtering in the Community
  catalog so platform-specific plugins (such as Windows Computer Use) only display on
  compatible host operating systems.

## [0.1.4] - 2026-09-12

### Added

- **macOS support and cross-platform installer.** Full native support for macOS
  (`arm64` Apple Silicon and `x64` Intel) alongside Windows. Includes packaged
  `.dmg` and `.zip` installers, automatic `/Applications/Antigravity.app` discovery,
  POSIX process lifecycle management and graceful shutdown, and local certificate
  authority Keychain integration.
- **Automated multi-platform release pipeline.** GitHub Actions release workflow
  compiling Windows (`.exe`) and macOS (`.dmg`, `.zip`) installers and attaching
  them directly to GitHub Releases.
- **Settings inside Antigravity.** BetterGravity gets its own heading in
  Antigravity's settings sidebar, alongside the app's own Settings, Projects,
  and Not in Project groups, with Settings, Plugins, and Themes under it. Built
  from Antigravity's own components so it follows the app's theme.
  `Ctrl+Shift+G` jumps straight to it.
- **Adding and removing content from settings.** Add a theme or plugin from the
  group headers, drag a `.css` file onto the page to install it, and reveal or
  delete anything from its row. Deleting asks first.
- **Per-plugin options behind a gear** on the plugin's row, expanding inline.
- **Update resilience.** Antigravity replaces `app.asar` when it updates, which
  removed BetterGravity. A detached guardian now reapplies the patch once the
  update finishes. Opt-out under General.
- **Uninstall**, restoring the original bundle byte for byte while keeping all
  user content.
- **Plugin capabilities:** persistent storage, declarative typed settings,
  scoped styles, `dom.waitFor` and `dom.observe`, and `onDispose` teardown.
- **Hooks into Antigravity itself.** `plugin.patcher` intercepts a method on any
  object a plugin can reach, in the `before`/`after`/`instead` shapes;
  `plugin.react` reads the React tree by props, since Closure Compiler mangles
  component names; and `plugin.net` sees and rewrites fetch, `XMLHttpRequest`,
  and WebSocket traffic from the first request, which reaches the language
  server by RPC method name because connect-rpc puts it in the URL path.
- **Source patches.** A plugin can declare `patches` in `plugin.json` to rewrite
  Antigravity's bundle on its way to the renderer, reaching code that runs
  before any plugin does. Patches anchor on string literals, which the compiler
  cannot mangle, and each carries a `find` guard so a patch is skipped and
  reported rather than applied somewhere unintended when the host changes.
- **Discord Rich Presence.** `plugin.presence` puts an activity on the user's
  Discord profile, and the **Discord Rich Presence** plugin uses it to show
  whether the agent is working or idle, and for how long. It sends nothing
  identifying: it reads only whether a stop control is on screen, never a
  project, conversation, model, or message.

  The socket lives in the main process because it cannot live anywhere else.
  Discord's WebSocket transport matches the `Origin` header against a list
  registered on the application, and Antigravity serves its UI from a port that
  changes every launch, so no registered origin would keep matching. The
  capability dials Discord's own socket names and nothing else, so it does not
  become a general outbound socket for plugins.
- **A Gemini key of your own.** `plugin.gemini` and the **Custom Gemini API Key**
  plugin send Antigravity's chat through a key from Google AI Studio instead of
  the bundled subscription — your own quota, and the model's own thinking passed
  through to the interface, which the bundled route does not offer.

  Antigravity's chat does not speak the public Gemini API; it speaks a protocol of
  its own to an address its language server is given on the command line. So the
  runtime becomes that address: it mints a local certificate authority, serves a
  loopback HTTPS listener, rewrites that one argument as the language server is
  spawned, and translates each request into a public API call and each reply back.

  The endpoint is only rewritten once the authority is trusted, because an
  untrusted authority means a refused handshake and no chat at all, which is worse
  than chat carrying on through Google. Nobody is asked to arrange that: switching
  the plugin on adds the authority to `Cert:\CurrentUser\Root` — no administrator
  rights, nothing outside the account — and the first launch where no plugin wants
  it takes it back out. Switching the plugin off returns chat to the bundled
  subscription immediately, without waiting for a restart. Every path that cannot
  translate forwards instead, so no state of this feature stops you talking to the
  agent.

  A **Base URL** moves where the key is spent off Google's own API, for a key that
  belongs to a relay of your own or to a gateway a workplace puts in front of it.
  The key itself is held in the main process, sent to that address and nowhere
  else, and kept out of every status, log line, and the optional request log —
  which records the model, the timings, and the outcome, never a prompt.
  `.gitignore` covers runtime state, so a key cannot reach a clone of this
  repository by accident.
- **The signed-in name.** `plugin.account` gives a plugin the first name on the
  Google account Antigravity is signed in with, so it can address the person
  using the app instead of asking them to type their own name into a settings
  field.

  Antigravity does not keep the name. Its language server reports the address the
  user signed in with and nothing more, and there is no display name anywhere in
  the bundle. The name exists on the machine all the same, because the app signs
  in through a Chromium profile of its own and Chromium writes Google's answer
  into that profile's `Preferences`, so the main process reads it from there —
  matching the account Antigravity is actually using, since more than one can be
  signed into the same profile.

  Only the name crosses to the page, the given name and the full name, never the
  address they belong to, and nothing is written back. One read is shared by
  every plugin on the page, because Google's record does not change between two
  visits to a home screen; a read that fails is not remembered, so a profile
  being rewritten as the page loads is asked again rather than held wrong for the
  session. No profile, no answer, and no failure either — the read resolves with
  no name, so a greeting goes without one instead of taking its plugin down.
- **Interface hooks.** `plugin.ui` adds toasts, entries in Antigravity's menus,
  sidebar and title-bar buttons, dialogs, and a plugin's own screen in the app's
  settings sidebar — all built from Antigravity's own class strings, so plugin
  UI follows the user's theme. Registrations are undone when a plugin stops.
- **Live reload** for both themes and plugins; editing a plugin restarts it.
- **Theme metadata** read from a comment header, so a theme stays one file.
- **Stylesheets in a plugin's manifest.** `"styles"` in `plugin.json` names
  `.css` files that are folded like a folder theme and injected while the plugin
  runs, so a plugin whose look outweighs its behaviour keeps its CSS in CSS
  files. Editing one restarts the plugin; a plugin that is only a look may omit
  its script.
- **Gemini App plugin.** Antigravity restyled after the Gemini app, built element
  by element from Willow's measurements: the left sidebar, the model selector,
  the prompt box, the conversation, and the home screen — the glow behind the
  prompt box, the box centred on the pane the way Willow centres its own, and
  "Hello there, <name>" above it — with the prompt box's model pill shortened to
  "3.1 Pro" the way Willow's is. Its plus menu gains the agent's tools — Goal,
  Boost, and the rest, read from Antigravity itself rather than listed here —
  which the app otherwise only offers behind a slash. The greeting's name comes
  from `plugin.account`, and submitting a prompt slides the box down into the
  conversation it starts, over a distance that only exists once it happens;
  opening a conversation from the sidebar does not, which is a deliberate
  departure from Willow. None of that can come from CSS, so it is a plugin rather
  than a theme.
- **A community submission path.** Themes and plugins are submitted to
  `community/` as pull requests, validated by `pnpm community:check` in CI, and
  built into a catalogue.
- **Browsing and installing the catalogue** from the Themes and Plugins screens,
  which list what you have installed and, underneath, what the catalogue offers
  that you do not. Search, in-place updates on the row of the thing they update,
  and links to each listing's source. The catalogue is read when one of those
  screens is opened and not before, so an installation nobody browses makes no
  network requests. Every file carries a SHA-256 in the catalogue and is checked
  on the way in; anything that does not match is refused, as is any path that
  would land outside the folder it belongs in. Installing never enables
  anything.
- Two reference plugins: `session-timer` for the basics and `ui-showcase` for
  every interface surface.
- A test suite of 578 tests, run on Windows and Linux in CI, plus a job that
  builds the portable executable.

### Changed

- **User content moved to `%APPDATA%\BetterGravity`**, outside the Antigravity
  installation, so themes, plugins, settings, and saved plugin data survive
  Antigravity being updated, reinstalled, or removed. Existing content is
  migrated on first run.
- The installer derives the operations it offers from the patcher, so the
  interface can never offer something the patcher would refuse.
- Licence changed to MIT. No `LICENSE` file had been published previously.

### Fixed

- **The update guardian never firing.** An update ends with Antigravity
  relaunching itself, and the guardian stopped the moment it saw the application
  running again, so it could only act if it won a race against the relaunch. On
  a real 2.11 to 2.12 update it lost and left the installation unpatched. It now
  distinguishes the two cases: coming back with the patch intact means there was
  nothing to do, while coming back without it means the update landed, and the
  guardian waits for the application to be closed before reapplying. It still
  never closes anything itself.
- **Bootstrap identity.** The patch declared itself as `bettergravity-bootstrap`,
  and Electron derives `app.getName()` from that. Antigravity builds both its
  userData path and its `antigravity://` protocol from the app name, so patching
  silently orphaned user data into a directory named after the bootstrap.
- **`original-fs`.** Electron rewrites `fs` so any path containing `.asar` is
  treated as a path inside an archive, which broke the patcher's own file
  operations. This affected the shipped installer, not just development.
- **Guardian self-detection.** The update guardian runs the Antigravity binary
  as a Node process, so it counted itself as the application it was waiting on.
- **Plugin storage races.** A plugin restarted by an edit read stale values, and
  a file-watcher broadcast could start a plugin before storage had loaded.
- **Settings scrollbar** sat inset from the right edge, out of line with every
  other tab, because the screen wrapper carried a height Antigravity's own
  wrappers do not have.

### Removed

- `packages/core`, an unused stub superseded by `packages/runtime`.
- The floating settings panel, replaced by the native settings section.

## [0.1.3]

First public shape of the project: a pnpm monorepo, an installer interface, and
a reversible ASAR patch for Antigravity on Windows.
