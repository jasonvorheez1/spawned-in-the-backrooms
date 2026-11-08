export const TUNE={nodes:256,chains:32,chainJoints:32,iterations:48,tolerance:.0001,epsilon:1e-9,exportSamples:200000,maxKeys:256};
const fail=m=>{throw Error(m);};
export const nodeId=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number(s)<TUNE.nodes;
export const vector=(v,n=3)=>Array.isArray(v)&&v.length===n&&Array.from(v).every(x=>Number.isFinite(x)&&Math.abs(x)<100000);
export function blankAnimation(){return {version:1,sourceHash:'',name:'Studio',fps:30,loop:true,speed:1,limits:{},chains:[]};}
export function validateLimit(l){
 if(!l||!['hinge','cone'].includes(l.type)||!vector(l.axis)||Math.abs(Math.hypot(...l.axis)-1)>.00001||typeof l.enabled!=='boolean')fail('Invalid joint type, normalized axis or enabled flag');
 if(!Number.isFinite(l.min)||!Number.isFinite(l.max)||l.min< -180||l.max>180||l.min>l.max||!Number.isFinite(l.swing)||l.swing<0||l.swing>180)fail('Joint limits need ordered twist bounds from −180° to 180° and swing from 0° to 180°');
 return JSON.parse(JSON.stringify(l));
}
export function validateAnimation(a){
 if(!a||a.version!==1||typeof a.sourceHash!=='string'||a.sourceHash!==''&&!/^[a-f0-9]{64}$/.test(a.sourceHash))fail('Invalid animation source identity');
 if(typeof a.name!=='string'||!a.name.trim()||a.name.length>80||!Number.isInteger(a.fps)||a.fps<1||a.fps>60||typeof a.loop!=='boolean'||!Number.isFinite(a.speed)||a.speed<.1||a.speed>4)fail('Clip needs a name, 1–60 fps, loop flag and speed 0.1–4');
 if(!a.limits||Array.isArray(a.limits)||Object.keys(a.limits).length>TUNE.nodes||!Array.isArray(a.chains)||a.chains.length>TUNE.chains)fail('Invalid animation limits or chains');
 for(const [id,l]of Object.entries(a.limits)){if(!nodeId(id))fail('Invalid limited joint ID');validateLimit(l);}
 const ids=new Set(),active=new Set();
 for(const c of a.chains){
  if(!c||typeof c.id!=='string'||!/^chain-\d+$/.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.enabled!=='boolean')fail('Invalid or duplicate chain identity');ids.add(c.id);
  if(!Array.isArray(c.joints)||c.joints.length<2||c.joints.length>TUNE.chainJoints||c.joints.some(id=>!nodeId(id))||new Set(c.joints).size!==c.joints.length||!vector(c.target)||c.pole!==null&&!vector(c.pole))fail('Chain needs 2–32 distinct joints and finite target/pole coordinates');
  if(c.enabled)for(const id of c.joints){if(active.has(id))fail('Active chains cannot share joints; disable the other chain first');active.add(id);}
 }
 return JSON.parse(JSON.stringify(a));
}
