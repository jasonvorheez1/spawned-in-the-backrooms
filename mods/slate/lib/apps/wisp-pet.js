// Slate built-in app: your own wisp as a tamagotchi. Contract: lib/apps/index.js.
// Draws player.wisps (Spawn's, read-only) as a pixel flame in its own colour and shape; Slate keeps the care.
// player.state['slateApp_wisp-pet'] = { sel, w: { [wispId]: { hunger, joy, energy, at } }, last: { op, line, n, at, wisp } }
// Stats drift down with real time since `at`, computed on read; a press writes the stats back with at = now.
// CARE_ON: false while games can't reach the chat-bar wisp's own fuel/pet/play (psypher5, 2026-10-07: "make the feed / play / rest inactive then for now")
export const CARE_ON=false;
const ICON="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%27-11%20-11%2070%2070%27%20fill%3D%27none%27%20stroke%3D%27%23fff%27%20stroke-width%3D%272.8%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M24%2043c-8.3%200-14-5.6-14-13.2%200-6.6%204.2-10.4%207.2-14.6%201.2%203%202.6%204.6%204.4%205.4-.6-6.2%201.6-11.6%206.4-15.6-.4%205%201.8%208.4%204.6%2011.4%201-1.6%201.4-3.6%201.2-5.6%203.4%204%206.2%209.4%206.2%2015%200%209.8-6.4%2017.2-16%2017.2z%27/%3E%3Cpath%20d%3D%27M19.5%2029.5v3.4M28.5%2029.5v3.4%27%20stroke-width%3D%273.4%27/%3E%3C/svg%3E";
export const APP={id:'wisp-pet',name:'WISP',glyph:'✺',image:ICON,color:'#5dada9',sub:'your wisp, in Slate',about:'Your own Spawn wisp lives in Slate as a pixel flame, in its real colour and shape.'};

const KEY='slateApp_wisp-pet';
const DECAY={hunger:4,joy:3,energy:2};           // points lost per hour away
const START={hunger:70,joy:70,energy:70};         // a wisp met for the first time
const OPS={feed:{hunger:30},play:{joy:25,energy:-10},rest:{energy:40}};
const DEFAULT={id:'default',name:'Wisp',color:'#5DADA9',shape:'classic',burnStyle:'calm',stage:'',isDefault:true};
const HOUR=3600000;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=v=>Math.max(0,Math.min(100,Math.round(+v||0)));
const now=ctx=>{try{const t=ctx?.now?.();return Number.isFinite(t)?t:0;}catch(e){return 0;}};
const mine=player=>{const s=player?.state?.[KEY];return s&&typeof s==='object'?s:{};};

function wispsOf(player){
 let ws=[];try{const src=Array.isArray(player?.wisps)&&player.wisps.length?player.wisps:(player?.state?.slateWisps||[]);ws=Array.isArray(src)?src.filter(w=>w&&w.id):[];}catch(e){}
 return ws.length?ws:[DEFAULT];
}
function current(player){
 const ws=wispsOf(player),sel=mine(player).sel;
 return ws.find(w=>w.id===sel)||ws[0];
}
// stats as they stand right now: stored values less the hours since they were written
function stats(ctx,player,id){
 const r=mine(player).w?.[id];const t=now(ctx);
 if(!r)return {...START,fresh:true,away:0};
 const h=Math.max(0,(t-(+r.at||t))/HOUR);
 return {hunger:clamp(r.hunger-DECAY.hunger*h),joy:clamp(r.joy-DECAY.joy*h),energy:clamp(r.energy-DECAY.energy*h),away:h};
}
function mood(s){
 const lo=Math.min(s.hunger,s.joy,s.energy);
 if(lo<30){if(s.energy===lo)return 'sleepy';if(s.hunger===lo)return 'hungry';return 'sulking';}
 if((s.hunger+s.joy+s.energy)/3>=72&&lo>=55)return 'glowing';
 return 'content';
}
const MOOD_LINE={glowing:'burning bright and happy',content:'settled and easy',hungry:'flickering low — it wants fuel',sleepy:'drooping, close to a doze',sulking:'turned away, a little bored'};

// ---------- colour ----------
function hex(c){const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'').trim());return m?m[1]:'5DADA9';}
function rgb(c){const h=hex(c);return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function mix(c,t,a){const A=rgb(c),B=rgb(t);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*a).toString(16).padStart(2,'0')).join('').toUpperCase();}
// UPPERCASE on purpose: the wisp's own colour never follows the Slate theme

