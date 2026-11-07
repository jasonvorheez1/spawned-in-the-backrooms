// the main menu (Shelly, Nov 7): opens on each fresh visit and on Backspace (Shelly); the world stays live behind it.
// CONTINUE closes it; CHARACTER opens the critter creator, whose "done" comes back here.
export function update(ctx) {
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return ctx.sleep()
  if (!ctx.session.menuMark) {
    ctx.session.menuMark = true; const st = ctx.self.state
    if (!st.madeChar && (st.xp || st.lvl || st.level || st.visits)) st.madeChar = true // a save that already played keeps its critter
    if (!st.madeChar) { st.madeChar = true; st.menuOpen = false; st.wardrobeOpen = true; st.wrMenu = true; st.wrTab = 'body' } // a new save makes its critter first (Shelly)
    else st.menuOpen = true
  }
  ctx.sleep()
}
export function onInput(ctx, input) {
  const st = ctx.self.state
  if (input.pressed?.mainmenu && !st.talkWith && !st.mj?.seats) { st.menuOpen = !st.menuOpen; if (st.menuOpen) { st.wardrobeOpen = false; st.wrMenu = false } }
  const d = input.actionData?.mmenu
  if (input.pressed?.mmenu && d) {
    if (d.k === 'play') st.menuOpen = false
    if (d.k === 'char') { st.menuOpen = false; st.wardrobeOpen = true; st.wrMenu = true; st.wrTab = st.wrTab || 'body' }
  }
}
