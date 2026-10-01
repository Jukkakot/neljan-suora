import { expect, type Page } from "@playwright/test";

/** A quick-play pool unique to one test, so tests never share games. */
export const uniquePool = (name: string) => `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const board = (page: Page) => page.getByRole("group", { name: "Pelilauta" });

/** Opens the start screen in `pool`, enters `nickname`, taps "Luo peli" and waits for the waiting room. */
export async function createGame(page: Page, pool: string, nickname: string) {
  await page.goto(`/?pool=${pool}`);
  await page.getByRole("textbox", { name: "Nimimerkki" }).fill(nickname);
  await page.getByRole("button", { name: "Luo peli", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Odotushuone" })).toBeVisible();
}

/** Opens the invite link of game `id` in `pool`, enters `nickname`, joins and waits for the waiting room. */
export async function joinByInvite(page: Page, pool: string, id: string, nickname: string) {
  await page.goto(`/?pool=${pool}&game=${id}`);
  await page.getByRole("textbox", { name: "Nimimerkki" }).fill(nickname);
  await page.getByRole("button", { name: "Liity peliin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Odotushuone" })).toBeVisible();
}

/** Whether it is the viewer's turn now. */
export const isMyTurn = (page: Page) => page.getByText("Sinun vuorosi", { exact: true }).isVisible();

/** Whether the game on the page has finished (the result table is shown). */
export const isOver = (page: Page) => page.getByRole("table", { name: "Tulokset" }).isVisible();

/**
 * Plays the leftmost column that is not full as on a phone: tap it to choose (the berry is previewed
 * where it would land), tap the preview to confirm. Taps, not clicks, so the test moves like a
 * player does. Returns the cell the disc landed in.
 */
export async function playFirstColumn(page: Page): Promise<number> {
  const open = board(page).locator("[data-column]:not([disabled])").first();
  await open.tap();
  await expect(open).toHaveAttribute("aria-pressed", "true");
  // The landing cell: the lowest empty one of the column.
  const cell = Number(await open.locator("[data-owner='0']").last().getAttribute("data-cell"));
  await open.tap();
  await expect(board(page).locator(`[data-cell='${cell}']`)).not.toHaveAttribute("data-owner", "0");
  return cell;
}

/** The game id shown in the top bar. */
export async function gameId(page: Page): Promise<string> {
  const label = await page.getByRole("button", { name: /^Peli .* Napauta jakaaksesi pelin linkin\.$/ }).getAttribute("aria-label");
  return label!.replace(/^Peli (.*)\. Napauta jakaaksesi pelin linkin\.$/, "$1");
}
