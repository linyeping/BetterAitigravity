// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The account card has three ways to be wrong that the running window exposed,
 * and all three were real:
 *
 * 1. Antigravity serves its window from a fresh loopback port every launch, so
 *    `localStorage` (origin-scoped) never survives a restart. The cookie is the
 *    only copy that does, because cookies ignore the port.
 * 2. The window boots onto `/onboarding?login=true` and then swaps to the
 *    signed-in shell inside the same document. A plugin that only retries on a
 *    fixed ladder spends every attempt on the login screen and gives up before
 *    the account exists.
 * 3. A card that is complete is not a card that is finished. Signing out and
 *    back in as somebody else changes the account under a card that already
 *    looked right, and a watcher that stops once the profile is complete never
 *    notices.
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

/** Puts the account the app publishes to its own components, as sign-in does. */
function publishAccount(root: HTMLElement, status: Record<string, string>) {
  (root as unknown as Record<string, unknown>)["__reactContainer$test"] = fiberTreeWithAccount(status);
}

/** Any re-render is a body mutation, which is what the watcher listens for. */
function nudgeBody() {
  const marker = document.createElement("span");
  document.body.appendChild(marker);
  marker.remove();
}

const FIRST_ACCOUNT = {
  name: "景天",
  email: "17309497084jt@gmail.com",
  profilePictureUrl: "data:image/png;base64,AAAA",
};
const SECOND_ACCOUNT = {
  name: "林业平",
  email: "yepinglin20@gmail.com",
  profilePictureUrl: "data:image/png;base64,BBBB",
};

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
    publishAccount(root, FIRST_ACCOUNT);
    renderSignedInShell();
    announceShell();

    // The body watcher coalesces to one attempt per 600ms.
    await settle();
    vi.advanceTimersByTime(1000);
    await settle();

    expect(readCard()).toEqual({ name: "景天", email: "17309497084jt@gmail.com", avatar: "image" });
    expect(localStorage.getItem(ACCOUNT_COOKIE_KEY)).toContain("17309497084jt@gmail.com");
  });

  it("follows the account when a different one signs in", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    publishAccount(root, FIRST_ACCOUNT);
    renderSignedInShell();
    startPlugin();
    await settle();
    announceShell();
    vi.advanceTimersByTime(1000);
    await settle();
    expect(readCard()).toEqual({ name: "景天", email: "17309497084jt@gmail.com", avatar: "image" });

    // The card is complete now, which is exactly the state that used to stop the
    // watching. The first account signs out and a second one signs in.
    publishAccount(root, SECOND_ACCOUNT);
    nudgeBody();
    vi.advanceTimersByTime(2500);
    await settle();

    expect(readCard()).toEqual({ name: "林业平", email: "yepinglin20@gmail.com", avatar: "image" });
    expect(localStorage.getItem(ACCOUNT_COOKIE_KEY)).toContain("yepinglin20@gmail.com");
    expect(document.cookie).toContain(encodeURIComponent("yepinglin20@gmail.com"));
  });

  it("drops the previous account's photo when the new one has none", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    publishAccount(root, FIRST_ACCOUNT);
    renderSignedInShell();
    startPlugin();
    await settle();
    announceShell();
    vi.advanceTimersByTime(1000);
    await settle();
    expect(readCard()?.avatar).toBe("image");

    // A merge would keep the first account's photo here, because a field the new
    // account does not carry is left alone. A different address is a different
    // person, so nothing of the old one may survive it.
    publishAccount(root, { name: "林业平", email: "yepinglin20@gmail.com" });
    nudgeBody();
    vi.advanceTimersByTime(2500);
    await settle();

    expect(readCard()).toEqual({ name: "林业平", email: "yepinglin20@gmail.com", avatar: "initial" });
  });
});
