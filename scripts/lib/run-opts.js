// New-expedition options (Shelly Nov 14: "start with no main quest, no npcs, or both and some more heavily customizable settings").
// player.state.run holds the picks for the current save; every reader goes through runOf(). Defaults = the game as it was.
export const OPTS = [
  { key: "story", label: "Main Story", hint: "Dina's trail, Chapter 2, its cutscenes and Phoebe", vals: [["on", "On"], ["off", "Off"]] },
  { key: "npcs", label: "NPCs", hint: "People in the levels: traders, crews, M.E.G. Monsters stay", vals: [["on", "On"], ["off", "Off"]] },
  { key: "tutorial", label: "Tutorial", hint: "The first walk through Level 0", vals: [["on", "Play it"], ["skip", "Skip"]] },
  { key: "needs", label: "Hunger & Thirst", hint: "How fast food and water run down", vals: [["off", "Off"], ["easy", "Slow"], ["normal", "Normal"], ["harsh", "Harsh"]] },
  { key: "sanity", label: "Sanity Drain", hint: "How fast the halls get to you", vals: [["off", "Off"], ["easy", "Slow"], ["normal", "Normal"], ["harsh", "Harsh"]] },
  { key: "god", label: "God Mode", hint: "Never hurt, never hungry", vals: [["off", "Off"], ["on", "On"]] },
];
export const DEFAULTS = { story: "on", npcs: "on", tutorial: "on", needs: "normal", sanity: "normal", god: "off" };
// a fresh expedition's picks start here: main story off (Shelly Nov 14: "have main story be off by default"); an old save with no picks keeps DEFAULTS
export const PICK_DEFAULTS = { ...DEFAULTS, story: "off" };
export const RATE = { off: 0, easy: 0.5, normal: 1, harsh: 1.75 }; // her pick
export const PRESETS = { // one press sets the row
  classic: { label: "Classic", v: { ...DEFAULTS } },
  sandbox: { label: "Sandbox", v: { story: "off", npcs: "on", tutorial: "skip", needs: "easy", sanity: "easy", god: "off" } },
  alone: { label: "Alone", v: { story: "off", npcs: "off", tutorial: "skip", needs: "normal", sanity: "normal", god: "off" } },
  survivor: { label: "Survivor", v: { story: "on", npcs: "on", tutorial: "on", needs: "harsh", sanity: "harsh", god: "off" } },
};
export const runOf = (s) => ({ ...DEFAULTS, ...(s?.run ?? {}) });
export const needsMul = (s) => RATE[runOf(s).needs] ?? 1;
export const sanityMul = (s) => RATE[runOf(s).sanity] ?? 1;
export const noStory = (s) => runOf(s).story === "off";
export const noNpcs = (s) => runOf(s).npcs === "off";
export function cleanPick(p) {
  const out = { ...PICK_DEFAULTS };
  for (const o of OPTS) if (p && o.vals.some(([v]) => v === p[o.key])) out[o.key] = p[o.key];
  return out;
}
// what a fresh expedition keeps from the old one: who you are and how the screen reads
export const KEEP = ["look", "uiPrefs", "bodyStyle", "madeChar", "menuOpen", "menuKind", "menuView", "newRun", "saveList", "saveMsg", "studioOpen"];
// what a save snapshot leaves out: screens and cutscenes in flight
export const SKIP = new Set(["menuOpen", "menuKind", "menuView", "newRun", "saveList", "saveMsg", "cut", "arrive", "l26cut", "lrunCut", "dcut", "talkWith", "talk", "sit", "freeze", "studioOpen", "wardrobeOpen", "wrMenu", "craftOpen", "invOpen"]);
