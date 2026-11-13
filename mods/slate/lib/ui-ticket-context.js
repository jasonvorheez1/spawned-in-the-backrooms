// Read-only placement context. Missing references are not silently called Backlog.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function ticketContext(plan,c){
 const project=(plan.projects||[]).find(p=>p.id===c.proj),sprint=(plan.sprints||[]).find(s=>s.id===c.sprint);
 const projectName=project?.name||(c.proj?'Unavailable project':'No project');
 const mismatch=sprint&&(sprint.proj||'')!==(c.proj||'');
 const sprintName=!c.sprint?'Backlog':!sprint?'Unavailable sprint':mismatch?'Sprint belongs to another project':sprint.name||sprint.key||'Unnamed sprint';
 const sprintState=sprint&&!mismatch?(sprint.state==='closed'?'Closed sprint':sprint.state==='active'?'Active sprint':'Planned sprint'):!c.sprint?'Not assigned to a sprint':'Check assignment in Details';
 return `<section class="st-context" aria-label="Ticket context"><div class="st-context-cell"><span class="st-context-icon" aria-hidden="true">◎</span><div><span class="st-context-label">${project?.kind==='mod'?'Mod':'Project'}</span><strong>${esc(projectName)}</strong></div></div><div class="st-context-cell"><span class="st-context-icon" aria-hidden="true">≋</span><div><span class="st-context-label">Sprint</span><strong>${esc(sprintName)}</strong><small>${esc(sprintState)}</small></div></div></section>`;
}
export const CONTEXT_CSS=`<style>.sl-ticket .st-context{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:#142b40;border:1px solid #304b64;border-radius:12px;padding:14px 16px;margin:0 0 18px}.sl-ticket .st-context-cell{display:flex;align-items:flex-start;gap:11px;min-width:0}.sl-ticket .st-context-cell>div{min-width:0}.sl-ticket .st-context-icon{color:#9fc9e9;font-size:23px;line-height:1.4}.sl-ticket .st-context-label{display:block;color:#afcbe1;font-size:12px}.sl-ticket .st-context strong{display:block;font-size:14px;font-weight:550;color:#f3ead7;overflow-wrap:anywhere}.sl-ticket .st-context small{display:block;font-size:11px;color:#afc1d0;margin-top:3px}@container sl-ticket (max-width:360px){.sl-ticket .st-context{grid-template-columns:minmax(0,1fr);padding:12px;gap:12px}}</style>`;
