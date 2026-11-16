import { kitPass } from "../../scripts/lib/usable-kit.js";
// Level 1.1 "Corrupted Corridor": lays the hall, its posts, caches, the Tunnel Gang's hut and the cordon, keeps the people
// and the entities, and tells each walker which sector they are standing in (scripts/lib/level1c.js is the plan).
// The door, its sign and the arrival marker are fixed rows in cells/x0z0.scene.
import { keepPeople, every } from "../../scripts/lib/level-kit.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { rollItemL1 } from "../../scripts/lib/loot.js";
import { symbolSvg } from "../../scripts/lib/thehub.js";
import { workbenchSpec, ammobenchSpec, ensureBenches } from "../../scripts/lib/benches.js";
import { MODEL as SMILER, SCALE as SMILER_SCALE, EYES } from "../../scripts/l6-smiler.js";
import { stealerModel } from "../../scripts/lib/stealer-body.js";
import { recordIncident, incidentOf } from "../../scripts/lib/forgive.js";
import { applySector } from "../../scripts/lib/level1c-fx.js";
import { questTick1c } from "../../scripts/lib/level1c-quest.js";
import { S2, S3, S4, END, VOID_END, BEACON, HW, CHUNK, CHUNKS, sectorAt, floorY, ceilY, centre, halfW, bay, hash, DATA as D } from "../../scripts/lib/level1c.js";
export const cadence = "500ms";
const V = 1; // bump to re-lay the level
const T = ["l1c"];
const M = { crate: "/cdn/value.96f48b56e826ebb5fd584d269b08f2272040ab5d50589b2e04101b00f31d82a2.glb", tent: "/cdn/value.876d02a55c4b5fe879189ef5684d6e5d4836e9e5f6b7295f7e9b0b85ad9f7b58.glb", cot: "/cdn/value.7c6ab929e07fc61864842584ca2d254442f6dc31bfa7d2e2b9e4e3f48588f485.glb", table: "/cdn/value.c015312d6391f45684bfd1e30ad93c9391f659d879584af998cf53decc1613de.glb", stove: "/cdn/value.330d65cefe10f77c51d0fea1858662db291a4746b272dfdc2f81d21c681479f7.glb", bags: "/cdn/value.3ef438addb021fb2564e48689de4b5281d9464d3a65b502624bd0244ce8cad87.glb", pallet: "/cdn/value.e55e3090a6f8a13ae4db1cc993f62b0f07ee7a16a6c05c0fccde459bf7f1d9f8.glb",
  radio: "/cdn/value.f1226f58e269ddcf3e7ad202f86321f7e4d1e85c80fc9c48e05de310ca179c89.glb", chair: "/cdn/value.43409c9170eee8570170bc2e51c135fc29bb79c0455bc055066382edcccd96df.glb", gen: "/cdn/value.80d2ced5ed0ef62f2d773415d1cba7f0691d479e734b5866f1ce463bb6861c96.glb", drum: "/cdn/value.de68d3453156f6d0341dc0143da17f0a5f60f2da731a9b018363a51fcf233712.glb", cone: "/cdn/value.a551b5000627f75d0d6595406211bf3c968f4ec63f676742b66ef4c667374d92.glb",
  locker: "/cdn/value.ac588f5447d2ddb6addaef77cb3bf255a2d108fb0c5a29bb77a6566622a25b60.glb", pack: "/cdn/value.791caacc394ad1207d2f95fd9acea541c7baff44abdc9e272f2bf77b6a6550d9.glb", phone: "/cdn/value.b561d5052cd200bcc0924967e95a1d80511130c3f4288980d47d710d0df29394.glb",
  wraith: "/cdn/value.eb08a17daca3dd58ef7443988210386a71c47eff5171c4ee0966914de67aef45.glb", rupture: "/cdn/value.8709ee762a810c77faf46388e91f800d9dd5580b8fd29d41453db36e4e45f30a.glb", aid: "/cdn/value.717a0b61a989c8e04c272424d3cdcf374d1f29997321713f41f99b996a0ead14.glb",
  hound: "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb" };
const SIZE = { crate: [0.63, 0.6, 0.77], tent: [4.6, 3.3, 4.6], cot: [2.0, 0.6, 2.0], table: [1.6, 1.4, 1.6], stove: [0.75, 1.0, 0.75], bags: [1.6, 1.0, 0.5], pallet: [1.3, 1.4, 1.3], radio: [0.34, 0.2, 0.17], chair: [0.48, 0.86, 0.52], gen: [0.84, 0.72, 0.72], drum: [0.6, 0.9, 0.6], cone: [0.36, 0.5, 0.36], locker: [0.9, 0.62, 0.62], pack: [0.42, 0.55, 0.3], phone: [0.3, 0.55, 0.2], wraith: [0.9, 1.7, 0.6], rupture: [1.4, 2.4, 0.35], aid: [0.5, 0.6, 0.16] };
const RUST = { texture: "cdn/texture-rusted-corrugated-steel-shutter.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.6 0.05 50)", metalness: 0.6, roughness: 0.6 };
const WARM = "oklch(0.85 0.12 75)", COLD = "oklch(0.96 0.02 230)", PINK = "oklch(0.93 0.07 350)";
const fit = ([w, h, d]) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const Y = (x, z = 0) => floorY(x, z);

