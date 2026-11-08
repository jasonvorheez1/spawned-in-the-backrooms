// Host-owned verification, not a mod author's account or an editable Co-op preference.
const PATH = "scripts/lib/data/worldwright-owner.json";
export function actorId(raw) { return String(raw || "").replace(/^actor:/, ""); }
export function cleanName(raw) { return String(raw || "").trim().replace(/^@/, "").toLowerCase(); }
export function worldKey(raw) { return String(raw || "").replace(/^world:/, "").replace(/-/g, "").toLowerCase(); }
export function read(api) {
  try {
    const world = worldKey(api.world.id);
    if (!/^[a-f0-9]{32}$/.test(world)) return null;
    const raw = api.files.read(PATH);
    const row = typeof raw === "string" ? JSON.parse(raw) : null;
    if (!row || worldKey(row.worldId) !== world || !/^pa_[a-f0-9]{32}$/.test(actorId(row.userId))) return null;
    return { worldId: world, userId: actorId(row.userId), username: cleanName(row.username), address: String(row.address || "") };
  } catch (_) { return null; }
}
export function isOwner(api, userId) {
  const owner = read(api);
  return !!(owner && userId && owner.userId === actorId(userId));
}
export function protectedName(api, name) {
  const owner = read(api);
  return !!(owner && owner.username && owner.username === cleanName(name));
}
// 6.0: a player or query row is the entity's handle, and reading a dot it does not carry throws. Probe first.
export function field(row, key) {
  try { return row && typeof row === "object" && key in row ? row[key] : undefined; } catch (_) { return undefined; }
}
export function rowId(row) { return String(field(row, "id") || field(row, "entityId") || field(row, "playerId") || ""); }
// 6.0: a player's name is displayName; .name on a handle is the ENTITY's name, and .username throws.
export function rowName(row) { return String(field(row, "displayName") || ""); }
module.exports = { read, isOwner, protectedName, cleanName, worldKey, actorId, field, rowId, rowName };
