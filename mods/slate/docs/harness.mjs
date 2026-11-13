// Dev harness (not loaded by the game): node mods/slate/docs/harness.mjs [tab] [appId]
// Renders Slate's panel for a fake editor and prints whether it drew. Use it after every edit.
import {handle} from '../lib/plan.js';
import render from '../lib/ui-panel.js';
const [,,tab='home',app]=process.argv;
const W={state:{plan:{cards:[],ms:[],tab:'home'},slateApps:{}},files:[],places:{main:{atmosphere:{}}},mode:'dev'};
const p={id:'p1',userId:'pa_test',displayName:'psypher5',isEditor:true,state:{slate:'open',slateGodTucked:false},feetPosition:{x:0,y:0,z:0},wisps:[{id:'w1',name:'Ember',color:'#5dada9',shape:'classic',burnStyle:'calm',stage:'adult'}]};
let t=Date.parse('2026-10-07T18:00:00Z');
export const ctx={world:W,now:()=>t+=50,random:Math.random,session:{},log:(...a)=>console.log('[log]',...a),notifyDm:m=>console.log('[dm]',String(m).slice(0,120)),place:{id:'main',players:[p],state:{}},files:{read:()=>null,write:()=>{}},sql:async()=>({rows:[],changes:0}),job:()=>0};
export const press=(k,d)=>handle(ctx,p,{[k]:true},{[k]:d});
if(app)press('planApp',{id:app,op:'install'});
press('planTab',{tab:app?'app-'+app:tab});
const h=render(ctx,p);
console.log('tab',W.state.plan.tab,'html',h.length,'chars', /could not draw/.test(h)?'DRAW ERROR':'ok');
if(process.env.DUMP)console.log(h);
