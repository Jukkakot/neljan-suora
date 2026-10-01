// Adds or refreshes this game's card on the games front page (Jukkakot/Jukkakot.github.io):
// a screenshot of a running bot game from the local dev client, plus a card in its index.html.
// Run it while `npm run dev` is up. Rerun it whenever the look changes; it updates the same card.
//
//   npm run homepage-card [-- --push] [--home <dir>] [--url <url>] [--wait <s>] [--live|--soon]
//
// - The front page checkout defaults to ../Jukkakot.github.io and is cloned there when missing.
// - Before the game's Pages site exists the card is marked "Tulossa" and links to the GitHub repo;
//   once https://jukkakot.github.io/<name>/ answers, it links to the game (override: --live/--soon).
// - Commits in the front page checkout; pushes only with --push.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const NAME = "neljan-suora";
const OWNER = "Jukkakot";
const HOME_REPO = `${OWNER}/${OWNER}.github.io`;

const { values } = parseArgs({
  options: {
    home: { type: "string" },
    url: { type: "string", default: "http://localhost:5193/?dev=0v2" },
    wait: { type: "string", default: "5" },
    push: { type: "boolean", default: false },
    live: { type: "boolean", default: false },
    soon: { type: "boolean", default: false },
  },
});

const home = resolve(values.home ?? join(ROOT, "..", `${OWNER}.github.io`));
const git = (command) => execSync(`git ${command}`, { cwd: home, encoding: "utf8" }).trim();
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const title = /<title>([^<]+)<\/title>/.exec(readFileSync(join(ROOT, "client/index.html"), "utf8"))?.[1].trim();
if (!title) throw new Error("No <title> in client/index.html");

const gameUrl = `https://${OWNER.toLowerCase()}.github.io/${NAME}/`;
const repoUrl = `https://github.com/${OWNER}/${NAME}`;
const live = values.live || (!values.soon && (await fetch(gameUrl, { method: "HEAD" }).then((r) => r.ok, () => false)));

if (!existsSync(home)) {
  execSync(`git clone https://github.com/${HOME_REPO}.git "${home}"`, { stdio: "inherit" });
} else {
  git("pull --ff-only");
}

// Screenshot: wide layout (board beside the controls), dark theme, as the other cards.
const image = `images/${NAME}.jpg`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, colorScheme: "dark" });
  await page.goto(values.url).catch(() => {
    throw new Error(`Cannot open ${values.url}: is \`npm run dev\` running?`);
  });
  await page.waitForTimeout(Number(values.wait) * 1000);
  await page.screenshot({ path: join(home, image), type: "jpeg", quality: 82 });
} finally {
  await browser.close();
}

const indexPath = join(home, "index.html");
const index = readFileSync(indexPath, "utf8");
const existing = new RegExp(`\\n? *<a class="card[^"]*" data-game="${NAME}"[\\s\\S]*?</a>`).exec(index);
const year = (existing && /<span class="year">([^<]+)<\/span>/.exec(existing[0])?.[1]) ?? String(new Date().getFullYear());
const badge = live ? "" : ` <span class="badge">Tulossa</span>`;
const card = `
    <a class="card${live ? "" : " soon"}" data-game="${NAME}" href="${live ? gameUrl : repoUrl}">
      <img src="${image}" alt="${escape(title)} -pelin näkymä" width="800" height="600" loading="lazy">
      <span class="info"><span class="name">${escape(title)}${badge}</span><span class="year">${year}</span></span>
    </a>`;
const updated = existing
  ? index.replace(existing[0], card)
  : index.replace(/<main class="grid">/, (grid) => grid + card);
if (updated === index && !existing) throw new Error(`No <main class="grid"> in ${indexPath}`);
writeFileSync(indexPath, updated);

git(`add index.html "${image}"`);
if (git("status --porcelain")) {
  git(`commit -m "feat: ${existing ? "update" : "add"} ${title} on the games page"`);
  if (values.push) git("push");
}
console.log(`${title}: card ${existing ? "updated" : "added"} (${live ? "live" : "Tulossa"}) in ${home}${values.push ? ", pushed" : " (not pushed: --push)"}`);
