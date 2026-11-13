// The Wisp guide (Slate's advisor): its state and ops. Drawn by lib/ui-guide.js. Not in the Store: it is part of Slate.
// player.state.slateGuide = { toured, step, open }  · toured: the first-open tour is done (or skipped) · step: tour step · open: the bubble is up
// Ops (sendAction('planApp',{id:'guide',op})): tap · close · next · back · skip · done · replay. next/back/replay move plan.tab to the step's app and return true.
import {kilnLoad} from '../kiln.js';
export const APP={id:'guide',name:'GUIDE',glyph:'✺',color:'#5dada9',sub:'your wisp explains Slate',about:'',core:true};
// the tour: where each step stands (tab + Studio sub-tab). Text lives in ui-guide.js beside the screen guide.
export const TOUR=[{tab:'home'},{tab:'home'},{tab:'game',studio:'active'},{tab:'diary'},{tab:'board'},{tab:'kiln'},{tab:'addons',studio:'tools'}];
const G=p=>({...(p?.state?.slateGuide||{})});
function go(ctx,p,plan,i){const s=TOUR[i];if(!s)return false;plan.tab=s.tab;if(s.studio)p.state.studioTab=s.studio;p.state.planOpen=null;
 if(s.tab==='addons')p.state.slateAddon=null;if(s.tab==='kiln'){try{kilnLoad(ctx);}catch(e){}}return true;}
export function page(){return `<div style="padding:18px;color:#d9e0d9;font-size:13px;line-height:1.6;max-width:520px">Your wisp lives in the bottom-left corner of every Slate screen. Tap it and it tells you what the screen in front of you does.
 <div style="margin-top:12px"><button onclick="sendAction('planApp',{id:'guide',op:'replay'})" style="background:#1a2b3d;border:1px solid #a37d45;color:#d9e0d9;padding:7px 12px;cursor:pointer;font:600 11px ui-monospace,monospace;letter-spacing:.14em">REPLAY THE TOUR</button></div></div>`;}
export function op(ctx,p,d,plan){
 if(!p?.state)return false;const g=G(p),o=String(d?.op||''),n=TOUR.length;
 if(o==='tap'){if(!g.toured){p.state.slateGuide={...g,open:true,hop:(g.hop||0)+1};return false;}p.state.slateGuide={...g,open:!g.open,hop:(g.hop||0)+1};return false;}
 if(o==='close'){p.state.slateGuide={...g,open:false};return false;}
 if(o==='skip'||o==='done'){p.state.slateGuide={...g,toured:true,open:false,step:0};return false;}
 if(o==='replay'){p.state.slateGuide={...g,toured:false,open:true,step:0,hop:(g.hop||0)+1};return go(ctx,p,plan,0);}
 // a press names the step it was pressed on; a second copy of it (body + god seat, a slow tick) finds the tour already moved and does nothing
 if((o==='next'||o==='back')&&d?.from!=null&&(d.from|0)!==(g.step|0))return false;
 if(o==='next'||o==='back'){const i=Math.max(0,Math.min(n-1,(g.step|0)+(o==='next'?1:-1)));
  if(o==='next'&&(g.step|0)>=n-1){p.state.slateGuide={...g,toured:true,open:false,step:0};return false;}
  p.state.slateGuide={...g,step:i,open:true,hop:(g.hop||0)+1};return go(ctx,p,plan,i);}
 return false;
}
