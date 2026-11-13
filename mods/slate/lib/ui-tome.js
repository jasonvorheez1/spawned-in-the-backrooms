// STUDIO (the app id stays 'tome'): the creator's shelves as box art. Read from world.state.tome:
// { shelves: { published|unlisted: [{ name, slug, meta, blurb?, url, edit?, here?, cover? }], mods: [{ name, slug, meta }] },
//   sets: [{ id, name, blurb?, color?, games: [slug] }] }  // box sets: games grouped as one slipcase
// written by Savi from `spawn shelf --mods` into studio/tome.json. Per player: state.tomeSet = the box set pulled off the shelf.
import {EMBLEMS,COLORS,FONTS} from './studio.js';
import {toolsView,toolsOf,spawnToolsView} from './tools.js';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const gold='#c9a56a',ink='#ecdec3',dim='#8d8676',line='#3a3226';
const hue=t=>{let h=0;for(const c of String(t))h=(h*31+c.charCodeAt(0))%360;return h;};
const OPEN=u=>`var u='${esc(u)}',w=null;try{w=window.open(u,'_blank','noopener')}catch(e){}if(!w){try{navigator.clipboard.writeText(u)}catch(e){}this.title='link copied: '+u}`;
const btn=`background:#221c14;border:1px solid ${line};color:${ink};padding:3px 6px;font-size:9.5px;letter-spacing:.1em;cursor:pointer;flex:1;border-radius:3px`;
const plank=`<div style="position:relative;height:16px;margin:0 -14px;background:linear-gradient(#8a6136,#5a3c1e 35%,#2a1a0c);border-top:1px solid #c9945a88;box-shadow:0 10px 18px -6px #000,inset 0 -3px 4px #0008"></div>`;
const bookend=`<div style="flex:0 0 10px;align-self:flex-end;height:46px;margin-bottom:-2px;border:3px solid #b8935a;border-bottom:0;border-right:0;border-radius:10px 0 0 0;opacity:.85"></div>`;
const coverBg=(g,T)=>g.cover?`#000 url('${esc(g.cover)}') center/cover`:g.here&&T.art?`#000 url('${esc(T.art)}') center/cover`:`linear-gradient(160deg,oklch(0.42 0.08 ${hue(g.name)}),oklch(0.16 0.04 ${hue(g.name)+40}))`;
// a box: painted front, a lit spine on its left edge, its title set in serif over the art
function box(g,kind,T,w=118,drag='',pick=''){
 const B=!!g.boxart,h=Math.round(w*(B?1.5:1.42)),sp=B?0:Math.round(w*.09); // real box art carries its own spine and title
 const acts=g.here?`<button style="${btn}" onclick="sendAction('planOpen',{id:null});sendAction('planTab',{tab:'diary'})">✎ LOOM</button><button style="${btn}" onclick="sendAction('planOpen',{id:null});sendAction('planTab',{tab:'board'})">▦ PLAN</button>`
  :kind==='mods'?'':`${g.url?`<button style="${btn}" onclick="${OPEN(g.url)}">${kind==='published'?'▶ PLAY':'↗ OPEN'}</button>`:''}${g.edit?`<button style="${btn}" onclick="${OPEN(g.edit)}">✎ BUILD</button>`:''}`;
 const fs=Math.max(11,Math.round(w*(String(g.name).length>16?.11:.15)));
 return `<div class="st-box" ${drag} title="${esc(g.meta||g.name)}" style="position:relative;flex:0 0 ${w+sp}px;width:${w+sp}px;min-width:0;display:flex;flex-direction:column;gap:5px">
  <div class="st-lift" ${kind==="mods"?"":`onclick="sendAction('planStudio',{op:'game',slug:'${esc(g.slug)}'});sendAction('planTab',{tab:'game'})" title="open in the GAME app"`} style="display:flex;height:${h}px;filter:drop-shadow(0 8px 8px #000c);cursor:${kind==="mods"?"default":"pointer"}">
   ${B?'':`<div style="flex:0 0 ${sp}px;background:linear-gradient(90deg,#000,#0008),${coverBg(g,T)};background-blend-mode:multiply;border-radius:2px 0 0 2px;transform:skewY(-6deg);transform-origin:right bottom;margin-top:${Math.round(sp*.6)}px;height:${h-Math.round(sp*.6)}px"></div>`}
   <div style="position:relative;flex:1;border-radius:0 4px 4px 0;background:${coverBg(g,T)};border:1px solid ${g.here?gold:'#ffffff22'};box-shadow:inset 3px 0 6px #ffffff22,inset 0 0 30px #0007;overflow:hidden">
    ${B?'':`<div style="position:absolute;inset:0 0 auto 0;padding:9px 6px 26px;text-align:center;background:linear-gradient(#000c,#0000);font-family:Georgia,'Cormorant Garamond',serif;font-size:${fs}px;line-height:1.08;color:#fbf3e2;text-shadow:0 2px 4px #000">${kind==='mods'?'⧉ ':''}${esc(g.name)}</div>`}
    ${!B&&g.tag?`<div style="position:absolute;inset:auto 0 0 0;padding:16px 4px 7px;text-align:center;background:linear-gradient(#0000,#000d);font-size:${Math.max(7,Math.round(w*.06))}px;letter-spacing:.14em;color:#e8dcc4">${esc(g.tag)}</div>`:''}
    ${g.here?`<div style="position:absolute;top:50%;right:4px;background:${gold};color:#15120e;font-size:8px;letter-spacing:.12em;padding:1px 4px;border-radius:2px">HERE</div>`:''}</div></div>
  <div style="font-size:9px;color:${dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:${sp}px">${esc(g.meta||g.slug)}</div>
  ${acts?`<div style="display:flex;gap:3px;padding-left:${sp}px">${acts}</div>`:''}${pick}</div>`;}
