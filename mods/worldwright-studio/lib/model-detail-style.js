// Slate detail inspector. All controls stay inside the shell's existing chrome reservation.
export const CSS = `
#wwa-cursor{position:absolute;top:8px;left:8px;z-index:3;display:flex;flex-direction:column;gap:3px;padding:4px;background:rgba(28,35,37,.86);border:1px solid var(--sb-line,#464b4b);border-radius:6px}
#wwa-cursor button{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:86px;min-height:34px!important;padding:3px 7px!important;font-size:11px!important;text-align:left}
#wwa-cursor kbd{font:9px monospace;opacity:.6}#wwa-cursor button[aria-pressed=true],.wwa-cursor-sub button[aria-pressed=true]{background:var(--sb-accent,#d9b879)!important;color:#1b2225!important;border-color:var(--sb-accent,#d9b879)!important}
.wwa-cursor-sub{position:absolute;top:8px;left:112px;right:8px;z-index:3;display:flex;flex-wrap:wrap;align-items:center;gap:3px;padding:4px;background:rgba(28,35,37,.86);border:1px solid var(--sb-line,#464b4b);border-radius:6px;width:max-content;max-width:calc(100% - 120px)}
.wwa-cursor-sub button{min-height:34px!important;padding:3px 9px!important;font-size:11px!important}.wwa-cursor-sub span{font-size:10px;opacity:.85;min-width:44px;text-align:center}.wwa-cursor-sub .wwa-cursor-gap{min-width:6px}
#wwa-cursor-hint{position:absolute;bottom:26px;left:112px;right:8px;z-index:2;pointer-events:none;font-size:11px;color:#f1e6cf;text-shadow:1px 1px #000}
#wwa-canvas[data-cursor=brush]{cursor:crosshair}#wwa-canvas[data-cursor=add]{cursor:copy}#wwa-canvas[data-cursor=remove]{cursor:not-allowed}#wwa-canvas[data-cursor=duplicate]{cursor:copy}
@media(pointer:coarse){#wwa-cursor button,.wwa-cursor-sub button{min-height:42px!important}}
@media(max-width:520px){#wwa-cursor{flex-direction:row;flex-wrap:wrap;right:8px;top:auto;bottom:8px}#wwa-cursor button{min-width:0}#wwa-cursor kbd{display:none}.wwa-cursor-sub{left:8px;max-width:calc(100% - 16px)}#wwa-cursor-hint{left:8px;bottom:auto;top:56px}}
#wwa-dom[data-mode=model]{overflow:hidden}
#wwa-dom[data-mode=model] .wwa-main{min-height:0}
#wwa-dom[data-mode=model] #wwa-inspector{width:286px;overscroll-behavior:contain;scrollbar-gutter:stable}
#wwa-dom[data-mode=model] #wwa-nodes{height:76px}
#wwa-detail{padding:10px 0 8px;border-bottom:1px solid var(--sb-line,#464b4b)}
#wwa-detail header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
#wwa-detail header strong{font-size:14px}#wwa-detail header span{font-size:9px;letter-spacing:.06em;color:var(--sb-ink-dim,#b9c5c7)}
#wwa-detail-part{font-size:11px;line-height:1.3;overflow-wrap:anywhere;margin-bottom:8px;color:var(--sb-ink-dim,#b9c5c7)}
#wwa-detail .wwd-kinds{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}
#wwa-detail .wwd-kinds button{grid-column:span 2;font-size:11px;font-weight:600;padding:5px 2px}
#wwa-detail .wwd-kinds button:nth-child(-n+2){grid-column:span 3;font-size:13px}
#wwa-detail button[aria-pressed=true]{border-color:var(--sb-accent,#d9b879);box-shadow:inset 0 -2px 0 var(--sb-accent,#d9b879)}
#wwa-detail .wwd-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px}
#wwa-detail label{margin:7px 0 0}#wwa-detail input,#wwa-detail select{display:block;width:100%;margin-top:3px;min-width:0;font-size:11px}
#wwa-detail .wwd-colour{align-items:center;margin-bottom:8px}#wwa-detail input[type=color]{height:32px;padding:3px}
#wwa-detail small{font-size:10px;line-height:1.35;color:var(--sb-ink-dim,#b9c5c7)}
#wwa-detail-stamp{width:100%;font-weight:600}#wwa-detail[data-armed=true] #wwa-detail-stamp{outline:2px solid var(--sb-accent,#d9b879);outline-offset:2px}
#wwa-detail-reason{font-size:11px;line-height:1.4;margin:8px 0;overflow-wrap:anywhere}
#wwa-detail .wwd-compare{display:flex;align-items:center;gap:4px;margin-bottom:6px}#wwa-detail .wwd-compare span{font-size:10px;margin-left:auto;color:var(--sb-ink-dim,#b9c5c7)}
#wwa-detail-protect,#wwa-detail-clear{width:100%;font-size:11px;margin:3px 0}
#wwa-detail-counts{font-size:10px;line-height:1.5;color:var(--sb-ink-dim,#b9c5c7);padding:5px 0}
#wwa-detail-work{padding:8px;margin-top:4px;background:var(--sb-field,#1c2325);border-left:2px solid var(--sb-accent,#d9b879)}
#wwa-detail-work progress{width:100%;height:7px;accent-color:var(--sb-accent,#d9b879)}#wwa-detail-message{display:block;font-size:11px;line-height:1.4;margin:5px 0;overflow-wrap:anywhere}
#wwa-detail .wwd-scope{opacity:1;color:var(--sb-ink-dim,#b9c5c7);font-size:10px;margin:6px 0 0;line-height:1.4}
#wwa-detail-armed{position:absolute;top:10px;left:10px;right:10px;pointer-events:none;z-index:1;background:var(--sb-field,#1c2325);color:var(--sb-ink,#e7e3db);border-left:3px solid var(--sb-accent,#d9b879);padding:9px 12px;box-shadow:2px 3px 0 #141a1c;font-size:11px}
#wwa-detail-source{position:absolute;inset:10px;z-index:4;margin:auto;width:400px;max-width:calc(100% - 20px);height:fit-content;max-height:calc(100% - 20px);overflow:auto;background:var(--sb-panel,#2a2e2f);color:var(--sb-ink,#e7e3db);border:1px solid var(--sb-accent,#d9b879);box-shadow:3px 4px 0 #141a1c;padding:16px}
#wwa-detail-source p{font-size:12px;line-height:1.5;overflow-wrap:anywhere}#wwa-detail-source>div{display:flex;gap:6px;flex-wrap:wrap}
#wwa-detail button:focus-visible,#wwa-detail input:focus-visible,#wwa-detail select:focus-visible{outline:2px solid var(--sb-accent,#d9b879);outline-offset:2px}
@media(max-width:1000px){#wwa-dom[data-mode=model] #wwa-inspector{width:260px}}
@media(max-width:750px){#wwa-dom[data-mode=model] #wwa-inspector{width:228px}}
/* On a phone, the Model page temporarily takes the book/metadata pane width.
   Back restores those panes automatically: no preference or editor-mode write.
   The outer shell still owns the Spawn rail gutter. Tablets and other editors
   retain their existing layout and controls. */
@media(max-width:520px){#sb-body:has(#wwa-dom[data-mode=model])>#sb-nav,#sb-body:has(#wwa-dom[data-mode=model])>#sb-meta,#sb-body:has(#wwa-dom[data-mode=model])>#sb-handle-nav,#sb-body:has(#wwa-dom[data-mode=model])>#sb-handle-meta{display:none}
#wwa-dom[data-mode=model] #wwa-inspector{width:100%;max-height:52%;flex:1 1 52%}#wwa-dom[data-mode=model] #wwa-viewport{min-height:125px;flex:1 1 48%}}
`;
