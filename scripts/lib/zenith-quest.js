// "The Zenith Survey": Kade, a B.N.T.G. acquisitions official in Level 0's safe room, wants Zenith Station's black box (Shelly, Nov 9: "a quest to get there via a BNTG official").
// The B.N.T.G. sealed the only way in: a breach in Level 0's outer east wall, deep in a blackout zone (Shelly, Nov 9: "move it somewhere a confused player wont stumble upon it"),
// and the keycard comes mid-quest, once you've proved you can reach it (Shelly, Nov 9: "give you ACCESS to level 0.1 mid-way as in lore its locked up by bntg").
// zenQ: 1 find the seal · 2 report back · 3 keycard in hand · 4 inside the station · 5 holding the drive · 99 paid. zenV 2 = this numbering.
import { pushFeed } from "./feed.js";
const NAME = "The Zenith Survey";
const TIPS = {
  1: "Find the B.N.T.G. seal on Level 0's far east wall, past where the lights die",
  2: "Tell Kade in the Level 0 safe room you found the seal",
  3: "Use the B.N.T.G. keycard on the seal at Level 0's far east wall",
  4: "Reach the gallery at the far end of Zenith Station and pull the flight recorder",
  5: "Bring the drive back to Kade in the Level 0 safe room",
};
export const KADE = "l0-bntg-kade";
export const ZEN_ENTRY = { x: 111.62, z: 6 }; // the breach: cell (55, 29), the outer east wall, a blackout block (zone map in scripts/lib/maze.js)
export function setZen(ctx, p, step, note) {
  const s = p.state; s.zenQ = step; s.zenV = 2; const now = ctx.now();
  s.quest = TIPS[step] ? { name: NAME, step: TIPS[step], at: Date.now() } : null;
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
    setZen(ctx, p, 1, "Quest Started: The Zenith Survey");
    return { reply: "There's a station grown into this level. Metal and glass, calls itself Zenith. We sealed the only way in. Far east, outer wall, where the lights give up. Go find it first. Come back in one piece and you get the card.", mood: "neutral" };
  }
  if (s.zenQ === 1 && /where|how|east|seal|way|station|zenith/.test(t)) return { reply: "Due east till you hit the outer wall. It goes dark long before that. Look for our tape and a red lamp.", mood: "neutral" };
  if (s.zenQ === 2 && /seal|found|saw|back|breach|door|east|there/.test(t)) {
    s.zenKey = true; setZen(ctx, p, 3, "B.N.T.G. Keycard added");
    return { reply: "You came back. That's more than the last two did. Here's the card. The black box is at the far end, in the gallery over the hollow. Sixty Backdollars when it's in my hand. Don't touch the bots.", mood: "happy" };
  }
  if (s.zenQ === 5 && s.zenDrive && /drive|recorder|box|got|found|here/.test(t)) {
    s.zenDrive = false; s.zenQ = 99; s.quest = null; s.cents = (s.cents ?? 0) + 6000;
    s.payout = { xp: 150, items: ["almond"], text: "Quest Completed: The Zenith Survey · +150 XP, +$60.00, Almond Water" };
    s.notice = { text: s.payout.text, at: ctx.now() }; pushFeed(s, s.payout.text, ctx.now(), "good");
    return { reply: "Still warm. You'd think a dead station would stop recording. Sixty, as promised, and keep the card. We'll want more out of there.", mood: "happy" };
  }
  if ((s.zenQ === 3 || s.zenQ === 4 || s.zenQ === 5) && /zenith|station|where|how|drive|seal/.test(t)) return { reply: "Far east wall, through our seal. The recorder's at the very end, by the big window.", mood: "neutral" };
  return null;
}
export function zenithChoice(ctx, it, s, list) {
  if (String(it?.id ?? "").split("/").pop() !== KADE || !Array.isArray(list) || s?.zenQ === 99) return list;
  const q = s?.zenQ;
  const pick = !q ? { text: "You look like you're hiring. What's the job?", tag: "Job" }
    : q === 2 ? { text: "I found your seal out east.", tag: "Quest" }
    : q === 5 && s.zenDrive ? { text: "I found the drive. Here it is.", tag: "Quest" }
    : { text: "Where's this station again?", tag: "Zenith" };
  return [pick, ...list].slice(0, 4);
}
// laid by places/main/sim.js: Kade and the bulkhead in the safe room's east wall
export function layZenithEntry(ctx) {
  const o = ctx.place.objects;
  if (!o["l0-zenith-frame"]) {
    ctx.spawn("l0-zenith-frame", { feetPosition: { x: 7.62, y: 0, z: 1.6 }, rotation: { yaw: 90 }, physics: "static", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "doorframe", depth: 0.56, h: 2.98, state: "stuck" } } });
    ctx.spawn("l0-zenith-void", { feetPosition: { x: 7.86, y: 0, z: 1.6 }, rotation: { yaw: -90 }, primitive: { kind: "box", width: 1.5, height: 2.3, depth: 0.02 }, material: { color: "#020203", roughness: 1 } });
    const A = ctx.spawn("l0-zenith-leafA", { feetPosition: { x: 7.62, y: 0, z: 1.22 }, rotation: { yaw: 90 }, physics: "kinematic", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "doorleaf" } } });
    const B = ctx.spawn("l0-zenith-leafB", { feetPosition: { x: 7.62, y: 0, z: 1.98 }, rotation: { yaw: 90 }, physics: "kinematic", primitive: { kind: "scripted", script: "scripts/zenith-geo.js", params: { kind: "doorleaf" } } });
    ctx.spawn("l0-zenith-door", { feetPosition: { x: 7.62, y: 0, z: 1.6 }, behavior: "scripts/zenith-door.js", state: { leaves: [A, B], base: { x: 7.62, y: 0, z: 1.6 }, ax: { x: 0, z: 1 }, mode: "auto", needs: "zenKey" } });
    ctx.spawn("l0-zenith", { feetPosition: { x: 7.55, y: 0, z: 1.6 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.3, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/zenith-hatch.js" });
    ctx.spawn("main-from-l01", { feetPosition: { x: 6.2, y: 0.1, z: 1.6 }, rotation: { yaw: 90 } });
    ctx.spawn("l0-zenith-sign", { feetPosition: { x: 7.3, y: 2.42, z: 1.6 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.3, height: 0.2, depth: 0.02 }, material: { color: "#1c1f22" }, ui: `<div face="front" width="1.3m" emissive style="color:#e8c24a;font:900 70px Arial;text-align:center">B.N.T.G. · RESTRICTED</div>` });
  }
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
