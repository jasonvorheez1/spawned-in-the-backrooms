// Run with bun art/human-cloth/wardrobe-check.mjs.
import assert from 'node:assert/strict'
import W from '../../scripts/lib/data/wardrobe.yml'
import { humanBody, humanMorph, lookFromModel } from '../../scripts/lib/critter-model.js'

// Scene-laid characters may have no saved wear state when a new body arrives.
for (const legacy of [W.legacyHuman, W.legacyFur]) {
  for (const [sex, id] of Object.entries(legacy)) {
    const look = lookFromModel({ id, parts: { Ward_boots: { visible: true } } })
    assert.equal(look.sex, sex.startsWith('f') ? 'f' : 'm')
    assert.equal(look.shoes, 'boots')
  }
}
console.log('PASS: legacy wardrobe bodies retain sex and equipped footwear')
const dressed = humanBody({ sex: 'f', topw: 'jacket', botw: 'skirt' })
assert.equal(dressed.parts.Under_top.visible, false)
assert.equal(dressed.parts.Under_bottom.visible, false)
const bare = humanBody({ sex: 'f', topw: 'none', botw: 'none' })
assert.equal(bare.parts.Under_top.visible, true)
assert.equal(bare.parts.Under_bottom.visible, true)
for (const bust of [.15, .5, 1]) assert.equal(humanMorph({ sex: 'f', bust }).Bust, bust)
for (const input of [{ bust: 'invalid' }, { bustS: Infinity }]) assert.equal(humanMorph({ sex: 'f', ...input }).Bust, .38)
for (const sex of ['m', 'f']) {
  for (const topw of ['jacket', 'megjacket', 'sweater', 'hoodie', 'longsleeve', 'pajamas']) {
    const parts = humanBody({ sex, topw, botw: 'overalls' }).parts
    assert.equal(parts.Ward_overalls.visible, false)
    assert.equal(parts.Ward_pants.visible, true)
  }
  assert.equal(humanBody({ sex, topw: 'tee', botw: 'overalls' }).parts.Ward_overalls.visible, true)
}
