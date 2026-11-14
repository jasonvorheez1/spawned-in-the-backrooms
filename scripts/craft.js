// Crafting and survival (scripts/lib/data/craft.yml). Hunger and thirst fall with time; at 0 you waste away (hp stops at 1).
// Scrap becomes ammo, kits, batteries and fuses at your hands (Y) or at a workbench you built (B, then look at it and press E).
// Recipes are gated by a Fallout-style skill level, and spare skill points buy a chance of an extra item.
// State: player.state.hunger, thirst (0..100), craftOpen ('hand' | 'bench'), craftBench (the bench's id).
import { canOpen, openWrist } from './lib/screen.js'
import { heard } from "./lib/hear.js";
import C from './lib/data/craft.yml'
import { needsMul } from './lib/run-opts.js'
import L21H from './lib/data/level21.yml'
import B from './lib/data/breakables.yml'
import { SKILL_NAMES as SKN } from './lib/skill-check.js'
import { takeToken, gain } from './player.js'
import { recipeStatus, maxMakes, craftOne, benchAvailable, scrapCount, inputName, CRAFT_LIMIT, CATS } from './lib/craft.js'
import {raycast} from 'builtin/physics'

const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const note = (s, ctx, text) => { s.notice = { text, at: ctx.now() } }

export function onInput(ctx, input) {
  if (!input.pressed?.craft && !input.pressed?.make) return // only its own keys: every other press skips the player's whole state read
  const s = ctx.self.state
  if (s.level == null) return
  if (input.pressed?.craft) { if (s.craftOpen) s.craftOpen = ''; else if (canOpen(s, ctx.self.place, 'craft')) { openWrist(s, 'craft', 'hand'); s.craftBench = '' } }
  const d = input.actionData?.make
  if (input.pressed?.make && d && typeof d.k === 'string') act(ctx, s, d)
}

function act(ctx, s, d) {
  if (d.k === 'close') { s.craftOpen = ''; return }
  if (d.k === 'tab') { if (CATS.some(([c]) => c === d.c)) s.craftTab = d.c; return }
  if (d.k !== 'make' || !s.craftOpen) return
  const id = String(d.id); if (!Object.hasOwn(C.recipes,id)) return
  const r=C.recipes[id]
  const deny = (t) => { note(s, ctx, t); heard(ctx, { clip: SND('ui-denied-click'), position: ctx.self.feetPosition, volume: .35, maxDistance: 8 }, { audience: { player: ctx.self.id } }) }
  if(s.dead || !canOpen(s,ctx.self.place,'craft'))return
  if(s.craftOpen==='bench' && !liveBench(ctx,s)){s.craftOpen='';s.craftBench='';return deny('Workstation is out of reach or blocked')}
  const st=recipeStatus(s,id)
  if(st.reason==='Recipe unavailable'||!st.known)return deny(st.reason)
  if(!st.benchOk)return deny(st.reason)
  if(!st.skillOk)return deny(`Needs ${SKN[r.skill[0]]} ${r.skill[1]}`)
  if(st.lack.length)return deny(`Missing ${st.lack.map(k=>`${inputName(k)} ×${r.in[k]-scrapCount(s,k)}`).join(', ')}`)
  if(!st.roomOk)return deny(st.reason)
  const raw=Number(d.n),requested=Number.isFinite(raw)?Math.max(1,Math.min(CRAFT_LIMIT,Math.floor(raw))):1,want=d.n==='max'?maxMakes(s,id):Math.min(requested,maxMakes(s,id))
  let made=0,extra=0,why=''
  const sounds=new Set()
  for(let i=0;i<want;i++){
    const effects=[],walk=ctx.self.session?.['player.js'],dwalk={battery:walk?.battery??s.battery},draftContext=(draft)=>({self:{id:ctx.self.id,state:draft,feetPosition:ctx.self.feetPosition,session:{'player.js':dwalk}},now:()=>ctx.now(),random:()=>ctx.random(),emit:(...args)=>effects.push(args)})
    const result=craftOne(s,id,(draft,token)=>{const mark=effects.length,k=token.startsWith('weapon:')?token.slice(7):null,had=k&&String(draft.weapons??'').split(',').includes(k),result=takeToken(draftContext(draft),token,{xp:false});if(result?.ok&&k&&!had&&r.skill)draft['cnd_'+k]=Math.round(Math.max(60,Math.min(100,60+st.got-st.need)));if(!result?.ok)effects.length=mark;return result},ctx.random()<st.bonusChance)
    if(!result.ok){why=result.msg;break}
    for(const [key,value]of Object.entries(result.state))if(value!==s[key])s[key]=value
    if(walk&&dwalk.battery!==walk.battery)walk.battery=dwalk.battery // crafted charge reaches the real flashlight (it used to land on a throwaway copy and be overwritten next frame)
    for(const args of effects){if(args[0]==='playSound'){const clip=args[1]?.clip;if(sounds.has(clip))continue;sounds.add(clip)}ctx.emit(...args)}
    made++;extra+=result.extra
  }
  if (!made) return deny(why || 'Nothing made')
  gain(ctx, (r.skill?.[1] ?? 5) * 0.2 * made) // a little XP for every make, more for harder recipes (Savi's pick)
  note(s, ctx, `Made ${r.name}${made > 1 ? ' ×' + made : ''}${extra ? ` (+${extra} extra)` : ''}${why ? ' · ' + why : ''}`)
  heard(ctx, { clip: SND(r.bench ? 'hammer-nail-wood-build' : 'bandage-wrap-cloth'), position: ctx.self.feetPosition, volume: 0.6, maxDistance: 14 })
}

