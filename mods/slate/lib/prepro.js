// Kiln · Pre-production. Draft player.state.prepro; Run → world.state.prepro[id]. Phases = the workflow md.
import {COLS} from './board-cfg.js';
import {KILN_WORKFLOWS} from './kiln-default.js';
import {esc} from './tokens.js';
export const PRE_ID='preproduction';
export const PRE_PHASES=[...KILN_WORKFLOWS.find(w=>w.id==PRE_ID).md.matchAll(/^## \d+\. (.+)$/gm)].map(m=>m[1]);
const DEPTH={quick:'one pass per phase',standard:'+ reviewer per phase',deep:'two research cycles + reviewer'};
export const PRE_DEPTH=Object.keys(DEPTH);
export const PRE_SUGG={feel:['tense','precise','cozy','fast'],pillars:['realistic','smart AI','high production','juicy'],fid:['PC ultra','phone ok','stylised']};
export const PRE_MAX={feel:6,pillars:3,fid:4,refs:8};
const LINES={pitch:160,subject:80,spec:160,cons:240};
const FIELDS=[['pitch','Pitch','one line: what it is'],['feel','Player & feel'],['pillars','Pillars'],['subject','Subject','the real thing'],['rules','Real rules'],['fid','Fidelity'],['refs','References'],['cons','Constraints','platform, budget, musts'],['depth','Depth']];
const s=(v,n)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n),dot=t=>t.replace(/[.\s]+$/,'')+'.',cut=(k,v)=>s(v,k=='refs'?400:40);
export const okRef=u=>/^(\/cdn\/|https:\/\/)\S+$/.test(String(u||''));
export function preClean(f){f=Object(f);const o={};for(const k in LINES)o[k]=s(f[k],LINES[k]);
 for(const k in PRE_MAX){const a=[];for(const x of Array.isArray(f[k])?f[k]:[]){const v=cut(k,x);if(v&&!a.includes(v)&&(k!='refs'||okRef(v)))a.push(v);}o[k]=a.slice(0,PRE_MAX[k]);}
 o.rules=!!f.rules;o.depth=DEPTH[f.depth]?f.depth:'standard';return o;}
export const preMissing=f=>{const x=preClean(f);return FIELDS.filter(([k])=>!/rules|refs|depth/.test(k)&&!x[k].length).map(a=>a[1]);};
export function composePrompt(f){const x=preClean(f),m=preMissing(x);
 const L=FIELDS.map(([k,l])=>{const v=x[k],t=Array.isArray(v)?v.join(', '):v;
  return k=='pitch'?l+': '+(t?dot(t):'(missing).'):k=='rules'?(v?`${l}: yes${x.spec?' ('+x.spec.replace(/[.\s]+$/,'')+')':''}. Research and cite the rulebook/regulations and every real-world number FIRST, before any design.`:`${l}: no.`+(x.spec?' Known specs: '+dot(x.spec):'')):k=='refs'?t&&`${l} (${v.length}): ${v.join(' ')}`:k=='depth'?`${l}: ${v} (${DEPTH[v]}).`:t&&l+': '+dot(t);});
 if(m.length)L.push('Missing: '+m.join(', ')+'. Ask me only these at Intake.');
 L.push('Run it through the Pre-production workflow: '+PRE_PHASES.join(' → ')+'. Stop at the Intake and Path gates.');
 return L.filter(Boolean).join('\n');}
// planLoom ops preField|preChip|preClear|preLoom|preRun; w = the workflow with parsed steps
export function preOp(ctx,p,d,plan,id,L,save,w){const op=d.op,k=d.k,dr={...p.state.prepro},f=preClean(dr.fields),say=t=>{dr.fields=f;dr.msg=t;p.state.prepro=dr;return false;};
 if(op=='preField'){if(k in LINES)f[k]=s(d.v,LINES[k]);else if(k=='rules')f.rules=!!d.v;else if(k=='depth'&&DEPTH[d.v])f.depth=d.v;else return false;return say();}
 if(op=='preChip'){if(!(k in PRE_MAX))return false;const v=cut(k,d.v),a=f[k].filter(x=>x!==v);
  if(d.on!==false&&v&&!f[k].includes(v)){if(k=='refs'&&!okRef(v))return say('a reference is a /cdn/ or https:// link');if(a.length>=PRE_MAX[k])return say(`${k}: ${PRE_MAX[k]} at most, drop one first`);a.push(v);}
  f[k]=a;return say();}
 if(op=='preClear'){p.state.prepro={};return false;}
 if(!/^pre(Run|Loom)$/.test(op))return false;
 if(!f.pitch)return say('write the pitch first');
 const text=composePrompt(f),by=s(p.displayName,40),pid=f.pitch.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'project',title='Pre-production: '+s(f.pitch,60),at=ctx.now();
 if(!L.chapters.some(c=>c.id=='prepro'))L.chapters.push({id:'prepro',name:'Pre-production'});
 const pg={id:'pre-'+pid,ch:'prepro',sec:'',t:title,body:text,img:/^\/cdn\//.test(f.refs[0])?f.refs[0]:'',hero:false,feat:'',tags:['pre-production'],by,at},i=L.pages.findIndex(x=>x.id==pg.id);
 L.pages[i<0?L.pages.length:i]={tix:[],...L.pages[i],...pg};save();
 if(op=='preLoom')return say('saved to Loom');
 ctx.world.state.prepro={...ctx.world.state.prepro,[pid]:{fields:f,phase:0,sources:[],competitors:[],directions:[],prototypes:[],pick:null,at,by,epic:title,page:pg.id}};
 const ms=plan.ms=plan.ms||[],cs=plan.cards=plan.cards||[];
 if(!ms.some(m=>m.name==title)){ms.push({id:id(),name:title,goal:'Pre-production for '+f.pitch});
  (w?.steps||[]).forEach((st,n)=>cs.push({id:id(),t:n+' · '+st.title,col:COLS.includes('todo')?'todo':COLS[0],tag:'feature',ms:title,by,at,note:((n==1&&f.rules?'• Rulebook first: '+(f.spec||f.subject)+'\n':'')+st.items.filter(x=>f.rules||!/^Real rules on/.test(x.t)).map(x=>(x.gate?'⛔ ':'• ')+x.t).join('\n')).slice(0,1500),accept:(st.items.find(x=>/^Reviewer/.test(x.t))?.t||'').slice(0,300)}));}
 try{ctx.notifyDm(`KILN · ${by}: run it through the Pre-production workflow${w?.gates===false?' (gates off)':''}. world.state.prepro["${pid}"]; "${title}".\n\n${text}`,{wake:true});}catch(e){}
 say('sent to savi');return true;}
const CSS=`<style>.pp .ppm{position:relative;margin-left:auto}.pp .ppm>summary{list-style:none;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:var(--L);border-radius:10px;background:var(--p);color:var(--s);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.pp .ppm>summary::-webkit-details-marker{display:none}.pp .ppm[open]>summary,.pp .ppm>summary:hover{border-color:var(--a)}.pp div.ppl{position:absolute;right:0;top:calc(100% + 6px);z-index:50;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:2px;min-width:200px;padding:6px;background:linear-gradient(160deg,#1a2433,#0d1522);border:1px solid var(--a);border-radius:12px;box-shadow:0 14px 34px #000a}.pp .ppl button{justify-content:flex-start;min-height:36px;padding:0 12px;border-radius:8px;color:#d9e0d9;font-size:12.5px;text-align:left}.pp .ppl button:hover{background:#ffffff10;color:var(--s)}.pp .ppl button.on{background:var(--a);color:#111b2c;font-weight:700}.pp *{box-sizing:border-box}.pp{--l:#2c3b4c;--a:#b9975e;--s:#e6c98e;--d:#8a9aa0;--p:#13202f;--L:1px solid #2c3b4c;color:#d9e0d9;font:13px system-ui}.pp div{display:flex;align-items:center;flex-wrap:wrap;gap:0 4px}.pp button,.pp label{min-height:44px;min-width:44px;background:none;border:0;padding:0;color:inherit;font:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;position:relative}.pp small{font-size:10px;letter-spacing:.14em;color:var(--d);flex:1}.pp b{font-size:20px}.pp select{position:absolute;inset:0;opacity:0}.pp .s{flex-wrap:nowrap;gap:0;position:relative;margin:0 -8px;overflow-x:auto}.s:before{content:'';position:absolute;left:22px;right:22px;top:12px;border-top:1.5px solid var(--l)}.s button{flex:1 0 auto;white-space:nowrap;flex-direction:column;gap:2px;font-size:9px;color:var(--d);align-self:start}.pp i{font-style:normal;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--l);background:#0f1a27;display:flex;align-items:center;justify-content:center;font-size:11px}.pp .on{color:var(--s)}.pp .on i,.pp .v>button>i{border-color:var(--a)}.pp .ok i,.pp .w.on i,.pp .z .on{background:var(--a);color:#111b2c}.pp .c{display:block;background:var(--p);border:var(--L);border-radius:12px;padding:6px 10px;margin-top:6px}.pp .r{border-top:1px solid #2c3b4c66;flex-wrap:nowrap}.pp .r>span{flex:none;width:82px;font-size:12px;white-space:nowrap}.pp .m:after{content:' •';color:var(--s)}.pp .v{flex:1;min-width:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.v>button{flex:none}.pp .k{height:24px;padding:0 7px;border-radius:99px;border:1px solid #b9975e99;font-size:11.5px;display:flex;align-items:center}.v .k:after{content:'×';margin-left:4px;color:var(--d)}.pp input{flex:1 1 80px;min-width:0;height:44px;background:none;border:0;color:inherit;font:inherit;outline:none}.pp .g{display:none;width:100%;padding-left:86px}.pp .r:focus-within{flex-wrap:wrap}.pp .r:focus-within .g{display:flex}.pp .f{width:40px;height:40px;border-radius:8px;overflow:hidden;border:1px solid var(--a);display:flex;align-items:center;justify-content:center}.pp .f img{width:100%;height:100%;object-fit:cover}.pp .w i{width:40px;border-radius:12px;justify-content:flex-start;padding:2px;background:#0f1a27}.w i:after{content:'';width:16px;height:16px;border-radius:50%;background:#fff}.pp .w.on i{justify-content:flex-end}.pp .z{flex:1;flex-wrap:nowrap;border:var(--L);border-radius:8px;overflow:hidden;margin:4px 0}.pp .z button{flex:1}.pp pre{margin:4px 0 0;height:132px;overflow:auto;padding:8px 10px;background:#0b1520;border:var(--L);border-radius:8px;white-space:pre-wrap;word-break:break-word;font:10.5px/1.5 monospace}.pp em{display:block;text-align:right;font-size:10.5px;color:var(--d)}.pp .b{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:8px;margin-top:6px}.pp .b button{border-radius:10px;font-weight:600;background:var(--p);border:var(--L)}.pp .b :nth-child(3){background:var(--a);color:#111b2c}.pp .t{grid-column:1/-1;text-align:center;font-size:11.5px;color:var(--s);animation:pt 4s forwards}@keyframes pt{80%{opacity:1}to{opacity:0}}</style>`;
const A=a=>esc(`sendAction('planLoom',${JSON.stringify(a)})`),KD='onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()"',img=u=>/\.(png|jpe?g|webp|gif|avif)$/i.test(u);
const CP="var t=document.getElementById('pp-prev'),b=this,ok=()=>b.lastChild.textContent='Copied',f=()=>{getSelection().selectAllChildren(t);document.execCommand('copy')&amp;&amp;ok()};try{navigator.clipboard.writeText(t.textContent).then(ok,f)}catch(e){f()}";
// st player.state, shots Gallery, g icon(), wf workflows, steps [[title,done]], si open step, cur this workflow
export function preBuilder(st,shots,g,wf,steps,si,cur,chips){const F=preClean(st.prepro?.fields),txt=composePrompt(F),miss=preMissing(F),msg=st.prepro?.msg;
 const b=(a,h,c='')=>`<button ${c} onclick="${a}">${h}</button>`,chip=(k,v,on)=>A({op:'preChip',k,v,on}),put=k=>`sendAction('planLoom',{op:'preField',k:'${k}',v:e.value})`;
 const inp=(k,ph,h)=>`<input ${h?'hidden':''} aria-label="${k}" value="${h?'':esc(F[k])}" placeholder="${esc(ph)}" ${KD} `+(h?`onblur="this.value||(this.hidden=1)" onchange="this.value.trim()&&${esc(`sendAction('planLoom',{op:'preChip',k:'${k}',v:this.value})`)};this.value=''">`:`oninput="var e=this;clearTimeout(e._t);e._t=setTimeout(function(){${put(k)}},500)" onchange="var e=this;clearTimeout(e._t);${put(k)}">`);
 const rows=FIELDS.map(([k,l,ph])=>{let v,G=[],r=k=='refs';
  if(ph)v=inp(k,ph);else if(k=='rules')v=b(A({op:'preField',k,v:!F.rules}),'<i></i>',`class="w${F.rules?' on':''}" role="switch" aria-checked="${F.rules}" aria-label="real rules"`)+inp('spec',F.rules?'rulebook, e.g. ITTF Handbook':'real specs (optional)');
  else if(k=='depth')v=`<div class="z">${PRE_DEPTH.map(x=>b(A({op:'preField',k,v:x}),x,`aria-pressed="${F.depth==x}"${F.depth==x?' class="on"':''}`)).join('')}</div>`;
  else{const t=x=>r?`<span class="f"><img src="${esc(x)}" alt=""></span>`:`<span class="k">${esc(x)}</span>`;
   v=F[k].map(x=>b(chip(k,x,false),r&&!img(x)?'link':t(x),`aria-label="remove ${esc(x)}"`)).join('');
   if(F[k].length<PRE_MAX[k]){v+=b('var i=this.nextElementSibling;i.hidden=false;i.focus()',r?'<span class="f">+</span>':'<i>+</i>',`aria-label="add ${k}"`)+inp(k,r?'/cdn/ or https:// link':'type, then Enter',1);
    G=(r?(shots||[]).map(x=>x?.url).filter(u=>okRef(u)&&img(u)).slice(0,4):PRE_SUGG[k]).filter(x=>!F[k].includes(x)).map(x=>b(chip(k,x),t(x),'onmousedown="event.preventDefault()"'));}}
  return `<div class="r"><span${miss.includes(l)?' class="m"':''}>${l}</span><div class="v">${v}</div>${G.length?`<div class="g">${G.join('')}</div>`:''}</div>`;}).join('');
 return `${CSS}<div class="pp"><div><b>Kiln</b><small>· PRE-PRODUCTION</small></div>
${chips?`<div class="ppc" style="display:flex;gap:7px;flex-wrap:wrap;margin:6px 0 14px">${chips}</div>`:''}
<div class="c"><small>PROMPT BUILDER</small>${rows}</div><div class="c"><small>PROMPT PREVIEW</small><pre id="pp-prev">${esc(txt)}</pre><em>${txt.length} characters</em></div>
<div class="b">${b(CP,g('copy')+'<span>Copy</span>')}${b(A({op:'preLoom'}),g('book')+'Save to Loom')}${b(A({op:'preRun'}),g('play')+'Run')}${msg?`<div class="t" role="status">${esc(msg)}</div>`:''}</div></div>`;}

export {CSS as PP_CSS};
