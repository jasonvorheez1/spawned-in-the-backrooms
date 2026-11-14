// Shared UI primitives, escaping, accessibility preferences, and notification formatting.
export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const jsStr = (v) => esc(String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"))

export const SCALE_VALUES = { compact: 0.9, normal: 1, large: 1.15 }
export const SCALE_LABELS = { compact: 'Compact (90%)', normal: 'Standard (100%)', large: 'Large (115%)' }

export function uiPrefsOf(s) {
  const p = s?.uiPrefs ?? {}
  return {
    scale: SCALE_VALUES[p.scale] ? p.scale : 'normal',
    contrast: p.contrast === 'high' ? 'high' : 'standard',
    motion: p.motion === 'reduced' ? 'reduced' : 'system',
    hudMinimal: !!p.hudMinimal,
  }
}

export function uiPrefsAttrs(s) {
  const p = uiPrefsOf(s)
  return `data-ui-scale="${p.scale}" data-ui-contrast="${p.contrast}" data-ui-motion="${p.motion}" style="--ui-scale:${SCALE_VALUES[p.scale]}"`
}

export function escKeyHandler(closeActionJs) {
  return `if(event.key==='Escape'){event.preventDefault();event.stopPropagation();${closeActionJs}}`
}

export function emptyState(msg) {
  return `<div class="ui-empty">${esc(msg)}</div>`
}

export function classifyNotice(text) {
  const t = String(text ?? '')
  if (/quest|objective|tracking|errand/i.test(t)) return { kind: 'quest', label: 'QUEST' }
  if (/failed|error|cannot|can't|out of|locked|no room|hostile|overencumbered|jammed|broken/i.test(t)) return { kind: 'warn', label: 'NOTICE' }
  if (/succeeded|passed|level \d+|reputation|standing|discovered/i.test(t)) return { kind: 'check', label: 'UPDATE' }
  if (/saved|checkpoint/i.test(t)) return { kind: 'save', label: 'SYSTEM' }
  return { kind: 'info', label: 'FIELD LOG' }
}

export function noticeToast(s, now) {
  const n = s?.notice
  if (!n?.text || now - (n.at ?? 0) > 3200) return ''
  const { kind, label } = classifyNotice(n.text)
  return `<div id="ui-toast-${Math.round(n.at)}" class="ui-toast ui-toast-${kind}" role="status" aria-live="polite"><span class="ui-toast-tag">${label}</span><span class="ui-toast-msg">${esc(n.text)}</span></div>`
}
