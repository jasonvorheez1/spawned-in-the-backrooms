// The Way Back follows Dina's courier trail. Keep dinaQ stages for saved games.
import { setQuest, endQuest } from "./quests.js";
import { pushFeed } from "./feed.js";
import { vo } from "./voices.js";
export function questVoice(ctx, who, line, pid) { const clip = vo(who, line); if (clip) ctx.emit("playSound", { clip, volume: 0.95, bus: "Voice", mode: "restart" }, { audience: { player: pid } }); }
const LEGACY = "the-undelivered";
export const HOME = { id: "the-way-back", name: "The Way Back" };
export const CAMP = { x: 22.3, y: 0, z: 38.4 };
export const DCUT_LEN = 31;
export const PAGE1 = "/cdn/value.c34ec656c4a1cff78a3e39fc4180767562f4900c7e7c22db887da96de4027188.png";
export const PAGE2 = "/cdn/value.3dff2011e2fa82e3cd6426f6aa4cc9ca4a5306ed13cac0a14ade3168408563db.png";
export const PAGES = [[9, 16.2], [16, 23]]; // each page's seconds on screen
const STEP = {
  0: { step: "Find a way out of the yellow rooms. Look for someone who knows a route home.", mark: { place: "level1", id: "dina-diary" } },
  1: { step: "Follow the radio static along Level 1's south wall. Read Dina's diary at the camp.", mark: { place: "level1", id: "dina-diary", ...CAMP } },
  2: { step: "Dina picked up a broadcast from home. Get aboard the SS Fun and find River's backup in Cabin 23.", mark: { place: "level26", id: "l26-cabin23" } },
  3: { step: "Search Cabin 23 on the SS Fun for River's backup drive.", mark: { place: "level26", id: "l26-cabin23" } },
  4: { step: "The drive case is empty. Follow the wet prints below decks and ask who passed through.", mark: { place: "level26", id: "l26d-phoebe-room" } },
  5: { step: "Follow the wet prints past the party to the bedroll at the end of the hall.", mark: { place: "level26", id: "l26d-stow-nest" } },
  6: { step: "Trace the stowaway's chit to Voss on Level 1. Ask him or check the freight slips by his stall.", mark: { place: "level1", id: "dina-freight-slip" } },
  7: { step: "Find the buyer's handoff record at the Electrical Station checkpoint on Level 3.", mark: { place: "level3", id: "dina-handoff" } },
  8: { step: "Check River's test number against the public records inside Base Gamma.", mark: { place: "gamma", id: "dina-return-record" } },
  9: { step: "Chapter 1 complete. River made contact with the Frontrooms. The crossing is unverified and the backup drive is still missing.", mark: null },
};
export function dinaLead(ctx, st) {
  if (st.dinaLead || (st.dinaQ ?? 0) >= 2) return;
  st.dinaLead = true;
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-soft-pda-beep-confirm.mp3", volume: 0.55 }, { audience: { player: ctx.self.id } });
  st.sub = { who: "HALOGEN · UNSENT MESSAGE", t: "If this unit still boots, find my radio on Level One. I heard a station from home. They read out tomorrow's weather. River made a copy. — Dina", at: ctx.now(), d: 12500 };
  questVoice(ctx, "q-dina", "If this unit still boots, find my radio on Level One. I heard a station from home. They read out tomorrow's weather. River made a copy.", ctx.self.id);
  syncHome(ctx, st, "tutorial0");
}
function syncHome(ctx, st, place) {
  const n = st.dinaQ ?? 0;
  if (st.quests?.[LEGACY]) {
    const old = st.quests[LEGACY], current = st.quests[HOME.id], qtrack = st.qtrack ?? [];
    st.quests = { ...st.quests, [HOME.id]: { ...(current ?? old), name: HOME.name, history: [...new Set([...(current?.history ?? []), ...(old.history ?? []), old.step].filter(Boolean))].slice(-12) } };
    endQuest(st, LEGACY, false);
    if (qtrack.includes(LEGACY) && !qtrack.includes(HOME.id)) st.qtrack = qtrack.map((id) => id === LEGACY ? HOME.id : id);
  }
  if (n === 9) {
    if (st.quests?.[HOME.id]) endQuest(st, HOME.id, STEP[9].step);
    return;
  }
  const row = n === 0 && place === "tutorial0"
    ? { step: st.dinaLead ? "Find Dina's radio on Level 1. Follow the drawings to a way out of the yellow rooms." : "Find a way out of the yellow rooms and look for a route home.", mark: null }
    : STEP[n];
  if (!row) return;
  const cur = st.quests?.[HOME.id];
  if (cur?.name === HOME.name && cur.step === row.step && cur.main && cur.mark?.place === row.mark?.place && cur.mark?.id === row.mark?.id) return;
  if (setQuest(st, HOME.id, { name: HOME.name, ...row, main: true })) {
    const note = "Quest Started: The Way Back";
    st.notice = { text: note, at: ctx.now() }; pushFeed(st, note, ctx.now(), "info");
  }
}
const RADIO = "Patrol to base. There's a light on at the courier's camp. Say again, someone is at Dina's camp. Moving to check.";
const VO = `/cdn/voice-gruff-tired-man-field-operative-over-crackly-two-way-radio-saying-${encodeURIComponent(RADIO)}.mp3`;
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3";
const TURN = "/cdn/moodboard-realistic-gritty/sfx-old-diary-page-turn-close-dry-paper.mp3";
const OPEN = "/cdn/moodboard-realistic-gritty/sfx-leather-notebook-elastic-snap-open.mp3";
const SCORE = "/cdn/moodboard-realistic-gritty/music-film-cue-31-seconds-lonely-low-cello-drone-cold-concrete-room-single-piano-note-at-9-seconds-and-16-seconds-tension-rises-at-23-seconds-cut-to-silence.mp3";
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const me1 = (ctx) => ({ audience: { player: ctx.self.id } });
const snd = (ctx, clip, v, at) => ctx.emit("playSound", { clip, position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 80 }, me1(ctx));
export function setDinaStep(ctx, st, n, note) {
  if (n <= (st.dinaQ ?? 0) || !STEP[n]) return false;
  st.dinaQ = n;
  syncHome(ctx, st, ctx.self.place);
  if (note) { st.notice = { text: note, at: ctx.now() }; pushFeed(st, note, ctx.now(), "info"); }
  return true;
}
export function dinaTick(ctx, ses, st, place = ctx.self.place) {
  const me = ctx.self;
  if (!st.dcut) {
    if (st.menuOpen || st.cut || st.arrive || st.arrivePending || place === "intake" || st.level == null) return false;
    if (place === "level1" && !st.dinaQ) setDinaStep(ctx, st, 1);
    else if (place === "level26" && st.dinaQ === 2 && !st.l26cut) setDinaStep(ctx, st, 3);
    else if (place !== "bonus" || st.dinaQ || st.quests?.[HOME.id]) syncHome(ctx, st, place);
    return false;
  }
  const t = (ctx.now() - st.dcut.at) / 1000;
  const c = (ses.dcut ??= { p0: { ...me.feetPosition }, did: {} });
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn(); } };
  me.feetPosition = c.p0; me.velocity = { x: 0, y: 0, z: 0 };
  const skip = ses.dskip && ctx.now() - ses.dskip > 1200;
  if (t >= DCUT_LEN || skip || place !== "level1") {
    ctx.view.camera = null; st.dcut = null; ses.dcut = null; ses.dskip = null;
    if (skip && c.score) ctx.emit("stopSound", { soundId: c.score }, me1(ctx));
    st.dinaDiary = true;
    if ((st.dinaQ ?? 0) < 2) setDinaStep(ctx, st, 2, "Dina's diary added");
    return false;
  }
  const O = ctx.place.objects, dp = O["dina-diary"]?.feetPosition ?? { x: CAMP.x, y: 0.3, z: CAMP.z }, rp = O["dina-radio"]?.feetPosition ?? { x: CAMP.x + 1, y: 0.4, z: CAMP.z - 1.4 };
  once("score", () => { c.score = snd(ctx, SCORE, 0.6); });
  // A, 0-5: the camp from out on the floor, low, pushing in. Whoever you are, you are standing in it
  if (t < 5) { const u = ss(0, 5, t); ctx.view.camera = { eye: L({ x: CAMP.x - 2.6, y: 0.45, z: CAMP.z - 6.2 }, { x: CAMP.x - 1.7, y: 0.6, z: CAMP.z - 4.4 }, u), aim: { x: CAMP.x, y: 0.7, z: CAMP.z }, fov: 46 }; return true; }
  // B, 5-9: along the sleeping bag to the diary
  if (t < 9) { const u = ss(5, 9, t); once("open", () => snd(ctx, OPEN, 0.7, dp)); ctx.view.camera = { eye: L({ x: dp.x + 1.5, y: dp.y + 0.35, z: dp.z - 1.5 }, { x: dp.x + 0.55, y: dp.y + 0.5, z: dp.z - 0.8 }, u), aim: { x: dp.x, y: dp.y + 0.03, z: dp.z }, fov: 38 }; return true; }
  // C and D, 9-23: her pages (the pictures are drawn by dUi over this held shot)
  if (t < 23) {
    once("p1", () => snd(ctx, TURN, 0.8)); if (t > 16) once("p2", () => snd(ctx, TURN, 0.8));
    ctx.view.camera = { eye: { x: dp.x + 0.55, y: dp.y + 0.5, z: dp.z - 0.8 }, aim: { x: dp.x, y: dp.y + 0.03, z: dp.z }, fov: 38 }; return true;
  }
  // E, 23-31: the radio on its crate. It has been hissing the whole time; now somebody is on it
  const u = ss(23, 31, t), head = { x: rp.x, y: rp.y + 0.12, z: rp.z };
  once("click", () => snd(ctx, CLICK, 0.9, rp));
  if (t > 24) once("vo", () => snd(ctx, VO, 1, rp));
  ctx.view.camera = { eye: L({ x: rp.x - 0.9, y: rp.y + 0.3, z: rp.z - 1.3 }, { x: rp.x - 0.45, y: rp.y + 0.22, z: rp.z - 0.7 }, u), aim: head, fov: 36 };
  return true;
}
