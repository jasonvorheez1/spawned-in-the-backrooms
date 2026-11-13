// Briefings are shown before accepting a job. Keys include the NPC, because two people may ask the same question.
const OFFERS = {
  'meg-callum': ["Seven cans are missing from my crates. Ask the doctor or look around the stores, and find out where they went. Can you do that?", "Callum is missing seven cans. Ask Dr. Ortiz, examine the crates, or find someone else who knows the camp."],
  'meg-ortiz': ["A runner drank bad water. Callum has the only tin of purification tablets, and I need it for the patient. Will you speak to him?", "Dr. Ortiz needs Callum's purification tablets for a sick runner. Talk, bargain, or find another way to get them."],
  'l0-bntg-kade': ["There's a sealed station on the far east side of Level 0. Find our seal and report back; if you can reach it, I'll give you a card and the rest of the job. Interested?", "Kade wants a route surveyed to the sealed station. Find the B.N.T.G. seal on Level 0's far east wall, past the lights, then report back."],
  'l11-walker-1': ["Sedco's alarm locked the shop and its vault. I need the security drive from downstairs. Get in and we'll split the salvage. Are you interested?", "A courier wants Sedco's security drive. Override the front terminal, recover the camera backup, then reach the vault."],
  'l11-trader-kael': ["The canal lock is jammed, and a barge can't dock. There's a paper crane on the canal wall that might point you toward the problem. Can you take a look?", "Kael's canal shipment is held up by a jammed spillway valve. Start at the paper crane on the canal wall."],
  'l11-walker-3': ["The compressor on the west lane is overpressured, and 11-B has no hot water. Could you bleed it and check the apartment's radiator?", "The maintenance worker needs the west-lane compressor bled and the radiator in apartment 11-B checked."],
  'l10-meg-cooper:harvest': ["The caravan needs bread. Cut three sheaves of golden wheat, grind them at the windmill, then bake a loaf in the hearth. Will you help?", "Cooper needs a loaf for the caravan. Gather three golden wheat sheaves, grind them at the windmill, and use the outpost hearth."],
  'l10-meg-cooper:cellar': ["There's a rattle in the storm cellar behind the farmhouse. Open it and check the pantry. If something's there, come tell me; don't fight it. Will you look?", "Cooper heard a noise in the storm cellar behind the farmhouse. Inspect the pantry and report back."],
  'l10-meg-maeve': ["The scarecrow in the east barley field makes my compass jump. I'd like someone to inspect its coat. Are you willing?", "Maeve wants the eastern scarecrow investigated. Search its coat and bring her anything relevant."],
  'l8-carla-kid': ["Mum says there's a stone kazoo in a niche on Hyperspace Lane. If you find it, could I have it? I can give you my bandage and some water.", "Carla lost her whistle. Look for the stone kazoo in the glowing niche on Hyperspace Lane, then bring it to her."],
  'l8-hobb': ["We need three spider chitin plates to reinforce the camp fence. The spiders are past the red glyph. Interested?", "Hobb needs three chitin plates from the cave spiders past the red glyph for the camp's defenses."],
  'l8-ivo': ["The crevice past Marker 78 loops back on itself. I need readings from someone who has crawled it, though the telemetry might offer another way. Will you help?", "Ivo wants readings from the looping crevice past Marker 78. Crawl it or discuss the telemetry with him."],
  'l21-ned': ["A freezer condenser is leaking. I need three coils of copper wire from the Exploration Wing, unless you can repair the bypass yourself. Can you help?", "Ned needs three copper wire coils from the Exploration Wing, or a direct repair to the condenser bypass."],
  'l21-goknar': ["The lights failed on the way to the Edges. Walk the corridor until it goes dark and tell me what's moving out there. There may be Smilers past the line. Will you go?", "Goknar wants the dark corridor to the Edges walked to where the lights die, and a report on the Smilers past the line."],
  'l11-realty-agent': ["A crew tried to stabilize part of Level 0 and left behind canisters called Reality Fresheners. Bring me three and I'll pay three hundred. Interested?", "Mara wants three Reality Fresheners from the remodeling crew. Find the half-built doorway in Level 0 and speak to the crew."],
  'l13p-noor': ["Bea and I came up the stairs together. She took the flat next to the chess players in the first hall, and a week ago she stopped answering. I'm leaving tonight and I can't make myself open that door. Will you knock for me?", "Noor came up to the Free Home floor with her friend Bea. Bea stopped answering her door in the first hall, next to the chess players, and Noor leaves tonight. Find out what happened to her."],
  'l31-q-marlowe': ["The DJ has a master tape, Side B. Every song in this rink is on it. I want to dub it and sell it to people who need a good memory. Three hundred backdollars if you bring it to me. Ask the coach and the DJ where it's kept. Interested?", "Marlowe of the B.N.T.G. wants the DJ's master tape, Side B, to copy and sell. The rink's facelings will not take kindly to losing it. Ask the Coach and the DJ, then decide who should have it."],
  'l70-npc-marinerson': ["Three days the taps have coughed and nothing. Almond water runs under this whole town in pipes older than me, and something's stopped it. The Prime Minister at the Parliament Hotel might know what. Would you go and ask her?", "Froidetown's almond water stopped three days ago. Noah Marinerson wants someone to ask Prime Minister Larsson at the Parliament Hotel why, and to get it running."],
  'l70-npc-larsson': ["A B.N.T.G. outfit camped at the Froston rig, pumped something out of the ground, and left the week our taps went dry. Their footlocker is still out there. If there are papers in it, I'd like to know what they say. Would you look?", "Prime Minister Larsson suspects the B.N.T.G. camp at Froston had something to do with the dry taps. Search their footlocker by the rig, then decide who should see what's inside."],
  'l70-npc-ines': ["Snow hounds have been dragging off anyone who walks the outskirts alone. The Guard can't cover it all. Thin them out, six, and the Crown taxes pelts, so bring four to me. Unless you know a better way. Can you take that on?", "Snow hounds are taking people on the Froidetown outskirts. Sergeant Ines of the River Guard wants six dealt with and four pelts paid as tax, or a better idea for keeping them off."],
}

