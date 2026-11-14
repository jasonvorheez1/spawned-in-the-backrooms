import { test, expect } from "bun:test";
import L from "../scripts/lib/data/level169.yml";
import R from "../scripts/lib/data/l169-road.yml";
import { legsFrom, go, layRoad, tickRoad, siteOf, takeLocker, sleepBed, ORDER } from "../scripts/lib/l169-road.js";
function world(hour) {
  let t = 1e6; const objs = {}, crossed = [];
  const ctx = { now: () => t, place: { atmosphere: { timeOfDay: hour }, state: {}, players: [], terrain: { heightAt: (x, z) => (Math.hypot(x, z) > L.edge ? -200 : 0) } },
    getObject: (id) => objs[id] ?? null, destroy: (id) => { delete objs[id]; }, cross: (p, to) => { crossed.push(to); return { crossed: "departing" }; }, emit() {}, spawn() { return "x"; } };
  const put = (id, spec) => { objs[id] = spec; };
  return { ctx, put, objs, crossed, step: (ms) => { t += ms; } };
}
const player = (x, z, st = {}) => ({ id: "p1", feetPosition: { x, y: 0, z }, velocity: {}, state: { hunger: 100, almonds: 0, l169cold: 0, l169cps: ["house"], ...st } });
test("day refuses, night without bottles refuses, night with bottles walks to A", () => {
  const w = world(10), h = siteOf("house", L), p = player(h.x, h.z); w.ctx.place.players = [p];
  expect(legsFrom(w.ctx, p.state, "house", L).find((q) => q.to === "a").why).toMatch(/Daylight/);
  w.ctx.place.atmosphere.timeOfDay = 21;
  const a = legsFrom(w.ctx, p.state, "house", L).find((q) => q.to === "a");
  expect(a.why).toMatch(/cold bottle/);
  go(w.ctx, p, "house", "a", L); expect(p.state.l169trip ?? null).toBe(null);
  p.state.almonds = a.bottles + 1; p.state.l169cold = a.bottles + 1;
  expect(legsFrom(w.ctx, p.state, "house", L).find((q) => q.to === "a").why).toBe("");
  go(w.ctx, p, "house", "a", L); expect(p.state.l169trip.to).toBe("a"); expect(p.state.l169cold).toBe(1); expect(p.state.almonds).toBe(1);
  w.step(R.tripMs + 10); tickRoad(w.ctx, w.put, L);
  const A = siteOf("a", L); expect(Math.hypot(p.feetPosition.x - A.x, p.feetPosition.z - A.z)).toBeLessThan(15);
  expect(p.state.l169cps).toContain("a"); expect(p.state.l169trip).toBe(null);
  console.log("legs from house", JSON.stringify(legsFrom(w.ctx, { ...p.state, l169cold: 9 }, "house", L)));
});
test("walking 800 m up the track streams cairns in and out", () => {
  const w = world(21), p = player(0, L.house.center.z); w.ctx.place.players = [p]; layRoad(w.ctx, w.put, L);
  const before = Object.keys(w.objs).filter((k) => /^l169-cp-k\d+-m$/.test(k)).sort();
  for (let d = 0; d <= 800; d += 50) { p.feetPosition.z = L.house.center.z - d; w.step(3100); tickRoad(w.ctx, w.put, L); }
  const after = Object.keys(w.objs).filter((k) => /^l169-cp-k\d+-m$/.test(k)).sort();
  console.log("cairns before", before.join(","), "after", after.join(","));
  expect(after.length).toBeGreaterThan(0); expect(after.join()).not.toBe(before.join());
});
test("B, B½ bed, C stand with boards, lockers and bed", () => {
  for (const sid of ["a", "b", "bh", "c", "edge"]) {
    const w = world(21), s = siteOf(sid, L), p = player(s.x, s.z); w.ctx.place.players = [p]; layRoad(w.ctx, w.put, L);
    expect(w.objs[`l169-cp-${sid}-board`]).toBeTruthy();
    expect(p.state.l169cps).toContain(sid);
    if (sid !== "edge") { takeLocker(w.ctx, p, sid, L); expect(p.state.notice.text).toMatch(/Hunger|Empty/); }
    if (sid === "bh") { expect(w.objs["l169-cp-bh-bed"]).toBeTruthy(); sleepBed(w.ctx, p, L); expect(p.state.l169rest).toBeGreaterThan(0); }
  }
});
test("jumping the north edge wakes in level11 with a key", () => {
  const w = world(21), p = player(0, -(L.edge + 10)); p.feetPosition.y = -40; w.ctx.place.players = [p];
  tickRoad(w.ctx, w.put, L); expect(p.state.l169fall).toBeTruthy();
  w.step(R.fallMs + 10); tickRoad(w.ctx, w.put, L);
  expect(w.crossed).toEqual(["level11"]); expect(p.state.l169jumped).toBe(true);
  console.log("keys", JSON.stringify(p.state.hubKeys));
});
test("older checkpoint markers migrate once and support props sit on the shelters' floors", () => {
  const w = world(21), half = siteOf("bh", L), p = player(half.x, half.z);
  w.ctx.place.players = [p];
  w.objs["l169-cp-bh-m"] = { state: { site: "bh" } };
  w.objs["l169-cp-bh-locker"] = { state: { kind: "locker" } };
  layRoad(w.ctx, w.put, L);
  expect(w.objs["l169-cp-bh-m"].state.roadV).toBeGreaterThan(0);
  expect(w.objs["l169-cp-bh-locker"].children[0].id).toBe("leaf");
  expect(w.objs["l169-cp-bh-bed"].feetPosition.y.terrain).toBe(0.2);
  expect(w.objs["l169-cp-bh-door"].behavior).toBe("scripts/l169-door.js");
  expect(w.objs["l169-cp-bh-log"].state.lines[0]).toContain("red blanket");
  const locker = w.objs["l169-cp-bh-locker"];
  w.step(3100);
  tickRoad(w.ctx, w.put, L);
  expect(w.objs["l169-cp-bh-locker"]).toBe(locker);
});

test("a route board spends actual cold bottles, including flavored almond water", () => {
  const w = world(21), p = player(0, 0, { l169cold: 3 });
  expect(legsFrom(w.ctx, p.state, "bad-site", L)).toEqual([]);
  go(w.ctx, p, "house", "a", L);
  expect(p.state.l169trip).toBeUndefined();
  p.state.almonds = 1;
  p.state.almondsG = 1;
  go(w.ctx, p, "house", "a", L);
  expect(p.state.l169trip.to).toBe("a");
  expect(p.state.almonds + p.state.almondsG).toBe(0);
});
