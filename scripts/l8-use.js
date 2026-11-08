// Level 8 "Cave Systems": what you press and walk into (places/level8/sim.js). state.kind:
//   pool (almond water, drink), soup and fire (the camp), kazoo (a stone kazoo in a niche on Hyperspace Lane), carla (a girl at the camp: give her the kazoo),
//   loop (the end of the crawl: the first time, it brings you out where you started), exit (the asphalt, a dim glow ahead).
import { heard } from "./lib/hear.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => { if (who?.state) who.state.notice = { text, at: ctx.now() }; };
const CARLA = ["\"Hey! You're new here. What's your name?\"", "\"I don't mind. Nice to meet you!\"", "\"Mum says the lights down the Road are the friendly ones. The red ones aren't.\"", "\"Do you like soup? It's always soup.\""];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, w = who.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, cool = (s.cool ??= {});
    const snd = (n, v = 0.6) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: 14 });
    if (s.kind === "pool") {
      snd("water-pour-splash-short", 0.5); w.thirst = Math.min(100, (w.thirst ?? 100) + 30);
      return say(who, "You cup the almond water in your hands. Cold, and a little bitter: harmless minerals. (Thirst +30. Do not bathe in it.)", ctx);
    }
    if (s.kind === "soup") {
      if (now - (cool[uid] ?? -1e9) < 90000) return say(who, "The pot is still too hot, and the ladle too busy. Give it a minute.", ctx);
      cool[uid] = now; snd("pot-lid-clink-and-ladle-in-soup", 0.5); w.hunger = Math.min(100, (w.hunger ?? 100) + 45); w.hp = Math.min(w.maxHp ?? 1e9, (w.hp ?? 0) + 25);
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
        { name: "A Sample from the Tar", need: { pitch: 3 }, xp: 90, items: ["firstaid", "cash:2000"], text: "Three scrapings of tar pitch. Do not stand on the pool to get them." },
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
