// Favi's chat brain as one invisible row the mod places: it runs on the room's single host machine
// (simulatedBy: "platform"), so every message is answered once, wherever the mod is installed.
export const brain = {
  tags: ["favi-brain"],
  visibleTo: "editors",
  simulatedBy: "platform",
  feetPosition: { x: 0, y: 0, z: 0 },
  behavior: "mods/favi/brain-runner.js",
};
