// Slate built-in app: portals to the wisp worlds. Contract: lib/apps/index.js.
// One card per world (cover from world.state.tome.shelves, else a gradient in the world's mood), GO = a real cross()
// on the editor's body, its answer kept in player.state['slateApp_wisp-worlds'].last; copy link per card; the guild banner on top.
export const APP={id:'wisp-worlds',name:'WISP WORLDS',glyph:'◎',color:'#7b5bb0',sub:'order of the wisp',about:'The Order of the Wisp and its worlds: Wisper Hollow, the Wispling Garden and the Book of Wispers, one tap from Slate.'};

const OWNER='psypher5';
// a new wisp world is one row here
const WORLDS=[
 {slug:'wisper-hollow',name:'Wisper Hollow',status:'published',hall:true,line:'A walled wisp village on the cliff rim: braziers, the wisp church and a wellspring pit full of wisps.',mood:'radial-gradient(120% 90% at 50% 100%,#f0b45a 0%,#7a3f6e 38%,#2a1d48 70%,#0f0b1e 100%)',glyph:'✶'},
 {slug:'wispling',name:'Wispling',sub:'the Wispling Garden',status:'draft',line:'A blossom garden by a still pond, a willow and the kindling stone where wisplings are born.',mood:'radial-gradient(110% 90% at 30% 20%,#ffd6e4 0%,#e59ab8 28%,#5f8f6a 62%,#1f3a2c 100%)',glyph:'❀'},
 {slug:'book-of-wispers',name:'Book of Wispers',status:'published',line:'A great book in a crystal cavern opens onto a valley of villages, falls and drifting dark wisps.',mood:'radial-gradient(110% 100% at 50% 30%,#9ff3ff 0%,#3aa6c9 22%,#3b3f8f 55%,#120f2a 100%)',glyph:'❦'},
];
const KEY='slateApp_wisp-worlds';
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c',gold='#c9a56a',brass='#a37d45',cyan='#53d9e5',ember='#ff9156',navy='#111b2c',accent='#7b5bb0';
const sub=`font-size:10px;letter-spacing:.16em;color:${dim};text-transform:uppercase`;
const btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:3px 7px;font-size:11px`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addr=w=>`@${OWNER}/${w.slug}${w.status==='draft'?'@dev':''}`;          // drafts have no posted game: the build room
const url=w=>`https://spawn.co/@${OWNER}/${w.slug}${w.status==='draft'?'':'/play'}`;
// Slate's shared link click (ui-panel.js): opens a tab, or swaps in the address selected and copied
const LINK=`onclick="event.preventDefault();var u=this.href,w=null;try{w=window.open(u,'_blank','noopener')}catch(e){}if(!w){try{navigator.clipboard.writeText(u)}catch(e){}var s=document.createElement('input');s.value=u;s.readOnly=true;s.onclick=function(ev){ev.stopPropagation();this.select()};s.style.cssText='width:220px;max-width:100%;font-size:11px;background:#111b2c;color:#ffd79a;border:1px solid #a37d45;padding:2px 6px';this.replaceWith(s);s.select();s.title='copied, paste it in your browser'}" onpointerdown="event.stopPropagation()"`;

function shelfGame(ctx,slug){
 const S=ctx?.world?.state?.tome?.shelves||{};
 for(const k of ['published','unlisted','drafts']){const g=(Array.isArray(S[k])?S[k]:[]).find(x=>x?.slug===slug);if(g)return g;}
 return null;
}
const coverOf=g=>{const c=g?.cover||g?.painted||g?.boxart;return typeof c==='string'&&/^(\/cdn\/|https:\/\/)/.test(c)?c:null;};

function lastOf(ctx,player){
 const L=player?.state?.[KEY]?.last;if(!L||!L.slug)return null;
 const now=Number(ctx?.now?.())||0;if(now&&L.at&&now-L.at>45000&&L.state!=='refused')return null;
 return L;
}

function goBtn(w,L,big){
 const busy=L?.slug===w.slug&&L.state==='opening';
 return `<button onclick="sendAction('planApp',{id:'wisp-worlds',op:'go',slug:'${w.slug}'});this.textContent='opening…'" title="portal into ${esc(w.name)}${w.status==='draft'?' (build room)':''}" style="background:${cyan};color:${navy};border:0;border-radius:4px;padding:${big?'7px 18px':'6px 16px'};font-size:${big?13:12}px;font-weight:700;letter-spacing:.14em;cursor:pointer;white-space:nowrap">${busy?'OPENING…':'GO ›'}</button>`;
}

