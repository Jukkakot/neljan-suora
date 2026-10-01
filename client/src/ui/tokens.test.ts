import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The theme's colour rules, checked on the values in tokens.css (visual-theme spec).
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

/** The custom properties declared directly in the block that starts at `selector {`. */
function block(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  const tokens = new Map<string, string>();
  for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) tokens.set(name!, value!.trim());
  return tokens;
}

const light = block(":root");
const darkMedia = block(':root:not([data-theme="light"])');
const darkForced = block(':root[data-theme="dark"]');
const themes = { light, dark: darkForced };

function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function hue(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const get = (tokens: Map<string, string>, name: string) => {
  const value = tokens.get(name);
  if (!value) throw new Error(`missing ${name}`);
  return value;
};

describe("visual-theme › Light and dark themes", () => {
  it("the two dark blocks are identical", () => {
    // The forced block also sets color-scheme, which the media block leaves to :root.
    const forced = new Map([...darkForced].filter(([name]) => name !== "color-scheme"));
    expect(Object.fromEntries(darkMedia)).toEqual(Object.fromEntries(forced));
  });

  for (const [name, tokens] of Object.entries(themes)) {
    it(`${name}: text and muted keep 4.5:1 on bg and surface`, () => {
      for (const fg of ["--text", "--muted"])
        for (const bg of ["--bg", "--surface"]) expect(contrast(get(tokens, fg), get(tokens, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name}: each berry keeps 3:1 on an empty hole`, () => {
      for (const seat of ["--seat-1", "--seat-2"]) expect(contrast(get(tokens, seat), get(tokens, "--cell")), seat).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("visual-theme › Own look, not the commercial game's", () => {
  for (const [name, tokens] of Object.entries(themes)) {
    it(`${name}: no yellow seat, no blue board`, () => {
      for (const seat of ["--seat-1", "--seat-2", "--seat-3", "--seat-4"]) {
        const h = hue(get(tokens, seat));
        expect(h >= 40 && h <= 70, `${seat} hue ${h.toFixed(0)}`).toBe(false);
      }
      const board = hue(get(tokens, "--board"));
      expect(board >= 190 && board <= 260, `--board hue ${board.toFixed(0)}`).toBe(false);
    });
  }
});
