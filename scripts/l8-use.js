import { voiceKey } from "./lib/voices.js";
// Level 8 "Cave Systems": what you press and walk into (places/level8/sim.js). state.kind:
//   pool (almond water, drink), soup and fire (the camp), kazoo (a stone kazoo in a niche on Hyperspace Lane), altar (acoustic stone pipes on Hyperspace Lane),
//   dredge (B.N.T.G. tar dredge winch over the boiling tar pool), radio (Harmouth field transceiver at camp), carla (a girl at the camp: give her the kazoo),
//   loop (the end of the crawl: the first time, it brings you out where you started), exit (the asphalt, a dim glow ahead).
import { heard } from "./lib/hear.js";
import { vo } from "./lib/voices.js";
import { setCarlaStep, setKarstStep, finishQuest8 } from "./lib/level8-quests.js";
import { addRep, repOf } from "./lib/rep.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => { if (who?.state) who.state.notice = { text, at: ctx.now() }; };
const CARLA = [
  "Hi! You're new. Soup's three Backbucks.",
  "Mum says the blue lights down the Road are friendly. Not the red ones.",
  "It's always soup. I don't mind. Do you mind?"
];
const RADIO_LOGS = [
  "HARMOUTH LOG #14: \"Do not trust the crawl past Marker #78 on your first pass. The karst loops back on itself until you've seen the Face Rock twice.\"",
  "M.E.G. SURVEY: \"The third cavern floods on a five-and-a-half-minute siphon cycle. When the water hits your ankles, take the limestone ledges on the left wall.\"",
  "HARMOUTH LOG #22: \"Hyperspace Lane's cyan lights respond to acoustic resonance. Hum into the hollow flowstone pipes and the cold leaves your bones.\"",
  "B.N.T.G. DISPATCH: \"We rigged a cable dredge on the west rim of the Tar Pool. Crank it fast. If the pitch starts reaching back, let go of the handle.\"",
  "SENTRY ALERT: \"A Broodmother has nested beyond the red glyph at Marker #76. Her chitin plates stop small-caliber rounds, but the camp pays top dollar for them.\"",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, w = who.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, cool = (s.cool ??= {});
    const snd = (n, v = 0.6) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: 14 });
    if (s.kind === "pool") {
      snd("water-pour-splash-short", 0.6);
      w.thirst = Math.min(100, (w.thirst ?? 100) + 30);
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+30 THIRST", color: "#60c0ff", size: 1.1 }, { audience: { player: who.id } });
      return;
    }
    if (s.kind === "soup") { // the cook's pot: a bowl is bought, $3 (her pick), and handed over to eat (E) or throw (Z)
      const PRICE = 300, cook = ctx.query({ tags: ["npc"], center: pos, radius: 7 }).find((o) => !o.state?.dead && (o.state?.hp ?? 1) > 0);
      const cn = cook?.state?.name ?? cook?.state?.displayName ?? "The cook";
      const cv = cook ? voiceKey(cook) : "l8-carla-kid";
      if (!cook) return say(who, "Nobody is minding the pot.", ctx);
      if (now - (cool[uid] ?? -1e9) < 20000) {
        const line = "One at a time. Eat what you've got.";
        heard(ctx, { clip: vo(cv, line), position: pos, volume: 0.9, maxDistance: 14 });
        return say(who, `${cn}: "${line}"`, ctx);
      }
      if ((w.cents ?? 0) < PRICE) {
        const line = "Three Backdollars a bowl. Come back when you've got it.";
        heard(ctx, { clip: vo(cv, line), position: pos, volume: 0.9, maxDistance: 14 });
        return say(who, `${cn}: "${line}"`, ctx);
      }
      const ask = (s.ask ??= {});
      if (!(now - (ask[uid] ?? -1e9) < 10000)) {
        ask[uid] = now;
        const line = "Soup's three Backdollars a bowl. You want one?";
        heard(ctx, { clip: vo(cv, line), position: pos, volume: 0.9, maxDistance: 14 });
        return say(who, `${cn}: "${line}" (Press again to pay $3.00)`, ctx);
      }
      delete ask[uid]; w.cents -= PRICE; cool[uid] = now; snd("pot-lid-clink-and-ladle-in-soup", 0.5);
      w.weapons = [...(w.weapons ? w.weapons.split(',') : []), 'soup_bowl'].join(','); // held like a weapon: equip it, click throws, use from inventory or quick slot (scripts/player.js)
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "-$3.00 (SOUP)", color: "#ffcf60", size: 1.0 }, { audience: { player: who.id } });
      const line = "Eat it or wear it, it's yours now.";
      heard(ctx, { clip: vo(cv, line), position: pos, volume: 0.9, maxDistance: 14 });
      return say(who, `${cn}: "${line}"`, ctx);
    }
    if (s.kind === "bowl") {
      w.weapons = [...(w.weapons ? w.weapons.split(",") : []), "soup_bowl"].join(",");
      ctx.destroy(ctx.self.id);
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.0, z: pos.z }, text: "+SOUP BOWL", color: "#e8c070", size: 1.0 }, { audience: { player: who.id } });
      return;
    }
    if (s.kind === "fire") {
      if (now - (cool[uid] ?? -1e9) < 40000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "STILL WARM", color: "#e8a060", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      w.sanity = Math.min(100, (w.sanity ?? 80) + 12);
      w.hp = Math.min(w.maxHp ?? 1e9, (w.hp ?? 0) + 10);
      snd("bandage-wrap-cloth", 0.4);
      ctx.emit("flash", { target: who.id, color: "#ff9933", duration: 0.35 });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.5, z: pos.z }, text: "+12 SANITY", color: "#80ffaa", size: 1.1 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+10 HP", color: "#ff8080", size: 1.0 }, { audience: { player: who.id } });
      return;
    }
    if (s.kind === "kazoo") {
      w.kazoo = true;
      snd("walkie-talkie-radio-click-static-burst", 0.4);
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+STONE KAZOO", color: "#f2d870", size: 1.2 }, { audience: { player: who.id } });
      if ((w.carlaQ ?? 0) < 3) setCarlaStep(ctx, who, 3, "Recovered the Stone Kazoo! Deliver it to Carla at the 9th Road campfire.");
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "altar") {
      if (now - (cool[uid] ?? -1e9) < 60000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "RESONATING...", color: "#80e0d0", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      const bonus = w.kazoo || w.kazooGiven ? 22 : 14;
      w.sanity = Math.min(100, (w.sanity ?? 80) + bonus);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 12);
      heard(ctx, { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: pos, volume: 0.85, maxDistance: 40 });
      ctx.emit("flash", { target: who.id, color: "#40e0d0", duration: 0.5 });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.5, z: pos.z }, text: `+${bonus} SANITY`, color: "#80ffaa", size: 1.2 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+12 HP", color: "#ff8080", size: 1.0 }, { audience: { player: who.id } });
      return;
    }
    if (s.kind === "dredge") {
      if (now - (cool[uid] ?? -1e9) < 55000) return say(who, "The dredge bucket is still sinking into the pitch.", ctx);
      cool[uid] = now; snd("thick-tar-bubbling-and-wet-gurgle", 0.65);
      const r = ctx.random();
      let extra = "pitch", label = "tar pitch";
      if (r < 0.28) { extra = "ammo"; label = "pitch and rifle rounds"; }
      else if (r < 0.52) { extra = "battery"; label = "pitch and caver's battery"; }
      else if (r < 0.72) { extra = "ironstone"; label = "pitch and ironstone nodule"; }
      else if (r < 0.88) { extra = "cash:1500"; label = "pitch and B.N.T.G. scrip pouch"; }
      let slap = "";
      if (ctx.random() < 0.25) {
        w.hp = Math.max(1, (w.hp ?? 100) - 8);
        slap = " A tar hand lunged up and scorched your wrist!";
        ctx.emit("cameraPunch", { direction: { x: 0, y: 0.4, z: -0.4 }, intensity: 0.35 }, { audience: { player: who.id } });
      }
      w.payout = { xp: 16, items: ["pitch", extra], text: `Dredge hauled: ${label}.${slap}` };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+TAR DREDGE", color: "#f0c040", size: 1.1 }, { audience: { player: who.id } });
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
      w.payout = { xp: 4, items: Array(n).fill("glow_cap"), text: `Harvested ${n} glow cap${n > 1 ? "s" : ""} (+4 XP)` };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, text: `+${n} GLOW CAP`, color: "#40f0c0", size: 1.0 }, { audience: { player: who.id } });
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "cocoon") {
      snd("bandage-wrap-cloth", 0.5); const n = 2 + (ctx.random() < 0.5 ? 1 : 0), items = Array(n).fill("spider_silk"), extra = ctx.random() < 0.45 ? ["almond", "bandage", "battery", "ration", "ammo", "kit"][Math.floor(ctx.random() * 6)] : null;
      if (extra) items.push(extra);
      let bit = "";
      if (ctx.random() < 0.18) { w.hp = Math.max(1, (w.hp ?? 0) - (w.maxHp ?? 100) * 0.03); bit = " (bitten by young spider!)"; }
      w.payout = { xp: 8, items, text: `Slit cocoon: ${n} spider silk${extra ? ` + ${extra}` : ""}${bit} (+8 XP)` };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, text: `+${n} SILK`, color: "#e0e0e0", size: 1.0 }, { audience: { player: who.id } });
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "seep") {
      snd("water-pour-splash-short", 0.3); let burn = "";
      if (ctx.random() < 0.3) { w.hp = Math.max(1, (w.hp ?? 0) - (w.maxHp ?? 100) * 0.035); burn = " (pitch burned hands!)"; }
      w.payout = { xp: 10, items: ["pitch", "pitch"], text: `Scraped 2 pitch${burn} (+10 XP)` };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, text: "+2 PITCH", color: "#b8a070", size: 1.0 }, { audience: { player: who.id } });
      return ctx.destroy(ctx.self.id);
    }
    if (s.kind === "board") {
      if (repOf(w, "survivors") <= -35) return say(who, "Board: the camp has struck your name off the errand list. Make amends with the Survivors first.", ctx);
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
      const sv = repOf(w, "survivors"), bonus = sv >= 35 ? 0.25 : sv >= 12 ? 0.1 : 0; // friends of the camp are paid better, as in every level
      const items = q.items.map((it) => (bonus && String(it).startsWith("cash:") ? `cash:${Math.round(Number(String(it).slice(5)) * (1 + bonus))}` : it));
      const tier = addRep(w, "survivors", 2);
      w.payout = { xp: Math.round(q.xp * (1 + lap * 0.5)), items, text: `ERRAND DONE: ${q.name}. "Good. That helps more than you think." The camp pays you. (+${Math.round(q.xp * (1 + lap * 0.5))} XP${bonus ? ", Survivors bonus" : ""}${tier ? `, ${tier}` : ", Survivors +2"})` };
      return;
    }
    if (s.kind === "carla") {
      if (w.kazoo && !w.kazooGiven) {
        w.kazoo = false; w.kazooGiven = true; w.sanity = Math.min(100, (w.sanity ?? 80) + 35);
        finishQuest8(ctx, who, "carla", {
          xp: 90,
          cents: 3000,
          items: ["almond", "bandage"],
          rep: [["survivors", 8], ["karma", 4]],
          text: "Quest Completed: Carla's Melody · +90 XP, +$30.00, +35 Sanity, Almond Water, Clean Bandage",
        });
        const line = "A KAZOO. Listen! Mum, look!";
        heard(ctx, { clip: vo("l8-carla-kid", line), position: pos, volume: 1.0, maxDistance: 14 });
        return;
      }
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      const line = CARLA[n % CARLA.length];
      heard(ctx, { clip: vo("l8-carla-kid", line), position: pos, volume: 1.0, maxDistance: 14 });
      return say(who, `Carla: "${line}"${w.kazooGiven ? " (She hums into the stone kazoo.)" : ""}`, ctx);
    }
  },
};

