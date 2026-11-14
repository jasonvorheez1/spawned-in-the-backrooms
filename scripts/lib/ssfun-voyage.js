// Level 169 piece, filled by its build lane. Contract: places/level169/sim.js calls these.
// The S.S. Fun =) voyage: one ship, one place at a time. A deterministic timetable off ctx.now() lives in
// ctx.world.state.ssfun = { at: "sea" | "level10" | "level169", since, next }; every visited place's sim calls
// shipTick(ctx, put, placeKey, site) and lays (or clears) the fog, hull, gangway and boarding door from it.
// Level 26 calls shipTick(ctx, null, "level26") for its "Go ashore" gate and the deck sign. This file is also the gate's behavior.
import V from "./data/ssfun-voyage.yml";
import { carryAcross } from "./carry.js";

const HULL = "scripts/ssfun-hull.js";
const NAMES = { level10: "LEVEL 10", level169: "LEVEL 169", sea: "AT SEA" };
const rad = (d) => (d * Math.PI) / 180;

export function schedule(now) {
  const sea = V.seaMin * 60000, visit = V.visitMin * 60000, cyc = sea + visit;
  const i = Math.floor(now / cyc), t0 = i * cyc;
  if (now - t0 < sea) return { at: "sea", since: t0, next: t0 + sea };
  return { at: V.order[i % V.order.length], since: t0 + sea, next: t0 + cyc };
}
export function voyage(ctx) {
  const ws = ctx.world.state, cur = ws.ssfun, now = ctx.now();
  if (cur?.forced && now < cur.next) return cur;
  const s = schedule(now);
  if (!cur || cur.at !== s.at || cur.since !== s.since || cur.forced) ws.ssfun = s;
  return ws.ssfun;
}
function siteOf(placeKey, site) { const o = V.sites[placeKey] ?? {}; return { x: o.x ?? site?.x, z: o.z ?? site?.z, yaw: o.yaw ?? site?.yaw ?? 0 }; }
function toWorld(S, lx, lz) { const a = rad(S.yaw), c = Math.cos(a), s = Math.sin(a); return { x: S.x + lx * c + lz * s, z: S.z - lx * s + lz * c }; }
function listed(x, y) { const a = rad(V.hull.listDeg), c = Math.cos(a), s = Math.sin(a); return [x * c + y * s, -x * s + y * c]; }
export function berth(ctx, placeKey, site) {
  const S = siteOf(placeKey, site), H = V.hull, ter = ctx.place.terrain;
  let lo = Infinity;
  for (let d = -35; d <= 35; d += 7) for (const w of [-8, 0, 8]) { const p = toWorld(S, w, d); lo = Math.min(lo, ter.heightAt(p.x, p.z) ?? 0); }
  const feetY = lo - H.sink, [sx, sy] = listed(-H.beam / 2, H.doorY);
  const footL = sx - 0.05 - H.plat - H.run, foot = toWorld(S, footL, H.doorZ), footY = ter.heightAt(foot.x, foot.z) ?? 0;
  const top = toWorld(S, sx - 0.05 - H.plat * 0.5, H.doorZ), land = toWorld(S, footL - 3, H.doorZ);
  return { S, feetY, sill: feetY + sy, foot: { ...foot, y: footY }, rise: feetY + sy - footY, top, land };
}

const FOG = `fx
pop fog rate=?mobile:7|16 on=box(115,2.5,115) life=10..16 v=<1.2,0,.4>*(.6..1.4)+sdir()*.4 size=16..30 acc=curl(.08)*.4+drag(.3) col=<.42,.86,.5>><.3,.7,.42> a=0>.25:.55>.75:.48>0 sz=$size*(.7>1.25) rot=spin(.02) r=sprite(smoke-puff,alpha)
pop veil rate=?mobile:1.5|3 on=box(70,6,70).c(8) life=8..12 v=up(.3)+sdir()*.5 size=26..40 acc=drag(.4) col=<.5,.95,.58> a=0>.3:.2>.7:.14>0 sz=$size*(.8>1.3) rot=spin(.015) r=sprite(smoke-puff,alpha)
pop glow n=1 at=point().c(10) r=light(<.45,1,.55>,%glow|45,150)`;

function spawnAt(ctx, id, spec) { if (ctx.getObject(id)) ctx.destroy(id); return ctx.spawn(id, spec); }
const has = (ctx, id) => !!ctx.getObject(id);

