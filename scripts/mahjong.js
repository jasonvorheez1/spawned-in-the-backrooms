// The Beverly Room's mahjong table, played with real people. E at the table (scripts/l5-ball.js) sits you on a stool; three guests
// walk in through the ballroom doors, take the other stools and play (scripts/l5-ball.js spawns and sends them off; this file runs the game).
// You draw, then discard (click a tile). Anyone's discard can be called: PON (any seat, a pair in hand), CHI (a run, from the player before you),
// RON (it wins your hand). First to four sets and a pair wins; fan (scripts/lib/mahjong.js) multiplies the pot. Stake $1.00 from each into the pot.
// state: player.state.mj, drawn by scripts/mahjong-ui.js. phase: intro (guests arriving) > deal > turn <> claim > over.
import { fullSet, sortHand, isWin, scoreHand, payout, chooseDiscard, shanten, chiOptions, canPon, canRon, isSuit, tileName } from "./lib/mahjong.js";
import { sitDown, standUp, spotsOf } from "./lib/seat.js";
import { heard } from "./lib/hear.js";
import { vo } from "./lib/voices.js";
import { gain } from "./player.js";
import MJ from "./lib/data/mahjong.yml";
const STAKE = MJ.stake;
const CLACK = "cdn/moodboard-realistic-gritty/sfx-mahjong-tile-clack-on-felt-table.mp3";
const SWEEP = "cdn/moodboard-realistic-gritty/sfx-tiles-swept-across-table-groan.mp3";
const JINGLE = "cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const CLAIM_MS = 7000;
const rnd = (ctx) => () => ctx.random();
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const snd = (ctx, clip, v = 0.5) => ctx.emit("playSound", { clip, volume: v });
const shake = (ctx, intensity, duration) => ctx.emit("screenShake", { intensity, duration }, { audience: { player: ctx.self.id } });
const table = (ctx) => ctx.getObject("l5-ball-mahjong");
const cash = (c) => `$${(c / 100).toFixed(2)}`;
const shuffle = (ctx, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(ctx.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const persona = (m, q) => MJ.visitors[m.seats[q].v]?.persona ?? { pon: 0.5, chi: 0.3, sloppy: 0.3, cheek: 0.5 };
const spotOf = (ctx, stoolId) => { const o = ctx.getObject(stoolId); return o ? spotsOf(o)[0] : null; };

// ---- the guests' voices: a line over their head and in the panel, at most one every couple of seconds
function say(ctx, m, q, kind, force = false, p = 1) {
  const st = m.seats[q], V = MJ.visitors[st?.v]; if (!V || q === 0) return;
  const now = ctx.now(); if (!force && (now - (m.sayAt ?? 0) < 2200 || ctx.random() > p * (0.3 + V.persona.cheek * 0.7))) return;
  const t = pick(ctx, V.lines[kind] ?? MJ.common[kind] ?? V.lines.draw); m.sayAt = now; (m.sayB ??= [null, null, null, null])[q] = { t, at: now };
  const o = ctx.getObject(st.gid); if (!o) return;
  o.state.line = { t, at: now, d: 1400 + t.length * 60 }; o.state.talkAt = now;
  const f = o.feetPosition; heard(ctx, { clip: vo(st.v, t), position: { x: f.x, y: f.y + 1.4, z: f.z }, volume: 0.85, refDistance: 3, maxDistance: 18 }, { audience: { nearby: f, radius: 20 } });
}
const logL = (m, t) => { m.log = [...(m.log ?? []).slice(-4), t]; };

// ---- start: sit on a stool, send for three guests
function lobby(ctx, s) {
  const me = ctx.self, now = ctx.now(), tb = table(ctx);
  const closed = (msg) => { s.mj = { open: true, msg }; };
  if ((s.cents ?? 0) < STAKE) return closed("You need $1.00 to sit in.");
  const g = tb?.state?.mjGuests;
  const rejoin = g && g.solo && !g.leaving;
  if (g && !g.leaving && !g.solo && g.host !== me.id && now - (g.beat ?? 0) < 20000) return closed("Someone is already playing at this table. The stools are warm.");
  if (!tb) return closed("The table is not here.");
  // the nearest free stool is yours, the others go round it
  let k = -1, bd = 1e9; const p = me.feetPosition;
  MJ.stools.forEach((id, i) => { const o = ctx.getObject(id), sp = o && spotsOf(o)[0]; if (!sp || (o.state.by?.[0] && o.state.by[0] !== me.id)) return; const d = Math.hypot(sp.x - p.x, sp.z - p.z); if (d < bd) { bd = d; k = i; } });
  if (rejoin) { const used = new Set(g.list.map((e) => e.stool)), fk = MJ.stools.findIndex((id) => !used.has(id)); if (fk >= 0) k = fk; }
  if (k < 0) return closed("There is nowhere to sit.");
  if (!s.sit && !sitDown(ctx, ctx.getObject(MJ.stools[k]))) return closed("You can't sit there.");
  const names = rejoin ? MJ.stools.map((_, j) => g.list.find((e) => e.stool === MJ.stools[(k + j + 1) % 4])?.v).slice(0, 3).filter(Boolean) : shuffle(ctx, Object.keys(MJ.visitors)).slice(0, 3), seats = [{ you: true, name: "You" }], list = [];
  names.forEach((v, j) => { const stool = MJ.stools[(k + j + 1) % 4], sp = spotOf(ctx, stool), V = MJ.visitors[v];
    seats.push({ v, gid: `mj-guest-${v}`, name: V.name, role: V.role, sp: V.species, here: false, sx: sp.x, sz: sp.z });
    list.push({ id: `mj-guest-${v}`, v, stool, x: sp.x, y: sp.y + 0.1, z: sp.z, yaw: sp.yaw }); });
  tb.state.mjGuests = { host: me.id, at: rejoin ? g.at : now, beat: now, list, leaving: false };
  ctx.self.session.mjLive = true;
  s.mj = { open: true, phase: "intro", at: now, next: now + 400, k, seats, seq: 0, hands: 0, log: [], pot: 0, msg: "Waiting for players..." };
}
function leave(ctx, s, quiet) {
  const m = s.mj, tb = table(ctx);
  if (m?.phase && m.phase !== "over" && m.phase !== "intro" && !quiet) s.notice = { text: "You push back from the table. Your dollar stays in the pot.", at: ctx.now() };
  if (m?.seats) say(ctx, m, 1 + Math.floor(ctx.random() * 3), "left", true);
  if (tb?.state?.mjGuests && !tb.state.mjGuests.leaving) tb.state.mjGuests = { ...tb.state.mjGuests, host: null, solo: true, soloAt: ctx.now(), talked: true }; // the table goes on without you (scripts/l5-ball.js)
  if (s.sit && s.sit.phase !== "up") standUp(ctx);
  s.mj = null; ctx.self.session.mjLive = false;
}

// ---- a hand
function deal(ctx, s, m) {
  const now = ctx.now(), wall = shuffle(ctx, fullSet());
  if ((s.cents ?? 0) < STAKE) { m.phase = "over"; m.res = { broke: true }; m.msg = "You can't cover the stake. Time to stand up."; return; }
  s.cents -= STAKE; m.hands++;
  m.seats.forEach((st) => { st.hand = sortHand(wall.splice(0, 13)); st.melds = []; st.disc = []; st.tenpai = false; });
  Object.assign(m, { wall, phase: "deal", at: now, next: now + 2900, turn: 0, mustDisc: false, last: null, claim: null, ai: {}, res: null, stamp: null, fresh: null, drawn: null, pot: STAKE * 4, log: [], msg: "Dealing..." });
  snd(ctx, CLACK, 0.6);
}
function afterDiscard(ctx, m, d, t) {
  const now = ctx.now(), r = rnd(ctx);
  m.seats[d].disc.push(t); m.last = { tile: t, from: d, seq: (m.seq = (m.seq ?? 0) + 1), at: now }; m.fresh = { q: d, seq: m.seq, at: now };
  logL(m, `${m.seats[d].name} discards ${tileName(t)}`); snd(ctx, CLACK, 0.45);
  const ai = {};
  for (let k = 1; k <= 3; k++) {
    const q = (d + k) % 4; if (q === 0) continue;
    const st = m.seats[q], h = st.hand, mel = st.melds.length, P = persona(m, q);
    if (canRon(h, t)) { ai[q] = { k: "ron" }; continue; }
    const s0 = shanten([...h, t], mel);
    if (canPon(h, t)) {
      const rest = h.slice(); rest.splice(rest.indexOf(t), 1); rest.splice(rest.indexOf(t), 1);
      const hon = !isSuit(t) && (t[0] === "r" || t === "w" + (q + 1));
      if (shanten(rest, mel + 1) <= s0 && r() < Math.min(1, P.pon * (hon ? 1.5 : 1))) { ai[q] = { k: "pon" }; continue; }
    }
    if (k === 1) {
      let best = null, bs = 99;
      for (const pair of chiOptions(h, t)) { const rest = h.slice(); for (const x of pair) rest.splice(rest.indexOf(x), 1); const sh = shanten(rest, mel + 1); if (sh < bs) { bs = sh; best = pair; } }
      if (best && bs < s0 && r() < P.chi) ai[q] = { k: "chi", tiles: best };
    }
  }
  m.ai = ai;
  const h0 = m.seats[0].hand, o = [];
  if (d !== 0) { if (canRon(h0, t)) o.push({ k: "ron" }); if (canPon(h0, t)) o.push({ k: "pon" }); if (d === 3) for (const pair of chiOptions(h0, t)) o.push({ k: "chi", tiles: pair }); }
  m.phase = "claim";
  if (o.length) { m.claim = { opts: o, from: d, tile: t, at: now, until: now + CLAIM_MS }; m.next = now + CLAIM_MS; m.msg = `${m.seats[d].name} discards ${tileName(t)}. Call it?`; }
  else { m.claim = null; m.next = now + 850; m.msg = ""; }
  // a seat one tile from winning says so once
  if (d !== 0 && !m.seats[d].tenpai && shanten(m.seats[d].hand, m.seats[d].melds.length) === 0) { m.seats[d].tenpai = true; say(ctx, m, d, "near", false, 0.7); }
}
function resolve(ctx, s, m, choice) {
  const now = ctx.now(), d = m.last.from, t = m.last.tile, cl = [];
  for (let k = 1; k <= 3; k++) { const q = (d + k) % 4, c = q === 0 ? (choice && choice.k !== "pass" ? choice : null) : m.ai?.[q]; if (c) cl.push({ q, ...c }); }
  m.claim = null;
  const ron = cl.find((c) => c.k === "ron");
  if (ron) return win(ctx, s, m, ron.q, false, t, d);
  const c = cl.find((x) => x.k === "pon") ?? cl.find((x) => x.k === "chi");
  if (c) {
    const st = m.seats[c.q], used = c.k === "pon" ? [t, t] : c.tiles;
    for (const x of used) st.hand.splice(st.hand.indexOf(x), 1);
    st.melds = [...st.melds, { k: c.k, tiles: sortHand([t, ...used]), from: d }];
    m.seats[d].disc.pop(); m.last = { ...m.last, claimed: true };
    m.turn = c.q; m.mustDisc = true; m.phase = "turn"; m.next = now + 1000; m.fresh = null; m.turnAt = now; m.nagged = false;
    m.stamp = { t: c.k === "pon" ? "PON!" : "CHI!", q: c.q, at: now };
    logL(m, `${st.name} calls ${c.k.toUpperCase()} on ${tileName(t)}`); snd(ctx, SWEEP, 0.4); shake(ctx, 0.18, 0.18);
    say(ctx, m, c.q, c.k, true);
    m.msg = c.q === 0 ? "Discard a tile." : "";
    return;
  }
  m.turn = (d + 1) % 4; m.mustDisc = false; m.phase = "turn"; m.next = now + 750 + ctx.random() * 500; m.turnAt = now; m.nagged = false;
  m.msg = m.turn === 0 ? "Your turn: draw a tile." : "";
}
function win(ctx, s, m, q, self, tile, from) {
  const now = ctx.now(), st = m.seats[q], hand = self ? st.hand : sortHand([...st.hand, tile]);
  const sc = scoreHand({ hand, melds: st.melds, selfDraw: self, seat: q, last: !m.wall.length }), amount = payout(m.pot, sc.fan);
  m.phase = "over"; m.at = now; m.next = Infinity; m.claim = null; m.stamp = null;
  m.res = { winner: q, self, from: from ?? null, tile, fan: sc.fan, names: sc.names, amount, hand: sortHand(hand), melds: st.melds };
  if (q === 0) {
    s.cents = (s.cents ?? 0) + amount; gain(ctx, 20 + sc.fan * 10); m.msg = `Mahjong! ${cash(amount)} from the pot.`;
    snd(ctx, JINGLE, 0.6); shake(ctx, 0.5, 0.35);
    ctx.emit("damageNumber", { position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 2 }, text: `+${cash(amount)}`, color: "#9fcf8a", size: 1.4 });
    const o = 1 + Math.floor(ctx.random() * 3); say(ctx, m, o, "lose", true);
  } else {
    m.msg = `${st.name} wins ${cash(amount)}.`; snd(ctx, SWEEP, 0.55); shake(ctx, 0.25, 0.25);
    say(ctx, m, q, self ? "tsumo" : "ron", true);
  }
  logL(m, m.msg);
}
function exhaust(ctx, s, m) {
  s.cents = (s.cents ?? 0) + STAKE; m.phase = "over"; m.at = ctx.now(); m.next = Infinity; m.claim = null; m.res = { draw: true };
  m.msg = "The wall is empty. A draw: everyone takes their dollar back."; snd(ctx, SWEEP, 0.4);
}

// ---- the AI's turn: a beat to draw, a beat to discard
function aiTurn(ctx, s, m) {
  const now = ctx.now(), q = m.turn, st = m.seats[q];
  if (!m.mustDisc) {
    if (!m.wall.length) return exhaust(ctx, s, m);
    const t = m.wall.shift(); st.hand.push(t); m.drawn = { q, at: now };
    if (isWin(st.hand)) return win(ctx, s, m, q, true, t, null);
    m.mustDisc = true; m.next = now + 750 + ctx.random() * 600; snd(ctx, CLACK, 0.25); say(ctx, m, q, "draw", false, 0.25);
    return;
  }
  const t = chooseDiscard(st.hand, st.melds.length, persona(m, q), rnd(ctx), q);
  st.hand.splice(st.hand.indexOf(t), 1); m.mustDisc = false; m.drawn = null; say(ctx, m, q, "disc", false, 0.2);
  afterDiscard(ctx, m, q, t);
}

function step(ctx, s, m) {
  const now = ctx.now();
  if (m.phase === "intro") {
    let all = true; const tb = table(ctx);
    m.seats.forEach((st, q) => {
      if (!q || st.here) return;
      const o = ctx.getObject(st.gid);
      if (o && o.state.mjSat) { m.rev = (m.rev ?? 0) + 1; st.here = true; st.at = now; say(ctx, m, q, "greet", true); snd(ctx, "cdn/moodboard-realistic-gritty/sfx-soft-cushion-sit-down-fabric-rustle.mp3", 0.3); }
      else all = false;
    });
    if (now - m.at > 45000 && !all) { m.rev = (m.rev ?? 0) + 1; m.seats.forEach((st) => { if (st.gid && !st.here) { st.here = true; st.at = now; const o = ctx.getObject(st.gid), g = tb?.state?.mjGuests?.list?.find((x) => x.id === st.gid); if (o && g) o.feetPosition = { x: g.x, y: g.y, z: g.z }; } }); all = true; }
    if (all && now - m.at > 6500) { m.rev = (m.rev ?? 0) + 1; deal(ctx, s, m); }
    else m.msg = "Waiting for players...";
    return;
  }
  if (now < m.next) return;
  if (m.phase === "turn" && m.turn === 0) { if (!m.turnAt) m.turnAt = now; if (now - m.turnAt > 24000 && !m.nagged) { m.nagged = true; m.rev = (m.rev ?? 0) + 1; say(ctx, m, 1 + Math.floor(ctx.random() * 3), "slow", true); } m.next = now + 500; return; }
  m.rev = (m.rev ?? 0) + 1;
  if (m.phase === "deal") { m.phase = "turn"; m.turn = 0; m.mustDisc = false; m.msg = "Your turn: draw a tile."; m.next = now; m.turnAt = now; return; }
  if (m.phase === "claim") { resolve(ctx, s, m, null); return; }
  if (m.phase === "turn") {
    aiTurn(ctx, s, m);
  }
}

export function onInput(ctx, input) {
  if (!input.pressed.mj) return;
  const s = ctx.self.state, d = input.actionData?.mj ?? {}, m = s.mj;
  if (d.k === "close") { if (m?.seats) leave(ctx, s); else s.mj = null; return; }
  if (!m?.seats) return;
  const now = ctx.now(), me = m.seats[0];
  if (d.k === "again" && m.phase === "over" && !m.res?.broke) { deal(ctx, s, m); s.mj = { ...m }; return; }
  if (m.phase === "claim" && d.k === "claim" && m.claim) {
    const c = d.c === "chi" ? m.claim.opts.find((o) => o.k === "chi" && o.tiles.join() === String(d.tiles ?? "")) : d.c === "pass" ? { k: "pass" } : m.claim.opts.find((o) => o.k === d.c);
    if (c) resolve(ctx, s, m, c);
  } else if (m.phase === "turn" && m.turn === 0) {
    if (d.k === "draw" && !m.mustDisc) {
      if (!m.wall.length) exhaust(ctx, s, m);
      else { const t = m.wall.shift(); me.hand = sortHand([...me.hand, t]); m.mustDisc = true; m.drawn = { q: 0, at: now, t }; m.msg = isWin(me.hand) ? "That's a winning hand! Call mahjong." : "Discard a tile."; snd(ctx, CLACK, 0.5); }
    } else if (d.k === "win" && m.mustDisc && isWin(me.hand)) win(ctx, s, m, 0, true, m.drawn?.t, null);
    else if (d.k === "disc" && m.mustDisc) {
      const i = me.hand.indexOf(String(d.t)); if (i < 0) return;
      me.hand.splice(i, 1); m.mustDisc = false; m.drawn = null; m.turnAt = 0; m.nagged = false; afterDiscard(ctx, m, 0, String(d.t));
    }
  }
  s.mj = { ...m };
}

export function update(ctx) {
  const s = ctx.self.state, m = s.mj, now = ctx.now();
  if (!m) { // the game was put away (closed, or cleared from outside): send the guests off and stand up
    if (ctx.self.session.mjLive) { ctx.self.session.mjLive = false; const tb = table(ctx); if (tb?.state?.mjGuests) tb.state.mjGuests = { ...tb.state.mjGuests, leaving: true, leaveAt: now }; if (s.sit && s.sit.phase !== "up") standUp(ctx); }
    return;
  }
  if (m.lobby) { lobby(ctx, s); return; }
  if (!m.seats) return;
  if (!ctx.self.session.mjLive) { s.mj = null; return; } // a table left from another visit
  if (!s.sit || s.sit.phase === "up") { leave(ctx, s); return; } // standing up leaves the game
  if (now - (m.beatAt ?? 0) > 1000) { m.beatAt = now; const tb = table(ctx); if (tb?.state?.mjGuests) tb.state.mjGuests = { ...tb.state.mjGuests, beat: now }; }
  const r0 = m.rev;
  step(ctx, s, m);
  if (m.rev !== r0 || m.beatAt === now) s.mj = { ...m };
}