export function update(ctx, dt) {
  const s = ctx.self.state, m = (ctx.self.session.craft ??= { h: null, t: null, acc: 0 })
  if (s.level == null) return
  const N = C.needs
  if (m.h == null) { m.h = s.hunger ?? 100; m.t = s.thirst ?? 100 }
  m.acc += dt
  const poll=m.acc>=.5
  if(poll){m.acc=0;if(s.craftOpen==='bench'&&!liveBench(ctx,s)){s.craftOpen='';s.craftBench=''}}
  if (ctx.self.place === 'level6' || ctx.self.place === 'bonus') { m.h = s.hunger ?? m.h; m.t = s.thirst ?? m.t; return } // Shelly: no hunger or thirst drain in Level 6
  const mul = needsMul(s) * (s.sprinting ? N.sprintMul : 1) * (ctx.self.place === 'level21' ? L21H.heat : 1) // Level 2.1 is hot and humid · needsMul: the expedition's Hunger & Thirst pick
  // the bars follow the state (eating and drinking write it from scripts/player.js)
  if (s.hunger != null && Math.abs(s.hunger - Math.round(m.h)) > 1) m.h = s.hunger
  if (s.thirst != null && Math.abs(s.thirst - Math.round(m.t)) > 1) m.t = s.thirst
  m.h = Math.max(0, m.h - N.hungerPerSec * mul * dt); m.t = Math.max(0, m.t - N.thirstPerSec * mul * dt)
  const h = Math.round(m.h), t = Math.round(m.t)
  if (h !== s.hunger) s.hunger = h
  if (t !== s.thirst) s.thirst = t
  if ((m.h <= 0 || m.t <= 0) && s.hp > 1) s.hp = Math.max(1, s.hp - N.starveHp * dt)
  if (m.h < N.low || m.t < N.low) s.sanity = Math.max(0, (s.sanity ?? 0) - N.lowSanity * dt)
  if (poll) {
    if (s.payout) { const p = s.payout; s.payout = null; gain(ctx, p.xp ?? 0); const itemOpt = (p.noItemXp || p.xp === 0) ? { xp: false } : undefined; for (const t of p.items ?? []) takeToken(ctx, t, itemOpt); if (p.text) s.notice = { text: p.text, at: ctx.now() } } // rewards other things owe you (Level 4's office tasks)
  }
}

function liveBench(ctx,s) {
  const bench=s.craftBench&&ctx.getObject(s.craftBench)
  if(!benchAvailable(ctx.self,bench))return false
  const f=ctx.self.worldFeetPosition??ctx.self.feetPosition,eye={x:f.x,y:f.y+1.4,z:f.z},to=bench.bounds?.center??{...(bench.worldFeetPosition??bench.feetPosition),y:(bench.worldFeetPosition??bench.feetPosition).y+.8},dx=to.x-eye.x,dy=to.y-eye.y,dz=to.z-eye.z,distance=Math.hypot(dx,dy,dz)
  return distance<.001 || !raycast(ctx,eye,{x:dx/distance,y:dy/distance,z:dz/distance},{distance,physicsOnly:true,bodies:'all',ignoreEntities:[ctx.self.id,bench.id]})
}
