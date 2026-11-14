// Level 169 piece, filled by its build lane. Contract: places/level169/sim.js calls these.
// The checkpoint road (Shelly's brief, Nov 14): A, B, B½, C and the edge north of Ferry's house, cairns every 400 m up the track,
// landmarks to steer by, route boards with guided night legs, lockers of tins (never water), and the jump into the void that wakes you in Level 11.
// Positions: scripts/lib/data/level169.yml; road numbers: scripts/lib/data/l169-road.yml. Sites stream in near players and go when everyone is far.
import R from "./data/l169-road.yml";
export const ORDER = ["house", "a", "b", "bh", "c", "edge"];
const GEO = "scripts/l169-road-geo.js", TRAVEL = "scripts/l169-travel.js";
const NAMES = { house: "Ferry's house", edge: "The edge" };
const g = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const geo = (kind, extra = {}) => ({ primitive: { kind: "scripted", script: GEO, params: { kind, ...extra } } });
const HOUR_S = (L) => L.day.periodMs / 48000;
export const hourOf = (ctx, L) => { const t = ctx.place?.atmosphere?.timeOfDay; return typeof t === "number" ? t : ((ctx.now() % L.day.periodMs) / L.day.periodMs) * 24; };
const isNight = (h, L) => h < L.day.sunrise || h >= L.day.sunset;
export function siteOf(sid, L) {
  if (sid === "house") return { x: L.house.door.x, z: L.house.door.z + 6, km: R.houseKm, name: NAMES.house };
  if (sid === "edge") return { x: 0, z: -(L.edge - 30), km: L.edge * L.scale / 10, name: NAMES.edge };
  const c = L.checkpoints[sid]; return c ? { x: c.x, z: c.z, km: c.km, name: c.name } : null;
}
export const quote = (sid) => R.texts?.[sid] ?? "";
// ---- the legs a route board offers: one back, one on. Guided legs run at night, cost cold bottles and food; a known way costs half.
export function legsFrom(ctx, ps, site, L) {
  const i = ORDER.indexOf(site), out = [], h = hourOf(ctx, L), known = ps?.l169cps ?? [];
  for (const to of [ORDER[i + 1], ORDER[i - 1]]) {
    if (!to) continue;
    const a = siteOf(site, L), b = siteOf(to, L), km = Math.round(Math.abs(b.km - a.km)), kn = known.includes(to);
    let bottles = Math.max(1, Math.ceil(km / R.bottleKm)), food = Math.max(1, Math.ceil(km / R.foodKm));
    if (kn) { bottles = Math.max(1, Math.ceil(bottles / 2)); food = Math.max(1, Math.ceil(food / 2)); }
    const hours = Math.round((km / R.legSpeed) * 10) / 10;
    let why = "";
    if (to === "edge" && !known.includes("c")) why = "The guide's notes stop at C. Reach C first.";
    else if (!isNight(h, L)) why = `Daylight. The guide walks at night: leave after ${L.day.sunset}:00.`;
    else if ((ps?.l169cold ?? 0) < bottles) why = `You need ${bottles} cold bottle${bottles > 1 ? "s" : ""} of Ferry's water. You have ${ps?.l169cold ?? 0}.`;
    else if ((ps?.hunger ?? 100) - food * R.foodHunger < 10) why = "You're too hungry to set out. Eat first.";
    out.push({ to, name: b.name, km, dir: ORDER.indexOf(to) > i ? "north" : "south", hours, bottles, food, known: kn, chill: 0, sun: 0, why });
  }
  return out;
}
export function go(ctx, p, from, to, L) {
  const ps = p?.state; if (!ps || ps.l169trip) return;
  const q = legsFrom(ctx, ps, from, L).find((x) => x.to === to); if (!q) return;
  if (q.why) { if (ps.l169board) ps.l169board = { ...ps.l169board, msg: q.why }; return; }
  ps.l169cold = Math.max(0, (ps.l169cold ?? 0) - q.bottles);
  ps.almonds = Math.max(0, (ps.almonds ?? 0) - q.bottles);
  ps.hunger = Math.max(0, (ps.hunger ?? 100) - q.food * R.foodHunger);
  ps.l169board = null; ps.l169read = null;
  ps.l169trip = { at: Math.round(ctx.now()), due: Math.round(ctx.now() + R.tripMs), to, km: q.km, name: q.name };
}
// ---- one site's pieces, ids l169-cp-<sid>-*
function board(sid, x, z, L, yaw = 0) {
  const i = ORDER.indexOf(sid);
  return [[`l169-cp-${sid}-board`, { tags: ["usable", "l169-board"], feetPosition: g(x, z), rotation: yaw, ...geo("boardposts"), physics: "static", behavior: TRAVEL,
    state: { kind: "board", site: sid, next: ORDER[i + 1] ?? null, prev: ORDER[i - 1] ?? null, name: "Route board", verb: "Read", info: "guided legs at night" },
    ui: `<div face="front" width="1.6m" offset="0.2m" style="font:700 52px monospace;color:#2a1c10;padding:18px 26px;line-height:1.2">ROUTE<br><span style="font-size:34px;font-weight:400">${ORDER[i + 1] ? `${siteOf(ORDER[i + 1], L).name} &uarr; ${Math.round(siteOf(ORDER[i + 1], L).km - siteOf(sid, L).km)} km` : "nothing north"}<br>${ORDER[i - 1] ? `${siteOf(ORDER[i - 1], L).name} &darr;` : ""}</span></div>` }]];
}
function locker(sid, x, z, yaw = 0) {
  return [[`l169-cp-${sid}-locker`, { tags: ["usable"], feetPosition: g(x, z), rotation: yaw, ...geo("locker"), physics: "static", behavior: TRAVEL,
    state: { kind: "locker", site: sid, name: "Supply locker", verb: "Open", info: "tins and cloth, never water" } }]];
}
function readable(id, x, z, kind, title, lines, yaw = 0) {
  return [[id, { tags: ["usable"], feetPosition: g(x, z), rotation: yaw, ...geo(kind), physics: kind === "cairnfield" || kind === "boots" ? undefined : "static", behavior: TRAVEL,
    state: { kind: "read", title, lines, name: title, verb: "Look" } }]];
}
const lamp = (id, x, z, up, color = "oklch(0.85 0.12 70)") => [[id, { feetPosition: g(x, z, up), light: { kind: "point", color, intensity: 1.6, distance: 14, shadow: { enabled: false } } }]];
function siteParts(sid, L) {
  const s = siteOf(sid, L); if (!s) return [];
  const X = s.x, Z = s.z, P = [];
  const add = (rows) => P.push(...rows);
  P.push([`l169-cp-${sid}-m`, { feetPosition: g(X, Z), state: { site: sid } }]); // the site's root marker
  if (sid === "a") {
    add([[`l169-cp-a-shade`, { feetPosition: g(X, Z), ...geo("shade"), physics: "static" }]]);
    add(board("a", X - 4, Z + 3, L)); add(locker("a", X + 2.2, Z - 1.2, 180));
    add([[`l169-cp-a-hatch`, { feetPosition: g(X + 5, Z + 1), ...geo("hatch"), physics: "static" }]]);
    add([[`l169-cp-a-pit`, { tags: ["usable"], feetPosition: g(X + 5, Z + 1, 0.3), behavior: TRAVEL, state: { kind: "locker", site: "apit", name: "Cool pit", verb: "Reach in", info: R.texts.pit } }]]);
    add(readable(`l169-cp-a-log`, X - 1.5, Z + 2.5, "logpost", R.logbook.title, R.logbook.lines));
    add(lamp(`l169-cp-a-light`, X, Z - 0.5, 2.3));
  } else if (sid === "b") {
    add([[`l169-cp-b-box`, { feetPosition: g(X, Z), ...geo("container"), physics: "static" }]]);
    add(board("b", X - 5, Z + 4, L)); add(locker("b", X + 1.6, Z - 0.6, 180));
    add([[`l169-cp-b-stove`, { feetPosition: g(X - 1.6, Z - 0.6), ...geo("stove"), physics: "static" }]]);
    add(lamp(`l169-cp-b-light`, X, Z, 2.1));
  } else if (sid === "bh") {
    add([[`l169-cp-bh-house`, { feetPosition: g(X, Z), ...geo("house"), physics: "static" }]]);
    add(board("bh", X - 5.5, Z + 5, L)); add(locker("bh", X + 2, Z - 2, 180));
    add([[`l169-cp-bh-bed`, { tags: ["usable"], feetPosition: g(X - 1.6, Z - 1.4, 0.05), ...geo("bedroll"), behavior: TRAVEL,
      state: { kind: "bed", site: "bh", name: "Bed at B½", verb: "Sleep", info: "a real bed, made up" } }]]);
    add([[`l169-cp-bh-stove`, { feetPosition: g(X + 1.8, Z + 0.6), ...geo("stove"), physics: "static" }]]);
    add([[`l169-cp-bh-bench`, { feetPosition: g(X + 2, Z + 4.2), rotation: 180, ...geo("bench"), physics: "static" }]]);
    add(lamp(`l169-cp-bh-light`, X, Z, 2.2, "oklch(0.8 0.13 60)"));
  } else if (sid === "c") {
    add([[`l169-cp-c-wall`, { feetPosition: g(X, Z - 2), ...geo("wall"), physics: "static" }]]);
    add([[`l169-cp-c-leanto`, { feetPosition: g(X + 1.5, Z), ...geo("leanto"), physics: "static" }]]);
    add(board("c", X - 4, Z + 3, L)); add(locker("c", X - 1, Z - 0.6, 180));
    add(readable(`l169-cp-c-sign`, X + 4, Z + 3, "logpost", "Checkpoint C", [R.texts.c]));
  } else if (sid === "edge") {
    add(board("edge", X - 6, Z + 8, L));
    add(readable(`l169-cp-edge-field`, X - 8, Z + 2, "cairnfield", "Cairns", [R.texts.cairns]));
    add(readable(`l169-cp-edge-boots`, X + 1, Z - 24, "boots", "Boots", [R.texts.boots]));
    add(readable(`l169-cp-edge-sign`, X + 5, Z + 6, "logpost", "The edge", [R.texts.edge]));
  } else if (sid === "house") {
    add(board("house", X + 4.5, Z - 2.5, L, 0));
  }
  return P;
}
function cairnSites(L) { // stacked stones up the track from the house to the edge, and the landmarks you steer by
  const out = [], z0 = L.house.center.z - 100;
  for (let z = z0, i = 0; z > -L.edge + 200; z -= R.cairnEvery, i++) out.push({ id: `k${i}`, x: (i % 2 ? 3.5 : -3.5), z, kind: "cairn", arrow: i % 3 === 0 });
  for (const m of R.landmarks) out.push(m);
  return out;
}
function smallParts(m) {
  return [[`l169-cp-${m.id}-m`, { feetPosition: g(m.x, m.z, m.kind === "windmill" ? 0 : -0.05), rotation: m.yaw ?? 0, ...geo(m.kind, { roll: m.roll ?? 0, arrow: !!m.arrow, sd: (m.z % 97) + 1, ...(m.n ? { n: m.n } : {}) }), physics: m.kind === "grove" ? undefined : "static",
    visibleRange: { max: m.kind === "cairn" ? 260 : 900 } }]];
}
// ---- streaming
const built = {}; // sid -> ids alive on this machine
function allSites(L) {
  const S = ORDER.map((sid) => ({ id: sid, ...siteOf(sid, L), big: true }));
  return S.concat(cairnSites(L));
}
export function layRoad(ctx, put, L) { for (const k of Object.keys(built)) delete built[k]; tickRoad(ctx, put, L, true); }
let nextStream = 0;
export function tickRoad(ctx, put, L, force = false) {
  const players = ctx.place.players ?? [], now = ctx.now(), s = ctx.place.state;
  if (force || now >= nextStream) {
    nextStream = now + 3000;
    for (const site of allSites(L)) {
      let near = Infinity;
      for (const p of players) { const f = p.feetPosition; if (f) near = Math.min(near, Math.hypot(f.x - site.x, f.z - site.z)); }
      const have = !!built[site.id] || (!force && !!ctx.getObject(`l169-cp-${site.id}-m`) && site.id !== "house");
      if (near < R.streamIn && !built[site.id]) {
        const rows = site.big ? siteParts(site.id, L) : smallParts(site);
        built[site.id] = rows.map(([id, spec]) => { if (spec.primitive && !spec.visibleRange) spec.visibleRange = { max: 600 }; put(id, spec); return id; });
      } else if (near > R.streamOut && (built[site.id] || have)) {
        const ids = built[site.id] ?? (site.big ? siteParts(site.id, L) : smallParts(site)).map((r) => r[0]);
        for (const id of ids) if (ctx.getObject(id)) ctx.destroy(id);
        delete built[site.id];
      }
    }
  }
  // lockers restock hourly (residents keep them up)
  s.l169cp ??= {};
  const hourMs = HOUR_S(L) * 1000;
  for (const k of Object.keys(R.lockers)) {
    const row = s.l169cp[k], full = String(R.lockers[k]).split(",").filter(Boolean).length;
    if (!row) s.l169cp[k] = { boxes: full, at: Math.round(now) };
    else if (row.boxes < full && now - row.at > hourMs) s.l169cp[k] = { boxes: row.boxes + 1, at: Math.round(now) };
  }
  for (const p of players) {
    const ps = p.state, f = p.feetPosition; if (!ps || !f) continue;
    // discovery: standing at a site learns it
    for (const sid of ORDER) {
      const st = siteOf(sid, L); if (Math.hypot(f.x - st.x, f.z - st.z) > R.discover + (sid === "edge" ? 30 : 0)) continue;
      const cps = ps.l169cps ?? [];
      if (!cps.includes(sid)) { ps.l169cps = [...cps, sid]; if (sid !== "house") ps.notice = { text: `${st.name}. ${st.km} km from the well. The board here knows the way back.`, at: now }; }
    }
    // a guided leg ends: set down beside the next board
    const t = ps.l169trip;
    if (t && now >= (t.due ?? 0)) {
      const st = siteOf(t.to, L), x = st.x + R.arrive.dx, z = st.z + R.arrive.dz, y = (ctx.place.terrain?.heightAt?.(x, z) ?? 0) + 0.6;
      p.feetPosition = { x, y, z }; p.velocity = { x: 0, y: 0, z: 0 };
      const cps = ps.l169cps ?? []; if (!cps.includes(t.to)) ps.l169cps = [...cps, t.to];
      ps.l169trip = null;
      ps.notice = { text: `${t.km} km in the dark by the guide's notes. ${st.name}.`, at: now };
    }
    // the jump: past the rim and dropping
    const r = Math.hypot(f.x, f.z);
    if (!ps.l169fall && r > L.edge + 3) {
      const rim = ctx.place.terrain?.heightAt?.(f.x * (L.edge - 5) / r, f.z * (L.edge - 5) / r) ?? 20;
      if (f.y < rim - 12) ps.l169fall = { at: Math.round(now) };
    }
    if (ps.l169fall && now - ps.l169fall.at >= R.fallMs) {
      ps.l169fall = null; ps.l169jumped = true; ps.l169board = null; ps.l169read = null;
      ps.notice = { text: "You fall a long time. Then pavement, rain, and a city that goes on forever.", at: now };
      ctx.cross(p, "level11");
    }
  }
}
// ---- presses that travel.js hands over
export function takeLocker(ctx, p, sid, L) {
  const ps = p?.state, row = ctx.place.state.l169cp?.[sid]; if (!ps) return;
  if (!row || row.boxes <= 0) { ps.notice = { text: "Empty. Someone came through before you. It'll be restocked.", at: ctx.now() }; return; }
  ctx.place.state.l169cp = { ...ctx.place.state.l169cp, [sid]: { boxes: row.boxes - 1, at: row.at } };
  ps.hunger = Math.min(100, (ps.hunger ?? 100) + R.foodHunger);
  ps.notice = { text: `A tin of beans, warm from the day. Hunger +${R.foodHunger}. ${row.boxes - 1} left.`, at: ctx.now() };
}
export function sleepBed(ctx, p, L) {
  const ps = p?.state; if (!ps) return;
  ps.l169rest = Math.round(ctx.now()); // scripts/sun169.js reads the stamp and clears its sun and cold
  ps.notice = { text: "You sleep under a roof for the first time in days. The heat and the cold both leave you.", at: ctx.now() };
}
