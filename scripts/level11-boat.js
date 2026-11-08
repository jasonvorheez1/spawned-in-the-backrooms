// Level 11 "The Infinite City" - Canal Watercraft Controller
// Allows wanderers to pilot a motorized skiff along the wide urban canal and beneath the grand bridges.
// Controls: W/S Throttle Forward/Back, A/D Steer, E/Space Step Out.

import { raycast } from "builtin/physics";
import { heard } from "./lib/hear.js";

const MAX_SPEED = 6.2;
const ACCEL = 4.0;
const TURN_RATE = 45;
const WATER_Y = -2.25;

const SPLASH_SFX = "/cdn/moodboard-realistic-gritty/sfx-single-wooden-oar-blade-dipping-softly-into-calm-sea-water-and-pulling.mp3";
const HULL_LAP = "/cdn/moodboard-realistic-gritty/sfx-calm-sea-water-lapping-against-small-wooden-boat-hull-loop.mp3";

const WAKE_FX = `fx
pop foam rate=%r|0*24 on=disc(.4) life=.8..1.5 v=sdir()*.3+up(.08) size=.2..0.4 acc=drag(1.5) col=<.85,.9,.92> a=.4>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;

function mem(ctx) {
  return (ctx.self.session.boat ??= {
    speed: 0,
    steer: 0,
    mz: 0,
    mx: 0,
  });
}

export const ears = {
  press: (ctx, { by }) => {
    if (!ctx.self.controller) {
      ctx.self.controller = by;
      ctx.self.state.rider = by;
      const p = ctx.getObject(by);
      heard(ctx, { clip: SPLASH_SFX, position: ctx.self.feetPosition, volume: 0.8, maxDistance: 20 });

      if (p?.state) {
        p.state.notice = {
          text: "W/S Throttle Forward/Back · A/D Steer · E/Space Step Out",
          at: ctx.now(),
        };
      }
    }
  },
};

export function onControlBegin(ctx, player) {
  const p = ctx.getObject(player.id ?? player);
  if (p?.state) {
    p.state.notice = {
      text: "W/S Throttle Forward/Back · A/D Steer · E/Space Step Out",
      at: ctx.now(),
    };
  }
  return true;
}

export function onControlEnd(ctx) {
  const m = mem(ctx);
  m.mz = 0;
  m.mx = 0;
  ctx.self.state.rider = null;
}

export function onInput(ctx, input) {
  const m = mem(ctx);
  m.mz = input.axes?.moveZ ?? 0;
  m.mx = input.axes?.moveX ?? 0;

  if (input.pressed?.interact || input.pressed?.jump) {
    const riderId = ctx.self.controller;
    ctx.self.controller = null;
    ctx.self.state.rider = null;

    if (riderId) {
      const p = ctx.getObject(riderId);
      if (p) {
        // Step onto canal dock
        p.feetPosition = {
          x: ctx.self.feetPosition.x + 1.8,
          y: -1.9,
          z: ctx.self.feetPosition.z,
        };
      }
    }
  }
}

export function update(ctx, dt) {
  const boat = ctx.self;
  const m = mem(ctx);
  const now = ctx.now();
  const pos = boat.feetPosition;
  let yaw = (typeof boat.rotation === "number" ? boat.rotation : boat.rotation?.yaw) ?? 0;

  if (boat.controller) {
    const targetSpeed = -m.mz * (m.mz < 0 ? MAX_SPEED : 3.0);
    const accelRate = m.mz !== 0 ? ACCEL : 1.8;

    if (targetSpeed > m.speed) {
      m.speed = Math.min(targetSpeed, m.speed + accelRate * dt);
    } else if (targetSpeed < m.speed) {
      m.speed = Math.max(targetSpeed, m.speed - accelRate * dt);
    }

    const turnAim = -m.mx * TURN_RATE;
    m.steer += (turnAim - m.steer) * Math.min(1, dt * 5);

    if (Math.abs(m.speed) > 0.1) {
      yaw += m.steer * dt * Math.sign(m.speed);
    }
  } else {
    if (Math.abs(m.speed) > 0.1) {
      m.speed -= Math.sign(m.speed) * 1.5 * dt;
    } else {
      m.speed = 0;
    }
    m.steer += (0 - m.steer) * Math.min(1, dt * 4);
  }

  const rad = (yaw * Math.PI) / 180;
  const fx = -Math.sin(rad);
  const fz = -Math.cos(rad);

  if (Math.abs(m.speed) > 0.05) {
    const dir = Math.sign(m.speed);
    const checkDist = 2.0;

    const hit = raycast(
      ctx,
      { x: pos.x, y: WATER_Y + 0.3, z: pos.z },
      { x: fx * dir, y: 0, z: fz * dir },
      { distance: checkDist, physicsOnly: true, bodies: "static", ignoreEntities: [boat.id] }
    );

    if (hit) {
      m.speed = -m.speed * 0.2;
    } else {
      boat.feetPosition = {
        x: pos.x + fx * m.speed * dt,
        y: WATER_Y + Math.sin(now * 0.002) * 0.04,
        z: pos.z + fz * m.speed * dt,
      };
    }
  } else {
    boat.feetPosition = {
      x: pos.x,
      y: WATER_Y + Math.sin(now * 0.002) * 0.04,
      z: pos.z,
    };
  }

  const pitch = Math.sin(now * 0.0015) * 1.5 + m.speed * 0.5;
  const roll = Math.cos(now * 0.0018) * 2.0;
  boat.rotation = { yaw, pitch, roll };

  const wakeRate = Math.abs(m.speed) > 0.5 ? 1.0 : 0;
  boat.fx = {
    script: WAKE_FX,
    params: { r: wakeRate },
  };

  if (boat.controller) {
    const rider = ctx.getObject(boat.controller);
    if (rider) {
      rider.feetPosition = {
        x: boat.feetPosition.x,
        y: boat.feetPosition.y + 0.3,
        z: boat.feetPosition.z,
      };
      rider.rotation = { yaw };
    }
  }
}
