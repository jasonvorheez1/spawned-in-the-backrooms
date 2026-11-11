const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function quickBar(s, items) {
  const buttons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(slot => {
    const id = s.quickSlots?.[slot]
    const item = id && items.find(row => row.id === id)
    if (!item) return ''

    const label = escapeHtml(`${slot} · ${item.name}${item.count ? '' : ' · unavailable'}`)
    const count = item.count > 1 ? `<small>×${item.count}</small>` : ''
    return `<button class="hud-quick-slot" data-interactive ${item.count ? '' : 'disabled'} title="${label}" aria-label="${label}" onclick="sendAction('quickUse',{slot:${slot}})"><kbd>${slot}</kbd><span class="hud-quick-name">${escapeHtml(item.name)}</span>${count}</button>`
  }).join('')
  return buttons ? `<div class="hud-quickbar" role="group" aria-label="Quick slots">${buttons}</div>` : ''
}
