import { fameOf, infamyOf } from './rep.js'
const LINES = {
  'meg-callum': { group: 'meg', q: '[M.E.G. reputation] What does the camp need most?', a: "Someone to keep the routes open. People bring us supplies and we pass them on, but I can't spare a runner every time a shelf comes up short. Keep an eye on the others when you're out there." },
  'bntg-voss': { group: 'bntg', q: '[B.N.T.G. reputation] How does the Guild keep track of its deals?', a: "Receipts. Names when we have them, marks when we don't. Keep your copy until the goods change hands. If somebody says the price changed afterward, show them the paper." },
}
export function factionChoices(it, s) {
 const id=String(it?.id ?? '').split('/').pop(), row=LINES[id]
 return row && fameOf(s,row.group)>=12 && infamyOf(s,row.group)<35 ? [{ text:row.q, tag:'Reputation' }] : []
}
export function factionReply(it, s, text) {
 const row=LINES[String(it?.id ?? '').split('/').pop()]
 return row && row.q===text && fameOf(s,row.group)>=12 && infamyOf(s,row.group)<35 ? { reply:row.a, mood:'calm' } : null
}
