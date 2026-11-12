// Quest openers the talk card adds for a person (talk.js). Everything people say lives in scripts/lib/data/dlg-*.yml.
import { repOf } from './rep.js'
import { remodelChoices } from './remodel-quest.js'
import { l13Choices } from './level13-quest.js'
import { l31Choices } from './level31-quest.js'

const short = (it) => String(it?.id ?? '').split('/').pop()

export function realtyChoice(ctx, it, s, list) {
  if (String(it?.id ?? '').split('/').pop() !== 'l11-realty-agent' || !Array.isArray(list) || s?.home11) return list
  const asked = s?.homeAsk && ctx.now() - s.homeAsk < 120000
  const pick = asked ? { text: "Deal. I'll take the house.", tag: 'Buy $2,500' } : { text: "I want to buy the green house.", tag: 'House' }
  return [pick, ...list.filter((c) => !/house/i.test(c?.text ?? ''))].slice(0, 4)
}

export function questChoices(ctx, it, s) {
  if (!it) return []
  const id = short(it)
  const qChoices = [...remodelChoices(id, s), ...l13Choices(id, s), ...l31Choices(id, s)]
  if (id === 'l11-walker-1') {
    if (!s?.sedcoQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "That's a lot of parcels. Need a hand with a Sedco manifest?", tag: "Quest Start" })
    } else if (s?.sedcoQ === 5) {
      qChoices.push({ text: "Got it. The master security drive, out of the vault.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-meg-agent-vance') {
    if (s?.sedcoQ === 5) {
      qChoices.push({ text: "I pulled the master security drive out of Sedco's vault. Want it?", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-trader-kael') {
    if (!s?.craneQ && repOf(s, "bntg") > -35) {
      qChoices.push({ text: "Docks are dead quiet. Something wrong with the canal?", tag: "Quest Start" })
    } else if (s?.craneQ === 4) {
      qChoices.push({ text: "Valve's free. I cleared the canal lock myself.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-walker-3') {
    if (!s?.maintQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "Rough night on the maintenance rounds?", tag: "Quest Start" })
    } else if (s?.maintQ === 4) {
      qChoices.push({ text: "Pressure's bled, and apartment 11-B has hot water again.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-cooper') {
    if (!s?.wheatQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "Need another pair of hands for the harvest?", tag: "Quest Start" })
    } else if ((s?.wheatQ >= 1 && s?.wheatQ < 99) && (s?.bread ?? 0) >= 1) {
      qChoices.push({ text: "Here. A fresh loaf, straight out of the hearth.", tag: "Quest Turn-In" })
    }
    if (!s?.cellarQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "Something's rattling in the storm cellar. Want me to look?", tag: "Quest Start" })
    } else if (s?.cellarQ === 2) {
      qChoices.push({ text: "Storm cellar's fine. Just the draft, and your preserves.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-maeve') {
    if (!s?.watcherQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "I'll go look at that scarecrow for you.", tag: "Quest Start" })
    } else if (s?.watcherQ === 3) {
      qChoices.push({ text: "Found document 24 sewn into its coat.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-carla-kid') {
    if (!s?.carlaQ) {
      qChoices.push({ text: "You look fed up, Carla. What would cheer you up?", tag: "Quest Start" })
    } else if ((s?.carlaQ >= 1 && s?.carlaQ < 99 && s?.kazoo) && !s?.kazooGiven) {
      qChoices.push({ text: "Close your eyes. I brought the kazoo.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-hobb') {
    if (!s?.spiderQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "Your sentries look jumpy. Need plate for the perimeter?", tag: "Quest Start" })
    } else if (s?.spiderQ >= 1 && s?.spiderQ < 99 && (s?.scrap?.chitin ?? 0) >= 3) {
      qChoices.push({ text: "Brought 3 chitin plates. Still sticky.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-ivo') {
    if (!s?.karstQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "I'll go crawl that looping karst crevice for you.", tag: "Quest Start" })
    } else {
      if ((s?.karstQ === 1 || s?.karstQ === 2) && !s?.karstSciFailed) {
        qChoices.push({ text: "Give me your Harmouth telemetry. I think I can do it on paper.", tag: "Science 45", check: { skill: "science", difficulty: 45 } })
      }
      if (s?.karstQ >= 1 && s?.karstQ < 99 && (s?.l8Loops ?? 0) >= 1) {
        qChoices.push({ text: "Passed the Face Rock twice. Here are the Face Rock readings.", tag: "Quest Turn-In" })
      }
    }
  } else if (id === 'l21-ned') {
    if (!s?.saltineQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "That condenser's hissing. Need copper wire?", tag: "Quest Start" })
    } else {
      if ((s?.saltineQ === 1 || s?.saltineQ === 2) && !s?.nedRepFailed) {
        qChoices.push({ text: "Let me at it. I can solder the bypass line myself.", tag: "Repair 35", check: { skill: "repair", difficulty: 35 } })
      }
      const wireCount = String(s?.items ?? '').split(',').filter(x => x === 'wire' || x === 'copper').length + (s?.scrap?.wire ?? 0);
      if (s?.saltineQ >= 1 && s?.saltineQ < 99 && wireCount >= 3) {
        qChoices.push({ text: "Brought 3 copper wire coils. Clean ones.", tag: "Quest Turn-In" })
      }
    }
  } else if (id === 'l21-goknar') {
    if (!s?.edgesQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "I'll patrol the hallway down to the Edges.", tag: "Quest Start" })
    } else if (s?.edgesQ >= 1 && s?.edgesQ < 99 && s?.l21Scouted) {
      qChoices.push({ text: "Walked the Edges perimeter and secured the dark corridor. Breaker's holding.", tag: "Quest Turn-In" })
    }
  }

  return qChoices
}
