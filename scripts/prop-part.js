import {animate} from 'builtin/tween'
import {MOTION_MS,sampleMotion,propFrames} from './lib/prop-easing.js'
export function movePart(ctx, part, goal) {
 if (!part || part.state.goal === goal) return
 part.state.goal = goal
 ctx.emit('propMotion', { goal }, { to: part.id })
}
export const ears = {
 propMotion(ctx, { goal }) {
  if (ctx.self.state.goal === goal) update(ctx)
 },
}
export function update(ctx){
 const s=ctx.self.state,m=ctx.self.session,now=ctx.now(),goal=s.goal?1:0
 let motion=s.motion
 if(motion&&motion.goal!==goal||!motion&&(s.value??goal)!==goal){const from=sampleMotion(motion,now)??s.value??goal;motion={from,goal,at:now,duration:s.axis==='light'?260:MOTION_MS};s.motion=motion}
 if(!motion){ctx.sleep();return}
 const value=sampleMotion(motion,now),left=motion.duration-(now-motion.at)
 if(left>0){const key=motion.at+':'+motion.goal;if(m.nativeAt!==key){m.nativeAt=key;animate(ctx,ctx.self.id,propFrames(s,value,goal),{duration:left/1000,easing:'easeOutCubic'})}return}
 if(s.axis==='light')ctx.self.light={...ctx.self.light,intensity:goal*s.power}
 else if(s.axis==='slide')ctx.self.feetPosition={...s.rest,z:s.rest.z+s.travel*goal}
 else ctx.self.rotation={[s.axis]:s.travel*goal}
 s.value=goal;s.motion=null;m.nativeAt=null;ctx.sleep()
}
