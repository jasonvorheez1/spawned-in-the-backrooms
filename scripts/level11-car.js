// Level 11 "The Infinite City" - Drivable Yellow City Taxi ("Level 11 Express")
// Allows players to cruise the grand avenues of Level 11 in a fully controllable vintage taxi cab.
// Controls: W/S Accelerate & Reverse, A/D Steer, Left-Click / H Honk Horn, E / Space Exit.

import { raycast } from "builtin/physics";
import { heard } from "./lib/hear.js";

const MAX_SPEED = 14.5;
const ACCEL = 9.0;
const BRAKE = 14.0;
const REVERSE_MAX = 5.5;
const TURN_RATE = 55; // deg/sec
const FRICTION = 3.5;

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const HORN_SFX = "/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3";
const DOOR_OPEN = "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3";
const ENGINE_START = "/cdn/moodboard-realistic-gritty/sfx-old-computer-boot-startup-chime.mp3";

const EXHAUST_FX = `fx
pop exhaust rate=%r|0*18 on=disc(.08) life=.4..0.8 v=<%dir|0,0,1>*(1..2)+up(.1) size=.08..0.18 acc=drag(1.5)+buoy(.2) col=<.4,.4,.42> a=.4>0 sz=$size*(1>2.5) r=sprite(smoke-puff,alpha)`;

function mem(ctx) {
  return (ctx.self.session.car ??= {
    speed: 0,
    steer: 0,
    mz: 0,
    mx: 0,
    engineRunning: false,
    honkAt: 0,
  });
}

export const ears = {
  press: (ctx, { by }) => {
    if (!ctx.self.controller) {
      ctx.self.controller = by;
      ctx.self.state.driver = by;
      ctx.self.state.leftAt = null;

      const p = ctx.getObject(by);
      const pos = ctx.self.feetPosition;
      heard(ctx, { clip: DOOR_OPEN, position: pos, volume: 0.8, maxDistance: 18 });
      heard(ctx, { clip: ENGINE_START, position: pos, volume: 0.85, pitch: 0.7, maxDistance: 25 });

      if (p?.state) {
        p.state.notice = {
          text: "W/S Accelerate · A/D Steer · Left-Click/H Horn · E/Space Step Out",
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
      text: "W/S Accelerate · A/D Steer · Left-Click/H Horn · E/Space Step Out",
      at: ctx.now(),
    };
  }
  return true;
}

export function onControlEnd(ctx) {
  const m = mem(ctx);
  m.mz = 0;
  m.mx = 0;
  ctx.self.state.leftAt = ctx.now();
  ctx.self.state.driver = null;
}

export function onInput(ctx, input) {
  const m = mem(ctx);
  m.mz = input.axes?.moveZ ?? 0;
  m.mx = input.axes?.moveX ?? 0;

  // Horn: Left-click (attack) or holster (H)
  if (input.pressed?.attack || input.pressed?.holster) {
    const now = ctx.now();
    if (now - m.honkAt > 500) {
      m.honkAt = now;
      const pos = ctx.self.feetPosition;
      heard(ctx, { clip: HORN_SFX, position: pos, volume: 1.0, pitch: 1.45, maxDistance: 60 });
      ctx.emit("screenShake", { intensity: 0.15, duration: 0.2 }, { audience: { player: ctx.self.controller } });
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.8, z: pos.z },
        text: "HONK HONK!",
        color: "#ffd700",
        size: 1.1,
      });
    }
  }

  // Step out: interact (E) or jump (Space)
  if (input.pressed?.interact || input.pressed?.jump) {
    const driverId = ctx.self.controller;
    ctx.self.controller = null;
    ctx.self.state.driver = null;

    if (driverId) {
      const p = ctx.getObject(driverId);
      if (p) {
        // Step driver out onto driver-side pavement
        const carYaw = (ctx.self.rotation?.yaw ?? 0) * (Math.PI / 180);
        const sideX = -Math.cos(carYaw) * 1.8;
        const sideZ = Math.sin(carYaw) * 1.8;
        p.feetPosition = {
          x: ctx.self.feetPosition.x + sideX,
          y: ctx.self.feetPosition.y + 0.1,
          z: ctx.self.feetPosition.z + sideZ,
        };
      }
    }
  }
}

