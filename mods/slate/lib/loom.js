import {SECTIONS} from './settings.js';
import {inherit} from './discussion.js';
import {WELCOME} from './welcome.js';
import {ledOp} from './led.js';
// Loom: the game's book. Chapters hold pages; a hero page is a feature idea that splits into board tickets.
// world.state.loom = { title, chapters:[{id,name}], pages:[{id,ch,sec,t,body,img,hero,feat,tix,savi,asked,by}] }
// Per player: state.loomCh (open chapter), state.loomPage (open page).
import {scan,apply} from './rename.js';
import {linkOp} from './links.js';
import {noteOp} from './journal.js';
import {crowdOp} from './crowd.js';
import {ruleOp} from './rules.js';
import {keyOp} from './keys.js';
import {themeOp} from './themes.js';
import {kilnOp,kilnLoad,kilnList,kilnSteps} from './kiln.js';
import {preOp} from './prepro.js';
import {markSeen} from './seen.js';
import {flowOp,TEMPLATE} from './flow.js';
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
const P=(id,ch,t,body,hero)=>({id,ch,t,body,hero:!!hero,feat:'',tix:[]});
// A blank book is a game design document waiting to be filled: every page asks its own question.
// each chapter kind has its own new-page button and a starting page to fill in
export const LEVELS=['world','region','zone','area','spot'];
export const KINDS={
 characters:{add:'+ new character',blank:'New character',body:'Role:\nWants:\nFears:\nLooks like:\nSounds like:\nWhere we meet them:'},
 places:{add:'+ new place',blank:'New place',body:'What you see first:\nWho lives here:\nWhat you do here:\nHow you get in and out:'},
 factions:{add:'+ new faction',blank:'New faction',body:'What they want:\nWho leads:\nWhat they fight with:\nFriends / enemies:'},
 story:{add:'+ new story beat',blank:'New beat',body:'What happens:\nWhere:\nWhat the player does:\nWhat changes after:'},
 mechanics:{add:'+ new mechanic',blank:'New mechanic',body:'The verb (what you press):\nWhat it gets back:\nThe numbers:\nHow it can go wrong:'},
 items:{add:'+ new item',blank:'New item',body:'What it does:\nWhere you find it:\nWhat it costs:'},
 page:{add:'+ new page',blank:'Untitled page',body:''}};
export const kindOf=n=>{n=String(n||'').toLowerCase();return /charac|cast|people/.test(n)?'characters':/place|location|world|map|level/.test(n)?'places':/faction|clan|guild/.test(n)?'factions':/story|plot|timeline/.test(n)?'story':/mechanic|rules|play|system/.test(n)?'mechanics':/item|gear|loot/.test(n)?'items':'page';};
export function seed(){return {title:'Game Design Book',chapters:[
  {id:'pitch',name:'Pitch'},{id:'pillars',name:'Pillars'},{id:'story',name:'Story'},{id:'characters',name:'Characters'},
  {id:'places',name:'Places'},{id:'mechanics',name:'Mechanics'},{id:'look',name:'Art & Sound'}],
 pages:[
  P('p-oneliner','pitch','The one-liner','One sentence a friend would repeat: who you are, what you do, why it is fun.'),
  P('p-player','pitch','Who it is for','Who plays this, on what, for how long a sitting? What game do they already love?'),
  P('p-feel','pitch','The feeling','The moment you want players to screenshot. What does it feel like to be there?'),
  P('p-pillar1','pillars','Pillar one','A rule every feature must serve. If an idea breaks a pillar, it waits.'),
  P('p-world','story','The world','Where is this, when, and what is wrong with it?'),
  P('p-arc','story','The arc','Beginning, turn, end. What changes for the player between the first minute and the last?'),
  P('p-hero','characters','The player','Who are you in this world? What can you do that nobody else can?'),
  P('p-home','places','Where you start','The first place a player stands. What do they see, what do they want to touch?'),
  P('p-loop','mechanics','Core loop','What you do every minute, what you earn, what you spend it on.',true),
  P('p-win','mechanics','Win and lose','How a run or session ends, well and badly.'),
  P('p-style','look','Style','Palette, shapes, the music under it, the sound of the first press.')]};}
