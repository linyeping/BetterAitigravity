// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHANNEL, type ThemeRecord } from "../src/protocol.js";

const electron = vi.hoisted(() => ({
  ipcRenderer: { invoke: vi.fn(() => Promise.resolve(1)) }
}));

vi.mock("electron", () => electron);

// jsdom does not resolve custom properties from a stylesheet, and the point of
// this module is the decision it makes about them, so the cascade is stubbed.
const variables: Record<string, string> = {};
vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (name: string) => variables[name] ?? "" }));

const theme = (id: string, enabled: boolean): ThemeRecord => ({
  id,
  name: id,
  description: "",
  author: "test",
  version: "1.0.0",
  css: "",
  folder: false,
  enabled
});

/** The module remembers what it has already sent, so each case needs a fresh copy. */
async function load() {
  vi.resetModules();
  return import("../src/preload/titlebar.js");
}

const calls = () => electron.ipcRenderer.invoke.mock.calls;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(variables)) delete variables[key];
});

describe("window controls overlay", () => {
  it("leaves the host's own colours alone when no theme has ever been enabled", async () => {
    variables["--sidebar"] = "#0f0f0f";
    variables["--foreground"] = "#cccccc";
    const { syncTitleBarOverlay } = await load();

    syncTitleBarOverlay([theme("a.css", false)]);

    expect(calls()).toEqual([]);
  });

  it("takes the colour from the header token rather than the page background", async () => {
    variables["--sidebar"] = "#F5F4ED";
    variables["--foreground"] = "#141413";
    variables["--background"] = "#FAF9F5";
    const { syncTitleBarOverlay } = await load();

    syncTitleBarOverlay([theme("a.css", true)]);

    expect(calls()).toEqual([[CHANNEL.titleBarOverlay, "#F5F4ED", "#141413"]]);
  });

  it("sends nothing when the colours are unchanged", async () => {
    variables["--sidebar"] = "#F5F4ED";
    variables["--foreground"] = "#141413";
    const { syncTitleBarOverlay } = await load();

    syncTitleBarOverlay([theme("a.css", true)]);
    syncTitleBarOverlay([theme("a.css", true)]);

    expect(calls()).toHaveLength(1);
  });

  it("hands the host's palette back once the last theme is switched off", async () => {
    variables["--sidebar"] = "#1A1B26";
    variables["--foreground"] = "#A9B1D6";
    const { syncTitleBarOverlay } = await load();
    syncTitleBarOverlay([theme("tokyo-night.css", true)]);

    variables["--sidebar"] = "#0f0f0f";
    variables["--foreground"] = "#cccccc";
    syncTitleBarOverlay([theme("tokyo-night.css", false)]);

    expect(calls()).toEqual([
      [CHANNEL.titleBarOverlay, "#1A1B26", "#A9B1D6"],
      [CHANNEL.titleBarOverlay, "#0f0f0f", "#cccccc"]
    ]);
  });

  it("skips a value the browser could not resolve", async () => {
    variables["--sidebar"] = "var(--missing)";
    variables["--foreground"] = "#141413";
    const { syncTitleBarOverlay } = await load();

    syncTitleBarOverlay([theme("a.css", true)]);

    expect(calls()).toEqual([]);
  });

  it("survives a host that does not answer the channel", async () => {
    electron.ipcRenderer.invoke.mockRejectedValueOnce(new Error("no handler registered"));
    variables["--sidebar"] = "#F5F4ED";
    variables["--foreground"] = "#141413";
    const { syncTitleBarOverlay } = await load();

    expect(() => syncTitleBarOverlay([theme("a.css", true)])).not.toThrow();
  });
});
