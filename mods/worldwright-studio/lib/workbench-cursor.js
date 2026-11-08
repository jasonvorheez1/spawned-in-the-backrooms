// Asset Studio cursor modes. Browser-only: the viewer owns hits and strokes, the client owns the document.
export const CURSORS = [
  ['select', 'Select', 'V', 'Tap a part to select it'],
  ['translate', 'Move', 'G', 'Drag the arrows to move the selection'],
  ['rotate', 'Rotate', 'R', 'Drag the rings to rotate the selection'],
  ['scale', 'Scale', 'S', 'Drag the cubes to scale the selection'],
  ['brush', 'Brush', 'B', 'Drag across the selected mesh to sculpt'],
  ['add', 'Add', 'A', 'Tap a surface or the grid to place a shape'],
  ['remove', 'Remove', 'X', 'Tap a part to remove it · Undo brings it back'],
  ['duplicate', 'Copy', 'D', 'Tap a component to duplicate it']
];
export const SHAPES = [['box', 'Box'], ['sphere', 'Sphere'], ['cylinder', 'Cylinder'], ['cone', 'Cone'], ['capsule', 'Capsule'], ['torus', 'Ring'], ['wedge', 'Wedge']];
const BRUSHES = [['add', 'Add'], ['cut', 'Cut'], ['inflate', 'Inflate'], ['smooth', 'Smooth'], ['flatten', 'Flatten']];
const MODEL_ONLY = ['brush'], EDIT_ONLY = ['add', 'remove', 'duplicate'];
export function allowed(mode, docMode) {
  if (docMode === 'model') return true;
  if (docMode === 'set') return !MODEL_ONLY.includes(mode);
  return !MODEL_ONLY.includes(mode) && !EDIT_ONLY.includes(mode);
}
export function cursorMarkup() {
  return `<div id="wwa-cursor" role="toolbar" aria-label="Cursor mode">${CURSORS.map(([mode, label, key, tip]) => `<button type="button" data-cursor="${mode}" aria-pressed="${mode === 'select'}" title="${tip} · ${key}"><b>${label}</b><kbd>${key}</kbd></button>`).join('')}</div>
  <div id="wwa-cursor-brush" class="wwa-cursor-sub" hidden role="group" aria-label="Brush">${BRUSHES.map(([k, l]) => `<button type="button" data-brush="${k}">${l}</button>`).join('')}<span class="wwa-cursor-gap"></span><button type="button" data-nudge="radius" data-factor="0.8" title="Smaller · [">−</button><span id="wwa-cursor-radius">size</span><button type="button" data-nudge="radius" data-factor="1.25" title="Bigger · ]">+</button><button type="button" data-nudge="strength" data-factor="0.8" title="Softer · Shift+[">−</button><span id="wwa-cursor-strength">strength</span><button type="button" data-nudge="strength" data-factor="1.25" title="Stronger · Shift+]">+</button></div>
  <div id="wwa-cursor-shapes" class="wwa-cursor-sub" hidden role="group" aria-label="Shape to add">${SHAPES.map(([k, l]) => `<button type="button" data-shape="${k}" aria-pressed="${k === 'box'}">${l}</button>`).join('')}</div>
  <div id="wwa-cursor-hint" role="status"></div>`;
}
export function createCursor(o) {
  const { el } = o;
  const S = () => o.state();
  const mode = () => S().cursor || 'select';
  function paint() {
    const bar = el('wwa-cursor'); if (!bar) return;
    const doc = S().data?.mode, m = mode(), show = ['model', 'set', 'pose'].includes(doc);
    bar.hidden = !show;
    for (const b of bar.querySelectorAll('[data-cursor]')) { const ok = allowed(b.dataset.cursor, doc); b.hidden = !ok; b.setAttribute('aria-pressed', String(b.dataset.cursor === m)); b.disabled = !!o.locked(); }
    const brush = el('wwa-cursor-brush'), shapes = el('wwa-cursor-shapes'), hint = el('wwa-cursor-hint');
    brush.hidden = !show || m !== 'brush'; shapes.hidden = !show || m !== 'add';
    if (!brush.hidden) {
      const s = o.detail()?.settings?.() || {};
      for (const b of brush.querySelectorAll('[data-brush]')) b.setAttribute('aria-pressed', String(b.dataset.brush === s.kind));
      const r = el('wwa-cursor-radius'), st = el('wwa-cursor-strength');
      if (r) r.textContent = 'size ' + Number(s.radius || 0).toPrecision(2); if (st) st.textContent = 'str ' + Math.round((s.strength || 0) * 100) + '%';
    }
    for (const b of shapes.querySelectorAll('[data-shape]')) b.setAttribute('aria-pressed', String(b.dataset.shape === (S().cursorShape || 'box')));
    if (hint) {
      const why = m === 'brush' && !o.detail()?.armed() ? o.detail()?.blocked?.() : '';
      const text = !show ? '' : why || CURSORS.find(c => c[0] === m)?.[3] || '';
      if (hint.textContent !== text) hint.textContent = text;
    }
  }
  function set(next, quiet = false) {
    const doc = S().data?.mode;
    if (!CURSORS.some(c => c[0] === next)) return;
    if (!allowed(next, doc)) { o.status(next === 'brush' ? 'Brush sculpting lives in the Model editor' : 'Switch to Model or Set to add and remove parts'); return; }
    if (o.locked()) { o.status(o.locked()); return; }
    const view = o.view(); if (!view?.cursor) return;
    S().cursor = next;
    view.cursor(next);
    if (next === 'brush') o.detail()?.arm();
    else o.detail()?.disarm?.();
    paint();
    if (!quiet) o.status(CURSORS.find(c => c[0] === next)[1] + ' cursor · ' + CURSORS.find(c => c[0] === next)[3]);
  }
  // Brush stays armed: every detail refresh (commit, selection, cancel) re-arms it when the part allows.
  function detailChanged() { if (mode() === 'brush' && S().data?.mode === 'model' && !o.detail()?.armed()) o.detail()?.arm(); paint(); }
  function click(target) {
    const c = target.closest('[data-cursor]'); if (c) { if (!c.disabled) set(c.dataset.cursor); return true; }
    const b = target.closest('[data-brush]'); if (b) { o.detail()?.action('kind', b.dataset.brush).then(paint).catch(e => o.status(e.message)); return true; }
    const n = target.closest('[data-nudge]'); if (n) { const v = o.detail()?.nudge(n.dataset.nudge, Number(n.dataset.factor)); paint(); if (v != null) o.status('Brush ' + n.dataset.nudge + ' · ' + v); return true; }
    const s = target.closest('[data-shape]'); if (s) { S().cursorShape = s.dataset.shape; paint(); o.status('Add ' + s.textContent.toLowerCase() + ' · tap a surface or the grid'); return true; }
    return false;
  }
  function key(k, shift) {
    const hit = CURSORS.find(c => c[2].toLowerCase() === k);
    if (hit && ['v', 'b', 'a', 'x', 'd'].includes(k)) { set(hit[0]); return true; }
    if (k === 'delete' || k === 'backspace') { return o.removeSelected?.() || false; }
    if (mode() === 'brush' && (k === '[' || k === ']' || k === '{' || k === '}')) { const up = k === ']' || k === '}'; const v = o.detail()?.nudge(shift || k === '{' || k === '}' ? 'strength' : 'radius', up ? 1.25 : .8); paint(); if (v != null) o.status('Brush ' + (shift ? 'strength' : 'size') + ' · ' + v); return true; }
    return false;
  }
  function remount() { const view = o.view(); const m = mode(); if (!view?.cursor) return; if (!allowed(m, S().data?.mode)) S().cursor = 'select'; view.cursor(S().cursor || 'select'); if (S().cursor === 'brush') o.detail()?.arm(); paint(); }
  return { paint, set, mode, click, key, detailChanged, remount, shape: () => S().cursorShape || 'box' };
}
