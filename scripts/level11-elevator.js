// Level 11 "The Infinite City" - Skydeck Glass Elevator Controller
// Controls the physical panoramic glass elevator cab (l11-elevator-cab),
// animated sliding glass doors, motorized vertical travel between Ground Lobby (y = 0.3)
// and Rooftop Skydeck (y = 35.7), interactive floor counter display ([G] -> [2] -> [5] -> [8] -> [11] -> [14]),
// realistic motor hum, and arrival bell chimes.

import { heard } from "./lib/hear.js";

export const updateSchedule = { every: { seconds: 0.05 } };

const SOUNDS = {
  hum: "/cdn/moodboard-realistic-gritty/sfx-elevator-motor-hum-rumble.mp3",
  bell: "/cdn/moodboard-realistic-gritty/sfx-old-elevator-bell-ding.mp3",
  doors: "/cdn/moodboard-realistic-gritty/sfx-elevator-doors-sliding.mp3",
  button: "/cdn/moodboard-realistic-gritty/sfx-brass-elevator-button-click.mp3",
};

export const CAB_X = 18.5;
export const CAB_Z = 35.5;
export const Y_GROUND = 0.3;
export const Y_SKYDECK = 35.7;
const TRAVEL_TIME_SEC = 7.5;

function getIndicatorHtml(floor, arrow = "") {
  return `<div face="front" width="0.45m" style="width:100%;height:100%;background:#060d16;border:2px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-weight:900;font-size:26px;text-align:center;padding:4px 6px;letter-spacing:2px;text-shadow:0 0 10px #00d2d3;display:flex;align-items:center;justify-content:center">[ ${floor} ] ${arrow}</div>`;
}

function mem(ctx) {
  return (ctx.self.session.elev ??= {
    y: Y_GROUND,
    targetY: Y_GROUND,
    startY: Y_GROUND,
    phase: "idle", // 'idle' | 'closing' | 'moving' | 'opening'
    progress: 0,
    doorOpen: 1.0, // 0 = fully closed, 1 = fully open
    currentFloor: "G",
    lastHumAt: 0,
    lastFloorTick: "G",
  });
}

function sfx(ctx, name, pos, vol = 0.7, pitch = 1.0) {
  heard(ctx, { clip: SOUNDS[name], position: pos, volume: vol, pitch, maxDistance: 25 });
}

export function callElevator(ctx, targetFloor) {
  const m = mem(ctx);
  const destY = targetFloor === "14" || targetFloor === 14 ? Y_SKYDECK : Y_GROUND;

  if (m.phase === "moving") return; // already in transit

  // If already at that floor
  if (Math.abs(m.y - destY) < 0.2) {
    if (m.doorOpen < 0.9) {
      m.phase = "opening";
      sfx(ctx, "doors", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 0.85);
    }
    return;
  }

  // Start trip: first close doors, then move
  m.targetY = destY;
  m.startY = m.y;
  m.phase = "closing";
  m.progress = 0;
  sfx(ctx, "doors", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 0.85);
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state;
    const m = mem(ctx);
    const now = ctx.now();
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;

    sfx(ctx, "button", pos, 0.8);

    // 1. Interior Cab Panel
    if (s.kind === "elev-interior") {
      const nextFloor = m.targetY === Y_GROUND ? "14" : "G";
      callElevator(ctx, nextFloor);
      return;
    }

    // 2. External Ground Call Button
    if (s.kind === "elev-call-ground") {
      callElevator(ctx, "G");
      return;
    }

    // 3. External Skydeck Call Button
    if (s.kind === "elev-call-roof") {
      callElevator(ctx, "14");
      return;
    }
  },
};

