// Favi's brain: rides the god rig. Every tab button lands here; everything lives in world.state.favi.
//   ui[playerId] = { view: "home"|"chat"|"forge"|"refs", open, edit, final }   (each editor's own screen)
//   log/typing/queue/conv: Main Favi's chat · forge: { files, order } · refs: { styles: { slug: { name, images[], at } }, active, pending }
import { MAX_LOG, GREETING, system, clean } from "lib/persona.js";
import { J, enqueue, clearChat } from "lib/brain.js";
import * as persona from "lib/sight.js";
import { CATALOG } from "lib/catalog.js";
import { startWatch, stopWatch, cancelWatch, maybeSpark, sparkOp, checkPlan } from "lib/extras.js";
import { nameFrom, blank, parsePlain, plainData, compactFile, fallbackPrompt, PRESETS, RATE_AXES, slug } from "lib/forge.js";

function S(ctx) {
  const s = ctx.world.state;
  if (!s.favi) s.favi = { log: [{ who: "favi", text: GREETING, at: ctx.now() }], typing: false, conv: 1 };
  const f = s.favi; f.ui ??= {}; f.forge ??= { files: {}, order: [] }; f.refs ??= { styles: {}, active: null, pending: null };
  return f;
}
const U = (ctx, pid) => { const f = S(ctx); return (f.ui[pid] ??= { view: "home" }); };
const uid = (ctx, p) => p + Math.floor(ctx.now()).toString(36) + Math.floor(ctx.random() * 1e4).toString(36);
const clip = (s, n) => String(s ?? "").slice(0, n);

// ---------- Main Favi ----------
// The chat's brain lives in lib/brain.js and runs on the favi-brain row on ONE machine: a press only drops the message into
// world.state.favi.inbox under its own id, so a press heard twice (two machines, a resend) is still one message.
function ask(ctx, text, n) { enqueue(ctx, text, n); }
function clear(ctx) { clearChat(ctx); }
// a timer armed by the old chat brain lands here and retires: the watchdog now lives in lib/brain.js faviTick
export function onFaviTypingTimeout() {}

// ---------- Forge Files ----------
const PROMPT_SCHEMA = { type: "object", required: ["prompt"], properties: { prompt: { type: "string" } } };
const RATE_SCHEMA = { type: "object", required: ["scores", "verdict", "good", "bad"], properties: {
  scores: { type: "object", required: RATE_AXES, properties: Object.fromEntries(RATE_AXES.map((k) => [k, { type: "integer", minimum: 0, maximum: 10 }])) },
  verdict: { type: "string" }, good: { type: "array", maxItems: 3, items: { type: "string" } },
  bad: { type: "array", maxItems: 4, items: { type: "object", required: ["point", "fix"], properties: { point: { type: "string" }, fix: { type: "string" } } } } } };
const CARD_SCHEMA = { type: "object", required: ["title", "hook", "points", "tag", "palette"], properties: { title: { type: "string" }, hook: { type: "string" }, tag: { type: "string" },
  points: { type: "array", maxItems: 3, items: { type: "string" } }, palette: { type: "array", maxItems: 3, items: { type: "string" } } } };
const head = (p) => `GAME IDEA: ${p.pitch}\nTITLE: ${p.title}\n\nDESIGN FILE:\n${compactFile(p)}`;

