// Kyoto's house fixtures. Stocked cabinets use the normal loot and storage UI.
import { animate } from "builtin/tween";
import { hands } from "./desk-item.js";
import { startRestPose } from "./field-fixture.js";
import { movePart } from "./prop-part.js";
import { maxHp, maxSan } from "./player.js";
import { canCarry, canCarryAll } from "./lib/stats.js";
import { queuePayout } from "./lib/quests.js";
import { touch178 } from "./lib/level178-quests.js";
import L from "./lib/data/level178.yml";
import SNACKS from "./lib/data/snacks.yml";

export { handsOff } from "./desk-item.js";
const STREAM = `fx
pop water rate=?mobile:30|60 on=disc(.008) life=.22..0.28 v=<0,-0.6,0> acc=grav() size=.01..0.016 col=<.82,.9,1> a=.55 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
const SHOJI = "wooden-shoji-paper-door-sliding-in-wood-track";
const GETA = "cloth:shoes:l178_tabi_geta:f4f1ea";
const KETTLE = "l178-tea-kettle";
const CUP_IDS = ["l178-tea-cup-north", "l178-tea-cup-south"];
const TEA_STEAM = `fx
pop steam burst=7..10 on=disc(.035) life=1.4..2.2 v=up(.09..0.20) size=.035..0.06 col=<.95,.94,.90> a=0>.2:.2>0 sz=$size*(.6>2.4) r=sprite(smoke-puff,alpha)`;

function leaf(ctx, instant) {
  const s = ctx.self.state, id = ctx.self.id + "/leaf", x = s.open ? s.openX : s.closedX;
  if (ctx.getObject(id)) animate(ctx, id, { "feetPosition.x": x }, { duration: instant ? 0.01 : L.shoji.ease, easing: "easeOutCubic" });
}

function sound(ctx, name, volume = 0.4) {
  ctx.emit("playSound", { clip: "cdn/sfx-" + name + ".mp3", position: ctx.self.worldFeetPosition, volume, maxDistance: 8 });
}

function say(ctx, p, text) {
  p.state.notice = { text, at: ctx.now() };
}

function collect(ctx, p, token) {
  const ps = p.state, check = canCarry(ps, token);
  if (!check.ok) { say(ctx, p, check.msg || "Your bag is full."); return false; }
  ps.snacks = { ...ps.snacks, [token]: (ps.snacks?.[token] ?? 0) + 1 };
  ps.pickedAt = ctx.now();
  say(ctx, p, SNACKS[token].name + " · In your bag");
  hands(ctx, p);
  return true;
}

function ovenDoor(ctx, goal) {
  movePart(ctx, ctx.getObject(ctx.self.id + "/prop-motion-door"), goal);
}

function closeOvenAfter(ctx, seconds) {
  const at = ctx.now() + seconds * 1000;
  ctx.self.state.closeAt = at;
  ctx.after(seconds, "closeOven", { at });
}

export function ovenReady(ctx) {
  const s = ctx.self.state;
  if (!s.readyAt || ctx.now() < s.readyAt) return;
  s.verb = "Take toasted onigiri";
  s.info = "Ready to eat or pack";
  ovenDoor(ctx, 1);
}

function useOven(ctx, p) {
  const s = ctx.self.state, ps = p.state, now = ctx.now();
  if (s.readyAt) {
    if (now < s.readyAt) { say(ctx, p, "Toasting · " + Math.ceil((s.readyAt - now) / 1000) + " s"); return; }
    if (!collect(ctx, p, "l178_toasted_onigiri")) return;
    s.readyAt = 0;
    movePart(ctx, ctx.getObject(ctx.self.id + "/prop-motion-light"), 0);
    s.verb = "Toast onigiri";
    s.info = "Requires salmon onigiri";
    closeOvenAfter(ctx, 1.1);
    sound(ctx, "ceramic-bowl-set-on-wooden-table-chopsticks");
    return;
  }
  const rice = ps.snacks?.l178_onigiri ?? 0;
  if (!rice) { say(ctx, p, "Take a salmon onigiri from the refrigerator first."); return; }
  ps.snacks = { ...ps.snacks, l178_onigiri: rice - 1 };
  s.readyAt = now + L.oven.seconds * 1000;
  movePart(ctx, ctx.getObject(ctx.self.id + "/prop-motion-light"), 1);
  s.verb = "Check oven";
  s.info = "Toasting one onigiri";
  ovenDoor(ctx, 1);
  hands(ctx, p);
  closeOvenAfter(ctx, 1);
  ctx.after(L.oven.seconds, "ovenReady");
}

export function closeOven(ctx, { at } = {}) {
  if (ctx.self.state.closeAt === at) ovenDoor(ctx, 0);
}

export function stopTap(ctx, { at } = {}) {
  const s = ctx.self.state;
  if (at != null && at !== s.stopAt) return;
  const id = ctx.self.id + "/stream";
  if (ctx.getObject(id)) ctx.destroy(id);
  s.on = false;
  s.stopAt = 0;
  s.verb = "Fill bottle";
}

function fillBottle(ctx, p) {
  const s = ctx.self.state, sp = L.tap.spout;
  if (s.on) { stopTap(ctx); sound(ctx, "steel-kitchen-tap-lever-click"); return; }
  if ((p.state.snacks?.l178_water ?? 0) >= L.water.carry) {
    say(ctx, p, "You already have " + L.water.carry + " bottles of tap water."); return;
  }
  if (!collect(ctx, p, "l178_water")) return;
  s.on = true;
  s.verb = "Turn off";
  s.stopAt = ctx.now() + L.water.fillSeconds * 1000;
  ctx.spawn("stream", { parent: ctx.self.id, feetPosition: { x: sp[0], y: sp[1], z: sp[2] }, fx: { script: STREAM },
    audio: { clip: "cdn/sfx-kitchen-tap-water-running-into-steel-sink-loop.mp3", loop: true, gain: L.tap.gain, spatial: true, maxDistance: L.tap.maxDistance } });
  sound(ctx, "steel-kitchen-tap-lever-click");
  ctx.after(L.water.fillSeconds, "stopTap", { at: s.stopAt });
}

function takeTowel(ctx, p) {
  const ps = p.state;
  if ((ps.snacks?.l178_towel ?? 0) > 0) { say(ctx, p, "You already have a fresh towel in your bag."); return; }
  if (ctx.now() - (ps.l178towel ?? -1e12) < 60000) { say(ctx, p, "Give the bath attendant a minute."); return; }
  if (collect(ctx, p, "l178_towel")) {
    ps.l178towel = ctx.now();
    sound(ctx, "soft-cotton-towel-unfolding");
  }
}

function teaCups(ctx) {
  return CUP_IDS.map((id) => ctx.getObject(id));
}

function setCup(ctx, cup, full) {
  cup.state.full = full;
  cup.state.verb = full ? "Take tea" : "Check";
  cup.state.info = full ? "Roasted barley tea to drink from Aid" : "Brew a fresh pot at the kettle";
  const surface = ctx.getObject(cup.id + "/tea");
  if (surface) surface.visible = full;
}

export function teaReady(ctx) {
  const s = ctx.self.state;
  if (!s.readyAt || ctx.now() < s.readyAt) return;
  const cups = teaCups(ctx);
  if (cups.some((cup) => !cup)) return;
  s.readyAt = 0;
  s.verb = "Check tea";
  s.info = "Two cups ready to share";
  for (const cup of cups) {
    setCup(ctx, cup, true);
    const tea = ctx.getObject(cup.id + "/tea");
    if (tea) animate(ctx, tea.id, { "scale.x": [0.08, 1], "scale.z": [0.08, 1] }, { duration: 0.55, delay: 0.56, easing: "easeOutQuad" });
  }
  const pot = ctx.getObject(ctx.self.id + "/pot");
  if (pot) animate(ctx, pot.id, {
    "feetPosition.y": [0, 0.09, 0.09, 0],
    "rotation.roll": [0, 30, 30, 0],
  }, { duration: 1.5, easing: "easeInOutSine" });
  ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-water-pour-splash-short.mp3", position: ctx.self.worldFeetPosition, volume: 0.3, maxDistance: 6 });
}

function brewTea(ctx, p) {
  const s = ctx.self.state, ps = p.state;
  if (s.readyAt) {
    teaReady(ctx);
    say(ctx, p, s.readyAt ? "Give the tea a moment to steep." : "Tea's ready. Take a cup from the table.");
    return;
  }
  const cups = teaCups(ctx);
  if (cups.some((cup) => !cup)) return;
  if (cups.some((cup) => cup.state.full)) { say(ctx, p, "There's still tea on the table."); return; }
  const water = ps.snacks?.l178_water ?? 0;
  if (!water) { say(ctx, p, "Fill a bottle at the kitchen tap first."); return; }
  ps.snacks = { ...ps.snacks, l178_water: water - 1 };
  s.readyAt = ctx.now() + L.tea.seconds * 1000;
  s.verb = "Check kettle";
  s.info = "Barley tea is steeping";
  hands(ctx, p);
  const at = ctx.self.worldFeetPosition;
  ctx.emit("fx", { position: { x: at.x, y: at.y + 0.19, z: at.z }, script: TEA_STEAM }, { audience: { nearby: at, radius: 12 } });
  ctx.after(L.tea.seconds, "teaReady");
}

function takeTea(ctx, p) {
  const cup = ctx.self;
  if (!cup.state.full) { say(ctx, p, "Empty. There's a kettle at the end of the table."); return; }
  if ((p.state.snacks?.l178_barley_tea ?? 0) > 0) { say(ctx, p, "You already have a serving. Leave this one out for the next guest."); return; }
  if (!collect(ctx, p, "l178_barley_tea")) return;
  setCup(ctx, cup, false);
  sound(ctx, "ceramic-bowl-set-on-wooden-table-chopsticks", 0.25);
  const kettle = ctx.getObject(KETTLE);
  if (kettle) {
    const left = teaCups(ctx).filter((c) => c?.state.full).length;
    kettle.state.verb = left ? "Check tea" : "Brew tea";
    kettle.state.info = left ? "One cup left on the table" : "Needs one bottle of Kyoto tap water";
  }
}

export function restockSlippers(ctx) {
  ctx.self.state.taken = false;
  ctx.self.state.restockAt = 0;
  ctx.self.visible = true;
}

function takeSlippers(ctx, p) {
  const me = ctx.self, ps = p.state;
  if (me.state.taken) return;
  const check = canCarry(ps, GETA);
  if (!check.ok) { say(ctx, p, check.msg); return; }
  ps.clothes = [ps.clothes, GETA].filter(Boolean).join(",");
  ps.pickedAt = ctx.now();
  me.state.taken = true;
  me.state.restockAt = ctx.now() + 3600000;
  me.visible = false;
  ctx.after(3600, "restockSlippers");
  hands(ctx, p);
  say(ctx, p, "Tabi and geta · Equip from Apparel");
}

function restore(ctx, p, key, config, waitText) {
  const ps = p.state, now = ctx.now();
  if (now - (ps[key] ?? -1e12) < config.cooldown * 1000) { say(ctx, p, waitText); return false; }
  ps[key] = now;
  if (config.sanity) {
    const max = maxSan(ps.level ?? 1, ps);
    ps.sanity = Math.min(max, (ps.sanity ?? max) + config.sanity);
  }
  if (config.hp) {
    const max = maxHp(ps.level ?? 1, ps);
    ps.hp = Math.min(max, (ps.hp ?? max) + config.hp);
  }
  return true;
}

function inShallows(feet) {
  const { x, z, w, d, surface } = L.spring;
  return feet && Math.abs(feet.x - x) < w / 2 && feet.z >= z + L.basin.stepZ && feet.z < z + d / 2
    && feet.y >= L.spring.shallow - 0.12 && feet.y <= surface + 0.15;
}

function soak(ctx, p, feet) {
  if (!inShallows(feet)) { say(ctx, p, "Step onto the shallow shelf by the south edge."); return; }
  const ps = p.state, now = ctx.now();
  if (now - (ps.l178soak ?? -1e12) < L.soak.cooldown * 1000) { say(ctx, p, "Give yourself time between soaks."); return; }
  if (ps.l178soakingAt == null) {
    ps.l178soakingAt = now;
    startRestPose(ctx, p, L.soak.seconds);
  }
  const remaining = L.soak.seconds - (now - ps.l178soakingAt) / 1000;
  say(ctx, p, "Stay in the shallows for " + Math.max(1, Math.ceil(remaining)) + " s to warm up.");
}

// Lore exit (Shelly #, wiki: "staying in the hot spring long enough and falling asleep" → Level 66 or 132; 66 isn't built, so 132).
// Standing in the shallows starts a clock (written once, on entry); past L.pool.dozeSec the screen dims and you wake in Lumiria.
function tickDoze(ctx, p) {
  const ps = p.state; if (!ps || ps.dead) return;
  const inside = inShallows(p.worldFeetPosition ?? p.feetPosition);
  if (!inside) { if (ps.l178dozeAt != null) { ps.l178dozeAt = null; ps.l178dozeWarned = false; ps.l178dozing = false; } return; }
  if (ps.l178dozeAt == null) { ps.l178dozeAt = ctx.now(); return; }
  const t = (ctx.now() - ps.l178dozeAt) / 1000, D = L.pool.dozeSec ?? 45;
  if (t > D * 0.6 && !ps.l178dozeWarned) { ps.l178dozeWarned = true; say(ctx, p, "The water's so warm. Your eyes keep closing..."); }
  if (t < D) return;
  if (!ps.l178dozing) {
    ps.l178dozing = true;
    ctx.emit("screenFlash", { color: "oklch(0.04 0.01 60)", duration: 2.4, intensity: 1 }, { audience: { player: p.id } });
    say(ctx, p, "You drift off in the steam.");
    return;
  }
  if (t < D + (L.pool.dozeFade ?? 1.6)) return;
  ps.l178dozeAt = null; ps.l178dozeWarned = false; ps.l178dozing = false;
  ctx.cross(p, "level132#l132-arrive");
}

export function tickSoak(ctx, p) {
  tickDoze(ctx, p);
  const ps = p.state, start = ps?.l178soakingAt;
  if (start == null) return;
  const elapsed = ctx.now() - start;
  if (ps.dead || elapsed > (L.soak.seconds + 3) * 1000) { ps.l178soakingAt = null; return; }
  if (!inShallows(p.worldFeetPosition ?? p.feetPosition)) {
    ps.l178soakingAt = null;
    say(ctx, p, "You stepped out of the spring.");
    return;
  }
  if (elapsed < L.soak.seconds * 1000) return;
  ps.l178soakingAt = null;
  if (!restore(ctx, p, "l178soak", L.soak, "Give yourself time between soaks.")) return;
  p.state.chill = Math.max(0, (p.state.chill ?? 0) - L.soak.warm);
  ctx.emit("screenFlash", { color: "oklch(0.94 0.02 90)", duration: 1.1, intensity: 0.28 }, { audience: { player: p.id } });
  say(ctx, p, "The heat eases your aches.");
}

export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (s.kind === "shoji") leaf(ctx, true);
  if (s.kind === "tap" && s.on) stopTap(ctx);
  if (s.kind === "oven" && s.readyAt) {
    const left = s.readyAt - ctx.now();
    if (left > 0) ctx.after(left / 1000, "ovenReady");
    else ovenReady(ctx);
  }
  if (s.kind === "kettle" && s.readyAt) ctx.after(Math.max(0.1, (s.readyAt - ctx.now()) / 1000), "teaReady");
  if (s.kind === "teaCup") setCup(ctx, ctx.self, !!s.full);
  if (s.kind === "slippers" && s.taken) {
    const left = s.restockAt - ctx.now();
    if (left > 0) { ctx.self.visible = false; ctx.after(left / 1000, "restockSlippers"); }
    else restockSlippers(ctx);
  }
}


// ---- Hand-feel for every fixture: one row per thing. m = how it moves, s = its sound, fx = a puff, eff = what it does for you.
// eff: san/hp/food/water (modest), item (one-time token via the payout queue), cd = per-player seconds before it pays again.
const FX = {
  dust: `fx
