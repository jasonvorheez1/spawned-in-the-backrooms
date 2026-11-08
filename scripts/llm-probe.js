// Savi's probe: asks the npc talk model once and keeps the answer in state
export function onSpawn(ctx) { ctx.self.state.at = ctx.now(); ctx.job('llm:chat', { system: 'You are a tired mall cook. Reply in one short line.', message: 'hey, what is good to eat?', model: 'fast' }, 'heard', {}) }
export function heard(ctx, r) { ctx.self.state.r = JSON.stringify(r).slice(0, 400); ctx.self.state.ms = ctx.now() - ctx.self.state.at }
