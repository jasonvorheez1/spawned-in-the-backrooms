import { describe, test, expect, mock } from "bun:test";
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [], traverseCheck: () => null }));
mock.module("builtin/vec3", () => ({ rotate: () => ({ x: 1, y: 0, z: 0 }) }));
mock.module("builtin/three", () => ({ MeshStandardNodeMaterial: class {} }));
const noop = () => ({});
mock.module("builtin/tsl", () => ({ materialColor: {}, positionGeometry: {}, positionWorld: {}, normalWorld: {}, cameraPosition: {}, normalize: noop, dot: noop, pow: noop, saturate: noop, vec2: noop, vec3: noop, float: noop, abs: noop, fract: noop, floor: noop, sin: noop, mix: noop, smoothstep: noop, step: noop, max: noop, min: noop, mx_noise_float: noop, mx_fractal_noise_float: noop, mx_worley_noise_float: noop }));
mock.module("builtin/tween", () => ({ animate: () => {} }));
mock.module("builtin/nav", () => ({}));
const { buildOutpost } = await import("../scripts/lib/l109-outpost.js");
const { outpostLife } = await import("../scripts/lib/l109-life.js");

function world() {
  let t = 0; const objects = {}, player = { id: "p1", feetPosition: { x: 0, y: 0, z: 10 }, state: {} };
  const ctx = {
    now: () => t, tick: (ms) => { t += ms; }, random: () => 0.5, log: () => {}, emit: () => {}, session: {},
    place: { state: {}, objects, players: [player], gravity: { y: -24 } },
    spawn: (id, spec) => { objects[id] = { id, ...spec, state: { ...(spec.state ?? {}) }, feetPosition: { ...(spec.feetPosition ?? { x: 0, y: 0, z: 0 }) } }; return id; },
    destroy: (id) => { delete objects[id]; }, getObject: (id) => objects[id],
    query: ({ anyTags, radius, center } = {}) => Object.values(objects).filter((o) => (!anyTags || anyTags.some((g) => o.tags?.includes(g))) && (!radius || Math.hypot(o.feetPosition.x - center.x, o.feetPosition.z - center.z) < radius)),
  };
  const R = { id: "ew0_13m", type: "doctors", info: { box: { x0: -15, x1: 15, z0: 0, z1: 30 } }, yawIn: 0, yawAlong: 90, sp: (k, spec) => ctx.spawn(`l109o-ew0_13m-${k}`, spec), at: (a, b, up = 0) => ({ x: a, y: up, z: b }) };
  buildOutpost(ctx, R);
  return { ctx, objects, player };
}
const walkTo = (o) => { const s = o.state.rounds[o.state.ri ?? 0]; o.feetPosition = { x: s.x, y: 0, z: s.z }; };

describe("Level 109 outpost life", () => {
  test("staff carry real rounds and alert posts", () => {
    const { objects } = world();
    for (const k of ["halloran", "petra", "doc1", "doc2", "guard0", "guard1", "guard2"]) {
      const o = objects[`l109o-ew0_13m-${k}`];
      expect(o.state.rounds.length).toBeGreaterThan(1);
      expect(o.state.alertRounds.length).toBe(1);
    }
  });
  test("triage scene: crash, fetch, treat, stable", () => {
    const { ctx, objects } = world(), osei = objects["l109o-ew0_13m-doc1"], petra = objects["l109o-ew0_13m-petra"], mon = objects["l109o-ew0_13m-mon1"];
    outpostLife(ctx); ctx.tick(30000); outpostLife(ctx);
    expect(mon.state.info).toContain("ALARM"); expect(objects["l109care-alarm"]).toBeTruthy();
    expect(objects["l109o-ew0_13m-bed2pt"].state.dlg).toBe("l109-triage");
    walkTo(petra); ctx.tick(500); outpostLife(ctx); ctx.tick(3500); outpostLife(ctx); // at the cage, then the kit
    walkTo(petra); ctx.tick(500); outpostLife(ctx); // back at the bed
    ctx.tick(13000); outpostLife(ctx);
    expect(mon.state.info).toBe("steady sinus"); expect(objects["l109care-alarm"]).toBeUndefined();
    expect(osei.state.rounds).toBe(osei.state.dayRounds);
  });
  test("a loose thing near the door puts the outpost on alert, and quiet ends it", () => {
    const { ctx, objects } = world(), lam = objects["l109o-ew0_13m-guard1"];
    ctx.spawn("foe", { tags: ["pen-foe"], feetPosition: { x: -10, y: 0, z: -1.5 }, state: { pen: null, hp: 50 } });
    ctx.tick(1000); outpostLife(ctx);
    expect(lam.state.rounds).toBe(lam.state.alertRounds);
    ctx.destroy("foe"); ctx.tick(16000); outpostLife(ctx);
    expect(lam.state.rounds).toBe(lam.state.dayRounds);
  });
  test("a door opened down the hall sends Lam to look", () => {
    const { ctx, objects } = world(), lam = objects["l109o-ew0_13m-guard1"];
    ctx.place.players[0].state.talkWith = "x"; // keep the triage scene from starting
    outpostLife(ctx);
    ctx.place.state.pdoors = { ew0_11m: 1 }; ctx.place.state.pdoorAt = { ew0_11m: { x: -50, z: -1.4 } };
    ctx.tick(500); outpostLife(ctx);
    expect(lam.state.rounds.length).toBe(1); expect(lam.state.line.t).toContain("i'll look");
  });
});
