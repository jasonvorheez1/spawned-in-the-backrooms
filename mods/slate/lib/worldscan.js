// World scan: the first time an editor opens Slate in a world, Slate reads the world it was installed into
// and fills the book and the board from what already stands there, so a Slate dropped into a half-made game
// starts knowing that game. Runs on the editor's body (where ctx.files.read works), once per world; Rescan reruns it.
//  Loom: a page per place (places/<p>/config.yaml), per game script (scripts/*.js, sim.js, ui.js), per
//        scripted model, per template, per doc (design.md, notes/*.md, README); design.md and aesthetic.yml fill the
//        starter pages (one-liner, loop, win and lose, style) while those still hold their blank question.
//  Planner: a ticket per TODO / FIXME / HACK comment in the game's code, per open question in its docs.
//  Journal: one dated line saying what was read.
// A scanned page or ticket carries src (the file it came from) and sh (the text it was written with); a rescan
// rewrites it only while it still says exactly what the scan wrote, so nothing a person edited is ever touched.
// world.state.slateScan = { at, files, pages, tickets, v }.
import {seed} from './loom.js';
const V=1;
const cut=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
const cap=s=>String(s||'').replace(/[-_]+/g,' ').replace(/\.(js|md|yaml|yml)$/,'').replace(/^./,c=>c.toUpperCase());
const sid=s=>'ws-'+String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
// the starter's own plumbing: listed together on one page, never one page each
const PLUMB=/^scripts\/(camera|flat-starter-terrain|grass-look|humanoid-locomotion|lighting|look-default|arrival|player)\.js$/;
const SKIP=/^(mods|spawn6|memory|history|engine-reference|studio|docs\/kiln|node_modules)\//;
const MAXP=60,MAXT=40;
// the comment block at the top of a file, as prose
function head(t){const out=[];for(const ln of String(t||'').split('\n')){const m=/^\s*(\/\/+|#|\*|\/\*+)\s?(.*)$/.exec(ln);if(!m){if(out.length||ln.trim())break;continue;}const s=m[2].replace(/\*\/\s*$/,'').trim();if(s||out.length)out.push(s);if(out.join(' ').length>700)break;}return out.join(' ').replace(/\s+/g,' ').trim();}
const hooks=t=>[...new Set([...String(t||'').matchAll(/^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]))];
const yv=(t,k)=>{const m=new RegExp('^\\s*'+k+':\\s*([^\\n#]+)','m').exec(t||'');return m?m[1].trim().replace(/^["']|["']$/g,''):'';};
const HOOKWORD={onInput:'reads the player\'s keys',update:'moves every frame',tick:'referees the match',onCollide:'reacts to hits',onTriggerEnter:'fires when walked into',onArrive:'greets arrivals',onLeave:'sees players off',geometry:'is a scripted model',material:'is a scripted material',look:'is the picture\'s grade',lighting:'is the lighting model',heightAt:'shapes the terrain',onSpawn:'sets itself up on spawn',render:'draws the HUD'};
// markdown sections: { lowercased heading: text }
function sections(md){const o={};let k='_top';for(const ln of String(md||'').split('\n')){const h=/^#{1,4}\s+(.*)/.exec(ln);if(h){k=h[1].trim().toLowerCase();o[k]='';continue;}o[k]=(o[k]?o[k]+'\n':'')+ln;}for(const x in o)o[x]=o[x].trim();return o;}
const pick=(S,re)=>{for(const k in S)if(re.test(k)&&S[k])return S[k];return '';};

export function worldScan(ctx,by){
 const files=(ctx.world.files||[]).filter(f=>!SKIP.test(f));
 const rd=f=>{try{return ctx.files.read(f);}catch(e){return null;}};
 const L=JSON.parse(JSON.stringify(ctx.world.state.loom||seed()));
 const plan=JSON.parse(JSON.stringify(ctx.world.state.plan||{cards:[],ms:[],tab:'home'}));plan.cards=Array.isArray(plan.cards)?plan.cards:[];
 const blank=Object.fromEntries(seed().pages.map(p=>[p.id,p.body]));
 // a chapter by kind, made when the book has none (a renamed chapter still matches by its words)
 const chap=(id,name,re)=>{let c=L.chapters.find(c=>c.id===id)||L.chapters.find(c=>re.test(String(c.name||'')));if(!c){c={id,name};L.chapters.push(c);}return c.id;};
 const CH={places:()=>chap('places','Places',/place|location|map|level/i),mech:()=>chap('mechanics','Mechanics',/mechanic|system|rules/i),
  cast:()=>chap('characters','Characters',/charac|cast/i),look:()=>chap('look','Art & Sound',/art|look|sound/i),notes:()=>chap('notes','Notes',/note|doc/i),pitch:()=>chap('pitch','Pitch',/pitch/i)};
 let pages=0,tickets=0,read=0;
 const put=(src,ch,t,body,img)=>{if(pages>=MAXP)return;body=cut(body,1400);const id=sid(src);const was=L.pages.find(p=>p.id===id||p.src===src);
  if(was){if(was.sh!==undefined&&was.body!==was.sh)return;/* a person wrote on it: theirs now */Object.assign(was,{t:cut(t,120),body,sh:body,...(img?{img}:{})});pages++;return;}
  L.pages.push({id,ch,sec:'',t:cut(t,120),body,img:img||'',hero:false,feat:'',tags:['from world'],tix:[],by:'world scan',src,sh:body});pages++;};
 const fill=(pid,body)=>{const p=L.pages.find(x=>x.id===pid);if(!p||!body)return;if(p.body===blank[pid]||(p.sh!==undefined&&p.body===p.sh)){p.body=cut(body,1400);p.sh=p.body;}};
 const tick=(src,t,note,tag,col)=>{if(tickets>=MAXT)return;const key=src+'|'+t;const was=plan.cards.find(c=>c.src===key);if(was)return;
  plan.cards.push({id:'ws'+Math.floor(ctx.now()).toString(36)+tickets.toString(36),t:cut(t,120),col:col||'todo',tag:tag||'note',ms:'',by:'world scan',note:cut(note,1200),place:'',at:null,src:key,from:'world scan'});tickets++;};
 const imgOf=t=>(/(\/cdn\/[^\s)"'\]]+\.(?:png|jpe?g|webp|gif))/i.exec(t||'')||[])[1]||'';

 // the game itself
 const wc=rd('world.config.yaml');if(wc){read++;const mode=yv(wc,'mode')||'multiplayer',acts=[...new Set([...wc.matchAll(/^\s{4,}([a-zA-Z]\w*):\s*\n\s+keys:/gm)].map(m=>m[1]))];
  put('world.config.yaml',CH.mech(),'Controls & networking',`Networking: ${mode}.\n${acts.length?'Actions bound: '+acts.join(', ')+'.':'No custom actions bound yet: the starter\'s walk, run and jump.'}\nSource: world.config.yaml`);}
 // places
 for(const f of files){const m=/^places\/([^/]+)\/config\.yaml$/.exec(f);if(!m)continue;const t=rd(f);if(t==null)continue;read++;
  const pl=m[1],cells=files.filter(x=>x.startsWith(`places/${pl}/cells/`));let things=0;const tg={};for(const c of cells){const s=rd(c)||'';read++;things+=(s.match(/^[^\s#][^:\n]*:\s*$/gm)||[]).length;for(const x of s.matchAll(/tags:\s*\[([^\]]*)\]/g))for(const w of x[1].split(','))if(w.trim())tg[w.trim().replace(/["']/g,'')]=(tg[w.trim().replace(/["']/g,'')]||0)+1;}
  const kind=yv(t,'kind')||'heightmap',hour=yv(t,'timeOfDay'),sky=yv(t,'model')||yv(t,'kind'),gen=yv(t,'generator'),pm=yv(t,'mode')||'3d';
  const top=Object.entries(tg).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`${k} ×${n}`).join(', ');
  put(f,CH.places(),pl==='main'?'Main (where you start)':cap(pl),`What you see first: ${pm} place${hour?`, the hour ${hour}`:''}${t.includes('fog:')?', fog on the distance':''}${/clouds:[\s\S]*?enabled:\s*true/.test(t)?', clouds overhead':''}.\nGround: ${kind} terrain${gen?' from '+gen:''}.\nWhat stands here: ${things?things+' placed thing'+(things>1?'s':''):'nothing placed yet'}${top?' ('+top+')':''}.\nWho lives here:\nWhat you do here:\nHow you get in and out:\nSource: ${f}`);}
 // the game's scripts
 const plumb=[];
 for(const f of files){if(!/\.js$/.test(f)||/^(templates|ui)\//.test(f)||/^scripts\/lib\//.test(f)||/^places\/[^/]+\/cells\//.test(f))continue;if(!/^(scripts\/[^/]+|sim|ui|places\/[^/]+\/(sim|ui))\.js$/.test(f)&&!/^scripts\/[^/]+\.js$/.test(f))continue;
  const t=rd(f);if(t==null)continue;read++;const hs=hooks(t),h=head(t),does=hs.map(x=>HOOKWORD[x]).filter(Boolean);
  if(PLUMB.test(f)){plumb.push(`- ${f.replace(/^scripts\//,'')}: ${does[0]||'starter system'}`);}
  else if(hs.includes('geometry')||hs.includes('material')){put(f,CH.look(),cap(f.split('/').pop())+(hs.includes('geometry')?' (scripted model)':' (material)'),`${h||'A model drawn in code.'}\nSource: ${f}`);}
  else if(/(^|\/)sim\.js$/.test(f)){const empty=/tick\s*\(\s*ctx\s*\)\s*\{\s*\}/.test(t);put(f,CH.mech(),'The referee (sim.js)',`${empty?'Empty for now: no rules referee the match yet.':h||'Runs the match rules.'}\nWin:\nLose:\nSource: ${f}`);}
  else if(/(^|\/)ui\.js$/.test(f)){put(f,CH.mech(),'The HUD',`${h||'What the screen shows.'}\nSource: ${f}`);}
  else put(f,CH.mech(),cap(f.split('/').pop()),`${h||'A behavior.'}\nWhat it does: ${does.join(', ')||'(no hooks yet)'}.\nThe numbers:\nSource: ${f}`);
  // the code's own notes to itself become tickets
  for(const mm of t.matchAll(/\/\/\s*(TODO|FIXME|HACK|XXX)\b[:\s-]*(.*)/g)){const ln=t.slice(0,mm.index).split('\n').length;tick(f,`${mm[1]==='FIXME'?'Fix':'Do'}: ${mm[2].trim()||'see code'}`,`${f}:${ln}\n${mm[0].trim()}`,mm[1]==='FIXME'||mm[1]==='HACK'?'bug':'polish','todo');}}
 if(plumb.length)put('starter-systems',CH.mech(),'Starter systems',`The starter's plumbing this game stands on, untouched by design until it needs to be:\n${plumb.join('\n')}`);
 // templates: a shared definition is a character when it walks, an item otherwise
 for(const f of files){if(!/^templates\/[^/]+\.js$/.test(f))continue;const t=rd(f);if(t==null)continue;read++;const ex=hooks(t),walks=/character|player|npc|enemy|creature|humanoid/i.test(t.slice(0,4000));
  put(f,walks?CH.cast():CH.mech(),cap(f.split('/').pop())+(ex.length?` (${ex.slice(0,4).join(', ')})`:''),`${head(t)||(walks?'A body that walks.':'A shared definition.')}\n${walks?'Role:\nWants:\nLooks like:':'What it does:\nWhere you find it:'}\nSource: ${f}`);}
 // the look
 const ae=rd('scripts/lib/data/aesthetic.yml');if(ae){read++;fill('p-style',`${yv(ae,'name')?'Look: '+yv(ae,'name')+'. ':''}${yv(ae,'mood')||''}\nEra: ${yv(ae,'era')}\nPalette: ${yv(ae,'palette')}\nFinish: ${yv(ae,'finish')}\nHour: ${yv(ae,'hour')}\nSource: scripts/lib/data/aesthetic.yml`);}
 // the docs
 for(const f of files){if(!/\.md$/i.test(f)||!/^(design\.md|readme\.md|notes\/[^/]+\.md|docs\/[^/]+\.md)$/i.test(f))continue;const md=rd(f);if(md==null)continue;read++;const S=sections(md),title=(/^#\s+(.*)/m.exec(md)||[])[1]||cap(f.split('/').pop());
  if(/^design\.md$/i.test(f)){fill('p-oneliner',(S._top||pick(S,/what it is|pitch|one.?liner|concept/)).split('\n').find(l=>l.trim()&&!/^status/i.test(l)));fill('p-loop',pick(S,/loop/));fill('p-win',[pick(S,/^win/),pick(S,/^lose/)].filter(Boolean).join('\n\n'));}
  put(f,/^design\.md$/i.test(f)?CH.pitch():CH.notes(),cut(title,110),md.replace(/^#\s+.*\n?/,'').trim()+`\nSource: ${f}`,imgOf(md));
  for(const k in S)if(/open question|questions|todo|to do|undecided|open/.test(k))for(const ln of S[k].split('\n')){const q=/^\s*[-*\d.]+\s+(?:\[ \]\s*)?(.+)/.exec(ln);if(q)tick(f,q[1].trim(),`From ${f}, "${k}"`,'note','idea');}
  for(const ln of md.split('\n')){const q=/^\s*(?:[-*]\s+)?([^:\n]{2,40}):\s*(OPEN|TBD|undecided|not decided)\b(.*)$/i.exec(ln);if(q)tick(f,`Decide: ${q[1].trim()}`,`${f}: ${ln.trim()}`,'note','idea');}}
 // the journal line, and the counts the tablet shows
 const placesN=files.filter(f=>/^places\/[^/]+\/config\.yaml$/.test(f)).length,day=ctx.world.date||'',tm='';
 plan.diary=Array.isArray(plan.diary)?plan.diary:[];
 plan.diary.unshift({id:'wsj'+Math.floor(ctx.now()).toString(36),date:day,t:`Slate read this world: ${read} files, ${placesN} place${placesN===1?'':'s'}. ${pages} Loom page${pages===1?'':'s'} filled, ${tickets} new ticket${tickets===1?'':'s'}.`,by:'world scan',scanBy:by||'',auto:true,tags:['world scan']});
 ctx.world.state.loom=L;ctx.world.state.plan=plan;
 ctx.world.state.slateScan={at:ctx.now(),files:read,pages,tickets,v:V,by:by||''};
 return {read,pages,tickets};
}
// once per world: the first editor tick with no scan on record
export function scanOnce(ctx,by){const s=ctx.world.state.slateScan;if(s&&s.v>=V)return null;return worldScan(ctx,by);}
