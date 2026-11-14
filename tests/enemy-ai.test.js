import { test, expect, mock } from "bun:test";

mock.module("builtin/physics", () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => null,
}));

mock.module("builtin/tween", () => ({
  animate: () => {},
}));

mock.module("builtin/three", () => ({
  MeshStandardNodeMaterial: class {},
}));

mock.module("builtin/tsl", () => {
  const fn = () => ({});
  return {
    materialColor: {}, positionGeometry: {}, positionWorld: {}, normalWorld: {}, cameraPosition: {},
    normalize: fn, dot: fn, pow: fn, saturate: fn, vec2: fn, vec3: fn, float: fn,
    abs: fn, fract: fn, floor: fn, sin: fn, mix: fn, smoothstep: fn, step: fn,
    max: fn, min: fn, mx_noise_float: fn, mx_fractal_noise_float: fn, mx_worley_noise_float: fn,
  };
});

const { update: updateHounds } = await import("../scripts/hounds.js");
const { update: updateSmilers } = await import("../scripts/smilers.js");
const { update: updateLurkers } = await import("../scripts/lurkers.js");
const { update: updateL6Smiler } = await import("../scripts/l6-smiler.js");
const { update: updatePartygoers } = await import("../scripts/partygoers.js");
const { update: updateBayBrain } = await import("../scripts/bay-brain.js");
const { update: updateStealers } = await import("../scripts/stealers.js");
const { update: updateDeathmoths } = await import("../scripts/deathmoths.js");
const { knocked, deathRag } = await import("../scripts/lib/knock.js");

function makeCtx({ self, objects = {}, players = [], now = 10000, gravity, place = "level6" } = {}) {
  const sleepCalls = [];
  const queryCalls = [];
  const destroyed = [];
  const emitted = [];
  const ctx = {
    self: { session: {}, tags: [], feetPosition: { x: 0, y: 0, z: 0 }, ...self },
    place: {
      name: place,
      seed: 1,
      state: {},
      players,
      objects,
      ...(gravity !== undefined ? { gravity } : {}),
    },
    now: () => now,
    random: () => 0.5,
    sleep: (s) => sleepCalls.push(s),
    emit: (ev, data) => emitted.push({ ev, data }),
    destroy: (id) => {
      destroyed.push(id);
      delete objects[id];
    },
    spawn: () => ({ id: "spawned" }),
    getObject: (id) => objects[id] ?? null,
    query: (q) => {
      queryCalls.push(q);
      const wantTags = q?.tags ?? [];
      return Object.values(objects).filter((o) => wantTags.every((t) => o.tags?.includes(t)));
    },
    _setNow: (v) => { now = v; },
    _sleepCalls: sleepCalls,
    _queryCalls: queryCalls,
    _destroyed: destroyed,
    _emitted: emitted,
  };
  return ctx;
}

