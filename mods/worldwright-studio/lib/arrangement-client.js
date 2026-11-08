import {createFollower} from './arrangement-follow.js';
import {createPageReader} from './arrangement-preview-rpc.js';
import { mount as mountFiles } from './ui-arrangement-file.js';
import { layoutMarkup } from './arrangement-layout.js';
import { unpackSources } from './arrangement-wire.js';
import { blank, validate, warnings, LIMITS, BOOK } from './arrangement-data.js';
import { createPreview } from './arrangement-transport.js';
import { PREVIEW, CURSOR } from './data/arrangement-preview.js';
const copy=x=>JSON.parse(JSON.stringify(x)),E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLIENT_VERSION=14;
export function boot(getAudio){
 let sourceSignature="",sourceBuffer=[];
 if(window.__WWARR?.version===PREVIEW.version&&window.__WWARR?.clientVersion===CLIENT_VERSION){window.__WWARR.sync();return;}
 const previous=window.__WWARR,viewCarry=previous?.state?{loadKey:previous.state.loadKey,cardId:previous.state.cardId,beat:previous.state.cursorBeat||0,track:previous.state.cursorTrack||1}:null,carry=previous?.dirty?.()?copy(previous.state):null;
 if(previous?.dispose)previous.dispose();else previous?.off();
 // Version-one observers wait on the old three mount IDs and stay inactive.
 const incoming=document.getElementById('wwarr2-dom');if(previous&&incoming)incoming.replaceWith(incoming.cloneNode(false));
 const D=document,S={name:'Arrangement',cursorBeat:0,cursorTrack:1,data:blank(),sources:[],busy:false,loading:true},history=[],redo=[];
 let reader=null,mixGesture=null;
 const lifecycle={loads:0,layouts:0,paints:0,repairs:0};
 let view={left:0,top:0,outer:0,mixer:0};
 // Per-node authored markup cache, not document state. A status reply must not
 // replace the notes, ruler or controls; a replaced shell must still recover.
 function markup(n,html){if(n.__arrHTML===html&&n.innerHTML===n.__arrDOM)return;n.innerHTML=html;n.__arrHTML=html;n.__arrDOM=n.innerHTML;}
 function intact(){return host===el('wwarr2-dom')&&host?.isConnected&&(host.querySelector('[data-arr-terminal]')||el('wwarr-play')&&host.getAttribute('aria-busy')===String(!!S.loading)&&el('wwarr-loading')?.hidden===!S.loading&&(S.loading||el('wwarr-blocks')?.children.length===S.data.clips.length&&!!el('wwarr-tracks')?.querySelector('[data-track]')));}
 function scroll(e){if(!active()||!intact()||S.loading)return;const n=e.target;if(n.id==='wwarr-scroll'){view.left=n.scrollLeft;view.top=n.scrollTop;}if(n===host)view.outer=n.scrollTop;if(n.id==='wwarr-mixer')view.mixer=n.scrollLeft;}
 function restoreView(){const n=el('wwarr-scroll');if(n){n.scrollLeft=view.left;n.scrollTop=view.top;}if(host)host.scrollTop=view.outer;const m=el('wwarr-mixer');if(m)m.scrollLeft=view.mixer;}
 let host=null,signature='',baseline='',selected='',choice='',transport=null,frame=0,generation=0,request=0,leave=null,message='',serverReceipt=-1;
 const el=id=>D.getElementById(id),active=()=>!!el('wwarr2-shell')&&!!host?.isConnected;
 const follower=createFollower(()=>el('wwarr-scroll'));
 function writable(){return active()&&!S.readOnly&&!S.loading&&!S.busy&&!!S.open&&!S.loadError;}
 function dirty(){return !!S.open&&!S.loading&&JSON.stringify(S.data)!==baseline;}
 function stop(){generation++;cancelAnimationFrame(frame);frame=0;transport?.stop();reader?.cancel();S.playing=false;S.preparing=false;const head=el('wwarr-head');if(head)head.hidden=true;status();}
 function off(){window.__WWARRFiles?.dispose();stop();transport?.dispose();transport=null;reader?.dispose();reader=null;host=null;signature='';if(leave){const cb=leave;leave=null;cb({ok:false,error:'Arrangement closed before save confirmation'});}}
 function send(name,args){window.sendAction(name,args);}
 function status(text){if(text!==undefined)message=text;const n=el('wwarr-status');if(n){try{n.dataset.audio=JSON.stringify(getAudio()?.inspect?.()||{contextState:getAudio()?.context?.state});}catch{}const text=message|| (S.busy?'Saving and verifying pages…':dirty()?'Unsaved arrangement · source scores unchanged':S.cardId?'Saved arrangement · source scores unchanged':'Not saved · your first Save creates one arrangement card');if(n.textContent!==text)n.textContent=text;}
 const play=el('wwarr-play');if(play){play.textContent=S.preparing?'Preparing…':S.playing?'Playing…':'▶ Play';play.disabled=!!S.preparing||S.loading||!S.data.clips.length||!!S.loadError;}}
 function edit(fn){mixGesture=null;if(!writable())return false;try{const next=copy(S.data);fn(next);const valid=validate(next);if(JSON.stringify(valid)===JSON.stringify(S.data))return false;history.push(copy(S.data));if(history.length>LIMITS.history)history.shift();redo.length=0;S.data=valid;stop();message='';paint();return true;}catch(e){status(e.message);return false;}}
 function uid(){let i=1;const used=new Set(S.data.clips.map(c=>c.id));while(used.has('clip-'+i))i++;return 'clip-'+i;}
 function field(id,value,disabled){const n=el(id);if(!n)return;if(D.activeElement!==n)n.value=String(value??'');n.disabled=disabled;}
 function clip(){return S.data.clips.find(c=>c.id===selected);}
 function cursor(beat,track=S.cursorTrack){if(!active()||S.loading||S.loadError||!Number.isFinite(beat)||!Number.isFinite(track))return;stop();S.cursorBeat=Math.max(0,Math.min(LIMITS.beats,Math.round(beat/CURSOR.step)*CURSOR.step));S.cursorTrack=Math.max(1,Math.min(S.data.tracks.length,Math.round(track)));message='Cursor · beat '+(S.cursorBeat+1)+' · track '+S.cursorTrack;paint();}
 function paint(){if(!active())return;lifecycle.paints++;host.dataset.arrLifecycle=JSON.stringify(lifecycle);
 host.setAttribute('aria-busy',String(!!S.loading));el('wwarr-loading').hidden=!S.loading;
 if(S.loading){for(const n of host.querySelectorAll('button,input,select'))n.disabled=n.dataset.op!=='back';el('wwarr-empty').hidden=true;el('wwarr-status').textContent='Loading arrangement files…';return;}
 el('wwarr-stop').disabled=false;el('wwarr-newscore').disabled=!writable();el('wwarr-clips').disabled=false;
 S.cursorTrack=Math.max(1,Math.min(S.data.tracks.length,S.cursorTrack));
 const tracks=S.data.tracks.length;el('wwarr-canvas').style.setProperty('--arr-lane-height',tracks*LIMITS.rowHeight+'px');el('wwarr-scroll').setAttribute('aria-label',tracks+' track arrangement timeline; scroll horizontally for later beats');el('wwarr-track').max=String(tracks);markup(el('wwarr-cursor-track'),S.data.tracks.map((_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join(''));el('wwarr-addtrack').disabled=!writable()||tracks>=LIMITS.tracks;
 const locked=!writable(),c=clip(),lookup=new Map(S.sources.map(s=>[s.id,s])),end=Math.min(LIMITS.beats,Math.max(32,S.cursorBeat+CURSOR.bar,...S.data.clips.map(c=>Math.ceil((c.start+c.length+4)/4)*4))),width=end*LIMITS.beatPixels;
 field('wwarr-cursor-beat',S.cursorBeat+1,false);field('wwarr-cursor-track',S.cursorTrack,false);el('wwarr-rewind').disabled=false;el('wwarr-cursor').style.transform='translateX('+S.cursorBeat*LIMITS.beatPixels+'px)';
 field('wwarr-bpm',S.data.bpm,locked);field('wwarr-source',choice,locked);el('wwarr-add').disabled=locked||!choice||S.data.clips.length>=LIMITS.clips;
 const sc=el('wwarr-source'),opts=S.sources.map(s=>'<option value="'+E(s.id)+'" '+(s.error?'disabled':'')+'>'+E(s.name)+' · '+E(s.error||s.instruments)+'</option>').join('');if(sc.dataset.options!==opts){sc.innerHTML='<option value="">Choose note source…</option>'+opts;sc.dataset.options=opts;sc.value=choice;}
 el('wwarr-empty').hidden=!!S.sources.length;el('wwarr-count').textContent=S.data.clips.length+' / 128 clips';
 const ruler=el('wwarr-ruler');ruler.style.width=width+'px';markup(ruler,Array.from({length:Math.ceil(end/4)},(_,i)=>'<span style="left:'+i*4*LIMITS.beatPixels+'px">'+(i+1)+'<small> · '+(i*4+1)+'</small></span>').join(''));
 el('wwarr-lanes').style.width=width+'px';el('wwarr-canvas').style.width=(width+120)+'px';
 markup(el('wwarr-tracks'),S.data.tracks.map((t,i)=>'<div class="wwarr-track" role="group" aria-label="Track '+(i+1)+'"><b>'+String(i+1).padStart(2,'0')+'</b><button data-track="'+i+'" data-flag="mute" aria-label="Mute track '+(i+1)+'" aria-pressed="'+t.mute+'" '+(locked?'disabled':'')+'>M</button><button data-track="'+i+'" data-flag="solo" aria-label="Solo track '+(i+1)+'" aria-pressed="'+t.solo+'" '+(locked?'disabled':'')+'>S</button></div>').join(''));
 const mixer=el('wwarr-mixer'),mixKey=JSON.stringify([S.data.clips.map(c=>[c.id,c.cardId,c.gain,c.track]),S.data.tracks,locked]);
 if(mixer&&mixer.dataset.mixKey!==mixKey&&!mixer.contains(D.activeElement)){mixer.dataset.mixKey=mixKey;mixer.innerHTML=S.data.clips.map(k=>'<div class="wwarr-channel"><strong title="'+E(lookup.get(k.cardId)?.name||k.cardId)+'">'+E(lookup.get(k.cardId)?.name||k.cardId)+'</strong><label>Volume <input type="range" min="0" max="'+LIMITS.maxGain+'" step=".05" data-mix-clip="'+k.id+'" aria-label="'+E((lookup.get(k.cardId)?.name||'Part')+' volume')+'" value="'+k.gain+'" '+(locked?'disabled':'')+'><output data-mix-value="'+k.id+'">'+Math.round(k.gain*100)+'%</output></label><span><button data-track="'+(k.track-1)+'" data-flag="mute" aria-pressed="'+S.data.tracks[k.track-1].mute+'">Mute</button> <button data-track="'+(k.track-1)+'" data-flag="solo" aria-pressed="'+S.data.tracks[k.track-1].solo+'">Solo</button></span></div>').join('');}
 // Focused faders keep their DOM, but toggle feedback must never be cached.
 if(mixer)for(const b of mixer.querySelectorAll('button[data-track][data-flag]')){const t=S.data.tracks[+b.dataset.track];b.setAttribute('aria-pressed',String(!!t?.[b.dataset.flag]));b.disabled=locked;}
 const solo=S.data.tracks.some(t=>t.solo);
 markup(el('wwarr-blocks'),S.data.clips.map(k=>{const s=lookup.get(k.cardId),bad=!s||s.error||s.triggered,t=S.data.tracks[k.track-1],muted=t.mute||(solo&&!t.solo);return '<button class="wwarr-clip'+(selected===k.id?' selected':'')+(bad?' invalid':'')+(muted?' muted':'')+'" data-clip="'+k.id+'" style="left:'+k.start*LIMITS.beatPixels+'px;top:'+((k.track-1)*LIMITS.rowHeight+5)+'px;width:'+Math.max(6,k.length*LIMITS.beatPixels-2)+'px" aria-label="'+E((s?.name||'Missing source')+', track '+k.track+', beat '+(k.start+1))+'"><strong>'+E(s?.name||k.cardId)+'</strong><small>'+E(bad?'Source unavailable':s?.instruments)+'</small></button>';}).join(''));
 const pick=el('wwarr-clips'),options=S.data.clips.map(k=>'<option value="'+k.id+'">'+E(lookup.get(k.cardId)?.name||k.cardId)+' · '+k.id+'</option>').join('');if(pick.dataset.options!==options){pick.innerHTML='<option value="">Select clip…</option>'+options;pick.dataset.options=options;}pick.value=selected;
 for(const k of ['start','length','track','gain'])field('wwarr-'+k,c?.[k],locked||!c);
 for(const op of ['duplicate','remove'])el('wwarr-'+op).disabled=locked||!c;
 el('wwarr-notes').disabled=!c;el('wwarr-save').disabled=locked;el('wwarr-undo').disabled=locked||!history.length;el('wwarr-redo').disabled=locked||!redo.length;
 el('wwarr-play').disabled=S.loading||!S.data.clips.length||!!S.loadError;
 const ws=[...(S.warnings||[]).filter(w=>!w.startsWith('Clip ')),...warnings(S.data,S.sources)];if(S.readOnly)ws.unshift('Read-only shelf. Preview and Notes remain available; saving is refused.');if(S.error)ws.unshift(S.error);if(S.refreshNotice)ws.unshift(S.refreshNotice);
 markup(el('wwarr-warnings'),ws.map(w=>'<div>'+E(w)+'</div>').join(''));el('wwarr-warnings').hidden=!ws.length;status();
 }
 function layout(){lifecycle.layouts++;host.removeEventListener('click',click);host.removeEventListener('change',change);host.removeEventListener('input',mixInput);host.removeEventListener('pointerdown',down);host.removeEventListener('keydown',keys);host.innerHTML=layoutMarkup(S.data.tracks.length);
 host.addEventListener('click',click);host.addEventListener('change',change);host.addEventListener('input',mixInput);host.addEventListener('pointerdown',down);host.addEventListener('keydown',keys);paint();}
 function save(){if(!writable())return false;stop();S.busy=true;S.requestId='arr-'+S.loadKey+'-'+(++request);status();paint();send('arrangement',{op:'save',loadKey:S.loadKey,folderId:S.folderId,cardId:S.cardId||'',requestId:S.requestId,data:copy(S.data)});return true;}
 async function play(){window.__WWARRFiles?.stop();stop();follower.reset();const token=generation;try{const env=getAudio();if(!env?.context)throw Error('Audio unavailable. Reopen the Studio tab and press Play');reader=reader||createPageReader(()=>S);transport=transport||createPreview({context:env.context,bus:n=>env.bus(n),buffer:ref=>env.buffer(ref),sourceWindow:(...a)=>reader.read(...a)});S.preparing=true;status('Preparing instruments…');const result=await transport.start(S.data,S.sources,{from:S.cursorBeat*60/S.data.bpm,progress:text=>{if(token===generation&&active())status(text);},error:e=>{if(token===generation){stop();status(e.message);}}});if(token!==generation||!active()||!result)return;S.preparing=false;S.playing=true;status((result.mode==='pages'?'Buffered preview':'Live preview')+' · '+S.data.bpm+' BPM');let headAt=-Infinity;const tick=(now=0)=>{if(token!==generation||!active())return stop();const head=el('wwarr-head');if(head&&now-headAt>=PREVIEW.headMs){headAt=now;head.hidden=false;const x=transport.position()*S.data.bpm/60*LIMITS.beatPixels;head.style.transform='translateX('+x+'px)';follower.step(x,now);}if(!transport.playing){stop();return;}frame=requestAnimationFrame(tick);};tick();}catch(e){if(token!==generation)return;stop();status(e.message);}}
 function action(op){const c=clip();if(op==='rewind'){cursor(0);return;}if(op==='play'){play();return;}if(op==='stop'){window.__WWARRFiles?.stop();stop();return;}if(op==='save'){save();return;}
 if(op==='addTrack'){edit(d=>{if(d.tracks.length<LIMITS.tracks)d.tracks.push({mute:false,solo:false});});return;}
 if(op==='back'){send('cardAct',{op:'backToFolder'});return;}
 if(op==='notes'&&c){send('studioWorkspace',{op:'notes',cardId:c.cardId});return;}if(op==='newScore'){send('studioWorkspace',{op:'newScore'});return;}
 if(op==='undo'||op==='redo'){if(!writable())return;const from=op==='undo'?history:redo,to=op==='undo'?redo:history;if(from.length){to.push(copy(S.data));S.data=from.pop();stop();paint();}return;}
 if(op==='add'){const s=S.sources.find(s=>s.id===choice);if(!s||s.error)return;const room=LIMITS.beats-S.cursorBeat;if(room<=0){status('Move the cursor before the timeline end to place a clip');return;}const id=uid();if(edit(d=>{d.clips.push({id,cardId:s.id,start:S.cursorBeat,length:Math.min(s.beats,room),track:S.cursorTrack,gain:1});}))selected=id;paint();}
 if(op==='duplicate'&&c){const id=uid();if(edit(d=>d.clips.push({...c,id,start:c.start+c.length})))selected=id;paint();}
 if(op==='remove'&&c){edit(d=>{d.clips=d.clips.filter(k=>k.id!==c.id);});selected='';paint();}}
 function click(e){const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.clip){selected=b.dataset.clip;paint();return;}if(b.dataset.track!==undefined){edit(d=>{const t=d.tracks[+b.dataset.track];t[b.dataset.flag]=!t[b.dataset.flag];});return;}if(b.dataset.op)action(b.dataset.op);}
 function mixInput(e){const n=e.target,id=n.dataset.mixClip;if(!id||!writable())return;const value=n.valueAsNumber;if(!Number.isFinite(value)||value<0||value>LIMITS.maxGain)return;const c=S.data.clips.find(c=>c.id===id);if(!c)return;if(!mixGesture)mixGesture=copy(S.data);c.gain=value;transport?.setMix(S.data);const out=host.querySelector('[data-mix-value="'+id+'"]');if(out)out.textContent=Math.round(value*100)+'%';status();}
 function change(e){const n=e.target;if(n.dataset.mixClip){if(!mixGesture)mixInput(e);if(mixGesture&&JSON.stringify(mixGesture)!==JSON.stringify(S.data)){history.push(mixGesture);if(history.length>LIMITS.history)history.shift();redo.length=0;}mixGesture=null;n.blur();paint();return;}if(n.id==='wwarr-cursor-beat'){cursor(n.valueAsNumber-1);return;}if(n.id==='wwarr-cursor-track'){cursor(S.cursorBeat,Number(n.value));return;}if(n.id==='wwarr-source'){choice=n.value;paint();return;}if(n.id==='wwarr-clips'){selected=n.value;paint();return;}if(n.id==='wwarr-bpm'){edit(d=>{d.bpm=n.valueAsNumber;});return;}
 const key=n.id.replace('wwarr-','');if(['start','length','track','gain'].includes(key)){const c=clip();if(c)edit(d=>{d.clips.find(k=>k.id===c.id)[key]=n.valueAsNumber;});}}
 function keys(e){if(e.target.matches('input,select,textarea')||e.target.isContentEditable)return;if(!e.ctrlKey&&!e.metaKey&&['Home','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cursor(e.key==='Home'?0:S.cursorBeat+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?CURSOR.bar:CURSOR.step));}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();action(e.shiftKey?'redo':'undo');}else if(e.key===' '){e.preventDefault();action(S.playing?'stop':'play');}else if(e.key==='Delete'){e.preventDefault();action('remove');}}
 function down(e){const b=e.target.closest('[data-clip]');
 if(!b){const plane=e.target.closest('#wwarr-ruler,#wwarr-lanes');if(!plane||S.loading||S.loadError||e.button!==0)return;
  const x=e.clientX,y=e.clientY,id=e.pointerId,view=el('wwarr-scroll'),scroll=view.scrollLeft,top=view.scrollTop;let moved=false;
  const move=ev=>{if(ev.pointerId===id&&Math.abs(ev.clientX-x)+Math.abs(ev.clientY-y)>CURSOR.tapSlop)moved=true;};
  const finish=ev=>{if(ev.pointerId!==id)return;D.removeEventListener('pointermove',move);D.removeEventListener('pointerup',finish);D.removeEventListener('pointercancel',finish);if(ev.type!=='pointerup'||moved||!plane.isConnected||Math.abs(view.scrollLeft-scroll)+Math.abs(view.scrollTop-top)>CURSOR.tapSlop)return;const r=plane.getBoundingClientRect();cursor((ev.clientX-r.left)/LIMITS.beatPixels,plane.id==='wwarr-lanes'?Math.floor((ev.clientY-r.top)/LIMITS.rowHeight)+1:S.cursorTrack);};
  D.addEventListener('pointermove',move);D.addEventListener('pointerup',finish);D.addEventListener('pointercancel',finish);return;
 }
 if(!writable()||e.button!==0)return;const initial=S.data.clips.find(c=>c.id===b.dataset.clip);selected=initial.id;
 const x=e.clientX,y=e.clientY,viewport=el('wwarr-scroll'),scroll=viewport.scrollLeft;let move=null,moved=false;viewport.setPointerCapture(e.pointerId);
 const onmove=ev=>{const dx=ev.clientX-x+viewport.scrollLeft-scroll,dy=ev.clientY-y;if(Math.abs(dx)+Math.abs(dy)<5&&!moved)return;moved=true;move={start:Math.max(0,Math.min(4096-initial.length,Math.round((initial.start+dx/LIMITS.beatPixels)*4)/4)),track:Math.max(1,Math.min(S.data.tracks.length,initial.track+Math.round(dy/LIMITS.rowHeight)))};b.style.left=move.start*LIMITS.beatPixels+'px';b.style.top=((move.track-1)*LIMITS.rowHeight+5)+'px';};
 const finish=ev=>{viewport.removeEventListener('pointermove',onmove);viewport.removeEventListener('pointerup',finish);viewport.removeEventListener('pointercancel',finish);if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(ev.type==='pointerup'&&move)edit(d=>Object.assign(d.clips.find(c=>c.id===initial.id),move));paint();};
 viewport.addEventListener('pointermove',onmove);viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);}
 function sync(){const marker=el('wwarr2-data'),root=el('wwarr2-shell');if(!root||!marker){if(host)off();return;}
 const text=marker.textContent,repair=!intact();if(text===signature&&!repair)return;signature=text;let incoming;try{incoming=JSON.parse(text);if(incoming.sourcePack){const key=JSON.stringify(incoming.sourcePack);if(key!==sourceSignature){sourceBuffer=unpackSources(incoming.sourcePack);sourceSignature=key;}incoming.sources=sourceBuffer;delete incoming.sourcePack;}}catch(e){stop();S.loadError=true;S.loading=false;host=el("wwarr2-dom");if(host)host.innerHTML='<div data-arr-terminal="error" role="alert"><p>Could not load arrangement data. Your saved notes are unchanged.</p><p>'+E(e.message)+'</p><button onclick="sendAction(\'cardAct\',{op:\'backToFolder\'})">‹ Back</button></div>';return;}const newLoad=S.loadKey!==incoming.loadKey||!S.open;
 if(newLoad){lifecycle.loads++;view={left:0,top:0,outer:0,mixer:0};stop();history.length=0;redo.length=0;selected='';choice='';message='';S.initialized=false;Object.assign(S,incoming);S.cursorBeat=viewCarry&&viewCarry.loadKey===incoming.loadKey&&viewCarry.cardId===incoming.cardId?viewCarry.beat:0;S.cursorTrack=viewCarry&&viewCarry.loadKey===incoming.loadKey&&viewCarry.cardId===incoming.cardId?viewCarry.track:1;S.loadError=!!incoming.error&&!incoming.data;S.data=copy(incoming.data||blank());baseline=JSON.stringify(S.data);serverReceipt=incoming.receipt||0;if(carry&&carry.loadKey===incoming.loadKey&&carry.cardId===incoming.cardId)S.data=copy(carry.data);}
 else {const ownRequest=S.requestId;Object.assign(S,{sources:incoming.sources||[],loading:incoming.loading,readOnly:incoming.readOnly,previewReply:incoming.previewReply,fileReply:incoming.fileReply,fileRecord:incoming.fileRecord,fileCardKey:incoming.fileCardKey,warnings:incoming.warnings||[],refreshNotice:incoming.refreshNotice,error:incoming.error,loadError:!!incoming.error&&!incoming.data,cardId:incoming.cardId});
 if(S.loading===false&&baseline===JSON.stringify(blank())&&!S.initialized&&incoming.data){S.data=copy(incoming.data);baseline=JSON.stringify(S.data);}
 if((incoming.receipt||0)!==serverReceipt){serverReceipt=incoming.receipt||0;if(incoming.requestId===ownRequest){S.busy=false;if(incoming.ok){baseline=JSON.stringify(incoming.data);S.cardId=incoming.cardId;message='Saved · readback verified';}else message=incoming.error||'Save refused; draft kept';const cb=leave;leave=null;cb?.({ok:!!incoming.ok,error:incoming.error});} }
 }
 reader?.consume(incoming.previewReply);
 if(!S.loading)S.initialized=true;else S.initialized=false;
 const next=el('wwarr2-dom');if(newLoad||host!==next||!el('wwarr-play')){host=next;layout();}else paint();
 if(repair&&!newLoad){lifecycle.repairs++;restoreView();host.dataset.arrLifecycle=JSON.stringify(lifecycle);}
 if(!S.loading&&!S.loadError&&!window.__WWARRFiles)mountFiles(getAudio);
 }
 const observer=new MutationObserver(sync);observer.observe(D.body,{childList:true,subtree:true,characterData:true});
 D.addEventListener('scroll',scroll,true);window.addEventListener('pagehide',off);window.__WWARR={version:PREVIEW.version,clientVersion:CLIENT_VERSION,state:S,measure:()=>({...transport?.measure(),follow:follower.measure(),lifecycle:{...lifecycle}}),dispose(){D.removeEventListener('scroll',scroll,true);follower.dispose();observer.disconnect();window.removeEventListener('pagehide',off);off();},active,dirty,saveForLeave(cb){if(!dirty()){cb({ok:true});return;}if(S.busy){cb({ok:false,error:'Wait for the current save receipt'});return;}leave=cb;if(!save()){leave=null;cb({ok:false,error:'Arrangement is not writable'});}},cancelLeaveSave(){leave=null;},discard(){if(S.busy)return;S.data=JSON.parse(baseline);message='';history.length=0;redo.length=0;stop();paint();},stop,off,refreshDirty:dirty,sync,action,edit};sync();
}
