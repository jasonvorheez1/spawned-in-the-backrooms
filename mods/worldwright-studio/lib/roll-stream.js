const C=require("lib/cards.js"),P=require("lib/pianoroll.js"),W=require("lib/roll-window.js");
const RUNS={};
export function invalidate(api){delete RUNS[String(api.id||(api.self&&api.self.id)||"")];}
const seat=api=>String(api.id||(api.self&&api.self.id)||"");
const state=api=>(api.getState().ui||{}).pianoRoll||{};
function patch(api,change){const ui=api.getState().ui||{};api.patchState({ui:{...ui,pianoRoll:{...ui.pianoRoll,...change}}});}
function reply(api,a,body){const payload={requestId:a.requestId,sessionId:a.sessionId,bookId:a.bookId,cardId:a.cardId,...body},s=state(api);if(s.bookId!==a.bookId||s.cardId!==a.cardId)return;patch(api,{streamReply:payload});const id=seat(api);api.emit("uiEvent",{name:"wws-roll-stream",payload},{audience:{player:id.startsWith("god/")?id.slice(4):id}});}
function packet(r,p){return {id:p.raw.id,title:p.raw.title,index:r.headers.findIndex(h=>h.id===p.raw.id),data:p.data,span:span(p.data)};}
export function span(data){return W.bounds(data);}
// Only local editing baselines survive eviction. No parsed offscreen score is kept.
export function sourceState(api,id){const r=RUNS[seat(api)],s=state(api);if(!r||r.bookId!==s.bookId||r.cardId!==s.cardId)throw Error("That buffered page expired; your draft is kept");const p=r.pages[id],raw=r.edits[id];if(id===s.pageId&&!raw)return {...s,span:span(s.data)};const content=raw?.content??p?.raw.content;if(content==null)throw Error("That buffered page expired; your draft is kept");const parsed=P.parseDocument(content,r.sections);if(parsed.error)throw Error(parsed.error);const data={...parsed.data,bpm:s.settings.bpm,settings:s.settings};return {...s,pageId:id,baseline:content,data,span:span(data)};}
export function saved(api,id,content,data,sections){const r=RUNS[seat(api)];if(!r)return;if(sections)r.sections=sections;r.settings=data.settings||r.settings;r.instruments=JSON.stringify(data.tracks.map(t=>[t.instrument,t.instrument==="clip"?require("lib/clip-instrument-data.js").signature(t.sample):t.instrument==="synth"?require("lib/synth-data.js").signature(t.synth):null]));const p=r.pages[id];if(p){p.raw={...p.raw,content};p.data=data;}if(r.edits[id])r.edits[id]={...r.edits[id],content};else if(id===state(api).pageId)r.edits[id]={id,content};const h=r.headers.find(h=>h.id===id);if(h)h.span=span(data);}
async function load(api,r,id){if(r.pages[id])return r.pages[id];const index=r.headers.findIndex(h=>h.id===id);if(index<0)throw Error("That page is not in this score");const raw=await C.getPage(api,r.bookId,id);if(!raw||raw.cardId!==r.cardId)throw Error("Score page "+(index+1)+" is missing");const parsed=P.parseDocument(raw.content,r.sections);if(parsed.error)throw Error("Page "+(index+1)+": "+parsed.error);const data={...parsed.data,bpm:r.settings.bpm,settings:r.settings};if(!data.part||data.part.index!==index+1||data.part.count!==r.headers.length||data.beats!==r.beats||JSON.stringify(data.tracks.map(t=>[t.instrument,t.instrument==="clip"?require("lib/clip-instrument-data.js").signature(t.sample):t.instrument==="synth"?require("lib/synth-data.js").signature(t.synth):null]))!==r.instruments)throw Error("Page "+(index+1)+" does not match this numbered score");const n=P.normalize(data);if(n.error)throw Error(n.error);r.headers[index].span=span(data);return r.pages[id]={raw,data};}
function trim(r,ids,edits){const keep=new Set(ids||[]),protectedIds=new Set(edits||[]);for(const id of protectedIds)if(!r.edits[id]&&r.pages[id])r.edits[id]=r.pages[id].raw;for(const id of Object.keys(r.pages))if(!keep.has(id))delete r.pages[id];for(const id of Object.keys(r.edits))if(!protectedIds.has(id))delete r.edits[id];}
export async function handle(api,a){const owner=seat(api),s=state(api);if(a.op==="streamReceipt"){if(s.streamReply&&s.streamReply.requestId===a.requestId)patch(api,{streamReply:null});return;}
  if(a.op==="streamCancel"){const r=RUNS[owner];if(r&&r.sessionId===a.sessionId){r.cancelled=true;trim(r,[],a.editIds);if(!s.open||s.cardId!==r.cardId||s.bookId!==r.bookId)delete RUNS[owner];}return;}
  try{if(!s.open||s.bookId!==a.bookId||s.cardId!==a.cardId)throw Error("The open score changed");
    if(a.op==="streamOpen"){
      const old=RUNS[owner],same=old&&old.bookId===s.bookId&&old.cardId===s.cardId;
      const r={bookId:s.bookId,cardId:s.cardId,sessionId:a.sessionId,settings:s.settings,beats:s.data.beats,instruments:JSON.stringify(s.data.tracks.map(t=>[t.instrument,t.instrument==="clip"?require("lib/clip-instrument-data.js").signature(t.sample):t.instrument==="synth"?require("lib/synth-data.js").signature(t.synth):null])),pages:{},edits:same?old.edits:{},headers:[],cancelled:false};RUNS[owner]=r;
      // One batched source read builds a tiny beat index; bodies are not cached or sent.
      r.sections=await C.listSections(api,r.bookId,r.cardId);const rows=await C.listPages(api,r.bookId,r.cardId);r.headers=rows.map(raw=>{const parsed=P.parseDocument(raw.content,r.sections);if(parsed.error)throw Error(parsed.error);return {id:raw.id,title:raw.title,span:span(parsed.data)};});
      if(!s.data.part||r.headers.length!==s.data.part.count)throw Error("This score needs a complete numbered page set");
      for(let i=0;i<r.headers.length;i++)if(!r.headers[i].span){const start=r.headers[i-1]?.span.end||0,end=r.headers.slice(i+1).find(h=>h.span)?.span.start??r.beats;r.headers[i].span={start,last:start,end,empty:false};}
      const index=r.headers.findIndex(h=>h.id===s.pageId);if(index<0)throw Error("The open page is missing");r.pages[s.pageId]={raw:{id:s.pageId,cardId:s.cardId,title:r.headers[index].title,content:s.baseline},data:s.data};
      const held=[];if(!a.viewOnly)for(let i=0;i<r.headers.length;i++){const h=r.headers[i];if(h.id===s.pageId||h.span.start>a.fromBeat||h.span.end<=a.fromBeat)continue;const p=await load(api,r,h.id);const data={...p.data,tracks:p.data.tracks.map(t=>({...t,notes:t.notes.filter(n=>n.at+n.length>a.fromBeat)})),pauses:[]};if(data.tracks.some(t=>t.notes.length))held.push({...packet(r,p),data});delete r.pages[h.id];}
      if(RUNS[owner]!==r||r.cancelled)return;reply(api,a,{kind:"open",headers:r.headers,page:packet(r,r.pages[s.pageId]),held});return;
    }
    const r=RUNS[owner];if(!r||r.cancelled||r.sessionId!==a.sessionId||r.bookId!==s.bookId||r.cardId!==s.cardId)throw Error("That preview ended");
    if(a.op==="streamWindow"){trim(r,a.visibleIds,a.editIds);reply(api,a,{kind:"window",residentIds:Object.keys(r.pages)});return;}
    if(a.op==="streamPage"){const p=await load(api,r,a.targetId);if(RUNS[owner]!==r||r.cancelled)return;reply(api,a,{kind:"page",page:packet(r,p)});return;}
    if(a.op==="streamTurn"){
      const p=await load(api,r,a.targetId),ui=api.getState().ui||{},cards=ui.cards||{},d=cards.pageDoc;if(!p||!d||d.cardId!==r.cardId||!d.pianoRoll)throw Error("The next score page is not ready");if(RUNS[owner]!==r||r.cancelled)return;
      // The page being left is an edit anchor, not part of the clean viewport cache.
      r.edits[s.pageId]={id:s.pageId,content:s.baseline};
      const index=r.headers.findIndex(h=>h.id===a.targetId),prevId=r.headers[index-1]?.id||"",nextId=r.headers[index+1]?.id||"";
      api.patchState({ui:{...ui,cards:{...cards,pageDoc:{...d,pageId:a.targetId,page:p.raw,index,count:r.headers.length,prevId,nextId,bodyHtml:"",headerHtml:"",footerHtml:"",warm:{}}},pianoRoll:{...s,pageId:a.targetId,baseline:p.raw.content,data:{...p.data,bpm:s.settings.bpm,settings:s.settings},streamTurn:{sessionId:a.sessionId,pageId:a.targetId},loadKey:(s.loadKey||0)+1,receipt:(s.receipt||0)+1,loading:false,busy:false}}});reply(api,a,{kind:"turned",pageId:a.targetId});return;
    }
    throw Error("Unknown page-stream action");
  }catch(e){reply(api,a,{kind:"error",message:String(e&&e.message||e)});}
}
