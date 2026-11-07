// The Beverly Room's mahjong table, played. E at the table (scripts/l5-ball.js) seats you; three residents take the
// other chairs. You draw, then discard (click a tile); they play their turns by a simple greed. First to four sets and a
// pair wins. Stake: $1.00 from each player into the pot; you win the pot (Backdollars, player.state.cents). Savi's numbers.
import { fullSet, sortHand, isWin, worth } from "./lib/mahjong.js";
const STAKE = 100;              // cents a player puts in (Savi's pick)
const FALLBACK = ["Harlan", "Millie", "Brother Wat"];
const shuffle = (ctx, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(ctx.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const snd = (ctx, clip, v = 0.5) => ctx.emit("playSound", { clip, volume: v });
const CLACK = "cdn/moodboard-realistic-gritty/sfx-mahjong-tile-clack-on-felt-table.mp3";
function deal(ctx) {
  const s = ctx.self.state;
  if ((s.cents ?? 0) < STAKE) { s.mj = { msg: "You need $1.00 to sit in.", open: true }; return; }
  const near = ctx.query({ tags: ["npc"], radius: 14 }).filter((n) => !n.state?.dead && !(n.tags ?? []).some((t) => t === "l5staff" || t === "l5rat")).slice(0, 3);
  const names = [0, 1, 2].map((i) => (near[i]?.state?.name ?? FALLBACK[i]).split(" ·")[0]);
  const wall = shuffle(ctx, fullSet()), hands = [0, 1, 2, 3].map(() => wall.splice(0, 13));
  s.cents -= STAKE;
  s.mj = { open: true, names, hand: sortHand(hands[0]), ai: hands.slice(1), wall, disc: [[], [], [], []], turn: 0, drew: false, pot: STAKE * 4, msg: "Your turn: draw a tile.", over: false };
  snd(ctx, CLACK, 0.6);
}
function aiTurns(ctx, m) {
  for (let p = 1; p <= 3 && !m.over; p++) {
    if (!m.wall.length) { m.over = true; m.msg = "The wall's empty. A draw: everyone takes their dollar back."; ctx.self.state.cents += STAKE; return; }
    const h = m.ai[p - 1]; h.push(m.wall.shift());
    if (isWin(h)) { m.over = true; m.winner = p; m.reveal = sortHand(h); m.msg = `${m.names[p - 1]} calls mahjong and takes the pot.`; snd(ctx, "cdn/moodboard-realistic-gritty/sfx-tiles-swept-across-table-groan.mp3", 0.5); return; }
    let bi = 0, bw = Infinity; h.forEach((t, i) => { const rest = h.filter((_, k) => k !== i), w = worth(rest, t) + ctx.random() * 0.5; if (w < bw) { bw = w; bi = i; } });
    m.disc[p].push(h.splice(bi, 1)[0]);
  }
  if (!m.over) { m.turn = 0; m.drew = false; m.msg = "Your turn: draw a tile."; }
}
export function onInput(ctx, input) {
  if (!input.pressed.mj) return;
  const s = ctx.self.state, d = input.actionData?.mj ?? {}, m = s.mj;
  if (d.k === "close") { s.mj = null; return; }
  if (d.k === "deal") { deal(ctx); return; }
  if (!m || m.over || !m.hand) return;
  if (d.k === "draw" && !m.drew) {
    if (!m.wall.length) { m.over = true; m.msg = "The wall's empty. A draw: your dollar back."; s.cents += STAKE; s.mj = { ...m }; return; }
    const t = m.wall.shift(); m.hand = sortHand([...m.hand, t]); m.drew = true; m.last = t; m.msg = isWin(m.hand) ? "That's a winning hand! Call mahjong." : "Discard a tile.";
    snd(ctx, CLACK, 0.5);
  } else if (d.k === "win" && m.drew && isWin(m.hand)) {
    m.over = true; m.winner = 0; s.cents = (s.cents ?? 0) + m.pot; m.msg = `Mahjong! You take the pot: $${(m.pot / 100).toFixed(2)}.`;
    snd(ctx, "cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3", 0.6);
    ctx.emit("damageNumber", { position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 2 }, text: `+$${(m.pot / 100).toFixed(2)}`, color: "#9fcf8a", size: 1.3 });
  } else if (d.k === "disc" && m.drew) {
    const i = m.hand.indexOf(String(d.t)); if (i < 0) return;
    m.disc[0].push(m.hand.splice(i, 1)[0]); m.drew = false; snd(ctx, CLACK, 0.45);
    aiTurns(ctx, m);
  }
  s.mj = { ...m };
}
