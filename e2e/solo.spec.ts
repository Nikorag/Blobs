import { expect, test } from "@playwright/test";
import { handSize, newPlayer, takeTurn } from "./helpers";

test("play vs CPU, then reload and resume from the home screen", async ({ browser }) => {
  const { context, page } = await newPlayer(browser, "Solo");
  await page.goto("/");
  await page.getByRole("button", { name: "Play vs CPU" }).click();
  await page.getByRole("button", { name: "Deal me in" }).click();
  await expect(page).toHaveURL(/\/solo/);
  await expect.poll(() => handSize(page), { timeout: 20_000 }).toBeGreaterThan(0);
  const dealt = await handSize(page);

  // Call, then play a couple of cards while the CPUs take their turns.
  await expect
    .poll(
      async () => {
        await takeTurn(page);
        return handSize(page);
      },
      { timeout: 90_000, intervals: [700] },
    )
    .toBeLessThan(dealt - 1);

  await page.reload();
  await expect.poll(() => handSize(page), { timeout: 20_000 }).toBeGreaterThan(0);
  await page.goto("/");
  const resume = page.getByRole("link", { name: /Resume game/ });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page).toHaveURL(/\/solo/);
  await expect.poll(() => handSize(page), { timeout: 20_000 }).toBeLessThan(dealt);
  await context.close();
});
