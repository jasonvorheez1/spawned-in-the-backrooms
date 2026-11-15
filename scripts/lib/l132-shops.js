// Level 132 · the three walk-in shops (RadioShed, Starlite Diner, Dial-Up Cafe). lay(ctx, L) builds one shop a tick (ctx.place.state.shopsV);
// tick(ctx, L) settles tabletop pieces onto what stands under them and flickers the TV wall. This file is also the props' behavior (ears.press).
// Layout and every number: scripts/lib/data/l132-shops.yml. Doors: scripts/door-geo.js leaves on scripts/home11-door.js hinges.
import S from "./data/l132-shops.yml";
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
const ME = "scripts/lib/l132-shops.js", FOFF = { "-z": 0, "+z": 180, "+x": 90, "-x": -90 };
const rot = (x, z, yaw) => { const r = (yaw * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return { x: x * c + z * s, z: -x * s + z * c }; };
const at = (sh, x, z, y) => { const p = rot(x, z, sh.yaw); return { x: sh.x + p.x, y, z: sh.z + p.z }; };
const say = (ctx, by, text) => { const w = ctx.getObject(by)?.state; if (w) w.notice = { text, at: ctx.now() }; };

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, w = ctx.getObject(by)?.state; if (!w) return;
    const snd = (clip, volume = 0.5) => ctx.emit("playSound", { clip, position: pos, volume });
    if (s.kind === "read") { w.reading = s.page; snd("cdn/sfx-old-computer-keyboard-single-key-clack.mp3", 0.4); return; }
    if (s.kind === "router") { snd("cdn/sfx-small-electronic-beep-double.mp3", 0.35); say(ctx, by, s.on ? "Five steady green lights. The whole square has signal." : "Two lights blink amber, out of step. The town's Wi-Fi, patchy as ever."); return; }
    if (s.kind === "spin") { animate(ctx, ctx.self, { "rotation.yaw": "+=360" }, { duration: 1.4, easing: "easeOutCubic" }); snd("cdn/sfx-metal-display-rack-spinning-squeak.mp3", 0.4); say(ctx, by, "Batteries of every size, and a few that are not sizes."); return; }
    if (s.kind === "jukebox") {
      const on = !s.on; s.on = on; s.verb = on ? "Stop" : "Play";
      snd("cdn/sfx-jukebox-coin-button-clunk-mechanism.mp3", 0.6);
      ctx.self.audio = on ? { clip: S.tune, gain: 0.55, loop: true, spatial: true, maxDistance: 24 } : null; return;
    }
    if (s.kind === "bell") { snd("cdn/sfx-diner-counter-service-bell-ding.mp3", 0.7); say(ctx, by, "Order up. A plate slides out of the hatch. Nobody is behind it."); return; }
    if (s.kind === "modem") { snd("cdn/sfx-dial-up-modem-handshake-short.mp3", 0.4); say(ctx, by, "It dials. It screeches. It connects to somewhere, slowly."); return; }
    if (s.kind === "arcade") { snd("cdn/sfx-arcade-coin-insert-game-start-jingle.mp3", 0.5); say(ctx, by, "No coin slot: the start button just works. You lose three lives and feel better."); return; }
    if (s.info?.length) { const i = (s.i ?? 0) % s.info.length; s.i = i + 1; say(ctx, by, s.info[i]); }
  },
};

