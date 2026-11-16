// kitPass(ctx): dresses this place's usables with their kit row (scripts/lib/data/usable-kit.json, keyed place → id or "prefix*").
// Adds scripts/usable-kit.js beside the thing's own press script, writes state.kit (+ info), and seats the moving part once.
// Sims call it every few seconds; a row already at KIT.v is skipped, so it costs one query.
import KIT from "./data/usable-kit.json";
const BRASS = { color: "oklch(0.7 0.1 80)", metalness: 0.8, roughness: 0.38, texture: "cdn/texture-worn-brass.png", pbr: true };
const STEEL = { color: "oklch(0.62 0.01 250)", metalness: 0.75, roughness: 0.45, texture: "cdn/texture-scratched-steel.png", pbr: true };
const PART = {
  lever: (m) => ({ primitive: { kind: "capsule", radius: 0.022, halfHeight: 0.12 }, material: m ?? STEEL, rotation: { pitch: -20 },
    children: [{ id: "grip", feetPosition: { x: 0, y: 0.26, z: 0 }, primitive: { kind: "sphere", radius: 0.04 }, material: { color: "oklch(0.32 0.12 28)", roughness: 0.35, pbr: true } }] }),
  dial: (m) => ({ primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 0.03, radialSegments: 24 }, rotation: { pitch: 90 }, pivot: "center", material: m ?? BRASS,
    children: [{ id: "tick", feetPosition: { x: 0, y: 0.03, z: 0.03 }, primitive: { kind: "capsule", radius: 0.006, halfHeight: 0.012 }, rotation: { pitch: 90 }, material: { color: "oklch(0.95 0.02 90)", emissive: "oklch(0.9 0.05 90)", emissiveIntensity: 0.6 } }] }),
  button: (m) => ({ primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.036, height: 0.03, radialSegments: 20 }, rotation: { pitch: 90 }, material: m ?? { color: "oklch(0.5 0.17 28)", roughness: 0.3, pbr: true, emissive: "oklch(0.45 0.16 28)", emissiveIntensity: 0.3 } }),
  flap: (m) => ({ primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.15, height: 0.02, radialSegments: 28 }, pivot: [0.5, 0.5, 1], material: m ?? BRASS }),
  screen: () => ({ primitive: { kind: "plane", width: 0.26, height: 0.17 }, rotation: { yaw: 180 }, scale: { x: 0.9, y: 0.02, z: 1 }, pivot: "center",
    material: { color: "oklch(0.25 0.06 150)", emissive: "oklch(0.75 0.17 150)", emissiveIntensity: 1.4, texture: "cdn/texture-crt-scanlines.png" } }),
  lamp: () => ({ primitive: { kind: "sphere", radius: 0.03, widthSegments: 16, heightSegments: 12 }, scale: { x: 1, y: 1.8, z: 1 }, material: { color: "oklch(0.9 0.06 85)", emissive: "oklch(0.85 0.12 80)", emissiveIntensity: 1.2, roughness: 0.2 } }),
};
const RX = {};
const glob = (k) => (RX[k] ??= new RegExp("^" + k.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"));
// a key is an id, an id glob ("l8-glow-*", "l13f-*-tv") or "#tag"
export const match = (rows, id, tags = []) => rows[id] ?? Object.entries(rows).find(([k]) => (k[0] === "#" ? tags.includes(k.slice(1)) : k.includes("*") && glob(k).test(id)))?.[1];
function seat(o, row) { // local front-face point: front is -Z; AABB unrolled by yaw
  if (row.at) return { x: row.at[0], y: row.at[1], z: row.at[2] };
  const b = o.bounds; if (!b) return { x: 0, y: 0.8, z: -0.3 };
  const yaw = ((o.rotation?.yaw ?? 0) * Math.PI) / 180, c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), det = c * c - s * s;
  let w = b.size.x, d = b.size.z;
  if (Math.abs(det) > 0.3) { w = (b.size.x * c - b.size.z * s) / det; d = (b.size.z * c - b.size.x * s) / det; } else { w = d = (b.size.x + b.size.z) / 2; }
  const sc = typeof o.scale === "number" ? o.scale : (o.scale?.y ?? 1);
  if (row.p === "lamp") return { x: 0, y: (b.size.y / sc) * (row.h ?? 0.4), z: 0 }; // the wick sits inside its glass
  return row.p === "flap" ? { x: 0, y: b.size.y / sc + 0.005, z: 0 } : { x: (w / sc) * 0.28, y: (b.size.y / sc) * (row.h ?? 0.62), z: -(Math.abs(d) / sc) / 2 - 0.012 };
}
// the moving part, seated once under the thing (id <thing>/kit-<part>)
export function seatPart(ctx, o, row) {
  if (!row?.p || !PART[row.p] || !o?.bounds || ctx.getObject(`${o.id}/kit-${row.p}`)) return false;
  ctx.spawn(`kit-${row.p}`, { ...PART[row.p](row.mat), parent: o.id, feetPosition: seat(o, row), tags: ["kit-part"] });
  return true;
}
// a spec born dressed: the kit behavior beside its own, state.kit and the dry line; the part seats itself on spawn
export function kitted(place, id, spec) {
  const row = match(KIT[place] ?? {}, id, spec.tags ?? []); if (!row) return spec;
  const beh = Array.isArray(spec.behavior) ? spec.behavior : spec.behavior ? [spec.behavior] : [];
  const { i, ...kit } = row;
  return { ...spec, behavior: [...beh, "scripts/usable-kit.js"], state: { ...(spec.state ?? {}), kit, kitV: KIT.v, ...(i ? { info: i } : {}) } };
}
const LAST = {};
export function kitPass(ctx, place = ctx.self?.place ?? "main") {
  const rows = KIT[place]; if (!rows) return 0;
  const now = ctx.now(); if (now - (LAST[place] ?? -1e9) < 5000) return 0; LAST[place] = now; // a look every 5 s, never per tick
  let n = 0;
  for (const r of ctx.query({ tags: ["usable"] })) {
    if (r.id.includes("/")) continue;
    const row = match(rows, r.id, r.tags); if (!row) continue;
    if (r.state?.kitV === KIT.v && (!row.p || ctx.getObject(`${r.id}/kit-${row.p}`))) continue; // dressed, part standing
    const o = ctx.getObject(r.id); if (!o || !o.bounds) continue;
    if (r.state?.kitV !== KIT.v && row.p && ctx.getObject(`${r.id}/kit-${row.p}`)) ctx.destroy(`${r.id}/kit-${row.p}`); // an older seat comes up for the new one
    const beh = Array.isArray(o.behavior) ? o.behavior : o.behavior ? [o.behavior] : [];
    if (!beh.includes("scripts/usable-kit.js")) o.behavior = [...beh, "scripts/usable-kit.js"];
    const { i, ...kit } = row; o.state.kit = kit; if (i) o.state.info = i;
    seatPart(ctx, o, row);
    o.state.kitV = KIT.v; n++;
    if (n >= 12) break; // a dozen a pass; the rest next pass
  }
  return n;
}
