// Slate's vault: the board, the book and the archive outlive the room.
// world.state is the room's: a roguelike death, a fresh biome instance or a new run starts a room empty.
// So every change is copied to the world's SQL (one row per key, kept across every room), and a room
// that wakes without them restores from it. Each key is restored only while it is still missing, so a
// write made before the answer arrives is never overwritten.
const KEYS=['plan','loom','slateArchive','prepro'];
const last={}; // this machine's last saved text per key, so an unchanged key is never re-sent
// empty = nothing a creator wrote yet (a fresh room's default row): the vault's copy wins over it
const empty=(k,v)=>v===undefined||v===null||(k==='plan'?!(v.cards||[]).length&&!(v.ms||[]).length:k==='loom'?!(v.pages||[]).length:!Object.keys(v).length);
let ready=null,restoring=false,restored=false;
function table(ctx){if(!ready)ready=Promise.resolve(ctx.sql`CREATE TABLE IF NOT EXISTS slate_vault(k TEXT PRIMARY KEY,v TEXT,at TEXT)`).catch(e=>{ready=null;throw e;});return ready;}
export function vaultSave(ctx){
 if(typeof ctx.sql!=='function'||!restored)return;const S=ctx.world.state; // never save before this room has heard the vault
 for(const k of KEYS){const v=S[k];if(v===undefined)continue;let t;try{t=JSON.stringify(v);}catch(e){continue;}if(last[k]===t)continue;last[k]=t;
  table(ctx).then(()=>ctx.sql`INSERT INTO slate_vault(k,v,at) VALUES(${k},${t},datetime('now')) ON CONFLICT(k) DO UPDATE SET v=${t},at=datetime('now')`).catch(()=>{delete last[k];});}
}
export function vaultRestore(ctx){
 if(restored||restoring||typeof ctx.sql!=='function')return;const S=ctx.world.state;
 const missing=KEYS.filter(k=>empty(k,S[k]));if(!missing.length){restored=true;return;}
 restoring=true;
 table(ctx).then(()=>ctx.sql`SELECT k,v FROM slate_vault`).then(r=>{
  for(const row of r?.rows||[]){if(!missing.includes(row.k)||!empty(row.k,ctx.world.state[row.k]))continue;try{const v=JSON.parse(row.v);if(empty(row.k,v))continue;ctx.world.state[row.k]=row.k==='plan'?{...v,tab:ctx.world.state.plan?.tab??v.tab}:v;last[row.k]=row.v;}catch(e){}}
  restored=true;}).catch(()=>{}).finally(()=>{restoring=false;});
}
