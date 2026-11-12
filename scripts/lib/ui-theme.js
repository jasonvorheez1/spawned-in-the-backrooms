// Shared field UI. Keep accents for selection and warnings, not every edge of every panel.
export const UI_THEME = `<style id="field-ui">
:root{--ui-bg:#151815;--ui-raised:#20251f;--ui-line:#3f473b;--ui-text:#eeeadd;--ui-muted:#aab09f;--ui-accent:#d5b77b;--ui-display:Bahnschrift,"Arial Narrow",sans-serif;--ui-font:'Segoe UI',Arial,sans-serif}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal .journal-panel){box-sizing:border-box;background:var(--ui-bg)!important;color:var(--ui-text);border:1px solid var(--ui-line)!important;border-radius:2px!important;box-shadow:0 18px 64px #0006!important;font-family:var(--ui-font)!important;text-transform:none;letter-spacing:0;animation:none!important;text-shadow:none!important}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal) *{box-sizing:border-box;text-shadow:none!important;letter-spacing:normal}
:is(.pbp,#sh,#cc)::before,:is(.pbp,#sh,#cc)::after{display:none!important}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal) :is(button,input,select){font-family:var(--ui-font)!important;text-transform:none;letter-spacing:0;box-shadow:none;transition:background .12s,color .12s}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal) button{min-height:32px;border-radius:2px;cursor:pointer}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal) button:focus-visible{outline:2px solid var(--ui-accent)!important;outline-offset:3px}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal) button:disabled{cursor:default;opacity:.4}
:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal){scrollbar-width:thin;scrollbar-color:#636c5b transparent}
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
.tc-chassis{padding:24px;width:min(780px,100%)}.tc-name{font-family:var(--ui-display);font-size:25px;font-weight:500;letter-spacing:.015em}.tc-hdr{padding-bottom:16px;border-bottom:1px solid var(--ui-line)}.tc-subhead,.tc-rep-grp{color:var(--ui-muted)}.tc-active-line{border:0;padding:0;margin:18px 0 24px}.tc-now-spk{display:none}.tc-now-txt{font-size:20px;line-height:1.5;color:var(--ui-text)}.tc-choices-hdr{color:var(--ui-muted);font-size:10px;letter-spacing:.1em}.tc-choices-list{grid-template-columns:1fr;gap:0}.tc-choice{background:none;border:0;border-top:1px solid #343a30;border-radius:0;padding:12px 0;font-size:14px}.tc-choice:hover{background:#282e23;border-color:var(--ui-line)}.tc-ch-num{color:var(--ui-accent)}.tc-ch-tag{color:var(--ui-muted)}.tc-send-btn{background:var(--ui-accent);border:0;color:#20231b}.tc-prompt-inp{background:#10130f;border-color:var(--ui-line);border-radius:2px}.tc-act-btn{border-color:var(--ui-line);border-radius:2px;color:var(--ui-muted)}
.tc-chassis{max-height:min(76dvh,620px);border-top:2px solid var(--ui-accent)!important}.tc-name{margin:0}.tc-badge{border:0;padding:0;color:var(--ui-muted);font-size:11px}.tc-subhead{gap:12px}.tc-rep-lbl{color:var(--ui-muted);font-size:11px;text-transform:lowercase}.tc-rep-lbl[data-stance="HOSTILE"]{color:#d99a87}.tc-active-line{border-left:2px solid #d5b77b77;padding-left:14px!important;margin:18px 0 22px}.tc-now-txt{font-size:20px;line-height:1.5}.tc-waiting{font-size:15px;color:var(--ui-muted)}
.tc-choices-list{max-height:30dvh;overflow-y:auto}.tc-choice{gap:12px;padding:13px 10px!important;text-align:left}.tc-ch-num{min-width:20px;font-family:var(--ui-display);font-variant-numeric:tabular-nums}.tc-choice:focus-visible{background:#30392b;outline-offset:-2px!important}.tc-choice:disabled{opacity:.45;pointer-events:none}.tc-chk-banner{padding:8px 0;font-size:12px}.tc-chk-pass{color:#b5cfa8}.tc-chk-fail{color:#dfa48d}.tc-check-current{margin:-6px 0 12px}
.tc-extra summary{font-size:12px;min-height:32px;padding:8px 0;cursor:pointer;color:var(--ui-muted)}.tc-extra summary:focus-visible{outline:2px solid var(--ui-accent);outline-offset:3px}.tc-inquiry{border-top:1px solid var(--ui-line);margin-top:10px}.tc-inquiry[open] summary{color:var(--ui-accent)}.tc-prompt-bar{margin:4px 0 12px}.tc-optional{display:flex;gap:0 24px;flex-wrap:wrap;border-top:1px solid var(--ui-line);margin-top:10px}.tc-optional>.tc-extra{border:0;margin:0}.tc-optional>details[open]{flex-basis:100%}.tc-deck{border-top:1px solid var(--ui-line);padding-top:8px;margin-top:8px}.tc-close-btn{background:none!important;border:0!important;color:var(--ui-muted)!important;font-size:12px}
.tkp{width:min(860px,100%);max-height:80dvh;display:flex;flex-direction:column;padding:22px}.tkh{border-color:var(--ui-line)}.tkh h2{font-family:var(--ui-display);font-size:26px;color:var(--ui-text)}.tkh .f{color:var(--ui-muted);font-size:11px}.tkh .r{color:var(--ui-accent);font-variant-numeric:tabular-nums}.tkb{gap:16px;border-color:var(--ui-line)}.tkb button{background:none;border:0;border-bottom:2px solid transparent;border-radius:0;color:var(--ui-muted);padding:10px 0}.tkb button.is-active{color:var(--ui-accent);border-color:var(--ui-accent)}.tks{min-height:0;overflow:auto}.tks button{min-height:44px;border:0;border-bottom:1px solid var(--ui-line);background:none;color:var(--ui-text)}.tks button>span:first-child{min-width:0;flex:1;overflow-wrap:anywhere}.tks button .c{color:var(--ui-accent);font-variant-numeric:tabular-nums}.tks button:disabled{opacity:.55}.tks h4{color:var(--ui-muted);border-color:var(--ui-line)}
#cc{left:24px;top:24px;bottom:24px;width:min(480px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)))}#cc .hd{background:none;border-bottom:1px solid var(--ui-line)}#cc .sub{font-size:11px;letter-spacing:0;text-transform:none;color:var(--ui-muted)}#cc .hd .x{border-left:1px solid var(--ui-line);color:var(--ui-muted)}#cc .tabs{width:92px;background:none;border-color:var(--ui-line)}#cc .tabs button{padding:14px 8px;color:var(--ui-muted);border-color:var(--ui-line)}#cc .tabs button .n{display:none}#cc .tabs button.on{background:#30372b;color:var(--ui-text);box-shadow:inset 2px 0 0 var(--ui-accent)}#cc .sec{color:var(--ui-muted);font-size:10px;letter-spacing:.08em}#cc .sec::after{background:var(--ui-line)}#cc .sec span:last-child{color:var(--ui-text)}#cc .bd{padding:6px 20px 20px}#cc button{box-shadow:none!important}
#journal{font-family:var(--ui-font)!important;color:var(--ui-text)!important;letter-spacing:0!important;text-transform:none!important}#journal .journal-panel{width:min(720px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)))!important;padding:24px!important;max-height:calc(100dvh - 48px)!important}#journal .journal-title{font-size:25px!important;letter-spacing:-.02em!important;color:var(--ui-text)!important}#journal button{padding:16px 14px!important;border-left-width:2px!important;margin-bottom:8px!important}#journal button:hover{background:#30372b!important}
#bm{background:#171916ed;border-color:var(--ui-line);color:var(--ui-text);font-family:var(--ui-font);text-shadow:none;text-transform:none}#gl .hd{background:none;border-color:var(--ui-line)}
#hud[data-panel-open="true"]{visibility:hidden}body:has(.pbp,#cr,#sh,#journal) :is(#nd,#wt,#tg,#tk){visibility:hidden}
#hud{--a:#dbdecf;--ad:#a7af9c;font-family:var(--ui-font);letter-spacing:.015em;text-shadow:0 1px 3px #000;text-transform:none}#hud .fb{height:6px;border:0;background:#10150fb3;box-shadow:none}#hud .fb::after{display:none}#hud .fbi{inset:0}#hud .fbf{background:var(--c,var(--a));filter:none}#hud .pip{height:8px;border-color:#a7af9c}#hud .pip.full{box-shadow:none;background:#dbdecf}#hud .hud-card{border:1px solid var(--ui-line);background:#151a12db;box-shadow:none}#hud .sneak{font-size:14px;letter-spacing:.12em}#hud .dot-crosshair{opacity:.8}#hud kbd{border-color:#757e68;color:#dbdecf}#nd,#wt{color:#c0c6b4;font-family:var(--ui-font);letter-spacing:.04em}
#hud .bl,#hud .br{width:min(260px,30vw)!important}#hud .row{font-variant-numeric:tabular-nums}#hud .fb{margin-top:5px}#hud .fbf{transition:width .2s ease-out}#hud .cmp{height:20px;border:0;border-top:1px solid #eeeadd44;margin-top:12px}#hud .cmp::before{height:1px;opacity:.5}#hud .cmp i{width:1px;height:18px;background:var(--ui-accent)}
.hud-quickbar{position:fixed;bottom:24px;left:28px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);margin:auto;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;width:max-content;max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 608px);pointer-events:auto}.hud-quick-slot{position:relative;display:flex;align-items:center;gap:7px;min-width:32px;min-height:32px;padding:6px 8px;border:1px solid #626b5777;border-radius:0;background:#141a14e6;color:var(--ui-text);font:inherit;font-size:11px}.hud-quick-slot kbd{padding:0;margin:0;border:0;color:var(--ui-accent)!important;font-size:12px}.hud-quick-name{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 10px;background:#151815;color:var(--ui-text);border:1px solid var(--ui-line);pointer-events:none;opacity:0}.hud-quick-slot:is(:hover,:focus-visible) .hud-quick-name{opacity:1}.hud-quick-slot small{font-variant-numeric:tabular-nums;color:var(--ui-muted)}.hud-quick-slot:disabled{opacity:.45}.hud-quick-slot:hover{border-color:var(--ui-accent);background:#323b29}.hud-quick-slot:focus-visible{outline:2px solid var(--ui-accent);outline-offset:3px}.hud-level-prompt{position:fixed;left:28px;top:24px;font-size:12px;color:var(--ui-accent);border-left:2px solid currentColor;padding:7px 10px;background:#151815cf}
body:has(.tc-chassis) #hud :is(.bl,.br,.hud-quickbar,.hud-level-prompt,#hud-quest,.dot-crosshair,.sneak),body:has(.tkw) :is(#nd,#wt,#tg,#tk){visibility:hidden}
@media(max-width:1200px){.hud-quick-slot small{display:none}}
@media(max-width:760px){.hud-quick-name{display:none}.hud-quickbar{left:90px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 26px);bottom:16px;width:auto;max-width:none;flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;scrollbar-width:thin;scroll-snap-type:x proximity}.hud-quick-slot{flex:0 0 44px;min-height:44px;justify-content:center;scroll-snap-align:start}.hud-level-prompt{top:146px;left:12px}.tc-choice{min-height:44px}.tc-extra summary{min-height:44px}.tc-chassis{padding:16px;max-height:82dvh}.tc-now-txt{font-size:18px}.tkp{padding:16px}.tkh{flex-wrap:wrap}.tkh h2{flex-basis:100%}.hg-q{height:72px;min-width:80px}.hg-q .x{min-width:44px;min-height:44px}.hg-q .c{top:28px}}
#mm{font-family:var(--ui-font);animation:none}#mm h1{font-weight:500;letter-spacing:-.045em;line-height:1.04;font-size:clamp(44px,6vw,86px)}#mm .col{bottom:12vh}#mm button{letter-spacing:.04em;border:0;padding:10px 0;font-size:18px}#mm button:focus-visible{outline:2px solid var(--ui-accent);outline-offset:6px}
#cc{--a:var(--ui-accent);--a2:var(--ui-text);--ink:#20231b}#cc button:not(.sw){background:#252b22;border:1px solid var(--ui-line);color:var(--ui-text);text-transform:none}#cc button.on:not(.sw){background:#3b4331;border-color:var(--ui-accent);color:#f0efdf}#cc .ft{background:none;border-top:1px solid var(--ui-line)}#cc .ft .go{background:var(--ui-accent);color:#20231b}#cc .slot{background:none;border-color:var(--ui-line)}#cc .sl .bar{background:#30372b;border-color:var(--ui-line)}#cc .sl .bar i{background:var(--ui-accent)}#cc .hint{border-color:var(--ui-line)}#cc .sws .sw{min-height:26px}#cc .sl button{min-height:28px}
.pbp .hg-q{border-color:var(--ui-line)}.pbp .hg-q:focus-visible{outline:2px solid var(--ui-accent);outline-offset:2px}.pbp .hg-q.mine{border-color:var(--ui-accent)}.pbp .hg-q .x{min-height:16px;height:16px;padding:0;opacity:.45;bottom:4px;right:4px}.pbp .hg-q .x:hover,.pbp .hg-q .x:focus-visible{opacity:1}
.pbp .condition-meter{display:flex;flex-direction:column;gap:6px;max-width:100%;font-size:12px;font-weight:400}.condition-meter>i{display:block;width:130px;max-width:100%;height:3px;background:#3b4037}.condition-meter>i>b{display:block;height:100%}.pbp .it .cnd-mini{font-weight:400;letter-spacing:0}.pbp .it .eq-tag{background:none!important;padding:0;font-size:9px}
#journal .q-name{font-size:16px!important;letter-spacing:0!important;color:var(--ui-text)!important}#journal .q-step{font-size:13px!important;color:var(--ui-muted)!important;margin-top:6px!important;line-height:1.5!important}#journal button[data-tracked="true"]{background:#2b3024!important;border-left-color:var(--ui-accent)!important}#journal button[data-tracked="false"]{border-left-color:#484f3e!important}#journal .journal-close{width:auto!important;border:1px solid var(--ui-line)!important;background:none!important;color:var(--ui-muted);padding:6px 10px!important;font-size:12px;margin-left:16px}#journal .journal-title{margin-right:auto}#journal .journal-header{flex-wrap:wrap;gap:12px}
@media(max-width:760px){.pbw{padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 16px 12px;box-sizing:border-box}.pbp.hg{width:100%!important}#cr,#sh{left:12px;transform:translateY(-50%);width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px)}#cc{width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px)!important}#journal{padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 16px 12px;box-sizing:border-box}#journal .journal-panel{width:100%!important;padding:18px!important}
.pbp.hg{height:calc(100dvh - 32px);width:calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 12px))}.hg-top{padding:14px;gap:12px}.hg-brand h2{font-size:22px}.hg-modes{gap:12px}.hg-vit{margin:0;flex-basis:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;min-width:0}.hg-vit .hg-chip,.hg-vit .hg-gauge{min-width:0}.hg-vit b{font-size:13px}.hg-vit b i{font-size:9px}.hg-vit .hg-chip{display:flex}.hg-gauge{min-width:65px}.hg-qrow{padding:10px 14px;display:block;overflow:visible}.hg-qt{max-width:none;display:flex;justify-content:space-between;margin-bottom:6px}.hg-qt small{display:none}.hg-qs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.hg-q{height:35px;min-width:0;flex:none}.hg-q .v{font-size:9px;padding-right:3px}.pbp .hg-q .x{height:12px;min-height:12px;width:12px;font-size:8px;line-height:10px;right:1px;bottom:1px}.hg-q.set .v{padding-right:9px}.hg-q .c{display:none}.hg-bd{display:flex;flex-direction:column;overflow:auto;min-height:0}.hg-rail{flex:none;flex-direction:row;overflow-x:auto;padding:4px 10px;min-height:42px;border-right:0;border-bottom:1px solid var(--ui-line)}.hg-rb{flex:none;white-space:nowrap;padding:6px 8px}.hg-rb .l{display:block}.hg-rb .n{display:none}.hg-mid{flex:none;min-height:160px;padding:10px 14px}.pbp.hg .it .stat-r{font-size:10px;gap:4px}.pbp.hg .it .nm{font-size:12px}.hg-mid{min-width:0}.pbp.hg .ls{max-height:210px;overflow:auto}.hg-sort>span:first-child{display:none}.hg-sort{gap:3px;padding-bottom:6px}.hg-sort button{padding:3px}.hg-card{display:flex;flex:none;border-left:0;border-top:1px solid var(--ui-line);padding:18px 14px;overflow:visible}.hg-card .dt{display:flex}.hg-card h4{font-size:20px}.hg-ft{padding:8px 14px}.hg-ft .hint{display:none}
#cr .hd,#sh .hd{padding:18px}#cr .tb{padding:10px 18px 0;gap:12px}#cr .sc{padding:12px 18px}#cr .row{padding:16px 18px;gap:12px}#cr .n{font-size:16px}#cr .bt button{flex:1}#cr .ft{padding:12px 18px}#cr .sh{padding-left:18px}#cr .md{line-height:1.5}#sh .col{padding:18px}#sh .hd h2{font-size:23px}#sh .pt{font-size:11px}#sh .pips{display:none}.tc-chassis{padding:18px}.tc-now-txt{font-size:18px}
#hud{visibility:visible}#cc{left:12px;top:16px;bottom:16px;width:calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 12px))}#cc .main{flex-direction:column}#cc .tabs{width:auto;flex-direction:row;flex:none;border-right:0;border-bottom:1px solid var(--ui-line)}#cc .tabs button{flex:1;padding:8px 4px;font-size:10px}#cc h2{font-size:21px}#cc .hd .ttl{padding:16px}#cc .bd{padding:6px 16px 16px}.tkw{padding-left:12px;padding-right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px)}
}
@media(prefers-reduced-motion:reduce){:is(.pbp,#cr,#sh,#cc,.tc-chassis,.tkp,#hud) *{animation:none!important;transition:none!important}}

/* Brief terminal motion; text stays still after the reveal. */
@keyframes field-open{from{opacity:0;translate:0 9px}to{opacity:1;translate:0 0}}
@keyframes field-row{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
@keyframes field-detail{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes field-tab{from{background-size:0 2px}to{background-size:100% 2px}}
@media(prefers-reduced-motion:no-preference){
:is(.pbp.hg,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal .journal-panel){animation:field-open .26s cubic-bezier(.2,.7,.2,1) backwards!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice,#journal button[data-tracked]){animation:field-row .18s ease-out backwards!important;animation-delay:60ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice,#journal button[data-tracked]):nth-child(2){animation-delay:80ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice,#journal button[data-tracked]):nth-child(3){animation-delay:100ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice,#journal button[data-tracked]):nth-child(4){animation-delay:120ms!important}
:is(.pbp.hg .it,#cr .row,#sh .row,.tc-choices-list .tc-choice,#journal button[data-tracked]):nth-child(n+5){animation-delay:140ms!important}
.pbp.hg .hg-card{animation:field-detail .2s 80ms ease-out backwards}
:is(.hg-modes button.on,#cr .tb button.on){background-image:linear-gradient(var(--ui-accent),var(--ui-accent));background-repeat:no-repeat;background-position:left bottom;border-bottom-color:transparent;animation:field-tab .18s ease-out both}
:is(.pbp,#cr,#sh,#cc,.tc-chassis,.tkp,#journal) :is(button,.hg-q){transition:background-color .14s,border-color .14s,color .14s,box-shadow .14s}
:is(.hg-gauge .bar em,.condition-meter>i>b,#hud .fbf){transition:width .24s ease-out}
#mm .col{animation:field-detail .32s ease-out backwards}
}
@media(hover:hover){:is(.pbp.hg .it,#cr .row,.tc-choice):hover{background-color:#262d23}.hg-q:hover{border-color:var(--ui-accent)}.hg-rb:hover{box-shadow:inset 2px 0 var(--ui-accent)}}
@media(prefers-reduced-motion:reduce){:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal .journal-panel,#mm .col),:is(.pbp,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal,#mm) *{animation:none!important;transition:none!important}}

:is(.pbp.hg,#cr,#sh,#cc,#gl,.tc-chassis,.tkp,#journal .journal-panel){box-shadow:0 24px 90px #0009,inset 0 1px 0 #d2c49325!important;border-top-color:#8d9275!important}
.pbp.hg .hg-card{background:#1d231a}.hg-card .dt-header{margin-bottom:24px}.hg-card .dt-header h4{font-size:29px;letter-spacing:-.035em;line-height:1.12}.hg-card .g>div:first-child{align-items:baseline;font-size:18px;font-variant-numeric:tabular-nums;padding:7px 0;color:var(--ui-text)}.hg-card .g>div:first-child span{font-size:11px;letter-spacing:.1em;color:var(--ui-muted)}
.hg-card .acts .act{min-height:40px}.hg-rb.on{box-shadow:inset 2px 0 var(--ui-accent)}
:is(.pbp,#cr,#sh,#cc,.tc-chassis,.tkp,#journal) button:active{background-color:#4c553d;box-shadow:inset 0 0 0 1px var(--ui-accent)}
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
.wrist-nav button,#journal .wrist-nav button{border:0!important;margin:0!important;padding:0 14px!important;background:none;color:var(--ui-muted)}
.wrist-nav [aria-current=page]{color:var(--ui-text);background:#272f23;box-shadow:inset 0 -2px var(--ui-accent);font-weight:600}
.wrist-nav button:hover{background:#262e23;color:var(--ui-text)}
.wrist-nav button:focus-visible,.pbp.hg .ls .it:focus-visible{outline-offset:-3px!important}
#journal .wrist-nav{margin-bottom:14px;padding-inline:0}
.q-track{flex:none;align-self:center;border:1px solid var(--ui-line);border-radius:2px;padding:4px 8px;color:var(--ui-muted);font-size:12px}
[data-tracked=true] .q-track{color:var(--ui-accent);border-color:#7d704f}
.craft-stock,.journal-archive{border-bottom:1px solid var(--ui-line);flex:none}
.craft-stock summary,.journal-archive summary{cursor:pointer;padding:10px 16px;font-size:13px;color:var(--ui-muted)}
.craft-stock[open] summary,.journal-archive[open] summary{color:var(--ui-text)}
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
:is(#lp-modal,#os,#mj,#spm,#hubp,#hubo,.field-dialog) button:focus-visible,:is(.craft-stock,.journal-archive) summary:focus-visible{outline:2px solid var(--ui-accent);outline-offset:-3px}
@media(max-width:760px){
  .wrist-nav{padding-inline:4px}.wrist-nav>*,#journal .wrist-nav button{min-height:44px;padding-inline:8px!important;font-size:12px}
  #journal button[data-tracked]{gap:6px!important;padding:12px 8px!important;flex-wrap:wrap}
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
</style>`
