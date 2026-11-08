// scripts/bobber.js
// Physical floating fishing bobber with buoyant water wave bobbing, ripple particles, nibble vibrations, and strike plunge.
import { animate } from 'builtin/tween';
import { heard } from './lib/hear.js';

const RIPPLE_FX = `fx
pop ring rate=2.5 on=disc(0.35) life=0.9..1.5 v=sdir()*(0.2..0.45) size=0.06..0.22 col=hdr(0.7,0.85,1.0) a=0.6>0 sz=$size*(1>2.4) r=sprite(soft-disc,add)
pop wake rate=1.2 on=disc(0.2) life=0.7..1.2 v=up(0.1..0.3) size=0.08..0.18 col=<0.8,0.92,1> a=0.5>0 sz=$size*(1>1.8) r=sprite(smoke-puff,alpha)`;

const BITE_SPLASH = `fx
pop splash burst=16 life=0.5..0.9 on=disc(0.35) v=sdir()*(1.2..2.4)+up(1.2..2.2) size=0.04..0.12 col=hdr(0.75,0.9,1.0) a=0.85>0 r=sprite(soft-disc,add)
pop foam burst=8 life=0.8..1.3 on=disc(0.25) v=up(0.2..0.7) size=0.15..0.32 col=<0.85,0.95,1> a=0.6>0 sz=$size*(1>1.8) r=sprite(smoke-puff,alpha)`;

export const updateSchedule = { every: { seconds: 0.15 } };

export function onSpawn(ctx) {
  const me = ctx.self;
  const s = me.state ?? {};
  const wy = s.waterY ?? me.feetPosition.y;
  me.fx = { script: RIPPLE_FX };

  // Smooth client-side buoyant floating wave animation
  animate(ctx, me.id, {
    'feetPosition.y': [wy - 0.035, wy + 0.035],
  }, { duration: 1.7, easing: 'easeInOutSine', direction: 'alternate', loop: true });

  animate(ctx, me.id, {
    'rotation.roll': [-7, 7],
    'rotation.yaw': [-12, 12],
  }, { duration: 2.3, easing: 'easeInOutSine', direction: 'alternate', loop: true });
}

export function update(ctx) {
  const me = ctx.self;
  const s = me.state ?? {};
  const wy = s.waterY ?? me.feetPosition.y;

  // Validate owner
  if (s.owner) {
    const owner = ctx.getObject(s.owner);
    if (!owner || owner.state?.dead || !owner.state?.fishingState || owner.state.fishingState.id !== me.id) {
      ctx.destroy(me.id);
      return;
    }
  }

  // Handle phase transitions
  if (s.phase !== s.lastPhase) {
    s.lastPhase = s.phase;
    if (s.phase === 'nibble') {
      // Rapid shivering twitch on bite approach
      animate(ctx, me.id, {
        'feetPosition.y': [wy - 0.07, wy - 0.01],
      }, { duration: 0.14, easing: 'easeInOutSine', direction: 'alternate', loop: true });
    } else if (s.phase === 'bite') {
      // Plunge sharply underwater
      animate(ctx, me.id, {
        'feetPosition.y': wy - 0.28,
      }, { duration: 0.18, easing: 'easeInQuad' });
      ctx.emit('fx', { position: { x: me.feetPosition.x, y: wy, z: me.feetPosition.z }, script: BITE_SPLASH });
      heard(ctx, {
        clip: '/cdn/moodboard-realistic-gritty/sfx-water-pour-splash-short.mp3',
        position: { x: me.feetPosition.x, y: wy, z: me.feetPosition.z },
        volume: 0.75,
        maxDistance: 20,
      });
    } else if (s.phase === 'reeling') {
      // Arc upward on catch haul
      animate(ctx, me.id, {
        'feetPosition.y': wy + 1.2,
      }, { duration: 0.35, easing: 'easeOutQuad' });
      ctx.after(0.36, 'cleanup');
    }
  }
}

export function cleanup(ctx) {
  ctx.destroy(ctx.self.id);
}
