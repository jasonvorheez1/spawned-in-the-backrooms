// Slate built-in app: how the game is doing. Contract: lib/apps/index.js.
// Reads the game's own SQL: slate_play (one row a player: minutes, sessions, first, last) and slate_day (one row a player a day),
// both kept by mods/slate/input.js every 30 s for every walking player. A refresh runs on the editor's body (where ctx.sql is)
// and writes world.state.slateAppData.metrics = { at, mode, days:[{d,players,minutes,new,plays}], totals, top }.
export const APP={id:'metrics',name:'METRICS',glyph:'📈',color:'#8a6a2c',sub:'players and plays',about:'Daily players and plays, milestones and stats, read live from the game.'};
const ID='metrics',STALE=10*60*1000,SPAN=30;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUB='font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#c9a56a;font-weight:600';
const BTN='background:#1a2638;color:#d9e0d9;border:1px solid #2c3b4c;border-radius:14px;padding:4px 12px;font-size:12px;cursor:pointer';
const num=v=>Number.isFinite(+v)?+v:0;
const fmtMin=m=>{m=num(m);return m>=600?Math.round(m/60)+' h':m>=60?(m/60).toFixed(1)+' h':Math.round(m)+' min';};
const ago=ms=>{const s=Math.max(0,Math.round(ms/1000));return s<60?'just now':s<3600?Math.round(s/60)+' min ago':s<86400?Math.round(s/3600)+' h ago':Math.round(s/86400)+' d ago';};
const dayKey=ms=>new Date(ms).toISOString().slice(0,10);
// the shared link click: opens a tab, or shows the address selected and copied when the tablet can't open one
const link=(u,label,title)=>`<a href="${esc(u)}" target="_blank" title="${esc(title||u)}" onpointerdown="event.stopPropagation()" onclick="event.preventDefault();var u=this.href,w=null;try{w=window.open(u,'_blank','noopener')}catch(e){}if(!w){try{navigator.clipboard.writeText(u)}catch(e){}var s=document.createElement('input');s.value=u;s.readOnly=true;s.onclick=function(ev){ev.stopPropagation();this.select()};s.style.cssText='width:260px;font-size:11px;background:#111b2c;color:#c9a56a;border:1px solid #a37d45;padding:2px 6px';this.replaceWith(s);s.select();s.title='copied, paste it in your browser'}" style="color:#53d9e5;text-decoration:none;white-space:nowrap">${label}</a>`;

