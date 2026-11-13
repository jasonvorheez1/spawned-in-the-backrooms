// The Wisp guide layer, drawn over every Slate screen (lib/ui-panel.js calls it). Ops: sendAction('planApp',{id:'guide',op}) → lib/apps/guide.js.
// Your own wisp (player.wisps[0]: colour + shape) docks bottom-left in the tablet. First open: a 7-step tour. After: tap it and it explains the screen you're on.
// The bubble wears house hexes (lowercase) so every theme remaps it; the wisp's own colours are UPPERCASE so the remap leaves your wisp alone.
import {appOfTab} from './apps/index.js';
import {TOUR as STOPS} from './apps/guide.js';

// ── what each screen does: [title, text]. Written from the screens' own code; keep every claim true. ──
export const GUIDE={
 home:['HOME','This is Slate’s home screen. The top row is the core five: Studio, Loom, Planner, Kiln and Workbench. Under them sit Gallery, Camera, Settings and any apps you installed from the Store.'],
 game:['STUDIO · ACTIVE','This is the game you’re standing in. The GAME PAGE and PLAYERS pills at the top switch between its page and who’s been playing. The bar along the bottom moves between Active, Published, Drafts, Mods and Tools.'],
 published:['STUDIO · PUBLISHED','Your games that are out in the world, on your shelf. Open one to see its page; the ⟳ asks Savi to fetch a fresh copy of your shelf.'],
 drafts:['STUDIO · DRAFTS','Games you’ve started but not published yet. Open one to see where it stands.'],
 mods:['STUDIO · MODS','Your mods: tools like Slate that ride along inside your worlds. Open one to see its page.'],
 crowd:['STUDIO · PLAYERS','Who’s been playing and what they said. The tiles are your numbers and the bars are new players by day. Filter the comments (new, unanswered, ticketed), turn one into a Planner ticket, or hit refresh to have Savi pull fresh numbers.'],
 addons:['SLATE APPS','Any mod can live inside Slate as an app. Install one and it lands on your home screen; remove it and it goes. The core five are Slate itself and always stay.'],
 diary:['LOOM','Loom is your game’s book. Chapters run down the side and pages sit as cards; open a page and it becomes a writing desk. A hero page is a feature idea, and it can split into Planner tickets. Stuck on a page? Ask Savi.'],
 board:['PLANNER · BOARD','Your tickets on a board, left to right, from idea to done. Drag cards between columns; every card shows how old it is. Quick-add understands “fix canoe #bug !1 @Valley”, and search and filters narrow it down.'],
 miles:['PLANNER · ROADMAP','Releases and the epics inside them, each with a progress bar from its tickets. Drag an epic to another release, click any name or goal to rename it, and use + to add.'],
 sprints:['PLANNER · SPRINTS','How your sprint is going: a burndown with a point for each day. This screen only reads; you change the work on the Board.'],
 cam:['PLANNER · SNAP','A ticket from a picture. Fly to frame the problem, press the shutter, and what’s in the glass becomes a new ticket.'],
 kiln:['KILN','Kiln is where things get made. Pick what you’re making (3D models, textures, music, sound effects, voices and more), fill in its steps, and Savi works through it while a Planner card tracks it. Gates are where Savi stops and shows you before going on.'],
 studio:['WORKBENCH','Workbench is the game’s asset room: Assets with each one’s pipeline trail, Concepts with every image made, and Docs to read the design notes. Savi and her crew write it; you read it here.'],
 gallery:['GALLERY','Every picture lands here: your photos, concepts, drawings, renders. Sort a shot by making it a ticket, pinning it to a Loom page, or binning it.'],
 selfie:['CAMERA','Fly to frame your shot, then press the shutter. Every photo goes straight into Gallery; HOME ✕ closes the camera.'],
 settings:['SETTINGS','Make Slate yours: themes, fonts, background, effects, the home button and the play-mode orb. Further down: the camera, notifications, shortcuts, game and world rules, the environment, and the Archive.'],
 archive:['ARCHIVE','Things you’ve put away: tickets, epics, releases. They stay here until you restore them or delete them for good. Nothing expires.'],
 ticket:['A TICKET','One ticket, open. Edit its title and note, move it along the columns, or close it to go back to the board.'],
};
const TOUR=[
 ['HELLO','Hi! I’m your wisp, and I live in your Slate now. Slate is your game-making tablet. Want the quick tour? It takes about a minute.'],
 ['HOME · THE TOP FIVE','The top row is the core five, in the order you’ll use them: Studio is your games, Loom writes the idea down, Planner turns it into tickets, Kiln makes the stuff, and Workbench is where the made things live.'],
 ['STUDIO','This is Studio, where your games live. Active is the game you’re in right now, with its page and its players. The bar at the bottom takes you to Published, Drafts, Mods and Tools.'],
 ['LOOM','This is Loom, your game’s book. Write chapters and pages, and give a hero page a feature idea; it can split into Planner tickets.'],
 ['PLANNER','This is Planner. Tickets move left to right until they’re done. The tabs along the bottom: Board, Roadmap for releases, Sprints, and Snap to make a ticket from a picture.'],
 ['KILN','This is Kiln. Pick what you’re making, fill in the steps, and Savi works through it, stopping at the gates you keep on so you can look.'],
 ['THE STORE','Slate Apps, on your home screen, is the Store. Install apps and mods there and they land on your home screen. That’s the tour! Tap me anytime and I’ll explain whatever screen you’re on.'],
];
const PLANNER=['board','miles','sprints','cam'],STUDIOBAR=['tome','game','crowd'];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function guideFor(tab,player,plan,open1){
 if(open1)return GUIDE.ticket;
 if(tab==='tome'){const s=player?.state?.studioTab;return GUIDE[s==='tools'||s==='active'||!s?'game':s]||GUIDE.game;}
 if(typeof tab==='string'&&tab.startsWith('app-')){const a=appOfTab(tab);
  if(a?.id==='guide')return ['GUIDE','That’s me! I live in this corner of every screen. Tap me and I’ll explain what you’re looking at.'];
  return a?[a.name,(a.about||a.sub||'A Slate app.')+' Remove it in Slate Apps on your home screen.']:['AN APP','A Slate app. Find it, or remove it, in the Store under Studio › Tools.'];}
 if(typeof tab==='string'&&tab.startsWith('ao-'))return ['AN ADD-ON','A mod living inside Slate as its own app. Manage it in Slate Apps on your home screen.'];
 return GUIDE[tab]||['THIS SCREEN','I don’t know this screen well yet. Home (the round button at the bottom) takes you back to all the apps.'];
}

