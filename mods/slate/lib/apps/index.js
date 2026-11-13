// SLATE APPS: Slate's own installable apps (the Slate Apps app lists them beside installed mods).
// The core five (Studio, Loom, Planner, Kiln, Workbench) are Slate itself and never uninstall.
//
// CONTRACT, one file per app in lib/apps/<id>.js:
//   export const APP = { id, name (CAPS), glyph, color '#rrggbb', sub (home tile line), about (store line) }
//   export function page(ctx, player, plan) → html   the app's screen, between Slate's app bar and the home button
//   export function op(ctx, player, d, plan) → bool  a press: sendAction('planApp', { id:'<id>', op:'<name>', ...data })
//                                                   return true only when it changed `plan` (world.state.plan) in place
//   An app keeps its own data in world.state.slateAppData[<id>] (shared) or player.state.slateApp_<id> (one person's).
//   It never writes another app's data. It reads Slate's look from ../tokens.js and ../themes.js like every app.
// Installed = world.state.slateApps[<id>] === true. Open = plan.tab 'app-<id>'.
import * as wispPet from './wisp-pet.js';
import * as wispWorlds from './wisp-worlds.js';
import * as headphones from './headphones.js';
import * as assets from './assets.js';
import * as metrics from './metrics.js';
import * as guide from './guide.js';
const MODS=[wispPet,wispWorlds,headphones,assets,metrics];
export const BUILTIN=MODS.map(m=>({...m.APP,m}));
const ALL=[...BUILTIN,{...guide.APP,m:guide}];
export const CORE=[['tome','STUDIO'],['diary','LOOM'],['board','PLANNER'],['kiln','KILN'],['studio','WORKBENCH']];
export const appById=id=>ALL.find(a=>a.id===id)||null;
export const appOn=(ctx,id)=>ctx?.world?.state?.slateApps?.[id]===true;
export const appsOn=ctx=>BUILTIN.filter(a=>appOn(ctx,a.id));
export const appOfTab=tab=>typeof tab==='string'&&tab.startsWith('app-')?appById(tab.slice(4)):null;
export function appOp(ctx,p,d,plan){
 const a=appById(String(d?.id||''));if(!a)return false;const S=ctx.world.state;
 if(d.op==='install'&&!a.core){S.slateApps={...(S.slateApps||{}),[a.id]:true};return false;}
 if(d.op==='uninstall'&&!a.core){const n={...(S.slateApps||{})};delete n[a.id];S.slateApps=n;if(plan.tab==='app-'+a.id)plan.tab='addons';p.state.slateAppArm=null;return true;}
 if(d.op==='storePage'){p.state.slateStorePage=a.id;return false;}
 if(d.op==='storeBack'){p.state.slateStorePage=null;return false;}
 if(d.op==='arm'){p.state.slateAppArm=a.id;return false;}
 if(d.op==='disarm'){p.state.slateAppArm=null;return false;}
 if(d.op==='open'&&appOn(ctx,a.id)){plan.tab='app-'+a.id;p.state.slateStorePage=null;return true;}
 try{return !!a.m.op(ctx,p,d,plan);}catch(e){ctx.log?.('slate app op failed',{id:a.id,op:d.op,e:String(e?.message||e)});return false;}
}
export function appView(ctx,player,plan,id){
 const a=appById(id);if(!a||a.core)return '';
 if(!appOn(ctx,id))return `<div style="padding:28px;text-align:center;color:#8a9aa0">${a.name} isn't installed.<br><button onclick="sendAction('planApp',{id:'${a.id}',op:'install'})" style="margin-top:12px;background:#a37d45;color:#111b2c;border:0;border-radius:4px;padding:6px 14px;cursor:pointer">Install</button></div>`;
 try{return String(a.m.page(ctx,player,plan)??'');}catch(e){return `<div style="padding:18px;color:#ff9156">${a.name} could not draw: ${String(e?.message||e).replace(/[<>&]/g,'')}</div>`;}
}
