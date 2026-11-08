// ui-recover.js — the Recover window: everything in the database but not on the shelf, and the
//   buttons that put it back.
// PURE: render(ui) -> html, "" when closed — no api, no SQL, no state writes.

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function act(op, args) {
  return `event.stopPropagation();sendAction('${Q(op)}'${args ? `, { ${args} }` : ", {}"})`;
}

export function tally(parts) {
  const said = [];
  for (let i = 0; i < parts.length; i++) {
    const n = Math.max(0, Math.floor(Number(parts[i][0]) || 0));
    if (!n) continue;
    said.push(n + " " + (n === 1 ? parts[i][1] : parts[i][2]));
  }
  if (!said.length) return "";
  if (said.length === 1) return said[0];
  return said.slice(0, -1).join(", ") + " and " + said[said.length - 1];
}

export function bookLine(b) {
  const cards = tally([[b.cards, "card", "cards"]]) || "no cards in it";
  const reason = String(b.reason || "");
  if (reason !== "project-gone" && reason !== "no-project") {
    return "On your shelf — " + cards + ". Nothing to recover.";
  }
  const why =
    reason === "project-gone" ? "the project it was filed under is gone" : "it was never filed under a project";
  return "Not on your shelf — " + cards + ". " + why + ".";
}

export function contentLine(c) {
  const stuff =
    tally([
      [c.cards, "card", "cards"],
      [c.folders, "folder", "folders"],
      [c.pages, "page", "pages"],
      [c.sections, "section", "sections"],
    ]) || "rows";
  return "Loose content — " + stuff + " still in the database with no book to reach them by.";
}

export function row(name, sub, buttons, chip) {
  return `<div class="sbr-row">
    <div class="sbr-what">
      <div class="sbr-name"><span class="sbr-nm">${E(name)}</span>${
    chip ? `<span class="sbr-chip">${E(chip)}</span>` : ""
  }</div>
      <div class="sbr-sub">${E(sub)}</div>
    </div>
    <div class="sbr-acts">${buttons}</div>
  </div>`;
}

export function bookRow(b) {
  const reason = String(b.reason || "");
  const lost = b.lost === undefined ? reason === "project-gone" || reason === "no-project" : !!b.lost;
  // A healthy book is LISTED, never offered a button.
  const buttons = lost
    ? `<button class="sbr-btn back" data-interactive
    title="File this book under the project you have open"
    onclick="${act("recoverAdopt", `bookId: '${Q(b.id)}'`)}">Restore</button>`
    : "";
  return row(b.name || "Untitled Book", bookLine(b), buttons, lost ? "needs recovering" : "on your shelf");
}

export function contentRow(c, armed) {
  const id = String(c.bookId || "");
  const restore = `<button class="sbr-btn back" data-interactive
    title="Write a book row back so these cards are reachable again"
    onclick="${act("recoverRebuild", `bookId: '${Q(id)}'`)}">Restore</button>`;
  // Two presses: the first turns the row into the question, the second is the only thing that writes.
  const discard = armed
    ? `<span class="sbr-ask">discard these rows for good?</span>
       <button class="sbr-btn keep" data-interactive
         onclick="${act("recoverSweep", `bookId: '${Q(id)}', cancel: true`)}">Keep them</button>
       <button class="sbr-btn gone" data-interactive
         onclick="${act("recoverSweep", `bookId: '${Q(id)}', confirm: true`)}">Discard</button>`
    : `<button class="sbr-btn quiet" data-interactive
         title="Clear these rows out of the database"
         onclick="${act("recoverSweep", `bookId: '${Q(id)}'`)}">Discard</button>`;
  return row(id, contentLine(c), restore + discard);
}

export function booksNote(books) {
  const lost = books.filter((b) => (b.lost === undefined ? String(b.reason || "") !== "shelved" : !!b.lost)).length;
  if (!lost) return "Every book in the database is filed under this game — nothing here needs recovering.";
  return (
    (lost === 1 ? "One book is" : lost + " books are") +
    " not on your shelf. Restore files it back under this game's project."
  );
}

export function section(title, note, rows) {
  if (!rows.length) return "";
  return `<div class="sbr-sec">
    <div class="sbr-sec-head">${E(title)}<span class="sbr-count">${rows.length}</span></div>
    ${note ? `<div class="sbr-sec-note">${E(note)}</div>` : ""}
    ${rows.join("")}
  </div>`;
}

