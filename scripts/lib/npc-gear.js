// Level-dispersed NPC weapons, variants, armor tiers, and pocket drops compared against player level.
import W, { rollVariant, rarityIdx, rarityCap } from "./weapons.js";
import { rollLoot, rollCash, garmentsOf, poolOf, leveledWeaponScale, magOf } from "./loot.js";
import { npcLook, rowData, CLOTHES as CL } from "./clothes.js";
import { lookOfNpc } from "./stats.js";
import { faction as factionOf } from "./forgive.js";

export const NPC_POOLS = {
  fight: [
    ["table_leg", 5], ["pipe_scrap", 5], ["golf_club", 2], ["tire_iron", 3],
    ["crowbar", 6], ["baton", 4], ["bat", 5], ["rebar", 3], ["knife", 4],
    ["target22", 3], ["pocket9", 4], ["revolver", 4], ["pistol", 6],
    ["hatchet", 3], ["wrench", 3], ["govt45", 4], ["lever_rifle", 3],
    ["stun_baton", 4], ["lineman_machete", 4], ["pickaxe", 2], ["fire_axe", 3],
    ["smg", 4], ["sledgehammer", 2], ["coach_gun", 2], ["shotgun", 4],
    ["hunting_rifle", 3], ["carbine", 3],
  ],
  medic: [
    ["knife", 5], ["screwdriver", 4], ["table_leg", 2], ["target22", 3],
    ["pocket9", 3], ["revolver", 2], ["pistol", 3], ["stun_baton", 2],
  ],
  trade: [
    ["wrench", 5], ["crowbar", 4], ["bat", 3], ["tire_iron", 3],
    ["pocket9", 3], ["revolver", 4], ["pistol", 5], ["govt45", 3],
    ["lever_rifle", 3], ["shotgun", 4], ["coach_gun", 2],
  ],
  civ: [
    ["table_leg", 5], ["pipe_scrap", 4], ["knife", 4], ["screwdriver", 3],
    ["golf_club", 3], ["crowbar", 3], ["bat", 3], ["cleaver", 2],
    ["hatchet", 2], ["target22", 2], ["pocket9", 2], ["pistol", 2],
  ],
  frenzied: [
    ["pipe_scrap", 4], ["knife", 5], ["crowbar", 4], ["cleaver", 4],
    ["bat", 3], ["hatchet", 3], ["rebar", 3], ["fire_axe", 2],
    ["target22", 2], ["pocket9", 3], ["revolver", 4], ["pistol", 4],
    ["lever_rifle", 2], ["smg", 2], ["shotgun", 2], ["coach_gun", 2], ["carbine", 1],
  ],
};

const ROLE_OFFSET = {
  captain: 2, warden: 2, boss: 2,
  guard: 1, agent: 1, scout: 1, hunter: 1,
  medic: 0, trader: 0, quarter: 0, scavenger: 0,
  clerk: -1, concierge: -1, keeper: -1, pilgrim: -1, psychic: -1,
  maid: -1, bellhop: -1, cook: -1, guide: -1, socialite: -1, patient: -2,
};

const COMBAT_ROLES = new Set(["guard", "agent", "scout", "captain"]);
const TRADE_ROLES = new Set(["trader", "quarter", "clerk", "concierge"]);
const CIV_ROLES = new Set(["socialite", "maid", "bellhop", "cook", "guide", "patient", "keeper", "pilgrim", "psychic"]);
const UNARMED_RATE = { brave: 0, steady: 0.09, coward: 0.24, frenzied: 0 };

