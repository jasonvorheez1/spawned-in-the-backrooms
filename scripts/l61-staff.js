// Level 6.1 "The Snackrooms": its natural entities, the Facelings (Entity 9), and the Snackrooms staff who work beside them. The wiki: friendly, they cook, clean and serve and give food without payment.
// state.job: "post" (stands at a counter, faces out, wipes, nods, waves) | "route" (walks a loop of waypoints: clears tables, sweeps, carries a tray, restocks), state.route = [{ x, z, dwell, act }].
// Press E on one and it hands you a plate. The walking is the engine's own gait (scripts/humanoid-locomotion.js); this script only steers and picks the gestures.
import { heard } from "./lib/hear.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const GESTS = [["cdn/clip-nod-yes.glb", 1500, 0.8], ["cdn/clip-point.glb", 1900, 0.8], ["cdn/clip-shrug.glb", 1800, 0.8], ["cdn/clip-clap-loop.glb", 1600, 0.6], ["cdn/clip-wave-loop.glb", 2200, 0.8]];
const ACT = { wipe: ["cdn/clip-pickup.glb", 1400, 0.8], serve: ["cdn/clip-point.glb", 1500, 0.8], laugh: ["cdn/clip-laugh-loop.glb", 2400, 0.7], nod: ["cdn/clip-nod-yes.glb", 1400, 0.8] };
const yawOf = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;
const turn = (cur, want, k) => { let d = ((want - cur + 540) % 360) - 180; return cur + d * k; };

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), me = ctx.self, pos = me.worldFeetPosition ?? me.feetPosition;
    const tell = (text, color = "#ffe9a8") => ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 2.0, z: pos.z }, text, color, size: 0.9 }, { audience: { player: who.id } });
    if (now - (cool[uid] ?? -1e9) < 25000) { tell("(they point at the machines. you have already eaten.)", "#c8d0e0"); return; }
    cool[uid] = now;
    const list = (s.gives ?? "pizza,burger,doritos,coolranch,coke,pepsi,dew,almond").split(","), tok = list[Math.floor(ctx.random() * list.length)];
    (me.session.m ??= {}).react = now + 2200;
    heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.7, maxDistance: 12 });
    who.state.payout = { xp: 2, items: [tok], text: s.line ?? "They slide a plate across to you, with great care. Nothing is asked for it." };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};

export function update(ctx, dt) {
  const me = ctx.self, s = me.state, now = ctx.now(), m = (me.session.m ??= { i: 0, next: now + 2000 + ctx.random() * 4000 });
  const p = me.feetPosition, v = me.velocity ?? { x: 0, z: 0 };
  const rest = () => { me.velocity = { x: (v.x ?? 0) * 0.6, y: (v.y ?? 0) - 20 * dt, z: (v.z ?? 0) * 0.6 }; };
  const gesture = (g) => { me.anim.gest = { clip: g[0], loop: /loop/.test(g[0]) ? "loop" : "once", weight: g[2], blendIn: 0.25, blendOut: 0.35, mask: { from: "Spine" } }; m.gestEnd = now + g[1]; };
  if (m.gestEnd && now > m.gestEnd) { me.anim.gest = null; m.gestEnd = 0; }
  if (m.react && now < m.react) { // somebody just took a plate: look at them, nod
    const near = ctx.place.players.map((q) => q.feetPosition).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (near) me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(near.x - p.x, near.z - p.z), 0.2) };
    if (!m.gestEnd) gesture(ACT.nod); rest(); return;
  }
  if (s.orderAt && s.orderAt > (m.seenOrder ?? 0)) { m.seenOrder = s.orderAt; gesture(ACT.serve); m.next = now + 6000; } // an order just came in: the kitchen moves
  if (s.deliver) { // waiting on you: walk the tray over, hand it across, go back to the round
    const D = s.deliver, who = ctx.getObject(D.who), tray = ctx.getObject(D.tray);
    if (!who || !tray || now > D.until) { s.deliver = null; }
    else {
      const dx = who.feetPosition.x - p.x, dz = who.feetPosition.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.4) {
        s.deliver = null; me.anim.gest = null; gesture(ACT.serve); rest(); me.rotation = { yaw: yawOf(dx, dz) };
        ctx.destroy(D.tray); who.state.l61Tray = now;
        who.state.payout = { xp: 2, items: D.items, text: `The faceling sets your tray down in front of you. "Order ${D.n}. Enjoy." They nod and head back to work. When you are done, the tray goes in the tray return.` };
        ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: `ORDER ${D.n}. ENJOY!`, color: "#9fffb0", size: 0.9 }, { audience: { player: who.id } });
        heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: p.x, y: p.y + 1, z: p.z }, volume: 0.7, maxDistance: 12 });
        return;
      }
      const sp = 1.7 * (d < 1.8 ? 0.5 : 1), ux = dx / d, uz = dz / d, ease = (c, t) => c + (t - c) * Math.min(1, 7 * dt);
      me.velocity = { x: ease(v.x ?? 0, ux * sp), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, uz * sp) }; me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.25) };
      return;
    }
  }
  if (s.job === "post" && s.greet && now > (m.greetAt ?? 0)) { // somebody walks up to the counter: a wave and a welcome
    const q = ctx.place.players.find((o) => Math.hypot(o.feetPosition.x - p.x, o.feetPosition.z - p.z) < 5);
    if (q) { m.greetAt = now + 60000; if (!m.gestEnd) gesture(GESTS[4]); ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: s.greet, color: "#ffe9a8", size: 0.85 }, { audience: { player: q.id } }); }
  }
  if (s.job === "post") { // behind the counter: face the room, now and then wipe, serve, nod or wave
    rest(); me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, s.faceYaw ?? 0, 0.1) };
    if (now > m.next && !m.gestEnd) { m.next = now + 4000 + ctx.random() * 7000; gesture(s.acts?.length ? ACT[s.acts[Math.floor(ctx.random() * s.acts.length)]] : GESTS[Math.floor(ctx.random() * GESTS.length)]); }
    return;
  }
  // a route: walk to each waypoint, dwell doing the thing, go on to the next, round and round
  const R = s.route ?? []; if (!R.length) { rest(); return; }
  const w = R[m.i % R.length], dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.5) {
    rest();
    if (!m.arrived) { m.arrived = now; if (w.act && ACT[w.act]) gesture(ACT[w.act]); else if (ctx.random() < 0.4) gesture(GESTS[Math.floor(ctx.random() * GESTS.length)]); }
    if (now - m.arrived > (w.dwell ?? 2) * 1000) { m.i++; m.arrived = 0; }
    return;
  }
  m.arrived = 0;
  // other bodies: step round them (a quick look three times a second)
  if (now > (m.sepAt ?? 0)) { m.sepAt = now + 300; let sx = 0, sz = 0; for (const o of ctx.query({ tags: ["npc"], center: p, radius: 1.1 })) { if (o.id === me.id) continue; const ox = p.x - o.feetPosition.x, oz = p.z - o.feetPosition.z, od = Math.hypot(ox, oz) || 0.01; sx += (ox / od) * (1.1 - od); sz += (oz / od) * (1.1 - od); } m.sep = { x: sx, z: sz }; }
  let ux = dx / d + (m.sep?.x ?? 0) * 1.4, uz = dz / d + (m.sep?.z ?? 0) * 1.4; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const sp = (s.pace ?? 1.25) * (d < 1.2 ? Math.max(0.4, d / 1.2) : 1), ease = (c, t) => c + (t - c) * Math.min(1, 7 * dt);
  me.velocity = { x: ease(v.x ?? 0, ux * sp), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, uz * sp) };
  me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.2) };
}
