// Level 5's things you press that aren't people (state.kind): a radio (E turns the polonaise off and on, for the whole room),
// a sealed door (the lore's other levels: it tells you what's behind it and why it won't open).
import { notify } from "./lib/notify.js";
import { heard } from "./lib/hear.js";
import { animate } from "builtin/tween";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => notify(ctx, who, text); // scripts/lib/notify.js, shared
import { maxHp, maxSan } from "./player.js";
import { money } from "./lib/items.js";
const PUFF = (c) => `fx
pop puff burst=10..14 on=disc(.3) life=.8..1.5 v=up(.25..0.6)+sdir()*.35 size=.08..0.16 acc=buoy(.35)+curl(.3)+drag(1.4) col=${c} a=0>.35:.3>.7:.15>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const LEAF = `fx
pop leaf burst=3..5 on=disc(.2) life=1.6..2.2 v=sdir()*(.6..1.2)+up(.4) size=.05..0.08 spin=-5..5 acc=grav()*.25+curl(.6)+drag(1.2) col=<.55,.38,.16>..<.7,.55,.2> a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha)`;
const SPARK = `fx
pop px burst=14..20 on=disc(.18) life=.35..0.7 v=sdir()*(.8..1.6)+up(.6) size=.025..0.05 acc=grav()*.4+drag(1.6) col=hdr(3,1.6,.5)>hdr(1.2,.4,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)`;
const fx = (ctx, at, script, dy = 1) => ctx.emit("fx", { position: { ...at, y: (at?.y ?? 0) + dy }, script }, { audience: { nearby: at, radius: 20 } });
// the thing itself moves: a short, damped wobble about its own axis
function wobble(ctx, axis = "yaw", amp = 2, dur = 0.45) {
  const r = ctx.self.rotation ?? {}, b = typeof r === "number" ? r : r[axis] ?? 0;
  animate(ctx, ctx.self, { [`rotation.${axis}`]: [b, b + amp, b - amp * 0.7, b + amp * 0.35, b] }, { duration: dur, easing: "linear" });
}
function thump(ctx, sy = 0.94, dur = 0.3) { animate(ctx, ctx.self, { "scale.y": [1, sy, 1.02, 1] }, { duration: dur, easing: "easeOutQuad" }); }
// a flash of light from the thing, gone on its own
function glow(ctx, color, intensity = 1.2, life = 0.8, y = 1) {
  ctx.spawn({ parent: ctx.self.id, feetPosition: { x: 0, y, z: 0.25 }, lifetime: life, castShadow: false, light: { kind: "point", color, intensity, distance: 3.5, shadow: { enabled: false } } });
}
// small gains on the presser, clamped to their caps
function give(who, { hp = 0, sanity = 0, thirst = 0, cents = 0, snack } = {}) {
  const s = who.state, lv = s.level ?? 1;
  if (hp) s.hp = Math.min(maxHp(lv, s), (s.hp ?? 0) + hp);
  if (sanity) s.sanity = Math.max(0, Math.min(maxSan(lv, s), (s.sanity ?? 0) + sanity));
  if (thirst) s.thirst = Math.min(100, (s.thirst ?? 100) + thirst);
  if (cents) s.cents = (s.cents ?? 0) + cents;
  if (snack) s.snacks = { ...(s.snacks ?? {}), [snack]: (s.snacks?.[snack] ?? 0) + 1 };
}
// Level 5's sealed doors, by id: what each one says, how it moves, and the one thing it gives each player once
const SEALED = {
  "l5-door-6": { move: "rattle", fx: PUFF("<.85,.84,.8>"), sound: "pressurised-steam-hiss-burst-pipe",
    text: "Welded shut, and the weld's still sweating. Scratched in the rust: NORTH PORTAL, z 6. BRING NIGHT VISION. Underlined twice.",
    once: "Steam rolls out of the seam and fogs your face. Best facial this hotel ever gave. +6 sanity", gift: { sanity: 6 } },
  "l5-door-63": { move: "rattle", fx: LEAF, sound: "distant-birdsong-behind-door-muffled",
    text: "Birds on the other side. Real ones, arguing. The door doesn't care.",
    once: "A dry oak leaf slides under the door. It smells like a backyard in October. +8 sanity", gift: { sanity: 8 } },
  "l5-door-78": { move: "heave", fx: PUFF("<.6,.62,.66>"), sound: "metal-valve-wheel-creak",
    text: "Airlock. The wheel gives a quarter turn and springs back. Gauge reads zero, the way it has since somebody taped over it.",
    once: "Somebody wedged a Backquarter in the wheel spokes for luck. Luck's yours now. +$0.25", gift: { cents: 25 } },
  "l5-door-9": { move: "rattle", fx: PUFF("<.78,.86,.95>"), sound: "cold-wind-draft-under-door-whistle",
    text: "Night air whistles under it. Somewhere past it a streetlight is buzzing and a dog won't stop barking.",
    once: "Frost on the knob. You lick it, like an idiot. Tastes like a well. +6 thirst", gift: { thirst: 6 } },
  "l5-door-98": { move: "heave", fx: PUFF("<.4,.36,.32>"), sound: "warm-metal-door-tick-expand",
    text: "Warm metal, ticking like a car hood. Bolted from their side. Somebody in there has a radiator and isn't sharing.",
    once: "You lean your back on it till your shoulders unknot. +5 HP", gift: { hp: 5 } },
  "l5-gate-84": { move: "heave", fx: PUFF("<.55,.48,.38>"), sound: "wooden-gate-bar-thud-rattle",
    text: "Barred from this side, and the bar's nailed down. Carved in it: J.R. + M.K. '74. Under that, newer: STILL WAITING.",
    once: "A warm Snapple's wedged behind the bar. M.K. never came back for it.", gift: { snack: "snapple" } },
};
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    if (s.kind === "radio") {
      s.on = !s.on; // the sound itself is scripts/world-radio.js: Radio Backrooms through bad reception (Shelly Nov 14)
      if (ctx.self.audio) ctx.self.audio = null;
      heard(ctx, { clip: G("radio-dial-click-static"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.6, maxDistance: 10 });
      s.verb = s.on ? "Switch off" : "Switch on";
      thump(ctx, 0.96, 0.25); wobble(ctx, "yaw", 1.5, 0.3);
      if (s.on) glow(ctx, "#ffb35a", 0.9, 1.2, 0.3);
      // the music helps, once every few minutes per listener
      const calm = s.on && who && ctx.now() - (who.state.l5RadioAt ?? -1e12) > 180000;
      if (calm) { who.state.l5RadioAt = ctx.now(); give(who, { sanity: 4 }); }
      say(who, s.on ? `The valves go orange. Ralph's back on, halfway through a Glenn Miller he's played since 1958.${calm ? " +4 sanity" : ""}` : "Click. Now you can hear the building breathing.", ctx);
      return;
    }
    if (s.kind === "sealed") {
      const at = ctx.self.worldFeetPosition, id = ctx.self.id;
      if (id === "l5-boil-arcade") return arcade(ctx, who, at);
      const d = SEALED[id];
      if (d?.move === "heave") thump(ctx, 0.985, 0.35); else wobble(ctx, "yaw", 1.6, 0.4);
      heard(ctx, { clip: G("heavy-door-handle-rattle-locked"), position: { ...at, y: 1 }, volume: 0.6, maxDistance: 12 });
      if (d?.sound || s.sound) heard(ctx, { clip: G(d?.sound ?? s.sound), position: { ...at, y: 1 }, volume: 0.6, maxDistance: 12 });
      if (d?.fx) fx(ctx, at, d.fx, 0.15);
      const seen = who?.state?.l5Sealed ?? {};
      if (d && who && !seen[id]) { who.state.l5Sealed = { ...seen, [id]: ctx.now() }; give(who, d.gift); say(who, d.once, ctx); return; }
      say(who, d?.text ?? s.text, ctx);
      return;
    }
    if (s.kind === "boilerdoor") { // a locked steel door: residents can't open it, a player's E swings it for a few seconds, then it slams and bolts
      const hinge = ctx.getObject(s.hinge), pos = { ...ctx.self.worldFeetPosition, y: 1.2 };
      if (!hinge) return;
      if (s.open) return;
      const inside = (who?.worldFeetPosition?.x ?? 0) > ctx.self.worldFeetPosition.x + 0.2; // the boiler side always opens: nobody gets bolted in
      // Harlan walking with you unbolts it himself: the sign says escort only
      const escort = who && ctx.query({ tags: ["npc"], radius: 60, center: ctx.self.worldFeetPosition }).some((q) => /harlan$/.test(q.id) && q.state?.follow === who.id && !q.state?.dead);
      if (escort && !who.state.l5boilerKey) { who.state.l5boilerKey = true; say(who, "Harlan works the padlock and slides the bolt. \"Stay close.\"", ctx); }
      if (!inside && !escort && !who?.state?.l5boilerKey && !(ctx.now() - (who?.state?.l5boilerPick ?? -1e9) < 6000)) {
        heard(ctx, { clip: G("heavy-door-handle-rattle-locked"), position: pos, volume: 0.7, maxDistance: 12 });
        say(who, "Bolted from the other side and padlocked. Harlan keeps the key, or you could pick it.", ctx);
        return;
      }
      s.open = true; s.verb = "Open"; s.info = "Swinging";
      animate(ctx, hinge, { "rotation.yaw": s.yaw0 + s.swing }, { duration: 0.6, easing: "easeOutCubic" });
      heard(ctx, { clip: G("heavy-metal-door-bolt-unlock-creak-open"), position: pos, volume: 0.8, maxDistance: 16 });
      say(who, "You slide the bolt. Heat and noise roll out. It'll slam shut behind you.", ctx);
      ctx.after(4, "shut");
      return;
    }
    if (s.kind === "bell") {
      thump(ctx, 0.8, 0.2);
      heard(ctx, { clip: G("brass-hotel-service-bell-ding"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.7, maxDistance: 14 });
      const fresh = who && ctx.now() - (who.state.l5BellAt ?? -1e12) > 120000;
      if (fresh) { who.state.l5BellAt = ctx.now(); give(who, { sanity: 2 }); }
      say(who, fresh ? "Ding. Nobody comes. It's still the most service you've had in weeks. +2 sanity" : "Ding. Nobody comes. Again.", ctx);
      return;
    }
    if (s.kind === "piano") {
      wobble(ctx, "roll", 0.6, 0.5);
      heard(ctx, { clip: G("detuned-upright-piano-chord"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.8, maxDistance: 24 });
      const fresh = who && ctx.now() - (who.state.l5PianoAt ?? -1e12) > 120000;
      if (fresh) { who.state.l5PianoAt = ctx.now(); give(who, { sanity: 4 }); }
      say(who, fresh ? "Chopsticks, the only thing you know. Two keys stick. The ballroom claps anyway, or the pipes do. +4 sanity" : "The B-flat sticks again.", ctx);
      return;
    }
  },
};

// the boiler door's slam: back on its frame and bolted
export function shut(ctx) {
  const s = ctx.self.state, hinge = ctx.getObject(s.hinge);
  if (hinge) animate(ctx, hinge, { "rotation.yaw": s.yaw0 }, { duration: 0.35, easing: "easeInQuad" });
  s.open = false; s.verb = "Unbolt"; s.info = "Locked · Harlan's key or Lockpick 25";
  ctx.after(0.35, "slam");
}
export function slam(ctx) {
  heard(ctx, { clip: G("heavy-steel-door-slam-shut-bolt-clang"), position: { ...ctx.self.worldFeetPosition, y: 1.2 }, volume: 0.9, maxDistance: 20 });
}

// "LEVEL 40" in the Boiler Room: a cabinet that still takes Backquarters
function arcade(ctx, who, at) {
  if (!who?.state) return;
  const ps = who.state, now = ctx.now();
  thump(ctx, 0.97, 0.22); glow(ctx, "#ff8a3c", 1.4, 0.9, 1.3);
  if (now - (ctx.self.session["arc" + who.id] ?? -1e12) < 4000) { say(who, "Still on the high-score screen. AAA has all ten spots.", ctx); return; }
  ctx.self.session["arc" + who.id] = now;
  if ((ps.cents ?? 0) < 25) {
    heard(ctx, { clip: G("old-arcade-coin-slot-rattle"), position: { ...at, y: 1 }, volume: 0.6, maxDistance: 10 });
    say(who, `INSERT COIN. A quarter a go and you've got ${money(ps.cents)}. The coin return has gum in it.`, ctx); return;
  }
  ps.cents -= 25;
  const win = ctx.random() < 0.3;
  heard(ctx, { clip: G(win ? "arcade-cabinet-high-score-jingle-coins" : "arcade-cabinet-game-over-descending-blips"), position: { ...at, y: 1.3 }, volume: 0.7, maxDistance: 14 });
  fx(ctx, at, SPARK, 1.3);
  if (win) { give(who, { cents: 100 }); ps.pickedAt = now; say(who, "Stage 4. The cabinet coughs up a Backdollar in prize tokens and dies a little. -$0.25, +$1.00", ctx); }
  else say(who, "GAME OVER on stage 2. A sprite shaped like the bellhop got you. -$0.25", ctx);
}
