// Boom Town's way to Level 69 (Wikidot: a car found in Level 325 drives you there). An empty sedan, engine ticking,
// keys in. E sits you in it; the world goes dark and you wake on the highway (places/level69/sim.js seats you in your car).
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by); if (!p?.state || p.state.l69going) return;
    p.state.l69going = true;
    p.state.notice = { text: "You sit down behind the wheel. Warm seat. Your eyes won't stay open.", at: ctx.now() };
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-car-door-open-and-shut-solid-thunk.mp3", volume: 0.8 }, { audience: { player: by } });
    ctx.emit("screenFlash", { color: "#000000", duration: 3, intensity: 1 }, { audience: { player: by } });
    ctx.after(2.2, "go", { by });
  },
};
export function go(ctx, { by }) { const p = ctx.getObject(by); if (!p) return; p.state.l69going = false; ctx.cross(p, "level69"); }
