// cinemavault.js — READ-ONLY window onto the Absolute Cinema mod's cinema_clips table: SELECT id/name/saved_at, never a write. Leaf with ZERO requires: refs.js requires shoot.js which requires refs.js, so a require back the other way is a compile-time cycle. his db ruling: one SELECT per candidate bag, held on the CALLER's cache object, never in module memory.

const MOD_ID = "absolute-cinema";

export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function installed(objectApi) {
  try {
    const mods = objectApi && objectApi.getSpec ? objectApi.getSpec("mods") : null;
    if (!mods || typeof mods !== "object") return "";
    return text(mods[MOD_ID]);
  } catch (e) {
    return "";
  }
}

export function slug(v) {
  return text(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Latch on ABSENCE only, never on rows: until the mod saves its first clip there is no cinema_clips table and every probe pays a failing statement.
let missUntil = 0;
const MISS_TICKS = 1800;

export function tickOf(objectApi) {
  try {
    return objectApi && objectApi.getTick ? Number(objectApi.getTick()) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export async function clips(objectApi, cache) {
  if (!installed(objectApi)) return [];
  if (cache && cache.__cinemaclips) return cache.__cinemaclips.slice();
  const tick = tickOf(objectApi);
  if (missUntil && tick > 0 && tick < missUntil) {
    if (cache) cache.__cinemaclips = [];
    return [];
  }
  let rows = [];
  try {
    // The optional mod creates its vault on first save. Never query a table before it exists,
    // and never create a partner table ourselves just to make a read-only lens work.
    const table = await objectApi.sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cinema_clips'`;
    if (!table?.rows?.length) {
      if (tick > 0) missUntil = tick + MISS_TICKS;
      if (cache) cache.__cinemaclips = [];
      return [];
    }
    const res = await objectApi.sql`SELECT id, name, saved_at FROM cinema_clips ORDER BY name`;
    rows = (res && res.rows) || [];
    missUntil = 0;
  } catch (e) {
    if (tick > 0 && /no such table/i.test(text(e && e.message ? e.message : e))) missUntil = tick + MISS_TICKS;
    rows = [];
  }
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const id = text(rows[i].id);
    if (!id) continue;
    out.push({ id: id, name: text(rows[i].name) || id, savedAt: Number(rows[i].saved_at || 0) });
  }
  if (cache) cache.__cinemaclips = out;
  return out.slice();
}

export async function resolve(objectApi, token, cache) {
  const want = text(token).trim();
  if (!want) return null;
  const wl = want.toLowerCase();
  const ws = slug(want);
  const all = await clips(objectApi, cache);
  let bySlug = null;
  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (r.id === want) return r;
    if (r.name.toLowerCase() === wl) return r;
    if (!bySlug && (slug(r.id) === ws || slug(r.name) === ws)) bySlug = r;
  }
  return bySlug;
}

module.exports = {
  MOD_ID: MOD_ID,
  installed: installed,
  clips: clips,
  resolve: resolve,
  slug: slug,
};
