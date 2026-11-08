// Co-op — ONE panel, three lists. PURE fragment: (props) => html string; scripts/ui.js decides who sees it. no invite codes, no join card, no access-mode card, no doors — a shelf answers by its two lists and who is here, nothing else.

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STYLE = `<style>
#sb-coop-overlay {
  position: absolute; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in oklch, var(--sb-scrim) 58%, transparent);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: calc(13px * var(--sb-fs, 1)); line-height: 1.35;
}
#sb-coop-card {
  width: 440px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 56px); display: flex; flex-direction: column;
  background: var(--sb-panel-2);
  border: 1px solid var(--sb-line);
  color: var(--sb-ink);
  box-shadow: 0 18px 42px color-mix(in oklch, var(--sb-shadow) 55%, transparent);
}
#sb-coop-card .coop-head { padding: 14px 16px 10px; border-bottom: 1px solid var(--sb-line); }
#sb-coop-card .coop-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); margin-bottom: 4px; }
#sb-coop-card .coop-sub { color: var(--sb-ink-dim); font-size: calc(12px * var(--sb-fs, 1)); }
/* The one scrolling body — a thumb pans it, and the pan never leaks to the workspace behind. */
#sb-coop-card .coop-body {
  flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 12px 16px 4px;
  touch-action: pan-y; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
#sb-coop-card .coop-foot {
  padding: 10px 16px 12px; border-top: 1px solid var(--sb-line);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
#sb-coop-card .coop-label {
  display: block; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.4px; text-transform: uppercase;
  color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); margin: 0 0 6px;
}
#sb-coop-card .coop-sect { margin-bottom: 16px; }
#sb-coop-card input.coop-input {
  width: 100%; min-height: 40px; padding: 8px 10px; font: inherit; color: inherit;
  background: var(--sb-field); border: 1px solid var(--sb-line); border-radius: 0; outline: none;
}
#sb-coop-card input.coop-input:focus { border-color: var(--sb-accent); }
#sb-coop-card .coop-error { color: var(--sb-warn); font-size: calc(12px * var(--sb-fs, 1)); min-height: 16px; flex: 1 1 auto; }
#sb-coop-card .coop-btn {
  font: inherit; min-height: 40px; padding: 8px 16px; border-radius: 0; cursor: pointer;
  background: transparent; border: 1px solid var(--sb-line); color: color-mix(in oklch, var(--sb-ink) 91%, var(--sb-ink-dim));
}
#sb-coop-card .coop-btn:hover { background: var(--sb-hover); }
#sb-coop-card .coop-btn.primary { background: var(--sb-accent); border-color: var(--sb-accent); color: var(--sb-bg); font-weight: 600; }
#sb-coop-card .coop-btn.primary:hover { background: color-mix(in oklch, var(--sb-accent) 82%, white); }
#sb-coop-card .coop-list {
  max-height: 210px; overflow-y: auto; border: 1px solid var(--sb-line);
  background: color-mix(in oklch, var(--sb-center) 50%, var(--sb-panel));
  touch-action: pan-y; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
#sb-coop-card .coop-line {
  display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 5px 8px 5px 10px;
  border-bottom: 1px solid color-mix(in oklch, var(--sb-line) 60%, var(--sb-panel));
}
#sb-coop-card .coop-line:last-child { border-bottom: 0; }
#sb-coop-card .coop-line .who { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#sb-coop-card .coop-line .tag {
  font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.2px; text-transform: uppercase;
  color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line));
}
#sb-coop-card .coop-line .tag.on { color: color-mix(in oklch, var(--sb-ok) 78%, var(--sb-ink)); }
#sb-coop-card .coop-line .tag.off { color: color-mix(in oklch, var(--sb-warn) 78%, var(--sb-ink)); }
#sb-coop-card .coop-mini {
  font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); min-height: 34px; padding: 5px 12px;
  cursor: pointer; border-radius: 0;
  background: transparent; border: 1px solid var(--sb-hover-hi); color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim));
}
#sb-coop-card .coop-mini:hover { background: color-mix(in oklch, var(--sb-hover) 75%, var(--sb-hover-hi)); }
#sb-coop-card .coop-mini.warn { border-color: color-mix(in oklch, var(--sb-warn) 48%, var(--sb-panel)); color: var(--sb-warn); }
#sb-coop-card .coop-mini.warn:hover { background: color-mix(in oklch, var(--sb-warn) 17%, var(--sb-panel)); }
#sb-coop-card .coop-empty {
  padding: 14px 10px; color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-line));
  font-size: calc(12px * var(--sb-fs, 1)); text-align: center;
}
#sb-coop-card .coop-add { display: flex; gap: 8px; margin-top: 8px; }
#sb-coop-card .coop-add input { flex: 1 1 auto; }
</style>`;

