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
  'l8-carla-kid': ["I had a tin whistle. Me and Mum played it when the singing came, so it couldn't hear our names. It got stood on when the water came. Mum says there's a stone kazoo on a shelf on Hyperspace Lane, where the lights go blue. Can you get it? I'll give you my good bandage. And cold water.", "Carla wants something to play over the Lightless singing. Fetch the stone kazoo from the flowstone shelf on Hyperspace Lane, or try mending her squashed tin whistle [Repair 35]."],
  'l8-hobb': ["Spiders past the red glyph are testing the wire every night. Bullets skip off their backs, but that shell's the best plating down here. Three plates and the fence holds. Camp pays sixty and a crate from the reserve. You on, butty?", "Hobb needs three chitin plates for the 9th Road camp fence. Take them off the cave spiders past the red glyph, or build plates from 6 spider silk and 3 tar pitch [Repair 35]."],
  'l8-ivo': ["Dell mapped every passage but one: the crevice past Marker 78. It l-loops. You pass the Face Rock, crawl on, and pass it again without turning round. She drowned before she closed it. I would like her map finished. Crawl it, or if you are good with numbers, work it from my telemetry. Fifty, two batteries and a repair kit.", "Ivo wants the loop past Marker 78 surveyed to finish Dell's map. Crawl the tight tube until it brings you back out by the Face Rock, or work the loop out from his telemetry [Science 45]."],
  'l21-ned': ["A freezer condenser is leaking. I need three coils of copper wire from the Exploration Wing, unless you can repair the bypass yourself. Can you help?", "Ned needs three copper wire coils from the Exploration Wing, or a direct repair to the condenser bypass."],
  'l21-goknar': ["The lights failed on the way to the Edges. Walk the corridor until it goes dark and tell me what's moving out there. There may be Smilers past the line. Will you go?", "Goknar wants the dark corridor to the Edges walked to where the lights die, and a report on the Smilers past the line."],
  'l11-realty-agent': ["A crew tried to stabilize part of Level 0 and left behind canisters called Reality Fresheners. Bring me three and I'll pay three hundred. Interested?", "Mara wants three Reality Fresheners from the remodeling crew. Find the half-built doorway in Level 0 and speak to the crew."],
  'l13p-noor': ["My friend Bea stopped answering. Her flat is in the first hall, next to the chess players. I can't face going in myself. Will you check on her?", "Noor is worried about Bea. Check the flat in the first hall, next to the chess players."],
  'l31-q-marlowe': ["I'm buying a master tape called Side B. The DJ and the coach might know where it is. Bring it to me and I'll pay three hundred. Interested?", "Marlowe wants the DJ's Side B master tape. Ask the coach and DJ about it before deciding what to do with it."],
  'l70-npc-marinerson': ["The town's taps have been dry for three days. The Prime Minister at the hotel might know what's wrong. Would you ask her?", "Noah says Froidetown's water has stopped. Ask Prime Minister Larsson at the hotel about the pipes."],
  'l5-ines-radio': ["Hey, you, by the door. Ines, M.E.G. boiler maintenance. I'm shut in the Cold Room with hounds outside it, and my night-vision goggles are in a case I dropped by the south compressor. Bring them to the drop box at my door and they're yours. I can't use them from in here. Will you go?", "Ines, a M.E.G. boiler tech shut in the Cold Room, dropped her night-vision goggles by the south compressor. Bring them to the M.E.G. drop box at the Cold Room door."],
  'l70-npc-ines': ["Snow hounds are taking people near town. Thin out six and bring four pelts to the Guard. Can you take that on?", "Sergeant Ines wants six snow hounds dealt with and four pelts delivered to the Guard."],
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
  'l70-pelt-tax': 'l70-npc-ines', 'ines-s-goggles': 'l5-ines-radio',
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