export function update(ctx, dt) {
  const car = ctx.self;
  const m = mem(ctx);
  const now = ctx.now();
  const pos = car.feetPosition;
  let yaw = (typeof car.rotation === "number" ? car.rotation : car.rotation?.yaw) ?? 0;

  // Driving mechanics when a player is in the driver seat
  if (car.controller) {
    const targetSpeed = -m.mz * (m.mz < 0 ? MAX_SPEED : REVERSE_MAX); // moveZ -1 is W (forward)
    const accelRate = m.mz !== 0 ? (Math.sign(targetSpeed) === Math.sign(m.speed) ? ACCEL : BRAKE) : FRICTION;

    if (targetSpeed > m.speed) {
      m.speed = Math.min(targetSpeed, m.speed + accelRate * dt);
    } else if (targetSpeed < m.speed) {
      m.speed = Math.max(targetSpeed, m.speed - accelRate * dt);
    }

    // Steering: responsive to wheel turning
    const steerAim = -m.mx * 30; // degrees
    m.steer += (steerAim - m.steer) * Math.min(1, dt * 10);

    // Turning car body based on speed & steer angle
    if (Math.abs(m.speed) > 0.1) {
      const turnAmount = (m.steer / 30) * TURN_RATE * dt * Math.sign(m.speed);
      yaw += turnAmount;
    }
  } else {
    // Coast to halt with friction
    if (Math.abs(m.speed) > 0.1) {
      m.speed -= Math.sign(m.speed) * FRICTION * dt;
    } else {
      m.speed = 0;
    }
    m.steer += (0 - m.steer) * Math.min(1, dt * 6);
  }

  // Turn front wheels visually
  const wheelL = ctx.getObject("l11-taxi-wheel-fl");
  const wheelR = ctx.getObject("l11-taxi-wheel-fr");
  if (wheelL) wheelL.rotation = { yaw: m.steer };
  if (wheelR) wheelR.rotation = { yaw: m.steer };

  // Calculate forward motion
  const rad = (yaw * Math.PI) / 180;
  const fx = -Math.sin(rad);
  const fz = -Math.cos(rad);

  if (Math.abs(m.speed) > 0.05) {
    const dir = Math.sign(m.speed);
    const checkDist = 2.4;
    const ahead = {
      x: pos.x + fx * dir * checkDist,
      y: pos.y + 0.45,
      z: pos.z + fz * dir * checkDist,
    };

    // Forward raycast collision against walls and buildings
    const hit = raycast(
      ctx,
      { x: pos.x, y: pos.y + 0.45, z: pos.z },
      { x: fx * dir, y: 0, z: fz * dir },
      { distance: checkDist, physicsOnly: true, bodies: "static", ignoreEntities: [car.id] }
    );

    if (hit) {
      if (Math.abs(m.speed) > 3) {
        heard(ctx, { clip: G("heavy-wooden-object-smash-impact-thud"), position: pos, volume: 0.8 });
        ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: car.controller } });
      }
      m.speed = -m.speed * 0.25; // rebound slightly
    } else {
      car.feetPosition = {
        x: pos.x + fx * m.speed * dt,
        y: pos.y,
        z: pos.z + fz * m.speed * dt,
      };
    }
  }

  car.rotation = { yaw };

  // Exhaust particle rate linked to velocity
  const exhRate = Math.abs(m.speed) > 0.5 ? 1.0 : car.controller ? 0.3 : 0;
  car.fx = {
    script: EXHAUST_FX,
    params: { r: exhRate },
    direction: { x: -fx, y: 0.1, z: -fz },
  };

  // Keep driver synced to car interior seat position
  if (car.controller) {
    const driver = ctx.getObject(car.controller);
    if (driver) {
      driver.feetPosition = {
        x: car.feetPosition.x - Math.cos(rad) * 0.4,
        y: car.feetPosition.y + 0.2,
        z: car.feetPosition.z + Math.sin(rad) * 0.4,
      };
      driver.rotation = { yaw };
    }
  }
}