// a box set's face: painted art, or composed from a game's box (dimmed), an emblem, the title in the chosen ink and type
function face(s,games,W,H){
 const D=s.design||{},all=games;
 if(D.mode!=='compose'&&s.cover)return `<div style="position:relative;width:${W}px;height:${H}px;background:#000 url('${esc(s.cover)}') center/cover;overflow:hidden"><div style="position:absolute;inset:0;background:linear-gradient(#000a,#0000 40%,#0000 65%,#000c)"></div>${title(s,games,W,H,'serif','#f0d9a6','')}</div>`;
 const g=all.find(x=>x.slug===D.bg),bg=g?.cover||(D.bg&&/^\/cdn\//.test(D.bg)?D.bg:null),crop=g?.boxart?'62% 72%/190% auto':'center/cover';
 const col=D.color||'#f0d9a6';
 return `<div style="position:relative;width:${W}px;height:${H}px;background:${bg?`#000 url('${esc(bg)}') ${crop} no-repeat`:'linear-gradient(135deg,#3a2c1c,#120f0b)'};overflow:hidden">
  <div style="position:absolute;inset:0;background:${bg?'radial-gradient(ellipse at 50% 55%,#0006,#000d 80%)':'none'}"></div>
  <div style="position:absolute;inset:${Math.round(H*.05)}px ${Math.round(W*.06)}px;border:1px solid ${col}88;border-radius:3px"></div>
  ${title(s,games,W,H,D.font||'serif',col,D.emblem??'✦')}</div>`;}
function title(s,games,W,H,font,col,emb){
 const fs=Math.round(W*(String(s.name).length>12?.11:.14));
 return `<div style="position:absolute;inset:${Math.round(H*.09)}px 8px auto;text-align:center;font-family:${FONTS[font]||FONTS.serif};font-size:${fs}px;letter-spacing:.1em;line-height:1.08;color:${col};text-shadow:0 2px 6px #000">${esc(font==='script'?s.name:String(s.name).toUpperCase())}</div>
  ${emb?`<div style="position:absolute;top:50%;left:0;right:0;transform:translateY(-40%);text-align:center;font-size:${Math.round(W*.34)}px;color:${col};text-shadow:0 0 18px ${col}99,0 2px 4px #000">${esc(emb)}</div>`:''}
  <div style="position:absolute;inset:auto 6px ${Math.round(H*.06)}px;text-align:center;font-size:${Math.max(8,Math.round(W*.058))}px;letter-spacing:.16em;color:#e8dcc4;text-shadow:0 1px 3px #000">${esc(s.tag||games.length+' GAMES')}</div>`;}
// the slipcase: its face, its games' spines standing in the open side
function slipcase(s,games,W=140,H=200,act=true){
 const sw=Math.round(W*.16);
 const spines=games.slice(0,5).map((g,i)=>`<div style="flex:0 0 ${sw}px;background:linear-gradient(90deg,#000a,#0003,#000a),${coverBg(g,{})};border:1px solid #c9a56a66;border-radius:1px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:8px 0 6px;box-sizing:border-box"><span style="writing-mode:vertical-rl;font-family:Georgia,serif;font-size:${Math.round(sw*.45)}px;color:#f3e6c8;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;max-height:${H-40}px">${esc(g.name)}</span><span style="font-family:Georgia,serif;font-size:9px;color:${gold}">${['I','II','III','IV','V'][i]}</span></div>`).join('');
 const dz=act?`onclick="sendAction('planStudio',{op:'set',id:'${esc(s.id)}'})" ondragover="event.preventDefault();this.style.outline='2px solid ${gold}'" ondragleave="this.style.outline=''" ondrop="event.preventDefault();this.style.outline='';var g=event.dataTransfer.getData('text/plain');if(g)sendAction('planStudio',{op:'setAdd',id:'${esc(s.id)}',slug:g})"`:'';
 return `<div class="st-set" ${dz} title="${act?'open '+esc(s.name)+' · drop a game here to add it':''}" style="flex:0 0 auto;cursor:${act?'pointer':'default'};outline-offset:4px;border-radius:4px">
  <div class="st-lift" style="display:flex;height:${H}px;filter:drop-shadow(0 10px 10px #000d)">
   <div style="border-radius:4px 0 0 4px;border:1px solid ${gold}99;overflow:hidden">${face(s,games,W,H-2)}</div>
   <div style="display:flex;gap:1px;padding:6px 4px;background:linear-gradient(90deg,#1a130b,#2a1e12);border:1px solid ${gold}99;border-left:0;border-radius:0 4px 4px 0">${spines||`<div style="width:${sw}px"></div>`}</div></div></div>`;}
const slot=(label,h,act='')=>`<div ${act} style="flex:0 0 112px;height:${h}px;align-self:flex-start;border:1px dashed ${gold}77;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:${gold};opacity:.8"><span style="font-size:28px;font-weight:200">+</span><span style="font-size:9px;letter-spacing:.2em;text-align:center">${label}</span></div>`;
function shelf(title,count,inner,extra=''){
 return `<div style="margin-bottom:22px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><span style="font-family:Georgia,serif;font-size:13px;letter-spacing:.28em;color:#e8dcc4">${title}</span><span style="font-size:10px;color:${dim}">${count}</span><span style="flex:1;height:1px;background:linear-gradient(90deg,${gold}88,#0000)"></span>${extra}</div>
  <div class="st-row" style="display:flex;align-items:flex-end;gap:14px;overflow-x:auto;padding:0 6px 10px">${bookend}${inner||`<div style="font-size:11px;color:${dim}">empty</div>`}<div style="flex:0 0 10px;align-self:flex-end;height:46px;margin-bottom:-2px;border:3px solid #b8935a;border-bottom:0;border-left:0;border-radius:0 10px 0 0;opacity:.85"></div></div>${plank}</div>`;}
export function tomeView(ctx,player,plan){
 const T=ctx?.world?.state?.tome||{},S=T.shelves||{},sets=T.sets||[];
 const all=[...(S.published||[]).map(g=>({...g,_k:'published'})),...(S.unlisted||[]).map(g=>({...g,_k:'unlisted'}))];
 const by=slug=>all.find(g=>g.slug===slug);
 const open=sets.find(s=>s.id===player?.state?.tomeSet);
 const head=`<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px"><span style="font-size:10px;letter-spacing:.14em;color:${dim}">${esc(player?.displayName||'your')} · ${T.shotAt?'AS OF '+esc(String(T.shotAt).replace('T',' ').slice(0,16)):'NOT LOADED YET'}</span>
   <button onclick="sendAction('planTab',{tab:'tome',refresh:true});this.textContent='savi pinged ✓'" style="margin-left:auto;background:#221c14;border:1px solid ${line};color:${ink};padding:3px 9px;font-size:10px;cursor:pointer">${T.askedAt&&(!T.shotAt||T.askedAt>T.shotAt)?'⟳ savi is refreshing…':'⟳ refresh'}</button></div>`;
 let body;
 if(!T.shelves) body=`<div style="margin:40px auto;max-width:360px;text-align:center;color:${dim};font-size:12px;line-height:1.6"><div style="font-family:Georgia,serif;font-size:16px;color:${ink};margin-bottom:8px">Your shelves aren't loaded yet</div>Tap <span style="color:${gold}">⟳ refresh</span> and your Savi fills them in: every game you've published, your drafts and your mods.</div>`;
 else if(open){
  const games=(open.games||[]).map(by).filter(Boolean),D=open.design||{},A=(o)=>esc(`sendAction('planStudio',${JSON.stringify({...o,id:open.id})})`);
  const lab=t=>`<div style="font-size:9px;letter-spacing:.22em;color:${dim};margin:12px 0 6px">${t}</div>`;
  const inp=`background:#15110c;border:1px solid ${line};color:${ink};padding:6px 8px;font-size:12px;border-radius:3px;box-sizing:border-box;width:100%`;
  const chip=(on)=>`background:${on?'#3a2c18':'#1a150f'};border:1px solid ${on?gold:line};color:${on?gold:ink};border-radius:3px;cursor:pointer`;
  const compose=D.mode==='compose'||!open.cover;
  const bgs=[...games.map(g=>({k:g.slug,u:g.cover,t:g.name})),...(open.cover&&!(open.options||[]).includes(open.cover)?[{k:open.cover,u:open.cover,t:'the set painting'}]:[]),...(open.options||[]).map((u,i)=>({k:u,u,t:'painted '+(i+1)}))].filter(x=>x.u);
  const tab=player?.state?.tomeTab||'cover',T3=t=>`<button onclick="sendAction('planStudio',{op:'edit',on:true,tab:'${t}'})" style="flex:1;background:${tab===t?'#3a2c18':'transparent'};border:none;border-right:1px solid ${line};color:${tab===t?gold:dim};padding:7px 0;font-size:10px;letter-spacing:.22em;cursor:pointer">${t.toUpperCase()}</button>`;
  const design=`<div style="display:flex;border:1px solid ${line};border-radius:4px;overflow:hidden;margin:16px 0 12px">${T3('cover')}${T3('type')}${T3('paint')}</div>`+(tab==='type'?`
   ${lab('EMBLEM')}<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">${['',...EMBLEMS].map(e=>`<button onclick="${A({op:'setDesign',emblem:e})}" style="${chip(compose&&(D.emblem??'✦')===e)};width:28px;height:28px;font-size:15px;padding:0">${e||'∅'}</button>`).join('')}</div>
   ${lab('LETTERING')}<div style="display:flex;gap:6px;margin-top:10px">${Object.keys(FONTS).map(f=>`<button onclick="${A({op:'setDesign',font:f})}" style="${chip(compose&&(D.font||'serif')===f)};font-family:${FONTS[f]};padding:3px 7px;font-size:12px">Aa</button>`).join('')}</div>`:tab==='paint'?`
   <div style="display:flex;gap:6px"><input id="st-pr" placeholder="optional: describe it, or just press generate" value="${esc(open.paintPrompt||'')}" style="${inp};flex:1"><button onclick="var v=document.getElementById('st-pr').value;sendAction('planStudio',{op:'setPaint',id:'${esc(open.id)}',prompt:v});this.textContent='asked ✓'" style="${chip(false)};padding:4px 10px;font-size:10px;white-space:nowrap">✦ GENERATE COVERS</button></div>
   ${open.paintAsked?`<div style="font-size:10px;color:${gold};margin-top:6px">savi is painting four covers…</div>`:''}`:`
   <div style="display:flex;gap:5px;flex-wrap:wrap">${bgs.map(b=>`<div onclick="${A({op:'setDesign',bg:b.k})}" title="${esc(b.t)}" style="${chip(compose&&D.bg===b.k)};border-width:2px;width:34px;height:50px;background:#000 url('${esc(b.u)}') center/cover"></div>`).join('')}<div onclick="${A({op:'setDesign',bg:null})}" title="plain" style="${chip(compose&&!D.bg)};border-width:2px;width:34px;height:50px;background:linear-gradient(135deg,#3a2c1c,#120f0b)"></div></div>
   <div style="display:flex;gap:10px;margin-top:12px;align-items:center"><input type="color" value="${esc(D.color||'#f0d9a6')}" onchange="sendAction('planStudio',{op:'setDesign',id:'${esc(open.id)}',color:this.value})" title="any colour" style="width:44px;height:26px;padding:0;border:1px solid ${line};background:none;cursor:pointer">
    <input type="range" min="0" max="360" value="0" title="hue" oninput="this.previousElementSibling.value=(function(h){var f=function(n){var k=(n+h/30)%12,a=.7*Math.min(.62,1-.62);var c=.62-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(c*255).toString(16).padStart(2,'0')};return '#'+f(0)+f(8)+f(4)})(+this.value)" onchange="sendAction('planStudio',{op:'setDesign',id:'${esc(open.id)}',color:this.previousElementSibling.value})" style="width:150px;height:12px;-webkit-appearance:none;appearance:none;border-radius:6px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);cursor:pointer">
</div>`);
  const picks=(open.options||[]).length?`${lab('GENERATED COVERS · tap to use')}<div style="display:flex;gap:8px">${open.options.map(u=>`<div onclick="${A({op:'setCover',url:u})}" title="use this painting" style="${chip(!compose&&open.cover===u)};border-width:2px;width:52px;height:75px;background:#000 url('${esc(u)}') center/cover"></div>`).join('')}</div>`:'';
  const fanDrag=g=>`draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${esc(g.slug)}')" ondragover="event.preventDefault()" ondrop="event.preventDefault();var s=event.dataTransfer.getData('text/plain');if(s&&s!=='${esc(g.slug)}')sendAction('planStudio',{op:'setMove',id:'${esc(open.id)}',slug:s,before:'${esc(g.slug)}'})"`;
  const row=games.map((g,i)=>`<div ${fanDrag(g)} style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:grab"><div style="font-family:Georgia,serif;color:${gold};font-size:12px">${['I','II','III','IV','V','VI','VII','VIII'][i]||i+1}</div>${box(g,g._k,T,104)}<button onclick="${A({op:'setDel',slug:g.slug})}" style="${btn};flex:0;color:#e8a196;width:100%">✕ REMOVE</button></div>`).join('');
  body=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">${player?.state?.tomeEdit?`<button onclick="sendAction('planStudio',{op:'edit',on:false})" style="background:#221c14;border:1px solid ${line};color:${ink};padding:4px 10px;font-size:10px;cursor:pointer">‹ DONE</button><span style="font-size:10px;letter-spacing:.2em;color:${dim}">BOX SET EDITOR</span>`:`<button onclick="sendAction('planStudio',{op:'set',id:null})" style="background:#221c14;border:1px solid ${line};color:${ink};padding:4px 10px;font-size:10px;cursor:pointer">‹ SHELF</button><span style="font-size:10px;letter-spacing:.2em;color:${dim}">BOX SET</span>`}<span style="flex:1"></span>
    <button onclick="if(this.dataset.s){sendAction('planStudio',{op:'setRemove',id:'${esc(open.id)}'})}else{this.dataset.s=1;this.textContent='tap again to delete set'}" style="background:#1a120e;border:1px solid #5a2a22;color:#e8a196;padding:4px 10px;font-size:10px;cursor:pointer">🗑 DELETE SET</button></div>
   ${player?.state?.tomeEdit?`<div style="display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap">
    <div><div style="padding:18px;border-radius:8px;background:radial-gradient(ellipse at 50% 100%,#3a2a18,#0e0c0a 70%)">${slipcase(open,games,200,288,false)}</div>${picks}</div>
    <div style="flex:1;min-width:260px;max-width:420px">
     ${lab('NAME')}<input value="${esc(open.name)}" maxlength="40" onchange="sendAction('planStudio',{op:'setMeta',id:'${esc(open.id)}',name:this.value})" style="${inp};font-family:Georgia,serif;font-size:16px">
     ${lab('TAGLINE')}<input value="${esc(open.tag||'')}" maxlength="60" placeholder="three worlds. one sky." onchange="sendAction('planStudio',{op:'setMeta',id:'${esc(open.id)}',tag:this.value})" style="${inp}">
     ${design}</div></div>`:`<div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
    <div style="padding:18px;border-radius:8px;background:radial-gradient(ellipse at 50% 100%,#3a2a18,#0e0c0a 70%)">${slipcase(open,games,200,288,false)}</div>
    <div style="flex:0 1 230px;min-width:180px"><div style="font-family:Georgia,serif;font-size:28px;color:${gold};letter-spacing:.06em">${esc(open.name)}</div>
     <div style="font-size:11px;letter-spacing:.24em;color:${dim};margin:6px 0 18px">${esc((open.tag||'').toUpperCase())}</div>
     <button onclick="sendAction('planStudio',{op:'edit',on:true})" style="${chip(true)};padding:7px 16px;font-size:11px;letter-spacing:.18em">✎ EDIT COVER</button></div>
    <div style="flex:3;min-width:300px;border-left:1px solid ${line};padding-left:20px"><div style="display:flex;align-items:center;gap:10px">${lab(`GAMES IN THE SET · ${games.length} · drag to reorder`)}<button onclick="sendAction('planStudio',{op:'pick',id:'${esc(open.id)}'})" style="${chip(true)};padding:4px 12px;font-size:10px;letter-spacing:.14em">＋ ADD GAMES</button></div>
     <div class="st-row" style="display:flex;gap:14px;align-items:flex-end;overflow-x:auto;padding:6px 6px 12px">${row||`<div style="color:${dim};font-size:11px;padding:20px">empty. press ＋ ADD GAMES, then tap games on the shelf.</div>`}</div></div></div>`}${plank}`;}
 else{
  const newAct=`onclick="sendAction('planStudio',{op:'setNew'})" ondragover="event.preventDefault();this.style.background='#c9a56a22'" ondragleave="this.style.background=''" ondrop="event.preventDefault();this.style.background='';sendAction('planStudio',{op:'setNew',slug:event.dataTransfer.getData('text/plain')})" title="start a new box set" class="st-new"`;
  const P=sets.find(x=>x.id===player?.state?.tomePick),inP=g=>P&&(P.games||[]).includes(g.slug);
  const pick=g=>P?`<div onclick="sendAction('planStudio',{op:'${inP(g)?'setDel':'setAdd'}',id:'${esc(P.id)}',slug:'${esc(g.slug)}'})" style="position:absolute;inset:-4px;cursor:copy;border-radius:6px;border:2px solid ${inP(g)?gold:'#c9a56a33'};background:${inP(g)?'#c9a56a22':'#0000'};display:flex;align-items:flex-start;justify-content:flex-end;padding:6px;box-sizing:border-box"><span style="background:${inP(g)?gold:'#15120ecc'};color:${inP(g)?'#15120e':gold};border:1px solid ${gold};border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:13px">${inP(g)?'✓':'+'}</span></div>`:'';
  const banner=P?`<div style="position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:10px 14px;background:#2a1f12;border:1px solid ${gold};border-radius:6px"><span style="font-size:10px;letter-spacing:.2em;color:${dim}">ADDING TO</span><span style="font-family:Georgia,serif;font-size:16px;color:${gold}">${esc(P.name)}</span><span style="font-size:11px;color:${ink}">tap games to add or take out · ${(P.games||[]).length} in</span><span style="flex:1"></span><button onclick="sendAction('planStudio',{op:'pick',id:null,back:'${esc(P.id)}'})" style="background:${gold};color:#15120e;border:0;padding:6px 14px;font-size:11px;letter-spacing:.12em;cursor:pointer;border-radius:3px">DONE</button></div>`:'';
  const drag=g=>`draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${esc(g.slug)}');event.dataTransfer.effectAllowed='copy'"`;
  const boxed=new Set(sets.flatMap(s=>s.games||[]));
  const named=(S.unlisted||[]).filter(g=>!/^new (game|adventure)$/i.test(g.name)),untitled=(S.unlisted||[]).length-named.length;
  const ST=player?.state?.studioTab||'published';
  body=ST==='drafts'?`${banner}${shelf('DRAFTS',(S.unlisted||[]).length,named.map(g=>box(g,'unlisted',T,118,drag(g),pick(g))).join('')+(untitled?slot(untitled+' UNTITLED<br>DRAFTS',168):''))}`
   :ST==='savi'?shelf("SAVI'S LIST",toolsOf(ctx).length,`<div style="width:100%;padding:4px 2px">${toolsView(ctx,player,{gold,ink,dim,line,OPEN})}</div>`):ST==='tools'?shelf('TOOLS','spawn',`<div style="width:100%;padding:4px 2px">${spawnToolsView(ctx,player,{gold,ink,dim,line,OPEN})}</div>`):ST==='mods'?`${shelf('MODS',(S.mods||[]).length,(S.mods||[]).map(g=>box(g,'mods',T,96)).join(''))}`
   :`${banner}${shelf('BOX SETS',sets.length+' · drag a game onto a set to add it',sets.map(s=>slipcase(s,(s.games||[]).map(by).filter(Boolean))).join('')+slot('NEW BOX SET<br><br>or drop a game',200,newAct))}
   ${shelf('PUBLISHED',(S.published||[]).length,(S.published||[]).map(g=>box(g,'published',T,118,drag(g),pick(g))).join(''))}${P?shelf('DRAFTS',(S.unlisted||[]).length,named.map(g=>box(g,'unlisted',T,118,drag(g),pick(g))).join('')):''}`;}
 return `<div class="tm" style="height:100%;overflow:auto;background:radial-gradient(ellipse at 50% 0%,#2a1f14,#120e0a 55%,#0b0907);padding:14px 16px;box-sizing:border-box">
  <style>.st-lift{transition:transform .18s}.st-set:hover .st-lift,.st-box:hover .st-lift{transform:translateY(-5px)}.st-row::-webkit-scrollbar{height:6px}.st-row::-webkit-scrollbar-thumb{background:${line};border-radius:3px}</style>
  ${head}${body}</div>`;
}
// the home tile's picture: shelves with a box set
export const TOME_ICON='/cdn/value.093b99927b3a434f487993dd8eb8e90c7f691b438a7e1867bcc6902511775543.png';

