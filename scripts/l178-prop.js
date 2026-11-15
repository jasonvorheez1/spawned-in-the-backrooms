// Kyoto's house fixtures. Stocked cabinets use the normal loot and storage UI.
import { animate } from "builtin/tween";
import { hands } from "./desk-item.js";
import { startRestPose } from "./field-fixture.js";
import { movePart } from "./prop-part.js";
import { maxHp, maxSan } from "./player.js";
import { canCarry } from "./lib/stats.js";
import L from "./lib/data/level178.yml";
import SNACKS from "./lib/data/snacks.yml";

export { handsOff } from "./desk-item.js";
const STREAM = `fx
pop water rate=?mobile:30|60 on=disc(.008) life=.22..0.28 v=<0,-0.6,0> acc=grav() size=.01..0.016 col=<.82,.9,1> a=.55 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
const SHOJI = "wooden-shoji-paper-door-sliding-in-wood-track";
const SLIPPERS = "cloth:shoes:slippers:f4f1ea:velvet";
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
  const check = canCarry(ps, SLIPPERS);
  if (!check.ok) { say(ctx, p, check.msg); return; }
  ps.clothes = [ps.clothes, SLIPPERS].filter(Boolean).join(",");
  ps.pickedAt = ctx.now();
  me.state.taken = true;
  me.state.restockAt = ctx.now() + 3600000;
  me.visible = false;
  ctx.after(3600, "restockSlippers");
  hands(ctx, p);
  say(ctx, p, "Guest slippers · Equip from Apparel");
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

export function tickSoak(ctx, p) {
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

export const ears = {
  press(ctx, { by } = {}) {
    const s = ctx.self.state;
    const p = ctx.place.players.find((q) => q.id === by);
    const feet = p?.worldFeetPosition ?? p?.feetPosition;
    const at = s.c ?? ctx.self.worldFeetPosition;
    if (!feet || !at || p.state?.dead || Math.hypot(feet.x - at.x, feet.y - at.y, feet.z - at.z) > 4.5) return;
    switch (s.kind) {
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
        say(ctx, p, "You doze off to the sound of the spring.");
        break;
    }
  },
};
