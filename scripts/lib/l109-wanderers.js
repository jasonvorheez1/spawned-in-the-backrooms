// Level 109 random encounters: frenzied wanderers (Shelly, Nov 14: "frenzied wanderers with various guns as random enemy
// encounters"). Lore: wanderers who stayed too long under 109's neon hum and whatever the rooms let out; they lost the
// thread and kept the guns. They run on the shared NPC brain (scripts/meg-agent.js) with nerve "frenzied" and the hostile
// tag, like Level 8's wretched. The sim calls wandererTick(ctx) every few seconds; numbers below are Savi's picks.
import { raycast } from "builtin/physics";
import { SPAWN } from "./level109.js";
const SAFE = 65; const GRACE_MS = 35000; // review: wanderers stay >60 m from arrival/respawn, and none come within 35 s of anyone arriving
const SAFE_OLD = 45; // no wanderer stands within this of the arrival/respawn point (Savi's pick: a fresh arrival is never ambushed)
const nearSpawn = (p, r = SAFE) => Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) < r;
const T = { corridor: false, every: 70000, jitter: 50000, first: 45000, maxAlive: 4, far: 90, minAhead: 14, maxAhead: 26, packMin: 1, packMax: 3, hp: 85, returnMs: 3600000 }; // Savi's picks
const GUNS = ["pistol", "pistol", "revolver", "revolver", "shotgun", "smg", "coach_gun", "carbine", "lever_rifle"]; // weighted: sidearms common, carbines rare
const NAMES = ["Hollis", "Marta", "Dev", "Pike", "Rosalind", "Teo", "Agnes", "Wim", "Corinne", "Sal", "Odette", "Bram", "Juniper", "Nils"];
const SPECIES = ["bear", "dog", "fox", "wolf", "rabbit", "raccoon", "deer", "otter"];
const SCRUBS = ["#5c7a74", "#4d6a86", "#7a5c6e", "#6b6b52", "#2e3440", "#4a3a2e"];
export const BARKS = {
  spot: ["oh, you're awake too.", "visiting hours are OVER.", "did they let you out? did they let you OUT?", "there's one in the hall. there's one in the hall!", "patient's up. patient's up!"],
  hostile: ["back in your room. BACK IN YOUR ROOM.", "the doors told me about you.", "you opened one. i heard it. i HEARD it.", "lights out, lights out, lights out."],
  hit: ["hah! do it again!", "doesn't hurt. nothing hurts here.", "ow. ow. that's on your chart.", "missed the vein!"],
  kill: ["discharged.", "quiet ward now.", "time of death. whenever."],
  move: ["the hum gets in your teeth.", "thirty doors. thirty-one. thirty.", "don't open them, don't open them.", "who's paging. who keeps paging."],
  death: ["finally... quiet...", "turn the lights... off...", "tell the doctors..."],
  clear: ["gone. good. good.", "more in the walls. always more."],
};
const alive = (ctx) => ctx.query({ tags: ["l109-wanderer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
function spot(ctx, p) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => ctx.random() - 0.5);
  for (const [dx, dz] of dirs) {
    const o = { x: p.x, y: p.y + 1.2, z: p.z };
    const hit = raycast(ctx, o, { x: dx, y: 0, z: dz }, { distance: T.maxAhead + 4, physicsOnly: true, excludeTags: ["player", "pen-foe", "l109-wanderer", "npc"] });
    const free = hit?.distance ?? T.maxAhead + 4;
    if (free < T.minAhead + 2) continue;
    const d = Math.min(free - 2, T.minAhead + ctx.random() * (T.maxAhead - T.minAhead));
    const at = { x: p.x + dx * d, y: p.y + 1.2, z: p.z + dz * d };
    if (nearSpawn(at)) continue;
    const down = raycast(ctx, at, { x: 0, y: -1, z: 0 }, { distance: 3, physicsOnly: true, excludeTags: ["player"] });
    if (!down) continue;
    return { x: at.x, y: down.position.y + 0.15, z: at.z, back: { x: -dx, z: -dz }, side: { x: dz, z: dx } };
  }
  return null;
}
export function wandererTick(ctx) {
  const s = ctx.place.state, now = ctx.now(), ps = ctx.place.players.filter((p) => p.feetPosition && p.feetPosition.y > -3); // B3 stays theirs alone
  const live = alive(ctx);
  // the far and the long-dead go: a body lies an hour (Shelly's rule), a living one walks off when nobody is near
  for (const w of live) {
    const d = Math.min(...ctx.place.players.map((p) => Math.hypot(p.feetPosition.x - w.feetPosition.x, p.feetPosition.z - w.feetPosition.z)), Infinity);
    const dead = w.state?.dead || (w.state?.hp ?? 1) <= 0;
    if (dead) { w.state.diedAt ??= now; if (now - w.state.diedAt > T.returnMs || d > 160) ctx.destroy(w.id); }
    else if (d > T.far) ctx.destroy(w.id);
    else if (nearSpawn(w.feetPosition, SAFE - 5)) ctx.destroy(w.id); // a chase that reaches the arrival point ends there: respawn is never a death loop
  }
  if (!ps.length || !T.corridor) return; // Shelly, Nov 14: they live behind lockpickable doors now (dens below), not out of thin air
  const seen = s.wandSeen ?? {}; let fresh = false; const ids = {};
  for (const p of ps) { ids[p.id] = 1; if (!seen[p.id]) fresh = true; }
  if (fresh || Object.keys(seen).length !== ps.length) s.wandSeen = ids;
  if (fresh) s.wandNext = Math.max(s.wandNext ?? 0, now + GRACE_MS); // a new arrival gets a quiet grace
  if (s.wandNext == null) { s.wandNext = now + T.first; return; }
  if (now < s.wandNext) return;
  const living = live.filter((w) => !w.state?.dead && (w.state?.hp ?? 1) > 0).length;
  s.wandNext = now + T.every + ctx.random() * T.jitter;
  if (living >= T.maxAlive) return;
  const pool = ps.filter((q) => !nearSpawn(q.feetPosition, SAFE) && !q.state?.dead && (q.state?.hp ?? 1) > 0); // a player still at the arrival point is left alone
  if (!pool.length) { s.wandNext = now + 8000; return; }
  const p = pool[Math.floor(ctx.random() * pool.length)], at = spot(ctx, p.feetPosition);
  if (!at) { s.wandNext = now + 8000; return; }
  const n = Math.min(T.maxAlive - living, T.packMin + Math.floor(ctx.random() * (T.packMax - T.packMin + 1)));
  s.wandSeq = (s.wandSeq ?? 0) + 1;
  for (let i = 0; i < n; i++) spawnWanderer(ctx, `l109w-${s.wandSeq}-${i}`, { x: at.x + at.side.x * (i - (n - 1) / 2) * 1.1 + at.back.x * -i * 1.2, y: at.y, z: at.z + at.side.z * (i - (n - 1) / 2) * 1.1 + at.back.z * -i * 1.2 }, at.back);
}
export function spawnWanderer(ctx, id, pos, face, extra = {}) {
  const r = (a) => a[Math.floor(ctx.random() * a.length)];
  const name = r(NAMES), sex = ctx.random() < 0.5 ? "m" : "f";
  Promise.all([import("./critter-model.js"), import("./clothes.js"), import("./stats.js"), import("./weapon-look.js"), import("./npc-gear.js")]).then(([{ critterSpec }, { npcLook }, { npcState }, { weaponBody }, { npcGearLevel, rollNpcWeapon }]) => {
    if (ctx.place.objects[id]) return;
    const look = { species: r(SPECIES), sex, eye: "#e8e4d0" }; // clothes come from the "frenzied" wardrobe (data/clothes.yml): gowns, scrubs, straitjackets
    const stub = { id, tags: ["l109-wanderer"], state: { role: "survivor", faction: "frenzied", nerve: "frenzied" } };
    const lv = npcGearLevel(ctx, stub);
    const arm = extra.arm ?? rollNpcWeapon(ctx, stub, { gearLevel: lv, allowRanged: true, forceArmed: true });
    const yaw = Math.atan2(face.x, face.z) * 180 / Math.PI + 180;
    ctx.spawn(id, {
      audience: "all", tags: ["npc", "l109-wanderer", "l8-hostile", "wretched"], feetPosition: pos, rotation: { yaw }, physics: "character", ...critterSpec(npcLook(id, look, "frenzied", lv)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { ...npcState(ctx, "agent", T.hp), gearLevel: lv, name: `${name} · frenzied wanderer`, role: "survivor", faction: "lightless", factionName: "frenzied wanderers: people Level 109's hum got into", nerve: "frenzied", arm, barks: BARKS,
        rounds: [{ x: pos.x, y: pos.y, z: pos.z, dwell: 20, act: null, look: { x: pos.x + face.x * 10, z: pos.z + face.z * 10 } }], ri: 0, home: { x: pos.x, z: pos.z }, ...extra },
    });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: arm }, ...weaponBody(arm) });
    if (!extra.den) ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-distant-hospital-corridor-man-laughing-hysterically-echo.mp3", position: pos, volume: 0.8, maxDistance: 45 });
  });
}

