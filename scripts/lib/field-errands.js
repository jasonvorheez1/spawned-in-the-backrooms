import { ERRANDS, standingOk, offerErrand, turnInErrand, tryAlt, held, deliberateErrands } from './errands.js'
const short = (it) => String(it?.id ?? '').split('/').pop()
const ask = (e) => `Can you tell me about ${e.title}?`
const accept = (e) => `I'll take the job: ${e.title}.`
const hand = (e) => `About ${e.title}: here's what you asked for.`
const alt = (e) => `For ${e.title}, can we do this another way?`
export function fieldErrandChoices(ctx, it, s) {
 const id = short(it), out = []
 for (const e of Object.values(ERRANDS)) {
  if (!deliberateErrands(e.place) || e.place === 'thehub' || e.place !== ctx.self?.place) continue
  const row = s.errands?.[e.id], stage = row && !row.done && e.stages[row.stage]
  if (!row && e.giver === id && standingOk(s, e).ok) out.push({ text: s.fieldErrAsk?.[e.id] ? accept(e) : ask(e), tag: s.fieldErrAsk?.[e.id] ? 'Quest Start' : 'Ask' })
  if (!stage) continue
  if (stage.target === id && (stage.kind === 'talk' || (stage.kind === 'carry' && held(s, stage.item) >= (stage.count ?? 1)))) out.push({ text: hand(e), tag: 'Quest Turn-In' })
  if (id === e.giver && e.alt && (e.alt.kind !== 'item' || held(s, e.alt.item) >= (e.alt.count ?? 1))) out.push({ text: alt(e), tag: e.alt.kind === 'speech' ? `Speech ${e.alt.sk}` : 'Alternative' })
 }
 return out
}
export function handleFieldErrand(ctx, p, it, text) {
 const s = p.state, id = short(it)
 for (const e of Object.values(ERRANDS)) {
  if (!deliberateErrands(e.place) || e.place === 'thehub' || e.place !== p.place) continue
  const row = s.errands?.[e.id]
  if (id === e.giver && !row && text === ask(e) && standingOk(s,e).ok) { s.fieldErrAsk = { ...(s.fieldErrAsk ?? {}), [e.id]: 1 }; return { reply: `${e.stages[0].text}. ${e.stages.slice(1).map(x => x.text).join('. ')}. Interested?`, mood: 'calm' } }
  if (id === e.giver && !row && text === accept(e) && s.fieldErrAsk?.[e.id]) return { reply: offerErrand(ctx,s,e.id) ? 'All right. Come back when it is done.' : "I can't offer that job right now.", mood: 'calm' }
  if (!row || row.done) continue
  if (text === hand(e)) return { reply: turnInErrand(ctx,s,e.id,id) ? 'Thanks. That helps.' : 'There is still something to do. Check your journal.', mood: 'calm' }
  if (id === e.giver && text === alt(e)) return { reply: tryAlt(ctx,s,e.id) ? 'All right. That will do.' : 'No, I still need the original job done.', mood: 'calm' }
 }
 return null
}
