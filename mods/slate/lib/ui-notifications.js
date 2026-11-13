import {ledPrefs,SOURCES,LED_CSS,led} from './led.js';
export function notificationSettings(p){const s=ledPrefs(p);
 const check=(label,key,value,extra='')=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px;cursor:pointer"><input type="checkbox" ${value?'checked':''} onchange="sendAction('planLoom',{op:'ledConfig',key:'${key}',value:this.checked${extra}})" style="accent-color:#a37d45">${label}</label>`;
 const pick=(label,key)=>`<label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="color" aria-label="${label}" value="${s[key]}" onchange="sendAction('planLoom',{op:'ledConfig',key:'${key}',value:this.value})" style="width:36px;height:28px;background:none;border:1px solid #2c3b4c;padding:2px;cursor:pointer">${label}</label>`;
 return `${LED_CSS}<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin:4px 0 12px;font-size:11px"><span>${led(0,p)} idle</span><span>${led(1,p)} unread preview</span></div>
 ${check('Notification light','enabled',s.enabled)}${check('Pulse when unread','pulse',s.pulse)}
 <div style="display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 14px">${pick('Idle colour','idle')}${pick('Unread colour','alert')}</div>
 <div style="font-size:10px;letter-spacing:.12em;color:#c9a56a;margin-bottom:4px">LIGHT UP FOR NEW ITEMS IN</div>
 ${Object.entries(SOURCES).map(([key,label])=>check(label,'source',s.sources.includes(key),`,source:'${key}'`)).join('')}
 <p style="font-size:11px;color:#8a9aa0;line-height:1.5">Just for you, in god mode and play mode. These switches only change the LED, not app badges. Open the relevant app or mark all read to clear it. Existing totals and photos waiting to be sorted don’t keep it blinking. Reduced-motion settings stop the pulse.</p>
 <button onclick="sendAction('planLoom',{op:'ledConfig',reset:true})" style="background:#1a2b3d;border:1px solid #2c3b4c;color:#d9e0d9;padding:4px 8px;cursor:pointer;font-size:11px">reset light settings</button>`;
}
