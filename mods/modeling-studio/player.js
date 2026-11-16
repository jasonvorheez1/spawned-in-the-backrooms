import { DEV } from "./lib/dev.js";
import { reportText } from "./lib/joblog.js";
import { LIBRARY } from "./lib/library.js";
// Spawn 3D Modeling Studio outside god mode: M (or the 🎨 3D studio button) opens the studio panel on this player's
// screen. The panel's asks (paint, build 3D, show, turn, remove, cancel) land through god.js, which rides the player
// too. Build room only: every ask wakes Savi in her workshop, so the posted game never shows it.
export function onInput(ctx, input) {
  if (!input.pressed.studio || ctx.world.mode === "live") return;
  const op = input.actionData?.studio?.op;
  if (op === "view") return view(ctx, input.actionData.studio);
  if (op === "pvat") return pvat(ctx, input.actionData.studio);
  if (op === "takes") return takes(ctx, input.actionData.studio);
  if (op === "bug") return bug(ctx, input.actionData.studio);
  if (op === "inbox") return inbox(ctx);
  if (op === "share") return share(ctx, input.actionData.studio);
  if (op === "libget") return libGet(ctx, input.actionData.studio);
  if (op === "libadd") return libAdd(ctx, input.actionData.studio);
  if (op === "libdrop") return libDrop(ctx, input.actionData.studio);
  if (op === "librefresh") return libRefresh(ctx);
  if (op === "more") { ctx.self.state.studioGal = (Number(ctx.self.state.studioGal) || 40) + 40; return; }
  if (op === "less") { ctx.self.state.studioGal = Math.max(40, (Number(ctx.self.state.studioGal) || 40) - 40); return; }
  if (op === "bugdone") return bugDone(ctx, input.actionData.studio);
  if (op === "tkview") return tkview(ctx, input.actionData.studio);
  if (op === "pvreset") return pvReset(ctx);
  if (op === "unpreview") { try { preview(ctx, null); } catch (e) { ctx.log("m3d unpreview", String(e)); } if (ctx.self.state.studioPreview) pvReset(ctx); return; }
  if (op === "preview") return preview(ctx, input.actionData.studio.id);
  ctx.self.state.studioOpen = op === "close" ? false : op === "open" ? true : !ctx.self.state.studioOpen;
}