function forge(ctx, pid, a) {
  const f = S(ctx), fs = f.forge, u = U(ctx, pid), p = a.pid ? fs.files[a.pid] : null;
  switch (a.op) {
    case "import": {
      const id = uid(ctx, "g"); const file = parsePlain(id, String(a.text ?? ""), ctx.now());
      if (!file) { u.err = "that didn't read as Idea Forge plain data. in Idea Forge: Finalize → Plain Data → Copy, then paste it here."; return; }
      fs.files[id] = file; fs.order = [id, ...fs.order]; u.open = id; u.final = null; u.err = null; u.edit = null; return;
    }
    case "new": {
      const pitch = String(a.pitch ?? "").trim(); if (!pitch) { u.err = "give it one sentence first."; return; }
      const id = uid(ctx, "g"); fs.files[id] = blank(id, pitch, ctx.now()); fs.order = [id, ...fs.order]; u.open = id; u.final = null; u.err = null; u.tab = "build";
      askQuestions(ctx, fs.files[id]); return;
    }
    case "fromGame": {
      const id = uid(ctx, "g"); const nm = String(ctx.world.name || "").trim();
      fs.files[id] = blank(id, nm ? `${nm}, as it stands` : "this game, as it stands", ctx.now()); fs.files[id].title = nm || "Create from game"; fs.files[id].fromGame = true;
      fs.order = [id, ...fs.order]; u.open = id; u.final = null; u.err = null; u.edit = null; u.tab = "build";
      fromGame(ctx, fs.files[id]); return;
    }
    case "tab": u.tab = a.tab === "file" ? "file" : "build"; return;
    case "ask": if (p && !p.busy) askQuestions(ctx, p); return;
    case "answer": if (p && !p.busy) submitAnswers(ctx, p, a.answers ?? {}); return;
    case "suggest": if (p && !p.busy) submitSuggestion(ctx, p, a.text); return;
    case "open": if (p) { u.open = p.id; u.final = null; u.edit = null; u.err = null; u.tab = p.questions?.length || p.busy ? "build" : (u.tab ?? "build"); } return;
    case "close": u.open = null; u.final = null; u.edit = null; u.err = null; return;
    case "delete": if (p) { delete fs.files[p.id]; fs.order = fs.order.filter((x) => x !== p.id); u.open = null; u.final = null; } return;
    case "edit": u.edit = a.fid ?? null; return;
    case "save": {
      if (!p) return; u.edit = null;
      for (const c of p.cats) for (const fl of c.fields) if (fl.id === a.fid) { fl.value = String(a.value ?? ""); if (/^title$/i.test(fl.label) && fl.value.trim()) p.title = fl.value.trim().split("\n")[0]; }
      if (a.fid === "pitch") p.pitch = String(a.value ?? "");
      fs.files = { ...fs.files }; return;
    }
    case "finalize": if (p) { u.final = { kind: "menu" }; u.edit = null; } return;
    case "back": u.final = u.final && u.final.kind !== "menu" ? { kind: "menu" } : null; return;
    case "plain": if (p) u.final = { kind: "plain" }; return;
    case "prompt": if (p) makePrompt(ctx, u, p, PRESETS.find((x) => x[0] === a.preset) ?? PRESETS[0]); return;
    case "rate": if (p) rate(ctx, u, p); return;
    case "card": if (p) card(ctx, u, p); return;
    case "build": if (p) buildWithSavi(ctx, u, p); return;
    case "check": if (p) { u.final = { kind: "check" }; if (!p.check?.items || a.again) checkPlan(ctx, p); } return;
  }
}
// ---------- building a file with Favi: Idea Forge's loop. she asks 3-7 questions with suggested answers, your answers become rich field prose, she asks the next round ----------
const Q_SCHEMA = { type: "object", required: ["questions"], properties: { questions: { type: "array", minItems: 3, maxItems: 7, items: { type: "object", required: ["text", "category", "options"],
  properties: { text: { type: "string" }, category: { type: "string" }, options: { type: "array", maxItems: 4, items: { type: "string" } } } } } } };
const A_SCHEMA = { type: "object", required: ["updates", "newCategories"], properties: {
  updates: { type: "array", items: { type: "object", required: ["category", "field", "value"], properties: { category: { type: "string" }, field: { type: "string" }, value: { type: "string" } } } },
  newCategories: { type: "array", items: { type: "object", required: ["name", "fields"], properties: { name: { type: "string" },
    fields: { type: "array", items: { type: "object", required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } } } } } } } };
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const qlog = (p) => (p.history ?? []).map((h) => `Q: ${h.q}\nA: ${h.a}`).join("\n");
const BUSY_S = 110;
function busy(ctx, p, kind) { const tok = uid(ctx, "b"); p.busy = kind; p.busyTok = tok; p.error = null; ctx.after(BUSY_S, "onFaviBusyTimeout", { pid: p.id, tok }); return tok; }
function done(p, tok) { if (p.busyTok !== tok) return false; p.busy = null; p.busyTok = null; return true; }
export function onFaviBusyTimeout(ctx, a) { const p = S(ctx).forge.files[a.pid]; if (!p || p.busyTok !== a.tok) return; const k = p.busy; p.busy = null; p.busyTok = null;
  p.error = k === "game" ? "favi took too long reading your game. tap ask me, or delete this file and try again." : k === "questions" ? "favi took too long thinking. tap ask again." : "favi took too long writing that in. your words are still in the boxes, send again."; }
