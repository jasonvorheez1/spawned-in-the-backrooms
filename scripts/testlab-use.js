// Test Range: the range terminal hands out and signs off the test quest (the steps are checked in places/testlab/sim.js); the switch flips the lamp.
import { setQuest, endQuest } from "./lib/quests.js";
export const QID = "range-check";
export const STEPS = [
  ["Take any weapon off an armory plinth", "tl-plinth-0"],
  ["Kick, shoot or break something in the physics bay", "tl-phys-crate-0"],
  ["Step on a red pad at the range and kill what comes out", "tl-pad-smiler"],
  ["Take parts from the bin and craft anything at the workbench", "tl-bench"],
  ["Eat or drink something from the fridge (I > Aid)", "tl-fridge"],
  ["Report back to the range terminal", "tl-terminal"],
];
export const stepQuest = (s, i) => setQuest(s, QID, { name: "Range Check", step: STEPS[i][0], mark: { place: "testlab", id: STEPS[i][1] } });
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), s = who?.state; if (!s) return;
    const now = ctx.now(), k = ctx.self.state.kind;
    if (k === "switch") {
      const lamp = ctx.place.objects["tl-lamp"], on = !ctx.self.state.on; ctx.self.state.on = on;
      if (lamp) { lamp.light = { kind: "point", color: "oklch(0.92 0.09 85)", intensity: on ? 3 : 0, distance: 9 }; lamp.material = { color: "oklch(0.95 0.05 90)", emissive: "oklch(0.9 0.1 90)", emissiveIntensity: on ? 3 : 0 }; }
      ctx.emit("playSound", { clip: "cdn/sfx-light-switch-click.mp3", position: ctx.self.feetPosition, volume: 0.7 });
      return;
    }
    if (k !== "terminal") return;
    ctx.emit("playSound", { clip: "cdn/sfx-computer-terminal-beep-confirm.mp3", position: ctx.self.feetPosition, volume: 0.6 });
    const q = s.rangeQ;
    if (!q) { s.rangeQ = { stage: 0 }; stepQuest(s, 0); s.notice = { text: "Range Check started. Six steps, one per station", at: now }; return; }
    if (q.stage >= 5) { endQuest(s, QID, "Every station on the range works"); s.rangeQ = null; s.payout = { xp: 50, text: "Range Check complete. +50 XP" }; return; }
    s.notice = { text: `Range Check: ${STEPS[q.stage][0]}`, at: now };
  },
};
