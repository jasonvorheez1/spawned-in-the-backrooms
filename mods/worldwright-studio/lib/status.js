// status — the card status vocabulary and its colours. Never mix theme colour into it.

const STATUSES = [
  { name: "Idea", color: "oklch(0.88 0.15 100)", ink: "oklch(0.24 0.03 100)", hue: 100 }, // yellow — the spark
  { name: "Outline", color: "oklch(0.75 0.11 235)", ink: "oklch(0.22 0.03 245)", hue: 235 }, // sky blue
  { name: "Drafting", color: "oklch(0.50 0.13 250)", ink: "oklch(0.97 0.01 250)", hue: 250 }, // deep blue
  { name: "Revising", color: "oklch(0.75 0.15 65)", ink: "oklch(0.23 0.03 65)", hue: 65 }, // orange
  { name: "Needs Research", color: "oklch(0.65 0.13 350)", ink: "oklch(0.22 0.02 350)", hue: 350 }, // reddish purple
  { name: "On Hold", color: "oklch(0.58 0.18 35)", ink: "oklch(0.98 0.01 35)", hue: 35 }, // vermillion
  { name: "Final", color: "oklch(0.58 0.12 165)", ink: "oklch(0.98 0.01 165)", hue: 165 }, // bluish green
  { name: "Archived", color: "oklch(0.55 0.01 280)", ink: "oklch(0.97 0 0)", hue: 280 }, // grey — put away
];

const STATUS_HUE = {};
const STATUS_COLOR = {};
const STATUS_INK = {};
for (const s of STATUSES) {
  const k = s.name.toLowerCase();
  STATUS_HUE[k] = s.hue;
  STATUS_COLOR[k] = s.color;
  STATUS_INK[k] = s.ink;
}

export function lower(s) {
  return String(s == null ? "" : s).toLowerCase();
}

// An imported word off the list gets a stable colour from its own letters — input handling, not a legacy lane.
export function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function statusHue(status) {
  const s = lower(status);
  if (Object.prototype.hasOwnProperty.call(STATUS_HUE, s)) return STATUS_HUE[s];
  return hashHue(s);
}

// The SAME string under every theme; an imported word gets a mid-lightness expression from its hash.
export function statusColor(status) {
  const s = lower(status);
  if (Object.prototype.hasOwnProperty.call(STATUS_COLOR, s)) return STATUS_COLOR[s];
  return "oklch(0.62 0.14 " + hashHue(s) + ")";
}

// The text that sits on that surface. Legacy hash colours sit at 0.62 lightness — light ink reads.
export function statusInk(status) {
  const s = lower(status);
  if (Object.prototype.hasOwnProperty.call(STATUS_INK, s)) return STATUS_INK[s];
  return "oklch(0.97 0 0)";
}

module.exports = {
  STATUSES: STATUSES,
  STATUS_HUE: STATUS_HUE,
  STATUS_COLOR: STATUS_COLOR,
  STATUS_INK: STATUS_INK,
  statusHue: statusHue,
  statusColor: statusColor,
  statusInk: statusInk,
};
