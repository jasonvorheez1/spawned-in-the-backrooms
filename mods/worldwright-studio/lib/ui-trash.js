// js — the trash window: everything thrown away in this book, newest first.

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");

const FOLDER = "folder";
const STACK = "stack";
const HOLD_MS = 760;

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const act = (op, id, entityType, extra) =>
  `event.stopPropagation();${bare(op, id, entityType, extra)}`;

// The same call with no event in scope: what a hold timer fires.
const bare = (op, id, entityType, extra) =>
  `sendAction('cardAct', { op: '${Q(op)}'${id ? `, id: '${Q(id)}'` : ""}${
    entityType ? `, entityType: '${Q(entityType)}'` : ""
  }${extra ? `, ${extra}` : ""} })`;

export function ago(ms, nowMs) {
  const t = Number(ms || 0);
  const now = Number(nowMs || 0);
  if (!t || !now || now < t) return "";
  const s = Math.floor((now - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}

export function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

// Arithmetic, not Date — this runs in the game sandbox, where the clock is not ours to read.
export function stamp(ms) {
  const t = Math.floor(Number(ms || 0));
  if (!t) return "";
  const days = Math.floor(t / 86400000);
  const rem = t - days * 86400000;
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const year = y + (m <= 2 ? 1 : 0);
  const hh = Math.floor(rem / 3600000);
  const mm = Math.floor(rem / 60000) % 60;
  return year + "-" + pad(m) + "-" + pad(d) + " " + pad(hh) + ":" + pad(mm) + " UTC";
}

export function group(n) {
  const s = String(Math.max(0, Math.floor(Number(n) || 0)));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

export function folderGlyph() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M3.5 6.5h5.2l1.7 2.1h10.1v9.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

export function stackGlyph() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <rect x="6.5" y="4.5" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M4.5 7.5v11a1 1 0 0 0 1 1h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

export function holds(n) {
  const c = Number(n || 0);
  if (!c) return "empty folder";
  return c === 1 ? "1 card inside" : c + " cards inside";
}

export function kindOf(item) {
  const t = String((item && item.entityType) || "card");
  if (t === FOLDER) return FOLDER;
  return String((item && item.restoreAs) || "") === STACK ? STACK : "card";
}

export function glyphFor(kind) {
  if (kind === FOLDER) return `<span class="sbt-glyph">${folderGlyph()}</span>`;
  if (kind === STACK) return `<span class="sbt-glyph">${stackGlyph()}</span>`;
  return "";
}

export function subLine(item, kind, nowMs) {
  const bits = [];
  const when = ago(item.trashedAt, nowMs);
  if (when) bits.push(`<span class="sbt-when" title="${E(stamp(item.trashedAt))}">${E(when)}</span>`);
  else if (item.trashedAt) bits.push(`<span class="sbt-when">${E(stamp(item.trashedAt))}</span>`);
  if (item.origin) bits.push(`<span class="sbt-from${item.originGone ? " lost" : ""}">from ${E(item.origin)}</span>`);
  if (kind === FOLDER) bits.push(`<span class="sbt-sum">${E(holds(item.childCount))}</span>`);
  else {
    const sum = String(item.summary || "").slice(0, 90);
    if (sum) bits.push(`<span class="sbt-sum">${E(sum)}</span>`);
  }
  return bits.join(`<span class="sbt-dot">·</span>`);
}

export function flagLine(item) {
  const flags = [];
  if (item.stackNote) flags.push(String(item.stackNote));
  if (item.restoreNote) flags.push(String(item.restoreNote));
  if (!flags.length) return "";
  return `<div class="sbt-flag">${flags.map((f) => E(f)).join(" · ")}</div>`;
}

export function row(item, nowMs) {
  const kind = kindOf(item);
  const sendKind = kind === STACK ? STACK : kind;
  const restoreTitle =
    kind === FOLDER
      ? "Put the folder back with everything in it"
      : kind === STACK
      ? "Put the whole stack back"
      : item.restoresTo === "root"
      ? "Put this card back — its folder is gone, so it lands in the book root"
      : "Put this card back where it came from";
  const purgeTitle =
    kind === FOLDER
      ? "Press and hold to delete this folder and everything in it, forever"
      : kind === STACK
      ? "Press and hold to delete every draft in this stack, forever"
      : "Press and hold to delete this card forever";

  const fire = bare("trashPurge", item.id, sendKind, "confirm: true");
  const down =
    `event.stopPropagation();var b=this;b.classList.add('holding');` +
    `b._sbt=setTimeout(function(){b.classList.remove('holding');b.classList.add('spent');${fire};},${HOLD_MS});`;
  const up = `event.stopPropagation();clearTimeout(this._sbt);this.classList.remove('holding');`;

  const ride = item.rider ? Math.max(1, Math.min(4, Number(item.riderDepth) || 1)) : 0;
  return `<div class="sbt-row${kind === FOLDER ? " is-folder" : ""}${kind === STACK ? " is-stack" : ""}${
    item.rider ? " is-rider" : ""
  }"${ride ? ` style="padding-left:${8 + ride * 16}px"` : ""}>
    <div class="sbt-what">
      <div class="sbt-name">${glyphFor(kind)}<span class="sbt-nm">${E(
    item.name || (kind === FOLDER ? "Folder" : "Untitled")
  )}</span>${
    kind === STACK && item.stack && item.stack.members
      ? `<span class="sbt-chip">stack of ${E(item.stack.members)}</span>`
      : ""
  }${
    item.rider
      ? `<span class="sbt-chip dim">↳ in “${E(item.riderOfName || "a trashed folder")}”</span>`
      : ""
  }${item.restoresTo === "root" ? `<span class="sbt-chip warn">→ book root</span>` : ""}</div>
      <div class="sbt-sub">${subLine(item, kind, nowMs)}</div>
      ${flagLine(item)}
    </div>
    <button class="sbt-btn back" data-interactive title="${E(restoreTitle)}" onclick="${act(
    "trashRestore",
    item.id,
    sendKind
  )}">Put Back</button>
    <button class="sbt-btn gone" data-interactive title="${E(purgeTitle)}"
      onpointerdown="${down}" onpointerup="${up}" onpointerleave="${up}" onpointercancel="${up}"
      onclick="event.stopPropagation();">Delete forever<span class="sbt-hint">hold</span></button>
  </div>`;
}

export function capPill(t, items) {
  const count = Number(t.count || 0) || items.length;
  const cap = Number(t.cap || 0);
  if (!cap) return count ? `<span class="sbt-cap">${E(group(count))} in here</span>` : "";
  const full = !!t.full || count >= cap;
  return `<span class="sbt-cap${full ? " full" : ""}" title="Nothing in the trash expires — the only limit is ${E(
    group(cap)
  )} entries in a project">${E(group(count))} of ${E(group(cap))}${full ? " — full" : ""}</span>`;
}

export function foot(t, items) {
  // n is the BODY COUNT (t.entries.total — every trash row, riders included), never items.length: a folder line hides the cards that rode it in, and the typed phrase must name everything that dies — the same number the cap pill counts. lib/trash.js checks the identical count.
  const e = t.entries || null;
  const n = e ? Number(e.total) || 0 : items.length;
  const cardsN = e ? Number(e.cards) || 0 : 0;
  const foldersN = e ? Number(e.folders) || 0 : 0;
  const bits = [];
  if (cardsN) bits.push(`${cardsN} ${cardsN === 1 ? "card" : "cards"}`);
  if (foldersN) bits.push(`${foldersN} ${foldersN === 1 ? "folder" : "folders"}`);
  const split = e && bits.length ? ` — ${bits.join(" and ")} —` : "";
  const retention =
    (t.retention && t.retention.note) ||
    "Nothing in the trash expires. It waits here until you put it back or delete it forever.";
  const phrase = "DELETE " + n;
  if (!n) {
    return `<div class="sbt-foot"><span class="sbt-note">${E(retention)}</span></div>`;
  }
  return `<div class="sbt-foot">
    <span class="sbt-note">${E(retention)}</span>
    <span class="sbt-grow"></span>
    <button id="sb-trash-empty-btn" class="sbt-btn gone wide" data-interactive
      title="Delete everything in this book's trash, forever"
      onclick="event.stopPropagation();var c=document.getElementById('sb-trash-confirm');if(c){c.classList.add('on')}this.style.display='none';var i=document.getElementById('sb-trash-type');if(i){i.focus()}">Empty Trash</button>
  </div>
  <div id="sb-trash-confirm" class="sbt-confirm">
    <div class="sbt-ask">This deletes all ${E(n)} ${n === 1 ? "entry" : "entries"}${E(
    split
  )} forever. Type <b>${E(phrase)}</b> to confirm.</div>
    <div class="sbt-ask-row">
      <input id="sb-trash-type" class="sbt-type" type="text" spellcheck="false" autocomplete="off"
        placeholder="${E(phrase)}" data-interactive
        oninput="this.classList.remove('bad')"
        onkeydown="event.stopPropagation();if(event.key==='Enter'){var g=document.getElementById('sb-trash-go');if(g){g.click()}}" />
      <button id="sb-trash-go" class="sbt-btn gone" data-interactive
        onclick="event.stopPropagation();var i=document.getElementById('sb-trash-type');if(i&&i.value.trim().toUpperCase()==='${Q(
          phrase
        )}'){this.disabled=true;${bare("trashEmpty", "", "", "confirm: i.value")}}else if(i){i.classList.add('bad');i.focus()}">Delete them all</button>
      <button class="sbt-btn" data-interactive
        onclick="event.stopPropagation();var c=document.getElementById('sb-trash-confirm');if(c){c.classList.remove('on')}var b=document.getElementById('sb-trash-empty-btn');if(b){b.style.display=''}">Cancel</button>
    </div>
  </div>`;
}

export function render(ui) {
  const t = (ui && ui.trash) || null;
  if (!t || !t.open) return "";
  const items = Array.isArray(t.items) ? t.items : [];
  const body = t.loading
    ? `<div class="sbt-empty">opening the can…</div>`
    : items.length
    ? items.map((it) => row(it, t.now)).join("")
    : `<div class="sbt-empty">nothing in the trash</div>`;

  return `${styles()}
  <div id="sb-trash" data-modal onclick="${act("trashClose")}">
    <div class="sbt-win" onclick="event.stopPropagation()">
      <div class="sbt-head">
        <span class="sbt-title">Trash</span>
        <span class="sbt-addr">${E(t.bookName || "")}</span>
        ${capPill(t, items)}
        <button class="sbt-x" data-interactive title="Close" onclick="${act("trashClose")}">✕</button>
      </div>
      ${ERR.line(t.error, "trash", "sbt-err")}
      ${
        t.error && !t.loading
          ? `<div class="sbt-retry"><button class="sbt-btn" data-interactive onclick="${act(
              "trashReload"
            )}">Try again</button></div>`
          : ""
      }
      <div class="sbt-body">${body}</div>
      ${foot(t, items)}
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-trash { position: absolute; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-trash .sbt-win { width: min(560px, 94%); max-height: 84%; display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-trash .sbt-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--sb-line); }
  #sb-trash .sbt-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-trash .sbt-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-trash .sbt-cap { flex: 0 0 auto; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); border: 1px solid var(--sb-line);
    border-radius: 999px; padding: 2px 8px; }
  #sb-trash .sbt-cap.full { color: var(--sb-warn, oklch(0.72 0.16 30)); border-color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-trash .sbt-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(17px * var(--sb-fs, 1)); cursor: pointer; padding: 2px 6px; }
  #sb-trash .sbt-x:hover { color: var(--sb-accent); }
  #sb-trash .sbt-err { padding: 8px 14px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-trash .sbt-retry { padding: 0 14px 8px; }
  #sb-trash .sbt-body { flex: 1 1 auto; overflow: auto; padding: 6px 8px; -webkit-overflow-scrolling: touch; }
  #sb-trash .sbt-empty { padding: 26px 14px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-trash .sbt-row { display: flex; align-items: center; gap: 8px; padding: 9px 8px; border-bottom: 1px solid
    color-mix(in oklch, var(--sb-line) 60%, transparent); }
  #sb-trash .sbt-row:last-child { border-bottom: none; }
  #sb-trash .sbt-what { flex: 1 1 auto; min-width: 0; }
  #sb-trash .sbt-name { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: calc(13px * var(--sb-fs, 1)); color: var(--sb-ink); }
  #sb-trash .sbt-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-trash .sbt-glyph { display: inline-flex; align-items: center; flex: 0 0 auto;
    color: color-mix(in oklch, var(--sb-accent) 78%, var(--sb-ink-dim)); }
  #sb-trash .sbt-chip { flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 0.3px; text-transform: uppercase;
    color: var(--sb-ink-dim); border: 1px solid var(--sb-line); border-radius: 999px; padding: 1px 6px; }
  #sb-trash .sbt-chip.warn { color: var(--sb-warn, oklch(0.72 0.16 30));
    border-color: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 55%, transparent); }
  #sb-trash .sbt-chip.dim { text-transform: none; letter-spacing: 0.1px;
    color: color-mix(in oklch, var(--sb-ink-dim) 85%, transparent); border-style: dashed; }
  #sb-trash .sbt-row.is-rider { background: color-mix(in oklch, var(--sb-line) 14%, transparent); }
  #sb-trash .sbt-row.is-rider .sbt-nm { color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); }
  #sb-trash .sbt-row.is-folder .sbt-sum { color: color-mix(in oklch, var(--sb-accent) 40%, var(--sb-ink-dim)); }
  #sb-trash .sbt-sub { display: flex; gap: 6px; align-items: baseline; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-trash .sbt-when { flex: 0 0 auto; }
  #sb-trash .sbt-dot { flex: 0 0 auto; opacity: 0.5; }
  #sb-trash .sbt-from { flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: color-mix(in oklch, var(--sb-accent) 45%, var(--sb-ink-dim)); }
  #sb-trash .sbt-from.lost { color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-trash .sbt-sum { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-trash .sbt-flag { margin-top: 3px; font-size: calc(10px * var(--sb-fs, 1)); line-height: 1.35;
    color: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 72%, var(--sb-ink-dim)); }
  #sb-trash .sbt-btn { flex: 0 0 auto; min-height: 34px; padding: 0 12px; border-radius: 5px; cursor: pointer;
    font-size: calc(12px * var(--sb-fs, 1)); border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink); }
  #sb-trash .sbt-btn.back:hover { border-color: var(--sb-accent); color: var(--sb-accent); }
  #sb-trash .sbt-btn.gone { position: relative; overflow: hidden; color: var(--sb-ink-dim);
    display: inline-flex; align-items: center; gap: 6px; }
  #sb-trash .sbt-btn.gone:hover { color: var(--sb-warn, oklch(0.72 0.16 30)); border-color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-trash .sbt-btn.gone::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 0;
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 26%, transparent); transition: width 0s; }
  #sb-trash .sbt-btn.gone.holding::before { width: 100%; transition: width ${HOLD_MS}ms linear; }
  #sb-trash .sbt-btn.gone.spent { opacity: 0.45; pointer-events: none; }
  #sb-trash .sbt-btn.gone > * { position: relative; }
  #sb-trash .sbt-hint { font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 0.4px; text-transform: uppercase; opacity: 0.6; }
  #sb-trash .sbt-btn.wide { padding: 0 14px; }
  #sb-trash .sbt-foot { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid var(--sb-line); }
  #sb-trash .sbt-note { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-trash .sbt-grow { flex: 1 1 auto; }
  #sb-trash .sbt-confirm { display: none; padding: 10px 14px 12px; border-top: 1px solid var(--sb-line);
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 8%, transparent); }
  #sb-trash .sbt-confirm.on { display: block; }
  #sb-trash .sbt-ask { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink); margin-bottom: 7px; }
  #sb-trash .sbt-ask b { color: var(--sb-warn, oklch(0.72 0.16 30)); letter-spacing: 0.5px; }
  #sb-trash .sbt-ask-row { display: flex; align-items: center; gap: 8px; }
  #sb-trash .sbt-type { flex: 1 1 auto; min-width: 0; min-height: 34px; padding: 0 10px; border-radius: 5px;
    font-size: calc(12px * var(--sb-fs, 1)); letter-spacing: 0.5px; border: 1px solid var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink); }
  #sb-trash .sbt-type.bad { border-color: var(--sb-warn, oklch(0.72 0.16 30));
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 12%, var(--sb-panel)); }
  </style>`;
}

module.exports = { render };