function sees(ctx) { try { return "\n\nTHE CREATOR'S LIVE SPAWN GAME (context only, may be unrelated to this file):\n" + persona.sight(ctx); } catch { return ""; } }
// ---------- Create from game: favi reads the plan so far (design.md, Codex's pages read as text, kept ideas, playtest) and what's built, then writes the file ----------
function planText(ctx) {
  const out = []; const rd = (path) => { try { return ctx.files?.read?.(path) ?? null; } catch { return null; } };
  const docs = (ctx.world.files ?? []).filter((x) => /^mods\/codex\/lib\/doc-[^/]+\.js$/.test(x)).sort();
  for (const d of docs) { const t = rd(d); if (t) out.push(`CODEX ${d.split("/").pop().replace(/^doc-|\.js$/g, "")}:\n${t.replace(/\\n/g, "\n")}`); }
  for (const x of ["GDD.md", "gdd.md", "plan.md", "PLAN.md"]) { const t = rd(x); if (t) out.push(`${x}:\n${t}`); }
  return out.join("\n\n");
}
const G_SCHEMA = { type: "object", required: ["pitch", "updates", "newCategories"], properties: { pitch: { type: "string" }, ...A_SCHEMA } };
function fromGame(ctx, p) {
  const tok = busy(ctx, p, "game"); let seen = ""; try { seen = persona.sight(ctx); } catch {}
  const plan = planText(ctx);
  J(ctx, "llm:generate", { conversationId: "favi-g:" + p.id + ":" + tok, model: "smart",
    system: "You read a creator's game as it stands right now (their written plan, design pages and what is actually built in the world) and write it into their design file, so the file IS their game plan so far. Fill every field the plan or the build answers. Where the plan and the build disagree, write the plan's intent and note what is built so far in a short 'built so far:' line. Leave a field empty when nothing answers it, never invent a feature. 'pitch' is the game in one or two plain sentences. " + WRITER,
    message: `CURRENT FILE:\n${compactFile(p)}\n\nTHE PLAN SO FAR:\n${plan || "(no written plan pages found)"}\n\nTHE GAME AS BUILT:\n${seen || "(could not read the world)"}`, schema: G_SCHEMA }, (r) => {
    const q = S(ctx).forge.files[p.id]; if (!q || !done(q, tok)) return;
    if (!apply(ctx, q, r)) { q.error = "favi couldn't read your game just now. tap ask me, or delete this file and try again."; return; }
    const pitch = String(r.data?.object?.pitch ?? "").trim(); if (pitch) q.pitch = pitch;
    q.history = [...(q.history ?? []), { q: "(created from the game and its plan)", a: `${q.lastRound?.fields ?? 0} fields written from the plan and the build` }];
    askQuestions(ctx, q);
  });
}
function askQuestions(ctx, p) {
  const tok = busy(ctx, p, "questions"); const n = 3 + Math.floor(ctx.random() * 5);
  J(ctx, "llm:generate", { conversationId: "favi-q:" + p.id + ":" + (p.round ?? 0) + ":" + tok, model: "smart",
    system: `You are Favi, a sharp, friendly game design interviewer, like a producer helping a creator turn an idea into a full design. Ask exactly ${n} questions tailored to THIS game idea. Aim at fields that are (empty) or thin first, most important first (core loop, win/lose, controls before polish). Never repeat or rephrase a question already in the log. Each question is short, concrete, one idea, plain language, specific to their game (name their mechanics, their setting). Give 2-4 suggested answers per question that are genuinely different directions, each a full sentence or two that paints how it would actually work or feel in THIS game, never a bare one-word label. Never use a semicolon inside a suggested answer. 'category' is the exact name of the category it fills, or a new category name if none fits. Ask what the MVP contains, never which build or phase it lands in.`,
    message: `GAME IDEA: ${p.pitch}\nTITLE: ${p.title ?? ""}\n\nCURRENT FILE:\n${compactFile(p)}\n\nQUESTION LOG:\n${qlog(p) || "(none yet)"}` + sees(ctx), schema: Q_SCHEMA }, (r) => {
    const q = S(ctx).forge.files[p.id]; if (!q || !done(q, tok)) return;
    const qs = r && r.ok ? r.data?.object?.questions : null;
    if (!Array.isArray(qs) || !qs.length) { q.error = "favi couldn't come up with questions. tap ask again."; return; }
    q.round = (q.round ?? 0) + 1;
    q.questions = qs.slice(0, n).map((x, i) => ({ id: "q" + q.round + "_" + i, text: String(x.text ?? ""), category: String(x.category ?? ""), options: (x.options ?? []).slice(0, 4).map((o) => String(o).replace(/;/g, ",")) }));
  });
}
const WRITER = "Write rich, descriptive values in the creator's intent: full design prose that says how it works and plays, with concrete examples, names and numbers that follow from what they said, never a terse restatement. Use the EXACT category and field names from the file. When a field already has text, return the full rewritten value that keeps what was there and adds the new info. Only when something introduces a topic no existing category covers (a crafting system, a boss roster), put it in newCategories with 2-5 fields. Never invent facts beyond small reasonable phrasing. Don't return fields you didn't change.";
function submitAnswers(ctx, p, answers) {
  const qa = (p.questions ?? []).map((q) => ({ q: q.text, cat: q.category, a: String(answers[q.id] ?? "").trim() })).filter((x) => x.a);
  if (!qa.length) { p.error = "answer at least one first."; return; }
  p.draft = answers; const tok = busy(ctx, p, "answers");
  J(ctx, "llm:generate", { conversationId: "favi-a:" + p.id + ":" + tok, model: "smart", system: "You write a game creator's answers into their design file. For each answer, update the field(s) it informs. " + WRITER,
    message: `GAME IDEA: ${p.pitch}\nTITLE: ${p.title}\n\nCURRENT FILE:\n${compactFile(p)}\n\nNEW ANSWERS:\n${qa.map((x) => `Q (${x.cat}): ${x.q}\nA: ${x.a}`).join("\n\n")}`, schema: A_SCHEMA },
    (r) => { const q = S(ctx).forge.files[p.id]; if (!q || !done(q, tok)) return; if (!apply(ctx, q, r)) { q.error = "favi couldn't read those. they're still in the boxes, send again."; return; }
      q.history = [...(q.history ?? []), ...qa.map((x) => ({ q: x.q, a: x.a }))]; q.answered = (q.answered ?? 0) + qa.length; q.questions = []; q.draft = null; askQuestions(ctx, q); });
}
function submitSuggestion(ctx, p, text) {
  const t = String(text ?? "").trim(); if (!t) { p.error = "write something first."; return; }
  const tok = busy(ctx, p, "suggest");
  J(ctx, "llm:generate", { conversationId: "favi-s:" + p.id + ":" + tok, model: "smart", system: "You write a game creator's own suggestion (something they want added or changed, not an answer) into their design file. Update every field it informs, replacing only what it clearly changes. " + WRITER,
    message: `GAME IDEA: ${p.pitch}\nTITLE: ${p.title}\n\nCURRENT FILE:\n${compactFile(p)}\n\nCREATOR'S SUGGESTION:\n${t}`, schema: A_SCHEMA },
    (r) => { const q = S(ctx).forge.files[p.id]; if (!q || !done(q, tok)) return; if (!apply(ctx, q, r)) { q.error = "favi couldn't fold that in. try again."; return; }
      q.history = [...(q.history ?? []), { q: "(creator's own suggestion)", a: t }]; });
}
function apply(ctx, p, r) {
  const o = r && r.ok ? r.data?.object : null; if (!o) return false;
  let n = 0; const added = [];
  const cat = (name) => { let c = p.cats.find((c) => norm(c.name) === norm(name)); if (!c) { c = { id: uid(ctx, "c"), name: String(name), fields: [] }; p.cats.push(c); added.push(c.name); } return c; };
  const fld = (c, label) => { let f = c.fields.find((f) => norm(f.label) === norm(label)); if (!f) { f = { id: uid(ctx, "f"), label: String(label), value: "" }; c.fields.push(f); } return f; };
  for (const x of o.updates ?? []) { const v = String(x.value ?? "").trim(); if (!v || !x.category || !x.field) continue; const f = fld(cat(x.category), x.field); f.value = v; f.glow = ctx.now(); n++;
    if (/^title$/i.test(f.label)) p.title = v.split("\n")[0]; }
  if (!p.title || p.title === "Untitled") p.title = nameFrom(p.pitch);
  for (const nc of o.newCategories ?? []) { if (!String(nc.name ?? "").trim()) continue; const c = cat(nc.name); for (const nf of nc.fields ?? []) { if (!String(nf.label ?? "").trim()) continue; const f = fld(c, nf.label); if (String(nf.value ?? "").trim()) { f.value = String(nf.value); f.glow = ctx.now(); n++; } } }
  p.lastRound = { fields: n, added, at: ctx.now() }; return true;
}

