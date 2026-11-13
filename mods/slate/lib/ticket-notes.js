// Authored project documentation, never player chat. planEdit {op:'ticketNoteAdd'|'ticketNoteEdit',id,text,noteId?}.
// Server identity owns author fields; unknown fields/operations never reach the ordinary card-edit path.
export function ticketNotesOp(ctx,p,d,makeId){
 const report=(ok,message,noteId)=>{p.state.slateTicketNotes={id:d.id,op:d.op,ok,message,noteId:noteId||'',text:typeof d.text==='string'?d.text:'',at:ctx.now()};return ok;};
 if(!p.isEditor||!p.userId)return report(false,'Only signed-in project editors can write documentation.');
 if(!['ticketNoteAdd','ticketNoteEdit'].includes(d.op))return report(false,'Unknown note operation.');
 if(Object.keys(d).some(k=>!['op','id','text','noteId'].includes(k)))return report(false,'Only note text can be changed.');
 if(typeof d.id!=='string'||typeof d.text!=='string'||!d.text.trim()||d.text.trim().length>4000)return report(false,'Write a note between 1 and 4,000 characters.');
 const plan=ctx.world.state.plan||{},epic=d.id.startsWith('epic:'),key=epic?'ms':'cards',rid=epic?d.id.slice(5):d.id,rows=plan[key]||[],i=rows.findIndex(r=>r.id===rid);
 if(i<0)return report(false,'This ticket is no longer available.');
 const record=rows[i];if(record.notes!=null&&!Array.isArray(record.notes))return report(false,'Existing notes use an older format. They have been kept unchanged.');
 const notes=[...(record.notes||[])],text=d.text.trim(),at=new Date().toISOString();let noteId;
 const sig=JSON.stringify(d),last=p.session?.ticketNotePress;
 if(last&&last.sig===sig&&ctx.now()-last.at<150)return false;
 if(d.op==='ticketNoteAdd'){
  noteId=makeId();if(notes.some(n=>n?.id===noteId))return report(false,'Please try adding the note again.');
  notes.push({id:noteId,userId:p.userId,displayName:p.displayName||p.userId,text,at});
 }else{
  if(typeof d.noteId!=='string')return report(false,'Choose a note to edit.');
  const j=notes.findIndex(n=>n&&n.id===d.noteId);if(j<0)return report(false,'That note is no longer available.');
  if(notes[j].userId!==p.userId)return report(false,'You can only edit your own notes.');
  noteId=notes[j].id;notes[j]={...notes[j],text,edited:at};
 }
 const next=[...rows];next[i]={...record,notes};ctx.world.state.plan={...plan,[key]:next};
 if(p.session)p.session.ticketNotePress={sig,at:ctx.now()};
 return report(true,d.op==='ticketNoteAdd'?'Note added.':'Note updated.',noteId);
}
