import { raycast } from 'builtin/physics'
// Sight includes movable cover and doors; bodies and pickups do not hide a target.
export function clearSight(ctx, from, to, ignore = []) {
  const dx=to.x-from.x, dy=to.y-from.y, dz=to.z-from.z, distance=Math.hypot(dx,dy,dz)
  if(distance<0.001) return true
  return !raycast(ctx,from,{x:dx/distance,y:dy/distance,z:dz/distance},{distance,physicsOnly:true,bodies:'all',excludeTags:['player','npc','hound','smiler','lurker','rat','stealer','deathmoth','weapon','ammo','almond'],ignoreEntities:ignore})
}