// the Preview Window: the picked gallery piece stands, in 3D, inside the window's open middle. Only this player's screen
// draws it (audience local), held in front of the camera. A pivot at the model's centre carries the orbit (yaw, pitch)
// and the zoom (depth); the model turns on its own until the player first drags it.
const DEPTH = 2.6, MIN = 1.5, MAX = 7;
function pivotAt(depth, lift = 0, at = null) { return { attach: "camera", x: (at?.x ?? 0) * depth / DEPTH, y: ((at?.y ?? -0.04) + lift) * depth / DEPTH, depth, fov: 50 }; } // at: the window's centre in camera metres at DEPTH, so the model stays in the window wherever it is dragged
function modelRow(it, spin) {
  return { audience: "local", castShadow: false, receiveShadow: false, feetPosition: { x: 0, y: -0.6, z: 0 },
    model: it.spec.model, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: 1.2, z: 0.6 } } },
    ...(spin ? { behavior: "mods/modeling-studio/turntable.js", state: { turn: it.turn ?? 0 } } : { rotation: it.turn ?? 0 }) };
}
function preview(ctx, id) {
  clearTakes(ctx, ctx.self.session);
  const S = ctx.self.session, it = id ? (ctx.world.state.m3d?.items ?? []).find((i) => i.id === id) : null;
  ctx.self.state.studioPreview = it ? it.id : null;
  if (S.pv) { if (ctx.getObject(S.pv)) ctx.destroy(S.pv); S.pv = null; }
  S.pvItem = it?.id ?? null; S.pvSpin = true;
  if (!it || it.kind !== "model" || !it.spec?.model) return;
  S.pv = ctx.spawn({ audience: "local", scope: "session", feetPosition: pivotAt(DEPTH, 0, S.pvAt), scale: S.pvAt?.k ?? 1, rotation: { yaw: 0, pitch: 0, roll: 0 }, tags: ["studio-preview"] });
  S.pvModel = ctx.spawn({ parent: S.pv, ...modelRow(it, true) });
}
function view(ctx, v) {
  const S = ctx.self.session;
  if (S.tk?.length) { for (const t of S.tk) { const m = ctx.getObject(t.m); if (!m) continue; if (t.spin) { ctx.destroy(t.m); t.m = ctx.spawn({ parent: t.p, ...takeRow(t.model, t.s, false) }); t.spin = false; } const mm = ctx.getObject(t.m); if (mm) mm.rotation = { yaw: v.reset ? 0 : Number(v.yaw) || 0, pitch: 0, roll: 0 }; const p = ctx.getObject(t.p); if (p) p.rotation = { yaw: 0, pitch: v.reset ? 0 : Math.max(-80, Math.min(80, Number(v.pitch) || 0)), roll: 0 }; } return; }
  const pv = S.pv && ctx.getObject(S.pv); if (!pv) return;
  const it = (ctx.world.state.m3d?.items ?? []).find((i) => i.id === S.pvItem); if (!it) return;
  if (v.reset) { destroyModel(ctx, S); S.pvModel = ctx.spawn({ parent: S.pv, ...modelRow(it, true) }); S.pvSpin = true; pv.rotation = { yaw: 0, pitch: 0, roll: 0 }; pv.feetPosition = pivotAt(DEPTH, 0, S.pvAt); return; }
  if (S.pvSpin && (v.yaw || v.pitch)) { destroyModel(ctx, S); S.pvModel = ctx.spawn({ parent: S.pv, ...modelRow(it, false) }); S.pvSpin = false; }
  const yaw = Number(v.yaw) || 0, pitch = Math.max(-80, Math.min(80, Number(v.pitch) || 0)), depth = Math.max(MIN, Math.min(MAX, Number(v.depth) || DEPTH));
  pv.rotation = { yaw: 0, pitch, roll: 0 }; pv.feetPosition = pivotAt(depth, Math.max(-1.2, Math.min(1.2, Number(v.lift) || 0)), S.pvAt); // the pivot tilts toward the eye, the model turns on its own upright
  const m = S.pvModel && ctx.getObject(S.pvModel); if (m) m.rotation = { yaw: (it.turn ?? 0) + yaw, pitch: 0, roll: 0 };
}
// a jammed Preview Window (Esc or ✕ pressed and it stays): wipe everything it stood on this screen and its session, then shut it
function pvReset(ctx) {
  const S = ctx.self.session;
  const ids = [S.pv, S.pvModel, ...(S.tk ?? []).flatMap((t) => [t?.r, t?.scr, t?.p, t?.m])].filter(Boolean);
  try { for (const r of ctx.query({ tags: ["studio-preview"], radius: 100000 }) ?? []) ids.push(r.id); } catch (e) { ctx.log("m3d pvreset query", String(e)); }
  for (const id of new Set(ids)) { try { if (ctx.getObject(id)) ctx.destroy(id); } catch {} }
  S.pv = null; S.pvModel = null; S.pvItem = null; S.pvSpin = true; S.tk = null;
  ctx.self.state.studioPreview = null;
}
function destroyModel(ctx, S) { if (S.pvModel && ctx.getObject(S.pvModel)) ctx.destroy(S.pvModel); S.pvModel = null; }