// ── the wisp: pixel flames on a 12×12 grid, 4 px a pixel. o rim · m body · c core. e = eye centres ──
const SHAPES={
 classic:{g:['......o.....','.....omo....','....omco....','....omcmo...','...omccmo...','..omcccmmo..','..omccccmo..','.omccccccmo.','.omccccccmo.','.omccccccmo.','..omccccmo..','...oommoo...'],e:[[4,7],[7,7]]},
 slender:{g:['.....o......','.....mo.....','....omo.....','....omco....','....omcmo...','...omccmo...','...omccmo...','...omcccmo..','...omcccmo..','...omcccmo..','...omccmo...','....ommo....'],e:[[4,7],[7,7]]},
 twin:{g:['..o.....o...','..mo...om...','.omo...omo..','.omco.omco..','.omcmoomcmo.','..omcmmcmo..','..omccccmo..','.omccccccmo.','.omccccccmo.','.omccccccmo.','..omccccmo..','...oommoo...'],e:[[4,7],[7,7]]},
};
const hx=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(c||''));return m?m[1]:'5dada9';};
const mix=(h,t,k)=>{const a=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),b=[0,2,4].map(i=>parseInt(t.slice(i,i+2),16));return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,'0')).join('').toUpperCase();};
export function wispArt(color,shape,px=4){
 const h=hx(color),S=SHAPES[shape]||SHAPES.classic,C={o:mix(h,'0b1320',.35),m:'#'+h.toUpperCase(),c:mix(h,'ffffff',.55)},sh=[];
 S.g.forEach((r,y)=>[...r].forEach((ch,x)=>{if(C[ch])sh.push(`${x*px}px ${y*px}px 0 ${C[ch]}`);}));
 const eyes=S.e.map(([x,y])=>`<i class="sg-eye" style="left:${x*px}px;top:${y*px}px;width:${px}px;height:${px*2}px"></i>`).join('');
 return `<div class="sg-flame" style="position:relative;width:${12*px}px;height:${12*px}px;filter:drop-shadow(0 0 ${px*1.5}px ${C.m}AA)"><i style="position:absolute;left:0;top:0;width:${px}px;height:${px}px;box-shadow:${sh.join(',')}"></i>${eyes}</div>`;
}

