// The write fence — one verdict per seat, checked by every write verb in lib/cards.js. reads are open to anyone who reaches a shelf; writing needs your name on the owner's allow list. the verdict is decided once per seat (boot, shelf-open, list edit), never per write.

const SHELF = require("lib/shelfaccess.js");
const OWNER = require("lib/game-owner.js");

let VERDICT = { ok: true, owner: "", name: "", why: "mine" };

export function set(next) {
  VERDICT = {
    ok: !!(next && next.ok),
    owner: String((next && next.owner) || ""),
    name: String((next && next.name) || ""),
    why: String((next && next.why) || ""),
  };
  return VERDICT;
}

export function get() {
  return { ok: VERDICT.ok, owner: VERDICT.owner, name: VERDICT.name, why: VERDICT.why };
}

export function mayWrite() {
  return VERDICT.ok !== false;
}

export function refusalLine(ownerName) {
  const who = String(ownerName || "").trim();
  return who
    ? "this shelf is " + who + "'s — you can read it, but only names on their allow list may write"
    : "you can read this shelf, but only names on its allow list may write";
}

export function mine() {
  return set({ ok: true, owner: "", why: "mine" });
}

export async function evaluate(objectApi, ownerId, ownerName) {
  const owner = String(ownerId || "");
  const shown = String(ownerName || "");
  try {
    if (!owner) return mine();
    let me = "";
    try {
      me = String(objectApi.userId || "");
    } catch (e) {
      me = "";
    }
    if (me && me === owner) return set({ ok: true, owner: owner, name: shown, why: "mine" });

    if (OWNER.isOwner(objectApi, me)) return set({ ok: true, owner: owner, name: shown, why: "game-owner" });

    let name = "";
    try {
      const raw = objectApi.getUsername();
      name = SHELF.cleanName(raw && typeof raw.then === "function" ? await raw : raw);
    } catch (e) {
      name = "";
    }
    if (!name) return set({ ok: false, owner: owner, name: shown, why: "unknown" });

    if (await SHELF.onList(objectApi, owner, "deny", name)) return set({ ok: false, owner: owner, name: shown, why: "denied" });
    if (await SHELF.onList(objectApi, owner, "allow", name)) return set({ ok: true, owner: owner, name: shown, why: "allowed" });
    return set({ ok: false, owner: owner, name: shown, why: "not-allowed" });
  } catch (e) {
    // A fence that breaks refuses on somebody else's shelf and opens on your own — never the reverse.
    return set({ ok: !owner, owner: owner, name: shown, why: "error" });
  }
}

module.exports = { set, get, mine, mayWrite, evaluate, refusalLine };
