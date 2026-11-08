// Level 10's worms (Wikidot): the mass under the one-metre soil. One manager on the field steps every worm.
// In the crop they hear your feet: a ripple of soil tracks you under the wheat, faster if you run, and loses you if you stand still.
// Then it erupts under you, bites, and stays up a moment (the only time it can be hit) before it sinks back.
// Safe: the dirt tracks (nothing grows or lives in them) and anything you stand on above the soil (barn floors, sheds).
// Numbers are my picks: hp 55, bite 10-15 + 3 bleed ticks of 2, up 2.6 s, up to 3 stalking you at once.
import { normalize } from "builtin/vec3";
import { hit, flat, yawTo } from "./lib/l5-hostile.js";
import { WORMS } from "./worm10-geo.js";
// the writhe: every worm's two bones sway on their own phase, so the clump heaves and coils
const WRITHE = (() => {
  const tracks = {}, wave = (ph, amp) => Array.from({ length: 9 }, (_, k) => Math.round(Math.sin((k / 8) * 6.283 + ph) * amp));
  for (let i = 0; i < WORMS; i++) {
    tracks[`w${i}a`] = { pitch: wave(i * 1.7, 18), roll: wave(i * 2.3 + 1, 14) };
    tracks[`w${i}b`] = { pitch: wave(i * 1.7 + 1.6, 38), yaw: wave(i * 0.9 + 0.5, 30) };
  }
  return { duration: 1.1, tracks };
})();

const SND = (w) => `/cdn/moodboard-realistic-gritty/sfx-${w}.mp3`;
const S = {
  hp: 55, bite: [10, 15], bleed: 2, bleedTicks: 3, reach: 2.4,
  max: 3, every: [5000, 10000], speedWalk: 2.6, speedRun: 5.2, loseStill: 3500,
  up: 2600, rise: 0.35, sink: 0.5, start: 14,
};
const RIPPLE = `fx
pop soil rate=26 on=disc(.35) life=.4..0.8 v=up(1..2.2)+sdir()*.6 size=.03..0.07 acc=grav() col=<.24,.17,.11> a=1>0 floor=die r=sprite(grain,alpha)
pop dust rate=6 on=disc(.4) life=.7..1.2 v=up(.3..0.7) size=.25..0.45 acc=buoy(.2)+drag(1.4) col=<.42,.34,.24> a=0>.3:.35>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const ERUPT = `fx
pop clods burst=40..55 life=.6..1.2 v=up(4..7)+sdir()*(1.5..3) size=.05..0.12 acc=grav() col=<.22,.15,.1> a=1 floor=stick r=sprite(grain,alpha)
pop dust burst=10 life=1..1.6 v=up(.8..1.6)+sdir()*1.2 size=.5..0.9 acc=buoy(.2)+drag(1.6) col=<.4,.32,.22> a=0>.4:.4>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
const GORE = `fx
pop slime burst=14..20 life=.5..0.9 v=sdir()*(1..2.4)+up(.8) size=.03..0.06 acc=grav() col=<.55,.2,.22> a=1>0 floor=stick r=sprite(soft-disc,alpha)`;

const rnd = (ctx, a, b) => a + ctx.random() * (b - a);
const mem = new Map(); // worm id -> its run (per machine; a new machine re-reads by tag)

function exposed(ctx, p) {
  const x = p.feetPosition.x, z = p.feetPosition.z, t = ctx.place.terrain;
  const gy = t?.heightAt?.(x, z); if (gy == null) return false;
  if (p.feetPosition.y > gy + 0.45) return false; // on a floor, a bale, a shed
  const m = t.materialAt?.(x, z);
  const dirt = typeof m === "string" ? (m === "dirt" ? 1 : 0) : (m?.dirt ?? 0);
  return dirt < 0.5 && !(p.state?.dead || (p.state?.hp ?? 1) <= 0);
}
const play = (ctx, w, pos, volume, maxDistance = 30) => ctx.emit("playSound", { clip: SND(w), position: pos, volume, refDistance: 4, maxDistance });

