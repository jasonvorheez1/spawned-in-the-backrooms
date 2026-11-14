// The Hub: lays the tunnels, lamps, doors and camps once per room (place.state.hubV), then keeps its people.
import { RUNS, lamps, DOORS, CURB, symbolSvg, doorFront, KEY_NAMES, sealed } from "../../scripts/lib/thehub.js";
import { keysOf, keyDoor } from "../../scripts/lib/hubkeys.js";
import { layThings, keepCrew, keymaster } from "../../scripts/lib/hub-people.js";
import { ARRIVE } from "../../scripts/lib/thehub.js";
import { layLampModels, layDress } from "../../scripts/lib/hub-dress.js";
export const cadence = "1s";
const V = 9;
const DOOR = { frame: { url: "/cdn/value.86c9f9f6e66d057fda78af73bde7c72cea84386e49891e45ea0ed3cddadb3e70.glb", offset: [0, 0, 0.432] }, leaf: { url: "/cdn/value.9437304a5bfa3c822e8830c3d88d9e6310980e867ff78651d84fc6dc5b01035c.glb" } }; // art/hub/doors.yml
const PANEL = "cdn/texture-smooth-cast-concrete-lintel-panel-clean-fine-pores.png"; // the frame's lintel panel came mottled: a clean cast face for the carved mark
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
      primitive: { kind: "scripted", script: "scripts/hub-door-geo.js", params: { part: "back" } }, material: { roughness: 0.9 }, // the dark past the slab and its track; the surround is the modeled cast (art/hub/doors.yml)
      children: [
        { id: "cast", feetPosition: { x: 0, y: CURB, z: 0.42 }, physics: { body: "static", collider: "mesh" }, castShadow: false, receiveShadow: true,
          model: { id: DOOR.frame.url, offset: DOOR.frame.offset, materials: { panel: { texture: PANEL, color: "oklch(0.9 0.008 82)", roughness: 0.92, metalness: 0 } } } },
        { id: "leaf", feetPosition: { x: always ? 2.75 : 0, y: CURB + 0.02, z: 0.78 }, physics: { body: "kinematic", collider: "box" }, castShadow: false,
          model: { id: DOOR.leaf.url, offset: [0, 0, 0.13] } }, // centred on its feet so it slides about the opening's middle, not its hinge edge
        { id: "mark", feetPosition: { x: 0, y: CURB + 4.0, z: 0.4 }, vector: symbolSvg(d.seed, 2.1) },
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
  if ((s.hubV ?? 0) < 9) { if ((s.hubV ?? 0) >= 2) for (const d of DOORS) { if (ctx.place.objects[d.obj]) ctx.destroy(d.obj); if (ctx.place.objects[d.obj + "-t"]) ctx.destroy(d.obj + "-t"); } layDoors(ctx); } // v9: Level 11 door (t10-a3) is locked behind a key
  if ((s.hubV ?? 0) < 3) { layThings(ctx); if (!ctx.place.objects["hub-from-l1"]) ctx.spawn("hub-from-l1", { feetPosition: { x: ARRIVE.x + 1, y: ARRIVE.y, z: ARRIVE.z }, rotation: { yaw: -90 } }); }
  if ((s.hubV ?? 0) < 6) layDoorLamps(ctx);
  if ((s.hubV ?? 0) < 9) layPlaques(ctx); // v9: refresh plaques for Level 11 key requirement
  if ((s.hubV ?? 0) < 5) { layLampModels(ctx); layDress(ctx); } // v5: modeled lamps, fans, tray, gutters, barriers, camp furniture
  s.hubV = V;
  if (!ctx.place.players?.length) return;
  const key = ctx.place.objects["hub-keytag"];
  if (key && (key.visible === false || !key.tags?.includes("usable"))) { key.visible = true; key.tags = ["usable", "hub-thing"]; }
  keepCrew(ctx); keymaster(ctx);
  resonance(ctx);
}

// a caged sodium lamp over every door, so the carved mark reads from down the tunnel; the dark road past the barricade stays dark
function layDoorLamps(ctx) {
  for (const d of DOORS) {
    const f = doorFront(d, 0.5), id = `hub-doorlamp-${d.id}`;
    if (f.x > 500) continue;
    if (ctx.place.objects[id]) ctx.destroy(id);
    ctx.spawn(id, { feetPosition: { x: f.x, y: 4.95, z: f.z }, primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.2, height: 0.14 }, material: { color: "oklch(0.92 0.09 75)", emissive: "oklch(0.8 0.14 65)", emissiveIntensity: 3 }, castShadow: false,
      light: { kind: "point", color: "oklch(0.8 0.13 68)", intensity: 5, distance: 9, shadow: { enabled: false } } });
  }
}

// a M.E.G. survey plaque bolted beside each door: the level it was logged to, sealed ones marked, the rest uncharted
function layPlaques(ctx) {
  for (const d of DOORS) {
    const id = `hub-plaque-${d.id}`; if (ctx.place.objects[id]) ctx.destroy(id);
    if (!ctx.place.objects[d.obj]) continue;
    const name = d.open ? d.open.name : d.to ? KEY_NAMES[d.to] ?? d.to : null;
    const shut = d.to && sealed(ctx, d.to), canon = !!d.open;
    const line = name ? name.toUpperCase() : "UNCHARTED", sub = canon ? "ALWAYS OPEN" : shut ? "SEALED" : name ? "KEY REQUIRED" : "NO SURVEY";
    const ink = shut ? "#8a2a1c" : canon ? "#2e5a2a" : name ? "#1d1a14" : "#5b5346";
    ctx.spawn(id, { parent: d.obj, feetPosition: { x: 2.75, y: 1.2, z: -0.12 }, castShadow: false, primitive: { kind: "box", width: 1.1, height: 0.7, depth: 0.03 }, material: { color: "oklch(0.78 0.04 85)", metalness: 0.5, roughness: 0.6 },
      ui: `<div face="front" class="w-full h-full flex flex-col items-center justify-center" style="font-family:monospace;color:${ink};border:14px solid ${ink};box-sizing:border-box;background:rgba(235,225,190,.92)"><div style="font-size:62px;letter-spacing:6px">M.E.G. SURVEY</div><div style="font-size:190px;font-weight:700;line-height:1">${line}</div><div style="font-size:70px;letter-spacing:8px">${sub}</div></div>` });
  }
}
