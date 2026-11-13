import {capture,record} from './lib/wayfinding.js';
import {talkInput} from './lib/discussion-talk.js';
export {ticketSent,ticketHistory,onSay} from './lib/discussion-talk.js';
import {snapshot,remember,restore,isDelete,archiveAction} from './lib/undo.js';
// Slate: tablet presses land here, on the editor's walking body or on the god seat they drive.
// The god seat speaks for its driver; per-player state (open ticket, pocket mode) is mirrored onto both bodies,
// so the panel reads the same thing whichever one it is handed.
import {FREE,keysOf} from './lib/keys.js';
import {vaultSave,vaultRestore} from './lib/vault.js';
import {worldThemeTick} from './lib/worldtheme.js';
import {gallerySweep} from './lib/gallery.js';
// the planner, add-ons and their libraries load only on an editor's machine, after standing: a player never downloads them
let L=null,loadingL=null;
function lib(){if(L)return L;if(!loadingL)loadingL=Promise.all([import('./lib/plan.js'),import('./lib/addons.js'),import('./lib/addons-setup.js'),import('./lib/worldscan.js')]).then(([pl,ad,su,ws])=>{L={handle:pl.handle,pollContext:pl.pollContext,KEYS:pl.KEYS,forwardAddons:ad.forwardAddons,setupAddons:su.setupAddons,scanOnce:ws.scanOnce};}).catch(e=>{loadingL=null;});return null;}
function editor(ctx){
 const d=ctx.self.controller&&ctx.getObject(ctx.self.controller);
 if(d?.isEditor)return d;
 return ctx.self.isEditor?ctx.self:null;
}
export function onInput(ctx,input){
 talkInput(ctx,input);
 const p=editor(ctx);if(!p)return;
 if(input.pressed?.planTicketTalk && ctx.self.id!==p.id){p.state.slateTicketTalk={ref:String(input.actionData?.planTicketTalk?.ref||''),thread:String(input.actionData?.planTicketTalk?.thread||''),busy:false,message:'Open pocket Slate on foot to use Discussion.'};ctx.self.state.slateTicketTalk=p.state.slateTicketTalk;}
 const m=lib();if(!m)return;const {handle,KEYS,forwardAddons,setupAddons}=m;
 const pressed=input.pressed||{},data=input.actionData||{};
 // a button can send two actions in one click (close the ticket, then change tab): each is handled
 // J on a keyboard: the pocket opens with the cursor freed to use it, and J again tucks it away and hands the look back
 // your own keys (Settings → shortcuts): J opens the small slate by default
 const navBefore=capture(p,ctx);ctx.session.slateNavBefore=navBefore;ctx.session.slateNavBatch=true;
 try {
 const mine=keysOf(p);
 for(const key of FREE)if(pressed['slateK_'+key]){const cmd=Object.keys(mine).find(c=>mine[c]===key);if(!cmd)continue;
  if(cmd==='pocket')handle(ctx,p,{planPocket:true},{planPocket:{mode:p.state.slate==='open'?'tab':'open'}});
  else{handle(ctx,p,{planTab:true},{planTab:{tab:cmd==='planner'?'board':cmd}});handle(ctx,p,{planPocket:true},{planPocket:{mode:'open',home:false}});}}
 if(pressed.planUndo)restore(ctx,p);
 if(pressed.planArchive)archiveAction(ctx,p,data.planArchive||{});
 for(const k of KEYS)if(pressed[k]){const before=isDelete(k,data[k]||{})?snapshot(ctx):null;handle(ctx,p,{[k]:true},data);if(before)remember(ctx,p,before);}
 } finally {ctx.session.slateNavBatch=false;delete ctx.session.slateNavBefore;if(!(pressed.planTab&&data.planTab?.op==='back'))record(p,navBefore,capture(p,ctx));}
 try{forwardAddons(ctx,pressed,data);}catch(e){ctx.log?.('slate: add-on tap failed',{e:String(e?.message||e)});}
 if(pressed.planAddon){try{setupAddons(ctx);}catch(e){}}
 if(Object.keys(pressed).some(k=>pressed[k]&&(k.startsWith('plan')||k.startsWith('slate'))))vaultSave(ctx);
 const seat=p.controlling;
 if(seat&&seat.id!==p.id){seat.state.planOpen=p.state.planOpen??null;if(p.state.slate)seat.state.slate=p.state.slate;seat.state.loomCh=p.state.loomCh??null;seat.state.loomPage=p.state.loomPage??null;for(const k of ['slateNav','slatePhoto','planProj','planGroup','planSprint','ibOpen','ibWho','galKind','galGroup','slateTab','slateWTPreview','slateTheme','loomF','loomFold','loomRen','crowdF','crowdFold','slateKeys','slateSeen','slateBlank','slateUndo','slateSize','slateGodSize','slateGodFull','slateArchiveMessage','slateSettingsOpen','slateWelcomeStep','slateLed','slateGodTucked','slateIconForm','slateIconPrompt','slateIconMessage']){if(p.state[k]===undefined)delete seat.state[k];else seat.state[k]=p.state[k];}}
}

