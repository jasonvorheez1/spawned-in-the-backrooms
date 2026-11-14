import { describe, test, expect, mock } from "bun:test";
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }));
mock.module("builtin/tween", () => ({ animate: () => {} }));
mock.module("builtin/nav", () => ({ findPath: () => null }));
mock.module("../scripts/mat-cloth.js", () => ({ PRINTS: {} }));
const { CORRIDOR, OBSTACLES, agilityProfile, hitObstacle, stepHordeZ } = await import("../scripts/lib/levelrun-mechanics.js");
const { CH2, ch2Tick, ch2Choices, handleDialogueCh2, setCh2Step, megHostileCh2 } = await import("../scripts/lib/ch2-quest.js");
const { startIntroCut, startRescueCut, finishRescueToAlcove, lrunCutTick, lrunUi } = await import("../scripts/lib/levelrun-cut.js");
const { ears: dropEars } = await import("../scripts/l11-ch2-drop.js");

function makePlayer(overrides = {}) {
  return {
    id: "player/1",
    place: "level11",
    feetPosition: { x: 0, y: 0.1, z: 0 },
    rotation: { yaw: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    state: {
      level: 5,
      hp: 90,
      dinaQ: 9,
      attr: "5,5,5,5,5,5,5",
      quests: {},
      rep: {},
      ...overrides,
    },
  };
}

function makeCtx(player, objects = {}) {
  const emits = [];
  const crossed = [];
  const placeState = { chase: { active: false, hordeZ: 4.5, gateOpen: false } };
  const ctx = {
    self: player,
    session: {},
    now: () => ctx._t,
    _t: 10000,
    random: () => 0.4,
    view: { camera: null },
    place: { id: player.place, objects, state: placeState },
    emit: (name, payload, opts) => emits.push({ name, payload, opts }),
    getObject: (id) => (id === player.id ? player : objects[id] ?? null),
    query: () => [],
    spawn: (id, spec) => { objects[id] = { id, ...spec }; return objects[id]; },
    destroy: (id) => { delete objects[id]; },
    cross: (who, dest) => { crossed.push({ who: who.id, dest }); },
    emits,
    crossed,
  };
  return ctx;
}

describe("Chapter 2 quest progression and Mike Sunderland lore", () => {
  test("starts Chapter 2 after Chapter 1 completion and tracks Vance -> Clinic -> Base Gamma -> Level ! -> Phoebe", () => {
    const p = makePlayer();
    const ctx = makeCtx(p);

    ch2Tick(ctx, ctx.session, p.state, "level11");
    expect(p.state.ch2Q).toBe(1);
    expect(p.state.quests[CH2.id].name).toBe("The Dead Signal");

    // Stage 1 -> 2 via Vance
    const vance = { id: "npc/l11-meg-agent-vance", state: {} };
    const c1 = ch2Choices(ctx, vance, p.state);
    expect(c1.some((c) => c.text.includes("Dina's relay frequency"))).toBe(true);
    const r1 = handleDialogueCh2(ctx, p, vance, c1[0].text);
    expect(r1.reply).toContain("observer in yellow");
    expect(p.state.ch2Q).toBe(2);
    expect(p.state.ch2Yellow).toBe(1);

    // Stage 2 -> 3 via Clinic dead-drop (one-time items & XP)
    const cacheObj = { id: "l11-dina-cache", feetPosition: { x: -25.4, y: 1.4, z: 28.9 }, state: { kind: "dina-clinic-cache" } };
    dropEars.press({ ...ctx, self: cacheObj }, { by: p.id });
    expect(p.state.ch2ClinicDone).toBe(1);
    expect(p.state.payout).toEqual({ xp: 65, items: ["almond", "bandage"] });
    expect(p.state.ch2Q).toBe(3);

    p.state.payout = null;
    dropEars.press({ ...ctx, self: cacheObj }, { by: p.id });
    expect(p.state.payout).toBeNull();

    // Door blocks before Stage 4
    const doorObj = { id: "l11-to-levelrun", feetPosition: { x: -29.2, y: 0.4, z: 31 }, state: { kind: "levelrun-door" } };
    dropEars.press({ ...ctx, self: doorObj }, { by: p.id });
    expect(ctx.crossed.length).toBe(0);

    // Stage 3 -> 4 via Commander Moss (accurate Mike Sunderland lore)
    const moss = { id: "npc/gamma-moss", state: {} };
    const c3 = ch2Choices(ctx, moss, p.state);
    expect(c3.some((c) => c.text.includes("old intake logs"))).toBe(true);
    const r3 = handleDialogueCh2(ctx, p, moss, c3[0].text);
    expect(r3.reply).toContain("Mike Sunderland");
    expect(r3.reply).toContain("River's sister");
    expect(r3.reply).not.toMatch(/reincarnat|chosen|secret power/i);
    expect(p.state.knowsMike).toBe(1);
    expect(p.state.ch2Q).toBe(4);

    // Door opens at Stage 4
    dropEars.press({ ...ctx, self: doorObj }, { by: p.id });
    expect(ctx.crossed).toEqual([{ who: "player/1", dest: "levelrun#lrun-start" }]);
    expect(p.state.ch2Q).toBe(5);
  });

  test("provides hostile-M.E.G. alternate route via Kael and Camp Amber Jo", () => {
    const p = makePlayer({ rep: { meg: -100 }, ch2Q: 1 });
    const ctx = makeCtx(p);
    expect(megHostileCh2(p.state)).toBe(true);

    const vance = { id: "npc/l11-meg-agent-vance", state: {} };
    expect(ch2Choices(ctx, vance, p.state).some((c) => c.text.includes("Dina's relay frequency"))).toBe(false);

    const kael = { id: "npc/l11-trader-kael", state: {} };
    const ck = ch2Choices(ctx, kael, p.state);
    expect(ck.some((c) => c.text.includes("carrying field batteries"))).toBe(true);
    handleDialogueCh2(ctx, p, kael, ck[0].text);
    expect(p.state.ch2Q).toBe(2);

    setCh2Step(ctx, p.state, 3);
    const jo = { id: "npc/hub-amber-jo", state: {} };
    const cj = ch2Choices(ctx, jo, p.state);
    expect(cj.some((c) => c.text.includes("red hospital door"))).toBe(true);
    const rj = handleDialogueCh2(ctx, p, jo, cj[0].text);
    expect(rj.reply).toContain("Mike Sunderland");
    expect(p.state.ch2Q).toBe(4);
  });
});

describe("Level ! Agility mechanics and horde pacing", () => {
  test("scales sprint efficiency, movement speed, jump, stumble recovery, and dodge cooldown monotonically with Agility", () => {
    const low = agilityProfile({ attr: "5,1,5,5,5,5,5" });
    const mid = agilityProfile({ attr: "5,5,5,5,5,5,5" });
    const high = agilityProfile({ attr: "5,10,5,5,5,5,5" });

    expect(low.sprintDrainMul).toBeGreaterThan(mid.sprintDrainMul);
    expect(mid.sprintDrainMul).toBeGreaterThan(high.sprintDrainMul);

    expect(high.speedMul).toBeGreaterThan(mid.speedMul);
    expect(mid.speedMul).toBeGreaterThan(low.speedMul);

    expect(high.jumpMul).toBeGreaterThan(mid.jumpMul);
    expect(mid.jumpMul).toBeGreaterThan(low.jumpMul);

    expect(high.stumbleMs).toBeLessThan(mid.stumbleMs);
    expect(mid.stumbleMs).toBeLessThan(low.stumbleMs);
    expect(high.stumbleSpeedKeep).toBeGreaterThan(low.stumbleSpeedKeep);

    expect(high.dodgeCooldownMs).toBeLessThan(mid.dodgeCooldownMs);
    expect(mid.dodgeCooldownMs).toBeLessThan(low.dodgeCooldownMs);
  });

  test("distinguishes obstacle stumbles from airborne gurney vaults", () => {
    const gurney = OBSTACLES.find((o) => o.kind === "gurney");
    const cart = OBSTACLES.find((o) => o.kind === "cart");

    expect(hitObstacle({ x: gurney.x, z: gurney.z }, 0)).toEqual({ obs: gurney, vaulted: false });
    expect(hitObstacle({ x: gurney.x, z: gurney.z }, 0.55)).toEqual({ obs: gurney, vaulted: true });
    expect(hitObstacle({ x: cart.x, z: cart.z }, 0.6)).toEqual({ obs: cart, vaulted: false });
    expect(hitObstacle({ x: 2.6, z: gurney.z }, 0)).toBeNull();
  });

  test("advances horde along -Z smoothly without teleporting past player", () => {
    const pZ = -60;
    const h0 = -45;
    const next = stepHordeZ(pZ, h0, 0.1, { attr: "5,5,5,5,5,5,5" });
    expect(next).toBeLessThan(h0);
    expect(next).toBeGreaterThan(pZ);
  });
});

describe("Level ! intro, near-death rescue non-repeatability, and Phoebe conclusion", () => {
  test("plays intro, performs non-repeatable rescue to Safe Alcove, and recovers cleanly on reload", () => {
    const p = makePlayer({ ch2Q: 5, hp: 70 });
    p.place = "levelrun";
    p.feetPosition = { x: 0, y: 0.1, z: 1.5 };
    const objects = {
      "lrun-entry-door": { id: "lrun-entry-door", rotation: { yaw: 32 } },
      "lrun-chain-door": { id: "lrun-chain-door", rotation: { yaw: 0 } },
    };
    const ctx = makeCtx(p, objects);

    expect(startIntroCut(ctx, p)).toBe(true);
    expect(lrunUi(ctx, p)).toContain("RUN FOR YOUR LIFE");

    // Advance past intro
    ctx._t = 20000;
    expect(lrunCutTick(ctx, ctx.session, p.state, "levelrun")).toBe(false);
    expect(p.state.lrunIntroDone).toBe(1);
    expect(p.state.lrunCut).toBeNull();

    // Near-death collapse -> Phoebe rescue
    p.feetPosition = { x: 0, y: 0.1, z: CORRIDOR.collapseZ };
    expect(startRescueCut(ctx, p)).toBe(true);
    expect(p.state.hp).toBeGreaterThanOrEqual(4);
    expect(p.state.hp).toBeLessThanOrEqual(8);
    expect(lrunUi(ctx, p)).toContain("Phoebe");

    finishRescueToAlcove(ctx, p, ctx.session);
    expect(p.state.lrunRescued).toBe(1);
    expect(p.state.ch2Q).toBe(6);
    expect(p.feetPosition.x).toBe(CORRIDOR.safePos.x);
    expect(startRescueCut(ctx, p)).toBe(false);

    // Reload safeguard: stray position snaps cleanly to alcove without repeating rescue
    p.feetPosition = { x: 0, y: 0.1, z: -20 };
    lrunCutTick(ctx, ctx.session, p.state, "levelrun");
    expect(p.feetPosition.x).toBe(CORRIDOR.safePos.x);
  });

  test("supports all 4 Phoebe stances with curiosity motivation and completes Chapter 2 without Chapter 3 card", () => {
    for (const [snippet, expectedStance] of [
      ["Why did you pull me out", "suspicious"],
      ["waited until the corridor collapsed", "frustrated"],
      ["Mike Sunderland", "curious"],
      ["thank you", "relieved"],
    ]) {
      const p = makePlayer({ ch2Q: 6, lrunRescued: 1 });
      p.place = "levelrun";
      const ctx = makeCtx(p);
      const phoebe = { id: "npc/phoebe-lrun", state: {} };

      const choices = ch2Choices(ctx, phoebe, p.state);
      const chosen = choices.find((c) => c.text.toLowerCase().includes(snippet.toLowerCase()));
      expect(chosen).toBeDefined();

      const res = handleDialogueCh2(ctx, p, phoebe, chosen.text);
      expect(p.state.phoebeStance).toBe(expectedStance);
      expect(res.reply.length).toBeGreaterThan(20);

      // Exit requires speaking + finishing Chapter 2 cleanly
      const exitObj = { id: "lrun-to-l11", feetPosition: { x: 85, y: 0, z: 0 }, state: { kind: "levelrun-exit" } };
      dropEars.press({ ...ctx, self: exitObj }, { by: p.id });
      expect(ctx.crossed.length).toBe(0);

      const followUps = ch2Choices(ctx, phoebe, p.state);
      const finishChoice = followUps.find((c) => c.text.includes("heading back to Level 11"));
      handleDialogueCh2(ctx, p, phoebe, finishChoice.text);

      expect(p.state.ch2Done).toBe(1);
      expect(p.state.ch3Unlocked).toBe(1);
      expect(p.state.knowsMike).toBe(1);
      expect(p.state.payout).toEqual({ xp: 450 });
      expect(p.state.quests[CH2.id]).toBeUndefined();
      expect(p.state.qdone[CH2.id].outcome).toBe("completed");
      expect(phoebe.state.leaveAt).toBeGreaterThan(ctx.now());

      dropEars.press({ ...ctx, self: exitObj }, { by: p.id });
      expect(ctx.crossed).toEqual([{ who: "player/1", dest: "level11#l11-from-levelrun" }]);
    }
  });

  test("places/levelrun/sim.js lays corridor, runs chase, triggers collapse rescue, and spawns/despawns Phoebe cleanly", async () => {
    const sim = await import("../places/levelrun/sim.js");
    const p = makePlayer({ ch2Q: 5, lrunIntroDone: 1 });
    p.place = "levelrun";
    p.feetPosition = { x: 0, y: 0.1, z: -25 };
    const objects = {};
    const ctx = makeCtx(p, objects);
    ctx.place.players = [p];
    ctx.place.state = {};

    sim.tick(ctx);
    expect(objects["lrun-start"]).toBeDefined();
    expect(objects["lrun-alcove"]).toBeDefined();
    expect(objects["lrun-pursuer-1"]).toBeDefined();
    expect(ctx.place.state.chase.active).toBe(true);

    // Reach collapse zone
    p.feetPosition = { x: 0, y: 0.1, z: CORRIDOR.collapseZ };
    ctx._t += 200;
    sim.tick(ctx);
    expect(p.state.lrunCut?.phase).toBe("rescue");

    // Finish rescue -> Phoebe spawns in alcove
    finishRescueToAlcove(ctx, p, ctx.session);
    ctx._t += 200;
    sim.tick(ctx);
    expect(objects["phoebe-lrun"]).toBeDefined();
  });
});
