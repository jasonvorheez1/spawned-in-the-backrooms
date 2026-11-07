// TuneDB core — the table format, parse/serialize and every edit op.
// Tables live in the GAME's tree (scripts/lib/data/db/<id>.yml), never in the
// mod folder, so a game keeps its numbers if the mod is removed. The file is
// JSON (valid YAML), so game code imports it like any other .yml:
//   import ENEMIES from "./lib/data/db/enemies.yml";  ENEMIES.rows.slime.maxHp
export const DIR = "scripts/lib/data/db/";
const TYPES = ["number", "int", "text", "bool"];
const ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function pathOf(id) { return DIR + id + ".yml"; }

export function idFromPath(p) {
  if (!p.startsWith(DIR) || !p.endsWith(".yml")) return null;
  const id = p.slice(DIR.length, -4);
  return ID_RE.test(id) ? id : null;
}

export function slug(s, fallback) {
  if (ID_RE.test(String(s || ""))) return String(s);
  const t = String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const out = t && /^[a-z_]/.test(t) ? t : (t ? "r_" + t : "");
  return out || fallback;
}

export function blank(field) {
  if (field.default !== undefined) return field.default;
  if (field.type === "text") return "";
  if (field.type === "bool") return false;
  return 0;
}

export function coerce(field, v) {
  if (!field) return v;
  if (field.type === "bool") return v === true || v === "true" || v === 1 || v === "1";
  if (field.type === "text") return String(v == null ? "" : v);
  let n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (!isFinite(n)) n = 0;
  if (field.type === "int") n = Math.round(n);
  if (typeof field.min === "number") n = Math.max(field.min, n);
  if (typeof field.max === "number") n = Math.min(field.max, n);
  return Math.round(n * 1e6) / 1e6;
}

export function normalize(raw, id) {
  const t = raw && typeof raw === "object" ? raw : {};
  const fields = (Array.isArray(t.fields) ? t.fields : [])
    .filter((f) => f && ID_RE.test(String(f.key || "")))
    .map((f) => {
      const o = { key: f.key, label: String(f.label || f.key), type: TYPES.includes(f.type) ? f.type : "number" };
      if (f.labelJa) o.labelJa = String(f.labelJa);
      for (const k of ["min", "max", "step"]) if (typeof f[k] === "number") o[k] = f[k];
      if (f.default !== undefined) o.default = f.default;
      if (f.note) o.note = String(f.note);
      const ref = refList(f.ref); if (ref.length && o.type === "text") o.ref = ref;
      const allow = refList(f.refAllow, true); if (o.ref && allow.length) o.refAllow = allow;
      return o;
    });
  const rows = {};
  const src = t.rows && typeof t.rows === "object" ? t.rows : {};
  for (const rid of Object.keys(src)) {
    if (!ID_RE.test(rid)) continue;
    const r = src[rid] && typeof src[rid] === "object" ? src[rid] : {};
    const o = {};
    for (const f of fields) o[f.key] = r[f.key] === undefined ? blank(f) : coerce(f, r[f.key]);
    rows[rid] = o;
  }
  const out = { id, label: String(t.label || id), fields, rows, order: typeof t.order === "number" ? t.order : 100 };
  if (t.labelJa) out.labelJa = String(t.labelJa);
  if (t.note) out.note = String(t.note);
  return out;
}

// A link: a text field whose value names a row in other table(s).
// field.ref = ["weapons", "armors"], field.refAllow = ["gold"] (words that are
// fine without a row). A value may list several ids: "hero, mage".
export function refList(v, loose) {
  const a = Array.isArray(v) ? v : String(v == null ? "" : v).split(/[,\s]+/);
  return a.map((x) => String(x).trim()).filter((x) => x && (loose || ID_RE.test(x)));
}
export function refTokens(v) { return String(v == null ? "" : v).split(",").map((x) => x.trim()).filter(Boolean); }

// Every broken link in the database: [{ table, row, field, value, targets }].
// A link to a table that doesn't exist is broken too (target missing).
export function checkRefs(tables) {
  const out = [];
  for (const t of Object.values(tables)) for (const f of t.fields) {
    if (!f.ref) continue;
    for (const rid of Object.keys(t.rows)) for (const tok of refTokens(t.rows[rid][f.key])) {
      if (f.refAllow && f.refAllow.includes(tok)) continue;
      if (f.ref.some((tid) => tables[tid] && tables[tid].rows[tok])) continue;
      out.push({ table: t.id, row: rid, field: f.key, value: tok, targets: f.ref, missingTable: f.ref.filter((tid) => !tables[tid]) });
    }
  }
  return out;
}

export function parse(text, id) {
  const body = String(text || "").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n").trim();
  if (!body) return normalize({}, id);
  return normalize(JSON.parse(body), id);
}

// JSON on purpose (YAML reads it), laid out one field / one row per line so a
// diff in the history reads like a spreadsheet change.
export function serialize(t) {
  const J = (v) => JSON.stringify(v);
  const head = [
    "# TuneDB table \"" + t.id + "\" — edit it in god mode → Database tab, or by hand.",
    "# Game code: import T from \"<relative path>/lib/data/db/" + t.id + ".yml\";  T.rows.<rowId>.<fieldKey>",
  ];
  const lines = ["{"];
  lines.push('  "label": ' + J(t.label) + ",");
  if (t.labelJa) lines.push('  "labelJa": ' + J(t.labelJa) + ",");
  if (t.note) lines.push('  "note": ' + J(t.note) + ",");
  lines.push('  "order": ' + J(t.order) + ",");
  lines.push('  "fields": [');
  t.fields.forEach((f, i) => lines.push("    " + J(f) + (i < t.fields.length - 1 ? "," : "")));
  lines.push("  ],");
  lines.push('  "rows": {');
  const ids = Object.keys(t.rows);
  ids.forEach((rid, i) => lines.push("    " + J(rid) + ": " + J(t.rows[rid]) + (i < ids.length - 1 ? "," : "")));
  lines.push("  }");
  lines.push("}");
  return head.join("\n") + "\n" + lines.join("\n") + "\n";
}

function uniqueId(taken, base) {
  if (!taken[base]) return base;
  for (let i = 2; i < 999; i++) if (!taken[base + "_" + i]) return base + "_" + i;
  return base + "_x";
}

function reorder(rows, ids) {
  const o = {};
  for (const id of ids) o[id] = rows[id];
  return o;
}

