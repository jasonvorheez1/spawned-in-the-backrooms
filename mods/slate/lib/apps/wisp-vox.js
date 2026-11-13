// A real 3D voxel wisp for Slate: a teardrop flame of cubes drawn on a canvas, lit per face, flickering at the tip,
// with the in-game wisp's face (two eyes, a smile, cheeks), a slow sway and drag-to-spin. Colour and shape are the
// player's own wisp (player.wisps, Spawn's). One loop per page, rebinding to whatever canvas carries id wp-cv.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const JS=`(function(){if(window.__wpV)return;window.__wpV=1;
var hex=function(h){h=String(h||'#5dada9').replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c}).join('');var n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]};
var mix=function(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
var rgb=function(c,k){return 'rgb('+Math.min(255,c[0]*k|0)+','+Math.min(255,c[1]*k|0)+','+Math.min(255,c[2]*k|0)+')'};
var key='',vox=[],eyes=[],yawD=0,drag=null,spinV=0,t0=performance.now();
function build(shape,seed){vox=[];var H=shape==='slender'?19:16,R=shape==='slender'?2.8:3.8,cols=[0];if(shape==='twin'){cols=[1.6,-3.2]}
 cols.forEach(function(ox,ci){var h=ci?H*.7|0:H,r=ci?R*.72:R;
  for(var y=0;y<h;y++){var t=y/(h-1),rad=r*(t<.3?Math.sqrt(1-Math.pow((.3-t)/.3,2))*.95+.05:Math.pow(1-(t-.3)/.7,1.6));var lean=Math.pow(t,2)*1.4*(ci?-1:1);
   for(var x=-6;x<=6;x++)for(var z=-6;z<=6;z++){var dx=x-lean*.6,d=Math.sqrt(dx*dx+z*z);if(d<=rad+.25){vox.push({x:x+ox,y:y,z:z,t:t,d:d/(rad+.3),tip:t>.62,ph:(x*7.1+z*3.7+y*1.3+seed)%6.28})}}}});
 var s={};vox.forEach(function(v){s[v.x+','+v.y+','+v.z]=1});
 vox=vox.filter(function(v){return !(s[(v.x+1)+','+v.y+','+v.z]&&s[(v.x-1)+','+v.y+','+v.z]&&s[v.x+','+(v.y+1)+','+v.z]&&s[v.x+','+(v.y-1)+','+v.z]&&s[v.x+','+v.y+','+(v.z+1)]&&s[v.x+','+v.y+','+(v.z-1)])});
 var front=function(x,y){var best=null;vox.forEach(function(v){if(v.x===x&&v.y===y&&(best===null||v.z>best))best=v.z});return best};
 var ey=Math.round((shape==='slender'?19:16)*.3),ex=shape==='twin'?2:0;eyes=[];
 [[ex-1,ey,1],[ex+1,ey,1],[ex-1,ey+1,1],[ex+1,ey+1,1],[ex,ey-2,2],[ex-1,ey-1,2],[ex+1,ey-1,2],[ex-2,ey-1,3],[ex+2,ey-1,3]].forEach(function(e){var z=front(e[0],e[1]);if(z!==null)eyes.push({x:e[0],y:e[1],z:z+.52,k:e[2]})});}
function frame(now){var cv=document.getElementById('wp-cv');if(!cv){requestAnimationFrame(frame);return}
 var col=cv.dataset.col,shape=cv.dataset.shape||'classic',mood=cv.dataset.mood||'content',k2=col+shape;if(k2!==key){key=k2;build(shape,3)}
 if(!cv.__b){cv.__b=1;cv.onpointerdown=function(e){drag={x:e.clientX,y:yawD,t:now};cv.style.cursor='grabbing';try{cv.setPointerCapture(e.pointerId)}catch(_){}};cv.onpointermove=function(e){if(drag){var ny=drag.y+(e.clientX-drag.x)*.9;spinV=(ny-yawD)*.6;yawD=ny}};cv.onpointerup=cv.onpointercancel=function(){drag=null;cv.style.cursor='grab'}}
 var g=cv.getContext('2d'),W=cv.width,Hc=cv.height,t=(now-t0)/1000,base=hex(col),hot=mix(base,[255,250,225],.55),deep=mix(base,[40,10,30],.35),sleepy=mood==='sleepy';
 if(!drag){spinV*=.94;yawD+=spinV;var home=Math.sin(t*.55)*28;yawD+=(home-((yawD%360+540)%360-180))*.02*(Math.abs(spinV)<.4?1:0)}
 var a=yawD*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),pitch=.42,cp=Math.cos(pitch),sp=Math.sin(pitch),S=W/14,bob=Math.sin(t*1.7)*S*.25,cx=W/2,cy=Hc*.83+bob;
 var P=function(x,y,z){var rx=x*ca+z*sa,rz=-x*sa+z*ca;return [cx+rx*S,cy-(y*cp-rz*sp)*S,rz*cp+y*sp]};
 g.clearRect(0,0,W,Hc);var gl=g.createRadialGradient(cx,cy-S*7,S,cx,cy-S*7,S*11);gl.addColorStop(0,rgb(base,1).replace('rgb','rgba').replace(')',',.38)'));gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(0,0,W,Hc);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,Hc*.83+S*.6,S*3.6,S*1.1,0,0,6.28);g.fill();
 var L=[.35,.8,.48],faces=[[[0,1,0],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]]],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[0,0,-1],[[0,0,0],[1,0,0],[1,1,0],[0,1,0]]],[[1,0,0],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]]];
 var list=[],fl=sleepy?.5:1;vox.forEach(function(v){var off=0,sc=1;if(v.tip){off=Math.sin(t*6*fl+v.ph)*.35*v.t;sc=.8+.2*Math.sin(t*9*fl+v.ph*2);if(Math.sin(t*4.3+v.ph*3)>.86&&v.t>.85)return}
  var c=mix(mix(hot,base,Math.min(1,v.d*1.1)),deep,Math.max(0,v.t-.7)*1.4),x=v.x-.5+off*.6,y=v.y,z=v.z-.5;var ctr=P(v.x,v.y+.5,v.z);list.push({v:v,c:c,x:x,y:y,z:z,s:sc,dz:ctr[2]})});
 list.sort(function(p,q){return p.dz-q.dz});
 list.forEach(function(it){faces.forEach(function(f){var n=f[0],nx=n[0]*ca+n[2]*sa,nz=-n[0]*sa+n[2]*ca,ny=n[1];var vz=nz*cp+ny*sp;if(vz<=0.02)return;var lit=.62+.5*Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]);g.fillStyle=rgb(it.c,lit*(sleepy?.8:1)*(1.05+.08*Math.sin(t*3+it.v.ph)));g.beginPath();f[1].forEach(function(q,i){var o=(1-it.s)/2,p=P(it.x+o+q[0]*it.s,it.y+o+q[1]*it.s,it.z+o+q[2]*it.s);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.closePath();g.fill()})});
 var blink=(t%4.2)<.13||sleepy;eyes.forEach(function(e){var fz=Math.sin(a)*0,p=P(e.x,e.y+.5,e.z),vis=(-Math.sin(a)*0+Math.cos(a))>.15;if(!vis)return;var s=S*.92*Math.max(.4,Math.cos(a));
  if(e.k===1){g.fillStyle='#2a1208';g.fillRect(p[0]-s*.45,p[1]-(blink?s*.12:s*.5),s*.9,blink?s*.24:s*.95);if(!blink&&e.y%2){g.fillStyle='#fff';g.fillRect(p[0]-s*.3,p[1]-s*.45,s*.32,s*.32)}}
  else if(e.k===2){if(mood!=='sulking'||e.y===Math.round((shape==='slender'?19:16)*.3)-2){g.fillStyle='#2a1208';g.fillRect(p[0]-s*.3,p[1]-s*.3,s*.6,s*.5)}}
  else{g.fillStyle='rgba(255,120,150,.55)';g.fillRect(p[0]-s*.5,p[1]-s*.2,s,s*.4)}});
 for(var i=0;i<7;i++){var lt=(t*.45+i/7)%1,ex=Math.sin(i*2.1+t)*S*2.2,pp=P(0,0,0);g.fillStyle=rgb(hot,1).replace('rgb','rgba').replace(')',','+(1-lt).toFixed(2)+')');var es=S*.32*(1-lt*.6);g.fillRect(cx+ex-es/2,cy-S*(12+lt*6)-es/2,es,es)}
 requestAnimationFrame(frame)}requestAnimationFrame(frame)})()`;
export function voxHtml(w,m,H=210){
 const shape=['slender','twin'].includes(w?.shape)?w.shape:'classic';
 return `<canvas id="wp-cv" class="wp-cv" width="${Math.round(H*.95)}" height="${H}" data-col="${esc(w?.color||'#5dada9')}" data-shape="${shape}" data-mood="${esc(m||'content')}" title="drag to spin ${esc(w?.name||'your wisp')}" style="cursor:grab;touch-action:none;position:relative;z-index:1"></canvas><img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:none" onload="${esc(JS)}">`;
}
