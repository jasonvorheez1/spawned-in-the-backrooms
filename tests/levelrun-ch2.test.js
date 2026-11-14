import { describe, test, expect, mock } from "bun:test";
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }));
mock.module("builtin/tween", () => ({ animate: () => {} }));
mock.module("builtin/nav", () => ({ findPath: () => null }));
mock.module("../scripts/mat-cloth.js", () => ({ PRINTS: {} }));
const { CORRIDOR, OBSTACLES, agilityProfile, hitObstacle, stepHordeZ } = await import("../scripts/lib/levelrun-mechanics.js");
const { CH2, CH2_TONE, ch2Tick, ch2Choices, handleDialogueCh2, setCh2Step, megHostileCh2 } = await import("../scripts/lib/ch2-quest.js");
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
    world: { state: {} },
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

    // Stage 3 -> 4 via Commander Moss (accurate Mike Sunderland lore) + IS LAB bench decode
    const moss = { id: "npc/gamma-moss", state: {} };
    const c3 = ch2Choices(ctx, moss, p.state);
    expect(c3.some((c) => c.text.includes("old intake logs"))).toBe(true);
    const r3 = handleDialogueCh2(ctx, p, moss, c3[0].text);
    expect(r3.reply).toContain("Mike Sunderland");
    expect(r3.reply).toContain("River's brother");
    expect(r3.reply).not.toMatch(/sister|\bshe\b|\bher\b/i);
    expect(r3.reply).not.toMatch(/reincarnat|chosen|secret power/i);
    expect(p.state.ch2Archive).toBe(1);
    expect(p.state.knowsMike).toBe(1);
    expect(p.state.ch2Q).toBe(3);

    // Door still holds until IS LAB bench carrier lock completes
    dropEars.press({ ...ctx, self: doorObj }, { by: p.id });
    expect(ctx.crossed.length).toBe(0);

    // Decode via IS LAB bench using a salvaged relay
    p.state.ch2Relay = 1;
    const benchObj = { id: "l11-lab-bench", feetPosition: { x: -26.3, y: 1.26, z: 35.4 }, state: { kind: "lab-signal-bench" } };
    dropEars.press({ ...ctx, self: benchObj }, { by: p.id });
    expect(p.state.ch2SignalDecoded).toBe(1);
    expect(p.state.ch2EchoDone).toBe(1);
    expect(p.state.ch2Q).toBe(4);
    expect(p.state.payout.xp).toBe(120);
    expect(p.state.payout.items).toEqual(["almond", "circuit"]);

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
    p.state.ch2SignalDecoded = 1;
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

  test("never assumes Mike is known beforehand in Phoebe dialogue", () => {
    const phoebe = { id: "npc/phoebe-lrun", state: {} };

    // Fresh arrival without Stage 3 or Whisper 8: no Mike options before Phoebe names him
    const pCold = makePlayer({ ch2Q: 6, lrunRescued: 1 });
    pCold.place = "levelrun";
    const ctxCold = makeCtx(pCold);
    const coldChoices = ch2Choices(ctxCold, phoebe, pCold.state);
    expect(coldChoices.some((c) => /mike/i.test(c.text))).toBe(false);

    const pickWant = coldChoices.find((c) => c.text.includes("What do you want"));
    handleDialogueCh2(ctxCold, pCold, phoebe, pickWant.text);
    expect(ch2Choices(ctxCold, phoebe, pCold.state).some((c) => /mike/i.test(c.text))).toBe(false);

    // Whisper 8 alone unlocks "Who is he?" referencing Phoebe's earlier whisper
    const pWhisper = makePlayer({ ch2Q: 6, lrunRescued: 1, heardMike: 1 });
    pWhisper.place = "levelrun";
    const wChoices = ch2Choices(makeCtx(pWhisper), phoebe, pWhisper.state);
    expect(wChoices.some((c) => c.text.includes("mentioned Mike earlier"))).toBe(true);
  });

  test("supports all 5 replies to Phoebe with male Mike pronouns and completes Chapter 2 without Chapter 3 card", () => {
    for (const [snippet, expectedStance, reaction, extra] of [
      ["watch Mike Sunderland", "curious", "mike", { knowsMike: 1 }],
      ["what were you waiting for", "curious", "reminded", {}],
      ["What do you want", "suspicious", "want", {}],
      ["could've helped sooner", "frustrated", "sooner", {}],
      ["Thanks, I think", "relieved", "thanks", {}],
    ]) {
      const p = makePlayer({ ch2Q: 6, lrunRescued: 1, ...extra });
      p.place = "levelrun";
      const ctx = makeCtx(p);
      const phoebe = { id: "npc/phoebe-lrun", state: {} };

      const choices = ch2Choices(ctx, phoebe, p.state);
      const chosen = choices.find((c) => c.text.toLowerCase().includes(snippet.toLowerCase()));
      expect(chosen).toBeDefined();

      const res = handleDialogueCh2(ctx, p, phoebe, chosen.text);
      expect(p.state.phoebeStance).toBe(expectedStance);
      expect(p.state.phoebeReaction).toBe(reaction);
      expect(res.reply).not.toContain("—");
      expect(res.reply).not.toMatch(/sister|\bshe\b|\bher\b/i);
      expect(res.reply.length).toBeGreaterThan(20);

      // Exit requires speaking + finishing Chapter 2 cleanly
      const exitObj = { id: "lrun-to-l11", feetPosition: { x: 85, y: 0, z: 0 }, state: { kind: "levelrun-exit" } };
      dropEars.press({ ...ctx, self: exitObj }, { by: p.id });
      expect(ctx.crossed.length).toBe(0);

      const followUps = ch2Choices(ctx, phoebe, p.state);
      if (reaction === "reminded") {
        // Phoebe just named Mike in her reply, unlocking the follow-up naturally
        expect(followUps.some((c) => c.text.includes("Did you know Mike"))).toBe(true);
      }
      const finishChoice = followUps.find((c) => c.text.includes("heading back to Level 11"));
      handleDialogueCh2(ctx, p, phoebe, finishChoice.text);

      expect(p.state.ch2Done).toBe(1);
      expect(p.state.ch3Unlocked).toBe(1);
      if (reaction === "mike" || reaction === "reminded") expect(p.state.knowsMike).toBe(1);
      else expect(p.state.knowsMike).toBeUndefined();
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

    const simCtx = { ...ctx, self: undefined };
    sim.tick(simCtx);
    expect(objects["lrun-start"]).toBeDefined();
    expect(objects["lrun-alcove"]).toBeDefined();
    expect(objects["lrun-pursuer-1"]).toBeDefined();
    expect(ctx.place.state.chase.active).toBe(true);

    // Reach collapse zone (with ctx.self undefined as on the real place tick)
    p.feetPosition = { x: 0, y: 0.1, z: CORRIDOR.collapseZ };
    ctx._t += 200;
    sim.tick(simCtx);
    expect(p.state.lrunCut?.phase).toBe("rescue");

    // Finish rescue -> Phoebe spawns in alcove
    finishRescueToAlcove(ctx, p, ctx.session);
    ctx._t += 200;
    sim.tick(simCtx);
    expect(objects["phoebe-lrun"]).toBeDefined();
  });
});