// ---------- Build it with Savi: the Savi-build prompt is forged (or reused) and handed to Savi, who builds it in this world ----------
function buildWithSavi(ctx, u, p) {
  p.prompts ??= {};
  const send = (q) => {
    q.sent = { at: ctx.now() };
    try { ctx.notifyDm(`favi: build "${q.title}" from the forge file. its build brief is world.state.favi.forge.files["${q.id}"].prompts.spawn (every field is in .cats). read it and build the game it describes.`, { wake: true }); } catch {}
  };
  if (p.prompts.spawn) { send(p); u.final = { kind: "sent" }; return; }
  const tok = uid(ctx, "t"); u.final = { kind: "sent", busy: true, tok };
  J(ctx, "llm:generate", { conversationId: "favi-forge-p:" + tok, model: "smart",
    system: "You turn a game design file into the prompt an AI builder will read to build it. " + PRESETS.find((x) => x[0] === "spawn")[3] + " Write in markdown. Never invent decisions the file doesn't make; mark them for the builder. Return the whole prompt in 'prompt'.",
    message: head(p), schema: PROMPT_SCHEMA }, (r) => {
    const q = S(ctx).forge.files[p.id]; if (!q) return;
    const text = r && r.ok ? String(r.data?.object?.prompt ?? "").trim() : "";
    q.prompts = { ...(q.prompts ?? {}), spawn: text || fallbackPrompt(q) };
    send(q);
    for (const v of Object.values(S(ctx).ui)) if (v.final?.tok === tok) v.final = { kind: "sent" };
  });
}

