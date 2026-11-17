// Level 21 "Numbered Doors" (place doors21): the Concierge at the desk and his three quests. Wikidot: "If anybody is found
// at this Level they are not to be trusted" / the EXIT door "is to be reported to the M.E.G.".
// The sim owns player.state.l21d = { doors, kinds, dark, warden, clicker }; this file reads it and owns:
//   l21dqa "Sign the Ledger"   1 open five doors, 2 tell him, 99
//   l21dqb "Room Service"      1 carry the tray to the nest door, 2 tell him, 99
//   l21dqc "The Rumoured Door" 1 find the EXIT door, 2 go through, 3 a warden squad or a lantern, 4 report (Okafor or him), 99
//   l21dq = { base, signed: "name"|"alias", strikes, spilled, lifted, tray: "fed"|"keys"|"hush", wbase, door: "meg"|"desk" }
// Every line anyone says: scripts/lib/data/dlg-doors21.yml.
import { advanceQuest, finishLevelQuest, tellQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { keepPeople } from "./level-kit.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { C, SEG, SEGS, EXIT, DW, door } from "./l21d-layout.js";
import DLG from "./data/dlg-doors21.yml";

export const CONCIERGE = "l21d-concierge", OKAFOR = "hub-meg-okafor";
const P = "doors21", DESK = { x: 0, z: -1.2, yaw: 180 }; // behind the desk, facing +Z
const T = DLG[CONCIERGE].quest, TO = DLG["l21d-okafor"].quest;
const EXIT_DOOR = door(EXIT.h, EXIT.k);
// the tray's door: the first numbered nest door past bay 14 of the South hall
export const TRAY_DOOR = (() => { for (let k = 14; k < SEGS; k++) { const d = door(1, k); if (d.kind === "nest" && d.label) return d; } for (let k = 3; k < SEGS; k++) { const d = door(1, k); if (d.kind === "nest") return d; } return door(1, 14); })();
const DOOR_NAME = TRAY_DOOR.label ? "Door " + TRAY_DOOR.label : "the unmarked door";

export const QA = { key: "l21dqa", name: "Sign the Ledger",
  tips: { 1: "Open five numbered doors in the halls of Level 21 and see what is behind each. Walk: the Clickers hear running.", 2: "Return to the Concierge at the desk in the square and tell him what was behind the doors." },
  marks: { 1: { place: P, id: door(3, 1).id }, 2: { place: P, id: CONCIERGE } } };
export const QB = { key: "l21dqb", name: "Room Service",
  tips: { 1: `Carry the covered tray to ${DOOR_NAME}, deep in the South hall, and open the door. Do not run with it.`, 2: "Return to the Concierge at the desk." },
  marks: { 1: { place: P, id: TRAY_DOOR.id }, 2: { place: P, id: CONCIERGE } } };
export const QC = { key: "l21dqc", name: "The Rumoured Door",
  tips: { 1: "Find the EXIT door. They say East hall, thirty doors down.", 2: "Go through the EXIT door.", 3: "In the dark wing, put down a squad of three Hall Wardens, or take a warden's lantern.", 4: "Report the door to Okafor at the M.E.G. post in the Hub, or tell the Concierge and keep it between you." },
  marks: { 1: { place: P, id: EXIT_DOOR.id }, 2: { place: P, id: EXIT_DOOR.id }, 3: { place: P, id: EXIT_DOOR.id }, 4: { place: "thehub", id: OKAFOR } } };

// Pay curve (Savi's pick, Nov 17): xp = 60 x tier x (1 + danger), Backdollars = 50c per xp. Level 21 danger 1.5.
const DANGER = 1.5, xpOf = (tier) => Math.round(60 * tier * (1 + DANGER)), centsOf = (xp) => xp * 50;
const PAY = {
  a: { xp: xpOf(1), cents: centsOf(xpOf(1)), aliasCut: 0.6 },
  b: { xp: xpOf(2), cents: centsOf(xpOf(2)), hush: 12000, spillFee: 2500 },
  c: { xp: xpOf(3), cents: centsOf(xpOf(3)), deskMore: 1.35, rep: 10 },
};
const ALIAS = { skill: "speech", difficulty: 40 }, HUSH = { skill: "barter", difficulty: 45 };
const SPRINT = 5.4, STRIKES = 3, SQUAD = 3; // m/s that counts as running with the tray; rattles before it spills; wardens in a squad
const rec = (s) => (s.l21dq ??= {});
const has = (s, key) => JSON.stringify([s.inv ?? null, s.weapons ?? null, s.bag ?? null, s.slots ?? null, s.equip ?? null]).includes(key);
const money = (c) => "$" + (c / 100).toFixed(2);

// ---- the person ----
function person(ctx, id = CONCIERGE) {
  if (ctx.place.objects[id]) return;
  const look = { species: "human", sex: "m", age: "middle", topw: "jacket", top: "#5b1c26", botw: "pants", bottom: "#1f1d1c", shoes: "shoes", hair: "#6f6a64", expr: "calm" };
  ctx.spawn(id, { tags: ["npc", "l21d", "l21d-npc"], feetPosition: { x: DESK.x, y: 0.1, z: DESK.z }, rotation: { yaw: DESK.yaw }, physics: "character",
    ...critterSpec(npcLook(id, look, "wanderer", 14, "trader")), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "The Concierge", role: "trader", faction: "wanderer", faceYaw: DESK.yaw, home: { x: DESK.x, z: DESK.z }, stay: true } });
}
export function keepPeople21(ctx) {
  const st = ctx.place.state;
  if (!st.l21dDesk) { person(ctx); st.l21dDesk = 1; return; }
  keepPeople(ctx, [CONCIERGE], person);
}

