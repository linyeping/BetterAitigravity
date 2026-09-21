// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The account card has two ways to be wrong that a cold start exposes, and both
 * were real on the running window:
 *
 * 1. Antigravity serves its window from a fresh loopback port every launch, so
 *    `localStorage` (origin-scoped) never survives a restart. The cookie is the
 *    only copy that does, because cookies ignore the port.
 * 2. The window boots onto `/onboarding?login=true` and then swaps to the
 *    signed-in shell inside the same document. A plugin that only retries on a
 *    fixed ladder spends every attempt on the login screen and gives up before
 *    the account exists.
 */

const source = readFileSync("community/plugins/gemini-app/index.js", "utf8");

const SETTINGS_BTN_SELECTOR = '[role="navigation"][aria-label="Sidebar"] [data-testid="settings-button"]';
const ACCOUNT_COOKIE_KEY = "bettergravity-account";

const mounts = new Map<string, ((element: HTMLElement) => void)[]>();
const disposers: (() => void)[] = [];

function startPlugin() {
  const plugin = {
    settings: {
      define: () => ({ workspaceColor: "blue" }),
      onChange: () => () => {},
    },
    dom: {
      observe: (selector: string, callback: (element: HTMLElement) => void) => {
        const callbacks = mounts.get(selector) ?? [];
        callbacks.push(callback);
        mounts.set(selector, callbacks);
        return () => {};
      },
    },
    react: { getFiber: () => null },
    onDispose: (cleanup: () => void) => disposers.push(cleanup),
  };
  new Function("BetterGravity", "plugin", source)({}, plugin);
}

function stopPlugin() {
  while (disposers.length) disposers.pop()?.();
  mounts.clear();
}

async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

/** The sidebar shell the account card lives in. */
function renderSignedInShell() {
  const wrapper = document.createElement("div");
  const nav = document.createElement("nav");
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", "Sidebar");
  const footer = document.createElement("div");
  const settings = document.createElement("button");
  settings.setAttribute("data-testid", "settings-button");
  footer.appendChild(settings);
  nav.appendChild(footer);
  wrapper.appendChild(nav);
  document.body.appendChild(wrapper);
}

function announceShell() {
  const button = document.querySelector(SETTINGS_BTN_SELECTOR);
  expect(button).not.toBeNull();
  for (const callback of mounts.get(SETTINGS_BTN_SELECTOR) ?? []) callback(button as HTMLElement);
}

/** A fiber chain whose second node carries the account, as the app's does. */
function fiberTreeWithAccount(status: Record<string, string>) {
  const leaf = { memoizedProps: { userStatus: status }, child: null, sibling: null, return: null };
  return { memoizedProps: {}, child: leaf, sibling: null, return: null };
}

function readCard() {
  const pill = document.getElementById("gemini-sidebar-user-pill");
  if (!pill) return null;
  return {
    name: pill.querySelector(".gemini-user-name")?.textContent ?? null,
    email: pill.querySelector(".gemini-user-email")?.textContent ?? null,
    avatar: pill.getAttribute("data-avatar"),
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
  mounts.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  stopPlugin();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("gemini-app account card", () => {
  it("seeds the card from the cookie, which outlives the loopback port", async () => {
    document.cookie = `${ACCOUNT_COOKIE_KEY}=${encodeURIComponent(
      JSON.stringify({ fullName: "景天", email: "17309497084jt@gmail.com" })
    )}; path=/`;

    // No tree on this launch: the cookie is the only thing that carried over.
    renderSignedInShell();
    startPlugin();
    await settle();
    announceShell();

    expect(readCard()).toEqual({ name: "景天", email: "17309497084jt@gmail.com", avatar: "initial" });
  });

  it("picks the account up when the signed-in shell replaces the login screen", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    startPlugin();
    await settle();

    // The ladder's whole tail runs against the login screen, where there is no
    // shell to render and no account in the tree.
    vi.advanceTimersByTime(60_000);
    await settle();
    expect(document.getElementById("gemini-sidebar-user-pill")).toBeNull();

    // Sign-in finishes: the account lands in the tree and the shell renders, in
    // the same document, with no second injection.
    (root as unknown as Record<string, unknown>)["__reactContainer$test"] = fiberTreeWithAccount({
      name: "景天",
      email: "17309497084jt@gmail.com",
      profilePictureUrl: "data:image/png;base64,AAAA",
    });
    renderSignedInShell();
    announceShell();

    // The body watcher coalesces to one attempt per 600ms.
    await settle();
    vi.advanceTimersByTime(1000);
    await settle();

    expect(readCard()).toEqual({ name: "景天", email: "17309497084jt@gmail.com", avatar: "image" });
    expect(localStorage.getItem(ACCOUNT_COOKIE_KEY)).toContain("17309497084jt@gmail.com");
  });
});
