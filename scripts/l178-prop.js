// Kyoto's house fixtures. Stocked cabinets use the normal loot and storage UI.
import { animate } from "builtin/tween";
import { hands } from "./desk-item.js";
import { maxHp, maxSan } from "./player.js";
import { canCarry } from "./lib/stats.js";
import L from "./lib/data/level178.yml";
import SNACKS from "./lib/data/snacks.yml";

export { handsOff } from "./desk-item.js";
const STREAM = `fx
pop water rate=?mobile:30|60 on=disc(.008) life=.22..0.28 v=<0,-0.6,0> acc=grav() size=.01..0.016 col=<.82,.9,1> a=.55 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
const SHOJI = "wooden-shoji-paper-door-sliding-in-wood-track";
const SLIPPERS = "cloth:shoes:slippers:f4f1ea:velvet";

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
  const door = ctx.getObject(ctx.self.id + "/prop-motion-door");
  if (door) door.state.goal = goal;
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

function soak(ctx, p, feet) {
  const { x, z, w, d, surface } = L.spring;
  if (Math.abs(feet.x - x) >= w / 2 || Math.abs(feet.z - z) >= d / 2 || feet.y > surface + 0.15) {
    say(ctx, p, "Step into the shallows first."); return;
  }
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
      case "towels": takeTowel(ctx, p); break;
      case "slippers": takeSlippers(ctx, p); break;
      case "spring": soak(ctx, p, feet); break;
      case "table":
        if (!restore(ctx, p, "l178meal", L.meal, "The kitchen hasn't set out another meal yet.")) break;
        p.state.hunger = Math.min(100, (p.state.hunger ?? 100) + L.meal.hunger);
        p.state.thirst = Math.min(100, (p.state.thirst ?? 100) + L.meal.thirst);
        sound(ctx, "ceramic-bowl-set-on-wooden-table-chopsticks", 0.45);
        say(ctx, p, "Grilled fish, rice and pickles. There's always a place for a traveller.");
        break;
      case "futon":
        if (!restore(ctx, p, "l178rest", L.rest, "You're already rested.")) break;
        ctx.emit("screenFlash", { color: "oklch(0.05 0.01 60)", duration: L.rest.fade, intensity: 1 }, { audience: { player: by } });
        sound(ctx, "futon-rustle-soft-exhale");
        say(ctx, p, "You doze off to the sound of the spring.");
        break;
    }
  },
};