function makePrompt(ctx, u, p, preset) {
  const tok = uid(ctx, "t"); u.final = { kind: "prompt", preset: preset[0], busy: true, tok };
  p.prompts ??= {};
  ctx.after(100, "onFaviForgeTimeout", { pid: p.id, tok });
  J(ctx, "llm:generate", { conversationId: "favi-forge-p:" + tok, model: "smart",
    system: "You turn a game design file into the prompt an AI builder will read to build it. " + preset[3] + " Write in markdown. Never invent decisions the file doesn't make; mark them for the builder. Return the whole prompt in 'prompt'.",
    message: head(p), schema: PROMPT_SCHEMA }, (r) => {
    const text = r && r.ok ? String(r.data?.object?.prompt ?? "").trim() : "";
    const q = S(ctx).forge.files[p.id]; if (!q) return;
    q.prompts = { ...(q.prompts ?? {}), [preset[0]]: text || fallbackPrompt(q) };
    for (const v of Object.values(S(ctx).ui)) if (v.final?.tok === tok) v.final = { kind: "prompt", preset: preset[0], fallback: !text };
  });
}
export function onFaviForgeTimeout(ctx, payload) {
  const f = S(ctx); const q = f.forge.files[payload.pid];
  for (const v of Object.values(f.ui)) if (v.final?.tok === payload.tok && v.final.busy) {
    if (q) q.prompts = { ...(q.prompts ?? {}), [v.final.preset]: fallbackPrompt(q) };
    v.final = { kind: "prompt", preset: v.final.preset, fallback: true };
  }
}
function rate(ctx, u, p) {
  u.final = { kind: "rate" }; p.rating = { busy: true };
  J(ctx, "llm:generate", { conversationId: "favi-forge-r:" + uid(ctx, "r"), model: "smart",
    system: "You are a sharp, fair reviewer rating a game design file. Score 0-10 honestly (5 average, 8+ genuinely strong, thin files score low): hook, clarity (loop, goal, rules unambiguous), depth, originality, ready (a builder could start today). verdict: 1-2 plain sentences. good: 2-3 specific strengths quoting the file. bad: up to 4 weaknesses worst first, each with one concrete fix.",
    message: head(p), schema: RATE_SCHEMA }, (r) => {
    const q = S(ctx).forge.files[p.id]; if (!q) return; const o = r && r.ok ? r.data?.object : null;
    if (!o?.scores) { q.rating = { failed: true }; return; }
    const scores = {}; for (const k of RATE_AXES) scores[k] = Math.max(0, Math.min(10, Math.round(Number(o.scores[k]) || 0)));
    q.rating = { scores, overall: Math.round(RATE_AXES.reduce((n, k) => n + scores[k], 0) / RATE_AXES.length * 10), verdict: clip(o.verdict, 400),
      good: (o.good ?? []).slice(0, 3).map((x) => clip(x, 300)), bad: (o.bad ?? []).slice(0, 4).map((b) => ({ point: clip(b.point, 300), fix: clip(b.fix, 300) })) };
  });
}
function card(ctx, u, p) {
  u.final = { kind: "card" }; p.card = { busy: true };
  J(ctx, "llm:generate", { conversationId: "favi-forge-c:" + uid(ctx, "c"), model: "smart",
    system: "You write the pitch card for a game. title: its name (the file's title if set, max 4 words). hook: one punchy line under 14 words. points: exactly 3 selling points under 12 words, concrete to THIS game. tag: genre + platform in 2-5 words. palette: 3 hex colors #rrggbb: dark background, mid, bright accent, true to its mood.",
    message: head(p), schema: CARD_SCHEMA }, (r) => {
    const q = S(ctx).forge.files[p.id]; if (!q) return; const o = r && r.ok ? r.data?.object : null;
    if (!o?.title) { q.card = { failed: true }; return; }
    const hex = (c, d) => /^#[0-9a-f]{6}$/i.test(String(c ?? "").trim()) ? String(c).trim() : d;
    q.card = { title: clip(o.title, 60), hook: clip(o.hook, 200), tag: clip(o.tag, 60), points: (o.points ?? []).slice(0, 3).map((x) => clip(x, 160)),
      palette: [hex(o.palette?.[0], "#0d1b2a"), hex(o.palette?.[1], "#1b4965"), hex(o.palette?.[2], "#5fa8d3")] };
  });
}