function buildShop(ctx, key) {
  const sh = S.shops[key], F = S.floor, root = `l132-shop-${key}`, tops = [];
  if (ctx.getObject(root)) ctx.destroy(root);
  const mats = {}; for (const k in sh.mats) mats[k] = { texture: sh.mats[k], repeat: [1, 1], wrap: "repeat", roughness: k === "floor_in" ? 0.55 : 0.85 };
  ctx.spawn(root, { feetPosition: { x: sh.x, y: 0, z: sh.z }, rotation: { yaw: sh.yaw }, tags: ["l132", "l132-shop"], state: { name: sh.name },
    model: { id: sh.shell, materials: mats }, physics: { body: "static", collider: "mesh" } });
  // lights: three overhead, one at the back
  [[-sh.rx * 0.55, 0], [sh.rx * 0.55, 0], [0, -sh.back * 0.5], [0, sh.front * 0.55]].forEach(([x, z], i) =>
    ctx.spawn(`${root}-light-${i}`, { feetPosition: at(sh, x, z, 2.85), tags: ["l132"], light: { kind: "point", color: sh.light, intensity: 16, distance: 15 } }));
  if (key === "a") ctx.spawn(`${root}-tvglow`, { feetPosition: at(sh, -3, -2.9, 1.4), tags: ["l132"], light: { kind: "point", color: "oklch(0.85 0.08 240)", intensity: 5, distance: 6 } });
  // the door: hinge at the left jamb, leaf runs across the opening, swings in
  const D = S.door, hid = `${root}-door`;
  const dp = { style: "wood", w: D.w, h: D.h, hingeSide: "left", swing: -1, d: 0.1, seed: 3 + key.charCodeAt(0) };
  const dst = { kind: "door", name: `${sh.name} door`, verb: "Close", hinge: hid };
  ctx.spawn(hid, { feetPosition: at(sh, -D.w / 2, sh.jamb, F), rotation: { yaw: sh.yaw + D.open }, physics: "kinematic", tags: ["usable", "l132"], behavior: "scripts/home11-door.js",
    state: { ...dst, open: true, openYaw: sh.yaw + D.open, closedYaw: sh.yaw },
    children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: dst }] });
  const seat = (id, x, z, yaw, st, name) => ctx.spawn(id, { feetPosition: at(sh, x, z, F), rotation: { yaw: sh.yaw + yaw }, tags: ["seat", "usable", "l132"], state: { name, verb: "Sit", seat: st } });
  for (const r of S.rows[key]) {
    const [url, fwd, sc] = S.models[r.m], id = r.gid ?? `${root}-${r.id}`;
    const tags = ["l132"], state = {};
    if (r.u) { tags.push("usable"); Object.assign(state, r.u); }
    if (r.seat) { tags.push("seat", "usable"); Object.assign(state, { name: r.name, verb: "Sit", seat: r.seat }); }
    if (r.ware) { tags.push("breakable"); state.name = r.ware; }
    const y = r.top != null ? F + r.top : r.wall != null ? r.wall : F;
    if (r.top != null) { tags.push("l132-top"); tops.push(id); }
    if (r.wall != null) tags.push("l132-wall");
    const small = r.top != null || r.wall != null;
    ctx.spawn(id, { feetPosition: at(sh, r.x, r.z, y), rotation: { yaw: sh.yaw + r.f + FOFF[fwd] }, scale: r.s ?? sc, tags, state, model: url,
      physics: r.m === "rug" ? "none" : { body: "static", collider: small ? "box" : "auto" }, behavior: r.u ? ME : undefined, castShadow: !small });
    if (r.booth) { // sit spots read off art/l61-booth (booth-local): the side bench and the back bench
      for (const b of [{ k: "a", x: -0.76, z: 0.47, yaw: -90, w: 2, gap: 0.55 }, { k: "b", x: 0.56, z: -0.59, yaw: 180, w: 2, gap: 0.62 }]) {
        const p = rot(b.x, b.z, r.f); seat(`${id}-seat-${b.k}`, r.x + p.x, r.z + p.z, r.f + b.yaw, { w: b.w, gap: b.gap, d: 0.04, y: 0.28 }, "Diner booth");
      }
      const t = rot(0.1, 0.05, r.f), n = id.slice(-1); // a plate and a cup on each booth table
      for (const [m, dx, nm, j] of [["plate", 0, "Plate", 1], ["mug", 0.22, "Coffee cup", 2]]) {
        const wid = `l132-ware-ceramic-b-booth${n}-${j}`; tops.push(wid);
        ctx.spawn(wid, { feetPosition: at(sh, r.x + t.x + dx, r.z + t.z, F + 0.76), rotation: { yaw: 37 * j }, tags: ["l132", "l132-top", "breakable"], state: { name: nm }, model: S.models[m][0], physics: { body: "static", collider: "box" }, castShadow: false });
      }
    }
    if (r.pc) { const r2 = (r.f * Math.PI) / 180; seat(`${id}-seat`, r.x - Math.sin(r2) * 0.6, r.z - Math.cos(r2) * 0.6, r.f + 180, { w: 1, d: 0, y: 0.12 }, "Desk chair"); }
  }
  return tops;
}

export function lay(ctx, L) {
  const st = ctx.place.state, v = st.shopsV ?? 0, keys = ["a", "b", "c"];
  if (v >= S.V * 10 + 3) return;
  const n = v < S.V * 10 ? 0 : v - S.V * 10;
  const tops = buildShop(ctx, keys[n]);
  st.shopsTops = [...(n ? st.shopsTops ?? [] : []), ...tops];
  st.shopsV = S.V * 10 + n + 1;
}

let tries = 0;
export function tick(ctx, L) {
  const st = ctx.place.state;
  if ((st.shopsV ?? 0) < S.V * 10 + 3) return;
  const glow = ctx.getObject("l132-shop-a-tvglow"); if (glow?.light) glow.light = { ...glow.light, intensity: 4 + ctx.random() * 2.5 };
  const left = st.shopsTops; if (!left?.length || tries > 600) return;
  tries++;
  const keep = [];
  for (const id of left) { // rest each tabletop piece on the surface under it, once that surface has loaded
    const o = ctx.getObject(id); if (!o) continue;
    const p = o.feetPosition, hit = raycast(ctx, { x: p.x, y: p.y + 0.5, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 1.2, ignoreEntities: [id], excludeTags: ["l132-top"], hits: "geometry" });
    if (hit && hit.position.y > S.floor + 0.3) { o.feetPosition = { x: p.x, y: hit.position.y, z: p.z }; } else keep.push(id);
  }
  if (keep.length !== left.length) st.shopsTops = keep;
}
