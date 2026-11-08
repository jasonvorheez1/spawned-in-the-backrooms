// Pure, dependency-light engraving. Beats are quarter-note units; bars are display grouping only.
const P=require("lib/pianoroll.js");
const PL=require("lib/pagelayout.js");
export const STYLE={gap:8,step:4,head:5,barBeats:4,minSlot:34,systemHeight:244,pianoRows:4,pad:22,clefWidth:54};
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(x,y,X,Y,cls="",w=1)=>`<path class="${cls}" d="M${x} ${y}H${X}" transform="translate(0 0)" fill="none" stroke="currentColor" stroke-width="${w}"/>`.replace(`M${x} ${y}H${X}`,`M${x} ${y}L${X} ${Y}`);
const txt=(x,y,s,size=11,extra="")=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${E(s)}</text>`;
export function spelling(key,authored){
  const m=/^([A-G])([#b]?)(-?\d+)$/i.exec(authored||"");
  const name=m?m[1].toUpperCase():P.noteName(key)[0],acc=m?m[2]:P.noteName(key).slice(1),oct=m?Number(m[3]):Math.floor(key/12)-1;
  return {name,acc,oct,step:oct*7+"CDEFGAB".indexOf(name)};
}
export function sourceEvents(text,sections){
  const parsed=P.parseDocument(text,sections);if(parsed.error)return parsed;
  const notes=[],pauses=[];
  for(let t=0;t<parsed.data.tracks.length;t++)for(const n of parsed.data.tracks[t].notes)notes.push({...n,track:t+1,id:'note:'+notes.length,source:JSON.stringify(n),pitch:spelling(n.key)});
  for(const n of parsed.data.pauses||[])pauses.push({...n,id:'rest:'+pauses.length,source:JSON.stringify(n)});
  return {data:parsed.data,notes,pauses};
}
const VALUES=[4,3.5,3,2,1.75,1.5,1,.875,.75,.5,.4375,.375,.25,.21875,.1875,.125,.09375,.0625];
export function duration(value){for(const base of [4,2,1,.5,.25,.125,.0625])for(let dots=0;dots<=2;dots++){const n=base*(dots===0?1:dots===1?1.5:1.75);if(Math.abs(value-n)<1e-7)return {base,dots,flags:Math.max(0,Math.round(-Math.log2(base)))};}return {base:1,dots:0,flags:0,exact:value};}
export function fragments(n){let at=n.at,end=n.at+n.length,out=[];while(at<end-1e-7){const room=Math.min(end-at,4-at%4);let d=VALUES.find(v=>v<=room+1e-7);if(!d)d=room;out.push({...n,at,length:d,duration:duration(d),tieIn:at>n.at+1e-7,tieOut:at+d<end-1e-7});at+=d;}return out;}
function clef(x,y,bass){if(bass)return `<g class="clef bass" transform="translate(${x} ${y+8})"><path d="M0 8C-3 -7 22 -11 21 4C20 16 8 23 0 25C15 18 17 7 14 1C10 -5 3 -3 2 2C10 -1 11 10 4 11Z"/><circle cx="27" cy="0" r="1.8"/><circle cx="27" cy="8" r="1.8"/></g>`;
return `<g class="clef treble" transform="translate(${x+12} ${y+23})"><path d="M0 19C-25 15 -15 -6 -3 -17C8 -28 10 -39 4 -42C-6 -35 -5 -17 1 3L7 29C10 43 -8 44 -7 34C-6 27 4 30 1 35C-1 38 -4 37 -4 35M0 19C17 20 19 1 6 -3C-8 -8 -14 10 -3 13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></g>`;}
function rest(x,y,d,source){let mark;if(d.base>=2)mark=`<rect x="${x-5}" y="${y+(d.base===4?0:-4)}" width="10" height="4"/>`;else if(d.base===1)mark=`<path d="M${x-3} ${y-12}l7 7 -6 7 6 6q-12 -5 -8 6q-8 -8 2 -11l-4 -6 6 -4Z"/>`;else {mark=line(x+5,y-8,x-1,y+14,"",1.5);for(let i=0;i<d.flags;i++)mark+=`<path d="M${x+4} ${y-7+i*6}q-12 8 -12 1a3 3 0 1 1 6 0"/>`;}
for(let i=0;i<d.dots;i++)mark+=`<circle class="dot" cx="${x+10+i*4}" cy="${y-3}" r="1.4"/>`;return `<g class="rest"><title>${E(source||"Unoccupied staff interval")}</title>${mark}${d.exact?txt(x,y+28,d.exact+"♩",9):""}</g>`;}
export function splitWideBars(bars,room){
  const out=[];
  for(const b of bars){if(b.w<=room){out.push(b);continue;}
    function section(slots){const lo=slots[0].at,hi=slots.at(-1).end;
      const cut=rows=>rows.filter(n=>n.at<hi-1e-7&&n.at+n.length>lo+1e-7).map(n=>{const at=Math.max(lo,n.at),length=Math.min(hi,n.at+n.length)-at;return {...n,at,length,duration:duration(length),tieIn:n.tieIn||at>n.at+1e-7,tieOut:n.tieOut||at+length<n.at+n.length-1e-7};});
      const notes=cut(b.notes),rests=cut(b.rests),ss=slots.map(s=>{const group=notes.filter(n=>Math.abs(n.at-s.at)<1e-7);return {...s,w:Math.max(s.w,24+group.filter(n=>n.pitch.acc).length*9+new Set(group.map(n=>n.track)).size*7)};});
      const w=ss.reduce((n,s)=>n+s.w,24);if(w>room&&slots.length>1){let n=slots.length-1;while(n>1&&slots.slice(0,n).reduce((a,s)=>a+s.w,24)>room)n--;section(slots.slice(0,n));section(slots.slice(n));return;}
      out.push({...b,notes,rests,slots:ss,w,segmentStart:lo,segmentEnd:hi,continuation:lo>b.at+1e-7});
    }
    section(b.slots.map((s,i)=>({...s,end:b.slots[i+1]?.at??b.at+4})));
  }
  return out;
}
export function layout(text,options={}){
  const src=sourceEvents(text,options.sections);if(src.error)return src;const geo=PL.toPx(options.spec||PL.DEFAULT_SPEC),width=geo.bodyW-16,height=geo.bodyH;
  const notes=src.notes.map(n=>({...n,staff:n.key>=60?0:1})),all=notes.flatMap(fragments),pauses=src.pauses.flatMap(fragments);
  const start=Math.floor(Math.min(...notes.map(n=>n.at),...src.pauses.map(n=>n.at),Infinity)/4)*4;
  const end=Math.max(...notes.map(n=>n.at+n.length),...src.pauses.map(n=>n.at+n.length),0);
  const bars=[];for(let at=Number.isFinite(start)?start:0;at<end;at+=4){const ns=all.filter(n=>n.at>=at-1e-7&&n.at<at+4-1e-7),rs=pauses.filter(n=>n.at>=at-1e-7&&n.at<at+4-1e-7);
    const times=[...new Set([at,at+1,at+2,at+3,...ns.map(n=>n.at),...rs.map(n=>n.at)])].sort((a,b)=>a-b);
    const slots=times.map(t=>{const group=ns.filter(n=>n.at===t);return {at:t,w:Math.max(STYLE.minSlot,24+group.filter(n=>n.pitch.acc).length*9+new Set(group.map(n=>n.track)).size*7)};});
    bars.push({at,notes:ns,rests:rs,slots,w:slots.reduce((a,s)=>a+s.w,0)+24});
  }
  const printedBars=splitWideBars(bars,width-STYLE.pad*2-STYLE.clefWidth);
  const systems=[];let sys={bars:[],w:STYLE.clefWidth};for(const b of printedBars){if(sys.bars.length&&sys.w+b.w>width-STYLE.pad*2){systems.push(sys);sys={bars:[],w:STYLE.clefWidth};}sys.bars.push(b);sys.w+=b.w;}if(sys.bars.length)systems.push(sys);
  // Extreme ledger ranges get vertical room, never compressed staves or clipped notes.
  let top=56,bassY=132,bottom=204;
  for(const n of notes){const y=(n.staff?bassY:top)+( (n.staff?26:38)-n.pitch.step)*4;if(y<24){top+=24-y;bassY+=24-y;bottom+=24-y;}if(y>bottom-32)bottom=y+32;}
  const systemH=Math.max(STYLE.systemHeight,bottom+24),pianoPaper=PL.matchFormat(options.spec||PL.DEFAULT_SPEC)?.format.id==="piano-paper",capacity=Math.max(1,Math.floor((height-48)/systemH)),perSheet=pianoPaper?Math.min(STYLE.pianoRows,capacity):capacity,sheets=[];
  for(let i=0;i<systems.length;i+=perSheet)sheets.push(systems.slice(i,i+perSheet));if(!sheets.length)sheets.push([]);
  return {...src,notes,fragments:printedBars.flatMap(b=>b.notes),systems,sheets,width,height,top,bassY,systemH,perSheet,pianoPaper};
}
function drawSystem(sys,L,index){let out="",x=STYLE.pad+STYLE.clefWidth;const right=Math.max(L.width-STYLE.pad,sys.w+STYLE.pad),positions=[];
  for(const y of [L.top,L.bassY])for(let j=0;j<5;j++)out+=line(STYLE.pad,y+j*8,right,y+j*8,"stave",.8);
  out+=line(STYLE.pad,L.top,STYLE.pad,L.bassY+32,"barline",1.5)+clef(STYLE.pad+7,L.top,false)+clef(STYLE.pad+7,L.bassY,true);
  out+=`<path class="brace" d="M${STYLE.pad-4} ${L.top-3}q-14 1 -8 37q5 20 -5 25q10 5 5 25q-6 36 8 37" fill="none" stroke="currentColor" stroke-width="2"/>`;
  const extra=Math.max(0,right-x-sys.bars.reduce((a,b)=>a+b.w,0))/Math.max(1,sys.bars.length);
  for(const b of sys.bars){const bw=b.w+extra,begin=x,acc={};out+=txt(begin+2,L.top-18,String(b.at/4+1)+(b.continuation?" · cont.":""),10,'class="measure-number"');
    const slotPos={};let sx=begin+18;for(const s of b.slots){slotPos[s.at]=sx;sx+=s.w+extra/b.slots.length;}
    const groups={};for(const n of b.notes){const k=n.at+":"+n.staff+":"+n.track+":"+n.length;(groups[k]||(groups[k]=[])).push(n);}
    const stems=[];
    for(const key of Object.keys(groups)){const chord=groups[key].sort((a,b)=>a.pitch.step-b.pitch.step),n0=chord[0],up=n0.staff===0?(n0.track%2===1):false;
      const voiceTracks=[...new Set(b.notes.filter(n=>n.at===n0.at&&n.staff===n0.staff).map(n=>n.track))].sort();const shift=voiceTracks.indexOf(n0.track)*8;
      const xx=slotPos[n0.at]+shift,ys=chord.map(n=>(n.staff?L.bassY:L.top)+((n.staff?26:38)-n.pitch.step)*4),stemX=xx+(up?4.5:-4.5),stemY=up?Math.min(...ys)-30:Math.max(...ys)+30;
      if(n0.duration.base<4){out+=line(stemX,up?Math.max(...ys):Math.min(...ys),stemX,stemY,"stem",1.2);stems.push({x:stemX,y:stemY,at:n0.at,up,flags:n0.duration.flags,track:n0.track,staff:n0.staff});}
      for(let j=0;j<chord.length;j++){const n=chord[j],y=ys[j],staffY=n.staff?L.bassY:L.top,d=n.duration,collision=j>0&&Math.abs(n.pitch.step-chord[j-1].pitch.step)===1,nx=xx+(collision?(up?9:-9):0);let g="";
        for(let ly=staffY-8;ly>=y-1;ly-=8)g+=line(nx-8,ly,nx+8,ly,"ledger",1);for(let ly=staffY+40;ly<=y+1;ly+=8)g+=line(nx-8,ly,nx+8,ly,"ledger",1);
        const ak=n.staff+":"+n.pitch.step,old=acc[ak]||"";if(n.pitch.acc!==old||n.pitch.acc){g+=txt(nx-13-j*5,y+5,n.pitch.acc==="#"?"♯":n.pitch.acc==="b"?"♭":"♮",19,'class="accidental"');}acc[ak]=n.pitch.acc;
        g+=`<ellipse class="notehead" cx="${nx}" cy="${y}" rx="${d.base===4?6:5}" ry="3.5" transform="rotate(-18 ${nx} ${y})" fill="${d.base>=2?'none':'currentColor'}" stroke="currentColor" stroke-width="${d.base>=2?1.6:.5}"/>`;
        for(let dot=0;dot<d.dots;dot++)g+=`<circle class="dot" cx="${nx+10+dot*4}" cy="${y+(Math.round((y-staffY)/4)%2===0?-4:0)}" r="1.4"/>`;
        if(d.exact)g+=txt(nx,y+(up?23:-19),d.exact+"♩",9,'class="exact-duration"');
        positions.push({n,x:nx,y});out+=`<g class="score-note" data-note-id="${n.id}" data-at="${n.at}" data-length="${n.length}" data-track="${n.track}" data-source-start="${n.sourceStart==null?'':n.sourceStart}" data-source-end="${n.sourceEnd==null?'':n.sourceEnd}" onclick="var z=this.closest('.sbp-zone');if(z){var t=z.querySelector('textarea');if(t){t.focus();t.setSelectionRange(Number(this.dataset.sourceStart),Number(this.dataset.sourceEnd));}}"><title>${E(n.source)} — ${E(n.pitch.name+n.pitch.acc+n.pitch.oct)}; beat ${n.at}; hold ${n.length}</title>${g}</g>`;
      }
    }
    // Beam adjacent short values inside a quarter beat, same voice and direction.
    const beamed=new Map();for(let i=0;i<stems.length;i++){const a=stems[i];if(!a.flags)continue;const c=stems.find(s=>s.at>a.at&&s.at-a.at<=.5&&Math.floor(s.at)===Math.floor(a.at)&&s.track===a.track&&s.staff===a.staff&&s.up===a.up&&s.flags);if(c){const y=a.up?Math.min(a.y,c.y):Math.max(a.y,c.y);out+=line(a.x,a.y,a.x,y,"stem",1.2)+line(c.x,c.y,c.x,y,"stem",1.2);for(let k=0;k<Math.min(a.flags,c.flags);k++)out+=line(a.x,y+k*(a.up?5:-5),c.x,y+k*(a.up?5:-5),"beam",3);beamed.set(a,Math.max(beamed.get(a)||0,Math.min(a.flags,c.flags)));beamed.set(c,Math.max(beamed.get(c)||0,Math.min(a.flags,c.flags)));}}
    for(const s of stems)if(s.flags)for(let k=beamed.get(s)||0;k<s.flags;k++){const y=s.y+k*(s.up?5:-5),dir=s.up?1:-1;out+=`<path class="flag" d="M${s.x} ${y}q${12*dir} ${7*dir} ${5*dir} ${17*dir}q${3*dir} ${-9*dir} ${-5*dir} ${-11*dir}Z"/>`;}
    for(const r of b.rests)out+=rest(slotPos[r.at],r.track%2?L.top+16:L.bassY+16,r.duration,r.source);
    // A silent staff gets a real rest, including gaps under held notes from preceding bars.
    const lo=b.segmentStart??b.at,hi=b.segmentEnd??b.at+4;
    for(let staff=0;staff<2;staff++){const occupied=L.notes.filter(n=>n.staff===staff&&n.at<hi&&n.at+n.length>lo);let cursor=lo;const intervals=occupied.map(n=>[Math.max(lo,n.at),Math.min(hi,n.at+n.length)]).sort((a,c)=>a[0]-c[0]);for(const v of [...intervals,[hi,hi]]){if(v[0]>cursor+1e-7&&!b.rests.length)for(const r of fragments({at:cursor,length:v[0]-cursor}))out+=rest(begin+18+(r.at-lo)/(hi-lo)*(bw-24),(staff?L.bassY:L.top)+16,r.duration);cursor=Math.max(cursor,v[1]);}}
    x+=bw;out+=line(x,L.top,x,L.bassY+32,"barline",.8);
  }
  for(const p of positions){const n=p.n,next=positions.find(q=>q.n.id===n.id&&Math.abs(q.n.at-n.at-n.length)<1e-6);if(n.tieOut){const X=next?next.x-6:right-3,y=p.y+7;out+=`<path class="tie" d="M${p.x+5} ${y}Q${(p.x+X)/2} ${y+13} ${X} ${next?next.y+7:y}" fill="none" stroke="currentColor" stroke-width="1.2"/>`;}if(n.tieIn&&!positions.some(q=>q.n.id===n.id&&Math.abs(q.n.at+q.n.length-n.at)<1e-6)){out+=`<path class="tie incoming" d="M${STYLE.pad+STYLE.clefWidth-10} ${p.y+7}Q${p.x-12} ${p.y+18} ${p.x-6} ${p.y+7}" fill="none" stroke="currentColor" stroke-width="1.2"/>`;}}
  return `<g class="grand-system${sys.blank?" blank-system":""}" data-system="${index}">${out}</g>`;
}
// One visual sheet, shared by print output and the resident reader.
export function sheet(L,i,hidden=false){
  const systems=L.sheets[i];if(!systems)return "";
  const tempo=" · ♩ = "+L.data.bpm,maxW=L.width,svgH=L.height-28;
  return `<section class="notation-sheet" data-sheet="${i+1}" ${hidden?"hidden":""} style="height:${L.height}px;overflow:hidden"><div style="font:11px Georgia,serif;height:24px;box-sizing:border-box;padding:5px 0">Notation ${i+1} / ${L.sheets.length}${i?' · continuation (same saved page)':''}${E(tempo)} · 4-beat bars: layout default, not a time signature</div><svg xmlns="http://www.w3.org/2000/svg" class="engraved-score" role="img" aria-label="Grand staff notation, visual sheet ${i+1} of ${L.sheets.length}" width="${maxW}" height="${svgH}" viewBox="0 0 ${maxW} ${svgH}" style="display:block;color:#171512;fill:currentColor;font-family:Georgia,serif">${(L.pianoPaper?systems.concat(Array.from({length:L.perSheet-systems.length},()=>({bars:[],w:STYLE.clefWidth,blank:true}))):systems).map((s,j)=>`<g transform="translate(0 ${j*L.systemH})">${drawSystem(s,L,i*L.perSheet+j)}</g>`).join("")}</svg></section>`;
}
export function render(text,options={}){
  const L=layout(text,options);if(L.error)return {html:`<div class="sbp-score-error">Notation unavailable: ${E(L.error)}. Source remains editable.</div>`,error:L.error};
  const tempo=' · ♩ = '+L.data.bpm;
  const maxW=L.width,svgH=L.height-28;
  if(L.systemH+28>L.height||L.systems.some(s=>s.w+STYLE.pad*2>L.width))return {html:'<div class="sbp-score-error">This measure needs wider or taller paper. Choose Piano Paper or a larger size; source notes are kept.</div>',error:'Notation does not fit this paper'};
  let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);const key=String(options.pageId||'')+':'+(hash>>>0)+':'+L.width+':'+L.height;
  const sheets=options.windowed===true?sheet(L,0):L.sheets.map((_,i)=>sheet(L,i,i>0)).join("");
  // Send the source once, not SVG for every hidden sheet. Later turns stay local.
  const payload=options.windowed===true?'<script type="application/json" class="notation-payload">'+JSON.stringify({text,options:{...options,windowed:false}}).replace(/</g,'\\u003c')+'</script>':"";
  return {html:`<div class="sbp-score-paper" data-notation-key="${E(key)}" data-note-count="${L.notes.length}" data-piano-rows="${L.perSheet}" data-notation-sheets="${L.sheets.length}" style="height:100%;overflow:hidden;color:#171512;line-height:normal" data-interactive>${sheets}${payload}</div>`,notes:L.notes.length,fragments:L.fragments.length,sheets:L.sheets.length,systems:L.systems.length,rowsPerSheet:L.perSheet,width:L.width,height:L.height};
}
