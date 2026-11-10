export const MOTION_MS=480
export const sampleMotion=(motion,now)=>{if(!motion)return null;const t=Math.max(0,Math.min(1,(now-motion.at)/motion.duration));return motion.from+(motion.goal-motion.from)*(1-(1-t)**3)}
export function propFrames(s,from,to){
 const path=s.axis==='light'?'light.intensity':s.axis==='slide'?'feetPosition.z':'rotation.'+s.axis
 const value=v=>s.axis==='light'?v*s.power:s.axis==='slide'?s.rest.z+s.travel*v:s.travel*v
 return {[path]:[value(from),value(to)]}
}
