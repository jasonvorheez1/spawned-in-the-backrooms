// Level 70 "quest" layer. lay(ctx) builds it once per version (ctx.place.state.v70quest), tick(ctx) runs each sim tick (1 s).
// Shelly Nov 13: 3+ stages, alternate paths, factions, lore as tape.
// MAIN "Dry Pipes", player.state.l70q: 1 see the Prime Minister, 2 get a pump fuse from Odell (cash, favour, pickpocket),
// 3 the cellar note (Carnifices froze the main; Vael offers the spur), 4 the valve room: fuse in, breaker thrown, four handwheels,
// 5 the water runs (l70route city | spur | balanced), 6 report back (Larsson or Vael), 99 done. l70h = hints heard.
// SIDES: "Pelt Tax" l70pelt (1 kill 6 froidlings, 2 bring 4 pelts, then Ines or Odell, 99 done);
// "Froston's Ledger" l70led (found at the rig footlocker = 2, then Ines, Odell or Vael, 99 done).
// COLD: player.state.chill 0..100 on Level 70 only, ticked here once a second (never hurts). Numbers below are Savi's picks.
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep } from "./rep.js";
import { setQuest, endQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { SPOT, wildness } from "./level70.js";
import * as TOWN from "./level70-town.js";
import VALVES from "./data/l70-valves.yml";
export const V = 1;
export const QID = "l70-dry-pipes", QNAME = "Dry Pipes", PID = "l70-pelt-tax", PNAME = "Pelt Tax", LID = "l70-ledger", LNAME = "Froston's Ledger";
const LARSSON = "l70-npc-larsson", VAEL = "l70-npc-vael", ODELL = "l70-npc-odell", INES = "l70-npc-ines", NOAH = "l70-npc-marinerson";
const NOTE = "l70-q-note", LOCKER = "l70-q-locker", FACE = "l70-q-gauge-face", POSTER = "l70-q-schematic";
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3", FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const SQUEAL = "/cdn/moodboard-realistic-gritty/sfx-rusty-iron-valve-handwheel-quarter-turn-squeal.mp3";
const CLACK = "/cdn/moodboard-realistic-gritty/sfx-heavy-industrial-breaker-lever-thrown-clack-and-hum.mp3";
const HISS = "/cdn/moodboard-realistic-gritty/sfx-pipe-vents-freezing-steam-loud-hiss.mp3";
const KNOCK = "/cdn/moodboard-realistic-gritty/sfx-old-water-pipes-knock-and-gurgle-as-water-returns.mp3";
const CLUNK = "/cdn/moodboard-realistic-gritty/sfx-old-metal-lockbox-latch-snaps-open-lid-creaks.mp3";
const CASSETTE = "/cdn/value.6ad7bdb76bcbe3407075a965abdc5ba017010b417682aabebd07003ae57bcd32.glb";
const LOCKERGLB = "/cdn/value.bb28fe4d2d4dc8b0dc1d759ab065b18b63e4ce607fa1c9030f70b9121fbb0a9d.glb";
// Savi's picks: what each ending pays (cents; 30000 = $300)
const PAY = { city: { xp: 450, cents: 30000 }, spur: { xp: 450, cents: 22000 }, balanced: { xp: 380, cents: 15000 },
  pelt: { xp: 150, cents: 6000 }, peltOdell: { xp: 120, cents: 11000 }, ledger: { xp: 160, cents: 8000 }, ledgerSell: { xp: 120, cents: 16000 } };
const RATS = 5, FROIDS = 6, PELTS = 4;
// cold, Savi's picks, per second: ~6 min outdoors in town to 80, faster in the wild; fires thaw fast
const COLD = { rise: 0.22, wildRise: 0.18, indoor: -1.2, fire: -4, fireR: 6, toque: 0.6, charmCap: 60 };
const M = (id) => ({ place: "level70", id });
const TIPS = {
  1: "Noah Marinerson says the pipes ran dry. Talk to Prime Minister Larsson in the Parliament Hotel lobby",
  2: "Get a pump fuse from Odell in the Noahtown market: buy it, earn it, or lift it",
  3: "Someone was in the Burns Crescent house cellar the night the pipes froze. Check the workbench, or go straight to the valve room",
  4: "Valve room, east end of the Calor garage: fit the fuse, throw the breaker, set the four handwheels. The gauge and the schematic tell you how",
  "6city": "The city has water. Tell Prime Minister Larsson",
  "6spur": "The spur runs to Iceshed. Tell Hierophant Vael",
  "6balanced": "Both lines run. Tell Larsson, and tell Vael",
};
const MARKS = { 1: M(LARSSON), 2: M(ODELL), 3: M(NOTE), 4: M("l70-breaker"), "6city": M(LARSSON), "6spur": M(VAEL), "6balanced": M(LARSSON) };
const posOf = (p) => p.worldFeetPosition ?? p.feetPosition;
const bag = (s, k) => s.snacks?.[k] ?? 0;
const give = (s, k, n = 1) => { s.snacks = { ...(s.snacks ?? {}), [k]: Math.max(0, bag(s, k) + n) }; };
const kills = (s, k) => s.l70kills?.[k] ?? 0;
const arm = (s, k) => { s.weapons = [...new Set([...String(s.weapons ?? "").split(",").filter(Boolean), k])].join(","); };
function tell(ctx, p, text, clip = CHIME) {
  const s = p.state, now = ctx.now(); s.notice = { text, at: now }; pushFeed(s, text, now, "good");
  const pos = posOf(p); if (pos) heard(ctx, { clip, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}
function setStep(ctx, p, step, text, clip) {
  const s = p.state; s.l70q = step; const k = step === 6 ? "6" + s.l70route : step;
  if (TIPS[k]) setQuest(s, QID, { name: QNAME, step: TIPS[k], mark: MARKS[k] }); if (text) tell(ctx, p, text, clip);
}
function pay(ctx, p, key, qid, name, text, items = []) {
  const s = p.state, k = PAY[key]; endQuest(s, qid, text); s.cents = (s.cents ?? 0) + k.cents;
  const line = `Quest Completed: ${name} (+${k.xp} XP, +$${(k.cents / 100).toFixed(2)})${items.length ? " · Got: " + items.join(", ") : ""}`;
  s.payout = { xp: k.xp, items: [], text: line }; s.notice = { text: line, at: ctx.now() }; pushFeed(s, line, ctx.now(), "good");
  const pos = posOf(p);
  if (pos) { heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: "QUEST COMPLETED: " + name.toUpperCase(), color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } }); }
}
// ---- the valves: pressures from the table, read live by the gauge
export function turnsOf(ctx) { return [0, 1, 2, 3].map((i) => (ctx.place.objects["l70-valve-" + i]?.state?.turn ?? 0) % 4); }
export function pressures(turns) { return VALVES.base.map((b, k) => b + turns.reduce((a, t, i) => a + t * VALVES.couple[i][k], 0)); }
export function matchOf(read) { for (const [k, v] of Object.entries(VALVES.targets)) if (v.read.every((x, i) => x === read[i])) return k; return null; }
export function gaugeText(ctx) { const on = !!ctx.place.objects["l70-breaker"]?.state?.on, r = pressures(turnsOf(ctx)); return on ? `CITY ${r[0]} HOTEL ${r[1]} SPUR ${r[2]}` : "PUMP OFF"; }
function gaugeSvg(read, on, hit) {
  const L = ["CITY", "HOTEL", "SPUR"], col = on ? "#f4d27a" : "#6a6656";
  const bars = read.map((v, i) => { const y = 22 + i * 20, w = Math.max(0, Math.min(18, v)) * 6;
    return `<text x='6' y='${y + 9}' font-family='sans-serif' font-size='10' fill='${col}'>${L[i]}</text><rect x='46' y='${y}' width='108' height='10' fill='#1c1a14' stroke='#58513c'/><rect x='46' y='${y}' width='${on ? w : 0}' height='10' fill='${v >= VALVES.vent && !hit ? "#e0603a" : "#9fd0e8"}'/><text x='158' y='${y + 9}' font-family='sans-serif' font-size='10' fill='${col}'>${on ? v : "--"}</text>`; }).join("");
  return `<svg viewBox='0 0 180 92' width='0.5m'><rect x='1' y='1' width='178' height='90' rx='6' fill='#24221b' stroke='#8a7a52' stroke-width='2'/><text x='8' y='14' font-family='sans-serif' font-size='8' fill='#c8b88a'>KINGDOM WORKS · LINE PRESSURE (BAR)</text>${bars}<text x='8' y='86' font-family='sans-serif' font-size='8' fill='${hit ? "#8ee08a" : "#8a8270"}'>${!on ? "PUMP OFF · NO FUSE" : hit ? "FLOW: " + VALVES.targets[hit].label.toUpperCase() : "NO FLOW"}</text></svg>`;
}
function paintGauge(ctx) {
  const g = ctx.place.objects[FACE]; if (!g) return;
  const on = !!ctx.place.objects["l70-breaker"]?.state?.on, read = pressures(turnsOf(ctx)), hit = on ? matchOf(read) : null, key = `${on}|${read}|${hit}`;
  if (g.state?.key === key) return; g.state = { key, text: gaugeText(ctx) }; g.vector = gaugeSvg(read, on, hit);
}
function steam(ctx, p, at) {
  ctx.emit("fx", { position: at, script: `fx
pop steam burst=40..60 life=1.2..2.2 v=<0,1,0>*(1.5..3)+sdir()*(.6..1.4) size=.25..0.5 acc=buoy(.4)+drag(1.2) sz=$size*(.6>2.6) col=<.92,.95,1> a=0>.12:.7>.6:.35>0 rot=spin(.3) r=sprite(smoke-puff,alpha)
pop frost burst=30 life=.6..1.2 v=sdir()*(1..2.5) size=.02..0.05 acc=grav()*.3+drag(1) col=<.8,.9,1> a=1>0 r=sprite(soft-disc,add)` });
  heard(ctx, { clip: HISS, position: at, volume: 0.8, maxDistance: 22 });
  if (p) { p.state.chill = Math.min(100, (p.state.chill ?? 0) + VALVES.ventChill); tell(ctx, p, "The line vents freezing steam in your face. Chill +" + VALVES.ventChill, HISS); }
}
// ---- presses: valves, breaker, cellar note, Froston footlocker (scripts/l70-press.js)
export function press70(ctx, p, obj) {
  const s = p?.state; if (!s || !obj) return; const id = String(obj.id ?? "").split("/").pop(), now = ctx.now();
  const on = !!ctx.place.objects["l70-breaker"]?.state?.on;
  if (id.startsWith("l70-valve-")) {
    const st = obj.state ?? {}, turn = ((st.turn ?? 0) + 1) % 4; obj.state = { ...st, turn };
    obj.rotation = { pitch: 0, yaw: st.yaw ?? 0, roll: turn * 90 };
    const at = obj.worldFeetPosition ?? obj.feetPosition; heard(ctx, { clip: SQUEAL, position: at, volume: 0.75, maxDistance: 18 });
    paintGauge(ctx);
    if (!on) { s.notice = { text: "The handwheel turns. Nothing moves in the pipe. The pump's dead.", at: now }; return; }
    const read = pressures(turnsOf(ctx)), hit = matchOf(read);
    if (hit) { ctx.place.state.l70pend = { route: hit, at: now, by: p.id }; s.notice = { text: "The needles shiver and settle. Leave it be a moment...", at: now }; return; } // a setting locks in only if it holds (tick), so a path through another target never traps you
    ctx.place.state.l70pend = null;
    if (read.some((v) => v >= VALVES.vent)) steam(ctx, p, { x: at.x, y: at.y + 0.6, z: at.z });
    return;
  }
  if (id === "l70-breaker") {
    if (on) { s.notice = { text: "The breaker hums. The pump below is turning.", at: now }; return; }
    if (!obj.state?.fuse) { if (!bag(s, "fuse70")) { s.notice = { text: "An empty fuse holder, 600 A. Somebody pulled it. Odell in the market sells scrap like this.", at: now }; return; }
      give(s, "fuse70", -1); obj.state = { ...obj.state, fuse: true }; tell(ctx, p, "Fuse seated. Now throw the breaker", CLUNK); return; }
    obj.state = { ...obj.state, on: true }; const pm = ctx.place.objects["l70-pump"]; if (pm) pm.state = { ...pm.state, on: true };
    heard(ctx, { clip: CLACK, position: obj.worldFeetPosition ?? obj.feetPosition, volume: 0.9, maxDistance: 24 }); paintGauge(ctx);
    if ((s.l70q ?? 0) >= 2 && s.l70q < 4) setStep(ctx, p, 4, "The pump wakes up under your boots. Now the handwheels");
    else tell(ctx, p, "The pump wakes up under your boots", CLACK);
    const hit = matchOf(pressures(turnsOf(ctx))); if (hit) resolve(ctx, p, hit);
    return;
  }
  if (id === NOTE) {
    if (s.l70note) { s.notice = { text: "Sawdust and a ring where a mug sat. Nothing else.", at: now }; return; }
    give(s, "notetape70"); s.l70note = true;
    tell(ctx, p, "Got: Tape: Carnifex field note · The Carnifices froze the main on purpose", CLUNK);
    if (s.l70q === 3) setQuest(s, QID, { name: QNAME, step: TIPS[4] + ". Or hear Hierophant Vael out in Iceshed first", mark: M("l70-breaker") });
    return;
  }
  if (id === LOCKER) {
    if (s.l70led) { s.notice = { text: "An open B.N.T.G. footlocker. Frozen socks, a dead walkie, a lot of nothing.", at: now }; return; }
    give(s, "ledger70"); s.l70led = 2; setQuest(s, LID, { name: LNAME, step: "Decide who gets the Froston ledger: Sergeant Ines, Odell, or Hierophant Vael", mark: M(INES) });
    tell(ctx, p, "Quest Started: Froston's Ledger · Got: Tape: B.N.T.G. Froston ledger", CLUNK); return;
  }
}
function resolve(ctx, p, route) {
  const s = p.state;
  if (!s.l70q || s.l70q >= 5) { tell(ctx, p, "Water thunders through the pipe. Somewhere, somebody is very happy.", KNOCK); return; }
  s.l70route = route;
  if (route === "city") { addRep(s, "froid", 30); s.rep = { ...s.rep, gelu: -100 }; }
  if (route === "spur") { addRep(s, "gelu", 30); s.rep = { ...s.rep, froid: -100 }; }
  if (route === "balanced") s.rep = { ...s.rep, froid: Math.min(s.rep?.froid ?? 0, -20), gelu: Math.min(s.rep?.gelu ?? 0, -20) }; // wary, not hostile
  for (const n of ctx.query({ radius: 2000 })) { const st = n.state; if (!st || (st.faction !== "froid" && st.faction !== "gelu")) continue;
    if ((s.rep?.[st.faction] ?? 0) <= -60 && n.id !== LARSSON && n.id !== VAEL) n.state.angry = { ...(st.angry ?? {}), [p.id]: true }; }
  const msg = { city: "The pipes knock all down Kelpie Street and the taps run. The Carnifices will not forgive this", spur: "The water turns north under the snow toward Iceshed. The Kingdom will know who did it", balanced: "Both gauges settle. The city drinks, the spur drinks. Nobody's thrilled with you, which is how you know it's fair" }[route];
  s.l70q = 5; setStep(ctx, p, 6, msg, KNOCK);
}
// ---- dialogue: choices offered (npc-starters.js) and what they do (talk.js)
export function l70Choices(id, s) {
  const q = s?.l70q ?? 0, r = s?.l70route, pt = s?.l70pelt ?? 0, ld = s?.l70led ?? 0, out = [];
  if (id === NOAH) {
    if (!q) out.push({ text: "You look like a man with a dry kettle.", tag: "Quest Start" });
    if (q >= 3 && q < 5 && !s.l70h?.noah) out.push({ text: "Any idea how the valves were set, back when it worked?", tag: "Quest" });
  }
  if (id === LARSSON) {
    if (q === 1) out.push({ text: "Noah sent me. Something about the pipes.", tag: "Quest" });
    if (q >= 2 && q <= 4) out.push({ text: "Remind me what the pump needs.", tag: "Quest" });
    if (q === 6 && (r === "city" || r === "balanced") && !s.l70tLars) out.push({ text: "The water's running.", tag: "Quest Turn-In" });
  }
  if (id === ODELL) {
    if (q === 2 && !bag(s, "fuse70")) {
      out.push({ text: "I need a pump fuse. Sixty bucks?", tag: "Quest" });
      if (s.l70rats == null) out.push({ text: "Any work that pays in fuses?", tag: "Quest" });
      if (s.l70rats != null && kills(s, "deathrat70") - s.l70rats >= RATS) out.push({ text: "Your garage is rat-free. Fuse, please.", tag: "Quest Turn-In" });
      if (!s.l70pickFail) out.push({ text: "[Sneak 45] (Lift the fuse off his table while he talks.)", tag: "Quest" });
    }
    if (pt === 2 && bag(s, "froidpelt") >= PELTS) out.push({ text: "Four froidling pelts. What'll you give me?", tag: "Quest Turn-In" });
    if (ld === 2) out.push({ text: "Want to buy a B.N.T.G. ledger?", tag: "Quest Turn-In" });
  }
  if (id === INES) {
    if (!pt) out.push({ text: "Anything need doing, Sergeant?", tag: "Quest Start" });
    if (pt === 1 && kills(s, "froidling") - (s.l70froid0 ?? 0) >= FROIDS) out.push({ text: "Six froidlings down.", tag: "Quest" });
    if (pt === 2 && bag(s, "froidpelt") >= PELTS) out.push({ text: "Pelts for the Guard. Four of them.", tag: "Quest Turn-In" });
    if (q >= 2 && q < 5 && !s.l70h?.ines) out.push({ text: "How do the Guard run the valves?", tag: "Quest" });
    if (ld === 2) out.push({ text: "I found a B.N.T.G. ledger at Froston.", tag: "Quest Turn-In" });
  }
  if (id === VAEL) {
    if (q >= 2 && q < 5 && !s.l70h?.vael) out.push({ text: s.l70note ? "Your people froze the main." : "What do the Carnifices want with the water?", tag: "Quest" });
    if (q === 6 && (r === "spur" || r === "balanced") && !s.l70tVael) out.push({ text: "The spur is running.", tag: "Quest Turn-In" });
    if (ld === 2) out.push({ text: "This ledger says who really drained the city.", tag: "Quest Turn-In" });
  }
  return out;
}
const T = VALVES.targets, fmt = (t) => t.read.join(" / ");
function doneMain(ctx, p) {
  const s = p.state, r = s.l70route;
  if (r === "balanced" && !(s.l70tLars && s.l70tVael)) { setQuest(s, QID, { name: QNAME, step: s.l70tLars ? "Now tell Hierophant Vael" : "Now tell Prime Minister Larsson", mark: M(s.l70tLars ? VAEL : LARSSON) }); return; }
  const items = [];
  if (r === "balanced") { give(s, "gelucharm70"); items.push("Split-feed valve key"); }
  if (r === "city") { give(s, "toque70"); arm(s, "flaregun70"); s.flare70 = (s.flare70 ?? 0) + 3; items.push("Kingdom toque", "River Guard flare gun"); }
  if (r === "spur") { arm(s, "icepick70"); items.push("Gelu Ice Pick"); }
  s.l70q = 99; pay(ctx, p, r, QID, QNAME, "The pipes of Froidetown run again", items);
}
const toFuse = (ctx, p, s, line) => { give(s, "fuse70"); s.l70q = 3; setQuest(s, QID, { name: QNAME, step: TIPS[3], mark: M(NOTE) }); tell(ctx, p, line); };
export function handleDialogueQuest70(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state; if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(); if (!id.startsWith("l70-npc-")) return null;
  const q = s.l70q ?? 0, pos = posOf(p), h = (k) => { s.l70h = { ...(s.l70h ?? {}), [k]: true }; };
  const roll = (skill, difficulty) => { const c = rollCheck(ctx, s, { skill, difficulty }); if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } }); return c.ok; };
  if (id === NOAH) {
    if (t.includes("dry kettle") && !q) { setStep(ctx, p, 1, `Quest Started: ${QNAME} · Talk to Prime Minister Larsson`);
      return { reply: "Three days, eh. Three days the taps have coughed and nothing. Almond water runs under this whole town in pipes older than me, and I'm old. Go see the Prime Minister at the hotel. Tell her Noah sent you. She'll pretend she knows me.", mood: "sad" }; }
    if (t.includes("valves were set")) { h("noah"); return { reply: `My dad ran that room. He said when both sides were happy the needles read ${fmt(T.balanced)}. City, Hotel, Spur. Never got it there twice, mind you. Swore a lot.`, mood: "neutral" }; }
  }
  if (id === LARSSON) {
    if (t.includes("noah sent me") && q === 1) { setStep(ctx, p, 2, "The pump under the Calor Office Block needs a fuse. Odell has one");
      return { reply: "Noah! Yes. Lovely man. Look, I'm sorry to ask a stranger, that's very un-Canadian of me. The pump under the Calor Office Block has no fuse. Odell at the market has one. Odell has everything, and he charges for all of it. Fit it, turn the water back on. Parliament will be grateful. Formally. In writing.", mood: "neutral" }; }
    if (t.includes("what the pump needs")) return { reply: "A six hundred amp fuse in the breaker, the breaker thrown, then the valves. The Guard know the city setting. Ask Sergeant Ines at the dock. Sorry. Thank you. Sorry.", mood: "neutral" };
    if (t.includes("water's running") && q === 6) { s.l70tLars = true; const r = s.l70route; doneMain(ctx, p);
      return { reply: r === "city" ? "I heard the pipes knock from up here. People are filling bathtubs and crying. Good crying. The Kingdom owes you, and the Kingdom pays its debts. Slowly, but it pays." : "Both lines? You gave the Carnifices water. I'm furious and also, quietly, relieved nobody froze. Here. Smaller than it would have been. Don't make that face.", mood: r === "city" ? "happy" : "annoyed" }; }
  }
  if (id === ODELL) {
    if (t.includes("sixty bucks") && q === 2) {
      if ((s.cents ?? 0) < 6000) return { reply: "Sixty. You've got less than sixty. I can tell by how you're standing.", mood: "annoyed" };
      s.cents -= 6000; toFuse(ctx, p, s, "Got: Pump fuse (-$60.00)");
      return { reply: "Pleasure. Six hundred amps of pure Kingdom Works. Don't lick it.", mood: "happy" }; }
    if (t.includes("pays in fuses") && q === 2) { s.l70rats = kills(s, "deathrat70");
      setQuest(s, QID, { name: QNAME, step: `Kill ${RATS} white death rats in the Calor garage for Odell`, mark: M(ODELL) });
      return { reply: "The parking garage under Calor. Death rats. White ones. They ate my snow tires. Both sets. Kill five and the fuse is yours. I don't need proof, I believe you. I don't, but I'll check.", mood: "annoyed" }; }
    if (t.includes("rat-free") && q === 2) { toFuse(ctx, p, s, "Got: Pump fuse");
      return { reply: "Hear that? That's my tires not being eaten. Here. One fuse. We're square.", mood: "happy" }; }
    if (t.includes("sneak 45") && q === 2) {
      if (!roll("sneak", 45)) { s.l70pickFail = true; return { reply: "That's my fuse your hand is on. I'm going to pretend it fell. You're going to pretend to pay for it.", mood: "annoyed" }; }
      toFuse(ctx, p, s, "[Sneak 45] Succeeded · Got: Pump fuse");
      return { reply: "...and that's why you never trust a hubcap. Anyway, you buying or what?", mood: "neutral" }; }
    if (t.includes("froidling pelts")) { give(s, "froidpelt", -PELTS); s.l70pelt = 99; addRep(s, "froid", -5); pay(ctx, p, "peltOdell", PID, PNAME, "Sold the pelts to Odell");
      return { reply: "Ooh. Frost fur. That's mittens for a whole family. Rich family. Don't tell Ines, she thinks pelts are taxable.", mood: "happy" }; }
    if (t.includes("buy a b.n.t.g. ledger")) { give(s, "ledger70", -1); s.l70led = 99; pay(ctx, p, "ledgerSell", LID, LNAME, "Sold the ledger to Odell");
      return { reply: "B.N.T.G. paperwork. I can sell this back to the B.N.T.G. for twice what I'm paying you. I'm telling you that because I'm honest. Not generous. Honest.", mood: "happy" }; }
  }
  if (id === INES) {
    if (t.includes("need doing") && !s.l70pelt) { s.l70pelt = 1; s.l70froid0 = kills(s, "froidling"); setQuest(s, PID, { name: PNAME, step: `Kill ${FROIDS} froidlings in the woods and outskirts`, mark: M(INES) });
      tell(ctx, p, `Quest Started: ${PNAME}`); return { reply: "Froidlings. Little white buggers, come in packs, steal anything with a zipper. Thin them out. Six. Then bring me four pelts, the Crown taxes pelts. I don't make the rules. I enforce them. Grumpily.", mood: "neutral" }; }
    if (t.includes("six froidlings")) { s.l70pelt = 2; setQuest(s, PID, { name: PNAME, step: `Bring ${PELTS} froidling pelts to Ines, or sell them to Odell`, mark: M(INES) });
      return { reply: "Good. Now the pelts. Four. Odell will offer you more for them. Odell is a weasel in a parka.", mood: "happy" }; }
    if (t.includes("pelts for the guard")) { give(s, "froidpelt", -PELTS); s.l70pelt = 99; addRep(s, "froid", 15); pay(ctx, p, "pelt", PID, PNAME, "Paid the pelt tax to the River Guard");
      return { reply: "Tax paid, in full, with a smile. Well. With a face. Thank you. The Guard remembers.", mood: "happy" }; }
    if (t.includes("guard run the valves")) { h("ines"); return { reply: `City setting reads ${fmt(T.city)} on the gauge. City, Hotel, Spur. Spur at zero, that's the whole point. The schematic on the wall shows which wheel pushes which line. It's faded. So am I.`, mood: "neutral" }; }
    if (t.includes("ledger at froston")) { give(s, "ledger70", -1); s.l70led = 99; addRep(s, "froid", 20); addRep(s, "bntg", -15); pay(ctx, p, "ledger", LID, LNAME, "Gave the Froston ledger to the River Guard");
      return { reply: "Forty thousand litres. Out from under us. And we blamed the cold. Parliament's going to have a very loud afternoon. Thank you.", mood: "angry" }; }
  }
  if (id === VAEL) {
    if (t.includes("froze the main") || t.includes("carnifices want with the water")) { h("vael");
      return { reply: `Froze it? We blessed it. The Cold took what the town wasted. Send the water up the spur to Iceshed instead, ${fmt(T.spur)} on their little gauge, and my people drink. The town learns humility. Everybody grows.`, mood: "neutral" }; }
    if (t.includes("spur is running") && q === 6) { s.l70tVael = true; const r = s.l70route; if (r === "spur") addRep(s, "gelu", 10); doneMain(ctx, p);
      return { reply: r === "spur" ? "I felt it in the ice. Kneel, or don't, the Cold doesn't care. Take this. It bites back." : "Half. You gave us half. The Cold respects a coward's math. Barely.", mood: r === "spur" ? "happy" : "annoyed" }; }
    if (t.includes("really drained the city")) { give(s, "ledger70", -1); s.l70led = 99; addRep(s, "gelu", 20); addRep(s, "froid", -10); pay(ctx, p, "ledger", LID, LNAME, "Gave the Froston ledger to the Carnifices");
      return { reply: "So it wasn't us. Not only us. Wonderful. Our sermons just got so much longer.", mood: "happy" }; }
  }
  return null;
}
// ---- the layer: the cellar tape, Froston's footlocker, the gauge face and the schematic; valves and breaker get the press script
export function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  const bench = TOWN.CELLAR_BENCH ?? { x: SPOT.house.x, y: 0.92, z: SPOT.house.z };
  sp(NOTE, { tags: ["usable", "l70-quest"], feetPosition: { x: bench.x, y: bench.y, z: bench.z }, rotation: { yaw: 25 }, layout: { box: { min: { x: -0.06, y: 0, z: -0.04 }, max: { x: 0.06, y: 0.03, z: 0.04 } } }, model: CASSETTE, behavior: "scripts/l70-press.js", state: { name: "Cassette on the workbench" }, physics: { body: "static", collider: "box" } });
  sp(LOCKER, { tags: ["usable", "l70-quest"], feetPosition: { x: SPOT.rig.x - 4.5, z: SPOT.rig.z + 3, y: { terrain: 0 } }, rotation: { yaw: 70 }, layout: { box: { min: { x: -0.45, y: 0, z: -0.25 }, max: { x: 0.45, y: 0.45, z: 0.25 } } }, model: LOCKERGLB, behavior: "scripts/l70-press.js", state: { name: "B.N.T.G. footlocker" }, physics: { body: "static", collider: "box" } });
  sp(POSTER, { tags: ["l70-quest"], feetPosition: { x: SPOT.valves.x - 2.6, y: 1.05, z: -24.86 }, vector: schematic() });
  sp(FACE, { tags: ["l70-quest"], feetPosition: { x: 47, y: 1.45, z: -24.8 }, state: {}, vector: gaugeSvg(pressures([0, 0, 0, 0]), false, null) });
  wire(ctx);
}
function wire(ctx) { // the other lane's valves and breaker: give them our press script once they stand
  for (const id of ["l70-valve-0", "l70-valve-1", "l70-valve-2", "l70-valve-3", "l70-breaker"]) {
    const o = ctx.place.objects[id]; if (!o) continue; const b = [].concat(o.behavior ?? []);
    if (!b.includes("scripts/l70-press.js")) o.behavior = [...b, "scripts/l70-press.js"];
    if (!(o.tags ?? []).includes("usable")) o.tags = [...(o.tags ?? []), "usable"];
  }
}
function schematic() {
  const C = VALVES.couple, N = VALVES.names;
  const rows = C.map((c, i) => { const y = 48 + i * 26; const cell = (v, k) => `<text x='${128 + k * 48}' y='${y}' font-family='serif' font-size='13' fill='#4a3c28' opacity='${0.45 + ((i + k) % 3) * 0.15}'>${v > 0 ? "+" + v : v < 0 ? "-" + -v : "0"}</text>`;
    return `<text x='14' y='${y}' font-family='serif' font-size='10' fill='#5a4a32'>${i + 1}. ${N[i]}</text>${c.map(cell).join("")}`; }).join("");
  return `<svg viewBox='0 0 280 180' width='1.1m'><rect x='2' y='2' width='276' height='176' fill='#cfc3a3' stroke='#7a6a48' stroke-width='3'/><rect x='8' y='8' width='264' height='164' fill='none' stroke='#a8987a' stroke-dasharray='4 3'/><text x='14' y='22' font-family='serif' font-size='10.5' fill='#3e321f'>KINGDOM WORKS · ALMOND WATER · PUMP HOUSE 3</text><text x='122' y='34' font-family='sans-serif' font-size='8' fill='#5a4a32'>CITY   HOTEL   SPUR  (bar per quarter turn)</text>${rows}<text x='14' y='160' font-family='serif' font-size='7.5' fill='#5a4a32' opacity='.75'>All lines 3 bar at rest. Wheels 0 to 3 quarter turns. Over 15 bar vents.</text><text x='14' y='170' font-family='serif' font-size='7.5' fill='#7a3a2a' opacity='.6'>Do NOT feed the spur. (pencil underneath: "why not")</text></svg>`;
}
// ---- once a second: gauge, wiring, cold, quest watchers
const CH = new Map();
export function tick(ctx) {
  wire(ctx); paintGauge(ctx);
  const pd = ctx.place.state.l70pend;
  if (pd && ctx.now() - pd.at > 3000) { ctx.place.state.l70pend = null; const pp = ctx.place.players.find((x) => x.id === pd.by) ?? ctx.place.players[0]; if (pp?.state && !!ctx.place.objects["l70-breaker"]?.state?.on && matchOf(pressures(turnsOf(ctx))) === pd.route) resolve(ctx, pp, pd.route); }
  const fires = ctx.query({ tags: ["l70-fire"], radius: 5000, center: { x: 0, y: 0, z: 0 } }).map((f) => f.feetPosition);
  for (const p of ctx.place.players) {
    const s = p.state, at = p.feetPosition; if (!s || !at) continue;
    if (s.l70rats != null && s.l70q === 2 && kills(s, "deathrat70") - s.l70rats >= RATS && !s.l70ratsTold) { s.l70ratsTold = true; setQuest(s, QID, { name: QNAME, step: "The rats are dead. Tell Odell", mark: M(ODELL) }); }
    if (s.l70pelt === 1 && !s.l70froidTold) { const n = Math.min(FROIDS, kills(s, "froidling") - (s.l70froid0 ?? 0)); if (n !== s.l70froidN && n < FROIDS) { s.l70froidN = n; setQuest(s, PID, { name: PNAME, step: `Kill ${FROIDS} froidlings in the woods and outskirts (${n}/${FROIDS})`, mark: M(INES) }); } }
    if (s.l70rats != null && s.l70q === 2 && !s.l70ratsTold) { const n = Math.min(RATS, kills(s, "deathrat70") - s.l70rats); if (n !== s.l70ratN && n < RATS) { s.l70ratN = n; setQuest(s, QID, { name: QNAME, step: `Kill the death rats (${n}/${RATS})`, mark: M(ODELL) }); } }
    if (s.l70pelt === 1 && kills(s, "froidling") - (s.l70froid0 ?? 0) >= FROIDS && !s.l70froidTold) { s.l70froidTold = true; setQuest(s, PID, { name: PNAME, step: "Six down. Tell Sergeant Ines", mark: M(INES) }); }
    const nearFire = fires.some((f) => Math.hypot(f.x - at.x, f.z - at.z) < COLD.fireR);
    let d = nearFire ? COLD.fire : indoors(at) ? COLD.indoor : COLD.rise + COLD.wildRise * wild(at);
    if (d > 0 && bag(s, "toque70")) d *= COLD.toque;
    const cap = bag(s, "gelucharm70") ? COLD.charmCap : 100, prev = s.chill ?? 0;
    let acc = CH.get(p.id); if (acc == null || Math.abs(acc - prev) > 1.5) acc = prev; // someone else wrote chill (food, steam): take theirs
    acc = Math.max(0, Math.min(cap, acc + d)); CH.set(p.id, acc);
    if (Math.round(acc) !== prev) s.chill = Math.round(acc); // a whole-number write, a few times a minute
  }
}
function wild(at) { try { return Math.max(0, Math.min(1, wildness(at.x, at.z) ?? 0)); } catch { return 0; } }
function indoors(at) {
  const L = SPOT.lobby, G = SPOT.garage, H = SPOT.house;
  if (Math.abs(at.x - L.x) < 9 && Math.abs(at.z - L.z) < 9) return true;
  if (Math.abs(at.x - G.x) < 15 && Math.abs(at.z - G.z) < 10) return true;
  if (Math.abs(at.x - H.x) < 6 && Math.abs(at.z - H.z) < 6) return true;
  return at.y < -1;
}
