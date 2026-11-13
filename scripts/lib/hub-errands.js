// Hub jobs use explicit offers and hand-ins so a conversation cannot spend supplies or finish a job by itself.
import { ERRANDS, standingOk, offerErrand, turnInErrand, tryAlt, held } from './errands.js'
const JOBS = {
  'jo-supply': { npc: 'hub-amber-jo', ask: 'Could the newcomer box use supplies?', brief: "It could. Two bandages would keep it stocked. A first-aid kit would do just as well. Can you spare either?", accept: "I'll bring supplies for the box.", done: 'Here are the two bandages.', alt: 'I can spare a first-aid kit instead.', accepted: "Thanks, pilgrim. Two bandages, or one first-aid kit. Bring them to me when you're ready.", result: "That'll keep the box stocked. Here, for the trouble." },
  'pip-route': { npc: 'hub-amber-pip', ask: 'Need help checking your routes?', brief: "I need someone to check the open doors in the seventh and tenth tunnels, then tell me they're still clear. Interested?", accept: "I'll check the two open doors.", done: 'I checked the seventh and tenth tunnels.', alt: '[Speech 40] You already know those doors are open.', accepted: "Seventh and tenth! Look at both doors, then come back to me.", result: "Both still there. Good. I'll mark the route for the next person." },
  'okafor-cold-door': { npc: 'hub-meg-okafor', ask: 'Does the post need another survey?', brief: "We need a current look at the cold door in the fifth tunnel and the unmarked door at the end of the dark road. Report what you find. Will you do it?", accept: "I'll check both doors.", done: 'I checked the cold door and the unmarked door.', alt: '[Speech 55] Let me give you what I already know.', accepted: "Fifth tunnel first, then the end of the dark road. Come back to me with your findings.", result: "I'll put that in the post's survey. You've earned your pay." },
  'sato-markers': { npc: 'hub-meg-sato', ask: 'Can I help with your survey marks?', brief: "I'm missing a sketch from the fourth door on the left in the third tunnel. Could you look at it and describe the mark to me?", accept: "I'll look at the third tunnel's mark.", done: 'I saw the mark in the third tunnel.', alt: '[Speech 60] I can describe it from memory.', accepted: "Third tunnel, fourth door on the left. Don't touch the slab. Just look at the mark and come back.", result: "That's the one. I can finish the survey now. Thank you." },
}
const ALTERNATE = {
  'jo-supply': "A whole kit? Thank you. That'll stretch further than the bandages.",
  'pip-route': "You make a good case. I'll check the doors myself, though.",
  'okafor-cold-door': "I'll record it as your account. We still need a fresh survey.",
  'sato-markers': "All right. I'll sketch it from your description.",
}
export function hubErrandChoices(it, s) {
  const id = String(it?.id ?? '').split('/').pop(), out = []
  for (const [key, j] of Object.entries(JOBS)) {
    if (j.npc !== id) continue
    const r = s.errands?.[key], e = ERRANDS[key]
    if (!r && standingOk(s, e).ok) out.push(s.hubErrAsk?.[key] ? { text: j.accept, tag: 'Quest Start' } : { text: j.ask, tag: 'Ask' })
    if (!r || r.done) continue
    const g = e.stages[r.stage]
    if (g?.target === id && (g.kind === 'talk' || (g.kind === 'carry' && held(s, g.item) >= (g.count ?? 1)))) out.push({ text: j.done, tag: 'Quest Turn-In' })
    if (e.alt && (e.alt.kind !== 'item' || held(s, e.alt.item) >= (e.alt.count ?? 1))) out.push({ text: j.alt, tag: e.alt.kind === 'speech' ? `Speech ${e.alt.sk}` : 'Alternative' })
  }
  return out
}
export function handleHubErrand(ctx, p, npc, text) {
  const s = p?.state, id = String(npc?.id ?? '').split('/').pop(); if (!s) return null
  for (const [key, j] of Object.entries(JOBS)) {
    if (id !== j.npc) continue
    const r = s.errands?.[key]
    if (text === j.ask && !r && standingOk(s, ERRANDS[key]).ok) { s.hubErrAsk = { ...(s.hubErrAsk ?? {}), [key]: 1 }; return { reply: j.brief, mood: 'calm' } }
    if (text === j.accept && !r && s.hubErrAsk?.[key]) return { reply: offerErrand(ctx, s, key) ? j.accepted : "I can't offer you that job right now.", mood: 'calm' }
    if (!r || r.done) continue
    if (text === j.done) return { reply: turnInErrand(ctx, s, key, id) ? j.result : "There's still work to do. Check your journal.", mood: 'calm' }
    if (text === j.alt) return { reply: tryAlt(ctx, s, key) ? ALTERNATE[key] : "That won't do. The original job still stands.", mood: 'calm' }
  }
  return null
}
