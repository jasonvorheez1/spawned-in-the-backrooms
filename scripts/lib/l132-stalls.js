// Level 132 · the bazaar. Eight stalls ring the tree, each a copy of a store from another era; every ware is real:
// press one and the place hears "l132:barter". This file is also each ware's behavior (its press ear).
// lay(ctx, L) builds once per data version; fragile wares break and restock through lib/breakables.js (idMat rules).
import D from "./data/l132-stalls.yml";
import { say } from "./npc-social.js";
const SELF = "scripts/lib/l132-stalls.js";
import { animate } from "builtin/tween";
// the ware jumps on its counter when you reach for it: a knock on wood, then the trade
export const ears = { press: (ctx, e) => {
  const p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, y = ctx.self.rotation?.yaw ?? 0;
  if (!ctx.self.session.hop) { ctx.self.session.hop = 1; animate(ctx, ctx.self, { "feetPosition.y": "+=0.07", "rotation.yaw": [y, y + 14, y] }, { duration: 0.16, easing: "easeOutQuad", direction: "alternate" }); ctx.after(0.4, "landed"); }
  if (p) ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-knuckles-knock-on-market-stall-counter.mp3", position: p, volume: 0.45, refDistance: 2, maxDistance: 14 });
  ctx.emit("l132:barter", { by: e?.by ?? null, ware: ctx.self.id });
} };
export function landed(ctx) { ctx.self.session.hop = 0; }
export function frame(L, k) { // stall k: its spot, its forward (toward the tree) and its right
  const a = ((L?.stalls?.angle0 ?? 22.5) + 45 * k) * Math.PI / 180, R = L?.stalls?.radius ?? 15;
  const p = { x: +(R * Math.sin(a)).toFixed(2), y: 0, z: +(-R * Math.cos(a)).toFixed(2) }, n = Math.hypot(p.x, p.z);
  const f = { x: -p.x / n, z: -p.z / n }, r = { x: -f.z, z: f.x };
  return { p, f, r, at: (x, y, d) => ({ x: p.x + r.x * x + f.x * d, y, z: p.z + r.z * x + f.z * d }) };
}
const kill = (ctx, id) => { if (id in ctx.place.objects) ctx.destroy(id); };
export function lay(ctx, L) {
  if (ctx.place.state.stallsV === D.v && ctx.getObject("l132-sign-0") && ctx.getObject("l132-stall-0")?.model) return; // a stamp alone survives a room reload that brings back the scene's blueprints
  ctx.place.state.stallsV = D.v;
  const [w, h, d] = D.size;
  for (const s of D.stalls) {
    const F = frame(L, s.k), id = `l132-stall-${s.k}`;
    for (const x of [id, `l132-sign-${s.k}`, `l132-lamp-${s.k}`]) kill(ctx, x);
    ctx.spawn(id, { tags: ["l132", "l132-stall"], feetPosition: F.p, rotation: { lookAt: { x: 0, y: 0, z: 0 } }, physics: { body: "static", collider: "mesh" },
      layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, model: { id: s.model, forward: "+x" }, state: { name: s.name, cat: s.cat } });
    ctx.spawn(`l132-sign-${s.k}`, { tags: ["l132", "l132-sign"], feetPosition: s.signAt ? { x: s.signAt[0], y: s.signAt[1], z: s.signAt[2] } : F.at(D.sign.x, D.sign.y, D.sign.f), rotation: { lookAt: { x: 0, y: 0, z: 0 } },
      layout: { box: { min: { y: 0 }, max: { y: D.sign.h } } }, model: { id: s.sign, forward: s.fwd ?? "+x" }, state: { name: s.name } });
    ctx.spawn(`l132-lamp-${s.k}`, { tags: ["l132"], feetPosition: F.at(0, D.lamp.y, D.lamp.f), light: { kind: "point", color: s.lamp, intensity: D.lamp.intensity, distance: D.lamp.distance } });
  }
  for (const o of ctx.query({ tags: ["l132-ware"], radius: 60, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  for (const id of ctx.place.state.wrecks ?? []) if (String(id).startsWith("l132-ware-")) kill(ctx, id);
  for (const wr of D.wares) {
    if (!wr.at) continue;
    const s = D.stalls[wr.k], F = frame(L, wr.k), n = +wr.id.split("-").pop();
    const spec = { tags: ["l132", "l132-ware", "usable"], feetPosition: { x: wr.at[0], y: wr.at[1], z: wr.at[2] }, physics: "static", behavior: SELF,
      rotation: { lookAt: F.at(((n * 37) % 11) - 5, 0, 15 + ((n * 53) % 7) - 3) }, layout: { box: { min: { y: 0 }, max: { y: wr.h } } }, model: { id: wr.model, forward: "+x" },
      state: { name: wr.name, verb: "Barter", l132ware: { stall: wr.k, kind: wr.kind, cat: s.cat } } };
    if (wr.kind === "turntable") spec.audio = { clip: D.music.clip, gain: D.music.gain, loop: true, spatial: true, maxDistance: D.music.maxDistance };
    ctx.spawn(wr.id, spec);
  }
}
// a smashed ware: the nearest keeper says so once, and the shelf restocks itself after a while (the town's stores always do)
const B = D.broken ?? { radius: 12, restockS: 120, lines: ["Oh! That one was old."] };
export function tick(ctx, L) {
  const wr = ctx.place.state.wrecks; if (!wr?.length) return;
  const now = ctx.now(); let left = null;
  for (const id of wr) {
    if (!String(id).startsWith("l132-ware-")) continue;
    const o = ctx.getObject(id), w = o?.state?.wreck; if (!w) continue;
    if (!o.state.keeperSaw) {
      o.state.keeperSaw = true;
      const f = o.feetPosition, k = ctx.query({ tags: ["npc"], center: f, radius: B.radius })[0], h = k && ctx.getObject(k.id);
      const pl = ctx.place.players.reduce((a, q) => (!a || Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z) < Math.hypot(a.feetPosition.x - f.x, a.feetPosition.z - f.z) ? q : a), null);
      if (h && !h.state?.dead) say(ctx, h, B.lines[Math.floor(ctx.random() * B.lines.length)], pl?.id);
    }
    if (now - w.at < B.restockS * 1000) continue;
    const f = o.feetPosition; if (ctx.place.players.some((q) => Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z) < 1.5)) continue;
    o.tags = w.tags; o.physics = w.physics; o.visible = true;
    const st = { ...o.state }; delete st.wreck; delete st.broke; delete st.keeperSaw; st.hp = st.maxHp ?? st.hp; o.state = st;
    (left ??= new Set()).add(id);
  }
  if (left) ctx.place.state.wrecks = wr.filter((id) => !left.has(id));
}
