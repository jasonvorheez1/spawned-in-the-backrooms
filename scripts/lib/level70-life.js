// Level 70 "life" layer. lay(ctx) builds it once per version (ctx.place.state.v70life), tick(ctx) runs each sim tick (1 s).
// The people of Froidetown (residents, River Guard, Carnifices of Gelu), what they do at each stop of their rounds, and the beasts' rows (stepped by scripts/l70-foes.js).
import { SPOT, NPC } from "./level70.js";
import { legs } from "./level70-nav.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { F } from "../l70-foes.js";
export const V = 3;
export const M = {
  froidling: { id: "/cdn/value.e0f92de3c91a51d13d955a5f18b0ebb02e61aab925729be60816dcd684d80ca3.glb", forward: "+x" },
  deathrat70: { id: "/cdn/value.5eab5f42c4c7fdce53c51e1b8f7853c3d4c5b87ae279382dbf976d10a38263b5.glb", forward: "+x" },
  blade: "/cdn/value.a8cfabf0d01cc861caaed21698d7a5effde319bd13e7cd400aa4a63e57fef3f1.glb",
  shovel: "/cdn/value.eb724a76bd16097a5f616f6bc9f6f5267a4a8cb43f616824d14e71cb68eeb626.glb", rod: "/cdn/value.540b3610c23860a7131ea26b9885ca1e2504191a3674280633f4651f2b5956c8.glb", firewood: "/cdn/value.115a094884c3dbdf23da630432dec2b7825fa33881a35de4308fd89ab76ada0e.glb", bench: "/cdn/value.3ab361d2b595004161aee889b2721dbe184120d32f253f2d150b77704e8e50b0.glb",
};
const FIRE = `fx
pop flame rate=flick(.45,.2)*40 on=disc(.2) life=.5..0.9 v=up(1.4)+cone(22)*(.3..0.7) size=.2..0.38 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=3 on=disc(.2) life=.7..1.4 v=up(2.2)+cone(30)*(.4..1.2) size=.02..0.05 acc=curl(.8)+grav()*.45+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop glow n=1 at=disc(.2).c(.5) glo=fire()*(#flame/28)~ r=light(<1,.55,.24>,$glo*26,11)`;
const FIRES = [{ id: "market", x: 5.5, z: -66 }, { id: "dock", x: 9.5, z: -125.5 }, { id: "camp", x: -93, z: -79 }];
const ACT = { warm: { clip: "cdn/clip-warming-hands-over-fire-loop.glb" }, sweep: { clip: "cdn/clip-shovelling-snow-loop.glb", prop: "shovel" }, haul: { clip: "cdn/clip-pickup.glb", prop: "firewood" },
  fish: { clip: "cdn/clip-ice-fishing-jigging-rod-loop.glb", prop: "rod" }, tend: { clip: "cdn/clip-talk-loop.glb" }, speak: { clip: "cdn/clip-talk-loop.glb" }, sit: { clip: "cdn/clip-sit-floor-loop.glb", full: true }, watch: { clip: "cdn/clip-salute.glb" }, chant: { clip: "cdn/clip-magic-spell-casting-loop.glb" } };
