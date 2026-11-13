// Slate's look: Apple-style liquid glass (HIG, iOS/iPadOS dark). Ported from @dandalruss/awoken's Slate.
// In Starbloom only GLASS_BOARD is wired: the pane rules re-scoped under .kb-glass (the Planner's wrapper), so
// the board wears glass while every other app keeps Starbloom's themes. No backdrop-filter is used in that scope.
// GLASS_CSS / GLASS_TOOLS (the whole-tablet shell) are kept as his, unwired.
const T={
 tint:'#0a84ff', tint2:'#64d2ff', label:'rgba(255,255,255,.94)', label2:'rgba(235,235,245,.62)', label3:'rgba(235,235,245,.38)',
 hair:'rgba(255,255,255,.12)', fill:'rgba(118,118,128,.20)', fill2:'rgba(118,118,128,.30)', raised:'rgba(255,255,255,.09)', well:'rgba(0,0,0,.20)',
};
const sel=(hexes,prop)=>hexes.map(h=>`#vwp-tablet [style*="${prop}#${h}"]`).join(',');
const RAISED=['1a2b3d','223246','16233a','16243a','1d3346','1c2c47','152234','132034'];
const FILL=['111b2c','111c2b','16202e','101a2b','0f1828','0e1a2b','0e1826','0d1724','0c1422','0b1422','0b1320','0d1726'];
const WELL=['0a121e','0a111c','0d1522','05080d','15181c','22262b','1a1d21'];
const SF=`-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Inter","Segoe UI Variable",system-ui,sans-serif`;
const NY=`"New York",ui-serif,"Iowan Old Style",Georgia,serif`;
const SHELL=`
#vwp-tablet{font-family:${SF}!important;-webkit-font-smoothing:antialiased;color:${T.label}!important;
 background:linear-gradient(150deg,rgba(78,84,102,.46) 0%,rgba(34,37,48,.50) 45%,rgba(18,20,28,.58) 100%)!important;
 -webkit-backdrop-filter:blur(30px) saturate(1.8);backdrop-filter:blur(30px) saturate(1.8);
 border-radius:28px!important;padding:10px 10px 30px!important;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 0 0 1px rgba(255,255,255,.10),inset 0 -1px 0 rgba(255,255,255,.05),0 24px 64px rgba(0,0,0,.42),0 2px 8px rgba(0,0,0,.25)!important}
#vwp-tablet::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
 background:radial-gradient(120% 60% at 15% -10%,rgba(255,255,255,.16),transparent 55%),radial-gradient(80% 50% at 110% 110%,rgba(100,210,255,.07),transparent 60%)}
#vwp-tablet>*{position:relative;z-index:1}#vwp-tablet>#vwp-grip,#vwp-tablet>#vwp-home,#vwp-tablet>#vwp-shutter{position:absolute;z-index:6}
#vwp-tablet.cam{background:transparent!important;-webkit-backdrop-filter:none;backdrop-filter:none}
#vwp-tablet.cam::before{display:none}
#vwp-tablet .vwp-screen{background:rgba(12,14,20,.40)!important;border-radius:20px!important;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.10)!important}
#vwp-tablet.cam .vwp-screen{background:transparent!important;box-shadow:0 0 0 100vmax rgba(20,22,28,.85),inset 0 0 0 .5px rgba(255,255,255,.2)!important}
#vwp-tablet .vwp-scroll{contain:paint;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}
#vwp-tablet .vwp-scroll::-webkit-scrollbar{width:8px;height:8px}#vwp-tablet .vwp-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:8px;border:2px solid transparent;background-clip:padding-box}
#vwp-bezel{height:28px!important;margin:-2px 6px 8px!important}
#vwp-bezel>span:nth-child(3){height:5px!important;flex:0 0 36px!important;margin:0 auto!important;border:0!important;border-radius:3px;background:rgba(255,255,255,.28)}
#vwp-bezel>span:nth-child(2){letter-spacing:.02em!important;font-size:13px!important;font-weight:600;color:${T.label}!important}
#vwp-bezel button{height:26px!important;min-width:26px;border-radius:13px!important;padding:0 9px!important;font-size:12px!important}
#vwp-home{width:180px!important;height:26px!important;bottom:0!important;border:0!important;border-radius:13px!important;background:transparent!important}#vwp-home::after{content:'';position:absolute;left:22px;right:22px;top:11px;height:5px;border-radius:3px;background:rgba(255,255,255,.55);transition:background .2s,transform .2s;pointer-events:none}#vwp-home:hover::after{background:rgba(255,255,255,.95);transform:scaleX(1.06)}
#vwp-grip{opacity:.35;background:linear-gradient(135deg,transparent 58%,rgba(255,255,255,.7) 58%,rgba(255,255,255,.7) 64%,transparent 64%,transparent 74%,rgba(255,255,255,.7) 74%,rgba(255,255,255,.7) 80%,transparent 80%)!important}
#vwp-grip:hover{opacity:.8}
#vwp-shutter{width:62px!important;height:62px!important;border:4px solid rgba(255,255,255,.95)!important;background:rgba(255,255,255,.92)!important;box-shadow:0 0 0 3px rgba(0,0,0,.25),0 6px 18px rgba(0,0,0,.35)!important;background-clip:content-box!important;padding:3px!important}
#vwp-shutter::after{display:none}`;
// the panes: palette → glass tokens, controls, cards and columns (every rule a descendant of #vwp-tablet)
const PANES=`
${sel(RAISED,'background:')}{background:${T.raised}!important}
${sel(FILL,'background:')}{background:${T.fill}!important}
${sel(WELL,'background:')}{background:${T.well}!important}
#vwp-tablet [style*="solid #2c3b4c"],#vwp-tablet [style*="solid #1f2c3c"],#vwp-tablet [style*="solid #a37d45"],#vwp-tablet [style*="solid #3a3f45"]{border-color:${T.hair}!important}
#vwp-tablet [style*="color:#d9e0d9"]{color:${T.label}!important}
#vwp-tablet [style*="color:#8a9aa0"]{color:${T.label2}!important}
#vwp-tablet [style*="color:#bdc7c7"],#vwp-tablet [style*="color:#c9a56a"]{color:${T.label2}!important}
#vwp-tablet [style*="letter-spacing:.16em"],#vwp-tablet [style*="letter-spacing:.14em"],#vwp-tablet [style*="letter-spacing:.2em"]{letter-spacing:.05em!important;font-weight:600}
#vwp-tablet [style*="Georgia"]{font-family:${NY}!important}
#vwp-tablet [style*="border-radius:3px"],#vwp-tablet [style*="border-radius:4px"],#vwp-tablet [style*="border-radius:5px"],#vwp-tablet [style*="border-radius:6px"]{border-radius:12px!important}
#vwp-tablet img[style*="border-radius"]{border-radius:8px!important}
#vwp-tablet [style*="background:#e8dfc8"],#vwp-tablet [style*="background:#f1ead8"]{border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
#vwp-tablet button{font-family:inherit;transition:transform .18s cubic-bezier(.3,1.4,.5,1),background-color .15s,opacity .15s;-webkit-tap-highlight-color:transparent}
#vwp-tablet button:active{transform:scale(.96)}
${sel(RAISED,'background:')}{border-radius:10px!important;border-color:${T.hair}!important}
#vwp-tablet button[style*="background:#1a2b3d"]:hover,#vwp-tablet button[style*="background:#223246"]:hover,#vwp-tablet button[style*="background:#16233a"]:hover{background:rgba(255,255,255,.16)!important}
#vwp-tablet input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not(.sl-paper *),#vwp-tablet textarea:not([style*="#f1ead8"]):not(.sl-paper *),#vwp-tablet select:not(.sl-paper *){font-family:inherit!important;background:${T.fill}!important;border:1px solid transparent!important;border-radius:10px!important;color:${T.label}!important;outline:none;transition:box-shadow .15s,background-color .15s}
#vwp-tablet input:focus,#vwp-tablet textarea:focus,#vwp-tablet select:focus,#vwp-tablet [contenteditable]:focus{box-shadow:0 0 0 3px rgba(10,132,255,.55)!important;background:${T.fill2}!important}
#vwp-tablet input::placeholder,#vwp-tablet textarea::placeholder{color:${T.label3}}
#vwp-tablet input[type=range],#vwp-tablet input[type=checkbox],#vwp-tablet input[type=radio]{accent-color:${T.tint}!important}
#vwp-tablet .vwp-card{border-radius:14px!important;transition:transform .18s cubic-bezier(.3,1.4,.5,1),background-color .15s}
#vwp-tablet .vwp-card:hover{background:rgba(255,255,255,.13)!important;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.18)!important;transform:translateY(-1px)}
#vwp-tablet .vwp-card.slot{box-shadow:0 -3px 0 ${T.tint}!important}
#vwp-tablet .vwp-col{background:rgba(0,0,0,.14)!important;border:0!important;border-radius:16px!important}
#vwp-tablet .vwp-col.over{box-shadow:inset 0 0 0 2px ${T.tint}!important}
#vwp-tablet a{color:${T.tint2}}
#vwp-tablet ::selection{background:rgba(10,132,255,.45)}`;
const PAPER=`
#vwp-tablet .sl-paper input,#vwp-tablet .sl-paper select,#vwp-tablet .sl-paper textarea{font-family:inherit;color:#2a2418!important;border-radius:8px!important;outline:none}
#vwp-tablet .sl-paper input:not([style*="border:none"]),#vwp-tablet .sl-paper select{background:rgba(90,69,38,.08)!important;border:1px solid rgba(90,69,38,.18)!important}
#vwp-tablet .sl-paper input[style*="font-size:20px"]{background:transparent!important;border:0!important;border-bottom:1px solid rgba(90,69,38,.25)!important;border-radius:0!important;font-family:Georgia,serif!important}
#vwp-tablet .sl-paper textarea{background-color:transparent!important;border:0!important}
#vwp-tablet .sl-paper input::placeholder,#vwp-tablet .sl-paper textarea::placeholder{color:rgba(42,36,24,.45)}
#vwp-tablet .sl-paper button{background:rgba(90,69,38,.10)!important;color:#5a4526!important;border:1px solid rgba(163,125,69,.55)!important;border-radius:999px!important}
#vwp-tablet .sl-paper button:hover{background:rgba(163,125,69,.22)!important}
#vwp-tablet .sl-paper span[style*="oklch"] button{background:none!important;border:0!important;width:18px;height:18px;padding:0!important;display:inline-flex;align-items:center;justify-content:center;font-size:13px!important;line-height:1;color:#111b2c!important;border-radius:50%!important}
#vwp-tablet .sl-paper span[style*="oklch"] button:hover{background:rgba(0,0,0,.12)!important}
#vwp-tablet .sl-paper select,#vwp-tablet .sl-paper input:not([style*="font-size:20px"]){font-size:12px!important;height:26px;box-sizing:border-box;line-height:1.2}
#vwp-tablet .sl-paper button:not(span button){font-size:12px!important;padding:3px 10px!important;line-height:1.2}
#vwp-tablet .sl-paper [style*="background:#e8dfc8"]{box-shadow:none!important;border-radius:8px!important}
#vwp-tablet .vwp-orbset{background:transparent!important;border-top:.5px solid ${T.hair}!important}`;
export const GLASS_CSS=`<style>${SHELL}${PANES}${PAPER}
#sl-god-tuck{background:linear-gradient(90deg,rgba(60,64,78,.6),rgba(22,24,32,.6))!important;-webkit-backdrop-filter:blur(20px) saturate(1.8);backdrop-filter:blur(20px) saturate(1.8);border:0!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 0 0 1px rgba(255,255,255,.1),0 8px 24px rgba(0,0,0,.4)!important;border-radius:0 16px 16px 0!important;color:${T.label}!important;font-family:${SF}}
@media (prefers-reduced-transparency:reduce){#vwp-tablet,#sl-god-tuck{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:#1c1c1e!important}#vwp-tablet .vwp-screen{background:#000!important}}
@media (prefers-reduced-motion:reduce){#vwp-tablet *{transition:none!important;animation:none!important}}
</style>`;
// Starbloom: the Planner's glass. Only the pane rules, each re-rooted under the board's .kb-glass wrapper.
export const GLASS_SCOPE='.kb-glass';
export const GLASS_BOARD=`<style>${GLASS_SCOPE}{font-family:${SF};-webkit-font-smoothing:antialiased;color:${T.label}}${PANES.replace(/#vwp-tablet /g,`#vwp-tablet ${GLASS_SCOPE} `)}
@media (prefers-reduced-motion:reduce){#vwp-tablet ${GLASS_SCOPE} *{transition:none!important;animation:none!important}}</style>`;
// toolbar + tab bar + icon buttons (his; unwired here: Starbloom keeps its thin-line header icons)
export const GLASS_TOOLS=`<style>
#vwp-bezel .sl-tbg{display:flex;align-items:center;gap:2px;padding:2px;border-radius:18px;background:rgba(118,118,128,.24);box-shadow:inset 0 .5px 0 rgba(255,255,255,.18)}
#vwp-tablet .sl-tb{width:30px!important;height:30px!important;min-width:30px;padding:0!important;border-radius:15px!important;border:0!important;background:transparent!important;color:rgba(255,255,255,.92)!important;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
#vwp-tablet .sl-tb:hover{background:rgba(255,255,255,.14)!important}
#vwp-tablet .sl-tb.sl-close:hover{background:rgba(255,69,58,.85)!important;color:#fff!important}
#vwp-tablet .sl-tb[data-busy]{opacity:.5}
#vwp-tablet .sl-tab{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 0 6px!important;background:transparent!important;border:0!important;color:rgba(235,235,245,.55)!important;font-size:10.5px!important;letter-spacing:.01em!important;font-weight:500}
#vwp-tablet .sl-tab.on{color:#0a84ff!important}
#vwp-tablet .sl-tab:hover:not(.on){color:rgba(255,255,255,.85)!important}
#vwp-tablet button[data-ic]{display:inline-flex!important;align-items:center;justify-content:center;gap:5px;line-height:1!important}
#vwp-tablet button[data-ic="i"]{min-width:26px;min-height:26px;padding:4px!important;border-radius:13px!important}
#vwp-tablet button[data-ic="i"][style*="background:none"]:hover,#vwp-tablet button[data-ic="i"][style*="background:transparent"]:hover{background:rgba(255,255,255,.12)!important}
#vwp-tablet button[data-ic="l"]{border-radius:14px!important;padding:5px 11px 5px 9px!important;font-size:12px!important;font-weight:500}
#vwp-tablet button[data-ic][aria-label="Archive"]:hover,#vwp-tablet button[data-ic][aria-label="Delete forever"]:hover{color:#ff453a!important}
</style>`;
