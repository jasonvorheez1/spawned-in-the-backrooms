// The main quest's first part (Shelly, Nov 9): a nobody walks into Level 1, hears a radio nobody is answering, and finds the
// camp of Dina A., a courier who lay down with a delivery nobody was left to sign for. Reading her diary plays a cutscene:
// the camp, her pages, the last one (CABIN 23 · SS Fun), and a voice on her radio saying someone is at the courier's camp.
// state.dinaQ: 1 = follow the static, 2 = find cabin 23. state.dcut = { at } while the cutscene plays (scripts/cutscene-ui.js dUi).
import { setQuest } from "./quests.js";
import { pushFeed } from "./feed.js";
export const DINA = { id: "the-undelivered", name: "The Undelivered" }; // my name for it
export const CAMP = { x: 22.3, y: 0, z: 38.4 };
export const DCUT_LEN = 31;
export const PAGE1 = "/cdn/value.c34ec656c4a1cff78a3e39fc4180767562f4900c7e7c22db887da96de4027188.png";
export const PAGE2 = "/cdn/value.3dff2011e2fa82e3cd6426f6aa4cc9ca4a5306ed13cac0a14ade3168408563db.png";
export const PAGES = [[9, 16.2], [16, 23]]; // each page's seconds on screen
const STEP = {
  1: { step: "Follow the radio static along the south wall of Level 1", mark: { place: "level1", id: "dina-radio", x: CAMP.x, y: 0, z: CAMP.z } },
  2: { step: "Get aboard the SS Fun. Survivors swear the Time 4 Fun posters on Level 4 lead there", mark: { place: "level4", id: "l4-fun-poster" } },
  3: { step: "Find Cabin 23 on the SS Fun's cabin deck", mark: { place: "level26", id: "l26-cabin23" } },
  4: { step: "Someone took River's drive before you. The wet prints lead below decks, to the party", mark: { place: "level26", id: "l26d-phoebe-room" } },
  5: { step: "Someone took Dina's case. Phoebe says they're still on the ship", mark: null }, // the story past here is unwritten
};
export { setStep as setDinaStep };
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
function setStep(ctx, st, n, note) {
  st.dinaQ = n;
  setQuest(st, DINA.id, { name: DINA.name, step: STEP[n].step, mark: STEP[n].mark, main: true });
  if (note) { st.notice = { text: note, at: ctx.now() }; pushFeed(st, note, ctx.now(), "info"); }
}
// called every tick from scripts/main-menu.js on the player's own machine; true while the cutscene owns the player
export function dinaTick(ctx, ses, st) {
  const me = ctx.self, place = me.place;
  if (!st.dcut) {
    if (place === "level1" && !st.dinaQ && !st.menuOpen && !st.cut) setStep(ctx, st, 1, "Quest Started: The Undelivered");
    else if (place === "level26" && st.dinaQ === 2 && !st.l26cut) setStep(ctx, st, 3, "Quest Updated: The Undelivered"); // aboard: now the cabin
    else if (st.dinaQ && !st.quests?.[DINA.id] && STEP[st.dinaQ]) setStep(ctx, st, st.dinaQ); // a save from before the journal
    else if (st.dinaQ === 2 && st.quests?.[DINA.id]?.step !== STEP[2].step) setStep(ctx, st, 2); // older saves: the old step had no way there
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
    if ((st.dinaQ ?? 0) < 2) setStep(ctx, st, 2, "Dina's diary added");
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