// tables: { id: table }. Returns { changed: [ids], deleted: [ids], error?, select? }
export function applyOp(tables, op) {
  const res = { changed: [], deleted: [] };
  const fail = (e) => ({ changed: [], deleted: [], error: e });
  const kind = op && op.kind;
  if (kind === "seed") {
    for (const t of starterSet(op.preset)) if (!tables[t.id]) { tables[t.id] = t; res.changed.push(t.id); }
    return res;
  }
  if (kind === "addTable") {
    const id = slug(op.id || op.label, "");
    if (!id) return fail("bad-id");
    if (tables[id]) return fail("exists");
    const maxOrder = Object.values(tables).reduce((m, t) => Math.max(m, t.order || 0), 0);
    tables[id] = normalize({
      label: op.label || id, labelJa: op.labelJa || op.label || id, order: maxOrder + 10,
      fields: [{ key: "name", label: "Name", labelJa: "名前", type: "text" }],
      rows: { item_1: { name: "New" } },
    }, id);
    res.changed.push(id); res.select = { table: id };
    return res;
  }
  if (kind === "genLevels") {
    if (!tables.rules) return fail("no-table");
    const keep = tables.levels;
    const fresh = levelsFromRules(tables.rules, keep);
    if (keep) { fresh.label = keep.label; if (keep.labelJa) fresh.labelJa = keep.labelJa; fresh.order = keep.order; }
    tables.levels = fresh; res.changed.push("levels"); res.select = { table: "levels" };
    return res;
  }
  const t = tables[op.table];
  if (!t) return fail("no-table");
  const field = (k) => t.fields.find((f) => f.key === k);
  switch (kind) {
    case "delTable": delete tables[t.id]; res.deleted.push(t.id); return res;
    case "editTable":
      if (op.label !== undefined) t.label = String(op.label || t.id);
      if (op.labelJa !== undefined) t.labelJa = String(op.labelJa || "");
      break;
    case "importRows": {
      // op.rows: [{ id, values: { fieldKey: raw } }] — new ids are added, existing rows are updated
      // (only the columns given). op.replace: true drops rows not in the paste.
      const list = Array.isArray(op.rows) ? op.rows.slice(0, 2000) : [];
      if (!list.length) return fail("empty");
      const seen = [];
      for (const it of list) {
        const id = slug(it && it.id, ""); if (!id || !ID_RE.test(id)) continue;
        const r = t.rows[id] || (() => { const o = {}; for (const f of t.fields) o[f.key] = blank(f); return o; })();
        for (const k of Object.keys((it && it.values) || {})) { const f = field(k); if (f) r[f.key] = coerce(f, it.values[k]); }
        t.rows[id] = r; seen.push(id);
      }
      if (!seen.length) return fail("bad-id");
      if (op.replace) for (const id of Object.keys(t.rows)) if (!seen.includes(id)) delete t.rows[id];
      res.select = { table: t.id, row: seen[0] }; res.imported = seen.length; break;
    }
    case "setCell": {
      const f = field(op.field); const r = t.rows[op.row];
      if (!f || !r) return fail("no-cell");
      r[f.key] = coerce(f, op.value); break;
    }
    case "addRow": {
      const id = uniqueId(t.rows, slug(op.id, "new_row"));
      const r = {}; for (const f of t.fields) r[f.key] = blank(f);
      if (field("name")) r.name = "New";
      const ids = Object.keys(t.rows); const at = op.after ? ids.indexOf(op.after) + 1 : ids.length;
      t.rows[id] = r; ids.splice(at > 0 ? at : ids.length, 0, id);
      t.rows = reorder(t.rows, ids); res.select = { table: t.id, row: id }; break;
    }
    case "dupRow": {
      const src = t.rows[op.row]; if (!src) return fail("no-row");
      const id = uniqueId(t.rows, op.row + "_copy");
      const ids = Object.keys(t.rows); ids.splice(ids.indexOf(op.row) + 1, 0, id);
      t.rows[id] = JSON.parse(JSON.stringify(src)); t.rows = reorder(t.rows, ids);
      res.select = { table: t.id, row: id }; break;
    }
    case "delRow": if (!t.rows[op.row]) return fail("no-row"); delete t.rows[op.row]; break;
    case "renameRow": {
      const to = slug(op.to, ""); if (!t.rows[op.row]) return fail("no-row");
      if (!to) return fail("bad-id"); if (to === op.row) return res;
      if (t.rows[to]) return fail("exists");
      const ids = Object.keys(t.rows).map((x) => (x === op.row ? to : x));
      t.rows[to] = t.rows[op.row]; delete t.rows[op.row]; t.rows = reorder(t.rows, ids);
      // links that named the old id follow it
      for (const o of Object.values(tables)) for (const f of o.fields) {
        if (!f.ref || !f.ref.includes(t.id)) continue;
        for (const rid of Object.keys(o.rows)) {
          const toks = refTokens(o.rows[rid][f.key]);
          if (!toks.includes(op.row)) continue;
          o.rows[rid][f.key] = toks.map((x) => (x === op.row ? to : x)).join(", ");
          if (o.id !== t.id && !res.changed.includes(o.id)) res.changed.push(o.id);
        }
      }
      res.select = { table: t.id, row: to }; break;
    }
    case "moveRow": {
      const ids = Object.keys(t.rows); const i = ids.indexOf(op.row); const j = i + (op.dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= ids.length) return res;
      ids.splice(i, 1); ids.splice(j, 0, op.row); t.rows = reorder(t.rows, ids); break;
    }
    case "addField": {
      const key = slug(op.key || op.label, "");
      if (!key) return fail("bad-id"); if (field(key)) return fail("exists");
      const f = { key, label: String(op.label || key), type: TYPES.includes(op.type) ? op.type : "number" };
      if (op.labelJa) f.labelJa = String(op.labelJa);
      if (f.type === "text" && refList(op.ref).length) f.ref = refList(op.ref);
      if (op.default !== undefined && op.default !== "") f.default = coerce({ type: f.type }, op.default);
      t.fields.push(f);
      for (const rid of Object.keys(t.rows)) t.rows[rid][key] = blank(f);
      break;
    }
    case "editField": {
      const f = field(op.field); if (!f) return fail("no-field");
      if (op.label !== undefined) f.label = String(op.label || f.key);
      if (op.labelJa !== undefined) { if (op.labelJa) f.labelJa = String(op.labelJa); else delete f.labelJa; }
      for (const k of ["min", "max", "step"]) if (op[k] !== undefined) {
        const n = parseFloat(op[k]); if (isFinite(n)) f[k] = n; else delete f[k];
      }
      if (op.ref !== undefined && f.type === "text") { const r = refList(op.ref); if (r.length) f.ref = r; else { delete f.ref; delete f.refAllow; } }
      if (op.refAllow !== undefined && f.ref) { const a = refList(op.refAllow, true); if (a.length) f.refAllow = a; else delete f.refAllow; }
      for (const rid of Object.keys(t.rows)) t.rows[rid][f.key] = coerce(f, t.rows[rid][f.key]);
      break;
    }
    case "delField": {
      const i = t.fields.findIndex((f) => f.key === op.field); if (i < 0) return fail("no-field");
      t.fields.splice(i, 1); for (const rid of Object.keys(t.rows)) delete t.rows[rid][op.field];
      break;
    }
    case "moveField": {
      const i = t.fields.findIndex((f) => f.key === op.field); const j = i + (op.dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= t.fields.length) return res;
      const [f] = t.fields.splice(i, 1); t.fields.splice(j, 0, f); break;
    }
    default: return fail("unknown-op");
  }
  res.changed.push(t.id);
  return res;
}

