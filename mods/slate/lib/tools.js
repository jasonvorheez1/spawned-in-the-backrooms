// STUDIO › SAVI'S LIST: the outside tools and workflows psypher5 builds with (the repos and sites Savi works from).
// This list IS Savi's memory of them: what is removed here she forgets (memory/their-workflow-repos.md points here).
// STUDIO › TOOLS is spawnToolsView below: Spawn's official tools shelf, https://www.spawn.co/?genre=tools
// Default shelf below; the creator's own list lives in world.state.tome.tools (add / remove from the tab). Ops via planStudio.
export const TOOLS_DEFAULT=[
 {id:'blender-game-skills',name:'Blender Game Skills',by:'majidmanzarpour',kind:'3D pipeline',url:'https://github.com/majidmanzarpour/blender-game-skills',use:'Concept picture to game model in gated passes: blockout, silhouette check, detail, bake, export. Every hero model goes through it.',glyph:'⬢',color:'#b0864a'},
 {id:'cc-game-studios',name:'Claude Code Game Studios',by:'Donchitos',kind:'studio flow',url:'https://github.com/Donchitos/Claude-Code-Game-Studios',use:'How a game moves: brainstorm, design doc, art bible, build, review, QA, release. Our design.md and review passes follow it.',glyph:'◈',color:'#5dada9'},
 {id:'awesome-gamedev-skills',name:'Awesome Gamedev Agent Skills',by:'gamedev-skills',kind:'skill library',url:'https://github.com/gamedev-skills/awesome-gamedev-agent-skills',use:'73 game-dev skills sorted by task. Where Savi looks first for a system she is unsure of.',glyph:'✦',color:'#7b5bb0'},
 {id:'cc-game-development',name:'Claude Code Game Development',by:'HermeticOrmus',kind:'patterns',url:'https://github.com/HermeticOrmus/claude-code-game-development',use:'Game-dev patterns and workflow plugins to borrow from.',glyph:'⚙',color:'#3a5f8a'},
 {id:'threeflow',name:'ThreeFlow',by:'Grudge Studio',kind:'asset organiser',url:'https://threeflow.vercel.app/',use:'Prefab organiser and scene editor. The reference for keeping assets tidy.',glyph:'▦',color:'#4f7a5a'},
];
export function toolsOf(ctx){const t=ctx?.world?.state?.tome?.tools;return Array.isArray(t)?t:TOOLS_DEFAULT;}
const clip=(v,n)=>String(v??'').replace(/[<>"]/g,'').trim().slice(0,n);
export function toolsOp(ctx,p,d){
 const T=ctx.world.state.tome||{},list=toolsOf(ctx).slice();
 if(d.op==='toolAdd'){let url=clip(d.url,300);if(!/^https?:\/\//.test(url))return false;const name=clip(d.name,60)||url.replace(/^https?:\/\/(www\.)?/,'').split(/[/?#]/).slice(0,3).join(' / ');
  const id='t-'+Math.floor(ctx.now()).toString(36);list.push({id,name,by:clip(d.by,40),kind:clip(d.kind,30)||'tool',url,use:clip(d.use,300),glyph:'✧',color:'#a37d45'});}
 else if(d.op==='toolDel'){const i=list.findIndex(t=>t.id===d.id);if(i<0)return false;if(p.state.toolArm!==d.id){p.state.toolArm=d.id;return true;}list.splice(i,1);p.state.toolArm=null;}
 else if(d.op==='toolNote'){const t=list.find(t=>t.id===d.id);if(!t)return false;const i=list.indexOf(t);list[i]={...t,use:clip(d.use,300)};}
 else if(d.op==='toolReset'){ctx.world.state.tome={...T,tools:null};return true;}
 else return false;
 ctx.world.state.tome={...T,tools:list};return true;
}
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function toolsView(ctx,player,{gold,ink,dim,line,OPEN}){
 const list=toolsOf(ctx),arm=player?.state?.toolArm;
 const card=t=>`<div style="flex:1 1 300px;max-width:440px;min-width:0;background:#1a150f;border:1px solid ${line};border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start">
  <div style="width:46px;height:46px;flex:none;border-radius:11px;background:linear-gradient(150deg,${esc(t.color||'#a37d45')},#120e0a 130%);display:flex;align-items:center;justify-content:center;font-size:21px;color:#fbf3e2;box-shadow:inset 0 1px 0 #ffffff33">${esc(t.glyph||'✧')}</div>
  <div style="flex:1;min-width:0"><div style="font-family:Georgia,serif;font-size:14px;color:${gold};letter-spacing:.04em">${esc(t.name)}</div>
   <div style="font-size:9.5px;letter-spacing:.18em;color:${dim};margin:3px 0 6px">${esc((t.kind||'tool').toUpperCase())}${t.by?' · '+esc(t.by):''}</div>
   <div title="click to edit what it's for" contenteditable="true" onkeydown="event.stopPropagation();if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="if(this.innerText.trim()!==this.dataset.v)sendAction('planStudio',{op:'toolNote',id:'${esc(t.id)}',use:this.innerText.trim()})" data-v="${esc(t.use||'')}" style="font-size:12px;color:${ink};line-height:1.45;outline:none;min-height:16px">${esc(t.use||'')}</div>
   <div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap"><button onclick="${OPEN(t.url)}" style="background:#a37d45;color:#111b2c;border:0;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:11px;letter-spacing:.1em">↗ OPEN</button>
    ${arm===t.id?`<button onclick="sendAction('planStudio',{op:'toolDel',id:'${esc(t.id)}'})" style="background:#e5675a;color:#111;border:0;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:11px">forget it?</button>`:`<button title="forget it: Savi stops using it" onclick="sendAction('planStudio',{op:'toolDel',id:'${esc(t.id)}'})" style="background:transparent;color:${dim};border:1px solid ${line};border-radius:4px;padding:5px 9px;cursor:pointer;font-size:11px">✕</button>`}
    <span style="font-size:10px;color:${dim};align-self:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${esc(String(t.url).replace(/^https?:\/\/(www\.)?/,''))}</span></div></div></div>`;
 const IN=`onkeydown="event.stopPropagation()" style="background:#0b0907;border:1px solid ${line};color:${ink};border-radius:4px;padding:6px 8px;font-size:12px;min-width:0"`;
 const add=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:14px;padding:10px;border:1px dashed ${line};border-radius:8px">
  <span style="font-size:9.5px;letter-spacing:.2em;color:${dim}">SAVI, REMEMBER</span>
  <input id="tl-url" placeholder="link (https://…)" ${IN.replace('min-width:0','flex:2 1 200px')}><input id="tl-name" placeholder="name" ${IN.replace('min-width:0','flex:1 1 120px')}><input id="tl-use" placeholder="what it's for" ${IN.replace('min-width:0','flex:2 1 200px')}>
  <button onclick="var r=this.parentNode,g=i=>r.querySelector('#'+i).value;sendAction('planStudio',{op:'toolAdd',url:g('tl-url'),name:g('tl-name'),use:g('tl-use')})" style="background:#a37d45;color:#111b2c;border:0;border-radius:4px;padding:6px 14px;cursor:pointer;font-size:11px;letter-spacing:.1em">＋ ADD</button></div>`;
 return `<div style="font-size:11.5px;color:${dim};margin:0 2px 12px;line-height:1.5">What Savi remembers to work from. She reads these at every new game and hero asset; tap a line to change what it's for, ✕ and she forgets it.</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px">${list.map(card).join('')||`<div style="color:${dim};font-size:12px;padding:16px">no tools yet. add one below.</div>`}</div>${add}`;
}

// STUDIO › TOOLS: Spawn's official tools shelf (the "tools" genre on spawn.co). Games land there by genre; mods can't yet (request filed).
const SHELF='https://www.spawn.co/?genre=tools';
const SPAWN_TOOLS=[{name:'Idea Forge',by:'radiantquasar',url:'https://www.spawn.co/@radiantquasar/idea-forge',use:'Pitch a game idea. The forge builds its full design file, asks the right questions, and hands you the prompt.',glyph:'✶',color:'#c46a3a'}];
export function spawnToolsView(ctx,player,{gold,ink,dim,line,OPEN}){
 const card=t=>`<div style="flex:1 1 300px;max-width:440px;min-width:0;background:#1a150f;border:1px solid ${line};border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start"><div style="width:46px;height:46px;flex:none;border-radius:11px;background:linear-gradient(150deg,${t.color},#120e0a 130%);display:flex;align-items:center;justify-content:center;font-size:21px;color:#fbf3e2">${t.glyph}</div><div style="flex:1;min-width:0"><div style="font-family:Georgia,serif;font-size:14px;color:${gold}">${esc(t.name)}</div><div style="font-size:9.5px;letter-spacing:.18em;color:${dim};margin:3px 0 6px">ON THE TOOLS SHELF · ${esc(t.by)}</div><div style="font-size:12px;color:${ink};line-height:1.45">${esc(t.use)}</div><div style="margin-top:9px"><button onclick="${OPEN(t.url)}" style="background:#a37d45;color:#111b2c;border:0;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:11px;letter-spacing:.1em">↗ OPEN</button></div></div></div>`;
 return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px;margin-bottom:12px;border:1px solid ${gold}55;border-radius:10px;background:linear-gradient(120deg,#2a1f12,#15110c)"><div style="flex:1 1 260px;min-width:0"><div style="font-family:Georgia,serif;font-size:17px;color:${gold}">Spawn's Tools shelf</div><div style="font-size:12px;color:${ink};line-height:1.5;margin-top:4px">The official home for toolkits made on Spawn. Slate is aiming here: mods can't sit on the shelf yet, the request is with the team.</div></div><button onclick="${OPEN(SHELF)}" style="background:${gold};color:#15120e;border:0;border-radius:5px;padding:8px 16px;cursor:pointer;font-size:11px;letter-spacing:.14em;font-weight:700">↗ BROWSE THE SHELF</button></div><div style="display:flex;flex-wrap:wrap;gap:10px">${SPAWN_TOOLS.map(card).join('')}</div><div style="font-size:10.5px;color:${dim};margin:10px 2px 0">the rest of the shelf opens on spawn.co</div>`;
}
