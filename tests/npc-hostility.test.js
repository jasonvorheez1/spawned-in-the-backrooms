import { expect, mock, test } from "bun:test";

let blocked = false;
mock.module("builtin/physics", () => ({ raycast: () => blocked ? { id: "wall" } : null }));
const { assaulted, forgiveTick, hostileReason, recordIncident } = await import("../scripts/lib/forgive.js");
const { HOUR_MS } = await import("../scripts/lib/clock.js");

function scene() {
  const npc = (id, faction, x) => ({ id, feetPosition: { x, y: 0, z: 0 }, state: { faction, name: id } });
  const victim = npc("victim", "meg", 1), ally = npc("ally", "meg", 2), outsider = npc("outsider", "bntg", 3);
  const player = { ...npc("player", null, 0), session: {} };
  const other = npc("other", null, 0);
  const rows = [victim, ally, outsider];
  let now = 10000;
  const ctx = { self: player, world: { state: {} }, now: () => now, query: () => rows,
    getObject: id => rows.find(n => n.id === id) };
  return { ctx, victim, ally, outsider, player, other, advance: ms => { now += ms; } };
}

test("an assault alerts only allies who see it and only against the attacker", () => {
  const { ctx, victim, ally, outsider, player, other } = scene();
  blocked = true;
  assaulted(ctx, victim, player);
  expect(hostileReason(ctx, victim, player)).toBeNull();
  assaulted(ctx, victim, player);
  blocked = false;
  expect(hostileReason(ctx, victim, player)).toBe("assault");
  expect(hostileReason(ctx, ally, player)).toBeNull();
  assaulted(ctx, ally, other);
  assaulted(ctx, ally, other);
  expect(hostileReason(ctx, victim, other)).toBe("assault");
  expect(hostileReason(ctx, outsider, other)).toBeNull();
  expect(hostileReason(ctx, ally, player)).toBeNull();
});

test("theft stays personal and old copied grudges do not trigger combat", () => {
  const { ctx, victim, ally, player } = scene();
  recordIncident(ctx, victim, player, "theft");
  ally.state.angry = { [player.id]: true };
  ally.state.nerve = "frenzied";
  expect(hostileReason(ctx, victim, player)).toBe("theft");
  expect(hostileReason(ctx, ally, player)).toBeNull();
  forgiveTick(ctx);
  expect(ally.state.angry[player.id]).toBeUndefined();
});

test("surrender and an hour of peace clear incidents while faction hostility persists", () => {
  const { ctx, victim, ally, outsider, player, advance } = scene();
  recordIncident(ctx, victim, player, "assault");
  recordIncident(ctx, ally, player, "murder");
  player.state.sheathed = true;
  player.state.sheathAt = ctx.now() + 200;
  player.state.rep = { bntg: -100, survivors: -100 };
  advance(1600);
  forgiveTick(ctx);
  expect(hostileReason(ctx, victim, player)).toBeNull();
  expect(hostileReason(ctx, ally, player)).toBe("murder");
  expect(hostileReason(ctx, outsider, player)).toBe("reputation");
  expect(hostileReason(ctx, { id: "wanderer", state: { faction: "wanderer" } }, player)).toBeNull();
  ctx.world.state.clockSkip += HOUR_MS;
  ctx.world.state.clockSkip = HOUR_MS;
  advance(800);
  forgiveTick(ctx);
  expect(hostileReason(ctx, ally, player)).toBeNull();
  expect(hostileReason(ctx, outsider, player)).toBe("reputation");
});
