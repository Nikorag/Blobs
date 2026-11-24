import { expect, test } from "@playwright/test";
import { handSize, newPlayer, takeTurn } from "./helpers";

test("two players: create, join by code, ready, start, call and play a card", async ({ browser }) => {
  const host = await newPlayer(browser, "Hosty");
  const guest = await newPlayer(browser, "Guesty");

  await host.page.goto("/");
  await host.page.getByRole("button", { name: "Create a game" }).click();
  await expect(host.page.getByText("Game code", { exact: true })).toBeVisible();
  const code = (await host.page.locator("span.text-6xl").innerText()).trim();
  expect(code).toMatch(/^[A-Z]{4}$/);

  await guest.page.goto("/");
  await guest.page.getByLabel("Room code").fill(code);
  await guest.page.getByRole("button", { name: "Join" }).click();
  await expect(guest.page.getByText("Game code", { exact: true })).toBeVisible();
  await expect(host.page.getByText("Guesty")).toBeVisible(); // the host sees the guest arrive

  await guest.page.getByRole("button", { name: "I'm ready" }).click();
  const start = host.page.getByRole("button", { name: "Start game" });
  await expect(start).toBeEnabled();
  await start.click();

  // Both see the table and a full hand of 7 (two players get 7 cards each).
  for (const { page } of [host, guest]) await expect.poll(() => handSize(page)).toBe(7);

  // Take turns until one card has been played: both calls first, then the leader plays.
  const calls = new Set<string>();
  await expect
    .poll(
      async () => {
        for (const [who, { page }] of [["host", host], ["guest", guest]] as const) {
          const did = await takeTurn(page);
          if (did === "call") calls.add(who);
        }
        return (await handSize(host.page)) + (await handSize(guest.page));
      },
      { timeout: 60_000, intervals: [700] },
    )
    .toBeLessThan(14);
  expect(calls.size).toBe(2); // each player made a call before play began

  await host.context.close();
  await guest.context.close();
});

test("a stranger's code gets a friendly error, not a crash", async ({ browser }) => {
  const p = await newPlayer(browser, "Lost");
  await p.page.goto("/");
  await p.page.getByLabel("Room code").fill("ZZZZ");
  await p.page.getByRole("button", { name: "Join" }).click();
  await expect(p.page.getByText("No game found with that code")).toBeVisible();
  await p.context.close();
});
