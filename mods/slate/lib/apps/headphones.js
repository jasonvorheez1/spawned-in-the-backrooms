// Slate built-in app: the Star Sanctuary listening deck (port of @psypher5/star-sanctuary scripts/radio-ui.js). Contract: lib/apps/index.js.
// Two stations as in Star Sanctuary: Sanctuary Radio (the ambient show's list) and Stardome FM (the all-day mix), same titles and /cdn/ clips.
// Sound is the engine jukebox (ctx.music.play / stop): one track for the whole room, heard by everyone here, in any world Slate runs in.
// Shared: world.state.slateAppData.headphones = { playing, st, track, vol, mute, at }. Personal: player.state.slateApp_headphones = { skin, menu, mini }.
export const APP={id:'headphones',name:'HEADPHONES',glyph:'🎧',color:'#3a5f8a',sub:'music in any world',about:'The headphones deck from Star Sanctuary: Sanctuary Radio and Stardome FM, its skins and controls, playing in any world.'};
const ID='headphones';
const GEN={made:'composed',mine:'your link',world:'this world',psy:'psytrance',dnb:'drum & bass',amb:'ambient',style:'psypher5 style',p5:'psypher5 original'};
const T=(t,g,c,d,b)=>({t,g,c,d,b});
// Sanctuary Radio = SHOWS.sanctuary over AMBIENT (radio.js); Stardome FM = SHOWS.day over TRACKS (arena-tracks.js)
export const STATIONS=[
 {id:'sanctuary',name:'Sanctuary Radio',tag:'ambient · chatter · shoutouts',list:[
  T('Rhodes Lounge','amb','/cdn/value.45b720ff22fb8c4da05005128b38544dce6ee54007e413c99c6e747a82a8c788.mp3',139.44),
  T('Tidewhale','amb','/cdn/music-whale-song-ambient-ocean-w5xryfru.mp3',110.42),
  T('Nebula Dub','amb','/cdn/deep-space-dub-ambient-track-99vvd59i.mp3',112.54),
  T('Sanctuary Dawn','amb','/cdn/music-sanctuary-bed-ambient-ulv8usn0.mp3',121.44),
  T('Aurora Bells','amb','/cdn/value.764e31ab56ba6f48233cdc965b3ea2cb089d64af5c6d2dd9b442fadbf35e530a.mp3',153.19),
  T('Glass Garden','amb','/cdn/glass-harp-ethereal-ambient-9mp8dyl1.mp3',143.09),
  T('Velvet Lounge','amb','/cdn/music-rhodes-lounge-smooth-jazz-90b3tla7.mp3',148.18),
  T('Sanctuary Choir','amb','/cdn/sanctuary-bed-ambient-choral-sqg5cveh.mp3',124.54),
  T('Orbit Dub','amb','/cdn/music-deep-space-dub-f8egyx39.mp3',134.04),
  T('Moonlit Felt','amb','/cdn/music-starlit-felt-ambient-oges6cod.mp3',152.33),
  T('Aurora Chimes','amb','/cdn/music-aurora-bells-ambient-fantasy-i2yqf8du.mp3',96.79),
  T('Quiet Keys','amb','/cdn/music-keynote-piano-emotional-bevhjch5.mp3',102.58),
  T('Whalefall','amb','/cdn/music-whale-song-underwater-ambient-56x8ic9l.mp3',63.02)]},
 {id:'stardome',name:'Stardome FM',tag:'bangers · live from the arena',list:[
  T('Cathedral at Speed','p5','/cdn/cathedral-at-speed-fast-electronic-3eebp0w2.mp3',101.1,172.3),
  T('Crystal Garden','psy','/cdn/music-psytrance-crystalline-arpeggios-rolling-bass-shuffling-percussion-loop.mp3',135.1,144.2),
  T('Liquid Starlight','dnb','/cdn/music-liquid-drum-and-bass-rolling-breakbeat-warm-reese-bass-soulful-pads-174bpm.mp3',180,173.4),
  T('Salt-Stained Morning','p5','/cdn/salt-stained-morning-synthwave-track-nbbtyt3b.mp3',133.1,160.2),
  T('Euphoria Protocol','style','/cdn/music-cinematic-fast-electronic-soaring-arpeggios-epic-drums-euphoric-build-172bpm.mp3',240,170.3),
  T('Arrival at the Maw','p5','/cdn/music-arrival-at-the-maw-zi5o8wbc.mp3',95.9,175.1),
  T('Acid Lotus','psy','/cdn/music-full-on-psytrance-rolling-offbeat-bassline-acid-squelch-hypnotic-lead-146bpm.mp3',240,144.2),
  T('Neuro Engine','dnb','/cdn/music-neurofunk-drum-and-bass-heavy-growling-bass-amen-break-174bpm.mp3',240,173.4),
  T("The Archmage's Gait",'p5','/cdn/music-the-archmages-gait-electronic-q398fp7v.mp3',24.5,139.7),
  T('Night Ritual','psy','/cdn/music-dark-forest-psytrance-twisting-fx-rolling-bass-night-ritual-150bpm.mp3',240,149.1),
  T('Quantum Entanglement','p5','/cdn/music-quantum-entanglement-cyberpunk-electronic-75me1gb5.mp3',21.75,172.3),
  T("Gravity's Last Stand",'p5','/cdn/gravitys-last-stand-electronic-music-cgv20xfo.mp3',21,149.8)]},
];
// Star Sanctuary's skins, verbatim: bg · edge · glow · text · song · accent · button · button edge · muted · font · radius
export const SKINS=[
 {id:'starfield',name:'Starfield',v:['linear-gradient(180deg,#1a1840ee,#10142dee)','#b08d57','#ba73dc44','#fff0d2','#ba73dc','#ecc482','#2a2350','#b08d57','#9c95bb','inherit','14px']},
 {id:'brass',name:'Brass',v:['linear-gradient(180deg,#3a2616f2,#23160cf2)','#c9974f','#ecc48233','#f6e2bd','#e0a95a','#ffd58a','#4a3120','#c9974f','#b39a78','Georgia,serif','6px']},
 {id:'aurora',name:'Aurora',v:['linear-gradient(160deg,#0d3a40e6,#10242de6 60%,#1f1a44e6)','#55cdbd','#55cdbd55','#e6fffb','#7ff0df','#b9fff4','#10494b','#55cdbd','#8fc2bc','inherit','18px']},
 {id:'neon',name:'Neon Rave',v:['#0a0614f2','#ff3fd8','#ff3fd880','#ffffff','#3ff6ff','#ff3fd8','#1c0b2e','#ff3fd8','#a887c4','inherit','4px']},
 {id:'glass',name:'Glass',v:['#ffffff14','#ffffff33','#00000000','#ffffff','#e3d7ff','#ffffff','#ffffff1a','#ffffff33','#d8d2ee','inherit','16px']},
];
const vars=k=>{const v=(SKINS.find(x=>x.id===k)||SKINS[0]).v;return `--bg:${v[0]};--edge:${v[1]};--glow:${v[2]};--tx:${v[3]};--song:${v[4]};--acc:${v[5]};--btn:${v[6]};--bedge:${v[7]};--mut:${v[8]};--font:${v[9]};--rad:${v[10]}`;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=o=>esc(`sendAction('planApp',${JSON.stringify({id:ID,...o})})`);
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c',brass='#c9a56a',cyan='#53d9e5';
const sub=`font-size:10px;letter-spacing:.16em;color:${brass}`;
// ---------- state ----------
// My Mix: the room's own station. The world's music the Assets scan found (music-* clips) + links pasted here, kept in world.state.slateAppData.headphones.mine.
const FAMS=['lowpoly-cozy','painterly-fantasy','toon-vibrant','voxel-bright','realistic-gritty','scifi-neon','gothic-horror','pixel-bright','pixel-moody'];
const isMusic=u=>/\/cdn\/[^?]*\.(mp3|ogg|wav|m4a|flac)$/i.test(u);
const nice=u=>String(u).split('/').pop().replace(/\.[a-z0-9]+$/i,'').replace(/^(value\.)(.{8}).*/,'upload $2').replace(/^music-/,'').replace(/-[a-z0-9]{8}$/,'').replace(/-/g,' ').slice(0,48);
function mineList(ctx){const ad=ctx?.world?.state?.slateAppData||{},own=(ad[ID]?.mine||[]).filter(t=>t&&isMusic(t.c)),seen=new Set(own.map(t=>t.c)),out=own.map(t=>({t:t.t||nice(t.c),g:t.made?'made':'mine',c:t.c,d:+t.d||180,own:1}));
 for(const it of ad.assets?.items||[])if(it.kind==='sound'&&/\/music-|music/i.test(it.u+' '+(it.name||''))&&!seen.has(it.u)&&!STATIONS.some(S=>S.list.some(x=>x.c===it.u))){seen.add(it.u);out.push({t:it.name||nice(it.u),g:'world',c:it.u,d:180});}
 return out.slice(0,60);}
const PLS=ctx=>(ctx?.world?.state?.slateAppData?.[ID]?.lists||[]).filter(x=>x&&x.id);
function stations(ctx){return [{id:'mine',name:'My Mix',tag:'this world’s music · your links',list:mineList(ctx),own:1},...PLS(ctx).map(P=>({id:P.id,name:P.name,tag:'your playlist',own:1,list:(P.mine||[]).filter(t=>t&&isMusic(t.c)).map(t=>({t:t.t||nice(t.c),g:t.made?'made':'mine',c:t.c,d:+t.d||180,own:1}))})),...STATIONS];}
// the list a track op writes: My Mix (cur.mine) or one of your playlists (cur.lists[i].mine)
function putMine(ctx,pl,fn){const old=ctx.world.state.slateAppData||{},cur=old[ID]||{};if(pl&&pl!=='mine'){const lists=(cur.lists||[]).map(x=>x.id===pl?{...x,mine:fn(x.mine||[])}:x);ctx.world.state.slateAppData={...old,[ID]:{...cur,lists}};}else ctx.world.state.slateAppData={...old,[ID]:{...cur,mine:fn(cur.mine||[])}};} // My Mix always leads, even empty
const stOf=(ctx,i)=>{const L=stations(ctx);return L[((+i||0)%L.length+L.length)%L.length];};
function data(ctx){const d=ctx?.world?.state?.slateAppData?.[ID]||{},L=stations(ctx);let si=L.findIndex(s=>s.id===d.st);if(si<0)si=L[0].list.length?0:1;const S=L[si],n=S.list.length;
 return {playing:!!d.playing&&n>0,si,S,k:n?((Math.floor(+d.track||0)%n)+n)%n:0,vol:Number.isFinite(+d.vol)?Math.max(0,Math.min(1,+d.vol)):.85,mute:!!d.mute,at:+d.at||0};}
const me=p=>({skin:'starfield',...(p?.state?.slateApp_headphones||{})});
function save(ctx,D){const old=ctx.world.state.slateAppData||{};ctx.world.state.slateAppData={...old,[ID]:{...(old[ID]||{}),playing:D.playing,st:D.S.id,track:D.k,vol:D.vol,mute:D.mute,at:D.at}};}
function sound(ctx,D,fresh){const m=ctx?.music;if(!m)return;try{
 if(!D.playing){m.stop?.({fade:1.2});return;}
 const tr=D.S.list[D.k];if(!tr){m.stop?.({fade:1.2});return;}m.play?.(tr.c,{fade:fresh?1.5:.4,volume:D.mute?0:D.vol,loop:true});}catch(e){}}
// ---------- ops ----------
export function op(ctx,player,d,plan){
 const D=data(ctx),n=D.S.list.length,P=me(player);let fresh=false,touch=true;
 switch(d?.op){
  case 'play':if(!n)return false;D.playing=!D.playing;fresh=true;if(D.playing)D.at=ctx.now();break;
  case 'next':case 'prev':if(!n)return false;D.k=(D.k+(d.op==='next'?1:-1)+n)%n;D.playing=true;D.at=ctx.now();fresh=true;break;
  case 'pick':{const k=Math.floor(+d.k);if(!(k>=0&&k<n))return false;if(k===D.k&&D.playing){touch=false;break;}D.k=k;D.playing=true;D.at=ctx.now();fresh=true;break;}
  case 'station':{const si=Number.isFinite(+d.si)?+d.si:D.si+(+d.dir||1);D.S=stOf(ctx,si);D.si=stations(ctx).indexOf(D.S);D.k=0;D.playing=D.S.list.length>0;D.at=ctx.now();fresh=true;break;}
  case 'add':{let u=String(d.url||'').trim();const i=u.indexOf('/cdn/');if(i<0)return false;u=u.slice(i).split(/[?#\s]/)[0];if(!isMusic(u))return false;
   putMine(ctx,d.pl,m=>m.filter(t=>t.c!==u).concat([{c:u,t:String(d.title||'').trim().slice(0,48)||nice(u),d:Math.max(20,Math.min(900,+d.d||180))}]).slice(-40));return false;}
  case 'newList':{const name=String(d.name||'').replace(/\s+/g,' ').trim().slice(0,28)||'Playlist';const old=ctx.world.state.slateAppData||{},cur=old[ID]||{},lists=(cur.lists||[]);if(lists.length>=12)return false;
   const id='pl-'+Math.floor(ctx.now()).toString(36);ctx.world.state.slateAppData={...old,[ID]:{...cur,lists:[...lists,{id,name,mine:[]}],st:id,track:0,playing:false}};sound(ctx,{playing:false},false);return false;}
  case 'delList':{const old=ctx.world.state.slateAppData||{},cur=old[ID]||{};ctx.world.state.slateAppData={...old,[ID]:{...cur,lists:(cur.lists||[]).filter(x=>x.id!==d.pl),...(cur.st===d.pl?{st:'mine',track:0,playing:false}:{})}};if(cur.st===d.pl)sound(ctx,{playing:false},false);return false;}
  case 'compose':{if(!player?.isEditor)return false;const fam=FAMS.includes(d.fam)?d.fam:FAMS[0],vibe=String(d.vibe||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').trim().slice(0,60);if(vibe.length<3)return false;
   const u=`/cdn/moodboard-${fam}/music-${vibe.replace(/\s+/g,'-')}.mp3`,pl=d.pl||'mine';
   putMine(ctx,pl,m=>m.filter(t=>t.c!==u).concat([{c:u,t:vibe.replace(/\b\w/g,c=>c.toUpperCase()),d:180,made:fam}]).slice(-40));const L=stations(ctx),S=L.find(x=>x.id===pl);if(S){D.S=S;D.si=L.indexOf(S);D.k=Math.max(0,S.list.findIndex(t=>t.c===u));D.playing=true;D.at=ctx.now();fresh=true;}break;}
  case 'del':putMine(ctx,d.pl,m=>m.filter(t=>t.c!==d.c));return false;
  case 'vol':D.vol=Math.max(0,Math.min(1,Math.round((+d.v||0)*100)/100));D.mute=false;break;
  case 'mute':D.mute=!D.mute;break;
  case 'skin':case 'menu':case 'mini':touch=false;
   if(player?.state){const nx={...P};if(d.op==='skin'&&SKINS.some(s=>s.id===d.skin))nx.skin=d.skin;if(d.op==='menu')nx.menu=!P.menu;if(d.op==='mini')nx.mini=!!d.on;if(d.op==='screen')nx.screen=nx.screen===false;player.state.slateApp_headphones=nx;}break;
  default:return false;
 }
 if(touch){save(ctx,D);sound(ctx,D,fresh);}
 return false;
}
export function tile(ctx,player){const D=data(ctx);return D.playing&&D.S.list[D.k]?`♪ ${D.S.list[D.k].t}`:`off · ${stations(ctx).length} stations`;}
// ---------- page ----------
const CSS=`<style>
.hp-wrap{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;justify-content:center;padding:14px 10px 18px}
.hp-stage{flex:1 1 300px;max-width:400px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.hp{position:relative;width:100%;max-width:340px;box-sizing:border-box;background:var(--bg);border:1px solid var(--edge);border-radius:var(--rad);box-shadow:0 0 18px var(--glow),0 14px 40px #0008;color:var(--acc);padding:16px 16px 14px;font-size:13px;font-family:var(--font);overflow:hidden}
.hp::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 70% at 50% -10%,var(--glow),transparent 60%)}
.hp>*{position:relative}
.hp-top{display:flex;align-items:center;gap:8px}.hp-top b{flex:none;max-width:62%;font-size:16px;font-weight:normal;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp-btn{background:var(--btn);border:1px solid var(--bedge);color:var(--tx);border-radius:8px;min-width:34px;min-height:32px;cursor:pointer;font-size:14px;font-family:inherit}
.hp-btn:hover{border-color:var(--acc)}.hp-btn.big{min-height:40px;font-size:17px}.hp-btn.on{border-color:var(--acc);box-shadow:0 0 10px var(--glow)}
.hp-tr{color:var(--song);margin-top:8px;font-size:12px;overflow:hidden;white-space:nowrap;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.hp-scroll{display:inline-block;padding-left:4px;animation:hpScroll 16s linear infinite}@keyframes hpScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.hp-now{display:flex;align-items:flex-end;gap:12px;margin:14px 0 6px}
.hp-eq{display:flex;align-items:flex-end;gap:3px;height:38px;flex:none}.hp-eq i{width:5px;height:100%;border-radius:2px;background:var(--song);box-shadow:0 0 8px var(--song);transform-origin:bottom;transform:scaleY(.12)}
.hp-eq.go i{animation:hpEq var(--beat) ease-out infinite}@keyframes hpEq{0%{transform:scaleY(1)}40%{transform:scaleY(.35)}100%{transform:scaleY(.18)}}
.hp-title{min-width:0;flex:1}.hp-title div{color:var(--tx);font-size:19px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hp-title span{color:var(--mut);font-size:11px;letter-spacing:.06em}
.hp-bar{height:3px;border-radius:2px;background:#ffffff1a;overflow:hidden;margin:8px 0 2px}.hp-bar i{display:block;height:100%;width:100%;background:var(--song);transform-origin:left;transform:scaleX(0)}
.hp-bar.go i{animation:hpBar var(--dur) linear infinite;animation-delay:var(--off)}@keyframes hpBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.hp-ctl{display:flex;gap:6px;margin-top:10px;padding-right:30px}.hp-ctl .hp-btn{flex:1}
.hp-row{display:flex;gap:6px;margin-top:6px}.hp-row .hp-btn{flex:1}
.hp-cog{position:absolute;right:8px;bottom:12px;background:none;border:none;color:var(--mut);font-size:15px;cursor:pointer;padding:2px;min-width:24px;min-height:24px}.hp-cog:hover{color:var(--acc)}
.hp-menu{margin-top:12px;padding-top:10px;border-top:1px solid var(--bedge);animation:hpUp .18s ease-out}@keyframes hpUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.hp-mr{display:flex;align-items:center;gap:6px;padding:4px 0;color:var(--tx)}.hp-mr>span:first-child{flex:1}.hp-val{min-width:38px;text-align:center;color:var(--acc)}
.hp-sm{background:var(--btn);border:1px solid var(--bedge);color:var(--tx);border-radius:6px;min-width:28px;min-height:26px;cursor:pointer}
.hp-skins{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:2px}.hp-skin{display:flex;align-items:center;gap:5px;background:var(--bg);border:1px solid var(--edge);color:var(--tx);border-radius:8px;min-height:28px;padding:3px 6px;cursor:pointer;font-size:11px;font-family:var(--font);white-space:nowrap;overflow:hidden}
.hp-skin i{width:9px;height:9px;border-radius:50%;background:var(--song);flex:none;box-shadow:0 0 6px var(--song)}.hp-skin.on{outline:2px solid var(--acc);outline-offset:1px}
.hp-mini{width:64px;height:64px;border-radius:50%;background:var(--bg);border:1px solid var(--edge);color:var(--tx);font-size:28px;cursor:pointer;box-shadow:0 0 8px var(--glow)}.hp-mini.go{animation:hpBeat var(--beat) ease-out infinite}
@keyframes hpBeat{0%{transform:scale(1.14);box-shadow:0 0 26px var(--song)}35%{transform:scale(1);box-shadow:0 0 8px var(--glow)}100%{transform:scale(1);box-shadow:0 0 6px var(--glow)}}
.hp-note{font-size:10.5px;color:${dim};text-align:center;max-width:340px;line-height:1.45}
.hp-list{flex:1 1 300px;max-width:440px;min-width:0;background:#111b2c;border:1px solid ${line};border-radius:8px;padding:12px}
.hp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px}.hp-pill{background:#1a2b3d;border:1px solid ${line};color:${ink};border-radius:999px;padding:4px 11px;font-size:11px;cursor:pointer}.hp-pill.on{border-color:${cyan};color:${cyan}}
.hp-it{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;border-bottom:1px solid ${line};color:${ink};padding:7px 4px;cursor:pointer;text-align:left;font-size:12.5px}
.hp-it:hover{background:#1a2b3d}.hp-it .n{width:20px;flex:none;color:${dim};font-size:10px;text-align:right}.hp-it .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hp-it .g{flex:none;color:${dim};font-size:10px;letter-spacing:.06em}
.hp-x{flex:none;background:none;border:none;border-bottom:1px solid ${line};color:${dim};cursor:pointer;padding:7px 6px}.hp-x:hover{color:#ff9156}
.hp-it.on .t,.hp-it.on .n{color:${cyan}}
</style>`;
const mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function deck(ctx,player){
 const D=data(ctx),P=me(player),tr=D.S.list[D.k]||{t:'My Mix is empty · add a track',g:'',c:'',d:180,b:72},now=(()=>{try{return ctx?.now?.()||0}catch(e){return 0}})();
 const beat=(60/Math.max(40,Math.min(200,tr.b||72))).toFixed(3)+'s',el=D.playing&&D.at?((now-D.at)/1000)%tr.d:0;
 const go=D.playing&&!D.mute?' go':'',gen=esc(GEN[tr.g]||'psypher5 original');
 const style=`${vars(P.skin)};--beat:${beat};--dur:${tr.d}s;--off:-${el.toFixed(1)}s`;
 const marquee=`♪ ${esc(tr.t)} · ${gen}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
 const menu=P.menu?`<div class="hp-menu"><div class="hp-mr"><span>Volume</span><button class="hp-sm" title="Quieter" onclick="${A({op:'vol',v:Math.max(0,D.vol-.15)})}">−</button><span class="hp-val">${Math.round(D.vol*100)}%</span><button class="hp-sm" title="Louder" onclick="${A({op:'vol',v:Math.min(1,D.vol+.15)})}">+</button></div>
<div class="hp-mr"><span>On-screen player</span><button class="hp-sm" style="min-width:58px" title="show this deck on your screen while music plays" onclick="${A({op:'screen'})}">${P.screen===false?'Off':'On'}</button></div>
<div class="hp-mr"><span>Skin</span></div><div class="hp-skins">${SKINS.map(k=>`<button class="hp-skin ${k.id===P.skin?'on':''}" style="${vars(k.id)}" title="${k.name}" onclick="${A({op:'skin',skin:k.id})}"><i></i>${k.name}</button>`).join('')}</div></div>`:'';
 const card=P.mini
  ?`<button class="hp-mini${go}" style="${style}" title="${esc(D.S.name)} · ${esc(tr.t)}" onclick="${A({op:'mini',on:false})}">🎧</button>`
  :`<div class="hp" style="${style}">
<button class="hp-cog" title="Radio settings" onclick="${A({op:'menu'})}">⚙</button>
<div class="hp-top"><b>🎧 ${esc(D.S.name)}</b><div class="hp-tr" style="flex:1;min-width:0;margin-top:0"><span class="hp-scroll">${marquee}${marquee}</span></div></div>
<div class="hp-now"><div class="hp-eq${go}">${[0,.18,.07,.27,.12].map(d=>`<i style="animation-delay:-${d}s"></i>`).join('')}</div><div class="hp-title"><span>${D.playing?(D.mute?'MUTED':'ON AIR'):'OFF AIR'} · ${D.k+1}/${D.S.list.length}</span><div title="${esc(tr.t)}">${esc(tr.t)}</div><span>${gen}${tr.b?' · '+Math.round(tr.b)+' bpm':''} · ${mmss(tr.d)}</span></div></div>
<div class="hp-bar${D.playing?' go':''}"><i></i></div>
<div class="hp-ctl"><button class="hp-btn" title="Collapse" onclick="${A({op:'mini',on:true})}">▾</button><button class="hp-btn" title="Previous station" onclick="${A({op:'station',dir:-1})}">◀</button><button class="hp-btn" title="Next station" onclick="${A({op:'station',dir:1})}">▶</button><button class="hp-btn ${D.mute?'on':''}" title="${D.mute?'Unmute':'Mute'}" onclick="${A({op:'mute'})}">${D.mute?'🔇':'🔊'}</button></div>
<div class="hp-row" style="padding-right:30px"><button class="hp-btn big" title="Previous track" onclick="${A({op:'prev'})}">⏮</button><button class="hp-btn big ${D.playing?'on':''}" title="${D.playing?'Pause':'Play'}" onclick="${A({op:'play'})}">${D.playing?'❚❚':'►'}</button><button class="hp-btn big" title="Next track" onclick="${A({op:'next'})}">⏭</button></div>
${menu}</div>`;
 return {card,D};
}
export function page(ctx,player,plan){
 const {card,D}=deck(ctx,player);
 const send=esc(`var r=this.closest('.hp-add'),u=r.querySelector('.hp-u').value,t=r.querySelector('.hp-n').value;if(u.indexOf('/cdn/')<0){r.querySelector('.hp-msg').textContent='paste a /cdn/ mp3 link';return}sendAction('planApp',{id:'${ID}',op:'add',pl:'${D.S.id}',url:u,title:t});r.querySelector('.hp-u').value='';r.querySelector('.hp-n').value='';r.querySelector('.hp-msg').textContent='added to ${esc(D.S.name).replace(/'/g,'')}'`);
 const kd=`event.stopPropagation()`;
 const comp=esc(`var r=this.closest('.hp-comp'),v=r.querySelector('.hp-v').value;if(v.trim().length<3)return;sendAction('planApp',{id:'${ID}',op:'compose',pl:'${D.S.id}',fam:r.querySelector('.hp-f').value,vibe:v});r.querySelector('.hp-v').value=''`);
 const addBox=`<div class="hp-add" style="margin-top:10px;padding-top:10px;border-top:1px solid ${line}"><div style="${sub};margin-bottom:6px">ADD TO ${esc(D.S.name.toUpperCase())}</div>
<input class="hp-u" placeholder="paste an mp3 link (/cdn/…mp3)" onkeydown="${kd}" onkeyup="${kd}" style="width:100%;box-sizing:border-box;background:#0d1522;border:1px solid ${line};color:${ink};padding:7px;border-radius:6px;font-size:12px;margin-bottom:6px">
<div style="display:flex;gap:6px"><input class="hp-n" placeholder="name (optional)" onkeydown="${kd}" onkeyup="${kd}" style="flex:1;min-width:0;background:#0d1522;border:1px solid ${line};color:${ink};padding:7px;border-radius:6px;font-size:12px"><button onclick="${send}" style="background:${brass};border:none;color:#111b2c;border-radius:6px;padding:0 14px;font-weight:700;cursor:pointer">+ Add</button></div>
${player?.isEditor?`<div class="hp-comp" style="margin-top:12px"><div style="${sub};margin-bottom:6px">✦ COMPOSE A NEW TRACK</div><div style="display:flex;gap:6px;margin-bottom:6px"><select class="hp-f" onkeydown="${kd}" style="background:#0d1522;border:1px solid ${line};color:${ink};padding:6px;border-radius:6px;font-size:12px">${FAMS.map(f=>`<option value="${f}">${f.replace('-',' ')}</option>`).join('')}</select><input class="hp-v" placeholder="a vibe: rainy den lofi, boss fight drums…" onkeydown="${kd}" onkeyup="${kd}" style="flex:1;min-width:0;background:#0d1522;border:1px solid ${line};color:${ink};padding:7px;border-radius:6px;font-size:12px"></div><button onclick="${comp}" style="width:100%;background:${cyan};border:none;color:#111b2c;border-radius:6px;padding:7px;font-weight:700;cursor:pointer">✦ Compose &amp; play</button><div style="font-size:10.5px;color:${dim};margin-top:5px">written the first time it plays (give it a few seconds) · same vibe = same track, new words = a new one</div></div>`:''}
<div class="hp-msg" style="font-size:10.5px;color:${dim};margin-top:5px">My Mix also picks up this world's own music when Assets scans · any Spawn /cdn/ mp3 works, from any of your games</div></div>`;
 const list=`<div class="hp-list"><div style="${sub}">STATIONS</div>
<div class="hp-pills">${stations(ctx).map((s,i)=>`<button class="hp-pill ${i===D.si?'on':''}" title="${esc(s.tag)}" onclick="${A({op:'station',si:i})}">${esc(s.name)} <span style="opacity:.6;font-size:10px">${s.list.length}</span></button>`).join('')}${PLS(ctx).length<12?`<button class="hp-pill hp-plus" title="new playlist" onclick="var i=this.nextElementSibling;this.hidden=true;i.hidden=false;i.focus()">+</button><input hidden class="hp-pn" placeholder="playlist name, Enter" maxlength="28" onkeyup="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key==='Enter'&&this.value.trim()){${esc(`sendAction('planApp',{id:'${ID}',op:'newList',name:this.value})`)};this.value=''}if(event.key==='Escape')this.blur()" onblur="this.hidden=true;this.previousElementSibling.hidden=false" style="background:#0d1522;border:1px solid ${line};color:${ink};padding:5px 8px;border-radius:99px;font-size:12px;width:150px">`:''}</div>
<div style="${sub};margin-bottom:4px;display:flex;align-items:center;gap:8px"><span style="flex:1">${esc(D.S.name.toUpperCase())} · ${esc(D.S.tag.toUpperCase())}</span>${/^pl-/.test(D.S.id)?`<button class="hp-x" title="delete this playlist" onclick="${A({op:'delList',pl:D.S.id})}">delete list</button>`:''}</div>
${D.S.list.map((t,i)=>`<button class="hp-it ${i===D.k?'on':''}" title="play ${esc(t.t)}" onclick="${A({op:'pick',k:i})}"><span class="n">${i===D.k&&D.playing?'♪':i+1}</span><span class="t">${esc(t.t)}</span><span class="g">${esc(GEN[t.g]||'')}</span></button>${t.own?`<button class="hp-x" title="remove from My Mix" onclick="${A({op:'del',pl:D.S.id,c:t.c})}">✕</button>`:''}`).map(b=>`<div style="display:flex;align-items:center">${b}</div>`).join('')}${D.S.own?(D.S.list.length?'':`<div style="font-size:12px;color:${dim};padding:10px 2px">nothing in ${esc(D.S.name)} yet. paste a track below, or compose one</div>`)+addBox:''}</div>`;
 return `${CSS}<div class="hp-wrap"><div class="hp-stage">${card}<div class="hp-note">plays for everyone in this room · while it plays, this deck rides your screen (⚙ to turn that off)</div></div>${list}</div>`;
}

// the on-screen player: Star Sanctuary's radio card (scripts/radio-ui.js there), same layout, sizes and skins, bottom-left while Headphones plays.
// ▾ folds it to the 🎧 bubble that pulses on the beat; tap the bubble to open it again. Its 📞 (DJ Lumen) is Star Sanctuary's own, so ⏭ next track sits there.
export function hud(ctx,player){try{
 if(!ctx?.world?.state?.slateApps?.[ID])return '';const P=me(player);if(P.screen===false)return '';
 const D=data(ctx);if(!D.playing)return '';
 const pl=ctx.world.state.plan||{};if(player?.state?.slate==='open'&&pl.tab==='app-'+ID)return '';
 const tr=D.S.list[D.k],gen=esc(GEN[tr.g]||'psypher5 original'),beat=(60/Math.max(40,Math.min(200,tr.b||72))).toFixed(3);
 const B=o=>A(o).split('sendAction(&#39;planApp').join('sendAction(&#39;slate:planApp');
 if(P.mini)return `<style>.rad-mini{position:fixed;left:16px;bottom:16px;z-index:4;width:52px;height:52px;border-radius:50%;background:var(--bg);border:1px solid var(--edge);color:var(--tx);font-size:24px;cursor:pointer;backdrop-filter:blur(6px);animation:radBeat ${beat}s ease-out infinite}@keyframes radBeat{0%{transform:scale(1.14);box-shadow:0 0 26px var(--song)}35%{transform:scale(1);box-shadow:0 0 8px var(--glow)}100%{transform:scale(1);box-shadow:0 0 6px var(--glow)}}</style><button class="rad-mini" id="radio-card" style="${vars(P.skin)}" title="${esc(D.S.name)} · ${esc(tr.t)}" aria-label="Open radio" onpointerdown="event.stopPropagation()" onclick="${B({op:'mini',on:false})}">🎧</button>`;
 const menu=P.menu?`<div class="rad-menu"><div class="rad-row"><span>Volume</span><button class="rad-sm" onclick="${B({op:'vol',v:Math.max(0,D.vol-.15)})}" aria-label="Quieter">−</button><span class="rad-val">${Math.round(D.vol*100)}%</span><button class="rad-sm" onclick="${B({op:'vol',v:Math.min(1,D.vol+.15)})}" aria-label="Louder">+</button></div>
<div class="rad-row"><span>Playing</span><button class="rad-tog on" onclick="${B({op:'prev'})}">⏮</button><button class="rad-tog on" onclick="${B({op:'play'})}">Stop</button><button class="rad-tog on" onclick="${B({op:'next'})}">⏭</button></div>
<div class="rad-row"><span>On-screen player</span><button class="rad-tog on" onclick="${B({op:'screen'})}">On</button></div>
<div class="rad-row"><span>Skin</span></div><div class="rad-skins">${SKINS.map(k=>`<button class="rad-skin ${k.id===P.skin?'on':''}" style="${vars(k.id)}" title="${k.name}" onclick="${B({op:'skin',skin:k.id})}"><i></i>${k.name}</button>`).join('')}</div></div>`:'';
 const line=`♪ ${esc(tr.t)} · ${gen}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
 return `<style>.rad{position:fixed;left:16px;bottom:16px;width:320px;z-index:4;background:var(--bg);border:1px solid var(--edge);border-radius:var(--rad);box-shadow:0 0 18px var(--glow);color:var(--acc);padding:12px 14px;font-size:13px;font-family:var(--font);backdrop-filter:blur(6px);box-sizing:border-box}
.rad-top{display:flex;align-items:center;gap:8px}.rad-top b{flex:none;max-width:60%;font-size:15px;font-weight:normal;color:var(--tx);white-space:nowrap}.rad-top .rad-tr{flex:1;min-width:0;margin-top:0}.rad-btn{background:var(--btn);border:1px solid var(--bedge);color:var(--tx);border-radius:8px;min-width:34px;min-height:30px;cursor:pointer;font-size:14px}
.rad-tr{color:var(--song);margin-top:6px;font-size:12px;overflow:hidden;white-space:nowrap;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}.rad-scroll{display:inline-block;padding-left:4px;animation:radScroll 16s linear infinite}@keyframes radScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}.rad-ctl{display:flex;gap:6px;margin-top:8px;padding-right:30px}.rad-ctl .rad-btn{flex:1}
.rad-menu{animation:radUp .18s ease-out;position:absolute;left:0;right:0;bottom:calc(100% + 8px);background:var(--bg);border-radius:var(--rad);box-shadow:0 0 18px var(--glow);backdrop-filter:blur(6px);padding:10px 12px}@keyframes radUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.rad-cog{position:absolute;right:8px;bottom:10px;background:none;border:none;color:var(--mut);font-size:15px;cursor:pointer;padding:2px;min-width:24px;min-height:24px}.rad-cog:hover{color:var(--acc)}
.rad-row{display:flex;align-items:center;gap:6px;padding:4px 0;color:var(--tx)}.rad-row>span:first-child{flex:1}.rad-val{min-width:38px;text-align:center;color:var(--acc)}.rad-sm{background:var(--btn);border:1px solid var(--bedge);color:var(--tx);border-radius:6px;min-width:28px;min-height:26px;cursor:pointer}
.rad-tog{background:transparent;border:1px solid var(--bedge);color:var(--mut);border-radius:12px;min-width:50px;min-height:26px;cursor:pointer;font:inherit;font-size:12px}.rad-tog.on{background:var(--btn);border-color:var(--acc);color:var(--tx)}
.rad-skins{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:2px}.rad-skin{display:flex;align-items:center;gap:5px;background:var(--bg);border:1px solid var(--edge);color:var(--tx);border-radius:8px;min-height:28px;padding:3px 6px;cursor:pointer;font-size:11px;font-family:var(--font);white-space:nowrap;overflow:hidden}.rad-skin i{width:9px;height:9px;border-radius:50%;background:var(--song);flex:none;box-shadow:0 0 6px var(--song)}.rad-skin.on{outline:2px solid var(--acc);outline-offset:1px}</style>
<div class="rad" id="radio-card" style="${vars(P.skin)}" onpointerdown="event.stopPropagation()">${menu}
<button class="rad-cog" title="Radio settings" aria-label="Radio settings" onclick="${B({op:'menu'})}">⚙</button><div class="rad-top"><b>🎧 ${esc(D.S.name)}</b><div class="rad-tr"><span class="rad-scroll">${line}${line}</span></div></div><div class="rad-ctl"><button class="rad-btn" title="Collapse" aria-label="Collapse radio" onclick="${B({op:'mini',on:true})}">▾</button><button class="rad-btn" onclick="${B({op:'station',dir:-1})}" aria-label="Previous station">◀</button><button class="rad-btn" onclick="${B({op:'station',dir:1})}" aria-label="Next station">▶</button><button class="rad-btn" title="${D.mute?'Unmute':'Mute'}" aria-label="Mute music" onclick="${B({op:'mute'})}">${D.mute?'🔇':'🔊'}</button><button class="rad-btn" title="Next track" aria-label="Next track" onclick="${B({op:'next'})}">⏭</button></div>
</div>`;
}catch(e){return ''}}
