const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c';
const sub='font-size:10px;letter-spacing:.16em;color:#bdc7c7';
const btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:3px 7px;font-size:11px`;
export function environmentView(ctx){
 const pl=ctx.world.places&&ctx.world.places[ctx.place?.id||'main'],a=(pl&&pl.atmosphere)||{};
 const row=(key,label,v,min,max,step,fmt)=>`<div style="display:flex;align-items:center;gap:10px;margin:10px 0">
  <div style="width:110px;${sub}">${label}</div>
  <input type="range" min="${min}" max="${max}" step="${step}" value="${v}" style="flex:1;accent-color:#53d9e5" oninput="this.nextElementSibling.textContent=${fmt}" onchange="sendAction('planWorld',{key:'${key}',value:+this.value})">
  <div style="width:60px;text-align:right;color:${ink};font-size:12px">${''}</div></div>`;
 const hh="(function(v){v=+v;var h=Math.floor(v),m=Math.round((v-h)*60);return (h<10?'0':'')+h+':'+(m<10?'0':'')+m})(this.value)";
 const hour=a.timeOfDay??12,fog=a.fog||{},wind=a.wind||{};
 const r=row('hour','TIME OF DAY',hour,0,24,0.1,hh).replace("${''}","").replace('></div></div>','>'+String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.round((hour%1)*60)).padStart(2,'0')+'</div></div>');
 const mk=(key,label,v,min,max,step,unit)=>row(key,label,v,min,max,step,"this.value+'"+unit+"'").replace('></div></div>','>'+v+unit+'</div></div>');
 return `<div style="${sub};margin-bottom:4px">${esc(String(ctx.place?.id||'this place').toUpperCase())} · LIVE</div>
  <div style="color:${dim};font-size:11px;margin-bottom:6px">drag a slider and this place changes for everyone in this room. KEEP makes it this place's default in a saved version.</div>
  <div style="border:1px solid ${line};background:#16233a;padding:4px 12px">
   ${r}
   ${mk('fogNear','FOG STARTS',fog.near??220,0,2000,10,' m')}
   ${mk('fogFar','FOG ENDS',fog.far??1200,100,4000,10,' m')}
   ${mk('wind','WIND',wind.speed??0,0,30,0.5,' m/s')}
  </div>
  <div style="display:flex;gap:8px;margin-top:10px">
   <button style="${btn};color:#53d9e5" onclick="sendAction('planWorld',{key:'keepAll',keep:true});this.textContent='kept ✓'">✓ KEEP AS DEFAULT</button>
   <button style="${btn}" onclick="sendAction('planWorld',{key:'reset'})">↺ back to saved</button>
  </div>`;
}
