// Slate sets up its add-ons itself (from @dandalruss's Slate): run from the editor's update (every 30 s) and after an add-on press.
// It only writes when something is out of place, so a set-up world costs a few string compares.
import {ADAPTERS} from './adapters/index.js';
const SELF='slate',J=t=>{try{return JSON.parse(t||'null')}catch(e){return null}};
const list=ctx=>ctx.world?.files||[];
const st=ctx=>ctx.world?.state||{};
export const hostedIds=ctx=>Object.keys(st(ctx).slateHosted||{}).filter(id=>st(ctx).slateHosted[id]);
// the home-screen whitelist: an add-on gets an app tile on Slate's home only when listed here
export const homeApps=ctx=>Object.keys(st(ctx).slateHomeApps||{}).filter(id=>st(ctx).slateHomeApps[id]);
export const hidesTab=(ctx,id)=>st(ctx).slateShowTab?.[id]===false; // a hosted mod keeps its own god-mode panel unless the creator hides it (psypher5: "i dont wanna take that away")
// every installed mod, as Slate sees it (memo: re-read when the tree or Slate's add-on state moves)
let memo={k:null,v:[]};
export function scan(ctx){
 const fl=list(ctx),k=fl.length+'|'+JSON.stringify([st(ctx).slateTabs||{},st(ctx).slateHosted||{}])+'|'+fl.filter(f=>/^mods\/[^/]+\/mod\.json$/.test(f)).join();
 if(memo.k===k&&memo.at&&(ctx.now?.()??0)-memo.at<5000)return memo.v;
 const out=[];
 for(const f of fl){
  const m=/^mods\/([^/]+)\/mod\.json$/.exec(f);if(!m||m[1]===SELF)continue;
  const id=m[1],man=J(ctx.files?.read?.(f));if(!man)continue;
  const tab=man.tab||st(ctx).slateTabs?.[id]||null;
  const god=(man.attach||[]).find(a=>a?.target?.kind==='god')?.behavior||null;
  const own=man.slate&&typeof man.slate==='object'?man.slate:null,builtin=ADAPTERS.find(a=>a.id===id);
  const adapter=own?.adapter&&fl.includes(`mods/${id}/${own.adapter}`)?`../../${id}/${own.adapter}`
   :builtin&&fl.includes(`mods/slate/lib/adapters/${id}.js`)?`./adapters/${id}.js`:null;
  const panel=tab?.render&&fl.includes(`mods/${id}/${tab.render}`)?tab.render:null;
  out.push({id,name:String(own?.name||builtin?.name||man.displayName||id).toUpperCase(),glyph:own?.glyph||builtin?.glyph||tab?.icon||'◫',
   color:own?.color||builtin?.color||'#3c4a5c',about:String(own?.about||builtin?.about||man.description||'').split('\n')[0].slice(0,240),
   version:man.version||null,tab,panel,god:god&&fl.includes(`mods/${id}/${god}`)?god:null,actions:Object.keys(man.inputs?.actions||{}),
   adapter,files:{...(builtin?.files||{}),...(own?.files||{})},hostable:!!(adapter||panel)});
 }
 memo={k,v:out,at:ctx.now?.()??0};
 return out;
}
export function hostSource(ctx){
 const on=new Set(hostedIds(ctx)),mods=scan(ctx).filter(a=>on.has(a.id)&&a.hostable);
 if(!mods.length)return "// written by lib/addons-setup.js from the installed mods and world.state.slateHosted: the only file that imports another mod's folder.\n// Reset to `export const HOSTED={};` before a Slate publish (setup writes it back on the next tick).\nexport const HOSTED={};\n";
 let imp="import {finish,generic} from './addons-generic.js';\n";const map=[];
 mods.forEach((a,i)=>{
  const parts=[];
  if(a.panel){imp+=`import * as m${i}_panel from '../../${a.id}/${a.panel}';\n`;parts.push(`panel:m${i}_panel.default`);}
  if(a.god){imp+=`import * as m${i}_god from '../../${a.id}/${a.god}';\n`;parts.push(`god:m${i}_god`);}
  for(const [k,f] of Object.entries(a.files||{})){if(!/^[a-z]\w*$/i.test(k)||k==='panel'||k==='god'||!list(ctx).includes(`mods/${a.id}/${f}`))continue;imp+=`import * as m${i}_${k} from '../../${a.id}/${f}';\n`;parts.push(`${k}:m${i}_${k}`);}
  const meta=JSON.stringify({id:a.id,name:a.name,glyph:a.glyph,color:a.color,version:a.version,actions:a.actions,tab:a.tab?{label:a.tab.label}:null});
  if(a.adapter){imp+=`import make${i} from '${a.adapter}';\n`;map.push(`${JSON.stringify(a.id)}:(()=>{const mods={${parts.join(',')}};return finish(${meta},make${i}(mods),mods)})()`);}
  else map.push(`${JSON.stringify(a.id)}:generic(${meta},{${parts.join(',')}})`);
 });
 return `// written by lib/addons-setup.js from the installed mods and world.state.slateHosted: the only file that imports another mod's folder.\n// Reset to \`export const HOSTED={};\` before a Slate publish (setup writes it back on the next tick).\n${imp}export const HOSTED={${map.join(',')}};\n`;
}
export function setupAddons(ctx,actionsOf){
 if(!ctx.files?.read||!ctx.files?.write)return [];
 const did=[],s=ctx.world.state;
 try{
  const all=scan(ctx),on=new Set(hostedIds(ctx));
  const want=hostSource(ctx),host='mods/slate/lib/addons-host.js';
  if(ctx.files.read(host)!==want){ctx.files.write(host,want);did.push('host');}
  // tap names: Slate declares a hosted mod's names, and takes back the ones it declared for a mod no longer hosted
  const sm=J(ctx.files.read('mods/slate/mod.json'))||{};sm.inputs=sm.inputs||{};sm.inputs.actions=sm.inputs.actions||{};
  const mine={...(s.slateAoDeclared||{})},clash={};let smDirty=false,stDirty=false;
  for(const [name,id] of Object.entries(mine))if(!on.has(id)||!all.some(a=>a.id===id)){delete sm.inputs.actions[name];delete mine[name];smDirty=stDirty=true;}
  for(const a of all){
   if(!on.has(a.id)||!a.hostable)continue;
   for(const name of new Set([...(actionsOf?.(a.id)||[]),...a.actions])){
    if(mine[name]===a.id)continue;
    if(sm.inputs.actions[name]||mine[name]){(clash[a.id]??=[]).push(name);continue;} // Slate's own name, or another add-on's
    sm.inputs.actions[name]={};mine[name]=a.id;smDirty=stDirty=true;
   }
  }
  if(smDirty){ctx.files.write('mods/slate/mod.json',JSON.stringify(sm,null,2)+'\n');did.push('actions');}
  if(stDirty)s.slateAoDeclared=mine;
  if(JSON.stringify(s.slateAoClash||{})!==JSON.stringify(clash))s.slateAoClash=clash;
  // rail tabs: kept while hosted; hidden only when the creator turns it off, put back the moment that stops
  const tabs={...(s.slateTabs||{})};let tabDirty=false;
  for(const a of all){
   const p=`mods/${a.id}/mod.json`,man=J(ctx.files.read(p));if(!man)continue;
   const hide=on.has(a.id)&&a.hostable&&hidesTab(ctx,a.id);
   if(hide&&man.tab){tabs[a.id]=man.tab;delete man.tab;ctx.files.write(p,JSON.stringify(man,null,2)+'\n');tabDirty=true;did.push(a.id+' tab hidden');}
   else if(!hide&&!man.tab&&tabs[a.id]){man.tab=tabs[a.id];delete tabs[a.id];ctx.files.write(p,JSON.stringify(man,null,2)+'\n');tabDirty=true;did.push(a.id+' tab back');}
  }
  for(const id of Object.keys(tabs))if(!all.some(a=>a.id===id)){delete tabs[id];tabDirty=true;} // uninstalled: its folder is gone
  if(tabDirty)s.slateTabs=tabs;
 }catch(e){ctx.log?.('slate: add-on setup failed',{e:String(e?.message||e)});}
 return did;
}
