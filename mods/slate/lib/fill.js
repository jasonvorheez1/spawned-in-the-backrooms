// ✦ fill (from Loreweaver's Wick flame): one suggestion for one Slate text box, built from everything already written.
// f = 'tk:<cardId>:<t|note|accept>' | 'pg:<pageId>:<t|body>'. Suggestion lives on player.state.slateSug = { f, text?, busy?, err? }.
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').trim().slice(0,n);
const SPEC={
 'tk:t':['the ticket title','a short, specific ticket title, under 70 characters',120],
 'tk:note':["the ticket's notes","what's happening, what was expected, and how to make it happen: 2 to 4 plain sentences",1200],
 'tk:accept':["the ticket's acceptance line",'one or two checkable sentences: how we will know it is done',800],
 'pg:t':['the name of this book page','a fitting name, 1 to 5 words',80],
 'pg:body':['the body of this book page','vivid, specific, useful notes for building the game, under 900 characters',2000],
};
export function fillOp(ctx,p,d,plan){
 const op=d.op,f=clip(d.f,80);
 if(op==='fillClear'){delete p.state.slateSug;return false;}
 const [kind,id,key]=f.split(':');const spec=SPEC[kind+':'+key];if(!spec)return false;
 const L=ctx.world.state.loom||{},card=kind==='tk'&&(plan.cards||[]).find(c=>c.id===id),page=kind==='pg'&&(L.pages||[]).find(x=>x.id===id);
 if(!card&&!page)return false;
 if(op==='fillKeep'){const s=p.state.slateSug;if(!s||s.f!==f||!s.text)return false;delete p.state.slateSug;
  if(card){card[key]=clip(s.text,spec[2]);return 'plan';}
  return {op:'pgEdit',id,[key]:clip(s.text,spec[2])};}
 if(op!=='fill')return false;
 if(p.state.slateSug?.busy&&p.state.slateSug.f===f)return false;
 const prev=p.state.slateSug?.f===f?p.state.slateSug.text:'';
 p.state.slateSug={f,busy:true};
 const g=plan.game||{},chs=L.chapters||[],chName=c=>(chs.find(x=>x.id===c)||{}).name||'';
 const lines=[`GAME: "${g.name||g.title||ctx.world.state?.studio?.title||'this game'}".`,
  (L.pages||[]).filter(x=>x.t&&x!==page).slice(0,30).map(x=>`${x.t} (${chName(x.ch)})${x.body?': '+String(x.body).slice(0,120):''}`).join('; ')?'BOOK PAGES: '+(L.pages||[]).filter(x=>x.t&&x!==page).slice(0,30).map(x=>`${x.t} (${chName(x.ch)})`).join('; '):'',
  'OPEN TICKETS: '+(plan.cards||[]).filter(c=>c.col!=='done'&&c!==card).slice(0,20).map(c=>c.t).join('; ')];
 if(card)lines.push(`THIS TICKET [${card.tag}${card.ms?' · '+card.ms:''}]: title "${card.t}", notes "${card.note||''}", done when "${card.accept||''}", place ${card.place||'main'}.`);
 if(page)lines.push(`THIS PAGE in "${chName(page.ch)}": name "${page.t||''}", body "${String(page.body||'').slice(0,1200)}", tags "${(page.tags||[]).join(', ')}".`);
 const cur=clip(d.cur,1500);
 const msg=`${lines.filter(Boolean).join('\n')}\n\nSuggest ${spec[0]}. Write ${spec[1]}.${cur?` The creator already typed: "${cur}". Build from it, keep their ideas and words.`:''}${prev?` Your last suggestion was "${prev}": give a clearly different one.`:''} Return only the text for the box, no quotes, no preamble.`;
 const pid=p.id;
 ctx.job('llm:generate',{system:'You are the little flame inside Slate, a game creator\'s planning tablet. You suggest; the creator decides. Plain, warm, specific.',message:msg,schema:{type:'object',properties:{text:{type:'string'}},required:['text']},model:'fast'},(r)=>{
  const pl=(ctx.world.players||[]).find(x=>x.id===pid);if(!pl||pl.state.slateSug?.f!==f)return;
  let o=r?.ok?(r.data?.object??null):null;if(!o&&r?.ok){try{o=JSON.parse(r.data?.text)}catch(e){o={text:r.data?.text}}}
  const t=clip(String(o?.text??'').replace(/^["']|["']$/g,''),spec[2]);
  pl.state.slateSug=t?{f,text:t}:{f,err:'the flame fizzled. tap ✦ again'};
 });
 return false;
}
// the ✦ button and its suggestion chip, for any box. curJs = a JS expression for the box's current text.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function fillBtn(player,f,curJs){
 return `<button title="✦ fill: a suggestion from what's already written" onclick="sendAction('planLoom',{op:'fill',f:'${f}',cur:${curJs}})" style="background:#1a2b3d;border:1px solid #a37d45;color:#ffd79a;border-radius:10px;cursor:pointer;font-size:10.5px;padding:1px 8px">${player?.state?.slateSug?.f===f&&player.state.slateSug.busy?'✦ …':'✦ fill'}</button>`;}
export function fillChip(player,f){
 const s=player?.state?.slateSug;if(!s||s.f!==f||s.busy)return '';
 const b=`background:#1a2b3d;border:1px solid #a37d45;color:#ffd79a;border-radius:8px;cursor:pointer;font-size:10.5px;padding:2px 8px`;
 if(s.err)return `<div style="font-size:11px;color:#ff9156;margin:3px 0">${esc(s.err)}</div>`;
 return `<div style="background:#16202e;border:1px dashed #a37d45;border-radius:8px;padding:7px 9px;margin:4px 0;font-size:12px;color:#e9e2d0;white-space:pre-wrap;line-height:1.4">✦ ${esc(s.text)}<div style="display:flex;gap:5px;margin-top:6px"><button style="${b}" onclick="sendAction('planLoom',{op:'fillKeep',f:'${f}'})">keep</button><button style="${b}" onclick="sendAction('planLoom',{op:'fill',f:'${f}',cur:''})">another</button><button style="${b};color:#8a9aa0;border-color:#3a3f45" onclick="sendAction('planLoom',{op:'fillClear'})">dismiss</button></div></div>`;}
