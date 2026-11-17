// Level 21: the broken floor in the West hall. Drop in and Level 22's rubble heap is under you.
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return;
  const o = ctx.getObject(other.id); if (!o?.state) return;
  o.state.notice = { text: "Concrete dust and the dark of a car park. You slide down the heap.", at: ctx.now() };
  ctx.cross(o, "level22");
}
