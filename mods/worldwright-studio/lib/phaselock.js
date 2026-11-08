// phaselock.js — THE ONE FILE IN THIS TREE THAT KNOWS THE PHASE LOCK MOD EXISTS. the build data is the Codex's own (lib/buildstate.js); the mod brings only the gate. Never writes, never runs SQL, never requires mods/… — an absent mod must stay quiet, never throw.

const BUILD = require("lib/buildstate.js");

const MOD_ID = "phase-lock";
const LEDGER = "mods/phase-lock/ledger.json";

// The named seam for a follow-write into the mod's ledger. Not built: this lane is fenced read-only.
const LEDGER_FOLLOWS = false;

let cacheKey = "";
let cacheLedger = null;

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

// Cache key is the raw text's length + first 400 chars — the mod rewrites the whole file on any change.
export function read(objectApi) {
  if (!installed(objectApi)) {
    cacheKey = "";
    cacheLedger = null;
    return null;
  }
  let src = "";
  try {
    src = text(objectApi && objectApi.getScript ? objectApi.getScript(LEDGER) : "");
  } catch (e) {
    src = "";
  }
  if (!src) return null;
  const key = src.length + ":" + src.slice(0, 400);
  if (key === cacheKey) return cacheLedger;
  let parsed = null;
  try {
    parsed = JSON.parse(src);
  } catch (e) {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = null;
  cacheKey = key;
  cacheLedger = parsed;
  return parsed;
}

const SAID = {
  "not-started": "not started",
  "in-progress": "in progress",
  "awaiting-approval": "awaiting approval",
  approved: "approved",
};

export function statusWords(s) {
  const k = text(s).trim().toLowerCase();
  return SAID[k] || (k ? k.replace(/-/g, " ") : "not started");
}

// -1 = nothing approved yet — a real value, not a missing one.
export function approvedWords(n, nameOf) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 0) return "nothing approved yet";
  const nm = typeof nameOf === "function" ? text(nameOf(v)) : "";
  return "approved through Phase " + v + (nm ? " · " + nm : "");
}

export function countOf(v) {
  return Array.isArray(v) ? v.length : 0;
}

// The display object the gate strip draws from: Codex build data first, the ledger filling only what
// the Codex has never been told. Everything defensively defaulted; nothing here can throw.
export function state(objectApi, build) {
  const version = installed(objectApi);
  const ledger = read(objectApi);
  const codex = build && typeof build === "object" ? BUILD.normalize(build) : BUILD.peek();
  const haveCodex = !!(codex && (codex.updatedAt > 0 || codex.phase > 0 || codex.approvedThrough >= 0 || codex.systems.length || codex.backlog.length || codex.bugs.length || codex.parked.length));
  const base = codex || BUILD.blank();

  const useLedger = !haveCodex && ledger;
  const phase = useLedger ? clamp(ledger.phase) : base.phase;
  const approvedThrough = useLedger ? approvedOf(ledger.approvedThrough) : base.approvedThrough;
  const status = useLedger ? text(ledger.status) || "not-started" : base.status;
  const systems = useLedger ? listOf(ledger.systems) : base.systems;
  const backlog = useLedger ? listOf(ledger.backlog) : base.backlog;
  const bugs = useLedger ? listOf(ledger.bugs) : base.bugs;
  const parked = base.parked || [];
  const artifacts = ledger && Array.isArray(ledger.artifacts) ? ledger.artifacts.length : 0;

  return {
    installed: !!version,
    version: version,
    source: haveCodex ? "codex" : useLedger ? "ledger" : "codex",
    phase: phase,
    // The NAME is always our ladder's, derived from the number — never a stored string.
    phaseName: BUILD.phaseName(phase),
    code: BUILD.allowsCode(phase),
    status: status,
    statusWords: statusWords(status),
    approvedThrough: approvedThrough,
    approvedWords: approvedWords(approvedThrough, BUILD.phaseName),
    counts: {
      artifacts: artifacts,
      systems: countOf(systems),
      backlog: countOf(backlog),
      bugs: countOf(bugs),
      parked: countOf(parked),
    },
    systems: systems,
    backlog: backlog,
    bugs: bugs,
    parked: parked,
    // Disagreement is shown, never repaired here — the Codex is corrected first (worldwright-mods §3).
    drift: !!(ledger && haveCodex && (clamp(ledger.phase) !== base.phase || approvedOf(ledger.approvedThrough) !== base.approvedThrough)),
    ledgerFollows: LEDGER_FOLLOWS,
  };
}

export function clamp(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(BUILD.PHASES.length - 1, n));
}

export function approvedOf(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return -1;
  return Math.max(-1, Math.min(BUILD.PHASES.length - 1, n));
}

// The mod's ledger list in the Codex's own row shape ({ name, status, note }); malformed rows drop.
export function listOf(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    if (typeof r === "string") {
      const nm = text(r).trim();
      if (nm) out.push({ name: nm, status: "not-started", note: "" });
      continue;
    }
    if (!r || typeof r !== "object") continue;
    const nm = text(r.name).trim();
    if (!nm) continue;
    out.push({ name: nm, status: text(r.status).trim() || "not-started", note: text(r.note) });
  }
  return out;
}

// The discipline as answers rather than prose. Pure — hand it a state() object.
export function gate(s) {
  const st = s && typeof s === "object" ? s : {};
  if (!st.installed) return { active: false, open: null, parkOutOfScope: false, needsCheckpoint: false, canAdvance: false };
  const phase = clamp(st.phase);
  const approved = approvedOf(st.approvedThrough);
  return {
    active: true,
    open: phase,
    openName: BUILD.phaseName(phase),
    code: BUILD.allowsCode(phase),
    parkOutOfScope: true,
    needsCheckpoint: approved < phase,
    canAdvance: approved >= phase && phase < BUILD.PHASES.length - 1,
  };
}

module.exports = {
  MOD_ID: MOD_ID,
  LEDGER: LEDGER,
  LEDGER_FOLLOWS: LEDGER_FOLLOWS,
  installed: installed,
  read: read,
  state: state,
  gate: gate,
  statusWords: statusWords,
  approvedWords: approvedWords,
};