const S = (x, z, dwell, act, look) => ({ x, y: 0, z, dwell, ...(act ? { act } : {}), ...(look ? { look: { x: look[0], y: 1.2, z: look[1] } } : {}) });
const PARKA = (top, hat, scarf, bottom = "#2b2f38") => ({ topw: "padjacket", top, botw: "pants", bottom, shoes: "boots", hat: "beanie", hatc: hat, neck: "scarf", neckc: scarf });
const ROBE = (top) => ({ topw: "hoodie", top, botw: "pants", bottom: "#9aa7b3", shoes: "boots", neck: "cape", neckc: "#dfe8ee" });
// id, name, role, faction, sex, look, stops, barks, greeting
const PEOPLE = [
  [NPC.pm, "Prime Minister Ada Larsson", "prime minister", "froid", "f", PARKA("#7a1f2b", "#e8e2d0", "#c9a23a"), [S(34, -75.5, 40, "speak", [34, -80]), S(31.5, -78.5, 14, "speak", [28, -78])], ["Order, please. Sorry. Order.", "The pipes are a file on my desk. A cold one.", "Motion to be warm carries, eh."], "Welcome to Parliament. Sorry about the draft, the whole building is one."],
  [NPC.trader, "Odell", "scrap trader", "froid", "m", PARKA("#3d5a3a", "#b5532a", "#6b6f78"), [S(-3.2, -72, 45, "tend", [0, -72]), S(-3.6, -69.6, 12, "tend", [0, -70])], ["Scrap, wire, one good boot. Sorry, just the one.", "Everything here fell off something nicer.", "No refunds. I'll feel bad about it though."], "Have a look, no rush. Sorry about the prices, it's the cold."],
  [NPC.guard, "Sergeant Ines", "River Guard sergeant", "froid", "f", PARKA("#1f3a5c", "#1f3a5c", "#d8d2c0", "#1c2530"), [S(4.4, -126.4, 6, "watch", [6, -140]), S(1, -124, 6, null, [-10, -140]), S(10, -123.5, 10, "warm", [9.5, -125.5])], ["River's holding. Ice is thick as a ministry report.", "Eyes on the treeline, please and thank you.", "If it howls, that's ours. If it chitters, shout."], "River Guard. Mind the ice, and sorry in advance if we yell."],
  [NPC.elder, "Noah Marinerson", "elder", "froid", "m", PARKA("#5a4632", "#8a8f99", "#7a1f2b", "#3a3128"), [S(4.2, -66.4, 90, "sit", [5.5, -66]), S(6.6, -67.2, 25, "warm", [5.5, -66])], ["Back when the pipes sang, you could skate to work.", "My knees say minus forty. They are never wrong.", "Sit a spell. The fire doesn't charge."], "Pull up some snow, friend. Sorry there's no chair."],
  ["l70-npc-pierrette", "Pierrette Dubois", "street sweeper", "froid", "f", PARKA("#c46a1b", "#e8e2d0", "#2f6a66"), [S(2.6, -58, 4, "sweep", [0, -58]), S(-2.8, -50, 9, "sweep", [0, -50]), S(2.4, -43, 9, "sweep", [0, -43]), S(-2.4, -64, 8, "sweep", [0, -64])], ["Sorry, just shovelling. Again. Forever.", "It snows, I shovel, it apologizes. Kidding. It never does.", "Watch your step there, bud."], "Oh, sorry, am I in your way? I'm always in somebody's way."],
  ["l70-npc-gord", "Gord Tremblay", "woodcutter", "froid", "m", PARKA("#8a2a22", "#20242b", "#20242b", "#3b3f2e"), [S(-20, -72.5, 4, "haul", [-24, -72]), S(6.6, -65, 9, "haul", [5.5, -66]), S(8.6, -124.6, 9, "haul", [9.5, -125.5])], ["Birch burns hot. Spruce burns rude.", "Sorry, coming through with a log.", "Wood's free. Carrying it is extra."], "Need wood? I've got wood. Sorry, that's the whole pitch."],
  ["l70-npc-maple", "Maple-Anne Kowalski", "stall keeper", "froid", "f", PARKA("#6a3d7a", "#d9a7c4", "#e8e2d0"), [S(3.2, -75.2, 5, "tend", [0, -75]), S(-2.4, -79.6, 14, "tend", [0, -77]), S(6.4, -67.6, 12, "warm", [5.5, -66])], ["Tea's frozen. It's a tea popsicle now. Two backdollars.", "Take a mitt. I only found the one, sorry.", "You look cold. Everyone looks cold. Still."], "Hi there! Sorry, the kettle froze to the table again."],
  ["l70-npc-doug", "Doug Okpik", "ice fisher", "froid", "m", PARKA("#2d5d7a", "#c9a23a", "#8a2a22", "#2a2a2a"), [S(1.5, -131.5, 5, "fish", [1.5, -140]), S(9, -124, 12, "warm", [9.5, -125.5]), S(2.2, -70, 12, "tend", [0, -72]), S(1.5, -131.5, 40, "fish", [1.5, -140])], ["Nothing biting. Fish are polite like that.", "Caught a boot once. Odell bought it.", "Shh. Sorry. Shh."], "Fishing's slow, eh. Sorry, were you hoping for good news?"],
  ["l70-npc-bev", "Honourable Bev Sinclair", "member of parliament", "froid", "f", PARKA("#3a3f55", "#7a1f2b", "#e8e2d0"), [S(30.5, -81.5, 4, "speak", [34, -76.4]), S(1.8, -73.6, 14, "tend", [0, -72]), S(21, -80, 5)], ["I'd like to table a motion about my toes.", "Point of order. Sorry. It's cold.", "With respect, and I mean it, brr."], "Member for Kelpie North. Sorry, I have to say that every time."],
  ["l70-guard-1", "Constable Wren", "River Guard", "froid", "m", PARKA("#1f3a5c", "#1f3a5c", "#d8d2c0", "#1c2530"), [S(-2.5, -118, 4, "watch", [-20, -130]), S(2.5, -102, 6, "watch", [10, -100]), S(-2, -88, 6)], ["Quiet night. Sorry, shouldn't have said that.", "Patrol's patrol.", "Stay on the street after dark, eh."], "Evening. River Guard. Sorry to bother you by standing here."],
  ["l70-guard-2", "Constable Hale", "River Guard", "froid", "f", PARKA("#1f3a5c", "#d8d2c0", "#1f3a5c", "#1c2530"), [S(12, -127, 4, "watch", [12, -140]), S(-4, -127.5, 8, "watch", [-10, -140]), S(8.5, -123.6, 10, "warm", [9.5, -125.5])], ["Saw tracks. Small ones. Three sets.", "Ice held a truck last week. Past tense.", "Keep your hood up."], "River Guard. You're fine, I'm just looking at you professionally."],
  ["l70-guard-3", "Constable Baptiste", "River Guard", "froid", "m", PARKA("#1f3a5c", "#20242b", "#c9a23a", "#1c2530"), [S(2.6, -38, 4, "watch", [-20, -30]), S(-2.6, -20, 6, "watch", [20, -22]), S(2.6, -56, 6)], ["Suburb's gone quiet. Wrong kind of quiet.", "Sorry, routine check of the street. It's still a street.", "Froidlings hate a fire. Remember that."], "Kelpie Street patrol. All good here, sorry for the uniform."],
  [NPC.carn, "Hierophant Vael", "hierophant", "gelu", "m", ROBE("#dfe8ee"), [S(-96, -85.6, 60, "chant", [-96, -82]), S(-94.5, -84.5, 20, "chant", [-93, -79])], ["Gelu keeps what it takes.", "Warmth is a loan. The frost collects.", "You shiver. Good. You are listening."], "You walked far to be this cold. Speak."],
  ...[[-91, -84], [-99, -79], [-90, -77.5], [-98.5, -86]].map(([x, z], i) => ["l70-gelu-" + (i + 1), ["Acolyte Rime", "Acolyte Hoar", "Acolyte Sleet", "Acolyte Firn"][i], "carnifex", "gelu", i % 2 ? "f" : "m", ROBE(["#d2dde6", "#c4d2de", "#e3ebf0", "#cbd6dc"][i]),
    [S(x, z, 14, "chant", [-93, -79]), S(x + (i % 2 ? -9 : 10), z + (i < 2 ? 9 : -8), 8), S(-78 + i, -80 + i * 2, 8)], ["The thaw is a lie.", "Blades stay sharp in the cold.", "Leave the fire alone.", "Gelu sees your breath."], "The Hierophant speaks for us. Go to him."]),
];
const FACTION = { froid: "Kingdom of Froidetown", gelu: "Carnifices of Gelu" };
export const PACKS = [
  { id: "burns", kind: "froidling", n: 3, x: -52, z: -26 }, { id: "east", kind: "froidling", n: 3, x: 62, z: -30 }, { id: "iceshed", kind: "froidling", n: 3, x: -60, z: -64 },
  { id: "garage", kind: "deathrat70", n: 5, x: 45, z: -29 }, { id: "hotel", kind: "deathrat70", n: 5, x: 45, z: -91 },
];
const BOX = { froidling: { min: { x: -0.62, y: 0, z: -0.62 }, max: { x: 0.62, y: 1.1, z: 0.62 } }, deathrat70: { min: { x: -0.45, y: 0, z: -0.45 }, max: { x: 0.45, y: 0.5, z: 0.45 } } };
const foeId = (pk, i) => `l70-${pk.kind === "froidling" ? "froid" : "rat"}-${pk.id}-${i}`;
function foe(ctx, pk, i) {
  const K = F[pk.kind], a = (i / pk.n) * 6.283, x = pk.x + Math.cos(a) * 1.6, z = pk.z + Math.sin(a) * 1.6, id = foeId(pk, i);
  if (ctx.place.objects[id]) ctx.destroy(id);
  return ctx.spawn(id, { tags: ["moths", "l70foe", pk.kind], feetPosition: { x, z, y: { terrain: 0.05 } }, rotation: { yaw: (a * 57.3 + 90) % 360 }, model: { ...M[pk.kind] }, layout: { box: BOX[pk.kind] },
    scale: 0.92 + ((i * 37) % 17) / 100, physics: { body: "character", collider: "capsule" }, state: { ...npcState(ctx, "rat", K.hp, { xp: pk.kind === "froidling" ? 40 : 14 }), kind: pk.kind, name: K.name, pack: pk.id, n: i, home: { x: pk.x, y: 0, z: pk.z } } });
}
function round(stops) { // walk the nav graph between the things they do
  const out = [];
  stops.forEach((s, i) => { out.push(s); const nx = stops[(i + 1) % stops.length]; if (Math.hypot(nx.x - s.x, nx.z - s.z) > 26) for (const n of legs(s, nx).slice(1, -1)) out.push({ x: n.x + (i % 2 ? 2 : -2), y: 0, z: n.z, dwell: 0 }); });
  return out;
}
export function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  for (const f of FIRES) sp("l70-fire-" + f.id, { tags: ["l70-fire", "fire"], feetPosition: { x: f.x, z: f.z, y: { terrain: 0.02 } }, fx: { script: FIRE }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-campfire-crackle-loop.mp3", gain: 0.22, loop: true, spatial: true, maxDistance: 16 },
    children: M.firewood ? [0, 1, 2].map((k) => ({ feetPosition: { x: Math.cos(k * 2.1) * 0.28, y: -0.05, z: Math.sin(k * 2.1) * 0.28 }, rotation: { yaw: k * 120 + 20, roll: 8 }, model: M.firewood, layout: { box: { min: { x: -0.35, y: 0, z: -0.35 }, max: { x: 0.35, y: 0.42, z: 0.35 } } }, castShadow: false })) : [] });
  if (M.bench) [[7.4, -68.6, -60], [-4.6, -63, 90], [11.5, -127.5, 200]].forEach(([x, z, yaw], i) => sp("l70-bench-" + i, { tags: ["l70-bench"], feetPosition: { x, z, y: { terrain: 0 } }, rotation: { yaw }, model: { id: M.bench, forward: "+x" }, layout: { box: { min: { x: -0.95, y: 0, z: -0.95 }, max: { x: 0.95, y: 0.95, z: 0.95 } } }, physics: { body: "static", collider: "mesh" } }));
  for (const [id, name, role, faction, sex, look, stops, barks, line] of PEOPLE) {
    const rounds = round(stops), guard = /Guard/.test(role), cult = faction === "gelu";
    sp(id, { tags: ["npc", "l70-folk", faction], feetPosition: { x: stops[0].x, z: stops[0].z, y: { terrain: 0.05 } }, rotation: { yaw: 180 }, physics: "character",
      ...critterSpec(npcLook(id, { sex, ...look }, guard ? "guard" : "wanderer", guard || cult ? 14 : 8)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name, role, faction, factionName: FACTION[faction], voice: id.replace(/^l70-(npc-)?/, "l70-"), home: { x: stops[0].x, z: stops[0].z }, rounds, ri: 0, line, l70barks: barks, essential: Object.values(NPC).includes(id), ...npcState(ctx, guard || cult ? "agent" : "survivor", guard || cult ? 120 : 80) } });
    const props = {};
    for (const a of new Set(stops.map((s) => s.act).filter(Boolean))) { const pr = ACT[a]?.prop; if (pr && M[pr] && !props[pr]) props[pr] = ctx.spawn(`${id}-${pr}`, { parent: id, attachment: { bone: "RightHand" }, visible: false, castShadow: false, model: M[pr], layout: { box: pr === "firewood" ? { min: { x: -0.25, y: 0, z: -0.25 }, max: { x: 0.25, y: 0.5, z: 0.25 } } : { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: pr === "shovel" ? 1.3 : 0.7, z: 0.6 } } } }); }
    if (role === "carnifex") props.blade = ctx.spawn(`${id}-blade`, { parent: id, attachment: { bone: "RightHand" }, model: M.blade, layout: { box: { min: { x: -0.4, y: 0, z: -0.4 }, max: { x: 0.4, y: 0.8, z: 0.4 } } }, castShadow: false });
    const o = ctx.getObject(id); if (o) o.state.l70props = props;
  }
  for (const pk of PACKS) for (let i = 0; i < pk.n; i++) foe(ctx, pk, i);
  sp("l70-foe-mgr", { tags: ["l70-mgr"], audience: "all", feetPosition: { x: 0, y: 0, z: -40 }, behavior: "scripts/l70-foes.js" });
  // the Studio's shelf: every model this layer made
  const s = ctx.world.state.m3d ?? {}, mine = [["m-l70-froidling", "Froidling", M.froidling.id, "+x"], ["m-l70-deathrat", "White Death Rat", M.deathrat70.id, "+x"], ["m-l70-iceblade", "Gelu ice blade", M.blade, "-z"], ["m-l70-shovel", "Snow shovel", M.shovel, "-z"], ["m-l70-rod", "Ice fishing rod", M.rod, "-z"], ["m-l70-firewood", "Birch firewood", M.firewood, "-z"], ["m-l70-bench", "Snowed park bench", M.bench, "+x"]].filter((r) => r[2]);
  const ids = new Set(mine.map((r) => r[0]));
  ctx.world.state.m3d = { ...s, items: [...(s.items ?? []).filter((it) => !ids.has(it.id)), ...mine.map(([id, name, url, forward]) => ({ id, kind: "model", name, prompt: name + ", Level 70 Froidetown", by: "savi", made: ctx.world.date, spec: { model: { id: url, forward } }, turn: 0, from: [], how: { tool: "Tripo text-to-model v3.1-20260211 + rig", inputs: name, steps: "PBR, 20-40k faces, fitted to true size by layout box" } }))] };
}
const live = new Map(), gone = new Map();
export function tick(ctx) {
  const now = ctx.now(), players = ctx.place.players; if (!players.length) return;
  const folk = ctx.query({ tags: ["l70-folk"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  for (const r of folk) {
    const st = r.state, m = live.get(r.id) ?? {}; live.set(r.id, m);
    if (st.dead || (st.hp ?? 1) <= 0) { if (m.act) { m.act = null; r.anim.l70 = null; } continue; }
    const stop = st.rounds?.[(st.ri ?? 0) % st.rounds.length], p = r.feetPosition;
    const calm = !st.hitBy?.at || now - st.hitBy.at > 20000;
    const at = stop?.act && calm && Math.hypot(stop.x - p.x, stop.z - p.z) < 1.4 ? stop.act : null;
    if (at !== (m.act ?? null)) {
      const A = at ? ACT[at] : null, was = m.act ? ACT[m.act] : null; m.act = at;
      r.anim.l70 = A ? { clip: A.clip, loop: /-loop/.test(A.clip) ? "loop" : "once", weight: 4, blendIn: 0.4, blendOut: 0.4, ...(A.full ? {} : { mask: { from: "Spine" } }) } : null;
      const props = st.l70props ?? {};
      if (was?.prop && props[was.prop] && was.prop !== A?.prop) { const o = ctx.getObject(props[was.prop]); if (o) o.visible = false; }
      if (A?.prop && props[A.prop]) { const o = ctx.getObject(props[A.prop]); if (o) o.visible = true; }
    }
    if (now > (m.barkAt ?? (m.barkAt = now + 6000 + ctx.random() * 20000)) && st.l70barks?.length) {
      m.barkAt = now + 24000 + ctx.random() * 26000;
      if (players.some((q) => Math.hypot(q.feetPosition.x - p.x, q.feetPosition.z - p.z) < 11)) ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.05, z: p.z }, text: st.l70barks[Math.floor(ctx.random() * st.l70barks.length)], color: "#ffe9b8", size: 0.5, lifetime: 3.6 }, { audience: { nearby: p, radius: 16 } });
    }
  }
  // the Kingdom and the Carnifices do not share a street
  const alive = folk.filter((r) => !r.state.dead && (r.state.hp ?? 1) > 0), K = alive.filter((r) => r.state.faction === "froid" && /Guard/.test(r.state.role ?? "")), G = alive.filter((r) => r.state.faction === "gelu");
  for (const a of K) for (const b of G) if (Math.hypot(a.feetPosition.x - b.feetPosition.x, a.feetPosition.z - b.feetPosition.z) < 14) {
    if (now - (a.state.hitBy?.at ?? -1e9) > 8000) a.state.hitBy = { id: b.id, at: now };
    if (now - (b.state.hitBy?.at ?? -1e9) > 8000) b.state.hitBy = { id: a.id, at: now };
  }
  // a pack comes back fifteen minutes after its last body is gone, when nobody is near to see it
  for (const pk of PACKS) for (let i = 0; i < pk.n; i++) {
    const id = foeId(pk, i);
    if (ctx.place.objects[id]) { gone.delete(id); continue; }
    if (!gone.has(id)) gone.set(id, now);
    else if (now - gone.get(id) > 900000 && !players.some((q) => Math.hypot(q.feetPosition.x - pk.x, q.feetPosition.z - pk.z) < 60)) { foe(ctx, pk, i); gone.delete(id); }
  }
}
