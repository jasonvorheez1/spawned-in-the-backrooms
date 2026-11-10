// ASHLINE body: movement (walk, Q/E strafe, crouch, slide, wall kick), the trigger (30 guns, attachments), peek, melee,
// defuse, the gunsmith. Feel numbers: lib/data/combat.yml; guns: lib/guns.js. What only this machine needs lives in
// ctx.session.fps[id] (camera.js reads the same slot); what the HUD, the round and other players read lives in state.
import PLAYER from "./lib/data/player.yml";
import C from "./lib/data/combat.yml";
import { stats, weapon, attachment, fits, SLOTS, WEAPONS, MIGRATE } from "./lib/guns.js";
import { raycast } from "builtin/physics";
import * as FX from "./lib/fx.js";
import M from "./lib/data/mirror.yml";
import { flinchDir } from "./lib/flinch.js";
import * as BAL from "./lib/ballistics.js";

const D2R = Math.PI / 180;
const SND = "/cdn/moodboard-realistic-gritty/";
export function fpsOf(ctx) { const all = (ctx.session.fps ??= {}); return (all[ctx.self.id] ??= { recoil: { p: 0, y: 0 }, spray: 0, nextShot: 0, adsT: 0, zoomStep: 0 }); }
const fwd = (yaw, pitch) => ({ x: -Math.sin(yaw * D2R) * Math.cos(pitch * D2R), y: Math.sin(pitch * D2R), z: -Math.cos(yaw * D2R) * Math.cos(pitch * D2R) });
const hsp = (v) => Math.hypot(v.x, v.z);

function ensure(ctx) {
  const s = ctx.self.state;
  if (s.money == null) {
    s.money = 800; s.hp = C.hp.max; s.armor = 0; s.kills = 0; s.deaths = 0; s.owned = [];
    s.kit = { primary: null, secondary: { id: "scrap9", att: {} } }; s.slot = "secondary";
    s.ammo = { secondary: weapon("scrap9").mag, primary: 0 }; s.reserve = { secondary: weapon("scrap9").reserve, primary: 0 };
  }
}
export const kitOf = (s) => (s.slot === "fists" ? null : s.kit?.[s.slot]) ?? s.kit?.secondary ?? { id: "scrap9", att: {} };
// buying: the whole buy phase, then (team modes) the grace seconds inside your own side's buy zone; the other modes keep the north-yard rule
const canBuy = (ctx) => {
  if (ctx.self.state.onRange) return true; // the range out past the lobby's south gate: every gun is a free trial
  const ps = ctx.place.state, ph = ps.phase ?? "buy";
  if (ph === "buy") return true;
  const z = ps.buyZone, mine = z?.[ctx.self.state.team];
  if (z && mine) { const p = ctx.self.feetPosition; return ph === "live" && ctx.now() < (ps.buyUntil ?? 0) && Math.hypot(p.x - mine.x, p.z - mine.z) < z.radius; }
  return ctx.self.feetPosition.z < -44;
};

// the buy menu's rows: the HUD draws the same table (scripts/lib/buy.js)
import { BUY_CATS, buyRows, GRENADE_PRICE, GRENADE_MAX } from "./lib/buy.js";
import { throwNade, nadeSpec, NADES, NADE_ORDER, THROW } from "./lib/grenade.js";
import { throwMolotov } from "./lib/molotov.js";
import * as RAG from "./lib/ragdoll.js";
import { hitSnd, H as HS } from "./lib/hitsfx.js";
import { headPop, headBack } from "./lib/gore.js";
function buyArmor(ctx) { const s = ctx.self.state; if (s.money >= C.hp.armorPrice && (s.armor ?? 0) < 100 && canBuy(ctx)) { s.money -= C.hp.armorPrice; s.armor = 100; ctx.emit("playSound", { clip: SND + "sfx-kevlar-vest-strap.mp3", position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } }); } }
function buyKit(ctx, key, row, clip) { const s = ctx.self.state; if (s.money >= row.price && (s[key] ?? 0) < row.max && canBuy(ctx)) { s.money -= row.price; s[key] = (s[key] ?? 0) + 1; ctx.emit("playSound", { clip: SND + clip, position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } }); } }
const buySyringe = (ctx) => buyKit(ctx, "syringes", C.syringe, "sfx-medkit-pouch-zip.mp3");
const buyMolotov = (ctx) => buyKit(ctx, "molotovs", C.molotov, "sfx-glass-bottle-clink.mp3");
// the syringe (H): the needle is a slot ("syringe") for its 2.2 s; hp pours in over the last ramp; a big hit or a switch cancels
const maxHp = (s) => C.hp.max + (s.statBonus?.hp ?? 0);
function startHeal(ctx) {
  const s = ctx.self.state, f = fpsOf(ctx), now = ctx.now();
  if (s.dead || s.panel || s.healUntil || (s.syringes ?? 0) < 1 || (s.hp ?? 100) >= maxHp(s)) return;
  s.prevSlot = s.slot; s.slot = "syringe"; s.reloadUntil = 0; s.blocking = false; f.zoomStep = 0; s.zoomX = null;
  s.healUntil = now + C.syringe.time * 1000; s.healGiven = 0; s.healInjected = false; f.healHp = s.hp; f.drawAt = now; f.nextShot = now + 350;
  ctx.emit("playSound", { clip: SND + "sfx-syringe-cap-pop.mp3", position: ctx.self.feetPosition, volume: 0.5 }, { audience: { player: ctx.self.id } });
}
function endHeal(ctx, back) {
  const s = ctx.self.state, f = fpsOf(ctx), now = ctx.now();
  s.healUntil = 0; s.healInjected = false; s.healGiven = 0;
  if (back && s.slot === "syringe") {
    s.slot = s.prevSlot === "primary" && !s.kit?.primary ? "secondary" : (s.prevSlot && s.prevSlot !== "syringe" ? s.prevSlot : "secondary");
    f.nextShot = now + 350; f.drawAt = now;
    ctx.emit("playSound", { clip: SND + "sfx-weapon-draw.mp3", position: ctx.self.feetPosition, volume: 0.5 }, { audience: { player: ctx.self.id } });
  }
}
function healTick(ctx, s, f, now) {
  if (!s.healUntil) return;
  if (s.slot !== "syringe") return endHeal(ctx, false);
  if ((f.healHp ?? s.hp) - s.hp > C.syringe.interrupt) return endHeal(ctx, true); // a hard hit knocks the needle out
  const rampAt = s.healUntil - C.syringe.ramp * 1000;
  if (now >= rampAt) {
    if (!s.healInjected) { s.healInjected = true; s.syringes = Math.max(0, (s.syringes ?? 1) - 1); ctx.emit("playSound", { clip: SND + "sfx-syringe-inject.mp3", position: ctx.self.feetPosition, volume: 0.8, maxDistance: 12 }); }
    const want = Math.round(C.syringe.heal * Math.min(1, (now - rampAt) / (C.syringe.ramp * 1000))), add = want - (s.healGiven ?? 0);
    if (add > 0) { s.hp = Math.min(maxHp(s), s.hp + add); s.healGiven = want; }
  }
  f.healHp = s.hp;
  if (now >= s.healUntil) endHeal(ctx, true);
}
function buyGrenade(ctx, kind = "frag") { const s = ctx.self.state, r = NADES[kind] ?? NADES.frag; if (s.money >= r.price && (s[r.key] ?? 0) < r.max && canBuy(ctx)) { s.money -= r.price; s[r.key] = (s[r.key] ?? 0) + 1; if (!s.nadeKind || !(s[NADES[s.nadeKind]?.key] > 0)) s.nadeKind = kind; ctx.emit("playSound", { clip: SND + "sfx-grenade-pin-clink.mp3", position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } }); } }