function put(ctx, id, m, x, z, yaw = 0, o = {}) {
  return ctx.spawn(id, { tags: T, feetPosition: { x, y: o.y ?? Y(x, z), z }, rotation: { yaw }, model: { id: M[m] }, layout: fit(SIZE[m]), physics: o.solid === false || m === "tent" ? undefined : { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 60 }, ...(o.extra ?? {}) });
}
function lamp(ctx, id, x, y, z, color, intensity, distance, range = 70) {
  ctx.spawn(id, { tags: T, feetPosition: { x, y, z }, visibleRange: { max: range }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } });
}
// a searchable supply crate
function crate(ctx, id, x, z, yaw, items, o = {}) {
  ctx.spawn(id, { tags: ["l1c", "container", "breakable"], feetPosition: { x, y: (o.y ?? Y(x, z)), z }, rotation: { yaw }, model: { id: M.crate }, layout: fit(SIZE.crate), physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 45 },
    state: { name: o.name ?? "Supply Crate", mat: "wood", hp: 40, maxHp: 40, items: items.join(","), ...(o.lock ? { lock: o.lock } : {}) } });
}
const loot = (ctx, n) => Array.from({ length: n }, () => rollItemL1(ctx));
// a board bolted to a wall. yaw 0 faces south (+Z), 180 north, 90 west
function board(ctx, id, x, y, z, yaw, w, h, lines, o = {}) {
  const ink = o.ink ?? "#1d1a14", bg = o.bg ?? "rgba(235,225,190,.94)";
  const k = (w / 1.1) * 0.85; // a board's face is about 1000 px to the metre: sizes below are written for a 1.1 m plate
  const html = lines.map(([t, p0, wt]) => [t, Math.round(p0 * k), wt]).map(([t, px, wt]) => `<div style="font-size:${px}px;font-weight:${wt ?? 400};line-height:1.05;letter-spacing:${px > 120 ? 2 : 5}px;text-align:center">${t}</div>`).join("");
  ctx.spawn(id, { tags: T, feetPosition: { x, y, z }, rotation: { yaw }, castShadow: false, visibleRange: { max: 45 }, primitive: { kind: "box", width: w, height: h, depth: 0.03 }, material: { color: o.plate ?? "oklch(0.78 0.04 85)", metalness: 0.4, roughness: 0.6 },
    ui: `<div face="front" class="w-full h-full flex flex-col items-center justify-center" style="font-family:monospace;color:${ink};border:14px solid ${ink};box-sizing:border-box;background:${bg};padding:20px">${html}</div>` });
}
function note(ctx, id, x, y, z, yaw, name, text) {
  ctx.spawn(id, { tags: ["l1c", "usable"], feetPosition: { x, y, z }, rotation: { yaw }, castShadow: false, visibleRange: { max: 25 }, primitive: { kind: "box", width: 0.3, height: 0.4, depth: 0.012 }, material: { color: "oklch(0.92 0.03 95)", roughness: 0.9 }, behavior: "scripts/l1c-use.js",
    state: { kind: "note", name, verb: "Read", info: "Pinned up by Team Corridor.", text, c: { x, y: y + 0.2, z } } });
}
function mark(ctx, id, x, y, z, rot, seed, w) { ctx.spawn(id, { tags: T, feetPosition: { x, y, z }, rotation: rot, vector: symbolSvg(seed, w), visibleRange: { max: 30 } }); }
function seam(ctx, id, x, side) {
  const z = side * (halfW(x) - 0.06), y = Y(x, z), col = "oklch(0.75 0.3 330)";
  ctx.spawn(id, { tags: T, feetPosition: { x, y, z: z - side * 0.08 }, rotation: { yaw: side > 0 ? 180 : 0 }, model: { id: M.rupture }, layout: fit(SIZE.rupture), castShadow: false, visibleRange: { max: 50 },
    fx: { script: `fx\nlocal\npop tear rate=22 on=box(1.2,2.2,.05).c(1.1) life=.15..0.5 size=.04..0.14 asp=6 col=hdr(2.4,.5,2)|hdr(.4,2.4,.6) a=1>0 sz=$size r=sprite(soft-disc,add)` },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-flicker-buzz.mp3", gain: 0.3, loop: true, spatial: true, maxDistance: 10 } });
  ctx.spawn(id + "-t", { tags: T, feetPosition: { x, y, z: z - side * 0.25 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.1, height: 2.2, depth: 0.5 }, visible: false, behavior: "scripts/l1c-use.js", state: { kind: "seam" } });
  lamp(ctx, id + "-l", x, y + 1.4, z - side * 0.6, col, 2.2, 6, 40);
}

// ---- people ----
const MEG = (o) => ({ species: "human", botw: "cargo", bottom: "#4a5a3a", shoes: "boots", ...o });
const PEOPLE = {
  "l1c-meg-ines": { name: "Ines · Team Corridor Lead", faction: "meg", role: "captain", level: 8, gun: "carbine", at: [45.5, -5.6], face: 0, look: MEG({ sex: "f", topw: "padjacket", top: "#4a5a3a", hat: "cap", hatc: "#b6e04a", expr: "calm" }) },
  "l1c-meg-tobias": { name: "Tobias · Surveyor", faction: "meg", role: "agent", level: 5, at: [50.6, -4.2], face: 30, look: MEG({ sex: "m", topw: "megjacket", top: "#b6e04a", eyew: "glasses", expr: "beam" }) },
  "l1c-meg-wren": { name: "Wren · Line Medic", faction: "meg", role: "medic", level: 6, at: [119.5, -2.9], face: 0, look: MEG({ sex: "f", topw: "longsleeve", top: "#eef2f0", neck: "scarf", neckc: "#b6e04a", expr: "smile" }) },
  "l1c-meg-osei": { name: "Osei · Quartermaster", faction: "meg", role: "quarter", level: 6, gun: "shotgun", at: [125.4, 3.1], face: 180, look: MEG({ sex: "m", topw: "megjacket", top: "#b6e04a", hat: "beanie", hatc: "#7a3a2a", expr: "grin" }) },
};
// the Tunnel Gang: six, hungry, scrap in their hands. Not hostile until you cross their line without leave.
const SCRAP = (o) => ({ species: "human", shoes: "boots", botw: "pants", bottom: "#3a332c", ...o });
const GANG = {
  "l1c-gang-blade": { name: "Blade · Tunnel Gang", gun: "knife", at: [313.2, 2.2], face: 90, hp: 70, look: SCRAP({ sex: "m", topw: "padjacket", top: "#5a2e22", hat: "padbeanie", hatc: "#2a2420", neck: "scarf", neckc: "#8a2a1c", expr: "calm" }) },
  "l1c-gang-marrow": { name: "Marrow · Tunnel Gang", gun: "crowbar", at: [319.4, -2.4], face: 0, hp: 35, look: SCRAP({ sex: "m", topw: "hoodie", top: "#4a4a44", expr: "calm" }) },
  "l1c-gang-1": { name: "Stitch · Tunnel Gang", gun: "crowbar", at: [312.6, -1.6], face: 90, hp: 45, look: SCRAP({ sex: "f", topw: "jacket", top: "#6a5a3a", hat: "beanie", hatc: "#3a3a30", expr: "calm" }) },
  "l1c-gang-2": { name: "Coil · Tunnel Gang", gun: "knife", at: [315.8, 3.9], face: 120, hp: 45, look: SCRAP({ sex: "m", topw: "sweater", top: "#3f4a52", expr: "calm" }) },
  "l1c-gang-3": { name: "Pidge · Tunnel Gang", gun: "knife", at: [322.6, 1.4], face: 60, hp: 40, look: SCRAP({ sex: "f", topw: "hoodie", top: "#5c3f52", expr: "calm" }) },
  "l1c-gang-4": { name: "Ruck · Tunnel Gang", gun: "crowbar", at: [325.6, -0.6], face: 90, hp: 50, look: SCRAP({ sex: "m", topw: "padjacket", top: "#39402e", hat: "cap", hatc: "#2a2420", expr: "calm" }) },
};
function person(ctx, id) {
  const g = PEOPLE[id] ?? GANG[id]; if (!g) return;
  const gang = !!GANG[id], [x, z] = g.at;
  ctx.spawn(id, { tags: ["npc", "l1c-npc"], feetPosition: { x, y: Y(x, z) + 0.1, z }, rotation: { yaw: g.face }, physics: "character",
    ...critterSpec(npcLook(id, g.look, gang ? "wanderer" : "meg", gang ? 1 : g.level, gang ? "scavenger" : g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: g.name, role: gang ? "scavenger" : g.role, faction: gang ? "tunnelgang" : "meg", faceYaw: g.face, home: { x, z }, ...(gang ? { hp: g.hp, maxHp: g.hp, level: 1 } : {}) } });
  if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}
const PEOPLE_IDS = [...Object.keys(PEOPLE), ...Object.keys(GANG)];

// ---- entities ----
function foe(ctx, n) {
  const [kind, x] = D.foes[n], K = D.kinds[kind], z = centre(x) + (hash(n, 3, 9) - 0.5) * halfW(x) * 1.2, y = Y(x, z);
  const body = kind === "smiler" ? { model: SMILER, scale: SMILER_SCALE, fx: { script: EYES } }
    : kind === "hound" ? { model: { id: M.hound } }
    : kind === "warped" ? { model: { id: M.hound }, scale: { x: 0.75, y: 2.2, z: 1.5 }, children: [{ feetPosition: { x: 0, y: 0.9, z: 0 }, light: { kind: "point", color: "oklch(1 0 0)", intensity: 0.8, distance: 4, shadow: { enabled: false } } }] }
    : kind === "stealer" ? { model: stealerModel(true) }
    : { model: { id: M.wraith }, layout: fit(SIZE.wraith), children: [{ feetPosition: { x: 0, y: 1.4, z: 0 }, light: { kind: "point", color: "oklch(1 0 0)", intensity: 0.6, distance: 3, shadow: { enabled: false } } }] };
  ctx.spawn("l1c-foe-" + n, { tags: ["l1c-foe", "l8-hostile", "l1c-" + kind], feetPosition: { x, y: y + (K.fly ? 1.3 : 0), z }, rotation: { yaw: 90 }, physics: { body: "kinematic", collider: "capsule" }, castShadow: false, visibleRange: { max: 90 }, ...body,
    state: { hp: K.hp, maxHp: K.hp, name: K.name, kind, xp: K.xp, n, home: { x, z }, brain: K } });
}
function keepFoes(ctx) {
  const s = ctx.place.state, now = ctx.now(), dead = s.l1cDead ?? {};
  if (!ctx.place.objects["l1c-foes"]) ctx.spawn("l1c-foes", { tags: T, feetPosition: { x: S3, y: 0, z: 0 }, behavior: "scripts/l1c-foes.js" });
  D.foes.forEach((_, n) => { if (!ctx.place.objects["l1c-foe-" + n] && now - (dead[n] ?? -1e12) > D.respawnMin * 60000) foe(ctx, n); });
}

// ---- the lay, a piece a tick ----
const LAY = [
  ...[0, 1, 2, 3].map((k) => (ctx) => { if (!k) for (const o of ctx.query({ tags: ["l1c"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id); // the old lay goes in the same tick the first stretch of hall comes back
    for (let c = k * 5; c < Math.min(CHUNKS, k * 5 + 5); c++) { const sec = sectorAt(c * CHUNK + CHUNK / 2);
    ctx.spawn("l1c-hall-" + c, { tags: T, feetPosition: { x: c * CHUNK + CHUNK / 2, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, visibleRange: { max: sec === 4 ? 420 : 200 },
      primitive: { kind: "scripted", script: "scripts/level1c-geo.js", params: { c } }, material: { roughness: 0.8, emissiveIntensity: sec === 4 ? 3.2 : sec === 2 ? 1.8 : 2.6 } }); } }),
  layLights, laySector1, laySector2, layGang, laySector3, laySector4,
];
function layLights(ctx) {
  for (let x = 3; x < S2; x += 16) lamp(ctx, "l1c-tube-" + x, x, ceilY(x) - 0.4, 0, COLD, 7, 17);
  for (let x = S2 + 3, k = 0; x < S3 - 30; x += 16, k++) lamp(ctx, "l1c-tube-" + x, x, ceilY(x) - 0.4, 0, ["oklch(0.9 0.2 145)", COLD, "oklch(0.8 0.22 330)", COLD][k % 4], 6, 16);
  // Sector 3: no fixtures. Light stands in pools with nothing above it
  [[346, 1], [368, -1], [386, 1], [403, -1], [424, 1], [441, -1], [458, 1]].forEach(([x, sd], k) => lamp(ctx, "l1c-pool-" + k, x, 1.9, sd * (halfW(x) - 0.5), PINK, 11, 7.5, 60));
  for (let x = S4 + 8; x < END; x += 22) lamp(ctx, "l1c-s4-" + x, x, ceilY(x) - 0.5, centre(x), "oklch(1 0 0)", 2.6, 14, 90);
}
function laySector1(ctx) {
  board(ctx, "l1c-sign-in", 5.5, 1.5, -HW + 0.02, 0, 1.7, 1.0, [["M.E.G. TEAM CORRIDOR", 62], ["LEVEL 1.1", 190, 700], ["ONE HALL · ONE DOOR · WALK IN, WALK BACK", 44]]);
  // supply crates: thick by the door, thin by Sector 2
  for (let k = 0; k < 26; k++) { const x = 8 + 152 * Math.pow(k / 26, 1.7), side = k % 2 ? 1 : -1; if ((x > 38 && x < 56) || (x > 112 && x < 132)) continue;
    crate(ctx, "l1c-crate-" + k, x, side * (HW - 0.48), side > 0 ? 0 : 180 + (hash(k, 1, 1) - 0.5) * 24, loot(ctx, 1 + Math.floor(hash(k, 2, 1) * 2)));
    if (hash(k, 4, 1) < 0.3) crate(ctx, "l1c-crate-" + k + "b", x + 0.1, side * (HW - 0.5), 90, loot(ctx, 1), { y: 0.6 }); }
  // Post One: a room let into the north wall
  const b = bay("post1"), z0 = -HW, zb = -HW - b.depth;
  board(ctx, "l1c-sign-p1", b.from - 1.4, 2.0, z0 + 0.02, 0, 1.5, 0.7, [["M.E.G. TEAM CORRIDOR", 60], ["POST ONE", 180, 700], ["STAFFED · REPORT IN", 56]]);
  put(ctx, "l1c-p1-table", "table", 46.5, zb + 1.3, 0); put(ctx, "l1c-p1-radio", "radio", 46.4, zb + 1.3, 20, { y: 0.78, solid: false, extra: { behavior: "scripts/world-radio.js", state: { station: 0, gain: 0.3, reach: 8 } } });
  put(ctx, "l1c-p1-chair", "chair", 46.6, zb + 2.2, 180, { extra: { tags: ["l1c", "seat"] } });
  put(ctx, "l1c-p1-cot0", "cot", 41.4, zb + 1.2, 90); put(ctx, "l1c-p1-cot1", "cot", 41.4, zb + 3.4, 90);
  put(ctx, "l1c-p1-gen", "gen", 52.6, zb + 0.8, 0, { extra: { audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-generator-idle-hum-loop.mp3", gain: 0.1, loop: true, spatial: true, maxDistance: 10 } } });
  put(ctx, "l1c-p1-bags0", "bags", b.from + 1.0, z0 - 0.5, 0); put(ctx, "l1c-p1-bags1", "bags", b.to - 1.0, z0 - 0.5, 0);
  crate(ctx, "l1c-p1-crate0", 52.4, zb + 2.6, 10, loot(ctx, 2)); crate(ctx, "l1c-p1-crate1", 53.0, zb + 3.5, 80, loot(ctx, 2));
  lamp(ctx, "l1c-p1-lamp", 47, 2.9, zb + 2.6, WARM, 5, 11);
  note(ctx, "l1c-p1-note", 49.5, 1.4, zb + 0.03, 0, "Duty board", "TEAM CORRIDOR · STANDING ORDERS. 1: Sector 1 is ours and it is safe. Keep it that way. 2: Sector 2, travel in pairs; if a stretch repeats, do not turn round. 3: Sector 3, nobody alone, nobody without a lamp, and the lamp will not help. 4: The cordon is the end of the line. 5: There is no Sector 5. There is a light.");
  ensureBenches(ctx, [["l1c-p1-workbench", workbenchSpec({ x: 44.2, y: 0, z: zb + 0.5 }, { yaw: 0, name: "Post One Workbench" })]]);
  // Post Two: the hall goes wide for sixteen metres
  board(ctx, "l1c-sign-p2", 112.4, 2.0, -HW + 0.02, 0, 1.5, 0.7, [["M.E.G. TEAM CORRIDOR", 60], ["POST TWO", 180, 700], ["MEDIC · STORES · LAST STAFFED POST", 50]]);
  put(ctx, "l1c-p2-tent", "tent", 120, -1.9, 90); for (const sx of [-1, 1]) ctx.spawn("l1c-p2-tentwall" + sx, { tags: T, feetPosition: { x: 120, y: 0, z: -1.9 + sx * 1.6 }, primitive: { kind: "box", width: 4.2, height: 1.9, depth: 0.4 }, visible: false, physics: "static" });
  put(ctx, "l1c-p2-cot", "cot", 120.2, -2.2, 0); put(ctx, "l1c-p2-stove", "stove", 116.2, 3.3, 30);
  ctx.spawn("l1c-p2-fire", { tags: T, feetPosition: { x: 116.2, y: 0.75, z: 3.3 }, light: { kind: "point", color: "oklch(0.8 0.15 60)", intensity: 3, distance: 7, shadow: { enabled: false } }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-fire-crackle-loop.mp3", gain: 0.2, loop: true, spatial: true, maxDistance: 12 } });
  put(ctx, "l1c-p2-table", "table", 125.6, 3.6, 0); put(ctx, "l1c-p2-pallet", "pallet", 128.2, 3.4, 15);
  for (const [i, x, z, yaw] of [[0, 114.9, -3.9, 0], [1, 116.5, -3.9, 0], [2, 127.6, -3.9, 0], [3, 129.2, -3.9, 0], [4, 129.5, 2.0, 90]]) put(ctx, "l1c-p2-bags" + i, "bags", x, z, yaw);
  crate(ctx, "l1c-p2-crate0", 123.4, 3.75, 0, loot(ctx, 2)); crate(ctx, "l1c-p2-crate1", 124.1, 3.7, 12, loot(ctx, 2), { y: 0 }); crate(ctx, "l1c-p2-crate2", 123.8, 3.72, 95, loot(ctx, 1), { y: 0.6 });
  lamp(ctx, "l1c-p2-lamp", 122, 3.0, 2.4, WARM, 5, 12);
  ensureBenches(ctx, [["l1c-p2-ammobench", ammobenchSpec({ x: 118.6, y: 0, z: 3.7 }, { yaw: 180, name: "Post Two Reloading Bench" })]]);
  board(ctx, "l1c-sign-s2", S2 - 3.5, 1.5, -HW + 0.02, 0, 1.7, 1.0, [["SECTOR 2 AHEAD", 150, 700], ["THE FLOOR IS NOT LEVEL", 62], ["THE COLOURS ARE NOT TRUE", 62], ["IF A STRETCH REPEATS, KEEP WALKING", 50]], { ink: "#8a2a1c" });
}
function laySector2(ctx) {
  // the stretch you have seen before: the same board, the same tipped crate, the same mark on the floor
  [174, 215, 246, 280].forEach((x, k) => { const w = halfW(x), y = Y(x, -1);
    board(ctx, "l1c-rep-b" + k, x, y + 1.5, -w + 0.02, 0, 1.2, 0.6, [["POST THREE", 150, 700], ["40 m AHEAD", 90]], { ink: "#3a4048" });
    ctx.spawn("l1c-rep-c" + k, { tags: T, feetPosition: { x: x + 1.6, y: y + 0.12, z: -w + 0.6 }, rotation: { yaw: 23, roll: 18 }, model: { id: M.crate }, layout: fit(SIZE.crate), physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 45 } });
    mark(ctx, "l1c-rep-m" + k, x + 0.4, y + 0.012, 0.3, { yaw: 30, pitch: -90 }, 4242, 1.8); });
  // marks nobody reads, on wall, floor and ceiling
  for (let k = 0; k < 22; k++) { const x = S2 + 5 + ((S3 - S2 - 40) * (k + hash(k, 5, 5) * 0.8)) / 22, where = k % 3, w = halfW(x), sd = hash(k, 6, 5) < 0.5 ? -1 : 1, f = Y(x, sd), sz = 0.9 + hash(k, 7, 5) * 1.6;
    if (where === 0) mark(ctx, "l1c-mark-" + k, x, f + 0.9 + hash(k, 8, 5), sd * (w - 0.02), { yaw: sd < 0 ? 0 : 180 }, 900 + k * 37, sz);
    else if (where === 1) mark(ctx, "l1c-mark-" + k, x, f + 0.014, sd * 0.5, { yaw: hash(k, 9, 5) * 360, pitch: -90 }, 900 + k * 37, sz);
    else mark(ctx, "l1c-mark-" + k, x, ceilY(x) - 0.02, sd * 0.4, { yaw: hash(k, 9, 5) * 360, pitch: 90 }, 900 + k * 37, sz); }
  for (const [k, x, z] of [[0, 190, 1.2], [1, 222, -1.2], [2, 266, 1.1]]) crate(ctx, "l1c-s2-crate" + k, x, z, hash(k, 3, 3) * 90, loot(ctx, 2));
  // the first cache: a room off the south wall, down in the trough. Nobody home
  const b = bay("cache1"), w = HW, zb = w + b.depth, y = Y(245, 1);
  board(ctx, "l1c-sign-c1", b.from - 1.2, y + 1.9, w - 0.02, 180, 1.4, 0.7, [["M.E.G. TEAM CORRIDOR", 60], ["CACHE ONE", 170, 700], ["UNSTAFFED · TAKE WHAT YOU NEED", 50]]);
  crate(ctx, "l1c-c1-crate0", 241.2, zb - 0.6, 0, loot(ctx, 3), { name: "Cache Crate" }); crate(ctx, "l1c-c1-crate1", 242.1, zb - 0.6, 8, loot(ctx, 3), { name: "Cache Crate" }); crate(ctx, "l1c-c1-crate2", 241.6, zb - 0.62, 92, [...loot(ctx, 2), "bandage"], { name: "Cache Crate", y: y + 0.6 });
  put(ctx, "l1c-c1-cot", "cot", 247.6, zb - 1.3, 90); put(ctx, "l1c-c1-drum", "drum", 249.2, w + 0.8, 0);
  lamp(ctx, "l1c-c1-lamp", 245, y + 2.2, w + 2.6, "oklch(0.85 0.2 145)", 3, 9);
  note(ctx, "l1c-c1-note", 244.6, y + 1.3, zb - 0.03, 180, "Note on the cache wall", "CACHE ONE. Unstaffed since the floor moved. Take what you need and leave the cot. If the wall by the next lamp looks like it is tearing, it is: stay off it unless you want Level 1 in a hurry, and it takes a piece of you on the way. And don't feed the six at the hut. They've a toll and a story about a light. — Tobias");
  seam(ctx, "l1c-seam-0", D.seam.x, D.seam.side);
  // a few pipes hang over the service gap before the hut: you have to look for it
  for (const [i, dy] of [[0, 1.5], [1, 1.9], [2, 2.4]]) ctx.spawn("l1c-gap-pipe" + i, { tags: T, feetPosition: { x: 299, y: dy, z: HW + 0.25 + i * 0.12 }, primitive: { kind: "box", width: 2.3, height: 0.14, depth: 0.14 }, material: { color: i === 1 ? "oklch(0.45 0.09 40)" : "oklch(0.55 0.02 240)", metalness: 0.7, roughness: 0.5 }, castShadow: false, visibleRange: { max: 40 } });
  lamp(ctx, "l1c-gap-lamp", 317, 2.2, 6.9, "oklch(0.8 0.2 330)", 1.6, 9, 40);
}
function layGang(ctx) {
  const sheet = (id, x, y, z, w, h, d, yaw = 0, solid = true) => ctx.spawn(id, { tags: T, feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "box", width: w, height: h, depth: d }, material: RUST, physics: solid ? "static" : undefined, castShadow: false, visibleRange: { max: 60 } });
  // the barricade across the room at their line, with one gap they stand in
  const gx = D.gangLine;
  sheet("l1c-g-wall0", gx, 0, -1.95, 0.12, 1.5, 6.1); sheet("l1c-g-wall1", gx, 0, 4.0, 0.12, 1.5, 2.0);
  put(ctx, "l1c-g-drum0", "drum", gx - 0.5, -3.6, 0); put(ctx, "l1c-g-drum1", "drum", gx - 0.5, -0.9, 40); put(ctx, "l1c-g-drum2", "drum", gx - 0.5, 4.3, 80);
  put(ctx, "l1c-g-pallet", "pallet", gx + 0.9, -3.9, 10);
  board(ctx, "l1c-g-sign", gx - 0.1, 1.55, -2.2, 90, 2.4, 1.0, [["TOLL", 230, 800], ["THE LIGHT IS OURS · WE FOUND IT", 60]], { ink: "#e8e0d0", bg: "rgba(60,26,20,.95)", plate: "oklch(0.3 0.05 40)" });
  // the hut: scrap sheet on three sides, open to the room
  sheet("l1c-g-hut-n", 320.5, 0, -4.8, 7, 2.5, 0.1); sheet("l1c-g-hut-w", 317, 0, -3.2, 0.1, 2.5, 3.2); sheet("l1c-g-hut-e", 324, 0, -3.2, 0.1, 2.5, 3.2);
  sheet("l1c-g-hut-roof", 320.5, 2.5, -3.1, 7.3, 0.08, 3.6, 0, false); sheet("l1c-g-hut-f0", 317.6, 0, -1.6, 1.2, 2.5, 0.1); sheet("l1c-g-hut-f1", 323.4, 0, -1.6, 1.2, 2.5, 0.1);
  put(ctx, "l1c-g-cot0", "cot", 318.2, -4.0, 0); put(ctx, "l1c-g-cot1", "cot", 322.9, -4.0, 0); put(ctx, "l1c-g-stove", "stove", 320.4, -2.6, 0);
  ctx.spawn("l1c-g-fire", { tags: T, feetPosition: { x: 320.4, y: 0.75, z: -2.6 }, light: { kind: "point", color: "oklch(0.78 0.16 55)", intensity: 4, distance: 9, shadow: { enabled: false } }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-fire-crackle-loop.mp3", gain: 0.2, loop: true, spatial: true, maxDistance: 12 } });
  crate(ctx, "l1c-g-stash", 320.6, -4.3, 0, ["ration", "ration", ...loot(ctx, 3)], { name: "Tunnel Gang Stash", lock: "lockpick:30" });
  board(ctx, "l1c-g-wallmap", 320.5, 1.2, -4.72, 0, 1.6, 1.0, [["SECTOR 5", 150, 800], ["a light that does not move", 56], ["= a door that is held open", 56], ["WE GO WHEN WE ARE SEVEN", 56]], { ink: "#2a1d14", bg: "rgba(210,190,150,.95)" });
  lamp(ctx, "l1c-g-lamp", 314, 2.6, 2.4, "oklch(0.85 0.14 70)", 4, 11);
  board(ctx, "l1c-sign-s3", S3 + 2.5, 1.5, -halfW(S3 + 2.5) + 0.02, 0, 1.6, 1.0, [["SECTOR 3", 170, 700], ["LAMPS DO LITTLE HERE", 62], ["SMILERS · DO NOT STAND STILL", 56], ["THE HOSPITAL SMELL IS NORMAL", 50]], { ink: "#8a2a1c" });
}
function laySector3(ctx) {
  const b = bay("cache2"), w = halfW(403), zb = -w - b.depth;
  board(ctx, "l1c-sign-c2", b.from - 1.0, 1.9, -w + 0.02, 0, 1.3, 0.7, [["M.E.G. TEAM CORRIDOR", 60], ["CACHE TWO", 170, 700], ["UNSTAFFED", 60]]);
  crate(ctx, "l1c-c2-crate0", 399.4, zb + 0.6, 0, [...loot(ctx, 3), "battery"], { name: "Cache Crate" }); crate(ctx, "l1c-c2-crate1", 400.3, zb + 0.6, 6, loot(ctx, 3), { name: "Cache Crate" }); crate(ctx, "l1c-c2-crate2", 406.6, zb + 0.7, 80, loot(ctx, 2), { name: "Cache Crate" });
  put(ctx, "l1c-c2-cot", "cot", 405.2, zb + 2.9, 90); put(ctx, "l1c-c2-gen", "gen", 407.0, -w - 0.9, 0);
  note(ctx, "l1c-c2-note", 403, 1.3, zb + 0.03, 0, "Note on the cache wall", "CACHE TWO. The generator died the day we set it down and so did every lamp after it. Light here comes when it likes, in patches, from nothing. Stand in one and you can be seen. Stand out of one and you can't see. The smell is antiseptic; nobody has found what is being kept clean. Cordon is seventy metres on. Do not go past the cordon. — Ines");
  for (const [k, x, z] of [[0, 352, 0.4], [1, 437, -0.8]]) crate(ctx, "l1c-s3-crate" + k, x, z * Math.min(1, halfW(x) - 0.5), 30, loot(ctx, 2));
  seam(ctx, "l1c-seam-1", 436, -1);
  // the cordon: the end of the line
  const cx = 474, cw = halfW(cx);
  for (const [i, z] of [[0, -cw + 0.8], [1, -cw + 2.4], [2, cw - 0.8]]) put(ctx, "l1c-cd-bags" + i, "bags", cx, z, 90);
  for (const [i, z] of [[0, 0.3], [1, 1.2]]) put(ctx, "l1c-cd-cone" + i, "cone", cx - 0.2, z, i * 40);
  for (const y of [0.55, 1.05]) ctx.spawn("l1c-cd-tape" + y, { tags: T, feetPosition: { x: cx, y, z: 0.75 }, primitive: { kind: "box", width: 0.02, height: 0.07, depth: 3.0 }, material: { color: "oklch(0.86 0.17 95)", emissive: "oklch(0.86 0.17 95)", emissiveIntensity: 1.2 }, castShadow: false, visibleRange: { max: 50 } });
  board(ctx, "l1c-cd-sign", cx - 0.35, 1.25, -cw + 2.1, 90, 2.6, 1.5, [["M.E.G. CORDON", 170, 800], ["SECTOR 4 BEYOND THIS LINE", 70, 700], ["BLACK AND WHITE ONLY · THE HALL MOVES", 52], ["SOME OF THE FLOOR IS ONLY A PICTURE OF FLOOR", 52], ["THEY GATHER · NOBODY HAS WALKED BACK", 52], ["DO NOT CROSS", 130, 800]], { ink: "#8a1c12", bg: "rgba(240,236,220,.96)" });
  ctx.spawn("l1c-cordon-log", { tags: ["l1c", "usable"], feetPosition: { x: cx - 0.05, y: 1.0, z: -cw + 0.8 }, rotation: { yaw: 90 }, castShadow: false, visibleRange: { max: 40 }, primitive: { kind: "box", width: 0.34, height: 0.24, depth: 0.2 }, material: { color: "oklch(0.7 0.18 55)", roughness: 0.5 }, behavior: "scripts/l1c-use.js",
    state: { kind: "logger", name: "M.E.G. crossing logger", verb: "Read", info: "Counts what crosses the cordon.", c: { x: cx - 0.05, y: 1.1, z: -cw + 0.8 } },
    children: [{ id: "led", feetPosition: { x: 0.1, y: 0.2, z: 0.1 }, primitive: { kind: "sphere", radius: 0.02 }, material: { color: "oklch(0.7 0.25 25)", emissive: "oklch(0.7 0.25 25)", emissiveIntensity: 4 } }] });
  crate(ctx, "l1c-cd-crate", cx - 2.2, cw - 0.6, 0, [...loot(ctx, 2), "bandage"], { name: "Cordon Crate" });
  lamp(ctx, "l1c-cd-lamp0", cx - 2.5, 2.6, -1.2, COLD, 22, 13); lamp(ctx, "l1c-cd-lamp1", cx - 5, 2.6, 1.4, COLD, 16, 12);
}
function laySector4(ctx) {
  // Sector 5: a light. And something standing between you and it, on floor that isn't
  const by = Y(BEACON) + 2.2, bz = centre(BEACON);
  ctx.spawn("l1c-beacon", { tags: T, feetPosition: { x: BEACON, y: by, z: bz }, primitive: { kind: "sphere", radius: 1.1, widthSegments: 20, heightSegments: 14 }, material: { color: "oklch(1 0 0)", emissive: "oklch(1 0 0)", emissiveIntensity: 9 }, castShadow: false, visibleRange: { max: 900 },
    light: { kind: "point", color: "oklch(1 0 0)", intensity: 30, distance: 70, shadow: { enabled: false } } });
  const sx = 716, sy = Y(sx), sz = centre(sx);
  ctx.spawn("l1c-shape", { tags: T, feetPosition: { x: sx, y: sy, z: sz }, primitive: { kind: "cone", radius: 1.0, height: 3.4, radialSegments: 10 }, material: { color: "oklch(0 0 0)", roughness: 1 }, castShadow: false, visibleRange: { max: 500 },
    children: [{ feetPosition: { x: 0, y: 3.1, z: 0 }, primitive: { kind: "sphere", radius: 0.42 }, material: { color: "oklch(0 0 0)", roughness: 1 }, castShadow: false }] });
  ctx.spawn("l1c-endcap-glow", { tags: T, feetPosition: { x: VOID_END - 0.3, y: Y(VOID_END - 1), z: centre(VOID_END - 1) }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 5, height: 5, depth: 0.05 }, material: { color: "oklch(1 0 0)", emissive: "oklch(1 0 0)", emissiveIntensity: 2.5 }, castShadow: false, visibleRange: { max: 900 } });
}

const SAY = ["", "Sector 1 · Team Corridor holds this stretch. Nothing hunts here.", "Sector 2 · The floor is not level and the colours are not true.", "Sector 3 · Your light reaches a few feet and stops. There is a faint smell of antiseptic.", "Sector 4 · Black and white only. Some of the floor is a picture of floor."];
function walkers(ctx) {
  const now = ctx.now(), seen = (ctx.session.l1cSec ??= {}), gang = Object.keys(GANG).map((id) => ctx.place.objects[id]).filter((o) => o && !o.state?.dead && (o.state?.hp ?? 1) > 0);
  for (const p of ctx.place.players) {
    const f = p.feetPosition, s = p.state; if (!f || !s) continue;
    const n = sectorAt(f.x);
    if (seen[p.id] !== n) { const first = seen[p.id] == null; seen[p.id] = n; applySector(p, n); if (!(first && n === 1)) s.notice = { text: SAY[n], at: now }; }
    if (f.x > S4 + 40 && !s.l1cSawLight) { s.l1cSawLight = true; s.notice = { text: "Far down the hall: one steady light. That would be what the gang calls Sector 5.", at: now }; }
    if (f.x < S4 && f.y < floorY(f.x, f.z) - 2.5) { p.feetPosition = { x: f.x, y: floorY(f.x, f.z) + 0.3, z: Math.max(-HW + 0.5, Math.min(HW - 0.5, f.z)) }; p.velocity = { x: 0, y: 0, z: 0 }; continue; } // under the floor west of Sector 4 (the hall was still being laid): stood back on it
    // the floor that was only drawn
    if (f.x >= S4 && f.y < D.voidY && !(s.hp <= 0) && now - (ctx.session["l1cFell" + p.id] ?? -1e9) > 6000) { ctx.session["l1cFell" + p.id] = now; s.hp = 0; s.notice = { text: "That part of the floor was only drawn.", at: now }; }
    // the Tunnel Gang's line
    const inRoom = Math.abs(f.z) < 5.2 && Math.abs(f.y) < 3;
    if (!s.l1cPass && gang.length && inRoom) {
      if (f.x > D.gangLine - 7 && f.x <= D.gangLine && now - (ctx.session["l1cWarn" + p.id] ?? -1e9) > 45000) { ctx.session["l1cWarn" + p.id] = now; s.notice = { text: "Blade: \"That's far enough. Nobody walks through our room for free. Talk to me, or turn round.\"", at: now }; }
      if (f.x > D.gangLine + 0.4 && f.x < D.gangEnd) { s.l1cTrespass = true; for (const g of gang) if (!incidentOf(ctx, g, p)) recordIncident(ctx, g, p, "trespass"); }
    }
  }
  for (const id of Object.keys(seen)) if (!ctx.place.players.some((p) => p.id === id)) delete seen[id];
}
// ---- extras: things to open and things that answer (its own version, so the hall is not re-laid)
const XV = 2;
function searchable(ctx, id, m, x, z, yaw, items, name, mat, o = {}) {
  ctx.spawn(id, { tags: ["l1c", "container", "breakable"], feetPosition: { x, y: o.y ?? Y(x, z), z }, rotation: { yaw }, model: { id: M[m] }, layout: fit(SIZE[m]), physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 40 },
    state: { name, mat, hp: mat === "metal" ? 90 : 25, maxHp: mat === "metal" ? 90 : 25, items: items.join(",") } });
}
function layExtras(ctx) {
  for (const o of ctx.query({ tags: ["l1c-x"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  const zb = -HW - bay("post1").depth;
  searchable(ctx, "l1c-x-locker0", "locker", 43.6, zb + 2.9, 90, loot(ctx, 3), "Team Corridor Footlocker", "metal");
  searchable(ctx, "l1c-x-locker1", "locker", 127.0, -3.5, 0, loot(ctx, 3), "Quartermaster's Footlocker", "metal");
  [[0, 201, 1, 200], [1, 258, -1, 15], [2, 381, 1, 160], [3, 432, -1, 300]].forEach(([k, x, sd, yaw]) =>
    searchable(ctx, "l1c-x-pack" + k, "pack", x, sd * (halfW(x) - 0.45), yaw, loot(ctx, 2), "Wanderer's Backpack", "cloth"));
  [["l1c-x-aid0", 49.2, zb + 0.08, 0], ["l1c-x-aid1", 118.0, -HW + 0.08, 0]].forEach(([id, x, z, yaw]) =>
    searchable(ctx, id, "aid", x, z, yaw, loot(ctx, 2), "First Aid Cabinet", "metal", { y: Y(x, z) + 1.1 }));
  for (const sid of ["l1c-seam-0", "l1c-seam-1"]) { const o = ctx.place.objects[sid]; if (o) { const f = o.feetPosition; ctx.destroy(sid); ctx.destroy(sid + "-t"); ctx.destroy(sid + "-l"); } }
  seam(ctx, "l1c-seam-0", D.seam.x, D.seam.side); seam(ctx, "l1c-seam-1", 436, -1);
  for (const f of ctx.query({ tags: ["l1c-drifter"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(f.id);
  const px = 158, pz = -HW + 0.12;
  ctx.spawn("l1c-x-phone", { tags: ["l1c", "l1c-x", "usable"], feetPosition: { x: px, y: Y(px, pz) + 1.0, z: pz }, rotation: { yaw: 0 }, model: { id: M.phone }, layout: fit(SIZE.phone), castShadow: false, visibleRange: { max: 35 }, behavior: "scripts/l1c-use.js",
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-old-payphone-ringing-muffled-loop.mp3", gain: 0.18, loop: true, spatial: true, maxDistance: 14 },
    state: { kind: "note", name: "Payphone", verb: "Pick up", info: "It rings. There is no wire behind it.",
      text: "A man's voice, close, like he's standing behind you: \"...if Ines is listening, Post Three is gone. Don't send anyone. The hall folded at the green lamp and we walked the same forty metres for a day. Tell Wren I kept the splint. Tell her I'm sorry about the...\" Then the tone. Then nothing.", c: { x: px, y: Y(px, pz) + 1.3, z: pz } } });
  for (const k of ["aid0", "aid1", "locker0", "locker1", "pack0", "pack1", "pack2", "pack3"]) { const o = ctx.place.objects["l1c-x-" + k]; if (o) o.tags = [...o.tags, "l1c-x"]; }
}
export function tick(ctx) {
  if (ctx.place.players?.length) kitPass(ctx, "level1c"); // every usable answers with its own part, sound and light (scripts/lib/data/usable-kit.json)
  const s = ctx.place.state;
  if ((s.builtV ?? 0) >= V && (s.xV ?? 0) < XV) { s.xV = XV; layExtras(ctx); }
  if ((s.builtV ?? 0) < V) { const ph = s.l1cPh ?? 0; LAY[ph](ctx); if (ph + 1 >= LAY.length) { s.builtV = V; delete s.l1cPh; } else s.l1cPh = ph + 1; return; }
  if (!ctx.place.players?.length) return;
  walkers(ctx);
  if (every(ctx, "l1c-quest", 1000)) questTick1c(ctx);
  if (every(ctx, "l1c-people", 5000)) { if (!s.l1cCrew) { s.l1cCrew = true; for (const id of PEOPLE_IDS) if (!ctx.place.objects[id]) person(ctx, id); } else keepPeople(ctx, PEOPLE_IDS, person); keepFoes(ctx); }
}
