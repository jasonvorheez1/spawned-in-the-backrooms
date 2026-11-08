// Level 8 "Cave Systems": what you press and walk into (places/level8/sim.js). state.kind:
//   pool (almond water, drink), soup and fire (the camp), kazoo (a stone kazoo in a niche on Hyperspace Lane), altar (acoustic stone pipes on Hyperspace Lane),
//   dredge (B.N.T.G. tar dredge winch over the boiling tar pool), radio (Harmouth field transceiver at camp), carla (a girl at the camp: give her the kazoo),
//   loop (the end of the crawl: the first time, it brings you out where you started), exit (the asphalt, a dim glow ahead).
import { heard } from "./lib/hear.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => { if (who?.state) who.state.notice = { text, at: ctx.now() }; };
const CARLA = ["\"Hey! You're new here. What's your name?\"", "\"I don't mind. Nice to meet you!\"", "\"Mum says the lights down the Road are the friendly ones. The red ones aren't.\"", "\"Do you like soup? It's always soup.\""];
const RADIO_LOGS = [
  "HARMOUTH LOG #14: \"Do not trust the crawl past Marker #78 on your first pass. The karst loops back on itself until you've seen the Face Rock twice.\"",
  "M.E.G. SURVEY: \"The third cavern floods on a five-and-a-half-minute siphon cycle. When the water hits your ankles, take the limestone ledges on the left wall.\"",
  "HARMOUTH LOG #22: \"Hyperspace Lane's cyan lights respond to acoustic resonance. Hum into the hollow flowstone pipes and the cold leaves your bones.\"",
  "B.N.T.G. DISPATCH: \"We rigged a cable dredge on the west rim of the Tar Pool. Crank it fast—if the pitch starts reaching back, let go of the handle.\"",
  "SENTRY ALERT: \"A Broodmother has nested beyond the red glyph at Marker #76. Her chitin plates stop small-caliber rounds, but the camp pays top dollar for them.\"",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, w = who.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, cool = (s.cool ??= {});
    const snd = (n, v = 0.6) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: 14 });
    if (s.kind === "pool") {
      snd("water-pour-splash-short", 0.5); w.thirst = Math.min(100, (w.thirst ?? 100) + 30);
      return say(who, "You cup the almond water in your hands. Cold, and a little bitter: harmless minerals. (Thirst +30. Do not bathe in it.)", ctx);
    }
    if (s.kind === "soup") { // the cook's pot: a bowl is bought, $3 (her pick), and handed over to eat (E) or throw (Z)
      const PRICE = 300, cook = ctx.query({ tags: ["npc"], center: pos, radius: 7 }).find((o) => !o.state?.dead && (o.state?.hp ?? 1) > 0);
      const cn = cook?.state?.name ?? cook?.state?.displayName ?? "The cook";
      if (!cook) return say(who, "Nobody is minding the pot. You leave it be; it isn't yours.", ctx);
      if (now - (cool[uid] ?? -1e9) < 20000) return say(who, `${cn} slaps your hand off the ladle. "One at a time. Eat what you've got."`, ctx);
      if ((w.cents ?? 0) < PRICE) return say(who, `${cn} covers the pot. "Three Backdollars a bowl. Come back when you've got it."`, ctx);
      const ask = (s.ask ??= {});
      if (!(now - (ask[uid] ?? -1e9) < 10000)) { ask[uid] = now; return say(who, `${cn} looks up from the ladle. "Soup's three Backdollars a bowl. You want one?" (Press again to pay $3.00)`, ctx); }
      delete ask[uid]; w.cents -= PRICE; cool[uid] = now; snd("pot-lid-clink-and-ladle-in-soup", 0.5);
      const hp = who.feetPosition, f = { x: hp.x + (pos.x - hp.x) * 0.4, z: hp.z + (pos.z - hp.z) * 0.4 };
      ctx.spawn({ tags: ["usable", "soupbowl"], feetPosition: { x: f.x, y: hp.y + 0.9, z: f.z }, lifetime: 600, behavior: "scripts/l8-use.js",
        primitive: { kind: "cylinder", radiusTop: 0.13, radiusBottom: 0.07, height: 0.08 }, material: { color: "oklch(0.86 0.02 80)", roughness: 0.6 },
        physics: { body: "dynamic", collider: "cylinder", mass: 0.6 },
        state: { kind: "bowl", name: `Bowl of ${cn}'s soup`, verb: "Eat", info: "Hot. Z to pick it up and throw it.", tint: "#e8c070", mat: "ceramic", hp: 4, maxHp: 4 },
        children: [{ feetPosition: { x: 0, y: 0.055, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.115, radiusBottom: 0.115, height: 0.015 }, material: { color: "oklch(0.62 0.12 70)", roughness: 0.25 } }] });
      return say(who, `${cn} ladles you a bowl and pockets three Backdollars. "Eat it or wear it, it's yours now." (−$3.00)`, ctx);
    }
    if (s.kind === "bowl") {
      snd("pot-lid-clink-and-ladle-in-soup", 0.4); w.hunger = Math.min(100, (w.hunger ?? 100) + 45); w.hp = Math.min(w.maxHp ?? 1e9, (w.hp ?? 0) + 25);
      ctx.destroy(ctx.self.id);
      return say(who, "Steaming hot soup. You slurp it down too gratefully to ask what the chunks are. (Hunger +45, a little health)", ctx);
    }
    if (s.kind === "fire") {
      if (now - (cool[uid] ?? -1e9) < 40000) return say(who, "You are already as dry as the cave allows.", ctx);
      cool[uid] = now; w.sanity = Math.min(100, (w.sanity ?? 80) + 12); w.hp = Math.min(w.maxHp ?? 1e9, (w.hp ?? 0) + 10);
      return say(who, "You sit by the fire and dry slowly. The cold lets go of your hands. Do not fall asleep. (Sanity +12)", ctx);
    }
    if (s.kind === "kazoo") {
      w.kazoo = true; say(who, "You pocket a stone kazoo. It is cold, rough and jagged, and when you breathe through it, it buzzes.", ctx); return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "altar") {
      if (now - (cool[uid] ?? -1e9) < 60000) return say(who, "The stone pipes are still humming softly in the damp air.", ctx);
      cool[uid] = now;
      const bonus = w.kazoo || w.kazooGiven ? 22 : 14;
      w.sanity = Math.min(100, (w.sanity ?? 80) + bonus);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 12);
      return say(who, w.kazoo
        ? "You press the stone kazoo to the acoustic pipes. A warm, bell-clear chord ripples down Hyperspace Lane, and the blue-green light guides flare bright around you. (Sanity +22, Health +12)"
        : "You hum into the hollow flowstone flutes. The cavern answers with a low, comforting chord that steadies your breathing. (Sanity +14, Health +12)", ctx);
    }
    if (s.kind === "dredge") {
      if (now - (cool[uid] ?? -1e9) < 55000) return say(who, "The dredge bucket is still sinking back into the heavy pitch. Give it a moment.", ctx);
      cool[uid] = now; snd("thick-tar-bubbling-and-wet-gurgle", 0.65);
      const r = ctx.random();
      let extra = "pitch", label = "two heavy cakes of tar pitch";
      if (r < 0.28) { extra = "ammo"; label = "pitch and a pitch-sealed tin of rifle rounds"; }
      else if (r < 0.52) { extra = "battery"; label = "pitch and a waterproof caver's battery"; }
      else if (r < 0.72) { extra = "ironstone"; label = "pitch and a heavy nodule of ironstone"; }
      else if (r < 0.88) { extra = "cash:1500"; label = "pitch and a B.N.T.G. scrip pouch"; }
      let slap = "";
      if (ctx.random() < 0.25) {
        w.hp = Math.max(1, (w.hp ?? 100) - 8);
        slap = " A tar-coated hand lunged up along the cable and scorched your wrist before dropping back!";
      }
      w.payout = { xp: 16, items: ["pitch", extra], text: `You crank the B.N.T.G. winch and haul up the dredge basket: ${label}.${slap}` };
      return;
    }
    if (s.kind === "radio") {
      snd("plastic-bottle-pickup-rattle", 0.35);
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      return say(who, RADIO_LOGS[n % RADIO_LOGS.length], ctx);
    }
    // ---- harvesting: the payout (items, XP) lands through scripts/craft.js, which owns the bag
    if (s.kind === "fungus") {
      const n = 1 + (ctx.random() < 0.55 ? 1 : 0) + (ctx.random() < 0.15 ? 1 : 0); snd("plastic-bottle-pickup-rattle", 0.3);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 1.5);
      w.payout = { xp: 4, items: Array(n).fill("glow_cap"), text: `You pinch off ${n} glow cap${n > 1 ? "s" : ""}. They light your fingers blue-green and go dark within the minute. (They charge a battery with pitch, or press into a salve.)` };
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "cocoon") {
      snd("bandage-wrap-cloth", 0.5); const n = 2 + (ctx.random() < 0.5 ? 1 : 0), items = Array(n).fill("spider_silk"), extra = ctx.random() < 0.45 ? ["almond", "bandage", "battery", "ration", "ammo", "kit"][Math.floor(ctx.random() * 6)] : null;
      if (extra) items.push(extra);
      let bit = "";
      if (ctx.random() < 0.18) { w.hp = Math.max(1, (w.hp ?? 0) - (w.maxHp ?? 100) * 0.03); bit = " Something small and hungry was still inside: it bit you and fled."; }
      w.payout = { xp: 8, items, text: `You slit the silk. Wrapped inside: ${extra ? "a little of what its last victim carried, and " : ""}a heap of strong, sticky thread.${bit}` };
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "seep") {
      snd("water-pour-splash-short", 0.3); let burn = "";
      if (ctx.random() < 0.3) { w.hp = Math.max(1, (w.hp ?? 0) - (w.maxHp ?? 100) * 0.035); burn = " It is hot, and it grabbed at your glove. You rip free."; }
      w.payout = { xp: 10, items: ["pitch", "pitch"], text: `You scrape warm pitch into a tin.${burn} (It seals, waterproofs and burns: caps, boots and plates all want it.)` };
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "board") {
      const Q = [
        { name: "Lights for the Road", need: { glow_cap: 4 }, xp: 60, items: ["battery", "cash:1500"], text: "The camp wants four glow caps for the lamps." },
        { name: "Plate for the Perimeter", need: { chitin: 3 }, xp: 80, items: ["bandage", "bandage", "cash:2500"], text: "Three chitin plates, for the sentries' armor. They come off cave spiders." },
        { name: "A Sample from the Tar", need: { pitch: 3 }, xp: 90, items: ["firstaid", "cash:2000"], text: "Three scrapings of tar pitch. Use the dredge winch or scrape the seeps." },
        { name: "Flowstone for the Wall", need: { flowstone: 6 }, xp: 70, items: ["almond", "almond", "cash:1500"], text: "Six flowstone shards for the camp's wall. Break the pale stalagmites." },
        { name: "Ore for the Smith", need: { ironstone: 4 }, xp: 100, items: ["kit", "ammo", "cash:3000"], text: "Four ironstone ore. The dark red-brown rocks in the walls." },
        { name: "The Road's End", need: null, xp: 150, items: ["firstaid", "cash:5000"], text: "Walk the whole 9th Road to the asphalt and the glow, and come back. Tell us what is there." },
      ];
      const lap = Math.floor((w.l8q ?? 0) / Q.length), qi = (w.l8q ?? 0) % Q.length; let q = Q[qi];
      if (!q.need && (w.l8Exits ?? 0) < 1 && lap > 0) { w.l8q = (w.l8q ?? 0) + 1; return say(who, "Board: 'The Road's End' is done: the glow is the end of the Road, and not the end of the story.", ctx); }
      const mul = 1 + lap, need = q.need ? Object.fromEntries(Object.entries(q.need).map(([k, n]) => [k, n * mul])) : null, sc = w.scrap ?? {};
      const NAME = { glow_cap: "glow caps", chitin: "chitin plates", pitch: "tar pitch", flowstone: "flowstone shards", ironstone: "ironstone ore" };
      const have = need ? Object.entries(need).every(([k, n]) => (sc[k] ?? 0) >= n) : (w.l8Exits ?? 0) >= 1;
      if (!have) {
        const list = need ? Object.entries(need).map(([k, n]) => `${sc[k] ?? 0}/${n} ${NAME[k]}`).join(", ") : "not yet";
        return say(who, `ERRAND ${qi + 1}${lap ? ` (round ${lap + 1})` : ""}: ${q.name}. ${q.text} Have: ${list}.`, ctx);
      }
      if (need) { const left = { ...sc }; for (const [k, n] of Object.entries(need)) left[k] = (left[k] ?? 0) - n; w.scrap = left; }
      w.l8q = (w.l8q ?? 0) + 1; snd("pickup-ammo", 0.6);
      w.payout = { xp: Math.round(q.xp * (1 + lap * 0.5)), items: q.items, text: `ERRAND DONE: ${q.name}. "Good. That helps more than you think." The camp pays you. (+${Math.round(q.xp * (1 + lap * 0.5))} XP)` };
      return;
    }
    if (s.kind === "carla") {
      if (w.kazoo && !w.kazooGiven) {
        w.kazoo = false; w.kazooGiven = true; w.sanity = Math.min(100, (w.sanity ?? 80) + 35);
        w.payout = { xp: 90, items: ["almond", "bandage"], text: "You do not shake her hand. You put the stone kazoo in Carla's palm and close her fingers round it. She runs back to her mother, clutching it to her chest. Somewhere within, a spark of wonder. (+90 XP, Sanity +35, +Almond Water, +Bandage)" };
        return;
      }
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      return say(who, `Carla: ${CARLA[n % CARLA.length]}${w.kazooGiven ? " She hums into the kazoo." : ""}`, ctx);
    }
  },
};

