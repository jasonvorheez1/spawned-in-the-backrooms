import { describe, test, expect, mock } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

mock.module("builtin/physics", () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => null,
}));

mock.module("builtin/nav", () => ({
  findPath: () => ({ ok: true, points: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }] }),
}));

const { PLACES, PLACE_NAMES, PLACE_LABELS, LEVEL_TITLES } = await import("../scripts/lib/places.js");
const { PLACE_NAMES: FEED_NAMES } = await import("../scripts/lib/feed.js");
const { PLACE_NAMES: QUEST_NAMES } = await import("../scripts/lib/quests.js");
const { carryAcross } = await import("../scripts/lib/carry.js");
const { stepToward: stepMaze0, cellNear, canPass0 } = await import("../scripts/lib/maze0path.js");
const { N: N0, cellCenter: maze0Center, inHub, hasPit } = await import("../scripts/lib/maze.js");
const { stepToward6, cellCenter: l6Center, isWalkable: l6Walkable } = await import("../scripts/lib/level6path.js");
const { stepToward: stepBoiler, cellCenter: boilerCenter, isWalkable: boilerOpen } = await import("../scripts/lib/boilerpath.js");
const { update: updateL34Smiler } = await import("../scripts/l34-smiler.js");
const { update: updateL9Smiler } = await import("../scripts/l9-smiler.js");
const { finishQuest: finishQuest10, setWheatStep } = await import("../scripts/lib/level10-quests.js");
const { finishQuest8, setCarlaStep } = await import("../scripts/lib/level8-quests.js");
const { finishQuest61 } = await import("../scripts/lib/level61-quests.js");

