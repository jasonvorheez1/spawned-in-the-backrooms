// The Boiler Room's manager ("l5-heat"): the heat on every player in zone boiler (player.state.heat 0..100: rises, faster
// by the furnaces and boilers, cools under an almond-water leak or outside; above HEAT.hurtAt it drains hp), and the floor
// steam vents: a 1 s hiss and wisps (the tell), then a jet that scalds anyone standing in it once per burst.
// Numbers and places: scripts/lib/l5-boiler-plan.js
import { heard } from "./lib/hear.js";
import { zoneAt } from "./lib/level5.js";
import { FURNACES, MACHINES, LEAKS, VENTS, VENT, HEAT } from "./lib/l5-boiler-plan.js";
export const updateSchedule = { every: { seconds: 0.5 } };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const BOILERS = MACHINES.filter((m) => m.kind === "boiler");
const TELL = `fx
pop wisp rate=?mobile:10|18 win=0;.9 on=disc(.35) life=.5..0.9 v=up(.8..1.6)+sdir()*.2 size=.12..0.22 acc=curl(.6)+drag(1.2) sz=$size*(.6>2) col=<.92,.92,.9> a=0>.2:.35>.6:.2>0 rot=spin(.3) r=sprite(smoke-puff,alpha)
pop spit rate=12 win=.3;.9 on=disc(.3) life=.2..0.4 v=up(2..3.5)+cone(20)*(.5..1) size=.02..0.04 acc=grav() col=<.8,.85,.9> a=.8>0 r=sprite(droplet,alpha,velocity,.02)`;
const JET = `fx
pop jet rate=?mobile:45|90 win=0;1.5 on=disc(.25) life=.45..0.8 v=up(6..8.5)+cone(7)*(.4..1) size=.22..0.38 acc=drag(1.6)+curl(.7)*.8 sz=$size*(.5>3.4) col=<.95,.95,.93> a=0>.06:.6>.5:.3>0 rot=spin(.25) r=sprite(smoke-puff,alpha)
pop roll on=@jet?.25 inh=p;v:$v*.2 life=1.2..2 size=.5..0.8 acc=buoy(.3)+curl(.4)+drag(1) sz=$size*(.8>2.4) col=<.85,.84,.82> a=0>.2:.25>.6:.12>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop beads burst=14..20 life=.3..0.6 v=up(4..6)+sdir()*1.5 size=.02..0.04 acc=grav() col=<.85,.9,.95> a=.9>0 floor=die r=sprite(droplet,alpha,velocity,.02)`;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function update(ctx, dt) {
  const ss = ctx.self.session, now = ctx.now() / 1000;
  ss.vent ??= {};
  const players = ctx.place.players ?? [];
  // vents: phase on the room clock, so every machine agrees
  for (const v of VENTS) {
    const t = (now + v.phase) % v.period, burstAt = v.period - VENT.burst, tellAt = burstAt - VENT.tell;
    const ph = t >= burstAt ? "jet" : t >= tellAt ? "tell" : "idle", was = ss.vent[v.id];
    if (ph !== was?.ph) {
      ss.vent[v.id] = { ph, hit: {} };
      const pos = { x: v.x, y: 0.05, z: v.z };
      if (ph === "tell") { ctx.emit("fx", { position: pos, script: TELL }); heard(ctx, { clip: G("pressure-valve-rising-hiss"), position: pos, volume: 0.5, maxDistance: 16 }); }
      if (ph === "jet") { ctx.emit("fx", { position: pos, script: JET }); heard(ctx, { clip: G("steam-pipe-burst-loud-hiss"), position: pos, volume: 0.9, maxDistance: 26 }); }
    }
    if (ph === "jet") for (const p of players) {
      const f = p.feetPosition; if (!f || f.y > VENT.height - 0.5 || d2(f, v) > VENT.radius) continue;
      const hit = ss.vent[v.id].hit; if (hit[p.id]) continue; hit[p.id] = true;
      p.state.hp = (p.state.hp ?? 100) - VENT.damage; p.state.notice = { text: "Scalded! The steam bites through your fur.", at: ctx.now() };
      ctx.emit("damageNumber", { position: { x: f.x, y: f.y + 1.6, z: f.z }, value: VENT.damage, color: "#ffd9a0" });
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.15, intensity: 0.3 }, { audience: { player: p.id } });
    }
  }
  // heat, twice a second
  ss.acc = (ss.acc ?? 0) + dt; if (ss.acc < 0.5) return; const step = ss.acc; ss.acc = 0;
  ss.hurt ??= {};
  for (const p of players) {
    const f = p.feetPosition, s = p.state; if (!f || !s) continue;
    const inside = zoneAt(f.x, f.z)?.id === "boiler";
    let rate = -HEAT.outsideCool;
    if (inside) {
      rate = HEAT.base;
      for (const fu of FURNACES) { const d = d2(f, fu); if (d < HEAT.furnaceReach) rate += HEAT.furnace * (1 - d / HEAT.furnaceReach); }
      for (const b of BOILERS) { const d = d2(f, b) - Math.min(b.w, b.d) / 2; if (d < HEAT.boilerReach) rate += HEAT.boiler * (1 - Math.max(0, d) / HEAT.boilerReach); }
      for (const l of LEAKS) if (d2(f, l) < HEAT.leakReach) { rate = -HEAT.leakCool; break; }
    }
    const was = s.heat ?? 0, heat = Math.max(0, Math.min(100, was + rate * step)), r = Math.round(heat * 10) / 10;
    if (r !== was && !(was === 0 && r === 0)) s.heat = r;
    if (heat > HEAT.hurtAt && (s.hp ?? 0) > 0) {
      const k = (ss.hurt[p.id] ?? 0) + step;
      if (k >= HEAT.hurtEvery) { ss.hurt[p.id] = 0; s.hp = s.hp - HEAT.hurt * (heat > 90 ? 2 : 1); } else ss.hurt[p.id] = k;
      if (!ss.warned?.[p.id] ) { (ss.warned ??= {})[p.id] = true; s.notice = { text: "The heat is cooking you. Find a leak, or get out.", at: ctx.now() }; }
    } else if (heat < 50 && ss.warned?.[p.id]) delete ss.warned[p.id];
  }
}