const CSS=`<style>
#sg-guide{position:absolute;left:14px;z-index:60;pointer-events:none;font-family:inherit}
#sg-guide *{box-sizing:border-box}
#sg-wisp{pointer-events:auto;cursor:pointer;background:none;border:none;padding:0;display:block;animation:sgBob 2.8s ease-in-out infinite;transform-origin:50% 100%}
#sg-wisp:hover .sg-flame{transform:scale(1.08)}#sg-wisp .sg-flame{transition:transform .15s}
#sg-wisp .sg-hop{animation:sgHop .55s cubic-bezier(.3,1.6,.5,1) 1}
#sg-wisp .sg-flame>i:first-child{animation:sgFlick 1.7s steps(3) infinite}
.sg-eye{position:absolute;background:#0B1320;border-radius:1px;animation:sgBlink 4.6s infinite;transform-origin:50% 60%}
@keyframes sgBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes sgHop{0%{transform:translateY(0) scale(1,1)}25%{transform:translateY(2px) scale(1.12,.86)}55%{transform:translateY(-12px) scale(.92,1.1)}80%{transform:translateY(0) scale(1.06,.94)}100%{transform:none}}
@keyframes sgBlink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.1)}}
@keyframes sgFlick{0%,100%{opacity:1}50%{opacity:.88}}
@keyframes sgIn{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
#sg-bub{pointer-events:auto;position:absolute;left:62px;bottom:6px;width:max-content;max-width:min(300px,calc(var(--sl-width,360px) - 104px));min-width:min(170px,calc(var(--sl-width,360px) - 104px));background:#111b2c;-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);color:#d9e0d9;border:1px solid #a37d45;border-radius:10px;padding:10px 12px 9px;box-shadow:0 8px 24px #000a;font-size:12.5px;line-height:1.5;animation:sgIn .22s ease-out;white-space:normal;overflow-wrap:anywhere}
#sg-bub:before{content:'';position:absolute;left:-7px;bottom:16px;width:12px;height:12px;background:#111b2c;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);clip-path:polygon(0 0,0 100%,100% 100%);border-left:1px solid #a37d45;border-bottom:1px solid #a37d45;transform:rotate(45deg)}
#sg-bub .sg-h{font-size:9.5px;letter-spacing:.18em;color:#c9a56a;margin-bottom:4px;display:flex;align-items:center;gap:6px}
#sg-bub .sg-x{margin-left:auto;background:none;border:none;color:#8a9aa0;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
#sg-bub .sg-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:9px}
#sg-bub .sg-b{background:#1a2b3d;border:1px solid #a37d45;color:#d9e0d9;padding:6px 11px;cursor:pointer;font:600 10.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;border-radius:3px;min-height:30px}
#sg-bub .sg-b:hover{border-color:#c9a56a}
#sg-bub .sg-l{background:none;border:none;color:#8a9aa0;cursor:pointer;font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.12em;padding:6px 2px;text-decoration:underline;text-underline-offset:3px}
#sg-bub .sg-l:hover{color:#53d9e5}
#sg-bub .sg-dots{display:flex;gap:4px;margin-right:auto}#sg-bub .sg-dots i{width:6px;height:6px;border-radius:50%;background:#2c3b4c}#sg-bub .sg-dots i.on{background:#53d9e5}
</style>`;

