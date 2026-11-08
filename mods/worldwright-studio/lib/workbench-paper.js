// Legacy asset JSON stays unchanged when it fits. Long references use lossless JSON continuations.
const W=require('lib/score-width.js'),REFS=require('lib/refs.js');
const FORMAT='wws-asset-json/1';
export function lines(data,spec){
 const pretty=JSON.stringify(data,null,2).split('\n');if(data.mode!=='level'&&pretty.every(line=>W.fits(line,spec)))return pretty;
 const limit=W.usable(spec)-W.width('    "",')-1,chunks=[];let part='',width=0;
 if(limit<W.width('W'))throw Error('This paper is too narrow for an asset document');
 // Never cut an inline reference across JSON continuation pages. The literal tag
 // is also the shelf's link/index input, not just a string the decoder can repair.
 const text=JSON.stringify(data),tokens=new RegExp(REFS.TOKEN_SOURCE,'g');let at=0;
 function add(c){const advance=W.width(JSON.stringify(c).slice(1,-1));if(advance>limit)throw Error('An inline tag is too wide for this paper; use its short file ID');if(part&&width+advance>limit){chunks.push(part);part='';width=0;}part+=c;width+=advance;}
 for(const m of text.matchAll(tokens)){for(const c of text.slice(at,m.index))add(c);add(m[0]);at=m.index+m[0].length;}for(const c of text.slice(at))add(c);if(part)chunks.push(part);
 const out=JSON.stringify({encoding:FORMAT,chunks},null,2).split('\n');if(out.some(line=>!W.fits(line,spec)))throw Error('This paper is too narrow for an asset document');return out;
}
export function decode(text){const raw=JSON.parse(text);if(raw?.encoding!==FORMAT)return raw;if(!Array.isArray(raw.chunks)||raw.chunks.some(c=>typeof c!=='string'))throw Error('Invalid asset page continuation');return JSON.parse(raw.chunks.join(''));}
