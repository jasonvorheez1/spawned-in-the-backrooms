// One navigation layer for every walker (M.E.G. agents, 6.1 staff, Level 5 hotel staff, Level 11 commuters).
// builtin/nav plans over the colliders as they stand; this adds what a crowd needs on top:
//  - one search budget per tick on this machine, shared by every script (no more 3 scripts × 2 searches in one frame)
//  - a short route cache: a crowd heading the same way reuses one search
//  - one body radius, so paths keep a shoulder's width off walls and counters
// Every number is Savi's pick (Nov 8, Shelly: "update navmesh system").
import { findPath } from "builtin/nav";
export const NAV = { radius: 0.32, perTick: 3, cacheMs: 500, cacheMax: 256 };
let AT = -1, N = 0;
const CACHE = new Map();
export function navBudget(now) { if (now !== AT) { AT = now; N = 0; } return N < NAV.perTick; }
const copy = (r) => ({...r, points:r.points?.map(p=>({...p})) ?? r.points});
// Exact endpoints and options prevent reusing a route from the other side of a wall or for a wider body.
export function navPath(ctx, from, to, opts = {}) {
  const a={x:from.x,y:from.y??0,z:from.z}, b={x:to.x,y:to.y??from.y??0,z:to.z};
  if (![...Object.values(a),...Object.values(b)].every(Number.isFinite)) return {ok:false,partial:false,points:[]};
  const {fresh,...options}=opts, request={radius:NAV.radius,...options}, now=ctx.now();
  const k=JSON.stringify([ctx.self?.place??'',a,b,request]), c=CACHE.get(k);
  if (!fresh && c && now-c.at<NAV.cacheMs) return {...copy(c.result),cached:true};
  if (!navBudget(now)) return {wait:true,points:null};
  N++;
  const result=findPath(ctx,a,b,request);
  if (result?.ok && result.points?.length) {
    CACHE.set(k,{result:copy(result),at:now});
    if(CACHE.size>NAV.cacheMax) CACHE.delete(CACHE.keys().next().value);
  } else CACHE.delete(k);
  return copy(result??{ok:false,partial:false,points:[]});
}
