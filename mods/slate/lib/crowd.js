// PLAYERS app ops: the refresh button asks Savi to pull fresh numbers and notes; comment folds and filters are per player.
export function crowdOp(ctx,p,d,plan){
 if(d.op==='crowdRefresh'){const last=plan.statsAsked||0;if(ctx.now()-last<60000)return false;plan.statsAsked=ctx.now();plan.statsDone=false;
  ctx.notifyDm(`SLATE players refresh from ${p.displayName}: pull the game page numbers, the new player notes and the live slate_play top players into world.state.plan (stats, community, top, communityAt), then clear plan.statsAsked.`,{wake:true});return true;}
 if(d.op==='crowdF'){p.state.crowdF=['all','new','open','ticket'].includes(d.f)?d.f:'all';return false;}
 if(d.op==='crowdFold'){const f=new Set(p.state.crowdFold||[]);if(d.all!==undefined){for(const x of (Array.isArray(d.all)?d.all:[]).slice(0,200))d.close?f.add(String(x).slice(0,40)):f.delete(String(x).slice(0,40));}else{const k=String(d.k).slice(0,40);f.has(k)?f.delete(k):f.add(k);}p.state.crowdFold=[...f].slice(-300);return false;}
 return false;
}
