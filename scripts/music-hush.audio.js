// While your HALOGEN radio plays, the rest of the Music bus (Bonus Room OST, the rink PA, jukeboxes) fades out for you alone
// (Shelly Nov 14: "disable music such as the rolling rink and bonus rooms music if i have radio on"). The radio itself rides the "Radio" group, untouched.
export function setup({ ctx, input, out, now }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(1, now);
  g.gain.linearRampToValueAtTime(0, now + 0.8);
  input.connect(g).connect(out);
  return { dispose() { try { input.disconnect(g); g.disconnect(); } catch {} } };
}