// ---------- Reference Images ----------
// the tab can't reach the internet; Savi can. a request wakes her, she runs /style <name>: finds 10+ images, uploads them, writes them back here.
function refs(ctx, pid, a) {
  const f = S(ctx), r = f.refs, u = U(ctx, pid);
  if (a.op === "request") {
    const name = clip(String(a.style ?? "").trim(), 80); const key = slug(name); if (!key) { u.err = "type an art style first."; return; }
    r.pending = { key, name, at: ctx.now() }; r.active = key; u.err = null;
    try { ctx.notifyDm(`favi wants reference images for "${name}". run /style ${name}`, { wake: true }); } catch {}
    return;
  }
  if (a.op === "pick") { u.pick = a.key && a.url && !(u.pick?.key === a.key && u.pick?.url === a.url) ? { key: a.key, url: a.url } : null; return; }
  if (a.op === "more" && r.styles[a.key]) {
    const st = r.styles[a.key], like = (st.images ?? []).find((x) => (x.url ?? x) === a.url); if (!like) return;
    r.pending = { key: a.key, name: st.name, at: ctx.now(), like: like.url ?? like, avoid: (st.images ?? []).map((x) => x.url ?? x).filter((x) => x !== a.url) };
    r.active = a.key; u.pick = null; u.err = null;
    try { ctx.notifyDm(`favi wants more "${st.name}" images like ${like.url ?? like} (keep it, fewer like the rest). run /style ${st.name}`, { wake: true }); } catch {}
    return;
  }
  if (a.op === "use" && r.styles[a.key]) { r.active = a.key; return; }
  if (a.op === "forget") { const st = { ...r.styles }; delete st[a.key]; r.styles = st; if (r.active === a.key) r.active = null; if (r.pending?.key === a.key) r.pending = null; return; }
  if (a.op === "cancel") { r.pending = null; return; }
}

