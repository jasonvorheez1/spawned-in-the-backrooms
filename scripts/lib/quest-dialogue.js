// Briefings are shown before accepting a job. Keys include the NPC, because two people may ask the same question.
const OFFERS = {
  'meg-callum': ["Seven cans are missing from my crates. Ask the doctor or look around the stores, and find out where they went. Can you do that?", "Callum is missing seven cans. Ask Dr. Ortiz, examine the crates, or find someone else who knows the camp."],
  'meg-ortiz': ["A runner drank bad water. Callum has the only tin of purification tablets, and I need it for the patient. Will you speak to him?", "Dr. Ortiz needs Callum's purification tablets for a sick runner. Talk, bargain, or find another way to get them."],
  'l0-bntg-kade': ["There's a sealed station on the far east side of Level 0. Find our seal and report back; if you can reach it, I'll give you a card and the rest of the job. Interested?", "Kade wants a route surveyed to the sealed station. Find the B.N.T.G. seal on Level 0's far east wall, past the lights, then report back."],
  'l11-walker-1': ["Sedco's night alarm tripped on camera four and time-locked the shop and its vault, with a week of my signed manifests inside. Get into the terminal out front, blind camera four, and pull the master drive from the vault under 14th Street. We split the cash. You in, chief?", "The courier's manifests are locked in Sedco Spotlight's vault. Get into terminal SEDCO-SEC-01 (log in or hack it; the courier may know the password [Speech 30]), blind camera four with the stage spotlight, and bring back the master drive from under 14th Street. Vance at Base Beta wants the drive too."],
  'l11-meg-agent-vance': ["There's a lit window in the alley by the green dumpster. People walk into it and don't come out. Commander Harris walked in and walked out again, and he left a tape about how. It's on the radio desk here. Want to know what's on the other side, citizen?", "Specialist Vance says the lit window in the Level 11 alley kills whoever walks into it, except Cmdr. Harris, who recorded how he got through. Hear Harris's MATRIX tape from the Base Beta outpost desk (or get Vance to tell you [Speech 35]), then walk into the window."],
  'l11-trader-kael': ["The spillway valve's jammed, so the canal lock won't fill, and the Guild of Many barge out of Level 6.1 is stuck outside it with my coffee on board. The pilot won't dock without a clear lock-water sample — and checking with the Guild back in 6.1 gets the customs waybill sorted faster too. Will you take a look, boss?", "Kael's coffee barge from Level 6.1 can't dock until the spillway valve is freed. Find the paper crane on the canal wall (or pick up the Guild's barge waybill in Level 6.1), clear the spillway valve [Repair 35, easier with the crane's blessing or Guild waybill], draw a lock-water sample, and bring it to Kael."],
  'l61-amber-a': ["Her partner left that notice three sleeps back — bright red coat, came off the 8:15 bus route through the glass doors into Level 11, then nothing. Search the 11th Avenue crossing out there, follow any lead through the tunnels to our camp in The Hub, and bring me word she's alive. Can you walk that far, sweetie?", "Wren at Camp Amber is looking for Bee, last seen wearing a red coat off Level 11's 8:15 bus route. Search the 11th Avenue crossing in Level 11, follow her trail to Camp Amber in The Hub (Jo or Pip), and bring word back to Wren in Level 6.1."],
  'l61-guard-a': ["The back stockroom door sealed as 6.1-02 — someone logged birthday music bleeding through the drywall at 03:14. Inspect the seal back there, crawl the east suction vent down to Base Gamma so Scanner Tech Vale can read the frequency, and pull the relay tape through our Level 6 door if you carry night vision. Want the contract?", "The M.E.G. Guard at the Level 6 checkpoint wants Seal 6.1-02 ('PARTY ROOM') investigated. Inspect the seal in the Level 6.1 Stockroom, drop down the east suction vent to Level 3 to consult Vale at Base Gamma (optionally pull Relay 6-A in Level 6 with NVG), and bring Vale's dampener ruling back to Level 6.1."],
  'l61-guild-a': ["Four hundred and twelve ways fill the Book, yet two beside this kitchen remain unlogged: the suction vent down to Level 3 and the vending drop spilling people down from Level 4. Survey both ends cleanly for Page 413 — and keep it out of M.E.G. lockboxes. Will you walk it, traveller?", "The Guild of Many wants two unmapped Snackrooms thresholds recorded for Page 413: check the Guild chalk plate under the Level 3 suction grille, then inspect a Level 4 break-room vending machine (or consult Sgt. Okafor at Base Omega). Decide whether to give Page 413 to the Guild or sell the route telemetry to the M.E.G. Guard."],
  'l61-sal': ["The facelings replicate fries forever, kid, but you can't bluff real wheat flour or whole roasted beans. Slip through the glass doors to Level 11, walk Farm Road south into Level 10 for a sack of flour from Wren, grab my coffee tin from Trader Kael on your way back, and bring them to my grill. Deal?", "Sal at Burger Bop needs real provisions from beyond Level 6.1: travel through Level 11 to Outpost Bountiful in Level 10 for Wren's flour sack, pick up roasted coffee from Trader Kael in Level 11 (free if you cleared his canal barge), and return to Burger Bop."],
  'l11-walker-3': ["The city put a roadworks on the west lane overnight and hooked its compressor into my steam main. It's whistling like a kettle. And 11-B's had no heat for three nights. Bleed the compressor, then sort the apartment. Will you?", "The night-shift janitor needs the west-lane roadworks compressor bled [Repair 30, or take the steam], then 11-B's radiator bled, its tap run and its radio set to 104.2, the station its boiler keeps time by."],
  'l10-meg-cooper:harvest': ["The Base Beta caravan won't buy this wheat until somebody bakes a loaf from it and eats it, on account of every grain being the same. Cut three sheaves of the golden wheat, grind them at the windmill, bake a loaf in the hearth and bring it to me. Will you help, hon?", "Cooper needs a loaf baked from Bountiful's wheat to prove the crop to the Base Beta caravan. Cut three golden wheat sheaves (or ask Cooper which rows are ripe [Survival 30]), grind them at the windmill and bake the loaf in the farmhouse hearth."],
  'l10-meg-cooper:cellar': ["Something's been rattling the jars in the storm cellar behind the farmhouse since the fog came in. Open it, look in the pantry, and come tell me what it is. If it's alive, you leave it be. Will you look?", "Cooper hears a rattle in the storm cellar behind the farmhouse. Look in the pantry, shore up whatever you find if you can [Survival 30], and don't fight it. Report back to Cooper."],
  'l10-meg-maeve': ["The scarecrow in the east barley field turns, and when it does my compass swings toward it. A surveyor named Pell left her log in its coat the night she stopped reporting. I want that log. Will you fetch it?", "Dr. Maeve wants Pell's field log (Document 24) from the coat of the scarecrow in the east barley field. Crouch while you search it, or it turns on you [Sneak 30]. Read its diagram right and Maeve may be grateful [Science 40]."],
  'l8-carla-kid': ["I had a tin whistle. Me and Mum played it when the singing came, so it couldn't hear our names. It got stood on when the water came. Mum says there's a stone kazoo on a shelf on Hyperspace Lane, where the lights go blue. Can you get it? I'll give you my good bandage. And cold water.", "Carla wants something to play over the Lightless singing. Fetch the stone kazoo from the flowstone shelf on Hyperspace Lane, or try mending her squashed tin whistle [Repair 35]."],
  'l8-hobb': ["Spiders past the red glyph are testing the wire every night. Bullets skip off their backs, but that shell's the best plating down here. Three plates and the fence holds. Camp pays sixty and a crate from the reserve. You on, butty?", "Hobb needs three chitin plates for the 9th Road camp fence. Take them off the cave spiders past the red glyph, or build plates from 6 spider silk and 3 tar pitch [Repair 35]."],
  'l8-ivo': ["Dell mapped every passage but one: the crevice past Marker 78. It l-loops. You pass the Face Rock, crawl on, and pass it again without turning round. She drowned before she closed it. I would like her map finished. Crawl it, or if you are good with numbers, work it from my telemetry. Fifty, two batteries and a repair kit.", "Ivo wants the loop past Marker 78 surveyed to finish Dell's map. Crawl the tight tube until it brings you back out by the Face Rock, or work the loop out from his telemetry [Science 45]."],
  'l21-ned': ["A freezer condenser is leaking. I need three coils of copper wire from the Exploration Wing, unless you can repair the bypass yourself. Can you help?", "Ned needs three copper wire coils from the Exploration Wing, or a direct repair to the condenser bypass."],
  'l21-goknar': ["The lights failed on the way to the Edges. Walk the corridor until it goes dark and tell me what's moving out there. There may be Smilers past the line. Will you go?", "Goknar wants the dark corridor to the Edges walked to where the lights die, and a report on the Smilers past the line."],
  'l11-realty-agent': ["A crew in grey coats tried to remodel a corner of Level 0 and botched it. They carry canisters that hold a room still: Reality Fresheners. Bring me three and I'll put one in every listing. Three hundred backdollars. Interested?", "Mara of B.N.T.G. Realty wants three Reality Fresheners from the Remodeling Co. Find their half-built door in Level 0, then get the fresheners in Level 0.2: the bathroom sink, the shifting rooms, and Cap'n [Speech 40, or his paint cans]. Sell them to Mara, or give them back to Cap'n."],
  'l13p-noor': ["Bea and I came up the stairs together. She took the flat next to the chess players in the first hall, and a week ago she stopped answering. I'm leaving tonight and I can't make myself open that door. Will you knock for me?", "Noor came up to the Free Home floor with her friend Bea. Bea stopped answering her door in the first hall, next to the chess players, and Noor leaves tonight. Find out what happened to her."],
  'l31-q-marlowe': ["The DJ has a master tape, Side B. Every song in this rink is on it. I want to dub it and sell it to people who need a good memory. Three hundred backdollars if you bring it to me. Ask the coach and the DJ where it's kept. Interested?", "Marlowe of the B.N.T.G. wants the DJ's master tape, Side B, to copy and sell. The rink's facelings will not take kindly to losing it. Ask the Coach and the DJ, then decide who should have it."],
  'l70-npc-marinerson': ["Three days the taps have coughed and nothing. Almond water runs under this whole town in pipes older than me, and something's stopped it. The Prime Minister at the Parliament Hotel might know what. Would you go and ask her?", "Froidetown's almond water stopped three days ago. Noah Marinerson wants someone to ask Prime Minister Larsson at the Parliament Hotel why, and to get it running."],
  'l70-npc-larsson': ["A B.N.T.G. outfit camped at the Froston rig, pumped something out of the ground, and left the week our taps went dry. Their footlocker is still out there. If there are papers in it, I'd like to know what they say. Would you look?", "Prime Minister Larsson suspects the B.N.T.G. camp at Froston had something to do with the dry taps. Search their footlocker by the rig, then decide who should see what's inside."],
  'l70-npc-ines': ["Snow hounds have been dragging off anyone who walks the outskirts alone. The Guard can't cover it all. Thin them out, six, and the Crown taxes pelts, so bring four to me. Unless you know a better way. Can you take that on?", "Snow hounds are taking people on the Froidetown outskirts. Sergeant Ines of the River Guard wants six dealt with and four pelts paid as tax, or a better idea for keeping them off."],
  'l5-ines-radio': ["Hey, you, by the door. Ines, M.E.G. boiler maintenance. I'm shut in the Cold Room with hounds outside it, and my night-vision goggles are in a case I dropped by the south compressor. Bring them to the drop box at my door and they're yours. I can't use them from in here. Will you go?", "Ines, a M.E.G. boiler tech shut in the Cold Room, dropped her night-vision goggles by the south compressor. Bring them to the M.E.G. drop box at the Cold Room door."],
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
  'the-saltine-quota': 'l21-ned', 'the-edges-sentry': 'l21-goknar', 'fresh-paint': 'l11-realty-agent', 'the-lit-window': 'l11-meg-agent-vance',
  'l13-still-home': 'l13p-noor', 'l31-side-b': 'l31-q-marlowe', 'l70-dry-pipes': 'l70-npc-marinerson',
  'l70-pelt-tax': 'l70-npc-ines', 'l70-ledger': 'l70-npc-larsson', 'ines-s-goggles': 'l5-ines-radio',
  'coat-of-red-bus-to-nowhere': 'l61-amber-a',
  'sealed-6-1-02-no-candles-allowed': 'l61-guard-a',
  'four-hundred-and-thirteen': 'l61-guild-a',
  'two-menus-short': 'l61-sal',
}
const HUB_JOURNAL = {
  'the-tenth-tunnel': "Follow Dina's trail through the Hub. Doorstep Carpet's ledger and Camp Amber may know where she went.",
  'hub-missing-key': "A key vanished from Lin's cabinet. Ask Dace about his watch, then decide what to do with the key if you find it.",
  'hub-lost-records': "Sato wants three abandoned 2019 survey tapes from beyond the M.E.G. barrier. Sato and Camp Amber both have an interest in the recordings.",
  'hub-uncharted': "A recording mentions an unmarked door at the end of the dark road. Examine it, then choose who to tell.",
  'err-jo-supply': "Jo needs two bandages for Camp Amber's newcomer box. A first-aid kit is another option.",
  'err-pip-route': "Pip needs the open doors in the seventh and tenth tunnels checked.",
  'err-okafor-cold-door': "Okafor wants a report on the fifth tunnel's cold door and the unmarked door beyond the barrier.",
  'err-sato-markers': "Sato needs the mark on the fourth door in the third tunnel for his survey.",
}
export const questBriefing = (id) => id === 'the-way-back' ? 'Look for a way out. Follow the leads you uncover and ask people what they know.' : HUB_JOURNAL[id] ?? OFFERS[JOURNAL_OFFERS[id]]?.[1] ?? ''
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
