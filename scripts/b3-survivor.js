import { raycast } from "builtin/physics";
import { O } from "./lib/l109-b3.js";
import { fire3, react3, aimPose, famOf } from "./lib/body3.js";

export function update(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now();
  if (s.dead || (s.hp ?? 0) <= 0) {
    if (!s.fallen) {
      s.fallen = true;
      ctx.place.state.b3BossDead = true;
      me.ragdoll = { settleSeconds: 2 };

    }
    return;
  }
  const target = ctx.place.players.filter(p => !p.state?.dead && (p.state?.hp ?? 1) > 0 && p.feetPosition.y < O.y + 3 && p.feetPosition.z > O.z + 29 && p.feetPosition.z < O.z + 50).sort((a, b) => Math.hypot(a.feetPosition.x-me.feetPosition.x,a.feetPosition.z-me.feetPosition.z)-Math.hypot(b.feetPosition.x-me.feetPosition.x,b.feetPosition.z-me.feetPosition.z))[0];
  if (!target) { if (me.session.aiming) { me.session.aiming = false; aimPose(me, famOf("m72"), null); } return; }
  if (!me.session.aiming) { me.session.aiming = true; aimPose(me, famOf("m72"), "aim"); } // shoulders the tube while he has you in sight
  const p = me.feetPosition, q = target.feetPosition, dx = q.x-p.x, dz = q.z-p.z, distance = Math.hypot(dx,dz) || 1;
  me.rotation = { yaw: Math.atan2(-dx,-dz) * 180 / Math.PI };
  const origin = { x: p.x, y: p.y+1.3, z: p.z }, aim = { x: q.x, y: q.y+0.8, z: q.z }, dy=aim.y-origin.y, length=Math.hypot(dx,dy,dz);
  const obstruction=raycast(ctx, origin, { x:dx/length,y:dy/length,z:dz/length }, { distance: length, bodies:"all", physicsOnly:true, ignoreEntities:[me.id,target.id] });
  if (obstruction || now < (s.nextAttack ?? 0)) return;
  const grenade = (s.shots ?? 0) % 3 === 2;
  s.shots = (s.shots ?? 0) + 1;
  s.nextAttack = now + (grenade ? 5200 : 4200);
  const speed=grenade ? 10 : 20;
  ctx.spawn({ tags:["b3-projectile"], feetPosition:{ x:origin.x+dx/length*0.7,y:origin.y,z:origin.z+dz/length*0.7 }, lifetime:5, physics:"none", behavior:"scripts/b3-explosive.js", primitive:{ kind:"sphere", radius:grenade ? 0.09 : 0.07 }, material:{ color:grenade ? "#555844" : "#ef9c42", emissive:grenade ? "#000000" : "#d65c18" }, state:{ owner:me.id, grenade, vel:{ x:dx/length*speed,y:dy/length*speed+(grenade?4:0),z:dz/length*speed } } });
  if (grenade) react3(ctx, me, "throw"); else fire3(ctx, me, "m72"); // the throw or the shot plays on his body (Shelly Nov 14: NPCs had no firing animations)
  ctx.emit("playSound", { clip: grenade ? "/cdn/moodboard-realistic-gritty/sfx-grenade-pin-pull-metal-click.mp3" : "/cdn/moodboard-realistic-gritty/sfx-shoulder-rocket-launcher-whoosh-blast-backblast-hiss.mp3", position:origin, volume:0.9, maxDistance:30 });
}
export const updateSchedule = { every: { seconds: 0.15 } };
