// TuneDB writer — rides the god rig. The Database tab sends ops here
// (sendAction "tunedb:op"); this reads the game's table files, applies the op,
// writes the files back as one commit, and sends the whole database to the tab.
import { DIR, idFromPath, pathOf, parse, serialize, applyOp, checkRefs } from "lib/db-core.js";
import { isTuneFile, parseTune, setTune, tuneOff, addRanges } from "lib/tune-core.js";

// Tune: every .yml under scripts/lib/data/ (not db/) is a page of knobs.
function tuneFiles(ctx) { return (ctx.world.files || []).filter((f) => isTuneFile(f) && !tuneOff(ctx.files.read(f))).sort(); }
function sendTune(ctx, file) {
  let doc; try { doc = parseTune(ctx.files.read(file), file); } catch (e) { doc = { file, desc: "", knobs: [], error: String(e && e.message || e) }; }
  ctx.emit("uiEvent", { name: "tunedb:tune", payload: { doc } }, { audience: "all" });
}

// Spoins: the world's buyables (world.config.yaml → buyables), one list.
function shopItems(ctx) {
  const b = ctx.world.buyables || {}; const out = [];
  for (const id of Object.keys(b)) {
    const r = b[id] || {};
    let owners = 0; for (const p of ctx.world.players || []) if (p.state && p.state.purchases && p.state.purchases[id]) owners++;
    out.push({ id, name: r.name || id, description: r.description || "", priceSpoins: r.priceSpoins | 0, once: !!r.once, onPurchase: r.onPurchase || "", imageUrl: r.imageUrl || "", ownersHere: owners });
  }
  return out.sort((a, b) => a.priceSpoins - b.priceSpoins || a.id.localeCompare(b.id));
}
function sendShop(ctx, extra) { ctx.emit("uiEvent", { name: "tunedb:shop", payload: Object.assign({ items: shopItems(ctx), live: ctx.world.mode }, extra || {}) }, { audience: "all" }); }
const SHOP_FIELDS = { name: "text", description: "text", priceSpoins: "int", once: "bool" };

function loadAll(ctx) {
  const tables = {}; const broken = [];
  for (const p of ctx.world.files || []) {
    const id = idFromPath(p); if (!id) continue;
    try { tables[id] = parse(ctx.files.read(p), id); } catch (e) { broken.push(p); }
  }
  return { tables, broken };
}

// One small event per table (a big single payload can be dropped on the way
// to the panel), then the index that tells the panel the order and which
// tables exist. On "hello" every table goes; after an edit only the changed ones.
function send(ctx, tables, broken, extra, only, tuneOnly) {
  const tune = tuneFiles(ctx);
  for (const f of tune) if (!tuneOnly ? !only : tuneOnly.includes(f)) sendTune(ctx, f);
  const list = Object.values(tables).sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
  for (const t of list) if (tuneOnly ? false : (!only || only.includes(t.id))) ctx.emit("uiEvent", { name: "tunedb:table", payload: { table: t } }, { audience: "all" });
  const index = list.map((t) => ({ id: t.id, rev: JSON.stringify(t).length + ":" + Object.keys(t.rows).length + ":" + t.fields.length }));
  ctx.emit("uiEvent", { name: "tunedb:index", payload: Object.assign({ index, tune, broken, links: checkRefs(tables).slice(0, 200), dir: DIR, at: ctx.now() }, extra || {}) }, { audience: "all" });
}

export function onInput(ctx, input) {
  const pressed = input.pressed || {};
  if (!pressed.op && !pressed["tunedb:op"]) return;
  const data = input.actionData || {};
  const op = data.op || data["tunedb:op"] || {};
  const { tables, broken } = loadAll(ctx);
  if (!op.kind || op.kind === "hello") { sendShop(ctx); return send(ctx, tables, broken, { nonce: op.nonce }); }
  if (op.kind === "shopSet") {
    const id = String(op.id || ""), field = String(op.field || ""), type = SHOP_FIELDS[field];
    const rec = (ctx.world.buyables || {})[id];
    if (!rec || !type) { sendShop(ctx, { error: "no-row", nonce: op.nonce }); return send(ctx, tables, broken, { error: "no-row", nonce: op.nonce }, [], []); }
    let v = op.value;
    if (type === "int") { v = Math.round(Number(v)); if (!Number.isFinite(v) || v < 1) v = 1; }
    else if (type === "bool") v = !!v; else v = String(v == null ? "" : v).slice(0, 200);
    let err = null;
    try { ctx.commit("Spoins: " + id + " " + field + " = " + v, () => { ctx.world.buyables[id][field] = v; }); } catch (e) { err = String(e && e.message || e); }
    sendShop(ctx, { nonce: op.nonce, error: err });
    return send(ctx, tables, broken, { nonce: op.nonce, error: err ? "shop" : undefined }, [], []);
  }
  if (op.kind === "tuneSet") {
    const file = String(op.file || "");
    if (!isTuneFile(file) || !(ctx.world.files || []).includes(file)) return send(ctx, tables, broken, { error: "no-file", nonce: op.nonce }, [], []);
    const r = setTune(ctx.files.read(file), file, Array.isArray(op.path) ? op.path : [], op.value);
    if (r.error) return send(ctx, tables, broken, { error: r.error, nonce: op.nonce }, [], [file]);
    ctx.commit("Tune: " + file.replace(/^scripts\/lib\/data\//, "") + " " + op.path.join(".") + " = " + r.value, () => ctx.files.write(file, r.text));
    return send(ctx, tables, broken, { nonce: op.nonce, tuned: { file, path: op.path } }, [], [file]);
  }
  if (op.kind === "tuneRanges") {
    // First run: write the guessed slider ranges into the files as real comments.
    const files = op.file ? [String(op.file)].filter((f) => tuneFiles(ctx).includes(f)) : tuneFiles(ctx);
    const out = []; let n = 0;
    for (const f of files) { const r = addRanges(ctx.files.read(f), f); if (r.count) { out.push([f, r.text]); n += r.count; } }
    if (out.length) ctx.commit("Tune: slider ranges written for " + n + " values in " + out.length + " files", () => { for (const [f, t] of out) ctx.files.write(f, t); });
    return send(ctx, tables, broken, { nonce: op.nonce, ranged: n }, [], out.map((x) => x[0]));
  }
  const res = applyOp(tables, op);
  if (res.error) return send(ctx, tables, broken, { error: res.error, nonce: op.nonce });
  if (res.changed.length || res.deleted.length) {
    ctx.commit("Database: " + op.kind + " " + (op.table || "") + (op.row ? "." + op.row : "") + (op.field ? "." + op.field : ""), () => {
      for (const id of res.changed) if (tables[id]) ctx.files.write(pathOf(id), serialize(tables[id]));
      for (const id of res.deleted) ctx.files.delete(pathOf(id));
    });
  }
  send(ctx, tables, broken, { select: res.select, nonce: op.nonce }, res.changed);
}