// The generic placeholder set: every game re-tunes these on day one.
export function starterTables() {
  const N = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "number", min: 0 }, extra || {});
  const NAME = { key: "name", label: "Name", labelJa: "名前", type: "text" };
  return [
    normalize({
      label: "Stats", labelJa: "ステータス", order: 10,
      note: "Player / class base stats and growth per level.",
      fields: [NAME, N("maxHp", "Max HP", "最大HP", { type: "int" }), N("maxMp", "Max MP", "最大MP", { type: "int" }),
        N("attack", "Attack", "攻撃力", { type: "int" }), N("defense", "Defense", "防御力", { type: "int" }),
        N("speed", "Speed", "素早さ", { step: 0.1 }), N("luck", "Luck", "運", { type: "int" }),
        N("hpPerLevel", "HP / level", "HP成長", { type: "int" }), N("attackPerLevel", "ATK / level", "攻撃成長", { type: "int" }),
        { key: "traits", label: "Traits", labelJa: "特性", type: "text", ref: ["traits"] }],
      rows: {
        hero: { name: "Hero", maxHp: 100, maxMp: 20, attack: 10, defense: 5, speed: 5, luck: 5, hpPerLevel: 12, attackPerLevel: 2, traits: "brave" },
        mage: { name: "Mage", maxHp: 70, maxMp: 60, attack: 5, defense: 3, speed: 5.5, luck: 6, hpPerLevel: 7, attackPerLevel: 1, traits: "arcane_mind" },
        tank: { name: "Tank", maxHp: 150, maxMp: 5, attack: 8, defense: 12, speed: 3.5, luck: 3, hpPerLevel: 18, attackPerLevel: 1, traits: "iron_skin" },
      },
    }, "stats"),
    normalize({
      label: "Enemies", labelJa: "敵", order: 20,
      fields: [NAME, N("maxHp", "Max HP", "最大HP", { type: "int" }), N("attack", "Attack", "攻撃力", { type: "int" }),
        N("defense", "Defense", "防御力", { type: "int" }), N("speed", "Speed", "素早さ", { step: 0.1 }),
        N("exp", "EXP", "経験値", { type: "int" }), N("gold", "Gold", "ゴールド", { type: "int" }),
        { key: "element", label: "Element", labelJa: "属性", type: "text", ref: ["elements"] },
        { key: "drop", label: "Drop", labelJa: "ドロップ", type: "text", ref: ["weapons", "armors", "items"] }, N("dropChance", "Drop %", "ドロップ率", { max: 100 }),
        { key: "lootTable", label: "Loot table", labelJa: "ドロップ表", type: "text", ref: ["loot_tables"] },
        { key: "traits", label: "Traits", labelJa: "特性", type: "text", ref: ["traits"] }],
      rows: {
        slime: { name: "Slime", element: "none", maxHp: 20, attack: 4, defense: 1, speed: 2, exp: 3, gold: 5, drop: "", dropChance: 0 , lootTable: "trash", traits: "poison_immune" },
        goblin: { name: "Goblin", element: "none", maxHp: 45, attack: 9, defense: 3, speed: 4, exp: 10, gold: 15, drop: "dagger", dropChance: 10 , lootTable: "common", traits: "" },
        wolf: { name: "Wolf", element: "ice", maxHp: 60, attack: 12, defense: 2, speed: 6.5, exp: 14, gold: 8, drop: "leather", dropChance: 15 , lootTable: "common", traits: "fire_weak" },
        boss: { name: "Boss", element: "dark", maxHp: 800, attack: 30, defense: 15, speed: 4, exp: 300, gold: 500, drop: "iron_sword", dropChance: 100 , lootTable: "boss", traits: "boss_body" },
      },
    }, "enemies"),
    normalize({
      label: "Weapons", labelJa: "武器", order: 30,
      fields: [NAME, N("attack", "Attack", "攻撃力", { type: "int" }), N("rate", "Swings / s", "攻撃速度", { step: 0.1 }),
        N("range", "Range (m)", "射程(m)", { step: 0.1 }), N("crit", "Crit %", "会心率", { max: 100 }), N("price", "Price", "価格", { type: "int" })],
      rows: {
        dagger: { name: "Dagger", attack: 6, rate: 2, range: 1.2, crit: 15, price: 50 },
        iron_sword: { name: "Iron Sword", attack: 14, rate: 1.2, range: 1.8, crit: 5, price: 200 },
        axe: { name: "Axe", attack: 22, rate: 0.8, range: 1.6, crit: 8, price: 320 },
        bow: { name: "Bow", attack: 10, rate: 1, range: 25, crit: 10, price: 250 },
      },
    }, "weapons"),
    normalize({
      label: "Armor", labelJa: "防具", order: 40,
      fields: [NAME, { key: "slot", label: "Slot", labelJa: "部位", type: "text" }, N("defense", "Defense", "防御力", { type: "int" }),
        N("speedMod", "Speed mod", "素早さ補正", { min: -10, step: 0.1 }), N("price", "Price", "価格", { type: "int" })],
      rows: {
        cloth: { name: "Cloth", slot: "body", defense: 2, speedMod: 0, price: 20 },
        leather: { name: "Leather", slot: "body", defense: 6, speedMod: 0, price: 120 },
        chainmail: { name: "Chainmail", slot: "body", defense: 12, speedMod: -0.5, price: 400 },
        wood_shield: { name: "Wood Shield", slot: "shield", defense: 4, speedMod: -0.2, price: 80 },
      },
    }, "armors"),
    normalize({
      label: "Skills", labelJa: "スキル", order: 50,
      note: "Abilities: attacks, heals, buffs, passives. kind: attack | heal | buff | debuff | passive. target: enemy | self | ally | area. A passive has no cost: learning it grants the trait in passive.",
      fields: [NAME, { key: "kind", label: "Kind", labelJa: "種類", type: "text" }, { key: "target", label: "Target", labelJa: "対象", type: "text" },
        { key: "element", label: "Element", labelJa: "属性", type: "text", ref: ["elements"] },
        N("power", "Power", "威力", { type: "int" }), N("mpCost", "MP cost", "消費MP", { type: "int" }),
        N("cooldown", "Cooldown (s)", "再使用(秒)", { step: 0.1 }), N("castTime", "Cast time (s)", "詠唱(秒)", { step: 0.1 }),
        N("range", "Range (m)", "射程(m)", { step: 0.1 }), N("radius", "Area (m)", "範囲(m)", { step: 0.1 }),
        N("duration", "Duration (s)", "効果時間(秒)", { step: 0.1 }), N("unlockLevel", "Unlock level", "習得Lv", { type: "int" }),
        { key: "learnedBy", label: "Learned by", labelJa: "習得者", type: "text", ref: ["stats"] },
        { key: "state", label: "Applies state", labelJa: "付与ステート", type: "text", ref: ["states"] }, N("stateChance", "State %", "付与率", { max: 100 }),
        { key: "passive", label: "Passive trait", labelJa: "パッシブ特性", type: "text", ref: ["traits"] },
        { key: "description", label: "Description", labelJa: "説明", type: "text" }],
      rows: {
        slash: { name: "Power Slash", kind: "attack", target: "enemy", element: "none", power: 25, mpCost: 5, cooldown: 3, castTime: 0, range: 2, radius: 0, duration: 0, unlockLevel: 1, learnedBy: "hero", state: "", stateChance: 0, passive: "", description: "A heavy swing." },
        fireball: { name: "Fireball", kind: "attack", target: "area", element: "fire", power: 40, mpCost: 12, cooldown: 5, castTime: 1, range: 20, radius: 3, duration: 0, unlockLevel: 3, learnedBy: "mage", state: "burn", stateChance: 30, passive: "", description: "Explodes on impact." },
        heal: { name: "Heal", kind: "heal", target: "ally", element: "holy", power: 35, mpCost: 8, cooldown: 4, castTime: 0.8, range: 10, radius: 0, duration: 0, unlockLevel: 2, learnedBy: "mage", state: "", stateChance: 0, passive: "", description: "Restores HP." },
        guard: { name: "Iron Guard", kind: "buff", target: "self", element: "none", power: 50, mpCost: 6, cooldown: 12, castTime: 0, range: 0, radius: 0, duration: 6, unlockLevel: 2, learnedBy: "tank", state: "guarded", stateChance: 100, passive: "", description: "+50% defense for a while." },
        counter_stance: { name: "Counter Stance", kind: "passive", target: "self", element: "none", power: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0, radius: 0, duration: 0, unlockLevel: 5, learnedBy: "hero", state: "", stateChance: 0, passive: "counter", description: "Passive. Sometimes strikes back." },
        taunt: { name: "Taunt", kind: "debuff", target: "area", element: "none", power: 0, mpCost: 4, cooldown: 10, castTime: 0, range: 0, radius: 6, duration: 5, unlockLevel: 4, learnedBy: "tank", state: "", stateChance: 0, passive: "", description: "Enemies nearby target you." },
      },
    }, "skills"),
    ...rpgExtraTables(),
    ...metaTables(),
    rulesTable(),
    levelsFromRules(rulesTable()),
    ...lootTables(),
  ];
}

// Game-wide rules: one row per rule, a name and a value. Adding a rule is adding a row.
// Code: RULES.rows.maxLevel.value
export function rulesTable() {
  const R = (name, nameJa, value, note) => ({ name, nameJa, value, note });
  return normalize({
    label: "Rules", labelJa: "ルール", order: 5,
    note: "Game-wide balance rules. One row = one rule. 0/1 = off/on.",
    fields: [
      { key: "name", label: "Rule", labelJa: "ルール", type: "text" },
      { key: "nameJa", label: "Rule (JA)", labelJa: "ルール(日)", type: "text" },
      { key: "value", label: "Value", labelJa: "値", type: "number", step: 0.1 },
      { key: "note", label: "Note", labelJa: "メモ", type: "text" },
    ],
    rows: {
      maxLevel: R("Max level", "最大レベル", 30, "Levels table is generated up to this."),
      expBase: R("EXP to reach Lv 2", "Lv2までのEXP", 20, "Start of the EXP curve."),
      expGrowth: R("EXP growth per level", "EXPの伸び率", 1.18, "Each level needs this × the last. 1.1 gentle, 1.3 steep."),
      statPointsPerLevel: R("Stat points per level", "レベルごとの振り分けP", 3, ""),
      fullHealOnLevelUp: R("Full heal on level up", "レベルアップで全回復", 1, "0 off / 1 on"),
      critMultiplier: R("Crit damage ×", "会心ダメージ倍率", 1.5, ""),
      defenseFactor: R("Defense effect", "防御の効き", 0.5, "damage = attack − defense × this"),
      minDamage: R("Minimum damage", "最低ダメージ", 1, ""),
      weaknessMultiplier: R("Weakness damage ×", "弱点倍率", 1.5, ""),
      resistMultiplier: R("Resist damage ×", "耐性倍率", 0.5, ""),
      evasionCapPct: R("Evasion cap %", "回避率上限%", 60, ""),
      deathGoldLossPct: R("Gold lost on death %", "死亡時ゴールド減少%", 10, ""),
      respawnSeconds: R("Respawn time (s)", "復活までの秒数", 3, ""),
      sellRatePct: R("Sell price % of buy", "売値(買値の%)", 50, ""),
      innPrice: R("Inn price", "宿代", 10, ""),
      goldCap: R("Gold cap", "所持金上限", 999999, ""),
      dropRateMultiplier: R("Drop rate ×", "ドロップ率倍率", 1, "Multiplies every enemy's Drop %."),
      rareDropPct: R("Rare drop %", "レアドロップ%", 2, ""),
      expMultiplier: R("EXP gain ×", "獲得EXP倍率", 1, ""),
      goldMultiplier: R("Gold gain ×", "獲得ゴールド倍率", 1, ""),
    },
  }, "rules");
}

