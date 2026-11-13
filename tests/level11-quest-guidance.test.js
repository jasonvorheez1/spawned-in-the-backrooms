import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null }))
const { QUESTS } = await import('../scripts/lib/level11-quests.js')
const { ears } = await import('../scripts/level11-use.js')
test('journal directs the player to the remaining city objective', () => {
  expect(QUESTS.sedco.progress({ sedcoQ:2, sedcoCounterChecked:true }).mark.id).toBe('l11-sedco-int-monitors')
  expect(QUESTS.sedco.progress({ sedcoQ:2, sedcoMonitorsChecked:true }).mark.id).toBe('l11-sedco-int-counter')
  expect(QUESTS.maint.progress({ maintQ:3, aptTapTested:true }).mark.id).toBe('l11-apt-radio')
  expect(QUESTS.maint.progress({ maintQ:3, aptRadioTested:true }).mark.id).toBe('l11-apt-sink')
})
test('the boiler quest accepts 104.2, not another radio station', () => {
  const player = { id:'p', state:{ maintQ:3, aptTapTested:true } }
  const radio = { state:{ kind:'apt-radio', stationIdx:0 }, feetPosition:{x:0,y:0,z:0} }
  const ctx = { self:radio, now:()=>1000, getObject:()=>player, emit:()=>{}, place:{players:[]} }
  ears.press(ctx, {by:'p'}); expect(player.state.aptRadioTested).toBeUndefined(); expect(player.state.maintQ).toBe(3)
  ears.press(ctx, {by:'p'}); expect(player.state.maintQ).toBe(3)
  ears.press(ctx, {by:'p'}); expect(player.state.aptRadioTested).toBe(true); expect(player.state.maintQ).toBe(4)
})
