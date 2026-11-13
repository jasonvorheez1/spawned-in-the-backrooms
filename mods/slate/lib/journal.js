import {inherit} from './discussion.js';
// Journal notes: edit in place (keeps an edited stamp), tag, and turn into a ticket or a Loom page.
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
const stamp=d=>{const dt=/^\d{4}-\d\d-\d\d$/.test(String(d.date||''))?d.date:'',tm=/^\d\d:\d\d$/.test(String(d.time||''))?d.time:'';return (dt+' '+tm).trim();};
export function noteOp(ctx,p,d,plan,L,id){
 if(d.op==='noteWho'){p.state.ibWho=clip(d.who,40)||'all';return {};}
 // the open note: the board's ticket view, per reader
 if(d.op==='noteOpen'){p.state.ibOpen=d.id?clip(d.id,40):null;return {};}
 const e=(plan.diary||[]).find(x=>x.id===d.id);if(!e)return {};
 // the design board: lanes, votes, stars
 if(d.op==='noteKind'){if(!['spark','question','ref','savi','decided'].includes(d.kind)||e.kind===d.kind)return {};e.kind=d.kind;return {plan:true};}
 if(d.op==='noteVote'){const n=p.displayName;e.votes=Array.isArray(e.votes)?e.votes:[];e.votes=e.votes.includes(n)?e.votes.filter(x=>x!==n):[...e.votes,n].slice(-40);return {plan:true};}
 if(d.op==='noteStar'){e.star=!e.star;return {plan:true};}
 if(d.op==='noteEdit'){const t=clip(d.t,1200).trim();if(!t||t===e.t)return {};e.t=t;e.edited=stamp(d)||'yes';e.editedBy=p.displayName;return {plan:true};}
 if(d.op==='noteBody'){const t=clip(d.body,2000).trim();if(t===(e.body||''))return {};if(t)e.body=t;else delete e.body;e.edited=stamp(d)||'yes';e.editedBy=p.displayName;return {plan:true};}
 if(d.op==='noteComment'){p.state.slateTicketTalk={ref:'d:'+e.id,message:'Use Discussion to post through moderated chat.',busy:false};return {};}
 if(d.op==='noteUncomment'){e.comments=(e.comments||[]).filter(c=>!(c.id===d.cid&&(c.by===p.displayName||p.isEditor)));return {plan:true};}
 if(d.op==='noteShot'){const u=String(d.shot||'');if(u===''){delete e.shot;return {plan:true};}if(/^(\/cdn\/|https:\/\/[\w.-]+\.spawnfile\.io\/)/.test(u)){e.shot=clip(u,400);return {plan:true};}return {};}
 if(d.op==='noteTag'){const t=clip(d.tag,24).trim().toLowerCase();e.tags=e.tags||[];if(d.drop)e.tags=e.tags.filter(x=>x!==d.drop);else if(t&&!e.tags.includes(t)&&e.tags.length<10)e.tags.push(t);return {plan:true};}
 if(d.op==='noteTicket'){if(e.card&&plan.cards.some(c=>c.id===e.card)){p.state.planOpen=e.card;return {};}
  const first=String(e.t).split('\n')[0].slice(0,120)||'journal note';const c={id:id(),t:first,col:'idea',tag:'note',ms:'',by:p.displayName,note:e.t+(e.body?'\n\n'+e.body:''),place:'',at:null,...(e.shot?{shot:e.shot}:{}),from:'journal'};
  if(e.proj)c.proj=e.proj;if(e.ms)c.ms=e.ms;c.sourceRefs=['d:'+e.id];plan.cards.push(c);e.card=c.id;inherit(plan,'d:'+e.id,'c:'+c.id);p.state.planOpen=c.id;return {plan:true};}
 if(d.op==='noteLore'){const ch=L.chapters.find(c=>c.id===d.ch)||L.chapters[0];if(!ch)return {};
  if(e.page&&L.pages.some(x=>x.id===e.page)){p.state.loomCh=ch.id;p.state.loomPage=e.page;return {};}
  const first=String(e.t).split('\n')[0].slice(0,120)||'From the journal';const pg={id:id(),ch:ch.id,sec:'',t:first,body:e.t+(e.body?'\n\n'+e.body:''),img:e.shot||'',hero:false,feat:'',tags:[...(e.tags||[])],tix:[],by:p.displayName};
  if(e.proj)pg.proj=e.proj;if(e.ms)pg.ms=e.ms;pg.sourceRefs=['d:'+e.id];
  L.pages.push(pg);e.page=pg.id;inherit(plan,'d:'+e.id,'p:'+pg.id);p.state.loomCh=ch.id;p.state.loomPage=pg.id;return {plan:true,loom:true};}
 return {};
}
