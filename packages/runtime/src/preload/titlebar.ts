import { ipcRenderer } from "electron";
import { CHANNEL, type RuntimeState } from "../protocol.js";

/**
 * Antigravity's window controls overlay is native chrome. The host draws it and
 * colours it from its own theme mode, so a stylesheet cannot reach it and a
 * light theme ends up under a dark strip. The colour has to be pushed back
 * through the main process instead.
 *
 * This lives in the preload rather than the page world for the same reason
 * themes do: the preload is what applies them, so by the time this runs the
 * stylesheets are in the document and the values read here are the ones on
 * screen. Reading them from the resolved cascade also means a theme written with
 * `color-mix()` or a `var()` chain reports the colour the browser arrived at,
 * not the text it was written as.
 */

/**
 * The overlay sits on the application header, which is a full-width band whose
 * background is driven by `--sidebar` and by nothing else — overriding
 * `--background`, `--card` or `--sidebar-secondary` on the root leaves it
 * unchanged. `--background` would be the obvious guess and the wrong one: with a
 * theme applied the two differ, and the strip would be a shade off the band it
 * is sitting in.
 */
const BACKGROUND_VARIABLE = "--sidebar";
/** No `--sidebar-foreground` exists in the host's palette, so this is the text colour that pairs with `--sidebar`. */
const FOREGROUND_VARIABLE = "--foreground";

/**
 * A custom property that resolves to nothing keeps its `var(...)` text, which is
 * not a colour the main process could hand to Electron. Everything else the
 * browser accepted is passed through as written.
 */
const UNRESOLVED = /var\(/i;

/**
 * Whether this window has ever coloured its overlay. Until a theme asks for it
 * the host's own colours are right, and rewriting them would be an unasked-for
 * change to an unthemed window; a window that has been themed does need the
 * host's colours restored when the last theme is switched off.
 */
let themed = false;
let lastSent: string | undefined;

function resolved(variable: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value.length > 0 && !UNRESOLVED.test(value) ? value : undefined;
}

/**
 * Mirrors the applied themes onto the window controls overlay.
 *
 * Called directly after `applyThemes`, so the stylesheets already reflect the
 * enabled set: with a theme on these are the theme's colours, and with the last
 * one switched off they fall back to the host's palette, which is exactly what
 * the unthemed window should be showing.
 */
export function syncTitleBarOverlay(themes: RuntimeState["themes"]): void {
  const anyEnabled = themes.some((theme) => theme.enabled);
  if (!anyEnabled && !themed) return;

  const color = resolved(BACKGROUND_VARIABLE);
  const symbolColor = resolved(FOREGROUND_VARIABLE);
  if (!color || !symbolColor) return;

  const signature = `${color}|${symbolColor}`;
  if (signature === lastSent) return;

  lastSent = signature;
  themed = true;
  void ipcRenderer.invoke(CHANNEL.titleBarOverlay, color, symbolColor).catch(() => {
    // A host without this channel keeps its own colours; nothing else to do.
  });
}
