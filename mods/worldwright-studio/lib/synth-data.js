const WIDTH=require('lib/score-width.js');
export const VERSION=1;
export const WAVES=['sine','triangle','sawtooth','square'];
export const FIELDS={attack:[0,5,.008],decay:[0,5,.35],sustain:[0,1,.65],release:[0,5,.18],cutoff:[20,20000,14000],resonance:[.1,20,.7],detune:[-1200,1200,0],gain:[0,2,1],pan:[-1,1,0]};
export const PRESETS={
  'Soft keys':{wave:'triangle',attack:.015,decay:.4,sustain:.3,release:.4,cutoff:4800},
  'Warm pad':{wave:'sawtooth',attack:.6,decay:.8,sustain:.65,release:1.5,cutoff:2400,resonance:.6},
  'Short bass':{wave:'square',attack:.004,decay:.18,sustain:.25,release:.09,cutoff:1100,resonance:1.2},
  'Bright lead':{wave:'sawtooth',attack:.008,decay:.25,sustain:.7,release:.2,cutoff:8500,resonance:2.5}
};
export function blank(){return {version:VERSION,name:'My synth',wave:'sawtooth',...Object.fromEntries(Object.entries(FIELDS).map(([k,v])=>[k,v[2]]))};}
export function validate(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {error:'Synth patch must be an object'};
  for(const k of Object.keys(value))if(!['version','name','wave',...Object.keys(FIELDS)].includes(k))return {error:'Unknown synth field: '+k};
  if(value.version!==VERSION)return {error:'Unsupported synth patch version'};
  const p={...blank(),...value};
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>64||/[\[\],\r\n]/.test(p.name))return {error:'Synth name is 1–64 characters without commas, brackets or newlines'};
  p.name=p.name.trim().replace(/\s+/g," ");if(!WAVES.includes(p.wave))return {error:'Choose sine, triangle, sawtooth or square'};
  for(const [k,[lo,hi]]of Object.entries(FIELDS))if(!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)return {error:k+' must be '+lo+'–'+hi};
  return {synth:p};
}
export function signature(p){if(p===undefined)return 'classic';const r=validate(p);return r.error?'invalid:'+r.error:JSON.stringify(r.synth);}
export function preset(name){const row=PRESETS[name];if(!row)throw Error('Unknown synth preset');return {...blank(),...row,name};}
export function read(text){const patches={},re=/#\[synth\s*:[^\]]*\]/gi;let m,count=0;while((m=re.exec(text))){count++;const fields=m[0].replace(/^#\[synth\s*:/i,'').slice(0,-1).split(',').map(s=>s.trim()),head=/^track\s+([1-8])$/i.exec(fields.shift()||'');if(!head)return {error:'Synth declaration starts with track 1–8'};const track=head[1];if(patches[track])return {error:'Repeated synth declaration for track '+track};const p={version:1},seen=new Set();for(const field of fields){const pair=/^(\w+)\s+(.+)$/.exec(field.replace(/\s+/g,' '));if(!pair)return {error:'Malformed synth field'};const k=pair[1];if(seen.has(k))return {error:'Repeated synth field '+k};seen.add(k);p[k]=['name','wave'].includes(k)?pair[2]:Number(pair[2]);}const checked=validate(p);if(checked.error)return checked;patches[track]=checked.synth;}if((String(text).match(/#\[synth\s*:/gi)||[]).length!==count)return {error:'Unclosed synth declaration'};return {patches};}
export function declarations(tracks,spec){const out=[];for(let i=0;i<tracks.length;i++){const t=tracks[i];if(t.instrument!=='synth'||t.synth===undefined)continue;const r=validate(t.synth);if(r.error)throw Error(r.error);const p=r.synth,tag='#[synth: track '+(i+1)+', '+Object.entries(p).map(([k,v])=>k+' '+v).join(', ')+']';out.push(spec?WIDTH.wrap(tag,spec):tag);}return out;}