describe("Chapter 2 side quests (Frequency Lock & Wait for the Tone) and Level 34 / Base Gamma routes", () => {
  test("Frequency Lock supports Level 34 relay recovery, bench decode, and reverse Stage 3 completion", () => {
    const p = makePlayer({ ch2Q: 3 });
    const ctx = makeCtx(p);
    const benchObj = { id: "l11-lab-bench", feetPosition: { x: -26.3, y: 1.26, z: 35.4 }, state: { kind: "lab-signal-bench" } };

    // Low skills pressing IS LAB bench opens Frequency Lock at stage 2
    dropEars.press({ ...ctx, self: benchObj }, { by: p.id });
    expect(p.state.ch2EchoQ).toBe(2);
    expect(p.state.ch2SignalDecoded).toBeUndefined();

    // Recover waterproof relay in Level 34 east branch once
    const relayObj = { id: "l34-ch2-relay", feetPosition: { x: 17.2, y: 0.05, z: 25 }, state: { kind: "l34-ch2-relay" } };
    dropEars.press({ ...ctx, self: relayObj }, { by: p.id });
    expect(p.state.ch2Relay).toBe(1);
    expect(p.state.ch2EchoQ).toBe(3);
    expect(p.state.payout).toEqual({ xp: 95, items: ["battery"], text: "Recovered Waterproof Relay Case (+95 XP, +1 Battery)" });

    // Repeat press cannot farm relay XP
    dropEars.press({ ...ctx, self: relayObj }, { by: p.id });
    expect(p.state.payout.xp).toBe(95);

    // Slot relay at IS LAB bench -> completes Frequency Lock and stacks payouts
    dropEars.press({ ...ctx, self: benchObj }, { by: p.id });
    expect(p.state.ch2SignalDecoded).toBe(1);
    expect(p.state.ch2EchoQ).toBe(99);
    expect(p.state.ch2EchoDone).toBe(1);
    expect(p.state.cents).toBe(6500);
    expect(p.state.payout.xp).toBe(215);
    expect(p.state.payout.items).toEqual(["battery", "almond", "circuit"]);
    expect(p.state.ch2Q).toBe(3);

    // Base Gamma Vale finishes the archive side after IS LAB -> unlocks Stage 4
    const vale = { id: "npc/gamma-vale", state: {} };
    const cv = ch2Choices(ctx, vale, p.state);
    expect(cv.some((c) => c.text.includes("Base Gamma's old intake"))).toBe(true);
    const rv = handleDialogueCh2(ctx, p, vale, cv[0].text);
    expect(rv.reply).toContain("Mike Sunderland");
    expect(p.state.ch2Archive).toBe(1);
    expect(p.state.ch2Q).toBe(4);
  });

  test("Frequency Lock allows Pip (battery trade) and Science 40 direct bypass routes", () => {
    const pPip = makePlayer({ ch2Q: 3, ch2EchoQ: 2, batteries: 1 });
    const ctxPip = makeCtx(pPip);
    const pip = { id: "npc/gamma-pip", state: {} };
    const cPip = ch2Choices(ctxPip, pip, pPip.state);
    const tradeChoice = cPip.find((c) => c.text.includes("spare flashlight battery"));
    expect(tradeChoice).toBeDefined();
    handleDialogueCh2(ctxPip, pPip, pip, tradeChoice.text);
    expect(pPip.state.batteries).toBe(0);
    expect(pPip.state.ch2Relay).toBe(1);
    expect(pPip.state.ch2EchoQ).toBe(3);

    // Science 40 direct bench bypass without collecting any relay
    const pSci = makePlayer({ ch2Q: 3, ch2Archive: 1, skl: Array(20).fill(50).join(",") });
    const ctxSci = makeCtx(pSci);
    const benchObj = { id: "l11-lab-bench", feetPosition: { x: -26.3, y: 1.26, z: 35.4 }, state: { kind: "lab-signal-bench" } };
    dropEars.press({ ...ctxSci, self: benchObj }, { by: pSci.id });
    expect(pSci.state.ch2SignalDecoded).toBe(1);
    expect(pSci.state.ch2EchoDone).toBe(1);
    expect(pSci.state.ch2Q).toBe(4);
  });

  test("Wait for the Tone traces payphone -> Camera 4 Ivy -> Mike's satchel and boosts Level ! pacing", async () => {
    const { ears: l11Use } = await import("../scripts/level11-use.js");
    const p = makePlayer({ ch2Q: 1 });
    const ctx = makeCtx(p);
    const phoneObj = { id: "l11-payphone", feetPosition: { x: -8.8, y: 0.33, z: 15.5 }, state: { kind: "payphone" } };

    // Answer Level 11 payphone -> starts/advances Wait for the Tone
    l11Use.press({ ...ctx, self: phoneObj }, { by: p.id });
    expect(p.state.ch2TonePayphone).toBe(1);
    expect(p.state.ch2ToneQ).toBe(2);

    // Ask Ivy at Base Gamma about Camera 4
    const ivy = { id: "npc/gamma-ivy", state: {} };
    const ci = ch2Choices(ctx, ivy, p.state);
    const camChoice = ci.find((c) => c.text.includes("Camera 4"));
    expect(camChoice).toBeDefined();
    handleDialogueCh2(ctx, p, ivy, camChoice.text);
    expect(p.state.ch2CamLogged).toBe(1);
    expect(p.state.ch2ToneQ).toBe(3);

    // Recover Mike Sunderland's dropped field satchel -> completes Wait for the Tone & grants ch2Prep
    const satchelObj = { id: "l11-sunderland-satchel", feetPosition: { x: -30.9, y: 0.1, z: 8.7 }, state: { kind: "sunderland-satchel" } };
    dropEars.press({ ...ctx, self: satchelObj }, { by: p.id });
    expect(p.state.ch2RunnerData).toBe(1);
    expect(p.state.ch2ToneDone).toBe(1);
    expect(p.state.ch2ToneQ).toBe(99);
    expect(p.state.ch2Prep).toBe(1);
    expect(p.state.knowsMike).toBe(1);
    expect(p.state.payout.xp).toBe(135);
    expect(p.state.payout.items).toEqual(["almond", "almond", "bandage", "bandage", "firstaid"]);

    // Verify subtle Level ! pacing benefit while keeping Agility monotonicity
    const base = agilityProfile({ attr: "5,5,5,5,5,5,5" });
    const prepped = agilityProfile({ attr: "5,5,5,5,5,5,5", ch2Prep: 1 });
    expect(prepped.sprintDrainMul).toBeLessThan(base.sprintDrainMul);
    expect(prepped.stumbleMs).toBeLessThan(base.stumbleMs);

    // Phoebe notes ch2Prep if mentioned in the alcove
    p.state.ch2Q = 6;
    p.state.lrunRescued = 1;
    p.state.phoebeTalked = 1;
    const phoebe = { id: "npc/phoebe-lrun", state: {} };
    const pf = ch2Choices(ctx, phoebe, p.state);
    const prepChoice = pf.find((c) => c.text.includes("pacing notes"));
    expect(prepChoice).toBeDefined();
    const rp = handleDialogueCh2(ctx, p, phoebe, prepChoice.text);
    expect(rp.reply).toContain("cadence");
  });

  test("GAMMA-DB-01 admin intake file unlocks Stage 3 archive half via BackOS", async () => {
    const { onInput } = await import("../scripts/os.js");
    const p = makePlayer({ ch2Q: 3, ch2SignalDecoded: 1 });
    p.state.os = { id: "GAMMA-DB-01", host: "GAMMA-DB-01", user: "admin", app: "files", sel: "" };
    const ctx = makeCtx(p, { "GAMMA-DB-01": { id: "GAMMA-DB-01", feetPosition: { x: 0, y: 0, z: 0 }, state: {} } });
    onInput(ctx, { pressed: { os: true }, actionData: { os: { k: "file", v: "sunderland_intake.txt" } } });
    expect(p.state.ch2Archive).toBe(1);
    expect(p.state.knowsMike).toBe(1);
    expect(p.state.ch2Q).toBe(4);
  });

  test("map markers point to verified live places and entity coordinates", () => {
    const p1 = makePlayer({ ch2Q: 1 });
    const ctx1 = makeCtx(p1);
    ch2Tick(ctx1, ctx1.session, p1.state, "level11");
    expect(p1.state.quests[CH2.id].mark).toEqual({ place: "level11", x: 19.35, z: -13.15, label: "Base Beta (Vance)" });

    const p2 = makePlayer({ ch2Q: 2 });
    ch2Tick(makeCtx(p2), {}, p2.state, "level11");
    expect(p2.state.quests[CH2.id].mark).toEqual({ place: "level11", x: -25.45, z: 28.9, label: "Strip Mall Clinic" });

    const p3g = makePlayer({ ch2Q: 3, ch2SignalDecoded: 1 });
    ch2Tick(makeCtx(p3g), {}, p3g.state, "level11");
    expect(p3g.state.quests[CH2.id].mark).toEqual({ place: "gamma", x: 15, z: 29.5, label: "Base Gamma (Moss / Archive)" });

    const p3h = makePlayer({ ch2Q: 3, ch2SignalDecoded: 1, rep: { meg: -40 } });
    ch2Tick(makeCtx(p3h), {}, p3h.state, "level11");
    expect(p3h.state.quests[CH2.id].mark).toEqual({ place: "thehub", x: 0, z: -18, label: "Camp Amber (The Hub)" });

    const p3b = makePlayer({ ch2Q: 3, ch2Archive: 1 });
    ch2Tick(makeCtx(p3b), {}, p3b.state, "level11");
    expect(p3b.state.quests[CH2.id].mark).toEqual({ place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" });

    const p4 = makePlayer({ ch2Q: 4 });
    ch2Tick(makeCtx(p4), {}, p4.state, "level11");
    expect(p4.state.quests[CH2.id].mark).toEqual({ place: "level11", x: -29.25, z: 31, label: "Red Hospital Door" });

    const pti = makePlayer({ ch2ToneQ: 2 });
    ch2Tick(makeCtx(pti), {}, pti.state, "level11");
    expect(pti.state.quests[CH2_TONE.id].mark).toEqual({ place: "gamma", x: -26, z: 2, label: "Base Gamma (Ivy)" });

    const pt = makePlayer({ ch2ToneQ: 3, ch2RunnerData: 1 });
    ch2Tick(makeCtx(pt), {}, pt.state, "level11");
    expect(pt.state.quests[CH2_TONE.id].mark).toEqual({ place: "level11", x: -17.06, z: 53.73, label: "Central Market (Trader Kael)" });
  });

  test("Stage 1 alternate route via Sedco courier and Stage 3 out-of-order completion auto-unlocks Stage 4", async () => {
    const { onInput } = await import("../scripts/os.js");
    // Stage 1 alternate route: Sedco courier l11-walker-1
    const p1 = makePlayer({ ch2Q: 1 });
    const ctx1 = makeCtx(p1);
    const courier = { id: "npc/l11-walker-1", state: {} };
    const c1 = ch2Choices(ctx1, courier, p1.state);
    const leadChoice = c1.find((c) => c.text.includes("strip mall clinic"));
    expect(leadChoice).toBeDefined();
    handleDialogueCh2(ctx1, p1, courier, leadChoice.text);
    expect(p1.state.ch2Q).toBe(2);
    expect(p1.state.ch2Yellow).toBe(1);

    // Out-of-order Stage 3 completion: Gamma OS archive at Stage 1 + IS LAB decode + clinic note
    const p = makePlayer({ ch2Q: 1, skl: Array(13).fill(35).join(",") });
    p.state.os = { id: "GAMMA-DB-01", host: "GAMMA-DB-01", user: "admin", app: "files", sel: "" };
    const ctx = makeCtx(p, { "GAMMA-DB-01": { id: "GAMMA-DB-01", feetPosition: { x: 0, y: 0, z: 0 }, state: {} } });
    onInput(ctx, { pressed: { os: true }, actionData: { os: { k: "file", v: "sunderland_intake.txt" } } });
    expect(p.state.ch2Archive).toBe(1);
    expect(p.state.knowsMike).toBe(1);
    expect(p.state.ch2Q).toBe(1);

    const bench = { id: "l11-lab-bench", feetPosition: { x: -25.2, y: 1.02, z: 34.85 }, state: { kind: "lab-signal-bench" } };
    dropEars.press({ ...ctx, self: bench }, { by: p.id });
    expect(p.state.ch2SignalDecoded).toBe(1);

    // Now picking up Dina's clinic note advances straight past Stage 3 to Stage 4
    setCh2Step(ctx, p.state, 3, "Recovered Dina's clinic dead-drop");
    expect(p.state.ch2Q).toBe(4);
  });

  test("Stage 3 new alternate archive routes via Vance [Speech 45] and Jo [Speech 40 / $25] with M.E.G. neutral", () => {
    // Vance [Speech 45] mirrored intake index
    const pv = makePlayer({ ch2Q: 3, ch2SignalDecoded: 1, skl: Array(13).fill(35).join(",") });
    const ctxv = makeCtx(pv);
    ctxv.random = () => 0;
    const vance = { id: "npc/l11-meg-agent-vance", state: {} };
    const vc = ch2Choices(ctxv, vance, pv.state).find((c) => c.text.includes("[Speech 45]"));
    expect(vc).toBeDefined();
    handleDialogueCh2(ctxv, pv, vance, vc.text);
    expect(pv.state.ch2Archive).toBe(1);
    expect(pv.state.knowsMike).toBe(1);
    expect(pv.state.ch2Q).toBe(4);

    // Jo [Speech 40] and $25 bribe when M.E.G. is neutral
    const pj = makePlayer({ ch2Q: 3, skl: Array(13).fill(35).join(","), cents: 3000 });
    const ctxj = makeCtx(pj);
    ctxj.random = () => 0;
    const jo = { id: "npc/hub-amber-jo", state: {} };
    const jcList = ch2Choices(ctxj, jo, pj.state);
    expect(jcList.some((c) => c.text.includes("[Speech 40]"))).toBe(true);
    const payChoice = jcList.find((c) => c.text.includes("$25"));
    expect(payChoice).toBeDefined();
    handleDialogueCh2(ctxj, pj, jo, payChoice.text);
    expect(pj.state.cents).toBe(500);
    expect(pj.state.ch2Archive).toBe(1);
    expect(pj.state.knowsMike).toBe(1);
  });

  test("failed RNG skill checks lock out retry scumming while preserving deterministic fallbacks", () => {
    // Pip [Repair 35] failure locks Retry while leaving Science 35 open
    const pPip = makePlayer({ ch2Q: 3, ch2EchoQ: 2 });
    const ctxPip = makeCtx(pPip);
    ctxPip.random = () => 0.1;
    const pip = { id: "npc/gamma-pip", state: {} };
    const pipRep = ch2Choices(ctxPip, pip, pPip.state).find((c) => c.text.includes("[Repair 35]"));
    expect(pipRep).toBeDefined();
    handleDialogueCh2(ctxPip, pPip, pip, pipRep.text);
    expect(pPip.state.ch2PipRepTried).toBe(1);
    expect(pPip.state.ch2Relay).toBeUndefined();
    const afterPip = ch2Choices(ctxPip, pip, pPip.state);
    expect(afterPip.some((c) => c.text.includes("[Repair 35]"))).toBe(false);
    expect(afterPip.some((c) => c.text.includes("[Science 35]"))).toBe(true);

    // Janitor (l11-walker-3) [Barter 35] failure locks Retry while leaving $30 cash buy open
    const pJan = makePlayer({ ch2EchoQ: 2, cents: 4000 });
    const ctxJan = makeCtx(pJan);
    ctxJan.random = () => 0.1;
    const jan = { id: "npc/l11-walker-3", state: {} };
    const janBar = ch2Choices(ctxJan, jan, pJan.state).find((c) => c.text.includes("[Barter 35]"));
    expect(janBar).toBeDefined();
    handleDialogueCh2(ctxJan, pJan, jan, janBar.text);
    expect(pJan.state.ch2JanBarTried).toBe(1);
    const afterJan = ch2Choices(ctxJan, jan, pJan.state);
    expect(afterJan.some((c) => c.text.includes("[Barter 35]"))).toBe(false);
    expect(afterJan.some((c) => c.text.includes("$30"))).toBe(true);

    // IS LAB temp [Speech 40] failure locks Retry
    const pW2 = makePlayer({ ch2EchoQ: 2 });
    const ctxW2 = makeCtx(pW2);
    ctxW2.random = () => 0.1;
    const w2 = { id: "npc/l11-walker-2", state: {} };
    const w2Choice = ch2Choices(ctxW2, w2, pW2.state).find((c) => c.text.includes("[Speech 40]"));
    expect(w2Choice).toBeDefined();
    handleDialogueCh2(ctxW2, pW2, w2, w2Choice.text);
    expect(pW2.state.ch2Walker2Tried).toBe(1);
    expect(ch2Choices(ctxW2, w2, pW2.state).some((c) => c.text.includes("[Speech 40]"))).toBe(false);

    // Vance [Speech 45] failure locks Retry
    const pVan = makePlayer({ ch2Q: 3 });
    const ctxVan = makeCtx(pVan);
    ctxVan.random = () => 0.1;
    const van = { id: "npc/l11-meg-agent-vance", state: {} };
    const vanChoice = ch2Choices(ctxVan, van, pVan.state).find((c) => c.text.includes("[Speech 45]"));
    expect(vanChoice).toBeDefined();
    handleDialogueCh2(ctxVan, pVan, van, vanChoice.text);
    expect(pVan.state.ch2VanceArchiveTried).toBe(1);
    expect(ch2Choices(ctxVan, van, pVan.state).some((c) => c.text.includes("[Speech 45]"))).toBe(false);
  });

  test("Frequency Lock alternates: IS LAB temp locker relay and Repair 20 + Fuse/Wire jumper", () => {
    // l11-walker-2 spare locker relay
    const p1 = makePlayer({ ch2Q: 3, ch2EchoQ: 2, skl: Array(13).fill(35).join(",") });
    const ctx1 = makeCtx(p1);
    ctx1.random = () => 0;
    const w2 = { id: "npc/l11-walker-2", state: {} };
    const w2Choice = ch2Choices(ctx1, w2, p1.state).find((c) => c.text.includes("[Speech 40]"));
    expect(w2Choice).toBeDefined();
    handleDialogueCh2(ctx1, p1, w2, w2Choice.text);
    expect(p1.state.ch2Relay).toBe(1);
    expect(p1.state.ch2EchoQ).toBe(3);

    // Manual field jumper [Repair 20 + 1 Fuse, 2 Wire]
    const p2 = makePlayer({ ch2Q: 3, ch2EchoQ: 2, skl: "0,0,0,0,0,0,0,5,0,0,0,0,0", scrap: { fuse: 1, wire: 3 } });
    const ctx2 = makeCtx(p2);
    const bench = { id: "l11-lab-bench", feetPosition: { x: -25.2, y: 1.02, z: 34.85 }, state: { kind: "lab-signal-bench" } };
    dropEars.press({ ...ctx2, self: bench }, { by: p2.id });
    expect(p2.state.ch2SignalDecoded).toBe(1);
    expect(p2.state.ch2EchoDone).toBe(1);
    expect(p2.state.scrap.fuse).toBeUndefined();
    expect(p2.state.scrap.wire).toBe(1);
  });

  test("Wait for the Tone alternates: Survival 30 / Hardiness 6 satchel bypass and Vance turn-in", () => {
    const satchelObj = { id: "l11-sunderland-satchel", feetPosition: { x: -30.9, y: 0.1, z: 8.7 }, state: { kind: "sunderland-satchel" } };

    // Survival 30 bypass (15 base + 20 = 35 survival)
    const pSurv = makePlayer({ skl: "0,0,0,0,0,0,0,0,0,0,0,20,0" });
    dropEars.press({ ...makeCtx(pSurv), self: satchelObj }, { by: pSurv.id });
    expect(pSurv.state.ch2RunnerData).toBe(1);
    expect(pSurv.state.ch2ToneQ).toBe(3);

    // Hardiness 6 pry + turn-in at Vance
    const pHard = makePlayer({ attr: "6,5,5,5,5,5,5" });
    const ctxHard = makeCtx(pHard);
    dropEars.press({ ...ctxHard, self: satchelObj }, { by: pHard.id });
    expect(pHard.state.ch2RunnerData).toBe(1);
    expect(pHard.state.ch2ToneQ).toBe(3);

    const vance = { id: "npc/l11-meg-agent-vance", state: {} };
    const turnIn = ch2Choices(ctxHard, vance, pHard.state).find((c) => c.text.includes("stride log"));
    expect(turnIn).toBeDefined();
    handleDialogueCh2(ctxHard, pHard, vance, turnIn.text);
    expect(pHard.state.ch2ToneDone).toBe(1);
    expect(pHard.state.ch2Prep).toBe(1);
  });

  test("Level ! corridor clip past corridorStartZ without lrunIntroDone forces intro instead of skipping", async () => {
    const { tick: lrunSimTick } = await import("../places/levelrun/sim.js");
    const p = makePlayer({ ch2Q: 5 });
    p.feetPosition = { x: 0, y: 0.1, z: -10 }; // Past CORRIDOR.corridorStartZ (-5.5) without lrunIntroDone
    const ctx = makeCtx(p, { "lrun-intake-floor": { id: "lrun-intake-floor" } });
    ctx.place.state.seeded = 1;
    ctx.place.players = [p];
    lrunSimTick(ctx);
    expect(p.state.lrunCut?.phase).toBe("intro");
    expect(ctx.place.state.chase.active).toBe(false);
  });
});
