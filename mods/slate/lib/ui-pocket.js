import {tabPosition,tabStyle} from './settings.js';
import {hud as hpHud} from './apps/headphones.js';
import {themed} from './themes.js';
import {unreadCount,LED_CSS,led} from './led.js';
import {SNAP} from './snap.js';
import slatePanel from './ui-panel.js';
// Slate in play mode — editors only. Three modes per player (player.state.slate):
// 'tab' = a slim brass tab tucked at the orb's edge, 'orb' = just a small glowing circle, 'open' = the same full tablet as god mode.
// The orb's spot is world.state.plan.orb {x,y} in screen %, set from the god-mode slate.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const TAGC={feature:'#53d9e5',bug:'#ff9156',polish:'#d9e0d9',balance:'#a37d45',lore:'#b48cff',savinotes:'#f5a8ff'};
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c';
const go=m=>`sendAction('planPocket',{mode:'${m}'})`;
// The pocket draws inside the game's own HUD, outside the mod's panel, so its presses carry the mod's name themselves.
export function pocket(ctx,player){return (String(player?.isEditor?themed(ctx,player,pocketHtml(ctx,player))||'':'')+hpHud(ctx,player)).replace(/sendAction\((['"])plan/g,'sendAction($1slate:plan');}
function pocketHtml(ctx,player){
 if(!player?.isEditor)return '';
 const plan=ctx.world.state.plan||{},orb=plan.orb||{x:3,y:50},mode=player.state.slate||'tab';
 const unread=unreadCount(plan,ctx.world.state.loom,player);
 const cards=plan.cards||[],doing=cards.filter(c=>c.col==='doing'),todo=cards.filter(c=>c.col==='todo'),bugs=cards.filter(c=>c.tag==='bug'&&c.col!=='done').length;
 const right=tabPosition(player,plan).side==='right',tabbed=mode==='tab',pos=tabbed?tabStyle(player,plan):`${right?'right':'left'}:${right?100-orb.x:orb.x}%;top:${orb.y}%;`;
 const css=`${LED_CSS}<style>
  #vws{position:absolute;${pos}transform:translate(${tabbed?'0':right?'50%':'-50%'},-50%);pointer-events:auto;font-family:inherit;z-index:30}
  #vws .orb{position:relative;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#53d9e5,#1b6f7a 60%,#0d2a33);box-shadow:0 0 0 2px #a37d45,0 0 14px #53d9e588;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0d1522;font-size:10px;font-weight:700}
  #vws .tab{transform:${tabbed?'none':`translate(${right?'-50%':'50%'},0)`};width:26px;height:120px;border-radius:${right?'10px 0 0 10px':'0 10px 10px 0'};background:linear-gradient(90deg,#2a2e33,#15181c);box-shadow:0 0 0 2px #a37d45;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
  #vws .tab span{writing-mode:vertical-rl;${right?'':'transform:rotate(180deg);'}font-size:9.5px;letter-spacing:.24em;color:#c9a56a}
  #vws .pad{transform:translate(${right?'-50%':'50%'},0);width:270px;max-height:min(470px,80vh);display:flex;flex-direction:column;background:linear-gradient(160deg,#2a2e33,#15181c);border-radius:22px;padding:10px 10px 8px;box-shadow:0 0 0 2px #a37d45,0 0 0 4px #111b2c,0 20px 50px #0009;color:${ink};font-size:12px}
  #vws .nav{display:flex;gap:3px;margin:0 2px 6px}#vws .nav button{flex:1;background:transparent;border:none;border-bottom:2px solid transparent;color:${dim};font-size:9px;letter-spacing:.12em;padding:4px 0;cursor:pointer}#vws .nav button.on{color:#f3ead7;border-bottom-color:#a37d45}
  #vws .scr{flex:1;overflow:auto;background:#0d1522;border-radius:10px;padding:9px}
  #vws .h{font-size:9.5px;letter-spacing:.18em;color:#bdc7c7;margin:8px 0 4px}
  #vws .c{border-left:3px solid;background:#16233a;padding:5px 6px;margin:4px 0;display:flex;gap:5px;align-items:center}
  #vws input,#vws textarea,#vws select{background:#111b2c;border:1px solid ${line};color:${ink};font-size:11.5px;padding:5px}
  #vws button.s{background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;font-size:10px;padding:2px 6px}
 #vws .tab{width:44px;padding:0;border:0;background:none;box-shadow:none;position:relative;isolation:isolate}#vws .tab:before{content:'';position:absolute;inset:0 ${right?'0 0 18px':'18px 0 0'};background:linear-gradient(90deg,#2a2e33,#15181c);border:1px solid #a37d45;border-radius:6px;z-index:-1}#vws .tab{padding-${right?'left':'right'}:18px;box-sizing:border-box}#vws button:focus-visible{outline:2px solid #53d9e5}#vws-gt{max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 70px)}#vws-gt button{min-height:44px}
 </style>`;
 const camSvg=c=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><path d="M4 7h3l2-2.5h6L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.6"/></svg>`;
 const cam=tabbed?`<button aria-label="Take snapshot" class="tab snap" title="snapshot: saves this frame to the gallery, a toast offers the ticket" onclick="${SNAP}" style="height:44px;gap:0">${camSvg('#c9a56a')}</button>`:`<button class="s" title="snapshot: saves this frame to the gallery, a toast offers the ticket" onclick="${SNAP}" style="border-radius:50%;width:28px;height:28px;padding:0;background:linear-gradient(90deg,#2a2e33,#15181c);border:none;box-shadow:0 0 0 2px #a37d45;display:flex;align-items:center;justify-content:center;line-height:0;cursor:pointer">${camSvg('#c9a56a')}</button>`;
 const fl=player.state.slateFiled,fc=fl&&(ctx.now?.()??0)-fl.at<5000&&cards.find(c=>c.id===fl.id);
 const draft=mode==='open'&&player.state.slateDraft&&cards.find(c=>c.id===player.state.slateDraft);
 const gt=player.state.slateToast,gs=gt&&(ctx.now?.()??0)-gt.at<9000&&(plan.shots||[]).find(x=>x.id===gt.id&&!x.card);
 const galToast=gs&&!draft?`<div id="vws-gt" style="position:absolute;${right?'right':'left'}:${tabbed?34:40}px;top:0;width:176px;background:#15181c;box-shadow:0 0 0 2px #a37d45,0 8px 20px #0008;border-radius:9px;padding:6px;animation:vwsPop .35s cubic-bezier(.2,1.6,.4,1),vwsOut .6s ease-in 8.2s forwards;transform-origin:${right?'right':'left'} top"><img src="${esc(gs.url)}" style="width:100%;border-radius:5px;display:block"><div style="font-size:9.5px;letter-spacing:.14em;color:#53d9e5;margin:5px 0 4px">✓ SAVED TO GALLERY</div><button class="s" style="width:100%;padding:5px;background:#a37d45;color:#111b2c;border-color:#a37d45;font-weight:700;letter-spacing:.1em;margin-bottom:3px" onclick="sendAction('planGal',{op:'ticket',id:'${gs.id}',pocket:1});event.stopPropagation()">+ MAKE TICKET</button><div style="display:flex;gap:3px"><button class="s" style="flex:1;padding:4px;color:#ffd79a;border-color:#a37d45" title="Savi looks at it and writes the ticket" onclick="sendAction('planGal',{op:'savi',id:'${gs.id}'});event.stopPropagation()">✦ savi</button><button class="s" style="flex:1;padding:4px" title="sort it later in the gallery" onclick="sendAction('planGal',{op:'dismiss'});document.getElementById('vws-gt').remove();event.stopPropagation()">later</button></div></div><style>@keyframes vwsPop{from{opacity:0;transform:scale(.6) translateY(14px)}}@keyframes vwsOut{to{opacity:0;transform:translateX(${right?'':'-'}14px);visibility:hidden}}</style>`:'';
 const nSort=(plan.shots||[]).filter(x=>!x.card&&!x.loom&&!x.kept).length;
 const toast0=fc&&!draft?`<div style="position:absolute;${right?'right':'left'}:${tabbed?34:40}px;top:0;width:150px;background:#15181c;box-shadow:0 0 0 2px #a37d45,0 8px 20px #0008;border-radius:8px;padding:5px;animation:vwsIn .25s ease-out"><img src="${esc(fc.shot)}" style="width:100%;border-radius:4px;display:block"><div style="font-size:9.5px;letter-spacing:.14em;color:#53d9e5;margin-top:4px">✓ FILED TO BOARD</div><div style="font-size:10.5px;color:${ink}">${esc(fc.t)}</div></div><style>@keyframes vwsIn{from{opacity:0;transform:translateX(${right?'':'-'}10px)}}</style>`:'';
 const toast=galToast||toast0;
 if(mode==='orb')return css+`<div id="vws" style="display:flex;flex-direction:column;align-items:center;gap:5px"><div class="orb" title="Slate · ${bugs} open bugs" onclick="${go('open')}">${doing.length||''}<span style="position:absolute;right:-3px;top:-3px">${led(unread,player)}</span></div>${cam}${nSort?`<div title="photos to sort in the gallery" style="font-size:9px;color:#ffd79a">${nSort}▤</div>`:''}${toast}</div>`;
 if(mode==='tab')return css+`<div id="vws"><button aria-label="Open Slate" class="tab" title="Slate" onclick="${go('open')}">${led(unread,player)}<span>SLATE · ${doing.length}</span></button><div style="margin-top:6px">${cam}</div>${nSort?`<div title="photos to sort in the gallery" style="width:26px;text-align:center;font-size:9px;color:#ffd79a;margin-top:3px">${nSort}▤</div>`:''}${toast}</div>`;
 return slatePanel(ctx,player,{play:true});
}
