// "The Zenith Survey": Kade, a B.N.T.G. acquisitions official in Level 0's safe room, pays you to scout Level 0.1 (Shelly, Nov 9: "a quest to get there via a BNTG official").
// zenQ: 1 keycard in hand (open the bulkhead in the safe room's east wall) · 2 inside the station · 3 holding the flight-recorder drive · 99 paid.
import { pushFeed } from "./feed.js";
const NAME = "The Zenith Survey";
const TIPS = { 1: "Open the B.N.T.G. bulkhead in the Level 0 safe room's east wall", 2: "Find the flight-recorder drive in Zenith Station's control room", 3: "Bring the drive back to Kade in the Level 0 safe room" };
export const KADE = "l0-bntg-kade";
export function setZen(ctx, p, step, note) {
  const s = p.state; s.zenQ = step; const now = ctx.now();
  s.quest = TIPS[step] ? { name: NAME, step: TIPS[step], at: Date.now() } : null;
  if (note) { s.notice = { text: note, at: now }; pushFeed(s, note, now, "info"); }
}
export function handleDialogueQuestZ(ctx, p, npc, text) {
  const s = p?.state; if (!s || String(npc?.id ?? "").split("/").pop() !== KADE) return null;
  const t = String(text ?? "").toLowerCase();
  if (!s.zenQ && /job|work|zenith|station|keycard|hire|money|need/.test(t)) {
    s.zenKey = true; setZen(ctx, p, 1, "Quest Started: The Zenith Survey · B.N.T.G. Keycard added");
    return { reply: "There's a station grown into this level. Metal and glass, called itself Zenith. Our scanners say the black box is still in its control room. Here's a keycard for the bulkhead in the east wall. Bring me that drive and I pay sixty Backdollars. Don't touch the bots, they're still on shift.", mood: "happy" };
  }
  if (s.zenQ === 3 && s.zenDrive && /drive|recorder|box|got|found|here/.test(t)) {
    s.zenDrive = false; s.zenQ = 99; s.quest = null; s.cents = (s.cents ?? 0) + 6000;
    s.payout = { xp: 150, items: ["almond"], text: "Quest Completed: The Zenith Survey · +150 XP, +$60.00, Almond Water" };
    s.notice = { text: s.payout.text, at: ctx.now() }; pushFeed(s, s.payout.text, ctx.now(), "good");
    return { reply: "Still warm. You'd think a dead station would stop recording. Sixty, as promised, and keep the keycard. We'll want more out of there.", mood: "happy" };
  }
  if (s.zenQ >= 1 && s.zenQ < 99 && /zenith|station|where|how|drive/.test(t)) return { reply: "East wall, the steel bulkhead. Control room's first door on your left once you're in. Mind the cold rooms further up.", mood: "neutral" };
  return null;
}
export function zenithChoice(ctx, it, s, list) {
  if (String(it?.id ?? "").split("/").pop() !== KADE || !Array.isArray(list) || s?.zenQ === 99) return list;
  const pick = !s?.zenQ ? { text: "You look like you're hiring. What's the job?", tag: "Job" } : s.zenQ === 3 ? { text: "I found the drive. Here it is.", tag: "Quest" } : { text: "Where's this station again?", tag: "Zenith" };
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
