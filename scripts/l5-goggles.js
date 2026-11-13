// "Ines's goggles": Level 5's night-vision quest, on four pressables (state.kind):
//   radio: by the Housekeeping door to the Boiler Room: Ines, a M.E.G. boiler tech shut in the Cold Room, talks you through it.
//          The first press is her pitch; a second press within 30 s takes the job (walking off declines it, and she asks again next time).
//   case: her dropped case, south end of the Boiler Room: empty, the strap chewed; drag marks lead to the hound den.
//          [Survival 35] reads the marks: a young hound, and the pack sleeps (a hint to crouch).
//   den: a hound den of bones and scrap: the goggles glint green in it. [Sneak 40] (+15 crouched) lifts them quietly;
//          a failed roll, like the old way, wakes the pack with a howl.
//   drop: the M.E.G. drop box at the Cold Room door: hand in the goggles; she tests them on a quarter of your torch charge,
//          or [Repair 40] bridges them to the box's own test leads. They're yours, once.
// Progress is the player's own: player.state.nvgQ 1 asked · 2 case found empty · 3 goggles taken · 4 done (old saves keep these).
import { heard } from "./lib/hear.js";
import { setQuest, endQuest, qid } from "./lib/quests.js";
import { questBriefing } from "./lib/quest-dialogue.js";
import { rollCheck } from "./lib/npc-talk.js";
import { addRep } from "./lib/rep.js";
import { pushFeed } from "./lib/feed.js";
const VO = (t) => `/cdn/voice-tired-young-woman-mechanic-over-crackly-radio-saying-${encodeURIComponent(t)}.mp3`;
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3";
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3", FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const NAME = "Ines's goggles";
const QID = qid(NAME);
const LINES = {
  pitch: "Hey, you, by the door. Ines, M.E.G. boiler maintenance. I'm shut in the Cold Room, hounds outside. My night-vision goggles are in a case I dropped by the south compressor. Bring them to my drop box and they're yours. Will you?",
  ask: "Thank you. South end of the Boiler Room, by the big compressor. Keep moving near the furnaces, they get hot enough to cook you.",
  ask2: "South end, by the compressor. Keep moving near the furnaces.",
  empty: "Empty? Teeth marks? Oh no. The hounds hoard anything shiny. Their den is east, past the condenser. Follow the drag marks. Go in low. They sleep light.",
  tracks: "One set of tracks, small. A pup did it. If the pup's back in the den, the pack's asleep around it. Crouch the whole way in and they might not wake.",
  empty2: "The den. East, past the condenser. Crouch, go slow, take them and leave.",
  quiet: "You got them and nobody woke? You're good at this. Come to the drop box, northeast. I'll test them on a quarter of your torch charge.",
  got: "They're howling. Run! Get to the drop box, northeast. I'll test them on a quarter of your torch charge.",
  got2: "Drop box, northeast, at the Cold Room door. Bring some torch charge, the cell in these is dead.",
  nocell: "They're cracked but they'll work. I need a quarter of a torch cell to test them. Find a battery and come back.",
  bridged: "You ran them off the box's test leads? That's not in the manual. That's better than the manual. They work. Keep them.",
  done: "Lens holds. They work. Keep them, you earned them. Batteries go fast down here, so don't waste them.",
  after: [
    "Still here. Still cold. The hounds got bored of my door. That's because of you, I think.",
    "Furnace three is running hot again. Not your problem. Wear the goggles in the Boiler Room, the shadows between the furnaces lie.",
    "If M.E.G. asks who has my goggles, I'll say I lost them. Which is true, technically.",
  ],
};
const TIP = {
  1: "Find Ines's dropped goggle case by the compressor at the south end of the Boiler Room",
  2: "Follow the drag marks east past the condenser to the hound den. Crouch: the pack sleeps light [Sneak 40]",
  3: "Bring the goggles to the M.E.G. drop box at the Cold Room door, northeast of the Boiler Room. Ines needs a quarter of a torch cell, or bridge them to the box [Repair 40]",
};
const MARK = {
  1: { place: "level5", id: "l5-nvg-case", x: 31.5, y: 0, z: 23.4 },
  2: { place: "level5", id: "l5-nvg-den", x: 44, y: 0, z: 1 },
  3: { place: "level5", id: "l5-nvg-drop", x: 45.2, y: 0, z: -19.6 },
};
export const NVG_Q = { key: "nvgQ", name: NAME, tips: TIP, marks: MARK }; // read by scripts/quest-marker.js
function say(ctx, p, key, at, line = LINES[key]) {
  heard(ctx, { clip: CLICK, position: at, volume: 0.6, maxDistance: 14, refDistance: 2 }, { audience: { player: p.id } });
  heard(ctx, { clip: VO(line), position: at, volume: 1, maxDistance: 30, refDistance: 3 }, { audience: { player: p.id } });
  p.state.notice = { text: `Ines (radio): "${line}"`, at: ctx.now() };
}
// the [Skill N] verdict, its sound, and the feed line
function check(ctx, p, skill, difficulty, label, at, bonus = 0) {
  const c = rollCheck(ctx, p.state, { skill, difficulty: difficulty - bonus });
  heard(ctx, { clip: c.ok ? CHIME : FAIL, position: at, volume: 0.5, maxDistance: 12 }, { audience: { player: p.id } });
  pushFeed(p.state, `[${label} ${difficulty}] ${c.ok ? "SUCCEEDED" : "FAILED"}`, ctx.now(), c.ok ? "good" : "info");
  return c.ok;
}
const step = (ctx, s, q, doneText) => {
  s.nvgQ = q;
  if (TIP[q]) {
    const mark = MARK[q] ?? null;
    s.quest = { name: NAME, step: TIP[q], mark, at: ctx.now() };
    setQuest(s, QID, { name: NAME, step: TIP[q], mark, briefing: questBriefing(QID) || undefined });
  } else {
    if (s.quest?.name === NAME) s.quest = null;
    endQuest(s, QID, doneText);
  }
};
function finish(ctx, p, at, how) {
  const s = p.state, now = ctx.now();
  if ((s.nvgQ ?? 0) >= 4) return;
  step(ctx, s, 4, how === "bridged" ? "Recovered Ines's night vision goggles and ran them off the drop box's test leads" : "Recovered Ines's night vision goggles in the Boiler Room");
  if (s.nvg) s.nvgSpare = (s.nvgSpare ?? 0) + 1;
  else s.nvg = true;
  s.nvgCell = true;
  s.cents = (s.cents ?? 0) + 2500;
  addRep(s, "meg", 8);
  s.pickedAt = now;
  ctx.emit("milestone", { step: 1, name: "ines-goggles" }, { audience: { player: p.id } });
  say(ctx, p, how, at);
  ctx.after(0.2, "reward", { id: p.id });
}
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by); if (!p?.state) return;
    const me = ctx.self, s = p.state, q = s.nvgQ ?? 0, now = ctx.now(), at = me.worldFeetPosition ?? me.feetPosition;
    const kind = me.state.kind;
    if (kind === "radio") {
      if (q >= 4) { s.nvgAfter = ((s.nvgAfter ?? -1) + 1) % LINES.after.length; return say(ctx, p, "after", at, LINES.after[s.nvgAfter]); }
      if (q === 0) {
        if (now - (s.nvgAsk ?? -1e9) < 30000) { delete s.nvgAsk; step(ctx, s, 1); return say(ctx, p, "ask", at); } // the second press takes the job
        s.nvgAsk = now; say(ctx, p, "pitch", at);
        s.notice = { text: `Ines (radio): "${LINES.pitch}" (Press the radio again to take the job, or walk away.)`, at: now };
        return;
      }
      return say(ctx, p, q === 1 ? "ask2" : q === 2 ? "empty2" : "got2", at);
    }
    if (kind === "case") {
      if (q !== 1) { s.notice = { text: q === 0 ? "A dented case stencilled INES · M.E.G. MAINT. Empty, the strap chewed through." : "The empty case. Drag marks lead east.", at: now }; return; }
      step(ctx, s, 2);
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-container-open-rustle.mp3", position: at, volume: 0.7, maxDistance: 10 }, { audience: { player: p.id } });
      if (check(ctx, p, "survival", 35, "Survival", at)) { s.nvgTracks = true; say(ctx, p, "tracks", at); s.notice = { text: `[Survival 35] You read the marks · Ines: "${LINES.tracks}"`, at: now }; return; }
      say(ctx, p, "empty", at); // her voice comes over your own radio
      s.notice = { text: "Empty. Teeth marks on the strap, drag marks east · Ines: \"" + LINES.empty + "\"", at: now };
      return;
    }
    if (kind === "den") {
      if (q !== 2) { s.notice = { text: q < 2 ? "Bones, scraps, a chewed boot. A hound den." : "Bones and scraps. Nothing shiny left.", at: now }; return; }
      step(ctx, s, 3); s.pickedAt = now;
      const g = me.children?.find?.((c) => String(c.id ?? c).endsWith("glint"));
      if (g) { g.visible = false; const o = ctx.getObject(g.id ?? g); if (o) o.visible = false; }
      const low = !!p.state.crouch, bonus = (low ? 15 : 0) + (s.nvgTracks ? 5 : 0);
      if (check(ctx, p, "sneak", 40, "Sneak", at, bonus)) { s.nvgQuiet = true; say(ctx, p, "quiet", at); return; } // no howl, no fight
      s.loud = { at: now, gun: true }; // the pack hears it (lib/hunt.js, hounds.js)
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-hound-bark-howl-call.mp3", position: at, volume: 1, maxDistance: 60, refDistance: 6 });
      ctx.emit("screenShake", { intensity: 0.25, duration: 0.3 }, { audience: { player: p.id } });
      say(ctx, p, "got", at);
      return;
    }
    if (kind === "drop") {
      if (q >= 4) { s.notice = { text: "The drop box is empty.", at: now }; return; }
      if (q !== 3) { s.notice = { text: "M.E.G. drop box. Nothing to hand in.", at: now }; return; }
      if ((s.battery ?? 0) >= 25) { s.battery = Math.max(0, s.battery - 25); return finish(ctx, p, at, "done"); } // a cell's worth of charge from the torch pool
      if (!s.nvgBridgeTried) {
        s.nvgBridgeTried = true; // one try
        if (check(ctx, p, "repair", 40, "Repair", at)) return finish(ctx, p, at, "bridged");
      }
      return say(ctx, p, "nocell", at);
    }
  },
};
export function reward(ctx, { id }) {
  const p = ctx.getObject(id); if (!p?.state) return;
  const now = ctx.now(), text = "Quest Completed: Ines's goggles · Night vision goggles, +$25.00, M.E.G. +8 · Press F to activate";
  p.state.notice = { text, at: now };
  pushFeed(p.state, text, now, "good");
  p.state.payout = { xp: 75, items: [], text };
}