// A name lands in a JS string inside an HTML attribute — an apostrophe would take the render down.
const jsq = (s) =>
  String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function listAction(kind, list, name, from, userId) {
  const who = userId ? `, userId: '${jsq(userId)}'` : "";
  return `sendAction('${kind}', { list: '${list}', name: '${jsq(name)}', from: '${from}' ${who} }); this.blur();`;
}

// ✕ on the LEFT of the text, his ask — every other error's gesture.
export function errorLine(error) {
  if (!error) return `<div class="coop-error"></div>`;
  return `<div class="coop-error"><button class="sb-err-x" title="Dismiss" aria-label="Dismiss" data-interactive
    onclick="event.stopPropagation();sendAction('errClear', { where: 'coop' })">✕</button><span class="sb-err-t">${esc(
      error
    )}</span></div>`;
}

export function whoSection(props) {
  const roster = props.roster || [];
  const allow = props.allow || [];
  const deny = props.deny || [];
  const lines = roster.length
    ? roster
        .map((p) => {
          const name = String(p.name || "someone");
          const lower = name.toLowerCase();
          const denied = deny.indexOf(lower) >= 0;
          const allowed = allow.indexOf(lower) >= 0;
          const tag = p.gameOwner
            ? `<span class="tag on">game owner · always allowed</span>`
            : p.self
            ? `<span class="tag">you</span>`
            : denied
            ? `<span class="tag off">denied</span>`
            : allowed
            ? `<span class="tag on">allowed</span>`
            : `<span class="tag"></span>`;
          const buttons = p.self || p.gameOwner
            ? ""
            : `<button class="coop-mini" data-interactive onclick="${listAction("coopListAdd", "allow", lower, "who", p.userId)}">Allow</button>
               <button class="coop-mini warn" data-interactive onclick="${listAction("coopListAdd", "deny", lower, "who", p.userId)}">Deny</button>`;
          return `<div class="coop-line"><span class="who">${esc(name)}</span>${tag}${buttons}</div>`;
        })
        .join("")
    : `<div class="coop-empty">nobody else is here right now</div>`;
  return `<div class="coop-sect">
    <span class="coop-label">Who's here</span>
    <div class="coop-list">${lines}</div>
  </div>`;
}

export function listSection(props, which) {
  const allowed = which === "allow";
  const names = (allowed ? props.allow : props.deny) || [];
  const inputId = allowed ? "sb-coop-allow-add" : "sb-coop-deny-add";
  const submit =
    `sendAction('coopListAdd', { list: '${which}', name: document.getElementById('${inputId}').value, from: 'panel' });` +
    ` document.getElementById('${inputId}').value = ''; this.blur();`;
  const lines = names.length
    ? names
        .map(
          (n) =>
            `<div class="coop-line"><span class="who">${esc(n)}</span>
             <button class="coop-mini" data-interactive onclick="${listAction("coopListRemove", which, n, "panel")}">Remove</button></div>`
        )
        .join("")
    : `<div class="coop-empty">${allowed ? "no one is on the allow list yet" : "no one is denied"}</div>`;
  return `<div class="coop-sect">
    <span class="coop-label">${allowed ? "Allow list — these names open your shelf" : "Deny list — blocked access, except ownership"}</span>
    <div class="coop-list">${lines}</div>
    <div class="coop-add">
      <input class="coop-input" id="${inputId}" type="text" placeholder="username" autocomplete="off" spellcheck="false" data-interactive
        onkeydown="if (event.key === 'Enter') { ${submit} }" />
      <button class="coop-btn primary" data-interactive onclick="${submit}">Add</button>
    </div>
  </div>`;
}

exports.coopDialog = function coopDialog(props) {
  if (!props || !props.dialog) return "";
  const safe = {
    dialog: props.dialog,
    error: props.error || null,
    allow: props.allow || [],
    deny: props.deny || [],
    roster: props.roster || [],
  };
  return `${STYLE}<div id="sb-coop-overlay"><div id="sb-coop-card">
    <div class="coop-head">
      <div class="coop-title">Co-op</div>
      <div class="coop-sub">Allow opens your shelf for reading and writing; deny blocks access and revokes a pass. You and the game owner always keep access. Nobody is turned away from the room itself.</div>
    </div>
    <div class="coop-body">
      ${whoSection(safe)}
      ${listSection(safe, "allow")}
      ${listSection(safe, "deny")}
    </div>
    <div class="coop-foot">
      ${errorLine(safe.error)}
      <button class="coop-btn" id="sb-coop-cancel" data-interactive onclick="sendAction('coopCancel', {}); this.blur();">Close</button>
    </div>
  </div></div>`;
};