// ---- choices on the talk card ----
export function l21dChoices(id, s) {
  if (!s) return [];
  const a = s.l21dqa ?? 0, b = s.l21dqb ?? 0, c = s.l21dqc ?? 0, r = s.l21dq ?? {}, out = [], q = T.q;
  if (id === CONCIERGE) {
    if (!a) out.push({ text: q.start1, tag: "Quest Start" });
    if (a === 1) out.push({ text: q.remind1, tag: "Quest" });
    if (a === 2) { out.push({ text: q.sign, tag: "Quest Turn-In" }); out.push({ text: q.alias, tag: "Speech 40", check: ALIAS }); }
    if (a === 99 && !b) out.push({ text: q.start2, tag: "Quest Start" });
    if (b === 1) {
      if (r.spilled) out.push({ text: q.spilled, tag: "Quest" });
      else if (!r.lifted) out.push({ text: q.lift, tag: "Choice" });
      else { out.push({ text: q.keep, tag: "Keep the keys" }); if (!r.hushFail) out.push({ text: q.hush, tag: "Barter 45", check: HUSH }); out.push({ text: q.cover, tag: "Deliver it" }); }
    }
    if (b === 2) out.push({ text: q.done2, tag: "Quest Turn-In" });
    if (b === 99 && !c) out.push({ text: q.start3, tag: "Quest Start" });
    if (c >= 1 && c < 4) out.push({ text: q.remind3, tag: "Quest" });
    if (c === 4) out.push({ text: q.tell, tag: "Quest Turn-In" });
    if (c === 99 && !r.after) out.push({ text: q.after, tag: "Quest" });
  } else if (id === OKAFOR) {
    if (!c && a) out.push({ text: TO.q.start3, tag: "Quest Start" });
    if (c === 4) out.push({ text: TO.q.report, tag: "Quest Turn-In" });
  }
  return out;
}

