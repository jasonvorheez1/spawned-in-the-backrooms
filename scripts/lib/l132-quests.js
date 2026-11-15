// Level 132 · two quests (Lumiria). 1 The Missing Piece (on arrival): Gus wants a record, Silas a hat, Rosalind an apple;
// walk the chain by pressing wares (l132-barter.js) and talking. Alternates: break a ware near a keeper and make it right, or
// talk Rosalind out of a hat (speech, retryable). 2 Signal Strength: Odalys -> Wendell -> Dex's antenna, carried (Z, grab.js)
// to the tree's knot, router switched on, back to Odalys. Lines live in dlg-level132.yml under <npc>.quest so act.py voices them.
// This file is also the knot's and the router's press behavior (ears.press).
import Q from "./data/l132-quests.yml";
import DLG from "./data/dlg-level132.yml";
import { advanceQuest, finishLevelQuest } from "./quests.js";
import { bookOf, holds, keep } from "./l132-barter.js";
import { rollCheck } from "./npc-talk.js";
const ME = "scripts/lib/l132-quests.js";
const line = (who, k) => DLG[who]?.quest?.[k] ?? "";
const MK = (k) => ({ place: "level132", id: `l132-q-${k}`, x: Q.marks[k].x, y: 0, z: Q.marks[k].z, label: Q.marks[k].label });
const QM = { key: Q.missing.key, id: Q.missing.id, name: "The Missing Piece",
  tips: { 1: "Ask Gus at Fruta Fresca how trading works", 2: "Get an apple from Fruta Fresca. Trade anything you carry", 3: "Trade the apple at Rosalind's hat stall", 4: "Trade the hat at Tune Town for a record", 5: "Bring the record to Gus" },
  marks: { 1: "gus", 2: "gus", 3: "rosalind", 4: "silas", 5: "gus" } };
const QS = { key: Q.signal.key, id: Q.signal.id, name: "Signal Strength",
  tips: { 1: "Ask Wendell at the RadioShed about the square's Wi-Fi", 2: "Get the antenna from Dex at Bit Barn", 3: "Carry the antenna (Z) up to the knot on the hollow tree and seat it", 4: "Switch the router on in the RadioShed", 5: "Tell Odalys to try her upload" },
  marks: { 1: "wendell", 2: "dex", 3: "knot", 4: "router", 5: "odalys" } };
const step = (ctx, p, q, n) => advanceQuest(ctx, p, { ...q, mark: MK(q.marks[n]) }, n, `${q.name} · ${q.tips[n]}`);
const put = (p, cat, n) => { const b = bookOf(p.state); p.state.l132 = { ...b, gift: true, bag: { ...b.bag, [cat]: Math.max(0, (b.bag?.[cat] ?? 0) + n) } }; };
const near = (a, x, z, r) => a && Math.hypot(a.x - x, a.z - z) < r;

export function lay(ctx) {
  if ((ctx.place.state.questsV ?? 0) >= Q.v) return;
  const k = Q.knot;
  if (!ctx.place.objects[k.id]) ctx.spawn(k.id, { feetPosition: { x: k.at[0], y: k.at[1] - k.size[1] / 2, z: k.at[2] }, primitive: { kind: "box", width: k.size[0], height: k.size[1], depth: k.size[2] }, visible: false, physics: { body: "static", trigger: true }, tags: ["usable", "l132"], behavior: ME, state: { name: "Knot in the trunk", verb: "Look", kind: "knot" } });
  ctx.place.state.questsV = Q.v;
}

const seen = new Set();
export function tick(ctx) {
  const ps = ctx.place.players, st = ctx.place.state;
  const r = ctx.place.objects["l132-router"];
  if (r) { const b = [].concat(r.behavior ?? []); if (!b.includes(ME)) r.behavior = [...b, ME]; }
  // a ware breaks: the nearest player in a quest owes its keeper
  for (const id of st.wrecks ?? []) {
    if (seen.has(id)) continue; seen.add(id);
    const m = /^l132-ware-\w+-(\d)-/.exec(id), w = m && ctx.getObject(id); if (!m || !w) continue;
    let who = null, best = Q.oweRange;
    for (const p of ps) { const d = Math.hypot(p.feetPosition.x - w.feetPosition.x, p.feetPosition.z - w.feetPosition.z); if (d < best) { best = d; who = p; } }
    if (who && [3, 6, 7].includes(+m[1]) && (who.state.l132m ?? 0) < 99) { who.state.l132owe = +m[1]; who.state.notice = { text: "Oops. The keeper saw that. Go and make it right.", at: ctx.now() }; }
  }
  for (const p of ps) {
    const s = p.state; if (!s) continue;
    if (!s.l132m) step(ctx, p, QM, 1);
    else if (s.l132m < 99) {
      if (s.l132m <= 2 && holds(s, "fruit")) step(ctx, p, QM, 3);
      if (s.l132m <= 3 && holds(s, "hats")) step(ctx, p, QM, 4);
      if (s.l132m <= 4 && holds(s, "records")) step(ctx, p, QM, 5);
    }
  }
}