pop dust burst=8..12 on=disc(.25) life=.6..1.1 v=up(.2..0.5)+sdir()*.3 size=.08..0.16 acc=buoy(.2)+drag(1.4) col=<.62,.55,.44> a=0>.3:.3>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`,
  steam: TEA_STEAM,
  drip: `fx
pop drip burst=10..16 on=disc(.15) life=.4..0.7 v=up(.4..1)+sdir()*.8 acc=grav() size=.012..0.02 col=<.8,.88,.95> a=.7 sz=$size floor=die r=sprite(soft-disc,alpha,velocity,.03)`,
  leaves: `fx
pop leaf burst=10..14 on=disc(.3) life=1..1.6 v=up(.8..1.6)+sdir()*1.2 acc=grav()*.25+drag(1.8)+curl(.6) size=.05..0.08 spin=-6..6 col=<.75,.28,.12>..<.85,.5,.15> a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(soft-disc,alpha)`,
  glint: `fx
pop glint burst=5..7 on=sphere(.06) life=.4..0.7 v=sdir()*.15 size=.02..0.04 col=hdr(3,2.6,2) a=0>.2:1>0 sz=$size*(1>.2) r=sprite(soft-disc,add)`,
  moth: `fx
pop moth burst=1 life=1.6 v=up(.35)+sdir()*.25 acc=curl(1.4)*2+drag(1) size=.035 col=<.8,.74,.6> a=1>.85:1>0 sz=$size*(1+.4*flick(14,.8)) r=sprite(soft-disc,alpha)`,
};
const ACTS = {
  "l178-story-andon-1": { m: "glow", s: "oil-lamp-wick-turned-up", line: "You turn the wick up. The scorch on the washi gets a little bigger.", eff: { san: 3, cd: 300 } },
  "l178-story-andon-2": { m: "roll", s: "washi-paper-lantern-rustle", line: "Two rice-glue patches. You press the second one flat. Holding.", eff: { san: 2, cd: 300 } },
  "l178-story-andon-3": { m: "glow", s: "paper-lantern-frame-creak", line: "No oil in the dish. No wick. Still lit. You stop looking for the trick." },
  "l178-story-andon-4": { m: "glow", fx: "moth", s: "moth-wings-flutter-on-paper", line: "The moth relocates two inches and goes back to sleep." },
  "l178-story-bottle": { m: "spin", s: "empty-glass-bottle-rolling-on-wood", line: "M.E.G. issue, Level 0 batch. Empty. The kitchen tap fills these." },
  "l178-story-broom": { m: "roll", fx: "dust", s: "bamboo-broom-sweeping-wood-porch", line: "Three strokes. Porch looks the same. You feel better anyway.", eff: { san: 2, cd: 240 } },
  "l178-story-bucket-1": { m: "roll", fx: "steam", s: "hand-splash-in-wooden-bucket", line: "Cedar and sulphur. You splash your face.", eff: { san: 3, water: 2, cd: 300 } },
  "l178-story-bucket-2": { m: "pitch", fx: "drip", s: "wooden-bucket-poured-out-on-stone", line: "You tip it out on the stones so the next bather gets fresh.", eff: { san: 2, cd: 300 } },
  "l178-story-calli-cup": { m: "roll", s: "brush-rinsed-in-ceramic-cup-clink", line: "You rinse the brush. Grey water goes a darker grey." },
  "l178-story-calli-zabuton": { m: "squash", s: "cushion-sat-on-soft-thump", line: "Flatter now. That's on you." },
  "l178-story-callidesk": { m: "bob", s: "ink-brush-stroke-on-rice-paper", line: "You add a forty-first. Worse than the fortieth.", eff: { san: 3, cd: 600 } },
  "l178-story-catdish": { m: "pop", s: "dried-fish-into-ceramic-dish", line: "You top up the water. Later it's lower. Still no cat.", eff: { san: 4, cd: 900 } },
  "l178-story-crumpled-1": { m: "pop", s: "paper-uncrumpled-smoothed", line: "Smoothed out: 永. Eternity. Five strokes, every one crossed out." },
  "l178-story-crumpled-2": { m: "hop", s: "paper-ball-bounce-off-ceramic", line: "You lob it at the brush cup. Miss." },
  "l178-story-donabe": { m: "rattle", fx: "steam", s: "clay-pot-lid-rattling-simmer", line: "One ladle of dashi. Scalds. Worth it.", eff: { food: 6, water: 4, cd: 900 } },
  "l178-story-dryrack": { m: "rattle", s: "ceramic-bowls-clatter-on-rack", line: "Twelve bowls, thirteen hooks. One's out with somebody." },
  "l178-story-flashlight": { m: "flash", s: "flashlight-click-dead-battery", line: "Click. A beam like weak tea, then nothing. You pop the battery anyway.", eff: { item: "battery" } },
  "l178-story-futon-folded": { m: "squash", s: "futon-cotton-fold-thump", line: "You refold it. Your corners aren't square. You leave it." },
  "l178-story-geta-2": { m: "hop", s: "wooden-geta-clack-on-stone", line: "Clack. Clack. Good shoes for announcing yourself." },
  "l178-story-getabako": { m: "rattle", s: "wooden-shoe-cabinet-door-knock", line: "Someone chalked HUB → inside the door. It means the gate right behind you." },
  "l178-story-go-zabuton-1": { m: "squash", s: "cushion-sat-on-soft-thump", line: "Still warm. You don't sit. It's their game." },
  "l178-story-go-zabuton-2": { m: "squash", s: "ceramic-cup-sip-set-down", line: "Their tea's gone cold. You drink it anyway. Barley.", eff: { water: 5, cd: 900 } },
  "l178-story-goboard": { m: "bob", s: "go-stone-placed-on-wooden-board", line: "go", eff: { san: 3, cd: 600 } },
  "l178-story-hairpin": { m: "spin", fx: "glint", s: "lacquer-hairpin-tink", line: "Plum blossom kanzashi. You put it back exactly where it was." },
  "l178-story-kamidana": { m: "bob", s: "two-hand-claps-shrine-bell", line: "Two bows, two claps, one bow. The rice in the little dish is fresh again.", eff: { san: 6, cd: 3600 } },
  "l178-story-kimono-stand": { m: "roll", s: "silk-kimono-fabric-sway", line: "Smells like the spring. You smell like Level 0." },
  "l178-story-laundry": { m: "roll", fx: "drip", s: "wet-cotton-yukata-flap", line: "Damp. Same as yesterday. Same as tomorrow." },
  "l178-story-leaves": { m: "squash", fx: "leaves", s: "dry-maple-leaves-kicked", line: "Maple. There are no maples. It'll be re-raked by morning.", eff: { san: 1, cd: 300 } },
  "l178-story-letter-zabuton": { m: "squash", s: "cushion-sat-on-soft-thump", line: "Two knee dents. Whoever wrote here wrote a long one." },
  "l178-story-paperback": { m: "pop", s: "paperback-pages-riffle", line: "Ch. 9, dog-eared: DO NOT FALL ASLEEP IN WARM WATER. Someone's underlined it twice." },
  "l178-story-ricecooker": { m: "pop", fx: "steam", s: "rice-cooker-lid-pop-hiss", line: "Just finished. Always just finished. You eat a pinch with your fingers.", eff: { food: 6, cd: 900 } },
  "l178-story-ricesack": { m: "squash", s: "rice-sack-burlap-slump", line: "You fold the top down. When you look back it's fuller." },
  "l178-story-rumpled": { m: "squash", s: "quilt-shaken-out-cotton", line: "You straighten it. The head dent stays in the pillow." },
  "l178-story-scallion": { m: "rattle", s: "kitchen-knife-chopping-scallions", line: "You finish the chopping. Neat rings. You eat a few.", eff: { food: 3, cd: 600 } },
  "l178-story-shamisen": { m: "roll", s: "shamisen-three-note-pluck-melody", line: "You tune the loose string. It goes back out by night.", eff: { san: 5, cd: 600 } },
  "l178-story-slippers": { m: "spin", s: "house-slippers-shuffle-on-wood", line: "You turn them back toward the house. Whoever's soaking will want them." },
  "l178-story-sneakers": { m: "hop", fx: "dust", s: "muddy-sneaker-knocked-on-step", line: "Yellow carpet in the tread. The gate behind you goes back the way they came." },
  "l178-story-stool-1": { m: "squash", s: "wooden-bath-stool-scrape-on-tile", line: "You sit, rinse your hands, stand. House rule." },
  "l178-story-stool-2": { m: "hop", fx: "drip", s: "wooden-bath-stool-scrape-on-tile", line: "You wipe it with your sleeve. Still wet." },
  "l178-story-teatray": { m: "roll", s: "teacup-righted-on-lacquer-tray", line: "You right the cup and wipe the ring with your sleeve. Better." },
  "l178-story-tray-done": { m: "rattle", s: "bowls-stacked-chopsticks-clatter", line: "You stack the bowls. Fish bones on top, like a gentleman." },
  "l178-story-tray-full": { m: "rattle", fx: "steam", s: "chopsticks-on-rice-bowl-eating", line: "Untouched and still warm. You eat it. Nobody comes back for it.", eff: { food: 8, water: 4, cd: 3600 } },
  "l178-story-umbrella": { m: "spin", fx: "drip", s: "wet-umbrella-shaken-out", line: "You shake it out. Water from somewhere with weather." },
  "l178-story-yukata-fold": { m: "squash", s: "cotton-yukata-refolded", line: "You fix the towel on top. Square, like the house likes it." },
  // the fixtures that already do something get a body to go with it
  "kind:futon": { m: "squash", fx: "dust" },
  "kind:closet": { m: "rattle", s: "wooden-closet-sliding-door-cloth" },
  "kind:slippers": { s: "wooden-geta-clack-on-stone" },
  "kind:spring": { fx: "steam", s: "hot-spring-water-ripple-step" },
  "kind:table": { m: "rattle", fx: "steam" },
  "kind:towels": { m: "squash" },
  "kind:teaCup": { m: "roll" },
  "kind:kettle": { m: "rattle", s: "iron-kettle-lid-rattle" },
  "kind:read": { m: "pop" },
};

function sfx(ctx, name, volume = 0.4) {
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-" + name + ".mp3", position: ctx.self.worldFeetPosition, volume, maxDistance: 9 });
}

// One visible move of the thing itself, from its resting pose; a press mid-move waits it out so nothing drifts.
function move(ctx, m) {
  const me = ctx.self, ss = me.session, now = ctx.now();
  if (!m || now < (ss.busy ?? 0)) return;
  ss.base ??= { y: me.feetPosition.y, yaw: me.rotation?.yaw ?? 0 };
  const { y, yaw } = ss.base;
  let k, d = 0.6, e = "easeOutQuad";
  switch (m) {
    case "bob": k = { "feetPosition.y": [y, y + 0.04, y] }; d = 0.4; break;
    case "hop": k = { "feetPosition.y": [y, y + 0.09, y, y + 0.025, y] }; d = 0.55; break;
    case "pop": k = { scale: [1, 1.12, 0.97, 1] }; d = 0.45; break;
    case "squash": k = { "scale.y": [1, 0.8, 1.06, 1], "scale.x": [1, 1.08, 0.98, 1], "scale.z": [1, 1.08, 0.98, 1] }; d = 0.5; break;
    case "roll": k = { "rotation.roll": [0, 7, -5, 2, 0] }; d = 0.8; e = "easeInOutSine"; break;
    case "pitch": k = { "rotation.pitch": [0, -24, -24, 0] }; d = 1.1; e = "easeInOutSine"; break;
    case "rattle": k = { "rotation.roll": [0, 2.5, -2.5, 2, -1.5, 0], "feetPosition.y": [y, y + 0.012, y, y + 0.01, y, y] }; d = 0.45; e = "linear"; break;
    case "spin": k = { "rotation.yaw": [yaw, yaw + 25, yaw - 8, yaw] }; d = 0.7; e = "easeOutCubic"; break;
    case "glow": case "flash": k = { scale: [1, 1.05, 1] }; d = 0.5; glow(ctx, m === "flash"); break;
  }
  if (!k) return;
  ss.busy = now + d * 1000 + 60;
  try { animate(ctx, me, k, { duration: d, easing: e }); } catch (err) { ctx.log("l178 move", m, String(err)); }
}

// A lamp flares (or a dead torch stutters): a short live light at the thing, gone on its own.
function glow(ctx, stutter) {
  const b = ctx.self.bounds, c = b?.center ?? ctx.self.worldFeetPosition;
  ctx.spawn({ feetPosition: { x: c.x, y: c.y + 0.05, z: c.z }, lifetime: stutter ? 0.5 : 1.3, audience: "all",
    light: { kind: "point", color: stutter ? "oklch(0.92 0.06 95)" : "oklch(0.85 0.13 70)", intensity: stutter ? 1.2 : 2.2, distance: stutter ? 4 : 6 } });
  const g = ctx.getObject(ctx.self.id + "/glow");
  if (g) try { animate(ctx, g, { scale: [1, 1.35, 1] }, { duration: 1.1, easing: "easeOutSine" }); } catch {}
}

function puff(ctx, name) {
  const script = FX[name]; if (!script) return;
  const b = ctx.self.bounds, c = b?.center ?? ctx.self.worldFeetPosition;
  const at = { x: c.x, y: b ? b.max.y : c.y + 0.2, z: c.z };
  ctx.emit("fx", { position: at, script }, { audience: { nearby: at, radius: 14 } });
}

// What it does for you: small, once per cooldown per player; a one-time find goes through the normal payout queue.
function pay(ctx, p, eff) {
  if (!eff) return true;
  const ps = p.state, id = ctx.self.id, now = ctx.now();
  if (eff.item) {
    const got = ps.l178got ?? {};
    if (got[id]) return false;
    const check = canCarryAll(ps, [...(ps.payout?.items ?? []), eff.item]);
    if (!check.ok) { say(ctx, p, check.msg ?? "Your bag is full."); return false; }
    ps.l178got = { ...got, [id]: 1 };
    queuePayout(ps, { items: [eff.item] });
    hands(ctx, p);
    return true;
  }
  const cd = ps.l178cd ?? {};
  if (now - (cd[id] ?? -1e12) < (eff.cd ?? 600) * 1000) return false;
  ps.l178cd = { ...cd, [id]: now };
  if (eff.san) { const mx = maxSan(ps.level ?? 1, ps); ps.sanity = Math.min(mx, (ps.sanity ?? mx) + eff.san); }
  if (eff.hp) { const mx = maxHp(ps.level ?? 1, ps); ps.hp = Math.min(mx, (ps.hp ?? mx) + eff.hp); }
  if (eff.food) ps.hunger = Math.min(100, (ps.hunger ?? 100) + eff.food);
  if (eff.water) ps.thirst = Math.min(100, (ps.thirst ?? 100) + eff.water);
  if (eff.food || eff.water) hands(ctx, p);
  return true;
}

const GO_REPLY = ["Black answers at 3-3 by morning. You never see who.", "You play white. A cough from the next room.", "White to 4-4. Black's still winning.", "You take a black stone. It's warm."];

function fixture(ctx, p, s, beat) {
  const id = ctx.self.id, a = ACTS[id];
  if (!a) return false;
  move(ctx, a.m); puff(ctx, a.fx); sfx(ctx, a.s, 0.4);
  const paid = pay(ctx, p, a.eff);
  let line = a.line;
  if (line === "go") {
    const n = (s.moves = (s.moves ?? 0) + 1);
    line = "Move " + n + ". " + GO_REPLY[n % GO_REPLY.length];
  }
  if (a.eff?.item && !paid && (p.state.l178got ?? {})[id]) line = "Battery's gone. You took it. The lens is still cracked.";
  else if (a.eff && !a.eff.item && !paid) line = null; // already had its due: the move and the sound are the answer
  say(ctx, p, beat ?? line ?? s.why ?? s.name);
  return true;
}

function body(ctx, kind) {
  const a = ACTS["kind:" + kind];
  if (!a) return;
  move(ctx, a.m); puff(ctx, a.fx);
  if (a.s) sfx(ctx, a.s, 0.35);
}

export const ears = {
  probe(ctx) { const a = ACTS[ctx.self.id] ?? ACTS["kind:" + ctx.self.state.kind]; if (!a) return; move(ctx, a.m); puff(ctx, a.fx); sfx(ctx, a.s, 0.4); ctx.self.state.probed = ctx.now(); ctx.log("probe", ctx.self.id, a.m); },
  press(ctx, { by } = {}) {
    const s = ctx.self.state;
    const p = ctx.place.players.find((q) => q.id === by);
    const feet = p?.worldFeetPosition ?? p?.feetPosition;
    const at = s.c ?? ctx.self.worldFeetPosition;
    if (!feet || !at || p.state?.dead || Math.hypot(feet.x - at.x, feet.y - at.y, feet.z - at.z) > 4.5) return;
    const beat = touch178(ctx, p, ctx.self.id);
    switch (s.kind) {
      case "read":
        p.state.reading = s.page;
        sound(ctx, "paper-page-turn-soft", 0.35);
        break;
      case "qspot":
        if (fixture(ctx, p, s, beat)) break;
        sound(ctx, "paper-page-turn-soft", 0.25);
        say(ctx, p, beat ?? s.why ?? s.name);
        break;
      case "closet": {
        if (p.state.l178closet) { say(ctx, p, "You already have the guest haori and hachimaki."); break; }
        const items = String(L.closetGift).split(",");
        const check = canCarryAll(p.state, [...(p.state.payout?.items ?? []), ...items]);
        if (!check.ok) { say(ctx, p, check.msg ?? "Your bag is full."); break; }
        p.state.l178closet = 1;
        hands(ctx, p);
        queuePayout(p.state, { items, text: "Guest haori and hachimaki · Equip from Apparel" });
        break;
      }
      case "shoji":
        s.open = !s.open;
        s.verb = s.open ? "Close" : "Open";
        leaf(ctx, false);
        sound(ctx, SHOJI, 0.45);
        break;
      case "tap": fillBottle(ctx, p); break;
      case "oven": useOven(ctx, p); break;
      case "kettle": brewTea(ctx, p); break;
      case "teaCup": takeTea(ctx, p); break;
      case "towels": takeTowel(ctx, p); break;
      case "slippers": takeSlippers(ctx, p); break;
      case "spring": soak(ctx, p, feet); break;
      case "table":
        if (!restore(ctx, p, "l178meal", L.meal, "The kitchen hasn't set out another meal yet.")) break;
        p.state.hunger = Math.min(100, (p.state.hunger ?? 100) + L.meal.hunger);
        p.state.thirst = Math.min(100, (p.state.thirst ?? 100) + L.meal.thirst);
        hands(ctx, p);
        if (p.state.sit?.phase === "sat" && p.state.sit.id?.startsWith("l178-zabuton-")) {
          const max = maxSan(p.state.level ?? 1, p.state);
          p.state.sanity = Math.min(max, (p.state.sanity ?? max) + L.meal.seatedSanity);
        }
        sound(ctx, "ceramic-bowl-set-on-wooden-table-chopsticks", 0.45);
        say(ctx, p, "Grilled fish, rice and pickles. There's always a place for a traveller.");
        break;
      case "futon":
        if (!restore(ctx, p, "l178rest", L.rest, "You're already rested.")) break;
        startRestPose(ctx, p, L.rest.fade + 0.9);
        ctx.emit("screenFlash", { color: "oklch(0.05 0.01 60)", duration: L.rest.fade, intensity: 0.55 }, { audience: { player: by } });
        sound(ctx, "futon-rustle-soft-exhale");
        say(ctx, p, "Cotton smells like cedar. You're out before you finish the thought.");
        break;
    }
    if (s.kind !== "qspot") body(ctx, s.kind);
    if (beat && s.kind !== "read" && s.kind !== "qspot") say(ctx, p, beat);
  },
};
