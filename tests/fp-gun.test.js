import { expect, test } from 'bun:test'
import W, { baseOf } from '../scripts/lib/weapons.js'
import { firstPersonGun } from '../scripts/lib/fp-gun.js'

test('each firearm and its variants have a complete first-person fit', () => {
  for (const [kind, gun] of Object.entries(W)) {
    if (!gun.ranged) continue
    const fit = firstPersonGun(baseOf(kind), gun.look)
    expect(fit).toBeDefined()
    expect([...fit.at, ...fit.turn, ...fit.ads, ...fit.hold, ...fit.muzzle, ...(fit.left ?? [])].every(Number.isFinite)).toBe(true)
    expect(fit.muzzle[2]).toBeLessThan(0)
    if (gun.two || kind === 'laser_rifle') expect(fit.left).toHaveLength(3)
  }
  expect(firstPersonGun('shotgun', 'sawn').muzzle[2]).toBeGreaterThan(firstPersonGun('shotgun').muzzle[2])
})