export function render(ui) {
  const x = (ui && ui.recover) || null;
  if (!x || !x.open) return "";

  const projects = Array.isArray(x.projects) ? x.projects : [];
  const books = Array.isArray(x.books) ? x.books : [];
  const content = Array.isArray(x.content) ? x.content : [];
  const armed = x.confirm && String(x.confirm.action || "") === "sweep" ? String(x.confirm.id || "") : "";
  const found = projects.length + books.length + content.length;
  const lostBooks = books.filter((b) => (b.lost === undefined ? String(b.reason || "") !== "shelved" : !!b.lost)).length;
  const lost = lostBooks + content.length;

  const body = x.loading
    ? `<div class="sbr-loading"><div class="sbr-wheel" aria-hidden="true"></div>
       <div class="sbr-note">looking through the database…</div></div>`
    : found
    ? // The Projects category came out with the project layer (2026-08-25): there is one project,
      // it is the game, and a loose book is adopted by it rather than offered as an orphan.
      section(
        "Books",
        booksNote(books),
        books.map(bookRow)
      ) +
      section(
        "Content with no book",
        "Cards and pages from an older delete. Restore writes a book row back around them; Discard clears them out for good.",
        content.map((c) => contentRow(c, armed === String(c.bookId || "")))
      )
    : `<div class="sbr-empty">nothing is missing — every book you have is on your shelf.</div>`;

  const notice = x.notice ? `<div class="sbr-notice">${E(x.notice)}</div>` : "";

  return `${styles()}
  <div id="sb-recover" data-modal onclick="${act("recoverClose")}">
    <div class="sbr-win" onclick="event.stopPropagation()">
      <div class="sbr-head">
        <span class="sbr-title">Recover</span>
        <span class="sbr-addr">${E(
          x.loading
            ? ""
            : lost
            ? lost + (lost === 1 ? " thing needs recovering" : " things need recovering")
            : found
            ? "nothing needs recovering"
            : "nothing missing"
        )}</span>
        <button class="sbr-x" data-interactive title="Close" onclick="${act("recoverClose")}">✕</button>
      </div>
      ${ERR.line(x.error, "recover", "sbr-err")}
      ${notice}
      <div class="sbr-body">${body}</div>
      <div class="sbr-foot">
        <span class="sbr-fnote">Only your own work and rows with no author on them are ever listed here.</span>
        <span class="sbr-grow"></span>
        <button class="sbr-btn" data-interactive ${x.loading ? "disabled" : ""}
          onclick="${act("recoverRescan")}">Look again</button>
      </div>
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-recover { position: absolute; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-recover .sbr-win { width: min(580px, 94%); max-height: 84%; display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-recover .sbr-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--sb-line); }
  #sb-recover .sbr-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-recover .sbr-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-recover .sbr-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(17px * var(--sb-fs, 1));
    cursor: pointer; padding: 4px 8px; min-height: 34px; }
  #sb-recover .sbr-x:hover { color: var(--sb-accent); }
  #sb-recover .sbr-err { padding: 8px 14px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-recover .sbr-notice { padding: 8px 14px; font-size: calc(11px * var(--sb-fs, 1));
    color: color-mix(in oklch, var(--sb-accent) 80%, var(--sb-ink)); }
  #sb-recover .sbr-body { flex: 1 1 auto; overflow: auto; padding: 6px 8px; -webkit-overflow-scrolling: touch; }
  #sb-recover .sbr-empty { padding: 30px 16px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    line-height: 1.5; }
  #sb-recover .sbr-loading { min-height: 200px; display: flex; flex-direction: column; gap: 12px;
    align-items: center; justify-content: center; }
  #sb-recover .sbr-wheel { width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid color-mix(in oklch, var(--sb-ink) 18%, transparent);
    border-top-color: var(--sb-accent, oklch(0.78 0.13 82)); animation: sbr-spin 0.9s linear infinite; }
  @keyframes sbr-spin { to { transform: rotate(360deg); } }
  #sb-recover .sbr-note { font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-recover .sbr-sec { padding: 6px 4px 10px; }
  #sb-recover .sbr-sec-head { display: flex; align-items: center; gap: 8px; padding: 6px 6px 2px;
    font-size: calc(11px * var(--sb-fs, 1)); letter-spacing: 0.4px; text-transform: uppercase; color: var(--sb-accent); }
  #sb-recover .sbr-count { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); border: 1px solid var(--sb-line);
    border-radius: 999px; padding: 1px 7px; letter-spacing: 0; }
  #sb-recover .sbr-sec-note { padding: 0 6px 6px; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim); line-height: 1.45; }
  #sb-recover .sbr-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 8px;
    border-bottom: 1px solid color-mix(in oklch, var(--sb-line) 60%, transparent); }
  #sb-recover .sbr-row:last-child { border-bottom: none; }
  #sb-recover .sbr-what { flex: 1 1 240px; min-width: 0; }
  #sb-recover .sbr-name { display: flex; align-items: center; gap: 6px; min-width: 0;
    font-size: calc(13px * var(--sb-fs, 1)); color: var(--sb-ink); }
  #sb-recover .sbr-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-recover .sbr-chip { flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 0.3px; text-transform: uppercase;
    color: var(--sb-ink-dim); border: 1px solid var(--sb-line); border-radius: 999px; padding: 1px 6px; }
  #sb-recover .sbr-sub { margin-top: 3px; font-size: calc(10.5px * var(--sb-fs, 1)); line-height: 1.45; color: var(--sb-ink-dim); }
  #sb-recover .sbr-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  #sb-recover .sbr-ask { font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-recover .sbr-btn { flex: 0 0 auto; min-height: 34px; padding: 0 12px; border-radius: 5px; cursor: pointer;
    font: inherit; font-size: calc(12px * var(--sb-fs, 1)); border: 1px solid var(--sb-line);
    background: var(--sb-panel); color: var(--sb-ink); }
  #sb-recover .sbr-btn[disabled] { opacity: 0.45; cursor: default; }
  #sb-recover .sbr-btn.back:hover { border-color: var(--sb-accent); color: var(--sb-accent); }
  #sb-recover .sbr-btn.quiet { color: var(--sb-ink-dim); }
  #sb-recover .sbr-btn.quiet:hover, #sb-recover .sbr-btn.gone { color: var(--sb-warn, oklch(0.72 0.16 30));
    border-color: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 55%, var(--sb-line)); }
  #sb-recover .sbr-btn.keep:hover { border-color: var(--sb-accent); color: var(--sb-accent); }
  #sb-recover .sbr-foot { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid var(--sb-line); }
  #sb-recover .sbr-fnote { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-recover .sbr-grow { flex: 1 1 auto; }
  </style>`;
}

module.exports = { render };
