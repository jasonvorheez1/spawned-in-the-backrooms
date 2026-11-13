// The lurker family's look and eye kinds (Shelly, Nov 13, the Entity 30 wiki page): two glowing eyes inside a pitch-black fog
// that travels with them. White eyes: fast, a flashlight in the face stuns them. Yellow: stare them down and they retreat.
// Red: slowest and rarest, nothing stops them, you outrun them. Shared by Level 0's lurkers, the Hall Lurker and the Enemy Bay.
export const EYES = {
  white: { weight: 45, color: "oklch(0.97 0.02 250)", speed: 1.15, light: "oklch(0.9 0.03 250)" },
  yellow: { weight: 40, color: "oklch(0.88 0.17 95)", speed: 1.0, light: "oklch(0.85 0.15 90)" },
  red: { weight: 15, color: "oklch(0.62 0.25 27)", speed: 0.62, light: "oklch(0.6 0.22 27)" },
};
export const LIGHT_STUN = { range: 14, ms: 3000, cooldownMs: 6500 }; // Savi's picks
export const STARE_RETREAT = { seconds: 1.2, ms: 7000 };             // Savi's picks
export const STALK = { minMs: 20000, maxMs: 40000, behind: 7 };      // Savi's picks: how long it trails you before it strikes
export function pickEyes(ctx) {
  let r = ctx.random() * 100;
  for (const [k, e] of Object.entries(EYES)) { r -= e.weight; if (r <= 0) return k; }
  return "white";
}
// the black murk: a held cloud around the body and a smear left behind it
export const FOG = `fx
pop murk local n=?mobile:16|30 on=box(.45,.95,.45).c(1.05) life=1.4..2.4 v=sdir()*(.06..0.18) size=.75..1.25 acc=curl(.4)*.3+drag(1) col=<.006,.006,.008> a=0>.25:.9>.75:.9>0 sz=$size*(.7>1.25) rot=spin(.1) r=sprite(smoke-puff,alpha)
pop trail rate=?mobile:4|8 on=disc(.45) life=1.6..2.6 v=up(.1..0.3) size=.5..0.9 acc=drag(1) col=<.01,.01,.014> a=0>.55:.3>0 sz=$size*(.8>1.7) r=sprite(smoke-puff,alpha)`;
// eyes ride the Head bone so they follow every crouch and lunge; the fog rides the body
export function dress(ctx, o, kind) {
  const E = EYES[kind] ?? EYES.white;
  if (o.state.dressed !== kind) { o.fx = { script: FOG }; o.state.dressed = kind; }
  if ((o.id + "/lk-eyes") in ctx.place.objects) return;
  const eye = (x) => ({ feetPosition: { x, y: 0.02, z: -0.11 }, pivot: "center", primitive: { kind: "sphere", radius: 0.028 }, material: { color: E.color, emissive: E.color, emissiveIntensity: 6 }, castShadow: false });
  ctx.spawn({ id: "lk-eyes", parent: o.id, attachment: { bone: "Head" }, feetPosition: { x: 0, y: 0, z: 0 }, castShadow: false,
    light: { kind: "point", color: E.light, intensity: 0.5, distance: 2.5 }, children: [eye(-0.045), eye(0.045)] });
}
export function undress(ctx, o) { o.fx = null; o.state.dressed = null; const id = o.id + "/lk-eyes"; if (id in ctx.place.objects) ctx.destroy(id); }