// three takes of a Preview Window edit, side by side: each stands in its own window (the HUD measures the windows and
// sends where they sit on screen), turning, until the player picks one. Only this screen draws them.
function takeRow(model, s, spin) {
  return { audience: "local", castShadow: false, receiveShadow: false, feetPosition: { x: 0, y: -s / 2, z: 0 }, model,
    layout: { box: { min: { x: -s / 2, y: 0, z: -s / 2 }, max: { x: s / 2, y: s, z: s / 2 } } },
    ...(spin ? { behavior: "mods/modeling-studio/turntable.js", state: { turn: 0 } } : { rotation: 0 }) };
}
// each take is filmed on its own little stage high over the studio (only this screen holds it) and shown on a screen cut
// exactly to its window: the screen's edge is the window's edge, so a take zoomed or slid past it is simply cut off.
const STAGE_UP = 90, STAGE_GAP = 8;
function clearTakes(ctx, S) { for (const t of S.tk ?? []) for (const id of [t.r, t.scr]) if (id && ctx.getObject(id)) ctx.destroy(id); S.tk = null; }
function takes(ctx, d) {
  const S = ctx.self.session; clearTakes(ctx, S); ctx.log("m3d takes", { edit: d.edit, slots: d.slots });
  const e = (ctx.world.state.m3d?.edits ?? []).find((x) => x.id === d.edit), vs = e?.variants ?? [];
  if (S.pv) { if (ctx.getObject(S.pv)) ctx.destroy(S.pv); S.pv = null; }
  if (!e || !vs.length || !Array.isArray(d.slots)) return;
  const me = ctx.self.feetPosition;
  S.tk = d.slots.slice(0, 3).map((sl, i) => {
    const v = vs[i]; if (!v?.model?.id) return null;
    const s = 1, w = Math.max(0.05, Number(sl.w) || 0.6), h = Math.max(0.05, Number(sl.h) || 0.8);
    const wy = Number(sl.wy ?? sl.y) || 0, x = Number(sl.x) || 0;
    const fov = 40, dist = (s * 1.35 / 2) / Math.tan(fov / 2 * Math.PI / 180) * Math.max(1, (s * 1.0) / (s * 1.35 * (w / h)));
    const at = { x: Math.round(me.x) + (i - 1) * STAGE_GAP, y: Math.round(me.y) + STAGE_UP, z: Math.round(me.z) }; // a fixed stage in world space: the screen's eye is written in world space too, so it never hangs on a lookup
    const r = ctx.spawn({ audience: "local", scope: "session", feetPosition: { ...at }, rotation: 0, tags: ["studio-preview"],
      children: [
        { id: "back", audience: "local", feetPosition: { x: 0, y: 0, z: -3 }, primitive: { kind: "plane", width: 14, height: 14 }, anchor: "center", pivot: "center", material: { color: "#0b0f16", roughness: 1 }, castShadow: false, receiveShadow: false },
        { id: "key", audience: "local", feetPosition: { x: 1.2, y: 1.6, z: dist * 0.8 }, light: { kind: "point", color: "#fff3e0", intensity: 3, distance: 12 } },
        { id: "rim", audience: "local", feetPosition: { x: -1.5, y: 0.8, z: -1.2 }, light: { kind: "point", color: "#9fd8ff", intensity: 1.6, distance: 8 } },
      ] });
    const p = ctx.spawn({ parent: r, audience: "local", feetPosition: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0, pitch: 0, roll: 0 } });
    const scr = ctx.spawn({ audience: "local", scope: "session", tags: ["studio-preview"], castShadow: false, receiveShadow: false,
      feetPosition: { attach: "camera", x, y: wy, depth: DEPTH, fov: 50 }, primitive: { kind: "plane", width: w, height: h }, anchor: "center", pivot: "center",
      material: { color: "#ffffff", emissive: "#000000", roughness: 1, view: { camera: { eye: { x: at.x, y: at.y, z: at.z + dist }, aim: { ...at }, fov } } } });
    return { r, p, scr, at, i, m: ctx.spawn({ parent: p, ...takeRow(v.model, s, true) }), model: v.model, s, spin: true };
  }).filter(Boolean);
}

// one take's own view: orbit (the take turns upright, its pivot tilts), zoom (the pivot scales), lift (slides up and down): all on its stage, so its screen crops it
function tkview(ctx, v) {
  const S = ctx.self.session, t = S.tk?.[Number(v.n)];
  ctx.self.state.tkdiag = { n: Number(v.n), has: !!t, r: !!(t && ctx.getObject(t.r)), p: !!(t && ctx.getObject(t.p)), m: !!(t && ctx.getObject(t.m)), scr: !!(t && ctx.getObject(t.scr)), at: t?.at ?? null, me: ctx.self.feetPosition };
  if (!t) return;
  const p = ctx.getObject(t.p); if (!p) return;
  if (v.reset) { if (ctx.getObject(t.m)) ctx.destroy(t.m); t.m = ctx.spawn({ parent: t.p, ...takeRow(t.model, t.s, true) }); t.spin = true; p.rotation = { yaw: 0, pitch: 0, roll: 0 }; p.scale = 1; p.feetPosition = { x: 0, y: 0, z: 0 }; return; }
  if (t.spin && (v.yaw || v.pitch)) { if (ctx.getObject(t.m)) ctx.destroy(t.m); t.m = ctx.spawn({ parent: t.p, ...takeRow(t.model, t.s, false) }); t.spin = false; }
  const m = ctx.getObject(t.m); if (m && !t.spin) m.rotation = { yaw: Number(v.yaw) || 0, pitch: 0, roll: 0 };
  p.rotation = { yaw: 0, pitch: Math.max(-80, Math.min(80, Number(v.pitch) || 0)), roll: 0 };
  p.scale = Math.max(0.4, Math.min(3.5, Number(v.zoom) || 1));
  p.feetPosition = { x: 0, y: Math.max(-1.2, Math.min(1.2, Number(v.lift) || 0)), z: 0 };
}

