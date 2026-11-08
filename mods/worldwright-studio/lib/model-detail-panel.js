import { LIMITS, validateDetail, validateOperation } from './model-detail-data.js';
// Browser-only inspector. The viewer owns hit tests, local normals, geometry and commits.
// This panel stores only tool preferences outside the document; it never fabricates a hit.
const DEFAULTS = { kind: 'add', shape: 'sphere', radius: .25, strength: .5, resolution: 32, color: '#d9b879' };
const TOOLS = [['add','Add'],['cut','Cut'],['inflate','Inflate'],['smooth','Smooth'],['flatten','Flatten']];
const METHODS = ['detailState','detailInfo','detailTool','detailApply','detailProtect','detailOriginal','detailClear','detailCancel','detailBusy'];
export function captureDetail(data, view) {
  const value = view?.detailState?.();
  if (!value) return;
  // A viewer may know the source hash on load. That alone must NOT dirty a legacy page.
  if (Object.prototype.hasOwnProperty.call(data, 'detail') || value.operations?.length || value.protectedNodes?.length)
    data.detail = validateDetail(value);
}
export function detailMarkup() {
  return `<section id="wwa-detail" hidden aria-label="Model detail">
    <header><strong>Model detail</strong><span>PART MASK</span></header>
    <div id="wwa-detail-part">Select an imported mesh</div>
    <div class="wwd-kinds" role="group" aria-label="Detail operation">${TOOLS.map(([kind,label])=>`<button type="button" data-detail="kind" data-value="${kind}" aria-pressed="${kind==='add'}">${label}</button>`).join('')}</div>
    <div class="wwd-pair"><label>Radius · mesh units<input id="wwa-detail-radius" data-detail-setting="radius" type="number" min="0.000001" max="${LIMITS.maxRadius}" step="any" value=".25"></label><label>Strength · 0–1<input id="wwa-detail-strength" data-detail-setting="strength" type="number" min="0" max="1" step=".05" value=".5"></label></div>
    <div class="wwd-pair"><label>Brush shape<select id="wwa-detail-shape" data-detail-setting="shape"><option value="sphere">Sphere</option><option value="box">Box</option></select></label><label>Surface quality<select id="wwa-detail-resolution" data-detail-setting="resolution"><option value="32">Draft · 32</option><option value="64">Fine · 64</option></select></label></div>
    <div class="wwd-pair wwd-colour"><label>New-surface colour<input id="wwa-detail-color" data-detail-setting="color" type="color" value="#d9b879"></label><small id="wwa-detail-quality">Draft: faster brush contours. Fine: denser contours, more work.</small></div>
    <button type="button" class="primary" id="wwa-detail-stamp" data-detail="stamp" aria-pressed="false">Stamp · click selected mesh</button>
    <div id="wwa-detail-reason" role="status">Loading the detail tools…</div>
    <div class="wwd-compare" role="group" aria-label="Compare model detail"><button type="button" data-detail="edited" aria-pressed="true">Edited</button><button type="button" data-detail="original" aria-pressed="false">Original</button><span>Preview only</span></div>
    <button type="button" id="wwa-detail-protect" data-detail="protect" aria-pressed="false">Protect selected part</button>
    <button type="button" id="wwa-detail-clear" data-detail="clear">Clear this part’s edits · Undoable</button>
    <div id="wwa-detail-counts"></div>
    <div id="wwa-detail-work" hidden><progress id="wwa-detail-progress" aria-label="Model-detail work"></progress><span id="wwa-detail-message" role="status"></span><button type="button" id="wwa-detail-cancel" data-detail="cancel">Cancel work · Esc</button></div>
    <p class="wwd-scope">One stamp on the selected mesh only. Protection blocks new detail edits; earlier edits still replay. Rig-safe sculpt keeps weights and vertex identity. Add/Cut require a rigid mesh. The original GLB stays untouched.</p>
  </section>`;
}
export function detailViewportMarkup() {
  return `<div id="wwa-detail-armed" hidden role="status">STAMP ARMED · click the selected mesh · Esc cancels</div>
  <section id="wwa-detail-source" hidden role="dialog" aria-modal="true" aria-labelledby="wwa-detail-source-title">
    <strong id="wwa-detail-source-title">Replace model source?</strong><p id="wwa-detail-source-message"></p>
    <p>Detail edits and part protection will be removed from the <b>new draft</b>. Undo restores the previous model and recipe. Neither original GLB is changed.</p>
    <div><button type="button" data-detail="keep">Keep current model</button><button type="button" data-detail="replace" class="primary">Replace source + clear detail</button></div>
  </section>`;
}
export function createDetailPanel(o) {
  const { el } = o;
  let settings = { ...DEFAULTS, ...o.state().detailUI }, armed = false, original = false, pending = false, epoch = 0, dead = false, confirmation = null, lastNode = null, progressText = '', pointerTimer = 0, detachCanvas = null;
  const viewer = () => o.viewer();
  const available = () => METHODS.every(k => typeof viewer()?.[k] === 'function');
  const info = () => viewer()?.detailInfo?.() || { node: null, name: '', supported: false, reason: 'The model-detail viewer is unavailable. Reopen after its update; your source and recipe are safe.' };
  const busy = () => pending || !!viewer()?.detailBusy?.() || !!viewer()?.detailInfo?.()?.busy;
  function text(id, value) { const n = el(id); if (n && n.textContent !== value) n.textContent = value; }
  function offTool() { const was = armed; armed = false; if (was) viewer()?.detailTool?.(null); }
  function reason(n = info()) {
    return o.lockReason() || (busy() ? 'Building model detail — wait or cancel.' : '') || (!available() ? 'The model-detail viewer is unavailable. Your source and recipe are safe.' : '') || (original ? 'Original preview — choose Edited to stamp.' : '') || (!n.supported ? n.reason || 'Select a rigid imported mesh. Skinned and morph-target meshes cannot be reshaped safely.' : '') || (n.protected ? 'This part is protected. Unprotect it to add new edits.' : '');
  }
  function paint(update) {
    if (dead || !el('wwa-detail')) return;
    const panel = el('wwa-detail'), shown = o.state().data?.mode === 'model';
    panel.hidden = !shown;
    if (!shown) return;
    const n = update || info(), working = busy(), v = viewer(), snap = v?.detailState?.(), total = snap?.operations?.length || 0;
    const count = snap?.operations?.filter(p => p.node === n.node).length || 0;
    if (armed && (n.node !== lastNode || working || o.lockReason() || n.protected || !n.supported)) {
      // A running stamp has already consumed the viewer tool. Do not cancel its job.
      const disarm = !working; armed = false; if (disarm) v?.detailTool?.(null);
    }
    if(n.node!==lastNode&&Number.isFinite(n.radiusHint)&&o.state().detailUI?.radius==null)settings.radius=Number(n.radiusHint.toPrecision(3));
    if(n.sculptOnly&&['add','cut'].includes(settings.kind))settings.kind='inflate';
    lastNode = n.node;
    const why = reason(n), limit = total >= LIMITS.maxOperations, disabled = !!why || limit;
    const locked = !!o.lockReason() || working || !available();
    panel.setAttribute('aria-busy', String(working));
    panel.dataset.armed = String(armed);
    text('wwa-detail-part', n.node == null ? 'Select an imported mesh' : (n.name || 'Node ' + n.node) + (n.protected ? ' · protected' : ' · selected part'));
    for (const button of panel.querySelectorAll('[data-detail="kind"]')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === settings.kind)); button.disabled = disabled || !!(n.sculptOnly&&['add','cut'].includes(button.dataset.value));button.title=n.sculptOnly&&['add','cut'].includes(button.dataset.value)?'Unavailable on a rig: new faces require new skin weights. Inflate, Smooth and Flatten keep the rig.':'';
    }
    for (const input of panel.querySelectorAll('[data-detail-setting]')) {
      const value = String(settings[input.dataset.detailSetting]);
      if (document.activeElement !== input && input.value !== value) input.value = value;
      input.disabled = disabled;
    }
    el('wwa-detail-stamp').disabled = disabled;
    el('wwa-detail-stamp').setAttribute('aria-pressed', String(armed));
    text('wwa-detail-stamp', o.sticky?.() ? (armed ? 'Brush on · drag across the mesh' : 'Brush waiting…') : armed ? 'Armed · click selected mesh' : 'Stamp · click selected mesh');
    text('wwa-detail-reason', why || (limit ? LIMITS.maxOperations + ' operations reached. Clear part edits or Undo before adding more.' : armed ? (o.sticky?.() ? 'Drag to paint a ' + settings.kind + ' stroke. [ ] size · Shift+[ ] strength.' : 'One click stamps ' + settings.kind + '. Escape disarms.') : n.sculptOnly?'Rig-safe sculpt: Inflate, Smooth and Flatten. Add/Cut unavailable: new topology needs new skin weights.':'Choose a brush, then arm Stamp. Radius is local to this mesh.'));
    for (const which of ['edited','original']) {
      const button = panel.querySelector('[data-detail="' + which + '"]');
      button.disabled = working || !!o.previewReason() || !available();
      button.setAttribute('aria-pressed', String((which === 'original') === original));
    }
    el('wwa-detail-protect').disabled = locked || original || n.node == null;
    el('wwa-detail-protect').setAttribute('aria-pressed', String(!!n.protected));
    text('wwa-detail-protect', n.protected ? 'Protected · click to unprotect' : 'Protect selected part');
    // Protection forbids new stamps, not removing a prior recipe with Undo.
    el('wwa-detail-clear').disabled = locked || original || n.node == null || !count;
    text('wwa-detail-counts', count + ' part edits · ' + total + '/' + LIMITS.maxOperations + ' total · ' + Number(n.triangles || 0).toLocaleString() + ' triangles');
    el('wwa-detail-work').hidden = !working && !armed;
    el('wwa-detail-progress').hidden = !working;
    text('wwa-detail-message', working ? progressText || 'Building a local brush surface…' : 'Click once. No change is saved until Save.');
    text('wwa-detail-cancel', working ? 'Cancel work · Esc' : 'Disarm · Esc');
    el('wwa-detail-armed').hidden = !armed || !!o.sticky?.();
  }
  function refresh() { paint(); o.refresh(); }
  function cancel(resetPreview = false) {
    epoch++; pending = false; clearTimeout(pointerTimer); pointerTimer = 0;
    const c = confirmation; confirmation = null; if (el('wwa-detail-source')) el('wwa-detail-source').hidden = true; c?.resolve(false);
    offTool(); viewer()?.detailCancel?.();
    if (resetPreview && original) { original = false; viewer()?.detailOriginal?.(false); }
    progressText = ''; if (!dead) refresh();
  }
  async function mutate(fn, done) {
    if (o.lockReason() || busy() || original || !available()) return;
    offTool(); const v = viewer(), token = ++epoch; pending = true; progressText = ''; refresh();
    try {
      const result = await fn(v);
      if (dead || token !== epoch || viewer() !== v) return;
      if (result?.cancelled || result?.superseded) return;
      if (result?.ok === false || result?.error) throw Error(result.error || result.reason || 'Model-detail edit was refused');
      o.status(done);
    } catch (e) { if (!dead && token === epoch && viewer() === v) o.status(e.message); }
    finally { if (!dead && token === epoch) { pending = false; refresh(); } }
  }
  async function action(op, value) {
    if (op === 'cancel') { cancel(); o.status('Model-detail work cancelled. Committed edits are unchanged.'); return; }
    if (op === 'keep' || op === 'replace') {
      const c = confirmation; if (!c) return; confirmation = null; el('wwa-detail-source').hidden = true; c.resolve(op === 'replace'); return;
    }
    if (o.state().data?.mode !== 'model') return;
    if (op === 'original' || op === 'edited') {
      if (!available() || busy() || o.previewReason()) return;
      offTool(); original = op === 'original'; viewer().detailOriginal(original); refresh();
      o.status(original ? 'Original GLB preview · comparison does not change the draft or export.' : 'Edited model preview · export uses these edits.'); return;
    }
    if (o.lockReason() || busy() || original || !available()) return;
    const n = info();
    if (op === 'protect' && n.node != null) { await mutate(v => v.detailProtect(n.node, !n.protected), n.protected ? 'Part unprotected.' : 'Part protected. Earlier detail edits still replay.'); return; }
    if (op === 'clear' && n.node != null) { await mutate(v => v.detailClear(n.node), 'This part’s detail edits cleared. Undo restores them.'); return; }
    if (reason(n)) { o.status(reason(n)); return; }
    if (op === 'kind') { offTool(); if (!TOOLS.some(([kind]) => kind === value)) return; settings.kind = value; o.state().detailUI = { ...settings }; refresh(); if (o.sticky?.()) api.arm(); return; }
    if (op === 'stamp') {
      if (armed) { offTool(); refresh(); return; }
      if ((viewer().detailState()?.operations?.length || 0) >= LIMITS.maxOperations) return;
      try {
        // Validate the settings with the shared contract, not a second schema. The actual hit is the viewer's.
        validateOperation({ ...settings, node: n.node, center: [0,0,0], normal: [0,1,0] });
        if (viewer().transforming?.() && !viewer().confirmTransform()) return;
        lastNode = n.node; viewer().detailTool({ ...settings }); armed = true; progressText = ''; refresh();
        el('wwa-canvas')?.focus({ preventScroll: true });
      } catch (e) { armed = false; o.status(e.message); paint(); }
    }
  }
  function setting(input) {
    const key = input.dataset.detailSetting;
    if (!key) return false;
    if (reason()) { paint(); return true; }
    offTool();
    const next = { ...settings, [key]: ['radius','strength','resolution'].includes(key) ? Number(input.value) : input.value };
    try { validateOperation({ ...next, node: info().node, center: [0,0,0], normal: [0,1,0] }); settings = next; o.state().detailUI = { ...settings }; }
    catch (e) { input.value = settings[key]; o.status(e.message); }
    refresh(); return true;
  }
  function bindCanvas(canvas) {
    detachCanvas?.();
    const up = e => {
      if (!armed || e.button !== 0 || o.sticky?.()) return;
      const v = viewer(), token = epoch;
      // Run after the viewer's pointer-up hit test, even if it listens on an ancestor.
      clearTimeout(pointerTimer); pointerTimer = setTimeout(() => { if (!dead && token === epoch && v === viewer()) { offTool(); refresh(); } }, 0);
    };
    const aborted = () => { if (armed && !o.sticky?.()) cancel(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', aborted);
    detachCanvas = () => { canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', aborted); };
  }
  function confirmSource(path, detail) {
    if (!detail) return Promise.resolve(true);
    offTool(); const count = detail.operations?.length || 0, protectedCount = detail.protectedNodes?.length || 0;
    text('wwa-detail-source-message', path + ' will replace this source (' + count + ' detail edits, ' + protectedCount + ' protected parts).');
    el('wwa-detail-source').hidden = false;
    el('wwa-detail-source').querySelector('[data-detail="keep"]').focus({ preventScroll: true });
    return new Promise(resolve => { confirmation?.resolve(false); confirmation = { resolve }; });
  }
  const api = { paint, busy, action, setting, bindCanvas, confirmSource, cancel, original: () => original, armed: () => armed, confirming: () => !!confirmation,
    disarm() { offTool(); refresh(); },
    // Brush cursor: re-arm silently whenever the selected part can take a stroke.
    arm() {
      if (armed || dead || o.state().data?.mode !== 'model' || busy() || !available()) return false;
      const n = info(); if (reason(n) || (viewer().detailState()?.operations?.length || 0) >= LIMITS.maxOperations) return false;
      if (n.sculptOnly && ['add','cut'].includes(settings.kind)) settings.kind = 'inflate';
      try { validateOperation({ ...settings, node: n.node, center: [0,0,0], normal: [0,1,0] }); viewer().detailTool({ ...settings }); armed = true; lastNode = n.node; paint(); return true; } catch { armed = false; return false; }
    },
    blocked() { const n = info(); return reason(n) || ''; },
    settings: () => ({ ...settings }),
    nudge(key, factor) { if (!['radius','strength'].includes(key)) return; const was = armed; offTool(); let v = settings[key] * factor; v = key === 'strength' ? Math.max(.05, Math.min(1, v)) : Math.max(1e-6, Math.min(LIMITS.maxRadius, v)); settings = { ...settings, [key]: Number(v.toPrecision(3)) }; o.state().detailUI = { ...settings }; refresh(); if (was) api.arm(); return settings[key]; },
    committed() { armed = false; paint(); },
    progress(message) { if (message) progressText = message; paint(); },
    reset() { cancel(true); },
    dispose() { dead = true; cancel(true); detachCanvas?.(); detachCanvas = null; }
  };
  return api;
}