function hashFrac(str, salt = 0) {
  let h = (2166136261 ^ salt) >>> 0;
  for (const ch of String(str ?? "")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function seededCtx(seed, baseCtx) {
  let h = 2166136261;
  for (const ch of String(seed ?? "npc")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return {
    ...baseCtx,
    random: () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 100000) / 100000;
    },
  };
}

export function refPlayerLevel(ctx, opts = {}) {
  if (opts?.playerLevel != null) return Math.max(1, Number(opts.playerLevel) || 1);
  const players = ctx?.place?.players ?? (ctx?.self?.state?.level != null ? [ctx.self] : []);
  const levels = players.map((p) => Number(p?.state?.level) || 0).filter((n) => n > 0);
  if (!levels.length) return null;
  const peak = Math.max(...levels);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  return Math.max(1, Math.round(peak * 0.65 + avg * 0.35));
}

export function npcSpread(id) {
  const u = hashFrac(id, 409);
  return u < 0.15 ? -2 : u < 0.35 ? -1 : u < 0.65 ? 0 : u < 0.85 ? 1 : 2;
}

export function npcGearLevel(ctx, me, opts = {}) {
  const s = me?.state ?? {};
  const place = opts?.place ?? ctx?.place?.id ?? ctx?.self?.place ?? s.place;
  const zoneLv = CL.leveled.placeTier[place] ?? 1;
  const playerLv = refPlayerLevel(ctx, opts);
  const role = opts?.role ?? s.role;
  const roleOff = ROLE_OFFSET[role] ?? 0;
  const nerveOff = s.nerve === "brave" ? 1 : s.nerve === "coward" ? -1 : 0;
  const spread = opts?.noSpread ? 0 : npcSpread(me?.id ?? "npc");
  const authored = opts?.level ?? (playerLv == null ? s.gearLevel : null);
  if (authored != null && playerLv == null) {
    return Math.max(1, Math.min(20, Math.round(Number(authored) + roleOff + spread)));
  }
  if (playerLv == null) {
    return Math.max(1, Math.min(20, zoneLv + roleOff + spread));
  }
  const center = Math.round(playerLv * 0.65 + zoneLv * 0.35);
  const raw = center + roleOff + nerveOff + spread;
  const minBound = Math.max(1, playerLv - 3);
  const maxBound = playerLv <= 2 ? 4 : Math.max(Math.min(zoneLv + 2, playerLv + 5), playerLv + 3);
  return Math.max(1, Math.min(20, Math.min(maxBound, Math.max(minBound, raw))));
}

export function npcPoolKey(me, opts = {}) {
  const s = me?.state ?? {};
  const role = opts?.role ?? s.role;
  const fac = opts?.faction ?? factionOf(me ?? {}) ?? s.faction;
  if (role === "medic") return "medic";
  if (TRADE_ROLES.has(role)) return "trade";
  if (s.nerve === "frenzied" || fac === "frenzied" || me?.tags?.includes?.("l109-wanderer")) return "frenzied";
  if (s.faction5 === "orig" || (CIV_ROLES.has(role) && s.faction5 !== "hk")) return "civ";
  return "fight";
}

function npcVariantFaction(me, opts = {}) {
  const raw = opts?.faction ?? factionOf(me ?? {}) ?? me?.state?.faction ?? "";
  if (["meg", "bntg", "surrender", "froid", "trader", "vault"].includes(raw)) return raw;
  if (me?.tags?.includes?.("meg") || me?.state?.team === "meg") return "meg";
  return null;
}

export function rollNpcWeapon(ctx, me, opts = {}) {
  const s = me?.state ?? {};
  const id = me?.id ?? "npc";
  const poolKey = opts?.poolKey ?? npcPoolKey(me, opts);
  const nerve = s.nerve ?? "steady";
  if (!opts?.forceArmed && !opts?.forceRanged && poolKey !== "frenzied" && hashFrac(id, 31) < (UNARMED_RATE[nerve] ?? 0.08)) {
    return "fists";
  }
  const lv = opts?.gearLevel ?? npcGearLevel(ctx, me, opts);
  const fac = npcVariantFaction(me, opts);
  const role = opts?.role ?? s.role;
  const roleRank = ROLE_OFFSET[role] ?? 0;
  const cap = rarityCap(lv + (roleRank > 0 ? 1 : 0));
  const candidates = (NPC_POOLS[poolKey] ?? NPC_POOLS.fight).filter(([k]) => {
    const w = W[k];
    if (!w || w.unique) return false;
    if (opts?.forceRanged && !w.ranged) return false;
    if (poolKey === "frenzied" && !opts?.allowRanged && !opts?.forceRanged && !me?.tags?.includes?.("l109-wanderer") && w.ranged) return false;
    return (w.minLevel ?? 1) <= lv && rarityIdx(k) <= Math.max(cap, (w.minLevel ?? 1) <= lv ? rarityIdx(k) : cap);
  });
  const usable = candidates.length ? candidates : [["table_leg", 1]];
  const weighted = usable.map(([k, baseWt]) => {
    const scale = leveledWeaponScale(k, lv);
    const rarPenalty = rarityIdx(k) > cap ? 0.45 : 1;
    return [k, baseWt * scale * rarPenalty];
  });
  const rng = opts?.random ? ctx : seededCtx(id + "|arm|" + lv, ctx);
  let r = rng.random() * weighted.reduce((a, [, wt]) => a + wt, 0);
  let chosen = usable[0][0];
  for (const [k, wt] of weighted) {
    r -= wt;
    if (r <= 0) { chosen = k; break; }
  }
  const variant = rollVariant(rng, chosen, lv, { faction: fac, role, cap: Math.max(cap, rarityCap(lv)) });
  return W[variant] ? variant : chosen;
}

export function adaptNpcWear(me, lv) {
  const s = me?.state;
  if (!s || s.clothesOwn || s.wearOwn || s.mjguest || me?.tags?.includes?.("l5staff")) return null;
  const fac = s.faction5 ?? s.faction;
  if (["l5", "l7", "homely", "orig", "frenzied"].includes(fac)) return null;
  const cur = lookOfNpc(me);
  if (!cur) return null;
  const role = s.role ?? cur.role ?? "survivor";
  if (!s.adaptiveArmor && !COMBAT_ROLES.has(role) && role !== "scavenger") return null;
  const topRow = rowData("topw", cur.topw, cur.top);
  const topReq = Math.max(topRow?.level ?? 1, CL.leveled.rarityAt[topRow?.rarity] ?? 1);
  const overTiered = topReq > lv + 3 && topRow?.rarity !== "agency";
  const underTiered = COMBAT_ROLES.has(role) && lv >= 10 && (topRow?.dr ?? 0) <= 2 && topRow?.rarity !== "agency";
  if (!s.adaptiveArmor && !overTiered && !underTiered) return null;
  const preserved = { ...cur };
  delete preserved.topw; delete preserved.botw; delete preserved.shoes; delete preserved.hat;
  if (topRow?.rarity === "agency" && lv >= 10) preserved.topw = cur.topw;
  const next = npcLook(me.id, preserved, fac ?? "wanderer", lv, role);
  const keys = ["topw", "top", "topp", "botw", "bottom", "botp", "shoes", "shoec", "shoep", "hat", "hatc", "hatp"];
  const changed = keys.some((k) => cur[k] !== next[k]);
  return changed ? next : null;
}

function ammoTokenFor(arm) {
  const w = W[arm];
  if (!w?.ranged) return null;
  const t = w.ammoType;
  if (t === "shells") return "shells";
  if (t === "cells") return "cells";
  if (t === "flare70") return "flare70";
  if (t === "latex" || t === "rockets" || t === "baubles" || t === "sqfill") return null;
  return "ammo";
}

export function rollNpcPocketLoot(ctx, me, opts = {}) {
  const s = me?.state ?? {};
  const lv = opts?.gearLevel ?? s.gearLevel ?? npcGearLevel(ctx, me, opts);
  const pool = opts?.pool ?? poolOf(ctx?.place?.id ?? ctx?.self?.place);
  const items = [];
  if (s.arm && s.arm !== "fists" && W[s.arm]) items.push("weapon:" + s.arm);

  const ammoTok = ammoTokenFor(s.arm);
  if (ammoTok) {
    items.push(ammoTok);
    if (lv >= 9 && ctx.random() < 0.35) items.push(ammoTok);
  } else if (COMBAT_ROLES.has(s.role) && lv >= 4 && ctx.random() < 0.35) {
    items.push("ammo");
  }

  const role = s.role;
  if (role === "medic") {
    items.push(lv >= 11 ? "medkit" : lv >= 7 ? "firstaid" : lv >= 4 ? "antiseptic" : "bandage");
    if (lv >= 6 && ctx.random() < 0.45) items.push("stim_shot");
  } else if (TRADE_ROLES.has(role)) {
    items.push(rollCash(ctx));
    if (lv >= 5 && ctx.random() < 0.5) items.push(lv >= 10 ? magOf(ctx, pool) : "ration");
  } else if (COMBAT_ROLES.has(role)) {
    if (ctx.random() < 0.5) items.push(lv >= 9 ? "firstaid" : lv >= 4 ? "bandage" : "almond");
    if (lv >= 8 && ctx.random() < 0.25) items.push(magOf(ctx, pool));
  } else {
    if (ctx.random() < 0.45) items.push(lv >= 6 ? "ration" : "almond");
  }

  const rollCtx = opts?.playerLevel != null ? { ...ctx, self: { state: { level: lv }, place: ctx?.place?.id ?? ctx?.self?.place } } : ctx;
  const raw = rollLoot(rollCtx, 1.1 + lv * 0.03, 1, pool);
  for (const tok of raw) {
    if (tok === "ammo" || tok === "shells") {
      if (!ammoTok && lv < 4) continue;
      items.push(ammoTok ?? tok);
      continue;
    }
    if (tok.startsWith("weapon:")) continue; // dead NPC carries their actual held weapon
    items.push(tok);
  }
  items.push(...garmentsOf(lookOfNpc(me)));
  return items;
}
