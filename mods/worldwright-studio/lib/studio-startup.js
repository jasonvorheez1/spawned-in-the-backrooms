// WWS-only startup jobs, not an SQL interceptor. Literal statements stay with their owners. One active pass; one cached result per named pass; no timers and no automatic write retries. Promise latches are intentionally per script instance, not durable document or room state.
const PASSES = {};
const QUEUE = [];
const MAX_PENDING = 32;
let running = false;
let failure = null;

// 6.0: a stale tab's write is refused before it runs ("This write did not happen; nothing changed"), a known non-write, so a reopen after reload retries it.
export function stale(error) { return /Reload this client and run it again|runs your saves up to \d+/i.test(String(error?.message || error || '')); }
export function recoverable(error) {
  const code = String(error?.code || error?.doorCode || error?.verdict?.code || '');
  const message = String(error?.message || error || '');
  return code === 'budget_exceeded' || /\bbudget_exceeded\b|64 calls already in flight|64 database calls were still waiting for answers when this one was asked, so it was not sent|door forward refused[^\n]*calls already in flight|This write did not happen; nothing changed|Reload this client and run it again/i.test(message);
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (QUEUE.length) {
      const pass = QUEUE.shift();
      try {
        if (failure) throw failure;
        const result = await pass.run();
        pass.status = 'ready';
        pass.resolve(result);
      } catch (error) {
        failure = error;
        pass.status = 'failed';
        pass.reject(error); // Every caller receives the error; it is never converted into readiness.
      }
      pass.run = null;
    }
  } finally { running = false; }
}

export function once(key, run) {
  if (PASSES[key]) return PASSES[key].promise;
  if (failure) return Promise.reject(failure);
  if (QUEUE.length >= MAX_PENDING) {
    const error = Error('WWS startup is busy; reopen the studio after this pass finishes');
    error.code = 'budget_exceeded'; // This pass was not sent or run. A visible retry is safe.
    return Promise.reject(error);
  }
  const pass = { status: 'pending', run };
  pass.promise = new Promise((resolve, reject) => { pass.resolve = resolve; pass.reject = reject; });
  PASSES[key] = pass;
  QUEUE.push(pass);
  drain();
  return pass.promise;
}

// Called only on an actual visible reopening. A known refusal is safe to retry; a disconnected
// request may already have written, so an unknown outcome remains paused for inspection.
export function retry() {
  if (running) return false;
  if (!failure) return true;
  if (!recoverable(failure)) return false;
  for (const key of Object.keys(PASSES)) if (PASSES[key].status === 'failed') delete PASSES[key];
  failure = null;
  return true;
}

export function info() {
  return { busy: running, pending: QUEUE.length, failed: !!failure, recoverable: !!failure && recoverable(failure) };
}
