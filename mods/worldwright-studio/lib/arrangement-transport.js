import { createBufferedPreview } from './arrangement-preview.js';
import { ringTail } from './clip-instrument-data.js';
import { validate, warnings, LIMITS } from './arrangement-data.js';
// Only transient normalized notes enter this adapter. Persistence stores card IDs.
export function compile(data,sources,opts={}){
 const d=validate(data),problems=warnings(d,sources),lookup=new Map(sources.map(s=>[s.id,s]));
 const invalid=d.clips.filter(c=>{const s=lookup.get(c.cardId);return !s||s.error||s.triggered;});
 if(invalid.length)throw Error(problems.join('\n'));
 const solo=d.tracks.some(t=>t.solo),beat=60/d.bpm,notes=[],end=Math.max(4,...d.clips.map(c=>c.start+c.length));
 for(const c of d.clips){const t=d.tracks[c.track-1],s=lookup.get(c.cardId);if(t.mute||(solo&&!t.solo)||(c.gain===0&&!opts.window))continue;
 const scale=s.bpm/d.bpm;for(const [noteIndex,n] of s.roll.notes.entries()){const at=n.at*scale,length=Math.min(n.length*scale,c.length*beat-at);if(length<=0)continue;const start=c.start*beat+at,w=opts.window;if(w&&(start>=w.to||(w.held?start+length+ringTail(n)<=w.from:start<w.from)))continue;notes.push({...n,...(w?{previewKey:c.id+':'+noteIndex}:{}),at:start,length,velocity:n.velocity,mixKey:c.id,mixGain:c.gain});if(notes.length>(opts.maxNotes||LIMITS.previewNotes))throw Error('Arrangement exceeds the '+(opts.maxNotes||LIMITS.previewNotes)+'-note render limit; shorten or mute clips');}
 }
 if(!opts.window&&!notes.some(n=>n.velocity>0))throw Error('There are no audible notes. Check sources, track mute/solo and clip gain');
 return {roll:{version:1,bpm:d.bpm,beats:end,duration:end*beat,notes:notes.sort((a,b)=>a.at-b.at)},warnings:problems};
}
export function createPreview(env){return createBufferedPreview(env,compile);}
