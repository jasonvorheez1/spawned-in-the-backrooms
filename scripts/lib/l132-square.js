// Level 132 · square. lay(ctx, L) builds once (guard on ctx.place.state.squareV); tick(ctx, L) runs each second while someone is here.
// Level 132 · the square: the hollow oak (the exit to Level 10), lamps, benches, cafe tables, planters, bunting, fountain,
// notice board, phone box and charging kiosk. lay(ctx, L) builds once (ctx.place.state.squareV); numbers in data/l132-square.yml.
import D from "./data/l132-square.yml";
const PROP = "scripts/l132-sq-prop.js";
const WATER = `fx
pop water rate=?mobile:30|60 on=disc(.01) life=.3..0.36 v=<0,-0.5,0>+sdir()*.05 acc=grav() size=.012..0.02 col=<.82,.9,1> a=.6 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
const at = (a, r) => { const t = (a * Math.PI) / 180; return { x: +(r * Math.sin(t)).toFixed(2), z: +(-r * Math.cos(t)).toFixed(2) }; };
const toC = (p) => (Math.atan2(p.x, p.z) * 180) / Math.PI; // yaw that points -Z at the centre
const hid = (w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false });
export function lay(ctx, L) {
  const st = ctx.place.state;
  if (st.squareV === D.v && ctx.getObject("l132-sq-lamp-0")) return;
  const M = D.models, G = L.ground ?? 0;
  const put = (id, spec) => ctx.spawn(id, spec);
  const prop = (id, m, p, yaw, extra) => put(id, { feetPosition: { x: p.x, y: G, z: p.z }, rotation: { yaw: yaw + (m.yaw ?? 0) }, scale: m.s, model: { id: m.id }, physics: { body: "static", collider: "box" }, castShadow: true, receiveShadow: true, ...extra });
  // the hollow oak
  if (ctx.getObject("l132-tree")) ctx.destroy("l132-tree");
  put("l132-tree", { feetPosition: { x: L.tree.x, y: G, z: L.tree.z }, rotation: { yaw: M.tree.yaw }, scale: M.tree.s, model: { id: M.tree.id }, castShadow: true, receiveShadow: true, tags: ["l132-square"] });
  D.tree.col.forEach((c, i) => put("l132-tree-col-" + i, { ...hid(c[2], D.tree.colH, c[3]), feetPosition: { x: c[0], y: G, z: c[1] }, physics: "static" }));
  const e = D.tree.exit, b = D.tree.exitBox, g = D.tree.glow;
  put("l132-tree-exit", { ...hid(b[0], b[1], b[2]), feetPosition: { x: e[0], y: G + e[1], z: e[2] }, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", tags: ["usable"], state: { name: "Hollow tree", verb: "Step inside", to: "level10#l10-from-l132" } });
  put("l132-tree-glow", { feetPosition: { x: g.at[0], y: G + g.at[1], z: g.at[2] }, light: { kind: "point", color: D.lamps.color, intensity: g.intensity, distance: g.distance } });
  if (!ctx.getObject("l132-arrive")) put("l132-arrive", { feetPosition: { x: L.arrive.x, y: G + 0.2, z: L.arrive.z }, rotation: { yaw: L.arrive.yaw } });
  // lamps, their bulbs, and bunting up to the tree
  const B = D.bunting, lm = D.lamps;
  for (let k = 0; k < lm.n; k++) {
    const a = lm.a0 + (360 / lm.n) * k, p = at(a, lm.r), yaw = toC(p);
    prop("l132-sq-lamp-" + k, M.lamp, p, yaw, { tags: ["l132-square"] });
    put("l132-lamplight-" + k, { feetPosition: { x: p.x, y: G + lm.lightY, z: p.z }, light: { kind: "point", color: lm.color, intensity: lm.intensity, distance: lm.distance } });
    const pitch = (Math.atan2(B.treeY - B.lampY, lm.r - B.treeR) * 180) / Math.PI;
    for (let j = 0; j < B.segs; j++) {
      const f = (j + 0.5) / B.segs, q = at(a, lm.r + (B.treeR - lm.r) * f), y = B.lampY + (B.treeY - B.lampY) * f;
      put(`l132-bunting-${k}-${j}`, { feetPosition: { x: q.x, y: G + y - B.h, z: q.z }, rotation: { yaw: yaw + (M.bunting.yaw ?? 0), pitch }, pivot: "top", scale: M.bunting.s, model: { id: M.bunting.id }, castShadow: false, tags: ["l132-square"] });
    }
  }
  // benches and cafe sets; the seat is its own unseen row so the sitter always faces the tree
  for (let k = 0; k < D.benches.n; k++) {
    const p = at(D.benches.a0 + (360 / D.benches.n) * k, D.benches.r), yaw = toC(p);
    prop("l132-sq-bench-" + k, M.bench, p, yaw, { tags: ["l132-square"] });
    put("l132-seat-bench-" + k, { ...hid(1.3, 0.5, 0.6), feetPosition: { x: p.x, y: G, z: p.z }, rotation: { yaw }, tags: ["seat"], state: { name: "Bench", verb: "Sit", seat: D.benches.seat } });
  }
  for (let k = 0; k < D.tables.n; k++) {
    const a = D.tables.a0 + (360 / D.tables.n) * k, p = at(a, D.tables.r), yaw = toC(p) + 90, t = (yaw * Math.PI) / 180;
    prop("l132-sq-table-" + k, M.cafeset, p, yaw, { tags: ["l132-square"] });
    [1, -1].forEach((sg, i) => { // chairs sit along the set's own z, each facing the table
      const c = { x: p.x + Math.sin(t) * D.tables.chair * sg, z: p.z + Math.cos(t) * D.tables.chair * sg };
      put(`l132-seat-table-${k}-${i}`, { ...hid(0.5, 0.5, 0.5), feetPosition: { x: c.x, y: G, z: c.z }, rotation: { yaw: yaw + (sg > 0 ? 0 : 180) }, tags: ["seat"], state: { name: "Cafe chair", verb: "Sit", seat: { w: 1 } } });
    });
  }
  D.planters.at.forEach((a, k) => { const p = at(a, D.planters.r); prop("l132-sq-planter-" + k, M.planter, p, toC(p) + k * 67, { physics: { body: "static", collider: "cylinder" }, tags: ["l132-square"] }); });
  // the fountain, the notice board, the phone box and the charging kiosk
  const F = D.fountain, fp = { x: F.x, z: F.z };
  prop("l132-sq-fountain", M.fountain, fp, toC(fp), { physics: { body: "static", collider: "cylinder" }, behavior: PROP, tags: ["usable", "l132-square"], state: { name: "Drinking fountain", verb: "Drink", kind: "drink", line: D.lines.fountain } });
  put("l132-fountain-water", { feetPosition: { x: F.x, y: G + F.spoutY, z: F.z }, fx: { script: WATER }, audio: { clip: D.sounds.water, loop: true, gain: F.gain, spatial: true, maxDistance: F.maxDistance } });
  prop("l132-sq-board", M.board, D.board, 0, { behavior: PROP, tags: ["usable", "l132-square"], state: { name: "Notice board", verb: "Read", kind: "read", page: D.board.page } });
  prop("l132-sq-phonebox", M.phonebox, D.phone, toC(D.phone), { behavior: PROP, tags: ["usable", "l132-square"], state: { name: "Phone box", verb: "Lift the receiver", kind: "note", line: D.lines.phone, snd: D.sounds.phone } });
  prop("l132-sq-kiosk", M.kiosk, D.kiosk, toC(D.kiosk), { behavior: PROP, tags: ["usable", "l132-square"], state: { name: "Charging kiosk", verb: "Use", kind: "note", line: D.lines.kiosk, snd: D.sounds.kiosk },
    audio: { clip: D.sounds.radio, loop: true, gain: D.kiosk.radioGain, spatial: true, maxDistance: D.kiosk.radioMax } });
  put("l132-town-bed", { feetPosition: { x: 0, y: G + 3, z: 0 }, audio: { clip: D.bed.clip, loop: true, gain: D.bed.gain, spatial: false, bus: "Ambience" } });
  st.squareV = D.v;
}
export function tick(ctx, L) {}
