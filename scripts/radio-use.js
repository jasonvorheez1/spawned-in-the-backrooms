// Radio Backrooms (places/radio): the coffee machine, the vending machine, the mirror, the PC and the TV answer a press.
import SNACKS from "./lib/data/snacks.yml";
const VEND = ["coke", "pepsi", "dew", "drpepper", "doritos", "lobby_wafer"]; // what Ralph keeps it stocked with, in turn
const PRICE = 150; // cents
const PC = [
  "Ralph's PC. The drive says 'Free: ∞'. Folders named by level, thousands deep.",
  "A text file called 'requests.txt'. The last song on it is one you hummed earlier.",
  "Call logs from people on 'Talkin with Ralph'. Some dates haven't happened yet.",
];
const say = (ctx, w, text) => { w.notice = { text, at: ctx.now() }; };
const snd = (ctx, clip, volume = 0.6) => ctx.emit("playSound", { clip, position: ctx.self.worldFeetPosition, volume, maxDistance: 12 });
export const ears = {
  press: (ctx, payload, meta) => {
    const who = ctx.getObject(meta?.sourceId ?? payload?.by), w = who?.state; if (!w) return;
    const k = ctx.self.state.kind;
    if (k === "coffee") {
      w.snacks = { ...(w.snacks ?? {}), diner_coffee: (w.snacks?.diner_coffee ?? 0) + 1 };
      snd(ctx, "cdn/sfx-drip-coffee-machine-pouring-into-ceramic-mug.mp3", 0.6);
      return say(ctx, w, "A mug of coffee. The pot never runs out. No milk, though.");
    }
    if (k === "vending") {
      const c = VEND[(ctx.self.state.n ?? 0) % VEND.length], v = SNACKS[c];
      if ((w.cents ?? 0) < PRICE) return say(ctx, w, `${v?.name ?? "A drink"} · $1.50. You're short.`);
      w.cents -= PRICE; ctx.self.state.n = (ctx.self.state.n ?? 0) + 1;
      w.snacks = { ...(w.snacks ?? {}), [c]: (w.snacks?.[c] ?? 0) + 1 };
      snd(ctx, "cdn/sfx-vending-machine-coin-motor-whir-can-drop-clunk.mp3", 0.7);
      return say(ctx, w, `${v?.name ?? c} drops into the tray. -$1.50`);
    }
    if (k === "mirror") {
      w.sanity = Math.max(0, (w.sanity ?? 100) - 6);
      ctx.emit("screenFlash", { color: "#000000", duration: 0.35, intensity: 0.7 }, { audience: { player: who.id } });
      snd(ctx, "cdn/sfx-low-eerie-reverse-whoosh-sting.mp3", 0.5);
      return say(ctx, w, "You look. Something else was already looking.");
    }
    if (k === "pc") { snd(ctx, "cdn/sfx-old-keyboard-typing-short.mp3", 0.5); return say(ctx, w, PC[Math.floor(ctx.random() * PC.length)]); }
    if (k === "tv") return say(ctx, w, ctx.self.state.line ? `The static clears: ${ctx.self.state.line}. Then it's gone.` : "Static. Mostly static.");
  },
};