// One row per level, built from the rules' curve; hand-edits stay until the next regenerate.
// Code: LEVELS.rows.lv5.totalExp
export function levelsFromRules(rules, prev) {
  const v = (k, d) => { const r = rules && rules.rows[k]; const n = r ? Number(r.value) : NaN; return isFinite(n) ? n : d; };
  const max = Math.max(1, Math.min(999, Math.round(v("maxLevel", 30))));
  const base = Math.max(1, v("expBase", 20)), growth = Math.max(1, v("expGrowth", 1.18)), sp = v("statPointsPerLevel", 3);
  const rows = {}; let total = 0;
  for (let L = 1; L <= max; L++) {
    const toNext = L < max ? Math.round(base * Math.pow(growth, L - 1)) : 0;
    const old = prev && prev.rows["lv" + L];
    rows["lv" + L] = { level: L, totalExp: total, expToNext: toNext, statPoints: L === 1 ? 0 : sp, unlock: old ? old.unlock : "" };
    total += toNext;
  }
  return normalize({
    label: "Levels", labelJa: "レベル", order: 6,
    note: "Generated from Rules (maxLevel, expBase, expGrowth). Press Regenerate after changing them.",
    fields: [
      { key: "level", label: "Level", labelJa: "レベル", type: "int", min: 1 },
      { key: "totalExp", label: "Total EXP", labelJa: "累計EXP", type: "int", min: 0 },
      { key: "expToNext", label: "EXP to next", labelJa: "次までのEXP", type: "int", min: 0 },
      { key: "statPoints", label: "Stat points", labelJa: "振り分けP", type: "int", min: 0 },
      { key: "unlock", label: "Unlocks", labelJa: "解放", type: "text" },
    ],
    rows,
  }, "levels");
}

// Hack-and-slash loot: rarity tiers, drop tables (+ their entries), and the
// prefix / suffix affixes that roll onto a dropped item and name it
// ("Burning Iron Sword of the Bear").
export function lootTables() {
  const T = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "text" }, extra || {});
  const N = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "number", min: 0 }, extra || {});
  const I = (key, label, labelJa, extra) => N(key, label, labelJa, Object.assign({ type: "int" }, extra || {}));
  const affixFields = [T("name", "Name", "名前(英)"), T("nameJa", "Name (JA)", "名前(日)"), T("stat", "Stat", "ステータス"),
    N("min", "Min", "最小", { min: -9999, step: 0.1 }), N("max", "Max", "最大", { min: -9999, step: 0.1 }),
    T("unit", "Unit", "単位"), I("weight", "Weight", "重み"), Object.assign(T("minRarity", "Min rarity", "最低レア"), { ref: ["rarities"] }),
    I("minLevel", "Min item level", "最低アイテムLv"), T("slots", "Slots", "部位"), T("group", "Group", "グループ")];
  return [
    normalize({
      label: "Rarities", labelJa: "レアリティ", order: 60,
      note: "Rolled per drop by weight (× rules.rareDropPct for rare+). affixes = prefix + suffix count.",
      fields: [T("name", "Name", "名前(英)"), T("nameJa", "Name (JA)", "名前(日)"), I("tier", "Tier", "段階"), I("weight", "Weight", "重み"),
        N("statMultiplier", "Stat ×", "ステータス倍率", { step: 0.05 }), I("minPrefixes", "Min prefixes", "最小プレフィックス数"), I("maxPrefixes", "Max prefixes", "最大プレフィックス数"),
        I("minSuffixes", "Min suffixes", "最小サフィックス数"), I("maxSuffixes", "Max suffixes", "最大サフィックス数"),
        T("color", "Color", "色"), N("sellMultiplier", "Sell ×", "売値倍率", { step: 0.1 }), { key: "beam", label: "Loot beam", labelJa: "光の柱", type: "bool" }],
      rows: {
        normal: { name: "Normal", nameJa: "ノーマル", tier: 0, weight: 700, statMultiplier: 1, minPrefixes: 0, maxPrefixes: 0, minSuffixes: 0, maxSuffixes: 0, color: "#d8d8d8", sellMultiplier: 1, beam: false },
        magic: { name: "Magic", nameJa: "マジック", tier: 1, weight: 240, statMultiplier: 1.1, minPrefixes: 0, maxPrefixes: 1, minSuffixes: 0, maxSuffixes: 1, color: "#5b8cff", sellMultiplier: 2, beam: false },
        rare: { name: "Rare", nameJa: "レア", tier: 2, weight: 55, statMultiplier: 1.25, minPrefixes: 1, maxPrefixes: 2, minSuffixes: 1, maxSuffixes: 2, color: "#f5c800", sellMultiplier: 5, beam: false },
        legendary: { name: "Legendary", nameJa: "レジェンド", tier: 3, weight: 5, statMultiplier: 1.5, minPrefixes: 2, maxPrefixes: 3, minSuffixes: 2, maxSuffixes: 3, color: "#ff7a1a", sellMultiplier: 20, beam: true },
      },
    }, "rarities"),
    normalize({
      label: "Loot tables", labelJa: "ドロップ表", order: 70,
      note: "An enemy's lootTable names a row here. Entries live in Loot entries.",
      fields: [T("name", "Name", "名前"), I("rolls", "Rolls", "抽選回数"), N("nothingPct", "Nothing %", "ハズレ率", { max: 100 }),
        N("rarityBonus", "Rarity bonus ×", "レア補正", { step: 0.1 }), I("goldMin", "Gold min", "ゴールド最小"), I("goldMax", "Gold max", "ゴールド最大"),
        I("itemLevelBonus", "Item level +", "アイテムLv補正", { min: -99 })],
      rows: {
        trash: { name: "Trash mobs", rolls: 1, nothingPct: 70, rarityBonus: 1, goldMin: 1, goldMax: 5, itemLevelBonus: 0 },
        common: { name: "Common enemies", rolls: 1, nothingPct: 45, rarityBonus: 1, goldMin: 5, goldMax: 20, itemLevelBonus: 0 },
        elite: { name: "Elites", rolls: 2, nothingPct: 10, rarityBonus: 2, goldMin: 30, goldMax: 80, itemLevelBonus: 2 },
        boss: { name: "Bosses", rolls: 4, nothingPct: 0, rarityBonus: 4, goldMin: 200, goldMax: 500, itemLevelBonus: 5 },
      },
    }, "loot_tables"),
    normalize({
      label: "Loot entries", labelJa: "ドロップ中身", order: 71,
      note: "One row = one thing a loot table can drop. item = a row id in weapons / armors / items (or 'gold').",
      fields: [Object.assign(T("lootTable", "Loot table", "ドロップ表"), { ref: ["loot_tables"] }), Object.assign(T("item", "Item", "アイテム"), { ref: ["weapons", "armors", "items"], refAllow: ["gold"] }), I("weight", "Weight", "重み"),
        I("minQty", "Min qty", "最小個数"), I("maxQty", "Max qty", "最大個数"), Object.assign(T("forceRarity", "Force rarity", "レア固定"), { ref: ["rarities"] })],
      rows: {
        trash_dagger: { lootTable: "trash", item: "dagger", weight: 10, minQty: 1, maxQty: 1, forceRarity: "" },
        trash_cloth: { lootTable: "trash", item: "cloth", weight: 10, minQty: 1, maxQty: 1, forceRarity: "" },
        common_dagger: { lootTable: "common", item: "dagger", weight: 30, minQty: 1, maxQty: 1, forceRarity: "" },
        common_sword: { lootTable: "common", item: "iron_sword", weight: 15, minQty: 1, maxQty: 1, forceRarity: "" },
        common_leather: { lootTable: "common", item: "leather", weight: 25, minQty: 1, maxQty: 1, forceRarity: "" },
        common_shield: { lootTable: "common", item: "wood_shield", weight: 15, minQty: 1, maxQty: 1, forceRarity: "" },
        elite_axe: { lootTable: "elite", item: "axe", weight: 20, minQty: 1, maxQty: 1, forceRarity: "" },
        elite_bow: { lootTable: "elite", item: "bow", weight: 20, minQty: 1, maxQty: 1, forceRarity: "" },
        elite_chain: { lootTable: "elite", item: "chainmail", weight: 15, minQty: 1, maxQty: 1, forceRarity: "" },
        boss_sword: { lootTable: "boss", item: "iron_sword", weight: 20, minQty: 1, maxQty: 1, forceRarity: "rare" },
        boss_axe: { lootTable: "boss", item: "axe", weight: 20, minQty: 1, maxQty: 1, forceRarity: "" },
        boss_chain: { lootTable: "boss", item: "chainmail", weight: 20, minQty: 1, maxQty: 1, forceRarity: "" },
      },
    }, "loot_entries"),
    normalize({
      label: "Prefixes", labelJa: "プレフィックス", order: 80,
      note: "Rolled before the item name: \"Burning Iron Sword\". One per group per item. slots: weapon, armor, shield, any (comma-separated).",
      fields: affixFields,
      rows: {
        sharp: { name: "Sharp", nameJa: "鋭い", stat: "attack", min: 2, max: 6, unit: "", weight: 100, minRarity: "magic", minLevel: 1, slots: "weapon", group: "flat_attack" },
        cruel: { name: "Cruel", nameJa: "残虐な", stat: "attack", min: 8, max: 16, unit: "", weight: 30, minRarity: "rare", minLevel: 10, slots: "weapon", group: "flat_attack" },
        burning: { name: "Burning", nameJa: "燃え盛る", stat: "fireDamage", min: 3, max: 9, unit: "", weight: 60, minRarity: "magic", minLevel: 3, slots: "weapon", group: "element" },
        frozen: { name: "Frozen", nameJa: "凍てつく", stat: "iceDamage", min: 3, max: 9, unit: "", weight: 60, minRarity: "magic", minLevel: 3, slots: "weapon", group: "element" },
        sturdy: { name: "Sturdy", nameJa: "頑丈な", stat: "defense", min: 2, max: 6, unit: "", weight: 100, minRarity: "magic", minLevel: 1, slots: "armor,shield", group: "flat_defense" },
        swift: { name: "Swift", nameJa: "俊敏な", stat: "speed", min: 3, max: 8, unit: "%", weight: 50, minRarity: "magic", minLevel: 5, slots: "armor", group: "speed" },
        vampiric: { name: "Vampiric", nameJa: "吸血の", stat: "lifeSteal", min: 1, max: 3, unit: "%", weight: 10, minRarity: "rare", minLevel: 15, slots: "weapon", group: "leech" },
      },
    }, "prefixes"),
    normalize({
      label: "Suffixes", labelJa: "サフィックス", order: 81,
      note: "Rolled after the item name: \"Iron Sword of the Bear\". In Japanese the suffix leads: \"熊の鉄の剣\".",
      fields: affixFields,
      rows: {
        of_the_bear: { name: "of the Bear", nameJa: "熊の", stat: "maxHp", min: 10, max: 30, unit: "", weight: 100, minRarity: "magic", minLevel: 1, slots: "any", group: "life" },
        of_the_whale: { name: "of the Whale", nameJa: "鯨の", stat: "maxHp", min: 40, max: 80, unit: "", weight: 25, minRarity: "rare", minLevel: 12, slots: "armor,shield", group: "life" },
        of_precision: { name: "of Precision", nameJa: "精密の", stat: "crit", min: 2, max: 5, unit: "%", weight: 70, minRarity: "magic", minLevel: 4, slots: "weapon", group: "crit" },
        of_haste: { name: "of Haste", nameJa: "疾風の", stat: "attackSpeed", min: 5, max: 12, unit: "%", weight: 50, minRarity: "magic", minLevel: 6, slots: "weapon", group: "speed" },
        of_warding: { name: "of Warding", nameJa: "守護の", stat: "allResist", min: 3, max: 10, unit: "%", weight: 40, minRarity: "magic", minLevel: 8, slots: "armor,shield", group: "resist" },
        of_fortune: { name: "of Fortune", nameJa: "幸運の", stat: "goldFind", min: 5, max: 20, unit: "%", weight: 30, minRarity: "magic", minLevel: 1, slots: "any", group: "find" },
      },
    }, "suffixes"),
  ];
}

