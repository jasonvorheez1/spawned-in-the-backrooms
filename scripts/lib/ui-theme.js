// Shared field UI. Keep accents for selection and warnings, not every edge of every panel.
export const UI_THEME = `<style id="field-ui">
:root{--ui-bg:#151815;--ui-raised:#20251f;--ui-line:#3f473b;--ui-text:#eeeadd;--ui-muted:#aab09f;--ui-accent:#d5b77b;--ui-display:Bahnschrift,"Arial Narrow",sans-serif;--ui-font:'Segoe UI',Arial,sans-serif}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio) .journal-panel){box-sizing:border-box;background:var(--ui-bg)!important;color:var(--ui-text);border:1px solid var(--ui-line)!important;border-radius:2px!important;box-shadow:0 18px 64px #0006!important;font-family:var(--ui-font)!important;text-transform:none;letter-spacing:0;animation:none!important;text-shadow:none!important}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)) *{box-sizing:border-box;text-shadow:none!important;letter-spacing:normal}
:is(.pbp,#sh,#cc)::before,:is(.pbp,#sh,#cc)::after{display:none!important}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)) :is(button,input,select){font-family:var(--ui-font)!important;text-transform:none;letter-spacing:0;box-shadow:none;transition:background .12s,color .12s}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)) button{min-height:32px;border-radius:2px;cursor:pointer}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)) button:focus-visible{outline:2px solid var(--ui-accent)!important;outline-offset:3px}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)) button:disabled{cursor:default;opacity:.4}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio)){scrollbar-width:thin;scrollbar-color:#636c5b transparent}
.pb{--a:var(--ui-text);--ab:#f3f3e9;--ad:var(--ui-muted);--al:var(--ui-line);text-transform:none;text-shadow:none;font-family:var(--ui-font)}
.pbw{background:#07090780}
.pbp.hg{width:min(1060px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));height:min(720px,calc(100dvh - 48px));max-height:none;min-height:0}
.hg-top{padding:20px 22px 16px;background:none;border-bottom:1px solid var(--ui-line);gap:24px;flex-wrap:wrap}
.hg-brand h2{font-family:var(--ui-display);font-size:28px;font-weight:500;letter-spacing:.015em}
.hg-brand :is(sup,.hg-led,.hg-cur){display:none}
.hg-modes{gap:16px}.hg-modes button{border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:6px 0;color:var(--ui-muted);font-size:13px}
.hg-modes button.on{background:none;color:var(--ui-text);border-color:var(--ui-accent)}
.hg-modes button:hover{transform:none;color:#fff}.hg-modes kbd{display:none}
.hg-vit{gap:18px}.hg-gauge,.hg-chip{border:0;background:none;padding:0;min-width:48px}.hg-gauge{min-width:84px}
.hg-gauge span,.hg-chip span{font-size:10px;letter-spacing:.08em}.hg-gauge b,.hg-chip b{font-size:15px;font-variant-numeric:tabular-nums}.hg-chip.cash b{color:var(--ui-text)}
.hg-gauge .bar{height:2px;margin-top:5px}.hg-gauge .bar em{background:var(--ui-accent);box-shadow:none}
.hg-qrow{padding:12px 22px;background:none;gap:12px}.hg-qt{font-size:10px;letter-spacing:.08em;max-width:150px}.hg-qt small{white-space:normal;font-size:11px;line-height:1.4;margin-top:5px}
.hg-q{height:56px;border:1px solid var(--ui-line);background:#1d201b;border-radius:0;padding:5px;transform:none!important}.hg-q .k{color:var(--ui-accent);font-size:11px}.hg-q .v{font-size:11px}
.hg-q.mine{border-width:1px;border-color:var(--ui-accent);background:#34372b}.hg-q.arm::before{display:none}.hg-q .x{opacity:1;top:0;right:0;bottom:auto;width:24px;height:24px;min-height:24px;line-height:24px;border:0;background:none}.hg-q .c{top:22px;left:5px;right:auto}
.hg-rail{flex-basis:145px;padding:14px 10px;background:none}.hg-rb{min-height:38px!important;padding:8px 10px;font-size:13px;animation:none!important}.hg-rb .g{display:none}.hg-rb .n{background:none;font-variant-numeric:tabular-nums;color:var(--ui-muted)}
.hg-rb.on{background:#30352b;color:#f0eedf;border-color:transparent;border-left:2px solid var(--ui-accent)}.hg-rb:hover{padding-left:10px;background:#272c24}
.hg-mid{padding:14px 18px}.hg-sort{padding-bottom:12px;border-bottom:1px solid var(--ui-line);font-size:11px}.hg-sort button{border:0;border-radius:0;padding:4px 6px;font-size:11px;min-height:28px!important}.hg-sort button.on{color:var(--ui-accent);text-decoration:underline;text-underline-offset:6px}
.pbp.hg .it{min-height:40px;padding:9px 8px;border-bottom:1px solid #2c3128;border-radius:0;animation:none!important}.pbp.hg .it:hover{transform:none;background:#262c23}.pbp.hg .it.sel{background:#30372b;box-shadow:inset 2px 0 0 var(--ui-accent)}.pbp.hg .it.sel .cur{animation:none;color:var(--ui-accent)}
.pbp .it .nm{font-size:14px}.pbp .it .eq-tag{border:0;color:var(--ui-accent);font-size:10px}.pbp .it .stat-r{font-variant-numeric:tabular-nums}.pbp.hg .sec{color:var(--ui-muted);font-size:10px;letter-spacing:.1em;margin:18px 0 7px}.pbp.hg .sec::after{background:var(--ui-line)}
.hg-card{flex-basis:300px;padding:22px;background:#1c201a;animation:none}.hg-card .dt-header{gap:10px;flex-wrap:wrap;margin-bottom:18px}.hg-card h4{font-size:23px;line-height:1.2;font-weight:500}.dt-rarity{border:0;padding:0;font-size:10px;color:var(--ui-muted)}
.pbp .g{gap:3px 14px}.pbp .g div{padding:7px 0;font-size:12px}.pbp .acts{gap:8px;margin-top:20px}.pbp .acts .act{background:var(--ui-accent);color:#20231b;border:0;border-radius:2px;font-weight:600;min-height:36px}
.pbp .acts .drop{background:transparent;color:var(--ui-muted);border:1px solid var(--ui-line)}
.pbp .acts .drop:hover{background:#362a23;color:#f1d9c8;border-color:#8f6d58}
#hud-quest>div{background:#141914e8!important;box-shadow:none!important;border-left-width:2px!important}
#hud-quest .q-destination{margin-left:auto;font-size:10px;color:var(--ui-muted)}
#hud-quest .q-next{display:block;margin-top:4px;color:var(--ui-text);font-size:11px;line-height:1.35}
.quest-route{margin:12px 0 0;font-size:13px;color:var(--ui-muted);line-height:1.5}
.quest-route b{color:var(--ui-accent);margin-right:6px}
#hud-quest .qs{color:var(--ui-text)!important;line-height:1.45!important}
.pbp .rep-box{background:none;border-color:var(--ui-line)}.pbp .rep-btn{background:none;border-color:var(--ui-line);padding:8px;color:var(--ui-text)}
.hg-ft{padding:12px 22px;border-top:1px solid var(--ui-line);background:none;gap:14px}.hg-ft .c{display:none}.hg-ft button{margin-left:auto;border-color:var(--ui-line);color:var(--ui-text);padding:5px 12px}.hg-ft .hint{font-size:10px;letter-spacing:0}
#cr{width:min(860px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));height:min(680px,calc(100dvh - 48px))}
#cr .hd,#sh .hd{padding:20px 24px 16px;border-bottom:1px solid var(--ui-line);gap:12px;flex-wrap:wrap}
:is(#cr,#sh,#cc,#gl) h2{font-size:25px;font-weight:500;color:var(--ui-text);letter-spacing:-.025em}
#cr .md{color:var(--ui-muted);opacity:1;font-size:11px}.tb,#cr .tb{gap:12px;padding:12px 24px 0}
#cr .tb button{color:var(--ui-muted);opacity:1;border:0;border-bottom:2px solid transparent;border-radius:0;padding:6px 0;font-size:12px}
#cr .tb button.on{color:var(--ui-text);border-color:var(--ui-accent);background:none}#cr .tb button i{color:var(--ui-muted)}
#cr .sc{padding:14px 24px;border-color:var(--ui-line);gap:8px 16px}#cr .sc span{border:0;padding:0;color:var(--ui-muted);font-size:11px}#cr .sc b{color:var(--ui-text);font-weight:500}
#cr .sh{padding:18px 24px 7px;font-size:10px;letter-spacing:.12em;color:var(--ui-muted)}#cr .row{padding:15px 24px;gap:22px;border-bottom:1px solid #2c3128}#cr .row.no,#cr .row.lk{opacity:1}
#cr .n{font-size:17px;color:var(--ui-text);font-weight:500}#cr .n em{color:var(--ui-muted);font-size:10px;font-weight:400}#cr .n small{font-size:12px;color:var(--ui-muted);opacity:1;line-height:1.5;font-weight:400;margin-top:4px}
#cr .result{color:#c5ceba;margin:7px 0;font-size:12px;font-weight:400}#cr .in{gap:4px 14px}#cr .in i{color:var(--ui-muted);font-weight:400}#cr .in i.lack{color:#d7a092}#cr .rq{color:var(--ui-muted);font-weight:400;margin-top:7px}#cr .rq .bad{color:#d7a092}
#cr .bt{gap:5px}#cr .bt button{background:var(--ui-accent);border:0;padding:7px 12px;font-size:11px;color:#20231b;white-space:nowrap}#cr .bt button.s{background:none;color:var(--ui-text);border:1px solid var(--ui-line)}#cr .bt button:disabled{background:#30352b;color:#89907f;opacity:1}
#cr .ft{padding:14px 24px;border-color:var(--ui-line);color:var(--ui-muted)}#cr .ft button{background:none;border-color:var(--ui-line);color:var(--ui-text)}
#sh .hd h2{flex-basis:100%}#sh .pt{font-size:12px;letter-spacing:0;color:var(--ui-muted);animation:none!important}#sh .pt b{color:var(--ui-text)}#sh .col{padding:20px 24px}#sh .col+.col{border-color:var(--ui-line)}#sh .sec{color:var(--ui-muted);letter-spacing:.1em;font-size:10px;margin-bottom:14px}
#sh .row{padding:10px 0;border-bottom:1px solid #2c3128;animation:none!important}#sh .row .n{font-size:14px}#sh .row .n small{font-size:11px;color:var(--ui-muted);opacity:1;margin-top:3px;line-height:1.5}#sh .row .v{color:var(--ui-text);font-size:18px;font-variant-numeric:tabular-nums}#sh .pips i{background:#3e4637;height:5px}#sh .pips i.on{background:var(--ui-accent)}#sh button{background:#30372b;border:1px solid var(--ui-line);color:var(--ui-text)}#sh .dv{padding:18px 24px;border-color:var(--ui-line);gap:10px 24px;color:var(--ui-muted)}#sh .dv span b{color:var(--ui-text)}#sh .ft{padding:14px 24px;border-color:var(--ui-line)}
.tc-chassis{width:min(660px,100%);background:none!important;border:0!important;box-shadow:none!important;padding:0!important}.tc-speech-region *{box-sizing:border-box}
.tc-now-txt{font-size:18px;line-height:1.42;color:#f4f1e4;font-family:var(--ui-font)}.tc-waiting{font-size:14px;color:var(--ui-muted)}
.tc-choice:focus-visible{background:#30392b;outline-offset:-2px!important}.tc-choice:disabled{opacity:.45;pointer-events:none}.tc-chk-banner{padding:2px 0 4px;font-size:12px}.tc-chk-pass{color:#b5cfa8}.tc-chk-fail{color:#dfa48d}.tc-check-current{margin:0 0 4px}
.tc-close-btn{background:none!important;border:0!important;color:var(--ui-muted)!important;font-size:11px;min-height:24px!important}
.tkp{width:min(860px,100%);max-height:80dvh;display:flex;flex-direction:column;padding:22px}.tkh{border-color:var(--ui-line)}.tkh h2{font-family:var(--ui-display);font-size:26px;color:var(--ui-text)}.tkh .f{color:var(--ui-muted);font-size:11px}.tkh .r{color:var(--ui-accent);font-variant-numeric:tabular-nums}.tkb{gap:16px;border-color:var(--ui-line)}.tkb button{background:none;border:0;border-bottom:2px solid transparent;border-radius:0;color:var(--ui-muted);padding:10px 0}.tkb button.is-active{color:var(--ui-accent);border-color:var(--ui-accent)}.tks{min-height:0;overflow:auto}.tks button{min-height:44px;border:0;border-bottom:1px solid var(--ui-line);background:none;color:var(--ui-text)}.tks button>span:first-child{min-width:0;flex:1;overflow-wrap:anywhere}.tks button .c{color:var(--ui-accent);font-variant-numeric:tabular-nums}.tks button:disabled{opacity:.55}.tks h4{color:var(--ui-muted);border-color:var(--ui-line)}
#cc{left:24px;top:24px;bottom:24px;width:min(480px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)))}#cc .hd{background:none;border-bottom:1px solid var(--ui-line)}#cc .sub{font-size:11px;letter-spacing:0;text-transform:none;color:var(--ui-muted)}#cc .hd .x{border-left:1px solid var(--ui-line);color:var(--ui-muted)}#cc .tabs{width:92px;background:none;border-color:var(--ui-line)}#cc .tabs button{padding:14px 8px;color:var(--ui-muted);border-color:var(--ui-line)}#cc .tabs button .n{display:none}#cc .tabs button.on{background:#30372b;color:var(--ui-text);box-shadow:inset 2px 0 0 var(--ui-accent)}#cc .sec{color:var(--ui-muted);font-size:10px;letter-spacing:.08em}#cc .sec::after{background:var(--ui-line)}#cc .sec span:last-child{color:var(--ui-text)}#cc .bd{padding:6px 20px 20px}#cc button{box-shadow:none!important}
#bm{background:#171916ed;border-color:var(--ui-line);color:var(--ui-text);font-family:var(--ui-font);text-shadow:none;text-transform:none}#gl .hd{background:none;border-color:var(--ui-line)}
#hud[data-panel-open="true"]{visibility:hidden}body:has(.pbp,#cr,#sh,:is(#journal,#radio)) :is(#nd,#wt,#tg,#tk){visibility:hidden}
#hud{--a:#dbdecf;--ad:#a7af9c;font-family:var(--ui-font);letter-spacing:.015em;text-shadow:0 1px 3px #000;text-transform:none}#hud .fb{height:6px;border:0;background:#10150fb3;box-shadow:none}#hud .fb::after{display:none}#hud .fbi{inset:0}#hud .fbf{background:var(--c,var(--a));filter:none}#hud .pip{height:8px;border-color:#a7af9c}#hud .pip.full{box-shadow:none;background:#dbdecf}#hud .hud-card{border:1px solid var(--ui-line);background:#151a12db;box-shadow:none}#hud .sneak{font-size:14px;letter-spacing:.12em}#hud .dot-crosshair{opacity:.8}#hud kbd{border-color:#757e68;color:#dbdecf}#nd,#wt{color:#c0c6b4;font-family:var(--ui-font);letter-spacing:.04em}
#hud .bl,#hud .br{width:min(260px,30vw)!important}#hud .row{font-variant-numeric:tabular-nums}#hud .fb{margin-top:5px}#hud .fbf{transition:width .2s ease-out}#hud .cmp{height:20px;border:0;border-top:1px solid #eeeadd44;margin-top:12px}#hud .cmp::before{height:1px;opacity:.5}#hud .cmp i{width:1px;height:18px;background:var(--ui-accent)}
.hud-quickbar{position:fixed;bottom:24px;left:28px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);margin:auto;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;width:max-content;max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 608px);pointer-events:auto}.hud-quick-slot{position:relative;display:flex;align-items:center;gap:7px;min-width:32px;min-height:32px;padding:6px 8px;border:1px solid #626b5777;border-radius:0;background:#141a14e6;color:var(--ui-text);font:inherit;font-size:11px}.hud-quick-slot kbd{padding:0;margin:0;border:0;color:var(--ui-accent)!important;font-size:12px}.hud-quick-name{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 10px;background:#151815;color:var(--ui-text);border:1px solid var(--ui-line);pointer-events:none;opacity:0}.hud-quick-slot:is(:hover,:focus-visible) .hud-quick-name{opacity:1}.hud-quick-slot small{font-variant-numeric:tabular-nums;color:var(--ui-muted)}.hud-quick-slot:disabled{opacity:.45}.hud-quick-slot:hover{border-color:var(--ui-accent);background:#323b29}.hud-quick-slot:focus-visible{outline:2px solid var(--ui-accent);outline-offset:3px}.hud-level-prompt{position:fixed;left:28px;top:24px;font-size:12px;color:var(--ui-accent);border-left:2px solid currentColor;padding:7px 10px;background:#151815cf}
body:has(.tc-chassis) #hud :is(.bl,.br,.hud-quickbar,.hud-level-prompt,#hud-quest,.dot-crosshair,.sneak),body:has(.tkw) :is(#nd,#wt,#tg,#tk){visibility:hidden}
@media(max-width:1200px){.hud-quick-slot small{display:none}}
@media(max-width:760px){.hud-quick-name{display:none}.hud-quickbar{left:90px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 26px);bottom:16px;width:auto;max-width:none;flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;scrollbar-width:thin;scroll-snap-type:x proximity}.hud-quick-slot{flex:0 0 44px;min-height:44px;justify-content:center;scroll-snap-align:start}.hud-level-prompt{top:146px;left:12px}.tc-choice{min-height:42px}.tc-responses-region{padding:8px 10px}.tc-now-txt{font-size:16px}.tkp{padding:16px}.tkh{flex-wrap:wrap}.tkh h2{flex-basis:100%}.hg-q{height:72px;min-width:80px}.hg-q .x{min-width:44px;min-height:44px}.hg-q .c{top:28px}}
#mm{font-family:var(--ui-font);animation:none}#mm h1{font-weight:500;letter-spacing:-.045em;line-height:1.04;font-size:clamp(44px,6vw,86px)}#mm .col{bottom:12vh}#mm button{letter-spacing:.04em;border:0;padding:10px 0;font-size:18px}#mm button:focus-visible{outline:2px solid var(--ui-accent);outline-offset:6px}
#cc{--a:var(--ui-accent);--a2:var(--ui-text);--ink:#20231b}#cc button:not(.sw){background:#252b22;border:1px solid var(--ui-line);color:var(--ui-text);text-transform:none}#cc button.on:not(.sw){background:#3b4331;border-color:var(--ui-accent);color:#f0efdf}#cc .ft{background:none;border-top:1px solid var(--ui-line)}#cc .ft .go{background:var(--ui-accent);color:#20231b}#cc .slot{background:none;border-color:var(--ui-line)}#cc .sl .bar{background:#30372b;border-color:var(--ui-line)}#cc .sl .bar i{background:var(--ui-accent)}#cc .hint{border-color:var(--ui-line)}#cc .sws .sw{min-height:26px}#cc .sl button{min-height:28px}
.pbp .hg-q{border-color:var(--ui-line)}.pbp .hg-q:focus-visible{outline:2px solid var(--ui-accent);outline-offset:2px}.pbp .hg-q.mine{border-color:var(--ui-accent)}.pbp .hg-q .x{min-height:16px;height:16px;padding:0;opacity:.45;bottom:4px;right:4px}.pbp .hg-q .x:hover,.pbp .hg-q .x:focus-visible{opacity:1}
.pbp .condition-meter{display:flex;flex-direction:column;gap:6px;max-width:100%;font-size:12px;font-weight:400}.condition-meter>i{display:block;width:130px;max-width:100%;height:3px;background:#3b4037}.condition-meter>i>b{display:block;height:100%}.pbp .it .cnd-mini{font-weight:400;letter-spacing:0}.pbp .it .eq-tag{background:none!important;padding:0;font-size:9px}
@media(max-width:760px){.pbw{padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 16px 12px;box-sizing:border-box}.pbp.hg{width:100%!important}#cr,#sh{left:12px;transform:translateY(-50%);width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px)}#cc{width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px)!important}:is(#journal,#radio){padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 16px 12px;box-sizing:border-box}
.pbp.hg{height:calc(100dvh - 32px);width:calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 12px))}.hg-top{padding:14px;gap:12px}.hg-brand h2{font-size:22px}.hg-modes{gap:12px}.hg-vit{margin:0;flex-basis:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;min-width:0}.hg-vit .hg-chip,.hg-vit .hg-gauge{min-width:0}.hg-vit b{font-size:13px}.hg-vit b i{font-size:9px}.hg-vit .hg-chip{display:flex}.hg-gauge{min-width:65px}.hg-qrow{padding:10px 14px;display:block;overflow:visible}.hg-qt{max-width:none;display:flex;justify-content:space-between;margin-bottom:6px}.hg-qt small{display:none}.hg-qs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.hg-q{height:35px;min-width:0;flex:none}.hg-q .v{font-size:9px;padding-right:3px}.pbp .hg-q .x{height:12px;min-height:12px;width:12px;font-size:8px;line-height:10px;right:1px;bottom:1px}.hg-q.set .v{padding-right:9px}.hg-q .c{display:none}.hg-bd{display:flex;flex-direction:column;overflow:auto;min-height:0}.hg-rail{flex:none;flex-direction:row;overflow-x:auto;padding:4px 10px;min-height:42px;border-right:0;border-bottom:1px solid var(--ui-line)}.hg-rb{flex:none;white-space:nowrap;padding:6px 8px}.hg-rb .l{display:block}.hg-rb .n{display:none}.hg-mid{flex:none;min-height:160px;padding:10px 14px}.pbp.hg .it .stat-r{font-size:10px;gap:4px}.pbp.hg .it .nm{font-size:12px}.hg-mid{min-width:0}.pbp.hg .ls{max-height:210px;overflow:auto}.hg-sort>span:first-child{display:none}.hg-sort{gap:3px;padding-bottom:6px}.hg-sort button{padding:3px}.hg-card{display:flex;flex:none;border-left:0;border-top:1px solid var(--ui-line);padding:18px 14px;overflow:visible}.hg-card .dt{display:flex}.hg-card h4{font-size:20px}.hg-ft{padding:8px 14px}.hg-ft .hint{display:none}
#cr .hd,#sh .hd{padding:18px}#cr .tb{padding:10px 18px 0;gap:12px}#cr .sc{padding:12px 18px}#cr .row{padding:16px 18px;gap:12px}#cr .n{font-size:16px}#cr .bt button{flex:1}#cr .ft{padding:12px 18px}#cr .sh{padding-left:18px}#cr .md{line-height:1.5}#sh .col{padding:18px}#sh .hd h2{font-size:23px}#sh .pt{font-size:11px}#sh .pips{display:none}.tc-responses-region{padding:8px 10px}.tc-now-txt{font-size:16px}
#hud{visibility:visible}#cc{left:12px;top:16px;bottom:16px;width:calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 12px))}#cc .main{flex-direction:column}#cc .tabs{width:auto;flex-direction:row;flex:none;border-right:0;border-bottom:1px solid var(--ui-line)}#cc .tabs button{flex:1;padding:8px 4px;font-size:10px}#cc h2{font-size:21px}#cc .hd .ttl{padding:16px}#cc .bd{padding:6px 16px 16px}.tkw{padding-left:12px;padding-right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px)}
}
@media(prefers-reduced-motion:reduce){:is(.pbp,#cr,#sh,#cc,.tc-responses-region,.tkp,#hud) *{animation:none!important;transition:none!important}}

/* Brief terminal motion; text stays still after the reveal. */
@keyframes field-open{from{opacity:0;translate:0 9px}to{opacity:1;translate:0 0}}
@keyframes field-row{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
@keyframes field-detail{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes field-tab{from{background-size:0 2px}to{background-size:100% 2px}}
@media(prefers-reduced-motion:no-preference){
:is(.pbp.hg,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio) .journal-panel){animation:field-open .26s cubic-bezier(.2,.7,.2,1) backwards!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice){animation:field-row .18s ease-out backwards!important;animation-delay:60ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice):nth-child(2){animation-delay:80ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice):nth-child(3){animation-delay:100ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice):nth-child(4){animation-delay:120ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice):nth-child(n+5){animation-delay:140ms!important}
.pbp.hg .hg-card{animation:field-detail .2s 80ms ease-out backwards}
:is(.hg-modes button.on,#cr .tb button.on){background-image:linear-gradient(var(--ui-accent),var(--ui-accent));background-repeat:no-repeat;background-position:left bottom;border-bottom-color:transparent;animation:field-tab .18s ease-out both}
:is(.pbp,#cr,#sh,#cc,.tc-responses-region,.tkp,:is(#journal,#radio)) :is(button,.hg-q){transition:background-color .14s,border-color .14s,color .14s,box-shadow .14s}
:is(.hg-gauge .bar em,.condition-meter>i>b,#hud .fbf){transition:width .24s ease-out}
#mm .col{animation:field-detail .32s ease-out backwards}
}
@media(hover:hover){:is(.pbp.hg .it,#cr .row,.tc-choice):hover{background-color:#262d23}.hg-q:hover{border-color:var(--ui-accent)}.hg-rb:hover{box-shadow:inset 2px 0 var(--ui-accent)}}
@media(prefers-reduced-motion:reduce){:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio) .journal-panel,#mm .col),:is(.pbp,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio),#mm) *{animation:none!important;transition:none!important}}

:is(.pbp.hg,#cr,#sh,#cc,#gl,.tc-responses-region,.tkp,:is(#journal,#radio) .journal-panel){box-shadow:0 24px 90px #0009,inset 0 1px 0 #d2c49325!important;border-top-color:#8d9275!important}
.pbp.hg .hg-card{background:#1d231a}.hg-card .dt-header{margin-bottom:24px}.hg-card .dt-header h4{font-size:29px;letter-spacing:-.035em;line-height:1.12}.hg-card .g>div:first-child{align-items:baseline;font-size:18px;font-variant-numeric:tabular-nums;padding:7px 0;color:var(--ui-text)}.hg-card .g>div:first-child span{font-size:11px;letter-spacing:.1em;color:var(--ui-muted)}
.hg-card .acts .act{min-height:40px}.hg-rb.on{box-shadow:inset 2px 0 var(--ui-accent)}
:is(.pbp,#cr,#sh,#cc,.tc-responses-region,.tkp,:is(#journal,#radio)) button:active{background-color:#4c553d;box-shadow:inset 0 0 0 1px var(--ui-accent)}
@keyframes field-trace{0%{opacity:0;transform:scaleX(0)}25%{opacity:1;transform:scaleX(.4)}75%{opacity:.75;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1)}}
@keyframes field-title{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0)}}
@media(prefers-reduced-motion:no-preference){
:is(.pbp.hg,#cr,#sh,#cc)::before{display:block!important;content:'';position:absolute;inset:0 0 auto;height:2px;background:var(--ui-accent);pointer-events:none;z-index:5;transform-origin:left center;animation:field-trace .65s .08s ease-out both}
.pbp.hg .ls .it{transition:background-color .14s,transform .14s}.pbp.hg .ls .it:hover{transform:translateX(3px)}
#mm .col h1{animation:field-title .65s cubic-bezier(.2,.65,.2,1) backwards}
#mm .col>button:first-of-type::after{content:'→';display:inline-block;margin-left:14px;opacity:0;transform:translateX(-6px);transition:opacity .16s,transform .16s}
#mm .col>button:first-of-type:is(:hover,:focus-visible)::after{opacity:1;transform:none}
}
@media(max-width:760px){.hg-card .dt-header h4{font-size:25px}.hg-card .g>div:first-child{font-size:18px}}

.wrist-nav{display:flex;gap:4px;flex:none;overflow-x:auto;padding:0 16px;background:#191e18;border-block:1px solid var(--ui-line);scrollbar-width:thin}
.wrist-nav>*{flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;font-size:13px;white-space:nowrap}
.wrist-nav button,:is(#journal,#radio) .wrist-nav button{border:0!important;margin:0!important;padding:0 14px!important;background:none;color:var(--ui-muted)}
.wrist-nav [aria-current=page]{color:var(--ui-text);background:#272f23;box-shadow:inset 0 -2px var(--ui-accent);font-weight:600}
.wrist-nav button:hover{background:#262e23;color:var(--ui-text)}
.wrist-nav button:focus-visible,.pbp.hg .ls .it:focus-visible{outline-offset:-3px!important}

.craft-stock{border-bottom:1px solid var(--ui-line);flex:none}
.craft-stock summary{cursor:pointer;padding:10px 16px;font-size:13px;color:var(--ui-muted)}
.craft-stock[open] summary{color:var(--ui-text)}
#cr .craft-stock .sc{max-height:22dvh;overflow:auto}
#cr .bt{display:flex;flex-wrap:wrap;justify-content:flex-end}
#mm{background:linear-gradient(90deg,#0b0e0be8 0%,#0b0e0b70 48%,#0b0e0b00 82%),linear-gradient(0deg,#0b0e0bbd,transparent 46%)}
#mm .col{max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 10vw)}
#mm h1{padding-bottom:18px;border-bottom:1px solid #b8b69578;text-wrap:balance}
#mm .col>button{display:flex;align-items:center;justify-content:space-between;width:min(250px,100%);gap:12px;margin-top:12px;opacity:1;text-align:left}
#mm .col>button:first-of-type::after{display:none}
#mm .mm-primary{margin-top:24px!important;background:var(--ui-accent);color:#171a12;padding:10px 16px!important;min-height:52px;font-weight:650;letter-spacing:0;border-radius:2px;transition:background-color .16s}
#mm .mm-primary:hover{background:#f0d49a}
#mm .mm-primary span{font-size:23px;transition:translate .16s}
#mm .mm-primary:is(:hover,:focus-visible) span{translate:4px}
#mm .mm-setting{min-height:44px;padding:6px 2px;font-size:13px;color:var(--ui-muted);letter-spacing:0;border-bottom:1px solid #b8b69558}
#mm .mm-setting strong{color:var(--ui-text);font-weight:600}
.field-shade{position:absolute;inset:0;display:grid;place-items:center;padding:12px calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 12px 12px;background:#090c098f;pointer-events:auto}
.field-dialog{box-sizing:border-box;width:min(410px,100%);max-height:100%;overflow:auto;padding:20px;background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--ui-line);border-top-color:#8d9275;box-shadow:0 24px 90px #0009;font:14px var(--ui-font);text-shadow:none}
.field-dialog header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.field-dialog h2{margin:0 0 14px;font:500 24px var(--ui-display)}
.field-dialog header span,.field-dialog p{color:var(--ui-muted)}
.field-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.field-controls.floors{grid-template-columns:repeat(4,minmax(0,1fr))}
.field-controls.durations{grid-template-columns:repeat(3,minmax(0,1fr))}
.field-dialog button{min-height:44px;border:1px solid var(--ui-line);border-radius:2px;background:var(--ui-raised);color:var(--ui-text);cursor:pointer;font:inherit}
.field-dialog button:hover,.field-dialog button.primary{background:var(--ui-accent);color:#191d16}
.field-dialog .field-cancel{width:100%;margin-top:10px;background:transparent;color:var(--ui-muted)}
#hud:has(.field-shade) :is(.bl,.br,.hud-quickbar,.hud-level-prompt,#hud-quest,.dot-crosshair,.sneak){visibility:hidden}
body:has(.field-shade) :is(#nd,#wt,#tg,#tk){visibility:hidden}
#hubp,#hubo{background:#21192b;color:#f1e9f5;border:1px solid #78588d;border-top:2px solid #cc9ee6;border-radius:2px;box-shadow:0 20px 75px #0009;text-shadow:none;font-family:var(--ui-font)}
#hubp{width:min(560px,calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px));max-height:78dvh;padding:20px;box-sizing:border-box}
#hubp h2{font:500 27px var(--ui-display);letter-spacing:0;text-shadow:none;padding-right:40px}
#hubp .row{border-radius:2px;background:#2b2138;border-color:#513e60;flex-wrap:wrap}
#hubp button,#hubo button{min-height:40px;background:#cfafe6;color:#221b29;border-radius:2px}
#hubp button:not(:disabled):hover,#hubo button:hover{background:#ead2f9}
#hubp button:disabled{background:#40354c;color:#bba8c5}
#hubp .x,#hubp .x:not(:disabled):hover{background:transparent;color:#eee5f4}
#hubp .cash{color:#b9d9c7}
#bm{font-size:13px;max-height:74dvh;overflow:hidden;border-top-color:#8d9275;padding:12px}
#bm h3{border-color:var(--ui-line);font:500 21px var(--ui-display);gap:8px}
#bm .r.on{border-color:var(--ui-line);background:#343a2d;box-shadow:inset 2px 0 var(--ui-accent)}
#bm .i,#bm .ft,#bm .r.no{color:var(--ui-muted)}
:is(#lp-modal,#os,#mj,#spm,#hubp,#hubo,.field-dialog) button:focus-visible,.craft-stock summary:focus-visible{outline:2px solid var(--ui-accent);outline-offset:-3px}
@media(max-width:760px){
  .wrist-nav{padding-inline:4px}.wrist-nav>*,:is(#journal,#radio) .wrist-nav button{min-height:44px;padding-inline:8px!important;font-size:12px}
  .pbp.hg .ls{max-height:125px}.hg-mid{min-height:0}
  .pbp .hg-q .x{min-height:22px;height:22px;width:22px;right:0;top:0;opacity:.8}
  .hg-q.set .v{padding-right:16px}
}
@media(prefers-reduced-motion:no-preference){
  :is(.field-dialog,#hubp,#hubo,#bm){animation:field-open .24s cubic-bezier(.2,.7,.2,1) backwards}
  .wrist-nav [aria-current=page]{background-image:linear-gradient(var(--ui-accent),var(--ui-accent));background-repeat:no-repeat;background-position:left bottom;animation:field-tab .2s ease-out both;box-shadow:none}
}
@media(prefers-reduced-motion:reduce){
  :is(#mm,.field-dialog,#hubp,#hubo,#bm),:is(#mm,.field-dialog,#hubp,#hubo) *{animation:none!important;transition:none!important}
  #mm .mm-primary span{translate:none!important}
}

:is(#journal,#radio){position:fixed;inset:0;display:grid;place-items:center;background:#080a08a6;pointer-events:auto;z-index:60}
:is(#journal,#radio) .journal-panel{display:flex;flex-direction:column;width:min(920px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));height:min(630px,calc(100dvh - 48px));min-height:0}
.journal-header{display:flex;align-items:center;gap:16px;padding:16px 22px}
.journal-header h1{margin:0 auto 0 0;font:500 28px var(--ui-display)}
.journal-header span,.quest-meta,.quest-history,.quest-empty{color:var(--ui-muted)}
.journal-header span{font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.journal-close,.quest-actions button{border:1px solid var(--ui-line);padding:7px 12px;background:var(--ui-raised);color:var(--ui-text)}
.journal-close kbd{margin-left:4px;color:var(--ui-accent);font-size:11px}
.quest-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);flex:1;min-height:0}
.quest-list,.quest-reading{overflow:auto;min-height:0;scrollbar-width:thin}
.quest-list{padding:14px 0;border-right:1px solid var(--ui-line)}
:is(#journal,#radio) .quest-entry{display:flex;align-items:center;gap:12px;width:100%;min-height:43px;padding:9px 16px;text-align:left;background:none;color:var(--ui-text);border:0;border-radius:0;border-left:2px solid transparent;font-size:14px;overflow-wrap:anywhere}
:is(#journal,#radio) .quest-entry[data-status]:not([data-status=Current]){color:var(--ui-muted)}
:is(#journal,#radio) .quest-entry:hover{background:#222a21}
:is(#journal,#radio) .quest-entry[aria-current=true]{background:#2b3428;border-left-color:var(--ui-accent);color:var(--ui-text)}
:is(#journal,#radio) .quest-entry:focus-visible{outline-offset:-3px}
.quest-box{width:9px;height:9px;flex:none;background:var(--quest-marker,transparent)}
.quest-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.quest-reading{background:linear-gradient(135deg,#20261d,#191e18 78%)}
.quest-detail{padding:clamp(16px,3vw,30px);overflow-wrap:anywhere}
.quest-detail h2{font:500 clamp(22px,3vw,34px)/1.1 var(--ui-display);margin:8px 0 22px;text-wrap:balance}
.quest-meta{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:12px}
.quest-meta span:first-child{color:var(--ui-accent)}
.quest-detail h3{margin:0;font-size:12px;font-weight:600;color:var(--ui-muted)}
.quest-objective{border-top:1px solid var(--ui-line);padding-top:15px}
.quest-objective p{position:relative;margin:9px 0 0;padding-left:16px;font-size:16px;line-height:1.5}
.quest-objective p::before{content:'';position:absolute;left:0;top:.6em;width:6px;height:6px;background:var(--ui-accent)}
.quest-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:16px}
.quest-actions button[aria-pressed=false]:not(:disabled){background:var(--ui-accent);color:#1c2017}
.quest-actions button:not(:disabled):hover,.journal-close:hover{border-color:var(--ui-accent)}
.quest-actions small{color:var(--ui-muted)}
.quest-history{margin-top:24px;border-top:1px solid var(--ui-line);padding-top:15px;font-size:14px;line-height:1.5}
.quest-history ul{margin:8px 0 0;padding-left:16px}.quest-history li+li{margin-top:5px}
.quest-empty{margin:16px;font-size:14px}
@media(prefers-reduced-motion:no-preference){.quest-detail{animation:field-detail .18s ease-out both}}
@media(max-width:760px){
  :is(#journal,#radio) .journal-panel{width:100%;height:min(630px,calc(100dvh - 32px))}
  .journal-header{padding:10px 12px;gap:8px}.journal-header h1{font-size:23px}
  .quest-layout{grid-template-columns:1fr;grid-template-rows:minmax(0,34%) minmax(0,1fr)}
  .quest-list{border-right:0;border-bottom:1px solid var(--ui-line);padding:4px 0}
  :is(#journal,#radio) .quest-entry{min-height:44px}.quest-detail h2{margin-bottom:14px}
}

/* Accessibility & UI Preferences */
[data-ui-contrast="high"]{--ui-bg:#0b0d0b;--ui-raised:#161a16;--ui-line:#8f9a85;--ui-text:#ffffff;--ui-muted:#d2d8c8;--ui-accent:#ffe08a}
[data-ui-motion="reduced"],[data-ui-motion="reduced"] *{animation:none!important;transition:none!important}
[data-ui-scale="compact"] :is(.pbp.hg,#cr,#sh,:is(#journal,#radio) .journal-panel,.tc-responses-region,.tkp){font-size:13px}
[data-ui-scale="large"] :is(.pbp.hg,#cr,#sh,:is(#journal,#radio) .journal-panel,.tc-responses-region,.tkp){font-size:16px}
[data-ui-scale="large"] .tc-now-txt{font-size:21px}
[data-ui-scale="large"] .tc-choice{font-size:16px}

/* Standardized Notification Toast */
.ui-toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:85;display:inline-flex;align-items:center;gap:10px;max-width:min(520px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));padding:9px 16px;background:#141813f2;border:1px solid var(--ui-line);border-left:3px solid var(--ui-accent);border-radius:2px;box-shadow:0 10px 30px #0009;color:var(--ui-text);font:13px/1.35 var(--ui-font);pointer-events:none}
.ui-toast-tag{font-size:10px;letter-spacing:.12em;font-weight:700;color:var(--ui-accent);white-space:nowrap}
.ui-toast-warn{border-left-color:#e07a5a}.ui-toast-warn .ui-toast-tag{color:#e07a5a}
.ui-toast-check{border-left-color:#8fd175}.ui-toast-check .ui-toast-tag{color:#8fd175}
.ui-toast-quest{border-left-color:#f0c465}.ui-toast-quest .ui-toast-tag{color:#f0c465}
.ui-toast-msg{overflow-wrap:anywhere}

/* Minimal Fallout-style Dialogue Overlay: floating subtitle + slim lower choice dock */
.tkw{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 20px) 22px;background:linear-gradient(0deg,#080a08b8 0%,#080a0845 28%,transparent 52%);pointer-events:none;z-index:90}
.tc-chassis{pointer-events:none;width:min(660px,100%);display:flex;flex-direction:column;gap:10px;background:none!important;border:0!important;box-shadow:none!important;padding:0!important}
.tc-speech-region{pointer-events:auto;text-align:center;padding:8px 18px 6px;max-height:22dvh;overflow-y:auto;background:radial-gradient(ellipse at center,#0a0c0aa8 0%,#0a0c0a55 62%,transparent 100%)}
.tc-speech-empty{padding:4px 18px 2px;background:none}
.tc-speaker-tag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ui-accent);text-shadow:0 1px 4px #000f,0 2px 8px #000;margin-bottom:3px;font-weight:600}
.tc-now-txt{font-size:18px;line-height:1.42;color:#f5f2e6;text-shadow:0 1px 4px #000,0 2px 10px #000d}
.tc-responses-region{pointer-events:auto;display:flex;flex-direction:column;padding:8px 12px;background:#141813e6!important;border-top:2px solid var(--ui-accent)!important}
.tc-choices-list{display:flex;flex-direction:column;gap:2px;max-height:25dvh;overflow-y:auto}
.tc-choice{display:flex;align-items:baseline;gap:10px;width:100%;background:transparent;border:1px solid transparent;border-radius:2px;padding:7px 10px!important;min-height:32px;color:var(--ui-text);font:inherit;font-size:14px;line-height:1.35;text-align:left;cursor:pointer}
.tc-choice:hover,.tc-choice:focus-visible{background:#283024;border-color:var(--ui-accent);color:#fff;outline:none}
.tc-choice.is-unlikely{opacity:.72}
.tc-ch-num{min-width:18px;color:var(--ui-accent);font-family:var(--ui-display);font-weight:600;font-variant-numeric:tabular-nums}
.tc-ch-tag{font-size:12px;font-weight:600;white-space:nowrap;color:var(--ui-accent)}
.tc-ch-tag.tc-tag-quest{color:#f0c465}
.tc-ch-tag.tc-tag-pass{color:#9fe07a}
.tc-ch-tag.tc-tag-fail{color:#dfa48d}
.tc-ch-tag.tc-tag-speech,.tc-ch-tag.tc-tag-barter{color:#a8dc98}
.tc-ch-tag.tc-tag-med,.tc-ch-tag.tc-tag-sci{color:#8fd8ff}
.tc-ch-tag.tc-tag-surv,.tc-ch-tag.tc-tag-repair,.tc-ch-tag.tc-tag-lockpick{color:#f0c465}
.tc-ch-tag.tc-tag-guns,.tc-ch-tag.tc-tag-sneak{color:#d8b8ff}
.tc-ch-txt{flex:1;min-width:0;overflow-wrap:anywhere}
.tc-foot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid #353d31}
.tc-act-btn{background:#20261e;border:1px solid var(--ui-line);color:var(--ui-text);padding:3px 9px;min-height:24px!important;font-size:11px;border-radius:2px;cursor:pointer;list-style:none}
.tc-act-btn:hover{border-color:var(--ui-accent);background:#2d352a}
.tc-act-btn.gold{border-color:#a88d52;color:#f0d28c}
.tc-act-btn.cyan{border-color:#5a8f88;color:#b8e3dc}
.tc-orders{display:inline-block}
.tc-orders[open] .tc-orders-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.tc-close-btn{margin-left:auto;background:none;border:0;color:var(--ui-muted);padding:2px 6px;min-height:24px!important;font-size:11px;cursor:pointer}
.tc-close-btn:hover{color:var(--ui-text)}

/* Character Sheet Tabs (#sh) */
.sh-tabs{display:flex;gap:4px;padding:0 24px;background:#191e18;border-bottom:1px solid var(--ui-line);overflow-x:auto}
.sh-tabs button{background:none!important;border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;color:var(--ui-muted)!important;padding:10px 14px!important;min-height:40px;width:auto!important;font-size:12px!important;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.sh-tabs button.on{color:var(--ui-text)!important;border-bottom-color:var(--ui-accent)!important;font-weight:600}
.sh-tabs button:hover{color:var(--ui-text)!important;background:#232a21!important}
.sh-panel{padding:18px 24px;overflow-y:auto;flex:1;min-height:0}
.sh-rep-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.sh-rep-card{padding:12px 14px;background:var(--ui-raised);border:1px solid var(--ui-line);border-radius:2px}
.sh-rep-card h4{margin:0 0 4px;font-size:14px;font-weight:600;color:var(--ui-text)}
.sh-rep-card .sh-rep-tier{font-size:12px;font-weight:600}
.sh-rep-card .sh-rep-nums{font-size:11px;color:var(--ui-muted);margin-top:4px;font-variant-numeric:tabular-nums}

/* Inventory Search & Comparison */
.inv-search-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.inv-search{flex:1;min-width:0;padding:6px 10px;background:#0e110d;border:1px solid var(--ui-line);border-radius:2px;color:var(--ui-text);font:12px var(--ui-font)}
.inv-search:focus{outline:2px solid var(--ui-accent);outline-offset:1px}
.inv-cmp{margin-top:10px;padding:8px 10px;background:#141812;border:1px solid var(--ui-line);font-size:11px;line-height:1.45}
.inv-cmp-title{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ui-muted);margin-bottom:4px}

/* Journal Filter Bar */
.journal-filters{display:flex;gap:6px;padding:8px 22px;border-bottom:1px solid var(--ui-line);background:#171c16;flex-wrap:wrap}
.journal-filters button{background:none;border:1px solid transparent;color:var(--ui-muted);padding:4px 10px;font-size:12px;border-radius:2px;min-height:28px;cursor:pointer}
.journal-filters button.on{background:#272f23;border-color:var(--ui-accent);color:var(--ui-text);font-weight:600}
.journal-filters button:hover{color:var(--ui-text)}

/* Main / Pause Menu Subpanels */
#mm .mm-sub{width:min(540px,calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 48px));max-height:76dvh;overflow-y:auto;padding:24px;background:#151815f5;border:1px solid var(--ui-line);border-top:2px solid var(--ui-accent);border-radius:2px;box-shadow:0 24px 90px #000b}
#mm .mm-sub h2{margin:0 0 14px;font:500 24px var(--ui-display);color:var(--ui-text);padding-bottom:10px;border-bottom:1px solid var(--ui-line)}
#mm .mm-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #2b3128;font-size:13px;color:var(--ui-text)}
#mm .mm-row small{display:block;font-size:11px;color:var(--ui-muted);margin-top:2px}
#mm .mm-seg{display:flex;gap:4px;flex-wrap:wrap}
#mm .mm-seg button{margin:0;width:auto;min-height:32px;padding:4px 10px;font-size:12px;letter-spacing:0;background:#20251f;border:1px solid var(--ui-line);color:var(--ui-muted);border-radius:2px}
#mm .mm-seg button.on{background:var(--ui-accent);color:#171a12;border-color:var(--ui-accent);font-weight:600}
#mm .mm-back{margin-top:16px!important;width:auto!important;padding:8px 16px!important;background:#20251f;border:1px solid var(--ui-line)!important;font-size:13px!important;letter-spacing:0!important;color:var(--ui-text)}
#mm .mm-meta{margin-top:14px;font-size:12px;color:var(--ui-muted);letter-spacing:.04em}
.ui-empty{padding:20px 12px;text-align:center;color:var(--ui-muted);font-size:13px}
</style>`
