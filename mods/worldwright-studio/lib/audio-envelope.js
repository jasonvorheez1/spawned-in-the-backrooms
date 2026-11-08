// Two bounded linear edges. Times are wall-clock seconds, never source beats.
export function envelope(param, at, remaining, fade, elapsed=0) {
  const total=remaining+elapsed, edge=Math.min(Math.max(0,fade||0),total/2);
  if(!edge){param.setValueAtTime(1,at);return;}
  const level=t=>Math.max(0,Math.min(1,t/edge,(total-t)/edge));
  param.setValueAtTime(level(elapsed),at);
  if(elapsed<edge)param.linearRampToValueAtTime(1,at+edge-elapsed);
  if(elapsed<total-edge)param.setValueAtTime(1,at+total-edge-elapsed);
  param.linearRampToValueAtTime(0,at+remaining);
}
