import {PATH} from "./workbench-settings.js";
export function blank(){return {version:PATH.version,duration:PATH.defaultDuration,points:PATH.defaultPoints.map(p=>p.slice()),curve:'smooth',closed:false,tension:PATH.defaultTension};}
export function validate(p){
 if(!p||p.version!==PATH.version||!['linear','smooth'].includes(p.curve)||typeof p.closed!=='boolean'||!Number.isFinite(p.tension)||p.tension<0||p.tension>1)throw Error('Invalid path settings');
 if(!Number.isFinite(p.duration)||p.duration<=0||p.duration>PATH.maxDuration)throw Error('Path duration must be 0–'+PATH.maxDuration+' seconds');
 if(!Array.isArray(p.points)||p.points.length<2||p.points.length>PATH.maxPoints)throw Error('A path needs 2–'+PATH.maxPoints+' waypoints');
 for(const v of p.points)if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)||Math.abs(n)>=PATH.maxCoordinate))throw Error('Each waypoint needs three finite XYZ coordinates');
 if(p.closed&&p.points.length<3)throw Error('A closed path needs at least three waypoints');
 return JSON.parse(JSON.stringify(p));
}
export function sample(p){
 const a=p.points,n=a.length,segments=p.closed?n:n-1,out=[];
 const point=i=>a[p.closed?(i%n+n)%n:Math.max(0,Math.min(n-1,i))];
 for(let i=0;i<segments;i++){
  const count=p.curve==='linear'?1:PATH.samplesPerSegment;
  for(let j=0;j<count;j++){const t=j/count;if(p.curve==='linear'){out.push(a[i].slice());continue;}
   const p0=point(i-1),p1=point(i),p2=point(i+1),p3=point(i+2),t2=t*t,t3=t2*t;
   out.push(p1.map((v,k)=>(2*t3-3*t2+1)*v+(t3-2*t2+t)*(p2[k]-p0[k])*p.tension+(-2*t3+3*t2)*p2[k]+(t3-t2)*(p3[k]-v)*p.tension));
  }
 }
 out.push((p.closed?a[0]:a[n-1]).slice());return out;
}
export function measure(points){const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(...points[i].map((v,k)=>v-points[i-1][k])));return {points,distances,length:distances[distances.length-1]||0};}
export function at(route,u){const {points,distances,length}=route;if(!points.length)return {position:[0,0,0],direction:[0,0,-1]};const d=Math.max(0,Math.min(1,u))*length;let lo=1,hi=points.length-1;while(lo<hi){const m=(lo+hi)>>1;if(distances[m]<d)lo=m+1;else hi=m;}const i=Math.max(1,lo),a=points[i-1]||points[0],b=points[i]||a,span=(distances[i]||0)-(distances[i-1]||0),t=span>0?(d-distances[i-1])/span:0;return {position:a.map((v,k)=>v+(b[k]-v)*t),direction:b.map((v,k)=>v-a[k])};}
export function nav(p){validate(p);const points=sample(p).map(([x,y,z])=>({x,y,z}));return {seconds:p.duration,points,facings:points.map(()=>null),pauses:points.map(()=>0),warnings:[]};}
export function exportText(p){return '# Worldwright Studio 3D route · sampled '+p.curve+' path\n'+sample(validate(p)).map(v=>'at '+v.map(n=>Number(n.toFixed(6))).join(', ')).join('\n')+'\n';}
export function importText(text){
 const source=String(text||'').trim();if(source.length>PATH.maxImportBytes)throw Error('Path import is too large');
 if(source.startsWith('{')){const d=JSON.parse(source);return validate(d.path||d);}
 const points=[];for(const line of source.split(/\r?\n/)){const s=line.trim();if(!s||s.startsWith('#'))continue;const m=s.match(/^(?:at\s+)?(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))$/i);if(!m)throw Error('Import needs XYZ waypoint lines or editable path JSON. Prose, references and pause/facing flags stay in their original Path section.');points.push(m.slice(1).map(Number));}
 return validate({...blank(),points,curve:'linear',closed:false});
}
export function fromPages(pages){
 if(!pages?.length||!pages.every(p=>p.title==='Asset Studio'))return null;
 const d=JSON.parse(pages.map(p=>p.content||'').join('\n'));if(d.version!==1)throw Error('Unsupported asset document');if(!d.path)return null;return nav(d.path);
}
