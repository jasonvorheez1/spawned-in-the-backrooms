// ui-err.js — ONE error line, drawn the same way everywhere it appears. Pure: string in, string out.
// His ask: the ✕ sits on the LEFT of the text and speaks errClear, carrying WHERE it was drawn.

export function esc(s) {
  return String(s === undefined || s === null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function dismiss(where) {
  return `<button class="sb-err-x" title="Dismiss" aria-label="Dismiss" data-interactive
    onclick="event.stopPropagation();sendAction('errClear', { where: '${q(where)}' })">✕</button>`;
}

// Returns "" for an empty error, so callers can drop it straight into a template.
export function line(text, where, cls) {
  const t = String(text === undefined || text === null ? "" : text);
  if (!t) return "";
  return `<div class="${esc(cls || "sb-err")}">${dismiss(where)}<span class="sb-err-t">${esc(t)}</span></div>`;
}

module.exports = { line, dismiss };
