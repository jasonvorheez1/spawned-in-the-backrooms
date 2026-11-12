// Level 0.2's CREW EXIT ↑ (scripts/lib/l02-grid.js lays it): the crew's back stair, out of the shifting rooms and up to the door room.
import G from "./lib/data/l02-remodel.yml";
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null) return;
  const [x, z] = G.exit.top;
  ctx.emit("screenFlash", { color: "#000000", duration: 0.7, intensity: 1 }, { audience: { player: other.id } });
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-boots-climbing-rough-plywood-stairs-fast.mp3", position: { x, y: 0.5, z }, volume: 0.7 }, { audience: { player: other.id } });
  other.velocity = { x: 0, y: 0, z: 0 };
  other.feetPosition = { x, y: 0.1, z };
}