// Items, States and Elements — the rest of an RPG-maker database.
export function rpgExtraTables() {
  const N = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "number", min: 0 }, extra || {});
  const T = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "text" }, extra || {});
  const I = (key, label, labelJa, extra) => N(key, label, labelJa, Object.assign({ type: "int" }, extra || {}));
  const B = (key, label, labelJa) => ({ key, label, labelJa, type: "bool" });
  const NAME = T("name", "Name", "名前");
  return [
    normalize({
      label: "Items", labelJa: "アイテム", order: 35,
      note: "Consumables, materials and key items. kind: consumable | material | key. effect: heal | mana | cure | damage | buff | none. usable: battle | field | both | none.",
      fields: [NAME, T("kind", "Kind", "種類"), T("effect", "Effect", "効果"), I("power", "Power", "効果量"),
        T("element", "Element", "属性", { ref: ["elements"] }),
        T("addsState", "Adds state", "付与ステート", { ref: ["states"] }), T("curesState", "Cures state", "解除ステート", { ref: ["states"] }),
        T("usable", "Usable in", "使用場面"), B("consumed", "Used up", "消耗する"), I("maxStack", "Max stack", "最大所持数"),
        I("price", "Price", "価格"), I("sellPrice", "Sell price", "売値"), T("description", "Description", "説明")],
      rows: {
        potion: { name: "Potion", kind: "consumable", effect: "heal", power: 50, element: "", addsState: "", curesState: "", usable: "both", consumed: true, maxStack: 99, price: 30, sellPrice: 15, description: "Restores 50 HP." },
        hi_potion: { name: "Hi-Potion", kind: "consumable", effect: "heal", power: 200, element: "", addsState: "", curesState: "", usable: "both", consumed: true, maxStack: 99, price: 150, sellPrice: 75, description: "Restores 200 HP." },
        ether: { name: "Ether", kind: "consumable", effect: "mana", power: 30, element: "", addsState: "", curesState: "", usable: "both", consumed: true, maxStack: 99, price: 80, sellPrice: 40, description: "Restores 30 MP." },
        antidote: { name: "Antidote", kind: "consumable", effect: "cure", power: 0, element: "", addsState: "", curesState: "poison", usable: "both", consumed: true, maxStack: 99, price: 20, sellPrice: 10, description: "Cures poison." },
        remedy: { name: "Remedy", kind: "consumable", effect: "cure", power: 0, element: "", addsState: "", curesState: "poison, burn, freeze, stun, sleep, weaken", usable: "both", consumed: true, maxStack: 99, price: 120, sellPrice: 60, description: "Cures every bad state." },
        fire_bomb: { name: "Fire Bomb", kind: "consumable", effect: "damage", power: 60, element: "fire", addsState: "burn", curesState: "", usable: "battle", consumed: true, maxStack: 20, price: 90, sellPrice: 45, description: "Thrown. Burns what it hits." },
        iron_ore: { name: "Iron Ore", kind: "material", effect: "none", power: 0, element: "", addsState: "", curesState: "", usable: "none", consumed: false, maxStack: 999, price: 10, sellPrice: 5, description: "Crafting material." },
        old_key: { name: "Old Key", kind: "key", effect: "none", power: 0, element: "", addsState: "", curesState: "", usable: "field", consumed: false, maxStack: 1, price: 0, sellPrice: 0, description: "Opens the crypt door." },
      },
    }, "items"),
    normalize({
      label: "Elements", labelJa: "属性", order: 45,
      note: "Damage types. A hit of this element deals x strongMult to targets listed in strongVs, x weakMult to those in weakVs (target = the defender's element). Delete the table if the game has none.",
      fields: [NAME, T("color", "Color", "色"), T("strongVs", "Strong vs", "有利", { ref: ["elements"] }), T("weakVs", "Weak vs", "不利", { ref: ["elements"] }),
        N("strongMult", "Strong ×", "有利倍率", { step: 0.05 }), N("weakMult", "Weak ×", "不利倍率", { step: 0.05 }),
        T("state", "Can inflict", "付与ステート", { ref: ["states"] }), N("stateChance", "Inflict %", "付与率", { max: 100 })],
      rows: {
        none: { name: "None", color: "#bbbbbb", strongVs: "", weakVs: "", strongMult: 1, weakMult: 1, state: "", stateChance: 0 },
        fire: { name: "Fire", color: "#ff5a2a", strongVs: "ice", weakVs: "water", strongMult: 1.5, weakMult: 0.5, state: "burn", stateChance: 15 },
        ice: { name: "Ice", color: "#7fd8ff", strongVs: "thunder", weakVs: "fire", strongMult: 1.5, weakMult: 0.5, state: "freeze", stateChance: 10 },
        water: { name: "Water", color: "#2f7bff", strongVs: "fire", weakVs: "thunder", strongMult: 1.5, weakMult: 0.5, state: "", stateChance: 0 },
        thunder: { name: "Thunder", color: "#ffe23a", strongVs: "water", weakVs: "ice", strongMult: 1.5, weakMult: 0.5, state: "stun", stateChance: 10 },
        holy: { name: "Holy", color: "#fff4c2", strongVs: "dark", weakVs: "", strongMult: 2, weakMult: 1, state: "", stateChance: 0 },
        dark: { name: "Dark", color: "#7a3cff", strongVs: "holy", weakVs: "", strongMult: 2, weakMult: 1, state: "weaken", stateChance: 10 },
      },
    }, "elements"),
    normalize({
      label: "States", labelJa: "ステート", order: 55,
      note: "Status effects. kind: bad | good. dot = damage every tickEvery s (negative heals). *Pct = % change to that stat while active. curedBy: items that cure it, or words: hit, rest, death, time.",
      fields: [NAME, T("kind", "Kind", "種類"), N("duration", "Duration (s)", "持続(秒)", { step: 0.5 }),
        N("dot", "Damage / tick", "継続ダメージ", { min: -9999, type: "int" }), N("tickEvery", "Tick every (s)", "間隔(秒)", { step: 0.1 }),
        N("attackPct", "Attack %", "攻撃%", { min: -100, max: 500 }), N("defensePct", "Defense %", "防御%", { min: -100, max: 500 }), N("speedPct", "Speed %", "素早さ%", { min: -100, max: 500 }),
        B("noAct", "Can't act", "行動不能"), B("noMove", "Can't move", "移動不能"), I("maxStacks", "Max stacks", "最大重ね"),
        T("element", "Element", "属性", { ref: ["elements"] }), T("curedBy", "Cured by", "治し方", { ref: ["items"], refAllow: ["hit", "rest", "death", "time"] }),
        T("color", "Color", "色"), T("description", "Description", "説明")],
      rows: {
        poison: { name: "Poison", kind: "bad", duration: 10, dot: 3, tickEvery: 1, attackPct: 0, defensePct: 0, speedPct: 0, noAct: false, noMove: false, maxStacks: 3, element: "none", curedBy: "antidote, remedy, time", color: "#7bd14a", description: "Loses HP over time. Stacks." },
        burn: { name: "Burn", kind: "bad", duration: 5, dot: 6, tickEvery: 1, attackPct: 0, defensePct: -10, speedPct: 0, noAct: false, noMove: false, maxStacks: 1, element: "fire", curedBy: "remedy, time", color: "#ff6a2a", description: "Fire damage over time, softer armor." },
        freeze: { name: "Freeze", kind: "bad", duration: 3, dot: 0, tickEvery: 1, attackPct: 0, defensePct: 0, speedPct: -60, noAct: false, noMove: true, maxStacks: 1, element: "ice", curedBy: "remedy, hit, time", color: "#8fe3ff", description: "Rooted in place, slow." },
        stun: { name: "Stun", kind: "bad", duration: 1.5, dot: 0, tickEvery: 1, attackPct: 0, defensePct: 0, speedPct: 0, noAct: true, noMove: true, maxStacks: 1, element: "thunder", curedBy: "remedy, time", color: "#ffe23a", description: "Can't do anything." },
        sleep: { name: "Sleep", kind: "bad", duration: 8, dot: 0, tickEvery: 1, attackPct: 0, defensePct: -20, speedPct: 0, noAct: true, noMove: true, maxStacks: 1, element: "none", curedBy: "remedy, hit, time", color: "#b39cff", description: "Asleep until hit." },
        weaken: { name: "Weaken", kind: "bad", duration: 8, dot: 0, tickEvery: 1, attackPct: -30, defensePct: 0, speedPct: 0, noAct: false, noMove: false, maxStacks: 1, element: "dark", curedBy: "remedy, time", color: "#7a3cff", description: "Deals less damage." },
        regen: { name: "Regen", kind: "good", duration: 10, dot: -5, tickEvery: 1, attackPct: 0, defensePct: 0, speedPct: 0, noAct: false, noMove: false, maxStacks: 1, element: "holy", curedBy: "death, time", color: "#6cffb0", description: "Heals over time." },
        haste: { name: "Haste", kind: "good", duration: 8, dot: 0, tickEvery: 1, attackPct: 0, defensePct: 0, speedPct: 40, noAct: false, noMove: false, maxStacks: 1, element: "none", curedBy: "death, time", color: "#ffffff", description: "Faster." },
        guarded: { name: "Guarded", kind: "good", duration: 6, dot: 0, tickEvery: 1, attackPct: 0, defensePct: 50, speedPct: 0, noAct: false, noMove: false, maxStacks: 1, element: "none", curedBy: "death, time", color: "#c9d3dd", description: "+50% defense (Iron Guard)." },
      },
    }, "states"),
  ];
}

