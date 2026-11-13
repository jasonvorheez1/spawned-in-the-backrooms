// The ONLY input to canonical user messages is accepted Spawn chat (history/onSay).
import {initialize,ensure,threadFor,validRef,record,share,detach,pin,accept,marker,request,hash} from './discussion.js';
import {linksOf} from './links.js';
import {vaultSave} from './vault.js';
const SCOPE='slate';
const allowed=ctx=>ctx.self?.isEditor===true&&!ctx.self.controller;
function receipt(ctx,ref,thread,patch){const old=ctx.self.state.slateTicketTalk;ctx.self.state.slateTicketTalk={ref,thread,...(old?.ref===ref&&old.thread===thread?old:{}),...patch};}
function updateReceipt(ctx,o,patch){const r=ctx.self.state.slateTicketTalk;if(r?.ref===o.ref&&r.thread===o.thread)receipt(ctx,o.ref,o.thread,patch);}
function box(ctx){return ctx.self.session.discussionSends??={};}
function complete(ctx,o){if(o.status!=='sent')return;const t=ctx.world.state.plan?.discussions?.threads?.[o.thread];if(!t)return;
 const m=Object.values(t.messages||{}).find(m=>m.post===o.post&&m.by?.userId===ctx.self.userId);if(!m){updateReceipt(ctx,o,{busy:false,message:'Sent. Waiting for accepted chat history; Refresh will check again.'});return;}
 o.status='complete';if(o.ask){const r=request(ctx,t,o.ref,m);updateReceipt(ctx,o,{busy:false,message:r?.status==='error'?r.error:r?.status==='answered'?'Savi replied.':'Waiting for Savi — your accepted question is with the builder.'});}else updateReceipt(ctx,o,{busy:false,message:'Posted to this shared discussion.'});
}
function accepted(ctx,line){const r=accept(ctx.world.state.plan,ctx.world.state.loom,line);if(!r)return;for(const o of Object.values(box(ctx)))if(o.thread===r.thread&&o.post===r.message.post)complete(ctx,o);}
export function talkInput(ctx,input){if(!input.pressed?.planTicketTalk||!allowed(ctx))return;
 const p=ctx.self,d=input.actionData?.planTicketTalk||{},ref=String(d.ref||('c:'+String(d.id||''))),plan=ctx.world.state.plan,loom=ctx.world.state.loom;
 if(!plan||!validRef(ref)||!record(plan,loom,ref))return;
 initialize(plan,loom);const t=threadFor(plan,ref,String(d.thread||''))||ensure(plan,ref);
 // A selected topic must actually belong here. A forged id cannot reach another discussion.
 if(d.thread&&d.thread!==t.id&&d.thread!=='topic-'+ref)return;
 const op=d.op;receipt(ctx,ref,t.id,{busy:false,message:'',draftThread:String(d.thread||t.id)});
 if(op==='select')return;
 if(op==='share'){if(linksOf(ref,plan,loom).some(l=>l.other===d.target)&&share(plan,loom,t,d.target))receipt(ctx,ref,t.id,{message:'Discussion shared. Existing conversations were kept.'});}
 else if(op==='detach'){if(d.target!==ref&&detach(plan,t,d.target))receipt(ctx,ref,t.id,{message:'Membership removed; the thread and its history are kept.'});}
 else if(op==='pin'){if(pin(plan,loom,t,d.source,p,ctx.now()))receipt(ctx,ref,t.id,{message:'Decision pinned by source reference. No task or page was changed.'});}
 else if(op==='unpin'){t.pins=t.pins.filter(x=>x.id!==d.pinId);}
 else if(op==='askExisting'){const m=t.messages?.[d.messageId];if(m){const r=request(ctx,t,ref,m);receipt(ctx,ref,t.id,{message:r?.status==='error'?r.error:r?.status==='answered'?'Savi replied.':'Waiting for Savi — this accepted comment was not reposted.'});}}
 else if(op==='refresh'){if(p.session.discussionHistoryBusy)return;p.session.discussionHistoryBusy=true;receipt(ctx,ref,t.id,{busy:true,message:'Reading retained Slate chat…'});try{ctx.job('chat:history',{scope:SCOPE},'ticketHistory',{ref,thread:t.id});}catch(e){p.session.discussionHistoryBusy=false;receipt(ctx,ref,t.id,{busy:false,message:'Could not read chat. Refresh to retry.'});}}
 else if(op==='send'){
  const text=String(d.text||'').trim(),key=String(d.key||'').slice(0,120),b=box(ctx);
  if(!text||text.length>600){receipt(ctx,ref,t.id,{message:'Write 1–600 characters.'});return;}
  // One request per client press; a duplicate action or a rerender never posts twice.
  if(key&&b[key]){const o=b[key];updateReceipt(ctx,o,{busy:o.status==='sending',message:o.status==='failed'?'Not sent. Your draft is kept; press Post or Ask again to retry.':'This post is already being handled.',...(o.status==='sent'||o.status==='complete'?{ack:{key:o.key}}:{})});return;}
  if(Object.values(b).some(o=>o.status==='sending')){receipt(ctx,ref,t.id,{busy:true,message:'Your previous post is still sending. This draft is kept.'});return;}
  const seq=(p.session.discussionSeq||0)+1;p.session.discussionSeq=seq;
  const k=key||'press-'+seq,post=hash(p.userId+'|'+ctx.now()+'|'+seq+'|'+k),o={key:k,ref,thread:t.id,post,ask:d.ask===true,status:'sending'};b[k]=o;
  const done=Object.keys(b).filter(k=>['failed','complete'].includes(b[k].status));for(const k of done.slice(0,-32))delete b[k];
  receipt(ctx,ref,t.id,{busy:true,message:'Sending through moderated chat…',ack:null,pressKey:k});
  try{ctx.job('chat:send',{scope:SCOPE,text:marker(t.id,post)+text},'ticketSent',{key:k,post,ref,thread:t.id});}catch(e){o.status='failed';receipt(ctx,ref,t.id,{busy:false,message:'Could not send. Your draft is kept.'});}
 }
 vaultSave(ctx);
}
export function ticketSent(ctx,result,payload){if(!allowed(ctx))return;const o=box(ctx)[payload?.key];if(!o||o.status!=='sending'||o.post!==payload.post)return;
 if(!result.ok){o.status='failed';updateReceipt(ctx,o,{busy:false,message:result.error?.message||'Not sent. Your draft is kept.',ack:null});return;}
 o.status='sent';updateReceipt(ctx,o,{busy:false,message:'Sent. Reading accepted chat…',ack:{key:o.key}});complete(ctx,o);
 // chat:send returns {scope,at}, not text. Never manufacture a user row from its receipt.
 try{ctx.job('chat:history',{scope:SCOPE},'ticketHistory',{ref:o.ref,thread:o.thread});}catch(e){updateReceipt(ctx,o,{busy:false,message:'Sent, but chat history is unavailable. Refresh to retry.'});}
 vaultSave(ctx);
}
export function ticketHistory(ctx,result,payload){if(!allowed(ctx))return;ctx.self.session.discussionHistoryBusy=false;
 if(!result.ok){updateReceipt(ctx,payload||{},{busy:false,message:result.error?.message||'Could not read retained chat. Your posts are kept.'});return;}
 for(const line of result.data?.lines||[])accepted(ctx,line);
 for(const o of Object.values(box(ctx)))complete(ctx,o);
 updateReceipt(ctx,payload||{},{busy:false,message:'Shared conversation · retained Slate chat'});vaultSave(ctx);
}
export function onSay(ctx,line){if(!allowed(ctx)||!ctx.world.state.plan||line.scope!==SCOPE)return;accepted(ctx,line);vaultSave(ctx);}