function write(ctx,row){const S=ctx.world.state,old=S.slateAppData||{};S.slateAppData={...old,[ID]:{...(old[ID]||{}),...row}};}
export function refresh(ctx){
 const S=ctx.world.state,cur=S.slateAppData?.[ID]||{},t=ctx.now();
 if(cur.busy&&t-num(cur.busyAt)<20000)return;
 if(typeof ctx.sql!=='function'){write(ctx,{err:'this machine holds no database; open METRICS on an editor body',busy:false});return;}
 write(ctx,{busy:true,busyAt:t,err:null});
 const q=ctx.sql;
 const from=`-${SPAN-1} days`;
 Promise.resolve(q`CREATE TABLE IF NOT EXISTS slate_play(user TEXT PRIMARY KEY,name TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,first TEXT,last TEXT);
  CREATE TABLE IF NOT EXISTS slate_day(day TEXT,user TEXT,minutes REAL DEFAULT 0,sessions INTEGER DEFAULT 0,PRIMARY KEY(day,user))`)
 .then(()=>Promise.all([
  q`SELECT day d,count(*) players,sum(minutes) minutes,sum(sessions) plays FROM slate_day WHERE day>=date('now',${from}) GROUP BY day ORDER BY day`,
  q`SELECT date(first) d,count(*) n FROM slate_play WHERE date(first)>=date('now',${from}) GROUP BY date(first)`,
  q`SELECT count(*) players,coalesce(sum(minutes),0) minutes,coalesce(sum(sessions),0) sessions FROM slate_play`,
  q`SELECT count(DISTINCT CASE WHEN day=date('now') THEN user END) today,count(DISTINCT CASE WHEN day>=date('now','-6 days') THEN user END) p7,count(DISTINCT user) p30,coalesce(sum(minutes),0) m30,coalesce(sum(sessions),0) s30 FROM slate_day WHERE day>=date('now',${from})`,
  q`SELECT name,minutes,sessions,first,last FROM slate_play ORDER BY minutes DESC LIMIT 10`,
  q`SELECT date('now') today`]))
 .then(([d,n,tot,win,top,now])=>{
  const nw={};for(const r of n?.rows||[])nw[r.d]=num(r.n);
  const by={};for(const r of d?.rows||[])by[r.d]={players:num(r.players),minutes:Math.round(num(r.minutes)*10)/10,plays:num(r.plays)};
  const today=now?.rows?.[0]?.today||dayKey(ctx.now()),T=Date.parse(today+'T12:00:00Z'),days=[];
  for(let i=SPAN-1;i>=0;i--){const k=dayKey(T-i*86400000);days.push({d:k,players:by[k]?.players||0,minutes:by[k]?.minutes||0,plays:by[k]?.plays||0,new:nw[k]||0});}
  const a=tot?.rows?.[0]||{},w=win?.rows?.[0]||{};
  write(ctx,{at:ctx.now(),mode:ctx.world.mode||'',busy:false,err:null,today,days,
   totals:{players:num(a.players),minutes:Math.round(num(a.minutes)),sessions:num(a.sessions),today:num(w.today),p7:num(w.p7),p30:num(w.p30),m30:Math.round(num(w.m30)),s30:num(w.s30)},
   top:(top?.rows||[]).map(r=>({name:String(r.name||'player').slice(0,40),minutes:Math.round(num(r.minutes)*10)/10,sessions:num(r.sessions),first:r.first||'',last:r.last||''})),
   pend:Object.keys(ctx.world.state.slatePlayPend||{}).length});})
 .catch(e=>write(ctx,{busy:false,err:String(e?.message||e).slice(0,200)}));
}
export function op(ctx,player,d,plan){
 const cur=ctx.world.state.slateAppData?.[ID];
 if(d?.op==='refresh'){refresh(ctx);return false;}
 if(d?.op==='range'){player.state[`slateApp_${ID}`]={...(player.state[`slateApp_${ID}`]||{}),range:+d.range===7?7:30};}
 if(!cur?.at||ctx.now()-num(cur.at)>STALE)refresh(ctx); // any METRICS press tops the numbers up when they are older than 10 minutes
 return false;
}
export function tile(ctx,player){const m=ctx?.world?.state?.slateAppData?.[ID];if(!m?.totals)return 'press refresh';return `${m.totals.today} today · ${m.totals.p7} this week`;}