// ── Dens (Shelly, Nov 14: "the frenzied wanderers should spawn in doors that can be unlocked via lockpick") ──
// A den is a ward, OR, ICU or pharmacy locked from inside. 1-3 armed wanderers wait in it; the door takes a lockpick; once
// picked they see you and come out. A picked den stays open, then fills and locks again an hour later (the world's respawn
// rule). place.state.dens[id] = when it was picked. Numbers are Savi's picks.
export const DEN = { chance: 0.24, types: ["ward", "or", "icu", "pharmacy"], locks: [25, 25, 50, 50, 75], packMin: 1, packMax: 3, refill: 3600000, keepClear: 65 };
const hh = (str, salt) => { let x = (2166136261 ^ salt) >>> 0; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) % 100000) / 100000; };
export function denOf(seed, info) {
  if (!info || !DEN.types.includes(info.type) || info.id === "ns0_0m" || !info.door || nearSpawn(info.door, DEN.keepClear)) return null;
  if (hh(info.id, seed) >= DEN.chance) return null;
  return { lock: DEN.locks[Math.floor(hh(info.id, seed + 7) * DEN.locks.length)], n: DEN.packMin + Math.floor(hh(info.id, seed + 13) * (DEN.packMax - DEN.packMin + 1)) };
}
const bookDen = (ctx, id, v) => { const s = ctx.place.state, b = { ...(s.dens ?? {}) }; if (v === undefined) delete b[id]; else b[id] = v; s.dens = b; };
// the door's lock as it should stand now: "lockpick:N" on a den nobody has picked (or picked over an hour ago), else ""
export function denLock(ctx, seed, info, open) {
  const d = denOf(seed, info); if (!d || open) return "";
  const at = ctx.place.state.dens?.[info.id];
  return at && ctx.now() - at < DEN.refill ? "" : `lockpick:${d.lock}`;
}
// a den room loads: a locked den gets its pack inside, facing the door
export function denLoad(ctx, seed, info, at, faceDoor) {
  const d = denOf(seed, info); if (!d) return;
  const at0 = ctx.place.state.dens?.[info.id];
  if (at0 && ctx.now() - at0 < DEN.refill) return; // picked: whoever was in it is out, or dead
  if (at0) bookDen(ctx, info.id, undefined); // an hour on: it fills and locks again
  for (let i = 0; i < d.n; i++) { const id = `l109w-den-${info.id}-${i}`; if (!ctx.place.objects[id]) spawnWanderer(ctx, id, at(-2 + i * 2.2, 10 + (i % 2) * 3), faceDoor, { den: info.id }); }
}
// each tick: a den door that lost its lock was picked; book it
export function denWatch(ctx, ids) {
  for (const id of ids) { const door = ctx.place.objects["l109d-" + id]; if (door?.state?.denLocked && !door.state.lock) { door.state.denLocked = false; bookDen(ctx, id, ctx.now()); } }
}
// a den room unloads: the pack still shut inside goes with it (and comes back with the room); ones that got out stay out
export function denUnload(ctx, info, insideBox) {
  for (const w of alive(ctx)) if (w.state?.den === info.id && !w.state?.dead && (w.state?.hp ?? 1) > 0 && insideBox(w.feetPosition)) ctx.destroy(w.id);
}