export function jobOffer(npc, choice) {
  if (choice?.tag !== 'Quest Start') return null
  const id = String(npc?.id ?? '').split('/').pop()
  const key = id === 'l10-meg-cooper' ? id + (choice.text.toLowerCase().includes('harvest') ? ':harvest' : ':cellar') : id
  const row = OFFERS[key]
  return row ? { briefing: row[0], journal: row[1] } : null
}

// Existing saves get the same context without having to restart a quest.
const JOURNAL_OFFERS = {
  'short-rations': 'meg-callum', 'bad-water': 'meg-ortiz', 'the-zenith-survey': 'l0-bntg-kade',
  'spotlight-on-sedco': 'l11-walker-1', 'the-paper-bird-s-blessing': 'l11-trader-kael',
  'capital-infrastructure-the-night-shift': 'l11-walker-3', 'the-golden-bumper': 'l10-meg-cooper:harvest',
  'cellar-in-the-shadows': 'l10-meg-cooper:cellar', 'the-still-watcher': 'l10-meg-maeve',
  'carla-s-melody': 'l8-carla-kid', 'plate-for-the-perimeter': 'l8-hobb', 'the-karst-survey': 'l8-ivo',
  'the-saltine-quota': 'l21-ned', 'the-edges-sentry': 'l21-goknar', 'fresh-paint': 'l11-realty-agent',
  'l13-still-home': 'l13p-noor', 'l31-side-b': 'l31-q-marlowe', 'l70-dry-pipes': 'l70-npc-marinerson',
  'l70-pelt-tax': 'l70-npc-ines', 'l70-ledger': 'l70-npc-larsson',
}
export const questBriefing = (id) => id === 'the-way-back' ? 'Look for a way out. Follow the leads you uncover and ask people what they know.' : OFFERS[JOURNAL_OFFERS[id]]?.[1] ?? ''
export function questProgress(id, s) {
  if (id === 'the-golden-bumper' && s.wheatQ === 2) return `Golden wheat: ${Math.min(3, s.wheat ?? 0)}/3`
  if (id === 'plate-for-the-perimeter' && s.spiderQ === 2) return `Chitin plates: ${Math.min(3, s.scrap?.chitin ?? 0)}/3`
  if (id === 'the-saltine-quota' && s.saltineQ === 2) {
    const wire = String(s.items ?? '').split(',').filter((x) => x === 'wire' || x === 'copper').length + (s.scrap?.wire ?? 0)
    return `Copper wire: ${Math.min(3, wire)}/3`
  }
  return ''
}

// Five rows fit the card: three choices, a page control and Leave.
export function choicePage(list, page, bye) {
  if (list.length <= 4) return [...list, bye]
  const pages = Math.ceil(list.length / 3), index = ((page % pages) + pages) % pages
  return [...list.slice(index * 3, index * 3 + 3), { text: `More choices (${index + 1}/${pages})`, tag: 'More', node: 'page' }, bye]
}
