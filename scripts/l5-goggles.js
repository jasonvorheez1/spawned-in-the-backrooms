// "Ines's goggles": Level 5's night-vision quest. Three pressables (state.kind):
//   radio  — by the Housekeeping door to the Boiler Room: Ines, the boiler tech, asks for her dropped goggle case
//   case   — her case, dropped in the far south of the Boiler Room among the coal and the compressor
//   drop   — the M.E.G. drop box in the Cold Room: hand the case in, she radios back, you keep a spare pair
// Progress is the player's own: player.state.nvgQ = 1 asked, 2 carrying the case, 3 done.
import { heard } from "./lib/hear.js";
const VO = (t) => `/cdn/voice-tired-young-woman-mechanic-over-crackly-radio-saying-${encodeURIComponent(t)}.mp3`;
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3";
const LINES = {
  ask: "Hey. You. You're heading down there? I dropped my goggle case by the compressor, far south end. Bring it to the cold room drop box and a pair is yours.",
  again: "South end, by the compressor. Then the cold room. Don't stop near the furnaces.",
  done: "You actually made it. Keep those. Batteries go fast, so don't waste them.",
  had: "Already gave you a pair. Go on.",
};
function say(ctx, p, key, at) {
  heard(ctx, { clip: CLICK, position: at, volume: 0.6, maxDistance: 14, refDistance: 2 }, { audience: { player: p.id } });
  heard(ctx, { clip: VO(LINES[key]), position: at, volume: 1, maxDistance: 14, refDistance: 2 }, { audience: { player: p.id } });
  p.state.notice = { text: `Ines (radio): "${LINES[key]}"`, at: ctx.now() };
}
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by); if (!p?.state) return;
    const me = ctx.self, s = p.state, q = s.nvgQ ?? 0, now = ctx.now(), at = me.worldFeetPosition ?? me.feetPosition;
    if (me.state.kind === "radio") {
      if (q >= 3) return say(ctx, p, "had", at);
      if (q === 0) { s.nvgQ = 1; s.quest = { name: "Ines's goggles", step: "Find her goggle case at the south end of the Boiler Room", at: now }; return say(ctx, p, "ask", at); }
      return say(ctx, p, "again", at);
    }
    if (me.state.kind === "case") {
      if (q !== 1) { s.notice = { text: q >= 2 ? "You already have what was in it." : "A dented case stencilled INES · M.E.G. MAINT. Latched shut.", at: now }; return; }
      s.nvgQ = 2; s.quest = { name: "Ines's goggles", step: "Take the case to the drop box in the Cold Room (northeast)", at: now };
      s.notice = { text: "Ines's goggle case · take it to the Cold Room drop box", at: now };
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-container-open-rustle.mp3", position: at, volume: 0.7, maxDistance: 10 }, { audience: { player: p.id } });
      return;
    }
    if (me.state.kind === "drop") {
      if (q !== 2) { s.notice = { text: q >= 3 ? "The drop box is empty." : "M.E.G. drop box. Nothing to hand in.", at: now }; return; }
      s.nvgQ = 3; s.nvg = true; s.quest = null; s.pickedAt = now;
      ctx.emit("milestone", { step: 1, name: "ines-goggles" }, { audience: { player: p.id } });
      say(ctx, p, "done", at);
      ctx.after(0.1, "reward", { id: p.id });
    }
  },
};
export function reward(ctx, { id }) {
  const p = ctx.getObject(id); if (!p?.state) return;
  p.state.notice = { text: "Night vision goggles · press F in the dark of Level 6 · they eat batteries", at: ctx.now() };
  p.state.xpPop = { amount: 50, at: ctx.now() };
}