describe("places registry", () => {
  test("every places/ directory has complete names across places, feed, and quests", () => {
    const dirs = readdirSync(join(import.meta.dir, "..", "places"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    expect(dirs.length).toBeGreaterThanOrEqual(30);
    for (const id of dirs) {
      expect(PLACES[id]).toBeDefined();
      expect(typeof PLACE_NAMES[id]).toBe("string");
      expect(PLACE_NAMES[id].length).toBeGreaterThan(0);
      expect(typeof PLACE_LABELS[id]).toBe("string");
      expect(PLACE_LABELS[id].length).toBeGreaterThan(0);
      expect(Array.isArray(LEVEL_TITLES[id])).toBe(true);
      expect(LEVEL_TITLES[id].length).toBe(2);
      expect(FEED_NAMES[id]).toBe(PLACE_LABELS[id]);
      expect(QUEST_NAMES[id]).toBe(PLACE_NAMES[id]);
    }
  });
});

describe("carryAcross & companion bring", () => {
  function makeTransferCtx({ objects }) {
    const crossed = [];
    const logs = [];
    const ctx = {
      now: () => 5000,
      log: (...a) => logs.push(a),
      query: ({ tags, radius, center } = {}) =>
        Object.values(objects).filter((o) => {
          if (tags && !tags.every((t) => o.tags?.includes(t))) return false;
          if (center && radius != null) {
            const p = o.feetPosition;
            return p && Math.hypot(p.x - center.x, p.z - center.z) <= radius;
          }
          return true;
        }),
      getObject: (id) => objects[id] ?? null,
      cross: (o, link) => {
        if (o.id === "fail-npc") throw new Error("sim error");
        crossed.push({ id: o.id, link });
      },
    };
    return { ctx, crossed, logs };
  }

  test("crosses held props and nearby following companions while skipping wait/far/player/bonus links", () => {
    const player = {
      id: "player/p1",
      feetPosition: { x: 0, y: 0, z: 0 },
      state: { carryId: "prop-carried" },
    };
    const objects = {
      "prop-carried": { id: "prop-carried", feetPosition: { x: 0.5, y: 0, z: 0 }, state: {} },
      "prop-held": { id: "prop-held", feetPosition: { x: 1.5, y: 0, z: 0 }, state: { heldBy: "player/p1" } },
      "comp-follow": { id: "comp-follow", tags: ["npc"], feetPosition: { x: 4, y: 0, z: 0 }, state: { follow: "player/p1", cmd: "follow" } },
      "comp-wait": { id: "comp-wait", tags: ["npc"], feetPosition: { x: 3, y: 0, z: 0 }, state: { follow: "player/p1", cmd: "wait" } },
      "comp-far": { id: "comp-far", tags: ["npc"], feetPosition: { x: 25, y: 0, z: 0 }, state: { follow: "player/p1", cmd: "follow" } },
      "fail-npc": { id: "fail-npc", tags: ["npc"], feetPosition: { x: 2, y: 0, z: 0 }, state: { follow: "player/p1", cmd: "follow" } },
      "player/other": { id: "player/other", feetPosition: { x: 1, y: 0, z: 0 }, state: { heldBy: "player/p1" } },
    };

    const { ctx, crossed, logs } = makeTransferCtx({ objects });
    carryAcross(ctx, player, "level11#arr-hub");

    expect(player.state.xferTo).toEqual({ link: "level11#arr-hub", at: 5000 });
    expect(crossed.map((c) => c.id).sort()).toEqual(["comp-follow", "prop-carried", "prop-held"]);
    expect(logs.length).toBe(1);

    // Bonus room, room:, and world: links must not pull companions or held props
    crossed.length = 0;
    carryAcross(ctx, player, "bonus#start");
    carryAcross(ctx, player, "room:safe");
    carryAcross(ctx, player, "world:main");
    expect(crossed.length).toBe(0);
  });
});

describe("grid-path shared pathers", () => {
  test("maze0path, boilerpath, and level6path produce valid finite waypoints", () => {
    let mA = null, mB = null;
    for (let cx = 0; cx < N0 - 1 && !mA; cx++) {
      for (let cz = 0; cz < N0 && !mA; cz++) {
        if (!inHub(cx, cz) && !hasPit(cx, cz) && !inHub(cx + 1, cz) && !hasPit(cx + 1, cz) && canPass0(cx, cz, 0)) {
          mA = { cx, cz };
          mB = { cx: cx + 1, cz };
        }
      }
    }
    expect(mA).not.toBeNull();
    const a0 = maze0Center(mA.cx, mA.cz);
    const b0 = maze0Center(mB.cx, mB.cz);
    const wp0 = stepMaze0(a0.x, a0.z, b0.x, b0.z);
    expect(wp0).not.toBeNull();
    expect(wp0.cells).toBe(1);
    expect(Number.isFinite(wp0.next.x) && Number.isFinite(wp0.next.z)).toBe(true);
    expect(cellNear(() => 0, mA.cx, mA.cz, 0)).toEqual([mA.cx, mA.cz]);

    // Pick two walkable cells in Level 6
    const openL6 = [];
    for (let i = 0; i < 15 && openL6.length < 2; i++) {
      for (let j = 0; j < 15 && openL6.length < 2; j++) {
        if (l6Walkable(i, j)) openL6.push({ i, j });
      }
    }
    expect(openL6.length).toBe(2);
    const p6a = l6Center(openL6[0].i, openL6[0].j);
    const p6b = l6Center(openL6[1].i, openL6[1].j);
    const wp6 = stepToward6(p6a.x, p6a.z, p6b.x, p6b.z);
    expect(wp6).not.toBeNull();
    expect(Number.isFinite(wp6.next.x) && Number.isFinite(wp6.next.z)).toBe(true);

    // Pick two open cells in Boilergrid
    const openB = [];
    for (let i = 0; i < 15 && openB.length < 2; i++) {
      for (let j = 0; j < 15 && openB.length < 2; j++) {
        if (boilerOpen(i, j)) openB.push({ i, j });
      }
    }
    expect(openB.length).toBe(2);
    const pba = boilerCenter(openB[0].i, openB[0].j);
    const pbb = boilerCenter(openB[1].i, openB[1].j);
    const wpb = stepBoiler(pba.x, pba.z, pbb.x, pbb.z);
    expect(wpb).not.toBeNull();
    expect(Number.isFinite(wpb.next.x) && Number.isFinite(wpb.next.z)).toBe(true);
  });
});

describe("ambush-smiler shared behavior (l34 & l9)", () => {
  function makeSmilerCtx({ selfPos = { x: 0, y: 0, z: 0 }, selfState = {}, playerPos = { x: 3, y: 0, z: 0 }, playerState = {}, now = 1000 }) {
    let curNow = now;
    const emitted = [];
    const destroyed = [];
    const player = {
      id: "player/p1",
      feetPosition: { ...playerPos },
      velocity: { x: 0, y: 0, z: 0 },
      camera: { rotation: { pitch: 0 } },
      state: { hp: 100, ...playerState },
    };
    const self = {
      id: "smiler/s1",
      visible: true,
      feetPosition: { ...selfPos },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0 },
      anim: {},
      session: {},
      state: { hp: 50, route: [[0, 0], [4, 0]], ...selfState },
    };
    const ctx = {
      self,
      place: { name: "level9", state: {}, players: [player], objects: { [self.id]: self } },
      now: () => curNow,
      random: () => 0.5,
      sleep: () => {},
      emit: (ev, data) => emitted.push({ ev, data }),
      destroy: (id) => destroyed.push(id),
    };
    return {
      ctx,
      self,
      player,
      emitted,
      destroyed,
      advance: (ms) => { curNow += ms; },
    };
  }

  test("l34-smiler hides while lurking, surfaces on flashlight, and retreats when light is killed looking down", () => {
    const sim = makeSmilerCtx({ playerState: { light: false } });
    updateL34Smiler(sim.ctx, 0.05);
    expect(sim.self.visible).toBe(false);

    sim.player.state.light = true;
    sim.advance(400);
    updateL34Smiler(sim.ctx, 0.05);
    expect(sim.self.visible).toBe(true);

    sim.player.state.light = false;
    sim.player.camera.rotation.pitch = -45;
    sim.advance(400);
    updateL34Smiler(sim.ctx, 0.05); // starts hideSince timer
    sim.advance(1600);
    updateL34Smiler(sim.ctx, 0.05); // exceeds loseMs (1200ms) -> retreats
    expect(sim.self.visible).toBe(false);
  });

  test("l9-smiler stays visible, respects home leash, and logs deadAt on death", () => {
    const sim = makeSmilerCtx({
      selfState: { hp: 50, home: { x: 0, z: 0 }, leash: 6, route: [[0, 0]] },
      playerPos: { x: 10, y: 0, z: 0 }, // outside 6m leash
      playerState: { light: true },
    });
    updateL9Smiler(sim.ctx, 0.05);
    expect(sim.self.visible).toBe(true);
    expect(sim.self.session.m.prey).toBeNull();

    sim.player.feetPosition = { x: 4, y: 0, z: 0 }; // inside 6m leash
    sim.advance(400);
    updateL9Smiler(sim.ctx, 0.05);
    expect(sim.self.session.m.prey).toBe("player/p1");

    sim.self.state.hp = 0;
    updateL9Smiler(sim.ctx, 0.05);
    sim.advance(2000);
    updateL9Smiler(sim.ctx, 0.05);
    expect(sim.ctx.place.state.deadAt.s1).toBe(sim.ctx.now());
    expect(sim.destroyed).toEqual(["smiler/s1"]);
  });
});

describe("shared level quest progression and one-time payout", () => {
  function makeQuestPlayer(extraState = {}) {
    const emitted = [];
    const ctx = {
      now: () => 2500,
      emit: (ev, data) => emitted.push({ ev, data }),
    };
    const p = {
      id: "player/p1",
      feetPosition: { x: 0, y: 0, z: 0 },
      state: { cents: 0, quests: {}, ...extraState },
    };
    return { ctx, p, emitted };
  }

  test("level10 setWheatStep and finishQuest advance monotonically and apply M.E.G. rep bonus once", () => {
    const { ctx, p, emitted } = makeQuestPlayer({ rep: { meg: 40 } }); // +25% bonus
    setWheatStep(ctx, p, 2);
    expect(p.state.wheatQ).toBe(2);
    setWheatStep(ctx, p, 1); // regression ignored
    expect(p.state.wheatQ).toBe(2);

    const ok1 = finishQuest10(ctx, p, "wheat", { xp: 100, cents: 4000, rep: [["meg", 5]] });
    expect(ok1).toBe(true);
    expect(p.state.wheatQ).toBe(99);
    expect(p.state.cents).toBe(5000); // 4000 + 25% M.E.G. bonus
    expect(emitted.some((e) => e.ev === "milestone" && e.data.name === "quest-wheat")).toBe(true);

    const ok2 = finishQuest10(ctx, p, "wheat", { xp: 100, cents: 4000 });
    expect(ok2).toBe(false);
    expect(p.state.cents).toBe(5000);
  });

  test("level8 finishQuest8 enforces l8- payOnce key and level61 defaults xp to 140", () => {
    const { ctx, p } = makeQuestPlayer({ rep: { survivors: 15 } }); // +10% bonus
    setCarlaStep(ctx, p, 1, "Found Carla");
    expect(p.state.carlaQ).toBe(1);

    expect(finishQuest8(ctx, p, "carla", { cents: 2000 })).toBe(true);
    expect(p.state.cents).toBe(2200);
    // Even if step variable were tampered back, payOnce blocks second payout
    p.state.carlaQ = 2;
    expect(finishQuest8(ctx, p, "carla", { cents: 2000 })).toBe(false);
    expect(p.state.cents).toBe(2200);

    expect(finishQuest61(ctx, p, "bee", { cents: 1000 })).toBe(true);
    expect(p.state.payout.xp).toBe(140);
  });
});
