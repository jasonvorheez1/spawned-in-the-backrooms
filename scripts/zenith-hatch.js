// the way into Level 0.1: the B.N.T.G. bulkhead in Level 0's safe room (scripts/lib/zenith-quest.js), and back out of the station's vestibule
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null) return;
  const back = ctx.self.state?.to === "main";
  if (!back && !other.state.zenKey) { other.state.notice = { text: "Sealed. A B.N.T.G. keycard reader blinks amber.", at: ctx.now() }; return; }
  ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  other.state.clipKind = "wall";
  ctx.cross(other, back ? "main#main-from-l01" : "level01#l01-from-main");
}
