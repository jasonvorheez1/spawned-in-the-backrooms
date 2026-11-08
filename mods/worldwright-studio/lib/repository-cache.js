// Shared document/file boundary. Deliberately no SQL, timers, engine-state mirror, or automatic recovery. The supplied persistence operation owns permission + revision checks and the literal, batched database/FTS write. Not connected to live data yet.
const LIMITS=require('lib/data/repository-cache.js');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=v=>JSON.parse(JSON.stringify(v));
function fail(message){const e=Error(message);e.code='wws_cache';throw e;}
function segment(v){const s=String(v||'');if(!/^[a-zA-Z0-9_:-]{1,160}$/.test(s))fail('Invalid cache scope');return s;}
function key(v){const s=String(v||'');if(!/^[a-zA-Z0-9_.:-]{1,240}$/.test(s)||['__proto__','constructor','prototype'].includes(s))fail('Invalid document key');return s;}
function revision(v){if(!Number.isSafeInteger(v)||v<0)fail('Invalid cache revision');return v;}
// Accidental-corruption checksum, NOT an authentication mechanism. File reads never grant write permission. Scope names separate namespaces, not access permissions: the adapter must enforce privacy; shared world files are NOT author-private storage. An immutable-name collision is refused instead of overwritten.
function checksum(s){let a=2166136261,b=2246822519;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
function object(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function encoded(v){let s;try{s=JSON.stringify(v);}catch(e){fail('Document is not JSON');}if(typeof s!=='string'||s.length>LIMITS.maxDocumentChars)fail('Document exceeds the cache limit');return s;}
export function create(io,input){
  // IO is synchronous file read/write plus an atomic commit(callback), not api.sql.
  if(!io||typeof io.read!=='function'||typeof io.write!=='function'||typeof io.commit!=='function')fail('A file-cache backend is required');
  const scope={world:segment(input.world),mode:segment(input.mode),owner:segment(input.owner),project:segment(input.project)};
  if(!['dev','live'].includes(scope.mode))fail('Unknown cache mode');
  const base='cache/wws/'+[scope.world,scope.mode,scope.owner,scope.project].map(encodeURIComponent).join('/')+'/',head=base+'index.json',scopeText=JSON.stringify(scope);
  const warm=new Map(),dirty=new Map();let chars=0,serial=0,flight=null,acknowledged=null,uncertain=null;
  const counts={fileReads:0,fileWrites:0,memoryHits:0,persistenceCalls:0,cachePublishes:0};
  function readFile(path){counts.fileReads++;return io.read(path);}
  function manifest(allowMissing=false){const text=readFile(head);if(text==null){if(allowMissing)return null;fail('This file cache has not been initialized; no database fallback was attempted');}
    if(typeof text!=='string'||text.length>LIMITS.maxIndexChars)fail('Invalid cache index size');let m;try{m=JSON.parse(text);}catch(e){fail('Unreadable cache index');}
    if(!object(m)||m.schema!==LIMITS.schema||JSON.stringify(m.scope)!==scopeText||!object(m.entries))fail('Cache schema or scope mismatch');revision(m.revision);
    const ids=Object.keys(m.entries);if(ids.length>LIMITS.maxDocuments)fail('Cache index exceeds the limit');
    for(const id of ids){key(id);const r=m.entries[id];if(!object(r)||!/^objects\/[0-9]+-[0-9a-f]{16}\.json$/.test(String(r.file||''))||!Number.isInteger(r.chars)||r.chars<0||r.chars>LIMITS.maxDocumentChars||!/^[0-9a-f]{16}$/.test(String(r.checksum||'')))fail('Invalid cache entry');}
    return m;
  }
  function remember(path,text,value){const old=warm.get(path);if(old){chars-=old.chars;warm.delete(path);}warm.set(path,{chars:text.length,value});chars+=text.length;while(chars>LIMITS.memoryChars&&warm.size){const first=warm.keys().next().value;chars-=warm.get(first).chars;warm.delete(first);}}
  function readAt(m,id){if(!own(m.entries,id))return null;const r=m.entries[id],path=base+r.file,held=warm.get(path);if(held){counts.memoryHits++;warm.delete(path);warm.set(path,held);return clone(held.value);}
    const text=readFile(path);if(typeof text!=='string'||text.length!==r.chars||checksum(text)!==r.checksum)fail('Document cache is missing or corrupt: '+id);
    let value;try{value=JSON.parse(text);}catch(e){fail('Invalid document JSON: '+id);}remember(path,text,value);return clone(value);
  }
  function read(id){id=key(id);if(dirty.has(id))return clone(dirty.get(id).value);return readAt(manifest(),id);}
  function list(){const m=manifest(),ids=new Set(Object.keys(m.entries));for(const [id,r] of dirty)if(r.value===null)ids.delete(id);else ids.add(id);return [...ids].sort();}
  function stage(id,value){id=key(id);encoded(value);if(!dirty.has(id)&&dirty.size>=LIMITS.maxDirty)fail('Save this bounded batch before editing more documents');dirty.set(id,{value:clone(value),serial:++serial});return {dirty:dirty.size};}
  function publish(m,changes,nextRevision){
    const entries=Object.assign(Object.create(null),m?.entries||{}),prepared=[];
    for(const [id,r] of changes){if(r.value===null){delete entries[id];continue;}const text=encoded(r.value),sum=checksum(text),file='objects/'+nextRevision+'-'+sum+'.json';entries[id]={file,checksum:sum,chars:text.length};prepared.push({path:base+file,text});}
    if(Object.keys(entries).length>LIMITS.maxDocuments)fail('Cache index exceeds the limit');
    const next={schema:LIMITS.schema,scope,revision:nextRevision,entries},text=JSON.stringify(next);if(text.length>LIMITS.maxIndexChars)fail('Cache index exceeds the limit');
    io.commit(()=>{const current=manifest(true);if((current?.revision??null)!==(m?.revision??null))fail('Cache generation changed; refusing an older snapshot');
      for(const p of prepared){const old=readFile(p.path);if(old!==null&&old!==undefined&&old!==p.text)fail('Immutable cache entry collision');if(old==null){io.write(p.path,p.text);counts.fileWrites++;}}
      io.write(head,text);counts.fileWrites++;
    });counts.cachePublishes++;return next;
  }
  function clearSaved(changes){for(const [id,r] of changes)if(dirty.get(id)?.serial===r.serial)dirty.delete(id);}
  // Only an explicit, verified migration/export may seed an empty cache. Ordinary
  // readers cannot create an empty replacement for an unavailable source document.
  function initialize(documents,receipt){if(!receipt?.verified||receipt.source!=='database-export')fail('An explicit verified export is required');if(manifest(true))fail('Cache is already initialized');revision(receipt.revision);if(!object(documents)||Object.keys(documents).length>LIMITS.maxDocuments)fail('Invalid export');
    const changes=new Map();for(const id of Object.keys(documents)){key(id);if(documents[id]===null)fail('An exported document cannot be a deletion');encoded(documents[id]);changes.set(id,{value:clone(documents[id]),serial:0});}publish(null,changes,receipt.revision);return inspect();}
  async function save(persist){if(flight)return flight;if(uncertain)fail('The persistence outcome is unknown; verify it before saving again');if(!dirty.size&&!acknowledged)return {databaseSaved:false,cacheSaved:true,dirty:0};
    flight=(async()=>{if(!acknowledged){if(typeof persist!=='function')fail('Save needs the guarded persistence operation');const m=manifest(),changes=new Map([...dirty].map(([id,r])=>[id,{value:clone(r.value),serial:r.serial}]));
      counts.persistenceCalls++;let result;try{result=await persist({scope:clone(scope),expectedRevision:m.revision,changes:[...changes].map(([id,r])=>({id,value:clone(r.value)}))});}catch(e){if(e?.notWritten!==true)uncertain={m,changes};throw e;}
      if(!result?.ok||result.expectedRevision!==m.revision||!Number.isSafeInteger(result.revision)||result.revision<=m.revision){if(result?.notWritten!==true)uncertain={m,changes};fail('Persistence was not acknowledged; draft kept');}acknowledged={m,changes,revision:result.revision};}
      const a=acknowledged;try{publish(a.m,a.changes,a.revision);}catch(e){return {databaseSaved:true,cacheSaved:false,dirty:dirty.size,error:String(e.message||e)};}
      clearSaved(a.changes);acknowledged=null;return {databaseSaved:true,cacheSaved:true,dirty:dirty.size};
    })();try{return await flight;}finally{flight=null;}}
  function reconcile(receipt){if(!uncertain||receipt?.verified!==true||receipt.source!=='database-outcome'||receipt.expectedRevision!==uncertain.m.revision)fail('An explicit verified database outcome is required');if(receipt.notWritten===true){uncertain=null;return;}revision(receipt.revision);if(receipt.revision<=uncertain.m.revision)fail('Invalid persistence outcome');acknowledged={...uncertain,revision:receipt.revision};uncertain=null;}
  function inspect(){return {scope:clone(scope),unknownPersistenceOutcome:!!uncertain,dirty:dirty.size,inFlight:!!flight,awaitingCachePublish:!!acknowledged,memoryChars:chars,memoryEntries:warm.size,...counts};}
  return {read,list,stage,save,initialize,reconcile,inspect,clearMemory(){warm.clear();chars=0;}};
}
module.exports={create};
