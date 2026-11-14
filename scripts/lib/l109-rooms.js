import { medLook } from "./l109-kit.js";
// What stands inside a Level 109 auditorium. buildRoom(ctx, R) is called once each time a room loads.
// R = { id, type, info, seed, sp(key, spec) -> id, at(a, b, up) -> world feet, yawIn, yawAlong, abandoned, pop }
//   a = metres along the door wall from the room's centre (-15..15), b = metres in from the door wall (0..30); the door is at a = -8, b = 0.
//   sp() tags what it spawns so the room's unload removes it; pass plain specs (feetPosition from R.at).
// Every model, size and tuned number is in data/l109-rooms.yml. The lane a = -9..-7 from the door stays clear.
import { buildOutpost } from "./l109-outpost.js";
import { rand, SPAWN } from "./level109.js";
import D from "./data/l109-rooms.yml";
const GEO = "scripts/l109-med-geo.js", VR = { min: 0, max: D.viewRange };
const BUILD = { supply, or: theatre, icu, pharmacy, biohazard, ward };
// how a department reads: lit and clean unless this one was left abandoned (data: dept, ruinSafe)
export function roomLook(seed, info) { const d = D.dept?.[info.type]; if (!d) return null;
  const ruin = Math.hypot(info.door.x - SPAWN.x, info.door.z - SPAWN.z) > D.ruinSafe && rand(seed, 77, info.r * 7 + info.c.i, info.side + (info.c.ax === "ns" ? 0 : 9)) < d.ruin;
  return { ...d, abandoned: ruin }; }