export function update(ctx, dt) {
  const cab = ctx.self;
  const m = mem(ctx);
  const now = ctx.now();
  const players = ctx.place.players ?? [];

  // Update door and cab entities
  const doorL = ctx.getObject("l11-elev-door-l");
  const doorR = ctx.getObject("l11-elev-door-r");
  const indCab = ctx.getObject("l11-elev-ind-cab");
  const indGround = ctx.getObject("l11-elev-ind-ground");
  const indRoof = ctx.getObject("l11-elev-ind-roof");
  const btnInterior = ctx.getObject("l11-elev-btn-interior");

  // State machine
  if (m.phase === "closing") {
    m.doorOpen = Math.max(0, m.doorOpen - dt / 0.8);
    if (m.doorOpen <= 0) {
      m.phase = "moving";
      m.progress = 0;
      m.startY = m.y;
      m.lastHumAt = now;
      sfx(ctx, "hum", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 0.9);
    }
  } else if (m.phase === "opening") {
    m.doorOpen = Math.min(1.0, m.doorOpen + dt / 0.8);
    if (m.doorOpen >= 1.0) {
      m.phase = "idle";
    }
  } else if (m.phase === "moving") {
    m.progress = Math.min(1.0, m.progress + dt / TRAVEL_TIME_SEC);

    // Smooth Hermite / Smoothstep easing: 3p^2 - 2p^3
    const smoothT = m.progress * m.progress * (3 - 2 * m.progress);
    m.y = m.startY + (m.targetY - m.startY) * smoothT;

    // Refresh motor hum loop
    if (now - m.lastHumAt > 2800) {
      m.lastHumAt = now;
      sfx(ctx, "hum", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 0.85);
    }

    // Calculate displayed floor from height
    const ascending = m.targetY > m.startY;
    let fl = "G";
    if (m.y < 5.0) fl = "G";
    else if (m.y < 12.0) fl = "2";
    else if (m.y < 19.0) fl = "5";
    else if (m.y < 26.0) fl = "8";
    else if (m.y < 33.0) fl = "11";
    else fl = "14";

    if (fl !== m.lastFloorTick) {
      m.lastFloorTick = fl;
      sfx(ctx, "button", { x: CAB_X, y: m.y + 1.5, z: CAB_Z }, 0.5, 1.4); // soft floor click
    }
    m.currentFloor = fl;

    // Camera shake for riders
    const arrow = ascending ? "▲" : "▼";
    const indHtml = getIndicatorHtml(fl, arrow);
    if (indCab) indCab.ui = indHtml;
    if (indGround) indGround.ui = indHtml;
    if (indRoof) indRoof.ui = indHtml;

    // Arrived at destination floor
    if (m.progress >= 1.0) {
      m.y = m.targetY;
      m.phase = "opening";
      m.doorOpen = 0;
      m.currentFloor = m.y > 10 ? "14" : "G";

      const finalHtml = getIndicatorHtml(m.currentFloor, "");
      if (indCab) indCab.ui = finalHtml;
      if (indGround) indGround.ui = finalHtml;
      if (indRoof) indRoof.ui = finalHtml;

      // Arrival Bell
      sfx(ctx, "bell", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 1.0);
      sfx(ctx, "doors", { x: CAB_X, y: m.y + 1.2, z: CAB_Z }, 0.85);

      // Notify riders
      const noticeText = m.currentFloor === "14"
        ? "Floor 14 · Skydeck Observation Terrace"
        : "Ground Floor · Grand Tower Lobby";

      for (const p of players) {
        if (Math.abs(p.feetPosition.x - CAB_X) < 1.3 && Math.abs(p.feetPosition.z - CAB_Z) < 1.3) {
          if (p.state) p.state.notice = { text: noticeText, at: now };
          ctx.emit("screenFlash", { color: "#ffffff", duration: 0.4, intensity: 0.4 }, { audience: { player: p.id } });
        }
      }
    }
  }

  // Update physical cab position
  cab.feetPosition = { x: CAB_X, y: m.y, z: CAB_Z };

  // Update interior button label
  if (btnInterior?.state) {
    btnInterior.feetPosition = { x: CAB_X + 1.05, y: m.y + 1.2, z: CAB_Z + 0.5 };
    const destName = m.y < 10 ? "Skydeck [14]" : "Lobby [G]";
    btnInterior.state.verb = `Ride to ${destName}`;
    btnInterior.state.name = `Elevator Panel · Next: ${destName}`;
  }

  // Update sliding doors
  // Door frame opening width is 1.2m on the west face (x = CAB_X - 1.15)
  // When closed (doorOpen = 0): doorL is at z = CAB_Z - 0.28, doorR is at z = CAB_Z + 0.28
  // When open (doorOpen = 1): doorL slides to z = CAB_Z - 0.82, doorR slides to z = CAB_Z + 0.82
  const leftZ = CAB_Z - 0.28 - m.doorOpen * 0.54;
  const rightZ = CAB_Z + 0.28 + m.doorOpen * 0.54;

  if (doorL) doorL.feetPosition = { x: CAB_X - 1.16, y: m.y, z: leftZ };
  if (doorR) doorR.feetPosition = { x: CAB_X - 1.16, y: m.y, z: rightZ };

  // Synchronize riders inside the cab during movement
  if (m.phase === "moving") {
    for (const p of players) {
      if (Math.abs(p.feetPosition.x - CAB_X) < 1.25 && Math.abs(p.feetPosition.z - CAB_Z) < 1.25) {
        p.feetPosition = {
          x: p.feetPosition.x,
          y: m.y + 0.05,
          z: p.feetPosition.z,
        };
        p.velocity = { x: 0, y: 0, z: 0 };
        ctx.emit("screenShake", { intensity: 0.08, duration: 0.1 }, { audience: { player: p.id } });
      }
    }
  }
}
