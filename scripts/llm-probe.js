// Savi's probe: one npc reply through the game's own prompt and parser
import { systemPrompt, userMessage, parseReply } from './lib/npc-talk.js'
export function onSpawn(ctx) {
  const it = ctx.query({ tags: ['npc'], place: 'level61' }).map((r) => ctx.getObject(r.id)).find((o) => o?.state?.name) ?? ctx.query({}).map((r) => ctx.getObject(r.id)).find((o) => o?.state?.name && o?.state?.voice)
  ctx.self.state.who = it?.state?.name ?? null
  const pl = ctx.place.players[0] ?? { state: {}, displayName: 'shelly', id: 'x' }
  const system = systemPrompt({ it, place: 'level61', pl, rapport: 0, following: false })
  ctx.self.state.plen = system.length; ctx.self.state.at = ctx.now()
  ctx.job('llm:chat', { system, message: userMessage([], "What's actually good to eat around here?", 'shelly'), model: 'fast' }, 'heard', {})
}
export function heard(ctx, r) { const t = r?.data?.text ?? ''; ctx.self.state.raw = String(t).slice(0, 600); ctx.self.state.err = r?.ok === false ? JSON.stringify(r.error).slice(0, 200) : null; ctx.self.state.parsed = !!parseReply(t); ctx.self.state.ms = ctx.now() - ctx.self.state.at }