// Play-time ledger for the PLAYERS app: in the posted game each player adds their minutes to one small table,
// so the tablet can show who plays most and for how long. Two SQL writes a minute per player, nothing per frame.
export const updateSchedule={every:{seconds:30}};
export function onSpawn(ctx){if(!editor(ctx))return; // builders only: a player's body never runs slate
 vaultRestore(ctx);lib();}
// every mod installed here gets a planner project of its own, once; renaming or deleting it is yours
const PJC=['#64d2ff','#30d158','#ff9f0a','#bf5af2','#ff6482','#ffd60a'];
function seedModProjects(ctx){const pl=ctx.world.state.plan;if(!pl||!Array.isArray(pl.cards))return;
 const mods=(ctx.world.files||[]).map(f=>/^mods\/([^/]+)\/mod\.json$/.exec(f)?.[1]).filter(Boolean);
 const P=Array.isArray(pl.projects)?pl.projects:[],seen=new Set([...P.map(q=>q.mod).filter(Boolean),...(pl.modSeeded||[])]),add=[];
 for(const m of mods){if(seen.has(m))continue;let name=m;try{const j=JSON.parse(ctx.files.read(`mods/${m}/mod.json`)||'{}');name=String(j.displayName||j.name||m).slice(0,40);}catch(e){}
  add.push({id:'pj-mod-'+m,name,kind:'mod',mod:m,color:PJC[(P.length+add.length)%6]});}
 if(!add.length)return;const nx=JSON.parse(JSON.stringify(pl));nx.projects=[...P,...add];nx.modSeeded=[...new Set([...(pl.modSeeded||[]),...add.map(q=>q.mod)])];ctx.world.state.plan=nx;}
