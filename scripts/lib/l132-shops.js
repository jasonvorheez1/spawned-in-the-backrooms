// Level 132 · the three walk-in shops (RadioShed, Starlite Diner, Dial-Up Cafe). lay(ctx, L) builds one shop a tick (ctx.place.state.shopsV);
// tick(ctx, L) settles tabletop pieces onto what stands under them and flickers the TV wall. This file is also the props' behavior (ears.press).
// Layout and every number: scripts/lib/data/l132-shops.yml. Doors: scripts/door-geo.js leaves on scripts/home11-door.js hinges.
import S from "./data/l132-shops.yml";
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
export const RANGE = { small: 32, fixture: 50 }; // metres a shop's inside props draw from (the shells themselves always draw)
const ME = "scripts/lib/l132-shops.js", FOFF = { "-z": 0, "+z": 180, "+x": 90, "-x": -90 };
const rot = (x, z, yaw) => { const r = (yaw * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return { x: x * c + z * s, z: -x * s + z * c }; };
const at = (sh, x, z, y) => { const p = rot(x, z, sh.yaw); return { x: sh.x + p.x, y, z: sh.z + p.z }; };
const say = (ctx, by, text) => { const w = ctx.getObject(by)?.state; if (w) w.notice = { text, at: ctx.now() }; };

// ── what each prop does when pressed: one row per scene id (suffix after "l132-shop-"), a shared deck of moves ──
const G = "cdn/moodboard-realistic-gritty/";
const STEAM = `fx
pop steam burst=9..12 life=.9..1.5 on=disc(.05) v=up(.4..0.8)+sdir()*.08 size=.05..0.1 acc=buoy(.35)+curl(.3)+drag(1.2) col=<.92,.9,.88> a=0>.3:.35>.6:.2>0 sz=$size*(.6>2.4) rot=spin(.3) r=sprite(smoke-puff,alpha)`;
const SPARK = `fx
pop px burst=14..20 life=.4..0.8 v=up(1.2..2)+sdir()*(.6..1.2) size=.02..0.04 acc=grav()*.7+drag(.8) col=hdr(2.4,1.6,.6)>hdr(1.2,.4,.1) a=1>.6:1>0 r=sprite(ember,add,velocity,.02)`;
const CONFETTI = `fx
pop card burst=18 life=1.2..1.8 v=up(1.6..2.4)+sdir()*(.5..1) size=.05..0.08 acc=grav()*.5+drag(1.4) tint=<1,.2,.2>..<.2,.3,1> col=$tint a=1>.8:1>0 rot=spin(4) floor=stick r=sprite(soft-disc,alpha)`;
const RT = (n) => `${G}sfx-${n}.mp3`;

// purpose rows. cd: minutes per player; give: a bag token; feed: needs; cents: + paid / - spent; batt/pins: spares
const P = {
  "a-tvwall-1": { move: "shudder", glow: "oklch(0.8 0.1 240)", sfx: "crt-television-channel-change-click-static", feed: { sanity: 4 }, cd: 10,
    say: ["Channel 3: a weather map of Lumiria. Sunny. It's always sunny.", "Channel 9: a home-shopping host selling the same lamp, twice.", "Channel 12: test pattern. The Indian head looks tired."] },
  "a-tvwall-2": { move: "roll", glow: "oklch(0.7 0.14 25)", sfx: "vcr-tape-rewind-whir-clunk",
    say: ["CAM 4 · the hollow tree on the hill. Something metal sits in the knot.", "CAM 2 · Bit Barn's back door. Dex is carrying an antenna like a baby."] },
  "a-shelf-1": { move: "nudge", sfx: "big-mouth-billy-bass-singing-fish-motor", feed: { sanity: 5 }, cd: 15,
    say: ["The talking fish does two bars of 'Take Me to the River' and dies again."] },
  "a-shelf-2": { move: "roll", sfx: "walkie-talkie-squelch-static-burst",
    say: ["Walkie squawks: '…antenna's at Bit Barn, Dex has it, over.' Then nothing.", "Walkie squawks: 'Wendell, your router's blinking amber again. Over.'"] },
  "a-slat-l": { move: "sway", sfx: "rattling-cables-on-metal-pegboard", pins: 1, cd: 30,
    say: ["A paperclip bent around a SCART lead. That's a lockpick now."], dry: "Cables. You already took the good paperclip." },
  "a-register": { move: "drawer", sfx: "old-cash-register-drawer-ding-slide", cents: 25, cd: 60,
    say: ["Under the tray: a 1971 quarter and a sticky note. 'For the next one.'"], dry: "Ledger only. Someone owes Wendell a Zip disk." },
  "a-laptop": { move: "glow", glow: "oklch(0.85 0.06 230)" },
  "a-phone-1": { move: "flip", sfx: "nokia-style-polyphonic-ringtone-short",
    say: ["1 new text: 'pie case at the Starlite. trust me.'", "1 new text: 'u up? lol'", "1 new text: 'tell the Duke I said nothing.'"] },
  "a-camera": { move: "hop", glow: "oklch(0.99 0.01 90)", flash: 2.5, sfx: "film-camera-shutter-flash-wind", feed: { sanity: 3 }, cd: 10,
    say: ["Flash. Someone in the corner of the shop blinks too."] },
  "a-spinner": { move: "spin", sfx: "metal-display-rack-spinning-squeak", drop: "battery", batt: 1, cd: 30,
    say: ["An AA falls off the rack. Nobody's coming for it."], dry: "It spins. Only C cells left, and the weird ones." },
  "a-boombox": { move: "thump", toggle: "/cdn/moodboard-realistic-gritty/music-lofi-80s-cassette-holiday-tape-warbly.mp3", sfx: "cassette-deck-play-button-clunk" },
  "b-grill": { move: "hop", glow: "oklch(0.75 0.16 50)", fx: STEAM, sfx: "hash-browns-sizzling-on-diner-griddle", feed: { hunger: 8, hp: 2 }, cd: 10,
    say: ["Hash browns, crisp edges. You eat them off the spatula."], dry: "Griddle's scraped. Come back hungry." },
  "b-hatch": { move: "nudge", plate: "plate", sfx: "diner-counter-service-bell-ding", give: "burger", cd: 30,
    say: ["Order up. A burger in wax paper, for nobody. You're nobody."], dry: "Bell dings. Kitchen's ignoring you on purpose." },
  "b-piecase": { move: "spin15", plate: "plate", sfx: "glass-pie-case-door-slide-clink", feed: { hunger: 12, sanity: 6 }, cost: 100, cd: 20,
    say: ["Cherry. A dollar on the counter, and the crust shatters right."], broke: "A slice is a dollar. You have pocket lint." },
  "b-coffee": { move: "shudder", plate: "mug", fx: STEAM, sfx: "coffee-urn-tap-pour-into-ceramic-mug", feed: { thirst: 10, sanity: 3 }, cd: 5,
    say: ["Burnt, hot, refills itself. Diner coffee, done right."] },
  "b-register": { move: "drawer", sfx: "coin-dropped-in-glass-tip-jar", feed: { sanity: 4 }, cost: 25, cd: 10,
    say: ["A quarter in the tip jar. Someone wrote THANK U on it in ketchup."], broke: "Tip jar. You've got nothing to put in it." },
  "b-jukebox": { move: "thump", glow: "oklch(0.75 0.16 340)" },
  "c-pc-1": { move: "glow", glow: "oklch(0.85 0.06 140)" },
  "c-pc-2": { move: "glow", glow: "oklch(0.85 0.06 140)", sfx: "dial-up-modem-handshake-short",
    say: ["You've got mail. From: Wendell. 'Wi-Fi's down. Dex has the antenna. Sorry about the caps.'"] },
  "c-pc-3": { move: "glow", glow: "oklch(0.85 0.08 200)", sfx: "aol-instant-messenger-door-open-chime", feed: { sanity: 4 }, cd: 10,
    say: ["xX_rinkrat_Xx: a/s/l? jk. welcome to Lumiria.", "xX_rinkrat_Xx: brb mom needs the phone"] },
  "c-pc-4": { move: "glow", glow: "oklch(0.8 0.1 50)", sfx: "hard-drive-seek-clicks-busy", load: 34, feed: { sanity: 6 } },
  "c-pc-5": { move: "glow", glow: "oklch(0.8 0.12 140)", fx: CONFETTI, sfx: "windows-solitaire-card-cascade-win", feed: { sanity: 5 }, cd: 15,
    say: ["Two moves. Done. The cards bounce off the screen for a full minute."], dry: "Fresh deal. You've done enough." },
  "c-pc-6": { move: "glow", glow: "oklch(0.85 0.06 140)", sfx: "dial-up-modem-handshake-short", lotto: 25, cd: 20 },
  "c-arcade-1": { move: "shake", glow: "oklch(0.7 0.2 300)", fx: SPARK, sfx: "arcade-cabinet-coin-drop-start-blip", game: "GALAXY RAID" },
  "c-arcade-2": { move: "shake", glow: "oklch(0.75 0.18 150)", fx: SPARK, sfx: "arcade-cabinet-joystick-clack-explosion", game: "TURBO DUKE" },
  "c-crt": { move: "shudder", glow: "oklch(0.75 0.1 260)", sfx: "game-console-power-on-boot-chime", feed: { sanity: 5 }, cd: 10,
    say: ["Two-player kart. The other controller plays itself, and badly."] },
  "c-coffee": { move: "shudder", plate: "mug", fx: STEAM, sfx: "espresso-machine-gurgle-sputter", feed: { thirst: 6, sanity: 2 }, cd: 5,
    say: ["Half a cup, after a lot of gurgling. Patchy, like the Wi-Fi."] },
  "c-cork": { move: "sway", sfx: "pushpin-pulled-from-corkboard-paper-flutter",
    say: ["Polaroid: the hollow tree's knot, something wired into it. Caption: 'WI-FI??'", "Polaroid: the Duke mid-laugh. On the back: 'Festival soon. Bring snacks.'", "Flyer: 'Swap you any photo with snow in it.' No number. Just a cat drawing."] },
  "c-vr": { move: "hop", glow: "oklch(0.65 0.2 25)", sfx: "vr-headset-servo-whir-boot", feed: { sanity: 8, thirst: -3 }, cd: 15,
    say: ["Red wireframe hills for a minute. You take it off seasick and grinning."] },
  "router": { move: "hop" },
};

const yawOf = (o) => { const r = o.rotation; return typeof r === "number" ? r : r?.yaw ?? 0; };
const scl = (o) => { const v = o.scale; return typeof v === "number" ? v : v?.y ?? 1; };
const flat = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; };
function feed(w, f) {
  if (f.hunger) w.hunger = Math.max(0, Math.min(100, (w.hunger ?? 100) + f.hunger));
  if (f.thirst) w.thirst = Math.max(0, Math.min(100, (w.thirst ?? 100) + f.thirst));
  if (f.sanity) w.sanity = Math.max(0, Math.min(Math.max(100, w.sanity ?? 100), (w.sanity ?? 100) + f.sanity));
  if (f.hp && w.hp != null) w.hp = w.hp + f.hp; // small; player.js clamps to max on its own tick
}
function move(ctx, kind) { // the prop itself answers inside a tick: never more than a few degrees or centimetres off its rest
  const o = ctx.self, y = yawOf(o), b = scl(o), p = o.feetPosition;
  const A = (t, d, e = "easeOutCubic") => animate(ctx, o, t, { duration: d, easing: e });
  if (kind === "spin") A({ "rotation.yaw": [y, y + 360] }, 1.4);
  else if (kind === "spin15") A({ "rotation.yaw": [y, y + 14, y + 14, y] }, 1.1, "easeInOutSine");
  else if (kind === "shudder") A({ "rotation.yaw": [y, y + 1.5, y - 1.2, y + 0.6, y] }, 0.45, "linear");
  else if (kind === "shake") A({ "rotation.roll": [0, 2.2, -2.2, 1.4, -1, 0] }, 0.6, "linear");
  else if (kind === "roll" || kind === "sway") A({ "rotation.roll": kind === "sway" ? [0, 3, -2, 1, 0] : [0, -1.5, 1, 0] }, kind === "sway" ? 1.1 : 0.5, "easeOutSine");
  else if (kind === "hop") A({ "feetPosition.y": [p.y, p.y + 0.05, p.y] }, 0.3, "easeOutQuad");
  else if (kind === "nudge" || kind === "drawer") A({ scale: [b, b * (kind === "drawer" ? 1.05 : 0.96), b] }, 0.35, "easeOutBack");
  else if (kind === "flip") A({ "rotation.pitch": [0, -35, -35, 0], "feetPosition.y": [p.y, p.y + 0.04, p.y + 0.04, p.y] }, 1.6, "easeInOutSine");
  else if (kind === "thump") A({ scale: [b, b * 1.04, b, b * 1.03, b] }, 0.5, "easeOutQuad");
  else if (kind === "glow") A({ scale: [b, b * 1.015, b] }, 0.25);
}
function top(ctx) { const B = ctx.self.bounds, p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition; return B ? { x: B.center.x, y: B.max.y, z: B.center.z } : { x: p.x, y: p.y + 1, z: p.z }; }
function pulse(ctx, at, color, intensity = 3, life = 0.9) { ctx.spawn({ feetPosition: at, tags: ["l132", "l132-pulse"], light: { kind: "point", color, intensity, distance: 5, shadow: { enabled: false } }, lifetime: life }); }
function serve(ctx, m, from, toward) { // a mug / plate / battery slides out toward the presser, then is gone
  const d = flat(from, toward), y0 = from.y, a = { x: from.x + d.x * 0.15, y: y0, z: from.z + d.z * 0.15 }, b = { x: from.x + d.x * 0.45, y: y0, z: from.z + d.z * 0.45 };
  const spec = m === "battery"
    ? { primitive: { kind: "cylinder", radiusTop: 0.016, radiusBottom: 0.016, height: 0.055, radialSegments: 16 }, material: { color: "oklch(0.72 0.12 75)", metalness: 0.7, roughness: 0.3 }, rotation: { roll: 90 } }
    : { model: S.models[m][0], scale: m === "mug" ? 1 : 0.9 };
  const id = ctx.spawn({ ...spec, feetPosition: a, tags: ["l132", "l132-served"], lifetime: m === "battery" ? 1.6 : 4, castShadow: false });
  if (m === "battery") animate(ctx, id, { "feetPosition.y": [y0 + 0.05, y0 + 0.2, from.y - 0.6], "feetPosition.x": [a.x, b.x], "feetPosition.z": [a.z, b.z] }, { duration: 0.7, easing: "easeInQuad" });
  else animate(ctx, id, { "feetPosition.x": [a.x, b.x], "feetPosition.z": [a.z, b.z], "feetPosition.y": [y0 + 0.03, y0] }, { duration: 0.5, easing: "easeOutCubic" });
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, who = ctx.getObject(by), w = who?.state; if (!w) return;
    const now = ctx.now(), key = ctx.self.id === "l132-router" ? "router" : ctx.self.id.replace(/^l132-shop-/, ""), R = P[key] ?? {};
    const ses = (ctx.self.session.l132 ??= {}); if (now - (ses[by] ?? 0) < 700) return; ses[by] = now; // a held E is one press
    const snd = (clip, volume = 0.5) => clip && ctx.emit("playSound", { clip, position: pos, volume, maxDistance: 18 });
    const T = top(ctx), wp = who.worldFeetPosition ?? who.feetPosition;
    if (R.move) move(ctx, R.move);
    if (R.glow) pulse(ctx, { x: T.x, y: T.y - 0.2, z: T.z }, R.glow, R.flash ?? 2.2);
    if (R.fx) ctx.spawn({ feetPosition: { x: T.x, y: T.y - (R.fx === CONFETTI ? 0.5 : 0.05), z: T.z }, tags: ["l132", "l132-pulse"], fx: { script: R.fx }, lifetime: 2 });
    // the old kinds keep doing what they did
    if (s.kind === "read") { w.reading = s.page; snd("cdn/sfx-old-computer-keyboard-single-key-clack.mp3", 0.4); return; }
    if (s.kind === "router") { snd("cdn/sfx-small-electronic-beep-double.mp3", 0.35); pulse(ctx, T, s.on ? "oklch(0.8 0.2 145)" : "oklch(0.8 0.17 70)", 1.6, 1.4); say(ctx, by, s.on ? "Five steady green lights. Lumiria's online. Odalys owes somebody a thank-you." : "Two amber lights, out of step. No signal. The antenna's supposed to go somewhere high."); return; }
    if (s.kind === "jukebox") {
      const on = !s.on; s.on = on; s.verb = on ? "Stop" : "Play";
      snd("cdn/sfx-jukebox-coin-button-clunk-mechanism.mp3", 0.6);
      ctx.self.audio = on ? { clip: S.tune, gain: 0.55, loop: true, spatial: true, maxDistance: 24 } : null;
      if (on) { feed(w, { sanity: 2 }); say(ctx, by, "B-7. The record drops like it's been waiting all week."); }
      return;
    }
    if (R.toggle) { const on = !s.on; s.on = on; s.verb = on ? "Stop the tape" : "Press play"; snd(RT(R.sfx), 0.6);
      ctx.self.audio = on ? { clip: R.toggle, gain: 0.4, loop: true, spatial: true, maxDistance: 14 } : null;
      if (on) say(ctx, by, "Somebody's holiday, taped over somebody's wedding. You can hear both."); return; }
    if (s.kind === "arcade" && R.game) { // a real round: a score, a house record on the cabinet, a quarter for breaking it
      snd(RT(R.sfx), 0.55);
      const sc = Math.round((800 + ctx.random() * 9200) / 10) * 10, hi = s.hi ?? 6200;
      if (sc > hi) { s.hi = sc; s.hiBy = w.displayName ?? who.displayName ?? "YOU"; w.cents = (w.cents ?? 0) + 25; feed(w, { sanity: 4 });
        say(ctx, by, `${R.game} · ${sc}. New high score. The cabinet spits out a quarter.`); }
      else say(ctx, by, `${R.game} · ${sc}. High score ${hi}${s.hiBy ? `, held by ${s.hiBy}` : ""}. Again.`);
      return;
    }
    if (R.load) { // a photo that loads a third per press, and pays off at the end
      snd(RT(R.sfx), 0.4); s.load = Math.min(100, (s.load ?? 0) + R.load);
      if (s.load < 100) { say(ctx, by, `sunset_FINAL2.jpg · ${s.load}%`); return; }
      s.load = 0; feed(w, R.feed); say(ctx, by, "sunset_FINAL2.jpg · 100%. Worth the wait. Someone stood on a roof for this."); return;
    }
    const used = (w.l132used ??= {}), wait = R.cd ? used[key] && now - used[key] < R.cd * 60000 : false;
    if (R.cd && wait) { snd(RT(R.sfx), 0.35); if (R.dry) say(ctx, by, R.dry); return; }
    if (R.cost && (w.cents ?? 0) < R.cost) { snd(RT(R.sfx), 0.3); say(ctx, by, R.broke); return; }
    if (R.lotto) { snd(RT(R.sfx), 0.4); w.l132used = { ...used, [key]: now };
      if (ctx.random() < 0.3) { w.cents = (w.cents ?? 0) + R.lotto; say(ctx, by, "CONGRATULATIONS 1,000,000th VISITOR. It pays out one quarter."); }
      else say(ctx, by, "CONGRATULATIONS 1,000,000th VISITOR. Click here. The page never loads."); return; }
    if (R.sfx) snd(RT(R.sfx), 0.55);
    if (R.cost) w.cents = (w.cents ?? 0) - R.cost;
    if (R.cents) w.cents = (w.cents ?? 0) + R.cents;
    if (R.feed) feed(w, R.feed);
    if (R.give) w.snacks = { ...(w.snacks ?? {}), [R.give]: (w.snacks?.[R.give] ?? 0) + 1 };
    if (R.batt) w.batteries = (w.batteries ?? 0) + R.batt;
    if (R.pins) w.bobbypins = (w.bobbypins ?? 0) + R.pins;
    if (R.plate || R.drop) serve(ctx, R.plate ?? R.drop, R.drop ? T : { x: T.x, y: T.y, z: T.z }, wp);
    if (R.cd) w.l132used = { ...used, [key]: now };
    const lines = R.say ?? s.info; if (lines?.length) { const i = (s.i ?? 0) % lines.length; s.i = i + 1; say(ctx, by, lines[i]); }
  },
};