// the GAME app's record for a game tapped on the STUDIO shelf that is not this world, shaped like plan.game
export function shelfGame(ctx,player){
 const T=ctx?.world?.state?.tome||{},S=T.shelves||{},slug=player?.state?.tomeGame;if(!slug)return null;
 const pub=(S.published||[]).some(g=>g.slug===slug);
 const g=[...(S.published||[]),...(S.unlisted||[])].find(x=>x.slug===slug);
 if(!g||g.here)return null;
 const m=String(g.meta||''),n=re=>{const r=m.match(re);return r?r[1]:null};
 const sets=(T.sets||[]).filter(s=>(s.games||[]).includes(slug)).map(s=>s.name);
 return {other:true,slug,icon:g.icon||null,cover:g.boxart&&g.painted?g.painted:g.cover,headline:String(g.name||'').toUpperCase(),blurb:g.tag||'',
  features:sets.length?['in box set'+(sets.length>1?'s':'')+': '+sets.join(', ')]:[],onShelf:pub,live:n(/published v(\d+)/)||(pub?'?':'–'),
  publishedAt:n(/published (\d{4}-\d\d-\d\d)/)||'',likes:n(/(\d+) likes?/)??(pub?0:null),editing:null,at:T.shotAt||'',
  page:String(g.edit||g.url||'').replace(/\/play$/,''),edited:n(/edited (\d{4}-\d\d-\d\d)/)};}

