// js — the Co-op panel: who is in the room right now plus your shelf's allow list and deny list, all in one panel. only the two lists and who's here — invite codes, session-joining, access modes and the shelves-open-to-you section are struck.

const SHELF = require("lib/shelfaccess.js");
const OWNER = require("lib/game-owner.js");
const UIINPUT = require("lib/ui-input.js");

const DEFAULT_COOP = { dialog: null, error: null, allow: [], deny: [], roster: [] };

export function patchCoop(objectApi, patch) {
  const state = objectApi.getState() || {};
  const ui = Object.assign({}, state.ui || {});
  ui.coop = Object.assign({}, DEFAULT_COOP, ui.coop || {}, patch);
  ui.menu = null;
  objectApi.patchState({ ui });
}

export function cleanName(raw) {
  return SHELF.cleanName(raw);
}

export function ownerId(objectApi) {
  try {
    return String(objectApi.userId || "");
  } catch (e) {
    return "";
  }
}

export function canManage(objectApi) {
  const state = objectApi.getState() || {};
  const shelf = (state.ui || {}).shelf || {};
  return shelf.mine !== false;
}

export function readRoster(objectApi) {
  let players = [];
  try {
    players = objectApi.getPlayers() || [];
  } catch (e) {
    players = [];
  }
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i] || {};
    const pid = OWNER.rowId(p);
    if (!pid) continue;
    let name = OWNER.rowName(p);
    if (!name) {
      try {
        const prof = objectApi.getProfile(pid);
        if (prof && typeof prof.then !== "function") name = OWNER.rowName(prof);
      } catch (e) {
        name = "";
      }
    }
    out.push({
      id: String(pid),
      userId: String(OWNER.field(p, "userId") || ""),
      name: String(name || "someone"),
      self: String(OWNER.field(p, "userId") || "") === ownerId(objectApi) || String(pid) === String(objectApi.id),
      gameOwner: OWNER.isOwner(objectApi, p.userId),
    });
  }
  return out;
}

export async function openPanel(objectApi) {
  if (!canManage(objectApi)) return;
  const owner = ownerId(objectApi);
  const allow = await SHELF.list(objectApi, owner, "allow");
  const deny = await SHELF.list(objectApi, owner, "deny");
  const roster = readRoster(objectApi);
  patchCoop(objectApi, { dialog: "coop", error: null, allow: allow, deny: deny, roster: roster });
}

export async function refresh(objectApi) {
  const owner = ownerId(objectApi);
  const allow = await SHELF.list(objectApi, owner, "allow");
  const deny = await SHELF.list(objectApi, owner, "deny");
  const roster = readRoster(objectApi);
  patchCoop(objectApi, { dialog: "coop", error: null, allow: allow, deny: deny, roster: roster });
}

export async function addName(objectApi, listName, rawName) {
  if (!canManage(objectApi)) return;
  const name = cleanName(rawName);
  if (!name) {
    patchCoop(objectApi, { dialog: "coop", error: "type a name first" });
    return;
  }
  const which = listName === "deny" ? "deny" : "allow";
  if (which === "deny") {
    const reason = await SHELF.denialReason(objectApi, ownerId(objectApi), name);
    if (reason) { patchCoop(objectApi, { dialog: "coop", error: reason }); return; }
  }
  const added = await SHELF.addName(objectApi, ownerId(objectApi), which, name);
  if (!added) { patchCoop(objectApi, { dialog: "coop", error: "That access change was not applied." }); return; }
  await refresh(objectApi);
}

export async function removeName(objectApi, listName, rawName) {
  if (!canManage(objectApi)) return;
  const name = cleanName(rawName);
  if (!name) return;
  await SHELF.removeName(objectApi, ownerId(objectApi), listName === "deny" ? "deny" : "allow", name);
  await refresh(objectApi);
}

// A roster person carries a user id as well as a name — revoke both ways, so a denial lands whether the grant was written under id or name.
export async function denyPerson(objectApi, rawName, userId) {
  if (!canManage(objectApi)) return;
  const owner = ownerId(objectApi);
  const reason = await SHELF.denialReason(objectApi, owner, rawName, userId);
  if (reason) { patchCoop(objectApi, { dialog: "coop", error: reason }); return; }
  if (!await SHELF.addName(objectApi, owner, "deny", rawName)) {
    patchCoop(objectApi, { dialog: "coop", error: "That access change was not applied." }); return;
  }
  if (userId) await SHELF.revoke(objectApi, owner, userId);
  await refresh(objectApi);
}

export function onInput(objectApi, input) {
  const event = UIINPUT.read(input);
  const a = event.actions;
  const d = event.data;

  // his ruling: the Co-op button opens the allow/deny panel itself — one press, no dropdown.
  if (a.coopOpen) {
    openPanel(objectApi);
    return;
  }

  if (a.uiMenuItem) {
    const p = d.uiMenuItem || {};
    if (p.menu !== "Co-op") return;
    openPanel(objectApi);
    return;
  }

  if (a.coopCancel) {
    patchCoop(objectApi, { dialog: null, error: null });
    return;
  }

  if (a.coopListAdd) {
    const p = d.coopListAdd || {};
    const list = p.list === "deny" ? "deny" : "allow";
    if (list === "deny" && String(p.from || "") === "who") {
      denyPerson(objectApi, p.name, String(p.userId || ""));
      return;
    }
    addName(objectApi, list, p.name);
    return;
  }

  if (a.coopListRemove) {
    const p = d.coopListRemove || {};
    removeName(objectApi, p.list === "deny" ? "deny" : "allow", p.name);
  }
}