// About reads the installed mod itself: mod.json's version and that version's CHANGELOG section, so every push shows itself
let aboutAt=0;
const vnum=v=>String(v||'0').split('.').map(n=>+n||0).reduce((a,n)=>a*1000+n,0);
function syncAbout(ctx){const t=ctx.now?.()??0;if(t-aboutAt<15000)return;aboutAt=t;
 let v='',notes=[];try{v=String(JSON.parse(ctx.files.read('mods/slate/mod.json')||'{}').version||'');}catch(e){return;}if(!v)return;
 const md=ctx.files.read('mods/slate/CHANGELOG.md')||'',secs={};let cur=null;
 for(const ln of md.split('\n')){const h=/^#{1,3}\s*v?(\d+\.\d+\.\d+)/.exec(ln);if(h){cur=h[1];secs[cur]=[];continue;}if(cur){const b=/^\s*[-*]\s+(.*)/.exec(ln);if(b)secs[cur].push(b[1].replace(/\*\*/g,'').slice(0,300));else if(ln.trim()&&!secs[cur].length)secs[cur].push(ln.trim().slice(0,300));}}
 const key=secs[v]?v:'';notes=(secs[key]||[]).slice(0,8);const up=Object.keys(secs).filter(k=>vnum(k)>vnum(v)).sort((a,b)=>vnum(b)-vnum(a))[0]||'',next=up?{v:up,notes:secs[up].slice(0,8)}:null;
 const old=ctx.world.state.slateAbout;const row={v,nv:key,notes,next};if(old&&JSON.stringify(old)===JSON.stringify(row))return;
 ctx.world.state.slateAbout=row;}
const slatePour=new Set(); // the pending rows this machine is pouring now
export function update(ctx){
 if(!editor(ctx)){ctx.sleep?.(600);return;} // builders only: no wisp copy, no vault, no playtime ledger on players
 const me=ctx.self;
 // the tablet draws where player.wisps isn't handed over: keep a copy of the player's own wisps on their state
 try{const ws=Array.isArray(me?.wisps)?me.wisps.map(w=>({id:w.id,name:w.name,color:w.color,shape:w.shape,burnStyle:w.burnStyle,stage:w.stage})):null;if(ws&&JSON.stringify(ws)!==JSON.stringify(me.state.slateWisps||null))me.state.slateWisps=ws;}catch(e){}
 // the vault: a room that woke empty gets its board and book back; whatever changed by other hands (Savi, undo) is saved
 vaultRestore(ctx);if(me?.isEditor||ctx.getObject(me?.controller)?.isEditor){seedModProjects(ctx);vaultSave(ctx);try{syncAbout(ctx);}catch(e){}try{gallerySweep(ctx);}catch(e){ctx.log?.('slate: gallery sweep failed',{e:String(e?.message||e)});}try{worldThemeTick(ctx,editor(ctx)||me);}catch(e){ctx.log?.('slate: world theme failed',{e:String(e?.message||e)});}const m=lib();if(m){try{m.setupAddons(ctx);}catch(e){}/* first open in a world: read it and fill the book and the board */try{const ed=editor(ctx);m.scanOnce(ctx,ed?.displayName||'');}catch(e){ctx.log?.('slate: world scan failed',{e:String(e?.message||e)});}try{if(m.pollContext(ctx)?.changed)vaultSave(ctx);}catch(e){ctx.log?.('slate: automatic context failed',{e:String(e?.message||e)});}}}
 // every walking player's body keeps the ledger (the god seat, driven by its editor, does not: it has a controller).
 // The database is the host's: a body holding ctx.sql writes straight in; a player's own machine (no ctx.sql in multiplayer)
 // adds its half-minute to its own row of world.state.slatePlayPend, and the next body that holds ctx.sql pours those rows in.
 if(!me?.userId||me.controller)return;
 const fresh=!ctx.session.slatePlay;ctx.session.slatePlay=1;
 const name=String(me.displayName||'player').slice(0,40),S=ctx.world.state;
 if(typeof ctx.sql!=='function'){const day=new Date(ctx.now()).toISOString().slice(0,10),stamp=new Date(ctx.now()).toISOString().slice(0,19).replace('T',' ');
  if(!S.slatePlayPend||typeof S.slatePlayPend!=='object')S.slatePlayPend={};const o=S.slatePlayPend[me.userId]||{};
  S.slatePlayPend[me.userId]={n:name,m:(o.m||0)+0.5,s:(o.s||0)+(fresh?1:0),f:o.f||stamp,l:stamp,d:{...(o.d||{}),[day]:{m:((o.d||{})[day]?.m||0)+0.5,s:((o.d||{})[day]?.s||0)+(fresh?1:0)}}};return;}
 Promise.resolve(ctx.sql`CREATE TABLE IF NOT EXISTS slate_play(user TEXT PRIMARY KEY,name TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,first TEXT,last TEXT);
  CREATE TABLE IF NOT EXISTS slate_day(day TEXT,user TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,PRIMARY KEY(day,user));
  INSERT INTO slate_play(user,name,minutes,sessions,first,last) VALUES(${me.userId},${name},0.5,1,datetime('now'),datetime('now'))
  ON CONFLICT(user) DO UPDATE SET name=${name},minutes=minutes+0.5,sessions=sessions+${fresh?1:0},last=datetime('now');
  INSERT INTO slate_day(day,user,minutes,sessions) VALUES(date('now'),${me.userId},0.5,${fresh?1:0})
  ON CONFLICT(day,user) DO UPDATE SET minutes=minutes+0.5,sessions=sessions+${fresh?1:0}`).catch(()=>{});
 const pend=S.slatePlayPend;if(!pend||typeof pend!=='object')return;
 for(const uid of Object.keys(pend)){if(!pend[uid]||slatePour.has(uid))continue;let r;try{r=JSON.parse(JSON.stringify(pend[uid]));}catch(e){continue;}slatePour.add(uid);const rn=String(r.n||'player').slice(0,40),days=Object.entries(r.d||{});
  Promise.resolve(ctx.sql`CREATE TABLE IF NOT EXISTS slate_play(user TEXT PRIMARY KEY,name TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,first TEXT,last TEXT);
  CREATE TABLE IF NOT EXISTS slate_day(day TEXT,user TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,PRIMARY KEY(day,user));
  INSERT INTO slate_play(user,name,minutes,sessions,first,last) VALUES(${uid},${rn},${+r.m||0},${+r.s||0},${r.f||null},${r.l||null})
  ON CONFLICT(user) DO UPDATE SET name=${rn},minutes=minutes+${+r.m||0},sessions=sessions+${+r.s||0},first=min(coalesce(first,${r.f||null}),coalesce(${r.f||null},first)),last=max(coalesce(last,''),coalesce(${r.l||null},''))`)
  .then(()=>Promise.all(days.map(([d,v])=>ctx.sql`INSERT INTO slate_day(day,user,minutes,sessions) VALUES(${d},${uid},${+v?.m||0},${+v?.s||0}) ON CONFLICT(day,user) DO UPDATE SET minutes=minutes+${+v?.m||0},sessions=sessions+${+v?.s||0}`)))
  .then(()=>{const P=ctx.world.state.slatePlayPend,c=P?.[uid];if(!c)return; // take away only what was poured: a half-minute that landed meanwhile stays for the next pour
   const left={},cd=c.d||{};let any=false;for(const d of Object.keys(cd)){const m=(cd[d]?.m||0)-(r.d?.[d]?.m||0),s=(cd[d]?.s||0)-(r.d?.[d]?.s||0);if(m>0.01||s>0){left[d]={m:Math.max(0,m),s:Math.max(0,s)};any=true;}}
   if(any)P[uid]={n:c.n,m:Math.max(0,(c.m||0)-(r.m||0)),s:Math.max(0,(c.s||0)-(r.s||0)),f:c.f,l:c.l,d:left};else delete P[uid];})
  .catch(()=>{}).finally(()=>slatePour.delete(uid));}
}
