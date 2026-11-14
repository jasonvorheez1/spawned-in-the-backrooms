// Level 109: the Doctors' outpost living its day, called once a sim tick from places/level109/sim.js. Everything here only moves
// people the outpost already has (scripts/lib/l109-outpost.js spawns them with state.dayRounds / state.alertRounds) through the
// shared brain's rounds (scripts/meg-agent.js): no new bodies, clips or sounds.
//   triage    bed two crashes now and then: its monitor alarms, Dr. Osei holds the bed, Nurse Petra runs to the supply cage and back,
//             they work it, and it settles. Watchable without any quest. Paused while the outpost is on alert.
//   alert     anything loose (a pen-foe out of its room, a frenzied wanderer) within reach of the outpost: M.E.G. calls it, the guards
//             take the doorway, the staff go to the back wall; the brain's own combat does the fighting. Quiet for a while: back to rounds.
//   aftercare after an alert, Petra walks to whoever on staff is hurt and patches them.
//   doors     a pen door opened down the hall (place.state.pdoors): Private Lam walks out to look at it, says what he saw, comes back.
//   chatter   the cast's own exchanges (chatter.yml level109*), picked by what has actually happened on the floor.
import C from "./data/l109-outpost.yml";
import { tickChatter, CHATTER } from "./chatter.js";
import { penCount } from "./containment.js";
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = (o) => !!o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
const ALERT_R = 30, CALM_MS = 15000, DOOR_R = 90;
const say = (ctx, o, t, d = 1400 + t.length * 55) => { if (!alive(o)) return; const now = ctx.now(); o.state.line = { t, at: now, d }; o.state.talkAt = now; };
const setRounds = (o, stops) => { if (!alive(o) || !stops) return; o.state.rounds = stops; o.state.ri = 0; };
const dayOf = (o) => { if (alive(o) && o.state.dayRounds) setRounds(o, o.state.dayRounds); };
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
export function outpostLife(ctx) {
  const g = ctx.place.state.l109geo?.outpost; if (!g) return;
  const id = (k) => `l109o-${g.room}-${k}`, get = (k) => ctx.place.objects[id(k)];
  const S = (ctx.session.l109life ??= { care: { ph: "calm", at: ctx.now() + C.care.firstCalm * 1000 }, doors: null });
  if (!get("halloran")) { cleanup(ctx, id); S.care = { ph: "calm", at: ctx.now() + C.care.firstCalm * 1000 }; S.alert = null; return; } // outpost not streamed in
  if (!ctx.place.players.some((p) => p.feetPosition && flat(p.feetPosition, g.mid) < 70)) return;
  const now = ctx.now(), staff = ["halloran", "petra", "doc1", "doc2"], guards = ["guard0", "guard1", "guard2"];
  // ── alert ──
  const threat = ctx.query({ anyTags: ["pen-foe", "hostile"], radius: ALERT_R, center: g.door }).find((f) => alive(f) && !f.state?.pen);
  if (threat) {
    if (!S.alert) {
      S.alert = { since: now }; endCare(ctx, S, get, true);
      for (const k of [...staff, ...guards]) setRounds(get(k), get(k)?.state?.alertRounds);
      say(ctx, get("guard0"), pick(ctx, ["contact! hall, west side!", "movement in the hall! weapons up!", "something's out! on me!"]));
      say(ctx, get("guard1"), "doctors, back wall. now.");
    }
    S.alert.last = now;
  } else if (S.alert && now - (S.alert.last ?? S.alert.since) > CALM_MS) {
    S.alert = null;
    for (const k of [...staff, ...guards]) dayOf(get(k));
    say(ctx, get("guard2"), pick(ctx, ["clear. clear.", "hall's quiet. stand down.", "that's it. that's all of it."]));
    S.care2 = { at: now + 2500 }; // aftercare: a beat, then Petra goes round the hurt
  }
  if (S.alert) return;
  for (const k of guards) { const o = get(k); if (o?.state?.l109restoreAt && now > o.state.l109restoreAt) { o.state.l109restoreAt = 0; dayOf(o); } } // back from pointing the way
  aftercare(ctx, S, get, staff, guards, now);
  doorWatch(ctx, S, g, get, now);
  triage(ctx, S, g, get, id, now);
  chatter(ctx, g, id);
}
function aftercare(ctx, S, get, staff, guards, now) {
  const petra = get("petra"); if (!S.care2 || now < S.care2.at || !alive(petra)) return;
  if (!S.care2.who) {
    const hurt = [...staff, ...guards].filter((k) => k !== "petra").map(get).find((o) => alive(o) && (o.state.hp ?? 1) < (o.state.maxHp ?? 1) * 0.95);
    if (!hurt) { S.care2 = null; dayOf(petra); return; }
    S.care2.who = hurt.id; S.care2.until = now + 40000; setRounds(petra, [{ x: hurt.feetPosition.x, y: 0, z: hurt.feetPosition.z, dwell: 3600, act: "cdn/clip-crouch-idle-loop.glb", look: { x: hurt.feetPosition.x, z: hurt.feetPosition.z } }]);
    say(ctx, petra, pick(ctx, ["you're bleeding. stand still.", "sit down before you fall down.", "let me see that arm."]));
    return;
  }
  const o = ctx.place.objects[S.care2.who];
  if (!alive(o) || now > S.care2.until) { S.care2 = { at: now + 1000 }; return; }
  if (flat(petra.feetPosition, o.feetPosition) < 1.8) { S.care2.near ??= now; if (now - S.care2.near > 4000) { o.state.hp = o.state.maxHp ?? o.state.hp; say(ctx, o, "thanks."); say(ctx, petra, "don't pick at it."); S.care2 = { at: now + 2000 }; } }
}
function doorWatch(ctx, S, g, get, now) {
  const lam = get("guard1"), open = Object.keys(ctx.place.state.pdoors ?? {}), at = ctx.place.state.pdoorAt ?? {};
  if (!S.doors) { S.doors = new Set(open); return; } // what was open before anyone was here is old news
  if (S.check) {
    const c = S.check;
    if (!alive(lam)) { S.check = null; return; }
    if (now > c.until || (flat(lam.feetPosition, c.stand) < 1.5 && (c.seen ??= now) && now - c.seen > 6000)) {
      const still = !!ctx.place.state.pdoors?.[c.door];
      say(ctx, lam, still ? (penCount(ctx, c.door) ? "still open. something's moving in there. nobody go that way." : "still open. room's empty. that's what worries me.") : "someone shut it. good.");
      S.check = null; dayOf(lam);
    }
  } else if (alive(lam)) {
    const fresh = open.find((d) => !S.doors.has(d) && at[d] && flat(at[d], g.door) < DOOR_R);
    if (fresh) {
      const d = at[fresh], dx = g.door.x - d.x, dz = g.door.z - d.z, l = Math.hypot(dx, dz) || 1, stand = { x: d.x + dx / l * 3, y: 0, z: d.z + dz / l * 3 };
      S.check = { door: fresh, stand, until: now + 60000 }; setRounds(lam, [{ ...stand, dwell: 3600, act: null, look: { x: d.x, z: d.z } }]);
      say(ctx, lam, "door just went, down the hall. i'll look.");
    }
  }
  S.doors = new Set(open);
}
// ── the triage scene ──
const ALARM = "l109care-alarm";
function triage(ctx, S, g, get, id, now) {
  const c = S.care, G = g.care, osei = get("doc1"), petra = get("petra"), pt = get("bed2pt"), mon = get("mon1");
  if (!G || !alive(osei) || !mon) return;
  const nurse = alive(petra) && !S.care2 ? petra : get("doc2");
  const busy = (o) => ctx.place.players.some((p) => p.state?.talkWith === o?.id);
  if (c.ph === "calm") { if (now > c.at && !busy(nurse)) {
      c.ph = "crash"; c.at = now; mon.state.info = "ALARM · pressure falling"; mon.state.verb = "Check Vitals";
      ctx.spawn(ALARM, { tags: ["l109-room"], feetPosition: G.mon, light: { kind: "point", color: "#ff3b2f", intensity: 1.6, distance: 5, shadow: { enabled: false } }, audio: { clip: C.care.alarmClip, loop: true, gain: 0.45, spatial: true, maxDistance: 16, bus: "Ambience" } });
      if (pt) { pt.state.dlg = "l109-triage"; say(ctx, pt, "i can't... i can't get a breath..."); }
      setRounds(osei, [G.doc]); say(ctx, osei, "bed two's dropping! petra, i need the kit!");
      setRounds(nurse, [G.cage]); c.nurse = nurse.id; say(ctx, nurse, "going!");
    } return; }
  const n = ctx.place.objects[c.nurse];
  if (!alive(n)) { endCare(ctx, S, get, false); return; }
  const blink = Math.floor(now / 450) % 2, lt = ctx.place.objects[ALARM]; if (lt?.light && c.ph !== "treat") lt.light = { ...lt.light, intensity: blink ? 1.8 : 0.4 };
  if (c.ph === "crash" && flat(n.feetPosition, G.cage) < 1.4) { c.ph = "fetch"; c.at = now; }
  else if (c.ph === "fetch" && now - c.at > 3200) { c.ph = "bring"; c.at = now; setRounds(n, [G.nurse]); say(ctx, n, "got it, coming through!"); }
  else if (c.ph === "bring" && flat(n.feetPosition, G.nurse) < 1.4) { c.ph = "treat"; c.at = now; if (lt?.light) lt.light = { ...lt.light, intensity: 1.2 }; say(ctx, osei, "push it. now. ...come on."); }
  else if (c.ph === "treat" && now - c.at > C.care.treat * 1000) {
    say(ctx, osei, "there. holding. write the time down."); if (pt) say(ctx, pt, "...okay. okay. that's better.");
    S.stableAt = now; endCare(ctx, S, get, false);
  } else if ((c.ph === "crash" || c.ph === "bring") && now - c.at > 50000) endCare(ctx, S, get, false); // stuck on the way: the scene lets go rather than freeze
}
function endCare(ctx, S, get, paused) {
  const c = S.care, mon = get("mon1"), pt = get("bed2pt");
  if (c.ph === "calm") return;
  if (ctx.place.objects[ALARM]) ctx.destroy(ALARM);
  if (mon?.state) { mon.state.info = paused ? "ALARM · unattended" : "steady sinus"; }
  if (pt?.state) pt.state.dlg = "l109-patient";
  dayOf(get("doc1")); dayOf(ctx.place.objects[c.nurse]);
  const [lo, hi] = C.care.calm; S.care = { ph: "calm", at: ctx.now() + (lo + ctx.random() * (hi - lo)) * 1000 };
}
function cleanup(ctx) { if (ctx.place.objects[ALARM]) ctx.destroy(ALARM); }
// ── chatter, chosen by what the floor has seen ──
function chatter(ctx, g, id) {
  const st = ctx.place.state, end = st.l109breachEnd, base = CHATTER.level109 ?? [];
  const extra = end ? (CHATTER[end.route === "lure" ? "level109_lure" : "level109_clear"] ?? []) : st.pdoors?.ew0_6p ? (CHATTER.level109_open ?? []) : [];
  const stable = ctx.session.l109life?.stableAt && ctx.now() - ctx.session.l109life.stableAt < 300000 ? (CHATTER.level109_stable ?? []) : [];
  const list = [...base, ...extra, ...stable]; // chatter.yml names the cast by full id (the outpost is always room ew0_13m)
  const voices = Object.fromEntries(["halloran", "petra", "doc1", "doc2", "guard0", "guard1", "guard2"].map((k) => [id(k), `${id(k)}#${k === "petra" || k === "doc2" ? "f" : "m"}`]));
  tickChatter(ctx, list, voices);
}
