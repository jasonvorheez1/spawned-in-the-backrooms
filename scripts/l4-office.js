// Level 4's open-plan life, one manager plus the things you press (state.kind):
//   phone    every minute or so one desk phone rings for 25 s. Answer it (E): a voice on the line, M.E.G. advice, a stranger, and
//            sometimes a tip: "there's a box under the desk in 4-09" (a crate appears in that office). A dead line now and then.
//   printer  prints a memo from whoever worked here last (E reads it), a minute between pages.
//   manager  keeps the phones ringing in turn and, every couple of minutes, plays an office sound somewhere behind a wanderer:
//            a door, footsteps on the carpet, a copier starting up, a chair rolling.
import { heard } from "./lib/hear.js";
import { ROOMS } from "./lib/level4.js";
import { spawnCrate } from "./lib/loot.js";
import { skillsOf } from "./lib/stats.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const VO = (line) => `/cdn/voice-office-phone-caller-saying-${line.replace(/[^a-z ]/gi, "").trim().toLowerCase().replace(/ +/g, "-").slice(0, 120)}.mp3`;
const RING = 25000, GAP = [35000, 80000];
const LINES = [
  "If you can hear this, you made it to the fourth floor. Drink from the fountains. Do not open the windows.",
  "This is Base Omega. We are in the north west corner. Water, a cot, a door that locks. Come in slowly.",
  "Hello? Is someone there? I can hear the lights humming on your end too.",
  "Reminder, the quarterly review has been moved to never. Please clear your desk.",
  "The stairwell goes down to the boiler rooms. Bring a light and do not run.",
  "Whoever took my stapler. I know. I always know.",
  "Do not answer the phone in office four twenty one.",
  "You have one new message. ... It is you. You are calling from the stairwell.",
  "Your desk is waiting. It has been waiting a long time.",
  "Claim an empty office and it is yours. The water cooler in it refills. That is the deal.",
  "Lift to level three is in the north east corner. The bars there do not open. Don't try.",
  "We found a supply box. I'll tell you where, but hurry, things don't stay put here.",
];
const DEAD = ["...", "Only breathing on the line.", "A dial tone, then a voice counting backwards from twelve.", "Static, and somewhere far away, a fax machine."];
const MEMOS = [
  "MEMO: The windows are not to be uncovered. Facilities has been informed. Facilities is not answering.",
  "MEMO: Water fountains on this floor are safe. Water from the fourth window is not water.",
  "MEMO: Staff are reminded that offices may be claimed. One per person. The plate on the door knows.",
  "MEMO: Anyone who hears the phone in the break room ring twice should leave the break room.",
  "MEMO: The clock is not broken. Please stop reporting the clock.",
  "MEMO: Printer 2 prints in its sleep. This is not a ticket. This is a warning.",
  "MEMO: Base Omega accepts almond water as payment for nothing. Bring some anyway.",
  "MEMO: If you find your own name on a desk, do not sit down.",
];
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const sub = (who, t, ctx, name) => { if (who) who.state.sub = { who: name, t, at: ctx.now(), d: 1800 + t.length * 60 }; };
const snd = (ctx, clip, pos, v = 0.7, far = 14) => heard(ctx, { clip, position: pos, volume: v, maxDistance: far });
const phones = (ctx) => ctx.query({ tags: ["l4-phone"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });

function ringOn(ctx, ph, on) {
  const s = ph.state;
  s.ringing = on; s.verb = on ? "Answer" : "Pick up"; s.info = on ? "Ringing..." : "Desk phone"; s.tint = on ? "#ff8a6a" : "#d9d3b8";
  ph.audio = on ? { clip: G("old-office-desk-phone-ringing-loop"), gain: 0.9, loop: true, spatial: true, maxDistance: 34 } : null;
  ph.material = { ...(ph.material ?? {}), emissive: on ? "#ff3a2a" : "#000000", emissiveIntensity: on ? 1.6 : 0 };
  if (on) s.ringUntil = ctx.now() + RING;
}

// ---- office tasks: the shift board on the north island hands one task at a time to whoever asks (player.state.l4task).
// phones: answer two ringing phones. memo: carry a memo into a named office. printer: clear a jammed printer (Repair 20, or
// kick it and hope). papers: pick up three spilled paper stacks. Done = paid: XP and a supply item (player.state.payout,
// cashed in by scripts/craft.js on the player's own side).
const TASKS = ["phones", "memo", "printer", "papers"];
function progress(ctx, who, n = 1) {
  const t = who?.state?.l4task; if (!t) return;
  t.have = Math.min(t.need, (t.have ?? 0) + n); who.state.l4task = { ...t };
  if (t.have >= t.need) finish(ctx, who);
}
function finish(ctx, who) {
  const lv = who.state.level ?? 1, xp = 45 + 6 * lv;
  who.state.payout = { xp, items: [pick(ctx, ["almond", "almond", "battery", "ammo", "kit", "bandage"])], text: `Task done. +${xp} XP and something from the supply cupboard.` };
  who.state.l4task = null; who.state.l4done = (who.state.l4done ?? 0) + 1;
  for (const o of ctx.query({ tags: ["l4-papers"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.state.owner === who.id) ctx.destroy(o.id);
}
function giveTask(ctx, who) {
  const kind = pick(ctx, TASKS), t = { kind, have: 0, need: 1 };
  if (kind === "phones") { t.need = 2; t.text = "Answer two ringing phones" }
  if (kind === "memo") { const r = pick(ctx, ROOMS.filter((q) => q.kind === "office")); t.room = r.id; t.text = `Take this memo to office ${r.label}` }
  if (kind === "printer") {
    const pr = pick(ctx, ctx.query({ tags: ["l4-printer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }));
    pr.state.jammed = true; pr.state.info = "Jammed. A red light blinks"; pr.state.verb = "Fix"; pr.state.tint = "#ff8a6a"
    t.printer = pr.id; const f = pr.feetPosition; t.text = `Clear the jammed printer (${f.x < -5 ? "west" : f.x > 5 ? "east" : f.z < 0 ? "north" : "south"} desks)`
  }
  if (kind === "papers") {
    t.need = 3; t.text = "Pick up three spilled paper stacks on the floor"
    for (let i = 0; i < 3; i++) {
      const a = ctx.random() * Math.PI * 2, d = 6 + ctx.random() * 14, x = Math.cos(a) * d, z = Math.sin(a) * d
      ctx.spawn({ tags: ["usable", "l4-papers"], feetPosition: { x, y: 0.01, z }, rotation: { yaw: ctx.random() * 360 }, behavior: "scripts/l4-office.js",
        primitive: { kind: "box", width: 0.42, height: 0.05, depth: 0.32 }, material: { color: "oklch(0.95 0.01 90)", emissive: "oklch(0.5 0.02 90)", emissiveIntensity: 0.3 },
        state: { kind: "papers", owner: who.id, name: "Spilled papers", verb: "Pick up", info: "Somebody's paperwork", tint: "#f2c14e" } })
    }
  }
  who.state.l4task = t
  sub(who, `New task: ${t.text}.`, ctx, "Shift board")
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now(), p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    if (s.kind === "board") {
      const t = who?.state?.l4task
      if (t) { sub(who, `Your task: ${t.text} (${t.have ?? 0}/${t.need}). Press again to give it up.`, ctx, "Shift board"); if (now - (who.state.l4ask ?? 0) < 4000) { who.state.l4task = null; sub(who, "Task dropped. Take another when you like.", ctx, "Shift board") } who.state.l4ask = now; return }
      giveTask(ctx, who); snd(ctx, G("paper-note-tear-off-pin"), p, 0.5); return
    }
    if (s.kind === "papers") {
      if (s.owner !== by) { sub(who, "Someone else's mess.", ctx, "Papers"); return }
      snd(ctx, G("paper-shuffle-pick-up"), p, 0.6); ctx.destroy(ctx.self.id); progress(ctx, who); return
    }
    if (s.kind === "printer" && s.jammed) {
      const rep = skillsOf(who?.state ?? {}).repair ?? 0
      if (rep >= 20 || ctx.random() < 0.3) {
        s.jammed = false; s.info = "Something is half printed"; s.verb = "Read"; s.tint = "#d9d3b8"
        snd(ctx, G("office-printer-printing-page"), p, 0.7)
        sub(who, rep >= 20 ? `[Repair ${rep}] You pull out a crumpled page and reseat the tray. It whirs back to life.` : "You kick it. Something clunks. It works.", ctx, "Printer")
        const t = who?.state?.l4task; if (t?.kind === "printer" && t.printer === ctx.self.id) progress(ctx, who)
      } else { sub(who, "You kick it. Nothing. (Repair 20 would help.)", ctx, "Printer"); snd(ctx, G("metal-panel-kick-thud"), p, 0.6) }
      return
    }
    if (s.kind === "phone") {
      snd(ctx, G("phone-handset-pick-up-click"), p, 0.6);
      if (!s.ringing) { sub(who, pick(ctx, DEAD), ctx, "Phone"); if (who && ctx.random() < 0.15) who.state.sanity = Math.max(0, (who.state.sanity ?? 100) - 4); return; }
      ringOn(ctx, ctx.self, false)
      if (who?.state?.l4task?.kind === "phones") ctx.after(2.5, "phoneTask", { by })
      let line = pick(ctx, LINES)
      if (ctx.random() < 0.35) { // a tip: a supply crate turns up in an office nobody owns
        const free = ROOMS.filter((r) => r.kind === "office");
        const r = pick(ctx, free); spawnCrate(ctx, { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }, "l4");
        line = `Listen. There's a supply box in office ${r.label}. Under the desk. Go now.`;
      }
      sub(who, line, ctx, "Voice on the line");
      heard(ctx, { clip: VO(line), position: { ...p, y: 1 }, volume: 0.8, maxDistance: 6 }, { audience: { player: by } });
      return;
    }
    if (s.kind === "printer") {
      if (now < (s.readyAt ?? 0)) { sub(who, "The printer is warming up. It smells like burnt toner.", ctx, "Printer"); return; }
      s.readyAt = now + 60000;
      snd(ctx, G("office-printer-printing-page"), p, 0.7);
      sub(who, pick(ctx, MEMOS), ctx, "Printed memo");
      return;
    }
  },
};

export function phoneTask(ctx, d) { progress(ctx, ctx.getObject(d.by)) } // after the caller's line has had its moment

export function update(ctx, dt) {
  const s = ctx.self.state;
  if (s.kind !== "manager") return;
  const now = ctx.now();
  s.acc = (s.acc ?? 0) + dt; if (s.acc < 1) return; s.acc = 0;
  for (const pl of ctx.place.players) { // a memo is delivered by walking into its office
    const t = pl.state?.l4task; if (t?.kind !== "memo") continue
    const r = ROOMS.find((q) => q.id === t.room), f = pl.feetPosition
    if (r && f.x > r.x0 + 0.3 && f.x < r.x1 - 0.3 && f.z > r.z0 + 0.3 && f.z < r.z1 - 0.3) { sub(pl, `You leave the memo on the desk in ${r.label}.`, ctx, "Memo"); progress(ctx, pl) }
  }
  const all = phones(ctx);
  const live = all.find((ph) => ph.state.ringing);
  if (live && now > (live.state.ringUntil ?? 0)) { ringOn(ctx, live, false); s.nextRing = now + GAP[0] + ctx.random() * (GAP[1] - GAP[0]); }
  if (!live && all.length && now >= (s.nextRing ?? 0) && ctx.place.players.length) { ringOn(ctx, pick(ctx, all), true); }
  // the floor is never quite empty
  if (now >= (s.nextNoise ?? 0) && ctx.place.players.length) {
    s.nextNoise = now + 70000 + ctx.random() * 70000;
    const pl = pick(ctx, ctx.place.players), f = pl.feetPosition, a = ctx.random() * Math.PI * 2;
    const at = { x: f.x + Math.cos(a) * 9, y: 1.2, z: f.z + Math.sin(a) * 9 };
    heard(ctx, { clip: G(pick(ctx, ["office-door-slam-distant", "footsteps-on-carpet-behind", "copier-machine-starting-whir", "office-chair-rolling-squeak", "single-phone-ring-far-away"])), position: at, volume: 0.6, maxDistance: 20 }, { audience: { player: pl.id } });
  }
}
