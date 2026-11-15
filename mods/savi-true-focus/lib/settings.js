export const SETTINGS = {
  controllerTag: "savi-true-focus-controller",
  driverTag: "savi-true-focus-wearer",
  accessoryTag: "savi-true-focus-accessory",
  presenceBehavior: "engine/presence/savi.js",
  driverBehavior: "mods/savi-true-focus/wardrobe.js",
  motionBehavior: "mods/savi-true-focus/motion.js",
  motion: { startDistance: 3.2, stopDistance: 2.5, walkSpeed: 2.2, catchupSpeed: 6.8, catchupDistance: 8, catchupStopDistance: 4.5, jogPlayback: 1.7, repathMs: 400, waypointRadius: 0.2, idlePoll: 0.25, groundVelocity: -0.4, terminalSpeed: 24 },
  wardrobeData: "mods/savi-true-focus/lib/wardrobe.json",
  childId: "savi-true-focus",
  readBeforeTurn: 8,
  readBeforeThink: 10,
  loadTimeout: 90,
  reconnectCheckSeconds: 1,
  rigRetrySeconds: 0.5,
  bookFitRevision: 2,
  channel: "saviTrueFocus"
};
