# Adding a level

Every level is one place: `places/<name>/config.yaml` (sky, fog, spawn point) + `places/<name>/sim.js` (what it lays and runs).

## The shared kit (use it, don't copy it)
- `scripts/lib/level-kit.js`
  - `keepPeople(ctx, ids, spawn)`: named NPCs come back home an hour after dying (`meg.yml respawn`).
  - `every(ctx, key, ms)`: throttle slow work inside `tick`.
- Smashed props and looted containers refill after an hour on their own (`lib/breakables.js`, `breakables.yml propRegrowMinutes`). Tag a prop `breakable` with `state: { mat, hp }`; tag a container `container` with `state: { items: "a,b" }`.
- Loot pools: `scripts/lib/loot.js`. Creature routing: a `scripts/lib/maze*path.js` per grid.
- Doors between levels: `scripts/level-door.js` trigger + a paired arrival marker id (`l6-from-l7` ↔ `l7-from-l6`). Every level needs a way in and a way out.

## A new level's sim.js
```js
import { keepPeople, every } from "../../scripts/lib/level-kit.js";
const V = 1; // bump to re-lay the level
export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); }      // geometry, props, doors, lights
  if (every(ctx, "people", 5000)) keepPeople(ctx, Object.keys(PEOPLE), spawnPerson);
}
```

## Numbers live in data
Tuned numbers go in `scripts/lib/data/*.yml`, never inline: respawn time, regrow time, loot odds, creature caps.
