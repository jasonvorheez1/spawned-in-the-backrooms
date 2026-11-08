// Only the primer owns these paths, actions and attachment spellings.
export const HOMES = ['mods/worldwright-studio/', 'scripts/mods/worldwright-studio/', 'worldwright-studio/', 'scripts/worldwright-studio/', ''];
export const ACTIONS = ['primerBack', 'primerFold', 'primerNext', 'primerSkip'];
export const SPELLINGS = ACTIONS.concat(ACTIONS.map(n => 'worldwright-studio:' + n));
export const owns = ref => HOMES.some(home => ref === home + 'tutorial-primer.js');
export function homeOf(api) {
  const saved = (api.getState().primer || {}).cleanup;
  if (saved && HOMES.includes(saved.home)) return saved.home;
  for (const home of HOMES) if (typeof api.files.read(home + 'tutorial-primer.js') === 'string') return home;
  throw new Error('Primer source home cannot be verified');
}
export function completed(api, home) {
  const text = api.files.read(home + 'primer-completed.json');
  if (text === null) return false;
  const row = JSON.parse(text);
  if (row.burned !== true) throw new Error('Invalid primer completion receipt');
  return true;
}
export function cleanManifest(text) {
  const m = JSON.parse(text);
  if (!m || typeof m !== 'object' || Array.isArray(m) || !Array.isArray(m.attach)) throw new Error('Invalid primer manifest');
  m.attach = m.attach.filter(a => !(a && a.target && a.target.kind === 'god' && owns(a.behavior)));
  if (m.inputs && m.inputs.actions) for (const name of SPELLINGS) delete m.inputs.actions[name];
  return JSON.stringify(m, null, 2) + '\n';
}
function verifyWrite(api, path, text) {
  const r = api.files.write(path, text);
  if (r && r.ok === false) throw new Error(r.error || 'File write refused: ' + path);
  if (api.files.read(path) !== text) throw new Error('File write unconfirmed: ' + path);
}
export function failure(api, error, home, checkOnly = false) {
  const p = api.getState().primer || {};
  const message = String(error && error.message || error);
  api.patchState({primer: {...p, active: false, burned: checkOnly ? p.burned === true : true, cleanup: {pending: true, home, checkOnly, error: message}}});
  // Keep only a status/retry surface, never the completed lesson.
  const status = checkOnly ? "Primer status could not be read. It will retry without starting or completing the lesson." : "Primer finished, but removal failed. Cleanup will retry; the lesson will not replay.";
  const html = '<div style="position:fixed;bottom:24px;left:24px;max-width:360px;padding:12px;background:#292824;color:#eee;border:1px solid #b99a60;pointer-events:auto">' + status + '</div>';
  const rows = Array.isArray(api.getState().overlays) ? api.getState().overlays : [];
  api.patchState({overlays: rows.filter(r => !r || r.id !== 'primer').concat([{id:'primer',html}])});
  api.log('[primer] cleanup pending: ' + message);
}
export function burn(api, home) {
  const ref = home + 'tutorial-primer.js', manifest = home + 'mod.json';
  const old = api.getState().primer || {};
  api.patchState({primer: {...old, active:false, burned:true, cleanup:{pending:true, home}}});
  let original = null, detached = false, behaviors;
  try {
    // FilesAPI is the supported durable tree writer in a god behavior. No setScript
    // JSON alias, platform access, or editor-only shell is needed by completion.
    api.commit('Finish the one-run primer', () => {
      verifyWrite(api, home + 'primer-completed.json', '{"burned":true,"version":1}\n');
      original = api.files.read(manifest);
      if (original === null && home.includes('mods/')) throw new Error('Installed primer manifest is missing');
      if (original !== null) verifyWrite(api, manifest, cleanManifest(original));
      const rows = api.getState().overlays || [];
      api.patchState({overlays:rows.filter(r => !r || r.id !== 'primer')});
      // Only old primer tabs and exact primer refs; foreign tabs/behaviors ride through.
      api.setCreatorTab('worldwright-studio#primer', null);
      api.setCreatorTab('codexprimer', null);
      for (const name of SPELLINGS) delete api.world.inputs.actions[name];
      behaviors = api.world.godMode.behavior || [];
      if (!Array.isArray(behaviors)) throw new Error('God behavior list is not an array');
      api.world.godMode.behavior = behaviors.filter(ref => !owns(ref));
      detached = true;
      const r = api.files.delete(ref);
      if (r && r.ok === false) throw new Error(r.error || 'Primer deletion refused');
      if (api.files.read(ref) !== null) throw new Error('Primer deletion unconfirmed');
    });
    api.patchState({primer:{...old,active:false,burned:true,cleanup:{pending:false,home}}});
    return true;
  } catch (e) {
    // A file API can refuse mid-batch. If source remains, restore ONLY its route
    // for the next tick/reload. Never replace a concurrently edited foreign row.
    try {
      if (api.files.read(ref) !== null) api.commit('Keep failed primer cleanup retryable', () => {
        if (original !== null) {
          const text = api.files.read(manifest);
          if (text !== null) {
            const m = JSON.parse(text), before = JSON.parse(original);
            const own = before.attach.filter(a => a && a.target && a.target.kind === 'god' && owns(a.behavior));
            if (!m.attach.some(a => a && a.target && a.target.kind === 'god' && owns(a.behavior))) {
              m.attach.push(...own);
              verifyWrite(api, manifest, JSON.stringify(m,null,2)+'\n');
            }
          }
        }
        if (detached) {
          const live = api.world.godMode.behavior || [];
          api.world.godMode.behavior = live.concat(behaviors.filter(ref => owns(ref) && !live.includes(ref)));
        }
      });
    } catch (restoreError) { e = new Error(String(e.message || e) + '; retry route: ' + String(restoreError.message || restoreError)); }
    failure(api,e,home);
    return false;
  }
}
