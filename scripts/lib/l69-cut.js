// Level 69's opening shots (Shelly Nov 17: "improve the intro cutscene i wanted it to be cinematic").
// Runs on the player's own machine from main-menu.js; reads player.state.l69.introAt (set by places/level69/sim.js when it seats you).
// 0-1.4 black · 1.4-5.6 crane high over the walls, pushing down the endless road · 5.6-9.4 low pass along the car, lamps sliding by
// 9.4-12.6 from the back seat, over your shoulder, through the windshield · then the camera is yours.
export const L69_INTRO_LEN = 12.6;
const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
export function l69CutTick(ctx, ses, st, place) {
  const inL69 = String(place ?? "").startsWith("level69");
  const at = st.l69?.introAt;
  const t = inL69 && at ? (ctx.now() - at) / 1000 : 99;
  if (t >= L69_INTRO_LEN || t < 0) { if (ses.l69cut) { ses.l69cut = null; ctx.view.camera = null; } return false; }
  ses.l69cut = true;
  const car = ctx.getObject("l69-car"); const c = car?.feetPosition ?? { x: -3.5, y: 0.6, z: -12 };
  if (t < 1.4) { ctx.view.camera = { eye: { x: c.x, y: 40, z: c.z + 30 }, aim: { x: c.x, y: 0, z: c.z - 200 }, fov: 40 }; return true; }
  if (t < 5.6) { const k = ease((t - 1.4) / 4.2); // the crane: high and behind, sinking toward the roof as it pushes in
    ctx.view.camera = { eye: { x: c.x + 2, y: lerp(26, 9, k), z: c.z + lerp(40, 14, k) }, aim: { x: c.x, y: lerp(0, 1, k), z: c.z - lerp(160, 40, k) }, fov: lerp(38, 48, k) }; return true; }
  if (t < 9.4) { const k = ease((t - 5.6) / 3.8); // the low pass: asphalt height, left side, sliding from tail to nose
    ctx.view.camera = { eye: { x: c.x - 2.6, y: 0.45, z: c.z + lerp(4.5, -3.2, k) }, aim: { x: c.x - 0.4, y: 0.75, z: c.z + lerp(0, -6, k) }, fov: 50 }; return true; }
  const k = ease((t - 9.4) / 3.2); // the back seat: over the shoulder, easing toward the driver's eye
  ctx.view.camera = { eye: { x: c.x + lerp(0.35, 0.05, k), y: c.y + lerp(1.4, 1.3, k), z: c.z + lerp(1.5, 0.95, k) }, aim: { x: c.x - 0.3, y: c.y + 0.95, z: c.z - 30 }, fov: lerp(55, 60, k) };
  return true;
}
