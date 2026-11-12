import { animate } from "builtin/tween";
import TV from "./lib/data/tv-channels.yml";
import SNACKS from "./lib/data/snacks.yml";
import { MEAT } from "./lib/items.js";
import { carryAcross } from "./lib/carry.js";
// Inside the green house: the front door goes back to the porch, the bed rests you.
const RADIO = [
  { name: "pop punk on 98.7", clip: "cdn/music-early-2000s-pop-punk-fast-guitars-drums-anthem-loop.mp3" },
  { name: "r&b slow jams", clip: "cdn/music-2000s-rnb-smooth-slow-jam-beat-keys-loop.mp3" },
  { name: "eurodance hits", clip: "cdn/music-2000s-eurodance-trance-synth-club-loop.mp3" },
];
const TEXTS = ["u up? lol", "did u see the new episode of laguna beach", "brb mom needs the phone line", "pls add me back to ur top 8", "ttyl going 2 blockbuster", "r u coming 2 the mall later"];
export function ding(ctx, { by, meat, snack }) {
  ctx.self.state.busy = false; ctx.self.audio = null;
  ctx.emit("playSound", { clip: "cdn/sfx-microwave-oven-triple-beep-ding.mp3", position: ctx.self.feetPosition, volume: 0.8 });
  const w = ctx.getObject(by)?.state; if (w) {
    const v = meat ? MEAT[meat] : SNACKS[snack], food = (meat ? v.food : v.hunger) ?? 10;
    w.hunger = Math.min(100, (w.hunger ?? 100) + Math.round(food * 1.5)); w.hp = (w.hp ?? 0) + Math.round((v.hp ?? 0) * 1.5);
    w.notice = { text: `Hot ${v.name.toLowerCase()}. Better warm.`, at: ctx.now() };
  }
}
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w) return;
    const now = ctx.now(), k = ctx.self.state.kind;
    if (k === "exit") {
      ctx.emit("playSound", { clip: "cdn/sfx-wooden-front-door-opens-and-closes.mp3", position: ctx.self.feetPosition, volume: 0.8 });
      ctx.emit("screenFlash", { color: "#000000", duration: 0.6, intensity: 0.9 }, { audience: { player: who.id } });
      carryAcross(ctx, who, "level11#l11-from-home"); ctx.cross(who, "level11#l11-from-home");
      return;
    }
    if (k === "tub") { // Level 27 lore: turn a bath to its hottest and close your eyes; you come back out here
      ctx.emit("playSound", { clip: "cdn/sfx-bathtub-faucet-turned-on-full-hot-water-gushing.mp3", position: ctx.self.feetPosition, volume: 0.8 });
      ctx.emit("screenFlash", { color: "#ffffff", duration: 1.2, intensity: 0.9 }, { audience: { player: who.id } });
      w.l27from = "home11#h-from-l27"; w.notice = { text: "Hot as it goes. You close your eyes in the steam...", at: now };
      carryAcross(ctx, who, "level27#l27-from-tub"); ctx.cross(who, "level27#l27-from-tub");
      return;
    }
    if (k === "tote") { // carrying something (Z): E drops it in. Empty hands: E takes the newest thing out, a step ahead
      const st = ctx.place.state, ids = Object.keys(st.packed ?? {});
      const o = w.carryId && ctx.getObject(w.carryId);
      if (o) {
        if (ids.length >= 12) { w.notice = { text: "The tote's full.", at: now }; return; }
        const spec = { tags: (o.tags ?? []).filter((t) => t !== "breakable"), state: { ...o.state }, model: o.model, primitive: o.primitive, material: o.material, layout: o.layout, physics: { body: "static", collider: "box" }, rotation: { yaw: o.rotation?.yaw ?? 0 } };
        st.packed = { ...(st.packed ?? {}), [o.id]: spec };
        w.carry = null; w.carryId = null; w.carryMul = 1;
        ctx.destroy(o.id);
        ctx.emit("playSound", { clip: "cdn/sfx-plastic-storage-bin-item-dropped-in-rustle.mp3", position: ctx.self.feetPosition, volume: 0.6 });
        if (w.home11) w.homeKeep = { packed: st.packed, moved: st.moved ?? {} }; // rides the owner's save
        w.notice = { text: `Put the ${spec.state?.name ?? "thing"} in the tote. ${ids.length + 1}/12`, at: now }; return;
      }
      if (!ids.length) { w.notice = { text: "The tote's empty. Lift something with Z and bring it here.", at: now }; return; }
      const id = ids[ids.length - 1], spec = st.packed[id], p = who.feetPosition, yaw = who.camera?.rotation?.yaw ?? 0, r = (yaw * Math.PI) / 180;
      const at = { x: p.x - Math.sin(r) * 0.9, y: p.y, z: p.z - Math.cos(r) * 0.9 };
      const rest = { ...st.packed }; delete rest[id]; st.packed = rest;
      st.moved = { ...(st.moved ?? {}), [id]: { p: at, yaw: spec.rotation?.yaw ?? 0 } };
      ctx.spawn(id, { ...spec, feetPosition: at });
      ctx.emit("playSound", { clip: "cdn/sfx-plastic-storage-bin-item-dropped-in-rustle.mp3", position: at, volume: 0.6 });
      if (w.home11) w.homeKeep = { packed: st.packed, moved: st.moved };
      w.notice = { text: `Set out the ${spec.state?.name ?? "thing"}. Tote: ${ids.length - 1}/12`, at: now }; return;
    }
    if (k === "door") {
      const hinge = ctx.getObject(ctx.self.state.hinge); if (!hinge) return;
      const open = !hinge.state.open; hinge.state.open = open;
      animate(ctx, hinge, { "rotation.yaw": open ? hinge.state.openYaw : 0 }, { duration: 0.6, easing: "easeOutCubic" }); // fast start, soft stop
      ctx.self.state.verb = open ? "Close" : "Open";
      ctx.emit("playSound", { clip: open ? "/cdn/moodboard-realistic-gritty/sfx-old-wooden-hotel-door-creak-open.mp3" : "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3", position: hinge.worldFeetPosition ?? ctx.self.worldFeetPosition, volume: 0.5 });
      return;
    }
    if (k === "tv") {
      const n = TV.channels.length, ch = ((ctx.self.state.ch ?? 0) + 1) % (n + 1); // n = off
      ctx.self.state.ch = ch;
      const snd = ctx.getObject("h-tv-sound"), glow = ctx.getObject("h-tv-glow");
      ctx.emit("playSound", { clip: "cdn/sfx-old-crt-television-channel-click-static-burst.mp3", position: ctx.self.feetPosition, volume: 0.5 });
      if (ch === n) {
        ctx.self.visible = false; if (snd) snd.audio = null; if (glow?.light) glow.light = { ...glow.light, intensity: 0 };
        w.notice = { text: "TV off", at: now }; return;
      }
      const c = TV.channels[ch];
      ctx.self.visible = true; ctx.self.material = { ...ctx.self.material, texture: c.video };
      if (snd) snd.audio = { ...(snd.state?.audio ?? { loop: true, gain: 0.35, spatial: true, maxDistance: 10 }), clip: c.audio };
      if (glow?.light) glow.light = { ...glow.light, intensity: glow.state?.int ?? 0.6 };
      w.notice = { text: `CH ${ch + 1}: ${c.name}`, at: now };
      return;
    }
    if (k === "boombox") {
      const n = RADIO.length, i = ((ctx.self.state.st ?? -1) + 1) % (n + 1); ctx.self.state.st = i;
      ctx.emit("playSound", { clip: "cdn/sfx-plastic-boombox-button-click.mp3", position: ctx.self.feetPosition, volume: 0.6 });
      ctx.self.audio = i < n ? { clip: RADIO[i].clip, loop: true, gain: 0.3, spatial: true, maxDistance: 14, bus: "Music" } : null;
      w.notice = { text: i < n ? `Boombox: ${RADIO[i].name}` : "Boombox off", at: now };
      return;
    }
    if (k === "lamp") {
      const L = ctx.getObject(ctx.self.state.light); if (!L) return;
      const on = !(ctx.self.state.on ?? true); ctx.self.state.on = on;
      L.light = { ...L.light, intensity: on ? ctx.self.state.int : 0 };
      ctx.emit("playSound", { clip: "cdn/sfx-lamp-pull-chain-switch-click.mp3", position: ctx.self.feetPosition, volume: 0.6 });
      return;
    }
    if (k === "fridge") {
      if (now - (w.fridgeAt ?? 0) < 300000) { w.notice = { text: "Fridge is empty. Give it a few minutes.", at: now }; return; }
      w.fridgeAt = now; w.almond = (w.almond ?? 0) + 1;
      ctx.emit("playSound", { clip: "cdn/sfx-refrigerator-door-open-glass-bottles-clink-close.mp3", position: ctx.self.feetPosition, volume: 0.7 });
      w.notice = { text: `Cold Almond Water from the fridge (${w.almond} carried)`, at: now };
      return;
    }
    if (k === "microwave") { // heats one thing you carry: raw meat first, else a non-drink snack; hot food fills you more
      if (ctx.self.state.busy) return;
      const meat = Object.keys(w.meat ?? {}).find((c) => w.meat[c] > 0 && MEAT[c]);
      const snack = !meat && Object.keys(w.snacks ?? {}).find((c) => w.snacks[c] > 0 && SNACKS[c] && !SNACKS[c].drink);
      if (!meat && !snack) { w.notice = { text: "Nothing to heat. Bring some food.", at: now }; return; }
      if (meat) w.meat = { ...w.meat, [meat]: w.meat[meat] - 1 }; else w.snacks = { ...w.snacks, [snack]: w.snacks[snack] - 1 };
      ctx.self.state.busy = true;
      ctx.self.audio = { clip: "cdn/sfx-microwave-oven-running-hum-loop.mp3", loop: true, gain: 0.35, spatial: true, maxDistance: 8 };
      ctx.after(8, "ding", { by, meat: meat || "", snack: snack || "" });
      w.notice = { text: `Heating ${(meat ? MEAT[meat] : SNACKS[snack]).name}...`, at: now };
      return;
    }
    if (k === "phone") {
      const m = TEXTS[Math.floor(ctx.random() * TEXTS.length)];
      ctx.emit("playSound", { clip: "cdn/sfx-2000s-flip-phone-snap-open-and-polyphonic-text-tone.mp3", position: ctx.self.feetPosition, volume: 0.6 });
      w.notice = { text: `1 new text: "${m}"`, at: now };
      return;
    }
    if (k === "bed") {
      if (now - (w.homeRest ?? 0) < 60000) { w.notice = { text: "You just slept. You're not tired.", at: now }; return; }
      w.homeRest = now; w.sanity = Math.min(150, (w.sanity ?? 80) + 40); w.hp = (w.hp ?? 0) + 60;
      ctx.emit("screenFlash", { color: "#000000", duration: 1.6, intensity: 1 }, { audience: { player: who.id } });
      w.notice = { text: "You sleep for a while. +40 sanity, +60 HP.", at: now };
    }
  },
};
