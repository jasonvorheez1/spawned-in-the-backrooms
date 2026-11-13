// WORLD THEME: a Slate theme read from the world it lives in. The world's art direction (scripts/lib/data/aesthetic.yml:
// palette, mood, era), its docs (design.md, notes/*.md, README) and its places (hour of day) are read on an editor's
// machine; a family of words that dominates the docs (glacier, forest, lava…) can steer the colours. The result is one
// theme the whole world shares: world.state.slateWorldTheme = { cur, pending, versions[], dismissed, checkedAt }.
// Every few minutes Slate re-reads the world; when its look has changed (or a week passed: a fresh take on the same
// palette) it parks a suggestion in `pending` for an editor to preview, apply or wave off. Applying keeps the old one
// in `versions` (newest first, 12 kept), so any past theme can be previewed and restored.
const FAM={
 ice:{w:/\b(glacier|glacial|ice|icy|frost\w*|frozen|snow\w*|winter|penguins?|arctic|polar|tundra|blizzard)\b/gi,p:['#0b1824','#1f3b52','#5f9cc0','#a9d8ee','#f1f7fa'],amb:'snow',n:'Frost'},
 autumn:{w:/\b(autumn|leaf|leaves|amber|harvest|maple|cider)\b/gi,p:['#3d2214','#8a3d1a','#d9822b','#f2c05c','#f8ecd4'],amb:'leaves',n:'Amber'},
 forest:{w:/\b(forest|moss\w*|grove|woodland|jungle|fern|meadow|druid)\b/gi,p:['#0f1c12','#24432a','#5e9a52','#b9d28a','#eef2df'],amb:'leaves',n:'Grove'},
 fire:{w:/\b(lava|fire|volcan\w*|ember\w*|inferno|magma|dragon|forge)\b/gi,p:['#1a0b08','#5a1a10','#d2481e','#f2a03c','#fbe7cf'],amb:'none',n:'Ember'},
 desert:{w:/\b(desert|sand|dunes?|oasis|canyon|mesa)\b/gi,p:['#22170e','#6e4a26','#c98b4a','#ebc98c','#f8eedb'],amb:'none',n:'Dune'},
 ocean:{w:/\b(ocean|sea|reef|coast\w*|island|pirate\w*|tide|harbou?r)\b/gi,p:['#071a20','#0f4a55','#2aa5a8','#9fe0d6','#eefaf6'],amb:'none',n:'Tide'},
 space:{w:/\b(space|stars?|nebula|galaxy|neon|cyber\w*|sci-?fi|planet\w*|orbit)\b/gi,p:['#0b0a1a','#2b1f55','#7a5cff','#55e0f0','#ece9ff'],amb:'none',n:'Nebula'},
 gothic:{w:/\b(gothic|crypt|horror|haunted|vampire|graveyard|undead|cursed)\b/gi,p:['#100c12','#2e1f33','#8e5aa8','#d8b46a','#ece4da'],amb:'none',n:'Crypt'},
};
const HEX=/^#[0-9a-f]{6}$/i;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return hx(A.map((v,i)=>v+(B[i]-v)*t));};
const lum=h=>{const c=rgb(h);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const sat=h=>{const c=rgb(h);return Math.max(...c)-Math.min(...c);};
// oklch(L C H) → hex (sRGB, clipped)
function oklch(s){const m=/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i.exec(s||'');if(!m)return null;const L=+m[1]/(m[2]?100:1),C=+m[3],h=+m[4]*Math.PI/180;
 const a=C*Math.cos(h),b=C*Math.sin(h),l_=(L+.3963377774*a+.2158037573*b)**3,m_=(L-.1055613458*a-.0638541728*b)**3,s_=(L-.0894841775*a-1.291485548*b)**3;
 const lin=[4.0767416621*l_-3.3077115913*m_+.2309699292*s_,-1.2684380046*l_+2.6097574011*m_-.3413193965*s_,-.0041960863*l_-.7034186147*m_+1.707614701*s_];
 return hx(lin.map(v=>255*(v<=.0031308?12.92*v:1.055*Math.pow(Math.max(v,0),1/2.4)-.055)));}
const colorOf=s=>{s=String(s||'').trim().replace(/^["']|["']$/g,'');if(HEX.test(s))return s.toLowerCase();return oklch(s);};
const yv=(t,k)=>{const m=new RegExp('^\\s*'+k+':\\s*([^\\n#]+)','m').exec(t||'');return m?m[1].trim().replace(/^["']|["']$/g,''):'';};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
const titleCase=s=>String(s||'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();

// what the world says about its look: the inputs, read once, and their signature
export function readWorld(ctx){
 const rd=f=>{try{return ctx.files.read(f)||'';}catch(e){return '';}};
 const files=ctx.world.files||[];
 const ae=rd('scripts/lib/data/aesthetic.yml');
 const docsF=files.filter(f=>/^(design\.md|readme\.md|notes\/[^/]+\.md|docs\/[^/]+\.md)$/i.test(f)).slice(0,40);
 let docs='';for(const f of docsF)docs+=rd(f).slice(0,60000)+'\n';
 const name=yv(rd('world.config.yaml'),'name');
 const places=files.filter(f=>/^places\/[^/]+\/config\.yaml$/.test(f));
 const main=rd('places/main/config.yaml')||rd(places[0]||'');
 const hour=parseFloat(yv(main,'timeOfDay')||yv(ae,'hour'))||14;
 const palette=((/palette:\s*\[([^\]]*)\]/.exec(ae)||[])[1]||'').split(',').map(colorOf).filter(Boolean);
 const ground=colorOf(yv(ae,'ground'));
 const words=[yv(ae,'name'),yv(ae,'mood'),yv(ae,'era'),yv(ae,'reference'),(/finish:\s*\[([^\]]*)\]/.exec(ae)||[])[1]||''].join(' ');
 const count=(txt)=>{const o={};for(const k in FAM){o[k]=(String(txt).match(FAM[k].w)||[]).length;}return o;};
 const aeHits=count(words),docHits=count(docs+' '+name);
 const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0];
 const [aeFam,aeN]=top(aeHits),[docFam,docN]=top(docHits);
 const sig=hash(JSON.stringify([palette,ground,Math.round(hour),aeFam,docN>=4?docFam:'',name]));
 return {ae:!!ae,aeName:yv(ae,'name'),mood:yv(ae,'mood'),palette,ground,hour,name,aeFam:aeN?aeFam:'',docFam:docN>=4?docFam:'',docN,docsN:docsF.length,sig};}

// the inputs → a Slate theme. v picks the take: a different swatch carries the accent on each fresh take.
export function deriveTheme(W,v=0,day=''){
 let P=W.palette.length>=3?W.palette.slice():null,src=P?'aesthetic.yml palette':'';
 const fam=W.docFam&&W.docFam!==W.aeFam?W.docFam:(W.aeFam||W.docFam);
 // the docs talk about a world the art file doesn't (a glacier keep in a world still wearing the starter's autumn): the docs win
 if(W.docFam&&W.docFam!==W.aeFam||!P){P=(FAM[fam]||FAM.space).p.slice();src=W.docFam?`the game's notes (${W.docFam} ×${W.docN})`:'a default palette';}
 if(W.ground&&src.startsWith('aesthetic'))P.push(W.ground);
 const byL=P.slice().sort((a,b)=>lum(a)-lum(b)),D=byL[0],Lt=byL[byL.length-1];
 const mids=P.filter(c=>c!==D&&c!==Lt).sort((a,b)=>sat(b)-sat(a));const pickM=i=>mids.length?mids[((i%mids.length)+mids.length)%mids.length]:mix(D,Lt,.5);
 const night=W.hour<6||W.hour>19.5;
 let bg=mix(D,'#000000',night?.5:.35);for(let i=0;i<6&&lum(bg)>26;i++)bg=mix(bg,'#000000',.3);
 let accent=pickM(v);for(let i=0;i<6&&lum(accent)<95;i++)accent=mix(accent,Lt,.25);
 let glow=pickM(v+1);if(glow===accent)glow=mix(accent,'#53d9e5',.5);for(let i=0;i<6&&lum(glow)<115;i++)glow=mix(glow,Lt,.25);
 const ink=mix(Lt,'#ffffff',.25);
 const c={bg,panel:mix(mix(bg,accent,.1),'#ffffff',.045),bezel:mix(bg,'#000000',.35),line:mix(bg,Lt,.2),ink,dim:mix(ink,bg,.42),accent,soft:mix(accent,Lt,.6),glow};
 const famN=FAM[fam]?.n||'',base=W.name?titleCase(W.name):(src.startsWith('aesthetic')&&W.aeName?titleCase(W.aeName):famN||'This world');
 return {id:'world',group:'world',name:(base+(v?` · take ${v+1}`:'')).slice(0,32),c,glass:0,blur:0,ambient:FAM[fam]?.amb||'none',
  src,fam,v,sig:W.sig,day,why:''};}

// the room's copy, cleaned (a bad write never breaks the tablet)
export function worldThemeState(ctx){const s=ctx?.world?.state?.slateWorldTheme;return s&&typeof s==='object'?s:null;}
const okT=t=>t&&t.c&&HEX.test(t.c.bg||'')&&HEX.test(t.c.accent||'');
export function worldTheme(ctx,which){const s=worldThemeState(ctx);if(!s)return null;
 const t=which==='pending'?s.pending:/^v\d+$/.test(String(which||''))?(s.versions||[])[+which.slice(1)]:s.cur;
 return okT(t)?{...t,id:'world',group:'world',glass:t.glass||0,blur:t.blur||0,ambient:t.ambient||'none'}:null;}

const WEEK=7*24*3600*1000;let lastCheck=-1e12;
// an editor's update: every 5 minutes (or when forced), read the world and park a suggestion when its look moved
export function worldThemeTick(ctx,p,force){const now=ctx.now();if(!force&&now-lastCheck<300000){mirror(ctx,p);return;}lastCheck=now;
 let W;try{W=readWorld(ctx);}catch(e){return;}const day=ctx.world.date||'',S=worldThemeState(ctx);
 if(!S||!okT(S.cur)){const t=deriveTheme(W,0,day);t.why='first read of this world';ctx.world.state.slateWorldTheme={cur:t,pending:null,versions:[],dismissed:'',checkedAt:now,born:now};mirror(ctx,p);return;}
 const nx=JSON.parse(JSON.stringify(S));nx.checkedAt=now;let changed=false;
 if(W.sig!==S.cur.sig&&W.sig!==S.pending?.sig&&W.sig!==S.dismissed){const t=deriveTheme(W,0,day);
  const what=[];if(S.cur.src!==t.src)what.push('the colours now come from '+t.src);if(S.cur.fam!==t.fam)what.push(`it reads as ${t.fam} now`);
  t.why='the world\'s look changed'+(what.length?': '+what.join(', '):'');if(S.cur.wall)t.wall=S.cur.wall;nx.pending=t;changed=true;}
 else if(force||(!S.pending&&now-(S.cur.at??S.born??now)>WEEK)){const t=deriveTheme(W,(S.cur.v||0)+1,day);t.why=force?'a fresh take you asked for: same world, the accent moves to the next colour':'a week on: a fresh take on the same world';if(S.cur.wall)t.wall=S.cur.wall;nx.pending=t;changed=true;}
 if(changed)ctx.world.state.slateWorldTheme=nx;mirror(ctx,p);}
// the light on the tablet: a suggestion this editor hasn't looked at yet
function mirror(ctx,p){if(!p?.state)return;const pend=worldThemeState(ctx)?.pending,n=!!(pend&&okT(pend)&&p.state.slateWTSeen!==pend.sig+'|'+(pend.v||0));if(!!p.state.slateWTNew!==n)p.state.slateWTNew=n;}

// --- ops (planLoom op:'themeWorld…'), from themeOp ---
export function worldThemeOp(ctx,p,d){const s=p.state,S=worldThemeState(ctx);const seen=()=>{if(S?.pending)s.slateWTSeen=S.pending.sig+'|'+(S.pending.v||0);s.slateWTNew=false;};
 if(d.op==='themeWorldUse'){if(worldTheme(ctx)){s.slateTheme='world';s.slateThemeCal=false;s.slateWTPreview=null;}return false;}
 if(d.op==='themeWorldPreview'){const w=d.on===false?null:String(d.which||'pending');s.slateWTPreview=w&&worldTheme(ctx,w)?w:null;seen();return false;}
 if(d.op==='themeWorldCheck'){worldThemeTick(ctx,p,true);return false;}
 if(!S)return false;const nx=JSON.parse(JSON.stringify(S));nx.versions=Array.isArray(nx.versions)?nx.versions:[];
 const keep=t=>{nx.versions.unshift({...t,retired:ctx.world.date||''});nx.versions=nx.versions.slice(0,12);};
 if(d.op==='themeWorldApply'){if(!okT(nx.pending))return false;keep(nx.cur);nx.cur={...nx.pending,at:ctx.now(),day:ctx.world.date||nx.pending.day};nx.pending=null;ctx.world.state.slateWorldTheme=nx;s.slateTheme='world';s.slateThemeCal=false;s.slateWTPreview=null;seen();return false;}
 if(d.op==='themeWorldDecline'){if(!nx.pending)return false;nx.dismissed=nx.pending.sig;if(!nx.pending.v||nx.pending.sig===nx.cur.sig)nx.cur={...nx.cur,at:ctx.now()};nx.pending=null;ctx.world.state.slateWorldTheme=nx;s.slateWTPreview=null;seen();return false;}
 if(d.op==='themeWorldRestore'){const i=Math.floor(+d.i);const v=nx.versions[i];if(!okT(v))return false;nx.versions.splice(i,1);keep(nx.cur);const {retired,...rest}=v;nx.cur={...rest,at:ctx.now(),why:'restored from '+(retired||'an older version')};ctx.world.state.slateWorldTheme=nx;s.slateTheme='world';s.slateWTPreview=null;return false;}
 if(d.op==='themeWorldPaint'){if(ctx.now()-(s.slateWTPaintAt??-60000)<15000)return false;s.slateWTPaintAt=ctx.now();const t=okT(nx.pending)&&d.which==='pending'?nx.pending:nx.cur,slot=t===nx.pending?'pending':'cur';
  ctx.notifyDm?.(`Slate world-theme wallpaper request from ${p.displayName}: paint a 16:9 tablet wallpaper of THIS world (its own places, lore and look; read design.md / notes / aesthetic.yml) in the theme "${t.name}" (bg ${t.c.bg}, accent ${t.c.accent}, glow ${t.c.glow}, ambient ${t.ambient}). Calm, low-contrast where tablet text sits. Then set world.state.slateWorldTheme.${slot}.wall to the /cdn/ url (copy the object, set wall, write it back).`,{wake:true});
  s.slateWTPaintMsg='asked savi to paint it. it lands here on its own.';return false;}
 return false;}
