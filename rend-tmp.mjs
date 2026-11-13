import { chromium } from 'playwright';
import { talkUi } from '/workspace/world/scripts/talk-ui.js';
const it={id:'l5-beast',tags:['npc'],state:{name:'The Gentleman · Proprietor',role:'proprietor',factionName:'Homely Hotel'}};
const player={id:'p',userId:'u',state:{talkWith:'l5-beast',talkChoices:[{text:"You mentioned a deal.",tag:"Quest Start"},{text:"[Shake his hand] It's a deal.",tag:"Quest"},{text:"I heard the last one's tape. The contract's void.",check:{skill:"speech",difficulty:55},tag:"speech"},{text:"Why should I trust you?",tag:"Ask"},{text:"Goodbye."}],talks:{'l5-beast':[['p','Who are you?'],['n',"Ah, you're here! I was expecting you. I hope I didn't startle you too badly. I'd just like a little talk between the two of us, on business terms, of course."]]}}};
const html=talkUi({place:{objects:{'l5-beast':it}},getObject:()=>it,self:player},player);
const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1280,height:720}});
await pg.setContent(`<html><body style="margin:0;background:url(https://www.spawn.co/cdn/image-u3po54osw.webp) center/cover #333;height:720px">${html}</body></html>`);
await pg.waitForTimeout(600); await pg.hover('.tc-choice:nth-child(2)'); await pg.screenshot({path:'/workspace/r.png'}); await b.close();