export function onTriggerEnter(ctx, other) {
  const s = ctx.self.state; if (other?.state?.level == null) return;
  const w = other.state, now = ctx.now();
  if (s.kind === "loop") {
    if ((w.l8Loops ?? 0) >= 1) return; // only the first crawl is wrong: the second time through, the path leads on
    w.l8Loops = (w.l8Loops ?? 0) + 1;
    ctx.emit("screenFlash", { color: "#000000", duration: 1.2, intensity: 0.9 }, { audience: { player: other.id } });
    other.feetPosition = { x: s.back.x, y: s.back.y + 0.2, z: s.back.z }; other.rotation = { yaw: s.back.yaw };
    w.notice = { text: "You haul yourself out of the crevice into a large, round chamber. This feels oddly familiar. You could swear you've seen that rock before, the one that looks too much like a face. A marker on the ceiling: '9th Road: Marker #74'. Didn't you just pass #78?", at: now };
    return;
  }
  if (s.kind === "exit") {
    if (now - (w.l8ExitAt ?? -1e9) < 20000) return; w.l8ExitAt = now;
    ctx.emit("screenFlash", { color: "#fff6e0", duration: 2.0, intensity: 1 }, { audience: { player: other.id } });
    w.notice = { text: "The crowds are gone. Rock turned to sand, sand to gravel, gravel to asphalt under your aching feet. A dim glow looms ahead. At last, the nightmare is over... isn't it?", at: now };
    w.l8Exits = (w.l8Exits ?? 0) + 1;
    ctx.after(2.2, "back", { id: other.id });
  }
}
// the glow was not the way out (Level 9 is not built yet): the Road lets you go back to the camp
export function back(ctx, p) {
  const o = ctx.getObject(p.id), b = ctx.self.state.back; if (!o || !b) return;
  o.feetPosition = { x: b.x, y: b.y + 0.2, z: b.z }; o.rotation = { yaw: b.yaw };
}
