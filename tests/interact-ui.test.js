import{test,expect}from'bun:test'
import{lootUi}from'../scripts/loot-ui.js'
const ctx={world:{inputs:{actions:{interact:{label:'E'}}}},now:()=>1000}
const show=(focus,extra={})=>lootUi(ctx,{place:'main',state:{level:1,focus,...extra}})
test('interaction prompt separates the action, target and useful details',()=>{
 const html=show({id:'npc/kade',verb:'Talk',name:'Kade',info:'B.N.T.G.'})
 expect(html).toContain('class="interact-verb">Talk');expect(html).toContain('class="interact-name">Kade');expect(html).toContain('B.N.T.G.');expect(html).toContain("sendAction('interact')")
 expect(html).toContain('aria-label="Talk Kade"');expect(html).toContain('id="interaction-npc%2Fkade"')
 const door=show({id:'door',verb:'Open',name:'Service door',info:'shut'});expect(door).not.toContain('class="interact-info">shut')
})
test('unavailable prompts retain their reason and plain-text names cannot inject HTML',()=>{
 const html=show({id:'lock',verb:'Locked:',name:'<img onerror=bad>',info:'Lockpick 40',color:'red;display:none'})
 expect(html).toContain('is-blocked');expect(html).toContain('>Locked</span>');expect(html).toContain('Lockpick 40');expect(html).toContain('&lt;img onerror=bad&gt;');expect(html).not.toContain('style="--hint:red;')
})
test('interaction prompts stay hidden behind other screens and respect remapped keys',()=>{
 const focus={id:'bench',verb:'Use',name:'Workbench'}
 for(const extra of [{invOpen:true},{craftOpen:'hand'},{sheetOpen:true},{jrnOpen:true},{talkWith:'npc'},{menuOpen:true}])expect(show(focus,extra)).not.toContain('id="lp"')
 const remapped={world:{inputs:{actions:{interact:{label:'F'}}}},now:()=>1000};expect(lootUi(remapped,{place:'main',state:{level:1,focus}})).toContain('>F</button>')
})
