// js — the allow list and the deny list: who may open a shelf, and who may write on it. A shelf belongs to an AUTHOR (app-shell's shelfOwner), never to the room — several authors sit in one room and the room turns nobody away. only the allow list, the deny list and who's here; invite codes, access modes and session-joining are struck, so shelf and shelf_key are read-only remnants no writer fills. js requires nothing, so this leaf require can never make a cycle.
const SCHEMA = require("lib/schema.js");
const OWNER = require("lib/game-owner.js");

const MODES = { closed: 1, private: 1, open: 1 };
const DEFAULT_MODE = "private";

let ENSURED = false;

export function normalizeMode(raw) {
  return MODES[raw] ? String(raw) : DEFAULT_MODE;
}

export function cleanName(raw) {
  return String(raw == null ? "" : raw)
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

export function normalizeKey(raw) {
  const bare = String(raw == null ? "" : raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (bare.length !== 8) return bare ? bare : "";
  return bare.slice(0, 4) + "-" + bare.slice(4);
}

// his ruling (Aug 27): schema is the data dictionary — the five shelf tables' shape is SCHEMA.ensureShelf(); who may open a shelf is still decided here.
export async function ensure(objectApi) {
  if (ENSURED) return true;
  await SCHEMA.ensureShelf(objectApi);
  ENSURED = true;
  return true;
}

export function rowsOf(result) {
  return (result && result.rows) || [];
}

export async function mode(objectApi, ownerId) {
  await ensure(objectApi);
  const owner = String(ownerId || "");
  if (!owner) return DEFAULT_MODE;
  const row = rowsOf(await objectApi.sql`SELECT access FROM shelf WHERE ownerId = ${owner}`)[0];
  return row ? normalizeMode(row.access) : DEFAULT_MODE;
}

export async function list(objectApi, ownerId, listName) {
  await ensure(objectApi);
  const owner = String(ownerId || "");
  const which = listName === "deny" ? "deny" : "allow";
  if (!owner) return [];
  const rows = rowsOf(
    await objectApi.sql`SELECT name FROM shelf_access WHERE ownerId = ${owner} AND listName = ${which} ORDER BY name`
  );
  return rows.map((r) => String(r.name));
}

export async function onList(objectApi, ownerId, listName, name) {
  const owner = String(ownerId || "");
  const who = cleanName(name);
  if (!owner || !who) return false;
  const which = listName === "deny" ? "deny" : "allow";
  const row = rowsOf(
    await objectApi.sql`SELECT count(*) AS n FROM shelf_access WHERE ownerId = ${owner} AND listName = ${which} AND name = ${who}`
  )[0];
  return row ? Number(row.n) > 0 : false;
}

export async function denialReason(objectApi, ownerId, rawName, userId) {
  const name = cleanName(rawName), uid = String(userId || "");
  const owner = String(ownerId || "");
  if (uid && (uid === owner || OWNER.isOwner(objectApi, uid))) return "Ownership access cannot be denied.";
  const me = String(objectApi.userId || "");
  if (owner && owner === me && name && name === await whoAmI(objectApi)) return "You cannot deny yourself access to your own shelf.";
  const host = OWNER.read(objectApi);
  if (!host) return "Game ownership needs verification before a denial can be added. Ask Savi to check the game link.";
  if (OWNER.protectedName(objectApi, name)) return "The game owner always has access and cannot be denied.";
  return "";
}

// One list or the other, never both. Ownership never depends on either list.
export async function addName(objectApi, ownerId, listName, rawName) {
  const owner = String(ownerId || "");
  const name = cleanName(rawName);
  const which = listName === "deny" ? "deny" : "allow";
  if (!owner || !name) return false;
  if (which === "deny" && await denialReason(objectApi, owner, name)) return false;
  await ensure(objectApi);
  const other = which === "allow" ? "deny" : "allow";
  await objectApi.sql`
    DELETE FROM shelf_access WHERE ownerId = ${owner} AND listName = ${other} AND name = ${name};
    INSERT OR IGNORE INTO shelf_access (ownerId, listName, name, addedAt)
      VALUES (${owner}, ${which}, ${name}, unixepoch())`;
  if (which === "deny") {
    await objectApi.sql`DELETE FROM shelf_grant WHERE ownerId = ${owner} AND name = ${name}`;
  }
  return true;
}

export async function removeName(objectApi, ownerId, listName, rawName) {
  await ensure(objectApi);
  const owner = String(ownerId || "");
  const name = cleanName(rawName);
  const which = listName === "deny" ? "deny" : "allow";
  if (!owner || !name) return false;
  await objectApi.sql`DELETE FROM shelf_access WHERE ownerId = ${owner} AND listName = ${which} AND name = ${name}`;
  return true;
}

let RECORDED = false;
export async function recordMe(objectApi) {
  if (RECORDED) return true;
  await ensure(objectApi);
  let me = "";
  try {
    me = String(objectApi.userId || "");
  } catch (e) {
    me = "";
  }
  if (!me) return false;
  let raw = "";
  try {
    const got = objectApi.getUsername();
    raw = String(((got && typeof got.then === "function" ? await got : got) || "")).trim();
  } catch (e) {
    raw = "";
  }
  if (!raw) return false;
  await objectApi.sql`INSERT OR REPLACE INTO shelf_name (ownerId, name, seenAt) VALUES (${me}, ${raw}, unixepoch())`;
  RECORDED = true;
  return true;
}

export async function doors(objectApi, rawName) {
  await ensure(objectApi);
  const who = cleanName(rawName);
  if (!who) return [];
  const rows = rowsOf(
    await objectApi.sql`
      SELECT a.ownerId AS ownerId, COALESCE(n.name, '') AS name
        FROM shelf_access a LEFT JOIN shelf_name n ON n.ownerId = a.ownerId
       WHERE a.listName = 'allow' AND a.name = ${who}
       ORDER BY a.addedAt DESC`
  );
  return rows.map((r) => ({ ownerId: String(r.ownerId || ""), name: String(r.name || "") }));
}

export async function key(objectApi, ownerId) {
  await ensure(objectApi);
  const owner = String(ownerId || "");
  if (!owner) return "";
  // shelf_key is GONE (dropped 2026-08-30 — struck invite lane, 0 rows, no writer ever filled it). The answer it gave every caller was "" and that is now stated here instead of asked of a table that no longer exists. `owner` is read above so the argument contract is unchanged.
  return "";
}

export async function ownerOfKey(objectApi, offeredKey) {
  await ensure(objectApi);
  const k = normalizeKey(offeredKey);
  if (!k) return "";
  // Same cut: no shelf_key table, and no writer ever minted a code, so no offered key names an owner.
  return k ? "" : "";
}

export async function revoke(objectApi, ownerId, userId) {
  const owner = String(ownerId || "");
  const uid = String(userId || "");
  if (!owner || !uid || owner === uid || OWNER.isOwner(objectApi, uid)) return false;
  if (!OWNER.read(objectApi)) return false;
  await ensure(objectApi);
  await objectApi.sql`DELETE FROM shelf_grant WHERE ownerId = ${owner} AND userId = ${uid}`;
  return true;
}

export async function granted(objectApi, ownerId, userId) {
  await ensure(objectApi);
  const owner = String(ownerId || "");
  if (!owner) return false;
  const uid = String(userId || "");
  const row = uid
    ? rowsOf(await objectApi.sql`SELECT count(*) AS n FROM shelf_grant WHERE ownerId = ${owner} AND userId = ${uid}`)[0]
    : rowsOf(await objectApi.sql`SELECT count(*) AS n FROM shelf_grant WHERE userId = @caller AND ownerId = ${owner}`)[0];
  return row ? Number(row.n) > 0 : false;
}

// @caller is filled by the platform in a browser seat and cannot be spelled as somebody else; a HOST lane (run_script, a cron) has none and must hand in a who of its own.
export async function whoAmI(objectApi) {
  let name = "";
  try {
    const raw = objectApi.getUsername();
    name = raw && typeof raw.then === "function" ? await raw : raw;
  } catch (e) {
    name = "";
  }
  return cleanName(name);
}

export async function identity(objectApi, who) {
  if (who && (who.userId || who.name)) {
    return { id: String(who.userId || ""), name: cleanName(who.name), explicit: true };
  }
  let id = "";
  try {
    id = String(objectApi.userId || "");
  } catch (e) {
    id = "";
  }
  return { id: id, name: await whoAmI(objectApi), explicit: false };
}

export async function grantTo(objectApi, ownerId, caller) {
  const owner = String(ownerId || "");
  const name = String(caller.name || "");
  if (!owner) return;
  if (caller.explicit) {
    if (!caller.id) return;
    await objectApi.sql`INSERT INTO shelf_grant (ownerId, userId, name, grantedAt)
      VALUES (${owner}, ${caller.id}, ${name}, unixepoch())
      ON CONFLICT(ownerId, userId) DO UPDATE SET name = excluded.name`;
    return;
  }
  await objectApi.sql`INSERT INTO shelf_grant (userId, ownerId, name, grantedAt)
    VALUES (@caller, ${owner}, ${name}, unixepoch())
    ON CONFLICT(ownerId, userId) DO UPDATE SET name = excluded.name`;
}

export async function revokeCaller(objectApi, ownerId, caller) {
  const owner = String(ownerId || "");
  if (!owner) return;
  if (caller.explicit) {
    if (caller.id) {
      await objectApi.sql`DELETE FROM shelf_grant WHERE ownerId = ${owner} AND userId = ${caller.id}`;
    }
    if (caller.name) {
      await objectApi.sql`DELETE FROM shelf_grant WHERE ownerId = ${owner} AND name = ${caller.name}`;
    }
    return;
  }
  await objectApi.sql`DELETE FROM shelf_grant WHERE userId = @caller AND ownerId = ${owner}`;
}

// Ownership first, before SQL. Others: denial, existing grant, allow list, legacy mode/key. A refusal is a value.
export async function tryShelf(objectApi, ownerId, offeredKey, who) {
  const owner = String(ownerId || "");
  try {
    if (!owner) return { ok: false, reason: "unknown" };
    const caller = await identity(objectApi, who);
    if (caller.id && caller.id === owner) return { ok: true, reason: "mine" };
    if (OWNER.isOwner(objectApi, caller.id)) return { ok: true, reason: "game-owner" };
    await ensure(objectApi);

    if (caller.name && (await onList(objectApi, owner, "deny", caller.name))) {
      await revokeCaller(objectApi, owner, caller);
      return { ok: false, reason: "denied" };
    }

    if (await granted(objectApi, owner, caller.explicit ? caller.id : "")) {
      return { ok: true, reason: "granted" };
    }

    if (caller.name && (await onList(objectApi, owner, "allow", caller.name))) {
      await grantTo(objectApi, owner, caller);
      return { ok: true, reason: "allowed" };
    }

    const access = await mode(objectApi, owner);

    if (access === "open") {
      await grantTo(objectApi, owner, caller);
      return { ok: true, reason: "open" };
    }

    if (access === "private") {
      const offered = normalizeKey(offeredKey);
      const held = normalizeKey(await key(objectApi, owner));
      if (offered && held && offered === held) {
        await grantTo(objectApi, owner, caller);
        return { ok: true, reason: "key" };
      }
      return { ok: false, reason: "key" };
    }

    return { ok: false, reason: "closed" };
  } catch (e) {
    try {
      objectApi.log("[shelf] " + ((e && e.message) || e));
    } catch (e2) {
      /* logging is never the failure */
    }
    return { ok: false, reason: "unknown", error: String((e && e.message) || e) };
  }
}

// Every name here has a live caller — that is the rule this list is kept to.
module.exports = {
  denialReason,
  list,
  onList,
  addName,
  removeName,
  doors,
  recordMe,
  revoke,
  granted,
  cleanName,
  whoAmI,
  mode,
  ownerOfKey,
  tryShelf,
};