// ---------- Mod Market: browse the catalog; install / ask hand off to Savi and Main Favi ----------
// the current project: the newest Forge file (or the one open), plus design.md. its key changes when the plan does, and the market re-ranks.
export function projectOf(ctx, f, pid) {
  const fs = f.forge, id = f.ui?.[pid]?.open && fs.files[f.ui[pid].open] ? f.ui[pid].open : fs.order?.[0], p = id ? fs.files[id] : null;
  let design = ""; try { design = ctx.files?.read?.("design.md") ?? ""; } catch {}
  const text = [p ? `TITLE: ${p.title}\nPITCH: ${p.pitch}\n${compactFile(p)}` : "", design ? "DESIGN.MD:\n" + design : ""].filter(Boolean).join("\n\n");
  return { id, title: p?.title ?? "this game", text, key: `${id ?? "-"}:${p?.answered ?? 0}:${p?.title ?? ""}:${design.length}` };
}
const RANK_SCHEMA = { type: "object", required: ["ranked"], properties: { ranked: { type: "array", maxItems: 40, items: { type: "object", required: ["n", "score", "why"],
  properties: { n: { type: "string" }, score: { type: "integer", minimum: 0, maximum: 100 }, why: { type: "string" } } } } } };
function rank(ctx, pid) {
  const f = S(ctx), pr = projectOf(ctx, f, pid);
  if (!pr.text) { f.marketRank = { key: pr.key, at: ctx.now(), scores: {}, title: pr.title, empty: true }; return; }
  const tok = uid(ctx, "r"); f.marketRank = { ...(f.marketRank ?? {}), key: pr.key, busy: tok, title: pr.title };
  ctx.after(120, "onFaviRankTimeout", { tok });
  const list = CATALOG.map((m) => `${m.n}${m.p ? " (" + m.p + " spoins)" : ""}: ${m.g} {${(m.k ?? []).join(",")}}`).join("\n");
  J(ctx, "llm:generate", { conversationId: "favi-rank:" + tok, model: "smart",
    system: "You rank Spawn game-engine mods by how useful each would be to ONE specific game project. Read the project, then the mod list. Return the 40 most useful, best first: n = exact mod name, score 0-100 (90+ = this game clearly needs it, 60 = helps a real part of the plan, under 40 = loosely related), why = under 14 words, naming the part of THIS project it serves. Judge fit to the plan (genre, perspective, mode, systems, mood), not popularity. Paid mods only when nothing free does the job.",
    message: `PROJECT:\n${pr.text}\n\nMODS:\n${list}`, schema: RANK_SCHEMA }, (r) => {
    const g = S(ctx); if (g.marketRank?.busy !== tok) return;
    const o = r && r.ok ? r.data?.object : null; const scores = {}; const names = new Set(CATALOG.map((m) => m.n));
    for (const x of o?.ranked ?? []) if (names.has(x.n)) scores[x.n] = { s: Math.max(0, Math.min(100, Math.round(Number(x.score) || 0))), why: clip(x.why, 140) };
    g.marketRank = { key: pr.key, at: ctx.now(), title: pr.title, scores, failed: !Object.keys(scores).length };
  });
}
export function onFaviRankTimeout(ctx, a) { const f = S(ctx); if (f.marketRank?.busy === a.tok) f.marketRank = { ...f.marketRank, busy: null, failed: true }; }

function market(ctx, pid, a) {
  const f = S(ctx), u = U(ctx, pid);
  if (a.op === "rank") { if (!f.marketRank?.busy) rank(ctx, pid); return; }
  if (a.op === "search") { u.q = clip(String(a.q ?? "").trim(), 60); u.mod = null; return; }
  if (a.op === "open") { u.mod = a.name ? clip(a.name, 60) : null; return; }
  if (a.op === "install" && a.name) {
    const name = clip(a.name, 60); f.modAsks = { ...(f.modAsks ?? {}), [name]: ctx.now() };
    try { ctx.notifyDm(`favi: the creator tapped install on the "${name}" mod. run spawn mod install ${name}, then tell them its main command.`, { wake: true }); } catch {}
    return;
  }
  if (a.op === "ask" && a.name) { u.view = "chat"; ask(ctx, `tell me what the ${clip(a.name, 60)} mod would do for this game, and how we'd use it`, "mod:" + (a.n ?? a.name)); return; }
}