export function buildRoom(ctx, R) { if (["doctors", "or_active", "icu_active", "breach"].includes(R.type) && buildOutpost(ctx, R)) return;
  const f = BUILD[R.type]; if (!f) return;
  let h = 7; for (const ch of String(R.id)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  let n = 0; const K = { ctx, R, r: () => rand(R.seed, h, ++n, 5), n: 0 };
  f(K); if (R.abandoned) litter(K);
}
const pick = (K, arr) => arr[Math.min(arr.length - 1, Math.floor(K.r() * arr.length))];
const between = (K, [lo, hi]) => lo + Math.min(hi - lo, Math.floor(K.r() * (hi - lo + 1)));
function loot(K, pool) { const L = D.loot[pool], out = []; for (let i = between(K, L.n); i > 0; i--) out.push(pick(K, L.pool)); return out.join(","); }
// a fitted model: a, b room metres, yaw degrees off the inward direction. o: { up, solid (default true), tip (lies on its side), tint, spec }
function put(K, name, a, b, yaw = 0, o = {}) { const m = D.models[name], [w, h, d] = m.size, R = K.R, sw = /x/.test(m.forward ?? ""), bx = (sw ? d : w) / 2, bz = (sw ? w : d) / 2; // the fit box is in the mesh's own frame, before forward turns it
  return R.sp(`${name}${K.n++}`, { feetPosition: R.at(a, b, (o.up ?? 0) + (o.tip ? d / 2 : 0)), rotation: o.tip ? { yaw: R.yawIn + yaw, pitch: 90, roll: 0 } : { yaw: R.yawIn + yaw, pitch: 0, roll: 0 },
    model: { id: m.id, ...(m.forward ? { forward: m.forward } : {}) }, layout: { box: { min: { x: -bx, y: 0, z: -bz }, max: { x: bx, y: h, z: bz } } },
    material: o.tint ? { color: o.tint } : undefined, visibleRange: VR, castShadow: false, ...(o.solid === false ? {} : { physics: { body: "static", collider: "box" } }), ...(o.spec ?? {}) }); }
// a searchable container: the world's "container" pattern (tags + state.items), read by the player's press
function stash(K, name, a, b, yaw, label, pool, lock) { return put(K, name, a, b, yaw, { spec: { tags: ["container", "furniture"], state: { items: loot(K, pool), name: label, verb: "Search", kind: "medical", ...(lock ? { lock } : {}) } } }); }
// interactive medical hardware backed by scripts/l109-use.js
function usePart(K, p, a, b, yaw = 0, st = {}, o = {}) {
  const uid = `r-${K.R.id}-${p.part}-${Math.round(a * 10)}_${Math.round(b * 10)}`;
  const at = K.R.at(a, b, o.up ?? 0);
  return part(K, p, a, b, yaw, {
    ...o,
    spec: {
      tags: ["usable"],
      behavior: "scripts/l109-use.js",
      ...(o.spec ?? {}),
      state: { uid, c: { x: at.x, y: at.y + (o.lift ?? 0.9), z: at.z }, ...(o.spec?.state ?? {}), ...st },
    },
  });
}
// a lore terminal on its own desk: prints one of the Doctors' Entity 19 records (pages.yml 110-116, Shelly Nov 14)
function loreTerm(K, a, b, yaw, page, name) { put(K, "desk", a, b, yaw); usePart(K, { part: "terminal", on: !K.R.abandoned }, a, b, yaw, { kind: "terminal", mode: "lore", page, roomId: K.R.id, name, verb: "Read Records", info: "recovered email & logs" }, { up: 0.76, lift: 0.22 }); }
// a piece of the medical kit (scripts/l109-med-geo.js)
const TIP_LIFT = 0.32; // tuned: a tipped stand turns about its feet, so its rolling base (r 0.26-0.3) swings under the floor; lift it by that radius
function part(K, p, a, b, yaw = 0, o = {}) { const R = K.R;
  if (p.part === "decon") return R.sp(`decon${K.n++}`, { feetPosition: R.at(a, b, 0), rotation: { yaw: R.yawIn + yaw, pitch: 0, roll: 0 }, visibleRange: VR, physics: "static", ...(o.spec ?? {}), // Shelly Nov 14: "this model is blocky and floating": the purge box stands on its own steel post, a real model
    primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.035, height: 1.12 }, material: { color: "oklch(0.62 0.01 250)", metalness: 0.8, roughness: 0.4 },
    children: [{ feetPosition: { x: 0, y: -0.01, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.17, radiusBottom: 0.19, height: 0.025 }, material: { color: "oklch(0.45 0.01 250)", metalness: 0.7, roughness: 0.55 } },
      { feetPosition: { x: 0, y: 1.08, z: 0.06 }, model: { id: "/cdn/value.c7be48b31c2cd67c9450ab65e5aefb0247347daa37708c20c6553c25dc2d94bb.glb", forward: "+z" }, layout: { box: { min: { x: -0.17, y: 0, z: -0.11 }, max: { x: 0.17, y: 0.44, z: 0.11 } } } }] });
  return R.sp(`${p.part}${K.n++}`, { feetPosition: R.at(a, b, (o.up ?? 0) + (o.tip ? TIP_LIFT : 0)), rotation: o.tip ? { yaw: R.yawIn + yaw, pitch: 88, roll: 0 } : { yaw: R.yawIn + yaw, pitch: 0, roll: 0 }, ...medLook(p, K.n),
    visibleRange: VR, castShadow: false, ...(o.solid ? { physics: "static" } : {}), ...(o.spec ?? {}) }); }
function litter(K) { for (let i = 0; i < 4; i++) part(K, { part: "paper", r: 1.6, n: 14 }, -11 + K.r() * 22, 4 + K.r() * 22, K.r() * 360);
  for (let i = 0; i < 2; i++) put(K, "stackchair", -5 + K.r() * 16, 3 + K.r() * 4, K.r() * 360, { tip: true, solid: false }); }