function card(ctx,w,L){
 const g=shelfGame(ctx,w.slug),cov=coverOf(g);
 const meta=g?.meta?esc(g.meta):w.status;
 const pill=w.status==='published'?`<span style="${sub};color:${cyan};border:1px solid ${cyan}66;border-radius:8px;padding:1px 7px">● published</span>`:`<span style="${sub};color:${ember};border:1px solid ${ember}66;border-radius:8px;padding:1px 7px">✎ draft</span>`;
 const mine=L?.slug===w.slug?(L.state==='refused'?`<div style="margin-top:8px;font-size:11px;color:${ember};line-height:1.4">⚠ ${esc(L.msg||'the portal refused')}</div>`:`<div style="margin-top:8px;font-size:11px;color:${cyan}">◎ ${esc(L.msg||'opening…')}</div>`):'';
 return `<div style="flex:1 1 240px;max-width:340px;min-width:0;background:#16233a;border:1px solid ${line};border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
  <div style="position:relative;height:160px;background:${w.mood};overflow:hidden">
   <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:54px;color:#ffffffcc;text-shadow:0 0 22px #fff8">${w.glyph}</div>
   ${cov?`<img src="${esc(cov)}" alt="" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">`:''}
   <div style="position:absolute;left:0;right:0;bottom:0;height:60px;background:linear-gradient(transparent,#000a)"></div>
   ${w.hall?`<span style="position:absolute;top:8px;left:8px;${sub};font-size:9px;color:#ffe2a8;background:#000a;border:1px solid ${brass};border-radius:8px;padding:2px 7px">⚜ guild hall</span>`:''}
   <div style="position:absolute;left:12px;bottom:9px;right:12px;font-family:Georgia,serif;font-size:19px;color:#fff;text-shadow:0 1px 4px #000">${esc(w.name)}</div>
  </div>
  <div style="padding:10px 12px 12px;display:flex;flex-direction:column;gap:7px;flex:1">
   ${w.sub?`<div style="${sub};color:${gold}">${esc(w.sub)}</div>`:''}
   <div style="font-size:12px;line-height:1.45;color:${ink}">${esc(w.line)}</div>
   <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:4px">${pill}<span style="font-size:10px;color:${dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1">${meta}</span></div>
   <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${goBtn(w,L)}<a href="${url(w)}" target="_blank" ${LINK} title="${url(w)}" style="${btn};border-radius:4px;text-decoration:none;color:${dim}">🔗 copy link</a></div>
   ${mine}
  </div></div>`;
}

function banner(ctx,player,L){
 const hall=WORLDS.find(w=>w.hall);
 const gd=player?.guild,member=gd&&/wisp/i.test(String(gd.name||''));
 const who=member?`<span style="color:${cyan};font-size:12px">◉ you're a member · ${esc(gd.rank||'member')}</span>`:`<span style="color:${dim};font-size:11px;line-height:1.4">Guilds are joined in Spawn's own guild page, not here: Slate can take you to the hall, it can't sign you up.</span>`;
 return `<div style="position:relative;border:1px solid ${brass};border-radius:8px;overflow:hidden;background:radial-gradient(120% 140% at 0% 0%,#4a2f6e 0%,#24193f 45%,${navy} 100%);padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
  <div style="width:52px;height:52px;flex:none;border-radius:50%;border:1px solid ${gold};display:flex;align-items:center;justify-content:center;font-size:28px;color:#ffe2a8;background:radial-gradient(circle,#ffcf7a55,transparent 70%);text-shadow:0 0 14px #ffcf7a">◎</div>
  <div style="flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:4px">
   <div style="font-family:Georgia,serif;font-size:18px;letter-spacing:.24em;color:${gold}">ORDER OF THE WISP</div>
   <div style="font-size:12px;color:${ink}">Its hall is <b style="color:#ffe2a8;font-weight:600">${esc(hall?.name)}</b>, the guild's home world.</div>
   ${who}
  </div>
  <div style="flex:none">${hall?goBtn(hall,L,true):''}</div>
 </div>`;
}

export function page(ctx,player,plan){
 const L=lastOf(ctx,player);
 return `<div style="padding:14px;display:flex;flex-direction:column;gap:14px;color:${ink};max-width:1080px;margin:0 auto;box-sizing:border-box">
  ${banner(ctx,player,L)}
  <div style="${sub};color:${gold}">THE WISP WORLDS · ${WORLDS.length}</div>
  <div style="display:flex;flex-wrap:wrap;gap:12px">${WORLDS.map(w=>card(ctx,w,L)).join('')}</div>
  <div style="font-size:10px;color:${dim};line-height:1.5">GO portals your body there now; drafts open in their build room. Copy link gives the play page for a published world, the game page for a draft.</div>
 </div>`;
}

export function op(ctx,player,d,plan){
 if(d?.op!=='go')return false;
 const w=WORLDS.find(x=>x.slug===d.slug);if(!w||!player?.state)return false;
 const at=Number(ctx?.now?.())||0,rec=(state,msg)=>{player.state[KEY]={...(player.state[KEY]||{}),last:{slug:w.slug,name:w.name,at,state,msg}};};
 if(typeof ctx?.cross!=='function'){rec('refused','Portals are not open from here: walk through a tower egg instead.');return false;}
 let r=null;
 try{r=ctx.cross(player,addr(w));}catch(e){rec('refused',`${w.name} would not open: ${String(e?.message||e).slice(0,140)}`);return false;}
 if(r?.crossed===true)rec('crossed',`crossed into ${w.name}`);
 else if(r?.crossed)rec('opening',`opening ${w.name}…`);
 else rec('refused',r?.verdict?.message?`${w.name}: ${r.verdict.message}`:`${w.name} refused the crossing${r?.verdict?.code?` (${r.verdict.code})`:''}.`);
 return false;
}

export function tile(ctx,player){
 const L=lastOf(ctx,player);
 if(L?.state==='opening')return `opening ${L.name}…`;
 if(/wisp/i.test(String(player?.guild?.name||'')))return `order of the wisp · ${player.guild.rank||'member'}`;
 return `order of the wisp · ${WORLDS.length} worlds`;
}