function layFog(ctx, B, id, secs) {
  if (has(ctx, id)) return;
  spawnAt(ctx, id, { tags: ["ssfun-fog"], feetPosition: { x: B.S.x, y: B.foot.y + 1.5, z: B.S.z }, lifetime: Math.max(5, secs), fx: { script: FOG, params: { glow: 45 } } });
  const at = { x: B.S.x, y: B.foot.y + 20, z: B.S.z };
  ctx.emit("playSound", { clip: V.sound.horn, position: at, volume: 1, refDistance: 80, maxDistance: 2500 }, { audience: { nearby: at, radius: 2500 } });
}
function layShip(ctx, B) {
  const H = V.hull;
  spawnAt(ctx, "ssfun-hull", { tags: ["ssfun"], feetPosition: { x: B.S.x, y: B.feetY, z: B.S.z }, rotation: { yaw: B.S.yaw }, primitive: { kind: "scripted", script: HULL, params: { part: "hull", list: H.listDeg } }, material: { pbr: true }, physics: "static", castShadow: true, receiveShadow: true, visibleRange: { max: 2000 } });
  spawnAt(ctx, "ssfun-gangway", { tags: ["ssfun"], feetPosition: { x: B.foot.x, y: B.foot.y, z: B.foot.z }, rotation: { yaw: B.S.yaw - 90 }, primitive: { kind: "scripted", script: HULL, params: { part: "gangway", rise: +B.rise.toFixed(2), run: H.run, plat: H.plat } }, material: { pbr: true }, physics: "static", castShadow: true, visibleRange: { max: 600 } });
  spawnAt(ctx, "ssfun-board", { tags: ["ssfun"], feetPosition: { x: B.top.x, y: B.sill, z: B.top.z }, rotation: { yaw: B.S.yaw }, primitive: { kind: "box", width: 1.4, height: 2.4, depth: 2.4 }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to: "level26" } });
  spawnAt(ctx, "ssfun-music", { tags: ["ssfun"], feetPosition: { x: B.S.x, y: B.feetY + 8, z: B.S.z }, audio: { clip: V.sound.party, gain: 0.4, loop: true, spatial: true, maxDistance: 110 } });
}
function clearShip(ctx) { for (const id of ["ssfun-hull", "ssfun-gangway", "ssfun-board", "ssfun-music"]) if (has(ctx, id)) ctx.destroy(id); }
function layLitter(ctx, B) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.2832 + Math.sin(i * 5.1) * 0.25, r = 5 + 2 * Math.abs(Math.sin(i * 3.7));
    spawnAt(ctx, "ssfun-pop-" + i, { tags: ["ssfun-litter"], feetPosition: { x: B.foot.x + Math.cos(a) * r, z: B.foot.z + Math.sin(a) * r, y: { terrain: 0.01 } }, rotation: { yaw: i * 47 }, primitive: { kind: "scripted", script: HULL, params: { part: "popped", c: i } }, material: { pbr: true }, lifetime: V.debrisSec, visibleRange: { max: 60 } });
  }
  spawnAt(ctx, "ssfun-hat", { tags: ["ssfun-litter"], feetPosition: { x: B.foot.x, z: B.foot.z, y: { terrain: 0 } }, rotation: { yaw: 33 }, primitive: { kind: "scripted", script: HULL, params: { part: "hat" } }, material: { pbr: true }, lifetime: V.debrisSec, visibleRange: { max: 60 } });
}

