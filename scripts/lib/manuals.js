// Crafting manuals: a recipe stays locked until you have read the manual for its kind (player.state.manuals, a comma list).
// Token "manual:<kind>" comes out of loot; each level's containers lean toward the manuals that fit what is stored there.
// A recipe's kind is its `manual:` field in craft.yml, else its `cat`.
export const MANUALS = {
  weapons: { name: 'Improvised Arms manual', info: 'Unlocks weapon recipes' },
  ammo: { name: "Reloader's handbook", info: 'Unlocks ammo and improvised firearm parts' },
  aid: { name: 'Field medic & repair manual', info: 'Unlocks aid and repair kit recipes' },
  tools: { name: "Tinkerer's handbook", info: 'Unlocks tool, battery and key recipes' },
  armor: { name: 'Salvage tailoring guide', info: 'Unlocks armor recipes' },
  food: { name: 'Survival cookbook', info: 'Unlocks food and water recipes' },
}
export const manualKind = (r) => (r?.manual && MANUALS[r.manual] ? r.manual : MANUALS[r?.cat] ? r.cat : 'tools')
export const manualsOf = (s) => String(s?.manuals ?? '').split(',').filter((k) => MANUALS[k])
export const knowsManual = (s, kind) => manualsOf(s).includes(kind)
export const knowsRecipe = (s, r) => knowsManual(s, manualKind(r))
// pool -> manual weights: what a level's storage would plausibly hold (lobby: first aid and tinkering, garage: tools and arms, pipes: ammo and arms, …)
const BY_POOL = {
  l0: { aid: 3, tools: 3, armor: 1, weapons: 1, food: 1, ammo: 0.5 },
  l1: { tools: 3, weapons: 3, armor: 2, aid: 1, ammo: 1 },
  l2: { ammo: 3, weapons: 3, tools: 3, aid: 1, armor: 1 },
  l3: { tools: 4, weapons: 2, ammo: 2, aid: 1 },
  l4: { aid: 3, tools: 2, food: 1, armor: 1 },
  l5: { food: 4, armor: 3, aid: 2, weapons: 1 },
  l7: { armor: 3, food: 3, tools: 1 },
}
export function rollManual(ctx, pool = 'l0') {
  const E = Object.entries(BY_POOL[pool] ?? BY_POOL.l0), total = E.reduce((a, [, w]) => a + w, 0)
  let r = ctx.random() * total
  for (const [k, w] of E) { r -= w; if (r <= 0) return 'manual:' + k }
  return 'manual:' + E[0][0]
}