export function onSpawn(ctx) {
  ensure(ctx);
  // a save from before the wrapped-only armory: each retired kit id becomes its same-class survivor (weapons.yml migrate)
  const s = ctx.self.state, mig = (id) => (id && !WEAPONS.some((w) => w.id === id) ? MIGRATE[id] ?? null : id);
  if (s.kit) for (const k of Object.keys(s.kit)) { const e = s.kit[k]; if (e?.id) { const n = mig(e.id); s.kit = { ...s.kit, [k]: n ? { ...e, id: n } : null }; } }
  if (s.kit && !s.kit.secondary) s.kit = { ...s.kit, secondary: { id: "scrap9", att: {} } };
  if (Array.isArray(s.owned)) s.owned = [...new Set(s.owned.map((id) => mig(id) ?? id))];
}

export function onInput(ctx, input) {
  ensure(ctx);
  const s = ctx.self.state, f = fpsOf(ctx);
  f.sin = input.axes.aimYawSin ?? 0; f.cos = input.axes.aimYawCos ?? 1;
  f.touch = (input.axes.touchActive ?? 0) > 0;
  f.pointer = input.axes.pointerDirX != null ? { o: { x: input.axes.pointerOriginX, y: input.axes.pointerOriginY, z: input.axes.pointerOriginZ }, d: { x: input.axes.pointerDirX, y: input.axes.pointerDirY, z: input.axes.pointerDirZ } } : null;
  // the gunsmith: the panel's buttons arrive as actions with payloads
  const ad = input.actionData ?? {};
  if (input.pressed.gunsmith) { s.panel = !s.panel; s.buyCat = null; }
  if (input.pressed.closePanel) { s.panel = false; s.buyCat = null; }
  if (input.pressed.scores) s.scores = true; if (input.released.scores) s.scores = false; // ` held: the scoreboard (scripts/ui.js)
  // the quick-buy: B opens, a number picks the category (1 pistols … 6 gear, 7 heavy), a number buys the row, Esc / Backspace steps back
  const digit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((n) => input.pressed["slot" + n]);
  if (s.panel) {
    if (input.pressed.menuBack) { if (s.buyCat) s.buyCat = null; else s.panel = false; }
    if (input.pressed.buyCat && ad.buyCat) s.buyCat = ad.buyCat.cat || null;
    if (input.pressed.buyGrenade) buyGrenade(ctx);
    if (input.pressed.buySyringe) buySyringe(ctx);
    if (input.pressed.buyMolotov) buyMolotov(ctx);
    if (digit) {
      if (!s.buyCat) { const c = BUY_CATS[digit - 1]; if (c) s.buyCat = c.id; }
      else { const row = buyRows(s.buyCat)[digit - 1]; if (row) { if (row.kind === "armor") buyArmor(ctx); else if (row.kind === "grenade") buyGrenade(ctx, row.id); else if (row.kind === "syringe") buySyringe(ctx); else if (row.kind === "molotov") buyMolotov(ctx); else buyWeapon(ctx, row.id); } }
    }
  }
  if (input.pressed.buyWeapon && ad.buyWeapon) buyWeapon(ctx, ad.buyWeapon.id);
  if (input.pressed.buyAtt && ad.buyAtt) buyAtt(ctx, ad.buyAtt.id);
  if (input.pressed.fitAtt && ad.fitAtt) fitAtt(ctx, ad.fitAtt.slot, ad.fitAtt.id);
  if (input.pressed.buyArmor) buyArmor(ctx);
  if (s.dead) { f.moveX = f.moveZ = 0; f.fire = false; return; }
  if (input.pressed.tps) s.tps = !s.tps; // U: third person over the shoulder (scripts/camera.js), first person again
  if (s.ride || ctx.self.parent) return; // seated in a vehicle (a game's own seat script owns that input): no gun

  // double-tap a direction = dodge: WW forward roll, SS back flip, AA/DD side roll (RMB held = combat roll, sights stay up)
  const nx0 = input.axes.moveX ?? 0, nz0 = input.axes.moveZ ?? 0, tapNow = ctx.now();
  const dirOf = (x, z) => Math.abs(z) > 0.5 ? (z > 0 ? "f" : "b") : Math.abs(x) > 0.5 ? (x > 0 ? "r" : "l") : null;
  const was = dirOf(f.moveX ?? 0, f.moveZ ?? 0), is = dirOf(nx0, nz0);
  if (is && is !== was) {
    if (f.lastTap?.d === is && tapNow - f.lastTap.at < C.dodge.tapWindow * 1000) { f.dodgeReq = { d: is, combat: !!input.held.ads }; f.lastTap = null; }
    else f.lastTap = { d: is, at: tapNow };
  }
  f.moveX = nx0; f.moveZ = nz0; f.leanAxis = input.axes.lean ?? 0;
  const fists = s.slot === "fists";
  f.ads = !fists && !!input.held.ads && !s.panel && !(s.reloadUntil > ctx.now());
  const block = fists && !!input.held.ads && !s.panel;
  if (!!s.blocking !== block) s.blocking = block;
  if (input.pressed.inspect) f.inspectAt = ctx.now();
  f.fire = !!input.held.fire && !s.panel; if (input.pressed.fire && !s.panel) { f.firePressed = true; f.fireBuf = ctx.now(); } // a press is never lost between ticks; a semi-auto press 200 ms early still fires when the gun is ready
  f.crouchHeld = !!input.held.crouch; f.crouchPressed = !!input.pressed.crouch; f.jumpPressed = f.jumpPressed || !!input.pressed.jump;
  const peek = f.ads && f.leanAxis !== 0 ? Math.sign(f.leanAxis) : 0; // RMB + Q/E = peek; Q/E alone = strafe
  if ((s.lean ?? 0) !== peek) s.lean = peek;
  if (!!s.ads !== f.ads) s.ads = f.ads;
  { const sc = f.ads && (f.adsT ?? 0) > 0.85; if (!!s.scopeIn !== sc) s.scopeIn = sc; } // the overlay waits until the rifle is up at the eye

  // weapon slots and the wheel: through a variable scope the wheel steps magnification, otherwise it swaps
  const st = stats(kitOf(s));
  if (!s.panel) {
    if (input.pressed.slot1 && s.kit.primary) switchTo(ctx, "primary");
    if (input.pressed.slot2) switchTo(ctx, "secondary");
    if (input.pressed.slot3) switchTo(ctx, "fists"); // the knife
  }
  if (input.pressed.swap) switchTo(ctx, s.slot === "primary" ? "secondary" : "primary");
  if (input.pressed.zoomUp || input.pressed.zoomDown) {
    if (f.ads && st.zoomMax > st.zoom) { f.zoomStep = Math.max(0, Math.min(4, f.zoomStep + (input.pressed.zoomUp ? 1 : -1))); s.zoomX = +(st.zoom + (st.zoomMax - st.zoom) * f.zoomStep / 4).toFixed(1); }
    else if (!f.ads) switchTo(ctx, s.slot === "primary" ? "secondary" : "primary");
  }
  const healing = !!s.healUntil;
  if (input.pressed.reload && !fists && !healing) startReload(ctx);
  // F throws the selected grenade (an empty pick falls to the next one carried), X cycles frag → flash → smoke; the body leaves the hand at THROW.release
  const carried = (k) => (s[NADES[k].key] ?? 0) > 0, nextNade = (from) => { for (let i = 1; i <= NADE_ORDER.length; i++) { const k = NADE_ORDER[(NADE_ORDER.indexOf(from) + i) % NADE_ORDER.length]; if (carried(k)) return k; } return from; };
  if (input.pressed.nadeCycle && !s.panel) s.nadeKind = nextNade(s.nadeKind ?? "frag");
  if (input.pressed.grenade && !s.panel && !s.dead && !healing && ctx.now() >= (s.nadeAt ?? 0)) {
    const kind = carried(s.nadeKind ?? "frag") ? (s.nadeKind ?? "frag") : nextNade(s.nadeKind ?? "frag");
    if (carried(kind)) { s[NADES[kind].key] -= 1; s.nadeKind = kind; s.throwKind = kind; s.nadeAt = ctx.now() + 900; s.throwAt = ctx.now(); ctx.after(THROW.release, "releaseNade", { kind }); }
  }
  if (input.pressed.molotov && !s.panel && !s.dead && !healing && (s.molotovs ?? 0) > 0 && ctx.now() >= (s.nadeAt ?? 0)) { s.molotovs -= 1; s.nadeAt = ctx.now() + 900; s.throwAt = ctx.now(); throwMolotov(ctx, camPose(ctx)); }
  if (input.pressed.heal) startHeal(ctx);
  if (input.pressed.melee && !healing) { if (fists) punch(ctx, "L"); else jab(ctx); }
  f.useHeld = !!input.held.use;
}