// ---------- extras: playtest eyes, daily spark (lib/extras.js) ----------
function extra(ctx, pid, a) {
  const f = S(ctx);
  if (a.op === "watch") { const pl = [...(ctx.world.players ?? []), ...(ctx.place?.players ?? [])].find((x) => x.id === pid); startWatch(ctx, f, pl?.id ?? pid, pl?.displayName); return; }
  if (a.op === "stop") return stopWatch(ctx, f);
  if (a.op === "cancel") return cancelWatch(ctx, f);
  if (a.op === "spark") return sparkOp(ctx, f, a.what);
}
// the brain row the install places sits at the default place's origin: in a game whose creator plays in another place, or spawns
// past the world's 500 m tick bubble, it sleeps and nothing answers. every press checks its heartbeat and, when it's quiet,
// stands (or walks) a brain under the presser's feet in the place they're in. the lease in brain-runner.js keeps it one brain.
function ensureBrain(ctx, pid) {
  try {
    const f = S(ctx); if (f.beat && ctx.now() - (f.beat.at ?? 0) < 5000) return;
    const pl = [...(ctx.place?.players ?? [])].find((x) => x.id === pid) ?? ctx.place?.players?.[0];
    const at = pl?.feetPosition ?? ctx.self?.feetPosition ?? { x: 0, y: 0, z: 0 };
    const spot = { x: at.x, y: at.y - 40, z: at.z };
    const here = ctx.place?.objects?.["favi-brain"];
    if (here) { here.feetPosition = spot; return; }
    ctx.spawn("favi-brain", { template: "mods/favi/templates/brain.js#brain", feetPosition: spot });
    f.beat = { id: "favi-brain", at: ctx.now() - 3000 };
  } catch (e) { try { ctx.log("favi: couldn't stand her brain", String(e)); } catch {} }
}
export function onSpawn(ctx) { const f = S(ctx); ensureBrain(ctx, ctx.self?.controller); try { maybeSpark(ctx, f); } catch {} }
export function onInput(ctx, input) {
  const p = input.pressed ?? {}, d = input.actionData ?? {};
  const got = (k) => p[k] || p["favi:" + k] ? (d["favi:" + k] ?? d[k] ?? {}) : null;
  let a; const who = (x) => String(x?.me || ctx.self?.controller || "me");
  // the HUD bubble's relay rides every player body: only editors drive Favi. judged on the presser (by the panel's id) and god mode,
  // since a builder's body can read isEditor false in some worlds, which dropped every tap and left the tab on her doors
  { const me = String(Object.values(d).find((x) => x?.me)?.me ?? ""), pl = [...(ctx.world?.players ?? [])].find((x) => x.id === me) ?? ctx.self;
    if (pl?.isEditor === false && !pl?.isGodMode && !ctx.self?.isGodMode) return; }
  if (Object.keys(p).some((k) => p[k] && /^(favi:)?(nav|send|clear|retry|forge|refs|market|asks|extra)$/.test(k))) ensureBrain(ctx, String(Object.values(d).find((x) => x?.me)?.me ?? ctx.self?.controller ?? ""));
  if (a && a.hud != null) { const u = U(ctx, who(a)); u.hud = a.hud === "toggle" ? !u.hud : !!a.hud; if (a.view) u.view = a.view; return; }
  if (a) { const id = who(a), u = U(ctx, id); u.view = ["home", "chat", "forge", "refs", "market", "watch"].includes(a.view) ? a.view : "home"; u.err = null;
    if (u.view === "home") maybeSpark(ctx, S(ctx));
    if (u.view === "market") { const f = S(ctx); if (!f.marketRank?.busy && f.marketRank?.key !== projectOf(ctx, f, id).key) rank(ctx, id); } return; }
  if ((a = got("send"))) return ask(ctx, a.text, a.n);
  if ((a = got("clear"))) return clear(ctx);
  if ((a = got("retry"))) { const f = S(ctx); if (f.retry) enqueue(ctx, f.retry, "retry:" + (a.n ?? f.retry), true); return; }
  if ((a = got("forge"))) return forge(ctx, who(a), a);
  if ((a = got("refs"))) return refs(ctx, who(a), a);
  if ((a = got("market"))) return market(ctx, who(a), a);
  if ((a = got("extra"))) return extra(ctx, who(a), a);
}

