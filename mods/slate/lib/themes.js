import {sideSettings,setSide} from './footer-settings.js';
// THEMES: Slate re-dressed. Every app draws in Slate's own house tones (navy glass, brass, cyan); a theme maps each house tone
// to its own, keeping the small steps between shades, so every screen follows without touching its code.
// Per player: state.slateTheme (id), state.slateThemesMine [{id,name,c,glass,blur,ambient}], state.slateThemeCal (follow the calendar),
// state.slateThemeDraft (the make-your-own being edited: the whole tablet previews it live).
// Theme colours are written UPPERCASE in Slate's own UI so the remap (lowercase house hexes only) never touches them.
import {TOKENS_CSS,isLight} from './tokens.js';
import {worldTheme,worldThemeState,worldThemeOp} from './worldtheme.js';
export const ROLES=[['bg','Background'],['panel','Panel'],['bezel','Frame'],['line','Lines'],['ink','Text'],['dim','Quiet text'],['accent','Accent'],['soft','Highlight'],['glow','Glow']];
// the house tone each role is measured from, and the other house shades that belong to it
const HOUSE={bg:['#0d1522','#111b2c','#0a121e','#0a111c','#111c2b','#0e1826','#0b1422','#0d1724','#05080d'],panel:['#1a2b3d','#16233a','#16243a','#152234','#1c2c47','#223246','#13263a','#16202e'],
 bezel:['#22262b','#2a2e33','#15181c','#1a1d21'],line:['#2c3b4c','#1f2c3c','#22324a','#26313f','#3a3f45'],ink:['#d9e0d9','#f3ead7','#f1e6cf','#e9e2d0','#e8dcc0','#f6efe0','#ecdec3','#cbd5d5','#c9d0cc'],
 dim:['#8a9aa0','#bdc7c7','#8b98a8','#9aa6ad','#7d8799'],accent:['#a37d45','#c9a56a','#b0864a','#c29c62'],soft:['#ffd79a','#e9c9a0','#f0d9a6'],glow:['#53d9e5','#9fe3ea','#bfe9ec']};