// STUDIO's tabs: a bottom bar like every other app (ACTIVE = this game, the shelves, TOOLS = the app store),
// and under ACTIVE a pill pair at the top for the game's page and its players
const stOf=(player,tab)=>tab==='game'||tab==='crowd'?'active':(player?.state?.studioTab||'published');
export function studioStrip(player,tab){
 if(stOf(player,tab)!=='active')return '';
 return `<div style="display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid ${line};background:#120e0a">${['game','crowd'].map(t=>`<button onclick="sendAction('planTab',{tab:'${t}',studio:'active',here:true})" style="background:${tab===t?gold:'#1a150f'};color:${tab===t?'#15120e':ink};border:1px solid ${tab===t?gold:line};border-radius:999px;padding:4px 12px;font-size:10px;letter-spacing:.14em;cursor:pointer">${t==='game'?'▣ GAME PAGE':'👥 PLAYERS'}</button>`).join('')}</div>`;
}
export function studioBar(player,tab){
 const st=stOf(player,tab);
 const B=(k,glyph,label,to,extra='')=>`<button onclick="sendAction('planOpen',{id:null});sendAction('planTab',{tab:'${to}',studio:'${k}'${extra}})" style="flex:1;min-width:0;min-height:44px;padding:6px 0 5px;background:${st===k?'#2a1f12':'transparent'};border:none;border-top:2px solid ${st===k?gold:'transparent'};color:${st===k?ink:dim};cursor:pointer;font-size:10px;letter-spacing:.14em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><div style="font-size:15px;line-height:1.1">${glyph}</div>${label}</button>`;
 return `<div style="display:flex;border-top:1px solid ${line};background:#0e0b08;flex:none">${B('active','▣','ACTIVE','game',',here:true')}${B('published','☉','PUBLISHED','tome')}${B('drafts','✎','DRAFTS','tome')}${B('mods','◫','MODS','tome')}${B('tools','⚒','TOOLS','tome')}${B('savi','✧',"SAVI'S LIST",'tome')}</div>`;
}
