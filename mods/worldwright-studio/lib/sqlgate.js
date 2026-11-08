// Legacy SQL call sites, serialized until the file-backed repository cutover. Each thunk keeps its literal SQL in its owner. No timers, automatic retries, or response-to-empty conversions. One refused/error call cancels the unstarted fan-out.
const LIMIT=1, MAX_PENDING=64;
const queue=[];let inFlight=0;
export function refused(e){const m=String(e?.message||e?.code||e||'');return /already in flight|relay lane refused|budget_exceeded|database calls were still waiting/.test(m);}
function pump(){
  if(inFlight||!queue.length)return;
  const job=queue.shift();inFlight=1;
  Promise.resolve().then(job.run).then(value=>{inFlight=0;job.resolve(value);pump();},error=>{
    inFlight=0;const pending=queue.splice(0);
    job.reject(error);
    for(const p of pending){const e=Error('Database batch paused before this call was sent: '+String(error?.message||error));e.code=error?.code||'wws_batch_paused';e.notWritten=true;p.reject(e);}
  });
}
export function run(api,thunk){if(queue.length>=MAX_PENDING){const e=Error('Database batch is full; this call was not sent');e.code='budget_exceeded';e.notWritten=true;return Promise.reject(e);}return new Promise((resolve,reject)=>{queue.push({run:thunk,resolve,reject});pump();});}
export function all(api,thunks){return Promise.all((thunks||[]).map(thunk=>run(api,thunk)));}
export function stats(){return {inFlight,queued:queue.length,limit:LIMIT};}
module.exports={run,all,stats,refused};
