// The motion registry — one door to every authored clip in the library.
//
// require() takes no dynamic paths, so every group module is listed here by
// hand: adding a group is one line in GROUPS plus its file. Each group module
// exports its clip functions AND a MANIFEST array describing them, and the
// shelf's motion cards are built from what this file collects.

const social = require("lib/motion-social.js");
const locomotion = require("lib/motion-locomotion.js");
const combat = require("lib/motion-combat.js");
const military = require("lib/motion-military.js");
const rest = require("lib/motion-rest.js");
const quadruped = require("lib/motion-quadruped.js");
const serpent = require("lib/motion-serpent.js");

const GROUPS = {
  social: social,
  locomotion: locomotion,
  combat: combat,
  military: military,
  rest: rest,
  quadruped: quadruped,
  serpent: serpent,
};

// How each group reads on a card, and the order the groups appear in.
const GROUP_META = {
  locomotion: { label: "Move", icon: "🏃" },
  combat: { label: "Fight", icon: "⚔️" },
  military: { label: "War", icon: "🎖️" },
  rest: { label: "Rest & work", icon: "🪑" },
  social: { label: "Social", icon: "💬" },
  quadruped: { label: "Four-legged", icon: "🐺" },
  serpent: { label: "Slither", icon: "🐍" },
};

const BY_KEY = {};
const ROWS = [];

for (const groupName of Object.keys(GROUP_META)) {
  const mod = GROUPS[groupName] || {};
  const manifest = mod.MANIFEST || [];
  for (const entry of manifest) {
    const fn = mod[entry.key];
    if (typeof fn !== "function") continue;
    const row = {
      key: entry.key,
      label: entry.label || entry.key,
      group: entry.group || groupName,
      loop: entry.loop || "loop",
      tags: (entry.tags || []).slice(),
      seconds: Number(fn.duration) || 2,
      fn: fn,
    };
    BY_KEY[row.key] = row;
    ROWS.push(row);
  }
}

// The clip function itself — what updateChannel wants.
export function get(key) {
  const row = BY_KEY[String(key || "")];
  return row ? row.fn : null;
}

export function rowFor(key) {
  return BY_KEY[String(key || "")] || null;
}

// Card-shaped copies: everything a panel needs, and nothing that can't cross
// realms (no functions).
export function cards() {
  return ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    group: r.group,
    groupLabel: (GROUP_META[r.group] || {}).label || r.group,
    icon: (GROUP_META[r.group] || {}).icon || "🎞️",
    loop: r.loop,
    tags: r.tags.slice(),
    seconds: r.seconds,
  }));
}

module.exports = {
  GROUP_META: GROUP_META,
  BY_KEY: BY_KEY,
  ROWS: ROWS,
  get: get,
  rowFor: rowFor,
  cards: cards,
};