// Traits (+ passives), player data layout, party scaling, achievements.
export function metaTables() {
  const N = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "number", min: 0 }, extra || {});
  const T = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "text" }, extra || {});
  const I = (key, label, labelJa, extra) => N(key, label, labelJa, Object.assign({ type: "int" }, extra || {}));
  const P = (key, label, labelJa) => N(key, label, labelJa, { min: -100, max: 500 });
  const B = (key, label, labelJa) => ({ key, label, labelJa, type: "bool" });
  const NAME = T("name", "Name", "名前");
  const tr = (name, o) => Object.assign({ name, attackPct: 0, defensePct: 0, speedPct: 0, maxHpPct: 0, critPct: 0, expPct: 0, goldPct: 0, resist: "", weak: "", immune: "", onHitState: "", onHitChance: 0, description: "" }, o);
  return [
    normalize({
      label: "Traits", labelJa: "特性", order: 52,
      note: "Always-on modifiers. Put a trait id in a character's / enemy's traits (comma list), or in a skill's passive to unlock it as a passive. resist = elements taken at half, weak = x1.5, immune = states that never land.",
      fields: [NAME, P("attackPct", "Attack %", "攻撃%"), P("defensePct", "Defense %", "防御%"), P("speedPct", "Speed %", "素早さ%"),
        P("maxHpPct", "Max HP %", "最大HP%"), P("critPct", "Crit +%", "会心+%"), P("expPct", "EXP %", "経験値%"), P("goldPct", "Gold %", "ゴールド%"),
        T("resist", "Resists", "耐性属性", { ref: ["elements"] }), T("weak", "Weak to", "弱点属性", { ref: ["elements"] }), T("immune", "Immune to", "無効ステート", { ref: ["states"] }),
        T("onHitState", "On hit: state", "攻撃時ステート", { ref: ["states"] }), N("onHitChance", "On hit %", "攻撃時確率", { max: 100 }), T("description", "Description", "説明")],
      rows: {
        brave: tr("Brave", { attackPct: 10, immune: "weaken", description: "+10% attack, can't be weakened." }),
        arcane_mind: tr("Arcane Mind", { resist: "fire, ice, thunder", expPct: 10, description: "Resists elements, learns fast." }),
        iron_skin: tr("Iron Skin", { defensePct: 15, speedPct: -10, immune: "stun", description: "Tough, slow, unstunnable." }),
        poison_immune: tr("Toxic Body", { immune: "poison", onHitState: "poison", onHitChance: 20, description: "Poison can't hurt it. Its touch poisons." }),
        fire_weak: tr("Dry Fur", { weak: "fire", description: "Takes extra fire damage." }),
        boss_body: tr("Boss Body", { maxHpPct: 50, immune: "stun, sleep, freeze", description: "Huge HP, no hard control." }),
        counter: tr("Counter", { onHitState: "", critPct: 5, description: "Passive: +5% crit. Game code adds the counter-swing." }),
        lucky: tr("Lucky", { goldPct: 25, critPct: 3, description: "More gold, more crits." }),
      },
    }, "traits"),
    normalize({
      label: "Player data", labelJa: "プレイヤーデータ", order: 90,
      note: "What a player's save holds and where. scope: account = shared by every character of the same player (survives swapping characters); character = per character; session = gone at logout. Code: player.state.account.<key> / player.state.chars[<charId>].<key>. slots (Rules) = characters per player.",
      fields: [T("scope", "Scope", "保存先"), T("type", "Type", "型"), T("default", "Default", "初期値"), N("max", "Max (0 = none)", "上限(0=なし)"),
        B("resetOnDeath", "Reset on death", "死亡でリセット"), T("description", "Description", "説明")],
      rows: {
        gold: { scope: "account", type: "int", default: "0", max: 9999999, resetOnDeath: false, description: "Wallet shared by all characters." },
        stash: { scope: "account", type: "list", default: "[]", max: 200, resetOnDeath: false, description: "Shared storage: item ids." },
        unlockedChars: { scope: "account", type: "list", default: "[\"hero\"]", max: 0, resetOnDeath: false, description: "Characters this player can pick (Stats row ids)." },
        achievements: { scope: "account", type: "map", default: "{}", max: 0, resetOnDeath: false, description: "Achievement id → unlocked time." },
        counters: { scope: "account", type: "map", default: "{}", max: 0, resetOnDeath: false, description: "Lifetime counts achievements read: kills, deaths, gold earned…" },
        activeChar: { scope: "account", type: "text", default: "hero", max: 0, resetOnDeath: false, description: "Character in play." },
        level: { scope: "character", type: "int", default: "1", max: 99, resetOnDeath: false, description: "This character's level." },
        exp: { scope: "character", type: "int", default: "0", max: 0, resetOnDeath: false, description: "This character's EXP." },
        equipment: { scope: "character", type: "map", default: "{}", max: 0, resetOnDeath: false, description: "slot → item id." },
        inventory: { scope: "character", type: "list", default: "[]", max: 40, resetOnDeath: false, description: "Carried item ids." },
        learnedSkills: { scope: "character", type: "list", default: "[]", max: 0, resetOnDeath: false, description: "Skill ids, passives included." },
        hp: { scope: "session", type: "int", default: "-1", max: 0, resetOnDeath: true, description: "Current HP (-1 = full)." },
        states: { scope: "session", type: "map", default: "{}", max: 0, resetOnDeath: true, description: "Active state id → { until, stacks }." },
      },
    }, "player_data"),
    normalize({
      label: "Party scaling", labelJa: "人数バランス", order: 91,
      note: "Multiplayer balance, one row per player count nearby. Row id p1..p4; past the last row the last row holds. expSplit: shared = each gets the full EXP x expMult; split = divided.",
      fields: [I("players", "Players", "人数", { min: 1 }), N("enemyHpMult", "Enemy HP ×", "敵HP倍率", { step: 0.05 }), N("enemyAtkMult", "Enemy ATK ×", "敵攻撃倍率", { step: 0.05 }),
        N("spawnMult", "Enemy count ×", "敵の数倍率", { step: 0.05 }), N("lootMult", "Loot ×", "ドロップ倍率", { step: 0.05 }), N("expMult", "EXP ×", "経験値倍率", { step: 0.05 }),
        T("expSplit", "EXP split", "経験値分配"), N("reviveTime", "Revive time (s)", "蘇生時間(秒)", { step: 0.5 })],
      rows: {
        p1: { players: 1, enemyHpMult: 1, enemyAtkMult: 1, spawnMult: 1, lootMult: 1, expMult: 1, expSplit: "shared", reviveTime: 0 },
        p2: { players: 2, enemyHpMult: 1.6, enemyAtkMult: 1.1, spawnMult: 1.3, lootMult: 1.2, expMult: 0.9, expSplit: "shared", reviveTime: 5 },
        p3: { players: 3, enemyHpMult: 2.2, enemyAtkMult: 1.2, spawnMult: 1.6, lootMult: 1.4, expMult: 0.85, expSplit: "shared", reviveTime: 5 },
        p4: { players: 4, enemyHpMult: 2.8, enemyAtkMult: 1.3, spawnMult: 1.9, lootMult: 1.6, expMult: 0.8, expSplit: "shared", reviveTime: 6 },
      },
    }, "party_scaling"),
    normalize({
      label: "Achievements", labelJa: "実績", order: 92,
      note: "counter = a key the game counts up in player data counters (kills, kills_boss, deaths, gold_earned, level, items_used…). Unlocks when counter >= target. Saved per player (account scope).",
      fields: [NAME, T("nameJa", "Name (JA)", "名前(日)"), T("counter", "Counter", "カウンター"), I("target", "Target", "目標値", { min: 1 }),
        I("rewardGold", "Reward gold", "報酬ゴールド"), T("rewardItem", "Reward item", "報酬アイテム", { ref: ["items", "weapons", "armors"] }),
        T("unlocksChar", "Unlocks character", "解放キャラ", { ref: ["stats"] }), B("hidden", "Hidden", "隠し"), T("icon", "Icon", "アイコン"), T("description", "Description", "説明")],
      rows: {
        first_blood: { name: "First Blood", nameJa: "初陣", counter: "kills", target: 1, rewardGold: 10, rewardItem: "potion", unlocksChar: "", hidden: false, icon: "", description: "Defeat your first enemy." },
        hunter: { name: "Hunter", nameJa: "狩人", counter: "kills", target: 100, rewardGold: 300, rewardItem: "", unlocksChar: "mage", hidden: false, icon: "", description: "Defeat 100 enemies." },
        slayer: { name: "Boss Slayer", nameJa: "ボス討伐", counter: "kills_boss", target: 1, rewardGold: 500, rewardItem: "hi_potion", unlocksChar: "tank", hidden: false, icon: "", description: "Defeat a boss." },
        rich: { name: "Fat Wallet", nameJa: "小金持ち", counter: "gold_earned", target: 10000, rewardGold: 0, rewardItem: "", unlocksChar: "", hidden: false, icon: "", description: "Earn 10,000 gold total." },
        veteran: { name: "Veteran", nameJa: "歴戦", counter: "level", target: 20, rewardGold: 1000, rewardItem: "", unlocksChar: "", hidden: false, icon: "", description: "Reach level 20." },
        clumsy: { name: "Oops", nameJa: "うっかり", counter: "deaths", target: 10, rewardGold: 0, rewardItem: "remedy", unlocksChar: "", hidden: true, icon: "", description: "Fall 10 times." },
      },
    }, "achievements"),
  ];
}

