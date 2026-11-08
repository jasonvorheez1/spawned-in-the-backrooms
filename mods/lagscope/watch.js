// LAGSCOPE watch: rides every player's body (mod.json attach "player"). The work lives in lib/watch.js.
import { onSpawn as spawnHook, update as tickHook, onInput as inputHook } from "./lib/watch.js";
export function onSpawn(ctx) { return spawnHook(ctx); }
export function update(ctx) { return tickHook(ctx); }
export function onInput(ctx, input) { return inputHook(ctx, input); }
