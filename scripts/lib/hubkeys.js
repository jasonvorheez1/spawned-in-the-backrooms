// Level Keys: player.state.hubKeys = { <place>: count }. One key, one door, one trip (the wiki: the key is gone once used).
import { KEY_NAMES, doorOfKey, doorById, doorFront } from "./thehub.js";
export const keysOf = (s) => Object.entries(s?.hubKeys ?? {}).filter(([, n]) => n > 0);
export const hasKey = (s, place) => (s?.hubKeys?.[place] ?? 0) > 0;
export function giveKey(ctx, who, place) { const s = who.state; s.hubKeys = { ...(s.hubKeys ?? {}), [place]: (s.hubKeys?.[place] ?? 0) + 1 }; s.notice = { text: "Level Key taken. It is heavier than it looks.", at: ctx.now() }; }
export function spendKey(who, place) { const s = who.state, n = (s.hubKeys?.[place] ?? 0) - 1, k = { ...(s.hubKeys ?? {}) }; if (n > 0) k[place] = n; else delete k[place]; s.hubKeys = k; }
// keys are never labelled by level: a key is told apart by its bow, the same mark its door wears
export const keyLabel = (place) => "Level Key";
export const keyDoor = (place) => { const id = doorOfKey(place); return id ? doorById(id) : null; };
export const keyDoorFront = (place) => { const d = keyDoor(place); return d ? doorFront(d) : null; };
export { KEY_NAMES };
