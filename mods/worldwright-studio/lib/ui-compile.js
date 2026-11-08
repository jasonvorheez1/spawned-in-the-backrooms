// js — THE WHAT-CHANGED WINDOW. compile write and this file only draws what it holds. LANES NEXT a lane is a mod's territory, so its section names the mod AND its author — a missing mod says whose it is and that we cannot install it for him (house law 1: mods are never edited, and never installed on their author's behalf either).

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function num(v) {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

const KIND_WORD = { cinematic: "Cinematic doc", level: "Level doc" };

// A mod id is a slug; the window says it the way a person would.
export function modName(id) {
  const raw = String(id || "").trim();
  if (!raw) return "";
  return raw
    .split(/[-_]+/)
    .filter(function (w) {
      return w;
    })
    .map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// The loud tier: a warning about work the author moved by hand, or about something being overwritten,
// is the one he must not be able to scroll past.
export function isHot(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.indexOf("hand") !== -1 ||
    t.indexOf("moved") !== -1 ||
    t.indexOf("collis") !== -1 ||
    t.indexOf("conflict") !== -1 ||
    t.indexOf("overwrit") !== -1 ||
    t.indexOf("replace") !== -1
  );
}

export function warnRow(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return `<div class="sbc-warn${isHot(t) ? " hot" : ""}"><span class="sbc-warn-g">⚠</span><span>${E(t)}</span></div>`;
}

export function warnBlock(list, title) {
  const rows = (Array.isArray(list) ? list : [])
    .map(warnRow)
    .filter(function (r) {
      return r;
    })
    .join("");
  if (!rows) return "";
  return `<div class="sbc-warns">${title ? `<div class="sbc-warns-h">${E(title)}</div>` : ""}${rows}</div>`;
}

const OP_WORD = { add: "added", update: "changed", remove: "removed", keep: "unchanged" };

export function countBox(label, n, cls) {
  return `<div class="sbc-count ${cls}${n ? "" : " zero"}">
    <span class="sbc-count-n">${num(n)}</span>
    <span class="sbc-count-l">${E(label)}</span>
  </div>`;
}

export function itemRow(it) {
  const op = String((it && it.op) || "keep");
  const detail = String((it && it.detail) || "");
  const warn = String((it && it.warn) || "");
  return `<div class="sbc-item ${E(op)}">
    <span class="sbc-op ${E(op)}">${E(OP_WORD[op] || op)}</span>
    <span class="sbc-item-body">
      <span class="sbc-what">${E(String((it && it.what) || "—"))}</span>
      ${detail ? `<span class="sbc-detail">${E(detail)}</span>` : ""}
      ${warn ? `<span class="sbc-item-warn${isHot(warn) ? " hot" : ""}">⚠ ${E(warn)}</span>` : ""}
    </span>
  </div>`;
}

// Installed state, said plainly. A missing mod is not an error — it is a fact about the room, with
// the author's name on it, because installing it is HIS move and never ours.
export function laneDependency(lane) {
  const mid = String(lane.modId || "");
  const by = String(lane.modBy || "");
  if (!mid) {
    return {
      credit: "Worldwright Studio's own lane — no mod behind it.",
      pill: `<span class="sbc-pill mine">ours</span>`,
      missing: "",
    };
  }
  const name = modName(mid);
  const credit = name + (by ? " — by " + by : " — author not named") + " · " + mid;
  if (lane.installed) {
    return {
      credit: credit,
      pill: `<span class="sbc-pill on">installed${lane.version ? " v" + E(lane.version) : ""}</span>`,
      missing: "",
    };
  }
  return {
    credit: credit,
    pill: `<span class="sbc-pill off">not installed</span>`,
    missing:
      name +
      " is not installed in this game. It is " +
      (by ? by + "'s mod" : "someone else's mod") +
      " — Worldwright Studio cannot install it for you. Install it yourself and compile again; until then this lane's lines are read but nothing crosses to it.",
  };
}

export function resultRow(r) {
  if (!r) return "";
  const err = String(r.error || "");
  const bits = [];
  bits.push(plural(num(r.landed), "landed", "landed"));
  if (num(r.skipped)) bits.push(num(r.skipped) + " skipped");
  return `<div class="sbc-res${err ? " bad" : num(r.landed) ? " good" : ""}">
    <span class="sbc-res-h">${err ? "did not land" : "landed"}</span>
    <span class="sbc-res-l">${E(bits.join(" · "))}</span>
    ${err ? `<span class="sbc-res-e">${E(err)}</span>` : ""}
  </div>${warnBlock(r.warnings, "")}`;
}

export function laneSection(lane, result) {
  const c = lane.counts || {};
  const items = (lane.items || []).filter(function (it) {
    return it && it.op !== "keep";
  });
  const kept = num(c.keep);
  const dep = laneDependency(lane);
  const tally = [];
  if (num(c.add)) tally.push(num(c.add) + " added");
  if (num(c.update)) tally.push(num(c.update) + " changed");
  if (num(c.remove)) tally.push(num(c.remove) + " removed");
  if (kept) tally.push(kept + " unchanged");

  const body = items.length
    ? items.map(itemRow).join("")
    : `<div class="sbc-nochange">Nothing changes in this lane${kept ? " — " + plural(kept, "line", "lines") + " already landed" : ""}.</div>`;

  return `<section class="sbc-lane">
    <div class="sbc-lane-head">
      <span class="sbc-lane-name">${E(lane.name)}</span>
      ${dep.pill}
      <span class="sbc-lane-tally">${E(tally.join(" · ") || "nothing")}</span>
    </div>
    <div class="sbc-lane-what">${E(lane.what || "")}</div>
    <div class="sbc-credit">${E(dep.credit)}</div>
    ${dep.missing ? `<div class="sbc-missing">${E(dep.missing)}</div>` : ""}
    ${warnBlock(lane.warnings, "")}
    ${result ? resultRow(result) : ""}
    <div class="sbc-items">${body}</div>
    ${items.length && kept ? `<div class="sbc-kept">${E(plural(kept, "line", "lines"))} unchanged, left alone.</div>` : ""}
  </section>`;
}

export function skeleton() {
  return `<div class="sbc-skel">
    <div class="sbc-skel-row wide"></div>
    <div class="sbc-skel-row"></div>
    <div class="sbc-skel-row"></div>
    <div class="sbc-skel-note"><span class="sb-spin mini"></span> reading the folder…</div>
  </div>`;
}

export function render(ui) {
  const c = (ui && ui.compile) || null;
  if (!c || !c.open) return "";
  const plan = c.plan || null;
  const results = c.results || null;
  const kind = String((plan && plan.kind) || c.kind || "");
  const where = String((plan && plan.folderName) || c.folderName || "this folder");
  const counts = (plan && plan.counts) || { add: 0, update: 0, remove: 0, keep: 0 };
  const lanes = (plan && plan.lanes) || [];
  const resBy = {};
  for (const r of (results && results.lanes) || []) resBy[String(r.id)] = r;

  const landedLine = results
    ? `<div class="sbc-landed${results.error ? " bad" : ""}">
        <span class="sbc-landed-h">${results.error ? "The landing hit trouble" : "Landed"}</span>
        <span>${E(
          num(results.landed) + " landed · " + num(results.skipped) + " skipped across " + plural(lanes.length, "lane", "lanes")
        )}</span>
        ${results.error ? `<span class="sbc-landed-e">${E(results.error)}</span>` : ""}
      </div>`
    : "";

  const head = `<div class="sbc-head">
      <span class="sbc-title">What changed</span>
      <span class="sbc-where">${E(where)}${kind ? " · " + E(KIND_WORD[kind] || kind) : ""}</span>
      <button class="sbc-x" data-interactive title="Close" aria-label="Close"
        onclick="sendAction('compileClose', {})">✕</button>
    </div>`;

  const body = !plan
    ? skeleton()
    : `<div class="sbc-counts">
        ${countBox("Added", counts.add, "add")}
        ${countBox("Changed", counts.update, "update")}
        ${countBox("Removed", counts.remove, "remove")}
        ${countBox("Kept", counts.keep, "keep")}
      </div>
      <div class="sbc-scope">${E(
        plural(num(plan.cards), "card", "cards") + " read · " + plural(num(plan.tokens), "directive", "directives") + " found"
      )}</div>
      ${landedLine}
      ${warnBlock(plan.warnings, "Read this first")}
      ${
        lanes.length
          ? lanes
              .map(function (l) {
                return laneSection(l, resBy[String(l.id)] || null);
              })
              .join("")
          : `<div class="sbc-nochange">No lane runs on a ${E(KIND_WORD[kind] || "designated")} folder yet.</div>`
      }`;

  const canLand = !!plan && !!kind && !c.landing;
  const foot = `<div class="sbc-foot">
      <span class="sbc-foot-note">${E(
        results
          ? "Landed. Tweak the prose and compile again — the next plan diffs against this press."
          : plan
            ? "Nothing has landed yet. This is the plan."
            : "Reading…"
      )}</span>
      <button class="sbc-btn ghost" data-interactive onclick="sendAction('compileClose', {})">Close</button>
      <button class="sbc-btn go${canLand ? "" : " off"}" data-interactive${canLand ? "" : " disabled"}
        onclick="sendAction('compileLand', {})">${results ? "Land it again" : "Land it"}</button>
    </div>`;

  return `${styles()}
  <div id="sb-compile" data-modal onclick="sendAction('compileClose', {})">
    <div class="sbc-win" onclick="event.stopPropagation()">
      ${head}
      ${ERR.line(c.error, "compile", "sb-err")}
      <div class="sbc-body">${body}</div>
      ${foot}
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-compile { position: absolute; inset: 0; z-index: 76; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-compile .sbc-win { width: min(820px, 96%); height: min(660px, 92%); display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-compile .sbc-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; padding: 11px 14px;
    border-bottom: 1px solid var(--sb-line); flex: 0 0 auto; }
  #sb-compile .sbc-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent);
    font-size: calc(14px * var(--sb-fs, 1)); }
  #sb-compile .sbc-where { flex: 1 1 auto; min-width: 0; font-size: calc(11.5px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-compile .sbc-x { background: none; border: 0; color: var(--sb-ink-dim); cursor: pointer;
    font-size: calc(14px * var(--sb-fs, 1)); padding: 4px 6px; min-width: 36px; min-height: 36px; }
  #sb-compile .sbc-x:hover { color: var(--sb-ink); }

  #sb-compile .sbc-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 12px 14px 16px;
    touch-action: pan-y; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }

  /* the four numbers — the whole press in one glance */
  #sb-compile .sbc-counts { display: flex; gap: 8px; flex-wrap: wrap; }
  #sb-compile .sbc-count { flex: 1 1 118px; min-width: 96px; display: flex; flex-direction: column; gap: 2px;
    padding: 9px 11px; border-radius: 5px; border: 1px solid var(--sb-line); background: var(--sb-panel); }
  #sb-compile .sbc-count-n { font-size: calc(21px * var(--sb-fs, 1)); font-weight: 700; line-height: 1.05; }
  #sb-compile .sbc-count-l { font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.1px;
    text-transform: uppercase; color: var(--sb-ink-dim); }
  #sb-compile .sbc-count.add .sbc-count-n { color: var(--sb-ok); }
  #sb-compile .sbc-count.update .sbc-count-n { color: var(--sb-accent); }
  #sb-compile .sbc-count.remove .sbc-count-n { color: var(--sb-warn, var(--sb-accent)); }
  #sb-compile .sbc-count.keep .sbc-count-n { color: var(--sb-ink-dim); }
  #sb-compile .sbc-count.zero { background: color-mix(in oklch, var(--sb-panel) 80%, var(--sb-bg)); }
  #sb-compile .sbc-count.zero .sbc-count-n { color: color-mix(in oklch, var(--sb-ink-dim) 60%, var(--sb-line)); }
  #sb-compile .sbc-scope { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); padding: 8px 2px 2px; }

  #sb-compile .sbc-landed { display: flex; flex-direction: column; gap: 3px; margin-top: 10px; padding: 9px 11px;
    border-radius: 5px; font-size: calc(12px * var(--sb-fs, 1));
    border: 1px solid color-mix(in oklch, var(--sb-ok) 45%, var(--sb-line));
    background: color-mix(in oklch, var(--sb-ok) 11%, var(--sb-panel)); }
  #sb-compile .sbc-landed.bad { border-color: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 55%, var(--sb-line));
    background: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 12%, var(--sb-panel)); }
  #sb-compile .sbc-landed-h { font-weight: 700; letter-spacing: 0.4px; }
  #sb-compile .sbc-landed-e { color: var(--sb-warn, var(--sb-accent)); }

  /* warnings — loud by default, hottest when they touch hand-placed work */
  #sb-compile .sbc-warns { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
  #sb-compile .sbc-warns-h { font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.1px;
    text-transform: uppercase; color: var(--sb-warn, var(--sb-accent)); font-weight: 700; }
  #sb-compile .sbc-warn { display: flex; gap: 7px; align-items: flex-start; padding: 8px 10px; border-radius: 4px;
    font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.5; color: var(--sb-ink);
    border: 1px solid color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 42%, var(--sb-line));
    background: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 10%, var(--sb-panel)); }
  #sb-compile .sbc-warn-g { flex: 0 0 auto; color: var(--sb-warn, var(--sb-accent)); }
  #sb-compile .sbc-warn.hot { border-width: 1px; border-left-width: 4px; font-weight: 600;
    border-color: var(--sb-warn, var(--sb-accent));
    background: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 20%, var(--sb-panel)); }

  /* one section per lane */
  #sb-compile .sbc-lane { margin-top: 14px; padding: 11px 12px 12px; border-radius: 6px;
    border: 1px solid var(--sb-line); background: var(--sb-panel); }
  #sb-compile .sbc-lane-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  #sb-compile .sbc-lane-name { font-size: calc(14px * var(--sb-fs, 1)); font-weight: 700; color: var(--sb-ink); }
  #sb-compile .sbc-lane-tally { flex: 1 1 auto; text-align: right; font-size: calc(11px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); }
  #sb-compile .sbc-lane-what { font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    line-height: 1.5; padding-top: 4px; }
  #sb-compile .sbc-credit { font-size: calc(10.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-line));
    padding-top: 3px; }
  #sb-compile .sbc-missing { margin-top: 8px; padding: 9px 11px; border-radius: 4px; line-height: 1.55;
    font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-ink);
    border: 1px solid color-mix(in oklch, var(--sb-accent) 40%, var(--sb-line));
    background: color-mix(in oklch, var(--sb-accent) 9%, var(--sb-panel)); }
  #sb-compile .sbc-pill { font-size: calc(10px * var(--sb-fs, 1)); font-weight: 600; white-space: nowrap;
    border-radius: 999px; padding: 3px 10px; border: 1px solid var(--sb-line); color: var(--sb-ink-dim); }
  #sb-compile .sbc-pill.on { color: var(--sb-ok);
    background: color-mix(in oklch, var(--sb-ok) 14%, var(--sb-panel));
    border-color: color-mix(in oklch, var(--sb-ok) 40%, var(--sb-line)); }
  #sb-compile .sbc-pill.off { color: var(--sb-warn, var(--sb-accent));
    background: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 10%, var(--sb-panel));
    border-color: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 45%, var(--sb-line)); }
  #sb-compile .sbc-pill.mine { color: var(--sb-ink-dim); }

  #sb-compile .sbc-items { display: flex; flex-direction: column; gap: 5px; margin-top: 9px; }
  #sb-compile .sbc-item { display: flex; gap: 8px; align-items: flex-start; padding: 7px 9px; border-radius: 4px;
    background: var(--sb-panel-2, var(--sb-panel)); border: 1px solid color-mix(in oklch, var(--sb-line) 70%, transparent); }
  #sb-compile .sbc-item-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  #sb-compile .sbc-op { flex: 0 0 auto; min-width: 74px; font-size: calc(9.5px * var(--sb-fs, 1)); font-weight: 700;
    letter-spacing: 1px; text-transform: uppercase; padding-top: 3px; }
  #sb-compile .sbc-op.add { color: var(--sb-ok); }
  #sb-compile .sbc-op.update { color: var(--sb-accent); }
  #sb-compile .sbc-op.remove { color: var(--sb-warn, var(--sb-accent)); }
  #sb-compile .sbc-op.keep { color: var(--sb-ink-dim); }
  #sb-compile .sbc-what { font-size: calc(12.5px * var(--sb-fs, 1)); color: var(--sb-ink); overflow-wrap: anywhere; }
  #sb-compile .sbc-detail { font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow-wrap: anywhere; }
  #sb-compile .sbc-item-warn { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, var(--sb-accent));
    line-height: 1.45; }
  #sb-compile .sbc-item-warn.hot { font-weight: 700; }
  #sb-compile .sbc-nochange, #sb-compile .sbc-kept { font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    font-style: italic; padding-top: 7px; }
  #sb-compile .sbc-res { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; margin-top: 9px;
    padding: 7px 10px; border-radius: 4px; font-size: calc(11.5px * var(--sb-fs, 1));
    border: 1px solid var(--sb-line); background: var(--sb-panel-2, var(--sb-panel)); }
  #sb-compile .sbc-res.good { border-color: color-mix(in oklch, var(--sb-ok) 40%, var(--sb-line)); }
  #sb-compile .sbc-res.bad { border-color: color-mix(in oklch, var(--sb-warn, var(--sb-accent)) 50%, var(--sb-line)); }
  #sb-compile .sbc-res-h { font-size: calc(9.5px * var(--sb-fs, 1)); font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--sb-ink-dim); }
  #sb-compile .sbc-res-e { color: var(--sb-warn, var(--sb-accent)); }

  #sb-compile .sbc-skel { display: flex; flex-direction: column; gap: 9px; padding: 6px 2px; }
  #sb-compile .sbc-skel-row { height: 44px; border-radius: 5px; border: 1px solid var(--sb-line);
    background: color-mix(in oklch, var(--sb-panel) 76%, var(--sb-bg)); }
  #sb-compile .sbc-skel-row.wide { height: 62px; }
  #sb-compile .sbc-skel-note { display: flex; align-items: center; gap: 8px; font-size: calc(11.5px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); }

  #sb-compile .sbc-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; border-top: 1px solid var(--sb-line); }
  #sb-compile .sbc-foot-note { flex: 1 1 220px; min-width: 0; font-size: calc(11px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); line-height: 1.45; }
  #sb-compile .sbc-btn { font: inherit; font-size: calc(12.5px * var(--sb-fs, 1)); cursor: pointer;
    color: var(--sb-ink); background: var(--sb-panel); border: 1px solid var(--sb-line);
    border-radius: 999px; padding: 8px 18px; min-height: 44px; min-width: 104px; }
  #sb-compile .sbc-btn:hover { border-color: color-mix(in oklch, var(--sb-accent) 60%, var(--sb-line)); }
  #sb-compile .sbc-btn.go { font-weight: 700; color: var(--sb-bg); background: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-compile .sbc-btn.go:hover { background: color-mix(in oklch, var(--sb-accent) 82%, var(--sb-lift)); }
  #sb-compile .sbc-btn.go.off { opacity: 0.5; cursor: default; }
  #sb-compile .sbc-btn.ghost { background: transparent; }

  /* his window is 820 wide and his pointer is a finger */
  @media (max-width: 860px) {
    #sb-compile .sbc-win { width: calc(100% - 12px); height: calc(100% - 16px); }
    #sb-compile .sbc-count { flex: 1 1 44%; }
    #sb-compile .sbc-op { min-width: 100%; padding-top: 0; }
    #sb-compile .sbc-item { flex-direction: column; gap: 3px; }
  }
  @media (pointer: coarse) {
    #sb-compile .sbc-x { min-width: 44px; min-height: 44px; }
    #sb-compile .sbc-btn { min-height: 48px; }
  }
  </style>`;
}

module.exports = { render, styles };
