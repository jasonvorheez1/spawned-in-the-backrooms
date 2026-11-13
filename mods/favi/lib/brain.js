// Main Favi's brain. Runs on the mod's own favi-brain row (templates/brain.js, one host machine per room): faviTick drains the inbox, each message once by its id,
// asks the model, writes the reply. One llm:generate per message, stateless and whole: persona + the live game + the chat so far
// ride every call; she answers { reply, chips } (chips = Idea Forge's tap-to-send follow-ups). Every job string passes clean();
// a failed call retries once on the fast model; a reply that never comes frees "typing" after 80 s.
// persona.js (and the market catalog behind it) loads on the first message, never with the game's boot
let P = null, loading = false;
function want() { if (P || loading) return; loading = true; import("./persona.js").then((m) => { P = m; }).catch(() => {}).finally(() => { loading = false; }); }
const MAX_LOG = 60, GREETING = "hey, it's favi. i can see your game from here. what are we making?";
const clean = (s) => P ? P.clean(s) : String(s ?? "");
const CHAT_SCHEMA = { type: "object", required: ["reply", "chips"], properties: { reply: { type: "string" }, chips: { type: "array", maxItems: 3, items: { type: "string" } } } };
const clip = (s, n) => String(s ?? "").slice(0, n);
const deep = (v) => typeof v === "string" ? clean(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "schema" ? x : deep(x)])) : v;
export function J(ctx, kind, args, cb) { return ctx.job(kind, deep(args), cb); }
function F(ctx) { const s = ctx.world.state; s.favi ??= { log: [{ who: "favi", text: GREETING, at: ctx.now() }], typing: false, conv: 1 }; return s.favi; }
function push(f, who, text, now) { f.log = [...(f.log ?? []), { who, text, at: now }].slice(-MAX_LOG); }

// a press: drop it in the inbox under its id. the same id twice is the same message.
export function enqueue(ctx, text, n, isRetry = false) {
  const f = F(ctx), msg = clip(String(text ?? "").trim(), 1200); if (!msg) return;
  const id = String(n || "m" + Math.floor(ctx.now() / 1500) + ":" + msg.slice(0, 40));
  if ((f.seen ?? []).includes(id) || f.inbox?.[id]) return;
  f.inbox = { ...(f.inbox ?? {}), [id]: { text: msg, at: ctx.now(), retry: !!isRetry } };
  if (isRetry) f.retry = null;
}
// a press only asks for the clear; faviTick does it, on the same machine that writes replies, so a late reply can't land after it
export function clearChat(ctx) {
  const f = F(ctx); f.clearReq = (f.clearReq ?? 0) + 1;
  // wipe the screen in the same beat; the brain's doClear then retires any reply still in flight
  f.log = [{ who: "favi", text: "all clear. fresh page, what's up?", at: ctx.now() }]; f.typing = false; f.queue = []; f.inbox = {}; f.chips = []; f.retry = null;
}
function doClear(ctx) {
  const f = F(ctx);
  f.log = [{ who: "favi", text: "all clear. fresh page, what's up?", at: ctx.now() }]; f.typing = false; f.typingTok = null; f.queue = []; f.inbox = {}; f.chips = []; f.retry = null; f.lastErr = null; f.conv = (f.conv ?? 1) + 1;
}
function transcript(f) {
  return (f.log ?? []).slice(-17, -1).filter((m) => !/brain glitched|couldn't think|fresh page|connection dropped|took forever/.test(m.text)).map((m) => (m.who === "you" ? "CREATOR: " : "FAVI: ") + clip(m.text, 700)).join("\n");
}
let n = 0;
function run(ctx, msg, retry = false) {
  const f = F(ctx); f.pending = msg; const tok = "t" + Math.floor(ctx.now()).toString(36) + (n++).toString(36); f.typing = true; f.typingAt = ctx.now(); f.typingTok = tok;
  const hist = transcript(f);
  let sys = ""; try { sys = P.system(ctx, msg); } catch (e) { sys = "You are Favi from Idea Forge, a warm sharp game design buddy. Short lowercase replies."; }
  if (retry) sys = sys.slice(0, 9000);
  J(ctx, "llm:generate", { conversationId: "favi-chat:" + tok, model: retry ? "fast" : "smart", system: sys,
    message: (hist ? "THE CHAT SO FAR:\n" + hist + "\n\n" : "") + "CREATOR NOW: " + msg + "\n\nAnswer as Favi in `reply`. In `chips`, exactly 3 replies the creator might tap next, answering or following up on YOUR reply above: written in the creator's voice (first person, lowercase, 2-6 words), each a different direction (dig deeper, a different angle, a question back to you). If your reply asked a question, the chips are answers to it. Never commands about fixing, building or the Favi tool itself (no fix the hud, no build x first), never repeats of what was already said, never generic (no tell me more).",
    schema: CHAT_SCHEMA }, (r) => {
    const g = F(ctx); if (g.typingTok !== tok) return;
    const o = r && r.ok ? r.data?.object : null, text = String(o?.reply ?? "").trim();
    if (!text) {
      ctx.log("favi chat job failed", { retry, error: r?.error ?? null });
      if (!retry) return run(ctx, msg, true);
      g.lastErr = { at: ctx.now(), message: clip(r?.error?.message ?? "empty reply", 300) };
      push(g, "favi", "hm, my connection dropped twice. tap retry and i'll try that again.", ctx.now()); g.retry = msg;
    } else { push(g, "favi", text.replace(/```[a-z]*\n?/g, "").replace(/^#+\s*/gm, ""), ctx.now()); g.chips = (o.chips ?? []).map((c) => clip(String(c).trim(), 60)).filter(Boolean).slice(0, 3); g.retry = null; }
    g.typing = false; g.typingTok = null; g.pending = null; g.reasked = false;
  });
}
// brain-runner.js calls this every tick: the watchdog, then the next message in line
export function faviTick(ctx) {
  const f = ctx.world.state.favi; if (!f) return;
  if ((f.clearReq ?? 0) !== (f.clearDone ?? 0)) { f.clearDone = f.clearReq ?? 0; doClear(ctx); return; }
  if (f.typing && ctx.now() - (f.typingAt ?? 0) > 80000) {
    // the room closed mid-reply (everyone left) or the call hung: ask again once, on its own; a second miss offers retry
    const last = f.pending ?? (f.log ?? []).filter((m) => m.who === "you").slice(-1)[0]?.text ?? null;
    f.typing = false; f.typingTok = null;
    if (last && !f.reasked) { f.reasked = true; f.queue = [last, ...(f.queue ?? [])]; }
    else { f.reasked = false; push(f, "favi", "that one took forever, sorry. tap retry?", ctx.now()); f.retry = last; }
  }
  const ids = Object.keys(f.inbox ?? {});
  if (ids.length || (f.queue ?? []).length) want();
  if (!ids.length && (!(f.queue ?? []).length || f.typing || !P)) return;
  // land every new message in the log at once (so the creator sees it), but answer one at a time
  const fresh = ids.filter((id) => !(f.seen ?? []).includes(id)).sort((a, b) => f.inbox[a].at - f.inbox[b].at);
  if (fresh.length) {
    f.seen = [...(f.seen ?? []), ...fresh].slice(-60);
    for (const id of fresh) { const m = f.inbox[id]; if (!m.retry) push(f, "you", m.text, ctx.now()); f.queue = [...(f.queue ?? []), m.text]; }
    f.chips = [];
  }
  if (ids.length) f.inbox = {};
  if (!P) return;
  if (!f.typing && (f.queue ?? []).length) { const [next, ...rest] = f.queue; f.queue = rest; run(ctx, next); }
}
