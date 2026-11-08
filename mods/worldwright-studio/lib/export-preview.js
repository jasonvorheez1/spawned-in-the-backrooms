// One contract for book, card and page previews. Full documents travel once,
// privately in bounded replies, never as hidden HTML on every redraw.
const POLICY = require('lib/document-export-policy.js');
export const LIMITS = { lines: 100, chars: 6000, chunk: 1500, batch: 16, timeoutMs: 12000 };
const held = new Map();
const E = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function token(doc) {
  if(doc.requestId)return String(doc.requestId);
  let h=2166136261;
  for(const text of [doc.text||'',doc.json||'',doc.stem||''])for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return 'legacy-'+(h>>>0).toString(36)+'-'+String(doc.text||'').length+'-'+String(doc.json||'').length;
}
export function preview(text) {
  text=String(text||'');let end=Math.min(text.length,LIMITS.chars),lines=0;
  for(let i=0;i<end;i++)if(text[i]==='\n'&&++lines===LIMITS.lines){end=i+1;break;}
  if(end<text.length&&end>0&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;
  return {text:text.slice(0,end),truncated:end<text.length,chars:text.length};
}
export function markup(doc,kind,cls,id) {
  const p=preview(doc.text),meta={kind,token:token(doc),chars:p.chars,stem:doc.stem||'',author:doc.author||'',addr:doc.addr||doc.title||'',bookId:doc.bookId||'',format:doc.format||'text',scope:doc.scope||'book',bundle:!!doc.bundle};
  return `<div data-export-preview="${kind}" data-export-meta="${E(JSON.stringify(meta))}"><pre class="${cls} select-text" id="${id}">${E(p.text)}</pre><div class="sbx-note" style="padding:8px 0">${p.truncated?'Preview shortened to '+LIMITS.lines+' lines / '+LIMITS.chars+' characters maximum. ':''}Copy and download keep the complete document (${p.chars.toLocaleString()} characters).</div><div data-export-status role="status" style="font-size:11px;padding:6px 0">Preparing complete copy…</div><button type="button" data-export-retry hidden data-interactive onclick="exportPreviewAction(event,'${kind}','retry')">Retry full copy</button><img hidden alt="" src="data:,wws-export-preview-1" onerror="bootExportPreview()"></div>`;
}
export function current(api,kind) {
  const ui=api.getState().ui||{};
  const doc=kind==='book'?(ui.exportWin?.open&&!ui.exportWin.loading?ui.exportWin:null):kind==='card'?(ui.cards?.view==='page'?ui.cards.pageDoc?.exportDoc:ui.cards?.exportDoc):null;
  if(!doc||doc.loading||!doc.text)return null;
  const book=doc.bookId||(kind==='card'?(ui.cards?.pageDoc?.bookId||ui.cards?.bookId||ui.library?.openBook):'');
  if(book&&!POLICY.isExportable(book))return null;
  return doc;
}
export function clear(api,kind) { held.delete(String(api.id||api.self?.id||'')+':'+kind); }
export function handle(api,args) {
  const kind=args?.kind;if(kind!=='book'&&kind!=='card')return;
  const doc=current(api,kind);if(!doc||token(doc)!==args.token)return;
  const start=args.offset;if(!Number.isSafeInteger(start)||start<0)return;
  const seat=String(api.id||api.self?.id||''),key=seat+':'+kind;
  let row=held.get(key);
  if(!row||row.token!==args.token){
    row={token:args.token,text:JSON.stringify({text:String(doc.text||''),json:String(doc.json||''),files:Array.isArray(doc.files)?doc.files:[]})};
    if(held.size>=8)held.delete(held.keys().next().value);held.set(key,row);
  }
  if(start>=row.text.length)return;
  const end=Math.min(row.text.length,start+LIMITS.chunk*LIMITS.batch);
  for(let offset=start;offset<end;offset+=LIMITS.chunk){
    const next=Math.min(end,offset+LIMITS.chunk);
    api.emit('uiEvent',{name:'wws-export-data',payload:{kind,token:args.token,offset,next,total:row.text.length,batchEnd:end,chunk:row.text.slice(offset,next)}},{audience:{player:seat.replace(/^god\//,'')}});
  }
  if(end===row.text.length)held.delete(key);
}

// Browser-local full text: survives unrelated UI redraws, released when its sheet
// closes/switches. Neither the preview nor a copied value is used as a baseline.
export function mount(buildZip) {
  if(typeof window==='undefined'||typeof document==='undefined')return null;
  const prior=window.__wwsExportPreview;if(prior){prior.scan();return prior;}
  const slots=new Map();let frame=0,dead=false;
  const node=kind=>document.querySelector('[data-export-preview="'+kind+'"]');
  const meta=el=>{try{return JSON.parse(el?.getAttribute('data-export-meta')||'null');}catch(_){return null;}};
  function status(kind,text,retry=false){const slot=slots.get(kind);if(slot){slot.message=text;slot.retry=retry;}const el=node(kind);if(!el)return;const note=el.querySelector('[data-export-status]');if(note&&note.textContent!==text)note.textContent=text;const button=el.querySelector('[data-export-retry]');if(button)button.hidden=!retry;}
  function clearSlot(kind){const s=slots.get(kind);if(s?.timer)clearTimeout(s.timer);slots.delete(kind);}
  function request(s){
    if(dead||meta(node(s.meta.kind))?.token!==s.meta.token)return;
    clearTimeout(s.timer);s.timer=setTimeout(()=>{status(s.meta.kind,'Complete copy has not arrived. Your document is unchanged; retry to continue.',true);},LIMITS.timeoutMs);
    window.sendAction('exportData',{kind:s.meta.kind,token:s.meta.token,offset:s.offset});
  }
  function scan(){frame=0;if(dead)return;for(const kind of ['book','card']){
    const m=meta(node(kind));let s=slots.get(kind);
    if(!m){clearSlot(kind);continue;}
    if(s?.meta.token!==m.token){clearSlot(kind);s={meta:m,offset:0,chunks:[],pending:new Map(),data:null,timer:null};slots.set(kind,s);request(s);}
    const el=node(kind);if(s.node!==el){s.node=el;status(kind,s.message||(s.data?'Complete document ready — Copy keeps every character.':'Preparing complete copy…'),!!s.retry);}
  }}
  function receive(name,p){
    if(name!=='wws-export-data'||!p)return;const s=slots.get(p.kind);
    if(!s||s.data||p.token!==s.meta.token||meta(node(p.kind))?.token!==p.token)return;
    if(!Number.isSafeInteger(p.offset)||typeof p.chunk!=='string'||p.next!==p.offset+p.chunk.length||p.chunk.length>LIMITS.chunk||p.offset<s.offset)return;
    if(!Number.isSafeInteger(p.total)||p.total<p.next||!Number.isSafeInteger(p.batchEnd)||p.batchEnd<p.next||p.batchEnd>p.total)return;
    if(s.total!==undefined&&s.total!==p.total)return;s.total=p.total;s.pending.set(p.offset,p);
    while(s.pending.has(s.offset)){const q=s.pending.get(s.offset);s.pending.delete(s.offset);s.chunks.push(q.chunk);s.offset=q.next;}
    if(s.offset===p.total){
      clearTimeout(s.timer);try{s.data=JSON.parse(s.chunks.join(''));if(typeof s.data.text!=='string'||s.data.text.length!==s.meta.chars)throw Error('incomplete');s.chunks=[];s.pending.clear();status(p.kind,'Complete document ready — Copy keeps every character.');}
      catch(_){s.data=null;s.offset=0;s.chunks=[];s.pending.clear();status(p.kind,'The complete copy could not be checked. Retry; the preview is never copied instead.',true);}
    }else if(s.offset===p.batchEnd)request(s);
  }
  function fullFor(kind){const s=slots.get(kind);if(!s||meta(node(kind))?.token!==s.meta.token)return null;if(!s.data){status(kind,'Preparing the complete document — try Copy again when ready.',true);return null;}return s;}
  function selectFull(s){
    const root=node(s.meta.kind);if(!root)return;let ta=root.querySelector('[data-export-manual]');
    if(!ta){ta=document.createElement('textarea');ta.setAttribute('data-export-manual','');ta.readOnly=true;ta.setAttribute('aria-label','Complete document for manual copying');ta.style.cssText='width:100%;height:150px;font:12px monospace';root.appendChild(ta);}
    ta.value=s.data.text;ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);status(s.meta.kind,'Clipboard unavailable — the complete document is selected below, not the shortened preview.');
  }
  function copy(s){
    const ok=()=>status(s.meta.kind,'Copied the complete document — '+s.data.text.length.toLocaleString()+' characters.');
    const legacy=()=>{let ta;try{ta=document.createElement('textarea');ta.readOnly=true;ta.value=s.data.text;ta.style.cssText='position:fixed;left:-2000px;top:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,ta.value.length);const done=document.execCommand('copy');ta.remove();if(done)ok();else selectFull(s);}catch(_){ta?.remove();selectFull(s);}};
    try{if(window.navigator?.clipboard?.writeText)window.navigator.clipboard.writeText(s.data.text).then(ok,legacy);else legacy();}catch(_){legacy();}
  }
  function save(s,type,button){
    const m=s.meta,zip=type==='zip',isJson=type==='json'||type==='document'&&m.format==='json';
    const ext=zip?'zip':isJson?'cards.json':'md';
    const clean=x=>String(x||'document').replace(/[\\/:*?"<>|]/g,' ').trim();
    const stem=clean(m.stem||((m.author||'author')+'-'+(m.addr||'Worldwright Studio'))),d=new Date(),pad=n=>String(n).padStart(2,'0');
    const name=stem+'-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.'+ext;
    if(button?.getAttribute('data-armed')!==m.token){button?.setAttribute('data-armed',m.token);if(button)button.textContent='Yes — save '+name;status(m.kind,'This saves the complete document onto your device. Press again to confirm.');return;}
    try{
      let body=type==='json'?s.data.json:s.data.text,mime=isJson?'application/json':'text/markdown';
      if(zip){const z=buildZip({...m,...s.data});if(!z.ok){status(m.kind,z.reason==='too-large'?'Too much text to package here — Copy still keeps it all.':'Nothing packaged to save.');return;}const bin=window.atob(z.b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);body=bytes;mime='application/zip';}
      const url=window.URL.createObjectURL(new Blob([body],{type:mime+(zip?'':';charset=utf-8')})),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>window.URL.revokeObjectURL(url),4000);status(m.kind,'Saving the complete document — if no file arrives, use Copy.');
    }catch(_){status(m.kind,'The download was refused; Copy still keeps the complete document.');}
  }
  const off=window.spawn.on('event',receive);
  const observer=new MutationObserver(()=>{if(!frame&&!dead)frame=requestAnimationFrame(scan);});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-export-meta']});
  const host={scan,action(event,kind,op){event?.stopPropagation();if(op==='retry'){const s=slots.get(kind);if(s&&!s.data)request(s);return;}const s=fullFor(kind);if(!s)return;if(op==='copy')copy(s);else save(s,op,event?.currentTarget);},dispose(){dead=true;observer.disconnect();if(frame)cancelAnimationFrame(frame);off?.();for(const kind of slots.keys())clearSlot(kind);window.removeEventListener('pagehide',host.dispose);if(window.__wwsExportPreview===host)delete window.__wwsExportPreview;}};
  window.__wwsExportPreview=host;window.addEventListener('pagehide',host.dispose);scan();return host;
}
