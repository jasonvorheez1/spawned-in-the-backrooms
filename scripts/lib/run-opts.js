// New-expedition options (Shelly Nov 14: "start with no main quest, no npcs, or both and some more heavily customizable settings").
// player.state.run holds the picks for the current save; every reader goes through runOf(). Defaults = the game as it was.
export const OPTS = [
  { key: "story", label: "Main Story", hint: "Dina's trail, Chapter 2, its cutscenes and Phoebe", vals: [["on", "On"], ["off", "Off"]] },
  { key: "npcs", label: "NPCs", hint: "People in the levels: traders, crews, M.E.G. Monsters stay", vals: [["on", "On"], ["off", "Off"]] },
  { key: "tutorial", label: "Tutorial", hint: "The opening route and automatic Field Guide tips", vals: [["on", "Play it"], ["skip", "Skip"]] },
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
export const noStory = (s) => runOf(s).story === "off" || s?.run?.mode === "multi"; // multiplayer has no story (Shelly Nov 15)
export const noNpcs = (s) => runOf(s).npcs === "off";
export function cleanPick(p) {
  const out = { ...PICK_DEFAULTS };
  for (const o of OPTS) if (p && o.vals.some(([v]) => v === p[o.key])) out[o.key] = p[o.key];
  return out;
}
// what a fresh expedition keeps from the old one: who you are and how the screen reads
export const KEEP = ["look", "uiPrefs", "bodyStyle", "madeChar", "menuOpen", "menuKind", "menuView", "newRun", "saveList", "saveMsg", "studioOpen"];
// what a save snapshot leaves out: screens and cutscenes in flight
export const SKIP = new Set(["menuOpen", "menuKind", "menuView", "newRun", "saveList", "saveMsg", "cut", "arrive", "l26cut", "lrunCut", "dcut", "talkWith", "talk", "sit", "freeze", "studioOpen", "wardrobeOpen", "wrMenu", "craftOpen", "invOpen", "jrnOpen", "guideTip"]);

// Solo or Multiplayer (Shelly Nov 15): multiplayer has no story and no tutorial, starts in the Bonus Rooms and explores in a shared room.
// One character (level, gear, cash, look) rides both; each mode keeps its own story, quests and where you stood (SQL slots MODE_SLOT).
export const isMulti = (s) => s?.run?.mode === "multi";
export const MODE_SLOT = { solo: 91, multi: 92 };
export function mpRoom(who) { // your party's room, else your own: friends join it through Spawn's Invite or party
  const pid = who?.party?.id, raw = pid ? "p" + pid : (who?.userId || "guest");
  return "mp-" + (String(raw).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 48) || "guest");
}
// what belongs to one mode's run, not to the character
const STORY = new Set(["run", "quests", "qdone", "qtrack", "quest", "errands", "savePlace", "savePos", "visited", "explored", "zone", "rep", "repHistory", "fame", "infamy", "karma", "talks",
  "hubOffer", "hubSeen", "introFrom", "arrive", "arrivePending", "cut", "dark", "feed", "fieldErrAsk", "funAsk", "phoneNpc", "phoneHello", "pages", "tagsLeft", "escapes", "hordeT", "xfer", "xferTo", "wakeAtSave", "roomHop", "apts", "lootStore", "lootList", "lootName", "lootOpen"]);
export const isStoryKey = (k) => STORY.has(k) || /^(l\d|t0|lrun|dina|ch2|dcut|home|hub(?!Keys))/.test(k);
