// Badges count what's new to YOU since you last opened that app; totals sit under the icon. Opening an app marks it read.
export const APP_OF={board:'board',miles:'board',cam:'board',sprints:'board',diary:'diary',crowd:'crowd',gallery:'gallery'};
export function idsOf(app,plan,loom){
 if(app==='board')return (plan.cards||[]).filter(c=>c.col!=='done').map(c=>c.v?c.id+'~'+c.v:c.id); // ~v: an edit (savi's or anyone's bump) makes a card new again
 if(app==='diary')return [...(loom?.pages||[]).map(p=>p.id),...(plan.diary||[]).map(e=>e.id)];
 if(app==='crowd')return (plan.community||[]).map(c=>c.id);
 if(app==='gallery')return (plan.shots||[]).map(s=>s.id);
 return [];
}
export function unseen(app,plan,loom,p){const s=p?.state?.slateSeen?.[app];if(!s)return 0;const set=new Set(s);return idsOf(app,plan,loom).filter(i=>!set.has(i)).length;}
export function markSeen(p,apps,plan,loom){const s={...(p.state.slateSeen||{})};for(const a of apps)s[a]=idsOf(a,plan,loom).slice(-600);p.state.slateSeen=s;}
