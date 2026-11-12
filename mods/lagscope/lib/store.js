// LAGSCOPE database: the game's own SQL (one per world and mode), shared by every room and every builder.
//   lagscope_kv       k='cfg' the settings JSON every builder sees · k='hook' the Discord webhook (read only on builders' machines)
//   lagscope_reports  one row per report; posted 0 new · 2 posting · 1 posted; savi_at = when it went to Savi
// Reports always save here. Discord is a switch on top (off by default). Sent-to-Savi reports clear themselves after
// keepSentH hours (default 24), every report after keepDays (default 7), so the list only holds what is still new.
import { mergeBriefs, briefShort } from "./brief.js";
export const DEF = { discord: false, auto: true, yellow: true, red: 30, warn: 50, cap: 40, keepSentH: 24, keepDays: 7 };
const LIM = { red: [5, 120], warn: [5, 144], cap: [1, 200], keepSentH: [1, 168], keepDays: [1, 30] };
const LOGO = "https://spawn.co/cdn/value.ccb01738701e8e3bfd23ff30ff54855d321bc310a442d0e370e84960685d8dcd.png";
const FOOT = "LAGSCOPE · made by yui ♥";
const clip = (t, n) => { t = String(t ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
// the local player: ctx.self on the body, the local row of the room from the god rig
export const me = (ctx) => (ctx.self?.displayName != null && "isEditor" in ctx.self ? ctx.self : (ctx.world?.players || []).find((q) => q.isLocal) || ctx.self);
let schemaP = null, CFG = null, cfgAt = 0, cleanAt = 0, drainAt = 0, draining = false;

// 2.0: created straight away. The old probe (SELECT first, CREATE on the throw) worked but left a `no such table` fault
// in every fresh game's log; IF NOT EXISTS says the same with no fault.
export function schema(ctx) {
  return (schemaP ??= ctx.sql`CREATE TABLE IF NOT EXISTS lagscope_kv (k TEXT PRIMARY KEY, v TEXT); CREATE TABLE IF NOT EXISTS lagscope_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, uid TEXT, name TEXT, lv TEXT, trigger TEXT, score INTEGER, place TEXT, room TEXT, sig TEXT, data TEXT, text TEXT, posted INTEGER DEFAULT 0, savi_at INTEGER)`
    .catch((e) => { schemaP = null; throw e; }));
}
export function sane(c) {
  const o = { ...DEF, ...(c || {}) };
  for (const k of ["discord", "auto", "yellow"]) o[k] = !!o[k];
  for (const k in LIM) { const n = +o[k]; o[k] = Number.isFinite(n) ? Math.min(LIM[k][1], Math.max(LIM[k][0], Math.round(n))) : DEF[k]; }
  return o;
}
export async function cfg(ctx, force) {
  if (!force && CFG && Date.now() - cfgAt < 300000) return CFG;
  await schema(ctx);
  const r = await ctx.sql`SELECT v FROM lagscope_kv WHERE k = 'cfg'`;
  let c = {}; try { c = JSON.parse(r.rows?.[0]?.v || "{}"); } catch {}
  CFG = sane(c); cfgAt = Date.now(); return CFG;
}
export const cfgNow = () => CFG || DEF;
async function hook(ctx) { const r = await ctx.sql`SELECT v FROM lagscope_kv WHERE k = 'hook'`; return String(r.rows?.[0]?.v || ""); }
const say = (ctx, msg) => { ctx.session.lsMsg = { msg, at: Date.now() }; };

// the settings the panel shows: everything but the webhook, which shows only its last six characters
export async function publishCfg(ctx, force) {
  const c = await cfg(ctx, force), h = await hook(ctx);
  ctx.session.lsCfg = { ...c, tail: h ? h.slice(-6) : "", at: Date.now() };
}

// ---- one report row (any player's machine) ----
export async function insert(ctx, x) {
  await schema(ctx);
  const now = Date.now();
  if (x.auto) { // the same causes from the same player stay one row for 6 hours
    const seen = (await ctx.sql`SELECT 1 FROM lagscope_reports WHERE uid = ${x.uid} AND sig = ${x.sig} AND at > ${now - 6 * 3600000} LIMIT 1`).rows?.length;
    if (seen) return null;
  }
  const r = await ctx.sql`INSERT INTO lagscope_reports (at, uid, name, lv, trigger, score, place, room, sig, data, text, posted) VALUES (${now}, ${x.uid}, ${x.name}, ${x.lv}, ${x.trigger}, ${x.score}, ${x.place}, ${x.room}, ${x.sig}, ${JSON.stringify(x.data)}, ${clip(x.text, 14000)}, 0); SELECT last_insert_rowid() AS id`;
  const id = r.rows?.[r.rows.length - 1]?.id ?? null;
  if (me(ctx)?.isEditor) drain(ctx, true).catch(() => null);
  return id;
}

// ---- Discord: posted only from builders' machines, so the webhook never reaches a player's page ----
const COLOR = { bad: 0xff4d5e, warn: 0xffd166, manual: 0xffffff, ok: 0x9ae6b4 };
const TITLE = { bad: "🔴 RED", warn: "🟡 YELLOW", manual: "⚪ SENT FROM F3", ok: "🟢 SMOOTH AGAIN" };
function embed(r) {
  let d = {}; try { d = JSON.parse(r.data || "{}"); } catch {}
  const s = d.sum || {}, v = (a) => (a == null || a === "" ? "–" : String(a)), F = (name, value) => ({ name, value: "`" + v(value) + "`", inline: true });
  const fields = [F("FPS", s.fps), F("1% low", s.low1), F("Health", r.score != null ? r.score + "/100" : null), F("CPU", s.cpu != null ? s.cpu + " ms" : null), F("GPU", s.gpu != null ? s.gpu + " ms" : null), F("Stalls", s.stalls),
    F("Draws", s.draw), F("Tris", s.tri ? s.tri + "M" : null), F("Ping", s.ping != null ? s.ping + " ms" : null), F("Where", `${r.place}${d.pos ? " · " + d.pos.join(", ") : ""}`)];
  if (d.why?.length) fields.push({ name: "Where the lag is", value: clip(d.why.slice(0, 3).map((w, i) => `**${i + 1}.** ${w}`).join("\n"), 1024), inline: false });
  if (d.fix?.length) fields.push({ name: "Fix next", value: clip(d.fix.map((w) => `› ${w}`).join("\n"), 1024), inline: false });
  const e = { author: { name: clip(`${r.name}${r.trigger && r.trigger !== "auto" ? " · " + r.trigger : ""}`, 250), icon_url: LOGO }, title: clip(`${TITLE[r.lv] || r.lv} · ${s.fps != null ? s.fps + " fps" : "health " + (r.score ?? "?")}`, 250),
    color: COLOR[r.lv] ?? 0xffffff, fields, footer: { text: clip(`${FOOT} · ${d.game || ""} · report #${r.id}`, 2000) }, timestamp: new Date(r.at).toISOString() };
  if (r.lv === "manual" && r.text) e.description = "**paste this to Savi**\n```\n" + clip(String(r.text).replace(/```/g, "'''"), 3500) + "\n```";
  return { username: "LAGSCOPE", avatar_url: LOGO, embeds: [e] };
}
async function postTo(url, body) {
  if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return { ok: false, why: "not a discord webhook" };
  try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { ok: r.status >= 200 && r.status < 300, why: "discord said " + r.status }; }
  catch (e) { return { ok: false, why: String(e?.message || e).slice(0, 80) }; }
}
export async function drain(ctx, now) {
  if (!me(ctx)?.isEditor || draining || (!now && Date.now() - drainAt < 20000)) return;
  drainAt = Date.now(); draining = true;
  try {
    const c = await cfg(ctx); if (!c.discord) return;
    const url = await hook(ctx); if (!url) return;
    const t = Date.now(), sent = (await ctx.sql`SELECT COUNT(*) AS n FROM lagscope_reports WHERE posted = 1 AND at > ${t - 3600000}`).rows?.[0]?.n || 0;
    let room = c.cap - sent; if (room <= 0) return;
    const yl = c.yellow ? 1 : 0;
    const rows = (await ctx.sql`SELECT * FROM lagscope_reports WHERE posted = 0 AND at > ${t - 30 * 60000} AND (lv != 'warn' OR ${yl} = 1) ORDER BY CASE lv WHEN 'manual' THEN 0 WHEN 'bad' THEN 1 ELSE 2 END, id LIMIT 5`).rows || [];
    for (const r of rows) {
      if (room-- <= 0) break;
      const claim = await ctx.sql`UPDATE lagscope_reports SET posted = 2 WHERE id = ${r.id} AND posted = 0`; // two builders online never post one row twice
      if (claim.changes !== 1) continue;
      const res = await postTo(url, embed(r));
      await ctx.sql`UPDATE lagscope_reports SET posted = ${res.ok ? 1 : 0} WHERE id = ${r.id}`;
      if (!res.ok) { ctx.log("lagscope discord post failed", { id: r.id, why: res.why }); break; }
    }
  } finally { draining = false; }
}

// ---- housekeeping (builders' machines, once every 10 minutes and on every list) ----
export async function clean(ctx, force) {
  if (!force && Date.now() - cleanAt < 600000) return; cleanAt = Date.now();
  const c = await cfg(ctx), t = Date.now();
  await ctx.sql`DELETE FROM lagscope_reports WHERE (savi_at IS NOT NULL AND savi_at < ${t - c.keepSentH * 3600000}) OR at < ${t - c.keepDays * 86400000}`;
}

// ---- the panel's asks (builders only) ----
const LV = (l) => (["bad", "warn", "manual", "new"].includes(l) ? l : null);
export async function handle(ctx, a) {
  const p = me(ctx); if (!p?.isEditor || !a || typeof a !== "object") return;
  try {
    await schema(ctx);
    const op = a.op;
    if (op === "get") return publishCfg(ctx, true);
    if (op === "cfg") {
      const c = sane({ ...(await cfg(ctx, true)), ...(a.cfg || {}) });
      await ctx.sql`INSERT OR REPLACE INTO lagscope_kv (k, v) VALUES ('cfg', ${JSON.stringify(c)})`;
      CFG = c; cfgAt = Date.now(); await publishCfg(ctx); return say(ctx, "saved for every builder ✓");
    }
    if (op === "save") {
      const url = String(a.url || "").trim();
      if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url)) return say(ctx, "that's not a discord webhook link");
      await ctx.sql`INSERT OR REPLACE INTO lagscope_kv (k, v) VALUES ('hook', ${url})`; await publishCfg(ctx); return say(ctx, "webhook saved ✓ press send test");
    }
    if (op === "clear") { await ctx.sql`DELETE FROM lagscope_kv WHERE k = 'hook'`; await publishCfg(ctx); return say(ctx, "webhook cleared"); }
    if (op === "test") {
      const url = await hook(ctx); if (!url) return say(ctx, "no webhook saved yet");
      const r = await postTo(url, { username: "LAGSCOPE", avatar_url: LOGO, embeds: [{ color: 0xffffff, title: "LAGSCOPE is connected ✓", description: `${p.displayName} tested the webhook. Lag reports from this game land here.`, footer: { text: FOOT } }] });
      return say(ctx, r.ok ? "test sent ✓ check your channel" : "test failed: " + r.why);
    }
    if (op === "list") {
      await clean(ctx, true);
      const lv = LV(a.level), t = Date.now();
      const rows = (lv === "new" ? await ctx.sql`SELECT id, at, name, lv, score, place, data, posted, savi_at FROM lagscope_reports WHERE savi_at IS NULL ORDER BY id DESC LIMIT 30`
        : lv ? await ctx.sql`SELECT id, at, name, lv, score, place, data, posted, savi_at FROM lagscope_reports WHERE lv = ${lv} ORDER BY id DESC LIMIT 30`
        : await ctx.sql`SELECT id, at, name, lv, score, place, data, posted, savi_at FROM lagscope_reports ORDER BY id DESC LIMIT 30`).rows || [];
      const cnt = (await ctx.sql`SELECT lv, COUNT(*) AS n FROM lagscope_reports WHERE at > ${t - 86400000} GROUP BY lv`).rows || [];
      const un = (await ctx.sql`SELECT COUNT(*) AS n FROM lagscope_reports WHERE savi_at IS NULL AND lv != 'ok'`).rows?.[0]?.n || 0;
      const day = {}; for (const c of cnt) day[c.lv] = c.n;
      ctx.session.lsReports = { at: t, level: lv, day, unsent: un, rows: rows.map((r) => { let d = {}; try { d = JSON.parse(r.data || "{}"); } catch {}
        return { id: r.id, at: r.at, name: clip(r.name, 24), lv: r.lv, score: r.score, place: r.place, fps: d.sum?.fps ?? null, low1: d.sum?.low1 ?? null, why: (d.why || []).slice(0, 3).map((w) => clip(w, 140)), fix: (d.fix || []).slice(0, 2).map((w) => clip(w, 110)), posted: r.posted === 1, savi: r.savi_at || null }; }) };
      return;
    }
    if (op === "one") { const r = (await ctx.sql`SELECT id, text FROM lagscope_reports WHERE id = ${Number(a.id) || 0}`).rows?.[0]; ctx.session.lsReport = r ? { id: r.id, text: clip(r.text, 14000) } : null; return; }
    if (op === "wipe") { await ctx.sql`DELETE FROM lagscope_reports`; ctx.session.lsReports = { at: Date.now(), rows: [], day: {}, unsent: 0 }; return say(ctx, "reports cleared"); }
    if (op === "savi") return toSavi(ctx, LV(a.level));
  } catch (e) { say(ctx, "database error: " + String(e?.message || e).slice(0, 80)); ctx.log("lagscope error", { op: a.op, e: String(e?.message || e) }); }
}

// "send all to savi": every report not sent yet lands in the pressing builder's own Savi chat, causes grouped by how
// often they came up; those rows are marked sent and clear themselves after keepSentH hours
async function toSavi(ctx, lv) {
  const p = me(ctx), c = await cfg(ctx);
  const rows = (lv && lv !== "new" ? await ctx.sql`SELECT id, at, name, lv, place, data FROM lagscope_reports WHERE savi_at IS NULL AND lv = ${lv} ORDER BY id DESC LIMIT 40`
    : await ctx.sql`SELECT id, at, name, lv, place, data FROM lagscope_reports WHERE savi_at IS NULL AND lv != 'ok' ORDER BY id DESC LIMIT 40`).rows || [];
  if (!rows.length) return say(ctx, "nothing new to send. savi has every report");
  const tally = new Map(), fixes = new Map(), who = new Set(), places = new Map(), doers = new Map(), keys = new Map(), ais = []; let fpsSum = 0, fpsN = 0, game = "";
  for (const r of rows) { let d = {}; try { d = JSON.parse(r.data || "{}"); } catch {} who.add(r.name); places.set(r.place, (places.get(r.place) || 0) + 1); game ||= d.game || "";
    if (Number.isFinite(d.sum?.fps)) { fpsSum += d.sum.fps; fpsN++; }
    for (const w of d.why || []) { const k = String(w).replace(/[\d.]+/g, "#"); const t = tally.get(k) || { n: 0, ex: w }; t.n++; tally.set(k, t); }
    for (const w of d.fix || []) { const k = String(w).replace(/[\d.]+/g, "#"); const t = fixes.get(k) || { n: 0, ex: w }; t.n++; fixes.set(k, t); }
    for (const k of d.keys || []) keys.set(k, (keys.get(k) || 0) + 1);
    if (d.ai) ais.push(d.ai);
    for (const [k, v] of Object.entries(d.where || {})) if (!doers.has(k)) doers.set(k, v); }
  const top = [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 8), fx = [...fixes.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  const lo = rows[rows.length - 1].id, hi = rows[0].id;
  const msg = `LAGSCOPE${game ? " · " + game : ""}: ${p.displayName} sent ${rows.length} new lag report${rows.length > 1 ? "s" : ""} (#${lo}–#${hi}) from ${who.size} player${who.size > 1 ? "s" : ""}, avg ${fpsN ? Math.round(fpsSum / fpsN) : "?"} fps, places ${[...places].map(([k, n]) => k + "×" + n).join(", ")}.\nRANKED CULPRITS (impact summed over the reports; each row of lagscope_reports has data.ai with who, files, fix, code and check):\n${ais.length ? briefShort(mergeBriefs(ais), 5) : "none in these rows (saved before 2.0)"}\nWhere the lag is (times seen):\n${top.map((t) => `${t.n}× ${clip(t.ex, 160)}`).join("\n")}\nFixes suggested:\n${fx.map((t) => `${t.n}× ${clip(t.ex, 140)}`).join("\n")}\nCause keys: ${[...keys].sort((a, b) => b[1] - a[1]).map(([k, n]) => k + "×" + n).join(", ") || "none"}\nWho does it: ${[...doers].map(([k, v]) => k + ": " + clip(v, 120)).join(" · ") || "n/a"}\nFull rows: lagscope_reports in the game database (ids ${lo}–${hi}); they clear themselves ${c.keepSentH} h from now.\nFIX ALL LAG: find each cause in this game's files and fix every one, the most frequent first; then play where it lagged and say what changed and which report ids it answers. (/lagscope has the playbook.)`;
  try { ctx.notifyDm(clip(msg, 1990), { wake: true, savi: p.userId || p }); }
  catch (e) { return say(ctx, "couldn't reach savi: " + String(e?.message || e).slice(0, 60)); }
  const t = Date.now();
  if (lv && lv !== "new") await ctx.sql`UPDATE lagscope_reports SET savi_at = ${t} WHERE savi_at IS NULL AND lv = ${lv} AND id BETWEEN ${lo} AND ${hi}`;
  else await ctx.sql`UPDATE lagscope_reports SET savi_at = ${t} WHERE savi_at IS NULL AND lv != 'ok' AND id BETWEEN ${lo} AND ${hi}`;
  ctx.log("lagscope sent to savi", { n: rows.length, lo, hi });
  say(ctx, `sent ${rows.length} to savi ✓ they clear in ${c.keepSentH} h`);
  return handle(ctx, { op: "list", level: lv });
}
