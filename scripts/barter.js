// The barter table on the player (Shelly, Nov 15: "make bartering actually a barter thing"). Rules: scripts/lib/barter-deal.js.
// The Lumiria sim opens it (player.state.bt); every press after that is this player's own: sendAction('bt', { k, ... }).
import { deal, mine, RULES, offerOf, askOf } from "./lib/barter-deal.js";
import { skillsOf, attrsOf } from "./lib/stats.js";
const SND = { add: "cdn/sfx-small-wooden-object-set-down-on-market-counter.mp3", deal: "cdn/sfx-soft-bright-two-note-success-chime.mp3", no: "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3", coin: "cdn/moodboard-painterly-fantasy/sfx-market-haggle-handshake-cloth-rustle.mp3" };
const me = (ctx, clip, v = 0.55) => ctx.emit("playSound", { clip, volume: v }, { audience: { player: ctx.self.id } });
export function onInput(ctx, input) {
  if (!input.pressed?.bt) return;
  const s = ctx.self.state, bt = s.bt; if (!bt) return;
  const a = input.actionData?.bt ?? {};
  if (a.k === "leave") { s.bt = null; return; }
  if (a.k === "give" || a.k === "ungive") {
    const have = mine(s).find((m) => m.k === a.id)?.n ?? 0, cur = bt.give[a.id] ?? 0;
    const n = a.k === "give" ? Math.min(have, cur + 1) : Math.max(0, cur - 1);
    s.bt = { ...bt, give: { ...bt.give, [a.id]: n }, line: null }; me(ctx, SND.add, 0.35); return;
  }
  if (a.k === "take" || a.k === "untake") {
    const have = bt.stock[a.id] ?? 0, cur = bt.take[a.id] ?? 0;
    const n = a.k === "take" ? Math.min(have, cur + 1) : Math.max(0, cur - 1);
    s.bt = { ...bt, take: { ...bt.take, [a.id]: n }, line: null }; me(ctx, SND.add, 0.35); return;
  }
  if (a.k === "haggle") {
    if (bt.haggled) return;
    const sk = skillsOf(s)?.barter ?? 0, g = attrsOf(s)?.g ?? 5;
    const won = ctx.random() * 100 < sk * 0.6 + (g - 5) * 6 + (100 - RULES.haggle.dc);
    const ask = Math.max(0.85, bt.ask + (won ? -RULES.haggle.win : RULES.haggle.lose));
    s.bt = { ...bt, ask, haggled: true, line: won ? "Fine, fine. For you, a little less." : "Haggling? Now it costs more." };
    me(ctx, won ? SND.coin : SND.no); return;
  }
  if (a.k === "deal") {
    const r = deal(s, ctx.now());
    if (!r.ok) { s.bt = { ...bt, line: r.line }; me(ctx, SND.no, 0.4); return; }
    s.bt = { ...bt, stock: r.left, give: {}, take: {}, line: r.line };
    s.notice = { text: `Traded with ${bt.who}${r.took.phones ? " · phone works anywhere: M" : ""}`, at: ctx.now() };
    me(ctx, SND.deal, 0.6);
  }
}
export function update(ctx) { // walk away from the keeper and the table folds
  const s = ctx.self.state; if (!s?.bt) return ctx.sleep(1);
  const ses = ctx.self.session; if (ctx.now() - (ses.btAt ?? 0) < 500) return; ses.btAt = ctx.now();
  const k = s.bt.npc?.startsWith("l132-") ? ctx.getObject(s.bt.npc) : null, p = ctx.self.feetPosition;
  if (ctx.self.place !== "level132" || (k && Math.hypot(k.feetPosition.x - p.x, k.feetPosition.z - p.z) > 6)) s.bt = null;
}
export { offerOf, askOf };
