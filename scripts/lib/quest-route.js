// Directed crossings players can deliberately use. IDs point to the actual trigger or interactable.
import { EXIT, HALF, cellCenter } from "./maze.js";

const EXITS = {
  main: [
    { to: "level1", id: "main-from-l1", label: "Flickering wall", point: { x: -HALF + 1.1, y: 0, z: cellCenter(EXIT.cx, EXIT.cz).z } },
    { to: "level01", id: "l0-zenith", label: "Keycard hatch", needs: "zenKey" },
    { to: "level02", id: "l0-to-l02", label: "Remodeling Co. door" },
  ],
  level01: [{ to: "main", id: "l01-back", label: "Return hatch" }],
  level02: [{ to: "main", id: "l02-back", label: "Remodeling Co. exit" }],
  level1: [{ to: "main", id: "l1-back" }, { to: "level2", id: "l1-onward" }],
  level2: [{ to: "level1", id: "l2-back" }, { to: "level3", id: "l2-to-l3" }, { to: "level21", id: "l2-to-l21", label: "Upper stairwell" }, { to: "level31", id: "l2-to-l31", label: "Plywood door" }],
  level31: [{ to: "level2", id: "l31-back", label: "Plywood door" }, { to: "level70", id: "l31-to-l70", label: "White door" }],
  level70: [{ to: "level31", id: "l70-back", label: "White door" }],
  level21: [{ to: "level2", id: "l21-down" }, { to: "level8", id: "l21-cave", label: "Cave entrance" }],
  level3: [{ to: "level2", id: "l3-back" }, { to: "gamma", id: "l3-gamma-door" }, { to: "level4", id: "l3-lift", label: "Elevator" }, { to: "level5", id: "l3-lift5", label: "Boiler Room lift" }],
  gamma: [{ to: "level3", id: "gamma-out", label: "Fortress gate" }],
  level4: [{ to: "level3", id: "l4-lift-door", label: "Elevator" }, { to: "level5", id: "l4-stairs-down", label: "Stairs down" }, { to: "level26", id: "l4-fun-poster", label: "Ship poster" }],
  level5: [{ to: "level3", id: "l5-lift3", label: "Elevator" }, { to: "level4", id: "l5-stairs-up", label: "Stairs up" }, { to: "level6", id: "l5-to-l6", label: "Boiler Room bulkhead" }],
  level6: [{ to: "level5", id: "l6-back" }, { to: "level7", id: "l6-to-l7", label: "Stairwell" }, { to: "level61", id: "l6-to-l61", label: "Tripwire" }, { to: "level61", id: "l6-wire-trip", label: "Tripwire" }],
  level61: [{ to: "level6", id: "l61-to-l6" }, { to: "level3", id: "l61-vent-in", label: "Suction vent" }, { to: "level11", id: "l61-to-l11" }],
  level7: [{ to: "level6", id: "l7-back", label: "Stairs up" }, { to: "level8", id: "l7-diving-bell", label: "Diving bell" }],
  level8: [{ to: "level21", id: "l8-to-l21", label: "Cave tunnel" }, { to: "level7", id: "l8-lake-back", label: "Underwater passage" }],
  level10: [
    { to: "level11", id: "l10-road-north", label: "North road" }, { to: "level11", id: "l10-road-south", label: "South road" },
    { to: "level7", id: "l10-lake-deep", label: "Lake opening" }, { to: "level26", id: "l10-fun-poster", label: "Ship poster" },
  ],
  level11: [
    { to: "level61", id: "l11-to-l61" }, { to: "level10", id: "lv10-backroad", label: "Backroad" },
    { to: "level12", id: "l11-win12", label: "Lit window", needs: "know12" },
  ],
  level12: [{ to: "level13", id: "l12-to-l13", label: "Blank door" }],
  level13: [{ to: "main", id: "l13-to-l0", label: "Plain door" }],
  level26: [{ to: "level4", id: "l26-exit", label: "Ship exit" }],
};

const cache = new Map();
function distances(here, goal, state) {
  const key = JSON.stringify([here, goal, !!state.zenKey, !!state.know12]);
  if (cache.has(key)) return cache.get(key);
  const depth = new Map([[goal, 0]]);
  const queue = [goal];
  for (const place of queue) {
    for (const [from, exits] of Object.entries(EXITS)) {
      if (from === here || depth.has(from)) continue;
      if (!exits.some((exit) => exit.to === place && (!exit.needs || state[exit.needs]))) continue;
      depth.set(from, depth.get(place) + 1);
      queue.push(from);
    }
  }
  if (cache.size >= 64) cache.delete(cache.keys().next().value);
  cache.set(key, depth);
  return depth;
}

export function nextQuestExit(ctx, player, goal) {
  const here = player.place ?? ctx.place?.id;
  const exits = EXITS[here], feet = player.feetPosition;
  if (!Array.isArray(exits) || !goal || here === goal || !feet) return null;
  const depth = distances(here, goal, player.state);
  let best = null, bestDistance = Infinity;
  for (const exit of exits) {
    if (exit.needs && !player.state[exit.needs]) continue;
    const remaining = depth.get(exit.to);
    if (remaining == null || (best && remaining + 1 > best.hops)) continue;
    const object = ctx.place?.objects?.[exit.id];
    const point = exit.point ?? object?.worldFeetPosition ?? object?.feetPosition;
    if (!point) continue;
    const distance = Math.hypot(point.x - feet.x, (point.y ?? 0) - (feet.y ?? 0), point.z - feet.z);
    if (!best || remaining + 1 < best.hops || distance < bestDistance) {
      best = { x: point.x, y: point.y ?? 0, z: point.z, exit: exit.id, via: exit.to, label: exit.label, hops: remaining + 1 };
      bestDistance = distance;
    }
  }
  return best;
}