export const BASE=Object.fromEntries(Object.entries(HOUSE).map(([k,v])=>[k,v[0]]));
const T=(id,name,group,c,o={})=>({id,name,group,c:{...BASE,...c},glass:0,blur:0,ambient:'none',...o});
export const SHIPPED=[
 T('brass','Starbloom Brass','house',{}),
 T('glass','Glass','house',{bg:'#0f1a26',panel:'#1d2c3c',bezel:'#1c2128',line:'#4a5e72',ink:'#e6ecef',dim:'#9aaab4',accent:'#b9975e',soft:'#f0dcb4',glow:'#7fd6df'},{glass:45,blur:16}),
 T('linen','Linen','house',{bg:'#eeebe4',panel:'#e0dcd2',bezel:'#d4cfc4',line:'#c2bbad',ink:'#2a2a2c',dim:'#6f6a62',accent:'#8a6a3c',soft:'#6b4f26',glow:'#2f7f88'}),
 T('winter','Winter','season',{bg:'#141a20',panel:'#1f2830',bezel:'#1b2026',line:'#34414c',ink:'#dfe6ea',dim:'#8c99a3',accent:'#9fb4c4',soft:'#d6e4ee',glow:'#a9d4e6'},{ambient:'snow'}),
 T('spring','Spring','season',{bg:'#f1efe8',panel:'#e4e6dc',bezel:'#d8dbce',line:'#c3c8b6',ink:'#2b2f2a',dim:'#6c7266',accent:'#7f8f6a',soft:'#4d5a3c',glow:'#b07a86'}),
 T('summer','Summer','season',{bg:'#102022',panel:'#1a3033',bezel:'#182426',line:'#2b4447',ink:'#e8e4d8',dim:'#8fa3a1',accent:'#c9a874',soft:'#f1dfb8',glow:'#6fc6bb'}),
 T('autumn','Autumn','season',{bg:'#1a1410',panel:'#2a2019',bezel:'#221b16',line:'#3e3026',ink:'#ece0cf',dim:'#9c8d7c',accent:'#b8693c',soft:'#ecc59a',glow:'#c9a35a'},{ambient:'leaves'}),
 T('christmas','Christmas','holiday',{bg:'#0f1a16',panel:'#1a2a23',bezel:'#1a201d',line:'#2c3d34',ink:'#e4e2d6',dim:'#8f9a90',accent:'#b8955a',soft:'#ead6a8',glow:'#b0545a'},{ambient:'snow'}),
 T('halloween','Halloween','holiday',{bg:'#121012',panel:'#1f1b1e',bezel:'#1c191b',line:'#353036',ink:'#e0d9d2',dim:'#8f8780',accent:'#c07a3a',soft:'#e8b98a',glow:'#8e7bb0'}),
 T('ipad-light','iPadOS Light','os',{bg:'#f2f2f7',panel:'#ffffff',bezel:'#0c0c0e',line:'#d1d1d6',ink:'#1c1c1e',dim:'#6e6e73',accent:'#007aff',soft:'#0062cc',glow:'#0a84a8'},{glass:0,blur:24,chrome:'ipad'}),
 T('ipad-dark','iPadOS Dark','os',{bg:'#000000',panel:'#1c1c1e',bezel:'#0c0c0e',line:'#38383a',ink:'#f2f2f7',dim:'#8e8e93',accent:'#0a84ff',soft:'#64b5ff',glow:'#64d2ff'},{glass:0,blur:24,chrome:'ipad'}),
];
export const AMBIENTS=['none','snow','leaves'];
const HEX=/^#[0-9a-f]{6}$/i;
export function cleanTheme(t,fallbackId){if(!t||typeof t!=='object')return null;const c={};for(const [k] of ROLES){const v=String(t.c?.[k]||'');c[k]=HEX.test(v)?v.toLowerCase():BASE[k];}
 const n=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
 return {id:String(t.id||fallbackId||'mine').replace(/[^\w-]/g,'').slice(0,40)||'mine',name:String(t.name||'My theme').replace(/[<>"]/g,'').slice(0,32)||'My theme',group:'mine',c,glass:n(t.glass),blur:Math.min(30,n(t.blur)),ambient:AMBIENTS.includes(t.ambient)?t.ambient:'none'};}
// the calendar: holidays first, then the season (northern hemisphere)
export function calendarTheme(ms){const d=new Date(ms),m=d.getUTCMonth()+1,day=d.getUTCDate();
 if(m===12&&day<=26)return 'christmas';if(m===10&&day>=17||m===11&&day===1)return 'halloween';
 return m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';}
export function activeTheme(ctx,player){const s=player?.state||{};if(s.slateThemeDraft&&s.slateThemeEditing)return cleanTheme(s.slateThemeDraft,'draft');
 // the world's own theme: a preview (a suggestion or an old version) wears the whole tablet until it's applied or waved off
 if(s.slateWTPreview){const w=worldTheme(ctx,s.slateWTPreview);if(w)return w;}
 if(s.slateTheme==='world'&&!s.slateThemeCal){const w=worldTheme(ctx);if(w)return HEX.test(String(s.slateAccent||''))?withAccent(w,s.slateAccent):w;}
 const mine=(s.slateThemesMine||[]).map(t=>cleanTheme(t)).filter(Boolean);
 let id=s.slateTheme||'brass';if(s.slateThemeCal){const now=ctx?.now?.()||0;id=calendarTheme(now>1e12?now:Date.now());}
 const t=SHIPPED.find(t=>t.id===id)||mine.find(t=>t.id===id)||SHIPPED[0];
 return HEX.test(String(s.slateAccent||''))?withAccent(t,s.slateAccent):t;}
// the player's own accent over any theme: the highlight follows it, lifted toward the text colour
function withAccent(t,a){a=String(a).toLowerCase();const A=rgb(a),I=rgb(t.c.ink),B=rgb(t.c.bg),lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
 // selection draws soft text on an accent fill (DESIGN-SYSTEM §3.2): a pale accent takes a deep soft so the label still reads
 const soft=lum(A)>150?hx(A.map((v,i)=>v*.236+B[i]*.764)):hx(A.map((v,i)=>v*.55+I[i]*.45));return {...t,c:{...t.c,accent:a,soft}};}
// --- the remap ---
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
let MEMO=new Map();
function mapFor(t){const key=JSON.stringify([t.c,t.glass,t.wa||0]);if(MEMO.has(key))return MEMO.get(key);if(MEMO.size>24)MEMO=new Map();
 const m=new Map(),a=Math.max(0,Math.min(100,t.glass||0))/100;
 for(const [role,list] of Object.entries(HOUSE)){const base=rgb(list[0]),to=rgb(t.c[role]||list[0]);
  for(const h of list){const s=rgb(h),out=hx(s.map((v,i)=>to[i]+(v-base[i])));
   let alpha=a&&(role==='bg'||role==='bezel')?1-a:a&&role==='panel'?Math.max(.91,1-a*.6):null;if(t.wa&&role==='bg')alpha=Math.min(alpha??1,t.wa);m.set(h,{out,alpha:alpha==null?null:Math.round(alpha*255).toString(16).padStart(2,'0')});}}
 MEMO.set(key,m);return m;}
const AMB={snow:{n:16,css:'width:3px;height:3px;border-radius:50%;background:#FFFFFF;opacity:.32',fall:'slSnow'},leaves:{n:10,css:'width:7px;height:4px;border-radius:60% 0 60% 0;opacity:.35',fall:'slLeaf'}};
export function fxFor(player,t){const f=player?.state?.slateFx||{};const kind=f.kind&&f.kind!=='theme'?f.kind:t.ambient;
 return {kind:AMB[kind]?kind:'none',follow:!f.kind||f.kind==='theme',density:f.density??40,size:f.size??40,speed:f.speed??40,settle:f.settle!==false};}
function ambient(t,player){const F=fxFor(player,t),A=AMB[F.kind];if(!A)return '';const n=Math.round(4+F.density*.56),sz=.5+F.size/40,sp=1.9-F.speed/60;let s='';
 for(let i=0;i<n;i++){const x=(i*61+i*i*7)%100,dur=((9+(i*7)%9)*sp).toFixed(1),del=-((i*13)%17),k=(.7+((i*37)%7)/10)*sz,tint=F.kind==='leaves'?`background:${t.c.accent.toUpperCase()};`:'';
  const css=F.kind==='snow'?`width:${(3*k).toFixed(1)}px;height:${(3*k).toFixed(1)}px;border-radius:50%;background:#FFFFFF;opacity:${(.22+((i*17)%5)/14).toFixed(2)}`:`width:${(7*k).toFixed(1)}px;height:${(4*k).toFixed(1)}px;border-radius:60% 0 60% 0;opacity:.35`;
  s+=`<i style="position:absolute;top:-10px;left:${x}%;${css};${tint}animation:${A.fall} ${dur}s linear ${del}s infinite"></i>`;}
 let pile='';if(F.kind==='snow'&&F.settle){const g=.6+F.density/100;const W='#FFFFFFF0',S='#EEF3F8E0',E='transparent';
  const drift=(side)=>{const x=side==='l'?'left:0':'right:0',o=side==='l'?'0%':'100%',fl=side==='l'?'':'transform:scaleX(-1);';
   return `<div style="position:absolute;bottom:0;${x};width:${Math.round(150*g)}px;height:${Math.round(70*g)}px;${fl}"><div style="position:absolute;inset:0;transform-origin:0 100%;animation:slPile 90s ease-out forwards;background:radial-gradient(ellipse 62% 78% at 0% 100%,${W} 58%,${E} 60%),radial-gradient(ellipse 38% 46% at 46% 100%,${S} 56%,${E} 59%),radial-gradient(ellipse 24% 30% at 70% 100%,${S} 54%,${E} 58%),radial-gradient(ellipse 12% 14% at 86% 100%,#FFFFFFB0 50%,${E} 56%);filter:drop-shadow(0 -1px 2px #FFFFFF66) drop-shadow(0 2px 3px #9DB3C855)"></div></div>`;};
  const frost=(pos,ang)=>`<div style="position:absolute;${pos};width:${Math.round(90*g)}px;height:${Math.round(90*g)}px;pointer-events:none;opacity:0;animation:slFrost 70s ease-out forwards;background:radial-gradient(circle at ${ang},#FFFFFF59 0,#FFFFFF26 30%,${E} 62%)"></div>`;
  const lumps=[[4,9,22],[11,7,26],[19,10,20],[27,6,30],[35,9,24],[44,7,22],[52,11,28],[61,8,20],[69,10,26],[77,7,22],[85,9,24],[93,8,20]].map(([x,w,h])=>`radial-gradient(ellipse ${w}% ${Math.round(h*g)}px at ${x}% 100%,${(x*7)%3?W:S} 58%,${E} 62%)`).join(',');
  const bank=`<div style="position:absolute;left:0;right:0;bottom:0;height:${Math.round(34*g)}px;transform-origin:50% 100%;animation:slBank 90s ease-out forwards;background:${lumps},linear-gradient(${E} 55%,#F4F8FCEE 58%);filter:drop-shadow(0 -1px 2px #FFFFFF66) drop-shadow(0 2px 3px #9DB3C855)"></div>`;
  pile=bank+drift('l')+drift('r')+frost('top:0;left:0','0 0')+frost('top:0;right:0','100% 0')+`<div style="position:absolute;left:0;right:0;bottom:0;height:3px;opacity:0;animation:slFrost 90s ease-out forwards;background:linear-gradient(#FFFFFF00,#FFFFFF8C)"></div>`;}
 return `<style>@keyframes slSnow{to{transform:translate(18px,105cqh)}}@keyframes slLeaf{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(22px,52cqh) rotate(160deg)}100%{transform:translate(-6px,105cqh) rotate(320deg)}}@keyframes slPile{from{transform:scale(.2)}to{transform:scale(1)}}@keyframes slFrost{to{opacity:1}}@keyframes slBank{from{transform:scaleY(.1)}to{transform:scaleY(1)}}</style><div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4;container-type:size;border-radius:inherit">${s}${pile}</div>`;}
function snowCaps(player,t){const F=fxFor(player,t);if(F.kind!=='snow'||!F.settle)return '';const sel=['.vwp-card','.kb-card','.sl-set-nav[aria-current="true"]','.kb-stat','.kb-col','.vwp-app','.sl-tile'].map(c=>'#vwp-tablet '+c),B=sel.map(c=>c+'::before').join(','),A=sel.map(c=>c+'::after').join(',');
 const drip=(x,w,h)=>`radial-gradient(ellipse ${w}px ${h}px at ${x} 0,#FFFFFF 62%,transparent 68%)`,ice=(x,h)=>`linear-gradient(to bottom,#E6F2FBEE,#BFDDF2AA 70%,transparent) ${x} 0/3px ${h}px no-repeat`;
 return `<style>${sel.join(',')}{position:relative;overflow:visible!important}
 ${B},${A}{content:'';position:absolute;pointer-events:none;z-index:2;opacity:0;animation:slCap 40s ease-out forwards}
 ${B}{left:-4px;right:-4px;top:-7px;height:13px;border-radius:12px 12px 9px 9px/9px 9px 7px 7px;background:radial-gradient(ellipse 30% 6px at 22% 0,#FFFFFF 60%,transparent 66%),radial-gradient(ellipse 26% 5px at 68% 0,#FFFFFF 60%,transparent 66%),linear-gradient(#FFFFFF,#F1F6FB 55%,#D8E6F1);box-shadow:inset 0 -2px 0 #C3D7E7,inset 0 2px 1px #FFFFFF,0 2px 3px #0A142640}
 ${A}{left:0;right:0;top:4px;height:16px;background:${drip('7%',5,9)},${drip('19%',4,6)},${drip('34%',6,11)},${drip('51%',4,5)},${drip('63%',5,8)},${drip('82%',4,7)},${drip('94%',6,12)},${ice('27%',13)},${ice('58%',10)},${ice('76%',15)};filter:drop-shadow(0 1px 1px #0A142633)}
 @keyframes slCap{0%{opacity:0;transform:translateY(-3px) scaleY(.4)}100%{opacity:1;transform:none}}</style>`;}
export function themed(ctx,player,html){html=String(html||'');if(html.includes('<!--slth-->'))return html;const t0=activeTheme(ctx,player),url=wallFor(player,t0);
 const gv=glassFor(player,t0,url),t={...t0,glass:gv,blur:gv?Math.min(t0.blur||6,Math.round(gv*.06)):0},ch=chrome(player,t0)+(t0.chrome==='ipad'?iosCss(player,t0,url,gv):'');
 if(t0.chrome==='ipad'){html=iosHtml(ctx,html);if(isLight(t0.c))html=iosLightGlass(html);}
 {const A=rgb(t0.c.accent),lum=.2126*A[0]+.7152*A[1]+.0722*A[2],S=rgb(t0.c.soft),ls=.2126*S[0]+.7152*S[1]+.0722*S[2];
  // text on an accent fill (§3.2 selection): soft when it contrasts, else the theme's deep tone
  const on=Math.abs(lum-ls)>90?t0.c.soft:(lum>128?t0.c.bg:t0.c.ink);html='<style>#vwp-tablet{--c-on-accent:'+on.toUpperCase()+'}</style>'+html;}
 if(isLight(t0.c))html=html.replace('id="vwp-tablet"','id="vwp-tablet" data-polarity="light"');
 if(t.id==='brass'&&!t.glass&&!url&&!fontCss(player,t0)&&!liveFor(player,t0)&&fxFor(player,t0).kind==='none')return '<!--slth-->'+TOKENS_CSS+ch+html;
 const m=mapFor(t);
 let out=html.replace(/#([0-9a-f]{6})([0-9a-fA-F]{2})?(?![0-9a-zA-Z_-])/g,(all,h,al)=>{const r=m.get('#'+h);if(!r)return all;return r.out+(al||r.alpha||'');});
 const extra=(t.glass||t.blur?`<style>#vwp-tablet{${t.blur?`backdrop-filter:blur(${t.blur}px);-webkit-backdrop-filter:blur(${t.blur}px);`:''}}</style>`:'');
 out=out.replace('<div class="vwp-screen">',snowCaps(player,t0)+ambient(t,player)+'<div class="vwp-screen">'+liveLayer(player,t0));
 return '<!--slth-->'+TOKENS_CSS.replace(/#([0-9a-f]{6})(?![0-9a-zA-Z_-])/g,(all,h)=>{const r=m.get('#'+h);return r?r.out+(r.alpha||''):all;})+ch+extra+out;}
// share codes: SLATE-THEME:<base64 json>
export function shareCode(t){const j=JSON.stringify({n:t.name,c:ROLES.map(([k])=>t.c[k].slice(1)).join(''),g:t.glass,b:t.blur,a:t.ambient});
 try{return 'SLATE-THEME:'+btoa(unescape(encodeURIComponent(j)));}catch(e){return 'SLATE-THEME:'+j;}}
// --- ops (planLoom op:'theme…') ---
export function themeOp(ctx,p,d){if(/^themeWorld/.test(String(d.op)))return worldThemeOp(ctx,p,d);const s=p.state,mine=Array.isArray(s.slateThemesMine)?s.slateThemesMine.map(t=>cleanTheme(t)).filter(Boolean):[];
 const find=id=>SHIPPED.find(t=>t.id===id)||mine.find(t=>t.id===id);
 if(d.op==='themeSet'){s.slateWTPreview=null;if(find(d.id)){s.slateTheme=d.id;s.slateThemeCal=false;}return false;}
 if(d.op==='themeGroup'){s.slateThemeGroup=['all','season','holiday','mine'].includes(d.g)?d.g:'all';return false;}
 if(d.op==='themeFx'){const f={...(s.slateFx||{})};if(d.kind!=null&&(d.kind==='theme'||AMBIENTS.includes(d.kind)))f.kind=d.kind;for(const k of ['density','size','speed'])if(d[k]!=null)f[k]=Math.max(0,Math.min(100,Math.round(+d[k]||0)));if(d.settle!=null)f.settle=!!d.settle;s.slateFx=f;return false;}
 if(d.op==='themeLive'){s.slateWallLive=!!d.on;return false;}
 if(d.op==='themeGlass'){s.slateGlass=d.v==null||d.v==='theme'?null:Math.max(0,Math.min(100,Math.round(+d.v||0)));return false;}
 if(d.op==='themeFont'){const v=String(d.v||'theme');if(v==='theme'||FONTS.some(f=>f.id===v))s.slateFont=v;return false;}
 if(d.op==='themeWall'){const v=String(d.v||'');s.slateWall=v==='theme'||v==='none'||ALLW().some(w=>w.id===v)||SAFEURL.test(v)?v:'theme';return false;}
 if(d.op==='themeWallDim'){s.slateWallDim=Math.max(0,Math.min(90,Math.round(+d.v||0)));return false;}
 if(d.op==='themeLed'){if(d.v===null||d.v==='')s.slateHomeLed=null;else if(/^#[0-9a-fA-F]{6}$/.test(d.v||''))s.slateHomeLed=String(d.v).toUpperCase();if(d.glow!=null)s.slateHomeGlow=Math.max(0,Math.min(100,Math.round(+d.glow||0)));if(d.pulse!=null)s.slateHomePulse=!!d.pulse;if(d.rate!=null)s.slateHomeRate=Math.max(.6,Math.min(8,Math.round((+d.rate||2.6)*10)/10));if(d.low!=null)s.slateHomeLow=Math.max(20,Math.min(90,Math.round(+d.low||20)));return false;}
 if(d.op==='themeHomeSymbol'){s.slateHomeSymbol=!!d.on;return false;}
 if(d.op==='themeFooter'){setSide(ctx,p,d);return false;}
 if(d.op==='themeHome'){if(HOMES.some(h=>h[0]===d.v))s.slateHome=d.v;return false;}
 if(d.op==='themeAccent'){if(d.v==null)delete s.slateAccent;else if(HEX.test(String(d.v)))s.slateAccent=String(d.v).toLowerCase();return false;}
 if(d.op==='themeCal'){s.slateThemeCal=!!d.on;return false;}
 if(d.op==='themeEdit'){if(d.on===false){s.slateThemeEditing=false;s.slateThemeDraft=null;return false;}const from=find(d.from)||activeTheme(ctx,p);
  const isMine=mine.some(t=>t.id===from.id);s.slateThemeDraft={...cleanTheme(from),id:isMine?from.id:'mine-'+Math.floor(ctx.now()).toString(36),name:isMine?from.name:(from.id==='brass'?'My theme':from.name+' (mine)')};s.slateThemeEditing=true;return false;}
 if(d.op==='themeDraft'){const t=cleanTheme(s.slateThemeDraft||activeTheme(ctx,p));if(d.k&&ROLES.some(([k])=>k===d.k)&&HEX.test(String(d.v)))t.c[d.k]=String(d.v).toLowerCase();
  if(d.glass!=null)t.glass=Math.max(0,Math.min(100,Math.round(+d.glass||0)));if(d.blur!=null)t.blur=Math.max(0,Math.min(30,Math.round(+d.blur||0)));if(AMBIENTS.includes(d.ambient))t.ambient=d.ambient;if(d.name!=null)t.name=String(d.name).replace(/[<>"]/g,'').slice(0,32)||'My theme';
  s.slateThemeDraft=t;s.slateThemeEditing=true;return false;}
 if(d.op==='themeSave'){const t=cleanTheme(d.theme||s.slateThemeDraft,'mine-'+Math.floor(ctx.now()).toString(36));if(!t)return false;if(d.theme)t.id='mine-'+Math.floor(ctx.now()).toString(36);
  const i=mine.findIndex(x=>x.id===t.id);if(i>=0)mine[i]=t;else mine.push(t);s.slateThemesMine=mine.slice(-24);s.slateTheme=t.id;s.slateThemeCal=false;s.slateThemeEditing=false;s.slateThemeDraft=null;s.slateThemeGroup='mine';return false;}
 if(d.op==='themeDel'){s.slateThemesMine=mine.filter(t=>t.id!==d.id);if(s.slateTheme===d.id)s.slateTheme='brass';return false;}
 return false;}
// --- the THEMES fold in settings ---
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const U=h=>String(h).toUpperCase();
const J=o=>esc(`sendAction('planLoom',${JSON.stringify(o)})`);
function mini(t,on){const c=t.c,g=t.glass/100,bgA=g?Math.round((1-g)*255).toString(16).padStart(2,'0').toUpperCase():'';
 const behind=g?`background:linear-gradient(135deg,#3B2A4A,#1E3A44 45%,#5A3B22);`:'';
 const bar=(w,col)=>`<div style="height:3px;width:${w}%;background:${U(col)};border-radius:2px;opacity:.85"></div>`;
 const col=(k)=>`<div style="flex:1;background:${U(c.panel)}${g?'CC':''};border:1px solid ${U(c.line)};border-radius:3px;padding:4px;display:flex;flex-direction:column;gap:3px">${bar(70,k)}${bar(90,c.dim)}${bar(55,c.dim)}</div>`;
 return `<div style="${behind}border-radius:9px;padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:linear-gradient(160deg,${U(c.bezel)}${bgA},${U(c.bg)}${bgA});border-radius:9px;padding:6px;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;box-shadow:0 0 0 1px ${U(c.accent)}${on?'':'66'}${on?`,0 0 0 3px ${U(c.glow)}55`:''}">
  <div style="display:flex;align-items:center;gap:4px"><span style="width:5px;height:5px;border-radius:50%;background:${U(c.glow)}"></span><span style="height:2px;flex:1;border-top:1px solid ${U(c.accent)}88"></span></div>
  <div style="flex:1;display:flex;gap:4px;background:${U(c.bg)}${bgA};border-radius:5px;padding:4px">${col(c.accent)}${col(c.glow)}${col(c.soft)}</div></div></div>`;}
export function themesView(ctx,player){const s=player?.state||{},act=activeTheme(ctx,player),mine=(s.slateThemesMine||[]).map(t=>cleanTheme(t)).filter(Boolean),grp=s.slateThemeGroup||'all';
 const dim='#8a9aa0',line='#2c3b4c',ink='#d9e0d9',btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:5px 11px;font-size:11.5px;border-radius:6px`;
 const all=[...SHIPPED,...mine].filter(t=>grp==='all'||(grp==='mine'?t.group==='mine':t.group===grp));
 const seg=(g,l)=>`<button onclick="${J({op:'themeGroup',g})}" style="background:${grp===g?'#223246':'transparent'};border:none;border-radius:14px;color:${grp===g?'#ffd79a':dim};cursor:pointer;padding:5px 13px;font-size:11.5px;letter-spacing:.06em">${l}</button>`;
 const card=t=>{const on=!s.slateThemeEditing&&act.id===t.id;return `<div style="display:flex;flex-direction:column;gap:6px"><button onclick="${J({op:'themeSet',id:t.id})}" title="use ${esc(t.name)}" style="background:none;border:none;padding:0;cursor:pointer;text-align:left">${mini(t,on)}</button>
  <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${on?'#ffd79a':ink}">${on?'<span style="color:#53d9e5">●</span>':''}<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>${t.ambient!=='none'?`<span title="${t.ambient}" style="color:${dim};font-size:10px">${t.ambient==='snow'?'❄':'❦'}</span>`:''}${t.glass?`<span title="glass" style="color:${dim};font-size:10px">◌</span>`:''}${t.group==='mine'?`<button title="edit" onclick="${J({op:'themeEdit',from:t.id})}" style="background:none;border:none;color:${dim};cursor:pointer;font-size:11px">✎</button><button title="delete" onclick="${J({op:'themeDel',id:t.id})}" style="background:none;border:none;color:#b0503a;cursor:pointer;font-size:11px">×</button>`:''}</div></div>`;};
 const grid=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><span style="font-size:11px;color:${dim}">same slate, a different atmosphere.</span><span style="flex:1"></span><div style="display:flex;background:#0a121e;border:1px solid ${line};border-radius:16px;padding:2px">${seg('all','All')}${seg('season','Seasons')}${seg('holiday','Holidays')}${seg('os','iPadOS')}${seg('mine','Mine')}</div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px">${all.map(card).join('')||`<div style="font-size:11.5px;color:${dim};padding:14px 0">none of your own yet. make one below.</div>`}</div>`;
 const acc=`<div style="display:flex;align-items:center;gap:12px;margin:14px 0 0;padding:10px 0 0;border-top:1px solid ${line}"><input type="color" aria-label="Accent colour" value="${U(act.c.accent)}" onchange="${esc(`sendAction('planLoom',{op:'themeAccent',v:this.value})`)}" style="width:30px;height:30px;border:1px solid ${line};border-radius:50%;padding:0;background:none;cursor:pointer;overflow:hidden;flex:none"><span style="flex:1"><span style="font-size:12px">Accent colour</span><span style="display:block;font-size:10.5px;color:${dim}">${s.slateAccent?'your own, laid over every theme':'the theme’s own · pick any colour to lay yours over it'}</span></span>${s.slateAccent?`<button onclick="${J({op:'themeAccent',v:null})}" style="${btn}">↺ theme’s own</button>`:''}</div>`;
 const cal=`<label style="display:flex;align-items:center;gap:10px;margin:14px 0 0;padding:10px 0 0;border-top:1px solid ${line};cursor:pointer"><input type="checkbox" ${s.slateThemeCal?'checked':''} onchange="${esc(`sendAction('planLoom',{op:'themeCal',on:this.checked})`)}" style="accent-color:#a37d45;width:15px;height:15px"><span style="flex:1"><span style="font-size:12px">Follow the calendar</span><span style="display:block;font-size:10.5px;color:${dim}">winter, spring, summer, autumn, and christmas or halloween when they come round${s.slateThemeCal?` · now: ${esc(act.name)}`:''}</span></span></label>`;
 const D=s.slateThemeEditing&&s.slateThemeDraft?cleanTheme(s.slateThemeDraft):null;
 let make;
 if(!D)make=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button onclick="${J({op:'themeEdit',from:act.id})}" style="${btn};border-color:#a37d45;color:#ffd79a">＋ start from ${esc(act.name)}</button>
   <input id="sl-th-paste" placeholder="paste a theme code…" onkeydown="event.stopPropagation()" style="flex:1;min-width:160px;background:#0a121e;border:1px solid ${line};color:${ink};font:11.5px monospace;padding:6px 8px;border-radius:6px">
   <button onclick="${esc(`var i=document.getElementById('sl-th-paste'),v=(i.value||'').trim().replace(/^SLATE-THEME:/,'');try{var j;try{j=JSON.parse(decodeURIComponent(escape(atob(v))))}catch(e){j=JSON.parse(v)}var R=${JSON.stringify(ROLES.map(r=>r[0]))},c={};R.forEach(function(k,n){c[k]='#'+String(j.c).slice(n*6,n*6+6)});sendAction('planLoom',{op:'themeSave',theme:{name:j.n,c:c,glass:j.g,blur:j.b,ambient:j.a}});i.value='';i.placeholder='added to mine ✓'}catch(e){i.value='';i.placeholder='that code didn\\'t read, check it copied whole'}`)}" style="${btn}">⧉ paste code</button></div>`;
 else{const sw=ROLES.map(([k,l])=>`<label style="display:flex;flex-direction:column;align-items:center;gap:5px;font-size:10.5px;color:${dim};cursor:pointer"><input type="color" value="${U(D.c[k])}" onchange="${esc(`sendAction('planLoom',{op:'themeDraft',k:'${k}',v:this.value})`)}" style="width:38px;height:38px;border:1px solid ${line};border-radius:50%;padding:0;background:none;cursor:pointer;overflow:hidden">${l}</label>`).join('');
  const slider=(k,l,max,v)=>`<div style="display:flex;align-items:center;gap:10px;font-size:11.5px"><span style="width:44px">${l}</span><input type="range" min="0" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'${k==='blur'?'px':'%'}'" onchange="${esc(`sendAction('planLoom',{op:'themeDraft',${k}:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:38px;text-align:right;color:#ffd79a">${v}${k==='blur'?'px':'%'}</span></div>`;
  const amb=AMBIENTS.map(a=>`<button onclick="${J({op:'themeDraft',ambient:a})}" style="background:${D.ambient===a?'#223246':'transparent'};border:none;border-radius:12px;color:${D.ambient===a?'#ffd79a':dim};cursor:pointer;padding:4px 12px;font-size:11.5px">${a}</button>`).join('');
  const code=shareCode(D);
  make=`<div style="font-size:10.5px;color:#53d9e5;margin-bottom:10px">live: the whole slate is wearing this draft while you edit.</div>
  <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">${sw}</div>
  <div style="display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start">
   <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px">${slider('glass','Glass',100,D.glass)}${slider('blur','Blur',30,D.blur)}</div>
   <div><div style="font-size:11px;color:${dim};margin-bottom:5px">Ambient</div><div style="display:flex;background:#0a121e;border:1px solid ${line};border-radius:14px;padding:2px">${amb}</div></div></div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px">
   <input value="${esc(D.name)}" maxlength="32" onkeydown="event.stopPropagation()" onchange="${esc(`sendAction('planLoom',{op:'themeDraft',name:this.value})`)}" style="width:150px;background:#0a121e;border:1px solid ${line};color:${ink};font-size:12px;padding:6px 8px;border-radius:6px">
   <button onclick="${J({op:'themeSave'})}" style="${btn};background:#a37d45;border-color:#a37d45;color:#111b2c;font-weight:700">save</button>
   <button onclick="${J({op:'themeEdit',on:false})}" style="${btn}">discard</button>
   <span style="flex:1"></span>
   <input readonly value="${esc(code)}" onclick="this.select()" title="share code: anyone can paste it into their slate" style="width:180px;background:#0a121e;border:1px solid ${line};color:#9fe3ea;font:10.5px monospace;padding:6px 8px;border-radius:6px">
   <button onclick="${esc(`var i=this.previousElementSibling;i.select();try{navigator.clipboard.writeText(i.value)}catch(e){};try{document.execCommand('copy')}catch(e){};this.textContent='copied ✓'`)}" style="${btn}">⇪ share code</button></div>`;}
 return worldBlock(ctx,player,act)+grid+acc+cal+`<div style="margin-top:18px"><div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin-bottom:10px">MAKE YOUR OWN</div>${make}</div>`;}
// --- THIS WORLD: the theme read from the world, its suggestion, its old versions ---
function worldBlock(ctx,player){const s=player?.state||{},S=worldThemeState(ctx),cur=worldTheme(ctx),pend=worldTheme(ctx,'pending'),dim='#8a9aa0',line='#2c3b4c',ink='#d9e0d9';
 const btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:5px 11px;font-size:11.5px;border-radius:6px`,gold=`${btn};background:#a37d45;border-color:#a37d45;color:#111b2c;font-weight:700`;
 const head=`<div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin-bottom:10px;display:flex;align-items:center;gap:8px">THIS WORLD<span style="flex:1;border-top:1px solid ${line}"></span></div>`;
 if(!cur)return `<div style="margin-bottom:18px">${head}<div style="font-size:11.5px;color:${dim};display:flex;align-items:center;gap:10px">slate hasn't read this world's look yet.<button onclick="${J({op:'themeWorldCheck'})}" style="${btn}">read it now</button></div></div>`;
 const using=s.slateTheme==='world'&&!s.slateThemeCal&&!s.slateWTPreview,pv=s.slateWTPreview;
 const sw=t=>`<div style="display:flex;gap:3px">${['bg','panel','accent','soft','glow','ink'].map(k=>`<span title="${k}" style="width:13px;height:13px;border-radius:50%;background:${U(t.c[k])};box-shadow:0 0 0 1px #FFFFFF22"></span>`).join('')}</div>`;
 const wallImg=t=>t.wall?`<img src="${esc(t.wall)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:9px;display:block">`:'';
 const thumb=(t,on)=>t.wall?`<div style="position:relative">${wallImg(t)}<div style="position:absolute;left:30%;right:6%;bottom:7%;opacity:.95">${mini(t,on)}</div></div>`:mini(t,on);
 const banner=pv?`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:8px 12px;border:1px solid #53d9e5;border-radius:8px;background:#53d9e522"><span style="color:#53d9e5;font-size:12px;flex:1">previewing ${pv==='pending'?'the suggestion':'an older version'}: the whole slate is wearing it.</span>${pv==='pending'?`<button onclick="${J({op:'themeWorldApply'})}" style="${gold}">apply</button>`:`<button onclick="${J({op:'themeWorldRestore',i:+pv.slice(1)})}" style="${gold}">restore it</button>`}<button onclick="${J({op:'themeWorldPreview',on:false})}" style="${btn}">back</button></div>`:'';
 const main=`<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
  <div style="flex:0 0 230px;max-width:100%">${thumb(cur,using)}</div>
  <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:7px">
   <div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px;color:${using?'#ffd79a':ink}">${using?'<span style="color:#53d9e5">●</span> ':''}${esc(cur.name)}</span>${cur.ambient!=='none'?`<span style="color:${dim};font-size:11px">${cur.ambient==='snow'?'❄ snow':'❦ leaves'}</span>`:''}</div>
   ${sw(cur)}
   <div style="font-size:10.5px;color:${dim};line-height:1.5">read from ${esc(cur.src||'this world')}${cur.day?` · ${esc(cur.day)}`:''}${cur.why?` · ${esc(cur.why)}`:''}</div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">${using?`<span style="font-size:11.5px;color:#53d9e5;padding:5px 0">in use</span>`:`<button onclick="${J({op:'themeWorldUse'})}" style="${gold}">use this world's theme</button>`}
    <button onclick="${J({op:'themeWorldPaint',which:'cur'})}" title="savi paints a wallpaper of this world in this theme" style="${btn};border-color:#b48cff;color:#d9c8ff">✦ savi, paint ${cur.wall?'a new':'the'} wallpaper</button>
    <button onclick="${J({op:'themeWorldCheck'})}" title="read the world again and suggest a fresh take" style="${btn}">↻ suggest a fresh take</button></div>
   ${s.slateWTPaintMsg?`<div style="font-size:10.5px;color:#b48cff">${esc(s.slateWTPaintMsg)}</div>`:''}</div></div>`;
 const sug=pend?`<div style="margin-top:14px;padding:10px 12px;border:1px solid #ffb45488;border-left:3px solid #ffb454;border-radius:8px;background:#ffb45412;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
  <div style="flex:0 0 150px">${thumb(pend,pv==='pending')}</div>
  <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px"><div style="font-size:10px;letter-spacing:.16em;color:#ffb454">${s.slateWTNew?'● ':''}SUGGESTED UPDATE</div><div style="font-size:13px;color:${ink}">${esc(pend.name)}</div>${sw(pend)}<div style="font-size:10.5px;color:${dim}">${esc(pend.why||'')}</div>
   <div style="display:flex;gap:6px;flex-wrap:wrap">${pv==='pending'?`<button onclick="${J({op:'themeWorldPreview',on:false})}" style="${btn}">stop preview</button>`:`<button onclick="${J({op:'themeWorldPreview',which:'pending'})}" style="${btn};border-color:#53d9e5;color:#9fe3ea">preview</button>`}<button onclick="${J({op:'themeWorldApply'})}" style="${gold}">apply</button><button onclick="${J({op:'themeWorldDecline'})}" style="${btn}">not now</button></div></div></div>`:'';
 const V=Array.isArray(S?.versions)?S.versions:[];
 const vers=V.length?`<div style="margin-top:14px"><div style="font-size:10px;letter-spacing:.16em;color:${dim};margin-bottom:8px">OLDER VERSIONS · ${V.length}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">${V.map((t,i)=>{const on=pv==='v'+i;return t&&t.c?`<div style="display:flex;flex-direction:column;gap:4px"><button onclick="${J({op:'themeWorldPreview',which:'v'+i})}" title="preview" style="background:none;border:none;padding:0;cursor:pointer">${mini({...t,glass:t.glass||0},on)}</button><div style="display:flex;align-items:center;gap:4px;font-size:10.5px;color:${on?'#ffd79a':dim}"><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name||'')}${t.retired?' · '+esc(String(t.retired).slice(5)):''}</span><button onclick="${J({op:'themeWorldRestore',i})}" title="restore this version" style="background:none;border:none;color:#c9a56a;cursor:pointer;font-size:11px">↺</button></div></div>`:'';}).join('')}</div></div>`:'';
 return `<div style="margin-bottom:20px">${head}${banner}${main}${sug}${vers}</div>`;}
// --- wallpapers + home button (per player) ---
const W=(id,name,full,thumb)=>({id,name,full,thumb});
export const WALLS=[
 W('brass','Camper window','/cdn/value.ed288745f00382450f6d030f634107a6e15c59260bfa39ca25e1bd143e1d1a7b.webp','/cdn/value.3c1e3ddaf9e2a4cb274d3f96c997609b27e47ddb519aa0b47a5baffcd8f4d434.webp'),
 W('glass','Mist lake','/cdn/value.6b220bc802e44a3c68d1ddd789a0080333ed38f508d18d83b27754a90a094cbf.webp','/cdn/value.032506fb70c7d4d3a5f73c180b2df2c7b471059c8de2c0e219c4e294390d9b7d.webp'),
 W('linen','Linen','/cdn/value.3ac4c520cb7d809c63481ae3a32db59c33329d4ab07b26f653828e6dd1b52a6e.webp','/cdn/value.64570e482db9c1aec40e47ef579af769c17485fb204df8faa02a6c52b888b0ae.webp'),
 W('winter','Snow valley','/cdn/value.20925e6ba1bb48e3aab458b19dbe1f685daa52acd73b76418c764a1854bbdb56.webp','/cdn/value.e281bf9642b322ae5b3a60c5b99cc3044f38037e77aacbf9365a488c4a1bdb56.webp'),
 W('spring','Blossom pond','/cdn/value.3c248956f5063bb83a0d1268e254a35fd78a6f7e8c2ae9ac17a92c4388ee8612.webp','/cdn/value.05d1a8b47d457de6eeadf968d4f04a9bf250181cdc6a78f152f33cdcee19980c.webp'),
 W('summer','Coast','/cdn/value.bd004cce306102a545c9ad7f6d73f67926f2422ad5a56395183fb34be96a6947.webp','/cdn/value.26c0313d25e59934446ff9a93cfc61ded19ca2643b2fc9a137be04efa8805138.webp'),
 W('autumn','Amber river','/cdn/value.d7909c2379210f2fd6491155b7fcd66a3030054df726fb49b9b007b49e803d4c.webp','/cdn/value.f3fe5ba567aae6372ad3281610c1071d5d692479ff6e0b9c83127d8131eec2c1.webp'),
 W('christmas','Lit village','/cdn/value.3ac5aa7d0ae457c92e99c5f5abe691fa94de00383f75fbc81ff2e8ba4d68527e.webp','/cdn/value.2fd0857a1812ba8bbfa8f6de01167cfe408a880211cb3d8cc643b3ce02e6016b.webp'),
 W('halloween','Moon marsh','/cdn/value.751eda8d514a809361fa967cd4178a339d0de248075c6be8b870e4a1d90e7343.webp','/cdn/value.e5d6a9d3ff587012d9ec7a2bed806df6b0a930528d66864de47142ab0d100abf.webp'),
 W('nebula','Lavender field','/cdn/value.7611bd900f923b8d9247bcda8e27b03179111aad38a98b8f8e0ea82eb36d15c5.webp','/cdn/value.983888a2d037d27f8514a70f0e98cb983cf171d7f9d41bfd9ab2be4f2e1427cd.webp'),
 W('dunes','Dunes','/cdn/value.35eda12dd0848cd558217bdf1dca86589963c524feb2f28aebf151f76476c14f.webp','/cdn/value.3aba4b78eef6a0b28af14e7cdd9def4eb5ceaabdfb223f71d3d08bb98b259310.webp'),
 W('ocean','Night sea','/cdn/value.dd1f32313fd274b32a36909e21683cdebf8f8d594b315784b36d834af068aef9.webp','/cdn/value.40a8c978b3d091859d9e2165d2deadc842006147e4a401b627fa9d55f18f4e39.webp'),
];
export const TEXTURES=[
 W('tx-slate','Slate stone','/cdn/value.d56180b224d3741526fa4468564e5460b5203d867d82069c70a9801402e74b08.webp','/cdn/value.c4206c8364803fc6d19705243981e22a29fcf17053c97e2aa53e6df74aed87ac.webp'),
 W('tx-paper','Cotton paper','/cdn/value.8e3d7f5cbaef6211061c984693fd1e6dea784b3cba16aad004dfdd82dd6fb90c.webp','/cdn/value.98fdb74d392d577789e946c289cead6f43e091f4542e1d19946f0ec07ce72624.webp'),
 W('tx-moss','Moss','/cdn/value.18f5ad8fee8b65d27aa3c3671f9eefc070600059a16abfec4bc66975a541346b.webp','/cdn/value.b09dae879aeb4bf9e667095ac7b765edd300f9f3d81add053c76d8c877e62da0.webp'),
 W('tx-wood','Walnut','/cdn/value.5f3aa44ab45385c4104605c0fb477fc932cf30a0bd372b3b8e0c1b547b1e2b63.webp','/cdn/value.f9a4055aebee23f180a555c063b086f7445d9b5103a86d7d6e01196321f41ff6.webp'),
 W('tx-sand','Raked sand','/cdn/value.b960d5b6bbac1fac57e89873418a32b195326fe64905e6dc4bd4b788c6722161.webp','/cdn/value.1b139603d7271a7a2ab1d963d998e35f98f5703f07829b14b69863860ca47a7e.webp'),
 W('tx-marble','Charcoal marble','/cdn/value.b02973a966134598eb0172dc7f8d58eb37d1afd82bebcd397194081c5dc08622.webp','/cdn/value.6ba5ebee0a2e15152888f50c30bfb690e5e5051724f4f5d40c9e2c44a8c9d081.webp'),
 W('tx-concrete','Concrete','/cdn/value.1ec245036812855fbef8885c9898184c049bd130ef1537eacfb5e23222c9a31b.webp','/cdn/value.a9a07e1c4f651ef55f3e01b39a18de4028a8882efe2e0eb603cfb2fd511e4498.webp'),
 W('tx-bark','Birch bark','/cdn/value.d2ffa200ef2c24801a578f5c698ef15d3379518284702b7f87b0e601878f46da.webp','/cdn/value.bbe4926bb2ad429a019bb33f95f6ca5f048d34db16a09b7279254dfe48180a5f.webp'),
 W('tx-kraft','Kraft','/cdn/value.881c4e5075e8c1f1f17090763d7ac632b27af533f7ceba0559496156221c31b3.webp','/cdn/value.a2bea929419c79fd292343d289f3be77c3163a68a031b6d0e8e20d60f0c2ea2e.webp'),
 W('tx-water','Still water','/cdn/value.791f9952d004529e3980bf59ee4c45ab1d67d0b89a8e9d3a610d938b866f5082.webp','/cdn/value.5c782902ca4e00c5fe5846dd1bf93ea305081af2e9083f11d85c38c6009a949a.webp'),
];
const ALLW=()=>[...WALLS,...TEXTURES];
export const HOMES=[['icon','Icon only'],['circle','Circle'],['ring','Ring'],['bar','Bar'],['square','Square'],['none','Hidden']];
const SAFEURL=/^(\/cdn\/|https:\/\/)[^"'()<>\s\\]{4,400}$/;
// which picture: 'theme' follows the theme, 'none', a wall id, or a gallery/custom url
export function wallFor(player,t){const s=player?.state||{},w=s.slateWall||'theme';
 if(w==='none')return null;if(w==='theme'){if(t.group==='world')return SAFEURL.test(String(t.wall||''))?t.wall:null;return WALLS.find(x=>x.id===t.id)?.full||(t.group==='mine'||t.group==='os'?null:WALLS[0].full);}
 if(SAFEURL.test(w))return w;return ALLW().find(x=>x.id===w)?.full||null;}
export function wallDim(player){const v=player?.state?.slateWallDim;return v==null?45:Math.max(0,Math.min(90,Math.round(+v||0)));}
function chrome(player,t){const s=player?.state||{},url=wallFor(player,t),dim=wallDim(player),fc=fontCss(player,t),A=t.c.accent.toUpperCase(),D=t.c.dim.toUpperCase(),L=t.c.line.toUpperCase(),B=t.c.bezel.toUpperCase();
 let css=fc;
 if(liveFor(player,t))css+=`#vwp-tablet .vwp-screen{position:relative;isolation:isolate}.sl-home{background:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,${(dim/200).toFixed(2)}))!important}#vwp-tablet:not(.cam) .vwp-screen{background:transparent!important}`;
 if(url&&!liveFor(player,t)){const o=(dim/100).toFixed(2);css+=`#vwp-tablet:not(.cam) .vwp-screen,.sl-wallable{background:linear-gradient(rgba(0,0,0,${o}),rgba(0,0,0,${o})),url("${url}") center/cover no-repeat!important}.sl-home{background:linear-gradient(rgba(0,0,0,${(dim/200).toFixed(2)}),rgba(0,0,0,${(dim/130).toFixed(2)})),url("${url}") center/cover no-repeat!important}`;}
 if(!url&&s.slateWallDim!=null&&dim>0)css+=`#vwp-tablet:not(.cam) .vwp-screen{background-image:linear-gradient(rgba(0,0,0,${(dim/100).toFixed(2)}),rgba(0,0,0,${(dim/100).toFixed(2)}))!important}`;
 return css?`<style>${css}</style>`:'';}
export function homeShape(player){const raw=player?.state?.slateHome,v=raw==='dot'?'icon':raw;return HOMES.some(h=>h[0]===v)?v:'circle';}
export function wallsView(ctx,player,shots){const s=player?.state||{},cur=s.slateWall||'theme',t=activeTheme(ctx,player),dim='#8a9aa0',line='#2c3b4c',ink='#d9e0d9',dimV=wallDim(player);
 const tile=(v,label,thumb,extra='')=>{const on=cur===v;return `<div style="display:flex;flex-direction:column;gap:6px"><button onclick="${J({op:'themeWall',v})}" title="${esc(label)}" style="aspect-ratio:16/10;width:100%;border-radius:8px;cursor:pointer;padding:0;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;border:1.5px solid ${on?'#a37d45':line};box-shadow:${on?'0 0 0 3px #a37d4533':'none'};background:${thumb?`#0a121e url('${esc(thumb)}') center/cover`:'#0a121e'}">${extra}</button><span style="font-size:11.5px;color:${on?'#ffd79a':ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${on?'<span style="color:#53d9e5">●</span> ':''}${esc(label)}</span></div>`;};
 const match=WALLS.find(w=>w.id===t.id);
 const grid=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px">
  ${tile('theme','Match theme',match?.thumb,`<span style="width:100%;font-size:10px;color:#FFFFFF;background:#00000080;padding:3px 0">follows ${esc(t.name)}</span>`)}
  ${tile('none','None','',`<span style="margin:auto;font-size:11px;color:${dim}">plain</span>`)}
  ${WALLS.map(w=>tile(w.id,w.name,w.thumb)).join('')}</div>`;
 const tex=`<div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin:18px 0 10px">TEXTURES</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">${TEXTURES.map(w=>tile(w.id,w.name,w.thumb)).join('')}</div>`;
 const snaps=(shots||[]).filter(x=>x&&SAFEURL.test(x.url||'')).slice(0,8);
 const mine=snaps.length?`<div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin:18px 0 10px">FROM YOUR GALLERY</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">${snaps.map(x=>tile(x.url,'snap '+new Date(x.at||0).toISOString().slice(5,10),x.url)).join('')}</div>`:`<div style="font-size:11px;color:${dim};margin-top:14px">take a snap with the camera and it can be your background too.</div>`;
 const dimRow=`<div style="display:flex;align-items:center;gap:12px;margin-top:18px;padding-top:12px;border-top:1px solid ${line};font-size:12px"><span style="width:110px">Darken</span><input type="range" min="0" max="90" value="${dimV}" oninput="this.nextElementSibling.textContent=this.value+'%'" onchange="${esc(`sendAction('planLoom',{op:'themeWallDim',v:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${dimV}%</span></div><div style="font-size:10.5px;color:${dim};margin-top:4px">dims the picture, or whatever shows through the glass. home shows it brightest.</div>`;
 const liveRow=`<label style="display:flex;align-items:center;gap:10px;margin:0 0 14px;cursor:pointer"><input type="checkbox" ${s.slateWallLive?'checked':''} onchange="${esc(`sendAction('planLoom',{op:'themeLive',on:this.checked})`)}" style="accent-color:#a37d45;width:15px;height:15px"><span><span style="font-size:12px">Live wallpaper</span><span style="display:block;font-size:10.5px;color:${dim}">the painted ones move: mist, snow, waves. muted, looping. gallery snaps stay still.</span></span></label>`;
 return `<div style="font-size:11px;color:${dim};margin-bottom:12px">the picture behind slate. match follows whichever theme you're wearing.</div>`+liveRow+grid+tex+mine+dimRow+glassRow(ctx,player);}
export function homeFace(ctx,player,shape=homeShape(player),preview=false){
 const t=activeTheme(ctx,player),s=player?.state||{},h=HOMES.some(x=>x[0]===shape)?shape:'circle',a=t.c.accent,d=t.c.dim,b=t.c.bezel,l=t.c.line,low=h==='bar';
 const styles={circle:'width:26px;height:26px;border-radius:50%;border:2px solid '+l+';background:'+b,ring:'width:26px;height:26px;border-radius:50%;border:1.5px solid '+a+';background:transparent',square:'width:26px;height:26px;border-radius:7px;border:1.5px solid '+l+';background:'+b,bar:'width:40px;height:5px;border-radius:3px;background:'+d,icon:'display:none',none:'display:none'};
 const led=/^#[0-9a-f]{6}$/i.test(s.slateHomeLed||'')?s.slateHomeLed:null,g=Math.max(0,Math.min(100,s.slateHomeGlow??60)),r=Math.round(2+g/8),alpha=Math.min(255,Math.round(40+g*2)).toString(16).padStart(2,'0'),rate=Math.max(.4,Math.min(8,s.slateHomeRate??2.6));
 const glow=led&&h!=='none'?`;border-color:${led};box-shadow:0 0 ${r}px ${led}${alpha},0 0 ${Math.round(r/2)}px ${led}${alpha} inset${low?';background:'+led:''}`:'';
 return `<span class="sl-home-face sl-home-${h}" data-home-shape="${h}" aria-hidden="true" style="width:44px;height:44px;position:relative;display:block;pointer-events:none;${h==='none'?'opacity:'+(preview?'.3':'0')+';':''}"><span class="sl-home-surface" style="position:absolute;box-sizing:border-box;left:50%;top:${low?'32px':'50%'};transform:translate(-50%,-50%);${styles[h]}${glow};${s.slateHomePulse&&!['none','icon'].includes(h)?'animation:slHomePulse '+rate+'s ease-in-out infinite;--sl-home-low:'+Math.max(.2,Math.min(1,(s.slateHomeLow??30)/100))+';':''}"></span><svg class="sl-home-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="${s.slateHomeSymbol===false?'display:none;':''}position:absolute;left:50%;top:${low?'15px':'50%'};transform:translate(-50%,-50%);color:${led||t.c.ink||'#d9e0d9'};${led?'filter:drop-shadow(0 0 '+r+'px '+led+alpha+');':''}${s.slateHomePulse?'animation:slHomePulse '+rate+'s ease-in-out infinite;--sl-home-low:'+Math.max(.2,Math.min(1,(s.slateHomeLow??30)/100))+';':''}"><path d="M3 10.5 12 3l9 7.5M5.5 9v12h13V9M10 21v-7h4v7"/></svg></span><style>@keyframes slHomePulse{0%,100%{opacity:1}50%{opacity:var(--sl-home-low,.3)}}#vwp-home:hover .sl-home-none,#vwp-home:focus-visible .sl-home-none{opacity:.6!important}</style>`;
}
export function homeView(ctx,player){const t=activeTheme(ctx,player),cur=homeShape(player),line='#2c3b4c',ink='#d9e0d9',A=t.c.accent.toUpperCase(),D=t.c.dim.toUpperCase(),B=t.c.bezel.toUpperCase(),L=t.c.line.toUpperCase();
 return `<div style="font-size:11px;color:#8a9aa0;margin-bottom:12px">the button at the bottom of the frame that takes you home. colours follow your theme.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px">${HOMES.map(([id,l])=>{const on=cur===id;return `<button onclick="${J({op:'themeHome',v:id})}" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 0 10px;background:none;border:none;cursor:pointer;color:${on?'#ffd79a':ink};font-size:11.5px"><span style="width:100%;height:74px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12px;box-sizing:border-box;border-radius:10px;background:#16233a;border:1.5px solid ${on?'#a37d45':line};box-shadow:${on?'0 0 0 3px #a37d4533':'none'}">${homeFace(ctx,player,id,true)}</span>${on?'<span style="color:#53d9e5">●</span> ':''}${l}</button>`;}).join('')}</div>`+`<label style="display:flex;align-items:center;gap:10px;margin-top:18px;min-height:44px;font-size:12px"><input type="checkbox" aria-label="Show home symbol" ${player.state.slateHomeSymbol!==false?'checked':''} onchange="sendAction('planLoom',{op:'themeHomeSymbol',on:this.checked})">Show home symbol</label><p style="font-size:11px;color:#8a9aa0;margin-top:4px">Only hides the house, not the button or its action. With Icon only, the button becomes invisible but still works.</p>`+ledRow(player)+sideSettings(ctx,player);}

// --- glass amount (per player; null follows the theme, a wallpaper lifts it to 55) ---
export function glassFor(player,t,url){const g=player?.state?.slateGlass;if(g!=null)return Math.max(0,Math.min(100,+g||0));return url?Math.max(t.glass,55):t.glass;}
// --- fonts ---
const F=(id,name,group,stack,gf)=>({id,name,group,stack,gf});
export const FONTS=[
 F('apple','San Francisco','system',`-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Inter",sans-serif`,'Inter:wght@400;600;700'),
 F('android','Roboto','system',`"Roboto","Google Sans",system-ui,sans-serif`,'Roboto:wght@400;500;700'),
 F('windows','Segoe','system',`"Segoe UI Variable","Segoe UI","Selawik",system-ui,sans-serif`,''),
 F('ubuntu','Ubuntu','system',`"Ubuntu","Cantarell",system-ui,sans-serif`,'Ubuntu:wght@400;500;700'),
 F('starbloom','Starbloom','house',`"Jost","Futura","Century Gothic","Trebuchet MS",sans-serif`,'Jost:wght@400;500;700'),
 F('editorial','Editorial','fun',`"Fraunces","Iowan Old Style",Georgia,serif`,'Fraunces:opsz,wght@9..144,400;9..144,600'),
 F('rounded','Rounded','fun',`"Nunito","SF Pro Rounded","Varela Round",system-ui,sans-serif`,'Nunito:wght@400;600;800'),
 F('mono','Terminal','fun',`"Space Mono","SF Mono",Menlo,Consolas,monospace`,'Space+Mono:wght@400;700'),
 F('hand','Notebook','fun',`"Kalam","Segoe Print","Bradley Hand",cursive`,'Kalam:wght@400;700'),
 F('pixel','Pixel','fun',`"Silkscreen","Press Start 2P",monospace`,'Silkscreen:wght@400;700'),
 F('spooky','Crypt','fun',`"Grenze Gotisch","Grenze",Georgia,serif`,'Grenze+Gotisch:wght@400;600'),
 F('festive','Mistletoe','fun',`"Mountains of Christmas","Kalam",cursive`,'Mountains+of+Christmas:wght@400;700'),
];
const THEME_FONT={brass:'starbloom',glass:'apple',linen:'editorial',winter:'android',spring:'rounded',summer:'rounded',autumn:'editorial',christmas:'festive',halloween:'spooky','ipad-light':'apple','ipad-dark':'apple'};
export function fontFor(player,t){const v=player?.state?.slateFont||'theme';const id=v==='theme'?(THEME_FONT[t.id]||null):v;return FONTS.find(f=>f.id===id)||null;}
function fontCss(player,t){const f=fontFor(player,t);if(!f||f.id==='starbloom'&&(player?.state?.slateFont||'theme')==='theme'&&t.id==='brass')return '';
 const imp=f.gf?`@import url("https://fonts.googleapis.com/css2?family=${f.gf}&display=swap");`:'';
 return `${imp}#vwp-tablet,#vwp-tablet *:not([style*="monospace"]):not(code),#vws,#vws *:not([style*="monospace"]):not(code){font-family:${f.stack}!important}`;}
export function fontsView(ctx,player){const t=activeTheme(ctx,player),cur=player?.state?.slateFont||'theme',line='#2c3b4c',ink='#d9e0d9',dim='#8a9aa0',tf=FONTS.find(f=>f.id===THEME_FONT[t.id]);
 const imports=FONTS.filter(f=>f.gf).map(f=>`@import url("https://fonts.googleapis.com/css2?family=${f.gf}&display=swap");`).join('');
 const card=(id,name,stack,sub)=>{const on=cur===id;return `<button onclick="${J({op:'themeFont',v:id})}" style="display:flex;flex-direction:column;gap:4px;text-align:left;cursor:pointer;padding:12px 14px;border-radius:10px;background:#16233a;border:1.5px solid ${on?'#a37d45':line};box-shadow:${on?'0 0 0 3px #a37d4533':'none'};color:${ink}"><span style="font-family:${esc(stack)}!important;font-size:22px;line-height:1.1">Aa Slate</span><span style="font-family:${esc(stack)}!important;font-size:11.5px;color:${dim}">The quick brown fox · 0123</span><span style="font-size:11px;color:${on?'#ffd79a':ink};margin-top:4px">${on?'<span style="color:#53d9e5">●</span> ':''}${esc(name)}${sub?` <span style="color:${dim}">· ${esc(sub)}</span>`:''}</span></button>`;};
 const grp=(g,l)=>`<div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin:16px 0 10px">${l}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px">${FONTS.filter(f=>f.group===g||(g==='system'&&f.group==='house')).map(f=>card(f.id,f.name,f.stack)).join('')}</div>`;
 return `<style>${imports}</style><div style="font-size:11px;color:${dim};margin-bottom:12px">the type the whole slate reads in. match lets each theme bring its own.</div>
 <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px">${card('theme','Match theme',tf?.stack||'inherit',tf?`${t.name}: ${tf.name}`:t.name)}</div>${grp('system','DEVICES')}${grp('fun','FUN')}`;}
export function glassRow(ctx,player){const t=activeTheme(ctx,player),url=wallFor(player,t),v=glassFor(player,t,url),follow=player?.state?.slateGlass==null;
 return `<div style="display:flex;align-items:center;gap:12px;margin-top:14px;font-size:12px"><span style="width:110px">Glass</span><input type="range" min="0" max="100" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'%'" onchange="${esc(`sendAction('planLoom',{op:'themeGlass',v:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${v}%</span></div>
 <div style="display:flex;gap:10px;align-items:center;font-size:10.5px;color:#8a9aa0;margin-top:4px"><span style="flex:1">how much the panels let the picture through, frosted as it rises.</span>${follow?'<span>following theme</span>':`<button onclick="${J({op:'themeGlass',v:'theme'})}" style="background:none;border:1px solid #2c3b4c;border-radius:10px;color:#d9e0d9;cursor:pointer;font-size:10.5px;padding:2px 9px">reset to theme</button>`}</div>`;}

export const LIVE={"linen": "/cdn/value.fb6be912d68b085e79ec06f149b9a4aeb4bfc712338c580c40b100e1ec7132ef.png.curtain-gently-swaying-in-a-soft-breeze-shadows-moving-6-second-loop.mp4", "christmas": "/cdn/value.ffbd548b753989bc44b976e0d7844d9509d9b239486105ce9f8a6f7dc889f6c8.png.snow-falling-and-cottage-windows-softly-flickering-6-second-loop.mp4", "spring": "/cdn/value.50f52e177db10e6806b9126b0a5f9c520540ddc21e32166524b68aafa899d4e4.png.blossom-petals-drifting-down-onto-the-misty-pond-6-second-loop.mp4", "glass": "/cdn/value.64bcae90f474528097aaa1dd70f46051c24804a7187ad6f3f9219109e1c570c5.png.mist-slowly-drifting-over-the-still-lake-gentle-ripples-6-second-loop.mp4", "winter": "/cdn/value.6f8c5ff20733a391502a1e47a770148824d015009df3e4d189af7c22936b6706.png.snow-gently-falling-over-the-pine-valley-6-second-loop.mp4", "brass": "/cdn/value.46cb3a3bd6d1c05915b88a8cf8790019ab03e7607070b9cb135524f3e721f2e6.png.stars-slowly-drifting-past-the-window-lantern-flickering-softly-6-second-loop.mp4", "halloween": "/cdn/value.13c256110938488a4217e31052e750c4649e18af73e5e9aff7f77e2151023fc4.png.fog-rolling-slowly-across-the-marsh-under-the-moon-6-second-loop.mp4", "dunes": "/cdn/value.b2cc881e85b8963ed93f8f9fe3d0748e4ebddcdd9bb8af567f39d56c8199b8a3.png.sand-softly-blowing-off-the-dune-crests-at-dusk-6-second-loop.mp4", "summer": "/cdn/value.9e310e7cbfdd7098fd371e906cfc46d561c9e4d8e9281bf2fe649b4d0edd196a.png.sea-softly-shimmering-and-cypress-trees-swaying-6-second-loop.mp4", "ocean": "/cdn/value.2ab02b55bbbd0736bf4ba96fb4458502d797a72eb3853ea57269ac08e04176de.png.gentle-waves-rolling-and-moonlight-shimmering-on-the-sea-6-second-loop.mp4", "autumn": "/cdn/value.a5c0198c85d01a00b55341407b146e8225aeb0dc17ace283ccccd721f8766dd6.png.leaves-drifting-down-and-river-gently-rippling-6-second-loop.mp4", "nebula": "/cdn/value.80deecfb54afbd9df0febb5352a4c9059b31296a0f2bded57e34a4d31cdd2864.png.asteroids-slowly-tumbling-and-nebula-gently-swirling-6-second-loop.mp4"};
export function liveFor(player,t){const s=player?.state||{};if(!s.slateWallLive)return null;const w=s.slateWall||'theme';const id=w==='theme'?(LIVE[t.id]?t.id:(t.group==='mine'||t.group==='world'?null:'brass')):w;return LIVE[id]||null;}
export function liveLayer(player,t){const v=liveFor(player,t);if(!v)return '';const b=(1-wallDim(player)/100).toFixed(2);
 return `<video class="sl-live" src="${v}" autoplay muted loop playsinline aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;filter:brightness(${b})"></video>`;}

export function effectsView(ctx,player){const t=activeTheme(ctx,player),F=fxFor(player,t),cur=(player?.state?.slateFx||{}).kind||'theme',line='#2c3b4c',dim='#8a9aa0';
 const seg=(v,l)=>`<button onclick="${J({op:'themeFx',kind:v})}" style="background:${cur===v?'#223246':'transparent'};border:none;border-radius:14px;color:${cur===v?'#ffd79a':dim};cursor:pointer;padding:5px 14px;font-size:12px">${l}</button>`;
 const sl=(k,l,hint)=>`<div style="display:flex;align-items:center;gap:12px;margin-top:14px;font-size:12px"><span style="width:110px">${l}</span><input type="range" min="0" max="100" value="${F[k]}" oninput="this.nextElementSibling.textContent=this.value" onchange="${esc(`sendAction('planLoom',{op:'themeFx',${k}:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${F[k]}</span></div><div style="font-size:10.5px;color:${dim};margin:3px 0 0 122px">${hint}</div>`;
 return `<div style="font-size:11px;color:${dim};margin-bottom:12px">weather over your slate, on its own or following the theme.</div>
 <div style="display:inline-flex;background:#0a121e;border:1px solid ${line};border-radius:16px;padding:2px">${seg('theme',`Match theme${F.follow?` · ${t.ambient}`:''}`)}${seg('none','Off')}${seg('snow','Snow')}${seg('leaves','Leaves')}</div>
 ${F.kind==='none'?'':sl('density','Density','how many flakes at once.')+sl('size','Size','tiny dust to fat flakes.')+sl('speed','Speed','a slow drift or a flurry.')}
 ${F.kind==='snow'?`<label style="display:flex;align-items:center;gap:10px;margin-top:16px;padding-top:12px;border-top:1px solid ${line};cursor:pointer"><input type="checkbox" ${F.settle?'checked':''} onchange="${esc(`sendAction('planLoom',{op:'themeFx',settle:this.checked})`)}" style="accent-color:#a37d45;width:15px;height:15px"><span><span style="font-size:12px">Let it settle</span><span style="display:block;font-size:10.5px;color:${dim}">drifts bank up in the corners and on the edges of your cards over a minute or so.</span></span></label>`:''}`;}

export function ledRow(player){const s=player?.state||{},cur=s.slateHomeLed||null,line='#2c3b4c',dim='#8a9aa0',g=s.slateHomeGlow??60;
 const sw=['#FFD79A','#FF8A5C','#FF4D6D','#C77DFF','#7CE0CE','#4DA3FF','#9BFF7A','#FFFFFF'].map(c=>`<button title="${c}" onclick="${J({op:'themeLed',v:c})}" style="width:26px;height:26px;border-radius:50%;cursor:pointer;background:${c};border:2px solid ${cur===c?'#FFFFFF':'transparent'};box-shadow:0 0 ${cur===c?12:6}px ${c}AA"></button>`).join('');
 return `<div style="font-size:10px;letter-spacing:.2em;color:#c9a56a;margin:22px 0 10px;padding-top:14px;border-top:1px solid ${line}">NAVIGATION LED</div><div style="font-size:11px;color:#8a9aa0;margin-bottom:10px">Colour, glow and breathing apply to every footer icon.</div>
 <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button onclick="${J({op:'themeLed',v:''})}" style="height:26px;padding:0 12px;border-radius:13px;cursor:pointer;background:transparent;color:${cur?dim:'#ffd79a'};border:1px solid ${cur?line:'#a37d45'};font-size:11px">theme</button>${sw}
 <label title="any colour" style="width:26px;height:26px;border-radius:50%;overflow:hidden;cursor:pointer;border:1px dashed ${line};position:relative;background:conic-gradient(#FF4D6D,#FFD79A,#9BFF7A,#7CE0CE,#4DA3FF,#C77DFF,#FF4D6D)"><input type="color" value="${cur||'#FFD79A'}" onchange="${esc(`sendAction('planLoom',{op:'themeLed',v:this.value})`)}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer"></label></div>
 ${cur?`<div style="display:flex;align-items:center;gap:12px;margin-top:14px;font-size:12px"><span style="width:110px">Glow</span><input type="range" min="0" max="100" value="${g}" oninput="this.nextElementSibling.textContent=this.value" onchange="${esc(`sendAction('planLoom',{op:'themeLed',glow:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${g}</span></div>
 <label style="display:flex;align-items:center;gap:10px;margin-top:12px;cursor:pointer;font-size:12px"><input type="checkbox" ${s.slateHomePulse?'checked':''} onchange="${esc(`sendAction('planLoom',{op:'themeLed',pulse:this.checked})`)}" style="accent-color:#a37d45;width:15px;height:15px">Breathe <span style="font-size:10.5px;color:${dim}">a slow pulse, like a sleeping laptop.</span></label>${s.slateHomePulse?`<div style="display:flex;align-items:center;gap:12px;margin-top:12px;font-size:12px"><span style="width:110px">Dimmest</span><input type="range" min="20" max="90" value="${s.slateHomeLow??30}" oninput="this.nextElementSibling.textContent=this.value+'%'" onchange="${esc(`sendAction('planLoom',{op:'themeLed',low:+this.value})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${s.slateHomeLow??30}%</span></div><div style="display:flex;align-items:center;gap:12px;margin-top:12px;font-size:12px"><span style="width:110px">Speed</span><input type="range" min="6" max="80" value="${Math.round(86-(s.slateHomeRate??2.6)*10)}" oninput="this.nextElementSibling.textContent=((86-this.value)/10).toFixed(1)+'s'" onchange="${esc(`sendAction('planLoom',{op:'themeLed',rate:(86-this.value)/10})`)}" style="flex:1;accent-color:#a37d45"><span style="width:40px;text-align:right;color:#ffd79a">${(s.slateHomeRate??2.6).toFixed(1)}s</span></div>`:''}`:`<div style="font-size:10.5px;color:${dim};margin-top:8px">follows your theme until you pick one.</div>`}`;}
// --- iPadOS chrome: themes with chrome:'ipad' restyle the frame, type, radii and glass, not just the colours (every rule under #vwp-tablet) ---
const SF=`-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",system-ui,sans-serif`;
const tc=x=>x.replace(/[A-Z][A-Z'’]*/g,w=>w[0]+w.slice(1).toLowerCase());
const WIFI=`<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path fill="currentColor" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.4c1.5 0 2.9.6 4 1.6l1.2-1.3C11.8 4.6 10 3.8 8 3.8S4.2 4.6 2.8 5.9L4 7.2c1.1-1 2.5-1.6 4-1.6zm0 3.4c.7 0 1.3.3 1.8.7L8 11.6 6.2 9.7c.5-.4 1.1-.7 1.8-.7z"/></svg>`;
const BATT=`<svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="8" rx="1.6" fill="currentColor"/><path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4z" fill="currentColor" opacity=".4"/></svg>`;
function iosHtml(ctx,html){let ms=Number(ctx?.now?.());if(!(ms>1e12))ms=Date.now();const d=new Date(ms),hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 const b=html.indexOf('id="vwp-bezel"'),sp=b<0?-1:html.indexOf('<span',b);
 if(sp>0)html=html.slice(0,sp)+`<span class="sl-ios sl-ios-time">${hm}</span><span class="sl-ios sl-ios-glyph">${WIFI}${BATT}</span>`+html.slice(sp);
 const v=html.indexOf('<div class="vwp-screen">');if(v>=0){const head=html.slice(v,v+2500).replace(/(letter-spacing:\.2em">)([^<a-z]{2,40})(<\/span>)/,(m,a,x,c)=>a+tc(x)+c);html=html.slice(0,v)+head+html.slice(v+2500);}
 return html.replace(/(<\/div>)([A-Z][A-Z0-9 &'’·.\-]{1,30})(\s*<span)/g,(m,a,x,c)=>a+tc(x)+c)
  .replace(/(<button\b[^>]*letter-spacing:\.1\d*em[^>]*>)([^<a-z]*[A-Z]{2}[^<a-z]*)</g,(m,a,x)=>a+tc(x)+'<');}
// the Board (and a few tools) carry their own dark iOS glass; on iPadOS Light that glass is re-poured light so its words stay dark on pale
const al=(a,k,m)=>Math.min(m,parseFloat(a)*k).toFixed(2).replace(/^0/,'');
function iosLightGlass(html){return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(all,at,css)=>{if(!/kb-|cz-|pj/.test(css))return all;
 css=css.replace(/([^{}]+)\{([^{}]*)\}/g,(r,sel,b)=>{const hot=/background:(#007aff|#0a84ff|#ff453a|#34c759|#ff9f0a|var\(--c\))/i.test(b)||/\[data-f/.test(sel);
  b=b.replace(/(background(?:-color)?:)rgba\(255,255,255,([.\d]+)\)/g,(m,k,a)=>k+'rgba(255,255,255,'+(parseFloat(a)>=.13?'1':'.82')+')')
   .replace(/(^|[;{]\s*)color:rgba\(255,255,255,([.\d]+)\)/g,(m,p0,a)=>p0+'color:rgba(0,0,0,'+al(a,.9,.88)+')')
   .replace(/rgba\(255,255,255,([.\d]+)\)/g,(m,a)=>'rgba(0,0,0,'+al(a,.7,.2)+')')
   .replace(/rgba\(235,235,245,([.\d]+)\)/g,(m,a)=>'rgba(60,60,67,'+al(a,1.2,.9)+')')
   .replace(/background:rgba\(0,0,0,\.(14|20?)\)/g,'background:rgba(118,118,128,.12)')
   .replace(/#64d2ff/gi,'#007AFF');
  if(!hot)b=b.replace(/(^|[;{]\s*)color:#fff(fff)?\b/gi,'$1color:#1C1C1E');
  return sel+'{'+b+'}';});
 return '<style'+at+'>'+css+'</style>';});}
function iosCss(player,t,url,gv){const L=isLight(t.c),S='#vwp-tablet',U=h=>h.toUpperCase(),BG=U(t.c.bg),P=U(t.c.panel),LN=U(t.c.line),INK=U(t.c.ink),A=U(t.c.accent);
 const fa=gv?Math.max(.6,1-gv/100*.55):.9,hx=rgb(t.c.bg),frost=`rgba(${hx[0]},${hx[1]},${hx[2]},${fa.toFixed(2)})`,bar=L?'rgba(249,249,251,.78)':'rgba(28,28,30,.78)',blur='backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%)';
 let c=`${S}{font-family:${SF}!important;border-radius:30px!important;padding:7px 7px 20px!important;-webkit-font-smoothing:antialiased}
${S}:not(.cam){background:linear-gradient(160deg,#1C1C1E,#050506)!important;box-shadow:0 0 0 1px #48484A,0 0 0 2px #000000,0 30px 80px rgba(0,0,0,.55)!important}
${S} *{font-family:inherit}
${S} [style*="letter-spacing"]{letter-spacing:.01em!important}
${S} [style*="letter-spacing:.2em"],${S} [style*="letter-spacing:.18em"],${S} [style*="letter-spacing:.16em"]{letter-spacing:.04em!important;font-weight:600}
${S} #vwp-bezel{height:30px!important;margin:0!important;padding:0 16px 0 22px!important;gap:6px!important;border-radius:23px 23px 0 0;background:${bar};${blur};color:${INK};font:600 12px/1 ${SF};position:relative;z-index:3}
${S}.min #vwp-bezel{border-radius:23px}
${S} #vwp-bezel>span:not(.sl-ios):not(.sl-notification-led){display:none!important}
${S} #vwp-bezel .sl-ib{color:${INK}!important;opacity:.5;height:30px!important}
${S} .sl-ios-time{order:-2;margin-right:auto;font-variant-numeric:tabular-nums;letter-spacing:.01em}
${S} .sl-ios-glyph{order:9;display:inline-flex;align-items:center;gap:6px;margin-left:8px;color:${INK}}
${S} #vwp-bezel .sl-notification-led{order:-1}
${S} .vwp-screen{border-radius:0 0 23px 23px!important;box-shadow:none!important;background:${frost}!important;${blur}}
${S} .vwp-screen>div:first-child:not(.vwp-scroll){padding:8px 16px!important;min-height:46px;box-sizing:border-box;background:${bar}!important;border-bottom:.5px solid ${LN}!important;${blur};gap:10px!important}
${S} .vwp-screen>div:first-child:not(.vwp-scroll)>div:first-child{width:28px!important;height:28px!important;border-radius:7px!important}
${S} .vwp-screen>div:first-child:not(.vwp-scroll)>span:first-of-type{font-size:17px!important;font-weight:600!important;color:${INK}!important;letter-spacing:-.01em!important}
${S} .vwp-screen>div:first-child:not(.vwp-scroll)>span:nth-of-type(2){font-size:13px!important}
${S} button:not(.sl-ib):not(#vwp-home):not([data-tab]):not([style*="999px"]):not([style*="50%"]):not([style*="background:none"]){border-radius:10px!important}
${S} button[style*="999px"]{letter-spacing:0!important;font-size:12px!important;font-weight:500;padding:5px 13px!important}
${S} div[style*="border-radius:16px;padding:2px"]{border-radius:9px!important;padding:2px!important;background:${L?'#7676801F':'#7676803D'}!important;border:none!important}
${S} div[style*="border-radius:16px;padding:2px"]>button{border-radius:7px!important;font-weight:500;letter-spacing:0!important}
${S} .vwp-card,${S} .kb-card,${S} .kb-stat,${S} .sl-widget,${S} .sl-tile,${S} .vwp-app{border-radius:14px!important;${blur}}
${S} .vwp-col,${S} .kb-col{border-radius:16px!important}
${S} .vwp-scroll div[style*="border:1px solid"]{border-radius:12px!important}
${S} input:not([type]),${S} input[type=text],${S} input[type=search],${S} input[type=number],${S} textarea,${S} select{border-radius:10px!important;font-family:inherit!important}
${S} input[type=range]{accent-color:${A}!important}
${S} input[type=checkbox]{-webkit-appearance:none;appearance:none;width:36px!important;min-width:36px;height:22px!important;margin:0;border-radius:11px;background:${L?'#E3E3E8':'#39393D'};position:relative;cursor:pointer;flex:none;vertical-align:middle;transition:background .2s}
${S} input[type=checkbox]::before{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#FFFFFF;box-shadow:0 2px 4px rgba(0,0,0,.25);transition:transform .2s}
${S} input[type=checkbox]:checked{background:#34C759}${S} input[type=checkbox]:checked::before{transform:translateX(14px)}
${S} #sl-grid .sl-t button{font-size:12px!important;letter-spacing:0!important;font-weight:500}
${S} #sl-grid .sl-t button>div:first-child{border-radius:22%!important;box-shadow:0 6px 16px rgba(0,0,0,.18)!important}
${S} [style*="background:#120e0a"]{background:${P}!important;border-color:${LN}!important}
${S} [style*="background:#1a150f"]{background:${L?'#E9E9EE':'#3A3A3C'}!important;border-color:${LN}!important}
${S} .sl-home{background:transparent!important}
${S} [style*="background:#0f1a2b"],${S} [style*="background:#0e1a2b"]{background:${P}!important;border-color:${LN}!important}
${S} [style*="background:#0e0b08"]{background:${bar}!important;border-top:.5px solid ${LN}!important;${blur}}
${S} [style*="background:#0e0b08"]>button{letter-spacing:0!important;font-size:10.5px!important;font-weight:500;color:${L?'#8E8E93':'#98989D'}!important;border-top-color:transparent!important}
${S} [style*="background:#0e0b08"]>button[style*="background:#2a1f12"]{background:transparent!important;color:${A}!important}
${S} .kb-search input{background:transparent!important;box-shadow:none!important}
${S} .sl-widget{background:${L?'rgba(255,255,255,.72)':'rgba(44,44,46,.72)'}!important;border:.5px solid ${LN}!important;box-shadow:0 4px 14px rgba(0,0,0,${L?'.06':'.3'})!important}
${S} ::-webkit-scrollbar-thumb{background:${L?'#C7C7CC':'#48484A'}!important}
${S} div[style*="background:#e9eef0"]{background:${L?'rgba(255,255,255,.86)':'rgba(44,44,46,.86)'}!important;border:.5px solid ${LN}!important;box-shadow:0 6px 20px rgba(0,0,0,${L?'.08':'.4'})!important}
${S} #sl-q{color:${INK}!important}${S} #sl-q::placeholder{color:${L?'#8E8E93':'#98989D'}}
${S} #sl-askb,${S} #sl-addb{color:${A}!important}`;
 return `<style>${c}</style>`;}