const say = (reply, mood = "calm") => ({ reply, mood });
const startC = (ctx, p) => { const s = p.state; rec(s).wbase = s.l21d?.warden ?? 0; advanceQuest(ctx, p, QC, 1, `Quest Started: ${QC.name} · ${QC.tips[1]}`); };
export function handleDialogueQuestD21(ctx, p, npc, text) {
  const s = p?.state; if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(); if (id !== CONCIERGE && id !== OKAFOR) return null;
  const t = String(text ?? ""), is = (line) => t === line || t.toLowerCase().includes(String(line).toLowerCase());
  const a = s.l21dqa ?? 0, b = s.l21dqb ?? 0, c = s.l21dqc ?? 0, r = rec(s), q = T.q;
  if (id === OKAFOR) {
    if (is(TO.q.start3) && !c) { startC(ctx, p); return say(TO.start3); }
    if (is(TO.q.report) && c === 4) {
      const lantern = has(s, "wardens_lantern");
      r.door = "meg";
      finishLevelQuest(ctx, p, QC.key, QC, { xp: PAY.c.xp, cents: PAY.c.cents, items: ["firesalt", "firesalt", "firesalt", ...(lantern ? [] : ["weapon:wardens_lantern"])], rep: [["meg", PAY.c.rep], ["karma", 2]], by: "meg", payKey: "l21d-rumoured-door" });
      return say(lantern ? TO.reportLantern : TO.report, "happy");
    }
    return null;
  }
  if (is(q.start1) && !a) { r.base = s.l21d?.doors ?? 0; advanceQuest(ctx, p, QA, 1, `Quest Started: ${QA.name} · ${QA.tips[1]}`); return say(T.start1); }
  if (is(q.remind1) && a === 1) return say(T.remind1.replace("{n}", String(Math.max(0, (s.l21d?.doors ?? 0) - (r.base ?? 0)))));
  if (a === 2 && (is(q.sign) || is(q.alias))) {
    const alias = is(q.alias), ok = alias && rollCheck(ctx, s, ALIAS).ok;
    r.signed = ok ? "alias" : "name"; // your name in the book: the nest door knows you, and he pays in full
    finishLevelQuest(ctx, p, QA.key, QA, { xp: PAY.a.xp, cents: Math.round(PAY.a.cents * (ok ? PAY.a.aliasCut : 1)), items: ["level_key"], payKey: "l21d-sign-the-ledger" });
    return say(ok ? T.alias : alias ? T.aliasFail : T.sign, ok ? "annoyed" : "happy");
  }
  if (is(q.start2) && a === 99 && !b) { r.strikes = 0; r.spilled = false; r.lifted = false; advanceQuest(ctx, p, QB, 1, `Quest Started: ${QB.name} · ${QB.tips[1]}`); return say(T.start2.replace("{door}", DOOR_NAME)); }
  if (b === 1) {
    if (is(q.spilled) && r.spilled) { r.spilled = false; r.strikes = 0; r.fee = (r.fee ?? 0) + PAY.b.spillFee; return say(T.spilled); }
    if (is(q.lift) && !r.lifted) { r.lifted = true; tellQuest(ctx, p, "Under the cloth: a ring of numbered keys, each with a guest's name on a paper tag"); return say(r.signed === "name" ? T.liftMarked : T.lift); }
    if (r.lifted && is(q.keep)) {
      r.tray = "keys"; // no pay from him, but the keys turn, and nothing gets fed
      finishLevelQuest(ctx, p, QB.key, QB, { xp: PAY.b.xp, cents: 0, items: ["level_key", "level_key", "level_key"], rep: [["karma", 3]], text: `Quest Completed: ${QB.name}! +${PAY.b.xp} XP · You kept the guests' keys`, payKey: "l21d-room-service" });
      return say(T.keep, "annoyed");
    }
    if (r.lifted && is(q.hush) && !r.hushFail) {
      if (!rollCheck(ctx, s, HUSH).ok) { r.hushFail = true; return say(T.hushFail); }
      r.tray = "hush";
      finishLevelQuest(ctx, p, QB.key, QB, { xp: PAY.b.xp, cents: PAY.b.cents + PAY.b.hush, items: ["firesalt"], rep: [["karma", -2]], payKey: "l21d-room-service" });
      return say(T.hush);
    }
    if (r.lifted && is(q.cover)) return say(T.cover);
  }
  if (is(q.done2) && b === 2) {
    r.tray = "fed";
    finishLevelQuest(ctx, p, QB.key, QB, { xp: PAY.b.xp, cents: Math.max(0, PAY.b.cents - (r.fee ?? 0)), items: ["firesalt", "firesalt"], rep: [["karma", -1]], payKey: "l21d-room-service" });
    return say(T.done2, "happy");
  }
  if (is(q.start3) && b === 99 && !c) { startC(ctx, p); return say(T.start3); }
  if (is(q.remind3) && c >= 1 && c < 4) return say(T.remind3);
  if (is(q.tell) && c === 4) {
    r.door = "desk"; // the M.E.G. never learns: no reputation, more money, his key
    const cents = Math.round(PAY.c.cents * PAY.c.deskMore);
    finishLevelQuest(ctx, p, QC.key, QC, { xp: PAY.c.xp, cents, items: ["firesalt", "firesalt", "weapon:concierge_key"], rep: [["karma", -3]], payKey: "l21d-rumoured-door" });
    return say(T.tell, "happy");
  }
  if (is(q.after) && c === 99) { r.after = true; return say(r.door === "meg" ? T.afterMeg : r.tray === "keys" ? T.afterKeys : T.afterDesk); }
  return null;
}

