// A page's visible extent includes rests and held tails, not just note attacks.
export function bounds(data) {
  const events=data.tracks.flatMap(t=>t.notes).concat(data.pauses||[]);
  return {start:events.length?Math.min(...events.map(n=>n.at)):0,last:events.length?Math.max(...events.map(n=>n.at)):0,end:events.length?Math.max(...events.map(n=>n.at+(n.length||0))):0,empty:!events.length};
}
export function visible(headers,left,right) {
  return headers.filter((h,i)=>{const s=h.span;if(!s||s.empty)return false;const next=headers[i+1]?.span;const end=Math.max(s.end,next&&!next.empty?next.start:s.end);return s.start<=right&&(end>left||s.start===left);}).map(h=>h.id);
}
export function startIndex(headers,beat) {
  let index=0;for(let i=0;i<headers.length;i++)if(headers[i].span&&!headers[i].span.empty&&headers[i].span.start<=beat)index=i;return index;
}