function switchTo(ctx, slot) {
  const s = ctx.self.state, f = fpsOf(ctx);
  if (s.slot === slot || (slot === "primary" && !s.kit.primary)) return;
  if (s.slot === "fists" || slot === "fists") { s.blocking = false; }
  if (s.healUntil) { s.healUntil = 0; s.healInjected = false; s.healGiven = 0; } // switching drops the needle
  s.slot = slot; s.reloadUntil = 0; f.zoomStep = 0; s.zoomX = null; f.nextShot = ctx.now() + 350; f.drawAt = ctx.now();
  ctx.emit("playSound", { clip: SND + "sfx-weapon-draw.mp3", position: ctx.self.feetPosition, volume: 0.5 }, { audience: { player: ctx.self.id } });
}
function buyWeapon(ctx, id) {
  const s = ctx.self.state, w = weapon(id);
  if (!canBuy(ctx) || s.money < w.price || w.id !== id) return;
  s.money -= w.price;
  const slot = w.slot, old = s.kit[slot];
  const att = {}; // carry over what fits, then fit anything owned into empty slots
  for (const k of SLOTS) { const a = attachment(old?.att?.[k]); if (a && fits(a, w)) att[k] = a.id; }
  s.kit = { ...s.kit, [slot]: { id, att } };
  const st = stats(s.kit[slot]);
  s.ammo = { ...s.ammo, [slot]: st.magSize }; s.reserve = { ...s.reserve, [slot]: w.reserve };
  s.slot = slot; fpsOf(ctx).zoomStep = 0; s.zoomX = null;
  ctx.emit("playSound", { clip: SND + "sfx-gun-buy-rack.mp3", position: ctx.self.feetPosition, volume: 0.7 }, { audience: { player: ctx.self.id } });
}
function buyAtt(ctx, id) {
  const s = ctx.self.state, a = attachment(id);
  if (!a) return;
  if (!(s.owned ?? []).includes(id)) { if (!canBuy(ctx) || s.money < a.price) return; s.money -= a.price; s.owned = [...(s.owned ?? []), id]; }
  fitAtt(ctx, a.slot, id);
}
function fitAtt(ctx, slot, id) {
  const s = ctx.self.state, kit = kitOf(s), w = weapon(kit.id);
  if (id && (!(s.owned ?? []).includes(id) || !fits(attachment(id), w) || attachment(id).slot !== slot)) return;
  const att = { ...kit.att }; if (id) att[slot] = id; else delete att[slot];
  s.kit = { ...s.kit, [s.slot]: { ...kit, att } };
  const st = stats(s.kit[s.slot]);
  if (s.ammo[s.slot] > st.magSize) s.ammo = { ...s.ammo, [s.slot]: st.magSize };
  fpsOf(ctx).zoomStep = 0; s.zoomX = null;
  ctx.emit("playSound", { clip: SND + "sfx-attachment-click.mp3", position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } });
}
function startReload(ctx) {
  const s = ctx.self.state, st = stats(kitOf(s));
  if (s.reloadUntil > ctx.now() || (s.ammo[s.slot] ?? 0) >= st.magSize || (s.reserve[s.slot] ?? 0) <= 0) return;
  s.reloadUntil = ctx.now() + st.reloadS * 1000; s.reloadFor = s.slot;
  ctx.emit("playSound", { clip: SND + (st.cls === "shotgun" ? "sfx-shotgun-reload.mp3" : st.cls === "pistol" ? "sfx-pistol-reload.mp3" : "sfx-rifle-reload.mp3"), position: ctx.self.feetPosition, volume: 0.7 }, { audience: { nearby: ctx.self.feetPosition, radius: 20 } });
}

function camPose(ctx) {
  const f = fpsOf(ctx), c = f.cam;
  if (c && c.aim) { const dx = c.aim.x - c.pos.x, dy = c.aim.y - c.pos.y, dz = c.aim.z - c.pos.z, L = Math.hypot(dx, dy, dz); if (L > 0.5) { const d = { x: dx / L, y: dy / L, z: dz / L }; return { o: c.pos, d, yaw: Math.atan2(-d.x, -d.z) / D2R, pitch: Math.asin(Math.max(-1, Math.min(1, d.y))) / D2R }; } }
  if (c) return { o: c.pos, d: fwd(c.yaw, c.pitch), yaw: c.yaw, pitch: c.pitch };
  if (f.pointer) return { o: f.pointer.o, d: f.pointer.d, yaw: Math.atan2(-f.pointer.d.x, -f.pointer.d.z) / D2R, pitch: Math.asin(f.pointer.d.y) / D2R };
  const p = ctx.self.feetPosition; return { o: { x: p.x, y: p.y + C.camera.eye, z: p.z }, d: fwd(0, 0), yaw: 0, pitch: 0 };
}
// Wardens are targets only in a pvp/point round, and only across teams (state.team w / r, dealt by places/main/sim.js)
// friendly fire: a place that writes place.state.pvp decides; else its mode is looked up in combat.yml pvpModes; no mode = pvpDefault
const pvpOn = (ctx) => { const ps = ctx.place.state; if (typeof ps.pvp === "boolean") return ps.pvp; return ps.mode ? (C.pvpModes ?? []).includes(ps.mode) : !!C.pvpDefault; };
const targetOf = (ctx, id) => { if (!id) return null; const o = ctx.getObject(id); if (!o || o.id === ctx.self.id) return null; const t = o.tags ?? []; if (t.includes("raider") && (o.state?.hp ?? 0) > 0 && (!o.state?.team || o.state.team !== ctx.self.state.team)) return o; if (t.includes("player") && pvpOn(ctx) && !o.state?.dead && (o.state?.hp ?? 0) > 0 && o.state?.team && o.state.team !== ctx.self.state.team) return o; return null; };
// what the victim's body and HUD read: where it came from, the flinch side, who (the referee credits the kill from lastHitBy/lastHitAt)
function marks(ctx, t, from, now) {
  const st = t.state; st.hitFrom = { x: from.x, y: from.y, z: from.z };
  st.flinch = { dir: flinchDir(t.yaw ?? t.rotation?.yaw ?? 0, t.feetPosition, from), at: now };
  if (t.tags?.includes("player")) { st.hurtAt = now; st.hurtFrom = st.hitFrom; st.lastHitAt = now; }
}
// the shot as others see it: from the held gun on my body, to everyone but me (I see my viewmodel's)
function bodyMuzzle(ctx, yaw) {
  const p = ctx.self.feetPosition, y = yaw * D2R, B = M.body, up = ctx.self.state.crouch ? B.crouchUp : B.up;
  return { x: p.x - Math.sin(y) * B.fwd + Math.cos(y) * B.right, y: p.y + up, z: p.z - Math.cos(y) * B.fwd - Math.sin(y) * B.right };
}
const others = (ctx) => ctx.place.players.filter((p) => p.id !== ctx.self.id && Math.hypot(p.feetPosition.x - ctx.self.feetPosition.x, p.feetPosition.z - ctx.self.feetPosition.z) < 250);

function spreadDeg(ctx, st) {
  const f = fpsOf(ctx), s = ctx.self.state, v = ctx.self.velocity, sp = hsp(v);
  const a = f.adsT > 0.8;
  let cone = a ? st.adsSpread : st.hip;
  if (!a) cone *= 1 + (sp / PLAYER.walkSpeed) * C.spread.moveHip; else cone += (sp / PLAYER.walkSpeed) * st.adsSpread * 2;
  if (!ctx.self.grounded) cone *= C.spread.air;
  if (s.crouch) cone *= C.spread.crouch;
  cone += Math.min(C.spread.bloomMax, f.spray * C.spread.bloomPerShot) * (a ? 0.4 : 1);
  return cone;
}

