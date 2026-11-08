const PACKAGE_PATH=require("lib/package-path.js");
// The native conductor. One temporary object per cue owns its saved timers; destruction cancels them.
export const TAG="sb-cue";
export const ID_PREFIX="sb-cue-";
export const LEAD=0; // The player courier starts us with the picture; no guessed UI-delivery delay.
export const ONE_SHOT_TAIL=0; // Unknown length is never guessed; the scene is the upper bound.
export function plan(effects, opts) {
  const o=opts||{}, out=[], stops={};
  for(const row of effects||[]) if(String(row.id||"").endsWith("-stop") && !(row.params&&row.params.clip)) stops[row.id.slice(0,-5)]=Number(row.time);
  for(const row of effects||[]) {
    const p=row.params||{}, kind=p.sourceKind||"clip";
    if(!(p.clip||kind==="roll"&&p.roll)) continue;
    const start=Math.max(0,Number(row.time)||0), pitch=Number(p.pitch)||1, from=Number(p.from)||0;
    const loop=p.loop===true||row.type==="musicShift";
    let until=p.until==null?(stops[row.id]??(loop?start+Number(row.duration||0):Number(o.total))):Number(p.until);
    if(Number(o.total)>0) until=Math.min(until,Number(o.total));
    if(!p.trigger && !loop && p.to!=null) until=Math.min(until,start+(Number(p.to)-from)/pitch);
    if(!(until>start)) continue;
    out.push({emitter:p.emitter||{kind:"screen"},bus:p.bus||(loop?"Music":"SFX"),fade:Number(p.fade)||0,trigger:String(p.trigger||""),delay:Math.max(0,Number(p.delay)||0),cueId:row.id,slot:out.length+1,kind,clip:p.clip||"",roll:p.roll||null,loop,start,until,from,to:p.to==null?null:Number(p.to),gain:Math.max(0,Math.min(1,Number(p.volume==null?0.8:p.volume)))*(o.gain==null?1:Math.max(0,Math.min(1,Number(o.gain)))),pitch});
  }
  return out;
}
export function owned(ctx, place) {
  const q={tags:[TAG]}; if(place) q.place=place;
  return ctx.query(q).filter(r=>r.state&&r.state.soundOwner===ctx.self.id);
}
export function stop(ctx,place) { const rows=owned(ctx,place); for(const r of rows) ctx.destroy(r.id); return rows.length; }
export function census(ctx,place) { return owned(ctx,place).map(r=>r.id); }
export function play(ctx,cues,opts) {
  const o=opts||{}, out={armed:0,cues:0,run:String(ctx.now()),warnings:[]}; stop(ctx,o.place);
  const items=plan(o.effects,o); out.cues=items.length;
  const offset=Math.max(0,Number(o.offset)||0), owner=ctx.self.id;
  for(const item of items) {
    if(item.until<=offset) continue;
    ctx.spawn({tags:[TAG],audience:"local",scope:"session",visible:false,feetPosition:{x:0,y:0,z:0},
      behavior:PACKAGE_PATH.resolve(ctx,"sound-cue.js"),state:{soundOwner:owner,item,epoch:ctx.now()-offset*1000,listeners:[owner]}});
    out.armed++;
  }
  return out;
}
