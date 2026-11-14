// Level 109 B3's things you press: the stairwell (both ends), the morgue's M.E.G. notice, the cage gate, the cache tape,
// and the emergency lamps' slow breathing. scripts/lib/l109-b3.js lays them.
import { heard } from "./lib/hear.js";
import { LANDING, stairDoorAt } from "./lib/l109-b3.js";
const SFX = "/cdn/moodboard-realistic-gritty/";
const DOOR = SFX + "sfx-heavy-metal-fire-door-slam-echo.mp3", GATE = SFX + "sfx-chain-link-fence-gate-rattle-and-squeal.mp3", TAPE = SFX + "sfx-cassette-recorder-play-button-clunk-and-hiss.mp3";
const TAPE_LINES = [
  { who: "TAPE: M.E.G. FIELD CACHE 109-C", t: "Cache log, day nineteen. Three of the morgue drawers were open this morning. We did not open them.", d: 5200 },
  { who: "TAPE: M.E.G. FIELD CACHE 109-C", t: "Hounds. Breeding in the cold. Ruiz says they came in through the drawers, which is not how drawers work.", d: 5400 },
  { who: "TAPE: M.E.G. FIELD CACHE 109-C", t: "We shut the morgue and we are pulling out. Leaving the launcher. If you found this, you are the relief. Sorry.", d: 5600 },
];
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), w = who?.state; if (!w) return;
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, now = ctx.now();
    if (s.kind === "b3-down" || s.kind === "b3-up") {
      heard(ctx, { clip: DOOR, position: pos, volume: 0.7, maxDistance: 18 });
      ctx.emit("screenFlash", { color: "#000000", duration: 0.45, intensity: 1 }, { audience: { player: who.id } });
      const up = stairDoorAt(ctx.place.state.l109seed ?? 1);
      who.feetPosition = s.kind === "b3-down" ? { ...LANDING } : { x: up.x + 0.9, y: 0.1, z: up.z };
      who.velocity = { x: 0, y: -2, z: 0 };
      if (s.kind === "b3-down" && !w.b3Seen) { w.b3Seen = 1; w.sub = { who: "", t: "Three flights down. The hum stops. Something below is breathing slower than you.", at: now, d: 4200 }; }
      return;
    }
    if (s.kind === "b3-order") { w.sub = { who: "M.E.G. NOTICE", t: "Sub-level B3 closed. Armed survivor holding the cache. Use cover and keep the morgue door shut. Order 109-C.", at: now, d: 5200 }; return; }
    if (s.kind === "b3-tape") {
      heard(ctx, { clip: TAPE, position: pos, volume: 0.6, maxDistance: 8 });
      const i = (s.next ?? 0) % TAPE_LINES.length; s.next = i + 1; w.sub = { ...TAPE_LINES[i], at: now };
      if (!w.b3Tape) { w.b3Tape = 1; w.payout = { xp: 40 }; }
      return;
    }
    if (s.kind === "b3-gate") {
      s.open = !s.open; s.verb = s.open ? "Close" : "Open";
      heard(ctx, { clip: GATE, position: pos, volume: 0.7, maxDistance: 20 });
      ctx.self.rotation = { yaw: (s.baseYaw ?? 0) + (s.open ? -100 : 0) };
      ctx.emit("noise", { position: pos, radius: 14, kind: "gate" }, { audience: { nearby: pos, radius: 14 } });
      return;
    }
    if (s.kind === "b3-breaker") {
      s.on = !s.on; s.verb = s.on ? "Cut Lights" : "Restore Lights"; s.info = s.on ? "armory lit" : "dead ceiling bank";
      heard(ctx, { clip: SFX + "sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3", position: pos, volume: 0.7, maxDistance: 20 });
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, on: s.on } };
      for (const [x, z] of [[-3, 33], [3, 33], [-3, 37.5]]) {
        const lt = ctx.getObject(`b3-at${x}_${z}`);
        if (!lt) continue;
        lt.material = s.on ? { color: "#fffbe8", emissive: "#fff3d0", emissiveIntensity: 1.8 } : { color: "#5f5d55" };
        lt.light = s.on ? { kind: "point", color: "#ffe2b0", intensity: 1.4, distance: 9, shadow: { enabled: false } } : null;
      }
      w.notice = { text: s.on ? "Armory floodlights ON" : "Armory floodlights OFF", at: now };
    }
  },
};
export function update(ctx) {
  const s = ctx.self.state; if (s.kind !== "emergency") return ctx.sleep();
  const t = ctx.now() / 1000 + (s.ph ?? 0), b = s.base ?? 1;
  const v = b * (0.55 + 0.45 * Math.sin(t * 1.3) ** 2) * (Math.sin(t * 17) > 0.97 ? 0.2 : 1);
  const L = ctx.self.light; if (L) ctx.self.light = { ...L, intensity: Math.round(v * 20) / 20 };
}
export const updateSchedule = { every: { seconds: 0.1 } };
