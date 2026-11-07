// Level 1's skin-stealers: one manager steps them. From afar a lost wanderer who calls "hello?" and shuffles toward you.
// Within reveal range the skin slides off, it lunges fast, and its hits cost sanity too. They don't enter the corridors.
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone } from "./lib/level1.js";
import { npcMul, derived } from "./lib/stats.js";
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const CALL = ["/cdn/voice-skinstealer-saying-hello-is-someone-there.mp3", "/cdn/voice-skinstealer-saying-wait-dont-go-i-need-help.mp3", "/cdn/voice-skinstealer-saying-over-here-friend.mp3"];
const POOF = `fx
pop dust burst=20 life=.6..1.1 on=box(.5,1.6,.5).c(.9) v=sdir()*(.4..1.2)+up(.4) size=.25..0.45 acc=drag(1.4) col=<.25,.2,.18> a=0>.45:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
export function update(ctx, dt) {
  const now = ctx.now(), mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !safeZone(zoneAt(p.feetPosition.x, p.feetPosition.z)) && !(p.state?.downAt && now - p.state.downAt < 2000));
  for (const e of ctx.query({ tags: ["stealer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const m = (mem[e.id] ??= {}), pos = e.feetPosition, st = e.state ?? {}, mu = npcMul(st);
    if (st.dead || (st.hp ?? 1) <= 0) { if (!m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: POOF }); ctx.emit("playSound", { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9 }); ctx.destroy(e.id); } continue; }
    let prey = null, best = L.stealerCallRange;
    for (const p of players) { const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z); if (d < best) { best = d; prey = p; } }
    const o = ctx.place.objects[e.id];
    const reveal = !!prey && best < L.stealerReveal * (st.revealed ? 3 : 1);
    if (reveal !== !!st.revealed && o) {
      o.state.revealed = reveal;
      o.primitive = { kind: "scripted", script: "scripts/stealer-geo.js", params: { revealed: reveal } };
      if (reveal) { ctx.emit("playSound", { clip: SND("flesh-tear-wet-shriek"), position: pos, volume: 1, maxDistance: 30 }); ctx.emit("screenShake", { intensity: 0.35, duration: 0.3 }, { audience: { nearby: pos, radius: 8 } }); }
    }
    if (prey && !reveal && now >= (m.call ?? 0)) { m.call = now + 7000 + ctx.random() * 6000; ctx.emit("playSound", { clip: CALL[Math.floor(ctx.random() * CALL.length)], position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, volume: 0.9, maxDistance: L.stealerCallRange + 6 }); }
    let goal;
    if (prey) goal = prey.feetPosition;
    else { if (!m.roam || now > m.until) { const a = ctx.random() * 6.283; m.roam = { x: pos.x + Math.cos(a) * 8, z: pos.z + Math.sin(a) * 8 }; m.until = now + 6000; } goal = m.roam; }
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let sp = (st.revealed ? L.stealerLunge : L.stealerWalk) * mu.speed;
    if (safeZone(zoneAt(pos.x + dx / d * sp * dt * 4, pos.z + dz / d * sp * dt * 4))) sp = 0;
    e.velocity = { x: d > 1.1 ? dx / d * sp : 0, y: (e.velocity?.y ?? 0) - 20 * dt, z: d > 1.1 ? dz / d * sp : 0 };
    if (sp > 0 || prey) e.rotation = { yaw: Math.atan2(-dx, -dz) * 57.2958 };
    if (prey && st.revealed && best < 1.7 && now >= (m.next ?? 0)) {
      m.next = now + L.stealerCooldown * 1000; prey.state.hp -= Math.round(L.stealerHit * mu.dmg); prey.state.sanity = (prey.state.sanity ?? 100) - L.stealerSanity;
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: Math.round(L.stealerHit * mu.dmg), color: "#ff3030" });
      ctx.emit("playSound", { clip: SND("claw-slash-flesh"), position: at, volume: 1 });
      ctx.emit("screenShake", { intensity: 0.5, duration: 0.25 }, { audience: { player: prey.id } });
    }
  }
}
