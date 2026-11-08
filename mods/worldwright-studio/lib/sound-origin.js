// One origin contract shared by sound tokens and spoken lines. No polling: parenting carries motion.
export const DEFAULT_RANGE=30;
export const MAX_RANGE=500;
export const HEAD_FRACTION=.8;
export const FALLBACK_HEIGHT=1.2;
export function norm(v) { return String(v||"").trim().toLowerCase(); }
export function index(segments,total) {
  const out=[];
  for(let i=0;i<(segments||[]).length;i++) {
    const seg=segments[i], start=Number(seg.time)||0, end=i+1<segments.length?Number(segments[i+1].time):Number(total);
    for(const spec of seg.specs||[]) {
      const s=spec.state||{};
      out.push({id:spec.id,key:s.cardKey||"",cardId:s.cardId||"",name:s.cardName||"",start,end});
    }
  }
  return out;
}
export function resolve(cue,time,bindings) {
  const range=cue.range==null?DEFAULT_RANGE:cue.range, speaker=norm(cue.speaker)||"self";
  if(cue.position) return {kind:"point",position:cue.position,range};
  if(speaker==="screen") return {kind:"screen"};
  const own=speaker==="self", wanted=own?norm(cue.ownerCardId):speaker;
  const hits=(bindings||[]).filter(b=>time>=b.start&&time<b.end&&(own&&cue.ownerEntityId?b.id===cue.ownerEntityId:norm(b.cardId)===wanted||norm(b.key)===wanted||(!own&&norm(b.name).replace(/\s+/g,"-")===wanted)));
  if(!wanted && !(own&&cue.ownerEntityId)) return {error:"this card has no associated body; choose speaker <card-id>, speaker screen, or position X,Y,Z"};
  if(!hits.length) return {error:'speaker "'+(wanted||cue.ownerEntityId)+'" is not on this set; left silent'};
  if(hits.length!==1) return {error:'speaker "'+wanted+'" has several bodies on this set; a token on its own card can address each instance'};
  return {kind:"entity",id:hits[0].id,cardId:hits[0].cardId,name:hits[0].name,range,cutAt:hits[0].end};
}
export function collect(sceneCues,cardId,bindings,bodies,cap,sceneReferences) {
  const cues=(sceneCues||[]).map(c=>({...c,ownerCardId:cardId})), references=(sceneReferences||[]).map(c=>({...c,ownerCardId:cardId})), warnings=[];
  for(const b of bindings||[]) {
    if(b.cardId===cardId) continue;
    const body=(bodies||{})[b.key];
    for(const [rows,target] of [[body&&body.soundCues,cues],[body&&body.soundReferences,references]])for(const c of rows||[])target.push({...c,ownerCardId:b.cardId,ownerEntityId:b.id,ownerStart:b.start,ownerEnd:b.end});
  }
  if(cues.length>cap) {cues.length=cap;warnings.push("Scene sound limit is "+cap+" cues including body cards; remaining cues were not read.");}
  return {cues,references,warnings};
}
// Called only at a cue/chunk's start. Unknown or disappeared emitters stay silent.
export function placement(ctx,origin) {
  const o=origin||{kind:"screen"};
  if(o.error) return {error:o.error};
  if(o.kind==="screen") return {feetPosition:{x:0,y:0,z:0},spatial:false};
  if(o.kind==="point") return {feetPosition:o.position,spatial:true,maxDistance:o.range||DEFAULT_RANGE};
  if(o.kind!=="entity" || !o.id) return {error:"sound speaker was not resolved"};
  const target=ctx.getObject(o.id);
  if(!target) return {error:'sound speaker "'+o.id+'" has left the set'};
  const sy=typeof target.scale==="number"?target.scale:Number(target.scale&&target.scale.y)||1;
  const bounds=target.bounds;
  const height=bounds&&bounds.size?Math.max(0,Number(bounds.size.y)||0)*HEAD_FRACTION/Math.max(.001,Math.abs(sy)):FALLBACK_HEIGHT;
  return {parent:o.id,feetPosition:{x:0,y:height,z:0},spatial:true,maxDistance:o.range||DEFAULT_RANGE};
}
export function label(o) {
  if(!o) return "screen (legacy)";
  if(o.kind==="screen") return "screen";
  if(o.kind==="point") return "position "+[o.position.x,o.position.y,o.position.z].join(", ");
  return o.name||o.cardId||o.id||"card body";
}
