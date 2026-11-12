// "The Zenith Survey": Kade, a B.N.T.G. acquisitions official in Level 0's safe room, wants Zenith Station's black box (Shelly, Nov 9: "a quest to get there via a BNTG official").
// The B.N.T.G. sealed the only way in: a breach in Level 0's outer east wall, deep in a blackout zone (Shelly, Nov 9: "move it somewhere a confused player wont stumble upon it"),
// and the keycard comes mid-quest, once you've proved you can reach it (Shelly, Nov 9: "give you ACCESS to level 0.1 mid-way as in lore its locked up by bntg").
// zenQ: 1 find the seal · 2 report back · 3 keycard in hand · 4 inside the station · 5 holding the drive · 99 paid. zenV 2 = this numbering.
import { pushFeed } from "./feed.js";
import { setQuest, endQuest, qid } from "./quests.js";
import { addRep, addKarma, repOf } from "./rep.js";
const NAME = "The Zenith Survey";
const QID = qid(NAME);
export const TIPS = {
  1: "Find the B.N.T.G. seal on Level 0's far east wall, past where the lights die",
  2: "Tell Kade in the Level 0 safe room you found the seal",
  3: "Use the B.N.T.G. keycard on the seal at Level 0's far east wall",
  4: "Reach the gallery at the far end of Zenith Station and pull the flight recorder",
  5: "Bring the drive back to Kade in the Level 0 safe room",
};
export const KADE = "l0-bntg-kade";
export const ZEN_ENTRY = { x: 111.62, z: 6 }; // the breach: cell (55, 29), the outer east wall, a blackout block (zone map in scripts/lib/maze.js)
const ZEN_WALL = { place: "main", x: ZEN_ENTRY.x - 1, y: 0, z: ZEN_ENTRY.z };
export const MARKS = {
  1: ZEN_WALL,
  2: { place: "main", id: KADE, x: 5.6, y: 0.3, z: -0.4 },
  3: ZEN_WALL,
  4: { place: "level01", id: "z-drive" },
  5: { place: "main", id: KADE, x: 5.6, y: 0.3, z: -0.4 },
};
export function setZen(ctx, p, step, note) {
  const s = p.state; s.zenQ = step; s.zenV = 2; const now = ctx.now();
  if (TIPS[step]) {
    const mark = MARKS[step] ?? null;
    s.quest = { name: NAME, step: TIPS[step], mark, at: Date.now() };
    setQuest(s, QID, { name: NAME, step: TIPS[step], mark });
  } else {
    if (s.quest?.name === NAME) s.quest = null;
    endQuest(s, QID);
  }
  if (note) { s.notice = { text: note, at: now }; pushFeed(s, note, now, "info"); }
}
// saves from the old five-step quest land on the matching new step once
export function migrateZen(ctx, p) {
  const s = p?.state; if (!s || !s.zenQ || s.zenQ === 99 || s.zenV === 2) return;
  setZen(ctx, p, s.zenDrive ? 5 : s.zenKey ? 3 : 1);
}
export function handleDialogueQuestZ(ctx, p, npc, text) {
  const s = p?.state; if (!s || String(npc?.id ?? "").split("/").pop() !== KADE) return null;
  migrateZen(ctx, p);
  const t = String(text ?? "").toLowerCase();
  if (!s.zenQ && /job|work|zenith|station|keycard|hire|money|need/.test(t)) {
    if (repOf(s, "bntg") <= -35) return { reply: "We know your face at the Guild. Walk away before I call security.", mood: "angry" };
    setZen(ctx, p, 1, "Quest Started: The Zenith Survey");
    return { reply: "Zenith's a station built into the east wall. We sealed the entrance. Follow the wall out past the lights, find our seal, then come back for the access card.", mood: "neutral" };
  }
  if (s.zenQ === 1 && /where|how|east|seal|way|station|zenith/.test(t)) return { reply: "Due east till you hit the outer wall. It goes dark long before that. Look for our tape and a red lamp.", mood: "neutral" };
  if (s.zenQ === 2 && /seal|found|saw|back|breach|door|east|there/.test(t)) {
    s.zenKey = true; setZen(ctx, p, 3, "B.N.T.G. Keycard added");
    return { reply: "Here's your card. Go to the far gallery over the hollow. The black box is up there. Sixty Backdollars when you hand it over. Leave the drones alone.", mood: "happy" };
  }
  if (s.zenQ === 5 && s.zenDrive && /drive|recorder|box|got|found|here/.test(t)) {
    const rep = repOf(s, "bntg"), bonus = rep >= 35 ? 0.25 : rep >= 12 ? 0.1 : 0;
    const extra = Math.round(6000 * bonus), cents = 6000 + extra;
    s.zenDrive = false; s.zenQ = 99; if (s.quest?.name === NAME) s.quest = null;
    endQuest(s, QID, "Recovered the Zenith Station flight recorder for Kade");
    s.cents = (s.cents ?? 0) + cents;
    const tier = addRep(s, "bntg", 12); addKarma(s, 2);
    const parts = [`Quest Completed: The Zenith Survey · +150 XP, +$${(cents / 100).toFixed(2)}, Almond Water`];
    if (extra) parts.push(`B.N.T.G. bonus +$${(extra / 100).toFixed(2)}`);
    parts.push(tier || "B.N.T.G. +12");
    s.payout = { xp: 150, items: ["almond"], text: parts.join(" · ") };
    s.notice = { text: s.payout.text, at: ctx.now() }; pushFeed(s, s.payout.text, ctx.now(), "good");
    return { reply: "It's warm through the case. Set it down here. Here's your sixty. Keep the card. I've got more work in there if you want it.", mood: "happy" };
  }
  if ((s.zenQ === 3 || s.zenQ === 4 || s.zenQ === 5) && /zenith|station|where|how|drive|seal/.test(t)) return { reply: "Far east wall, through our seal. The recorder's at the very end, by the big window.", mood: "neutral" };
  return null;
}
export function zenithChoice(ctx, it, s, list) {
  if (String(it?.id ?? "").split("/").pop() !== KADE || !Array.isArray(list) || s?.zenQ === 99) return list;
  if (!s?.zenQ && repOf(s, "bntg") <= -35) return list;
  const q = s?.zenQ;
  const pick = !q ? { text: "You look like you're hiring. What's the job?", tag: "Job" }
    : q === 2 ? { text: "I found your seal out east.", tag: "Quest" }
    : q === 5 && s.zenDrive ? { text: "I found the drive. Here it is.", tag: "Quest" }
    : { text: "Where's this station again?", tag: "Zenith" };
  return [pick, ...list].slice(0, 4);
}
// laid by places/main/sim.js: the sealed breach on the outer east wall (ZEN_ENTRY), and Kade in the safe room. ENTRYV 2 moved it out of the safe room.
const ENTRYV = 3;
const OLD = ["l0-zenith-frame", "l0-zenith-void", "l0-zenith-leafA", "l0-zenith-leafB", "l0-zenith-door", "l0-zenith", "main-from-l01", "l0-zenith-sign", "l0-zb-tape0", "l0-zb-tape1", "l0-zb-posts", "l0-zb-lamp", "l0-zb-hole", "l0-zb-hum", "l0-zb-scout"];
function layBreach(ctx) {
  const { x, z } = ZEN_ENTRY, W = x + 0.26; // W: the outer wall's face
  ctx.spawn("l0-zb-hole", { feetPosition: { x: W - 0.01, y: 0, z }, rotation: { yaw: 90 }, physics: "none", primitive: { kind: "scripted", script: "scripts/zenith-breach-geo.js" } });
  ctx.spawn("l0-zenith-frame", { feetPosition: { x, y: 0, z }, rotation: { yaw: 90 }, physics: "static", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "bulkhead", depth: 0.56 } } });
  const A = ctx.spawn("l0-zenith-leafA", { feetPosition: { x, y: 0, z: z - 0.38 }, rotation: { yaw: 90 }, physics: "kinematic", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "doorleaf" } } });
  const B = ctx.spawn("l0-zenith-leafB", { feetPosition: { x, y: 0, z: z + 0.38 }, rotation: { yaw: 90 }, physics: "kinematic", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "doorleaf" } } });
  ctx.spawn("l0-zenith-door", { feetPosition: { x, y: 0, z }, behavior: "scripts/zenith-door.js", state: { leaves: [A, B], base: { x, y: 0, z }, ax: { x: 0, z: 1 }, mode: "auto", needs: "zenKey" } });
  ctx.spawn("l0-zenith", { feetPosition: { x: x + 0.12, y: 0, z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.25, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/zenith-hatch.js" });
  ctx.spawn("main-from-l01", { feetPosition: { x: x - 1.6, y: 0.1, z }, rotation: { yaw: 90 } });
  // the B.N.T.G.'s claim on it: a placard, a red lamp that never goes off, tape across the approach, and the scout trigger that moves the quest on
  ctx.spawn("l0-zenith-sign", { feetPosition: { x: x - 0.41, y: 2.42, z }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.46, height: 0.34, depth: 0.02 }, material: { color: "#14171a", metalness: 0.3, roughness: 0.35 },
    ui: `<div face="front" width="1.5m" emissive style="text-align:center;font-family:Arial;line-height:1.05"><div style="color:#e8c24a;font:900 92px Arial">B.N.T.G. SEAL</div><div style="color:#d8d2c0;font:700 44px Arial">PROPERTY OF THE B.N.T.G. · KEYCARD ONLY</div></div>` });
  ctx.spawn("l0-zb-lamp", { feetPosition: { x: x - 0.32, y: 2.7, z: z - 1.45 }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: "#300", emissive: "#ff2a1a", emissiveIntensity: 4 },
    light: { kind: "point", color: "#ff3a22", intensity: 2.2, distance: 9 } });
  ctx.spawn("l0-zb-hum", { feetPosition: { x: x - 0.5, y: 1.2, z }, audio: { clip: "cdn/sfx-deep-industrial-machine-hum-behind-steel-hull-wind-howl-loop.mp3", loop: true, gain: 0.25, spatial: true, maxDistance: 18 } });
  ctx.spawn("l0-zb-posts", { feetPosition: { x: x - 2.4, y: 0, z }, rotation: { yaw: 90 }, physics: "static", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "stanchions", w: 2.6 } } });
  ctx.spawn("l0-zb-scout", { feetPosition: { x: x - 3, y: 0, z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 6, height: 2.6, depth: 7 }, visible: false, behavior: "scripts/zenith-scout.js" });
}
export function layZenithEntry(ctx) {
  const o = ctx.place.objects, ps = ctx.place.state;
  if (ps.zenEntryV !== ENTRYV) { ps.zenEntryV = ENTRYV; for (const id of OLD) if (id in o) ctx.destroy(id); ps.zenEntryLay = true; return; }
  if (ps.zenEntryLay && !("l0-zenith" in o)) { ps.zenEntryLay = false; layBreach(ctx); }
  for (const p of ctx.place.players) migrateZen(ctx, p);
  if (!o[KADE] && !ctx.session.kadeP) {
    ctx.session.kadeP = Promise.all([import("./critter-model.js"), import("./clothes.js"), import("./stats.js")]).then(([{ critterSpec }, { npcLook }, { npcState }]) => {
      ctx.session.kadeP = null; if (ctx.place.objects[KADE]) return;
      const look = { species: "fox", sex: "m", eye: "#4a6a8a", topw: "sweater", top: "#2e3a4a", botw: "pants", bottom: "#2a2a2a", shoes: "boots", shoec: "#1a1a1a" };
      ctx.spawn(KADE, { tags: ["npc"], feetPosition: { x: 5.6, y: 0.3, z: -0.4 }, rotation: { yaw: 90 }, physics: "character", ...critterSpec(npcLook(KADE, look, "survivor", 3)),
        behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: { name: "Kade · B.N.T.G. Acquisitions", role: "survivor", voice: "reyes", faction: "bntg", factionName: "the B.N.T.G.", rounds: [{ x: 5.6, y: 0.3, z: -0.4, dwell: 60, act: null, look: { x: 0, z: 0 } }, { x: 6.4, y: 0.3, z: 0.4, dwell: 30, act: null, look: { x: 8, z: 1.6 } }], ri: 0, nerve: "steady", home: { x: 5.6, z: -0.4 }, ...npcState(ctx, "agent", 90) } });
    });
  }
}