// the Preview Window was moved or resized: the one model follows the window's centre and size
function pvat(ctx, d) {
  const S = ctx.self.session; S.pvAt = { x: Number(d.x) || 0, y: Number(d.y) || 0, k: Math.max(0.4, Math.min(2.5, Number(d.k) || 1)) };
  const pv = S.pv && ctx.getObject(S.pv); if (!pv) return;
  const fp = pv.feetPosition, depth = fp?.depth ?? DEPTH; pv.feetPosition = pivotAt(depth, 0, S.pvAt); pv.scale = S.pvAt.k;
}

// 🐞 report bug from the Preview Window: a row in world.state.m3d.bugs (10 newest) with the window's rect on the reporter's
// screen, the view, the note and the job log at that moment; Savi is woken to snap the reporter's frame, crop it to the
// rect (art/bug-snap.sh) and attach the screenshot as row.snap.
function bug(ctx, d) {
  const s = ctx.world.state.m3d; if (!s || !d) return;
  const it = (s.items ?? []).find((i) => i.id === d.id); if (!it) return;
  const n = (v) => Math.round(Number(v) || 0), who = String(ctx.self.displayName ?? "player").slice(0, 40);
  const id = "bug" + Math.round(ctx.now() / 1000);
  const row = { id, item: it.id, name: String(it.name ?? "").slice(0, 80), glb: it.spec?.model?.id ?? it.url ?? null, note: String(d.note ?? "").slice(0, 400),
    rect: (Array.isArray(d.rect) ? d.rect : []).slice(0, 4).map(n), vw: n(d.vw), vh: n(d.vh), dpr: Number(d.dpr) || 1,
    view: d.view && typeof d.view === "object" ? { yaw: n(d.view.yaw), pitch: n(d.view.pitch), depth: +(Number(d.view.depth) || 0).toFixed(2) } : null,
    tool: String(d.tool ?? "").slice(0, 10), by: who, at: ctx.now(), date: ctx.world.date, jobs: (s.jobs ?? []).map((j) => `${j.order}:${j.status}`), log: reportText(s.jobs ?? [], `world ${ctx.world.id}`).slice(0, 6000),
    snap: typeof d.snap === "string" && d.snap.startsWith("/cdn/") ? d.snap.slice(0, 200) : null, snapErr: d.snapErr ? String(d.snapErr).slice(0, 120) : undefined };
  s.bugs = [row, ...(s.bugs ?? []).filter((b) => b.item !== it.id || b.by !== who)].slice(0, 10);
  // to the developer: a Spawn message on their bell (any world, moderated), and a row in this world's bug table
  const js = (s.jobs ?? []).map((j) => (j.status === "ok" ? "✓" : j.status === "failed" ? "✗" : "–")).join("") || "none";
  const lastErr = (s.jobs ?? []).find((j) => j.error)?.error;
  const text = `🐞 ${row.name || it.id}: ${row.note || "(no note)"} · ${id} · jobs ${js}${lastErr ? ` · last error: ${lastErr}` : ""} · world ${ctx.world.id}`.slice(0, 200);
  if (ctx.self.userId !== DEV.userId) ctx.job("mail:send", { to: DEV.userId, topic: "3D Studio bug report", text }, "onBugMailed", { id });
  else row.mailed = "you're the developer: it's in your inbox";
  ctx.sql`CREATE TABLE IF NOT EXISTS studio_bugs (id TEXT PRIMARY KEY, at INTEGER, by_user TEXT, by_name TEXT, item TEXT, name TEXT, note TEXT, data TEXT, snap TEXT, done INTEGER DEFAULT 0);
    INSERT OR REPLACE INTO studio_bugs (id, at, by_user, by_name, item, name, note, snap, data) VALUES (${id}, ${row.at}, @caller, ${who}, ${it.id}, ${row.name}, ${row.note}, ${row.snap}, ${JSON.stringify({ glb: row.glb, rect: row.rect, vw: row.vw, vh: row.vh, dpr: row.dpr, view: row.view, tool: row.tool, jobs: row.jobs, log: row.log, date: row.date })})`.catch((e) => ctx.log("studio_bugs insert", String(e)));
  if (row.snap) { ctx.notifyDm(`STUDIO BUG REPORT ${id} from ${who} on ${it.id} "${row.name}" · note: "${row.note || "(none)"}" · screenshot attached by the reporter's own client: ${row.snap}`, { wake: true }); return; }
  ctx.notifyDm(`STUDIO BUG REPORT ${id} (client capture failed: ${row.snapErr ?? "unknown"}) from ${who} on ${it.id} "${row.name}" · note: "${row.note || "(none)"}" · window rect ${row.rect.join(",")} css px on ${row.vw}x${row.vh} @${row.dpr}x · view yaw ${row.view?.yaw} pitch ${row.view?.pitch} depth ${row.view?.depth} · ` +
    `snap now: spawn player frame "${who}", spawn fetch its picture, bash art/bug-snap.sh /workspace/art/bugs/${id}-full.jpeg ${id} ${row.rect.join(" ")} ${row.vw} → upload URL, then set world.state.m3d.bugs row ${id} .snap = URL and UPDATE studio_bugs SET snap (or .failed = reason)`, { wake: true });
}

