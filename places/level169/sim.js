// Level 169 "Welcome to the Desert" (archived Wikidot version; Shelly's brief, Nov 14). No hostile entities here, ever: the land is the danger.
// Every position and number: scripts/lib/data/level169.yml. Scale 1:10 (Savi's pick). The sun, cold and water-to-sand rules ride the player: scripts/sun169.js.
import L from "../../scripts/lib/data/level169.yml";
import { layHouse } from "../../scripts/lib/l169-house.js";
import { layFerry } from "../../scripts/lib/l169-ferry.js";
import { layFriends, tickFriends } from "../../scripts/lib/l169-friends.js";
import { layRoad, tickRoad } from "../../scripts/lib/l169-road.js";
import { shipTick } from "../../scripts/lib/ssfun-voyage.js";
import { questTick } from "../../scripts/lib/level169-quest.js";
export const cadence = "1s";
const V = 1; // bump to relay everything
const STONE = { texture: "cdn/texture-rough-stacked-sandstone-well-masonry.png", color: "oklch(0.7 0.05 65)", repeat: [4, 1], roughness: 1 };
const WOOD = { texture: "cdn/texture-sun-bleached-grey-desert-timber.png", color: "oklch(0.62 0.04 70)", roughness: 1 };
function sp(ctx, id, spec) {
  const old = ctx.getObject(id);
  if (old && spec.tags?.includes("npc")) return; // people keep their place and their state
  if (old) ctx.destroy(id);
  if ((spec.primitive || spec.model) && !spec.visibleRange) spec.visibleRange = { max: 450 };
  if (spec.light && spec.light.shadow === undefined) spec.light.shadow = { enabled: false };
  return ctx.spawn(id, spec);
}
function layWell(ctx, sp) { // the way in: you climb out of a dry well in the middle of nowhere
  const g = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
  for (let i = 0; i < 3; i++) sp("l169-well-ring" + i, { feetPosition: g(0, 0, 0.18 + i * 0.3), rotation: { pitch: 90 }, primitive: { kind: "torus", radius: 1.15, tube: 0.2, radialSegments: 10, tubularSegments: 28 }, material: STONE });
  sp("l169-well-wall", { feetPosition: g(0, 0, 0), primitive: { kind: "cylinder", radiusTop: 1.3, radiusBottom: 1.36, height: 0.95, radialSegments: 24, openEnded: true }, material: { ...STONE, side: "double" }, physics: "static" });
  sp("l169-well-dark", { feetPosition: g(0, 0, 0.5), rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 1.02, segments: 24 }, material: { color: "oklch(0.08 0.01 60)", roughness: 1 } });
  for (const s of [-1, 1]) sp("l169-well-post" + s, { feetPosition: g(s * 1.32, 0, 0), primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.09, height: 2.5, radialSegments: 8 }, material: WOOD });
  sp("l169-well-beam", { feetPosition: g(0, 0, 2.4), rotation: { roll: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 3, radialSegments: 8 }, material: WOOD });
  sp("l169-well-rope", { feetPosition: g(0.2, 0, 0.9), primitive: { kind: "cylinder", radiusTop: 0.015, radiusBottom: 0.015, height: 1.5, radialSegments: 5 }, material: { color: "oklch(0.6 0.06 80)", roughness: 1 } });
  sp("l169-well-bucket", { tags: ["interact"], feetPosition: g(0.2, 0, 0.62), primitive: { kind: "cylinder", radiusTop: 0.17, radiusBottom: 0.13, height: 0.3, radialSegments: 14, openEnded: true }, material: { color: "oklch(0.45 0.02 250)", metalness: 0.7, roughness: 0.5, side: "double" },
    state: { prompt: "Look in the bucket", note: "Sand. Fine and dry, right to the brim. The rope is still damp." } });
  sp("l169-well-sandpile", { feetPosition: g(1.9, 0.6, -0.08), primitive: { kind: "sphere", radius: 0.5, widthSegments: 12, heightSegments: 8 }, scale: { x: 1.3, y: 0.35, z: 1 }, material: { color: "oklch(0.8 0.06 75)", roughness: 1 } });
  // somebody left a marker for the next arrival: a cairn and a board pointing north
  for (let i = 0; i < 4; i++) sp("l169-cairn" + i, { feetPosition: g(4.2, -5, i * 0.26), primitive: { kind: "sphere", radius: 0.34 - i * 0.06, widthSegments: 9, heightSegments: 6 }, scale: { x: 1, y: 0.6, z: 0.9 }, rotation: { yaw: i * 47 }, material: { color: "oklch(0.52 0.07 45)", roughness: 1 }, physics: i ? "none" : "static" });
  sp("l169-sign-post", { feetPosition: g(-3.2, -6, 0), primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 2, radialSegments: 8 }, material: WOOD, physics: "static" });
  sp("l169-sign", { feetPosition: g(-3.2, -6, 1.45), rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.5, height: 0.5, depth: 0.04 }, material: WOOD,
    ui: `<div face="front" width="1.5m" style="font:700 64px Georgia,serif;color:#2a1c10;padding:24px 30px;line-height:1.25">HOUSE 5 km &uarr;<br><span style="font-size:40px;font-weight:400">walk at night. keep under cover by day.<br>your water won't keep. ours will, a while.</span></div>` });
  sp("l169-amb-wind", { feetPosition: g(0, 0, 2), audio: { clip: "cdn/moodboard-realistic-gritty/sfx-dry-desert-wind-over-open-sand-low-steady-loop.mp3", gain: 0.16, loop: true, spatial: false } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (!ctx.place.players?.length) return;
  const put = (id, spec) => sp(ctx, id, spec);
  if (s.l169V !== V) {
    s.l169V = V;
    layWell(ctx, put); layHouse(ctx, put, L); layFerry(ctx, put, L); layFriends(ctx, put, L); layRoad(ctx, put, L);
  }
  tickFriends(ctx, L); tickRoad(ctx, put, L); shipTick(ctx, put, "level169", L.ship); questTick(ctx, L);
}
