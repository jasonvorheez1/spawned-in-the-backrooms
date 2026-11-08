// Five concise guides. Pure render: no database access or document writes.
const DOCS = require('lib/data/docs.yml');
const COMPAT = require('lib/data/supported-mods.yml');
const REFS = require('lib/refs.js');
const PAGEUI = require('lib/ui-page.js');
export function E(s){return REFS.escapeText(String(s??''));}
export function Q(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
export function slug(s){return String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
export function topics(){return (DOCS.topics||[]).map(t=>({id:String(t.id||slug(t.title)),title:String(t.title||''),body:String(t.body||''),sections:(t.sections||[]).map(s=>({id:String(s.id||slug(s.title)),title:String(s.title||''),body:String(s.body||'')}))}));}
export function topicForLabel(label){const raw=String(label??'').trim(),want=slug(raw),target=DOCS.legacyTopics?.[want]||want;return topics().find(t=>t.id===target||slug(t.title)===target)?.id||null;}
export function literalSegments(src){const text=String(src??'');return text?[{kind:'text',start:0,end:text.length,plain:text,html:E(text)}]:[];}
export function articleHtml(body){const text=String(body||'');return PAGEUI.mdRender(text,literalSegments(text))||'';}
export function railRow(t,id){return `<button type="button" class="sbd-row${t.id===id?' on':''}" ${t.id===id?'aria-current="page"':''} data-interactive onclick="event.stopPropagation();sendAction('docsOpen',{topic:'${Q(t.id)}'})">${E(t.title)}</button>`;}
export function compatibility(ui){
 const list=Array.isArray(ui.supportedMods)?ui.supportedMods:[];
 return `<div class="sbd-compat"><div class="sbd-compat-head"><strong>Installed status</strong><button type="button" data-interactive onclick="event.stopPropagation();sendAction('modsRefresh',{})">Refresh</button></div><ul>${COMPAT.map(c=>{const r=list.find(v=>v.id===c.id),status=r?String(r.status||'not checked'):'not checked';return `<li><span>${E(c.title)}</span><small>${E(status)}${r?.version?' · '+E(r.version):''}${status==='update available'?' · known '+E(c.knownLatest):''}</small></li>`;}).join('')}</ul></div>`;
}
export function render(ui){
 if(!ui?.docs)return '';const list=topics();if(!list.length)return '';
 const wanted=topicForLabel(ui.docs.topic),active=list.find(t=>t.id===wanted)||list[0];
 return `${styles()}<div id="sb-docs" data-modal><section class="sbd-win" role="dialog" aria-modal="true" aria-labelledby="sbd-title">
 <header class="sbd-head"><span class="sbd-kicker">Docs</span><strong id="sbd-title">${E(active.title)}</strong><button type="button" class="sbd-x" aria-label="Close Docs" data-interactive onclick="event.stopPropagation();sendAction('docsClose',{})">✕</button></header>
 <div class="sbd-body"><nav class="sbd-rail" aria-label="Documentation guides" data-interactive>${list.map(t=>railRow(t,active.id)).join('')}</nav>
 <div class="sbd-picker"><label for="sbd-guide">Guide</label><select id="sbd-guide" data-interactive onchange="event.stopPropagation();sendAction('docsOpen',{topic:this.value})">${list.map(t=>`<option value="${E(t.id)}"${t.id===active.id?' selected':''}>${E(t.title)}</option>`).join('')}</select></div>
 <article class="sbd-article" id="sb-docs-article" data-guide="${E(active.id)}" data-interactive><div class="sbd-intro">${articleHtml(active.body)}</div><p class="sbd-hint">Open a section for controls, workflow and limits.</p>
 ${active.sections.map(s=>`<details class="sbd-section" id="sbd-${E(active.id)}-${E(s.id)}"><summary data-interactive>${E(s.title)}</summary><div class="sbd-copy">${articleHtml(s.body)}${active.id==='general-info'&&s.id==='compatibility'?compatibility(ui):''}</div></details>`).join('')}</article></div></section></div>`;
}
export function styles(){return `<style>
 #sb-docs{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(12px,var(--spawn-safe-area-top,0px)) calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) max(12px,var(--spawn-safe-area-bottom,0px)) max(12px,var(--spawn-safe-area-left,0px));background:color-mix(in oklch,var(--sb-scrim,oklch(.12 0 0)) 62%,transparent);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:auto}
 #sb-docs *{box-sizing:border-box}
 #sb-docs .sbd-win{width:min(860px,100%);height:min(78vh,740px);max-height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--sb-panel,#202731);color:var(--sb-ink,#e2e7ef);border:1px solid var(--sb-line,#536278);border-radius:4px;box-shadow:0 18px 44px var(--sb-shadow,oklch(.10 0 0 / .5));font-size:calc(13px * var(--sb-fs,1))}
 #sb-docs .sbd-head{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:6px 8px 6px 14px;background:var(--sb-panel-2,#293241);border-bottom:1px solid var(--sb-line,#536278)}
 #sb-docs .sbd-kicker{color:var(--sb-ink-dim,#a7b5c9);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
 #sbd-title{min-width:0;flex:1;color:var(--sb-accent,#93d1ed);font-size:calc(14px * var(--sb-fs,1));overflow-wrap:anywhere}
 #sb-docs button,#sb-docs select{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}
 #sb-docs .sbd-x{flex:0 0 44px;width:44px;height:44px;border:1px solid transparent;border-radius:3px;background:transparent;color:var(--sb-ink-dim,#a7b5c9)}
 #sb-docs .sbd-x:hover,#sb-docs .sbd-row:hover{background:var(--sb-hover,#3a495f);color:var(--sb-ink,#e2e7ef)}
 #sb-docs :is(button,summary,select):focus-visible{outline:2px solid var(--sb-accent,#93d1ed);outline-offset:-3px}
 #sb-docs .sbd-body{flex:1;min-height:0;display:flex;overflow:hidden}
 #sb-docs .sbd-rail{flex:0 0 172px;min-height:0;overflow:auto;padding:8px 6px;display:flex;flex-direction:column;gap:4px;background:var(--sb-center,#18222c);border-right:1px solid var(--sb-line,#536278)}
 #sb-docs .sbd-row{width:100%;min-height:44px;text-align:left;padding:8px 10px;line-height:1.35;border:1px solid transparent;border-radius:3px;background:transparent;color:var(--sb-ink-dim,#a7b5c9);overflow-wrap:anywhere}
 #sb-docs .sbd-row.on{background:var(--sb-hover-hi,#344658);color:var(--sb-accent,#93d1ed);border-color:var(--sb-line,#536278);font-weight:600}
 #sb-docs .sbd-picker{display:none}
 #sb-docs .sbd-article{flex:1;min-width:0;min-height:0;overflow:auto;padding:18px 20px 26px;line-height:1.55;overflow-wrap:anywhere}
 #sb-docs .sbd-hint{font-size:11px;color:var(--sb-ink-dim,#a7b5c9);margin:10px 0}
 #sb-docs .sbd-section{border-top:1px solid var(--sb-line,#536278)}
 #sb-docs .sbd-section:last-child{border-bottom:1px solid var(--sb-line,#536278)}
 #sb-docs summary{min-height:44px;padding:12px 4px;cursor:pointer;line-height:1.35;font-weight:600;color:var(--sb-accent,#93d1ed);touch-action:manipulation}
 #sb-docs .sbd-copy{padding:0 4px 12px}
 #sb-docs .sbp-p{margin:0 0 .8em}#sb-docs .sbp-list{margin:0 0 .8em;padding-left:1.45em}#sb-docs .sbp-list li{margin:0 0 .35em}
 #sb-docs .sbp-h{font-size:1.1em;color:var(--sb-accent,#93d1ed);line-height:1.3;margin:1em 0 .5em}
 #sb-docs .sbp-code{background:var(--sb-field,#18222c);padding:0 3px;border-radius:2px;font-family:ui-monospace,monospace;font-size:.9em}
 #sb-docs .sbp-pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:0 0 .8em;padding:9px;border:1px solid var(--sb-line,#536278);background:var(--sb-field,#18222c);border-radius:3px;font:calc(11.5px * var(--sb-fs,1))/1.5 ui-monospace,monospace}
 #sb-docs .sbp-quote{border-left:2px solid var(--sb-line,#536278);margin:0 0 .8em;padding-left:10px}
 #sb-docs .sbd-compat{margin:10px 0;border:1px solid var(--sb-line,#536278);padding:8px}
 #sb-docs .sbd-compat-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
 #sb-docs .sbd-compat button{min-height:44px;padding:6px 12px;background:var(--sb-field,#18222c);border:1px solid var(--sb-line,#536278);border-radius:3px}
 #sb-docs .sbd-compat ul{list-style:none;margin:6px 0 0;padding:0}#sb-docs .sbd-compat li{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 0}#sb-docs .sbd-compat small{color:var(--sb-ink-dim,#a7b5c9)}
 #sb-docs .sbd-rail,#sb-docs .sbd-article{touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
 @media(max-width:620px){#sb-docs .sbd-win{height:100%;width:100%}#sb-docs .sbd-head{gap:8px;padding-left:10px}#sb-docs .sbd-kicker{display:none}#sb-docs .sbd-body{flex-direction:column}#sb-docs .sbd-rail{display:none}#sb-docs .sbd-picker{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--sb-line,#536278)}#sb-docs .sbd-picker label{font-size:11px;color:var(--sb-ink-dim,#a7b5c9)}#sb-docs .sbd-picker select{min-width:0;flex:1;min-height:44px;background:var(--sb-field,#18222c);border:1px solid var(--sb-line,#536278);padding:6px;border-radius:3px}#sb-docs .sbd-article{padding:14px 12px 22px;font-size:calc(13px * var(--sb-fs,1))}}
 </style>`;}
module.exports={render,styles,topics,topicForLabel,slug};