function fire(ctx, st) {
  const s = ctx.self.state, f = fpsOf(ctx), now = ctx.now();
  if ((s.ammo[s.slot] ?? 0) <= 0) {
    if (f.firePressed) ctx.emit("playSound", { clip: SND + "sfx-gun-dry-click.mp3", position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } });
    startReload(ctx); f.nextShot = now + 250; return;
  }
  s.ammo = { ...s.ammo, [s.slot]: s.ammo[s.slot] - 1 };
  f.nextShot = now + st.interval; f.lastShot = now; f.shotAt = now; s.fireAt = now; // the body mirror (humanoid-locomotion.js) kicks on it
  if (!st.suppressed && now - (s.shotAt ?? 0) > 400) s.shotAt = now; // raiders hear it (scripts/raiders.js), marked at most 2.5x a second
  const pose = camPose(ctx), cone = spreadDeg(ctx, st), pellets = st.pellets ?? 1;
  const right = { x: Math.cos(pose.yaw * D2R), y: 0, z: -Math.sin(pose.yaw * D2R) };
  // fire leaves the barrel you see: the viewmodel's muzzle (camera frame, written by scripts/camera.js); the hit ray stays on the crosshair
  const mc0 = f.muzzleCam && now - (f.muzzleAt ?? 0) < 500 ? f.muzzleCam : { x: 0.14, y: -0.12, depth: 0.8 };
  const mc = f.tpsOn ? { x: 0, y: 0, depth: 0.7 } : mc0;
  const up = { x: right.y * pose.d.z - right.z * pose.d.y, y: right.z * pose.d.x - right.x * pose.d.z, z: right.x * pose.d.y - right.y * pose.d.x };
  let muzzle = { x: pose.o.x + pose.d.x * mc.depth + right.x * mc.x + up.x * mc.y, y: pose.o.y + pose.d.y * mc.depth + right.y * mc.x + up.y * mc.y, z: pose.o.z + pose.d.z * mc.depth + right.z * mc.x + up.z * mc.y };
  // the round flies (scripts/lib/ballistics.js): marched under gravity from the eye, landing now or after its flight
  const watchers = others(ctx), bm = watchers.length ? bodyMuzzle(ctx, pose.yaw) : null;
  if (f.tpsOn) { const b = bodyMuzzle(ctx, pose.yaw); muzzle.x = b.x; muzzle.y = b.y; muzzle.z = b.z; } // over the shoulder the round leaves the gun in the body's hands
  const speed = BAL.speedOf(st.cls), evs = [], shotN = Math.max(0, Math.round(f.spray)), showT = BAL.showTracer(shotN, st.auto);
  const shot = { by: ctx.self.id, from: { x: pose.o.x, y: pose.o.y, z: pose.o.z }, dmg: st.damage, reach: st.reach, pellets };
  let hitSnd = false;
  for (let i = 0; i < pellets; i++) {
    const r = Math.sqrt(ctx.random()) * cone * 0.5, th = ctx.random() * Math.PI * 2;
    const d = fwd(pose.yaw + Math.cos(th) * r, pose.pitch + Math.sin(th) * r);
    // the GL40: a 40 mm round leaves the barrel on an arc and bursts where it lands (scripts/grenade.js, state.impact)
    if (st.cls === "launcher") { const v0 = 38; ctx.spawn(nadeSpec("frag", muzzle, { vel: { x: d.x * v0, y: d.y * v0 + 1.5, z: d.z * v0 }, ownerId: ctx.self.id, team: s.team ?? "", fuseAt: now + 5000, impact: true })); break; }
    const fl = BAL.fly(ctx, pose.o, d, speed, { ignore: [ctx.self.id], maxDist: pellets > 1 ? Math.min(400, st.reach * 3) : 400, pass: (h) => !!st.pierce && !!targetOf(ctx, h.id) });
    let hits = fl.hits, end = fl.end, tEnd = fl.t, stopped = fl.stopped;
    // phone aim assist, bullet magnetism: a near miss on a raider bends onto it
    if (f.touch && pellets === 1 && !targetOf(ctx, hits[0]?.id)) {
      const m = raycast(ctx, pose.o, d, { distance: C.assist.magnetRange, radius: C.assist.magnetRadius, tags: ["raider"], ignoreEntities: [ctx.self.id] });
      if (m && targetOf(ctx, m.id) && (!hits[0] || m.distance <= hits[0].distance + 0.5)) { const tm = m.distance / speed; hits = [{ id: m.id, position: m.position, normal: m.normal, distance: m.distance, t: tm }]; end = m.position; tEnd = tm; stopped = true; }
    }
    const struck = [];
    for (const h of hits) {
      const t = targetOf(ctx, h.id);
      if (t) {
        struck.push(t.id);
        evs.push({ k: "hit", ...shot, tid: t.id, pos: h.position, dist: h.distance, head: h.position.y - t.feetPosition.y > 1.45, first: i === 0, snd: !hitSnd, n: { x: -d.x, y: -d.y, z: -d.z }, t: h.t });
        hitSnd = true;
        if (!st.pierce) break;
      } else { evs.push({ k: "wall", pos: h.position, normal: h.normal, mat: BAL.matOf(ctx, h), decal: i === 0, loud: i < 2, t: h.t }); break; }
    }
    if (i === 0) evs.push(...BAL.passBy(ctx, fl.pts, end, tEnd, [ctx.self.id, ...struck], pose.o, speed, stopped));
    if (showT && i < 2) {
      BAL.tracer(ctx, muzzle, end, tEnd, st.cls, { player: ctx.self.id });
      if (bm) { const mid = { x: (bm.x + end.x) / 2, z: (bm.z + end.z) / 2 }; for (const w of watchers) if (Math.hypot(w.feetPosition.x - mid.x, w.feetPosition.z - mid.z) < 150) BAL.tracer(ctx, bm, end, tEnd, st.cls, { player: w.id }); }
    }
    if (i === 0) { f.lastFlight = { t: +tEnd.toFixed(4), drop: +fl.drop.toFixed(3), dist: +Math.hypot(end.x - pose.o.x, end.y - pose.o.y, end.z - pose.o.z).toFixed(1), hit: hits[0]?.id ?? null, hitDist: hits[0] ? +hits[0].distance.toFixed(1) : null, n: hits.length }; if (s.shotLog) { ctx.log("shot", { w: kitOf(s).id, ...f.lastFlight, o: pose.o, d: d }); s.shotTrace = [...(s.shotTrace ?? []).slice(-5), { w: kitOf(s).id, ...f.lastFlight, o: pose.o, d: d }]; } }
  }
  BAL.schedule(ctx, evs, landShot);
  if (st.flash > 0.5) {
    ctx.emit("fx", { position: muzzle, script: FX.muzzle, params: { dir: pose.d } }, { audience: { player: ctx.self.id } });
    if (bm) for (const w of watchers) ctx.emit("fx", { position: bm, script: FX.muzzle, params: { dir: pose.d } }, { audience: { player: w.id } });
  }
  BAL.shotSound(ctx, muzzle, st.cls, st.suppressed);
  // recoil: the camera kicks up and drifts, the pattern walks sideways after the fifth round
  // creator, Oct 9: "use exactly whats on enari-engine": its FPSCameraManager.createRecoil, the camera rotated for good (no settle)
  const en = (f.enari ??= { idx: 1, dir: -1, p: 0, y: 0 });
  en.dir = ctx.random() <= 0.1 ? -en.dir : en.dir;
  const pd = (x) => 1.2 * x * Math.exp(1 - 1.2 * x), x2 = 5 - (en.idx % 5), yd = 0.6 * x2 * Math.exp(1 - 0.6 * x2);
  // per gun: the pattern's size rides the gun's kick (a smg flicks, a magnum or a sniper bucks); it settles back in scripts/camera.js
  const kk = Math.max(0.4, Math.min(3, (st.kick ?? 1.2) / 1.2));
  en.p = Math.min(14, en.p + (pd(en.idx / 2) / 30) * 57.29578 * kk); en.y = Math.max(-6, Math.min(6, en.y + (yd / 50) * en.dir * 57.29578 * kk * 0.6)); en.idx++;
  f.spray += 1; f.kickAt = now;
  if (s.ammo[s.slot] <= 0) startReload(ctx);
}