// book: optional { get()→L, set(L), view } so the same Loom edits any book (a game's scenario, a player's draft);
// omitted = the world's own book at world.state.loom and the editor's view state on p.state.
export function loomOp(ctx,p,d,plan,id,book){
 const B=book||null,V=B?.view||p.state;
 const L=JSON.parse(JSON.stringify((B?B.get():ctx.world.state.loom)||seed()));
 const save=()=>{if(B)B.set(L);else ctx.world.state.loom=L;};
 const pg=d.id&&L.pages.find(x=>x.id===d.id);let planChanged=false;
 const op=d.op;
 if(/^pre[A-Z]/.test(String(op))){const w=kilnList(ctx).find(x=>x.id==='preproduction');return preOp(ctx,p,d,plan,id,L,save,w&&{...w,steps:kilnSteps(w.md)});}
 if(op==='homeOrder'){const pos={};for(const [k,v] of Object.entries(d.pos||{}).slice(0,40)){if(/^[a-z]{2,12}$/.test(k)&&Array.isArray(v)){const r=Math.max(0,Math.min(40,v[0]|0)),c=Math.max(-10,Math.min(10,v[1]|0));pos[k]=[r,c];}}p.state.slateHomeOrder=Object.keys(pos).length?{cen:1,pos}:null;return false;}
 if(op==='homeCols'){p.state.slateHomeCols=Math.max(1,Math.min(20,+d.cols|0))||4;return false;}
 if(op==='homeReset'){p.state.slateHomeOrder=null;return false;}
 if(op==='welcomeNext'){p.state.slateWelcomeStep=((p.state.slateWelcomeStep||0)+1)%WELCOME.length;return false;}
 if(op==='ledConfig'){ledOp(p,d);return false;}
 if(op==='godFull'){p.state.slateGodFull=!!d.on;return false;}
 if(op==='godSize'){if(['phone','tablet'].includes(d.size))p.state.slateGodSize=d.size;if(d.size==='phone')p.state.slateGodFull=false;return false;}
 if(op==='godTuck'){p.state.slateGodTucked=!!d.tucked;return false;}
 if(op==='gameIconOpen'){p.state.slateIconForm=d.open!==false;p.state.slateIconMessage='';return false;}
 if(op==='gameIconDraft'){p.state.slateIconPrompt=clip(d.prompt,1200);return false;}
 if(op==='gameIconAsk'){
  if(!['prompt','yolo'].includes(d.mode)){p.state.slateIconForm=true;return false;}
  const prompt=d.mode==='prompt'?clip(d.prompt,1200).trim():'';
  if(d.mode==='prompt'&&!prompt){p.state.slateIconMessage='Write a prompt, or choose let Savi yolo it.';p.state.slateIconForm=true;return false;}
  if(ctx.now()-(p.state.slateIconAskedAt??-60000)<10000){p.state.slateIconMessage='Your last request is already with Savi. Give it a moment.';return false;}
  p.state.slateIconAskedAt=ctx.now();if(d.mode==='prompt')p.state.slateIconPrompt=prompt;
  ctx.notifyDm('Slate Game icon request from '+p.displayName+': paint a square app-store-style icon for this game. '+(d.mode==='prompt'?'Creator art direction (quoted): '+JSON.stringify(prompt)+'.':'Creator chose YOLO: choose the art direction using this game’s own lore, style and box art.')+' Store the resulting asset at world.state.plan.game.icon, not in the Slate mod package. Preserve other metadata. No publishing.',{wake:true});
  p.state.slateIconForm=false;p.state.slateIconMessage=d.mode==='prompt'?'Your prompt is with Savi.':'Savi has free rein. Icon requested.';return false;
 }
 if(/^theme/.test(String(op)))return themeOp(ctx,p,d);
 if(op==='settingsPage'){if(p.isEditor&&SECTIONS.includes(d.page)){p.state.slateSettingsPage=d.page;p.state.slateTab='settings';}if(p.isEditor&&d.page==='KILN')kilnLoad(ctx);return false;}
 if(op==='tabPosition'){if(!p.isEditor)return false;if(['left','right'].includes(d.side))p.state.slateSide=d.side;if(Number.isFinite(d.height))p.state.slateTabHeight=Math.max(4,Math.min(94,d.height));return false;}
 if(/^kiln/.test(String(op)))return kilnOp(ctx,p,d);
 if(op==='settingsFold'){const allowed=['THEMES','ENVIRONMENT','ARCHIVE','ABOUT SLATE','GAME RULES','SHORTCUTS','PLAY-MODE ORB','CAMERA','NOTIFICATIONS'];if(allowed.includes(d.section)){const a=(p.state.slateSettingsOpen||[]).map(x=>x==='WORLD RULES'?'GAME RULES':x);p.state.slateSettingsOpen=a.includes(d.section)?a.filter(x=>x!==d.section):[...a,d.section];}return false;}
 const tagList=v=>[...new Set((Array.isArray(v)?v:String(v??'').split(',')).map(t=>clip(t,24).trim().toLowerCase()).filter(Boolean))].slice(0,12);
 if(op==='filter'){const f=V.loomF&&V.loomF.ch===d.ch?V.loomF:{ch:d.ch,sec:[],tag:[]};const k=d.kind==='sec'?'sec':'tag',v=clip(d.v,40);
  if(d.v==null)V.loomF={ch:d.ch,sec:[],tag:[]};else{let a=[...(f[k]||[])];if(d.multi)a=a.includes(v)?a.filter(x=>x!==v):[...a,v];else a=a.length===1&&a[0]===v?[]:[v];V.loomF={...f,ch:d.ch,[k]:a};}return false;}
 if(op==='more'){V.loomMore={ch:clip(d.ch,60),n:Math.min(400,((V.loomMore&&V.loomMore.ch===d.ch)?V.loomMore.n:24)+24)};return false;}
 if(op==='open'&&V.loomMore&&V.loomMore.ch!==d.ch)V.loomMore=null;
 if(op==='fold'){const k=clip(d.k,90);const f=new Set(V.loomFold||[]);if(d.set||d.unset){for(const x of (Array.isArray(d.set)?d.set:[]).slice(0,8))f.add(clip(x,90));for(const x of (Array.isArray(d.unset)?d.unset:[]).slice(0,8))f.delete(clip(x,90));}else if(d.all!==undefined){for(const x of (Array.isArray(d.all)?d.all:[]).slice(0,80))d.close?f.add(clip(x,90)):f.delete(clip(x,90));}else f.has(k)?f.delete(k):f.add(k);V.loomFold=[...f].slice(-200);return false;}
 if(/^flow/.test(op)){const result=flowOp(ctx,p,d,L,plan,id,V);if(result==='nosave')return false;save();return result==='plan';}
 if(op==='start'){L.flow=Array.isArray(L.flow)?L.flow:[];
  if(d.kind==='template'&&!L.flow.length){L.flow=TEMPLATE.map(x=>({id:id(),...x,mech:[],beats:[],chars:[],lines:[],tix:[]}));}
  if(d.kind==='savi'){L.startAsked=ctx.now();ctx.notifyDm(`LOOM start from ${p.displayName}: the book is empty. Read this world (design.md, places, scripts, characters, voice lines) and draft a starter book into world.state.loom, high level first: L.flow phases in play order (title, one-line sub, mechanics) come first; then drill down: story beats per phase as Story pages (sec = phase title) linked in phase.beats, the cast in Characters linked in phase.chars, a line or two each, then Places. Mark each drafted page savi:true so they know what to check.`);}
  L.started=d.kind;V.loomCh=d.kind==='blank'?L.chapters[0]?.id:'flow';V.loomPage=null;save();return false;}
 if(op==='homeAsk'){const t=clip(d.t,600).trim();if(!t)return false;ctx.notifyDm(`SLATE ask from ${p.displayName} (typed in the home bar): ${t}`,{wake:true});p.state.slateAsked=ctx.now();return false;}
 if(op==='open'){V.loomCh=d.ch?clip(d.ch,40):V.loomCh;V.loomPage=d.id?clip(d.id,40):null;return false;}
 if(op==='title')L.title=clip(d.t,60).trim()||L.title;
 if(op==='chAdd'){const n=clip(d.name,40).trim();if(n){const c={id:id(),name:n};L.chapters.push(c);V.loomCh=c.id;V.loomPage=null;}}
 if(op==='chRn'){const c=L.chapters.find(c=>c.id===d.ch);const n=clip(d.name,40).trim();if(c&&n)c.name=n;}
 if(op==='chDel'){if(!L.pages.some(x=>x.ch===d.ch)){L.chapters=L.chapters.filter(c=>c.id!==d.ch);if(V.loomCh===d.ch)V.loomCh=L.chapters[0]?.id;}}
 if(op==='chMove'){const i=L.chapters.findIndex(c=>c.id===d.ch),j=i+(d.dir>0?1:-1);if(i>=0&&j>=0&&j<L.chapters.length){const [c]=L.chapters.splice(i,1);L.chapters.splice(j,0,c);}}
 if(op==='pgAdd'){const ch=L.chapters.some(c=>c.id===d.ch)?d.ch:L.chapters[0]?.id;const kind=kindOf(L.chapters.find(c=>c.id===ch)?.name);const t=clip(d.t,120).trim()||KINDS[kind].blank;const n={...P(id(),ch,t,clip(d.body,6000)||KINDS[kind].body),by:p.displayName};
  if(d.sec)n.sec=clip(d.sec,40).trim();if(d.hero){n.hero=true;n.body=clip(d.body,6000)||'What this whole section is for, in two lines. Then list what it needs below: each line becomes a ticket.';}
  if(kind==='places'){n.lvl=LEVELS.includes(d.lvl)?d.lvl:'zone';const par=L.pages.find(x=>x.id===d.parent&&x.ch===ch);if(par)n.parent=par.id;}L.pages.push(n);V.loomCh=ch;if(!d.stay)V.loomPage=n.id;}
 if(op==='link'||op==='unlink')return linkOp(plan,d,id);
 if(op==='rule'||op==='ruleDel')return ruleOp(ctx,p,d);
 if(op==='key')return keyOp(ctx,p,d);
 if(op==='seenAll'){markSeen(p,['board','diary','crowd','gallery'],plan,L);return false;}
 if(/^crowd/.test(op))return crowdOp(ctx,p,d,plan);
 if(/^note/.test(op)){const r=noteOp(ctx,p,d,plan,L,id);if(r.loom)save();return !!r.plan;}
 if(op==='renScan'){const from=clip(d.from,60).trim(),to=clip(d.to,60);V.loomRen={from,to,hits:scan(L,plan,from),auto:!!d.auto};return false;}
 if(op==='renClose'){delete V.loomRen;return false;}
 if(op==='ioOpen'){V.loomIO=1;return false;}
 if(op==='ioClose'){delete V.loomIO;return false;}
 if(op==='renApply'){const r=V.loomRen;if(!r)return false;const to=d.to!==undefined?clip(d.to,60):r.to;if(!to.trim())return false;const n=apply(L,plan,r.from,to,Array.isArray(d.keys)?d.keys.map(k=>clip(k,120)):null);V.loomRen={from:r.from,to,hits:[],done:n};save();return true;}
 if(op==='pgEdit'&&pg){
  if(d.t!==undefined&&clip(d.t,120).trim()){const old=pg.t,nt=clip(d.t,120).trim();pg.t=nt;if(old.length>=3&&old!==nt){const hits=scan(L,plan,old);if(hits.length)V.loomRen={from:old,to:nt,hits,auto:true};}}
  // pictures: img is the lead picture, imgs the rest of the strip
  if(d.addImg&&/^(\/cdn\/|https:\/\/[\w.-]+\.spawnfile\.io\/)/.test(d.addImg)){const u=clip(d.addImg,400);if(!pg.img)pg.img=u;else if(pg.img!==u&&!(pg.imgs||[]).includes(u))pg.imgs=[...(pg.imgs||[]),u].slice(-12);}
  if(d.rmImg){pg.imgs=(pg.imgs||[]).filter(u=>u!==d.rmImg);if(!pg.imgs.length)delete pg.imgs;}
  if(d.leadImg&&(pg.imgs||[]).includes(d.leadImg)){pg.imgs=pg.imgs.map(u=>u===d.leadImg?pg.img:u).filter(Boolean);pg.img=d.leadImg;}
  if(d.img===''&&pg.imgs?.length){d.img=pg.imgs[0];pg.imgs=pg.imgs.slice(1);if(!pg.imgs.length)delete pg.imgs;}
  if(d.body!==undefined)pg.body=clip(d.body,6000);
  if(d.feat!==undefined)pg.feat=clip(d.feat,2000);
  if(d.hero!==undefined)pg.hero=!!d.hero;
  if(d.lvl!==undefined&&LEVELS.includes(d.lvl))pg.lvl=d.lvl;
  if(d.parent!==undefined){let a=L.pages.find(x=>x.id===d.parent&&x.ch===pg.ch),ok=!!a;while(a){if(a.id===pg.id){ok=false;break;}a=L.pages.find(x=>x.id===a.parent);}if(ok)pg.parent=d.parent;else if(!d.parent)delete pg.parent;}
  if(d.sec!==undefined)pg.sec=clip(d.sec,40).trim();
  if(d.tags!==undefined)pg.tags=tagList(d.tags);
  if(d.addTag!==undefined)pg.tags=tagList([...(pg.tags||[]),...tagList(d.addTag)]);
  if(d.dropTag!==undefined)pg.tags=(pg.tags||[]).filter(t=>t!==d.dropTag);
  if(d.ch!==undefined&&L.chapters.some(c=>c.id===d.ch)){pg.ch=d.ch;V.loomCh=d.ch;}
  if(typeof d.img==='string'&&(d.img===''||/^(\/cdn\/|https:\/\/[\w.-]+\.spawnfile\.io\/)/.test(d.img)))pg.img=d.img;}
 if(op==='pgDel'&&pg){L.pages=L.pages.filter(x=>x!==pg);if(V.loomPage===pg.id)V.loomPage=null;}
 // hero page → one ticket per feature line not yet on the board, each linked back to its page
 if(op==='tickets'&&pg){
  const have=new Set((pg.tix||[]).map(t=>plan.cards.find(c=>c.id===t)?.t).filter(Boolean));
  for(const line of String(pg.feat||'').split('\n').map(s=>s.replace(/^[-*•\s]+/,'').trim()).filter(Boolean)){
   const t=clip(line,120);if(have.has(t))continue;
   const c={id:id(),t,col:'idea',ms:'',tag:'feature',by:p.displayName,place:'',lore:pg.id,note:`From the Loom page "${pg.t}".`};
   if(pg.proj)c.proj=pg.proj;if(pg.ms)c.ms=pg.ms;c.sourceRefs=['p:'+pg.id];plan.cards.push(c);(pg.tix=pg.tix||[]).push(c.id);inherit(plan,'p:'+pg.id,'c:'+c.id);have.add(t);planChanged=true;}}
 if(op==='ask'&&pg){p.state.slateTicketTalk={ref:'p:'+pg.id,message:'Ask in Discussion; your question is posted through moderated chat first.',busy:false};return false;}
 // a book file loads in chunks: chapters first, then pages ten at a time; a known id is replaced
 if(op==='import'){
  if(d.title)L.title=clip(d.title,60);
  for(const c of (Array.isArray(d.chapters)?d.chapters:[]).slice(0,80)){const n=clip(c.name,40).trim();if(!n)continue;const cid=clip(c.id,40)||id();const o=L.chapters.find(x=>x.id===cid);if(o)o.name=n;else L.chapters.push({id:cid,name:n});}
  for(const x of (Array.isArray(d.pages)?d.pages:[]).slice(0,20)){const pid=clip(x.id,40)||id();const n={id:pid,ch:L.chapters.some(c=>c.id===x.ch)?x.ch:L.chapters[0]?.id,sec:clip(x.sec,40),t:clip(x.t,120).trim()||'Untitled',body:clip(x.body,6000),img:typeof x.img==='string'&&x.img.startsWith('/cdn/')?x.img:'',hero:!!x.hero,feat:clip(x.feat,2000),tags:tagList(x.tags),tix:[]};const i=L.pages.findIndex(y=>y.id===pid);if(i>=0)L.pages[i]={...L.pages[i],...n,tix:L.pages[i].tix||[]};else L.pages.push(n);}}
 save();return planChanged;
}
