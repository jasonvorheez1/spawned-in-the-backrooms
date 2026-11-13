// ADD-ONS (from @dandalruss's Slate): any installed mod, living inside Slate as a native app. Discovery and wiring: lib/addons-setup.js; contract: lib/adapters/index.js.
import {ADAPTERS} from './adapters/index.js';
import {HOSTED} from './addons-host.js';
import {scan,hostedIds,homeApps} from './addons-setup.js';
export {HOSTED};
export const catalog=(ctx)=>scan(ctx);                       // every installed mod but Slate
export const suggested=(ctx)=>ADAPTERS.filter(a=>!installed(ctx,a.id));
export const installed=(ctx,id)=>(ctx?.world?.files||[]).includes(`mods/${id}/mod.json`);
export const onHome=(ctx,id)=>homeApps(ctx).includes(id);
export const homeLive=(ctx)=>live(ctx).filter(a=>onHome(ctx,a.id));
export const isHosted=(ctx,id)=>hostedIds(ctx).includes(id);
// hosted add-ons: what addons-host.js imported AND world.state lists. Never gated on reading mod.json (a HUD ctx may not read files).
export const live=(ctx)=>{const sc=scan(ctx);return hostedIds(ctx).filter(id=>HOSTED[id]).map(id=>{const m=sc.find(a=>a.id===id),c=HOSTED[id];return {id,name:c.app?.name||id,glyph:c.app?.glyph,color:c.app?.color,hostable:true,...(m||{}),c};});};
// pages an add-on hands to one of Slate's own apps
export const contribs=(ctx,app)=>live(ctx).flatMap(a=>(a.c.pages||[]).filter(p=>p.app===app).map(p=>({...p,id:a.id,glyph:a.c.app.glyph})));
// taps from add-on html: Slate declared the name, so it lands here and goes on to the add-on's own handler
export function forwardAddons(ctx,pressed,data){for(const a of live(ctx))for(const n of a.c.actions||[])if(pressed[n])a.c.forward(ctx,n,data[n]);}
// add-on records that are tickets: one card each, keyed, kept in step both ways
export function syncCards(ctx,plan){
 const cards=plan.cards||(plan.cards=[]);let dirty=false;
 for(const a of live(ctx)){
  let rows=[];try{rows=a.c.cards?.(ctx)||[]}catch(e){}
  for(const r of rows){
   const id=('ao-'+a.id.slice(0,6)+'-'+r.key).replace(/[^\w-]/g,'_');let c=cards.find(x=>x.id===id);
   if(!c){cards.push({id,t:r.t,note:r.note,tag:r.tag,col:r.col,addon:{id:a.id,key:r.key,src:r.src,col:r.col},by:String(a.c.app?.name||a.name)});dirty=true;continue;}
   const was=c.addon||{};
   if(was.src!==r.src){c.col=r.col;c.addon={...was,src:r.src,col:r.col};dirty=true;}
   else if((c.col==='done')!==(was.col==='done')&&a.c.settle){a.c.settle(ctx,c,c.col);c.addon={...was,col:c.col};dirty=true;}
   if(c.note!==r.note){c.note=r.note;dirty=true;}
  }
 }
 return dirty;
}
// ENDPOINTS: what an installed add-on exposes to Slate. endpointsOf lists them; callAddon reads or writes one.
export const endpointsOf=(ctx,id)=>{const a=live(ctx).find(x=>x.id===id);return a?Object.entries(a.c.endpoints||{}).map(([name,e])=>({name,read:!!e.read,write:!!e.write})):[];};
export function callAddon(ctx,player,id,name,args,mode){
 const a=live(ctx).find(x=>x.id===id),e=a?.c.endpoints?.[name];if(!e)return {ok:false,error:a?'no endpoint '+name:id+' is not installed'};
 const fn=mode==='write'?e.write:(e.read||e.write);if(!fn)return {ok:false,error:name+' has no '+(mode||'read')};
 try{return {ok:true,data:fn(ctx,player,args||{})}}catch(err){return {ok:false,error:String(err?.message||err)}}
}
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
export function addonOp(ctx,p,d,plan){
 const id=String(d.id||d.name||'').trim().toLowerCase(),S=ctx.world.state;
 if(d.op==='contrib'){p.state.slateContrib=d.k?{id,k:d.k,app:d.app}:null;return true;}
 if(d.op==='store'){p.state.slateAddon=null;plan.tab='addons';return true;}
 if(!ID.test(id))return false;
 const here=installed(ctx,id),meta=scan(ctx).find(x=>x.id===id),nm=meta?.name||ADAPTERS.find(x=>x.id===id)?.name||id;
 if(d.op==='open'){p.state.slateAddon=here&&isHosted(ctx,id)?id:null;p.state.slateContrib=null;plan.tab='addons';return true;}
 if(d.op==='close'){p.state.slateAddon=null;return true;}
 if(d.op==='page'){p.state.slateAoPage={...(p.state.slateAoPage||{}),[id]:String(d.k||'')};p.state.slateContrib=null;return true;}
 if(d.op==='call'){const r=callAddon(ctx,p,id,String(d.name||''),d.args,'write');p.state.slateAoCall={id,name:String(d.name||''),ok:r.ok,error:r.error||null,at:ctx.now()};return true;}
 if(d.op==='host'){if(here&&meta?.hostable){S.slateHosted={...(S.slateHosted||{}),[id]:true};S.slateHomeApps={...(S.slateHomeApps||{}),[id]:true};}return true;}
 if(d.op==='unhost'){const h={...(S.slateHosted||{})};delete h[id];S.slateHosted=h;const w={...(S.slateHomeApps||{})};delete w[id];S.slateHomeApps=w;if(p.state.slateAddon===id)p.state.slateAddon=null;return true;}
 if(d.op==='homeapp'){const t={...(S.slateHomeApps||{})};if(t[id])delete t[id];else if(here&&isHosted(ctx,id))t[id]=true;S.slateHomeApps=t;return true;}
 if(d.op==='railtab'){const t={...(S.slateShowTab||{})};if(t[id]===false)delete t[id];else t[id]=false;S.slateShowTab=t;return true;}
 if(d.op==='arm'){p.state.slateAoArm=here?id:null;return true;}
 if(d.op==='disarm'){p.state.slateAoArm=null;return true;}
 if(d.op==='install'||d.op==='remove'){
  if(d.op==='remove'&&!here)return true;
  const was=plan.addons?.[id];if(was&&ctx.now()-was.asked<60000)return true; // one ask a minute
  plan.addons={...(plan.addons||{}),[id]:{asked:ctx.now(),by:p.displayName,op:d.op}};
  if(d.op==='remove'){const h={...(S.slateHosted||{})};delete h[id];S.slateHosted=h;const w={...(S.slateHomeApps||{})};delete w[id];S.slateHomeApps=w;p.state.slateAddon=null;p.state.slateAoArm=null;}
  else if(d.host!==false){S.slateHosted={...(S.slateHosted||{}),[id]:true};S.slateHomeApps={...(S.slateHomeApps||{}),[id]:true};} // installed from Slate = lives in Slate, on its home
  const msg=d.op==='install'
   ?`SLATE STORE install from ${p.displayName}: ${nm} (${id}). Run \`spawn mod install ${id}\` (if no mod has that name, tell them). Slate hosts it by itself on its next tick (lib/addons-setup.js). Then clear world.state.plan.addons["${id}"].`
   :`SLATE STORE remove from ${p.displayName}: ${nm} (${id}). Slate has already stopped hosting it and puts its rail tab back on its next tick; then run \`spawn mod remove ${id}\` and clear world.state.plan.addons["${id}"].`;
  try{ctx.notifyDm(msg,{wake:true});}catch(e){}
  return true;}
 return false;
}
// installs land: clear the pending ask once the folder is there (or gone)
export function settleAsks(ctx,plan){const a=plan.addons;if(!a)return false;let dirty=false;const n={...a};for(const [id,v] of Object.entries(a)){const here=installed(ctx,id);if(v.op==='install'&&here||v.op==='remove'&&!here||ctx.now()-v.asked>36e5){delete n[id];dirty=true;}}if(dirty)plan.addons=n;return dirty;}
