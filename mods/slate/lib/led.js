import {unseen} from './seen.js';
export const SOURCES={board:'Planner tickets',diary:'Loom pages & notes',crowd:'Player notes',gallery:'Gallery: photos & artwork'};
const color=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
export function ledPrefs(p){const s=p?.state?.slateLed||{};return {enabled:s.enabled!==false,pulse:s.pulse!==false,idle:color(s.idle,'#53d9e5'),alert:color(s.alert,'#ffb454'),sources:Object.keys(SOURCES).filter(a=>!Array.isArray(s.sources)||s.sources.includes(a))};}
export function ledOp(p,d){const s=ledPrefs(p);if(d.reset){delete p.state.slateLed;return;}
 if(['idle','alert'].includes(d.key)&&/^#[0-9a-f]{6}$/i.test(d.value||''))s[d.key]=d.value;
 if(['enabled','pulse'].includes(d.key)&&typeof d.value==='boolean')s[d.key]=d.value;
 if(d.key==='source'&&d.source in SOURCES){const a=new Set(s.sources);d.value===true?a.add(d.source):a.delete(d.source);s.sources=[...a];}
 p.state.slateLed=s;
}
export const unreadCount=(plan,loom,p)=>{const s=ledPrefs(p);return s.enabled?s.sources.reduce((n,a)=>n+unseen(a,plan,loom,p),0)+(p?.state?.slateWTNew?1:0):0;};
export const LED_CSS=`<style>
.sl-notification-led{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:var(--sl-idle,#53d9e5);box-shadow:0 0 6px var(--sl-idle,#53d9e5)}
.sl-notification-led.unread{background:var(--sl-alert,#ffb454);box-shadow:0 0 8px var(--sl-alert,#ffb454)}
.sl-notification-led.pulse{animation:sl-led-pulse 2.4s ease-in-out infinite}
@keyframes sl-led-pulse{0%,100%{opacity:1;box-shadow:0 0 8px var(--sl-alert,#ffb454)}50%{opacity:.3;box-shadow:0 0 2px var(--sl-alert,#ffb454)}}
@media(prefers-reduced-motion:reduce){.sl-notification-led.pulse{animation:none}}
</style>`;
export function led(n,p){const s=ledPrefs(p),active=s.enabled&&n>0,text=!s.enabled?'notification light off':active?n+' unread items from selected apps':'no unread items from selected apps';return `<span class="sl-notification-led${active?' unread':''}${active&&s.pulse?' pulse':''}" style="--sl-idle:${s.idle};--sl-alert:${s.alert}" title="${text}" aria-label="${text}"></span>`;}
