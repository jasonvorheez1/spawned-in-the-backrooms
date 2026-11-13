// Level 70 "Froidetown". The spine: arrival, the white door back to Level 31, falling snow, wind. Each layer is its own file
// (scripts/lib/level70-town.js, -wild.js, -life.js, -quest.js): lay() once per its version, tick() every second.
import { ARRIVE, HUT } from "../../scripts/lib/level70.js";
import * as town from "../../scripts/lib/level70-town.js";
import * as civic from "../../scripts/lib/level70-civic.js";
import * as wild from "../../scripts/lib/level70-wild.js";
import * as life from "../../scripts/lib/level70-life.js";
import * as quest from "../../scripts/lib/level70-quest.js";
export const cadence = "1s";
const V = 1;
const LAYERS = { town, civic, wild, life, quest };
const SNOW = `fx follow=camera
pop flake rate=?mobile:120|ultra:520|300 on=box(26,1,26) pos=<0,9,0> life=5..8 v=<1.6,-1.7,.9>+sdir()*.3 size=.025..0.06 acc=curl(.5)*.9 col=<.95,.97,1> a=0>.1:.85>.9:.8>0 sz=$size floor=die r=sprite(soft-disc,alpha)`;
function spine(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  sp("l70-from-l31", { feetPosition: ARRIVE, rotation: { yaw: 0 } });
  sp("l70-back", { feetPosition: { x: HUT.x, y: 0, z: HUT.z - 2.2 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.3, height: 2.3, depth: 0.5 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level31#l31-from-l70" } });
  sp("l70-snow", { feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: SNOW } });
  sp("l70-wind", { feetPosition: { x: 0, y: 2, z: 0 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-arctic-wind-howl-over-empty-snowy-street-loop.mp3", loop: true, spatial: false, gain: 0.22, bus: "ambience" } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.v70 !== V) { spine(ctx); s.v70 = V; }
  for (const [k, m] of Object.entries(LAYERS)) {
    if (m.V && s["v70" + k] !== m.V) { m.lay(ctx); s["v70" + k] = m.V; }
    m.tick(ctx);
  }
}
