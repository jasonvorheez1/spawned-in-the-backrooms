// What Main Favi sees of the actual game, read fresh on every message: the design page, the look, the places, what stands in them, who's here.
const cut = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n) + "…" : s; };
function read(ctx, path) { try { return ctx.files?.read?.(path) ?? null; } catch { return null; } }
export function sight(ctx) {
  const w = ctx.world, out = [];
  out.push(`GAME: "${w.name || "untitled"}"${w.description ? " · " + w.description : ""} · mode ${w.mode ?? "dev"}`);
  const design = read(ctx, "design.md"); if (design) out.push("DESIGN.MD:\n" + cut(design, 3500));
  const told = (w.state?.favi?.asks?.history ?? []).filter((x) => x.a && x.a !== "(skipped)").slice(-12);
  if (told.length) out.push("WHAT THE CREATOR TOLD FAVI:\n" + told.map((x) => `- ${cut(x.q, 160)} → ${cut(x.a, 240)}`).join("\n"));
  const look = read(ctx, "scripts/lib/data/aesthetic.yml"); if (look) out.push("ART DIRECTION:\n" + cut(look.replace(/^#.*$/gm, "").trim(), 700));
  for (const [name, pl] of Object.entries(w.places ?? {})) {
    let rows = [];
    try { rows = ctx.query({ place: name, radius: 100000 }) ?? []; } catch { try { rows = ctx.query({ place: name }) ?? []; } catch {} }
    rows = rows.filter((r) => !String(r.id).startsWith("player/") && !(r.tags ?? []).some((t) => /^(presence|savi-|helper$|fx$)/.test(t)));
    const tags = {}; for (const r of rows) for (const t of r.tags ?? []) tags[t] = (tags[t] ?? 0) + 1;
    const ids = rows.slice(0, 40).map((r) => r.id).join(", ");
    const terrain = pl?.terrain?.kind ?? "?"; const hour = pl?.atmosphere?.timeOfDay;
    out.push(`PLACE ${name}: terrain ${terrain}${hour != null ? ", hour " + hour : ""}, ${rows.length} objects${Object.keys(tags).length ? " · tags " + Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, n]) => t + "×" + n).join(", ") : ""}${ids ? "\n  ids: " + ids : ""}`);
  }
  const players = (w.players ?? []).map((p) => p.displayName || p.id); out.push(`PLAYERS HERE NOW: ${players.join(", ") || "none"}`);
  const files = (w.files ?? []).filter((f) => !f.startsWith("mods/") && !f.startsWith("memory/") && !f.startsWith("history/"));
  out.push(`FILES (${files.length}): ${cut(files.join(", "), 1800)}`);
  const ui = read(ctx, "scripts/ui.js") ?? read(ctx, "ui.js"); if (ui) out.push("HUD (ui.js, head):\n" + cut(ui, 900));
  const st = w.state ?? {}; const keys = Object.keys(st).filter((k) => k !== "favi"); if (keys.length) out.push("WORLD STATE KEYS: " + keys.slice(0, 30).join(", "));
  const mods = [...new Set((w.files ?? []).filter((f) => f.startsWith("mods/") && f.endsWith("/mod.json")).map((f) => f.split("/")[1]))];
  if (mods.length) out.push("MODS INSTALLED: " + mods.join(", ") + (st.favi?.mods?.installed?.length ? " · picked by /mods: " + st.favi.mods.installed.map((m) => `${m.name} (${m.why ?? ""})`).join("; ") : ""));
  const forge = st.favi?.forge; if (forge?.order?.length) out.push("FORGE FILES: " + forge.order.map((id) => forge.files[id]?.title).filter(Boolean).join(", "));
  const refs = st.favi?.refs, set = refs?.active ? refs.styles?.[refs.active] : null;
  if (set) { const read1 = read(ctx, `memory/game/style-${refs.active}.md`); out.push(`ACTIVE ART STYLE (the creator's moodboard, ${(set.images ?? []).length} reference images): ${set.name}${read1 ? "\n" + cut(read1.replace(/^---[\s\S]*?---/, "").trim(), 500) : ""}\nKeep every visual suggestion on this style.`); }
  const kept = st.favi?.sparks?.kept ?? []; if (kept.length) out.push("IDEAS THE CREATOR KEPT: " + kept.slice(0, 8).map((x) => x.text).join(" | "));
  const rep = st.favi?.watch?.report; if (rep) out.push("FAVI'S LAST PLAYTEST READ: " + rep.summary + (rep.fixes?.length ? " fixes: " + rep.fixes.join(" | ") : ""));
  return out.join("\n\n");
}
