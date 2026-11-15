// Quest openers the talk card adds for a person (talk.js). Everything people say lives in scripts/lib/data/dlg-*.yml.
import { repOf } from './rep.js'
import { remodelChoices } from './remodel-quest.js'
import { l13Choices } from './level13-quest.js'
import { l31Choices } from './level31-quest.js'
import { l109Choices } from './level109-quest.js'
import { beastChoices } from './l5-beast.js'
import { hubChoices } from './hub-quest.js'
import { ch2Choices } from './ch2-quest.js'
import { hubErrandChoices } from './hub-errands.js'
import { fieldErrandChoices } from './field-errands.js'
import { factionChoices } from './faction-dialogue.js'
import { megAssignmentChoices } from './meg-assignment.js'
import { l70Choices } from './level70-quest.js'
import { l10Choices } from './level10-quests.js'
import { l11Choices } from './level11-quests.js'
import { l8Choices } from './level8-quests.js'
import { l61Choices } from './level61-quests.js'
import { l178Choices } from './level178-quests.js'
import { l132Choices } from './l132-quests.js'
import { wireCount } from './level21-quests.js'
import { l1cChoices } from './level1c-quest.js'

const short = (it) => String(it?.id ?? '').split('/').pop()

export function realtyChoice(ctx, it, s, list) {
  if (String(it?.id ?? '').split('/').pop() !== 'l11-realty-agent' || !Array.isArray(list) || s?.home11) return list
  const asked = s?.homeAsk && ctx.now() - s.homeAsk < 120000
  const pick = asked ? { text: "Deal. I'll take the house.", tag: 'Buy $2,500' } : { text: "I want to buy the green house.", tag: 'House' }
  return [pick, ...list.filter((c) => !/house/i.test(c?.text ?? ''))]
}

export function questChoices(ctx, it, s) {
  if (!it) return []
  const id = short(it)
  const qChoices = [...remodelChoices(id, s), ...l13Choices(id, s), ...l31Choices(id, s), ...l70Choices(id, s), ...beastChoices(ctx, it, s), ...hubChoices(ctx, it, s), ...l61Choices(id, s), ...l178Choices(id, s), ...l132Choices(id, s), ...hubErrandChoices(it, s), ...fieldErrandChoices(ctx, it, s), ...factionChoices(it, s), ...megAssignmentChoices(it, s)]
  qChoices.push(...ch2Choices(ctx, it, s), ...l109Choices(it, s), ...l1cChoices(id, s))
  if (id.startsWith('l10-') || id.startsWith('l11-')) {
    qChoices.push(...l10Choices(id, s), ...l11Choices(id, s)) // Levels 10 and 11, written in scripts/lib/level10-quests.js and level11-quests.js
  } else if (id.startsWith('l8-')) {
    qChoices.push(...l8Choices(id, s)) // Level 8's three quests, written in scripts/lib/level8-quests.js
  } else if (id === 'l21-ned') {
    if (!s?.saltineQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "That condenser's hissing. Need copper wire?", tag: "Quest Start" })
    } else {
      if ((s?.saltineQ === 1 || s?.saltineQ === 2) && !s?.nedRepFailed) {
        qChoices.push({ text: "Let me at it. I can solder the bypass line myself.", tag: "Repair 35", check: { skill: "repair", difficulty: 35 } })
      }
      if (s?.saltineQ >= 1 && s?.saltineQ < 99 && wireCount(s) >= 3) {
        qChoices.push({ text: "Brought 3 copper wire coils. Clean ones.", tag: "Quest Turn-In" })
      }
      if (s?.saltineQ === 99) qChoices.push({ text: "Freezer still holding?", tag: "Talk" })
    }
  } else if (id === 'l21-goknar') {
    if (!s?.edgesQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "I'll patrol the hallway down to the Edges.", tag: "Quest Start" })
    } else if (s?.edgesQ >= 1 && s?.edgesQ < 99 && s?.l21Scouted) {
      qChoices.push({ text: "Walked the dark corridor to the Edges. Nothing's crossing the line.", tag: "Quest Turn-In" })
      if (!s?.edgesSurvFailed) qChoices.push({ text: "The Smilers stop where the light stops. Keep the tubes lit and they stay put.", tag: "Survival 30", check: { skill: "survival", difficulty: 30 } })
    } else if (s?.edgesQ === 99) {
      qChoices.push({ text: "How's the line holding?", tag: "Talk" })
    }
  }

  return qChoices
}
