import { setQuest, endQuest } from './quests.js'
import { addRep, infamyOf } from './rep.js'
const ID = 'meg-first-assignment', NAME = 'First Assignment'
const Q = { ask: 'Do you have an assignment for me?', accept: "I'll take the clinic inventory sheet to Ortiz.", deliver: "Callum sent me with the clinic inventory sheet.", report: "Ortiz checked the inventory. Here's her list." }
const short = (o) => String(o?.id ?? '').split('/').pop()
const mark = (id) => ({ place:'level1', id })
export function megAssignmentChoices(it, s) {
 if (!s?.megMember || infamyOf(s,'meg') >= 35) return []
 const id=short(it), n=s.megAssignment ?? 0, out=[]
 if (id==='meg-callum') {
  if (!n) out.push(s.megAssignmentAsked ? {text:Q.accept,tag:'M.E.G. Assignment'} : {text:Q.ask,tag:'M.E.G.'})
  if (n===2) out.push({text:Q.report,tag:'Quest Turn-In'})
 }
 if (id==='meg-ortiz' && n===1) out.push({text:Q.deliver,tag:'M.E.G. Assignment'})
 return out
}
export function megAssignmentReply(it,s,text) {
 if (!s?.megMember || infamyOf(s,'meg') >= 35) return null
 const id=short(it), n=s.megAssignment ?? 0
 if (id==='meg-callum' && !n && text===Q.ask) { s.megAssignmentAsked=true; return {reply:"Ortiz needs to check the clinic stock against my inventory sheet. Take it to her and bring back her corrections. I'll pay five dollars for the run. Interested?",mood:'calm'} }
 if (id==='meg-callum' && !n && s.megAssignmentAsked && text===Q.accept) { s.megAssignment=1; setQuest(s,ID,{name:NAME,step:"Take Callum's inventory sheet to Dr. Ortiz at the Level 1 camp.",mark:mark('meg-ortiz'),briefing:"Callum needs the clinic inventory checked. Take his sheet to Ortiz, then return with her corrections."}); return {reply:"Here. Ortiz is at the clinic. Don't fill in the numbers yourself; she'll notice.",mood:'calm'} }
 if (id==='meg-ortiz' && n===1 && text===Q.deliver) { s.megAssignment=2; setQuest(s,ID,{name:NAME,step:"Return Ortiz's corrected inventory to Callum at the Level 1 camp.",mark:mark('meg-callum')}); return {reply:"He counted the empty boxes again. Give me that. Two bandages, no clean sutures. Take the corrected sheet back to him.",mood:'calm'} }
 if (id==='meg-callum' && n===2 && text===Q.report) { s.megAssignment=99; s.cents=(s.cents ?? 0)+500; addRep(s,'meg',3,'Completed First Assignment'); endQuest(s,ID,"Delivered Ortiz's corrected clinic inventory to Callum."); return {reply:"No sutures? I'll put them on the next supply request. Here's your five. Good work.",mood:'happy'} }
 return null
}