function buildShop(ctx, key) {
  const sh = S.shops[key], F = S.floor, root = `l132-shop-${key}`, tops = [];
  if (ctx.getObject(root)) ctx.destroy(root);
  const mats = {}; for (const k in sh.mats) mats[k] = { texture: sh.mats[k], repeat: [1, 1], wrap: "repeat", roughness: k === "floor_in" ? 0.55 : 0.85 };
  ctx.spawn(root, { feetPosition: { x: sh.x, y: 0, z: sh.z }, rotation: { yaw: sh.yaw }, scale: { x: 1, y: sh.sy ?? 1, z: 1 }, tags: ["l132", "l132-shop"], state: { name: sh.name },
    model: { id: sh.shell, materials: mats }, physics: sh.boxCol ? undefined : { body: "static", collider: "mesh" } });
  if (sh.boxCol) { // a stretched shell's mesh collider closed its doorway: plain walls instead, the door gap left open
    const H = sh.boxCol, T = 0.3, W = S.door.w / 2 + 0.05, L = sh.rx;
    const wall = (n, x, z, w, d, y = 0, h = H) => ctx.spawn(`${root}-col-${n}`, { feetPosition: at(sh, x, z, y), rotation: { yaw: sh.yaw }, tags: ["l132"], primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: "static" });
    wall("back", 0, -sh.back, 2 * L, T); wall("l", -L, (sh.front - sh.back) / 2, T, sh.front + sh.back); wall("r", L, (sh.front - sh.back) / 2, T, sh.front + sh.back);
    wall("fl", -(L + W) / 2, sh.front, L - W, T); wall("fr", (L + W) / 2, sh.front, L - W, T); wall("lintel", 0, sh.front, 2 * W, T, S.door.h + 0.05, H - S.door.h - 0.05);
    wall("roof", 0, (sh.front - sh.back) / 2, 2 * L, sh.front + sh.back, H, 0.2);
  }
  // lights: three overhead, one at the back
  [[-sh.rx * 0.55, 0], [sh.rx * 0.55, 0], [0, -sh.back * 0.5], [0, sh.front * 0.55]].forEach(([x, z], i) =>
    ctx.spawn(`${root}-light-${i}`, { feetPosition: at(sh, x, z, 2.85), tags: ["l132"], light: { kind: "point", color: sh.light, intensity: 16, distance: 15 } }));
  if (key === "a") ctx.spawn(`${root}-tvglow`, { feetPosition: at(sh, -3, -2.9, 1.4), tags: ["l132"], light: { kind: "point", color: "oklch(0.85 0.08 240)", intensity: 5, distance: 6 } });
  // the door: hinge at the left jamb, leaf runs across the opening, swings in
  const D = S.door, hid = `${root}-door`;
  const dp = { style: "wood", w: D.w, h: D.h, hingeSide: "left", swing: -1, d: 0.1, seed: 3 + key.charCodeAt(0) };
  const dst = { kind: "door", name: `${sh.name} door`, verb: "Close", hinge: hid };
  ctx.spawn(hid, { feetPosition: at(sh, -D.w / 2, sh.jamb, F), rotation: { yaw: sh.yaw + D.open }, physics: "kinematic", tags: ["usable", "l132"], behavior: "scripts/home11-door.js",
    state: { ...dst, open: true, openYaw: sh.yaw + D.open, closedYaw: sh.yaw },
    children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: dst }] });
  const seat = (id, x, z, yaw, st, name) => ctx.spawn(id, { feetPosition: at(sh, x, z, F), rotation: { yaw: sh.yaw + yaw }, tags: ["seat", "usable", "l132"], state: { name, verb: "Sit", seat: st } });
  for (const r of S.rows[key]) {
    const [url, fwd, sc] = S.models[r.m], id = r.gid ?? `${root}-${r.id}`;
    const tags = ["l132"], state = {};
    if (r.u) { tags.push("usable"); Object.assign(state, r.u); }
    if (r.seat) { tags.push("seat", "usable"); Object.assign(state, { name: r.name, verb: "Sit", seat: r.seat }); }
    if (r.ware) { tags.push("breakable"); state.name = r.ware; }
    const y = r.top != null ? F + r.top : r.wall != null ? r.wall : F;
    if (r.top != null) { tags.push("l132-top"); tops.push(id); }
    if (r.wall != null) tags.push("l132-wall");
    const small = r.top != null || r.wall != null;
    ctx.spawn(id, { feetPosition: at(sh, r.x, r.z, y), rotation: { yaw: sh.yaw + r.f + FOFF[fwd] }, scale: r.s ?? sc, tags, state, model: url,
      physics: r.m === "rug" ? "none" : { body: "static", collider: small ? "box" : "auto" }, behavior: r.u ? ME : undefined, castShadow: !small, visibleRange: { max: small ? RANGE.small : RANGE.fixture } }); // shop insides sit 56-90 m from the arrival: not drawn from across town
    if (r.booth) { // sit spots read off art/l61-booth (booth-local): the side bench and the back bench
      for (const b of [{ k: "a", x: -0.76, z: 0.47, yaw: -90, w: 2, gap: 0.55 }, { k: "b", x: 0.56, z: -0.59, yaw: 180, w: 2, gap: 0.62 }]) {
        const p = rot(b.x, b.z, r.f); seat(`${id}-seat-${b.k}`, r.x + p.x, r.z + p.z, r.f + b.yaw, { w: b.w, gap: b.gap, d: 0.04, y: 0.28 }, "Diner booth");
      }
      const t = rot(0.1, 0.05, r.f), n = id.slice(-1); // a plate and a cup on each booth table
      for (const [m, dx, nm, j] of [["plate", 0, "Plate", 1], ["mug", 0.22, "Coffee cup", 2]]) {
        const wid = `l132-ware-ceramic-b-booth${n}-${j}`; tops.push(wid);
        ctx.spawn(wid, { feetPosition: at(sh, r.x + t.x + dx, r.z + t.z, F + 0.76), rotation: { yaw: 37 * j }, tags: ["l132", "l132-top", "breakable"], state: { name: nm }, model: S.models[m][0], physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: RANGE.small } });
      }
    }
    if (r.pc) { const r2 = (r.f * Math.PI) / 180; seat(`${id}-seat`, r.x - Math.sin(r2) * 0.6, r.z - Math.cos(r2) * 0.6, r.f + 180, { w: 1, d: 0, y: 0.12 }, "Desk chair"); }
  }
  return tops;
}

