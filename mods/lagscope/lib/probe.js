// LAGSCOPE probe: the game thread's own heartbeat. A Spawn game's scripts, physics and simulation run in a worker beside
// the page, where Long Animation Frames never fire, so a freeze there was invisible to the page observers in scene.js.
// A 50 ms timer measures how late each beat lands: a late beat is the game thread busy (scripts, physics, a garbage
// sweep in the worker); the average lateness is its load. The frame side (the page drawing) is read from ctx.view's fps:
// a frame dip while the game thread stayed on time is the drawing or the browser, never the game's scripts.
const clock = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
const BEAT = 50, FREEZE = 70;
const R = (globalThis.__lagprobe ||= { on: false, last: 0, lag: [], add: null });

export function startProbe(addStall) {
  R.add = addStall;
  if (R.on || typeof setInterval !== "function") return;
  R.on = true; R.last = clock();
  setInterval(() => {
    const t = clock(), late = Math.max(0, t - R.last - BEAT); R.last = t;
    R.lag.push([t, late]); if (R.lag.length > 1300) R.lag.splice(0, 100); // ~60 s of beats
    if (late >= FREEZE && R.add) R.add({ t: t - late - BEAT, ms: late + BEAT, kind: "thread", cause: `game thread froze ${Math.round(late + BEAT)} ms (scripts, physics or a sweep in the game worker)` });
  }, BEAT);
}
// the game thread's load over the last windowMs: mean and p99 lateness per beat, busy share, freezes
export function threadSnap(windowMs = 60000) {
  const now = clock(), v = []; for (const [t, l] of R.lag) if (now - t < windowMs) v.push(l);
  if (v.length < 10) return null;
  const s = v.slice().sort((a, b) => a - b), sum = v.reduce((a, b) => a + b, 0);
  return { avg: +(sum / v.length).toFixed(1), p99: +s[Math.floor(s.length * 0.99)].toFixed(0), max: +s[s.length - 1].toFixed(0), busy: +Math.min(1, sum / (v.length * BEAT + sum)).toFixed(2), freezes: v.filter((x) => x >= FREEZE).length, beats: v.length };
}
export const probeOn = () => R.on;