// a range plate: steel, never blood. The plate's own script rings and swings it; the shooter reads the distance off the hit,
// and a sniper-ladder plate (state.ladder 1..4) advances the 150-200-250-300 run when hit in order inside 45 s
function plateShot(ctx, t, e) {
  const s = ctx.self.state, now = ctx.now();
  t.state.hp -= Math.max(1, Math.round(e.dmg)); t.state.lastHitBy = ctx.self.id;
  const m = Math.round(Math.hypot(e.pos.x - e.from.x, e.pos.z - e.from.z));
  ctx.emit("damageNumber", { position: { ...e.pos, y: e.pos.y + 0.4 }, text: m + " m", color: "oklch(0.9 0.12 85)", size: m > 120 ? 2.2 : 1.2 }, { audience: { player: ctx.self.id } });
  s.hitAt = now; s.hitHead = false;
  ctx.emit("playSound", { clip: SND + "sfx-hitmarker-tick.mp3", position: e.from, volume: 0.5 }, { audience: { player: ctx.self.id } });
  const rung = t.state.ladder;
  if (!rung) return;
  const L = { ...(s.ladder ?? {}) }, live = (L.step ?? 0) > 0 && now - (L.at ?? 0) < 45000;
  if (rung === 1) { L.step = 1; L.start = now; L.at = now; }
  else if (live && rung === L.step + 1) { L.step = rung; L.at = now; }
  else return;
  if (L.step === 4) {
    L.last = now - L.start; L.best = Math.min(L.best ?? 1e9, L.last); L.doneAt = now; L.step = 0;
    ctx.emit("playSound", { clip: SND + "sfx-headshot-ding.mp3", position: e.from, volume: 1, pitch: 0.8 }, { audience: { player: ctx.self.id } });
  } else ctx.emit("playSound", { clip: SND + "sfx-headshot-ding.mp3", position: e.from, volume: 0.6, pitch: 1 + rung * 0.12 }, { audience: { player: ctx.self.id } });
  s.ladder = L;
}

// a round arrives: the same damage, marks and kill credit the instant shot gave, at its flight's end (lastHitBy → the referee)
function landShot(ctx, e) {
  if (e.k !== "hit") return BAL.landCommon(ctx, e);
  const t = targetOf(ctx, e.tid); if (!t) return;
  if (t.tags?.includes("range-plate")) return plateShot(ctx, t, e);
  const s = ctx.self.state, now = ctx.now(), isHead = e.head, pellets = e.pellets;
  const fall = e.dist > e.reach ? Math.max(0.35, 1 - (e.dist - e.reach) / e.reach) : 1;
  const isP = t.tags?.includes("player");
  let dmg = Math.round(e.dmg * fall * (isHead ? (pellets > 1 ? (isP ? 2 : 1.5) : (isP ? 4 : 3)) : 1));
  if (isP) { const arm = t.state.armor ?? 0; if (arm > 0) { const soak = Math.min(arm, Math.round(dmg * C.hp.armorAbsorb)); t.state.armor = arm - soak; dmg -= soak; } }
  if (e.first) marks(ctx, t, e.from, now);
  if (isP && e.first) ctx.log("pvp: hit", { by: ctx.self.id, victim: t.id, dmg, head: isHead, team: s.team, mode: ctx.place.state.mode });
  const wasUp = (t.state.hp ?? 100) > 0;
  t.state.hp -= dmg; t.state.lastHitBy = ctx.self.id; t.state.lastHitHead = isHead; t.state.hitAt = now; s.rd = (s.rd ?? 0) + dmg;
  if (!isP) RAG.mark(t, dmg, e.from, now);
  if (e.first) hitSnd(ctx, dmg >= HS.heavyDmg ? "bodyLarge" : "bodySmall", e.pos, { volume: 0.75 });
  if (wasUp && t.state.hp <= 0) { hitSnd(ctx, "finisher", e.from, { volume: 0.9 }, { audience: { player: ctx.self.id } }); if (isHead) { hitSnd(ctx, "crunch", e.pos, { volume: 1 }); headPop(ctx, t, e.pos, e.from); } }
  if (e.first) { ctx.emit("flash", { target: t.id, color: isHead ? "oklch(0.85 0.2 40)" : "oklch(0.9 0.08 30)", duration: 0.07 }); ctx.emit("squash", { target: t.id, axis: "y", intensity: isHead ? 0.1 : 0.05, duration: 0.12 }); }
  ctx.emit("damageNumber", { position: { ...e.pos, y: e.pos.y + 0.2 }, value: dmg, crit: isHead, color: isHead ? "oklch(0.85 0.18 60)" : "oklch(0.95 0.02 90)" }, { audience: { player: ctx.self.id } });
  BAL.blood(ctx, e.pos, e.n, e.from);
  if (e.snd || isHead) { s.hitAt = now; s.hitHead = isHead || (s.hitHead && now - (s.hitAt ?? 0) < 60); ctx.emit("playSound", { clip: SND + (isHead ? "sfx-headshot-ding.mp3" : "sfx-hitmarker-tick.mp3"), position: e.from, volume: isHead ? 0.8 : 0.5 }, { audience: { player: ctx.self.id } }); }
}
export function releaseNade(ctx, p) { if (!ctx.self.state.dead) throwNade(ctx, camPose(ctx), p?.kind ?? "frag"); if (!((ctx.self.state[NADES[ctx.self.state.nadeKind ?? "frag"]?.key] ?? 0) > 0)) { const k = NADE_ORDER.find((k) => (ctx.self.state[NADES[k].key] ?? 0) > 0); if (k) ctx.self.state.nadeKind = k; } }
export function bulletLands(ctx, payload) { for (const e of payload?.evs ?? []) landShot(ctx, e); }

function melee(ctx) {
  const s = ctx.self.state, f = fpsOf(ctx), now = ctx.now();
  if (s.dead || now < (f.meleeAt ?? 0)) return;
  f.meleeAt = now + C.melee.cooldown * 1000; f.slashAt = now;
  const pose = camPose(ctx);
  const h = raycast(ctx, pose.o, pose.d, { distance: C.melee.reach, radius: 0.25, ignoreEntities: [ctx.self.id] });
  // creator Oct 12: no white slash arc
  // ctx.emit("slash", { position: { x: pose.o.x + pose.d.x, y: pose.o.y + pose.d.y - 0.1, z: pose.o.z + pose.d.z }, size: 0.9, shape: "crescent" });
  const t = h && targetOf(ctx, h.id);
  ctx.emit("playSound", { clip: SND + (t ? "sfx-knife-stab-flesh.mp3" : "sfx-knife-swing-whoosh.mp3"), position: pose.o, volume: 0.8 });
  if (!t && h) hitSnd(ctx, BAL.matOf(ctx, h) === "metal" ? "blade" : "stone", h.position, { volume: 0.6 });
  if (!t) return;
  hitSnd(ctx, "bodySmall", h.position, { volume: 0.7 });
  const ty = ((t.rotation?.yaw ?? 0) * D2R), tf = { x: -Math.sin(ty), z: -Math.cos(ty) };
  const back = tf.x * pose.d.x + tf.z * pose.d.z > 0.5;
  const dmg = back ? C.melee.backstab : C.melee.dmg;
  marks(ctx, t, pose.o, now);
  t.state.hp -= dmg; t.state.lastHitBy = ctx.self.id; t.state.hitAt = now;
  s.hitAt = now; s.hitHead = back;
  ctx.emit("damageNumber", { position: h.position, value: dmg, crit: back }, { audience: { player: ctx.self.id } });
  ctx.emit("fx", { position: h.position, script: FX.blood, params: { normal: { x: -pose.d.x, y: 0, z: -pose.d.z } } });
  ctx.emit("hitstop", { duration: 0.06 }, { audience: { player: ctx.self.id } });
}