// Starter sets the empty Database tab offers: "rpg" (the full set above),
// "action" (a shooter / brawler / arena: player, enemies, weapons, pickups, waves)
// and "minimal" (Rules + one blank table to grow from).
export const STARTER_PRESETS = ["rpg", "action", "minimal"];
export function starterSet(preset) {
  if (preset === "action") return actionTables();
  if (preset === "minimal") return minimalTables();
  return starterTables();
}

function ruleRows(label, labelJa, note, rows) {
  return normalize({
    label, labelJa, order: 5, note,
    fields: [
      { key: "name", label: "Rule", labelJa: "ルール", type: "text" },
      { key: "nameJa", label: "Rule (JA)", labelJa: "ルール(日)", type: "text" },
      { key: "value", label: "Value", labelJa: "値", type: "number", step: 0.1 },
      { key: "note", label: "Note", labelJa: "メモ", type: "text" },
    ],
    rows,
  }, "rules");
}
const RR = (name, nameJa, value, note) => ({ name, nameJa, value, note: note || "" });

export function actionTables() {
  const N = (key, label, labelJa, extra) => Object.assign({ key, label, labelJa, type: "number", min: 0 }, extra || {});
  const NAME = { key: "name", label: "Name", labelJa: "名前", type: "text" };
  return [
    ruleRows("Rules", "ルール", "Match-wide rules for an action game. One row = one rule. 0/1 = off/on.", {
      lives: RR("Lives", "残機", 3, "0 = infinite"),
      respawnSeconds: RR("Respawn time (s)", "復活までの秒数", 2),
      invulnSeconds: RR("Invulnerable after hit (s)", "被弾後の無敵時間(秒)", 0.8),
      scoreToWin: RR("Score to win", "勝利スコア", 1000, "0 = no score win"),
      timeLimitSeconds: RR("Time limit (s)", "制限時間(秒)", 300, "0 = none"),
      comboWindowSeconds: RR("Combo window (s)", "コンボ受付(秒)", 1.5),
      comboScoreStep: RR("Combo score × per hit", "コンボごとのスコア倍率", 0.1),
      friendlyFire: RR("Friendly fire", "味方への攻撃", 0, "0 off / 1 on"),
    }),
    normalize({
      label: "Player", labelJa: "プレイヤー", order: 10,
      note: "One row per playable character.",
      fields: [NAME, N("maxHp", "Max HP", "最大HP", { type: "int" }), N("moveSpeed", "Move speed (m/s)", "移動速度", { step: 0.1 }),
        N("sprintSpeed", "Sprint (m/s)", "ダッシュ速度", { step: 0.1 }), N("jumpSpeed", "Jump speed", "ジャンプ力", { step: 0.1 }),
        N("dashCooldown", "Dash cooldown (s)", "回避クールダウン", { step: 0.05 }),
        { key: "weapon", label: "Start weapon", labelJa: "初期武器", type: "text", ref: ["weapons"] }],
      rows: {
        runner: { name: "Runner", maxHp: 100, moveSpeed: 6, sprintSpeed: 9, jumpSpeed: 8, dashCooldown: 1.2, weapon: "blaster" },
        heavy: { name: "Heavy", maxHp: 160, moveSpeed: 4.5, sprintSpeed: 6.5, jumpSpeed: 6.5, dashCooldown: 2, weapon: "shotgun" },
      },
    }, "player"),
    normalize({
      label: "Enemies", labelJa: "敵", order: 20,
      fields: [NAME, N("maxHp", "Max HP", "最大HP", { type: "int" }), N("damage", "Damage", "ダメージ", { type: "int" }),
        N("speed", "Speed (m/s)", "速度", { step: 0.1 }), N("aggroRange", "Notice range (m)", "索敵範囲(m)", { step: 0.5 }),
        N("attackRange", "Attack range (m)", "攻撃範囲(m)", { step: 0.1 }), N("attackCooldown", "Attack every (s)", "攻撃間隔(秒)", { step: 0.05 }),
        N("score", "Score", "スコア", { type: "int" }),
        { key: "drop", label: "Drop", labelJa: "ドロップ", type: "text", ref: ["pickups"] }, N("dropChance", "Drop %", "ドロップ率", { max: 100 })],
      rows: {
        grunt: { name: "Grunt", maxHp: 30, damage: 8, speed: 3, aggroRange: 15, attackRange: 1.5, attackCooldown: 1, score: 10, drop: "medkit", dropChance: 10 },
        runner: { name: "Runner", maxHp: 15, damage: 5, speed: 6, aggroRange: 20, attackRange: 1.2, attackCooldown: 0.6, score: 15, drop: "ammo", dropChance: 20 },
        shooter: { name: "Shooter", maxHp: 40, damage: 10, speed: 2.5, aggroRange: 25, attackRange: 18, attackCooldown: 1.5, score: 25, drop: "ammo", dropChance: 30 },
        brute: { name: "Brute", maxHp: 250, damage: 25, speed: 2, aggroRange: 18, attackRange: 2.5, attackCooldown: 2.2, score: 150, drop: "powerup", dropChance: 100 },
      },
    }, "enemies"),
    normalize({
      label: "Weapons", labelJa: "武器", order: 30,
      fields: [NAME, N("damage", "Damage", "ダメージ", { type: "int" }), N("fireRate", "Shots / s", "連射速度", { step: 0.1 }),
        N("range", "Range (m)", "射程(m)", { step: 0.5 }), N("projectileSpeed", "Bullet speed (m/s)", "弾速", { step: 1, note: "0 = instant hit" }),
        N("spread", "Spread (°)", "拡散(度)", { step: 0.1 }), N("pellets", "Pellets", "弾数/発", { type: "int" }),
        N("magazine", "Magazine", "装弾数", { type: "int" }), N("reloadSeconds", "Reload (s)", "リロード(秒)", { step: 0.05 }),
        N("knockback", "Knockback", "ノックバック", { step: 0.1 })],
      rows: {
        blaster: { name: "Blaster", damage: 12, fireRate: 4, range: 40, projectileSpeed: 60, spread: 1.5, pellets: 1, magazine: 20, reloadSeconds: 1.4, knockback: 1 },
        shotgun: { name: "Shotgun", damage: 8, fireRate: 1.2, range: 15, projectileSpeed: 0, spread: 8, pellets: 8, magazine: 6, reloadSeconds: 2.2, knockback: 5 },
        sword: { name: "Sword", damage: 30, fireRate: 1.8, range: 2, projectileSpeed: 0, spread: 0, pellets: 1, magazine: 0, reloadSeconds: 0, knockback: 3 },
      },
    }, "weapons"),
    normalize({
      label: "Pickups", labelJa: "アイテム", order: 40,
      fields: [NAME, { key: "kind", label: "Kind", labelJa: "種類", type: "text", note: "heal | ammo | score | powerup" },
        N("amount", "Amount", "量", { step: 1 }), N("duration", "Lasts (s)", "効果時間(秒)", { step: 0.5, note: "powerups only" }),
        N("respawnSeconds", "Respawn (s)", "再出現(秒)", { step: 1, note: "0 = once" })],
      rows: {
        medkit: { name: "Medkit", kind: "heal", amount: 40, duration: 0, respawnSeconds: 30 },
        ammo: { name: "Ammo", kind: "ammo", amount: 30, duration: 0, respawnSeconds: 20 },
        coin: { name: "Coin", kind: "score", amount: 5, duration: 0, respawnSeconds: 0 },
        powerup: { name: "Overdrive", kind: "powerup", amount: 2, duration: 10, respawnSeconds: 60 },
      },
    }, "pickups"),
    normalize({
      label: "Waves", labelJa: "ウェーブ", order: 50,
      note: "Spawned in order. The next wave starts after `delay` seconds once the last one is cleared.",
      fields: [{ key: "enemy", label: "Enemy", labelJa: "敵", type: "text", ref: ["enemies"] },
        N("count", "Count", "数", { type: "int" }), N("interval", "Every (s)", "出現間隔(秒)", { step: 0.1 }),
        N("delay", "Delay before (s)", "開始までの秒数", { step: 0.5 }), N("bonus", "Clear bonus", "クリアボーナス", { type: "int" })],
      rows: {
        wave_1: { enemy: "grunt", count: 6, interval: 1.5, delay: 3, bonus: 50 },
        wave_2: { enemy: "grunt, runner", count: 10, interval: 1.2, delay: 5, bonus: 100 },
        wave_3: { enemy: "shooter, runner", count: 12, interval: 1, delay: 5, bonus: 150 },
        wave_4: { enemy: "brute", count: 1, interval: 0, delay: 8, bonus: 500 },
      },
    }, "waves"),
  ];
}

export function minimalTables() {
  return [
    ruleRows("Rules", "ルール", "Game-wide rules. One row = one rule. Add a row for every number the whole game shares.", {
      timeLimitSeconds: RR("Time limit (s)", "制限時間(秒)", 0, "0 = none"),
      scoreToWin: RR("Score to win", "勝利スコア", 0, "0 = none"),
    }),
    normalize({
      label: "Things", labelJa: "もの", order: 10,
      note: "A blank table: rename it (enemies, cars, cards…), then add a field per number and a row per thing.",
      fields: [{ key: "name", label: "Name", labelJa: "名前", type: "text" }, { key: "value", label: "Value", labelJa: "値", type: "number" }],
      rows: { thing_1: { name: "First thing", value: 1 } },
    }, "things"),
  ];
}