// one ship: whichever place ticks clears a hull left standing in a place the ship has left (its sim may be asleep with nobody there)
function sweep(ctx, v) {
  for (const k of Object.keys(V.sites)) {
    if (k === v.at || k === ctx.place.id) continue;
    try { const objs = ctx.world.places[k]?.objects; if (!objs) continue; for (const id of ["ssfun-hull", "ssfun-gangway", "ssfun-board", "ssfun-music"]) if (id in objs) delete objs[id]; } catch (e) {}
  }
}
export function shipTick(ctx, put, placeKey, site) {
  const v = voyage(ctx), now = ctx.now(), ps = ctx.place.state;
  sweep(ctx, v);
  if (placeKey === "level26") return deckTick(ctx, v);
  const B = berth(ctx, placeKey, site);
  if (!has(ctx, "ssfun-landing")) spawnAt(ctx, "ssfun-landing", { feetPosition: { x: B.land.x, y: B.foot.y + 0.2, z: B.land.z }, rotation: { yaw: B.S.yaw + 90 } });
  if (has(ctx, "ssfun-hull-plan")) ctx.destroy("ssfun-hull-plan");
  const here = v.at === placeKey, t = (now - v.since) / 1000, left = (v.next - now) / 1000;
  if (here) {
    if (t < V.fogSec) { layFog(ctx, B, "ssfun-fog", V.fogSec - t + V.fogLinger); return; }
    if (!has(ctx, "ssfun-hull") || ps.ssfunAt !== v.since) {
      if (ps.ssfunAt !== v.since && t < V.fogSec + V.fogLinger) layFog(ctx, B, "ssfun-fog", V.fogSec + V.fogLinger - t);
      layShip(ctx, B);
      if (ps.ssfunAt !== v.since) {
        ps.ssfunAt = v.since;
        for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - B.S.x, p.feetPosition.z - B.S.z); if (d <= V.witnessM) p.state.notice = { text: V.witness, at: now }; }
      }
    }
    if (left <= V.fogSec && !has(ctx, "ssfun-fog-out")) layFog(ctx, B, "ssfun-fog-out", left + V.fogLinger);
    return;
  }
  if (has(ctx, "ssfun-hull") || has(ctx, "ssfun-gangway")) {
    clearShip(ctx);
    if (ps.ssfunLitter !== ps.ssfunAt) { ps.ssfunLitter = ps.ssfunAt; layLitter(ctx, B); if (!has(ctx, "ssfun-fog-out")) layFog(ctx, B, "ssfun-fog-out", V.fogLinger); }
  }
}

function deckTick(ctx, v) {
  const G = V.deckGate, open = v.at !== "sea" && (ctx.now() - v.since) / 1000 >= V.fogSec;
  const txt = v.at === "sea" ? "AT SEA" : `NOW CALLING AT: ${NAMES[v.at]}`;
  if (!has(ctx, "ssfun-ashore")) ctx.spawn("ssfun-ashore", { tags: ["usable", "interact", "ssfun-gate"], feetPosition: { x: G.x, y: 0, z: G.z }, rotation: { yaw: 90 }, primitive: { kind: "scripted", script: HULL, params: { part: "gate" } }, material: { pbr: true }, physics: "static", behavior: "scripts/lib/ssfun-voyage.js", state: {} });
  if (!has(ctx, "ssfun-sign")) ctx.spawn("ssfun-sign", { tags: ["ssfun-gate"], feetPosition: { x: G.x + 0.5, y: 0, z: G.signZ }, rotation: { yaw: 90 }, primitive: { kind: "scripted", script: HULL, params: { part: "sign" } }, material: { pbr: true }, physics: "static", state: { text: txt },
    ui: `<div face="front" width="0.92m" emissive class="text-center font-bold" style="font-size:44px;line-height:1.05;color:#fde68a">GANGWAY<br><span style="font-size:40px;color:#fff6c8">{{ state.text }}</span></div>` });
  const gate = ctx.getObject("ssfun-ashore"), sign = ctx.getObject("ssfun-sign");
  const want = open ? { name: "Gangway gate", verb: "Go ashore", prompt: "Go ashore", info: NAMES[v.at] } : { name: "Gangway gate", verb: "Closed", prompt: "Open water.", info: v.at === "sea" ? "Open water." : "Coming in through the fog." };
  if (gate && gate.state.prompt !== want.prompt) gate.state = want;
  if (sign && sign.state.text !== txt) sign.state.text = txt;
}

export const ears = {
  press: (ctx, { by }) => {
    const other = ctx.getObject(by); if (!other?.state) return;
    const v = ctx.world.state.ssfun ?? schedule(ctx.now());
    if (v.at === "sea" || (ctx.now() - v.since) / 1000 < V.fogSec) { other.state.notice = { text: v.at === "sea" ? "Open water." : "Fog everywhere. Not yet.", at: ctx.now() }; return; }
    const dest = `${v.at}#ssfun-landing`;
    ctx.emit("screenFlash", { color: "#7dff9a", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
    other.state.clipKind = "glitch";
    carryAcross(ctx, other, dest);
    ctx.cross(other, dest);
  },
};
// where(now): { place: the visited place or null at sea, next: the next place it calls at, left: ms till it moves }
export function where(now) {
  const s = schedule(now), sea = V.seaMin * 60000, cyc = sea + V.visitMin * 60000, i = Math.floor(now / cyc);
  return { place: s.at === "sea" ? null : s.at, next: s.at === "sea" ? V.order[i % V.order.length] : V.order[(i + 1) % V.order.length], left: s.next - now };
}