// the fists: LMB alternates right and left, RMB blocks; with a gun up, V is a left-hand jab
function strike(ctx, dmg, reach, knife) {
  const s = ctx.self.state, now = ctx.now(), pose = camPose(ctx);
  const h = raycast(ctx, pose.o, pose.d, { distance: reach, radius: 0.3, ignoreEntities: [ctx.self.id] });
  const t = h && targetOf(ctx, h.id);
  ctx.emit("playSound", { clip: SND + (knife ? (t ? "sfx-knife-stab-flesh.mp3" : "sfx-knife-swing-whoosh.mp3") : (t ? "sfx-punch-impact-face.mp3" : "sfx-punch-swing-whoosh.mp3")), position: pose.o, volume: 0.8, pitch: 0.92 + ctx.random() * 0.16 });
  if (!knife) hitSnd(ctx, "whoosh", pose.o, { volume: 0.55 });
  if (t) hitSnd(ctx, knife ? "bodySmall" : "bodyLarge", h.position, { volume: 0.8 });
  if (false && knife) ctx.emit("slash", { position: { x: pose.o.x + pose.d.x, y: pose.o.y + pose.d.y - 0.1, z: pose.o.z + pose.d.z }, size: 0.8, shape: "crescent" });
  if (!t) return;
  marks(ctx, t, pose.o, now);
  t.state.hp -= dmg; t.state.lastHitBy = ctx.self.id; t.state.hitAt = now; s.rd = (s.rd ?? 0) + dmg;
  s.hitAt = now; s.hitHead = false;
  ctx.emit("damageNumber", { position: h.position, value: dmg }, { audience: { player: ctx.self.id } });
  ctx.emit("flash", { target: t.id, color: "oklch(0.9 0.05 40)", duration: 0.08 });
  ctx.emit("squash", { target: t.id, axis: "z", intensity: 0.12, duration: 0.15 });
  ctx.emit("impulse", { target: t.id, impulse: { x: pose.d.x * 180, y: 40, z: pose.d.z * 180 } });
  ctx.emit("hitstop", { duration: 0.05 }, { audience: { player: ctx.self.id } });
  ctx.emit("cameraPunch", { direction: pose.d, intensity: 0.25 }, { audience: { player: ctx.self.id } });
}
function punch(ctx, side) {
  const f = fpsOf(ctx), now = ctx.now(), s = ctx.self.state;
  if (s.dead || s.blocking || now < (f.meleeAt ?? 0)) return;
  f.meleeAt = now + C.melee.cooldown * 1000;
  f.punchSide = side ?? (f.punchSide === "R" ? "L" : "R"); f.punchAt = now; s.punchAt = now; f.jab = false; f.inspectAt = 0;
  ctx.after(0.12, "punchLands", { side: f.punchSide });
}
function jab(ctx) {
  const f = fpsOf(ctx), now = ctx.now();
  if (ctx.self.state.dead || now < (f.meleeAt ?? 0)) return;
  f.meleeAt = now + C.fists.jabCooldown * 1000; f.punchSide = "L"; f.punchAt = now; ctx.self.state.punchAt = now; f.jab = true; f.nextShot = Math.max(f.nextShot, now + 520);
  ctx.after(0.12, "jabLands", {});
}
export function punchLands(ctx) { strike(ctx, C.melee.dmg, C.melee.reach, true); } // slot 3 is the knife: 55 a cut, 2.2 m
export function jabLands(ctx) { strike(ctx, C.fists.jabDmg, C.fists.reach); }

function wallKick(ctx) {
  const p = ctx.self.feetPosition, o = { x: p.x, y: p.y + 1.0, z: p.z };
  let best = null;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = { x: Math.cos(a), y: 0, z: Math.sin(a) };
    const h = raycast(ctx, o, d, { distance: C.move.wallReach + 0.4, bodies: "static", ignoreEntities: [ctx.self.id] });
    if (h && h.normal && Math.abs(h.normal.y) < 0.35 && (!best || h.distance < best.distance)) best = h;
  }
  return best;
}

// moving with a gun: the creator's handling rustles, one per stride, picked at random from the class's set (her s&box movement sets)
const GEAR = {
  pistol: ["/cdn/movement-pistol-handling-gear-mech-0p75k7bv.mp3", "/cdn/movement-pistol-weapon-handling-8qtsglgr.mp3", "/cdn/movement-pistol-gear-handling-1xynyfpq.mp3", "/cdn/movement-pistol-gear-handling-u1pmkqth.mp3"],
  smg: ["/cdn/movement-smg-weapon-gear-handling-v1ugu3cr.mp3", "/cdn/movement-smg-weapon-handling-aqp1abnk.mp3", "/cdn/movement-smg-weapon-handling-gear-mtfnvsjc.mp3", "/cdn/movement-smg-03-tactical-gear-1k6bkyb0.mp3"],
  shotgun: ["/cdn/movement-shotgun-handling-gear-5cgxsjf6.mp3", "/cdn/movement-shotgun-weapon-handling-94lm7snz.mp3", "/cdn/movement-shotgun-weapon-handling-njndc3b4.mp3", "/cdn/movement-shotgun-weapon-handling-2mck5wt2.mp3"],
  rifle: ["/cdn/movement-rifle-handling-equipment-u8iit0ns.mp3", "/cdn/movement-rifle-gear-handling-i1pq7we0.mp3", "/cdn/movement-rifle-handling-gear-esbpydc2.mp3", "/cdn/movement-rifle-gear-rustle-ei72oea9.mp3"],
  sniper: ["/cdn/movement-sniper-stealth-footsteps-d9fpicn5.mp3", "/cdn/movement-sniper-stealth-gear-xbm3nxml.mp3", "/cdn/movement-sniper-stealth-shift-tllvwj7z.mp3", "/cdn/movement-sniper-stealth-action-jzx3w459.mp3"],
};
function gearRustle(ctx, s, st, v, now) {
  if (s.slot === "fists" || ctx.self.grounded === false) return;
  const sp = Math.hypot(v.x || 0, v.z || 0);
  if (sp < 1.2) return;
  const set = GEAR[st.cls] ?? (st.cls === "lmg" ? GEAR.rifle : null);
  if (!set) return;
  const gap = s.crouch ? 0.75 : sp > 7 ? 0.36 : 0.5; // one rustle a stride, quicker at a run
  const m = (ctx.session.gear ??= {});
  if (now - (m[ctx.self.id] ?? 0) < gap * 1000) return;
  m[ctx.self.id] = now;
  ctx.emit("playSound", { clip: set[Math.floor(ctx.random() * set.length)], position: ctx.self.feetPosition, volume: s.crouch ? 0.18 : 0.32, pitch: 0.94 + ctx.random() * 0.12, maxDistance: s.crouch ? 8 : 18 }, { audience: { nearby: ctx.self.feetPosition, radius: 18 } });
}

