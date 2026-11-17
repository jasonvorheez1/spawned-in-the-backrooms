// Level 21's entity bodies: three Tripo meshes, each its own sculpt (art notes: /workspace/l21d). foeBody(kind) → spec fragment.
// Tripo's bytes face +X, so each carries forward "+x"; the layout box stands it at its true height on the floor.
// None is rigged with clips (Tripo's rigs came back without animations), so scripts/l21d-foes.js moves them in code.
const BODIES = {
  clicker: { id: "/cdn/value.e571e23bb76943f82ad4414d96582dbd36c41cfcddced501697cd2b9d0055f2f.glb", h: 0.34, fwd: "-z" }, // Entity 94 (Shelly Nov 17): a heavy red typewriter that rolls the halls, 0.34 m
  stalker: { id: "/cdn/value.4467063c150482c8b148d82138c6410663adb98630d288cfba5d9e7430fb3ddd.glb", h: 1.34 },  // Tripo quadruped rig + keyed clips (art/l21d-stalker/build.py)  // on all fours: 1.2 m at the shoulder, 1.9 m long
  warden: { id: "/cdn/value.f5f6395d63913a587baf9043c624111edb46c4914827848fc42eee97fad9b054.glb", h: 2.3 },    // Tripo mixamo rig: plays the library's humanoid clips    // the dark wing's doorman, 2.3 m
};
// Rigged bodies and what each brain state plays (scripts/l21d-foes.js: body = gait channel, act = one-shot over it).
export const CLIPS = {
  stalker: { idle: "Idle", walk: "Walk", run: "Run", wind: "Swipe", crouch: "Crouch", leap: "Leap", hit: "Hit", die: "Die", walkAt: 1.6, runAt: 6 },
  warden: { idle: "cdn/clip-idle-loop.glb", walk: "cdn/clip-walk-loop.glb", run: "cdn/clip-run-loop.glb", wind: "cdn/clip-attack.glb", hit: "cdn/clip-hit-react.glb", die: "cdn/clip-die.glb", walkAt: 1.4, runAt: 3.6 },
};
export function foeBody(kind) {
  const b = BODIES[kind] ?? BODIES.clicker;
  return { model: { id: b.id, forward: b.fwd ?? "+x" }, layout: { box: { min: { y: 0 }, max: { y: b.h } } } };
}
