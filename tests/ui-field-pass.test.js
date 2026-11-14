import {test,expect}from'bun:test'
import{talkUi}from'../scripts/talk-ui.js'
import{quickBar}from'../scripts/lib/hud-quickbar.js'
const base={level:5,hp:100,attr:'5,5,5,5,5,5,5',skl:'30,30,30,30,30,30,30,30,30,30,30,30,30',cents:0,equipped:'fists',weapons:'',look:{species:'human',sex:'f'}}
function dialogue(patch={},npcPatch={}){
 const npc={id:'npc/kade',tags:['npc'],state:{name:'Kade',role:'survivor',factionName:'The B.N.T.G.',rapport:{tester:8},...npcPatch}},s={...base,talkWith:npc.id,talks:{kade:[['p','The drive is intact.'],['x','Speech check SUCCEEDED'],['n','Good. Keep the card.']]},talkChoices:[{text:'What next?',tag:'reply'}],...patch},player={id:'tester',userId:'tester',state:s,place:'main'},ctx={self:player,place:{id:'main',objects:{[npc.id]:npc}},getObject:id=>id===npc.id?npc:null};return talkUi(ctx,player)
}
test('dialogue prioritizes current speech cleanly without cluttered headers or extra drawers',()=>{
 const html=dialogue();expect(html).toContain('Good. Keep the card.');expect(html).toContain('tc-check-current');expect(html).toContain('Speech check SUCCEEDED');expect(html).not.toContain('tc-hdr');expect(html).not.toContain('tc-inquiry');expect(html).not.toContain('tc-you');expect(html).not.toContain('(+8)');expect(html).not.toContain('Dance');expect(html).not.toContain('tc-ch-tag tc-tag-lore">reply')
 const nextTurn=dialogue({talks:{kade:[['p','First'],['x','SUCCEEDED'],['n','First answer'],['p','Next'],['n','Next answer']]}});expect(nextTurn).not.toContain('tc-check-current')
})
test('busy dialogue prevents duplicate choice submission while keeping Leave available',()=>{
 const html=dialogue({talkBusy:true});expect(html).toContain('Waiting for a response');expect(html).toContain('class="tc-choice" data-interactive disabled');expect(html).toContain('aria-label="Leave conversation"')
})
test('dialogue escapes remote text and preserves skill check payloads',()=>{
 const html=dialogue({talks:{kade:[['p','ok'],['x','<script>FAILED</script>'],['n','<img src=x onerror=alert(1)>']]},talkChoices:[{text:'"<hello>"',check:{skill:'speech',difficulty:35}}]});expect(html).toContain('&lt;img');expect(html).toContain('&lt;script&gt;FAILED');expect(html).not.toContain('<img');expect(html).toContain("check:{skill:'speech',difficulty:35}")
})
test('shop tabs announce their selection and unavailable purchases are disabled',()=>{
 const html=dialogue({shopOpen:'npc/kade'},{role:'trader',stock:{almond:[2,3]}});expect(html).toContain('class="is-active" aria-pressed="true"');expect(html).toContain('buy-c" disabled');expect(html).toContain("sendAction('shop',{k:'buy',t:'almond'})")
})
test('HUD quick slots use valid numeric keys, escape labels and retain unavailable bindings',()=>{
 const html=quickBar({quickSlots:{0:'coat',2:'med',1:'gun',evil:'gun'}},[{id:'coat',name:'Coat',count:1},{id:'med',name:'<img> "Aid"',count:3},{id:'gun',name:'Pistol',count:0}]);expect(html.indexOf('slot:1')).toBeLessThan(html.indexOf('slot:2'));expect(html.indexOf('slot:2')).toBeLessThan(html.indexOf('slot:0'));expect(html).toContain('· unavailable');expect(html).toContain('disabled');expect(html).toContain('&lt;img&gt; &quot;Aid&quot;');expect(html).not.toContain('<img>');expect(html).not.toContain('NaN');expect(html.match(/class="hud-quick-slot"/g)).toHaveLength(3)
})
