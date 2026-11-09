// the title (johnadams2, Nov 8): the name and one START over the live halls. Nothing else.
// one setting under it: BODIES flips every character between humans and furries (Shelly, Nov 8)
// Backspace mid-game shows the same screen as a pause, its one button RESUME.
const CSS = `<style>
#mm{position:fixed;inset:0;pointer-events:auto;background:linear-gradient(0deg,rgba(6,5,2,.78) 0,rgba(6,5,2,.35) 38%,rgba(6,5,2,0) 62%),radial-gradient(ellipse 110% 90% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f3eedf;animation:mm-in 1.4s ease-out both}
#mm .col{position:absolute;left:7vw;bottom:12vh}
#mm h1{margin:0;font-weight:700;font-size:clamp(44px,6.4vw,92px);line-height:.95;letter-spacing:-.02em;text-shadow:0 2px 18px rgba(0,0,0,.45)}
#mm button{margin-top:3.2vh;background:none;border:0;padding:6px 0;color:#f3eedf;font:inherit;font-size:clamp(17px,1.5vw,22px);font-weight:500;letter-spacing:.32em;cursor:pointer;opacity:.82;border-bottom:1px solid rgba(243,238,223,0);transition:opacity .15s,border-color .15s}
#mm button:hover{opacity:1;border-bottom-color:rgba(243,238,223,.8)}
@keyframes mm-in{from{opacity:0}to{opacity:1}}
</style>`
export function mainMenu(ctx, player, launch = false) {
  const pause = !launch && player.state?.menuKind === "pause"
  const k = pause ? "resume" : "start"
  return `${CSS}<div id="mm" data-modal><div class="col">
    <h1>The Backrooms</h1>
    <button onclick="sendAction('mmenu',{k:'${k}'},{relockPointer:true})">${pause ? "RESUME" : "START"}</button><br>
    <button style="font-size:clamp(12px,1vw,15px);margin-top:2vh" onclick="sendAction('mmenu',{k:'style'})">BODIES: ${(player.state?.bodyStyle ?? ctx.world.state?.bodyStyle) === "furry" ? "FURRY" : "HUMAN"}</button>
  </div></div>`
}