export function onBugMailed(ctx, r, { id }) {
  const b = (ctx.world.state.m3d?.bugs ?? []).find((x) => x.id === id); if (!b) return;
  b.mailed = r.ok ? `sent to the developer ${DEV.handle}` : `message not sent: ${r.error?.message ?? "unknown"}`;
}
// the developer's inbox: every report this world's table holds, newest 30, read into their own state for the panel
async function inbox(ctx) {
  if (ctx.self.userId !== DEV.userId) return;
  try {
    const { rows } = await ctx.sql`SELECT id, at, by_name, item, name, note, snap, done, data FROM studio_bugs ORDER BY at DESC LIMIT 30`;
    ctx.self.state.bugInbox = { open: true, rows: rows.map((r) => ({ ...r, data: undefined, ...(() => { try { const d = JSON.parse(r.data); return { view: d.view ?? null, log: d.log ?? null }; } catch { return { view: null, log: null }; } })() })) };
  } catch (e) { ctx.self.state.bugInbox = { open: true, rows: [], error: String(e).slice(0, 120) }; }
}
async function bugDone(ctx, d) {
  if (ctx.self.userId !== DEV.userId) return;
  if (d?.close) { if (ctx.self.state.bugInbox) ctx.self.state.bugInbox.open = false; return; }
  const id = String(d?.id ?? ""); const done = d?.done ? 1 : 0;
  try { await ctx.sql`UPDATE studio_bugs SET done = ${done} WHERE id = ${id}`; } catch {}
  return inbox(ctx);
}

