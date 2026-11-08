const PL=require("lib/pagelayout.js");
// Conservative advances for the paper's 13.5 px serif face. Scaled paper keeps these proportions.
export const TYPE={fontPx:13.5,safety:.9,space:.3,thin:.38,digit:.6,upper:.85,lower:.72,wide:1.08};
export function width(text){let em=0;for(const c of String(text)){em+=/\s/.test(c)?TYPE.space:/[ilI.,:;'!|/\[\]()]/.test(c)?TYPE.thin:/[0-9]/.test(c)?TYPE.digit:/[MWmw@%]/.test(c)?TYPE.wide:/[A-Z]/.test(c)?TYPE.upper:/[a-z]/.test(c)?TYPE.lower:TYPE.wide;}return em*TYPE.fontPx;}
export function usable(spec){return PL.toPx(spec||PL.DEFAULT_SPEC).bodyW*TYPE.safety;}
export function wrap(text,spec){const limit=usable(spec),lines=[];let line="";for(const word of String(text).trim().split(/\s+/)){if(width(word)>limit)throw Error("A score field is wider than this page; shorten its name or use wider paper");const next=line?line+" "+word:word;if(line&&width(next)>limit){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.join("\n");}
export function fits(text,spec){const limit=usable(spec);return String(text).split(/\r?\n/).every(line=>width(line)<=limit);}
// Append one whole tag's block. The caller accepts or moves the entire block to
// another page; sharing a line must never introduce a split-page chord.
export function appendTag(lines,tag,spec){const out=lines.slice(),parts=wrap(tag,spec).split("\n"),last=out.length-1;if(last>=0&&fits(out[last]+" "+parts[0],spec))out[last]+=" "+parts[0];else out.push(parts[0]);return out.concat(parts.slice(1));}
export function packTags(tags,spec){let lines=[];for(const tag of tags)lines=appendTag(lines,tag,spec);return lines.join("\n");}
