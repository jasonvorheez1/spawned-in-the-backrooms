// Headshot kill: the head goes. Red mist at the head, the body's head bone scaled to nothing,
// and the creator's exploding skull plays its burst where the head was and falls under gravity.
export const SKULL = "/cdn/value.ea81eae266b43472fa0432b9b2d738ae23d42ae35773c298aa62d63dc561e39f.glb"; // creator's exploding skull, decimated 1.1M→39k tris
const MIST = `fx
pop mist burst=26..34 life=.9..1.6 v=<%dir|0,0,-1>*(1.5..3)+sdir()*(1..2.5) size=.35..0.6 acc=drag(2.2)+grav()*.08 col=<.55,.02,.02>><.3,.01,.01> a=0>.08:.85>.5:.5>0 sz=$size*(.6>2.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop drops burst=60..80 life=.6..1.2 v=<%dir|0,0,-1>*(2..5)+sdir()*(1.5..3.5)+up(1..2) size=.02..0.05 acc=grav() col=<.5,0,0> a=1 sz=$size floor=stick r=sprite(soft-disc,alpha,velocity,.03)
pop chunks burst=8..12 life=1.2..2 v=sdir()*(2..4)+up(2..3) size=.03..0.06 acc=grav() col=<.42,.04,.03> a=1 sz=$size floor=bounce(.2) r=mesh(sphere)`;
// a bone-scale clip: the head (and what hangs off it) shrinks to nothing and stays there
const NOHEAD = { name: "nohead", tracks: [{ bone: "mixamorig:Head", prop: "scale", times: [0, 1], values: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001] }] };
export function headPop(ctx, t, pos, from) {
  const d = { x: pos.x - from.x, y: 0, z: pos.z - from.z }, l = Math.hypot(d.x, d.z) || 1;
  const dir = { x: d.x / l, y: 0.15, z: d.z / l };
  t.state.headless = ctx.now();
  t.anim.nohead = { clip: NOHEAD, weight: 1, loop: "loop", blend: "override" };
  ctx.emit("fx", { position: pos, script: MIST, params: { dir } });
  ctx.emit("screenShake", { intensity: 0.25, duration: 0.15 }, { audience: { nearby: pos, radius: 12 } });
  ctx.spawn({
    model: SKULL, feetPosition: { x: pos.x, y: pos.y - 0.15, z: pos.z }, rotation: Math.atan2(-dir.x, -dir.z) * 180 / Math.PI,
    lifetime: 6, tags: ["gore"], castShadow: true,
    physics: { body: "dynamic", collider: "sphere", mass: 4, friction: 0.8, restitution: 0.15 },
    mixer: { burst: { clip: "Take 001", weight: 1, loop: "once", clampWhenFinished: true } },
    state: { gore: true },
  });
}
// a body back on its feet wears its head again
export function headBack(t) { if (t.state.headless) { t.anim.nohead = null; delete t.state.headless; } }
