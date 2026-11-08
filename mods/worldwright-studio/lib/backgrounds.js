// Slate's existing backdrop. Retired theme modes had no remaining picker or authored rows.
// Preserve the colour output and light/dark handling; no personal background machinery.
export function mix(a, pct, b) {
  return "color-mix(in oklch, " + a + " " + pct + ", " + b + ")";
}
export function isDark(theme) {
  const t = theme || {};
  return String((t.chrome && t.chrome.mode) || t.mode || "").trim().toLowerCase() !== "light";
}
const CLEAR = "transparent";
const FRAME = `
  /* System 16 — the backdrop lives on the centre pane's own pseudo-elements, so nothing in the
     grid or the page has to know it is there. Content is lifted one layer; the paint stays below. */
  #sb-center { position: relative; overflow: hidden; }
  #sb-center > * { position: relative; z-index: 1; }`;

const UNDER = "content: \"\"; position: absolute; inset: 0; z-index: 0; pointer-events: none;";


export function colourCss(t) {
  const dark = isDark(t);
  const top = mix("var(--sb-lift)", dark ? "5%" : "11%", CLEAR);
  const sink = mix("var(--sb-shadow)", dark ? "36%" : "17%", CLEAR);
  return `
  #sb-center::before {
    ${UNDER}
    background-image:
      radial-gradient(120% 88% at 50% -8%, ${top}, transparent 64%),
      radial-gradient(150% 120% at 50% 108%, ${sink}, transparent 66%);
  }`;
}

export function css(theme) {
  return FRAME + colourCss(theme || {});
}
module.exports = { css };