// knot and router presses
export const ears = {
  press: (ctx, m) => {
    const p = m?.by && ctx.getObject(m.by), s = p?.state; if (!s) return;
    const me = ctx.self, kind = me.state?.kind, say = (t) => { s.notice = { text: t, at: ctx.now() }; };
    if (kind === "knot") {
      if (ctx.place.objects["l132-q-antenna-seated"]) return say("The little dish sits snug in the knot, listening to the whole square.");
      const a = ctx.getObject(Q.antenna.id), held = s.carryId === Q.antenna.id, close = a && near(a.feetPosition, Q.knot.at[0], Q.knot.at[2], 3);
      if (s.l132s !== 3 || !a || (!held && !close)) return say("A deep knot on the trunk's north side, about head height. Something could sit in there.");
      ctx.destroy(Q.antenna.id);
      ctx.spawn("l132-q-antenna-seated", { feetPosition: { x: Q.knot.at[0], y: Q.knot.at[1] - 0.3, z: Q.knot.at[2] }, rotation: { yaw: 200, pitch: -15 }, model: Q.antenna.model, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: Q.antenna.h, z: 0.3 } } }, physics: "none", tags: ["l132"] });
      ctx.emit("playSound", { clip: "cdn/sfx-metal-bracket-clicks-into-wooden-knot-snug.mp3", position: me.worldFeetPosition, volume: 0.6 });
      step(ctx, p, QS, 4); return;
    }
    if (kind === "router" && s.l132s === 4 && ctx.place.objects["l132-q-antenna-seated"]) {
      me.state = { ...me.state, on: true };
      step(ctx, p, QS, 5);
    }
  },
};

// talk card choices (npc-starters.js) and answers (talk.js)
export function l132Choices(id, s) {
  const out = [], T = (text, tag, check) => out.push(check ? { text, tag, check } : { text, tag });
  const m = s?.l132m ?? 0, g = s?.l132s ?? 0, owe = s?.l132owe;
  if (id === "l132-gus") {
    if (m > 0 && m < 2) T("How does trading work around here?", "Quest");
    if (m === 2 && !holds(s, "fruit")) (s?.almonds ?? 0) > 0 ? T("Trade you an Almond Water for an apple.", "Barter") : T("I don't have anything to trade.", "Quest");
    if (owe === 7) T("Sorry about the crate. How do I make it right?", "Quest");
    if (m > 0 && m < 99 && holds(s, "records")) T("Here's a record for your shelf.", "Quest Turn-In");
    if (m === 99) T("How's the shelf looking?", "Talk");
  } else if (id === "l132-rosalind") {
    if (m >= 2 && m < 4 && !holds(s, "hats")) T("Give me a hat and I'll wear it all over town. Best advert you'll get.", "Speech " + Q.speech, { skill: "speech", difficulty: Q.speech });
    if (owe === 6) T("Sorry about the hatbox. How do I make it right?", "Quest");
  } else if (id === "l132-silas") {
    if (owe === 3) T("Sorry about the record. How do I make it right?", "Quest");
  } else if (id === "l132-odalys") {
    if (!g) T("Something wrong with the laptop?", "Quest Start");
    if (g === 5) T("Try your upload now.", "Quest Turn-In");
    if (g === 99) T("How's the report doing?", "Talk");
  } else if (id === "l132-wendell") {
    if (g === 1) T("The square's Wi-Fi keeps dropping. Can it be fixed?", "Quest");
    if (g === 99) T("How's the router?", "Talk");
  } else if (id === "l132-dex") {
    if (g === 2) T("Wendell says you've got an antenna.", "Quest");
  } else if (id === "l132-duke") {
    if (s?.l132?.dukeCurious) T("You like the dish in the tree?", "Talk");
  }
  return out;
}

