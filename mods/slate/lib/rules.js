// GAME RULES in Settings: this game's own knobs from its config, a list you add from and remove back to default.
export const RULES={
 earshot:{label:'chat & voice range',hint:'how far a said line, a name and a voice carry',kind:'number',min:5,max:500,step:5,unit:'m',def:40,get:w=>w.earshot,set:(w,v)=>{w.earshot=v},del:w=>{delete w.earshot}},
 voiceMood:{label:'voice mood',hint:'the echo every voice wears',kind:'enum',opts:['open','hall','cave'],def:'open',get:w=>w.voiceMood,set:(w,v)=>{w.voiceMood=v},del:w=>{delete w.voiceMood}},
 nameplates:{label:'nameplates',hint:'names over other players\' heads',kind:'bool',def:true,get:w=>w.nameplates,set:(w,v)=>{w.nameplates=v},del:w=>{delete w.nameplates}},
 maxPlayers:{label:'players per room',hint:'the room cap before a new one opens',kind:'number',min:1,max:64,step:1,unit:'',def:4,get:w=>w.routing?.maxPlayers,set:(w,v)=>{w.routing={...(w.routing||{}),maxPlayers:v}},del:w=>{const r={...(w.routing||{})};delete r.maxPlayers;w.routing=r}},
 dayCycle:{label:'day / night cycle',hint:'minutes for one full day in this place',kind:'number',min:2,max:240,step:1,unit:'min',def:24,get:w=>{const c=w.places?.main?.atmosphere?.cycle;return c?.periodMs?Math.round(c.periodMs/60000):undefined},set:(w,v)=>{const a=w.places.main.atmosphere;w.places.main.atmosphere={...a,cycle:{periodMs:v*60000,epoch:0}}},del:w=>{const a={...w.places.main.atmosphere};delete a.cycle;w.places.main.atmosphere=a}},
};
export function ruleOp(ctx,p,d){
 const r=RULES[d.key];if(!r)return false;const w=ctx.world;
 let v=d.value;
 if(d.op==='ruleDel'){ctx.commit(`Slate: ${r.label} back to default`,()=>r.del(w));return false;}
 if(r.kind==='number'){v=Math.max(r.min,Math.min(r.max,Math.round(+v||r.def)));}
 else if(r.kind==='enum'){if(!r.opts.includes(v))v=r.def;}
 else v=v===undefined?r.def:!!v;
 ctx.commit(`Slate: ${r.label} set to ${v}${r.unit||''}`,()=>r.set(w,v));return false;
}