function chart(days,range){
 // shapes in a stretched SVG (100 units tall, 10 a day), labels as page text: crisp and readable from a phone to a wide tablet
 const D=days.slice(-range),n=D.length,VW=n*10,HP=170;
 const maxP=Math.max(1,...D.map(x=>x.players)),maxM=Math.max(1,...D.map(x=>x.minutes));
 const pT=maxP<=4?4:maxP<=20?Math.ceil(maxP/4)*4:Math.ceil(maxP/20)*20,mT=maxM<=40?Math.ceil(maxM/8)*8||8:Math.ceil(maxM/40)*40;
 const y=v=>100*(1-v/pT),ym=v=>4+92*(1-v/mT);
 const NS='vector-effect="non-scaling-stroke"';
 let g='',yl='',yr='';for(let i=0;i<=4;i++){const yy=100*i/4;g+=`<line x1="0" x2="${VW}" y1="${yy}" y2="${yy}" stroke="#2c3b4c" stroke-width="1" ${NS}${i<4?' stroke-dasharray="2 4"':''}/>`;
  const top=`top:${(yy/100*HP).toFixed(1)}px;transform:translateY(-50%)`;yl+=`<span style="position:absolute;right:0;${top}">${Math.round(pT*(1-i/4))}</span>`;yr+=`<span style="position:absolute;left:0;${top}">${Math.round(mT*(1-i/4))}</span>`;}
 let bars='',pts=[],lab='';
 D.forEach((x,i)=>{const cx=i*10+5,last=i===n-1,col=last?'#53d9e5':'#a37d45';
  const tip=`${x.d}: ${x.players} player${x.players===1?'':'s'}, ${x.plays} play${x.plays===1?'':'s'}, ${fmtMin(x.minutes)}${x.new?`, ${x.new} new`:''}`;
  bars+=`<g><title>${esc(tip)}</title><rect x="${i*10}" y="0" width="10" height="100" fill="transparent"/>`;
  if(x.players){const h=Math.max(1,100-y(x.players));bars+=`<rect x="${cx-3.4}" y="${100-h}" width="6.8" height="${h}" fill="${col}"${last?'':' fill-opacity=".85"'}/>`;
   if(x.new&&!last){const hn=Math.max(1,100-y(Math.min(x.new,x.players)));bars+=`<rect x="${cx-3.4}" y="${100-h}" width="6.8" height="${Math.min(h,hn)}" fill="#c9a56a"/>`;}}
  else bars+=`<rect x="${cx-3.4}" y="99.4" width="6.8" height=".6" fill="${last?'#53d9e5':'#2c3b4c'}"/>`;
  bars+='</g>';pts.push(`${cx},${ym(x.minutes).toFixed(2)}`);
  const step=range>14?7:1;if((n-1-i)%step===0){const dt=new Date(x.d+'T12:00:00Z');
   lab+=`<span style="position:absolute;left:${((cx/VW)*100).toFixed(2)}%;transform:translateX(-50%);white-space:nowrap;color:${last?'#53d9e5':'#8a9aa0'}">${last?'today':range>14?dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}):dt.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'})}</span>`;}});
 const line=`<polyline points="${pts.join(' ')}" fill="none" stroke="#d9e0d9" stroke-opacity=".8" stroke-width="1.8" stroke-linejoin="round" ${NS}/>`;
 const ax='font-size:10px;color:#8a9aa0;position:relative;flex:0 0 auto;font-variant-numeric:tabular-nums';
 return `<div style="display:flex;justify-content:space-between;font-size:9px;letter-spacing:.14em;margin:0 2px 6px"><span style="color:#a37d45">PLAYERS</span><span style="color:#d9e0d9;opacity:.75">MINUTES</span></div>
 <div style="display:flex;gap:6px;align-items:flex-start"><div style="${ax};width:22px;height:${HP}px">${yl}</div>
 <div style="flex:1 1 auto;min-width:0"><svg viewBox="0 0 ${VW} 100" preserveAspectRatio="none" style="display:block;width:100%;height:${HP}px;overflow:visible">${g}${bars}${line}</svg>
 <div style="position:relative;height:16px;margin-top:5px;font-size:10px">${lab}</div></div>
 <div style="${ax};width:24px;height:${HP}px">${yr}</div></div>`;
}
const card=(label,value,sub,accent)=>`<div style="flex:1 1 92px;min-width:0;box-sizing:border-box;max-width:220px;background:#0d1626;border:1px solid #2c3b4c;border-radius:8px;padding:10px 12px">
 <div style="${SUB};color:#8a9aa0">${label}</div><div style="font-size:24px;line-height:1.15;margin-top:4px;color:${accent||'#d9e0d9'};font-variant-numeric:tabular-nums">${value}</div><div style="font-size:11px;color:#8a9aa0;margin-top:2px">${sub}</div></div>`;
const sect=(t,right='')=>`<div style="display:flex;align-items:center;gap:8px;margin:18px 0 8px"><span style="${SUB}">${t}</span><span style="flex:1;height:1px;background:#2c3b4c"></span>${right}</div>`;

