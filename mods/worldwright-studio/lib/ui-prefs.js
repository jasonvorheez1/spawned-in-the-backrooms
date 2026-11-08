// ui-prefs.js — the ONE place a pure render module turns handed-in state into a preference it can trust. lib/config.js clamps only audioMaster and fontScale, so these strings can hold anything: every read below falls back to the app's own default rather than painting an unknown value.

const ALLOWED = {
  cardGrid: ["small", "medium", "large"],
  pageView: ["grid", "list", "page"],
  scrollBehavior: ["smooth", "instant"],
};

// pageView falls back to "page", NOT the stored default "grid" — an unwired page render has no author behind it.
const FALLBACK = {
  cardGrid: "medium",
  pageView: "page",
  scrollBehavior: "smooth",
};

export function pick(state, key) {
  const s = state && typeof state === "object" ? state : {};
  const bag = s.prefs && typeof s.prefs === "object" ? s.prefs : {};
  const raw = s[key] === undefined || s[key] === null ? bag[key] : s[key];
  const v = String(raw === undefined || raw === null ? "" : raw);
  const set = ALLOWED[key] || [];
  return set.indexOf(v) >= 0 ? v : FALLBACK[key];
}

export function wired(state, key) {
  const s = state && typeof state === "object" ? state : {};
  const bag = s.prefs && typeof s.prefs === "object" ? s.prefs : {};
  const raw = s[key] === undefined || s[key] === null ? bag[key] : s[key];
  const v = String(raw === undefined || raw === null ? "" : raw);
  return (ALLOWED[key] || []).indexOf(v) >= 0;
}

export function cardGrid(state) {
  return pick(state, "cardGrid");
}

export function pageView(state) {
  return pick(state, "pageView");
}

export function scrollBehavior(state) {
  return pick(state, "scrollBehavior");
}

// CSS says "auto" where the settings row says "instant".
export function scrollCss(state) {
  return scrollBehavior(state) === "instant" ? "auto" : "smooth";
}

module.exports = {
  ALLOWED,
  FALLBACK,
  pick,
  wired,
  cardGrid,
  pageView,
  scrollBehavior,
  scrollCss,
};