// ---- every sim tick: objectives from what the sim counted ----
export function questTick21(ctx) {
  for (const p of ctx.place.players) stepPlayer21(ctx, p);
}
export function stepPlayer21(ctx, p) {
  const now = ctx.now();
  {
    const s = p.state, f = p.worldFeetPosition ?? p.feetPosition; if (!s || !f) return;
    const a = s.l21dqa ?? 0, b = s.l21dqb ?? 0, c = s.l21dqc ?? 0; if (!a && !c) return;
    const L = s.l21d ?? {}, r = rec(s);
    if (a === 1 && (L.doors ?? 0) - (r.base ?? 0) >= 5) advanceQuest(ctx, p, QA, 2);
    if (b === 1 && !r.spilled) {
      const v = p.velocity ?? { x: 0, z: 0 }, out = Math.max(Math.abs(f.x), Math.abs(f.z)) > C + 2;
      if (out && Math.hypot(v.x, v.z) > SPRINT && now - (r.rattleAt ?? -1e9) > 3000) {
        r.rattleAt = now; r.strikes = (r.strikes ?? 0) + 1;
        if (r.strikes >= STRIKES) { r.spilled = true; tellQuest(ctx, p, "The tray goes over. Keys ring down the hall. Go back to the Concierge for another"); }
        else s.notice = { text: `The tray rattles under the cloth (${r.strikes}/${STRIKES}). Walk`, at: now };
      }
      const d = Math.hypot(f.x - TRAY_DOOR.x, f.z - TRAY_DOOR.z);
      if (d < 4.5 && ctx.place.objects[TRAY_DOOR.id]?.state?.opened) advanceQuest(ctx, p, QB, 2, `${QB.name} · Something takes the tray out of your hands. The door shuts itself · ${QB.tips[2]}`);
    }
    const dark = !!L.dark || f.z > DW.z - 200;
    if (c === 1 && (dark || Math.hypot(f.x - EXIT_DOOR.x, f.z - EXIT_DOOR.z) < 10)) advanceQuest(ctx, p, QC, 2);
    if ((s.l21dqc ?? 0) === 2 && dark) advanceQuest(ctx, p, QC, 3);
    if ((s.l21dqc ?? 0) === 3 && ((L.warden ?? 0) - (r.wbase ?? 0) >= SQUAD || has(s, "wardens_lantern"))) advanceQuest(ctx, p, QC, 4);
  }
}