// 🌐 the global library. the developer's share lands in lib/library.js straight away (it rides the next mod update to
// every world); anyone else's share waits in this world's m3d.shares and messages the developer.
const LIB_FILE = "mods/modeling-studio/lib/library.js";
function libRow(it, ctx) {
  return { id: "lib-" + String(it.id).replace(/^m-/, ""), name: String(it.name ?? it.prompt ?? "untitled").slice(0, 60), kind: it.kind === "image" ? "image" : "model",
    model: it.spec?.model ?? null, url: it.url ?? null, thumb: it.thumb ?? it.url ?? null, prompt: String(it.prompt ?? "").slice(0, 300),
    by: String(it.by ?? ctx.self.displayName ?? "").slice(0, 40), from: ctx.world.id, at: ctx.world.date };
}
function libRead(ctx) { const t = ctx.files.read(LIB_FILE) ?? ""; const m = t.match(/export const LIBRARY = (\[[\s\S]*\]);/); try { return m ? JSON.parse(m[1]) : []; } catch { return [...LIBRARY]; } }
function libWrite(ctx, rows) {
  const t = ctx.files.read(LIB_FILE) ?? "";
  const head = t.split("export const LIBRARY")[0] || "// 🌐 the Studio's global library\n";
  ctx.files.write(LIB_FILE, `${head}export const LIBRARY = ${JSON.stringify(rows, null, 1)};\n`);
  if (ctx.world.state.m3d) ctx.world.state.m3d.lib = { rows, at: ctx.now() };
}
// ↻ on the library: reads the library file as it stands now, so every panel here shows what was added since it loaded
function libRefresh(ctx) {
  const s = ctx.world.state.m3d; if (!s) return;
  const before = (s.lib?.rows ?? LIBRARY).length, rows = libRead(ctx);
  s.lib = { rows, at: ctx.now() };
  const n = rows.length - before;
  note(ctx, n > 0 ? `↻ ${n} new in the library` : `↻ library up to date · ${rows.length}`);
}
const note = (ctx, text) => { ctx.self.state.libNote = { text, at: ctx.now() }; };
function share(ctx, d) {
  const s = ctx.world.state.m3d; const it = (s?.items ?? []).find((i) => i.id === d?.id); if (!it) return;
  if (!(it.spec?.model?.id || it.url)) return note(ctx, "this card has nothing to share yet");
  const row = libRow(it, ctx);
  if (ctx.self.userId === DEV.userId) {
    const rows = libRead(ctx).filter((r) => r.id !== row.id); rows.push(row); libWrite(ctx, rows);
    s.shares = (s.shares ?? []).filter((r) => r.id !== row.id);
    return note(ctx, `🌐 ${row.name} is in the library. it reaches every world with the next studio update`);
  }
  if ((s.shares ?? []).some((r) => r.id === row.id) || LIBRARY.some((r) => r.id === row.id)) return note(ctx, `${row.name} is already shared`);
  s.shares = [{ ...row, asker: String(ctx.self.displayName ?? "").slice(0, 40) }, ...(s.shares ?? [])].slice(0, 30);
  const text = `🌐 share ${row.name} · ${row.model?.id ?? row.url} · world ${ctx.world.id}`.slice(0, 200);
  ctx.job("mail:send", { to: DEV.userId, topic: "3D Studio library share", text }, "onShareMailed", { id: row.id });
  note(ctx, `🌐 ${row.name} sent to the developer for the global library`);
}
export function onShareMailed(ctx, r, { id }) { const x = (ctx.world.state.m3d?.shares ?? []).find((y) => y.id === id); if (x) x.mailed = !!r.ok; }
function libGet(ctx, d) {
  const s = ctx.world.state.m3d; if (!s) return;
  const e = (s.lib?.rows ?? LIBRARY).find((r) => r.id === d?.id) ?? LIBRARY.find((r) => r.id === d?.id) ?? (s.shares ?? []).find((r) => r.id === d?.id); if (!e) return;
  const id = "m-" + e.id;
  if ((s.items ?? []).some((i) => i.id === id || i.library === e.id || "lib-" + String(i.id).replace(/^m-/, "") === e.id)) return note(ctx, `${e.name} is already in your gallery`);
  s.items = [...(s.items ?? []), { id, kind: e.kind, name: e.name, prompt: e.prompt, by: e.by, made: ctx.world.date, thumb: e.thumb, url: e.url ?? undefined,
    ...(e.model ? { spec: { model: e.model } } : {}), library: e.id, from: [], how: { tool: "🌐 global library", inputs: [e.from] } }];
  note(ctx, `＋ ${e.name} added to your gallery`);
}
function libAdd(ctx, d) { // developer: approve a waiting share, or add a model by its /cdn/ address from a share message
  if (ctx.self.userId !== DEV.userId) return;
  const s = ctx.world.state.m3d ?? {}; const rows = libRead(ctx);
  let row = (s.shares ?? []).find((r) => r.id === d?.id);
  if (!row && typeof d?.glb === "string") {
    const glb = d.glb.trim().match(/\/cdn\/[\w.\-]+\.(glb|png|jpe?g|webp)/)?.[0]; if (!glb) return note(ctx, "paste a /cdn/… address from the share message");
    const img = !glb.endsWith(".glb"), name = String(d.name ?? "").trim().slice(0, 60) || "shared model";
    row = { id: "lib-" + glb.slice(-20).replace(/\W/g, ""), name, kind: img ? "image" : "model", model: img ? null : { id: glb }, url: img ? glb : null, thumb: img ? glb : null, prompt: "", by: String(d.by ?? "").slice(0, 40), from: String(d.from ?? "").slice(0, 40), at: ctx.world.date };
  }
  if (!row) return;
  const { asker, mailed, ...clean } = row;
  libWrite(ctx, [...rows.filter((r) => r.id !== clean.id), clean]);
  s.shares = (s.shares ?? []).filter((r) => r.id !== clean.id);
  note(ctx, `🌐 ${clean.name} is in the library`);
}
function libDrop(ctx, d) { if (ctx.self.userId !== DEV.userId) return; libWrite(ctx, libRead(ctx).filter((r) => r.id !== d?.id)); note(ctx, "taken out of the library"); }
