// Tiny's telepathy, an audio program on the hunted player's Voice bus while he speaks:
// the dry line stays dead centre, two short echoes bounce left and right, darkened, like it's coming from inside the skull.
export function setup({ ctx, out, input }) {
  const nodes = [];
  const n = (x) => (nodes.push(x), x);
  const dry = n(ctx.createGain()); dry.gain.value = 1;
  input.connect(dry).connect(out);
  const tone = n(ctx.createBiquadFilter()); tone.type = "lowpass"; tone.frequency.value = 2000;
  input.connect(tone);
  for (const [t, pan, g] of [[0.07, -0.85, 0.38], [0.13, 0.85, 0.34], [0.21, 0, 0.2]]) {
    const d = n(ctx.createDelay(1)); d.delayTime.value = t;
    const fb = n(ctx.createGain()); fb.gain.value = 0.32;
    const p = n(ctx.createStereoPanner()); p.pan.value = pan;
    const w = n(ctx.createGain()); w.gain.value = g;
    tone.connect(d); d.connect(fb).connect(d); d.connect(p).connect(w).connect(out);
  }
  return {
    update() {},
    dispose() { try { input.disconnect(); } catch {} for (const x of nodes) { try { x.disconnect(); } catch {} } },
    readout() { return null; },
  };
}