export function page(ctx,player,plan){
 const m=ctx?.world?.state?.slateAppData?.[ID]||{},now=ctx?.now?.()??0,range=player?.state?.[`slateApp_${ID}`]?.range===7?7:30;
 const pg=plan?.game?.page||ctx?.world?.state?.plan?.game?.page||'https://spawn.co/@psypher5/the-first-den';
 const R=`sendAction('planApp',{id:'${ID}',op:'refresh'})`;
 const mode=m.mode==='live'?'posted game':m.mode==='dev'?'build room':'';
 const head=`<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px">
  <span style="width:8px;height:8px;border-radius:50%;background:${m.busy?'#ff9156':m.at&&now-m.at<STALE?'#53d9e5':'#8a9aa0'};display:inline-block"></span>
  <span style="color:#d9e0d9;font-size:13px">${m.busy?'reading the database…':m.at?`updated ${ago(now-m.at)}`:'not read yet'}</span>
  ${mode?`<span style="${SUB};color:#8a9aa0;border:1px solid #2c3b4c;border-radius:10px;padding:2px 8px" title="each room keeps its own database: the build room counts builders, the posted game counts players">${mode}</span>`:''}
  <span style="flex:1"></span>
  <span style="display:inline-flex;border:1px solid #2c3b4c;border-radius:14px;overflow:hidden">${[7,30].map(r=>`<button onclick="sendAction('planApp',{id:'${ID}',op:'range',range:${r}})" style="background:${r===range?'#a37d45':'transparent'};color:${r===range?'#0a121e':'#d9e0d9'};font-weight:${r===range?600:400};border:0;padding:4px 10px;font-size:12px;cursor:pointer">${r} days</button>`).join('')}</span>
  <button onclick="${R}" style="${BTN}" title="read the numbers again from the game's database">↻ refresh</button></div>
  ${m.err?`<div style="margin-top:8px;color:#ff9156;font-size:12px">${esc(m.err)}</div>`:''}`;
 if(!m.days){return `<div style="padding:14px 16px;max-width:1040px;margin:0 auto;color:#d9e0d9">${head}
  <div style="margin:36px auto;text-align:center;color:#8a9aa0;max-width:340px;line-height:1.5">No numbers yet. Press <b style="color:#d9e0d9">↻ refresh</b> to read who has played, day by day.<br><span style="font-size:12px">Every player's minutes are counted every 30 s while they walk the world.</span></div>${extras(ctx,plan,pg)}</div>`;}
 const t=m.totals||{},D=m.days||[],td=D[D.length-1]||{},avg=t.p30?t.m30/t.p30:0,pl7=D.slice(-7).reduce((a,x)=>a+num(x.plays),0);
 const tiles=`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
  ${card('today',num(t.today),`${num(td.plays)} play${td.plays===1?'':'s'} · ${fmtMin(td.minutes)}`,'#53d9e5')}
  ${card('7 days',num(t.p7),`${pl7} plays`)}
  ${card('30 days',num(t.p30),`${num(t.s30)} plays · ${fmtMin(t.m30)}`)}
  ${card('avg per player',fmtMin(avg).replace(' ','<span style="font-size:13px;color:#8a9aa0"> ')+'</span>','last 30 days')}
  ${card('all time',num(t.players),`${num(t.sessions)} sessions · ${fmtMin(t.minutes)}`,'#c9a56a')}</div>`;
 const newN=D.slice(-range).reduce((a,x)=>a+num(x.new),0);
 const legend=`<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:#8a9aa0;margin-top:6px">
  <span><i style="display:inline-block;width:9px;height:9px;background:#a37d45;border-radius:2px;margin-right:5px"></i>players</span>
  <span><i style="display:inline-block;width:9px;height:9px;background:#c9a56a;border-radius:2px;margin-right:5px"></i>new players (${newN})</span>
  <span><i style="display:inline-block;width:9px;height:9px;background:#53d9e5;border-radius:2px;margin-right:5px"></i>today</span>
  <span><i style="display:inline-block;width:14px;height:2px;background:#d9e0d9;opacity:.75;vertical-align:middle;margin-right:5px"></i>minutes played</span></div>`;
 const top=(m.top||[]).length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums">
  <tr style="color:#8a9aa0;text-align:left"><th style="padding:4px 6px;font-weight:500">#</th><th style="padding:4px 6px;font-weight:500">player</th><th style="padding:4px 6px;font-weight:500;text-align:right">time</th><th style="padding:4px 6px;font-weight:500;text-align:right">plays</th><th style="padding:4px 6px;font-weight:500;text-align:right">last seen</th></tr>
  ${m.top.map((r,i)=>{const mx=num(m.top[0]?.minutes)||1;return `<tr style="border-top:1px solid #2c3b4c"><td style="padding:6px;color:${i<3?'#c9a56a':'#8a9aa0'}">${i+1}</td>
   <td style="padding:6px;color:#d9e0d9;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}<div style="height:3px;margin-top:4px;border-radius:2px;background:#a37d45;opacity:.7;width:${Math.max(3,Math.round(num(r.minutes)/mx*100))}%"></div></td>
   <td style="padding:6px;text-align:right;color:#d9e0d9">${fmtMin(r.minutes)}</td><td style="padding:6px;text-align:right;color:#8a9aa0">${num(r.sessions)}</td>
   <td style="padding:6px;text-align:right;color:#8a9aa0;white-space:nowrap">${r.last?esc(String(r.last).slice(0,10)):''}</td></tr>`;}).join('')}</table></div>`
  :`<div style="color:#8a9aa0;font-size:12px">Nobody on the ledger yet.</div>`;
 return `<div style="padding:14px 16px;max-width:1040px;margin:0 auto;color:#d9e0d9">${head}${tiles}
  ${sect(`players a day · last ${range} days`)}<div style="background:#0d1626;border:1px solid #2c3b4c;border-radius:8px;padding:10px 8px 6px">${chart(D,range)}</div>${legend}
  <div style="display:flex;flex-wrap:wrap;gap:0 24px"><div style="flex:1 1 300px;min-width:0">${sect('top players','<span style="font-size:11px;color:#8a9aa0">by time played</span>')}${top}</div>
  <div style="flex:1 1 300px;min-width:0">${extras(ctx,plan,pg)}</div></div>
  ${m.pend?`<div style="margin-top:12px;font-size:11px;color:#8a9aa0">${m.pend} player${m.pend===1?'':'s'} still waiting to be poured into the ledger.</div>`:''}</div>`;
}
// the platform's numbers Savi copies in (plan.stats / plan.game), and where milestones and stats live
function extras(ctx,plan,pg){
 const P=plan||ctx?.world?.state?.plan||{},st={...(P.game||{}),...(P.stats||{})},keys=[['players','players'],['views','views'],['likes','likes'],['plays','plays'],['reviews','reviews']].filter(([k])=>st[k]!=null);
 const when=st.at||st.date||st.updated;const wd=when?(typeof when==='number'?new Date(when).toISOString().slice(0,10):String(when).slice(0,10)):'';
 const gp=keys.length?`<div style="display:flex;flex-wrap:wrap;gap:6px">${keys.map(([k,l])=>`<div style="flex:1 1 70px;max-width:140px;border:1px solid #2c3b4c;border-radius:6px;padding:6px 9px"><div style="font-size:18px;color:#d9e0d9">${esc(num(st[k]).toLocaleString('en-GB'))}</div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a9aa0">${l}</div></div>`).join('')}</div>
  <div style="font-size:11px;color:#8a9aa0;margin-top:6px">from the game page${wd?` · ${esc(wd)}`:''}</div>`
  :`<div style="font-size:12px;color:#8a9aa0;line-height:1.5">Likes, views and reviews live on the game page; Savi copies them in here when she reads them.</div>`;
 return `${sect('from the game page',link(pg,'↗ page','open the game page'))}${gp}
  ${sect('milestones & stats',link(pg,'↗ numbers','open the game page and its numbers'))}
  <div style="font-size:12px;color:#8a9aa0;line-height:1.55">Spawn's numbers page totals these for you. A script marks how far a player got with <code style="color:#c9a56a">ctx.emit('milestone', {step, name})</code>, once each, and counts a thing with <code style="color:#c9a56a">ctx.emit('stat', {name, value})</code>, per day. The first shows where new players stop.</div>`;
}
