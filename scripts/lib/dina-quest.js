// The Way Back is a clue trail (design/story-spine.md). player.state.trail = { name, word, list, tape, room, radio, pass },
// each 1 once learned. The tracker only names what the trail has taught. After trail.pass the old dinaQ stages (2..9) run.
import { setQuest, endQuest } from "./quests.js";
import { pushFeed } from "./feed.js";
import { vo } from "./voices.js";
import { skillsOf } from "./stats.js";
import { entryOf } from "./dialogue.js";
import Q from "./data/dlg-quest-main.yml";
const LEGACY = "the-undelivered";
export const HOME = { id: "the-way-back", name: "The Way Back" };
export const CAMP = { x: 22.3, y: 0, z: 38.4 };
export const DCUT_LEN = 31;
export const PAGE1 = "/cdn/value.c34ec656c4a1cff78a3e39fc4180767562f4900c7e7c22db887da96de4027188.png";
export const PAGE2 = "/cdn/value.3dff2011e2fa82e3cd6426f6aa4cc9ca4a5306ed13cac0a14ade3168408563db.png";
export const PAGES = [[9, 16.2], [16, 23]]; // each page's seconds on screen
export const TRAIL = ["name", "word", "list", "tape", "room", "radio", "pass"];
const LEARNED = { word: "Learned: what people call this place", list: "Learned: Dina is on the camp's list", tape: "Dina's tape added", room: "Learned: Dina kept a room at the hotel", radio: "Learned: the broadcast is real", pass: "Learned: the ship, and where it boards" };
// write one trail key, once. Returns true the first time
export function learn(ctx, st, key, quiet) {
  if (!st || !TRAIL.includes(key) || st.trail?.[key]) return false;
  st.trail = { ...(st.trail ?? {}), [key]: 1 };
  if (!quiet && LEARNED[key]) { st.notice = { text: LEARNED[key], at: ctx.now() }; pushFeed(st, LEARNED[key], ctx.now(), "info"); }
  return true;
}
// the lines other scripts still send by their old words: each plays its rewritten line (and voice) and teaches its clue
const OLD = {
  "River copied the return test. Cabin 23, SS Fun. If I miss the handoff, look there.": { to: Q["q-dina"].diary, keys: ["name", "word", "list"] },
  "C-23. One waterproof case from the Adventure. Pickup at the Electrical Station checkpoint. Paid in batteries.": { to: Q["bntg-voss"].slip, keys: ["name", "list"] },
  "Freight slips from the Habitable Zone. Each delivery has a ticket number.": { to: Q["q-clerk"]["slip-early"], keys: ["name", "list"], sub: "SIGN-IN SHEET" },
  "C-23 canceled. The stowaway never turned up. River filed a copy of the test results before the drive went missing. Look up Return Test 04 at Base Gamma.": { to: Q["q-clerk"].handoff, keys: ["name", "tape"] },
  "A handoff log. The page is indexed by freight ticket. Somebody tore out the carbon paper.": { to: Q["q-clerk"]["handoff-early"], keys: ["name", "tape"], who: "q-dina", sub: "TAPE · DINA" },
  "RETURN TEST 04. A phone rang on the other side. The operator gave the date. We called again and a second operator gave the same date. When we sent a runner through, she came back on Level 1. Voice contact confirmed. Crossing unverified.": { to: Q["q-clerk"].archive, keys: [] },
  "The public index lists return experiments by number. Most files are marked UNVERIFIED.": { to: Q["q-clerk"]["archive-early"], keys: [] },
};
export function questVoice(ctx, who, line, pid) {
  const m = OLD[line];
  if (m) {
    line = m.to; who = m.who ?? who;
    const st = ctx.getObject(pid)?.state;
    if (st) { if (st.sub) st.sub = { ...st.sub, t: m.to, ...(m.sub ? { who: m.sub } : {}) }; for (const k of m.keys) learn(ctx, st, k, k === "name"); }
  }
  const clip = vo(who, line); if (clip) ctx.emit("playSound", { clip, volume: 0.95, bus: "Voice", mode: "restart" }, { audience: { player: pid } });
}
// after trail.pass: the ship and what follows (saved games keep their dinaQ stage)
const STEP = {
  2: { step: "The ship is the SS Fun. Get aboard and find River's cabin, number 23.", mark: { place: "level26", id: "l26-cabin23" } },
  3: { step: "Search Cabin 23 on the SS Fun for River's backup drive.", mark: { place: "level26", id: "l26-cabin23" } },
  4: { step: "The drive case is empty. Follow the wet prints below decks and ask who passed through.", mark: { place: "level26", id: "l26d-phoebe-room" } },
  5: { step: "Follow the wet prints past the party to the bedroll at the end of the hall.", mark: { place: "level26", id: "l26d-stow-nest" } },
  6: { step: "The stowaway's chit came from a trader named Voss on Level 1. Ask him, or check the slips by his stall.", mark: { place: "level1", id: "dina-freight-slip" } },
  7: { step: "The slip names a checkpoint at the Electrical Station on Level 3. Find the handoff record there.", mark: { place: "level3", id: "dina-handoff" } },
  8: { step: "Check River's test number against the public records inside Base Gamma.", mark: { place: "gamma", id: "dina-return-record" } },
  9: { step: "Chapter 1 complete. River reached a voice on the other side. Nobody has crossed, and the backup drive is still missing.", mark: null },
};
// before trail.pass: questions. Indexed by how far the trail has gone (the furthest key learned)
const ASK = [
  { step: "Find someone. Ask where you are.", mark: null },
  { step: "Something left you a name: Dina. Find people. Ask where you are, and who she is.", mark: null },
  { step: "Find out who Dina is. Somebody at the camp keeps a list of names.", mark: { place: "level1", id: "dina-freight-slip" } },
  { step: "Dina asked about ways out, then went down. Look for what she left on the levels below the camp.", mark: { place: "level3", id: "dina-handoff" } },
  { step: "Dina's tape says she took a room at the hotel on Level 5. Ask the staff what she left behind.", mark: { place: "level5" } },
  { step: "Dina left the hotel for the city on Level 11, looking for a radio. Ask who ran one for her.", mark: { place: "level11" } },
  { step: "The broadcast is real, and Dina booked passage on a ship. Find out which ship and where it boards.", mark: { place: "level11" } },
];
// the main quest's tracker row for a save: { step, mark }
export function trailStep(st) {
  const t = st?.trail ?? {};
  if (t.pass) return STEP[Math.max(2, st.dinaQ ?? 0)] ?? STEP[2];
  let hi = 0; TRAIL.forEach((k, i) => { if (t[k]) hi = i + 1; });
  if (hi === 2 && !t.name) return { step: "Ask around the camp how people get out of here.", mark: null };
  return ASK[hi];
}
export const trailText = (st) => trailStep(st).step;
// saves from before the trail: whatever the old quest had shown them, they know
function migrate(st) {
  if (st.trailMig) return; st.trailMig = 1;
  const n = st.dinaQ ?? 0, t = { ...(st.trail ?? {}) };
  if (st.dinaLead || n >= 1) t.name = 1;
  if (st.dinaDiary) { t.name = 1; t.word = 1; t.list = 1; }
  if (n >= 2 || st.l26seen || st.l26cut) for (const k of TRAIL) t[k] = 1;
  if (Object.keys(t).length) st.trail = t;
}
export function dinaLead(ctx, st) {
  if (st.trail?.name || (st.dinaQ ?? 0) >= 2) return;
  st.dinaLead = true; learn(ctx, st, "name", true);
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-soft-pda-beep-confirm.mp3", volume: 0.55 }, { audience: { player: ctx.self.id } });
  st.sub = { who: "HALOGEN · UNSENT MESSAGE", t: Q["q-dina"].halogen, at: ctx.now(), d: 9000 };
  questVoice(ctx, "q-dina", Q["q-dina"].halogen, ctx.self.id);
  syncHome(ctx, st);
}
function syncHome(ctx, st) {
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
  const row = trailStep(st);
  if (!row) return;
  const cur = st.quests?.[HOME.id];
  if (cur?.name === HOME.name && cur.step === row.step && cur.main && cur.mark?.place === row.mark?.place && cur.mark?.id === row.mark?.id) return;
  if (cur && !st.trail?.pass) st.quests = { ...st.quests, [HOME.id]: { ...cur, history: (cur.history ?? []).filter((h) => !/SS Fun|Dina's diary|Cabin 23/.test(h)) } }; // old tracker lines told too much
  if (setQuest(st, HOME.id, { name: HOME.name, ...row, main: true })) {
    const note = "Quest Started: The Way Back";
    st.notice = { text: note, at: ctx.now() }; pushFeed(st, note, ctx.now(), "info");
  }
}
// Talk teaches the trail. A dialogue node carrying do: "trail:<key>" (or "trail:word,list") teaches it when asked and any check passes.
// Until every person carries one, the plain questions teach by where they are asked.
const findNode = (v, q) => { if (!v || typeof v !== "object") return null; if (v.q === q) return v; for (const c of Array.isArray(v) ? v : Object.values(v)) { const n = findNode(c, q); if (n) return n; } return null; };
function watchTalk(ctx, st, place) {
  const ses = ctx.self.session, asked = ses?.askedNow;
  if (!ses || !st.talkWith || !asked?.length) { if (ses) ses.trailSeen = 0; return; }
  if (ses.trailWith !== st.talkWith) { ses.trailWith = st.talkWith; ses.trailSeen = 0; }
  if ((ses.trailSeen ?? 0) >= asked.length) return;
  const it = ctx.getObject(st.talkWith), sid = String(st.talkWith).split("/").pop();
  let e = null; try { e = it ? entryOf(it, place)?.e : null; } catch { e = null; }
  for (let i = ses.trailSeen ?? 0; i < asked.length; i++) {
    const q = String(asked[i] ?? ""), n = findNode(e?.ask, q);
    if (n?.sk) { const x = [...(st.talks?.[sid] ?? [])].reverse().find((r) => r[0] === "x"); if (!x || /FAILED/.test(x[1])) continue; }
    const act = typeof n?.do === "string" && n.do.startsWith("trail:") ? n.do.slice(6).split(",").map((k) => k.trim()) : null;
    if (act) { for (const k of act) { if (k !== "name" && k !== "word") learn(ctx, st, "name", true); learn(ctx, st, k); } continue; }
    const dina = /\bdina\b/i.test(q) && st.trail?.name;
    if (place === "level1" && /where am i|what is this place/i.test(q)) learn(ctx, st, "word");
    else if (place === "level1" && dina && sid.startsWith("meg-")) learn(ctx, st, "list");
    else if (place === "level5" && dina) learn(ctx, st, "room");
    else if (place === "level11" && dina) learn(ctx, st, "radio");
    else if (place === "level11" && st.trail?.radio && /\b(ship|boat|passage)\b/i.test(q)) learn(ctx, st, "pass");
  }
  ses.trailSeen = asked.length;
}
// The gangway (scripts/level-door.js, any threshold onto the ship). No pass: the purser turns you back, in his own words.
// Three ways round him: keep low and slip by, talk your way on (Speech), or step up again with fifty Backdollars.
const FARE = 5000, TALK = 70;
function purser(ctx, p, line, who = "PURSER") {
  p.state.sub = { who, t: line, at: ctx.now(), d: 8000 };
  if (who !== "PURSER") return;
  const clip = vo("q-purser", line) ?? `/cdn/voice-dry-bored-ship-purser-man-saying-${encodeURIComponent(line)}.mp3`;
  ctx.emit("playSound", { clip, volume: 0.95, bus: "Voice", mode: "restart" }, { audience: { player: p.id } });
}
export function funGate(ctx, p) {
  const st = p?.state; if (!st) return false;
  migrate(st);
  if (st.trail?.pass) return true;
  const L = Q["q-purser"], now = ctx.now();
  if (st.crouch) { learn(ctx, st, "pass", true); purser(ctx, p, L.sneak, ""); return true; }
  if (!st.funAsk || now - st.funAsk > 90000) { st.funAsk = now; purser(ctx, p, L.refuse); return false; }
  if ((skillsOf(st).speech ?? 0) >= TALK) { learn(ctx, st, "pass", true); purser(ctx, p, L.talked); return true; }
  if ((st.cents ?? 0) >= FARE) { st.cents -= FARE; learn(ctx, st, "pass", true); purser(ctx, p, L.paid); return true; }
  st.funAsk = now; purser(ctx, p, L.broke); return false;
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
  for (const k of TRAIL) learn(ctx, st, k, true); // a ship stage means the trail is behind them
  st.dinaQ = n;
  syncHome(ctx, st);
  if (note) { st.notice = { text: note, at: ctx.now() }; pushFeed(st, note, ctx.now(), "info"); }
  return true;
}
export function dinaTick(ctx, ses, st, place = ctx.self.place) {
  const me = ctx.self;
  if (!st.dcut) {
    if (st.menuOpen || st.cut || st.arrive || st.arrivePending || place === "intake" || st.level == null) return false;
    migrate(st);
    watchTalk(ctx, st, place);
    if (place !== "tutorial0" && place !== "bonus" && !st.trail?.name) dinaLead(ctx, st); // skipped the waking: the wrist unit still has her message
    if (st.trail?.pass && (st.dinaQ ?? 0) < 2) setDinaStep(ctx, st, 2);
    else if (place === "level26" && st.dinaQ === 2 && !st.l26cut) setDinaStep(ctx, st, 3);
    else if (place !== "bonus" || st.dinaQ || st.quests?.[HOME.id]) syncHome(ctx, st);
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
    const fresh = [learn(ctx, st, "name", true), learn(ctx, st, "word", true), learn(ctx, st, "list", true)].some(Boolean); // her diary: what the camp calls this place, and that they wrote her down
    if (fresh) { st.notice = { text: "Dina's diary added", at: ctx.now() }; pushFeed(st, "Dina's diary added", ctx.now(), "info"); }
    syncHome(ctx, st);
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
