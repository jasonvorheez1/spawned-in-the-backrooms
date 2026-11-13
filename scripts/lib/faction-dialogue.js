import { fameOf, infamyOf } from './rep.js'
import { clothToken } from './clothes.js'
const ENLIST = { ask: 'How do I join the M.E.G.?', yes: "I'll sign on as a M.E.G. volunteer.", member: "As a volunteer, where should I report?" }
const LINES = {
  'meg-callum': { group: 'meg', q: '[M.E.G. reputation] What does the camp need most?', a: "Someone to keep the routes open. People bring us supplies and we pass them on, but I can't spare a runner every time a shelf comes up short. Keep an eye on the others when you're out there." },
  'bntg-voss': { group: 'bntg', q: '[B.N.T.G. reputation] How does the Guild keep track of its deals?', a: "Receipts. Names when we have them, marks when we don't. Keep your copy until the goods change hands. If somebody says the price changed afterward, show them the paper." },
}
export function factionChoices(it, s) {
 const id=String(it?.id ?? '').split('/').pop(), row=LINES[id]
 const out = row && fameOf(s,row.group)>=12 && infamyOf(s,row.group)<35 ? [{ text:row.q, tag:'Reputation' }] : []
 if (id === 'meg-callum') {
  if (s.megMember) out.push({ text:ENLIST.member, tag:'M.E.G.' })
  else { out.push({ text:ENLIST.ask, tag:'M.E.G.' }); if (s.megEnlistAsk && fameOf(s,'meg')>=12 && infamyOf(s,'meg')<35) out.push({ text:ENLIST.yes, tag:'Enlist' }) }
 }
 return out
}
export function factionReply(it, s, text) {
 const id=String(it?.id ?? '').split('/').pop(), row=LINES[id]
 if (id === 'meg-callum') {
  if (text === ENLIST.ask && !s.megMember) { s.megEnlistAsk = true; return { reply: fameOf(s,'meg') < 12 || infamyOf(s,'meg') >= 35 ? "We take volunteers we know we can trust. Help our people first, then come back and ask me." : "I can put you down as a volunteer. Help at our posts, carry what you need, and report what you find. There's a jacket for you. Want to sign on?", mood:'calm' } }
  if (text === ENLIST.yes && !s.megMember && s.megEnlistAsk && fameOf(s,'meg') >= 12 && infamyOf(s,'meg') < 35) { s.megMember = true; const jacket = clothToken('topw','megjacket','b6e04a','hivis'); s.clothes = [...String(s.clothes ?? '').split(',').filter(Boolean), jacket].join(','); return { reply: "There. You're on the volunteer sheet. The jacket's yours. Ask at a M.E.G. post when you want work, and don't leave anyone behind just because the paperwork's late.", mood:'happy' } }
  if (text === ENLIST.member && s.megMember) return { reply: "Any M.E.G. post can use another pair of hands. Ask whoever's in charge what they need, and tell them Callum signed you on.", mood:'calm' }
 }
 return row && row.q===text && fameOf(s,row.group)>=12 && infamyOf(s,row.group)<35 ? { reply:row.a, mood:'calm' } : null
}