test("hounds dedicated pack manager never sleeps when its ID sorts after hound IDs", () => {
  for (const mgrId of ["l6-hound-mgr", "z-random-mgr-99"]) {
    const hound = {
      id: "l6-hound-1",
      tags: ["hound", "l8-hostile"],
      feetPosition: { x: 6, y: 0, z: 6 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      anim: {},
      state: { hp: 80, home: { x: 6, y: 0, z: 6 } },
    };
    const player = {
      id: "p1",
      feetPosition: { x: 10, y: 0, z: 6 },
      velocity: { x: 0, y: 0, z: 0 },
      state: { hp: 100 },
    };
    const objects = { [hound.id]: hound };
    const ctx = makeCtx({
      self: { id: mgrId, behavior: "scripts/hounds.js", place: "level6", tags: [] },
      objects,
      players: [player],
      place: "level6",
      gravity: { y: -9.8 },
    });

    updateHounds(ctx, 0.05);

    expect(ctx._sleepCalls).toEqual([]);
    expect(Math.hypot(hound.velocity.x, hound.velocity.z)).toBeGreaterThan(0);
  }
});

test("peer hounds running hounds.js defer only to lower-ID peer running hounds.js", () => {
  const h1 = {
    id: "hound-a",
    behavior: "scripts/hounds.js",
    tags: ["hound"],
    feetPosition: { x: 20, y: 0, z: 20 },
    velocity: { x: 0, y: 0, z: 0 },
    anim: {},
    state: { hp: 80 },
  };
  const h2 = {
    id: "hound-b",
    behavior: "scripts/hounds.js",
    tags: ["hound"],
    feetPosition: { x: 24, y: 0, z: 20 },
    velocity: { x: 0, y: 0, z: 0 },
    anim: {},
    state: { hp: 80 },
  };
  const player = { id: "p1", feetPosition: { x: 20, y: 0, z: 24 }, velocity: { x: 0, y: 0, z: 0 }, state: { hp: 100 } };
  const objects = { [h1.id]: h1, [h2.id]: h2 };
  const ctxB = makeCtx({ self: h2, objects, players: [player], place: "level1", gravity: { y: -9.8 } });
  updateHounds(ctxB, 0.05);
  expect(ctxB._sleepCalls).toEqual([1]);

  const ctxA = makeCtx({ self: h1, objects, players: [player], place: "level1", gravity: { y: -9.8 } });
  updateHounds(ctxA, 0.05);
  expect(ctxA._sleepCalls).toEqual([]);
});

test("hounds manager handles undefined velocity during maul and prunes destroyed census entries", () => {
  const h1 = {
    id: "l6-hound-1",
    tags: ["hound"],
    feetPosition: { x: 6, y: 0, z: 6 },
    velocity: undefined,
    anim: {},
    state: { hp: 80 },
  };
  const hGone = {
    id: "l6-hound-2",
    tags: ["hound"],
    feetPosition: { x: 8, y: 0, z: 6 },
    anim: {},
    state: { hp: 80 },
  };
  const player = { id: "p1", feetPosition: { x: 20, y: 0, z: 20 }, velocity: { x: 0, y: 0, z: 0 }, state: { hp: 100 } };
  const objects = { [h1.id]: h1, [hGone.id]: hGone };
  const ctx = makeCtx({
    self: { id: "l6-hound-mgr", behavior: "scripts/hounds.js", place: "level6", session: {} },
    objects,
    players: [player],
    place: "level6",
    now: 5000,
    gravity: { y: -9.8 },
  });

  updateHounds(ctx, 0.05);
  h1.velocity = undefined;
  ctx.self.session.m[h1.id].maulUntil = 9000;
  delete objects[hGone.id];
  ctx._setNow(5100);

  expect(() => updateHounds(ctx, 0.05)).not.toThrow();
  expect(h1.velocity.x).toBe(0);
  expect(h1.velocity.z).toBe(0);
  expect(ctx.self.session.m[hGone.id]).toBeUndefined();
});

test("world-wide enemy managers pass explicit full-place query bounds", () => {
  const player = { id: "p1", feetPosition: { x: 10, y: 0, z: 10 }, velocity: { x: 0, y: 0, z: 0 }, state: { hp: 100 } };
  const ctxSmilers = makeCtx({ self: { id: "smiler-mgr" }, players: [player], place: "main" });
  updateSmilers(ctxSmilers, 0.05);
  expect(ctxSmilers._queryCalls.some((q) => q.tags?.includes("smiler") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);

  const ctxLurkers = makeCtx({ self: { id: "lurker-mgr" }, players: [player], place: "main" });
  updateLurkers(ctxLurkers, 0.05);
  expect(ctxLurkers._queryCalls.some((q) => q.tags?.includes("lurker") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);

  const ctxL6 = makeCtx({ self: { id: "l6-smiler-mgr" }, players: [player], place: "level6" });
  updateL6Smiler(ctxL6, 0.05);
  expect(ctxL6._queryCalls.some((q) => q.tags?.includes("l6-smiler") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);

  const ctxParty = makeCtx({ self: { id: "l26-pack" }, players: [player], place: "level26" });
  updatePartygoers(ctxParty, 0.05);
  expect(ctxParty._queryCalls.some((q) => q.tags?.includes("partygoer") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);
  expect(ctxParty._queryCalls.some((q) => q.tags?.includes("l26-balloon") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);

  const ctxBay = makeCtx({ self: { id: "bay-mgr" }, players: [player], place: "main" });
  updateBayBrain(ctxBay, 0.05);
  expect(ctxBay._queryCalls.some((q) => q.tags?.includes("baybrain") && q.radius >= 1e5 && q.center?.x === 0 && q.center?.z === 0)).toBe(true);
});

test("smilers and lurkers handle missing gravity and hp <= 0 without dead flag", () => {
  const player = { id: "p1", feetPosition: { x: 10, y: 0, z: 10 }, velocity: { x: 0, y: 0, z: 0 }, state: { hp: 100 } };
  const smiler = {
    id: "s1",
    tags: ["smiler"],
    feetPosition: { x: 20, y: 0, z: 20 },
    velocity: undefined,
    anim: {},
    state: { hp: 0, dead: false },
  };
  const lurker = {
    id: "l1",
    tags: ["lurker"],
    feetPosition: { x: 24, y: 0, z: 20 },
    velocity: undefined,
    anim: {},
    state: { hp: 0, dead: false },
  };
  const objects = { s1: smiler, l1: lurker };
  const ctxS = makeCtx({ self: { id: "smiler-mgr" }, objects, players: [player], place: "main" });
  const ctxL = makeCtx({ self: { id: "lurker-mgr" }, objects, players: [player], place: "main" });

  expect(() => updateSmilers(ctxS, 0.05)).not.toThrow();
  expect(smiler.state.dead).toBe(true);

  expect(() => updateLurkers(ctxL, 0.05)).not.toThrow();
  expect(lurker.state.dead).toBe(true);
});

test("partygoers and bay-brain survive undefined velocity and empty player list while hunting", () => {
  const downPlayer = { id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: { hp: 0, downAt: 9999 } };
  const pg1 = {
    id: "pg-1",
    tags: ["partygoer"],
    feetPosition: { x: 5, y: 0, z: 5 },
    velocity: undefined,
    anim: {},
    state: { hp: 200, hunting: true, home: { x: 5, y: 0, z: 5 } },
  };
  const pg2 = {
    id: "pg-2",
    tags: ["partygoer"],
    feetPosition: { x: 8, y: 0, z: 5 },
    velocity: undefined,
    anim: {},
    state: { hp: 0 },
  };
  const ctxPg = makeCtx({ self: { id: "l26-pack" }, objects: { "pg-1": pg1, "pg-2": pg2 }, players: [downPlayer], place: "level26" });
  expect(() => updatePartygoers(ctxPg, 0.05)).not.toThrow();
  expect(pg2.state.dying).toBeGreaterThan(0);

  const bay1 = {
    id: "bb-1",
    tags: ["baybrain"],
    feetPosition: { x: 30, y: 0, z: -10 },
    velocity: undefined,
    anim: {},
    state: { hp: 50, brain: { fly: false, speed: 3, reach: 1.5 } },
  };
  const bayDead = {
    id: "bb-2",
    tags: ["baybrain"],
    feetPosition: { x: 32, y: 0, z: -10 },
    velocity: undefined,
    anim: {},
    state: { hp: 0, brain: { fly: false, speed: 3, reach: 1.5 } },
  };
  const ctxBay = makeCtx({ self: { id: "bay-mgr" }, objects: { "bb-1": bay1, "bb-2": bayDead }, players: [], place: "main" });
  expect(() => updateBayBrain(ctxBay, 0.05)).not.toThrow();
});

test("stealers and deathmoths prune destroyed entries from cached census before stepping", () => {
  const player = { id: "p1", feetPosition: { x: 40, y: 0, z: 40 }, velocity: { x: 0, y: 0, z: 0 }, state: { hp: 100 } };
  const st1 = {
    id: "st-1",
    tags: ["stealer"],
    feetPosition: { x: 10, y: 0, z: 10 },
    velocity: { x: 0, y: 0, z: 0 },
    anim: {},
    state: { hp: 100 },
  };
  const stGone = {
    id: "st-2",
    tags: ["stealer"],
    feetPosition: { x: 11, y: 0, z: 10 },
    velocity: { x: 0, y: 0, z: 0 },
    anim: {},
    state: { hp: 100, down: { x: 1, z: 0, ms: 500, at: 10000 } },
  };
  const stObjs = { "st-1": st1, "st-2": stGone };
  const ctxSt = makeCtx({ self: { id: "stealer-mgr" }, objects: stObjs, players: [player], place: "level1", now: 10000 });
  updateStealers(ctxSt, 0.05);
  delete stObjs["st-2"];
  ctxSt._setNow(10050);
  expect(() => updateStealers(ctxSt, 0.05)).not.toThrow();
  expect(ctxSt.self.session.m["st-2"]).toBeUndefined();

  const dm1 = {
    id: "dm-1",
    tags: ["moths"],
    feetPosition: { x: 10, y: 1, z: 10 },
    anim: {},
    state: { hp: 50, home: { x: 10, y: 0, z: 10 } },
  };
  const dmGone = {
    id: "dm-2",
    tags: ["moths"],
    feetPosition: { x: 11, y: 1, z: 10 },
    anim: {},
    state: { hp: 50, home: { x: 11, y: 0, z: 10 } },
  };
  const dmObjs = { "dm-1": dm1, "dm-2": dmGone };
  const ctxDm = makeCtx({ self: { id: "moth-mgr" }, objects: dmObjs, players: [player], place: "level3", now: 10000 });
  updateDeathmoths(ctxDm, 0.05);
  delete dmObjs["dm-2"];
  ctxDm._setNow(10050);
  expect(() => updateDeathmoths(ctxDm, 0.05)).not.toThrow();
  expect(ctxDm.self.session.m["dm-2"]).toBeUndefined();
});

test("knocked recovers cleanly from missing or NaN knockdown timers and deathRag handles missing anim", () => {
  const ctx = makeCtx({ gravity: { y: -9.8 } });
  const e1 = { id: "e1", feetPosition: { x: 0, y: 0, z: 0 }, state: { hp: 50, down: { x: 1, z: 0, ms: 500 } } };
  expect(knocked(ctx, e1, 5000, 0.05)).toBe(false);
  expect(e1.state.down).toBeNull();

  const e2 = { id: "e2", feetPosition: { x: 0, y: 0, z: 0 }, state: { hp: 50, down: { x: 1, z: 0, at: 1000, ms: Number.NaN, rag: 1, kg: 70 } } };
  expect(knocked(ctx, e2, 5000, 0.05)).toBe(false);
  expect(e2.state.down).toBeNull();

  const e3 = { id: "e3", feetPosition: { x: 0, y: 0, z: 0 }, state: { hp: 50, kb: { x: 1, z: 0, ms: 300 } } };
  expect(knocked(ctx, e3, 5000, 0.05)).toBe(false);
  expect(e3.state.kb).toBeNull();

  const e4 = { id: "e4", state: { kg: 80 } };
  expect(() => deathRag(e4)).not.toThrow();
  expect(e4.ragdoll).toBeTruthy();
});
