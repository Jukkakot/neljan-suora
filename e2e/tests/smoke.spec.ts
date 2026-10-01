import { expect, test, type Page } from "@playwright/test";
import { board, createGame, gameId, isMyTurn, isOver, joinByInvite, markFirstFree, uniquePool } from "./helpers.ts";

/** Plays until the game is over: whichever page is on turn marks its first empty cell. */
async function playToTheEnd(pages: Page[]) {
  for (let moves = 0; moves < 20; moves++) {
    if (await isOver(pages[0]!)) return;
    for (const page of pages) {
      if (await isMyTurn(page)) {
        await markFirstFree(page);
        break;
      }
    }
    // A bot or the other player answers: wait for a turn or the end.
    await expect
      .poll(async () => (await Promise.all(pages.map(async (p) => (await isMyTurn(p)) || (await isOver(p))))).some(Boolean), { timeout: 10_000 })
      .toBe(true);
  }
  throw new Error("the game did not end");
}

/** The phone layout holds: the board fits the screen and nothing scrolls sideways. */
async function fitsPhone(page: Page) {
  expect(page.viewportSize()).toEqual({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = (await board(page).boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(360);
}

test("a game against a bot on the device, played to the end", async ({ page }) => {
  await page.goto(`/?pool=${uniquePool("bot")}`);
  await page.getByRole("textbox", { name: "Nimimerkki" }).fill("Maija");
  await page.getByRole("button", { name: "Pelaa bottia vastaan" }).click();
  await expect(board(page).locator("[data-cell]")).toHaveCount(9);
  await fitsPhone(page);

  await playToTheEnd([page]);
  await expect(page.getByRole("table", { name: "Tulokset" })).toContainText("Maija");
  await expect(page.getByRole("button", { name: "Pelaa uudelleen" })).toBeVisible();
});

test("two players meet in the waiting room, the host starts, and they play to the end", async ({ browser }) => {
  const pool = uniquePool("smoke");
  const host = await (await browser.newContext({ ...test.info().project.use })).newPage();
  const guest = await (await browser.newContext({ ...test.info().project.use })).newPage();

  await createGame(host, pool, "Maija");
  await joinByInvite(guest, pool, await gameId(host), "Pekka");
  expect(await gameId(guest)).toBe(await gameId(host));
  expect(await gameId(host)).toMatch(/^[a-z]+(-[a-z]+)+$/);

  await expect(host.locator("li[data-seat]:not([data-free])")).toHaveCount(2);
  await expect(guest.getByText("Odotetaan, että Maija aloittaa pelin")).toBeVisible();
  await host.getByRole("button", { name: "Aloita peli" }).click();

  for (const [page, me] of [
    [host, "Maija (sinä)"],
    [guest, "Pekka (sinä)"],
  ] as const) {
    await expect(board(page).locator("[data-cell]")).toHaveCount(9);
    await expect(page.getByRole("list", { name: "Pelaajat" })).toContainText(me);
    await fitsPhone(page);
  }

  await playToTheEnd([host, guest]);
  for (const page of [host, guest]) {
    await expect(page.getByRole("table", { name: "Tulokset" })).toBeVisible();
    await expect(board(page).locator("[data-owner='1']").first()).toBeVisible();
  }
  // Both boards show the same marks.
  const marks = (page: Page) => board(page).locator("[data-cell]").evaluateAll((cells) => cells.map((c) => c.getAttribute("data-owner")));
  expect(await marks(guest)).toEqual(await marks(host));
});
