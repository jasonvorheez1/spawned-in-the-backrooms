// Level 22 toys (Shelly Nov 17 "ADD INTeractables"): E rings press; state.use picks what it does.
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const SAY = {
  pool: ["You break. The balls scatter across felt nobody brushed in years.", "pool-break-shot-balls-scatter-clack"],
  foos: ["You spin the rods. The little men flip and clatter.", "foosball-rods-spin-rattle-and-ball-clack"],
  router: ["The router's lights blink. No network. There never was one down here.", "electronic-beep-short-dead-device"],
  sew: ["The treadle creaks. A half-sewn sleeve still under the needle.", "old-sewing-machine-treadle-creak-and-needle-chatter"],
}
export const ears = {
  press: (ctx, m) => {
    const p = m?.by && ctx.getObject(m.by), ps = p?.state; if (!ps || ps.dead) return
    const s = ctx.self.state, at = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
    if (s.use === 'drum') {
      s.lit = !s.lit; s.verb = s.lit ? 'Smother' : 'Light'
      ctx.self.fx = s.lit ? { script: "fx\npop flame rate=40 on=disc(.22) life=.4..0.8 v=up(1.4) size=.2..0.35 acc=buoy(2)+drag(1.5) sz=$size*(.5>1:.4>.2) col=hdr(4,2.6,1)>hdr(2,.6,.1)>hdr(.5,.1,0) a=0>.15:1>0 r=sprite(flame-wisp,add)\npop glow n=1 at=<0,1.1,0> r=light(<1,.55,.25>,fire()*18,9)" } : null
      if (s.lit) { ps.sanity = Math.min(100, (ps.sanity ?? 100) + 4); ps.notice = { text: "Warmth. Your hands stop shaking.", at: ctx.now() } }
      ctx.emit('playSound', { clip: G(s.lit ? 'fire-ignite-whoosh-in-metal-barrel' : 'fire-smothered-hiss'), position: at, volume: 0.7 })
      return
    }
    const r = SAY[s.use]; if (!r) return
    ps.notice = { text: r[0], at: ctx.now() }
    if (s.use === 'pool' || s.use === 'foos') ps.sanity = Math.min(100, (ps.sanity ?? 100) + 2)
    ctx.emit('playSound', { clip: G(r[1]), position: at, volume: 0.8 })
  },
}
