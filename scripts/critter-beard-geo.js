// 3D procedural facial hair geometry (beards, moustaches, goatees, stubble)
// Attached to Head bone, scales and conforms to human and critter facial proportions.
import { tube, sphere } from './lib/shapes.js'

export function geometry(ctx) {
  const P = ctx.params ?? {}
  const style = P.beard || 'none'
  if (style === 'none') return

  const M = ctx.lod <= 2 ? 10 : 6
  const col = P.col || '#4a3222'
  const isHuman = P.isHuman ?? true
  const fwd = isHuman ? 1 : -1
  const z0 = isHuman ? 0.222 : -0.218 // face front plane
  const y0 = 0.105                    // mouth elevation level

  ctx.smooth()
  ctx.color(col)

  if (style === 'mustache' || style === 'moustache') {
    // Crisp trimmed anime moustache on upper lip
    const ptsL = [
      [0.003, y0 + 0.026, (z0 + 0.007) * fwd],
      [0.022, y0 + 0.024, (z0 + 0.005) * fwd],
      [0.046, y0 + 0.015, (z0 - 0.006) * fwd],
      [0.062, y0 + 0.006, (z0 - 0.018) * fwd]
    ]
    const radsL = [0.010, 0.012, 0.009, 0.003]
    tube(ctx, ptsL, radsL, M, [1.1, 0.65])
    tube(ctx, ptsL.map(([x, y, z]) => [-x, y, z]), radsL, M, [1.1, 0.65])
    sphere(ctx, [0, y0 + 0.027, (z0 + 0.006) * fwd], 0.009, M, [1.4, 0.8, 0.7])
  } else if (style === 'handlebars') {
    // Bold flared handlebars curving upward past mouth corners
    const ptsL = [
      [0.003, y0 + 0.028, (z0 + 0.007) * fwd],
      [0.030, y0 + 0.025, (z0 + 0.004) * fwd],
      [0.058, y0 + 0.018, (z0 - 0.008) * fwd],
      [0.076, y0 + 0.028, (z0 - 0.020) * fwd],
      [0.086, y0 + 0.046, (z0 - 0.028) * fwd]
    ]
    const radsL = [0.011, 0.013, 0.011, 0.007, 0.003]
    tube(ctx, ptsL, radsL, M, [1.2, 0.7])
    tube(ctx, ptsL.map(([x, y, z]) => [-x, y, z]), radsL, M, [1.2, 0.7])
    sphere(ctx, [0, y0 + 0.029, (z0 + 0.006) * fwd], 0.010, M, [1.4, 0.8, 0.7])
  } else if (style === 'goatee') {
    // Soul patch under lower lip
    tube(ctx, [
      [0, y0 - 0.015, (z0 + 0.002) * fwd],
      [0, y0 - 0.035, (z0 + 0.001) * fwd],
      [0, y0 - 0.052, (z0 - 0.003) * fwd]
    ], [0.008, 0.010, 0.007], M, [1.2, 0.6])

    // Chin beard mound & forward apex
    const chinPts = [
      [0, y0 - 0.058, (z0 - 0.002) * fwd],
      [0, y0 - 0.090, (z0 + 0.008) * fwd],
      [0, y0 - 0.125, (z0 - 0.008) * fwd],
      [0, y0 - 0.145, (z0 - 0.032) * fwd]
    ]
    const chinRads = [0.014, 0.022, 0.020, 0.012]
    tube(ctx, chinPts, chinRads, M, [1.6, 0.9])

    for (const s of [-1, 1]) {
      tube(ctx, [
        [s * 0.022, y0 - 0.070, (z0 - 0.008) * fwd],
        [s * 0.030, y0 - 0.100, (z0 - 0.004) * fwd],
        [s * 0.018, y0 - 0.130, (z0 - 0.020) * fwd]
      ], [0.012, 0.015, 0.009], M, [1.3, 0.8])
    }
  } else if (style === 'fullbeard') {
    // 1. Full trimmed moustache
    const mPtsL = [
      [0.003, y0 + 0.025, (z0 + 0.006) * fwd],
      [0.025, y0 + 0.022, (z0 + 0.004) * fwd],
      [0.050, y0 + 0.012, (z0 - 0.008) * fwd],
      [0.065, y0 - 0.005, (z0 - 0.018) * fwd]
    ]
    const mRads = [0.010, 0.012, 0.009, 0.005]
    tube(ctx, mPtsL, mRads, M, [1.2, 0.7])
    tube(ctx, mPtsL.map(([x, y, z]) => [-x, y, z]), mRads, M, [1.2, 0.7])

    // 2. Soul patch
    tube(ctx, [
      [0, y0 - 0.014, (z0 + 0.002) * fwd],
      [0, y0 - 0.040, (z0 + 0.001) * fwd]
    ], [0.009, 0.012], M, [1.3, 0.7])

    // 3. Thick muscular jawline beard framing both sides
    for (const s of [-1, 1]) {
      const jawPts = [
        [s * 0.135, y0 + 0.090, (z0 - 0.095) * fwd],
        [s * 0.130, y0 + 0.040, (z0 - 0.075) * fwd],
        [s * 0.118, y0 - 0.015, (z0 - 0.045) * fwd],
        [s * 0.088, y0 - 0.065, (z0 - 0.020) * fwd],
        [s * 0.050, y0 - 0.105, (z0 + 0.002) * fwd],
        [0, y0 - 0.130, (z0 + 0.006) * fwd]
      ]
      const jawRads = [0.015, 0.018, 0.022, 0.025, 0.026, 0.028]
      tube(ctx, jawPts, jawRads, M, [1.4, 0.9])
    }

    // 4. Burly chin volume underneath
    tube(ctx, [
      [0, y0 - 0.080, (z0 + 0.006) * fwd],
      [0, y0 - 0.125, (z0 + 0.009) * fwd],
      [0, y0 - 0.155, (z0 - 0.025) * fwd]
    ], [0.022, 0.028, 0.018], M, [1.7, 1.0])
  } else if (style === 'chinstrap') {
    // Sharp jawline strap framing the jaw and squaring the chin
    for (const s of [-1, 1]) {
      const jawPts = [
        [s * 0.135, y0 + 0.080, (z0 - 0.095) * fwd],
        [s * 0.126, y0 + 0.030, (z0 - 0.070) * fwd],
        [s * 0.110, y0 - 0.020, (z0 - 0.040) * fwd],
        [s * 0.075, y0 - 0.068, (z0 - 0.016) * fwd],
        [s * 0.038, y0 - 0.100, (z0 + 0.004) * fwd],
        [0, y0 - 0.118, (z0 + 0.008) * fwd]
      ]
      const jawRads = [0.010, 0.012, 0.014, 0.016, 0.016, 0.018]
      tube(ctx, jawPts, jawRads, M, [1.2, 0.7])
    }
  } else if (style === 'anchor') {
    // Sleek pencil/curved mustache
    const mPtsL = [
      [0.004, y0 + 0.026, (z0 + 0.006) * fwd],
      [0.025, y0 + 0.025, (z0 + 0.004) * fwd],
      [0.052, y0 + 0.018, (z0 - 0.007) * fwd],
      [0.068, y0 + 0.024, (z0 - 0.018) * fwd]
    ]
    const mRads = [0.008, 0.009, 0.007, 0.003]
    tube(ctx, mPtsL, mRads, M, [1.1, 0.6])
    tube(ctx, mPtsL.map(([x, y, z]) => [-x, y, z]), mRads, M, [1.1, 0.6])

    // Soul patch
    tube(ctx, [
      [0, y0 - 0.014, (z0 + 0.002) * fwd],
      [0, y0 - 0.042, (z0 + 0.001) * fwd]
    ], [0.008, 0.009], M, [1.1, 0.6])

    // Pointed anchor chin & flared wings
    tube(ctx, [
      [0, y0 - 0.050, (z0 + 0.001) * fwd],
      [0, y0 - 0.095, (z0 + 0.006) * fwd],
      [0, y0 - 0.135, (z0 - 0.014) * fwd]
    ], [0.012, 0.018, 0.008], M, [1.4, 0.8])

    for (const s of [-1, 1]) {
      tube(ctx, [
        [0, y0 - 0.100, (z0 + 0.005) * fwd],
        [s * 0.035, y0 - 0.088, (z0 - 0.008) * fwd],
        [s * 0.065, y0 - 0.062, (z0 - 0.024) * fwd]
      ], [0.014, 0.010, 0.005], M, [1.2, 0.7])
    }
  } else if (style === 'stubble') {
    // Rugged 5 o'clock shadow scruff
    const dots = [
      [-0.035, y0 + 0.020, z0 - 0.005], [-0.020, y0 + 0.024, z0 + 0.002], [0, y0 + 0.026, z0 + 0.003],
      [0.020, y0 + 0.024, z0 + 0.002], [0.035, y0 + 0.020, z0 - 0.005],
      [0, y0 - 0.022, z0 + 0.001], [0, y0 - 0.040, z0 + 0.001],
      [-0.025, y0 - 0.075, z0 - 0.002], [0, y0 - 0.080, z0 + 0.004], [0.025, y0 - 0.075, z0 - 0.002],
      [-0.035, y0 - 0.105, z0 - 0.006], [0, y0 - 0.110, z0 + 0.002], [0.035, y0 - 0.105, z0 - 0.006],
      [-0.070, y0 - 0.060, z0 - 0.020], [0.070, y0 - 0.060, z0 - 0.020],
      [-0.105, y0 - 0.010, z0 - 0.045], [0.105, y0 - 0.010, z0 - 0.045],
      [-0.125, y0 + 0.040, z0 - 0.070], [0.125, y0 + 0.040, z0 - 0.070]
    ]
    for (const [x, y, z] of dots) {
      sphere(ctx, [x, y, z * fwd], 0.007, 6, [1.3, 0.8, 0.6])
    }
  }

  ctx.color(null)
}
