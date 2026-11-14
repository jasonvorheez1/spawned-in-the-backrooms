const PAGES = [['sheet', 'Character'], ['inventory', 'Inventory'], ['journal', 'Journal'], ['craft', 'Crafting'], ['radio', 'Radio']]

export function wristNav(active) {
  const tabs = PAGES.map(([page, label]) => page === active
    ? `<span aria-current="page">${label}</span>`
    : `<button onclick="sendAction('${page}')">${label}</button>`).join('')
  return `<nav class="wrist-nav" aria-label="HALOGEN">${tabs}</nav>`
}
