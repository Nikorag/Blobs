import type { Browser, BrowserContext, Page } from "@playwright/test";

/** A fresh player: own storage (so own identity), studio splash skipped. */
export async function newPlayer(browser: Browser, name: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((n) => {
    localStorage.setItem("zonto:studio-splash-at", String(Date.now()));
    localStorage.setItem("blobs:player", JSON.stringify({ id: crypto.randomUUID(), name: n }));
  }, name);
  const page = await context.newPage();
  return { context, page };
}

const hand = (page: Page) => page.locator('[aria-label="Your hand"] button');

/**
 * Do whatever this player can do right now: make a call (the lowest allowed) or play a legal card.
 * Returns what it did, or null if it isn't their turn.
 */
export async function takeTurn(page: Page): Promise<"call" | "play" | null> {
  const call = page.locator("main .grid.grid-cols-4 button:enabled").first();
  if (await call.isVisible().catch(() => false)) {
    await call.click();
    return "call";
  }
  const playable = page.locator('[aria-label="Your hand"] button[data-pad-default]');
  if ((await playable.count()) > 0) {
    const card = playable.first();
    await card.click();
    // With several legal cards the first tap only raises it; tap again to play.
    if ((await card.getAttribute("aria-label").catch(() => null))?.includes("selected")) {
      await card.click();
    }
    return "play";
  }
  return null;
}

export const handSize = (page: Page) => hand(page).count();