// THE RANGE: out past the lobby's south fence (z > 25.6, the corridor |x| < 34). Stepping out snapshots what you carry;
// on the range money reads 99,999 so the whole buy menu (B) is free, magazines and reserves never run dry, grenades restock;
// stepping back inside the fence, or leaving the lobby any way at all, puts back exactly what you had.
const RANGE_KEYS = ["money", "kit", "ammo", "reserve", "slot", "owned", "grenades", "flashes", "smokes", "molotovs", "armor", "nadeKind"];
const inRangeZone = (ctx) => { const p = ctx.self.feetPosition; return ctx.self.place === "lobby" && p.z > 25.6 && p.z < 400 && Math.abs(p.x) < 34; };
function rangeTick(ctx, s) {
  const on = inRangeZone(ctx);
  if (on && !s.onRange) {
    const save = {}; for (const k of RANGE_KEYS) if (s[k] !== undefined) save[k] = JSON.parse(JSON.stringify(s[k]));
    s.rangeSave = save; s.onRange = true; s.money = 99999; s.panel = false;
    ctx.emit("playSound", { clip: SND + "sfx-gun-buy-rack.mp3", position: ctx.self.feetPosition, volume: 0.6 }, { audience: { player: ctx.self.id } });
  } else if (!on && (s.onRange || s.rangeSave)) {
    const save = s.rangeSave ?? {};
    for (const k of RANGE_KEYS) { if (save[k] !== undefined) s[k] = save[k]; else if (k !== "money") delete s[k]; }
    s.rangeSave = null; s.onRange = false; s.panel = false; s.buyCat = null; s.reloadUntil = 0;
    ctx.emit("playSound", { clip: SND + "sfx-weapon-draw.mp3", position: ctx.self.feetPosition, volume: 0.5 }, { audience: { player: ctx.self.id } });
  }
  if (!s.onRange) return;
  if ((s.money ?? 0) < 90000) s.money = 99999;
  const slot = s.slot, w = slot && s.kit?.[slot] ? weapon(s.kit[slot].id) : null;
  if (w && (s.reserve?.[slot] ?? 0) < w.reserve) s.reserve = { ...s.reserve, [slot]: w.reserve };
  for (const k of NADE_ORDER) { const r = NADES[k]; if (r && (s[r.key] ?? 0) < 1) s[r.key] = 1; }
}
// how deep this player's eyes are in a smoke cloud, 0..1 in tenths: the HUD greys the screen out by it (raiders already go blind through it)
function smokeSense(ctx, s, now) {
  const ses = ctx.self.session; if (now < (ses.smokeNext ?? 0)) return; ses.smokeNext = now + 150;
  const p = ctx.self.feetPosition, e = { x: p.x, y: p.y + 1.6, z: p.z }; let k = 0;
  for (const r of ctx.query({ tags: ["smoke"], center: e, radius: 10 })) {
    if ((r.state?.until ?? 0) < now - 3000) continue;
    const R = r.state?.r ?? 6, c = r.feetPosition, d = Math.hypot(e.x - c.x, (e.y - c.y - 1.4) * 1.4, e.z - c.z);
    const fade = (r.state?.until ?? 0) > now ? 1 : Math.max(0, 1 - (now - r.state.until) / 3000), born = Math.min(1, (now - ((r.state?.until ?? now) - 18000)) / 1500);
    k = Math.max(k, Math.min(1, (1 - d / (R * 1.05)) * 1.8) * fade * born);
  }
  const q = Math.round(Math.max(0, k) * 10) / 10; if (q !== (s.smokeK ?? 0)) s.smokeK = q;
}
export function update(ctx, dt) {
  if (ctx.self.state.headless && (ctx.self.state.hp ?? 100) > 0) headBack(ctx.self);
  if (ctx.self.state.ride || ctx.self.parent) return; // seated: the game's seat script runs the body
  ensure(ctx);
  const s = ctx.self.state, f = fpsOf(ctx), now = ctx.now(), v = ctx.self.velocity;
  bodyGun(ctx, s);
  if (s.hp <= 0 && !s.dead) { s.dead = true; s.deaths = (s.deaths ?? 0) + 1; s.panel = false; ctx.emit("playSound", { clip: SND + "sfx-body-fall-death.mp3", position: ctx.self.feetPosition }); hitSnd(ctx, "bodyLarge", ctx.self.feetPosition, { volume: 0.6, pitch: 0.8 }); }
  if (s.dead) { if (s.healUntil) endHeal(ctx, true); s.syrLife = 0; } else if (!s.syrLife) { s.syrLife = 1; if ((s.syringes ?? 0) < C.syringe.perLife) s.syringes = C.syringe.perLife; } // a fresh syringe every life
  if (s.dead && !s.ragDead) { // the body goes limp, thrown along the killing hit
    s.ragDead = true; const hf = s.hitFrom ?? s.hurtFrom, p = ctx.self.feetPosition;
    const dx = hf ? p.x - hf.x : 0, dz = hf ? p.z - hf.z : 0, l = Math.hypot(dx, dz) || 1, m = RAG.RAGDOLL.mass, push = hf ? RAG.RAGDOLL.push * 0.8 : 0;
    try { ctx.self.ragdoll = { impulse: { x: dx / l * push * m, y: RAG.RAGDOLL.lift * 0.6 * m, z: dz / l * push * m }, settleFreeze: true, settleSeconds: 3, blendSeconds: 0.2 }; } catch (e) { ctx.log("player ragdoll refused", { err: String(e) }); }
  }
  if (!s.dead && s.ragDead) { s.ragDead = false; ctx.self.ragdoll = null; }
  if (s.dead) { if (!s.ragDead) ctx.self.velocity = { x: 0, y: v.y + ctx.place.gravity.y * dt, z: 0 }; return; }
  smokeSense(ctx, s, now);
  rangeTick(ctx, s);
  healTick(ctx, s, f, now);
  const st = stats(kitOf(s));
  gearRustle(ctx, s, st, v, now);

  // reload completes
  if (s.reloadUntil && now >= s.reloadUntil) {
    const slot = s.reloadFor ?? s.slot, need = st.magSize - (s.ammo[slot] ?? 0), take = Math.min(need, s.reserve[slot] ?? 0);
    s.ammo = { ...s.ammo, [slot]: (s.ammo[slot] ?? 0) + take }; s.reserve = { ...s.reserve, [slot]: (s.reserve[slot] ?? 0) - take }; s.reloadUntil = 0;
  }

  // crouch and slide
  const grounded = ctx.self.grounded, sp = hsp(v);
  if (f.crouchPressed && grounded && sp > C.move.slideMinSpeed && !f.ads && !(f.slideUntil > now)) {
    f.slideUntil = now + C.move.slideTime * 1000; f.slideDir = { x: v.x / sp, z: v.z / sp };
    ctx.emit("playSound", { clip: SND + "sfx-gravel-slide.mp3", position: ctx.self.feetPosition, volume: 0.7 });
    ctx.emit("fx", { position: ctx.self.feetPosition, script: FX.dust, params: {} });
  }
  f.crouchPressed = false;
  const sliding = f.slideUntil > now;
  const crouch = f.crouchHeld || sliding;
  if (!!s.crouch !== crouch) s.crouch = crouch;
  f.sliding = sliding;
  if (!!s.sliding !== sliding) s.sliding = sliding;

  // intent: WASD + Q/E strafe (Q/E peek instead while aiming)
  const mx = (f.moveX ?? 0) + (f.ads ? 0 : f.leanAxis ?? 0), mz = f.moveZ ?? 0, mag = Math.hypot(mx, mz);
  const nx = mag > 1 ? mx / mag : mx, nz = mag > 1 ? mz / mag : mz;
  const onFists = s.slot === "fists";
  let speed = PLAYER.walkSpeed * (onFists ? C.fists.speedMul * (s.blocking ? 0.7 : 1) : st.speed) * (f.ads ? C.move.adsMul : 1) * (crouch ? C.move.crouchMul : 1) * (s.slot === "syringe" ? C.syringe.speedMul : 1);
  const sn = f.sin ?? 0, cs = f.cos ?? 1;
  let ix = (cs * nx - sn * nz) * speed, iz = -(sn * nx + cs * nz) * speed;
  let vx, vz;
  if (sliding) {
    const k = (f.slideUntil - now) / (C.move.slideTime * 1000);
    const ss = PLAYER.walkSpeed * C.move.crouchMul + (C.move.slideSpeed - PLAYER.walkSpeed * C.move.crouchMul) * k;
    vx = f.slideDir.x * ss; vz = f.slideDir.z * ss;
  } else {
    const along = ix * v.x + iz * v.z > 0 || (v.x === 0 && v.z === 0);
    const acc = (grounded ? (along ? PLAYER.acceleration : PLAYER.deceleration) : 18) * dt;
    const dx = ix - v.x, dz = iz - v.z, gap = Math.hypot(dx, dz), k = gap > acc ? acc / gap : 1;
    vx = v.x + dx * k; vz = v.z + dz * k;
  }
  // dodge: a burst along the tapped direction in the camera's frame; the third-person body plays the roll / flip
  const D = C.dodge;
  if (f.dodgeReq && grounded && !sliding && now >= (f.dodgeReady ?? 0)) {
    const r = f.dodgeReq, lx = r.d === "r" ? 1 : r.d === "l" ? -1 : 0, lz = r.d === "f" ? 1 : r.d === "b" ? -1 : 0;
    const dx = cs * lx - sn * lz, dz = -(sn * lx + cs * lz), time = r.combat ? D.combatTime : D.time;
    f.dodge = { x: dx, z: dz, until: now + time * 1000, speed: r.combat ? D.combatSpeed : D.speed, time };
    f.dodgeReady = now + D.cooldown * 1000; f.dodgeAt = now; f.dodgeDir = r.d;
    s.dodge = { d: r.d, combat: r.combat, at: now };
    ctx.emit("playSound", { clip: SND + "sfx-gravel-slide.mp3", position: ctx.self.feetPosition, volume: 0.45, pitch: 1.3 });
    ctx.emit("fx", { position: ctx.self.feetPosition, script: FX.dust, params: {} });
  }
  f.dodgeReq = null;
  if (f.dodge && now < f.dodge.until) {
    const k = (f.dodge.until - now) / (f.dodge.time * 1000), sp2 = f.dodge.speed * (0.45 + 0.55 * k);
    vx = f.dodge.x * sp2; vz = f.dodge.z * sp2;
  } else if (f.dodge) { f.dodge = null; }
  let vy = v.y + ctx.place.gravity.y * dt;
  if (grounded) f.kickUsed = false;
  if (f.jumpPressed) {
    if (grounded) { vy = PLAYER.jumpSpeed; if (sliding) { f.slideUntil = 0; } if (!f.dodge) { f.jumpAt = now; s.jumpAt = now; } }
    else if (!f.kickUsed) {
      const w = wallKick(ctx);
      if (w) {
        f.kickUsed = true; vy = C.move.wallKickUp; vx = vx * 0.5 + w.normal.x * C.move.wallKickPush; vz = vz * 0.5 + w.normal.z * C.move.wallKickPush;
        ctx.emit("playSound", { clip: SND + "sfx-boot-wall-kick.mp3", position: w.position, volume: 0.8 });
        ctx.emit("fx", { position: w.position, script: FX.impact, params: { normal: w.normal } });
      }
    }
  }
  f.jumpPressed = false;
  // freeze time: sim.js holds every seated body in its spawn until the buy phase ends (look, buy, no walking)
  const ps = ctx.place.state;
  if (ps.frozen && (s.team === "w" || s.team === "r")) { vx = 0; vz = 0; if (vy > 0) vy = 0; }
  // the buy menu closes itself when buying ends
  if (s.panel && !canBuy(ctx)) { s.panel = false; s.buyCat = null; }
  ctx.self.velocity = { x: vx, y: vy, z: vz };

  // ADS blend (camera reads adsT), spray recovery
  const adsRate = 1 / Math.max(0.08, st.adsTime);
  f.adsT = Math.max(0, Math.min(1, f.adsT + (f.ads ? adsRate : -adsRate * 1.4) * dt));
  if (now - (f.lastShot ?? 0) > st.interval + 120) f.spray = Math.max(0, f.spray - C.spread.recover * dt);
  f.st = st;

  // phone aim assist: slowdown over a raider, and auto-fire when one sits in the reticle
  let auto = false;
  if (f.touch) {
    const pose = camPose(ctx);
    const slow = raycast(ctx, pose.o, pose.d, { distance: C.assist.magnetRange, radius: C.assist.slowRadius, tags: ["raider"], ignoreEntities: [ctx.self.id] });
    f.aimSlow = !!(slow && targetOf(ctx, slow.id));
    if (f.aimSlow) {
      const tight = raycast(ctx, pose.o, pose.d, { distance: Math.min(st.reach * 1.3, 120), radius: C.assist.autofireRadius, ignoreEntities: [ctx.self.id] });
      auto = !!(tight && targetOf(ctx, tight.id));
    }
  } else f.aimSlow = false;

  // the trigger
  const reloading = s.reloadUntil > now;
  const buffered = now - (f.fireBuf ?? -1e9) < 200;
  const wants = st.auto ? (f.fire || auto) : (buffered || (auto && now - (f.lastShot ?? 0) > Math.max(st.interval, 220)));
  f.fists = onFists;
  if (onFists) { if ((f.firePressed || (f.fire && now >= (f.meleeAt ?? 0))) && !s.panel) punch(ctx); f.firePressed = false; }
  else if (wants && !reloading && now >= f.nextShot && !s.panel && s.slot !== "syringe") {
    if (st.burst) { for (let b = 0; b < st.burst && (s.ammo[s.slot] ?? 0) > 0; b++) fire(ctx, st); f.nextShot = now + st.interval * st.burst + 180; }
    else fire(ctx, st);
    f.fireBuf = -1e9;
  }
  f.firePressed = false;

  // defuse: hold F at the charge
  const bomb = ctx.place.state.bombId ? ctx.getObject(ctx.place.state.bombId) : null;
  if (bomb && f.useHeld && !bomb.state.defused && Math.hypot(bomb.feetPosition.x - ctx.self.feetPosition.x, bomb.feetPosition.z - ctx.self.feetPosition.z) < 2.4) {
    if (!s.defusing) { s.defusing = now; ctx.emit("playSound", { clip: SND + "sfx-wire-cutting-defuse.mp3", position: bomb.feetPosition, volume: 0.7 }); }
    if (now - s.defusing > 5000) { bomb.state.defused = true; bomb.state.defusedBy = ctx.self.id; s.defusing = 0; }
  } else if (s.defusing) s.defusing = 0;

  // where the last hit came from, relative to the view, for the HUD's damage arc
  if (s.hurtFrom && now - (s.hurtAt ?? 0) < 1600) {
    const pose = camPose(ctx), dx = s.hurtFrom.x - ctx.self.feetPosition.x, dz = s.hurtFrom.z - ctx.self.feetPosition.z;
    const bearing = Math.atan2(-dx, -dz) / D2R; let rel = ((pose.yaw - bearing) % 360 + 540) % 360 - 180;
    rel = Math.round(rel / 15) * 15; if (s.hurtDir !== rel) s.hurtDir = rel;
  }
  if (s.nearMissFrom && now - (s.nearMissFrom.at ?? 0) < 1200) {
    const pose = camPose(ctx), dx = s.nearMissFrom.x - ctx.self.feetPosition.x, dz = s.nearMissFrom.z - ctx.self.feetPosition.z;
    let rel = ((pose.yaw - Math.atan2(-dx, -dz) / D2R) % 360 + 540) % 360 - 180; rel = Math.round(rel / 15) * 15; if (s.missDir !== rel) s.missDir = rel;
  }
  // crosshair width for the HUD, written only when it moves a step
  const cross = Math.round(spreadDeg(ctx, st) * 4);
  if (s.cross !== cross) s.cross = cross;
}

