// "Ines's goggles": Level 5's night-vision quest, on four pressables (state.kind):
//   radio — by the Housekeeping door to the Boiler Room: Ines, a M.E.G. boiler tech stuck in the Cold Room, talks you through it
//   case  — her dropped case, south end of the Boiler Room: empty, the strap chewed; drag marks lead to the hound den
//   den   — a hound den of bones and scrap: the goggles glint green in it; taking them makes the pack howl
//   drop  — the M.E.G. drop box in the Cold Room: hand in the goggles plus one battery cell; she tests them and they're yours
// Progress is the player's own: player.state.nvgQ 1 asked · 2 case found empty · 3 goggles taken (cracked, no cell) · 4 done.
import { heard } from "./lib/hear.js";
const VO = (t) => `/cdn/voice-tired-young-woman-mechanic-over-crackly-radio-saying-${encodeURIComponent(t)}.mp3`;
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3";
const NAME = "Ines's goggles";
const LINES = {
  ask: "Hey. You, by the door. I'm holed up by the drop box and I dropped my goggle case by the compressor, south end. Bring me what's in it and a pair is yours.",
  ask2: "South end, by the compressor. Keep moving near the furnaces.",
  empty: "Empty? Teeth marks? Oh no. The hounds hoard anything shiny. Their den is east, past the condenser. Follow the drag marks.",
  empty2: "The den. East, past the condenser. Grab them and run, they wake up mean.",
  got: "You got them! Now get to the drop box before they catch you. And I need a battery cell to test them, find one if you can.",
  got2: "Drop box, northeast. Bring a battery, the cell in these is dead.",
  nocell: "They're cracked but they'll work. I just need a battery to power them. Check the hotel rooms.",
  done: "Lens holds. They work. Keep them, you earned them. Batteries go fast down in six, so don't waste them.",
  had: "Already gave you a pair. Go on, I'm fine in here.",
};
const TIP = { 1: "Find Ines's goggle case at the south end of the Boiler Room", 2: "Follow the drag marks east to the hound den", 3: "Bring the goggles and a battery to the M.E.G. drop box, northeast" };
function say(ctx, p, key, at) {
  heard(ctx, { clip: CLICK, position: at, volume: 0.6, maxDistance: 14, refDistance: 2 }, { audience: { player: p.id } });
  heard(ctx, { clip: VO(LINES[key]), position: at, volume: 1, maxDistance: 30, refDistance: 3 }, { audience: { player: p.id } });
  p.state.notice = { text: `Ines (radio): "${LINES[key]}"`, at: ctx.now() };
}
const step = (ctx, s, q) => { s.nvgQ = q; s.quest = TIP[q] ? { name: NAME, step: TIP[q], at: ctx.now() } : null; };
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by); if (!p?.state) return;
    const me = ctx.self, s = p.state, q = s.nvgQ ?? 0, now = ctx.now(), at = me.worldFeetPosition ?? me.feetPosition;
    const kind = me.state.kind;
    if (kind === "radio") {
      if (q >= 4) return say(ctx, p, "had", at);
      if (q === 0) { step(ctx, s, 1); return say(ctx, p, "ask", at); }
      return say(ctx, p, q === 1 ? "ask2" : q === 2 ? "empty2" : "got2", at);
    }
    if (kind === "case") {
      if (q !== 1) { s.notice = { text: q === 0 ? "A dented case stencilled INES · M.E.G. MAINT. Empty, the strap chewed through." : "The empty case. Drag marks lead east.", at: now }; return; }
      step(ctx, s, 2);
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-container-open-rustle.mp3", position: at, volume: 0.7, maxDistance: 10 }, { audience: { player: p.id } });
      say(ctx, p, "empty", at); // her voice comes over your own radio
      s.notice = { text: "Empty. Teeth marks on the strap, drag marks east · Ines: \"" + LINES.empty + "\"", at: now };
      return;
    }
    if (kind === "den") {
      if (q !== 2) { s.notice = { text: q < 2 ? "Bones, scraps, a chewed boot. A hound den." : "Bones and scraps. Nothing shiny left.", at: now }; return; }
      step(ctx, s, 3); s.pickedAt = now;
      s.loud = { at: now, gun: true }; // the pack hears it (lib/hunt.js, hounds.js)
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-hound-bark-howl-call.mp3", position: at, volume: 1, maxDistance: 60, refDistance: 6 });
      ctx.emit("screenShake", { intensity: 0.25, duration: 0.3 }, { audience: { player: p.id } });
      const g = me.children?.find?.((c) => String(c.id ?? c).endsWith("glint"));
      if (g) {
        g.visible = false;
        const o = ctx.getObject(g.id ?? g);
        if (o) o.visible = false;
      }
      say(ctx, p, "got", at);
      return;
    }
    if (kind === "drop") {
      if (q >= 4) { s.notice = { text: "The drop box is empty.", at: now }; return; }
      if (q !== 3) { s.notice = { text: "M.E.G. drop box. Nothing to hand in.", at: now }; return; }
      if ((s.battery ?? 0) < 25) return say(ctx, p, "nocell", at); // a cell's worth of charge from the torch pool
      s.battery = Math.max(0, (s.battery ?? 100) - 25);
      s.nvgCell = true;
      step(ctx, s, 4);
      if (s.nvg) s.nvgSpare = (s.nvgSpare ?? 0) + 1;
      else s.nvg = true;
      s.cents = (s.cents ?? 0) + 25;
      s.pickedAt = now;
      ctx.emit("milestone", { step: 1, name: "ines-goggles" }, { audience: { player: p.id } });
      say(ctx, p, "done", at);
      ctx.after(0.2, "reward", { id: p.id });
    }
  },
};
export function reward(ctx, { id }) {
  const p = ctx.getObject(id); if (!p?.state) return;
  p.state.notice = { text: "Night vision goggles · $25 · Press F to activate · Essential in Level 6", at: ctx.now() };
  p.state.xpPop = { amount: 75, at: ctx.now() };
}