export function lay(ctx, L) {
  const st = ctx.place.state, v = st.shopsV ?? 0, keys = ["a", "b", "c"];
  if (v >= S.V * 10 + 3) return;
  const n = v < S.V * 10 ? 0 : v - S.V * 10;
  const tops = buildShop(ctx, keys[n]);
  st.shopsTops = [...(n ? st.shopsTops ?? [] : []), ...tops];
  st.shopsV = S.V * 10 + n + 1;
}

let tries = 0;
export function tick(ctx, L) {
  const st = ctx.place.state;
  if ((st.shopsV ?? 0) < S.V * 10 + 3) return;
  const glow = ctx.getObject("l132-shop-a-tvglow"); if (glow?.light) glow.light = { ...glow.light, intensity: 4 + ctx.random() * 2.5 };
  const left = st.shopsTops; if (!left?.length || tries > 600) return;
  tries++;
  const keep = [];
  for (const id of left) { // rest each tabletop piece on the surface under it, once that surface has loaded
    const o = ctx.getObject(id); if (!o) continue;
    const p = o.feetPosition, hit = raycast(ctx, { x: p.x, y: p.y + 0.5, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 1.2, ignoreEntities: [id], excludeTags: ["l132-top"], hits: "geometry" });
    if (hit && hit.position.y > S.floor + 0.3) { o.feetPosition = { x: p.x, y: hit.position.y, z: p.z }; } else keep.push(id);
  }
  if (keep.length !== left.length) st.shopsTops = keep;
}
