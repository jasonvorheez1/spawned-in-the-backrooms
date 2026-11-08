import {TUNE} from './workbench-settings.js';
// Modal transforms: freeze the selected node and camera basis at G/R/S; one history step on confirm.
export function createShortcuts(T,canvas,camera,orbit,controls,getSelected,events,inspect,draw){
 const doc=canvas.ownerDocument,win=doc.defaultView;
 let modal=null,last=null,eatRelease=false;
 const basis={x:new T.Vector3(1,0,0),y:new T.Vector3(0,1,0),z:new T.Vector3(0,0,1)};
 const writable=()=>events.writable?.()!==false;
 function restore(m){m.node.position.copy(m.p);m.node.quaternion.copy(m.q);m.node.scale.copy(m.s);m.node.updateMatrixWorld(true);}
 function finish(confirm){
  if(!modal)return false;if(confirm&&!modal.valid)return false;const m=modal;modal=null;
  if(!confirm||!writable())restore(m);
  controls.enabled=m.controls;controls.axis=null;orbit.enabled=m.orbit;
  events.inspect(inspect());draw();
  if(confirm&&writable())events.change();else events.status('Transform cancelled · starting pose restored');
  return true;
 }
 function begin(kind){
  if(!writable())return false;if(modal)finish(false);
  const n=getSelected();if(!n){events.status('Select a mesh, joint or component first');return true;}
  if(controls.dragging)return false;
  events.before();n.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
  const rect=canvas.getBoundingClientRect(),cq=camera.getWorldQuaternion(new T.Quaternion()),world=n.getWorldPosition(new T.Vector3());
  modal={kind,node:n,p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone(),world,wq:n.getWorldQuaternion(new T.Quaternion()),parentInverse:n.parent?.matrixWorld.clone().invert()||new T.Matrix4(),parentQ:n.parent?.getWorldQuaternion(new T.Quaternion())||new T.Quaternion(),right:basis.x.clone().applyQuaternion(cq),up:basis.y.clone().applyQuaternion(cq),front:basis.z.clone().applyQuaternion(cq),unit:2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.max(.01,camera.position.distanceTo(world))/Math.max(1,rect.height),anchor:last||{x:rect.left+rect.width/2,y:rect.top+rect.height/2},dx:0,dy:0,text:'',axis:'',exclude:false,local:controls.space==='local',repeat:0,shift:false,ctrl:false,controls:controls.enabled,orbit:orbit.enabled};
  controls.enabled=false;orbit.enabled=false;controls.setMode(kind);apply();return true;
 }
 function axis(m,name){return basis[name].clone().applyQuaternion(m.local?m.wq:new T.Quaternion());}
 function snapped(value,step,m){return m.ctrl||controls.translationSnap!==null?Math.round(value/step)*step:value;}
 function apply(){
  const m=modal;if(!m)return;
  if(!writable()){finish(false);return;}
  restore(m);m.valid=false;const numeric=m.text!==''&&m.text!=='-'&&m.text!=='.'&&m.text!=='-.';
  let value=numeric?Number(m.text):null;if(numeric&&(!Number.isFinite(value)||Math.abs(value)>TUNE.maxValue)){events.status('Enter a finite value smaller than '+TUNE.maxValue);return;}
  const precision=m.shift?TUNE.precision:1,dx=m.dx*precision,dy=m.dy*precision;
  if(m.kind==='translate'){
   let delta=m.right.clone().multiplyScalar(dx*m.unit).addScaledVector(m.up,-dy*m.unit);
   if(m.axis){const a=axis(m,m.axis);if(m.exclude){delta.addScaledVector(a,-delta.dot(a));if(numeric){delta.set(0,0,0);for(const k of ['x','y','z'])if(k!==m.axis)delta.addScaledVector(axis(m,k),value);}}else{const denom=Math.pow(a.dot(m.right),2)+Math.pow(a.dot(m.up),2);const distance=numeric?value:denom>TUNE.axisEpsilon?delta.dot(a)/denom:(dx-dy)*m.unit;delta.copy(a).multiplyScalar(numeric?distance:snapped(distance,TUNE.moveSnap,m));}}
   else if(numeric)delta.copy(m.right).multiplyScalar(value);
   if(!numeric&&(m.ctrl||controls.translationSnap!==null)&&(!m.axis||m.exclude)){const snappedDelta=new T.Vector3();for(const k of ['x','y','z']){const a=axis(m,k);snappedDelta.addScaledVector(a,Math.round(delta.dot(a)/TUNE.moveSnap)*TUNE.moveSnap);}delta=snappedDelta;}
   m.node.position.copy(m.world).add(delta).applyMatrix4(m.parentInverse);value=numeric?value:delta.length();
  }else if(m.kind==='rotate'){
   let angle=numeric?T.MathUtils.degToRad(value):(dx-dy)*TUNE.rotationPerPixel;
   if(!numeric)angle=snapped(angle,T.MathUtils.degToRad(TUNE.rotateSnap),m);
   const a=m.axis?axis(m,m.axis):m.front,q=new T.Quaternion().setFromAxisAngle(a,angle).multiply(m.wq);
   m.node.quaternion.copy(m.parentQ.clone().invert().multiply(q)).normalize();value=T.MathUtils.radToDeg(angle);
  }else{
   let factor=numeric?value:1+(dx-dy)*TUNE.scalePerPixel;if(!numeric)factor=snapped(factor,TUNE.scaleSnap,m);
   if(!Number.isFinite(factor)||factor<TUNE.minScale){events.status('Scale must be at least '+TUNE.minScale+' · mirroring is not supported');return;}
   // Like the existing scale gizmo, per-axis scale acts in the selected node’s own axes (no hidden shear).
   for(const k of ['x','y','z'])if(!m.axis||m.exclude?k!==m.axis||!m.axis:k===m.axis)m.node.scale[k]=m.s[k]*factor;
   value=factor;
  }
  if(m.node.scale.toArray().some(v=>v<=0)||[...m.node.position.toArray(),...m.node.scale.toArray()].some(v=>!Number.isFinite(v)||Math.abs(v)>=TUNE.maxValue)){restore(m);events.status('Transform is outside the asset document limits');return;}
  m.valid=true;m.node.updateMatrixWorld(true);controls.axis=m.axis.toUpperCase()||null;events.inspect(inspect());draw();
  const name={translate:'MOVE',rotate:'ROTATE',scale:'SCALE'}[m.kind],label=m.axis?(m.exclude?'NOT ':'')+m.axis.toUpperCase():'FREE';
  events.status(name+' · '+label+' · '+(m.kind==='scale'||m.local?'LOCAL':'WORLD')+' · '+(m.text||Number(value||0).toFixed(3))+(m.kind==='rotate'?'°':m.kind==='translate'?' m':'×')+' · Enter/click confirm · Esc/right click cancel');
 }
 function key(e){
  const k=e.key.toLowerCase();
  if(modal){
   if(k==='escape'){finish(false);return true;}if(k==='enter'){finish(true);return true;}
   if(e.ctrlKey||e.metaKey){if(k!=='control'&&k!=='shift')return false;}
   if(['x','y','z'].includes(k)){const exclusion=e.shiftKey&&modal.kind!=='rotate';if(modal.axis===k&&modal.exclude===exclusion){modal.repeat++;if(modal.repeat>=2){modal.axis='';modal.repeat=0;}else modal.local=!modal.local;}else{modal.axis=k;modal.exclude=exclusion;modal.repeat=0;modal.local=controls.space==='local';}apply();return true;}
   if(/^[0-9.]$/.test(k)){if(k!=='.'||!modal.text.includes('.'))modal.text+=k;apply();return true;}
   if(k==='-'||k==='+'){modal.text=k==='-'?(modal.text.startsWith('-')?modal.text.slice(1):'-'+modal.text):modal.text.replace(/^-/,'');apply();return true;}
   if(k==='backspace'){modal.text=modal.text.slice(0,-1);apply();return true;}
   if(k==='delete'){modal.text='';apply();return true;}
   if(k==='shift'||k==='control'){modal.shift=e.shiftKey;modal.ctrl=e.ctrlKey;apply();return true;}
   // No unrelated shortcut, page turn or browser scroll while a transform is awaiting a verdict.
   return true;
  }
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&['g','r','s'].includes(k))return begin({g:'translate',r:'rotate',s:'scale'}[k]);
  return false;
 }
 function move(e){if(modal){modal.dx=e.clientX-modal.anchor.x;modal.dy=e.clientY-modal.anchor.y;modal.shift=e.shiftKey;modal.ctrl=e.ctrlKey;apply();}else if(e.target===canvas)last={x:e.clientX,y:e.clientY};}
 function down(e){if(!modal)return;if(e.button===0||e.button===2){e.preventDefault();e.stopImmediatePropagation();finish(e.button===0);eatRelease=true;}}
 function release(e){if(eatRelease){e.preventDefault();e.stopImmediatePropagation();if(e.type==='click'||e.type==='contextmenu')eatRelease=false;}}
 function modifiers(e){if(modal&&(e.key==='Shift'||e.key==='Control')){modal.shift=e.shiftKey;modal.ctrl=e.ctrlKey;apply();}}
 function outside(e){if(modal&&e.target!==canvas&&!finish(true)){e.preventDefault();e.stopImmediatePropagation();}}
 const blur=()=>finish(false),visibility=()=>{if(doc.hidden)finish(false);};
 doc.addEventListener('pointerdown',outside,true);doc.addEventListener('pointermove',move,true);canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointerup',release,true);canvas.addEventListener('click',release,true);canvas.addEventListener('contextmenu',release,true);doc.addEventListener('keyup',modifiers,true);win.addEventListener('blur',blur);doc.addEventListener('visibilitychange',visibility);
 return {key,confirm:()=>finish(true),cancel:()=>finish(false),active:()=>!!modal,dispose(){finish(false);doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointerup',release,true);canvas.removeEventListener('click',release,true);canvas.removeEventListener('contextmenu',release,true);doc.removeEventListener('keyup',modifiers,true);win.removeEventListener('blur',blur);doc.removeEventListener('visibilitychange',visibility);}};
}
