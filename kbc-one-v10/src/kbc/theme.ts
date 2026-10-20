import { FONTS, type FontId, type StyleId, type Theme, type Customer } from "./types";

// Generated themes are data, never CSS. Code checks contrast and fixes what fails.

const HEX = /^#[0-9a-fA-F]{6}$/;
const MOTIFS = [
  "none",
  "hearts",
  "sparkles",
  "dots",
  "waves",
  "stars",
] as const;

function lum(hex: string) {
  const v = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function mix(hex: string, to: string, t: number) {
  const ch = (h: string, i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) =>
      Math.round(ch(hex, i) + (ch(to, i) - ch(hex, i)) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Push `fg` towards black or white until it reaches `min` contrast on every background. */
function ensure(fg: string, bgs: string[], min: number) {
  const ok = (c: string) => bgs.every((b) => contrast(c, b) >= min);
  if (ok(fg)) return fg;
  const target = ["#000000", "#ffffff"].sort((a, b) =>
    Math.min(...bgs.map((bg) => contrast(b, bg))) - Math.min(...bgs.map((bg) => contrast(a, bg)))
  )[0];
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(fg, target, t);
    if (ok(c)) return c;
  }
  return target;
}

export type ThemeCheck = { theme: Theme; fixes: string[] };

export function validateTheme(raw: unknown): ThemeCheck | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const col = (r.colors ?? {}) as Record<string, unknown>;
  const pick = (k: string, d: string) =>
    typeof col[k] === "string" && HEX.test(col[k] as string)
      ? (col[k] as string).toLowerCase()
      : d;
  const fixes: string[] = [];
  const bg = pick("bg", "#fff5f9");
  let surface = pick("surface", "#ffffff");
  let text = pick("text", "#3b0a24");
  let muted = pick("muted", "#8a4a6b");
  let accent = pick("accent", "#e0457b");
  let accentText = pick("accentText", "#ffffff");

  // Opposite light/dark surfaces cannot always share readable text. Keep a safe pair.
  if (!["#000000", "#ffffff"].some((fg) => [bg, surface].every((b) => contrast(fg, b) >= 4.5))) {
    surface = bg;
    fixes.push("surfaces aligned for readable text");
  }
  const t2 = ensure(text, [bg, surface], 4.5);
  if (t2 !== text) fixes.push("text adjusted for contrast");
  text = t2;
  const m2 = ensure(muted, [bg, surface], 4.5);
  if (m2 !== muted) fixes.push("secondary text adjusted for contrast");
  muted = m2;
  const a2 = ensure(accent, [bg, surface], 4.5);
  if (a2 !== accent) fixes.push("accent adjusted for readable links");
  accent = a2;
  const buttonText = ensure(accentText, [accent], 4.5);
  if (buttonText !== accentText) fixes.push("button text colour fixed");
  accentText = buttonText;
  const base = (["calm", "cards", "dense", "large"] as StyleId[]).includes(
    r.base as StyleId,
  )
    ? (r.base as StyleId)
    : "cards";
  const font = FONTS.includes(r.font as FontId) ? (r.font as FontId) : "inter";
  const motif = MOTIFS.includes(r.motif as (typeof MOTIFS)[number])
    ? (r.motif as Theme["motif"])
    : "none";
  const radius = Math.max(4, Math.min(32, Number(r.radius) || 20));
  const name =
    typeof r.name === "string" && r.name.trim()
      ? r.name.trim().slice(0, 30)
      : "My theme";
  return {
    theme: {
      name,
      base,
      colors: { bg, surface, text, muted, accent, accentText },
      radius,
      font,
      motif,
    },
    fixes,
  };
}

export const FONT_LABEL: Record<FontId, string> = {
  inter: "Inter (clean)",
  quicksand: "Quicksand (soft, rounded)",
  nunito: "Nunito (friendly)",
  space: "Space Grotesk (techy)",
  serif: "DM Serif Display (elegant)",
};


/** Safe dark rose tokens preserve the glass app and its readable controls. */
export const ROSE_THEME: Theme = {
  name: "Rose", base: "calm", colors: {
    bg: "#24121f", surface: "#351c2d", text: "#fff0f7", muted: "#deb3cc",
    accent: "#f472b6", accentText: "#2a0b1c",
  }, radius: 22, font: "inter", motif: "none",
};


export const LOOK_HISTORY_LIMIT = 8;
export const KBC_LOOK_ID = "kbc";

/** Names can change without making a duplicate of the same visual tokens. */
export function sameLook(a: Theme, b: Theme) {
  const { name: _a, ...tokensA } = a;
  const { name: _b, ...tokensB } = b;
  return JSON.stringify(tokensA) === JSON.stringify(tokensB);
}

export function rememberLook(c: Customer, theme: Theme): string {
  const looks = c.looks ?? [];
  const existing = looks.find((look) => sameLook(look.theme, theme));
  const look = existing ?? { id: crypto.randomUUID(), theme: structuredClone(theme) };
  c.looks = [look, ...looks.filter((item) => item.id !== look.id)].slice(0, LOOK_HISTORY_LIMIT);
  return look.id;
}

/** A switch changes selection, never discards the customer's saved looks. */
export function selectLook(c: Customer, theme: Theme | null) {
  const oldId = c.theme ? rememberLook(c, c.theme) : KBC_LOOK_ID;
  const nextId = theme ? rememberLook(c, theme) : KBC_LOOK_ID;
  if (oldId !== nextId) c.previousLookId = oldId;
  c.activeLookId = nextId;
  c.theme = theme ? structuredClone(c.looks!.find((look) => look.id === nextId)!.theme) : undefined;
}
