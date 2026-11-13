// The Hub: lays the tunnels, lamps, doors and camps once per room (place.state.hubV), then keeps its people.
import { RUNS, lamps, DOORS, CURB, symbolSvg, doorFront } from "../../scripts/lib/thehub.js";
import { keysOf, keyDoor } from "../../scripts/lib/hubkeys.js";
export const cadence = "1s";
const V = 2;
const SODIUM = "oklch(0.8 0.15 68)";
function layShell(ctx) {
  for (const r of RUNS) ctx.spawn("hub-run-" + r.id, { tags: ["hub-shell"], feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/thehub-geo.js", params: { run: r.id } }, material: { roughness: 0.88, pbr: true } });
}
function layLamps(ctx) {
  for (const l of lamps()) ctx.spawn("hub-lamp-" + l.k, { tags: ["hub-lamp"], feetPosition: { x: l.x, y: l.y, z: l.z }, rotation: { yaw: l.yaw }, primitive: { kind: "box", width: 0.9, height: 0.2, depth: 0.25 }, material: { color: SODIUM, emissive: SODIUM, emissiveIntensity: 4 },
    light: { kind: "point", color: SODIUM, intensity: 9, distance: 19, shadow: { enabled: false } } });
}
function layDoors(ctx) {
  for (const d of DOORS) {
    const always = !!d.open;
    ctx.spawn(d.obj, { tags: ["usable", "hub-door"], feetPosition: { x: d.x, y: 0, z: d.z }, rotation: { yaw: d.yaw }, physics: { body: "static", collider: "mesh" }, castShadow: false, receiveShadow: true,
      state: { name: always ? "Open door" : "Concrete door", verb: "Try", open: always, always, c: { ...doorFront(d, -0.6), y: 1.2 } }, behavior: "scripts/hub-door.js",
      primitive: { kind: "scripted", script: "scripts/hub-door-geo.js", params: { part: "frame" } }, material: { roughness: 0.9 },
      children: [
        { id: "leaf", feetPosition: { x: always ? 2.75 : 0, y: CURB + 0.02, z: 0.78 }, physics: { body: "kinematic", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/hub-door-geo.js", params: { part: "leaf" }, seed: d.seed }, material: { roughness: 0.9 } },
        { id: "mark", feetPosition: { x: 0, y: CURB + 3.4 + 0.72, z: 0.395 }, vector: symbolSvg(d.seed, 2.1) },
      ] });
    ctx.spawn(d.obj + "-t", { feetPosition: { x: d.x, y: CURB, z: d.z }, rotation: { yaw: d.yaw }, visible: false, state: { door: d.obj }, behavior: "scripts/hub-door.js",
      children: [{ id: "box", feetPosition: { x: 0, y: 0, z: 0.95 }, visible: false, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 2.3, height: 2.6, depth: 0.5 }, state: { door: d.obj }, behavior: "scripts/hub-door.js" }] });
  }
}
// a key leans toward its door: the nearer its carrier stands, the warmer it says it is
function resonance(ctx) {
  for (const p of ctx.place.players) {
    const ks = keysOf(p.state); let best = 1e9;
    for (const [place] of ks) { const d = keyDoor(place); if (d) best = Math.min(best, Math.hypot(d.x - p.feetPosition.x, d.z - p.feetPosition.z)); }
    const band = !ks.length ? 0 : best < 12 ? 3 : best < 45 ? 2 : best < 120 ? 1 : 0;
    if ((p.state.hubRes ?? 0) !== band) { p.state.hubRes = band; if (band) p.state.notice = { text: ["", "The key in your pocket has started to tick, very faintly.", "The key is warm against your leg now.", "The key is humming. It wants one of these doors."][band], at: ctx.now() }; }
    if (band >= 2 && (ctx.now() / 1000 | 0) % (band === 3 ? 2 : 4) === 0) ctx.emit("playSound", { clip: "cdn/sfx-small-brass-key-resonant-ringing-hum-glass-harmonic-single-pulse.mp3", volume: band === 3 ? 0.5 : 0.22 }, { audience: { player: p.id } });
  }
}
export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.hubV ?? 0) < 1) { layShell(ctx); layLamps(ctx); }
  if ((s.hubV ?? 0) < 2) layDoors(ctx);
  s.hubV = V;
  if (!ctx.place.players?.length) return;
  resonance(ctx);
}
