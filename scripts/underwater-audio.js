// The whole mix heard through water: a low-pass on Master while the eye is under (spawned local by scripts/swim.js).
export function setup({ ctx, out, input }) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.9
  const g = ctx.createGain(); g.gain.value = 0.8
  if (input) input.connect(lp); lp.connect(g).connect(out)
  return { update() {}, dispose() { try { input?.disconnect(lp) } catch {} try { lp.disconnect(); g.disconnect() } catch {} }, readout() { return null } }
}