export function handleDialogueQuest132(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state; if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(); if (!id.startsWith("l132-")) return null;
  const R = (k, mood = "happy") => ({ reply: line(id, k), mood });
  const m = s.l132m ?? 0, g = s.l132s ?? 0;
  if (id === "l132-gus") {
    if (t.includes("how does trading work") && m < 2) { step(ctx, p, QM, 2); return R("intro"); }
    if (t.includes("almond water for an apple") && (s.almonds ?? 0) > 0) { s.almonds -= 1; put(p, "fruit", 1); step(ctx, p, QM, 3); return R("apple"); }
    if (t.includes("anything to trade")) { put(p, "fruit", 1); step(ctx, p, QM, 3); return R("applefree"); }
    if (t.includes("sorry about the crate") && s.l132owe === 7) { s.l132owe = null; put(p, "fruit", 1); step(ctx, p, QM, 3); return R("owe", "calm"); }
    if (t.includes("record for your shelf") && holds(s, "records") && m < 99) {
      put(p, "records", -1); put(p, "fruit", 1); keep(ctx, p, "fruit");
      const r = Q.record;
      if (!ctx.place.objects[r.id]) ctx.spawn(r.id, { feetPosition: { x: r.at[0], y: r.at[1], z: r.at[2] }, rotation: { lookAt: { x: 0, y: 1, z: 0 } }, model: r.model, layout: { box: { min: { x: -0.15, y: 0, z: -0.15 }, max: { x: 0.15, y: r.h, z: 0.15 } } }, physics: "static", tags: ["l132"] });
      ctx.emit("playSound", { clip: "cdn/sfx-vinyl-record-sleeve-set-on-wooden-shelf.mp3", position: { x: r.at[0], y: r.at[1], z: r.at[2] }, volume: 0.6 });
      finishLevelQuest(ctx, p, QM.key, QM, { xp: Q.missing.xp, cents: 0, items: [], rep: [["lumiria", Q.missing.rep]], by: "lumiria", text: `Quest Completed: The Missing Piece · +${Q.missing.xp} XP, your first collection piece` });
      return R("done");
    }
    if (t.includes("shelf looking")) return R("after");
  }
  if (id === "l132-rosalind") {
    if (t.includes("best advert") && m >= 2 && m < 4) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: Q.speech }); ctx._lastCheck = c;
      if (c?.ok) { put(p, "hats", 1); step(ctx, p, QM, 4); return R("vouchok"); }
      return R("vouchfail", "calm");
    }
    if (t.includes("sorry about the hatbox") && s.l132owe === 6) { s.l132owe = null; put(p, "hats", 1); step(ctx, p, QM, 4); return R("owe", "calm"); }
  }
  if (id === "l132-silas" && t.includes("sorry about the record") && s.l132owe === 3) { s.l132owe = null; put(p, "records", 1); step(ctx, p, QM, 5); return R("owe", "calm"); }
  if (id === "l132-odalys") {
    if (t.includes("wrong with the laptop") && !g) { step(ctx, p, QS, 1); return R("start", "calm"); }
    if (t.includes("try your upload") && g === 5) {
      const lap = ctx.getObject("l132-odalys-laptop");
      if (lap) { lap.state = { ...lap.state, sent: true }; lap.ui = `<div face="front" emissive width="0.32m" class="p-2 bg-black text-green-400 text-center font-bold" style="font-size:34px">UPLOAD COMPLETE<br/><span style="font-size:24px">report sent ✓</span></div>`; }
      const d = ctx.getObject("l132-duke"), o = p.feetPosition;
      if (d && near(d.feetPosition, o.x, o.z, Q.dukeRange)) {
        s.l132 = { ...bookOf(s), dukeCurious: true };
        d.state = { ...d.state, admire: { x: Q.knot.at[0] + 1.5, z: Q.knot.at[2] - 3, at: ctx.now() } };
        ctx.emit("damageNumber", { position: { x: d.feetPosition.x, y: d.feetPosition.y + 2.8, z: d.feetPosition.z }, text: "Ooh, what's that in my tree?", color: "#e8c766" });
      }
      s.keyItems = [...new Set([...(s.keyItems ?? []), Q.signal.pass])];
      s.l132friend = true;
      finishLevelQuest(ctx, p, QS.key, QS, { xp: Q.signal.xp, cents: 0, items: [], rep: [["lumiria", Q.signal.rep]], by: "lumiria", text: `Quest Completed: Signal Strength · +${Q.signal.xp} XP, Lumiria day pass` });
      return R("report");
    }
    if (t.includes("report doing")) return R("after");
  }
  if (id === "l132-wendell") {
    if (t.includes("wi-fi keeps dropping") && g === 1) { step(ctx, p, QS, 2); return R("start", "calm"); }
    if (t.includes("how's the router")) return R("after");
  }
  if (id === "l132-dex" && t.includes("got an antenna") && g === 2) {
    const a = Q.antenna;
    if (!ctx.place.objects[a.id]) ctx.spawn(a.id, { feetPosition: { x: a.at[0], y: 0, z: a.at[2] }, rotation: { yaw: 120 }, model: a.model, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: a.h, z: 0.3 } } }, physics: { body: "dynamic", collider: "box", mass: 4 }, tags: ["breakable", "l132", "l132-antenna"], state: { name: "Antenna dish", mat: "metal", hp: 400, maxHp: 400 } });
    step(ctx, p, QS, 3); return R("antenna");
  }
  if (id === "l132-duke" && t.includes("dish in the tree") && s.l132?.dukeCurious) return R("curious");
  return null;
}
