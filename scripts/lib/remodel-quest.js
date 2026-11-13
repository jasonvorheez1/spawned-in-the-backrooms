// "Fresh Paint": Mara (B.N.T.G. Realty, Level 11) wants the Remodeling Co.'s Reality Fresheners out of Level 0.2.
// Stages: 1 find the half-built door in Level 0 · 2 recover three fresheners (bathroom sink, the shifting rooms, Cap'n for three paint cans)
// · 3 sell them to Mara or give them back to Cap'n. player.state: remodQ (step, 99 done), l02got { sink, lift, capn },
// fresh (fresheners carried), capnAsk, capnFailed. A carried freshener is set down from the inventory (placeFreshener).
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep, addKarma } from "./rep.js";
import { rollCheck } from "./npc-talk.js";
import { setQuest, endQuest, qid, tellQuest } from "./quests.js";
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const HISS = "cdn/sfx-aerosol-can-short-hiss-click-plastic-cap.mp3";
export const QUESTS02 = {
  remodel: {
    key: "remodQ", name: "Fresh Paint",
    tips: {
      1: "Find the half-built door in Level 0, out from the safe room",
      2: "Collect 3 Reality Fresheners in Level 0.2: the bathroom, the shifting rooms, and Cap'n",
      3: "Sell the fresheners to Mara in Level 11, or give them back to Cap'n",
    },
    marks: { 1: { place: "main", id: "l0-to-l02" }, 3: { place: "level11", id: "l11-realty-agent" } },
    progress(s, place, room) {
      const step = s.remodQ;
      if (step === 2) {
        const missing = LOCATIONS.find(([slot]) => !s.l02got?.[slot]);
        if (missing) {
          const cans = s.l02paint?.length ?? 0, paint = missing[0] === "capn" && s.capnFailed && cans < 3;
          return { step: `Recover the Reality Fresheners (${gotCount(s)}/3) · ${paint ? `Get the paint cans out of the shifting rooms (${cans}/3)` : missing[2]}`,
            mark: { place: "level02", id: paint ? ["l02-paint0", "l02-paint1", "l02-paint2"].find((id) => !s.l02paint?.includes(id)) : missing[1] } };
        }
      }
      if (step === 3 && place === "level02") return { step: this.tips[step], mark: { place, id: "l02-capn" } };
      return { step: this.tips[step], mark: this.marks[step] ?? null };
    },
  },
};
const LOCATIONS = [
  ["sink", "l02-fresh-sink", "Check the bathroom sink"],
  ["lift", "l02-fresh-grid", "Take the freshener from the middle of the shifting rooms"],
  ["capn", "l02-capn", "Speak to Cap'n by the basement stairs"],
];
const posOf = (p) => p.worldFeetPosition ?? p.feetPosition;
const tell = tellQuest; // scripts/lib/quests.js, shared
function syncHUD(s, place, room, done) {
  const q = QUESTS02.remodel, progress = q.progress(s, place, room), id = qid(q.name);
  if (progress.step) { s.quest = { name: q.name, ...progress, at: Date.now() }; setQuest(s, id, { name: q.name, ...progress }); }
  else { if (s.quest?.name === q.name) s.quest = null; endQuest(s, id, done); }
}
export function setRemodStep(ctx, p, step, text) { p.state.remodQ = step; syncHUD(p.state, p.place, ctx.place.state); tell(ctx, p, text); }
const gotCount = (s) => LOCATIONS.filter(([slot]) => s.l02got?.[slot]).length;
export function gotFresh(ctx, p, slot) {
  const s = p.state, g = { ...(s.l02got ?? {}) };
  if (!LOCATIONS.some(([key]) => key === slot)) return;
  if (g[slot]) { s.notice = { text: "You already took the freshener from here.", at: ctx.now() }; return; }
  g[slot] = true; s.l02got = g; s.fresh = (s.fresh ?? 0) + 1;
  const n = gotCount(s);
  tell(ctx, p, s.remodQ >= 1 && s.remodQ < 99 ? `Reality Freshener (${n}/3) · set one down from the inventory to hold a room still` : "Reality Freshener · set it down from the inventory to hold a room still", HISS);
  if (n >= 3 && (s.remodQ === 2 || s.remodQ === 1)) setRemodStep(ctx, p, 3, "Fresh Paint · Bring the fresheners to Mara in Level 11, or back to Cap'n");
  else if (s.remodQ === 2) syncHUD(s, p.place, ctx.place.state);
}
function finish(ctx, p, { xp, cents, rep, text }) {
  const s = p.state; s.remodQ = 99; syncHUD(s, p.place, ctx.place.state, text); s.cents = (s.cents ?? 0) + cents;
  const msgs = [];
  for (const [g, d] of rep) { const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d); msgs.push(tier || `${g === "karma" ? "Karma" : g === "bntg" ? "B.N.T.G." : g} +${d}`); }
  const summary = [text, ...msgs].join(" · ");
  s.payout = { xp, items: [], text: summary }; s.notice = { text: summary, at: ctx.now() }; pushFeed(s, summary, ctx.now(), "good");
  const pos = posOf(p);
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: "QUEST COMPLETED: FRESH PAINT", color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
}
// the talk card's quest lines (scripts/lib/npc-starters.js questChoices)
export function remodelChoices(id, s) {
  const q = s?.remodQ ?? 0, g = s?.l02got ?? {}, out = [];
  if (id === "l11-realty-agent") {
    if (!q) out.push({ text: "Got any work for me?", tag: "Quest Start" });
    if (q === 3) out.push({ text: "I've got your three fresheners.", tag: "Quest Turn-In" });
  } else if (id === "l02-capn") {
    const cans = s?.l02paint?.length ?? 0;
    if (!q && !s?.capnJob && !g.capn) out.push({ text: "What happened down here?" });
    if (!g.capn && (q < 1 || q >= 99) && cans >= 3) out.push({ text: "I got your paint cans out of the shifting rooms.", tag: "Job" });
    if (!g.capn && q >= 1 && q < 99) {
      if (!s.capnAsk) out.push({ text: "Mara sent me for the Reality Fresheners.", tag: "Quest" });
      else if (!s.capnFailed) out.push({ text: "Come on. Spare the one on your belt.", tag: "Speech 40" });
      if ((s.l02paint?.length ?? 0) >= 3) out.push({ text: "I got your paint cans out of the shifting rooms.", tag: "Quest" });
    }
    if (q === 3) out.push({ text: "Take them back. Do the job right this time.", tag: "Quest Turn-In" });
  }
  return out;
}
export function handleDialogueQuest02(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(), q = s.remodQ ?? 0;
  if (id === "l11-realty-agent") {
    if (t.includes("any work for me") && !q) {
      setRemodStep(ctx, p, 1, "Quest Started: Fresh Paint · Find the half-built door in Level 0");
      return { reply: "Funny you ask. A crew in grey coats and berets tried to redo a corner of Level 0. It went badly. They carry little canisters that hold a room still. Bring me three and I can sell a place where nothing ever moves. Three hundred.", mood: "happy" };
    }
    if (t.includes("three fresheners") && q === 3) {
      if ((s.fresh ?? 0) < 3) return { reply: `I count ${s.fresh ?? 0}. The deal was three.`, mood: "annoyed" };
      s.fresh -= 3;
      finish(ctx, p, { xp: 220, cents: 30000, rep: [["bntg", 15]], text: "Quest Completed: Fresh Paint · Sold to Mara (+220 XP, +$300.00)" });
      return { reply: "Oh, they're cold. Lovely. One in every listing and the walls stay where I left them. Three hundred, as promised.", mood: "happy" };
    }
    return null;
  }
  if (id === "l02-capn") {
    const g = { ...(s.l02got ?? {}) };
    const give = (reply) => { gotFresh(ctx, p, "capn"); return { reply, mood: "happy" }; };
    if (t.includes("what happened down here")) { s.capnJob = 1; return { reply: "Remodeling. It is going great. Mostly. The rooms back there keep rearranging themselves when nobody looks, and my crew left three cans of the good paint somewhere inside. Keep a work lamp on a wall and it stays put. Bring the paint out and I will make it worth your while.", mood: "calm" }; }
    if (t.includes("mara sent me")) { s.capnAsk = 1; return { reply: "Company property. Each one is signed out to me personally. Major Took counts them every week.", mood: "calm" }; }
    if (t.includes("spare the one on your belt") && !g.capn) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 40 });
      if (c.ok) return give("You know what, you have an honest face. I assume. Take it. If Major Took asks, it fell through the floor.");
      s.capnFailed = 1;
      return { reply: "I cannot. But the crew left three cans of Fresh Paint in the back rooms, and the rooms keep moving. Bring them out and I will owe you one.", mood: "calm" };
    }
    if (t.includes("paint cans out") && (s.l02paint?.length ?? 0) >= 3 && !g.capn) return give("You got all three out? The rooms let you? Here. You earned it more than we did.");
    if (t.includes("take them back") && q === 3) {
      if ((s.fresh ?? 0) < 3) return { reply: "That is not all of them. I can count to three. Penelope taught me.", mood: "annoyed" };
      s.fresh -= 2;
      finish(ctx, p, { xp: 220, cents: 5000, rep: [["karma", 5]], text: "Quest Completed: Fresh Paint · Returned to Cap'n, kept one freshener (+220 XP, +$50.00)" });
      return { reply: "You brought them back? Nobody brings anything back. Keep one. Put it somewhere you like. And take this, it's from the petty cash.", mood: "happy" };
    }
  }
  return null;
}
// a carried freshener, set down from the inventory: a little bubble where sanity holds and Level 0.2 stops falling
export function placeFreshener(ctx) {
  const s = ctx.self.state; if (!(s.fresh > 0)) return;
  const f = ctx.self.feetPosition, yaw = ((ctx.self.camera?.rotation?.yaw ?? 0) * Math.PI) / 180;
  s.fresh -= 1;
  freshenerAt(ctx, { x: f.x - Math.sin(yaw) * 0.7, y: f.y + 0.02, z: f.z - Math.cos(yaw) * 0.7 });
  tell(ctx, ctx.self, "Reality Freshener set down · the room holds still around it", HISS);
}
const BUBBLE = `fx
pop ring burst=1 life=1.1 size=1 col=<.6,.9,1> a=.8>0 sz=$size*(.2>12) r=sprite(soft-disc,add)
pop motes n=18 on=sphere(5.5) life=2..4 v=sdir()*.05 size=.03..0.06 col=<.7,.95,1> a=0>.6:.5>0 sz=$size r=sprite(soft-disc,add)`;
export function freshenerAt(ctx, at) {
  ctx.spawn({ tags: ["usable", "freshener"], feetPosition: at, ...FRESH_BODY, fx: { script: BUBBLE }, behavior: "scripts/l02-use.js",
    state: { kind: "placed", name: "Reality Freshener", verb: "Pick up", info: "Reality holds still for 6 m. No sanity drain, nothing falls." },
    children: [...FRESH_BODY.children, { feetPosition: { x: 0, y: 0.01, z: 0 }, rotation: { pitch: -90 }, primitive: { kind: "ring", innerRadius: 5.85, outerRadius: 6, thetaSegments: 64 }, material: { color: "oklch(0.85 0.1 210 / 0.35)", transparent: true, emissive: "oklch(0.8 0.12 210)", emissiveIntensity: 0.8, side: "double" } }] });
  ctx.emit("playSound", { clip: HISS, position: at, volume: 0.8, maxDistance: 20 });
}
export const FRESH_BODY = {
  primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 0.2, radialSegments: 20 }, material: { color: "oklch(0.95 0.01 230)", roughness: 0.35, metalness: 0.1 },
  children: [
    { feetPosition: { x: 0, y: 0.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.04, height: 0.04, radialSegments: 16 }, material: { color: "oklch(0.75 0.13 200)", emissive: "oklch(0.75 0.13 200)", emissiveIntensity: 1.6 } },
    { feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.052, radiusBottom: 0.052, height: 0.03, radialSegments: 20 }, material: { color: "oklch(0.55 0.15 25)" } },
    { feetPosition: { x: 0, y: 0.3, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.1 200)", intensity: 0.5, distance: 3 } },
  ],
};
// a Fresh Paint can from the shifting rooms (places/level02 grid): three bring Cap'n round
export function gotPaint(ctx, p, id) {
  const s = p.state, have = [...(s.l02paint ?? [])];
  if (!have.includes(id)) have.push(id);
  s.l02paint = have; ctx.destroy(id);
  const asked = s.capnJob || s.capnFailed || (s.remodQ >= 1 && s.remodQ < 99);
  if (have.length >= 3) tell(ctx, p, asked ? "Fresh Paint (3/3) · Bring them to Cap'n by the basement stairs" : "Fresh Paint (3/3) · Someone down here will want these");
  else tell(ctx, p, asked ? `Fresh Paint (${have.length}/3)` : "A can of Fresh Paint · Remodeling Co. stencil on the lid");
  if (s.remodQ === 2) syncHUD(s, p.place, ctx.place.state);
}
export function pickPlaced(ctx, p, id) { p.state.fresh = (p.state.fresh ?? 0) + 1; ctx.destroy(id); tell(ctx, p, `Reality Freshener picked up (${p.state.fresh} carried)`, HISS); }
// the sanity bubble: any set-down freshener within 6 m (scripts/player.js), read once a second
export function nearFresh(ctx) {
  const ses = ctx.self.session, now = ctx.now();
  if (now - (ses.freshAt ?? -1e9) > 1000) { ses.freshAt = now; ses.freshNear = ctx.query({ tags: ["freshener"], radius: 6 }).length > 0; }
  return ses.freshNear;
}
