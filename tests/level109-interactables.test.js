import { describe, test, expect, mock } from "bun:test";

mock.module("builtin/physics", () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => null,
}));

mock.module("builtin/vec3", () => ({
  rotate: ({ yaw = 0 } = {}, v = { x: 1, y: 0, z: 0 }) => {
    const r = (yaw * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
  },
}));

const noop = () => ({});
mock.module("builtin/three", () => ({
  MeshStandardNodeMaterial: class {},
}));
mock.module("builtin/tsl", () => ({
  materialColor: {}, positionGeometry: {}, positionWorld: {}, normalWorld: {}, cameraPosition: {},
  normalize: noop, dot: noop, pow: noop, saturate: noop, vec2: noop, vec3: noop, float: noop,
  abs: noop, fract: noop, floor: noop, sin: noop, mix: noop, smoothstep: noop, step: noop,
  max: noop, min: noop, mx_noise_float: noop, mx_fractal_noise_float: noop, mx_worley_noise_float: noop,
}));

const medGeo = await import("../scripts/l109-med-geo.js");
const { ears: useEars } = await import("../scripts/l109-use.js");
const { hospitalControl } = await import("../scripts/lib/l109-os.js");
const { controlOf, CTRL, canUseControl, filesOf } = await import("../scripts/lib/os.js");
const hazard = await import("../scripts/l109-hazard.js");
const { buildRoom } = await import("../scripts/lib/l109-rooms.js");
const { buildOutpost } = await import("../scripts/lib/l109-outpost.js");
const { buildB3 } = await import("../scripts/lib/l109-b3.js");
const { ears: b3Ears } = await import("../scripts/b3-use.js");
const { tick: simTick } = await import("../places/level109/sim.js");
const { describe: describeItem } = await import("../scripts/lib/items.js");
const PAGES = (await import("../scripts/lib/data/pages.yml")).default;

function skills(vals = {}) {
  const names = ["barter", "energy", "explosives", "guns", "lockpick", "medicine", "melee", "repair", "science", "sneak", "speech", "survival", "unarmed"];
  return names.map((n) => vals[n] ?? 0).join(",");
}

function makeCtx(seed = {}, now = 100000) {
  const objects = { ...seed };
  const emitted = [];
  let t = now;
  const place = { objects, players: [], state: {} };
  const ctx = {
    place,
    now: () => t,
    advance: (ms) => { t += ms; },
    random: () => 0.25,
    sleep: () => ({ slept: true }),
    getObject: (id) => objects[id] ?? null,
    spawn: (id, spec) => { objects[id] = { id, ...spec }; return id; },
    destroy: (id) => { delete objects[id]; },
    log: () => {},
    emit: (kind, data, opts) => { emitted.push({ kind, data, opts }); },
    query: ({ center, radius, tags, anyTags } = {}) => Object.values(objects).filter((o) => {
      if (tags?.length && !tags.every((tg) => o.tags?.includes(tg))) return false;
      if (anyTags?.length && !anyTags.some((tg) => o.tags?.includes(tg))) return false;
      const p = o.worldFeetPosition ?? o.feetPosition;
      if (!center || radius == null) return true;
      if (!p) return false;
      return Math.hypot(p.x - center.x, (p.z ?? 0) - (center.z ?? 0)) <= radius;
    }),
    emitted,
  };
  let currentSelf;
  Object.defineProperty(ctx, "self", { get: () => currentSelf, set: (o) => { currentSelf = o; if (o && !o.session) o.session = {}; } });
  return ctx;
}

function makeGeoCollector(params) {
  const tris = [];
  const noopM = () => {};
  return {
    params,
    tris,
    smooth: noopM, flat: noopM, color: noopM, metalness: noopM, roughness: noopM, emissive: noopM,
    tri: (...a) => tris.push(a),
    quad: (...a) => tris.push(a),
  };
}

describe("Level 109 enrichment & interactables", () => {
  test("procedural med-geo supports all 8 new hardware parts and cooler collider", () => {
    for (const part of ["intercom", "breaker", "alarm", "decon", "tube", "cooler", "aed", "terminal"]) {
      const col = makeGeoCollector({ part, on: true, tripped: false, purged: false, ready: true });
      medGeo.geometry(col);
      expect(col.tris.length).toBeGreaterThan(0);
    }
    expect(medGeo.collider({ params: { part: "cooler" } })).toEqual({ kind: "box", width: 0.38, height: 1.32, depth: 0.38, center: [0, 0.66, 0] });
  });

  test("pages 101-104 exist and describe formats them cleanly", () => {
    for (const n of [101, 102, 103, 104]) {
      expect(typeof PAGES[n]).toBe("string");
      expect(PAGES[n].length).toBeGreaterThan(20);
      expect(describeItem(`page:${n}`).name).toContain("Neon Hospital record");
    }
  });

  test("intercom, breaker, and alarm handle state, skills, cooldowns, and payOnce XP", () => {
    const ctx = makeCtx({
      p1: { id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: { skl: skills({ repair: 20 }), attr: "5,5,5,5,5,5,5", xp: 0 }, session: {} },
      "l109s-ns0_2-l-4": { id: "l109s-ns0_2-l-4", material: {}, light: null },
      "l109s-ns0_2-l4": { id: "l109s-ns0_2-l4", material: {}, light: null },
    });

    // Intercom logs PA once with XP, cycles dispatches on repeat
    ctx.self = { id: "icm", feetPosition: { x: 1, y: 1.3, z: 0 }, state: { kind: "intercom", idx: 0 } };
    useEars.press(ctx, { by: "p1" });
    expect(ctx.getObject("p1").state.sub.who).toBe("HOSPITAL INTERCOM");
    expect(ctx.getObject("p1").state.payout?.xp).toBe(20);
    ctx.getObject("p1").state.payout = null;
    useEars.press(ctx, { by: "p1" });
    expect(ctx.getObject("p1").state.payout).toBeNull();

    // Tripped breaker denies low skill, repairs at Repair 20, then toggles l109Dark cleanly
    const lowPlayer = { id: "pLow", feetPosition: { x: 0, y: 0, z: 0 }, state: { skl: skills(), attr: "5,5,5,5,5,5,5" }, session: {} };
    ctx.place.objects.pLow = lowPlayer;
    ctx.self = { id: "brk", feetPosition: { x: 1, y: 1.3, z: 0 }, primitive: { kind: "scripted", params: { part: "breaker", on: false, tripped: true } }, state: { kind: "breaker", seg: "ns0_2", tripped: true } };
    useEars.press(ctx, { by: "pLow" });
    expect(ctx.self.state.repaired).toBeUndefined();
    useEars.press(ctx, { by: "p1" });
    expect(ctx.self.state.repaired).toBe(true);
    expect(ctx.getObject("l109s-ns0_2-l-4").light).toBeTruthy();
    expect(ctx.getObject("p1").state.payout?.xp).toBe(25);
    useEars.press(ctx, { by: "p1" });
    expect(ctx.place.state.l109Dark.ns0_2).toBe(1);
    expect(ctx.getObject("l109s-ns0_2-l-4").light).toBeNull();

    // Alarm emits noise radius 34 and enforces 15s cooldown
    ctx.self = { id: "alm", feetPosition: { x: 2, y: 1.3, z: 0 }, state: { kind: "alarm" } };
    const before = ctx.emitted.filter((e) => e.kind === "noise" && e.data.kind === "alarm").length;
    useEars.press(ctx, { by: "p1" });
    useEars.press(ctx, { by: "p1" });
    expect(ctx.emitted.filter((e) => e.kind === "noise" && e.data.kind === "alarm").length - before).toBe(1);
    ctx.advance(15000);
    useEars.press(ctx, { by: "p1" });
    expect(ctx.emitted.filter((e) => e.kind === "noise" && e.data.kind === "alarm").length - before).toBe(2);
  });

  test("decon switch purges biohazard room and stops l109-hazard sanity drain", () => {
    const ctx = makeCtx({
      p1: { id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: { sanity: 50, skl: skills(), attr: "5,5,5,5,5,5,5" }, session: {} },
      "l109o-bio1-hz": { id: "l109o-bio1-hz", feetPosition: { x: 0, y: 2.5, z: 0 }, state: { roomId: "bio1", box: { x0: -6, x1: 6, z0: -6, z1: 6 } }, session: {}, light: { kind: "point", color: "#55cc66" } },
    });
    ctx.place.players.push(ctx.place.objects.p1);

    // Before purge: hazard drains sanity
    ctx.self = ctx.place.objects["l109o-bio1-hz"];
    hazard.update(ctx);
    expect(ctx.getObject("p1").state.sanity).toBeLessThan(50);

    // Press decon switch
    ctx.self = { id: "dec", feetPosition: { x: 0, y: 1.3, z: 5 }, primitive: { kind: "scripted", params: { part: "decon", purged: false } }, state: { kind: "decon", roomId: "bio1" } };
    useEars.press(ctx, { by: "p1" });
    expect(ctx.place.state.l109Purged.bio1).toBe(1);
    expect(ctx.getObject("l109o-bio1-hz").state.purged).toBe(true);
    expect(ctx.getObject("p1").state.payout?.xp).toBe(35);

    // Hazard tick now sleeps without draining sanity
    const sanAfterPurge = ctx.getObject("p1").state.sanity;
    ctx.self = ctx.place.objects["l109o-bio1-hz"];
    const res = hazard.update(ctx);
    expect(res).toEqual({ slept: true });
    expect(ctx.getObject("p1").state.sanity).toBe(sanAfterPurge);
  });

  test("department interactables: supply terminal unlocks cages, outpost terminal prints page 101, tube & shutter work", () => {
    const ctx = makeCtx({
      p1: { id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: { skl: skills({ science: 25, lockpick: 35, repair: 25 }), attr: "5,5,5,5,5,5,5", pages: "" }, session: {} },
      "l109o-sup1-c1": { id: "l109o-sup1-c1", tags: ["container"], feetPosition: { x: 2, y: 0, z: 2 }, state: { lock: "lockpick:40" } },
    });

    const player = ctx.getObject("p1"); player.place = "level109";
    ctx.self = ctx.place.objects.termSup = { id: "termSup", feetPosition: { x: 0, y: 0, z: 0 }, state: { kind: "terminal", mode: "supply", roomId: "sup1" } };
    useEars.press(ctx, { by: "p1" });
    expect(player.state.os.app).toBe("boot");
    expect(controlOf(player.state.os.host)).toBe("l109stock");
    expect(filesOf(player.state.os.host).some(f => f.name === "stock_manifest.txt")).toBe(true);
    ctx.self = player;
    expect(canUseControl(player.state, player.state.os, CTRL.l109stock.rows[0])).toBe(true);
    expect(hospitalControl(ctx, player.state, "l109stock", "release")).toBe(true);
    expect(ctx.getObject("l109o-sup1-c1").state.lock).toBe("");
    expect(ctx.place.state.l109StockUnlocked.sup1).toBe(true);
    player.state.os = null;

    ctx.self = ctx.place.objects.termOut = { id: "termOut", feetPosition: { x: 0, y: 0, z: 0 }, state: { kind: "terminal", mode: "outpost" } };
    useEars.press(ctx, { by: "p1" });
    expect(controlOf(player.state.os.host)).toBe("l109triage");
    ctx.self = player; hospitalControl(ctx, player.state, "l109triage", "print");
    hospitalControl(ctx, player.state, "l109triage", "print");
    expect(player.state.payout?.items.filter(x => x === "page:101")).toHaveLength(1);
    player.state.os = null;
    ctx.self = ctx.place.objects.termWard = { id: "termWard", feetPosition: { x: 0, y: 0, z: 0 }, state: { kind: "terminal", mode: "wardlog", roomId: "ward1" } };
    useEars.press(ctx, { by: "p1" });
    expect(controlOf(player.state.os.host)).toBe("l109ward");
    ctx.self = player; hospitalControl(ctx, player.state, "l109ward", "print");
    expect(player.state.payout.items).toContain("page:103");
    player.state.os = null;

    ctx.self = { id: "sh1", feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", params: { part: "shutter", open: 0.12 } }, state: { kind: "shutter", lock: "lockpick:35" } };
    useEars.press(ctx, { by: "p1" });
    expect(ctx.self.state.lock).toBe("");
    expect(ctx.self.primitive.params.open).toBe(0.85);

    ctx.self = { id: "tub1", feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", params: { part: "tube", ready: true } }, state: { kind: "tube" } };
    useEars.press(ctx, { by: "p1" });
    expect(ctx.getObject("p1").state.payout?.items).toContain("page:104");
    expect(ctx.getObject("p1").state.payout?.xp).toBe(25);
  });

  test("rooms, outpost, B3, and sim laySeg spawn expected unique interactables", () => {
    const p1 = { id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: {} };
    const ctx = makeCtx({ p1 });
    ctx.place.state.l109seed = 42;
    ctx.place.players.push(p1);
    const makeR = (id, type) => ({
      id, type, seed: 7, abandoned: false, yawIn: 0, yawAlong: 90,
      info: { id, type, c: { ax: "ns", i: 0, c: 0 }, r: 1, side: 1, door: { x: 2, z: 10 }, box: { x0: 2, x1: 32, z0: 10, z1: 40 } },
      at: (a, b, up = 0) => ({ x: 17 + a, y: up, z: 10 + b }),
      sp: (key, spec) => ctx.spawn(`l109o-${id}-${key}`, spec),
    });

    // Rooms spawn department interactables
    for (const kind of ["supply", "or", "icu", "pharmacy", "biohazard", "ward"]) {
      buildRoom(ctx, makeR(`r_${kind}`, kind));
    }
    const ids = Object.keys(ctx.place.objects);
    expect(ids.some((i) => i.startsWith("l109o-r_supply-") && ctx.place.objects[i].state?.mode === "supply")).toBe(true);
    expect(ids.some((i) => i.startsWith("l109o-r_biohazard-") && ctx.place.objects[i].state?.kind === "decon")).toBe(true);
    expect(ids.some((i) => i.startsWith("l109o-r_pharmacy-") && ctx.place.objects[i].state?.kind === "tube")).toBe(true);
    expect(ids.some((i) => i.startsWith("l109o-r_ward-") && ctx.place.objects[i].state?.mode === "wardlog")).toBe(true);

    // Outpost spawns doctors/or_active/icu_active kits
    buildOutpost(ctx, makeR("op_doc", "doctors"));
    expect(ctx.getObject("l109o-op_doc-term0")?.state?.mode).toBe("outpost");
    expect(ctx.getObject("l109o-op_doc-aed0")?.state?.kind).toBe("aed");
    expect(ctx.getObject("l109o-op_doc-board")?.state?.kind).toBe("board");

    // Sub-level B3 spawns searchable morgue drawer + armory floodlight breaker
    buildB3(ctx, 42);
    const dr = ctx.getObject("b3-dr1_2");
    expect(dr?.tags).toContain("container");
    expect(dr?.state?.items).toContain("page:102");
    const brk = ctx.getObject("b3-breaker");
    expect(brk?.tags).toContain("usable");
    ctx.self = brk;
    b3Ears.press(ctx, { by: "p1" });
    expect(brk.state.on).toBe(true);
    expect(ctx.getObject("b3-at-3_33").light).toBeTruthy();

    // Level 109 corridor streamer spawns fixtures & respects l109Dark
    simTick(ctx);
    const segIds = Object.keys(ctx.place.objects).filter((k) => k.startsWith("l109s-"));
    expect(segIds.some((k) => k.endsWith("-sign"))).toBe(true);
    expect(segIds.some((k) => k.endsWith("-brk"))).toBe(true);
    expect(segIds.some((k) => k.endsWith("-icm"))).toBe(true);
  });
});