export function onTriggerEnter(ctx, other) {
  const s = ctx.self.state; if (other?.state?.level == null) return;
  const w = other.state, now = ctx.now();
  if (s.kind === "loop") {
    if ((w.l8Loops ?? 0) >= 1) return; // only the first crawl is wrong: the second time through, the path leads on
    w.l8Loops = (w.l8Loops ?? 0) + 1;
    if ((w.karstQ ?? 0) >= 1 && (w.karstQ ?? 0) < 3) setKarstStep(ctx, other, 3, "Loop threshold recorded! Report your Face Rock compass readings back to Ivo.");
    // Show, don't tell: disorienting spatial anomaly flash, camera punch, and static burst sound
    ctx.emit("screenFlash", { color: "#000000", duration: 0.7, intensity: 1.0 }, { audience: { player: other.id } });
    ctx.emit("cameraPunch", { direction: { x: 0, y: -0.2, z: 0.6 }, intensity: 0.4 }, { audience: { player: other.id } });
    heard(ctx, { clip: G("static-burst-glitch-threshold"), position: s.back, volume: 0.8, maxDistance: 25 }, { audience: { player: other.id } });
    // Teleport player out of the crevice directly under illuminated Marker #74 facing Face Rock
    other.feetPosition = { x: s.back.x, y: s.back.y + 0.2, z: s.back.z };
    other.rotation = { yaw: s.back.yaw };
    return;
  }
  if (s.kind === "exit") {
    if (now - (w.l8ExitAt ?? -1e9) < 20000) return; w.l8ExitAt = now;
    // Show, don't tell: cold suburban sodium blinding flare & wind draft sound at the threshold
    ctx.emit("screenFlash", { color: "#fff0c0", duration: 2.2, intensity: 1.0 }, { audience: { player: other.id } });
    heard(ctx, { clip: G("static-burst-glitch-threshold"), position: other.feetPosition, volume: 0.75, maxDistance: 20 }, { audience: { player: other.id } });
    w.l8Exits = (w.l8Exits ?? 0) + 1;
    ctx.after(2.2, "back", { id: other.id });
  }
}
// the glow was not the way out (Level 9 is not built yet): the Road lets you go back to the camp
export function back(ctx, p) {
  const o = ctx.getObject(p.id), b = ctx.self.state.back; if (!o || !b) return;
  o.feetPosition = { x: b.x, y: b.y + 0.2, z: b.z }; o.rotation = { yaw: b.yaw };
}