// ---------- pixel flame ----------
// half-width of a flame at row y (0 = tip) for a grid H tall and half-width R
function half(y,H,R,sharp){const t=(y+.5)/H;if(t<.62)return R*Math.pow(t/.62,sharp);const b=(t-.62)/.38;return R*Math.sqrt(Math.max(0,1-b*b*b*1.1));}
function flame(ox,W,H,col,lean,sharp){
 // returns {body, tipA, tipB}: rect strings; tips are the top third drawn twice with the lean flipped (the flicker)
 const cx=ox+(W-1)/2,R=(W)/2,dark=mix(col,'#101820',.38),mid=col.length===7?mix(col,col,0):col,light=mix(col,'#FFFFFF',.3),core=mix(col,'#FFFBEA',.72);
 const px=(lean)=>{const rows=[];for(let y=0;y<H;y++){const hw=half(y,H,R,sharp),sh=lean*Math.pow(1-y/H,2.2)*2.2;const out=[];for(let x=ox;x<ox+W;x++){const dx=x-cx-sh;if(Math.abs(dx)<=hw-.15){const edge=hw-Math.abs(dx);const ihw=half(y-H*.22,H*.78,R*.55,sharp);const inner=y>H*.3&&Math.abs(dx)<=ihw-.2;const hot=y>H*.5&&Math.abs(dx)<=half(y-H*.48,H*.52,R*.28,1)-.1;out.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${hot?core:inner?light:edge<1.1?dark:mid}"/>`);}}rows.push(out.join(''));}return rows;};
 const a=px(lean),b=px(-lean*.8),cut=Math.round(H*.36);
 return {body:a.slice(cut).join(''),tipA:a.slice(0,cut).join(''),tipB:b.slice(0,cut).join(''),cx,eyeY:Math.round(H*.6)};
}
function face(cx,ey,m){
 const E='#101820',W='#FFFFFF',ck='#FF8FA3',r=(x,y,w,h,f)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
 const lx=Math.round(cx-2.5),rx=Math.round(cx+1.5),mx=Math.round(cx-.5);
 let eyes,mouth='',extra='';
 if(m==='sleepy'){eyes=r(lx,ey+1,2,1,E)+r(rx,ey+1,2,1,E);mouth=r(mx,ey+3,1,1,E);}
 else if(m==='glowing'){eyes=r(lx,ey+.5,2,1,E)+r(lx-.5,ey+1.5,1,1,E)+r(lx+1.5,ey+1.5,1,1,E)+r(rx,ey+.5,2,1,E)+r(rx-.5,ey+1.5,1,1,E)+r(rx+1.5,ey+1.5,1,1,E);mouth=r(mx-1,ey+3,1,1,E)+r(mx,ey+4,1,1,E)+r(mx+1,ey+3,1,1,E);extra=r(lx-1.5,ey+3,1.5,1,ck)+r(rx+2,ey+3,1.5,1,ck);}
 else{
  const eye=x=>m==='sulking'?r(x,ey+1,2,1,E)+r(x,ey+.4,2,.6,E):r(x,ey,2,2,E)+r(x+1,ey,1,1,W);
  eyes=`<g class="wp-blink">${eye(lx)}${eye(rx)}</g>`;
  mouth=m==='hungry'?r(mx,ey+3,1,2,E)+r(mx-.5,ey+3,2,.6,E):m==='sulking'?r(mx-1,ey+4,1,1,E)+r(mx,ey+3,1,1,E)+r(mx+1,ey+4,1,1,E):r(mx-1,ey+3,1,1,E)+r(mx,ey+3.6,1,1,E)+r(mx+1,ey+3,1,1,E);
  if(m==='content')extra=r(lx-1.5,ey+3,1.2,.8,ck)+r(rx+2.3,ey+3,1.2,.8,ck);
 }
 return eyes+mouth+extra;
}
const BURN={calm:[1.1,3.6],crackle:[.45,2.8],pulse:[.8,1.9],wave:[.9,3]};   // [flicker s, breath s]
function drawWisp(w,m){
 const col=mix(w.color||DEFAULT.color,'#000000',0),shape=['slender','twin'].includes(w.shape)?w.shape:'classic';
 const [fl,br]=BURN[w.burnStyle]||BURN.calm,droop=m==='sleepy'||m==='sulking';
 const F=(f,cls,delay)=>`<g class="wp-breath ${cls}" style="animation-duration:${br*(droop?1.5:1)}s;animation-delay:${delay}s"><g class="wp-tA" style="animation-duration:${fl}s">${f.tipA}</g><g class="wp-tB" style="animation-duration:${fl}s">${f.tipB}</g>${f.body}`;
 let svg,body,VW,VH;
 if(shape==='twin'){
  VW=24;VH=20;const big=flame(9,15,20,col,.9,.85),small=flame(1,9,14,mix(col,'#FFFFFF',.12),-1,.8);
  body=`<g transform="translate(0,6)">${F(small,'wp-small',-.7)}</g></g>${F(big,'',0)}`;svg=body+face(big.cx,big.eyeY,m)+'</g>';body+='</g>';
 }else if(shape==='slender'){
  VW=13;VH=24;const f=flame(1,11,24,col,.8,1.15);body=F(f,'',0);svg=body+face(f.cx,Math.round(24*.62),m)+'</g>';body+='</g>';
 }else{
  VW=17;VH=20;const f=flame(1,15,20,col,1,.8);body=F(f,'',0);svg=body+face(f.cx,f.eyeY,m)+'</g>';body+='</g>';
 }
 // 3D pixel wisp: the pixel flame extruded into voxels (stacked slices, back ones shaded) turning slowly in space
 const H=shape==='slender'?184:164,W=Math.round(H*(VW+1)/(VH+1.5)),px=H/(VH+1.5),N=9,step=px*3/N;
 const vb=`viewBox="-.5 -1 ${VW+1} ${VH+1.5}" shape-rendering="crispEdges" width="${W}" height="${H}"`;
 let lay=`<svg width="0" height="0" style="position:absolute"><defs><g id="wp-body">${body}</g></defs></svg>`;for(let i=N;i>=1;i--){const z=-(i*step-(N*step)/2),sh=.42+.4*(1-i/N);lay+=`<svg class="wp-lay" ${vb} style="transform:translateZ(${z.toFixed(1)}px);filter:brightness(${sh.toFixed(2)})"><use href="#wp-body"/></svg>`;}
 lay+=`<svg class="wp-lay" ${vb} style="transform:translateZ(${((N*step)/2).toFixed(1)}px)">${svg}</svg>`;
 return {html:`<div class="wp-vox" style="width:${W}px;height:${H}px"><div class="wp-turn">${lay}</div></div>`,col};
}

// ---------- press bursts ----------
function burst(op,n,col){
 if(!OPS[op])return '';
 const parts=[];
 for(let i=0;i<12;i++){
  const a=(i/12)*Math.PI*2+(n%7)*.37,k=((n*31+i*17)%10)/10;
  let st,ch,f;
  if(op==='feed'){st=`--dx:${Math.round((k-.5)*90)}px;--dy:${-110-Math.round(k*60)}px;left:${44+((i*13+n*5)%13)}%;bottom:22%;animation-delay:${(i*.05).toFixed(2)}s`;ch='';f=i%3?'#FFB347':'#FFE08A';}
  else if(op==='play'){st=`--dx:${Math.round(Math.cos(a)*(80+k*40))}px;--dy:${Math.round(Math.sin(a)*(70+k*35))}px;left:50%;top:45%;animation-delay:${(k*.12).toFixed(2)}s`;ch=i%2?'✦':'';f=i%2?col:'#FFFFFF';}
  else{if(i>4)break;st=`--dx:${30+i*14}px;--dy:${-60-i*18}px;left:58%;top:30%;animation-delay:${(i*.35).toFixed(2)}s;font-size:${11+i*3}px`;ch='z';f='#C9D6FF';}
  parts.push(`<span class="wp-p wp-${op}" style="${st};color:${f};background:${ch?'transparent':f}">${ch}</span>`);
 }
 return `<div class="wp-burst" id="wp-burst-${n}">${parts.join('')}</div>`;
}

const LINES={
 feed:{glowing:['%s gulps the spark and glows to its tips.','Crackle! %s is full and fizzing.'],content:['%s nibbles the fuel, very pleased.','A warm little flare from %s.'],hungry:['%s snaps it up — still a bit peckish.','%s burns hungrily, thank you.'],sleepy:['%s eats with its eyes half shut.','A sleepy munch from %s.'],sulking:['%s pretends not to care, then eats it all.','Fuel helps. %s peeks back at you.']},
 play:{glowing:['%s loops around you, sparks everywhere!','Whee — %s does a full spin.'],content:['%s bobs along and chases your hand.','%s plays tag and wins, obviously.'],hungry:['%s plays, but keeps eyeing the fuel.','A short game — %s is a bit hungry.'],sleepy:['%s plays one round, then yawns.','%s is tired but trying its best.'],sulking:['%s cracks a smile despite itself.','That got %s flickering again.']},
 rest:{glowing:['%s settles into a soft, steady glow.','%s naps, humming quietly.'],content:['%s curls up and dims for a while.','A cosy little rest for %s.'],hungry:['%s rests, tummy rumbling embers.','%s dozes, dreaming of fuel.'],sleepy:['%s is out like a candle. Zzz.','Finally — %s sleeps deeply.'],sulking:['%s rests and lets the grumpiness go.','%s turns its back… and snores.']}
};

// ---------- the screen ----------
const CSS=`<style>
.wp{padding:14px;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-start;color:#d9e0d9;font-size:13px;line-height:1.45}
.wp-card{background:#1a2b3d;border:1px solid #2c3b4c;border-radius:8px;padding:12px;box-sizing:border-box;width:100%;max-width:340px}
.wp-h{font-family:Georgia,serif;font-size:15px;letter-spacing:.1em;color:#c9a56a;margin:0}
.wp-sub{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8a9aa0}
.wp-stage{position:relative;height:230px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;border-radius:6px;background:radial-gradient(ellipse at 50% 100%,#1f3247 0%,#111b2c 70%)}
.wp-glow{position:absolute;left:50%;bottom:22px;width:190px;height:190px;margin-left:-95px;border-radius:50%;filter:blur(18px);opacity:.42;animation:wp-glow 3.6s ease-in-out infinite}
.wp-floor{position:absolute;left:50%;bottom:16px;width:110px;height:14px;margin-left:-55px;border-radius:50%;background:#0a111c;opacity:.7;filter:blur(2px)}
.wp-svg{position:relative;margin-bottom:22px;overflow:visible;animation:wp-float 3.2s ease-in-out infinite}
.wp-vox{position:relative;margin-bottom:24px;perspective:700px;animation:wp-float 3.4s ease-in-out infinite}
.wp-turn{position:absolute;inset:0;transform-style:preserve-3d;animation:wp-yaw 7s ease-in-out infinite}
.wp-lay{position:absolute;left:0;top:0;overflow:visible;backface-visibility:visible}
@keyframes wp-yaw{0%,100%{transform:rotateY(-32deg) rotateX(4deg)}50%{transform:rotateY(32deg) rotateX(4deg)}}
.wp-breath{transform-box:fill-box;transform-origin:50% 100%;animation:wp-breathe 3.6s ease-in-out infinite}
.wp-tA,.wp-tB{animation:wp-flick 1s steps(1,end) infinite}.wp-tB{animation-name:wp-flick2}
.wp-blink{transform-box:fill-box;transform-origin:50% 50%;animation:wp-blink 4.8s infinite}
@keyframes wp-breathe{0%,100%{transform:none}50%{transform:none}}
@keyframes wp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes wp-flick{0%{opacity:1}50%{opacity:0}}@keyframes wp-flick2{0%{opacity:0}50%{opacity:1}}
@keyframes wp-blink{0%,90%,96%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}}
@keyframes wp-glow{0%,100%{opacity:.34;transform:scale(1)}50%{opacity:.5;transform:scale(1.08)}}
.wp-sleepy .wp-svg{animation-duration:5.5s}.wp-sleepy .wp-glow{opacity:.2}
.wp-zz{position:absolute;right:30%;top:22%;color:#c9d6ff;font:600 14px Georgia,serif;animation:wp-zz 3s ease-in-out infinite}
@keyframes wp-zz{0%{opacity:0;transform:translate(0,8px)}40%{opacity:.8}100%{opacity:0;transform:translate(14px,-22px)}}
.wp-burst{position:absolute;inset:0;pointer-events:none}
.wp-p{position:absolute;width:5px;height:5px;opacity:0;font:700 12px Georgia,serif;line-height:5px;animation:wp-fly 1.3s cubic-bezier(.2,.7,.3,1) forwards}
.wp-rest{width:auto;height:auto;line-height:1;animation-duration:2.2s}
.wp-play{animation-duration:1s}
@keyframes wp-fly{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.1)}}
.wp-name{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:10px}
.wp-mood{color:#53d9e5;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.wp-mood.low{color:#ff9156}
.wp-say{margin-top:8px;min-height:19px;color:#d9e0d9;font-style:italic}
.wp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.wp-btn{flex:1 1 80px;min-height:38px;border-radius:4px;border:1px solid #2c3b4c;background:transparent;color:#d9e0d9;font:inherit;font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 8px}
.wp-btn.pri{background:#a37d45;border-color:#a37d45;color:#111b2c;font-weight:600}
.wp-btn:hover{border-color:#c9a56a}.wp-btn:active{transform:scale(.97)}
.wp-btn small{font-size:10px;opacity:.75;letter-spacing:.06em}
.wp-stat{margin-top:10px}.wp-stat:first-of-type{margin-top:6px}
.wp-sl{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a9aa0}
.wp-bar{height:8px;background:#111b2c;border:1px solid #2c3b4c;border-radius:4px;margin-top:4px;overflow:hidden}
.wp-bar>i{display:block;height:100%;border-radius:3px;transition:width .5s}
.wp-pick{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.wp-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #2c3b4c;border-radius:999px;padding:3px 10px;background:transparent;color:#d9e0d9;font:inherit;font-size:12px;cursor:pointer}
.wp-chip.on{border-color:#53d9e5;color:#53d9e5}
.wp-chip i{width:9px;height:9px;border-radius:50%;display:inline-block}
.wp-note{color:#8a9aa0;font-size:12px;margin-top:6px}
.wp-quiet{background:transparent;border-style:dashed}
</style>`;

function ago(h){if(h<1/60)return 'just now';if(h<1)return Math.round(h*60)+' min ago';if(h<48)return Math.round(h)+' h ago';return Math.round(h/24)+' days ago';}
function bar(label,v,col,hint){return `<div class="wp-stat"><div class="wp-sl"><span>${label}</span><span style="color:${v<30?'#ff9156':'#d9e0d9'}">${v}${hint?` <span style="color:#8a9aa0;letter-spacing:0;text-transform:none">· ${hint}</span>`:''}</span></div><div class="wp-bar"><i style="width:${v}%;background:${v<30?'#ff9156':col}"></i></div></div>`;}

export function page(ctx,player,plan){
 const ws=wispsOf(player),w=current(player),s=stats(ctx,player,w.id),m=mood(s),st=mine(player),t=now(ctx);
 const name=esc(w.name||'Wisp'),{html,col}=drawWisp(w,m);
 const last=st.last&&st.last.wisp===w.id?st.last:null,recent=last&&t-(+last.at||0)<4000;
 const shapeWord={classic:'classic flame',slender:'slender flame',twin:'twin flame'}[w.shape]||'classic flame';
 const btn=(op,glyph,label,hint,pri)=>CARE_ON?`<button class="wp-btn${pri?' pri':''}" title="${label} ${name}" onclick="sendAction('planApp',{id:'wisp-pet',op:'${op}'})">`:`<button class="wp-btn" disabled title="Off for now: care lives on the chat bar wisp" style="opacity:.38;cursor:default;filter:grayscale(1)"><span>${glyph} ${label}</span><small>${CARE_ON?hint:'soon'}</small></button>`;
 const pri=m==='hungry'?'feed':m==='sleepy'?'rest':m==='sulking'?'play':'';
 const say=last?esc(last.line):s.fresh?`${name} looks up at you, ${MOOD_LINE[m]}.`:`${name} is ${MOOD_LINE[m]}.`;
 const main=`<div class="wp-card ${'wp-'+m}" style="max-width:340px">
  <div class="wp-stage"><div class="wp-glow" style="background:${col}"></div><div class="wp-floor"></div>${html}${m==='sleepy'&&!recent?'<span class="wp-zz">z</span>':''}${recent?burst(last.op,+last.n||0,col):''}</div>
  <div class="wp-name"><h3 class="wp-h">${name}</h3><span class="wp-mood${['hungry','sleepy','sulking'].includes(m)?' low':''}">● ${m}</span></div>
  <div class="wp-sub">${esc(shapeWord)}${w.burnStyle?' · '+esc(w.burnStyle):''}${w.stage?' · '+esc(w.stage):''}</div>
  <div class="wp-say">“${say}”</div>
  <div class="wp-row">${btn('feed','🔥','Feed','+30 fuel',pri==='feed')}${btn('play','✦','Play','+25 joy',pri==='play')}${btn('rest','☾','Rest','+40 energy',pri==='rest')}</div>
 </div>`;
 const side=`<div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:340px">
  ${CARE_ON?`<div class="wp-card"><div class="wp-sub">How ${name} is <span style="opacity:.6;letter-spacing:0;text-transform:none">· in Slate</span></div>
   ${bar('Fuel',s.hunger,'#c9a56a',s.hunger<30?'hungry':'')}${bar('Joy',s.joy,'#53d9e5',s.joy<30?'bored':'')}${bar('Energy',s.energy,'#5dada9',s.energy<30?'tired':'')}
   <div class="wp-note">${s.fresh?'First visit — care is kept on your save and drifts down while you are away.':'Last tended '+ago(s.away)+'. Fuel, joy and energy drift down slowly while you are away.'}</div>
  </div>`:`<div class="wp-card"><div class="wp-sub">Care · resting for now</div><div class="wp-note">Feed, play and rest live on your chat bar for now. They wake up here once Spawn lets a game reach ${name}’s real fuel and care.</div></div>`}
  ${ws.length>1?`<div class="wp-card"><div class="wp-sub">Your wisps</div><div class="wp-pick">${ws.map(x=>`<button class="wp-chip${x.id===w.id?' on':''}" title="Look after ${esc(x.name)}" onclick="sendAction('planApp',{id:'wisp-pet',op:'pick',wisp:'${esc(String(x.id).replace(/[\\']/g,''))}'})"><i style="background:${mix(x.color||DEFAULT.color,'#000000',0)}"></i>${esc(x.name||'Wisp')} <span style="color:#8a9aa0">${esc(mood(stats(ctx,player,x.id)))}</span></button>`).join('')}</div></div>`:''}
  ${w.isDefault?`<div class="wp-card"><div class="wp-sub">No wisp of your own yet</div><div class="wp-note" style="color:#d9e0d9">This is a stand-in. Adopt a wisp in Spawn and it moves in here, in its own colour and shape.</div></div>`:''}
  <div class="wp-card wp-quiet"><div class="wp-sub">The one on your chat bar</div><div class="wp-note">${w.isDefault?'Once you adopt one, it is':'This is'} the same wisp Spawn keeps on your chat bar — fuel, pet and play there are Spawn’s own. Its name and colour come from Spawn; its fuel and care there can’t be read by a game yet, so the hunger, joy and energy here are Slate’s own, kept on your save.</div></div>
 </div>`;
 return CSS+`<div class="wp">${main}${side}</div>`;
}

export function op(ctx,player,d,plan){
 if(!player?.state)return false;
 const st=mine(player),t=now(ctx);
 if(!CARE_ON&&['feed','play','rest'].includes(d?.op))return true;
 if(d?.op==='pick'){
  const id=String(d.wisp||'');const w=wispsOf(player).find(x=>x.id===id);
  if(w)player.state[KEY]={...st,sel:w.id};
  return false;
 }
 const add=OPS[d?.op];if(!add)return false;
 const w=current(player),s=stats(ctx,player,w.id),before=mood(s);
 const next={hunger:clamp(s.hunger+(add.hunger||0)),joy:clamp(s.joy+(add.joy||0)),energy:clamp(s.energy+(add.energy||0)),at:t};
 const n=((+st.last?.n)||0)+1,pool=LINES[d.op][before]||LINES[d.op].content;
 const line=pool[n%pool.length].replace('%s',String(w.name||'Wisp'));
 player.state[KEY]={...st,sel:w.id,w:{...(st.w||{}),[w.id]:next},last:{op:d.op,line,n,at:t,wisp:w.id}};
 return false;
}

export function tile(ctx,player){
 try{const w=current(player);return mood(stats(ctx,player,w.id))+' · '+String(w.name||'Wisp');}catch(e){return APP.sub;}
}
