// Gallery: every picture lands here. plan.shots=[{id,url,at,by,place,pos,card,loom,kind,asset,title}]
// kind: photo (Slate camera, the default) | concept | drawing | reference | render | output. Savi files the rest via Kiln's Slate log.
export const GAL_KINDS=[['photo','Photos'],['concept','Concepts'],['drawing','Drawings'],['reference','References'],['render','Renders'],['output','Outputs']];
// Sorting a photo = making it a ticket (yourself, or Savi writes it), pinning it to a Loom page, or binning it.
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
export function addShot(ctx,p,plan,id,url){
 const f=p.feetPosition||{},r=v=>Math.round((v||0)*10)/10;
 const s={id:id(),url,at:ctx.now(),by:p.displayName,place:ctx.place?.id||'',pos:{x:r(f.x),y:r(f.y),z:r(f.z)}};
 plan.shots=[s,...(plan.shots||[])];
 p.state.slateToast={id:s.id,at:ctx.now()};
 return s;
}
export function galOp(ctx,p,d,plan,id){
 plan.shots=plan.shots||[];const s=plan.shots.find(x=>x.id===d.id);
 if(d.op==='dismiss'){p.state.slateToast=null;return false;}
 if(d.op==='gview'){if('kind' in d)p.state.galKind=GAL_KINDS.some(k=>k[0]===d.kind)?d.kind:null;if('group' in d)p.state.galGroup=!!d.group;return false;}
 if(d.op==='kind'&&s){if(!GAL_KINDS.some(k=>k[0]===d.kind))return false;s.kind=d.kind;return true;}
 if(d.op==='del'&&s){plan.shots=plan.shots.filter(x=>x!==s);plan.galGone=[...new Set([...(plan.galGone||[]),s.url])].slice(-500);if(p.state.slateToast?.id===s.id)p.state.slateToast=null;}
 if(d.op==='keep'&&s)s.kept=true;
 if((d.op==='ticket'||d.op==='savi')&&s&&!plan.cards.some(c=>c.id===s.card)){
  const c={id:id(),t:clip(d.t,120)||(d.op==='savi'?'Savi is writing this one…':'Photo '+new Date(s.at).toISOString().slice(5,16).replace('T',' ')),col:'todo',ms:'',tag:['bug','feature','polish','balance','lore','note'].includes(d.tag)?d.tag:'bug',by:s.by,place:s.place,shot:s.url,at:s.pos};
  plan.cards.push(c);s.card=c.id;p.state.slateToast=null;
  if(d.op==='ticket'){p.state.planOpen=c.id;if(d.pocket){p.state.slateDraft=c.id;p.state.slate='open';if(p.camera)p.camera.pointerLock=false;}}
  else{c.asked=ctx.now();ctx.notifyDm(`SLATE photo from ${p.displayName}, they want you to write the ticket. Look at it, name what's wrong or wanted in one title line, and fill the card: world.state.plan.cards[id=${c.id}] .t (title), .tag (bug/feature/polish/balance/lore), .note (what you see, what done looks like).${d.note?`\ntheir words: ${clip(d.note,400)}`:''}\n![photo](${s.url})\nspot: ${s.place||'main'} (${s.pos.x}, ${s.pos.y}, ${s.pos.z})`,{wake:true});}}
 if(d.op==='loom'&&s){const L=ctx.world.state.loom;const pg=L?.pages?.find(x=>x.id===d.page);if(pg){const L2=JSON.parse(JSON.stringify(L));const g=L2.pages.find(x=>x.id===d.page);if(!g.img)g.img=s.url;else g.body=(g.body?g.body+'\n\n':'')+`![photo](${s.url})`;ctx.world.state.loom=L2;s.loom=d.page;}}
 return true;
}
export const unsorted=plan=>(plan.shots||[]).filter(s=>(!s.kind||s.kind==='photo')&&!s.card&&!s.loom&&!s.kept);
// THE SWEEP: every picture anywhere in the world joins the gallery on its own, once. An editor's machine runs it each minute:
// markdown in design.md / notes / docs (the ![alt] names it), the planner and design board, Loom, the studio's shelf,
// the world theme, and world.state.slateGalleryInbox (pictures any Savi drops from chat: [{url,title,by,kind}]).
// Slate's own UI art (mods/) is never swept. A picture archived from the gallery stays out (plan.galGone).
const IMG=/\/cdn\/value\.[0-9a-f]{64}\.(?:png|jpe?g|webp|gif)/g;
export function guessKind(t){t=String(t||'').toLowerCase();
 if(/^\s*(sheet\s*)?\d{1,3}\b/.test(t)&&!/sim|balance|wear|tiers?\b/.test(t))return 'drawing';
 if(/photo|screenshot|snap/.test(t))return 'photo';
 if(/sheet|schematic|blueprint|map|plan|turnaround|ortho|diagram|layout|flow|stack/.test(t))return 'drawing';
 if(/sim|balance|chart|graph|tier|wear|result|run/.test(t))return 'output';
 if(/render|proof|silhouette/.test(t))return 'render';
 if(/ref|reference|inspiration/.test(t))return 'reference';
 return 'concept';}
