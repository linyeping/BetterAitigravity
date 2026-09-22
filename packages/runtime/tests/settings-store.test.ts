import { describe, expect, it } from "vitest";
import { applyPatch, normalizeSettings } from "../src/main/settings.js";

/**
 * A theme is a palette rather than a layer, so exactly one is on at a time. The
 * setting stays a list on disk for compatibility, but it is capped so a file —
 * hand-edited, or left behind by an older build — can never turn two on and let
 * mount order decide the winner.
 */
describe("theme settings", () => {
  it("keeps only the most recently enabled theme", () => {
    const settings = normalizeSettings({ themes: { enabled: ["midnight.css", "dawn.css"] } });
    expect(settings.themes.enabled).toEqual(["dawn.css"]);
  });

  it("keeps a single theme as it is", () => {
    expect(normalizeSettings({ themes: { enabled: ["midnight.css"] } }).themes.enabled).toEqual(["midnight.css"]);
  });

  it("leaves nothing on when nothing is on", () => {
    expect(normalizeSettings({ themes: { enabled: [] } }).themes.enabled).toEqual([]);
    expect(normalizeSettings({}).themes.enabled).toEqual([]);
  });

  it("does not trust a shape it cannot read", () => {
    expect(normalizeSettings({ themes: { enabled: "midnight.css" } }).themes.enabled).toEqual([]);
    expect(normalizeSettings({ themes: { enabled: [1, null, "dawn.css"] } }).themes.enabled).toEqual(["dawn.css"]);
  });

  it("caps a patch that turns a second theme on", () => {
    const current = normalizeSettings({ themes: { enabled: ["midnight.css"] } });
    const next = applyPatch(current, { themes: { enabled: ["midnight.css", "dawn.css"] } });

    expect(next.themes.enabled).toEqual(["dawn.css"]);
  });

  it("leaves the plugin list alone, since plugins stack", () => {
    const settings = normalizeSettings({ plugins: { developerMode: true, enabled: ["timer", "pets"] } });
    expect(settings.plugins.enabled).toEqual(["timer", "pets"]);
  });
});
