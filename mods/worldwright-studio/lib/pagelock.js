// pagelock — THE PEN: one seat writes a card's pages at a time (page_pen, one row per held card). " GUARD: nothing here throws — a refusal is a value, and an unreachable database answers mine: true. js requires nothing, so this leaf require can never make a cycle.
const SCHEMA = require("lib/schema.js");
const ROWS = require("lib/game-owner.js");

const RENEW_S = 15; // a holder says "still here" this often
const STALE_S = 45; // a pen nobody has renewed for this long is free for the taking (a dead tab)
const POLL_S = 5; // a waiting seat looks this often — his "picks it up automatically" beat

let ENSURED = false;

// his ruling (Aug 27): schema is the data dictionary — the pen's shape is SCHEMA.ensurePagePen(); who holds it is decided here.
export function identity(api){
  const seat=String(api.id||""),body=seat.indexOf("god/")===0?seat.slice(4):seat;
  let row=null,name="";try{row=(api.getPlayers()||[]).find(p=>ROWS.rowId(p)===body)||null;}catch(e){}
  try{name=String(api.getUsername()||"");}catch(e){}
  return {id:String(api.userId||ROWS.field(row,"userId")||seat),name:name||ROWS.rowName(row)};
}
export async function ensure(objectApi) {
  if (ENSURED) return true;
  await SCHEMA.ensurePagePen(objectApi);
  ENSURED = true;
  return true;
}

export function rowsOf(result) {
  return (result && result.rows) || [];
}

// GUARD: a MISSING row and an EMPTY holder (parked) both read falsy — telling them apart is the
//   whole feature. No row = free; empty holder = set down, and only claim() may pick it up.
export function verdict(row, me) {
  if (!row) {
    return { mine: true, parked: false, stale: false, holder: String(me || ""), holderName: "", takenAt: 0, renewedAt: 0 };
  }
  const holder = String(row.holderId || "");
  const takenAt = Number(row.takenAt || 0);
  const renewedAt = Number(row.renewedAt || 0);
  const now = Number(row.now || 0);
  if (!holder) {
    return { mine: false, parked: true, stale: false, holder: "", holderName: "", takenAt, renewedAt };
  }
  return {
    mine: holder === String(me || ""),
    parked: false,
    stale: now > 0 && renewedAt > 0 ? now - renewedAt > STALE_S : false,
    holder,
    holderName: String(row.holderName || ""),
    takenAt,
    renewedAt,
  };
}

export function degraded(objectApi, e, me, name) {
  try {
    objectApi.log("[pen] the pen row is unreachable, writing stays open: " + ((e && e.message) || e));
  } catch (x) {
  }
  return { mine: true, parked: false, stale: false, holder: String(me || ""), holderName: String(name || ""), degraded: true };
}

// GUARD: the UPDATE's WHERE is the whole race rule, and its parked clause (holderId != '' on the
//   staleness half) is what stops an automatic lane from seizing a pen somebody set down by hand.
export async function acquire(objectApi, bookId, cardId, holderId, holderName) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  const name = String(holderName == null ? "" : holderName);
  if (!b || !c || !me) return { mine: false, holder: "", holderName: "", reason: "unknown" };
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      INSERT OR IGNORE INTO page_pen (bookId, cardId, holderId, holderName, takenAt, renewedAt)
        VALUES (${b}, ${c}, ${me}, ${name}, unixepoch(), unixepoch());
      UPDATE page_pen
         SET holderId = ${me},
             holderName = ${name},
             takenAt = CASE WHEN holderId = ${me} THEN takenAt ELSE unixepoch() END,
             renewedAt = unixepoch()
       WHERE bookId = ${b} AND cardId = ${c}
         AND (holderId = ${me} OR (holderId != '' AND renewedAt <= unixepoch() - ${STALE_S}));
      SELECT holderId, holderName, takenAt, renewedAt, unixepoch() AS now FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    return verdict(rowsOf(res)[0], me);
  } catch (e) {
    return degraded(objectApi, e, me, name);
  }
}

export async function renew(objectApi, bookId, cardId, holderId) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  if (!b || !c || !me) return { mine: false, holder: "", holderName: "", reason: "unknown" };
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      UPDATE page_pen SET renewedAt = unixepoch()
        WHERE bookId = ${b} AND cardId = ${c} AND holderId = ${me};
      SELECT holderId, holderName, takenAt, renewedAt FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    return verdict(rowsOf(res)[0], me);
  } catch (e) {
    return degraded(objectApi, e, me, "");
  }
}