// the gun on the body: the kit's modular gun (scripts/gen/gun.js) in the right hand, seen by everyone and by me in third person
const GUN_HAND = { pos: { x: 0.02, y: 0.09, z: 0.03 }, rot: { yaw: 0, pitch: -90, roll: -90 } };
function bodyGun(ctx, s) {
  const kit = s.dead || s.slot === "fists" || s.slot === "syringe" ? null : s.kit?.[s.slot];
  const key = kit ? kit.id + "|" + JSON.stringify(kit.att ?? {}) : "";
  const id = s.bodyGun, have = id ? ctx.getObject(id) : null;
  if (key === (s.bodyGunKey ?? "") && (!key || have)) return;
  if (have) ctx.destroy(id);
  s.bodyGun = null; s.bodyGunKey = key;
  if (!key) return;
  const st = stats(kit), a = kit.att ?? {};
  if (st.cls === "melee") return;
  const params = { cls: st.cls, len: +(st.len * st.lenMul).toFixed(3), hue: st.hue, optic: a.optic ?? (st.scoped ? "scope" : ""), muzzle: a.muzzle ?? (st.suppressed ? "supp" : ""), grip: a.grip ?? "", mag: a.mag ?? "", stock: a.stock ?? "", barrel: a.barrel ?? "", pellets: st.pellets ?? 1 };
  s.bodyGun = ctx.spawn({ parent: ctx.self.id, attachment: { bone: "RightHand" }, scope: "session", castShadow: true, feetPosition: GUN_HAND.pos, rotation: GUN_HAND.rot, primitive: { kind: "scripted", script: "mods/fps-grudge/lib/gun.js", params }, tags: ["body-gun"] });
}