function supply(K) { const S = D.supply, R = K.R, dead = R.abandoned; // a real stockroom: receiving bay by the door, numbered aisles filling the floor, a locked cage at the back (gavi pass, Nov 14)
  S.aisles.forEach((a, i) => { for (let j = 0; j < S.perAisle; j++) { const b = S.aisleB + j * 1.45;
      if (dead && K.r() < 0.15) { put(K, "shelf", a + 0.9, b, 90, { tip: true, solid: false }); continue; }
      put(K, "shelf", a, b, 90); if (K.r() < 0.55) put(K, "box", a, b + (K.r() - 0.5) * 0.7, K.r() * 30, { up: D.shelfBoxY, solid: false }); }
    if (i < S.aisles.length - 1) R.sp(`aisle${i}`, { feetPosition: R.at((a + S.aisles[i + 1]) / 2, S.aisleB - 0.6, 2.35), rotation: { yaw: R.yawIn + 180, pitch: 0, roll: 0 }, visibleRange: VR,
      vector: `<svg viewBox='0 0 120 50' width='0.6m'><rect x='2' y='2' width='116' height='46' rx='4' fill='#1d4f8c' stroke='#e8ecef' stroke-width='3'/><text x='60' y='35' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='700' fill='#f2f4f5'>AISLE ${i + 1}</text></svg>` }); });
  part(K, { part: "cage", w: 8, d: 5, h: 2.5 }, 9, 26.8, 180, { solid: true }); // the high-value cage
  const spots = [[-14.3, 4.5, 90, "cabinet", "Medical Cabinet"], [-6, 28.8, 0, "lockbox", "Dressing Box"], [14.4, 13, -90, "cabinet", "Medical Cabinet"], [-12, 28.5, 0, "cagecrate", "Supply Crate"], [7, 28, 180, "cagecrate", "Supply Crate"], [11, 28.2, 180, "lockbox", "Dressing Box"]];
  const n = between(K, S.containers); for (let i = 0; i < n; i++) { const [a, b, y, m, label] = spots[i]; stash(K, m, a, b, y, label, "supply", i >= 4 ? S.cageLock : undefined); }
  put(K, "desk", 3, 3.2, 180); put(K, "chair", 3, 4.1, K.r() * 40 - 20, { solid: false }); stash(K, "filing", 5, 3.3, 180, "Stock Ledgers", "desk");
  usePart(K, { part: "terminal", on: true }, 2.7, 3.05, 90, { kind: "terminal", mode: "supply", roomId: R.id, name: "Stockroom Terminal", verb: "Check Manifest", info: "inventory & cage lock" }, { up: 0.76, lift: 0.22 });
  put(K, "crashcart", -4.5, 4 + K.r(), 20 + K.r() * 40); put(K, "crashcart", 9, 4.5, K.r() * 360); put(K, "gurney", 12.5, 2.4, dead ? 115 : 90);
  for (const [a, b] of [[-13, 2], [-12.6, 3.3], [13.2, 6.2], [-2, 27.5], [-3.2, 28.6], [1, 28.4]]) put(K, "boxes", a, b, K.r() * 40 - 20);
  put(K, "drum", -13.5, 24, 0); put(K, "drum", -12.8, 24.6, 30); put(K, "wheelchair", 0, 5.5, 160 + K.r() * 40);
}
function theatre(K) { const dead = K.R.abandoned, A = 2, B = 15, R = K.R;
  part(K, { part: "tiles", w: 12, d: 12 }, A, B); part(K, { part: "tilewall", w: 9, h: 1.9 }, 14.93, B, 90); part(K, { part: "tilewall", w: 9, h: 1.9 }, 14.9, B, -90);
  put(K, "gurney", A, B, dead ? 90 + 24 : 90);
  usePart(K, { part: "surglamp", on: !dead }, A, B - 0.2, K.r() * 360, { kind: "surglamp", on: !dead, aim: R.at(A, B, 0), name: "Surgical Lamp", verb: dead ? "Switch On" : "Switch Off", info: dead ? "off" : "spot lit" },
    { up: 1.95, lift: 0.02, spec: dead ? {} : { light: { kind: "spot", color: "#fff8ea", intensity: 5, distance: 7, angle: 55, penumbra: 0.6, aim: R.at(A, B, 0), shadow: { enabled: false } } } });
  part(K, { part: "tray" }, A - 1.1, B - 0.6, 60, dead ? { tip: true } : {}); part(K, { part: "tray" }, A + 1.0, B + 0.9, 200);
  usePart(K, { part: "gas" }, A - 0.9, B + 1.7, 150, { kind: "gas", name: "Anesthesia Manifold", verb: "Breathe O2", info: "stamina · Repair/Science 25 harvests" }, { solid: true, lift: 1.0 });
  put(K, "crashcart", A + 2.2, B - 1.6, 30); part(K, { part: "ivstand" }, A + 0.8, B - 1.3, 0, dead ? { tip: true } : {});
  usePart(K, { part: "monitor", on: !dead }, A + 1.5, B + 2.0, 200, { kind: "monitor", on: !dead, name: "Patient Monitor", verb: dead ? "Inspect Housing" : "Silence Monitor", info: dead ? "Medicine/Repair 20 salvages" : "vitals active" }, { lift: 1.25 });
  put(K, "stackchair", A - 2.2, B + 0.4, 100, { solid: false }); loreTerm(K, -12, 4, 90, 113, "Surgical Records Terminal");
  for (let i = 0; i < 4; i++) {
    const sb = B - 2.7 + i * 1.8;
    put(K, "sink", 14.55, sb, -90, i === 1 ? { spec: { tags: ["usable"], behavior: "scripts/l109-use.js", state: { kind: "sink", name: "Scrub Sink", verb: "Wash Hands", info: "+sanity · +stamina", c: R.at(14.55, sb, 0.95) } } } : {});
  }
  stash(K, "cabinet", -6, 29.7, 180, "Instrument Cabinet", "theatre"); stash(K, "cabinet", -4.6, 29.7, 180, "Instrument Cabinet", "theatre"); stash(K, "lockbox", 9, 29.6, 180, "Sterile Box", "theatre");
  put(K, "locker", -14.6, 10, 90); put(K, "locker", -14.6, 10.6, 90); put(K, "locker", -14.6, 11.2, 90); put(K, "gurney", -12.5, 20, 90 + (dead ? 40 : 0)); put(K, "wheelchair", -3.5, 5, 140); put(K, "wetsign", -2, 8.5, 20, { solid: false });
}
function icu(K) { const I = D.icu, dead = K.R.abandoned, per = I.beds[0] + (K.r() < 0.5 ? 1 : 0);
  I.rowB.forEach((b, row) => { const out = row ? -1 : 1; // heads to the outer side of each row, feet to the middle aisle
    for (let i = 0; i < per; i++) { const a = I.firstA + i * 4.4, sk = dead ? (K.r() - 0.5) * 2 : 0;
      put(K, "gurney", a + sk * I.askewM, b + sk * I.askewM, 90 + sk * I.askewDeg);
      if (i % 2 === 0 && !(dead && K.r() < 0.3)) {
        usePart(K, { part: "monitor", on: !dead }, a - 0.95, b - out * 1.0, row ? 180 : 0, { kind: "monitor", on: !dead, name: "Bedside Monitor", verb: dead ? "Inspect Housing" : "Silence Monitor", info: dead ? "Medicine/Repair 20 salvages" : "vitals active" }, { lift: 1.25 });
      } else {
        part(K, { part: "monitor", on: !dead }, a - 0.95, b - out * 1.0, row ? 180 : 0, dead && K.r() < 0.3 ? { tip: true } : {});
      }
      part(K, { part: "ivstand" }, a + 0.85, b - out * 0.9, K.r() * 360, dead && K.r() < 0.4 ? { tip: true } : {});
      if (i < per - 1) {
        const drawn = dead ? 0.25 : 0.4 + K.r() * 0.5, stDrop = K.r() < 0.32 ? pick(K, ["almond", "bandage", "bobbypin", "cash:25"]) : "";
        usePart(K, { part: "curtain", len: 3, drawn }, a + 2.2, b - out * 0.2, 90, { kind: "curtain", name: "Privacy Curtain", verb: drawn > 0.55 ? "Open Curtain" : "Draw Curtain", info: "bedside screen", stash: stDrop }, { lift: 1.25 });
      }
    } });
  stash(K, "cabinet", 14.6, 15, -90, "Ward Cabinet", "bedside"); stash(K, "lockbox", -13, 15, 90, "Bedside Box", "bedside");
  put(K, "desk", -12, 6, 90); put(K, "chair", -12.8, 6, 90, { solid: false });
  usePart(K, { part: "terminal", on: true }, -12, 5.7, 90, { kind: "terminal", mode: "wardlog", roomId: K.R.id, name: "ICU Nursing Log", verb: "Read Shift Log" }, { up: 0.76, lift: 0.22 });
  put(K, "crashcart", -4.5, 15, 30); put(K, "wheelchair", -12, 24, 200);
  // the nurses' island down the aisle between the bed rows (gavi pass, Nov 14: the ICU middle stood bare)
  put(K, "counter", 1.2, 15, 0); put(K, "counter", 3.6, 15, 0); put(K, "counter", 1.2, 15.7, 180); put(K, "counter", 3.6, 15.7, 180);
  part(K, { part: "monitor", on: !dead }, 0.6, 15.2, 180, { up: 0.95 }); part(K, { part: "monitor", on: !dead }, 4.2, 15.5, 0, { up: 0.95 });
  put(K, "chair", 1.6, 14.1, 170 + K.r() * 30, { solid: false }); put(K, "chair", 3.2, 16.6, K.r() * 30 - 15, { solid: false });
  stash(K, "filing", 5.4, 15.35, -90, "Charting Cabinet", "desk"); put(K, "crashcart", -1.0, 15.35, 90);
  put(K, "steeltable", 8.5, 15.3, 0); put(K, "box", 8.3, 15.3, 20, { up: 0.8, solid: false }); put(K, "wheelchair", 11.5, 15.5, 60 + K.r() * 40);
  part(K, { part: "ivstand" }, 9.8, 14.4, K.r() * 360); put(K, "watercooler", 14.6, 8, -90);
}
function pharmacy(K) { const P = D.pharmacy, dead = K.R.abandoned, cw = D.models.counter.size[0], open0 = dead ? 0.55 : 0.12;
  for (let i = 0; i < 4; i++) put(K, "counter", -3 + i * cw, P.counterB, 0);
  usePart(K, { part: "shutter", w: 4 * cw, y0: D.models.counter.size[1], y1: 2.3, open: open0 }, -3 + 1.5 * cw, P.counterB, 0,
    { kind: "shutter", name: "Dispensary Shutter", verb: "Raise Shutter", info: dead ? "jammed · Lockpick 35 / Repair 25" : "counter grille", ...(dead ? { lock: "lockpick:35" } : {}) }, { solid: true, lift: 1.25 });
  usePart(K, { part: "tube", ready: true }, 6.3, P.counterB - 0.15, 0, { kind: "tube", name: "Pneumatic Dispatch Tube", verb: "Check Capsule", info: "hospital dispensary link" }, { up: 0.95, lift: 0.45 });
  P.aisles.forEach((b, r) => { for (let i = 0; i < P.perAisle; i++) { const a = P.aisleA + (i - (P.perAisle - 1) / 2) * 1.45;
      if (dead && K.r() < 0.12) continue; put(K, "shelf", a, b, r % 2 ? 180 : 0); } });
  part(K, { part: "cage", w: 5, d: 4.5, h: 2.5 }, 11.5, 26.5, 180, { solid: true });
  stash(K, "fridge", 13, 27.6, 180, "Drug Fridge", "cage", P.cageLock); stash(K, "lockbox", 10.5, 27.8, 180, "Controlled Drugs Box", "cage", P.boxLock);
  stash(K, "cabinet", -2, P.counterB + 1.6, 180, "Dispensary Cabinet", "pharmacy"); stash(K, "filing", 5.5, P.counterB + 1.6, 180, "Prescription Files", "desk");
  usePart(K, { part: "cooler" }, -11.5, 4.0, 90, { kind: "cooler", name: "Water Cooler", verb: "Drink Water", info: "cold filtered" }, { solid: true, lift: 0.85 });
  put(K, "stackchair", -5, 3, 200, { solid: false }); put(K, "stackchair", -4.3, 3, 170, { solid: false }); put(K, "boxes", -12.5, 20, 30); put(K, "boxes", 9, 13, -10); put(K, "wetsign", -5.5, 9, 0, { solid: false }); loreTerm(K, -11.5, 12, 90, 111, "Lab Results Terminal");
}
function placard(K, a, b, yaw) { const R = K.R; R.sp(`plc${K.n++}`, { feetPosition: R.at(a, b, 1.55), rotation: { yaw: R.yawIn + yaw, pitch: 0, roll: 0 }, visibleRange: VR,
  vector: "<svg viewBox='0 0 100 120' width='0.5m'><rect x='2' y='2' width='96' height='116' rx='5' fill='#e8c21a' stroke='#17150f' stroke-width='4'/><path d='M50 14 L88 78 L12 78 Z' fill='none' stroke='#17150f' stroke-width='6'/><rect x='46' y='36' width='8' height='24' fill='#17150f'/><circle cx='50' cy='68' r='4.5' fill='#17150f'/><text x='50' y='104' text-anchor='middle' font-size='15' font-family='sans-serif' fill='#17150f'>BIOHAZARD</text></svg>" }); }