export function update(ctx, dt) {
  const now = ctx.now(), st = ctx.self.state, gy = (x, z) => ctx.place.terrain?.heightAt?.(x, z) ?? 0;
  st.next ??= {};
  const players = ctx.place.players.filter((p) => exposed(ctx, p));
  const worms = ctx.query({ tags: ["l10worm"], radius: 600, center: ctx.self.feetPosition });

  // a new stalker for someone out in the crop
  for (const p of players) {
    const mine = worms.filter((w) => w.state.prey === p.id).length;
    if (mine >= S.max || now < (st.next[p.id] ?? 0)) continue;
    st.next = { ...st.next, [p.id]: now + rnd(ctx, ...S.every) };
    const a = ctx.random() * 6.283, x = p.feetPosition.x + Math.cos(a) * S.start, z = p.feetPosition.z + Math.sin(a) * S.start;
    ctx.spawn({
      tags: ["l10worm", "moths"], feetPosition: { x, y: gy(x, z) - 2.4, z }, rotation: ctx.random() * 360,
      primitive: { kind: "scripted", script: "scripts/worm10-geo.js" }, scale: 1.25, visibleRange: { max: 90 }, castShadow: false,
      physics: { body: "kinematic", collider: "capsule" }, visible: false, fx: { script: RIPPLE },
      state: { kind: "worm", name: "Field Worm", hp: S.hp, maxHp: S.hp, level: 3, phase: "stalk", prey: p.id, heardAt: now },
    });
  }

  for (const w of worms) {
    const o = ctx.getObject(w.id); if (!o) continue;
    const s = o.state, m = mem.get(w.id) ?? {}; mem.set(w.id, m);
    const p = ctx.place.players.find((q) => q.id === s.prey);
    if ((s.hp ?? 1) <= 0 && s.phase !== "dead") { // killed while up
      s.phase = "dead"; s.dead = true; m.at = now; o.tags = (o.tags ?? []).filter((t) => t !== "moths");
      ctx.emit("fx", { position: { ...o.feetPosition, y: o.feetPosition.y + 0.8 }, script: GORE });
      play(ctx, "giant-worm-death-wet-gurgling-squeal", o.feetPosition, 0.8);
      ctx.emit("squash", { target: o.id, axis: "y", intensity: 0.5, duration: 0.4 });
    }
    if (s.phase === "dead") {
      if (now - m.at > 600) { o.velocity = { x: 0, y: -1.2, z: 0 }; }
      if (now - m.at > 2600) { ctx.destroy(o.id); mem.delete(w.id); }
      continue;
    }
    if (s.phase === "stalk") {
      if (!p || !exposed(ctx, p)) { if (now - s.heardAt > 4000) { ctx.destroy(o.id); mem.delete(w.id); } else o.velocity = { x: 0, y: 0, z: 0 }; continue; }
      const v = p.velocity ?? { x: 0, z: 0 }, moving = Math.hypot(v.x ?? 0, v.z ?? 0);
      if (moving > 0.5) s.heardAt = now;
      if (now - s.heardAt > S.loseStill) { ctx.destroy(o.id); mem.delete(w.id); continue; } // stood still: it lost you
      const d = flat(o.feetPosition, p.feetPosition), sp = moving > 4.5 ? S.speedRun : S.speedWalk;
      if (d < 1.0) { // erupt under them
        s.phase = "up"; m.at = now; m.bit = false;
        const x = o.feetPosition.x, z = o.feetPosition.z, y0 = gy(x, z);
        o.feetPosition = { x, y: y0 - 1.6, z }; o.velocity = { x: 0, y: 0, z: 0 };
        o.rotation = yawTo(p.feetPosition.x - x, p.feetPosition.z - z) + 180;
        o.visible = true; o.fx = null; m.y0 = y0; o.anim.writhe = { clip: WRITHE, loop: true, weight: 1 };
        ctx.emit("fx", { position: { x, y: y0, z }, script: ERUPT });
        ctx.emit("screenShake", { intensity: 0.35, duration: 0.3 }, { audience: { player: p.id } });
        play(ctx, "giant-worm-erupting-from-wet-soil-dirt-burst", { x, y: y0, z }, 0.95, 40);
        continue;
      }
      const n = normalize({ x: p.feetPosition.x - o.feetPosition.x, y: 0, z: p.feetPosition.z - o.feetPosition.z });
      const nx = o.feetPosition.x + n.x * sp * dt, nz = o.feetPosition.z + n.z * sp * dt;
      o.feetPosition = { x: nx, y: gy(nx, nz) - 2.4, z: nz }; // under the soil; the ripple fx rides it at... its feet, so lift the fx by riding a raised point
      if (now - (m.rumble ?? 0) > 1400) { m.rumble = now; play(ctx, "wet-soil-churning-underground-burrowing-rumble", { x: nx, y: gy(nx, nz), z: nz }, 0.5, 22); }
      continue;
    }
    if ((s.phase === "up" || s.phase === "sink") && (m.at == null || m.y0 == null)) { m.at ??= now; m.y0 ??= gy(o.feetPosition.x, o.feetPosition.z); } // a machine that picked this worm up mid-rise
    if (s.phase === "up") {
      const t = now - m.at, x = o.feetPosition.x, z = o.feetPosition.z;
      const k = Math.min(1, t / (S.rise * 1000));
      if (t < S.up) o.feetPosition = { x, y: m.y0 - 1.6 * (1 - k) - 0.15, z };
      const sy = 1.25 * (1 + 0.07 * Math.sin(t / 90)); if (Number.isFinite(sy)) o.scale = { x: 1.25, y: sy, z: 1.25 };
      if (!m.bit && t > S.rise * 1000 && p && flat(o.feetPosition, p.feetPosition) < S.reach && exposed(ctx, p)) {
        m.bit = true;
        const at = hit(ctx, p, Math.round(rnd(ctx, S.bite[0], S.bite[1] + 0.99) - 0.49), "#ff6a50");
        ctx.emit("fx", { position: at, script: GORE });
        ctx.emit("cameraPunch", { direction: { x: 0, y: -1, z: 0 }, intensity: 0.5 }, { audience: { player: p.id } });
        ctx.emit("screenFlash", { color: "#7a1010", duration: 0.15, intensity: 0.25 }, { audience: { player: p.id } });
        play(ctx, "giant-worm-bite-ring-of-teeth-wet-tearing-chomp", at, 0.9);
        ctx.emit("damageNumber", { position: { ...at, y: at.y + 0.4 }, text: "BURROWING", color: "#ff8a6a", size: 0.8 }, { audience: { player: p.id } });
        for (let i = 1; i <= S.bleedTicks; i++) ctx.after(i, "bleed", { id: p.id });
      }
      if (t > S.up) { s.phase = "sink"; m.at = now; play(ctx, "wet-soil-churning-underground-burrowing-rumble", o.feetPosition, 0.6); }
      continue;
    }
    if (s.phase === "sink") {
      const t = now - m.at;
      o.feetPosition = { ...o.feetPosition, y: m.y0 - 0.15 - 2.2 * Math.min(1, t / (S.sink * 1000)) };
      if (t > S.sink * 1000) { // back under: it hunts you again from here
        o.visible = false; o.scale = 1.25; o.anim.writhe = null; o.fx = { script: RIPPLE }; s.phase = "stalk"; s.heardAt = now;
        const a = ctx.random() * 6.283; o.feetPosition = { x: o.feetPosition.x + Math.cos(a) * 6, y: m.y0 - 2.4, z: o.feetPosition.z + Math.sin(a) * 6 };
      }
    }
  }
}

export function bleed(ctx, { id }) {
  const p = ctx.place.players.find((q) => q.id === id); if (!p || (p.state?.hp ?? 0) <= 0) return;
  p.state.hp -= S.bleed;
  ctx.emit("damageNumber", { position: { x: p.feetPosition.x, y: p.feetPosition.y + 1.2, z: p.feetPosition.z }, value: S.bleed, color: "#c0503a" });
}
