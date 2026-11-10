// Pure joint-space math. All poses are metres and glTF quaternions (x,y,z,w).
export const V=a=>Array.isArray(a)?{x:a[0],y:a[1],z:a[2]}:a;
export const Q=a=>Array.isArray(a)?{x:a[0],y:a[1],z:a[2],w:a[3]}:a;
export const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const mulV=(a,n)=>({x:a.x*n,y:a.y*n,z:a.z*n});
export const norm=a=>Math.hypot(a.x,a.y,a.z);
export const mix=(a,b,t)=>add(a,mulV(sub(b,a),t));
export const identity=()=>({x:0,y:0,z:0,w:1});
export const inv=q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
export function mul(a,b){return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};}
export function rotate(q,v){const a=mul(mul(q,{...v,w:0}),inv(q));return {x:a.x,y:a.y,z:a.z};}
export function quatMix(a,b,t){const dot=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w,k=dot<0?-1:1;const q={x:a.x+(k*b.x-a.x)*t,y:a.y+(k*b.y-a.y)*t,z:a.z+(k*b.z-a.z)*t,w:a.w+(k*b.w-a.w)*t};const l=Math.hypot(q.x,q.y,q.z,q.w);return {x:q.x/l,y:q.y/l,z:q.z/l,w:q.w/l};}
export function aim(a,b){const la=norm(a),lb=norm(b);if(la<.0001||lb<.0001)return identity();a=mulV(a,1/la);b=mulV(b,1/lb);const q={x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x,w:1+a.x*b.x+a.y*b.y+a.z*b.z};const l=Math.hypot(q.x,q.y,q.z,q.w);return l>.0001?{x:q.x/l,y:q.y/l,z:q.z/l,w:q.w/l}:{x:1,y:0,z:0,w:0};}
export function fk(rig,offsets={}){
 const out={};
 function bone(name){if(out[name])return out[name];const r=rig[name];if(!r)return {p:{x:0,y:0,z:0},q:identity()};const parent=r.parent&&rig[r.parent]?bone(r.parent):{p:{x:0,y:0,z:0},q:identity()},o=offsets[name];return out[name]={p:add(parent.p,rotate(parent.q,add(V(r.position),o?.position??{x:0,y:0,z:0}))),q:mul(parent.q,mul(Q(r.rotation),o?.rotation??identity()))};}
 for(const name of Object.keys(rig))bone(name);return out;
}
export function solveWrist(rig,bind,side,targetP,targetQ){
 const E=bind[side+'_Elbow'],W=bind[side+'_Wrist'];if(!E||!W)return null;
 const q=aim(sub(W.p,E.p),sub(targetP,E.p));
 const elbowP=sub(targetP,rotate(q,sub(W.p,E.p)));
 const elbowDelta=mul(inv(E.q),mul(q,E.q));
 const offsets={[side+'_Elbow']:{position:sub(elbowP,E.p),rotation:elbowDelta}};
 const posed=fk(rig,offsets),parent=posed[rig[side+'_Wrist'].parent];
 offsets[side+'_Wrist']={rotation:mul(inv(Q(rig[side+'_Wrist'].rotation)),mul(inv(parent.q),targetQ))};
 return offsets;
}
export function fromXYZ(e){const d=Math.PI/360,x=(e.pitch??0)*d,y=(e.yaw??0)*d,z=(e.roll??0)*d;return mul(mul({x:Math.sin(x),y:0,z:0,w:Math.cos(x)},{x:0,y:Math.sin(y),z:0,w:Math.cos(y)}),{x:0,y:0,z:Math.sin(z),w:Math.cos(z)});}
export function toXYZ(q){const{x,y,z,w}=q,m13=2*(x*z+y*w),m23=2*(y*z-x*w),m33=1-2*(x*x+y*y),m12=2*(x*y-z*w),m11=1-2*(y*y+z*z),m32=2*(y*z+x*w),m22=1-2*(x*x+z*z),d=180/Math.PI;return {pitch:(Math.abs(m13)<.9999999?Math.atan2(-m23,m33):Math.atan2(m32,m22))*d,yaw:Math.asin(Math.max(-1,Math.min(1,m13)))*d,roll:(Math.abs(m13)<.9999999?Math.atan2(-m12,m11):0)*d};}