function biohazard(K) { const H = D.hazard, R = K.R, dead = R.abandoned, purged = !!K.ctx.place.state?.l109Purged?.[R.id];
  part(K, { part: "sheet", w: 7, h: 2.5, strips: true }, -8, 5.5, 0); part(K, { part: "sheet", w: 5.5, h: 2.5 }, -4.5, 2.75, 90, { solid: true }); part(K, { part: "sheet", w: 5.5, h: 2.5 }, -11.5, 2.75, 90, { solid: true });
  part(K, { part: "sheet", w: 9, h: 2.5 }, 3, 12, 90, { solid: true }); part(K, { part: "sheet", w: 8, h: 2.5, strips: true }, 8, H.lineB - 1.5, 0);
  part(K, { part: "tape", w: 29.6 }, 0, H.lineB, 0);
  placard(K, -4.47, 2.5, 90); placard(K, -4.53, 2.5, -90); placard(K, -8, 5.46, 0); placard(K, -8, 5.54, 180);
  usePart(K, { part: "decon", purged }, -5.4, 5.75, 0, { kind: "decon", roomId: R.id, purged, name: "Decon Purge Switch", verb: purged ? "Use Eyewash" : "Run Air Purge", info: purged ? "scrubbers running · safe" : "clears airborne toxin" }, { up: 0, lift: 1.3 });
  for (let i = 0; i < 12; i++) { const back = i < 7, a = back ? -13 + K.r() * 26 : (i % 2 ? 6 + K.r() * 7 : -14 + K.r() * 2.5), b = back ? H.lineB + 2 + K.r() * 8 : 8 + K.r() * 8, tip = (dead || back) && K.r() < 0.25;
    put(K, "drum", a, b, K.r() * 360, { tint: D.drumTint, tip, solid: !tip }); }
  put(K, "barrier", -8, H.lineB - 0.6, 0); put(K, "barrier", 1, H.lineB - 0.6, 6); put(K, "barrier", -2.5, 8, 80);
  stash(K, "cagecrate", 11, 27.5, 180, "Sealed Crate", "hot"); stash(K, "lockbox", -12, 28, 180, "Sample Box", "hot"); stash(K, "cabinet", -13, 9.5, 90, "Decon Cabinet", "bedside");
  put(K, "gurney", 0, 25, 30); loreTerm(K, 8, 2.5, 0, 115, "Quarantine Desk Terminal"); put(K, "wetsign", -8, 8, 0, { solid: false }); put(K, "locker", 14.6, 4, -90); put(K, "locker", 14.6, 4.6, -90);
  const p = R.at(-15, H.lineB), q = R.at(15, 30);
  R.sp("hz", { tags: ["l109-hz"], feetPosition: R.at(0, 25, 2.4), behavior: "scripts/l109-hazard.js", audience: "all", state: { roomId: R.id, purged, box: { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), z0: Math.min(p.z, q.z), z1: Math.max(p.z, q.z) } },
    light: { kind: "point", color: purged ? "#eef8ff" : H.light, intensity: purged ? 1.8 : dead ? 0.9 : 1.6, distance: 15, shadow: { enabled: false } } });
}
function ward(K) { const W = D.ward, dead = K.R.abandoned;
  W.rowB.forEach((b, row) => W.as.forEach((a) => { row = row % 2; const sk = dead ? (K.r() - 0.5) * 1.6 : 0;
    put(K, "cot", a + sk * 0.4, b + sk * 0.3, 90 + sk * 30); if (K.r() < 0.5) part(K, { part: "ivstand" }, a + 0.7, b + (row ? 0.8 : -0.8), K.r() * 360, dead && K.r() < 0.4 ? { tip: true } : {}); }));
  for (let i = 0; i < 8; i++) { const b = 9 + i * 0.52; if (i < W.lockersOpen) stash(K, "locker", 14.65, b, -90, "Patient Locker", "bedside"); else put(K, "locker", 14.65, b, -90); }
  put(K, "desk", -1, 4.2, 180); put(K, "desk", 0.4, 4.2, 180); put(K, "chair", -0.3, 5.1, 0, { solid: false }); stash(K, "filing", 1.6, 4.4, 180, "Nurses' Files", "desk");
  usePart(K, { part: "terminal", on: !dead }, -0.8, 4.1, 90, { kind: "terminal", mode: "wardlog", roomId: K.R.id, name: "Nurses' Station Log", verb: "Read Shift Log" }, { up: 0.76, lift: 0.22 });
  usePart(K, { part: "curtain", len: 3, drawn: 0.5 }, -4.8, W.rowB[0], 90, { kind: "curtain", name: "Ward Curtain", verb: "Open Curtain", stash: K.r() < 0.4 ? "bandage" : "" }, { lift: 1.25 });
  usePart(K, { part: "curtain", len: 3, drawn: 0.3 }, -4.8, W.rowB[1], 90, { kind: "curtain", name: "Ward Curtain", verb: "Draw Curtain", stash: K.r() < 0.35 ? "almond" : "" }, { lift: 1.25 });
  usePart(K, { part: "cooler" }, 4.5, 4.2, 90, { kind: "cooler", name: "Water Cooler", verb: "Drink Water", info: "cold filtered" }, { solid: true, lift: 0.85 });
  put(K, "wheelchair", -12.5, 14, 100); put(K, "crashcart", -12.5, 25, 20); put(K, "stackchair", 9, 15, 40, { solid: false });
  // every bed gets its own corner: a bedside cabinet and a visitor's chair (gavi pass, Nov 14: the ward floor read as cots on a parking lot)
  W.rowB.forEach((b, row) => W.as.forEach((a) => { const side = row === 1 ? 1 : -1;
    if (K.r() < 0.8) put(K, "cabinet", a + 1.25, b + side * 0.1, side > 0 ? 180 : 0, { solid: false });
    if (K.r() < 0.55) put(K, "stackchair", a - 0.4 + K.r() * 0.8, b + side * 1.0, K.r() * 360, dead && K.r() < 0.3 ? { tip: true, solid: false } : { solid: false }); }));
  // the dayroom corner: a table where patients ate, a water cooler, chairs pulled out and left
  put(K, "steeltable", -11, 9, 90); put(K, "steeltable", -11, 10.3, 90);
  for (const [a, b, y] of [[-11.9, 9, 90], [-11.9, 10.4, 80], [-10.1, 9.2, -90], [-10.1, 10.6, -110], [-11, 11.4, 200]]) put(K, "stackchair", a, b, y + K.r() * 20, { solid: false });
  put(K, "watercooler", -14.6, 12, 90); put(K, "gurney", -11, 21, 90 + (dead ? 25 : 0)); stash(K, "lockbox", -11.6, 19.8, 0, "Patient Belongings", "bedside");
}