const FOLLOW="(function(){var W=window,F=W.__sgF||(W.__sgF={x:14,mx:-1,my:-1,v:0});F.ver=3;if(!F.on){F.on=1;document.addEventListener('pointermove',function(e){F.mx=e.clientX;F.my=e.clientY},{passive:true});var last=0;var step=function(t){requestAnimationFrame(step);var dt=Math.min(.05,(t-(last||t))/1000);last=t;var g=document.getElementById('sg-guide');if(!g)return;var par=g.offsetParent;if(!par)return;var r=par.getBoundingClientRect(),maxX=Math.max(14,r.width-62),tx=F.x;var open=!!document.getElementById('sg-bub');if(open)tx=14;else if(F.mx>=r.left&amp;&amp;F.mx<=r.right&amp;&amp;F.my>=r.top&amp;&amp;F.my<=r.bottom){var m=F.mx-r.left-24,d=m-F.x;tx=Math.abs(d)<48?F.x:m-Math.sign(d)*46}tx=Math.max(14,Math.min(maxX,tx));var d2=tx-F.x,sp=Math.max(-260,Math.min(260,d2*4));if(Math.abs(d2)<1.5)sp=0;F.v+= (sp-F.v)*Math.min(1,dt*10);F.x+=F.v*dt;F.x=Math.max(14,Math.min(maxX,F.x));g.style.left=F.x.toFixed(1)+'px';var b=document.getElementById('sg-wisp');if(b){var mv=Math.abs(F.v)>12;if(mv)F.face=F.v<0?-1:1;var wob=mv?Math.sin(t/70)*Math.min(1,Math.abs(F.v)/120):0;b.style.animation=mv?'none':'';b.style.transform=mv?'translateY('+(-Math.abs(wob)*5).toFixed(1)+'px) rotate('+(wob*7).toFixed(1)+'deg)':'';var fl=b.firstElementChild;if(fl)fl.style.transform='scaleX('+(F.face||1)+')'}};requestAnimationFrame(step)}var g=document.getElementById('sg-guide');if(g)g.style.left=F.x.toFixed(1)+'px'})()".replace(/"/g,'&quot;'); // the wisp trots along Slate's floor after the cursor; one rAF loop per page, position kept in window.__sgF across re-renders
export function guideLayer(ctx,player,tab,plan){
 try{
  const st=player?.state||{},g=st.slateGuide||{},w=((player?.wisps?.length?player.wisps:player?.state?.slateWisps)||[])[0]||{};
  const touring=!g.toured,open=touring||!!g.open;
  const open1=!!st.planOpen&&(plan?.cards||[]).some(c=>c.id===st.planOpen);
  const bars=open1||PLANNER.includes(tab)||STUDIOBAR.includes(tab);
  const bottom=bars?94:46,px=open1||tab==='cam'||tab==='selfie'?3:4;
  const A=(o,f)=>`sendAction('planApp',{id:'guide',op:'${o}'${f!=null?`,from:${f}`:''}})`;
  let bub='';
  if(open){
   if(touring){const i=Math.max(0,Math.min(TOUR.length-1,g.step|0)),[t,txt]=TOUR[i],last=i===TOUR.length-1,s=STOPS[i]||{};
    const nav=`sendAction('planOpen',{id:null});`;
    bub=`<div class="sg-h">✺ ${t}<span style="color:#8a9aa0">${i+1}/${TOUR.length}</span></div><div>${esc(txt)}</div>
     <div class="sg-row"><span class="sg-dots">${TOUR.map((_,k)=>`<i class="${k<=i?'on':''}"></i>`).join('')}</span>
     ${i>0?`<button class="sg-l" onclick="${nav}${A('back',i)}">BACK</button>`:''}
     ${last?`<button class="sg-b" onclick="${A('done')}">GOT IT ✓</button>`:`<button class="sg-l" onclick="${A('skip')}">SKIP TOUR</button><button class="sg-b" onclick="${nav}${A('next',i)}">${i===0?'SHOW ME':'NEXT'} ›</button>`}</div>`;
    void s;}
   else{const [t,txt]=guideFor(tab,player,plan,open1);
    bub=`<div class="sg-h">✺ ${esc(t)}<button class="sg-x" title="close" aria-label="Close" onclick="${A('close')}">×</button></div><div>${esc(txt)}</div>
     <div class="sg-row"><button class="sg-l" onclick="sendAction('planOpen',{id:null});${A('replay')}">REPLAY THE TOUR</button></div>`;}
  }
  const hop=open?` sg-hop" data-h="${(g.hop|0)}-${esc(tab)}-${g.step|0}`:'';
  return `${CSS}<div id="sg-guide" style="bottom:${bottom}px">
   <button id="sg-wisp" title="${open&&!touring?'close':'what’s this screen?'}" aria-label="Your wisp: explain this screen" onpointerdown="event.stopPropagation()" onclick="${A(touring?'tap':open?'close':'tap')}"><div class="${hop}">${wispArt(w.color,w.shape,px)}</div></button>
   ${bub?`<div id="sg-bub" role="dialog" onpointerdown="event.stopPropagation()">${bub}</div>`:''}
  </div><img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#sgf3" onload="${FOLLOW}" style="display:none">`;
 }catch(e){return '';}
}
