const EPS=1e-10,RAD=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function unit(q){const n=Math.hypot(...q);if(!Number.isFinite(n)||n<EPS)throw Error('A joint quaternion must be finite and nonzero');return q.map(x=>x/n);}
export function multiply(a,b){const [x,y,z,w]=a,[u,v,t,s]=b;return [w*u+x*s+y*t-z*v,w*v-x*t+y*s+z*u,w*t+x*v-y*u+z*s,w*s-x*u-y*v-z*t];}
const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
function canonical(q){q=unit(q);const first=Math.abs(q[3])>EPS?q[3]:q.slice(0,3).find(x=>Math.abs(x)>EPS)||1;return first<0?q.map(x=>-x):q;}
export function split(q,rest,axis){
 const d=canonical(multiply(inverse(unit(rest)),unit(q))),dot=d[0]*axis[0]+d[1]*axis[1]+d[2]*axis[2];
 let twist=[axis[0]*dot,axis[1]*dot,axis[2]*dot,d[3]];twist=Math.hypot(...twist)<EPS?[0,0,0,1]:canonical(twist);
 let angle=2*Math.atan2(twist[0]*axis[0]+twist[1]*axis[1]+twist[2]*axis[2],twist[3])/RAD;if(angle>180)angle-=360;if(angle< -180)angle+=360;
 return {angle,swing:canonical(multiply(d,inverse(twist)))};
}
function swingAt(q,max){q=canonical(q);const a=2*Math.acos(clamp(q[3],-1,1)),limit=max*RAD;if(a<=limit+EPS)return q;const n=Math.hypot(...q.slice(0,3));if(n<EPS)return [0,0,0,1];const k=Math.sin(limit/2)/n;return [q[0]*k,q[1]*k,q[2]*k,Math.cos(limit/2)];}
function compose(rest,swing,angle,axis){const a=angle*RAD/2,s=Math.sin(a);return unit(multiply(unit(rest),multiply(swing,[axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(a)])));}
export function constrain(q,rest,limit){if(!limit||!limit.enabled)return unit(q);const d=split(q,rest,limit.axis);return compose(rest,swingAt(d.swing,limit.type==='hinge'?0:limit.swing),clamp(d.angle,limit.min,limit.max),limit.axis);}
export function slerp(a,b,t){a=unit(a);b=unit(b);let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(x=>-x);d=-d;}if(d>.9995)return unit(a.map((x,i)=>x+(b[i]-x)*t));const angle=Math.acos(clamp(d,-1,1)),s=Math.sin(angle);return a.map((x,i)=>(x*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/s);}
export function interpolate(a,b,rest,limit,t){if(!limit?.enabled)return slerp(a,b,t);const x=split(constrain(a,rest,limit),rest,limit.axis),y=split(constrain(b,rest,limit),rest,limit.axis);return constrain(compose(rest,slerp(x.swing,y.swing,t),x.angle+(y.angle-x.angle)*t,limit.axis),rest,limit);}
export function measure(q,rest,limit){const d=split(q,rest,limit.axis);return {twist:d.angle,swing:2*Math.acos(clamp(d.swing[3],-1,1))/RAD};}
