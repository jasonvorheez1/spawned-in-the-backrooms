// Entity 19 "The Disease" (Level 109, Shelly Nov 14): caught in an unpurged biohazard room, it grows on its own, wherever you go.
// stage 1 rash · stage 2 red flush (sanity drains, the screen pulses red) · stage 3 fever (hp drains, never below FLOOR).
// Cure: purge the room's air, then use its Decon switch (scripts/l109-use.js sets e19 = 0). No blood, per Shelly's no-gore rule.
const N = { catchPerS: 2.5, growPerS: 0.08, flushAt: 35, feverAt: 70, sanPerS: 0.12, hpPerS: 0.4, FLOOR: 10, pulseS: 18 }; // Savi's picks: ~20 min from first touch to fever
export const updateSchedule = { every: { seconds: 1 } };
const STAGE = ["", "A faint red rash on your arms. It itches.", "Your skin is flushed red. You feel hot. (Entity 19: find a purged Decon switch)", "Fever. Your limbs ache and burn. (Entity 19 · Decon shower clears it)"];
export function update(ctx) {
  const me = ctx.self, s = me.state; if (!me.isLocal && me.isLocal !== undefined) return;
  let e = s.e19 ?? 0;
  if (me.place === "level109") {
    const f = me.feetPosition;
    for (const h of ctx.query({ tags: ["l109-hz"], radius: 45 })) {
      const b = h.state?.box; if (!b || h.state.purged || ctx.place.state?.l109Purged?.[h.state.roomId]) continue;
      if (f.x >= b.x0 && f.x <= b.x1 && f.z >= b.z0 && f.z <= b.z1) e += N.catchPerS;
    }
  }
  if (e <= 0) { if (s.e19) s.e19 = 0; return ctx.sleep(5); }
  e = Math.min(100, e + N.growPerS);
  const st = e >= N.feverAt ? 3 : e >= N.flushAt ? 2 : 1, now = ctx.now();
  if (st !== s.e19st) { s.e19st = st; s.notice = { text: STAGE[st], at: now }; }
  if (st >= 2) { s.sanity = Math.max(0, (s.sanity ?? 100) - N.sanPerS); if (now - (ctx.session.e19pulse ?? 0) > N.pulseS * 1000) { ctx.session.e19pulse = now; ctx.emit("screenFlash", { color: "#b3121a", duration: 1.4, intensity: st === 3 ? 0.35 : 0.2 }, { audience: { player: me.id } }); } }
  if (st === 3 && (s.hp ?? 100) > N.FLOOR) s.hp = Math.max(N.FLOOR, s.hp - N.hpPerS);
  s.e19 = Math.round(e * 10) / 10;
}
