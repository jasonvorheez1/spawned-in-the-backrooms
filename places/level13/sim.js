import { sweepProps } from "../../scripts/lib/breakables.js";
// Level 13 "The Boiling Frogs": the shell lives in the scene file; scripts handle furniture, residents and creatures.
// Lethargy: the longer you stay inside one flat, the heavier you get (player.state.leth13, 0..1).
import { aptAt } from "../../scripts/lib/level13.js";
import { layFurnish } from "../../scripts/lib/level13-furnish.js";
import { layFoes } from "../../scripts/lib/level13-foes.js";
import { layPeople } from "../../scripts/lib/level13-people.js";
import { layDress } from "../../scripts/lib/level13-dress.js";
import { layTape } from "../../scripts/lib/level13-tape.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
export const cadence = "1s";
export const LETH = { startS: 45, fullS: 180, coolS: 20 };
const STAY = new Map();
export function tick(ctx) {
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  if (!("l13-floor" in ctx.place.objects)) return;
  restyleSigns(ctx, "level13"); dressThresholds(ctx);
  if (!("l13-tear21" in ctx.place.objects)) { // Wikidot: tears in Level 13's walls, high-pitched whine, lead to Level 21
    ctx.spawn("l13-tear21", { feetPosition: { x: -36.5, y: 0, z: -1.6 }, rotation: { yaw: 0 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1, height: 2.1, depth: 0.5 }, visible: false, tags: ["door"], behavior: "scripts/level-door.js", state: { to: "doors21", name: "Tear in the wall", info: "A whine like a dog whistle. Behind it, a hallway full of doors." },
      fx: { script: "fx\nlocal\npop tear rate=26 on=box(.9,2,.05).c(1.05) life=.15..0.5 size=.03..0.12 asp=6 col=hdr(2.2,2,1.4)|hdr(.6,1.6,1.2) a=1>0 sz=$size r=sprite(soft-disc,add)" },
      audio: { clip: "/cdn/moodboard-gothic-horror/sfx-high-pitched-reality-tear-whine-loop.mp3", gain: 0.35, loop: true, spatial: true, maxDistance: 14 } });
  }
  layFurnish(ctx); layFoes(ctx); layPeople(ctx); layDress(ctx); layTape(ctx);
  // the lethargy: seconds spent inside one flat, written only when its step (a tenth) changes
  for (const p of ctx.place.players) {
    let m = STAY.get(p.id); if (!m) STAY.set(p.id, m = { apt: null, s: 0 }); const a = aptAt(p.feetPosition.x, p.feetPosition.z);
    if (a && a.id === m.apt) m.s += 1; else if (a) { m.apt = a.id; m.s = Math.max(0, m.s - 5); } else { m.apt = null; m.s = Math.max(0, m.s - (LETH.fullS / LETH.coolS)); }
    const v = Math.round(Math.max(0, Math.min(1, (m.s - LETH.startS) / (LETH.fullS - LETH.startS))) * 10) / 10;
    if ((p.state.leth13 ?? 0) !== v) p.state.leth13 = v;
  }
}