export async function release(objectApi, bookId, cardId, holderId) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  if (!b || !c || !me) return false;
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      DELETE FROM page_pen WHERE bookId = ${b} AND cardId = ${c} AND holderId = ${me}`;
    return Number((res && res.changes) || 0) > 0;
  } catch (e) {
    try {
      objectApi.log("[pen] release refused by the database: " + ((e && e.message) || e));
    } catch (x) {
    }
    return false;
  }
}

// His ruling: "one user can relinquish the pen for the others... Otherwise it is an all-hands-off
//   review mode bonus."
// GUARD: parking is not releasing — release() deletes the row, park() keeps it and empties the holder.
export async function park(objectApi, bookId, cardId, holderId) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  if (!b || !c || !me) return { mine: false, parked: false, holder: "", holderName: "", reason: "unknown" };
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      UPDATE page_pen SET holderId = '', holderName = '', renewedAt = unixepoch()
        WHERE bookId = ${b} AND cardId = ${c} AND holderId = ${me};
      SELECT holderId, holderName, takenAt, renewedAt, unixepoch() AS now FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    return verdict(rowsOf(res)[0], me);
  } catch (e) {
    return degraded(objectApi, e, me, "");
  }
}

// The one lane that may take a parked pen, and it only ever runs on a click.
export async function claim(objectApi, bookId, cardId, holderId, holderName) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  const name = String(holderName == null ? "" : holderName);
  if (!b || !c || !me) return { mine: false, parked: false, holder: "", holderName: "", reason: "unknown" };
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      INSERT OR IGNORE INTO page_pen (bookId, cardId, holderId, holderName, takenAt, renewedAt)
        VALUES (${b}, ${c}, ${me}, ${name}, unixepoch(), unixepoch());
      UPDATE page_pen
         SET holderId = ${me},
             holderName = ${name},
             takenAt = CASE WHEN holderId = ${me} THEN takenAt ELSE unixepoch() END,
             renewedAt = unixepoch()
       WHERE bookId = ${b} AND cardId = ${c}
         AND (holderId = '' OR holderId = ${me} OR renewedAt <= unixepoch() - ${STALE_S});
      SELECT holderId, holderName, takenAt, renewedAt, unixepoch() AS now FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    return verdict(rowsOf(res)[0], me);
  } catch (e) {
    return degraded(objectApi, e, me, name);
  }
}

// The receipts lane: the digest rule only runs SQL saved in a script, so aging a row for a diagnosis
//   needs this saved statement to do it with.
export async function agePark(objectApi, bookId, cardId, seconds) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (!b || !c) return null;
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      UPDATE page_pen SET renewedAt = unixepoch() - ${s} WHERE bookId = ${b} AND cardId = ${c};
      SELECT holderId, holderName, takenAt, renewedAt, unixepoch() AS now FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    const row = rowsOf(res)[0];
    return row ? { holderId: String(row.holderId || ""), ageSeconds: Number(row.now || 0) - Number(row.renewedAt || 0) } : null;
  } catch (e) {
    return null;
  }
}

// GUARD: a waiting seat calls acquire(), never this — "is it free" and "then it is mine" must be one
//   statement or two waiters both read free and both think they won.
export async function peek(objectApi, bookId, cardId, holderId) {
  const b = String(bookId || "");
  const c = String(cardId || "");
  const me = String(holderId || "");
  if (!b || !c) return { free: true, mine: false, holder: "", holderName: "", ageSeconds: 0 };
  try {
    await ensure(objectApi);
    const res = await objectApi.sql`
      SELECT holderId, holderName, takenAt, renewedAt, unixepoch() AS now FROM page_pen
        WHERE bookId = ${b} AND cardId = ${c}`;
    const row = rowsOf(res)[0];
    if (!row) return { free: true, parked: false, mine: false, holder: "", holderName: "", ageSeconds: 0 };
    const age = Number(row.now || 0) - Number(row.renewedAt || 0);
    if (!row.holderId) return { free: false, parked: true, stale: false, mine: false, holder: "", holderName: "", ageSeconds: age };
    const stale = age > STALE_S;
    return {
      free: stale,
      parked: false,
      stale,
      mine: !stale && String(row.holderId) === me,
      holder: String(row.holderId || ""),
      holderName: String(row.holderName || ""),
      takenAt: Number(row.takenAt || 0),
      renewedAt: Number(row.renewedAt || 0),
      ageSeconds: age,
    };
  } catch (e) {
    return { free: true, parked: false, mine: false, holder: "", holderName: "", ageSeconds: 0, degraded: true };
  }
}

module.exports = { identity, RENEW_S, STALE_S, POLL_S, ensure, acquire, renew, release, park, claim, peek, agePark };
