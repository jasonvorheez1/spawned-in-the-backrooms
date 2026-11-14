// What stands inside a Level 109 auditorium. buildRoom(ctx, R) is called once each time a room loads.
// R = { id, type, info, seed, sp(key, spec) -> id, at(a, b, up) -> world feet, yawIn, yawAlong, abandoned, pop }
//   a = metres along the door wall from the room's centre (-15..15), b = metres in from the door wall (0..30); the door is at a = -8, b = 0.
//   sp() tags what it spawns so the room's unload removes it; pass plain specs (feetPosition from R.at).
// Every model, size and tuned number is in data/l109-rooms.yml. The lane a = -9..-7 from the door stays clear.
import { buildOutpost } from "./l109-outpost.js";
import { rand } from "./level109.js";
import D from "./data/l109-rooms.yml";
const GEO = "scripts/l109-med-geo.js", VR = { min: 0, max: D.viewRange };
const BUILD = { supply, or: theatre, icu, pharmacy, biohazard, ward };
export function buildRoom(ctx, R) { if (["doctors", "or_active", "icu_active", "breach"].includes(R.type) && buildOutpost(ctx, R)) return;
  const f = BUILD[R.type]; if (!f) return;
  let h = 7; for (const ch of String(R.id)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  let n = 0; const K = { R, r: () => rand(R.seed, h, ++n, 5), n: 0 };
  f(K); if (R.abandoned) litter(K);
}
const pick = (K, arr) => arr[Math.min(arr.length - 1, Math.floor(K.r() * arr.length))];
const between = (K, [lo, hi]) => lo + Math.min(hi - lo, Math.floor(K.r() * (hi - lo + 1)));
function loot(K, pool) { const L = D.loot[pool], out = []; for (let i = between(K, L.n); i > 0; i--) out.push(pick(K, L.pool)); return out.join(","); }
// a fitted model: a, b room metres, yaw degrees off the inward direction. o: { up, solid (default true), tip (lies on its side), tint, spec }
function put(K, name, a, b, yaw = 0, o = {}) { const m = D.models[name], [w, h, d] = m.size, R = K.R;
  return R.sp(`${name}${K.n++}`, { feetPosition: R.at(a, b, (o.up ?? 0) + (o.tip ? d / 2 : 0)), rotation: o.tip ? { yaw: R.yawIn + yaw, pitch: 90, roll: 0 } : { yaw: R.yawIn + yaw, pitch: 0, roll: 0 },
    model: { id: m.id, ...(m.forward ? { forward: m.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } },
    material: o.tint ? { color: o.tint } : undefined, visibleRange: VR, castShadow: false, ...(o.solid === false ? {} : { physics: { body: "static", collider: "box" } }), ...(o.spec ?? {}) }); }
// a searchable container: the world's "container" pattern (tags + state.items), read by the player's press
function stash(K, name, a, b, yaw, label, pool, lock) { return put(K, name, a, b, yaw, { spec: { tags: ["container", "furniture"], state: { items: loot(K, pool), name: label, verb: "Search", kind: "medical", ...(lock ? { lock } : {}) } } }); }
// a piece of the medical kit (scripts/l109-med-geo.js)
function part(K, p, a, b, yaw = 0, o = {}) { const R = K.R;
  return R.sp(`${p.part}${K.n++}`, { feetPosition: R.at(a, b, o.up ?? 0), rotation: o.tip ? { yaw: R.yawIn + yaw, pitch: 88, roll: 0 } : { yaw: R.yawIn + yaw, pitch: 0, roll: 0 }, primitive: { kind: "scripted", script: GEO, params: p, seed: K.n },
    visibleRange: VR, castShadow: false, ...(o.solid ? { physics: "static" } : {}), ...(o.spec ?? {}) }); }
function litter(K) { for (let i = 0; i < 4; i++) part(K, { part: "paper", r: 1.6, n: 14 }, -11 + K.r() * 22, 4 + K.r() * 22, K.r() * 360);
  for (let i = 0; i < 2; i++) put(K, "stackchair", -5 + K.r() * 16, 3 + K.r() * 4, K.r() * 360, { tip: true, solid: false }); }

function supply(K) { const S = D.supply, dead = K.R.abandoned;
  S.rows.forEach((a, i) => { for (let j = 0; j < S.perRow; j++) { const b = S.bFrom[i % 2] + j * 1.45;
      if (dead && K.r() < 0.18) { put(K, "shelf", a + 0.9, b, 90, { tip: true, solid: false }); continue; }
      put(K, "shelf", a, b, 90); if (K.r() < 0.6) put(K, "box", a, b + (K.r() - 0.5) * 0.7, K.r() * 30, { up: D.shelfBoxY, solid: false }); }
    put(K, "boxes", a, S.bFrom[i % 2] + S.perRow * 1.45 + 0.3, K.r() * 40 - 20); });
  const spots = [[-13.6, 6, 90], [-13.6, 12, 90], [-4.5, 26.5, 0], [3.5, 28.6, 0], [13.6, 20, -90], [13.6, 5, -90]], kinds = [["cagecrate", "Supply Crate"], ["cabinet", "Medical Cabinet"], ["lockbox", "Dressing Box"]];
  const n = between(K, S.containers); for (let i = 0; i < n; i++) { const [a, b, y] = spots[i], [m, label] = kinds[i % 3]; stash(K, m, a, b, y, label, "supply"); }
  put(K, "crashcart", -4.5, 5, 20 + K.r() * 40); put(K, "crashcart", 8.3, 21 + K.r() * 3, K.r() * 360); put(K, "gurney", -12, 22, 90 + (dead ? 25 : 0));
  put(K, "boxes", 12.5, 27.5, 15); put(K, "boxes", -12.8, 27.8, -10); put(K, "drum", 13.5, 12, 0, { solid: true });
}
function theatre(K) { const dead = K.R.abandoned, A = 2, B = 15;
  part(K, { part: "tiles", w: 12, d: 12 }, A, B); part(K, { part: "tilewall", w: 9, h: 1.9 }, 14.93, B, 90); part(K, { part: "tilewall", w: 9, h: 1.9 }, 14.9, B, -90);
  put(K, "gurney", A, B, dead ? 90 + 24 : 90);
  part(K, { part: "surglamp", on: !dead }, A, B - 0.2, K.r() * 360, { up: 1.95, spec: dead ? {} : { light: { kind: "spot", color: "#fff8ea", intensity: 5, distance: 7, angle: 55, penumbra: 0.6, aim: K.R.at(A, B, 0), shadow: { enabled: false } } } });
  part(K, { part: "tray" }, A - 1.1, B - 0.6, 60, dead ? { tip: true } : {}); part(K, { part: "tray" }, A + 1.0, B + 0.9, 200); part(K, { part: "gas" }, A - 0.9, B + 1.7, 150, { solid: true });
  put(K, "crashcart", A + 2.2, B - 1.6, 30); part(K, { part: "ivstand" }, A + 0.8, B - 1.3, 0, dead ? { tip: true } : {}); part(K, { part: "monitor", on: !dead }, A + 1.5, B + 2.0, 200); put(K, "stackchair", A - 2.2, B + 0.4, 100, { solid: false });
  for (let i = 0; i < 4; i++) put(K, "sink", 14.55, B - 2.7 + i * 1.8, -90);
  stash(K, "cabinet", -6, 29.7, 180, "Instrument Cabinet", "theatre"); stash(K, "cabinet", -4.6, 29.7, 180, "Instrument Cabinet", "theatre"); stash(K, "lockbox", 9, 29.6, 180, "Sterile Box", "theatre");
  put(K, "locker", -14.6, 10, 90); put(K, "locker", -14.6, 10.6, 90); put(K, "locker", -14.6, 11.2, 90); put(K, "gurney", -12.5, 20, 90 + (dead ? 40 : 0)); put(K, "wheelchair", -3.5, 5, 140); put(K, "wetsign", -2, 8.5, 20, { solid: false });
}
function icu(K) { const I = D.icu, dead = K.R.abandoned, per = 3 + (K.r() < 0.5 ? 1 : 0);
  I.rowB.forEach((b, row) => { const out = row ? -1 : 1; // heads to the outer side of each row, feet to the middle aisle
    for (let i = 0; i < per; i++) { const a = I.firstA + i * 4.4, sk = dead ? (K.r() - 0.5) * 2 : 0;
      put(K, "gurney", a + sk * I.askewM, b + sk * I.askewM, 90 + sk * I.askewDeg);
      part(K, { part: "monitor", on: !dead }, a - 0.95, b - out * 1.0, row ? 180 : 0, dead && K.r() < 0.3 ? { tip: true } : {});
      part(K, { part: "ivstand" }, a + 0.85, b - out * 0.9, K.r() * 360, dead && K.r() < 0.4 ? { tip: true } : {});
      if (i < per - 1) part(K, { part: "curtain", len: 3, drawn: dead ? 0.25 : 0.4 + K.r() * 0.5 }, a + 2.2, b - out * 0.2, 90); } });
  stash(K, "cabinet", 14.6, 15, -90, "Ward Cabinet", "bedside"); stash(K, "lockbox", -13, 15, 90, "Bedside Box", "bedside");
  put(K, "desk", -12, 6, 90); put(K, "chair", -12.8, 6, 90, { solid: false }); put(K, "crashcart", -4.5, 15, 30); put(K, "wheelchair", -12, 24, 200);
}
function pharmacy(K) { const P = D.pharmacy, dead = K.R.abandoned, cw = D.models.counter.size[0];
  for (let i = 0; i < 4; i++) put(K, "counter", -3 + i * cw, P.counterB, 0);
  part(K, { part: "shutter", w: 4 * cw, y0: D.models.counter.size[1], y1: 2.3, open: dead ? 0.55 : 0.12 }, -3 + 1.5 * cw, P.counterB, 0, { solid: true });
  P.aisles.forEach((b, r) => { for (let i = 0; i < P.perAisle; i++) { const a = P.aisleA + (i - (P.perAisle - 1) / 2) * 1.45;
      if (dead && K.r() < 0.12) continue; put(K, "shelf", a, b, r % 2 ? 180 : 0); } });
  part(K, { part: "cage", w: 5, d: 4.5, h: 2.5 }, 11.5, 26.5, 180, { solid: true });
  stash(K, "fridge", 13, 27.6, 180, "Drug Fridge", "cage", P.cageLock); stash(K, "lockbox", 10.5, 27.8, 180, "Controlled Drugs Box", "cage", P.boxLock);
  stash(K, "cabinet", -2, P.counterB + 1.6, 180, "Dispensary Cabinet", "pharmacy"); stash(K, "filing", 5.5, P.counterB + 1.6, 180, "Prescription Files", "desk");
  put(K, "stackchair", -5, 3, 200, { solid: false }); put(K, "stackchair", -4.3, 3, 170, { solid: false }); put(K, "boxes", -12.5, 20, 30); put(K, "boxes", 9, 13, -10); put(K, "wetsign", -5.5, 9, 0, { solid: false });
}
function placard(K, a, b, yaw) { const R = K.R; R.sp(`plc${K.n++}`, { feetPosition: R.at(a, b, 1.55), rotation: { yaw: R.yawIn + yaw, pitch: 0, roll: 0 }, visibleRange: VR,
  vector: "<svg viewBox='0 0 100 120' width='0.5m'><rect x='2' y='2' width='96' height='116' rx='5' fill='#e8c21a' stroke='#17150f' stroke-width='4'/><path d='M50 14 L88 78 L12 78 Z' fill='none' stroke='#17150f' stroke-width='6'/><rect x='46' y='36' width='8' height='24' fill='#17150f'/><circle cx='50' cy='68' r='4.5' fill='#17150f'/><text x='50' y='104' text-anchor='middle' font-size='15' font-family='sans-serif' fill='#17150f'>BIOHAZARD</text></svg>" }); }
function biohazard(K) { const H = D.hazard, R = K.R, dead = R.abandoned;
  part(K, { part: "sheet", w: 7, h: 2.5, strips: true }, -8, 5.5, 0); part(K, { part: "sheet", w: 5.5, h: 2.5 }, -4.5, 2.75, 90, { solid: true }); part(K, { part: "sheet", w: 5.5, h: 2.5 }, -11.5, 2.75, 90, { solid: true });
  part(K, { part: "sheet", w: 9, h: 2.5 }, 3, 12, 90, { solid: true }); part(K, { part: "sheet", w: 8, h: 2.5, strips: true }, 8, H.lineB - 1.5, 0);
  part(K, { part: "tape", w: 29.6 }, 0, H.lineB, 0);
  placard(K, -4.47, 2.5, 90); placard(K, -4.53, 2.5, -90); placard(K, -8, 5.46, 0); placard(K, -8, 5.54, 180);
  for (let i = 0; i < 12; i++) { const back = i < 7, a = back ? -13 + K.r() * 26 : (i % 2 ? 6 + K.r() * 7 : -14 + K.r() * 2.5), b = back ? H.lineB + 2 + K.r() * 8 : 8 + K.r() * 8, tip = (dead || back) && K.r() < 0.25;
    put(K, "drum", a, b, K.r() * 360, { tint: D.drumTint, tip, solid: !tip }); }
  put(K, "barrier", -8, H.lineB - 0.6, 0); put(K, "barrier", 1, H.lineB - 0.6, 6); put(K, "barrier", -2.5, 8, 80);
  stash(K, "cagecrate", 11, 27.5, 180, "Sealed Crate", "hot"); stash(K, "lockbox", -12, 28, 180, "Sample Box", "hot"); stash(K, "cabinet", -13, 9.5, 90, "Decon Cabinet", "bedside");
  put(K, "gurney", 0, 25, 30); put(K, "wetsign", -8, 8, 0, { solid: false }); put(K, "locker", 14.6, 4, -90); put(K, "locker", 14.6, 4.6, -90);
  const p = R.at(-15, H.lineB), q = R.at(15, 30);
  R.sp("hz", { feetPosition: R.at(0, 25, 2.4), behavior: "scripts/l109-hazard.js", audience: "all", state: { box: { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), z0: Math.min(p.z, q.z), z1: Math.max(p.z, q.z) } },
    light: { kind: "point", color: H.light, intensity: dead ? 0.9 : 1.6, distance: 13, shadow: { enabled: false } } });
}
function ward(K) { const W = D.ward, dead = K.R.abandoned;
  W.rowB.forEach((b, row) => W.as.forEach((a) => { const sk = dead ? (K.r() - 0.5) * 1.6 : 0;
    put(K, "cot", a + sk * 0.4, b + sk * 0.3, 90 + sk * 30); if (K.r() < 0.5) part(K, { part: "ivstand" }, a + 0.7, b + (row ? 0.8 : -0.8), K.r() * 360, dead && K.r() < 0.4 ? { tip: true } : {}); }));
  for (let i = 0; i < 8; i++) { const b = 9 + i * 0.52; if (i < W.lockersOpen) stash(K, "locker", 14.65, b, -90, "Patient Locker", "bedside"); else put(K, "locker", 14.65, b, -90); }
  put(K, "desk", -1, 4.2, 180); put(K, "desk", 0.4, 4.2, 180); put(K, "chair", -0.3, 5.1, 0, { solid: false }); stash(K, "filing", 1.6, 4.4, 180, "Nurses' Files", "desk");
  part(K, { part: "curtain", len: 3, drawn: 0.5 }, -4.8, W.rowB[0], 90); part(K, { part: "curtain", len: 3, drawn: 0.3 }, -4.8, W.rowB[1], 90);
  put(K, "wheelchair", -12.5, 14, 100); put(K, "crashcart", -12.5, 25, 20); put(K, "stackchair", 9, 15, 40, { solid: false });
}
