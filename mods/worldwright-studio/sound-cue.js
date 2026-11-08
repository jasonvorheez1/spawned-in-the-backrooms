const PACKAGE_PATH=require("lib/package-path.js");
const ORIGIN=require("lib/sound-origin.js");
// A single scheduled cue. Timer callbacks live and die with this row, never with a module-global run.
export function onSpawn(ctx) {
  const s=ctx.self.state, t=(ctx.now()-s.epoch)/1000;
  if(t>=s.item.until) { ctx.destroy(ctx.self.id); return; }
  if(s.item.trigger) ctx.on(s.item.trigger,(c,p)=>trigger(c,p));
  else if(t>=s.item.start) begin(ctx); else ctx.after(s.item.start-t,"begin");
  ctx.after(s.item.until-t,"finish");
}
export function trigger(ctx,payload) {
  const s=ctx.self.state, item=s.item, t=(ctx.now()-s.epoch)/1000, p=payload||{};
  const listener=p.soundOwner||p.player;
  if(listener&&listener!==s.soundOwner)return;
  if(s.fired||s.begun||t<item.start||t>=item.until)return;
  s.fired=true;
  const start=t+(item.delay||0);let until=item.until;
  if(!item.loop&&item.to!=null)until=Math.min(until,start+(item.to-item.from)/item.pitch);
  if(!(until>start)){finish(ctx);return;}
  s.item={...item,start,until};
  if(start>t)ctx.after(start-t,"begin");else begin(ctx);
  ctx.after(until-t,"finish");
}
export function armNotes(ctx,item,t) {
  const notes=item.roll&&item.roll.notes||[], groups=Object.create(null);
  for(const n of notes)if(n.on){if(!groups[n.on])groups[n.on]=[];groups[n.on].push({...n,on:""});}
  for(const name of Object.keys(groups))ctx.spawn({parent:ctx.self.id,tags:["sb-cue"],audience:"local",scope:"session",visible:false,feetPosition:{x:0,y:0,z:0},
    behavior:PACKAGE_PATH.resolve(ctx,"sound-cue.js"),state:{noteGroup:true,soundOwner:ctx.self.state.soundOwner,epoch:ctx.self.state.epoch,listeners:ctx.self.state.listeners,
      item:{...item,trigger:name,delay:0,start:t,loop:false,roll:{...item.roll,notes:groups[name]}}}});
}
export function begin(ctx) {
  const s=ctx.self.state, item=s.item, t=(ctx.now()-s.epoch)/1000, remaining=item.until-t;
  if(!(remaining>0)) { finish(ctx); return; }
  if(s.begun)return;s.begun=true;
  const progress=Math.max(0,t-item.start)*item.pitch;
  let from=item.from+progress;
  if(item.loop&&item.to!=null) from=item.from+(progress%(item.to-item.from));
  if(!item.loop&&item.to!=null&&from>=item.to) { finish(ctx); return; }
  const at=ORIGIN.placement(ctx,item.emitter);
  if(at.error) {ctx.log("[sound] "+at.error);ctx.emit("toast",{message:at.error},{audience:{player:s.soundOwner}});finish(ctx);return;}
  if(!s.noteGroup&&at.parent) ctx.attach(ctx.self,at.parent,{position:at.feetPosition});
  else if(!s.noteGroup) ctx.self.feetPosition=at.feetPosition;
  const base={listeners:s.listeners,gain:item.gain,spatial:at.spatial,bus:item.bus||(item.loop?"Music":"SFX")};
  if(at.maxDistance) base.maxDistance=at.maxDistance;
  if(item.kind==="roll") {
    armNotes(ctx,item,t);
    // Seek inside the first cycle while retaining the original loop range on subsequent cycles.
    ctx.self.audio={kind:"program",...base,script:PACKAGE_PATH.resolve(ctx,"roll-audio.js"),params:{fade:item.fade||0,elapsed:Math.max(0,t-item.start),roll:item.roll,from:item.from,to:item.to,seconds:remaining,pitch:item.pitch,loop:item.loop,offset:progress}};
  } else ctx.self.audio={kind:"clip",...base,clip:item.clip,listeners:s.listeners,time:from,pitch:item.pitch,loop:item.loop};
}
export function finish(ctx) { ctx.destroy(ctx.self.id); }
export function onSoundEnd(ctx) { if(!ctx.self.state.item.loop) finish(ctx); }
