// Level 132 · barter by collections (no coin, ever). Savi's picks throughout.
// player.state.l132 = { bag: { <cat>: n }, col: [<cat>...], gift: true, dukeCurious }
//   bag: loose trade goods by category; col: categories the player has kept a piece of (their own collection).
// A stall's keeper parts with a ware for the ONE category their own shelf lacks (WANTS). A newcomer's first ware is a gift.
// Wares are pressed (lane: l132-stalls emits "l132:barter" { by, ware }); dialogue offers call offer(ctx, p, npcId).
export const CATS = ["pottery", "phones", "remedies", "records", "spices", "computers", "hats", "fruit"];
export const WANTS = { fruit: "records", records: "hats", hats: "fruit", pottery: "spices", spices: "remedies", remedies: "pottery", phones: "computers", computers: "phones" };
export const NAMES = { pottery: "an urn", phones: "a phone", remedies: "a tonic", records: "a record", spices: "a pouch of spice", computers: "a cartridge", hats: "a hat", fruit: "an apple" };
const RESTOCK_MS = 90000; // stores restock by themselves
export const bookOf = (s) => (s.l132 ??= { bag: {}, col: [] });
const tell = (ctx, p, text) => { p.state.notice = { text, at: ctx.now() }; };
const put = (b, cat, n) => ({ ...b, bag: { ...b.bag, [cat]: Math.max(0, (b.bag?.[cat] ?? 0) + n) } });
export const holds = (s, cat) => (s.l132?.bag?.[cat] ?? 0) > 0;
export const pieces = (s) => (s.l132?.col ?? []).length;
function takeWare(ctx, w) { w.visible = false; w.state = { ...w.state, goneAt: ctx.now() }; }
export function barter(ctx, { by, ware }) {
  const p = ctx.place.players.find((q) => q.id === by), w = ctx.getObject(ware);
  if (!p || !w || w.state?.goneAt) return;
  const cat = w.state?.l132ware?.cat; if (!CATS.includes(cat)) return;
  let b = bookOf(p.state); const want = WANTS[cat];
  if (!b.gift) { b = { ...put(b, cat, 1), gift: true }; p.state.l132 = b; takeWare(ctx, w); return tell(ctx, p, `"First time in Lumiria? Take it. Everyone's first piece is a gift." You have ${NAMES[cat]}.`); }
  if (!holds(p.state, want)) return tell(ctx, p, `"Lovely, isn't it? My shelf is missing ${NAMES[want]}. Bring me one and it's yours."`);
  b = put(put(b, want, -1), cat, 1); p.state.l132 = b; takeWare(ctx, w);
  ctx.emit("playSound", { clip: "cdn/sfx-small-wooden-object-set-down-on-market-counter.mp3", position: w.feetPosition, volume: 0.6 });
  tell(ctx, p, `Traded ${NAMES[want]} for ${NAMES[cat]}.`);
}
// keep one piece of a category for good: it leaves the bag and joins the player's own collection
export function keep(ctx, p, cat) {
  const b = bookOf(p.state); if (!holds(p.state, cat) || b.col.includes(cat)) return false;
  p.state.l132 = { ...put(b, cat, -1), col: [...b.col, cat] }; tell(ctx, p, `Added ${NAMES[cat]} to your collection (${b.col.length + 1} of ${CATS.length}).`); return true;
}
// the Duke inspects what you carry: he trades a spare for any category you lack, once per look
export function dukeOffer(ctx, p) {
  const b = bookOf(p.state), have = CATS.filter((c) => holds(p.state, c)), lack = CATS.filter((c) => !holds(p.state, c) && !b.col.includes(c));
  if (!have.length) return "Nothing to trade? Then let me simply admire your pockets. Come back with a treasure.";
  if (!lack.length) return "Magnificent. You lack nothing I could offer. Almost nothing.";
  const give = have[0], get = lack[0];
  p.state.l132 = put(put(b, give, -1), get, 1);
  return `Oh, ${NAMES[give]}! I have nine hundred, and I want yours. Here: ${NAMES[get]}, from my own sleeve. A fair trade!`;
}
export function tick(ctx) { // restock
  const now = ctx.now();
  for (const w of ctx.query({ tags: ["usable"], center: { x: 0, y: 0, z: 0 }, radius: 30 })) if (w.state?.goneAt && now - w.state.goneAt > RESTOCK_MS) { w.visible = true; w.state = { ...w.state, goneAt: null }; }
}