let sweptAt=-1e12;
export function gallerySweep(ctx,force){const now=ctx.now();if(!force&&now-sweptAt<60000)return 0;sweptAt=now;
 const S=ctx.world.state,pl=S.plan;if(!pl||typeof pl!=='object')return 0;
 const have=new Set([...(pl.shots||[]).map(s=>s.url),...(pl.galGone||[])]),found=[];
 const add=(url,title,src,by,kind,at)=>{if(have.has(url))return;have.add(url);const t=clip(title,90);found.push({url,title:t,src,by:by||'',kind:kind||guessKind(t+' '+src),at:typeof at==='number'?at:now,auto:true});};
 // files: markdown with alt text, or a bare url (the line around it names it)
 for(const f of (ctx.world.files||[]).filter(f=>/^(design\.md|readme\.md|(notes|docs|studio)\/.+\.(md|json|ya?ml))$/i.test(f)&&f!=='studio/tome.json')){let txt='';try{txt=ctx.files.read(f)||'';}catch(e){}
  for(const m of txt.matchAll(/!\[([^\]]*)\]\((\/cdn\/value\.[0-9a-f]{64}\.(?:png|jpe?g|webp|gif))\)/g))add(m[2],m[1],f);
  for(const m of txt.matchAll(IMG)){const ln=txt.slice(Math.max(0,txt.lastIndexOf('\n',m.index)+1),m.index).replace(/[#*`>\-\[\]():"]/g,' ').replace(/\s+/g,' ').trim();add(m[0],ln.slice(-60)||f.split('/').pop(),f);}}
 // state: walk it, the nearest object's t/title/name/alt/prompt names the picture
 const walk=(o,src,name,by,d)=>{if(d>9||o==null)return;if(typeof o==='string'){for(const m of o.matchAll(IMG))add(m[0],name,src,by);return;}
  if(Array.isArray(o)){for(const x of o)walk(x,src,name,by,d+1);return;}if(typeof o!=='object')return;
  const nm=o.title||o.t||o.name||o.alt||o.prompt||o.what||name,b=typeof o.by==='string'?o.by:by;for(const k in o)if(k!=='shots'&&k!=='galGone')walk(o[k],src,typeof nm==='string'?nm:name,b,d+1);};
 const {shots,...rest}=pl;walk(rest,'planner / design board','',undefined,0);walk(S.loom,'loom','',undefined,0);walk(S.studio,'workbench','',undefined,0);walk(S.slateWorldTheme,'world theme','world theme wallpaper','Savi',0);
 const inbox=Array.isArray(S.slateGalleryInbox)?S.slateGalleryInbox:[];for(const r of inbox)if(r&&typeof r.url==='string'&&IMG.test(r.url)){IMG.lastIndex=0;add(r.url.match(IMG)[0],r.title,'chat',r.by,r.kind,r.at);}IMG.lastIndex=0;
 if(!found.length&&!inbox.length)return 0;
 const nx=JSON.parse(JSON.stringify(pl));let n=0;nx.shots=nx.shots||[];
 for(const f of found)nx.shots.unshift({id:'g'+(now%1e9).toString(36)+(n++).toString(36),...f,kept:true});
 ctx.world.state.plan=nx;if(inbox.length)S.slateGalleryInbox=[];return found.length;}
