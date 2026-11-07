// Level 5 "Terror Hotel": lays the shell, every lamp, the radios, the ways in and out and the sound beds once
// (place.state.builtV). The plan is scripts/lib/level5.js. The rooms' furniture, the Boiler Room's machines, the residents,
// Samantha, the creatures and the elevators are laid by their own scripts (scripts/l5-*.js), each from this tick.
import { ZONES, EXITS, ARRIVALS, LIGHTS, RADIOS, POLONAISE } from "../../scripts/lib/level5.js";
export const cadence = "1s";
const V = 1;
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const plate = (text, sub, bg = "#2a1c12", fg = "#e8c983") => `<div face="front" width="1.2m" style="font-family:serif;text-align:center;color:${fg};background:${bg};border:14px solid #8a6a2a;padding:18px 10px;line-height:1.05"><div style="font-size:130px;font-weight:900;letter-spacing:10px">${text}</div>${sub ? `<div style="font-size:64px;font-style:italic;opacity:.85">${sub}</div>` : ""}</div>`;
function fwd(yaw) { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) }; } // a yaw's front (-Z) direction
function lay(ctx) {
  ctx.spawn("l5-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level5-geo.js" }, material: { roughness: 0.85 } });
  LIGHTS.forEach((l, i) => ctx.spawn(`l5-light-${i}`, { tags: ["l5-light", `l5-fix-${l.kind}`], feetPosition: { x: l.x, y: l.y, z: l.z }, state: { kind: l.kind },
    light: { kind: "point", color: l.color, intensity: l.intensity, distance: l.distance, shadow: { enabled: l.kind === "chandelier" && l.intensity >= 14 } } }));
  // radios: a valve set on its shelf, the creator's polonaise playing from it, E switches it
  for (const r of RADIOS) {
    const track = { clip: POLONAISE, gain: 0.55, loop: true, spatial: true, refDistance: 2, maxDistance: 16, bus: "music" };
    ctx.spawn(r.id, { tags: ["usable", "l5-radio"], feetPosition: { x: r.x, y: r.y, z: r.z }, rotation: { yaw: r.yaw }, physics: "static",
      primitive: { kind: "box", width: 0.46, height: 0.34, depth: 0.24 }, material: { color: "oklch(0.42 0.08 50)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.4 },
      behavior: "scripts/l5-door.js", audio: track,
      state: { kind: "radio", on: true, track, name: "Valve radio", verb: "Switch off", info: `A polonaise, from ${r.where}. Nobody tuned it.`, tint: "#e8c983" } });
  }
  // the ways out: the lift down to Level 3, the old stairway up to Level 4 (walk in), the lore's sealed doors (press)
  for (const e of EXITS) {
    const f = fwd(e.yaw);
    if (e.to) {
      ctx.spawn(e.id, { tags: ["door"], feetPosition: { x: e.at.x + f.x * 0.4, y: 0, z: e.at.z + f.z * 0.4 }, rotation: { yaw: e.yaw }, physics: { body: "static", trigger: true },
        primitive: { kind: "box", width: 1.4, height: 2.4, depth: 0.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: e.to } });
      ctx.spawn(`${e.id}-plate`, { feetPosition: { x: e.at.x + f.x * 0.06, y: 2.55, z: e.at.z + f.z * 0.06 }, rotation: { yaw: e.yaw }, primitive: { kind: "box", width: 1.2, height: 0.36, depth: 0.03 }, material: { color: "oklch(0.25 0.04 50)" },
        ui: plate(e.label, e.kind === "lift" ? "▼ electrical station" : "▲ abandoned office") });
      ctx.spawn(`${e.id}-lamp`, { feetPosition: { x: e.at.x + f.x * 0.8, y: 2.9, z: e.at.z + f.z * 0.8 }, light: { kind: "point", color: "oklch(0.82 0.1 70)", intensity: 2.2, distance: 6 } });
    } else {
      ctx.spawn(e.id, { tags: ["usable", "l5-sealed"], feetPosition: { x: e.at.x + f.x * 0.08, y: 0, z: e.at.z + f.z * 0.08 }, rotation: { yaw: e.yaw }, physics: "static",
        primitive: { kind: "box", width: e.kind === "gate" ? 2.2 : 1.1, height: e.kind === "gate" ? 2.8 : 2.3, depth: 0.12 },
        material: e.kind === "metal" || e.kind === "airlock" ? { color: "oklch(0.5 0.03 40)", texture: "cdn/texture-peeling-white-paint-rusty-steel.png", roughness: 0.55, metalness: 0.6 } : { color: "oklch(0.5 0.06 45)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.55 },
        behavior: "scripts/l5-door.js", state: { kind: "sealed", text: e.sealed, name: e.sealed.split(" · ")[0], verb: "Try the door", info: "It won't open", tint: "#b89b6a", sound: e.kind === "airlock" ? "metal-valve-wheel-creak" : null } });
    }
  }
  for (const [id, a] of Object.entries(ARRIVALS)) ctx.spawn(id, { feetPosition: { x: a.x, y: 0.1, z: a.z }, rotation: { yaw: a.yaw } });
  // sound beds: the hotel's electrical hum everywhere, a crowd that isn't there in the ballroom, the boilers' roar
  ctx.spawn("l5-bed-hum", { feetPosition: { x: -20, y: 2, z: 0 }, audio: { clip: G("old-building-electrical-hum-room-tone-loop"), gain: 0.12, loop: true, spatial: false } });
  ctx.spawn("l5-bed-ball", { feetPosition: { x: 6, y: 2, z: 0 }, audio: { clip: G("distant-party-crowd-murmur-glasses-clink-loop"), gain: 0.35, loop: true, spatial: true, refDistance: 6, maxDistance: 20 } });
  for (const [x, z] of [[26, -14], [38, 0], [26, 14]]) ctx.spawn(`l5-bed-boiler-${x}-${z}`, { feetPosition: { x, y: 2, z }, audio: { clip: G("industrial-boiler-roar-steam-hiss-loop"), gain: 0.5, loop: true, spatial: true, refDistance: 4, maxDistance: 22 } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.builtV !== V) { s.builtV = V; lay(ctx); }
}
