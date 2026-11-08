import {CURSOR} from './data/arrangement-preview.js';
export function followLeft(left,width,total,x){const visible=Math.max(1,width-CURSOR.labelWidth),max=Math.max(0,total-width);if(x<left||x>left+visible*CURSOR.followEdge)return Math.max(0,Math.min(max,x-visible*CURSOR.followAnchor));return left;}
export function createFollower(getView){let held=false,until=0,moves=0;const now=()=>performance.now(),inside=e=>getView()?.contains(e.target);
 const down=e=>{if(inside(e)){held=true;until=now()+CURSOR.followRestMs;}},up=()=>{if(held){held=false;until=now()+CURSOR.followRestMs;}},wheel=e=>{if(inside(e))until=now()+CURSOR.followRestMs;};
 document.addEventListener('pointerdown',down,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);document.addEventListener('wheel',wheel,{capture:true,passive:true});
 return {step(x,time=now()){const v=getView();if(!v||held||time<until||v.clientWidth<=CURSOR.labelWidth)return;const next=followLeft(v.scrollLeft,v.clientWidth,v.scrollWidth,x);if(Math.abs(next-v.scrollLeft)>.5){v.scrollLeft=next;moves++;}},reset(){held=false;until=0;},measure:()=>({moves,held}),dispose(){document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',up,true);document.removeEventListener('wheel',wheel,true);}};
}
