import TV from "./lib/data/tv-channels.yml";
// Inside the green house: the front door goes back to the porch, the bed rests you.
const RADIO = [
  { name: "pop punk on 98.7", clip: "cdn/music-early-2000s-pop-punk-fast-guitars-drums-anthem-loop.mp3" },
  { name: "r&b slow jams", clip: "cdn/music-2000s-rnb-smooth-slow-jam-beat-keys-loop.mp3" },
  { name: "eurodance hits", clip: "cdn/music-2000s-eurodance-trance-synth-club-loop.mp3" },
];
const TEXTS = ["u up? lol", "did u see the new episode of laguna beach", "brb mom needs the phone line", "pls add me back to ur top 8", "ttyl going 2 blockbuster", "r u coming 2 the mall later"];
export function ding(ctx, { by }) {
  ctx.self.state.busy = false; ctx.self.audio = null;
  ctx.emit("playSound", { clip: "cdn/sfx-microwave-oven-triple-beep-ding.mp3", position: ctx.self.feetPosition, volume: 0.8 });
  const w = ctx.getObject(by)?.state; if (w) { w.hunger = Math.max(0, (w.hunger ?? 0) - 25); w.notice = { text: "Hot Pocket's done. Still frozen in the middle.", at: ctx.now() }; }
}
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w) return;
    const now = ctx.now(), k = ctx.self.state.kind;
    if (k === "exit") {
      ctx.emit("playSound", { clip: "cdn/sfx-wooden-front-door-opens-and-closes.mp3", position: ctx.self.feetPosition, volume: 0.8 });
      ctx.emit("screenFlash", { color: "#000000", duration: 0.6, intensity: 0.9 }, { audience: { player: who.id } });
      ctx.cross(who, "level11#l11-from-home");
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
    if (k === "microwave") {
      if (ctx.self.state.busy) return; ctx.self.state.busy = true;
      ctx.self.audio = { clip: "cdn/sfx-microwave-oven-running-hum-loop.mp3", loop: true, gain: 0.35, spatial: true, maxDistance: 8 };
      ctx.after(8, "ding", { by });
      w.notice = { text: "Nuking a Hot Pocket...", at: now };
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
