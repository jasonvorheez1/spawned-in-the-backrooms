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
  // menu backdrop (Shelly): while the menu is up the camera slowly looks around the halls from head height; gone the moment it closes
  if (ctx.self.state.menuOpen) {
    const p = ctx.self.feetPosition, t = ctx.now() / 1000
    if (!ctx.session.mmCam) { ctx.session.mmCam = { x: p.x, y: p.y, z: p.z, t0: t }; ctx.self.hidden = [...(ctx.self.hidden || []).filter((i) => i !== ctx.self.id), ctx.self.id] }
    const c = ctx.session.mmCam, a = (t - c.t0) * 0.09 + 0.6, bob = Math.sin((t - c.t0) * 0.21) * 0.06
    const eye = { x: c.x - Math.sin(a) * 0.35, y: c.y + 1.72 + bob, z: c.z - Math.cos(a) * 0.35 }
    const pitch = -0.04 + Math.sin((t - c.t0) * 0.13) * 0.05
    ctx.view.camera = { eye, aim: { x: eye.x - Math.sin(a) * 6, y: eye.y + pitch * 6, z: eye.z - Math.cos(a) * 6 }, fov: 62 }
    return
  }
  if (ctx.session.mmCam) { ctx.session.mmCam = null; ctx.view.camera = null; ctx.self.hidden = (ctx.self.hidden || []).filter((i) => i !== ctx.self.id) }
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
