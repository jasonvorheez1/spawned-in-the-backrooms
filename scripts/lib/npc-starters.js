// Conversation starters and dynamic choice generation for all NPCs.
import { zenithChoice } from './zenith-quest.js'
import { l1Choice } from './level1-quests.js'
import { repOf } from './rep.js'
import ASKS from "./data/talk-asks.yml";
// Starters are delivered when dialogue opens; choices give the player contextual,
// clickable RPG dialogue prompts (with Speech, Barter, Survival, Medicine checks).
import { skillsOf } from './stats.js'
import { nameOf, keyOf, isTrader, faction } from './npc-talk.js'

export const STARTERS = {
  // ---- Level 1 (M.E.G. Outpost) ----
  'meg-ale': {
    greeting: "Still breathing? Good. Keep your boots quiet and don't touch the dark puddles near the exit.",
    mood: 'calm',
    returning: "Back again, wanderer? Watch your corners, the halls don't stay empty for long.",
    friendly: "Hey! Good to see you still in one piece. What's the plan?",
    cold: "Make it quick. I've got a patrol sweep in five minutes.",
    choices: [
      {
        text: "What's the safest way to navigate Level 1?",
        tag: "Survival 25",
        check: { skill: 'survival', difficulty: 25 },
        reply: "Stick close to the walls, watch the fluorescent fixtures for flicker patterns, and avoid any puddles of brown water or dark oil. If a corridor starts smelling like damp vanilla, turn right back around.",
        failReply: "If you do not even know to stay off the wet tiles, you are not going to make it two sectors out. Walk the central trench and pray.",
        mood: 'calm',
      },
      {
        text: "What are those lone voices calling hello in the halls?",
        tag: "Lore",
        reply: "Audio mimics, or Dullers echoing dead screams from the maintenance ducts. Never answer a voice down here unless you can see their face in the light.",
        mood: 'calm',
      },
      {
        text: "You know these corridors better than anyone. Mind if I tag along?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "You move quiet and you do not panic. Fine by me. Keep your flashlight on my pack and do not lag behind.",
        failReply: "Sorry, wanderer. You are too noisy on these concrete tiles. You would draw every Duller in three sectors down on us.",
        mood: 'happy',
        recruit: true,
      },
      {
        text: "Where can I find almond water and supplies nearby?",
        tag: "Help",
        reply: "Check the supply crates behind the Base Alpha gate, or look for unlooted wooden pallets near the stairwell landings. Callum handles requisitions inside.",
        mood: 'calm',
      },
    ],
  },
  'meg-ortiz': {
    greeting: "Sit down before you fall down. Let me see where it hurts, and don't tell me you're fine.",
    mood: 'calm',
    returning: "Still walking? Let me know the moment you feel a fever or see shadows twitching.",
    friendly: "Ah, good to see you, wanderer. Take a breath. How is your condition holding up?",
    cold: "I treat injuries, not bad attitudes. What hurts?",
    choices: [
      {
        text: "Can you patch up my injuries and check my sanity?",
        tag: "Help",
        reply: "Hold still. Let me sterilize that laceration and wrap a fresh compress around your ribs. Drink half this vial of cold Almond Water. It keeps the cognitive fog from settling into your skull.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "What causes people to turn into Wretches down here?",
        tag: "Medicine 30",
        check: { skill: 'medicine', difficulty: 30 },
        reply: "Total starvation, severe dehydration, and complete psychic collapse under the hum. Their flesh degrades and the mind burns down to primal hunger. Keep your almond water levels steady and you will never turn.",
        failReply: "You do not need the clinical pathology right now. Just remember: when your canteen runs dry, your mind is on borrowed time.",
        mood: 'calm',
      },
      {
        text: "How do you stay calm surrounded by concrete and screaming pipes?",
        tag: "Lore",
        reply: "Routine. Checking pulses, boiling linen bandages, and keeping patient files organized. If you let the architecture get inside your head, you stop being a doctor.",
        mood: 'calm',
      },
      {
        text: "You've saved a lot of people here, Dr. Ortiz. Thank you.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "That means a great deal, wanderer. Most people only notice us when they are bleeding out on the cot. Here, take a spare antiseptic tin with my compliments.",
        failReply: "Save the compliments for when you survive your next sector. Just keep your bandages dry.",
        mood: 'happy',
      },
    ],
  },
  'meg-callum': {
    greeting: "Keep your hands where I can see them. We count every can twice here. You looking for supplies or just staring?",
    mood: 'calm',
    returning: "Back at the supply counter? Make it quick, I've got three inventories to tally.",
    friendly: "Well look who's back. Need another ration pack, or did you find something to trade?",
    cold: "Don't touch the crates. State your business or move along.",
    choices: [
      {
        text: "What provisions and rations can you spare for a runner?",
        tag: "Help",
        reply: "Canned peaches, dry biscuits, standard almond water bottles, and clean torch batteries. Standard M.E.G. exchange rates apply.",
        mood: 'calm',
      },
      {
        text: "Let's talk trade. I've got scrap and items to barter.",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "All right, your scrap copper and salvage look clean. I will knock fifteen percent off standard requisition prices for you.",
        failReply: "Dented cans and corroded wiring will not cut it. M.E.G. logistics has standards. Full price or no deal.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How does M.E.G. keep Base Alpha supplied in Level 1?",
        tag: "Lore",
        reply: "Supply trains from Level 4 office depots and Trader caravans arriving through the hub. We also run salvage sweeps through the unmapped warehouse grids.",
        mood: 'calm',
      },
      {
        text: "I'm heading deeper into the levels. Any gear recommendations?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Good boots, two flashlights with spare cells, and at least three full canteens. Do not carry anything heavy unless you can swing it or shoot it.",
        failReply: "If you do not even have a canteen clipped to your belt, you are not ready for the lower levels. Turn around and rest.",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 2 (Survivor Camp in Pipe Dreams) ----
  'surv-wren': {
    greeting: "Whoa, stay back! ...Oh. You're not a Hound. Sorry! My nerves are completely shot today.",
    mood: 'scared',
    returning: "Oh, it's you! Did you hear that banging in the steam pipes? It's getting louder...",
    friendly: "Hey! Honestly, it's a huge relief seeing you. Don't leave me alone too long, okay?",
    cold: "Don't sneak up on me! What do you want?",
    choices: [
      {
        text: "What makes Level 2 so much more dangerous than Level 1?",
        tag: "Lore",
        reply: "The heat, the pitch black dead ends, and the Hounds. The steam will blister your skin in seconds if a pipe bursts, and the entity population is ten times worse.",
        mood: 'calm',
      },
      {
        text: "How do you avoid Hounds when the lights flicker out?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Crouch against the floor, do not break eye contact if they spot you, and back away slowly without running. If you bolt, they hunt.",
        failReply: "When the lights click off, you either hide behind a generator or you become dinner. That is all there is to it.",
        mood: 'scared',
      },
      {
        text: "You don't have to face the dark alone. Let's stick together.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Really? You mean that? Having someone watching my back would stop my hands from shaking. I am with you.",
        failReply: "No offense, but you look just as lost as I am. Two panicking people just make twice as much noise.",
        mood: 'happy',
        recruit: true,
      },
      {
        text: "Which way leads to the next level down?",
        tag: "Help",
        reply: "Look for the industrial fire doors marked with yellow stencils. They lead down into the electrical catwalks of Level 3.",
        mood: 'calm',
      },
    ],
  },
  'surv-hollis': {
    greeting: "Static again... Hey, wanderer. You look rough around the edges. Rest by the stove a minute.",
    mood: 'calm',
    returning: "Still with us? Good. Grab some warm water, the pipes are running hot.",
    friendly: "Come on in, friend. The radio's quiet, but you're always welcome at our fire.",
    cold: "Keep your distance from the radio equipment.",
    choices: [
      {
        text: "Can you treat my burns and injuries?",
        tag: "Help",
        reply: "Sit close to the stove. Let me put some cooling salve on those steam scalds and give you boiled water. You will feel human again in a minute.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "Is that radio picking up any signals from other survivor camps?",
        tag: "Lore",
        reply: "Mostly garbled carrier waves and emergency beacon loops from Base Gamma. Sometimes late at night there is piano music, but nobody knows who is playing.",
        mood: 'calm',
      },
      {
        text: "How do you treat heat exhaustion from these steam pipes?",
        tag: "Medicine 35",
        check: { skill: 'medicine', difficulty: 35 },
        reply: "Sip cold almond water in small gulps, loosen your collars, and wrap wet cloth behind your neck. Never pour freezing water over someone running a pipe fever.",
        failReply: "Drink whatever water you have and stay out of the high boiler halls.",
        mood: 'calm',
      },
      {
        text: "What kind of entities nest in these maintenance shafts?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Hounds love the warm steam bends, and Smilers sit in the dead end utility vaults where the bulbs are smashed. If you smell ozone, back away immediately.",
        failReply: "Too many things with too many teeth. Stay in the lighted hallways and do not climb the pipes.",
        mood: 'calm',
      },
    ],
  },
  'surv-mags': {
    greeting: "Well look what the pipes washed in! Come closer honey, let's see what shine you've got in your pockets.",
    mood: 'happy',
    returning: "Back for more, honey? My shelves don't stay stocked for long, so let's deal.",
    friendly: "There's my favorite wanderer! I've set aside a special deal just for you.",
    cold: "No free handouts here, sweetie. You got almond water or not?",
    choices: [
      {
        text: "Cut me a fair deal on ammo and almond water.",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "You drive a hard bargain, honey. All right, fifteen percent off my whole crate. Just do not tell the other runners.",
        failReply: "Sweetheart, I do not run a charity in a boiler room. Price on the chalkboard is the price you pay.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How do survivors get by down here without M.E.G. support?",
        tag: "Lore",
        reply: "We trade, we scavenge the pipe racks, and we look out for our own. M.E.G. means paperwork and curfews. Out here we are free, even if it is hot as hell.",
        mood: 'calm',
      },
      {
        text: "Got any tools or keys to get through the locked doors?",
        tag: "Help",
        reply: "Crowbars and skeleton keys pop up in the electrical lockers down corridor C. Bring some grease if the hinges are rusted shut.",
        mood: 'calm',
      },
      {
        text: "You've got a sharp eye for profit, Mags. Business going well?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Cannot complain when every wanderer through here needs water or buckshot. You have good manners, stranger.",
        failReply: "Flattery does not pay for flashlight batteries, sweetie. You buying or window shopping?",
        mood: 'happy',
      },
    ],
  },

  // ---- Level 3 (Base Gamma & Electrical Station) ----
  'gamma-reyes': {
    greeting: "Halt. Identify yourself. The generators are surging and the hounds are restless in the crawl tubes.",
    mood: 'calm',
    returning: "Back on the catwalk. Keep your weapon ready and your light pointed down.",
    friendly: "Good to see you, runner. You've got steady nerves. Base Gamma can use people like you.",
    cold: "Don't linger by the checkpoint unless you want a guard escort.",
    choices: [
      {
        text: "What's the safest route through the electrical corridors?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Follow the yellow high-voltage conduits along the ceiling. They lead straight to the Gamma gates and bypass the flooded crawlways.",
        failReply: "Keep your eyes forward and step over the sparking cables. Do not touch the chain link fencing.",
        mood: 'calm',
      },
      {
        text: "How do your patrol squads deal with hound packs in the dark?",
        tag: "Guns 40",
        check: { skill: 'guns', difficulty: 40 },
        reply: "Concentrated flashlight beams straight into their eyes to blind them, followed by two tight shotgun spreads center mass. Never let them flank the catwalk.",
        failReply: "Keep shooting until they stop twitching. And do not run out of shells in a dead end.",
        mood: 'calm',
      },
      {
        text: "How does Base Gamma survive deep inside Level 3?",
        tag: "Lore",
        reply: "Three heavy industrial generators, liquid pain barriers around the perimeter fences, and disciplined patrol rotations every six hours. We hold the line so runners have a safe harbor.",
        mood: 'calm',
      },
      {
        text: "I'm ready for duty. What sector needs reconnaissance?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Steady hands and calm voice. That is rare down here. You want to walk alongside our patrol squad? Keep step with me.",
        failReply: "Commander Moss signs off on patrol recruits, not me. Keep your weapon stowed and stay within the public sector.",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'gamma-pell': {
    greeting: "Wipe your feet. Copper wire, batteries, almond water, everything has an inventory line. What's your business?",
    mood: 'calm',
    returning: "Ledger's open. Got supplies to declare, or just browsing the requisition bins?",
    friendly: "Ah, the reliable wanderer. Your credit is good with Base Gamma. Let's talk supplies.",
    cold: "Step away from the ledger. State your requisition.",
    choices: [
      {
        text: "Show me what supplies and munitions you have in stock.",
        tag: "Help",
        reply: "9mm rounds, 12-gauge buckshot, standard almond water crates, wire coils, and battery packs. All stamped with Gamma inventory codes.",
        mood: 'calm',
      },
      {
        text: "I have salvaged parts and scrap. Let's arrange a trade.",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "Clean copper coils and undamaged cells. Base Gamma can put this to work immediately. Fifteen percent discount on your requisitions today.",
        failReply: "Half of these wire strands are scorched. I cannot issue military munitions for charred scrap. Standard rates.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How do you keep this fortress powered in the Electrical Station?",
        tag: "Lore",
        reply: "We tap the massive switchgear units behind Sector 4. The voltage fluctuates wildly, but our transformers keep the floodlights and perimeter fences live.",
        mood: 'calm',
      },
      {
        text: "I hear there's a brass elevator leading deeper from here.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "Sector 7, end of the eastern gantry. Ornate brass doors with art deco trim. It leads straight down to Level 5, the hotel. Watch yourself if you step inside.",
        failReply: "That elevator is off limits to unvetted wanderers. Stick to the public walkways.",
        mood: 'calm',
      },
    ],
  },
  'gamma-ito': {
    greeting: "Drink some tea. The constant electrical hum does terrible things to your nerves if you don't ground yourself.",
    mood: 'calm',
    returning: "Welcome back. Still feeling the vibrations in your teeth? Sit by the kettle.",
    friendly: "It's so good to see you uninjured. Please, rest as long as you need.",
    cold: "Quiet down, please. There are patients trying to rest.",
    choices: [
      {
        text: "Can you tend to my wounds and help restore my sanity?",
        tag: "Help",
        reply: "Rest here by the kettle. Let me check your reflexes, dress those cuts, and brew a hot cup of almond tea. The generator vibration in your jaw will settle down soon.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "How do you treat the psychological strain of the generator hum?",
        tag: "Medicine 40",
        check: { skill: 'medicine', difficulty: 40 },
        reply: "Earplugs during sleep, strictly timed hydration intervals, and grounding exercises focusing on physical textures. Without sensory grounding, auditory hallucinations take root within forty-eight hours.",
        failReply: "Almond water and as much quiet as you can find. Never sit alone in an unlit junction room.",
        mood: 'calm',
      },
      {
        text: "Have you treated survivors coming back from Level 4 or Level 5?",
        tag: "Lore",
        reply: "Yes. The office survivors mostly suffer from sensory deprivation and paranoia. The ones who come back from Level 5... they talk about waltzes and phantom banquets with hollow eyes.",
        mood: 'calm',
      },
      {
        text: "Your calm presence makes this place feel almost human.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Thank you. Someone has to keep the warmth alive in a place made of steel and high voltage. Take this clean gauze pack with you.",
        failReply: "We do what we must to keep each other sane. Take care of yourself out there.",
        mood: 'happy',
      },
    ],
  },
  'gamma-hask': {
    greeting: "Cpl. Hask here. Watch your step by the perimeter, the liquid pain hoses are pressurized.",
    mood: 'calm',
    returning: "Back through the gates. Keep moving toward the public sector.",
    choices: [
      {
        text: "What's the protocol for entering Base Gamma?",
        tag: "Lore",
        reply: "Holster sidearms, declare all explosive salvage at the gatehouse, and submit to a quick medical scan for fungal spore infection.",
        mood: 'calm',
      },
      {
        text: "How effective is the liquid pain defense against entities?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "One pressurized spray stops a Duller in its tracks and sends Hounds howling back into the dark. But keep your distance; the fumes will blister your lungs.",
        failReply: "It keeps them outside the fence. That is all you need to know.",
        mood: 'calm',
      },
      {
        text: "Seen any hostiles probing the gate recently?",
        tag: "Guns 35",
        check: { skill: 'guns', difficulty: 35 },
        reply: "A pack of three Hounds tried the south gantry earlier. Guard tower dropped two with rifle fire, the third bolted back down the pipe line.",
        failReply: "Things crawl around out there every night. As long as the lights stay on, they do not get past the wire.",
        mood: 'calm',
      },
    ],
  },
  'gamma-marlo': {
    greeting: "Looking for firepower? Marlo's the name. Shotguns, pistols, modifications, almond water talks.",
    mood: 'happy',
    choices: [
      {
        text: "Show me what weapons and ammo you've got.",
        tag: "Help",
        reply: "Pump shotguns, service revolvers, 9mm hollow points, and reinforced stocks. Quality hardware only.",
        mood: 'calm',
      },
      {
        text: "Cut me a discount on firearm repairs and shells.",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "You know good steel when you see it. Fine, fifteen percent off all weapon servicing and ammunition.",
        failReply: "Gun parts are scarce in Level 3. My prices reflect the risk of fetching them.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What modifications work best against Hounds?",
        tag: "Guns 40",
        check: { skill: 'guns', difficulty: 40 },
        reply: "Extended tube magazines and high-lumen tactical lights mounted under the barrel. Blind them first, then fire three rapid bursts before they can lunge.",
        failReply: "More buckshot and faster trigger fingers. There are no fancy tricks down here.",
        mood: 'calm',
      },
    ],
  },
  'gamma-june': {
    greeting: "Pull up a stool! Fresh almond water, warm fruit stew, and zero generator shocks. What'll it be?",
    mood: 'happy',
    choices: [
      {
        text: "Pour me a cup of almond water and a warm ration.",
        tag: "Help",
        reply: "Coming right up! Steaming bowl of dried peach and oat porridge with a chilled mug of sweet water. Drink up, you look exhausted.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "Heard any interesting tales from the runners arriving from Level 2?",
        tag: "Lore",
        reply: "A runner yesterday claimed they found a quiet maintenance tunnel lined with copper pipes that bypassed the Hound nests completely. Said it smelled like roasted barley.",
        mood: 'calm',
      },
      {
        text: "You run a lively counter in the middle of a warzone.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "If people cannot sit down for five minutes without worrying about gunfire, what is the point of fighting? Have an extra biscuit on the house.",
        failReply: "Just keeping plates full, stranger. That is all there is to it.",
        mood: 'happy',
      },
    ],
  },
  'gamma-moss': {
    greeting: "Welcome to Base Gamma. I am Commander Moss. As long as you respect our laws, you have safe harbor here.",
    mood: 'calm',
    choices: [
      {
        text: "What is Base Gamma's objective in Level 3?",
        tag: "Lore",
        reply: "To secure the primary electrical infrastructure, protect wanderers traversing the early levels, and maintain open transit corridors toward Level 4 and Level 5.",
        mood: 'calm',
      },
      {
        text: "I have skills that could benefit your garrison.",
        tag: "Speech 50",
        check: { skill: 'speech', difficulty: 50 },
        reply: "Your reputation precedes you, wanderer. M.E.G. High Command respects capable operators. You are authorized for priority supply access across Base Gamma.",
        failReply: "We have enough mouthy recruits. Show discipline in the corridors before claiming you can help our command.",
        mood: 'calm',
      },
      {
        text: "How do you coordinate with Base Omega on Level 4?",
        tag: "Help",
        reply: "Radio relays through the stairwell shafts and bi-weekly courier squads. If you are heading up to Level 4, check in with Director Okafor at the arrival foyer.",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 4 (Abandoned Offices) ----
  'omega-dace': {
    greeting: "Take a sip of water, friend. The office halls are endless and the water coolers don't fill themselves.",
    mood: 'calm',
    returning: "Back for another bottle? Water's free, but bullets will cost you.",
    friendly: "Good to see you on your feet! Take what you need from the cooler.",
    cold: "Don't touch the supply ledgers. You need something or not?",
    choices: [
      {
        text: "What supplies does Base Omega carry for wanderers?",
        tag: "Help",
        reply: "Filtered spring water, dry almond ration biscuits, 9mm ammo boxes, and clean notebooks for mapping. All logged under standard M.E.G. exchange rates.",
        mood: 'calm',
      },
      {
        text: "Who was the last squad sent down toward Level 5?",
        tag: "Lore",
        reply: "Squad Delta under Sgt. Reynolds. They took the fire stairwell three weeks back. We never heard a radio response, just a three-second violin riff on the emergency frequency.",
        mood: 'calm',
      },
      {
        text: "I need ammunition and almond water for the next run.",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "You brought clean salvage from the cubicles. Fair enough. I will knock fifteen percent off standard requisition rates for you.",
        failReply: "Loose paper clips and cracked staplers do not pay for bullets. Standard prices only.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How does Base Omega maintain order on this floor?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "Mutual reliance and clear rules. We share the water fountains, keep the exterior windows taped, and rotate guard watches on the stairwells every six hours.",
        failReply: "By not wasting time answering idle questions while patrols are in the corridors.",
        mood: 'calm',
      },
    ],
  },
  'omega-lin': {
    greeting: "Floor check in progress. Fountains are running, windows are taped. Keep moving and stay out of empty cubicles.",
    mood: 'calm',
    returning: "Still circling? Stick to the main corridors, the side offices are easy to get turned around in.",
    friendly: "Hey. Glad to see you're not seeing things yet. Want a patrol tip?",
    choices: [
      {
        text: "Why are all the office windows taped over?",
        tag: "Lore",
        reply: "Because looking through the glass will scramble your depth perception until you want to smash it. Worse yet, Window entities mimic familiar faces to lure you in. Keep the tape tight.",
        mood: 'calm',
      },
      {
        text: "Have you heard anything moving behind the locked office doors?",
        tag: "Survival 40",
        check: { skill: 'survival', difficulty: 40 },
        reply: "Dullers scratching on the carpet under the door thresholds, and occasional Hound panting. If the brass doorknob rattles by itself, walk the opposite way.",
        failReply: "Just the building settling and drop ceiling wires humming. Do not start hearing ghosts.",
        mood: 'calm',
      },
      {
        text: "You walk this floor every day. Seen any strange entities lately?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "Spotted a Smiler nestled inside a darkened copy room on the west corridor. We barricaded the hinges with metal file cabinets and marked it off limits.",
        failReply: "I keep my eyes on the floor and my ears open. Report sightings to the desk, not to me.",
        mood: 'calm',
      },
      {
        text: "Where are the emergency stairwells and elevators located?",
        tag: "Help",
        reply: "Stairwell B at the end of the north corridor leads up toward Level 5. Avoid the elevators entirely. Half the shafts have no cabs, just empty cables hanging in the dark.",
        mood: 'calm',
      },
    ],
  },
  'omega-okafor': {
    greeting: "Sgt. Okafor. State your business on Level 4. Base Omega maintains order here, no looting claimed offices.",
    mood: 'calm',
    choices: [
      {
        text: "What are the rules regarding office claims?",
        tag: "Lore",
        reply: "Any office marked with yellow M.E.G. chalk is an active shelter or supply cache. Unmarked rooms can be scavenged, but you do not sleep in rooms with untaped windows.",
        mood: 'calm',
      },
      {
        text: "I'm looking for the stairs to Level 5.",
        tag: "Help",
        reply: "End of the eastern wing past the water cooler bank. Watch your footing on the stairs; the carpet changes from beige nylon to crimson velvet halfway down.",
        mood: 'calm',
      },
      {
        text: "I can assist with perimeter security.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "You have a firm stance and steady hands. If you are willing to walk perimeter with me, we could use an extra pair of eyes. Fall in.",
        failReply: "Base Omega has enough green runners getting spooked by shadows. Keep your weapon holstered.",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'omega-rhea': {
    greeting: "Need your vitals checked? Take a seat. And please don't drink from the fountains without filtering.",
    mood: 'calm',
    choices: [
      {
        text: "Can you treat my injuries and check my sanity?",
        tag: "Help",
        reply: "Sit down on the cot. Let me clean that cut with iodine and wrap fresh gauze around it. Drink this chilled cup of filtered almond water. It clears the static right out of your head.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "Is the water in the office coolers actually safe?",
        tag: "Medicine 35",
        check: { skill: 'medicine', difficulty: 35 },
        reply: "The blue water cooler jugs are pure almond infused spring water. But never drink from the red jugs; they contain heavy mineral sediments that cause acute stomach cramps.",
        failReply: "Boil everything or stick to factory sealed bottles. Better safe than turning.",
        mood: 'calm',
      },
      {
        text: "What happens to people who stare out the untaped windows?",
        tag: "Lore",
        reply: "Apathy sets in first. They stop speaking, then they stop drinking water, and within forty-eight hours they either leap through or turn into Wretches. It is a slow, quiet rot.",
        mood: 'calm',
      },
    ],
  },
  'l4-moss': {
    greeting: "Oh! Hello there. Did you hear that desk phone ringing a minute ago? Nobody ever answers on the other end...",
    mood: 'calm',
    returning: "You're back! The phones have been ringing on and off all morning.",
    friendly: "It's so wonderful having someone to talk to! Come in, take a seat on the cot.",
    choices: [
      {
        text: "What happens if someone answers the ringing office phones?",
        tag: "Lore",
        reply: "Usually just a dead carrier tone. But once a wanderer answered and swore he heard his mother calling him for supper. He noclipped through the wall an hour later and never came back.",
        mood: 'calm',
      },
      {
        text: "How long have you been living in this office suite?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Nearly eight months. I dragged in two soft executive armchairs, taped the windows with three layers of cardboard, and set up a solar kettle. It feels like home if you ignore the drop ceiling.",
        failReply: "Long enough to know which floorboards creak and which vending machines eat quarters.",
        mood: 'calm',
      },
      {
        text: "How do you survive here without joining M.E.G.?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Keep your noise down, sleep during the fluorescent buzz cycles, and always leave an escape route through the connecting cubicle doors. M.E.G. means rules; I prefer my quiet.",
        failReply: "You keep your head down and you do not bother anyone. That is all.",
        mood: 'calm',
      },
      {
        text: "Have you collected any stories about the deeper levels?",
        tag: "Help",
        reply: "Runners talk about a grand hotel on Level 5 with crystal chandeliers and jazz that never stops. Sounds wonderful, but they say anyone who stays the night forgets their own name.",
        mood: 'calm',
      },
    ],
  },
  'l4-gus': {
    greeting: "Hey pal! You made it! Want to hear which vending machine on the north corridor gives double chocolate bars?",
    mood: 'happy',
    returning: "Hey buddy! Did you try that vending machine yet? Two bars for the price of one!",
    choices: [
      {
        text: "Are the vending machines on Level 4 safe to eat from?",
        tag: "Lore",
        reply: "As long as the wrapper is sealed! Peanuts, chocolate wafers, cheese crackers. Best free lunch in the whole Backrooms, pal!",
        mood: 'happy',
      },
      {
        text: "You seem in surprisingly high spirits for being trapped here.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Why complain? We have got soft carpets, working water coolers, and unlimited snacks! You have to count your blessings when you fall out of reality, right?",
        failReply: "Smiling beats screaming into a wastebasket, buddy. You try doing that for three months.",
        mood: 'happy',
      },
      {
        text: "Are the window rooms really that dangerous?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Oh yeah. Saw a guy walk right up to a glass pane thinking he saw his suburban backyard. Next thing you know, he was pulled clean through. Keep the curtains pulled!",
        failReply: "Just do not look out the glass. Simple as that.",
        mood: 'calm',
      },
      {
        text: "Want to travel together for a while, Gus?",
        tag: "Help",
        reply: "Hey, why not! Two pairs of eyes are better than one, and I know where all the good chocolate machines are. Lead the way!",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'l4-penny': {
    greeting: "Oh... hi. I was just about to take another nap. Did you find where the morning comes from?",
    mood: 'calm',
    returning: "Hi again... I was having the sweetest dream about real sunshine.",
    choices: [
      {
        text: "How long have you been wearing those pajamas, Penny?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Ever since I fell out of bed through the carpet! They are warm flannel with blue stars. Do you think my mom has noticed I am not in my room yet?",
        failReply: "They are my favorite pajamas! Do not make fun of them.",
        mood: 'calm',
      },
      {
        text: "Do you need any almond water or food rations?",
        tag: "Help",
        reply: "Oh, thank you! I love the almond water, it tastes like sweet milk. Here, you can have half of my strawberry fruit roll.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "Do you remember the world before you fell into the Backrooms?",
        tag: "Lore",
        reply: "I remember Saturday morning cartoons, cereal with marshmallows, and our ginger cat named Marmalade. Sometimes I hear purring from the air vents, but nobody is there.",
        mood: 'calm',
      },
      {
        text: "Make sure you stay close to the safe offices when lights go out.",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "I do! I keep my plush bear under my arm and hide behind Mr. Moss's desk until the ceiling tubes buzz back on. The dark things do not check under desks.",
        failReply: "I know how to hide! I am really good at hide and seek.",
        mood: 'calm',
      },
    ],
  },
  'l4-bram': {
    greeting: "Keep your voice down. The acoustics in these drop ceilings carry every whisper. You got almond water on you?",
    mood: 'calm',
    returning: "Back again. Check your seals. Level 5 is no joke, wanderer.",
    choices: [
      {
        text: "You're planning an expedition to Level 5? How dangerous is it?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "The hotel is deceptively luxurious. The carpet is plush, but the staff will freeze in place if you look at them, and the Boiler Room beneath will bake you alive. Take plenty of water.",
        failReply: "If you have to ask, you are not ready for the stairs. Level 5 separates the tourists from the survivors.",
        mood: 'calm',
      },
      {
        text: "What makes the hotel on Level 5 so feared?",
        tag: "Lore",
        reply: "The Beast in the boilers, and the psychic erosion. People check into suites, lie down on the feather beds, and simply lose the desire to ever leave. It is a golden cage.",
        mood: 'calm',
      },
      {
        text: "I'll trade supplies for your trail knowledge and maps.",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "Good quality gear. Here is my route sketch for the service stairwells, and I will knock fifteen percent off my extra trail kits.",
        failReply: "Your junk is not worth my ink. Pack better gear next time.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "Two experienced runners have better odds. Let's team up.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "You carry yourself like someone who knows how to keep their nerve when the lights pop out. All right, wanderer. Let's tackle the corridors together.",
        failReply: "I work alone. Less noise on the staircases that way.",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'tbd-quill': {
    greeting: "Show me oddities. Strange coins, keys to nowhere, broken dials... Ordinary junk bores me. What've you got?",
    mood: 'happy',
    returning: "Found anything strange yet? Don't waste my time with ordinary scrap.",
    choices: [
      {
        text: "I have some peculiar trinkets. What will you offer for them?",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "Ooh, an uncoiling brass watch spring and an anomalous dice cube! T.B.D. will pay handsome rates for these. Fifteen percent extra Backdollars on your trade today!",
        failReply: "Ordinary plastic buttons and rusted nails? How pedestrian. Bring me something that defies geometry!",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What does T.B.D. do with all these useless, bizarre objects?",
        tag: "Lore",
        reply: "We study them, we trade them, we marvel at them! Why collect boring food when the Backrooms spawns keys that unlock walls and pocket watches that tick backwards?",
        mood: 'calm',
      },
      {
        text: "Where did you find the strangest item in your collection?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "An executive desk on the 8th floor. Inside the middle drawer was a sealed snow globe containing an exact miniature of this very office. If you shake it, ceiling tiles fall in the hall.",
        failReply: "A true collector never reveals the location of their prize find.",
        mood: 'calm',
      },
      {
        text: "Can you point me toward any unsearched office wings?",
        tag: "Help",
        reply: "Try the east corridor past the broken copy machine. The carpet turns teal and the doorknobs are made of green glass. Plenty of unopened desk drawers waiting.",
        mood: 'calm',
      },
    ],
  },
  'tbd-nib': {
    greeting: "Shiny! Everything shines if you turn the desk lamp right! Don't touch my shiny piles!",
    mood: 'happy',
    choices: [
      {
        text: "How do you slip past the M.E.G. patrols to scavenge shiny things?",
        tag: "Sneak 35",
        check: { skill: 'sneak', difficulty: 35 },
        reply: "Soft socks over your boots, crawl under the cubicle partitions, and wait for the patrol boots to click past! M.E.G. guards only look straight ahead, they never look under the desks!",
        failReply: "Nib does not tell secrets! Nib just scoots like a lizard!",
        mood: 'happy',
      },
      {
        text: "Why is your faction called T.B.D.?",
        tag: "Lore",
        reply: "To Be Determined! Because nobody knows what anything is, what anything does, or where we are going! It is the most honest name down here!",
        mood: 'calm',
      },
      {
        text: "Did you find any spare ammo or tools in the executive suites?",
        tag: "Help",
        reply: "Found a shiny chrome screwdriver and a box of little brass bullets! Too small for Nib, you can trade for them if you want!",
        mood: 'happy',
        discount: true,
      },
      {
        text: "That's quite a sparkling collection you've gathered, Nib.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "You like it? You really like it? Nib polished every paperclip with almond water! You are a good wanderer! Take this shiny copper coin for luck!",
        failReply: "Hands off! Shiny things belong to Nib!",
        mood: 'happy',
      },
    ],
  },
  'amor-vell': {
    greeting: "Breathe gently. The velvet bloom of the mold purifies the poisoned air of this endless tomb. Are you reverent?",
    mood: 'calm',
    cold: "Trample one spore and the growth will feast on your bones.",
    choices: [
      {
        text: "What is the holy purpose of this mold garden?",
        tag: "Lore",
        reply: "The velvet spore purifies the stagnant air of Level 4. Where concrete suffocates the spirit, the growth creates life, warmth, and communion with the deep earth.",
        mood: 'calm',
      },
      {
        text: "Isn't breathing these spores hazardous to human lungs?",
        tag: "Medicine 45",
        check: { skill: 'medicine', difficulty: 45 },
        reply: "Only to the uninitiated who resist. We cultivate a mild fungal symbiosis that coats the bronchial lining, granting immunity to airborne toxins and calming cognitive agitation.",
        failReply: "Mortal medicine fears that which it cannot categorize. The bloom cares nothing for your skepticism.",
        mood: 'calm',
      },
      {
        text: "I come in peace and respect for your sanctuary.",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Then you are welcome beneath the velvet canopy, traveler. Drink of our distilled spore nectar. It will soothe the fever in your blood and quiet your weary mind.",
        failReply: "Your words speak peace, but your posture carries the nervous tension of a trespasser.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "Does Amor Incrementum trade remedies with outsiders?",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "We trade dried medicinal moss and curative spore salves for pure almond water and clean glassware. For a respectful seeker, our rates are generous.",
        failReply: "We do not barter sacred remedies to those who view the growth as mere commodities.",
        mood: 'happy',
        discount: true,
      },
    ],
  },
  'amor-hask': {
    greeting: "Wanderer! Listen to the spores! The concrete was man's mistake, but the growth will reclaim it all! Join our flock!",
    mood: 'happy',
    choices: [
      {
        text: "That's a dramatic sermon. How many converts have you gathered?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "Twelve true believers have embraced the spore in this corridor alone! When you spend forty days trapped in fluorescent beige, green velvet growth looks like paradise!",
        failReply: "Numbers matter little to the colony. A single spore can colonize an entire office tower.",
        mood: 'happy',
      },
      {
        text: "Why do you believe the mold is the salvation of the Backrooms?",
        tag: "Lore",
        reply: "Because the walls never change, the hum never stops, but the mold breathes and multiplies! It proves nature cannot be forever trapped inside man's concrete nightmare!",
        mood: 'calm',
      },
      {
        text: "How do your people defend against entity attacks?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Hounds and Dullers despise the spore stench; it clogs their nostrils and burns their throats. Our garden is the safest corridor on the entire floor.",
        failReply: "The bloom protects its own. Those who trespass choke upon the dust.",
        mood: 'calm',
      },
      {
        text: "I'll pass on the mold gospel, but stay safe out here.",
        tag: "Help",
        reply: "Walk gently on the carpets, stranger! If your lungs ever tire of drywall dust, the garden doors are always open to you!",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 5 (Terror Hotel) ----
  'l5-ambrose': {
    greeting: "Good evening, honored guest. Welcome to the Homely Hotel. The registers are always open, though no one ever seems to check out.",
    mood: 'calm',
    returning: "A pleasure to see you again in our grand foyer. May I attend to your accommodations?",
    friendly: "Our most valued guest returns! The hotel hums with delight at your presence.",
    cold: "The hotel expects decorum from all guests. Do not disturb the quiet hours.",
    choices: [
      {
        text: "Can you tell me about the history of the Homely Hotel?",
        tag: "Lore",
        reply: "Built in the grand style of the early 1900s, the Homely Hotel has offered refuge to wanderers since before memory was kept. Its corridors endure while the mortal world fades.",
        mood: 'calm',
      },
      {
        text: "I would like to inquire about booking a room or suite.",
        tag: "Help",
        reply: "All rooms upon the third floor are prepared for our guests. The linen is pressed, the silver taps run hot, and our bellhops are at your eternal service.",
        mood: 'calm',
      },
      {
        text: "Why do the staff in the hallways freeze when watched?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Decorum, my good guest. Our staff are trained in absolute discretion. It would be most unrefined to bustle about when a patron honors them with their gaze.",
        failReply: "The hotel holds its servants to immaculate standards. Inquiring into their composure is rather impolite.",
        mood: 'calm',
      },
      {
        text: "What happens if someone enters the Beverly Room during the ball?",
        tag: "Survival 50",
        check: { skill: 'survival', difficulty: 50 },
        reply: "The music never pauses. Those who cross the threshold find their limbs swaying to the strings until their mortal strength is spent. Admire the waltz from the foyer, never step upon the floor.",
        failReply: "One does not interrupt the dance. The consequences are irreversible.",
        mood: 'calm',
      },
    ],
  },
  'l5-dolores': {
    greeting: "Wipe your hooves at the door! The kitchen is running hot and the salon snobs already sent two roasts back. Hungry or complaining?",
    mood: 'annoyed',
    returning: "Back in my kitchen? The steaks are sizzling. You eating or wasting my time?",
    friendly: "Ah, someone who actually appreciates real cooking! Sit down, honey, I've got fresh stew for you.",
    choices: [
      {
        text: "What fresh dishes or cuts of meat do you have on the menu?",
        tag: "Help",
        reply: "Prime ribeye roasts, braised mutton shanks, buttered potato mash, and crusty French loaves. All cooked over roaring cast iron griddles.",
        mood: 'calm',
      },
      {
        text: "I have almond water. Can I buy some steak or stew?",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "Clean, cold almond water. That is a proper trade. Here is a piping hot plate of braised beef with toasted butter rolls.",
        failReply: "I do not trade prime rib for cloudy runoff. Pay proper backbucks or eat dried field biscuits.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "What do the Originals in the salon have against your cooking?",
        tag: "Lore",
        reply: "Those gilded snobs think anything seasoned after 1920 is vulgar! They would rather chew stale tea biscuits than admit my garlic pepper chops are culinary perfection.",
        mood: 'calm',
      },
      {
        text: "How do you source and preserve fresh food in this hotel?",
        tag: "Medicine 35",
        check: { skill: 'medicine', difficulty: 35 },
        reply: "The deep service walk-ins have anomalous temperature locks that suspend bacterial growth entirely. A roast placed inside stays at the absolute peak of culinary freshness for decades.",
        failReply: "The dumbwaiters rise, the pantries stay stocked. Do not ask questions that spoil your appetite.",
        mood: 'calm',
      },
    ],
  },
  'l5-pip': {
    greeting: "Eep! O-oh, a guest! Can I carry your luggage, sir or madam? Just... please don't make me take the service elevator...",
    mood: 'scared',
    returning: "Oh! Hello again, guest! Any bags? Any messages to deliver?",
    choices: [
      {
        text: "What's wrong with the service elevator, Pip?",
        tag: "Lore",
        reply: "It does not stop at numbered floors! Sometimes it drops past the sub-basement into a room filled with whispering shadows that reach for your jacket buttons!",
        mood: 'scared',
      },
      {
        text: "Have you noticed any room numbers that shouldn't exist?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Yes! Room 404 appears between 412 and 414 on Tuesdays! But if you knock on the mahogany door, you hear ocean waves crashing inside!",
        failReply: "I am not supposed to talk about the strange doors! Mr. Ambrose will dock my tips!",
        mood: 'happy',
      },
      {
        text: "What is Mr. Ambrose really like to work for?",
        tag: "Help",
        reply: "He is very polite and he never raises his voice! But his eyes never blink, not even when the thunder shakes the chandeliers.",
        mood: 'calm',
      },
      {
        text: "Relax, Pip. You're doing a fine job.",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "You really think so? Thank you, guest! Here, take this brass luggage key. It opens the steamer trunks in the 2nd floor linen closet!",
        failReply: "I have three more luggage carts to push before dinner. I cannot stop!",
        mood: 'happy',
      },
    ],
  },
  'l5-odette': {
    greeting: "If one more guest leaves ash on the Persian rug, I'm locking the broom closet. What do you want?",
    mood: 'annoyed',
    returning: "Still here? Don't make a mess in the halls. It takes hours to get blood out of damask.",
    choices: [
      {
        text: "Heard any juicy rumors around the hotel wings?",
        tag: "Lore",
        reply: "Lady Zelda lost another diamond brooch behind the radiator in Suite 208, and Captain Whitlock was seen pacing the hall at 3 AM carrying a rusted ship lantern.",
        mood: 'calm',
      },
      {
        text: "Why do you refuse to clean the ballroom?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "Because blood stains on damask do not come out with seltzer water, and every time I sweep the dust near the stage, the phantom violinist plays faster.",
        failReply: "Sweep it yourself if you love waltzes so much. I have fifty rooms on the west wing to dust.",
        mood: 'calm',
      },
      {
        text: "Have you found anything interesting in the locked suites?",
        tag: "Sneak 40",
        check: { skill: 'sneak', difficulty: 40 },
        reply: "Found a jeweler's velvet roll and an unopened tin of almond candy in Room 316. The lock was rusted solid, but my skeleton key slipped right through.",
        failReply: "Housekeeping does not snoop through guest luggage. Keep your hands in your pockets.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "It must be thankless work cleaning an infinite hotel.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "You are the first person on this entire floor to say that. Most guests just snap their fingers. Here, take this spare master pass for the linen closets.",
        failReply: "Flattery will not vacuum the stair runners. Move aside, please.",
        mood: 'happy',
      },
    ],
  },
  'l5-harlan': {
    greeting: "Step into the post. Keep your weapon holstered unless you're shooting rats. M.E.G. Housekeeping keeps this hotel somewhat civilized.",
    mood: 'calm',
    returning: "Back at Housekeeping. Count your rounds. What do you need?",
    friendly: "Good to see you, soldier. You've earned your keep around here. Let's talk armory.",
    choices: [
      {
        text: "What munitions and survival supplies does Housekeeping trade?",
        tag: "Help",
        reply: "Submachine gun magazines, 12-gauge shells, heavy canvas bedrolls, and filtered almond canteens. All stamped with M.E.G. Housekeeping insignia.",
        mood: 'calm',
      },
      {
        text: "How bad is the Beast prowling the Boiler Room?",
        tag: "Guns 45",
        check: { skill: 'guns', difficulty: 45 },
        reply: "Thick hide encrusted with boiler scale and slag. Bullets bounce off the torso plates, so you need high caliber rounds aimed directly into the glowing vent slits under its jaw.",
        failReply: "Bad enough that two squads vanished down there last month. Keep your safety on until you see the glow.",
        mood: 'calm',
      },
      {
        text: "What's your going rate for submachine gun ammo?",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "You brought military brass and clean primers. Base Housekeeping can load those. Fifteen percent discount on your ammo requisition today.",
        failReply: "Corroded casings are useless in an automatic feed. Standard exchange only.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How does Housekeeping maintain relations with the hotel staff?",
        tag: "Lore",
        reply: "Mutual non-interference. We do not shoot the Facelings, and Mr. Ambrose ensures the bellhops do not push our luggage into anomalous elevator shafts.",
        mood: 'calm',
      },
    ],
  },
  'l5-vesna': {
    greeting: "I escort to the Boiler Room threshold and not one step beyond. The heat melts your boots and the sounds will test your nerve.",
    mood: 'calm',
    returning: "Ready for another run to the threshold? Mind your canteen.",
    choices: [
      {
        text: "Can you escort me safely to the Boiler Room door?",
        tag: "Help",
        reply: "Follow two paces behind me. Step only where my boots step; the floorboards near the threshold are soaked in boiling oil runoff.",
        mood: 'calm',
      },
      {
        text: "What precautions should I take against the boiler heat?",
        tag: "Survival 50",
        check: { skill: 'survival', difficulty: 50 },
        reply: "Soak your wool cloak in cold almond water, wrap wet linen around your mouth and nose to prevent lung scalds, and never touch metal pipes without leather gloves.",
        failReply: "Drink water and run fast. If your boot soles start smoking, you stayed too long.",
        mood: 'calm',
      },
      {
        text: "Have you ever caught a glimpse of the Boiler Room Beast?",
        tag: "Lore",
        reply: "A towering silhouette through the steam haze. Glowing orange eyes like furnace draft doors and a breath that smells of sulfur and scorched bone.",
        mood: 'calm',
      },
      {
        text: "You have a dangerous post, Vesna. What keeps you doing it?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Someone has to pull wanderers back before they wander into the furnace rooms. Knowing I held the line for one more runner makes the burns worth it.",
        failReply: "Orders are orders. I do the job I was assigned.",
        mood: 'happy',
      },
    ],
  },
  'l5-tobias': {
    greeting: "Ah, another exterminator? The Death Rats are breeding behind the hot pipes again. Ten almond water per pelt, interested?",
    mood: 'calm',
    returning: "Got any rat pelts for the bounty board? The boiler crew is begging for relief.",
    choices: [
      {
        text: "Tell me about the rat bounty contract.",
        tag: "Help",
        reply: "Ten Almond Water bottles for every five Death Rat pelts. Bring them to my skinning table clean and free of boiler grease.",
        mood: 'calm',
      },
      {
        text: "What's the best tactic when a swarm of Death Rats attacks?",
        tag: "Melee 40",
        check: { skill: 'melee', difficulty: 40 },
        reply: "Keep your back to a solid brick pier and sweep low with a heavy pipe wrench or machete. They jump for the throat, so protect your neck and crush their skulls as they leap.",
        failReply: "Swing hard and do not let them climb your trousers. Once they bite through your boot leather, you are done.",
        mood: 'calm',
      },
      {
        text: "Do you believe the rumors that the hotel itself is alive?",
        tag: "Lore",
        reply: "I have heard the walls groaning like ribs, and the plumbing pulses with hot red liquid every full moon cycle. If it is not alive, it is doing a damn good imitation.",
        mood: 'calm',
      },
      {
        text: "Are there any bounties available besides the rats?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "M.E.G. wants boiler slag samples from the central furnace pit. Bring me a fist-sized lump and I will pay double the rat rate.",
        failReply: "Just the vermin for now. Help clean up the pipes or move along.",
        mood: 'calm',
      },
    ],
  },
  'l5-imani': {
    greeting: "Stay alert. The faceless staff are harmless until provoked, but shadows in the east wing have been shifting against the light.",
    mood: 'calm',
    choices: [
      {
        text: "What should wanderers know about the Facelings here?",
        tag: "Lore",
        reply: "They wear tuxedos and evening gowns, and they perform their hotel duties flawlessly. As long as you do not strike them or enter private suites without an invitation, they remain entirely docile.",
        mood: 'calm',
      },
      {
        text: "Have you spotted anything hostile stalking the guest wings?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "The occasional Smiler in unlit stairwells, and Skin-Stealers masquerading as lost hotel guests. Always check the hands; Skin-Stealers never get the fingernails quite right.",
        failReply: "Stay on the carpeted hallways under the chandeliers. The dark corners belong to the things with teeth.",
        mood: 'calm',
      },
      {
        text: "How do you tolerate the snooty Originals in the card salon?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Smile politely, nod at their endless monologues about turn-of-the-century stock markets, and accept their tips. Their vintage jewelry trades for serious supplies with M.E.G.",
        failReply: "I ignore them. Rich ghosts with nothing better to do than shuffle cards.",
        mood: 'calm',
      },
      {
        text: "Any advice for someone navigating Level 5 for the first time?",
        tag: "Help",
        reply: "Never drink unsealed liquor bottles from the bar, do not accept ballroom dance invitations, and always keep an eye on the exit stairwell signs.",
        mood: 'calm',
      },
    ],
  },
  'l5-millie': {
    greeting: "Check your compass, flyboy. Lost my Lockheed Electra over the Pacific and ended up in this gilded birdcage. Got anything worth betting?",
    mood: 'happy',
    choices: [
      {
        text: "How did an airplane from 1937 end up in Level 5?",
        tag: "Lore",
        reply: "Navigating over the Pacific, heavy fog rolled in, needles spun like tops, and we touched down on what looked like an infinite marble runway. Stepped out the cockpit and right into the grand lobby!",
        mood: 'happy',
      },
      {
        text: "Those aviator goggles around your neck... do they work in anomalous darkness?",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "Amber polarized lenses with brass mesh side shields. They cut through the boiler smog like a dream. If you have fine salvage, I might let you borrow a spare pair!",
        failReply: "These goggles flew across the equator with Amelia Earhart. You cannot afford them, kid.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "Care to trade vintage heirlooms for fresh supplies?",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "I have silver cigarette cases and art deco fountain pens. Fresh almond water and dry rations will buy whatever shines on my table.",
        failReply: "Your modern plastic junk does not interest me. Bring real craftsmanship.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What does it take to get invited into the Originals' card salon?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Good posture, clean collar, and the ability to bluff through four rounds of bridge without flinching. Mention you knew a Rockefeller and Vanderholt will pull up a chair.",
        failReply: "They do not invite folks who smell like boiler grease and fear.",
        mood: 'calm',
      },
      {
        text: "Have you fed Samantha the cat her meat today?",
        tag: "Help",
        reply: "Dolores gave her a trimmed beef kidney an hour ago. Samantha purred so loud it rattled the glassware in the salon cabinet.",
        mood: 'happy',
      },
    ],
  },
  'l5-whitlock': {
    greeting: "Stand straight, traveller. RMS Oceanic went down beneath the grey waves, but etiquette endures even in this bizarre hotel. State your purpose.",
    mood: 'calm',
    choices: [
      {
        text: "Captain, what happened to your ship in 1912?",
        tag: "Lore",
        reply: "Oceanic struck an anomalous shelf of black ice north of the Grand Banks. The fog swallowed the lifeboats, and when the mist parted, we found ourselves disembarking at the hotel veranda.",
        mood: 'calm',
      },
      {
        text: "A man of your dignity commands respect, Captain.",
        tag: "Speech 50",
        check: { skill: 'speech', difficulty: 50 },
        reply: "Thank you, young traveler. Even when cast into this inexplicable purgatory, a naval officer maintains discipline and honor. Take this brass ship's compass; its needle aligns true to Level 5's grand foyer.",
        failReply: "Etiquette is not flattery, traveler. Maintain your composure.",
        mood: 'happy',
      },
      {
        text: "What can you tell me about the ballroom across the hall?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "The waltz music mirrors the rhythm of a ship rolling in heavy swell. Those who enter fall into a trance of endless waltzing. I have seen strong sailors dance until their hearts failed.",
        failReply: "The ballroom is a siren song. Stay well clear of the mahogany doors.",
        mood: 'calm',
      },
      {
        text: "Have you ever attempted to find a way back home?",
        tag: "Help",
        reply: "Forty years ago, yes. We searched every corridor and cellar. Now, I accept that duty anchors me to this station. The hotel is my final port.",
        mood: 'calm',
      },
    ],
  },
  'l5-vanderholt': {
    greeting: "Hm? A newcomer in modern rags. If you've come begging for a railway loan, my terms are twenty percent compound interest.",
    mood: 'annoyed',
    choices: [
      {
        text: "What was your railway empire like before you no-clipped?",
        tag: "Lore",
        reply: "Four thousand miles of transcontinental steel! Locomotives running from Chicago to San Francisco! Now I am reduced to playing poker with an Edwardian captain and an aviator.",
        mood: 'calm',
      },
      {
        text: "Even gilded-age barons need almond water in the Backrooms.",
        tag: "Barter 55",
        check: { skill: 'barter', difficulty: 55 },
        reply: "Hmph. Pragmatism over pedigree, is it? Very well. I shall purchase three sealed cases of Almond Water at your proposed rate. My gold coins still hold value here.",
        failReply: "I do not negotiate with scruffy transients. Speak to my valet, if I still had one.",
        mood: 'calm',
        discount: true,
      },
      {
        text: "What do the Originals do all day besides play cards?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "We debate philosophy, recount grand triumphs, and maintain the standards of civilized society while the world outside degenerates into chaos. Decorum is our armor.",
        failReply: "We live with elegance. A concept clearly foreign to your generation.",
        mood: 'calm',
      },
      {
        text: "Have you ever attempted checking out of the hotel?",
        tag: "Help",
        reply: "Check out? And go where? Into damp basements and howling utility tunnels? Here, I have silk sheets and roast lamb delivered by dumbwaiter. I am quite content.",
        mood: 'calm',
      },
    ],
  },
  'l5-zelda': {
    greeting: "Well don't just stand there like a flat tire, darling! Isn't this hotel simply the bee's knees? Pour some gin and tell me the gossip!",
    mood: 'happy',
    choices: [
      {
        text: "What year do you think it is in the real world, Zelda?",
        tag: "Lore",
        reply: "Who cares, darling! It is always 1926 in my heart! The champagne is always cold, the gramophone is always spinning, and nobody ever grows old!",
        mood: 'happy',
      },
      {
        text: "Heard any juicy secrets about what's behind Room 13?",
        tag: "Speech 45",
        check: { skill: 'speech', difficulty: 45 },
        reply: "Oh, it is scandalous! I peeked through the keyhole and saw a marble fountain flowing with liquid gold, surrounded by velvet couches where shadows sip martinis!",
        failReply: "A lady never tells secrets to someone who has not bought her a drink first!",
        mood: 'happy',
      },
      {
        text: "Why do the Originals refuse to let new people join?",
        tag: "Help",
        reply: "Because everyone arriving nowadays wears nylon and complains about monsters! Where is the glamour? Where is the Charleston?",
        mood: 'calm',
      },
      {
        text: "How do you spend your evenings when the music starts playing?",
        tag: "Survival 40",
        check: { skill: 'survival', difficulty: 40 },
        reply: "I sip my ginger fizz in the salon and listen from the safety of the heavy velvet draperies. Even I know better than to dance with the phantoms on the floor!",
        failReply: "Dancing on the tables, of course! Live a little, darling!",
        mood: 'happy',
      },
    ],
  },
  'l5-wat': {
    greeting: "Sancta Maria... Traveler, pray tell me: is this the purgatory of souls, or have the Black Death fevers finally taken my mind?",
    mood: 'scared',
    choices: [
      {
        text: "This isn't purgatory, Brother Wat. You've fallen into the Backrooms.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "The Backrooms... an unholy labyrinth of endless corridors and false dwellings. Yet if the Almighty has placed me here, it is to pray for the lost souls wandering in the dark.",
        failReply: "Do not mock a servant of the cross with strange names and pagan terminology.",
        mood: 'calm',
      },
      {
        text: "You're safe from the plague here. Breathe easy, brother.",
        tag: "Medicine 40",
        check: { skill: 'medicine', difficulty: 40 },
        reply: "No buboes on the skin, no black swellings in the throat. Deo gratias! The pestilence has truly departed. Let me offer a prayer of healing over your brow.",
        failReply: "The air smells of brimstone from below. The plague takes many shapes.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "Who was the Abbot you keep searching for?",
        tag: "Lore",
        reply: "Abbot Thomas of Canterbury. When the Great Mortality struck our cloister, he led us into the crypts to pray. I fell through the flagstones and awoke upon this velvet rug.",
        mood: 'calm',
      },
      {
        text: "Are the other salon guests treating you well?",
        tag: "Help",
        reply: "They speak strange dialects of English and wear curious garments, but they share their bread and meat with Christian charity. I pray daily for their salvation.",
        mood: 'calm',
      },
    ],
  },
  'l5-samantha': {
    greeting: "Welcome to my parlor, wanderer. The threads of your past and future hum like plucked harp strings. Do you bring tribute, or just idle words?",
    mood: 'calm',
    returning: "You return to Samantha's presence. Do your hands bear savory meat, or only empty promises?",
    friendly: "Ah, mon cher! The stars sing around you. Have you brought another feast for my reading?",
    cold: "Idle chatter bores me, wanderer. Meat first, or face my claws.",
    choices: [
      {
        text: "I'd like to offer you meat in exchange for a psychic reading.",
        tag: "Help",
        reply: "Purr... savory, succulent tribute. Lay your hands upon my obsidian fur, traveler. The veil parts before your eyes. Your mind clears of shadows, and the hotel's whispers bend to your will.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "What do the spirits in the hotel walls whisper to you?",
        tag: "Lore",
        reply: "They whisper of the hotel's heartbeat in the deep boiler foundations. Every soul that dances in the Beverly Room becomes a golden thread in the lobby curtains.",
        mood: 'calm',
      },
      {
        text: "Are those serrated teeth natural for a feline entity?",
        tag: "Medicine 45",
        check: { skill: 'medicine', difficulty: 45 },
        reply: "Wanderer, I wear this velvet shape for your sanity's preservation. You would not endure my true glory. Yet this body delights in cream and savory meats.",
        failReply: "Hiss! Peer not into my maw unless you wish your throat inspected in kind!",
        mood: 'calm',
      },
      {
        text: "What is truly lurking in the dark of the Boiler Room?",
        tag: "Survival 50",
        check: { skill: 'survival', difficulty: 50 },
        reply: "The Beast. Molten iron, rusted plates, and primeval hunger. It does not sleep and it knows no mercy. Descend with haste and water, or become cinder in its gullet.",
        failReply: "Fire and grinding iron. Only fools ask what awaits them in the furnace.",
        mood: 'calm',
      },
    ],
  },
  'hk-constance': {
    greeting: "Bonsoir. Keep your boots on the runner rug. Housekeeping trades clean linen and field rations. What does your pack lack?",
    mood: 'calm',
    choices: [
      {
        text: "Show me what supplies Outpost Housekeeping has for trade.",
        tag: "Help",
        reply: "Clean linen rolls, surgical bandages, purified almond extract, and standard field rations. Housekeeping maintains full inventories.",
        mood: 'calm',
      },
      {
        text: "Let's negotiate prices on survival gear and rations.",
        tag: "Barter 45",
        check: { skill: 'barter', difficulty: 45 },
        reply: "You have quality trade goods. Housekeeping approves this requisition. Fifteen percent discount on your invoice today.",
        failReply: "Standard barter ratios apply to all wanderers. No exceptions.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "Why does the orchestral music from the ballroom never stop?",
        tag: "Lore",
        reply: "The anomalous loop has played continuously since our arrival in 2017. The acoustic frequency carries subtle psychic resonance, which is why ear protection is standard for patrol squads.",
        mood: 'calm',
      },
      {
        text: "What's your advice for surviving the Boiler Room heat?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "Never touch uninsulated brass valves, carry two canteens of chilled Almond Water, and stay on the iron catwalks. The floor grating below is submerged in scalding condensation.",
        failReply: "Do not go down there without a full fire-resistant suit.",
        mood: 'calm',
      },
    ],
  },
  'hk-vance': {
    greeting: "Boiler pressure is running red hot today. Keep your distance from the steam vents unless you want your fur scorched.",
    mood: 'calm',
    choices: [
      {
        text: "What's the safest route through the Boiler Room?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "Catwalk 3 to the western heat exchangers, then descend through the valve manifold gallery. It bypasses the primary nesting pits of the Death Rats.",
        failReply: "There is no safe route. Just faster ways to get boiled alive.",
        mood: 'calm',
      },
      {
        text: "What kind of scrap weapon works best against Death Rats?",
        tag: "Melee 40",
        check: { skill: 'melee', difficulty: 40 },
        reply: "A heavy steel pipe wrench with welded teeth along the jaw. Gives you reach and crushing power without worrying about dulling a blade on their tough hides.",
        failReply: "Anything heavy that swings fast. Do not let them get behind your boots.",
        mood: 'calm',
      },
      {
        text: "Have you ever caught a glimpse of the Boiler Room Beast?",
        tag: "Lore",
        reply: "Saw its shadow cast across the third furnace bank. Huge slumping mass with glowing orange vents along the shoulders. Shook the concrete foundations when it turned.",
        mood: 'calm',
      },
      {
        text: "Need any assistance with maintenance down there?",
        tag: "Help",
        reply: "If you find copper gasket seals in the workshop bins, bring them up. Half the steam vents are leaking high-pressure vapor into the service halls.",
        mood: 'calm',
      },
    ],
  },
  'homely-barnaby': {
    greeting: "A very cordial welcome to the Homely Hotel, honored guest. May I assist you with reservations or suite accommodations today?",
    mood: 'happy',
    choices: [
      {
        text: "I'd like to inquire about booking a room.",
        tag: "Help",
        reply: "A most splendid choice! Suite 304 overlooks the courtyard fountain and comes fully appointed with mahogany dressers and a fresh feather mattress. Your key awaits.",
        mood: 'happy',
      },
      {
        text: "What amenities does the hotel provide for wanderers?",
        tag: "Lore",
        reply: "Twenty-four-hour room service, hot running almond water baths, a peaceful reading parlor, and the exquisite melodies of our grand ballroom orchestra.",
        mood: 'calm',
      },
      {
        text: "It must take extraordinary dedication to keep this place running.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "It is our utmost joy and purpose to provide comfort in an uncertain world. Allow me to offer you a complimentary bottle of our finest vintage almond cordial.",
        failReply: "The hotel runs on eternal devotion, guest. Nothing more, nothing less.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "Have you ever seen the manager of this establishment?",
        tag: "Survival 45",
        check: { skill: 'survival', difficulty: 45 },
        reply: "Mr. Ambrose oversees our daily affairs, but the true Owner resides in the penthouse suite above the clouds. None have entered that suite and returned to tell.",
        failReply: "Management affairs are strictly confidential among staff members.",
        mood: 'calm',
      },
    ],
  },
  'homely-auguste': {
    greeting: "Ah, bon appétit! Enter the dining room! A wanderer cannot face the boiler halls on an empty stomach! What can I cook for you?",
    mood: 'happy',
    choices: [
      {
        text: "What fresh dishes or cuts of meat do you have available?",
        tag: "Help",
        reply: "Roasted duck breast with almond glaze, butter poached leeks, crusty sourdough rolls, and tender braised beef short ribs. Prepared fresh for our guests!",
        mood: 'happy',
      },
      {
        text: "I have almond water. Let's trade for some warm rations.",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "Splendid quality! Clean, aromatic water makes all the difference in my sauces. Here is a generous basket of warm meat pies and sweet berry tarts!",
        failReply: "This water lacks clarity! Auguste cooks only with the purest ingredients!",
        mood: 'happy',
        heal: true,
      },
      {
        text: "Where does the hotel kitchen source its supplies?",
        tag: "Lore",
        reply: "The silver dumbwaiters arrive loaded with fresh poultry, herbs, and dairy every dawn. The kitchen has never wanted for a single head of garlic in fifty years!",
        mood: 'calm',
      },
      {
        text: "Any recommendations for treating Samantha the cat?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "A little braised liver with a saucer of heavy cream! Speak to her with reverence, stroke her velvet back, and she will purr like a happy harp!",
        failReply: "Do not pull her tail, or you will lose a finger. That is my recommendation!",
        mood: 'happy',
      },
    ],
  },

  // ---- Level 7 (Thalassophobia: M.E.G. Seawatch & Fort Surrender) ----
  'l7-vance': {
    greeting: "Easy on the jetty planks, they're slick with sea spray. Welcome to M.E.G. Outpost Seawatch. If you swam here instead of taking the skiff, you're luckier than the last three runners.",
    mood: 'calm',
    returning: "Back on dry basalt, runner? Keep an eye on the sonar trace, Entity 20 just circled the trench.",
    friendly: "Good to see you breathing, friend. Warm your hands by the brazier and check the workbench if your gear's rusted.",
    cold: "Don't touch the hydrophone array unless you know how to read an acoustic sweep.",
    choices: [
      {
        text: "What are the ocean depth zones and what's lurking down there?",
        tag: "Lore",
        reply: "Sunlight Zone is clear water down to 200 meters. Twilight Zone gets freezing and pitch black. Midnight Zone is where the water pressure crushes bone and Entity 20 hunts in the abyss.",
        mood: 'calm',
      },
      {
        text: "How do I read the sonar pings for Entity 20 and 'Tiny'?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Single long-period return at forty hertz means Entity 20 is surfacing. Rapid double ping with heavy displacement means Tiny is gliding through the shelf. If you hear clicks through the hull, cut your motor immediately.",
        failReply: "If the needle jumps hard left, get out of the water and pray the jetty pilings hold.",
        mood: 'calm',
      },
      {
        text: "Let's trade salvage and ammo. I need marine supplies.",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "Clean dive gear and dry batteries. That is worth gold out here on the docks. Knocking fifteen percent off for you.",
        failReply: "Salt-crusted salvage needs three hours of cleaning before I can use it. Standard trade only.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "Who are the people living out on the far island at Fort Surrender?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Brother Jude and his followers. The Society of the Pushing. They gave up fighting the ocean and worship the entity beneath the waves. Eccentric, but they keep the water still running and they do not draw blades.",
        failReply: "Just a cult out on a rock. Keep your distance unless you want to spend all day listening to sermons about the abyss.",
        mood: 'calm',
      },
    ],
  },
  'l7-jude': {
    greeting: "Cease your rowing, wanderer. Listen to the slow breath beneath the waves. You have reached Fort Surrender, where the fear of the deep becomes our sanctuary.",
    mood: 'calm',
    returning: "You return to the rock. Have you heard the Leviathan's song beneath the tar?",
    friendly: "Peace of the Abyss upon you, sibling. Sit by the Leviathan ribs and let the tide quiet your mind.",
    cold: "Do not mock the Thing Below while you stand upon a pebble in Its ocean.",
    choices: [
      {
        text: "Why does the Society of the Pushing worship the Thing on Level 7?",
        tag: "Lore",
        reply: "In an infinite sea of crushing cold, fighting the deep only invites madness. When you surrender your fear to the Leviathan, the waters cease to be a prison and become an eternal womb.",
        mood: 'calm',
      },
      {
        text: "What lies below the Midnight Zone in the underwater tar caves?",
        tag: "Survival 40",
        check: { skill: 'survival', difficulty: 40 },
        reply: "The ocean floor turns to thick tarry sludge riddled with flooded lava tubes. The pressure should crush any mortal flesh, yet anomalous pockets of breathable air exist within the basalt rifts.",
        failReply: "Cold, absolute dark, and the crushing weight of an infinite sea. Only the chosen may descend without fear.",
        mood: 'calm',
      },
      {
        text: "There's a second gargantuan creature out there, what is 'Tiny'?",
        tag: "Lore",
        reply: "An ancient, gentle titan that glides through the upper thermoclines. It feeds on the strange bioluminescent plankton and ignores swimmers unless cornered.",
        mood: 'calm',
      },
      {
        text: "Your people built a fortress out of drifting furniture. Share your wisdom with me.",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "Sit beside me, sibling. Let the rhythm of the waves wash the exhaustion from your spirit. You carry too much weight from the levels above. Rest here.",
        failReply: "The ocean does not yield its peace to those who come demanding answers. Silence your pride first.",
        mood: 'calm',
        heal: true,
      },
    ],
  },
  'l7-mara': {
    greeting: "Brother Jude feeds the soul, I keep the walls lashed and the condenser boiling. You want fresh almond water or deep-sea salvage, let's see what you brought.",
    mood: 'calm',
    returning: "Back from the swells? The tide washed in more furniture and crates if you've got the arm to smash them.",
    friendly: "Hey there, dry-lander! Saved some smoked fish and clean bandages from the last haul for you.",
    cold: "Everything on this rock was hauled out of freezing water. Pay fair or start swimming.",
    choices: [
      {
        text: "Show me your stock. I've got almond water to trade.",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "Clear bottles, good seals. Fort Surrender can always use pure water. You get our island rate today, fifteen percent off.",
        failReply: "Those seals look cracked. I am not trading hand-forged fishhooks for dirty runoff. Standard price.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How does your copper still turn Level 7 seawater into Almond Water?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Multi-stage condensation through charcoal beds and copper coils. We boil off the salt and let the anomalous minerals re-crystallize into pure almond extract. It takes patience, but it keeps thirty people alive.",
        failReply: "Fire under the pot, coils over the bucket. If the vapor smells sweet, drink it. If it smells like brine, boil it again.",
        mood: 'calm',
      },
      {
        text: "What's down inside that rusted Diving Bell on the north cliff?",
        tag: "Lore",
        reply: "Old deep-sea apparatus hauled up from the bottom two months ago. The cable snapped decades ago, but the interior was bone dry when we cracked the hatch. Still has handwritten logs inside.",
        mood: 'calm',
      },
      {
        text: "It takes grit to hold this island together. Cut me a friendly deal?",
        tag: "Speech 40",
        check: { skill: 'speech', difficulty: 40 },
        reply: "You have an honest smile and you did not complain about the fish smell. Fine, take the discount and welcome to Fort Surrender.",
        failReply: "Grit does not pay for rope, wanderer. Put your goods on the table or move down the dock.",
        mood: 'happy',
        discount: true,
      },
    ],
  },

  // ---- Level 11 (The Infinite City) ----
  'l11-meg-agent-vance': {
    greeting: "Welcome to Base Beta forward post, wanderer. Take a breath, the sun's real enough, and the air won't choke you.",
    mood: 'calm',
    returning: "Still patrolling the avenue? Keep an eye out on the side alleys; some streets lead to places you don't want to fall into.",
    friendly: "Good to see another friendly face on the boulevard. Let me know if you need supplies from the chest or tactical logs from the terminal.",
    cold: "Keep your hands off the perimeter barricades. What do you need?",
    choices: [
      {
        text: "What is this city, and why do the entities act peaceful here?",
        tag: "Lore",
        reply: "Level 11 is an endless modern metropolis. The Level 11 Effect exerts an anomalous calming field over entities. Hounds act like domestic dogs, and Facelings work regular office jobs in suits.",
        mood: 'calm',
      },
      {
        text: "How does M.E.G. operate Base Beta across such a massive urban sprawl?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Base Beta coordinates eight regional precincts, radio repeaters on skyscraper roofs, and bicycle patrols along the avenues. We keep the streets charted and maintain emergency shelters.",
        failReply: "It takes constant patrols and hundreds of logistics runners. Do not wander into unmapped cul-de-sacs without checking in first.",
        mood: 'calm',
      },
      {
        text: "The terminal mentioned the 'Level 11 Effect' and security sector logs. Can you brief me?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "The effect is rooted in the city's psychological resonance with urban normality. As long as wanderers do not incite violence or enter corrupted zones like the Glitched Alleyways, the ambient peace remains stable.",
        failReply: "Read the field manual on the counter. The short version: do not start fights, and the city will not fight you.",
        mood: 'calm',
      },
      {
        text: "Any tips for navigating the road network and canal safely?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Numbered avenues run north to south, named streets run east to west. If you hit the canal, follow the stone towpath toward the market plaza. Avoid any street where the lamp posts flicker purple.",
        failReply: "Keep a street map in your jacket. Every brick townhouse looks identical if you start panicking.",
        mood: 'calm',
      },
      {
        text: "Can you spare some extra ammunition and medical supplies from Base Beta's cache?",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "You have an honest record with our precinct. Here, take a fresh first aid kit and an ammo box from the reserve shelf.",
        failReply: "Requisition orders require Quartermaster clearance. We cannot hand out military munitions to walk-ins.",
        mood: 'happy',
        heal: true,
      },
    ],
  },
  'l11-trader-kael': {
    greeting: "Greetings, citizen! Fresh bread and apples just noclipped into our crates this morning. The Capital always keeps its people fed.",
    mood: 'calm',
    returning: "Back to the market? We just unpacked a fresh crate of Level 6.1 roasted coffee and bottled sodas.",
    friendly: "Always good to see a loyal customer! Tell you what, I'll knock a few Backdollars off your bulk order today.",
    cold: "Take your free ration and keep moving. The Guild's got a schedule to keep.",
    choices: [
      {
        text: "Show me your wares. What has the Traders Guild brought to the Capital?",
        tag: "Barter 30",
        check: { skill: 'barter', difficulty: 30 },
        reply: "Fresh apples, warm rolls, Level 6.1 dark roast coffee, and pure almond water. And for a valued friend of the Guild, fifteen percent off your tab today.",
        failReply: "Standard guild prices today, friend. Food does not stay fresh forever, even in Level 11.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "How does the food supply work? Does food really noclip into crates out of thin air?",
        tag: "Lore",
        reply: "Yes. Every dawn, empty grocery shelves and supermarket coolers across the commercial district restock themselves with fresh produce, canned goods, and dairy. It is the miracle that keeps fifty thousand survivors alive.",
        mood: 'calm',
      },
      {
        text: "How does the B.N.T.G. navigate trade caravans through the canal locks to other levels?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Canal barges navigate through anomalous sluice gates that link into Level 10 reservoirs and Level 6.1 snackroom depots. We control the water levels with the big iron wheel on the lock bridge.",
        failReply: "Big wooden barges and strong rowing arms. Keep your hands inside the gunwales when approaching the lock gates.",
        mood: 'calm',
      },
      {
        text: "I've brought valuable salvage from the utility tunnels. Let's make a mutually profitable deal.",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Clean copper pipe, brass fixtures, and intact relays. The B.N.T.G. loves utility salvage. You have earned prime guild credit on our market floor!",
        failReply: "Utility scrap is heavy and cheap. I can take it off your hands, but do not expect a fortune.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What's in that pamphlet, 'A Different Kind of Urban'?",
        tag: "Lore",
        reply: "A handbook written by early settlers describing how to establish permanent residency in the city: choosing stable apartment blocks, tap-filtering almond water, and coexisting with Faceling neighbors.",
        mood: 'calm',
      },
    ],
  },
  'l11-commuter-faceling': {
    greeting: "Good afternoon. Quite pleasant weather for a stroll along the canal promenade, wouldn't you say?",
    mood: 'calm',
    returning: "Ah, hello again. Just taking care of my daily rounds before evening settles in.",
    friendly: "Always a pleasure to see courteous passersby on the boulevard. The city feels much brighter with friendly company.",
    cold: "Pardon me, I have urgent appointments to keep at the commercial plaza.",
    choices: [
      {
        text: "You seem completely at ease. Don't you know we're in the Backrooms?",
        tag: "Speech 25",
        check: { skill: 'speech', difficulty: 25 },
        reply: "Why should one worry? The sun is warm, the sidewalks are swept, and the trolley will arrive right on schedule. Routine brings comfort to all creatures, wanderer.",
        failReply: "Pardon me, but I have a ledger to balance at the commercial annex. Good day to you.",
        mood: 'calm',
      },
      {
        text: "Where does this endless avenue lead, and what is the Capital district?",
        tag: "Lore",
        reply: "The avenue continues for thousands of miles past parks, high-rises, and suburban bungalows. The Capital district is the historic core where M.E.G. and the Traders Guild first established order.",
        mood: 'calm',
      },
      {
        text: "How do the day-night cycle, traffic lights, and crosswalk chimes work here?",
        tag: "Science 30",
        check: { skill: 'science', difficulty: 30 },
        reply: "The day-night cycle is governed by atmospheric luminosity shifts every twelve hours. The traffic signals follow a 90-second mechanical sequence, even though driverless cars rarely occupy the lanes. It simulates an idealized 1990s municipal grid.",
        failReply: "The lights turn green, you cross. The lights turn red, you wait. It is quite simple, really.",
        mood: 'calm',
      },
      {
        text: "Have you seen any unmapped road barricades or anomalous rifts nearby?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Avoid the construction detour on 14th Street. The asphalt dissolves into purple static beyond the warning barrels. Stick to the paved sidewalks and you will be quite safe.",
        failReply: "I avoid unpaved streets as a matter of personal hygiene.",
        mood: 'calm',
      },
    ],
  },
  'l11-walker-1': {
    greeting: "Can't stop, kid! Dispatch manifest for Sedco Tower and the commercial elevator's being moody again.",
    mood: 'calm',
    returning: "Hey, runner! Still alive on the avenue? Watch out for the delivery skiff down by the locks, wake was choppy earlier.",
    friendly: "Yo! Good to run into you. If you ever need to know which alleys are dead ends and which ones lead to Level 6.1, just ask.",
    cold: "Out of the way! If this cargo is two minutes late, dispatch docks my pay.",
    choices: [
      {
        text: "Slow down for a second. What are you delivering across the city?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Manifest parcels for Sedco Tower and the B.N.T.G. depot! Documents, keys, spare relays, and fresh coffee grounds. Keep moving or you get passed on the avenue!",
        failReply: "No time to chat! Dispatch will fine me three Backbucks if I drop this manifest!",
        mood: 'calm',
      },
      {
        text: "What's the best shortcut between M.E.G. Base Beta and the market?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Cut through the arcade galleria behind the green townhouse, then cross the footbridge over the canal lock. Cuts twenty minutes off the main boulevard detour.",
        failReply: "Just run down 11th Avenue and do not trip over the fire hydrants.",
        mood: 'calm',
      },
      {
        text: "What's the deal with the parked cars along the curbs? Do they actually drive?",
        tag: "Science 25",
        check: { skill: 'science', difficulty: 25 },
        reply: "Most have empty engine bays or solid lead blocks under the hood. But a few sedans with keys in the ignition have working batteries and fuel tanks filled with almond liquid. M.E.G. mechanics keep three in service.",
        failReply: "Try turning the key yourself. Most of them are just heavy steel lawn ornaments.",
        mood: 'calm',
      },
      {
        text: "Have you noticed any strange rifts or spontaneous roadworks on your route?",
        tag: "Lore",
        reply: "Saw a scaffolding crew yesterday on 12th Avenue. None of them had faces, but they were welding steel I-beams with real oxyacetylene torches. By nightfall the whole building was painted blue.",
        mood: 'calm',
      },
    ],
  },
  'l11-walker-2': {
    greeting: "Third week in the city! The coffee cart guy on 11th already knows my order. Is it weird that this feels normal?",
    mood: 'calm',
    returning: "Oh, hi! Taking another break from the filing department. The breeze coming off the canal is lovely today.",
    friendly: "Hey there! It's so nice having someone normal to talk to. All the senior accountants do is talk about building maintenance.",
    cold: "I really need to get back to the office. Supervisor was already tapping her watch.",
    choices: [
      {
        text: "How did you end up working in an office inside the Backrooms?",
        tag: "Lore",
        reply: "Walked out of an empty hallway on Level 4 into an open stairwell, pushed a metal door, and found myself on 9th Street. Found an accounting firm with working coffee makers, and I have been filing purchase manifests ever since. It beats running from Hounds.",
        mood: 'calm',
      },
      {
        text: "You seem stressed. Take a breath, you're doing great out here.",
        tag: "Medicine 25",
        check: { skill: 'medicine', difficulty: 25 },
        reply: "Thank you... you have no idea how much I needed to hear that. My heart was pounding all morning. Take this fresh mint lozenge, it helped settle my nerves.",
        failReply: "I have eighty pages of freight vouchers to balance before 5 PM. Breathing does not balance the ledger.",
        mood: 'happy',
        heal: true,
      },
      {
        text: "What's inside that enterable brick apartment down the block?",
        tag: "Speech 25",
        check: { skill: 'speech', difficulty: 25 },
        reply: "Clean two-bedroom flats with parquet floors and working radiators. The B.N.T.G. Realty agent Mara holds the master key for the green townhouse across the street if you are looking for a permanent home.",
        failReply: "Just old furniture, dusty lamps, and empty dressers. Nothing dangerous.",
        mood: 'calm',
      },
      {
        text: "Do the office telephones ever ring? Does anyone ever answer them?",
        tag: "Lore",
        reply: "Sometimes they ring at exactly 3:00 PM. If you pick up, it is just a soft dial tone, or someone breathing quietly before hanging up. Nobody answers them anymore.",
        mood: 'calm',
      },
    ],
  },
  'l11-walker-3': {
    greeting: "Every block looks like the last one if you walk it long enough. Keep your map close and don't trip over the curbs, wanderer.",
    mood: 'calm',
    returning: "Back again? Steam lines on 11th Avenue are hissing steady. Just vented three manholes of Almond Water vapor.",
    friendly: "Good to see someone with good sense. Here, take this spare flashlight battery. A good wanderer never walks into a dark stairwell unprepared.",
    cold: "Step around the wet sealant, kid. Don't make my shift longer than it already is.",
    choices: [
      {
        text: "What are those steam seeps coming out of the manhole covers?",
        tag: "Science 30",
        check: { skill: 'science', difficulty: 30 },
        reply: "Subterranean pressure relief lines linked to Level 2. The excess steam condenses in our municipal cisterns and feeds the almond water fountains throughout the parks.",
        failReply: "Just steam lines venting. Do not stand right over the grates unless you want to fog up your glasses.",
        mood: 'calm',
      },
      {
        text: "What's the story behind the spontaneous roadworks and scaffolding?",
        tag: "Lore",
        reply: "Level 11 is constantly expanding. When the perimeter boundaries push outward, orange barrels and asphalt pavers appear overnight to pave the new avenues. It is the city building itself.",
        mood: 'calm',
      },
      {
        text: "How do the apartment radiators and Almond Water taps keep running without an active power grid?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Geothermal convection from deep conduit layers coupled with ambient anomalous pressure. The plumbing operates on a closed hydrodynamic loop that never loses head pressure.",
        failReply: "It runs because the Backrooms says it runs. Better not to overthink the pipes as long as hot water comes out.",
        mood: 'calm',
      },
      {
        text: "Got any advice for surviving the streets when darkness falls?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Stay under the incandescent street lamps. If a block goes dark, step inside an unlocked foyer and latch the deadbolt. Facelings get restless in pitch black, but they respect closed doors.",
        failReply: "Keep your boots laced and do not linger in unlit alleys.",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 10 (M.E.G. Outpost Bountiful) ----
  'l10-meg-cooper': {
    greeting: "Welcome to M.E.G. Outpost Bountiful, wanderer! Smell that? That's real honest sourdough baking. Breathe the open air, there's no ceiling above you here.",
    mood: 'happy',
    returning: "Back from the wheat fields? Grab a warm slice and tell me what the horizon looks like today.",
    friendly: "Always a pleasure, friend! The harvest is coming along great thanks to folks like you.",
    cold: "Watch where you step in the barley rows. We don't waste grain here.",
    choices: [
      {
        text: "Can you teach me how to harvest wheat and bake bread?",
        tag: "Help",
        reply: "Pull up an apron! Grab a wooden bowl, sift the wheat flour with two cups of warm almond water, and knead until smooth. Pop it into the stone hearth oven. Here, have a fresh warm roll while we talk!",
        mood: 'happy',
        heal: true,
      },
      {
        text: "I'd like to help Outpost Bountiful with the harvest.",
        tag: "Survival 25",
        check: { skill: 'survival', difficulty: 25 },
        reply: "You have strong shoulders and good balance in the furrows. Take that sickle by the fence and reap the golden rows. We will bake fine loaves today.",
        failReply: "Careful with that sickle blade, wanderer. You will cut your boots before you reap a bushel.",
        mood: 'happy',
      },
      {
        text: "How did M.E.G. establish an agricultural outpost in the Backrooms?",
        tag: "Lore",
        reply: "When scouts first emerged onto Level 10, they found endless golden fields and sweet almond rain. Base Alpha needed carbohydrates, so Outpost Bountiful was founded to feed every level in the cluster.",
        mood: 'calm',
      },
      {
        text: "Let's trade for fresh rations and supplies.",
        tag: "Barter 30",
        check: { skill: 'barter', difficulty: 30 },
        reply: "Fresh crusty bread for clean tools and salvage. You have an honest trade. I will knock fifteen percent off for you.",
        failReply: "Flour does not grow on trees, friend. Standard backbuck prices apply at Bountiful.",
        mood: 'happy',
        discount: true,
      },
    ],
  },
  'l10-meg-hale': {
    greeting: "Quartermaster's post. Grain, rations, rope, lamp oil. All of it weighed, all of it logged. What do you need?",
    mood: 'calm',
    returning: "You again. Bring anything worth putting on the scale?",
    friendly: "Good to see a steady customer. I set aside a sack of the good flour for you.",
    cold: "Everything here is counted. Remember that before you reach for anything.",
    choices: [
      {
        text: "What does the outpost need most right now?",
        tag: "Help",
        reply: "Sturdy burlap sacks, sickle whetstones, and clean twine for the sheaves. Bring those by the counter and I will credit your ration ledger.",
        mood: 'calm',
      },
      {
        text: "Where does all this grain go?",
        tag: "Lore",
        reply: "Packed into B.N.T.G. skiffs down to the canal on Level 11, carted back to Base Alpha on Level 1, and shipped up to Base Gamma on Level 3. Without our harvest, half the cluster starves.",
        mood: 'calm',
      },
      {
        text: "Can you knock a few backbucks off for a regular?",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "You have hauled your weight around the barn today. Fine, fifteen percent off your requisitions.",
        failReply: "The quartermaster's ledger balances down to the penny. No favoritism in my barn.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "Someone ate one of the caravan loaves, didn't they?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Do not look at me like that! It had an uneven crust, it was not going to survive the bumpy cart ride to Level 1 anyway.",
        failReply: "What happens in the pantry stays between me and the baking hearth. Mind your own business.",
        mood: 'calm',
      },
    ],
  },
  'l10-meg-wren': {
    greeting: "Oh! Hi. Watch your step, this row's half harvested. You lost or just looking?",
    mood: 'happy',
    returning: "Back again? Grab a sickle, I won't tell Cooper you're not on the roster.",
    friendly: "Hey, you! Saved you a spot by the fire tonight.",
    cold: "Rows are for working. Go stand somewhere else.",
    choices: [
      {
        text: "What's it like working the fields here?",
        tag: "Lore",
        reply: "Peaceful, mostly. The wind makes the wheat whisper, and the sky never turns pitch black, just a soft twilight. It is the only place down here where you can forget the concrete.",
        mood: 'calm',
      },
      {
        text: "Have you ever dug deeper than you should have?",
        tag: "Lore",
        reply: "Dug a fence post hole three feet down last spring and hit a sheet of polished grey tile like Level 0. This whole prairie is resting on top of the original yellow rooms.",
        mood: 'calm',
      },
      {
        text: "Why won't anyone turn the scarecrows back around?",
        tag: "Survival 25",
        check: { skill: 'survival', difficulty: 25 },
        reply: "Because every time someone turns them north, they are facing south again by daybreak. Nobody touches them now. As long as you do not stare into their burlap faces, they leave the harvesters alone.",
        failReply: "Superstition, mostly. But nobody wants to be the one who climbs the pole to check.",
        mood: 'calm',
      },
      {
        text: "How'd you end up at Bountiful?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Fled through the pipes on Level 2 with scorched boots and hollow ribs. Cooper took me in and taught me the scythe. Say, you look like you could use someone watching your back in the fields. Mind if I join you?",
        failReply: "Same way everybody does. Fell through a floor, walked through the dark, and kept walking until there was grass under my feet.",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'l10-meg-sully': {
    greeting: "Hold on, hold on... no, that's static. Sorry. Sully, radio. You need a message sent somewhere?",
    mood: 'calm',
    returning: "Nothing back from Alpha yet. You'll be the first to know. Well. Second.",
    friendly: "Pull up a crate. I caught something odd on the band last night, you'll want to hear it.",
    cold: "Don't touch the dials. They took me three weeks to tune.",
    choices: [
      {
        text: "Who are you trying to reach?",
        tag: "Lore",
        reply: "Outpost Alpha on Level 1, Base Beta on Level 11, and the deep research squads in Level 4. But radio skip in the Backrooms bends through non-euclidean geometry, so half the time we catch signals from 1954.",
        mood: 'calm',
      },
      {
        text: "What did you hear on the shortwave last night?",
        tag: "Lore",
        reply: "Morse code repeating coordinates, followed by a voice reciting shipping manifests for a vessel called the SS Oceanic. Static swallowed the rest.",
        mood: 'calm',
      },
      {
        text: "Can you boost the signal toward the city?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Ground the copper antenna wire to the deep well casing and twist the capacitor bridge twelve degrees. Listen to that: clear carrier tone straight into the Level 11 repeater!",
        failReply: "Turning the dial too fast just causes feedback howl. Give the vacuum tubes a minute to cool down.",
        mood: 'happy',
      },
      {
        text: "Do you ever get an answer?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Once a week, Base Beta confirms receipt of our grain dispatch. Hearing another voice through the headphones proves we are not alone out here.",
        failReply: "Mostly just the buzz of the ionosphere. But you keep calling anyway.",
        mood: 'calm',
      },
    ],
  },
  'l10-meg-maeve': {
    greeting: "Greetings. Mind the specimen jars. I'm cataloging anomalous grain growth and soil composition for M.E.G. Research Wing.",
    mood: 'calm',
    returning: "Back from the plots? Did you notice any spatial distortions near the perimeter fences?",
    friendly: "Good to see you again! Your field observations have been remarkably helpful.",
    cold: "Please avoid touching the microscope slides. State your query.",
    choices: [
      {
        text: "What can you tell me about the anomalous scarecrows in the fields?",
        tag: "Lore",
        reply: "They do not appear in M.E.G. baseline surveys from 2018. Over the past three seasons, forty-two distinct scarecrows have manifested across the perimeter rows, each dressed in vintage wanderer garments.",
        mood: 'calm',
      },
      {
        text: "I can investigate the eastern scarecrow for your research.",
        tag: "Medicine 30",
        check: { skill: 'medicine', difficulty: 30 },
        reply: "Excellent. If you observe any physical respiration, twitching fibers, or spatial shifts, note the coordinates immediately. Document 24 may be tucked into its coat lining.",
        failReply: "Keep your distance if you approach. Several harvesters reported acute disorientation after standing too close.",
        mood: 'calm',
      },
      {
        text: "Is the wheat here safe for human consumption?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Completely safe. Cellular analysis reveals elevated starch density and traces of almond essence, but zero toxic alkaloids or anomalous spore contamination. It is the most wholesome staple in the cluster.",
        failReply: "Thousands of survivors have eaten Bountiful bread without ill effect. That is sufficient empirical proof for now.",
        mood: 'calm',
      },
      {
        text: "Where does the road lead if I follow it to the horizon?",
        tag: "Help",
        reply: "Follow the dirt cart path west and it gradually transitions into paved concrete curbs leading into Level 11. Head east and the fields fade into the endless karst cliffs of Level 8.",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 11 (Additional Urban NPCs) ----
  'l11-realty-agent': {
    greeting: "Looking for a home in the Capital? B.N.T.G. Realty holds the listing. One green two-story house on the avenue. Solid roof, real bed, quiet porch.",
    mood: 'calm',
    returning: "Back about the green house? The listing is still open, but properties on Level 11 don't wait forever.",
    friendly: "Always good to see a serious buyer. Have a seat. Let's discuss terms.",
    cold: "The front door stays locked until the deed is signed and paid. What can I do for you?",
    choices: [
      {
        text: "Tell me about the house. What comes with the deed?",
        tag: "Lore",
        reply: "Fully furnished two-story craftsman house on 11th Avenue. Solid maple front door, second-floor master suite, running almond water taps, working stove, and a private back porch overlooking the birch trees. It is the cleanest home in the Backrooms.",
        mood: 'calm',
      },
      {
        text: "Is the price flexible for an honest explorer?",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "The B.N.T.G. likes reliable homeowners. If you bring twenty-five hundred Backdollars, I will waive the filing surcharge and toss in a pantry starter kit.",
        failReply: "Twenty-five hundred Backdollars is already a steal for a permanent sanctuary. Not a penny less.",
        mood: 'happy',
      },
      {
        text: "How does property ownership work when levels shift?",
        tag: "Speech 35",
        check: { skill: 'speech', difficulty: 35 },
        reply: "Level 11 is spatially anchored. The foundations do not warp, the walls do not dissolve, and your deed is registered with the Base Beta municipal archives. Your property is sacred.",
        failReply: "You hold the key, you lock the door. That is how ownership works in any world.",
        mood: 'calm',
      },
      {
        text: "What's the neighborhood like after dark?",
        tag: "Survival 30",
        check: { skill: 'survival', difficulty: 30 },
        reply: "Peaceful. The street lamps on this avenue never burn out, and the Base Beta night patrol rounds the corner every forty minutes. It is the safest block in the city.",
        failReply: "Quiet enough. Just keep your blinds drawn and latch the front bolt before you turn in.",
        mood: 'calm',
      },
    ],
  },
  'l11-tm-clerk': {
    greeting: "Welcome to Thrift Mode! Hand-washed garments, fresh threads, odd jackets. We take Backdollars or good trades. Don't touch the mannequin.",
    mood: 'happy',
    returning: "Back to browse the racks? We got a new batch of courier vests and denim in.",
    friendly: "Hey, friend! For you, I'll pull the good jackets from the back rack.",
    cold: "Browse all you want, but shoplifters answer to Base Beta security.",
    choices: [
      {
        text: "Let me see what clothing and jackets you have in stock.",
        tag: "Help",
        reply: "Heavy courier dusters, denim jackets, wool knit sweaters, waterproof cargo pants, and reinforced hiking boots. All washed in almond water and pressed.",
        mood: 'calm',
      },
      {
        text: "Who trades clothing down here in the city?",
        tag: "Lore",
        reply: "Runners passing through from other levels, B.N.T.G. textile convoys, and salvaged luggage from abandoned apartments. If someone drops a winter coat to run faster, Thrift Mode gives it a second life.",
        mood: 'calm',
      },
      {
        text: "Can you cut me a discount on winter coats?",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "You have an eye for good stitchwork. Fifteen percent off the whole rack for you, friend!",
        failReply: "Good denim and wool are hard to come by down here. Prices on the tags are firm.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What's the story with the hoodie with the red smile?",
        tag: "Lore",
        reply: "Scavenged from an empty locker on Level 2. Some runners say wearing it makes the Smilers pause before they strike, but I would not bet your neck on a piece of cotton.",
        mood: 'calm',
      },
    ],
  },

  // ---- Level 8 (The 9th Road Camp) ----
  'l8-hobb': {
    greeting: "Keep close to the fire and keep your voice low. Sound carries in these caverns, and the things in the dark have big ears.",
    mood: 'calm',
    returning: "Back from the road? Shake the cave dust off your boots and warm up by the flame.",
    friendly: "Good to see you walking, friend. Take a bowl of Carla's soup, on the house.",
    cold: "Don't bring trouble toward the camp. If you've got spiders on your tail, turn around and deal with them.",
    choices: [
      {
        text: "What is the 9th Road, and where does it lead?",
        tag: "Lore",
        reply: "A two-lane asphalt highway running right through the belly of a subterranean cavern system. Follow it forward and you hit Level 9. Fall off the shoulders into the crevices and you end up in the spider nests.",
        mood: 'calm',
      },
      {
        text: "How do you defend the camp against the giant spiders?",
        tag: "Guns 35",
        check: { skill: 'guns', difficulty: 35 },
        reply: "Aim high behind the cephalothorax where the chitin plates overlap. Keep torches lit along the perimeter line. They hate open flames and bright magnesium flares.",
        failReply: "Shoot whatever has eight legs and moves toward the light. And never let them drop on you from the ceiling.",
        mood: 'calm',
      },
      {
        text: "Who are the Lightless in the side tunnels?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Survivors who spent too long in the unlit karst until their pupils dilated permanently. They do not use torches anymore and worship the darkness. They are territorial, so do not shine high-beam lanterns into their hollows.",
        failReply: "Cultists who broke their flashlights and lost their minds in the dark. Stay on the asphalt and ignore their chanting.",
        mood: 'calm',
      },
      {
        text: "Can you spare some torches or fuel?",
        tag: "Barter 30",
        check: { skill: 'barter', difficulty: 30 },
        reply: "You are doing honest work around camp. Take what you need from the fuel bin at fifteen percent off.",
        failReply: "Kerosene is scarce down here, wanderer. Full price or gather dry moss yourself.",
        mood: 'happy',
        discount: true,
      },
    ],
  },
  'l8-wen': {
    greeting: "Watch your step around the crates! Wen's the name, B.N.T.G. trade outpost. Spider silk, cave caps, ironstone. If it's in Level 8, I've got a price on it.",
    mood: 'happy',
    returning: "Back for more trade? I just sorted a fresh bundle of clean spider silk.",
    friendly: "My favorite caver! What oddities did you drag out of the karst today?",
    cold: "I don't do charity. Backbucks or trade goods, let's see them.",
    choices: [
      {
        text: "What supplies do you have for sale?",
        tag: "Help",
        reply: "Spider silk coils, cave cap mushrooms, almond water bottles, and reinforced climbing harnesses. All field-tested in the karst.",
        mood: 'calm',
      },
      {
        text: "How did you set up those glowing mushroom light guides?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Bioluminescent mycelium grafted onto damp calcium carbonate seams. They absorb ambient moisture and produce a cold blue phosphor that does not attract cave vermin.",
        failReply: "Stick mushrooms in the cracks and keep them wet. Simple enough even for surface runners.",
        mood: 'calm',
      },
      {
        text: "Let's negotiate a bulk discount on cave supplies.",
        tag: "Barter 40",
        check: { skill: 'barter', difficulty: 40 },
        reply: "You have a sharp eye for quality silk. Done. Fifteen percent discount on all expedition stock.",
        failReply: "B.N.T.G. margins in Level 8 are razor-thin. One bad spider haul and I am bankrupt. No discounts.",
        mood: 'happy',
        discount: true,
      },
      {
        text: "What's at the end of Hyperspace Lane?",
        tag: "Lore",
        reply: "A strange, quiet corridor of smooth stone where distance stretches and contracts. Carla found an odd musical trinket out there once before the scouts pulled her back.",
        mood: 'calm',
      },
    ],
  },
  'l8-ivo': {
    greeting: "Shh. Did you hear that resonance in the stone? Ivo, Harmouth Speleological Society. I'm mapping the karst fissures.",
    mood: 'scared',
    returning: "You made it back! The road past Marker 74 didn't flood, did it?",
    friendly: "It's so reassuring seeing someone who can read a compass. Let me show you what I've surveyed.",
    cold: "Don't smudge my survey charts! These maps cost people their lives.",
    choices: [
      {
        text: "What happened to the rest of your survey team?",
        tag: "Lore",
        reply: "Harmouth team split up near Marker 42 when the floor gave way into a lower karst cavern. Two made it to Level 9, one fell into a web sinkhole. I stayed to finish mapping the fractures.",
        mood: 'calm',
      },
      {
        text: "How do I navigate past the flooding cavern safely?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "Time the water surges with the cavern echoes. When the low rumble stops, you have an eight-minute window to traverse the limestone shelf before the siphon refills.",
        failReply: "Keep your pack above your head and swim hard. If the ceiling drops, turn back immediately.",
        mood: 'calm',
      },
      {
        text: "Where did this old asphalt road come from inside a cave?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "It is an exact replica of Route 9 from upstate New York, down to the painted yellow centerlines and mile markers. The Backrooms did not just build it, it plucked it whole from the frontrooms.",
        failReply: "Nobody knows. It was here before the first survivor crawled through the rock.",
        mood: 'calm',
      },
      {
        text: "Let me inspect your survey notes. Maybe I can help.",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Look here: the looping anomalies align with magnetic variations in the karst. With your keen eye, we could map this whole sector together!",
        failReply: "These notations use Harmouth Speleological Society standards. You will just smudge the elevation contours.",
        mood: 'happy',
        recruit: true,
      },
    ],
  },
  'l8-marit': {
    greeting: "Sit down by the fire. Let me check your arms for spider bites. Neurotoxin works slow, but it works thorough.",
    mood: 'calm',
    returning: "Still on two feet? Good. Let me know if your joints ache or if your vision blurs.",
    friendly: "Good to see you whole, wanderer. Take a clean bandage, you've earned it.",
    cold: "If you got bitten and hid it, that's on you. What do you need?",
    choices: [
      {
        text: "Can you treat my venom wounds and fractures?",
        tag: "Help",
        reply: "Sit down on the blanket. Let me lance that spider puncture, draw out the toxin, and splint that wrist. Sip this warm almond broth. You will be back on your feet in no time.",
        mood: 'calm',
        heal: true,
      },
      {
        text: "How do you extract antivenom from the spider gland sacs?",
        tag: "Medicine 35",
        check: { skill: 'medicine', difficulty: 35 },
        reply: "Puncture the venom bulb behind the chelicerae, dilute with ninety percent boiled almond water, and filter through crushed charcoal. Neutralizes neurotoxin within ten minutes of injection.",
        failReply: "Cut the gland out without puncturing the sac, then boil it down. Mess it up and you poison yourself.",
        mood: 'calm',
      },
      {
        text: "You knew Sister Lull before she joined the Lightless?",
        tag: "Lore",
        reply: "Lull was our best tunnel scout. But after two weeks lost in the deep karst, she said the dark was speaking directly to her thoughts. When we found her, she had thrown her lantern down a ravine and would not answer her name.",
        mood: 'calm',
      },
      {
        text: "What keeps you going out here in the dark?",
        tag: "Speech 30",
        check: { skill: 'speech', difficulty: 30 },
        reply: "Knowing that people like you still make it through the tunnels alive. Every wanderer who walks out of this cave is a victory against the dark.",
        failReply: "Somebody has to bandage the fools who stick their heads into spider burrows.",
        mood: 'happy',
      },
    ],
  },
  'l8-carla-kid': {
    greeting: "Three Backbucks for soup! Hobb says hot food keeps the chills out of your ribs. It's mushroom and salt.",
    mood: 'happy',
    returning: "More soup? The pot's bubbling. I stirred it fifty times!",
    friendly: "Yay, you're back! You're my best customer. Hobb says I can buy my own boots soon!",
    cold: "No soup without three Backbucks. Hobb's watching.",
    choices: [
      {
        text: "I'll take a bowl of hot soup. Here are three Backbucks.",
        tag: "Help",
        reply: "Here you go! It is really hot, blow on it first! Hobb taught me how to toast the mushrooms on the embers so they do not taste slimy. Eat up!",
        mood: 'happy',
        heal: true,
      },
      {
        text: "How did a kid end up living in a cave camp?",
        tag: "Lore",
        reply: "Me and my dad were hiking in the woods, and then we tripped through a gray wall. Dad went down the road to find an exit and told me to stay with Hobb. He will come back soon.",
        mood: 'calm',
      },
      {
        text: "Are you scared of the dark outside the torches?",
        tag: "Speech 25",
        check: { skill: 'speech', difficulty: 25 },
        reply: "Sometimes when the wind makes the cave hum like a big pipe organ. But Hobb gave me a shiny whistle, and the campfire keeps all the creepy crawlers away!",
        failReply: "A little bit... especially when the shadows look like they have too many legs.",
        mood: 'happy',
      },
      {
        text: "You're doing a great job tending the fire, Carla.",
        tag: "Speech 25",
        check: { skill: 'speech', difficulty: 25 },
        reply: "Thank you! I keep the embers stacked just right so the smoke goes up the ceiling chimney! Hobb said I am the best camp tender in the Backrooms!",
        failReply: "Hobb told me not to talk to strangers unless they are buying soup!",
        mood: 'happy',
      },
    ],
  },

  // ---- Level 21 (Refrigerator Paradise) ----
  'l21-ned': {
    greeting: "Welcome to Refrigerator Paradise, wanderer. Grab a carton of Saltines from the table and watch your step on the frost.",
    mood: 'calm',
    returning: "Back from the freezer aisles? Bring any wire or scrap for the compressors?",
    friendly: "Good to see you, runner. The coils are dripping cold water, fill up your jugs.",
    cold: "Don't mess with the inventory ledger. We count every cracker sleeve.",
    choices: [
      {
        text: "How does the Base Alef lockout work, and who are you?",
        tag: "Lore",
        reply: "Base Alef was the first major M.E.G. stronghold here before an anomalous seal locked the main vault doors. I am Ned, former technician. I manage the pantry rations, maintain the condenser coils, and keep wanderers from freezing to death.",
        mood: 'calm',
      },
      {
        text: "What errands does the quartermaster board have posted?",
        tag: "Help",
        reply: "We need copper wire coils from the Exploration Wing to repair the frost condenser, and perimeter sweeps near The Edges. Steady work for honest runners.",
        mood: 'calm',
      },
      {
        text: "Can you teach me how to repair cooling systems and wiring?",
        tag: "Science 35",
        check: { skill: 'science', difficulty: 35 },
        reply: "Watch how the bypass valve routes the refrigerant past the frozen manifold. Keep the thermal solder clean and never kink the copper tubing. Here, take a spare set of wire crimpers.",
        failReply: "Refrigeration is all about pressure balance. Puncture a coil and you will freeze your fingers off in seconds. Leave the manifolds to me.",
        mood: 'calm',
      },
      {
        text: "Let's trade for emergency rations and batteries.",
        tag: "Barter 35",
        check: { skill: 'barter', difficulty: 35 },
        reply: "Good salvage wire and clean dry cells. I will knock fifteen percent off our Saltine and battery rates for you.",
        failReply: "Rations are tight until the next supply run from Level 11. Full exchange rate only.",
        mood: 'happy',
        discount: true,
      },
    ],
  },
  'l21-goknar': {
    greeting: "Keep your voice down. The hum of the fridges covers our noise, but the Smilers in The Edges have sharp ears.",
    mood: 'calm',
    returning: "Back alive from the dark corridors? Good. Keep your flashlight batteries fresh.",
    friendly: "Glad you made it through the numbered doors. It's rare seeing runners with your kind of grit.",
    cold: "Watch where you point that barrel. I've got enough headaches with the perimeter.",
    choices: [
      {
        text: "How do you fight off Smilers in these tight freezer hallways?",
        tag: "Guns 40",
        check: { skill: 'guns', difficulty: 40 },
        reply: "Never stare into their teeth. Keep your high-beam lantern pointed down to bounce illumination off the frost tiles, then aim two heavy slugs right into the shadow below the smile. Fall back through a numbered doorway and lock the latch.",
        failReply: "If you freeze up in the dark, you are dead. Keep firing until you hear the door slam.",
        mood: 'calm',
      },
      {
        text: "What's out past the white block rooms in The Edges?",
        tag: "Survival 35",
        check: { skill: 'survival', difficulty: 35 },
        reply: "The architecture dissolves into pure chalk-white cubes with no doors or fixtures. Beyond that lies the pitch-black void. If you step off the frost edge, you will freefall into Level 8 or worse.",
        failReply: "Nothing good. Total darkness, dead silence, and things with glowing teeth waiting for flashlight batteries to die.",
        mood: 'calm',
      },
      {
        text: "What happened when John Banks blew the dynamite plunger?",
        tag: "Lore",
        reply: "Banks was trying to blast open the sealed vault door of Base Alef. The blast fractured the spatial membrane of Level 21, opening permanent rifts into the freezer aisles and releasing the cold air that created Refrigerator Paradise.",
        mood: 'calm',
      },
      {
        text: "How do I reach the cold karst descent to Level 8?",
        tag: "Help",
        reply: "Head down corridor 4 to door 112. Behind that door is a fractured crevice where the linoleum drops directly into the limestone caverns of Level 8. Watch your footing, the descent is sheer ice.",
        mood: 'calm',
      },
    ],
  },
}

// Fallback starters for generic / unlisted NPCs by faction & role
export const GENERIC_STARTERS = {
  'surrender:trader': { greeting: "Fort Surrender salvage post. Everything here drifted in on the tide. Looking to trade?", mood: 'calm' },
  'surrender:default': { greeting: "Stop fighting the current, wanderer. The Deep holds us all.", mood: 'calm' },
  'meg:scout': { greeting: "M.E.G. scout on patrol. Halls are hot today. Keep your light down and watch your rear.", mood: 'calm' },
  'meg:medic': { greeting: "M.E.G. medical station. You bleeding, infected, or just exhausted? Take a seat.", mood: 'calm' },
  'meg:quarter': { greeting: "M.E.G. requisition post. All trades logged by weight. What supplies are you after?", mood: 'calm' },
  'meg:default': { greeting: "Status report, wanderer. Keep your weapon lowered while in M.E.G. territory.", mood: 'calm' },
  'survivor:trader': { greeting: "Almond water talks, everything else walks. What are you looking to buy or sell?", mood: 'happy' },
  'survivor:scout': { greeting: "Stay alert. The pipes groaned five minutes ago, which means something big is moving.", mood: 'calm' },
  'survivor:medic': { greeting: "Rest your legs. We've got clean bandages and boiled water. How are you feeling?", mood: 'calm' },
  'survivor:default': { greeting: "Hey... wanderer. Keep your distance until I know you're not an entity.", mood: 'calm' },
  'tbd:trader': { greeting: "T.B.D. deals exclusively in the useless and inexplicable. What oddities did you bring?", mood: 'calm' },
  'tbd:default': { greeting: "Everything has value if you don't know what it does. Looking to trade oddities?", mood: 'calm' },
  'amor:default': { greeting: "Walk gently among the bloom. The spores nourish those who respect the growth.", mood: 'calm' },
  'hotel:default': { greeting: "Welcome to the Homely Hotel. The service is eternal, and the doors are always unlocked.", mood: 'calm' },
  'hk:default': { greeting: "Housekeeping outpost. Watch the boiler thresholds and keep your flashlight charged.", mood: 'calm' },
  'orig:default': { greeting: "Another modern soul washed ashore. Have you no sense of etiquette in our salon?", mood: 'annoyed' },
  'default': { greeting: "Watch your step out there. The corridors play tricks on your eyes when you're tired.", mood: 'calm' },
}

const short = (it) => String(it?.id ?? '').split('/').pop()

export function getStarter(ctx, it, s) {
  if (!it) return null
  const id = short(it), key = keyOf(ctx.self), r = it.state?.rapport?.[key] ?? 0
  const following = it.state?.follow === ctx.self.id
  const hist = s.talks?.[id] ?? []
  const entry = STARTERS[id]

  if (following) {
    return { text: "Right behind you. Lead the way through the corridors.", mood: 'happy' }
  }

  if (entry) {
    if (hist.length > 0) {
      if (r >= 35 && entry.friendly) return { text: entry.friendly, mood: 'happy' }
      if (r <= -25 && entry.cold) return { text: entry.cold, mood: 'annoyed' }
      if (entry.returning) return { text: entry.returning, mood: entry.mood ?? 'calm' }
    }
    return { text: entry.greeting, mood: entry.mood ?? 'calm' }
  }

  // Generic fallback based on faction & role
  const fac = String(it.state?.faction5 ?? it.state?.faction4 ?? it.state?.faction ?? faction(it, ctx.self?.place ?? '')).toLowerCase()
  const role = String(it.state?.role ?? 'default').toLowerCase()
  const fkey = fac.includes('meg') || fac.includes('gamma') || fac.includes('omega') ? 'meg'
    : fac.includes('surv') ? 'survivor'
    : fac.includes('tbd') ? 'tbd'
    : fac.includes('amor') ? 'amor'
    : fac.includes('hotel') ? 'hotel'
    : fac.includes('hk') ? 'hk'
    : fac.includes('orig') ? 'orig'
    : 'default'

  const gen = GENERIC_STARTERS[`${fkey}:${role}`] ?? GENERIC_STARTERS[fkey] ?? GENERIC_STARTERS.default
  return { text: gen.greeting, mood: gen.mood ?? 'calm' }
}

export function getChoices(ctx, it, s, lastNpcReply, replyObj) {
  const list = withChecks(ctx, it, fitPlace(ctx, it, rawChoices(ctx, it, s, lastNpcReply, replyObj)))
  return l1Choice(ctx, it, s, zenithChoice(ctx, it, s, realtyChoice(ctx, it, s, list)))
}

// Mara at B.N.T.G. Realty always has the house on the table (scripts/lib/level11-quests.js answers it)
function realtyChoice(ctx, it, s, list) {
  if (String(it?.id ?? '').split('/').pop() !== 'l11-realty-agent' || !Array.isArray(list) || s?.home11) return list
  const asked = s?.homeAsk && ctx.now() - s.homeAsk < 120000
  const pick = asked ? { text: "Deal. I'll take the house.", tag: 'Buy $2,500' } : { text: "I want to buy the green house.", tag: 'House' }
  return [pick, ...list.filter((c) => !/house/i.test(c?.text ?? ''))].slice(0, 4)
}

// every skill-tagged line is a real roll, and each turn offers at least one: the ui shows its odds as a %
const SK_WORDS = { speech: 'speech', barter: 'barter', medicine: 'medicine', survival: 'survival', science: 'science', sneak: 'sneak' }
const PUSH = {
  speech: ["Come on, you can trust me. Tell me what you're really thinking.", "I think we both know you want to help me out here.", "Level with me. What aren't you saying?"],
  barter: ["What would it take for you to cut me a better deal?", "I'll make it worth your while. What do you need?"],
  survival: ["You've lasted down here. What's your trick for staying alive?", "Read the room for me: is this spot actually safe?"],
  medicine: ["You look a bit off. Let me take a look at you.", "When did you last sleep? Honestly."],
}
function withChecks(ctx, it, list) {
  if (!Array.isArray(list)) return list
  const key = it?.id ?? 'x'
  let h = 0; for (const c of String(key) + (list[0]?.text ?? '')) h = (h * 31 + c.charCodeAt(0)) | 0
  const diffOf = (k) => 25 + (Math.abs(h + k.length * 7) % 40) // her pick: 25..64
  const out = list.map((c) => {
    if (typeof c !== 'object' || c.check) return c
    const sk = String(c.tag ?? '').toLowerCase().split(/\s+/)[0]
    return SK_WORDS[sk] ? { ...c, check: { skill: SK_WORDS[sk], difficulty: diffOf(sk) } } : c
  })
  if (!out.some((c) => c && c.check)) {
    const kinds = Object.keys(PUSH), k = kinds[Math.abs(h) % kinds.length], lines = PUSH[k]
    const line = { text: lines[Math.abs(h >> 3) % lines.length], tag: k, check: { skill: k, difficulty: diffOf(k) } }
    if (out.length >= 4) out[3] = line; else out.push(line)
  }
  return out
}

function rawChoices(ctx, it, s, lastNpcReply, replyObj) {
  if (!it) return []
  const id = short(it)
  const sk = skillsOf(s ?? {})
  const entry = STARTERS[id]

  // Quest dialogue hooks for Level 11, 10, 8, 21
  const qChoices = []
  if (id === 'l11-walker-1') {
    if (!s?.sedcoQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "You look overwhelmed with those parcels. Need a hand with a Sedco manifest?", tag: "Quest Start" })
    } else if (s?.sedcoQ === 5) {
      qChoices.push({ text: "I've retrieved the Sedco Master Security Drive from the vault.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-meg-agent-vance') {
    if (s?.sedcoQ === 5) {
      qChoices.push({ text: "I've recovered the Sedco Master Security Drive from the 14th St vault for M.E.G.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-trader-kael') {
    if (!s?.craneQ && repOf(s, "bntg") > -35) {
      qChoices.push({ text: "Is something wrong with the canal trade route? The docks seem quiet.", tag: "Quest Start" })
    } else if (s?.craneQ === 4) {
      qChoices.push({ text: "I cleared the canal lock spillway and brought pure Almond Water.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-walker-3') {
    if (!s?.maintQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "How are the maintenance rounds? Need assistance with the infrastructure?", tag: "Quest Start" })
    } else if (s?.maintQ === 4) {
      qChoices.push({ text: "The compressor is bypassed and the apartment 11-B utilities are running smooth.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-cooper') {
    if (!s?.wheatQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "I'd like to help Outpost Bountiful with the harvest. Need another hand?", tag: "Quest Start" })
    } else if ((s?.wheatQ >= 1 && s?.wheatQ < 99) && (s?.bread ?? 0) >= 1) {
      qChoices.push({ text: "I've baked a fresh Homestead Loaf for the caravan at the hearth oven!", tag: "Quest Turn-In" })
    }
    if (!s?.cellarQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "Heard strange noises from the storm cellar. Want me to check it out?", tag: "Quest Start" })
    } else if (s?.cellarQ === 2) {
      qChoices.push({ text: "I inspected the storm cellar. The subterranean pantry is intact and secure.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-maeve') {
    if (!s?.watcherQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "I can investigate the strange scarecrows in the eastern barley for your research.", tag: "Quest Start" })
    } else if (s?.watcherQ === 3) {
      qChoices.push({ text: "I found Document 24 in the scarecrow's coat: 'The Watchers of Level 10'.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-carla-kid') {
    if (!s?.carlaQ) {
      qChoices.push({ text: "You look cold and tired, Carla. Is there anything that could cheer you up?", tag: "Quest Start" })
    } else if ((s?.carlaQ >= 1 && s?.carlaQ < 99 && s?.kazoo) && !s?.kazooGiven) {
      qChoices.push({ text: "Here Carla, I found this stone kazoo on Hyperspace Lane for you.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-hobb') {
    if (!s?.spiderQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "The camp sentries look nervous. Need help gathering plate for the perimeter?", tag: "Quest Start" })
    } else if (s?.spiderQ >= 1 && s?.spiderQ < 99 && (s?.scrap?.chitin ?? 0) >= 3) {
      qChoices.push({ text: "I've brought the 3 spider chitin plates for the sentry barriers.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l8-ivo') {
    if (!s?.karstQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "Your survey looks incomplete. Want me to survey the looping karst crevice?", tag: "Quest Start" })
    } else {
      if ((s?.karstQ === 1 || s?.karstQ === 2) && !s?.karstSciFailed) {
        qChoices.push({ text: "I can deduce the loop vector from your Harmouth telemetry directly.", tag: "Science 45", check: { skill: "science", difficulty: 45 } })
      }
      if (s?.karstQ >= 1 && s?.karstQ < 99 && (s?.l8Loops ?? 0) >= 1) {
        qChoices.push({ text: "I mapped the looping crawl tunnel and logged the Face Rock readings.", tag: "Quest Turn-In" })
      }
    }
  } else if (id === 'l21-ned') {
    if (!s?.saltineQ && repOf(s, "survivors") > -35) {
      qChoices.push({ text: "Heard that compressor hissing. Need help with copper wire for the condenser?", tag: "Quest Start" })
    } else {
      if ((s?.saltineQ === 1 || s?.saltineQ === 2) && !s?.nedRepFailed) {
        qChoices.push({ text: "Let me inspect the condenser manifold. I can solder the bypass line directly.", tag: "Repair 35", check: { skill: "repair", difficulty: 35 } })
      }
      const wireCount = String(s?.items ?? '').split(',').filter(x => x === 'wire' || x === 'copper').length + (s?.scrap?.wire ?? 0);
      if (s?.saltineQ >= 1 && s?.saltineQ < 99 && wireCount >= 3) {
        qChoices.push({ text: "I brought 3 copper wire coils to fix the condenser water tubes.", tag: "Quest Turn-In" })
      }
    }
  } else if (id === 'l21-goknar') {
    if (!s?.edgesQ && repOf(s, "meg") > -35) {
      qChoices.push({ text: "Smilers scratching near the doorway? I can patrol the corridor to The Edges.", tag: "Quest Start" })
    } else if (s?.edgesQ >= 1 && s?.edgesQ < 99 && s?.l21Scouted) {
      qChoices.push({ text: "I surveyed The Edges perimeter and secured the dark corridor.", tag: "Quest Turn-In" })
    }
  }

  let baseChoices = []
  // If the model provided choices in JSON, validate and prioritize them
  if (Array.isArray(replyObj?.choices) && replyObj.choices.length >= 2) {
    baseChoices = replyObj.choices.slice(0, 4).map((c, i) => {
      const txt = String(c).trim()
      let tag = 'Reply'
      if (txt.toLowerCase().includes('speech') || txt.toLowerCase().includes('persuade')) tag = `Speech ${sk.speech}`
      else if (txt.toLowerCase().includes('trade') || txt.toLowerCase().includes('buy') || txt.toLowerCase().includes('sell') || txt.toLowerCase().includes('discount')) tag = `Barter ${sk.barter}`
      else if (txt.toLowerCase().includes('hurt') || txt.toLowerCase().includes('heal') || txt.toLowerCase().includes('wound')) tag = `Medicine ${sk.medicine}`
      else if (txt.toLowerCase().includes('entity') || txt.toLowerCase().includes('danger') || txt.toLowerCase().includes('navigate')) tag = `Survival ${sk.survival}`
      return { text: txt.replace(/^\[./, ''), tag }
    })
  } else if (lastNpcReply && typeof lastNpcReply === 'string') {
    baseChoices = generateFollowUpChoices(ctx, it, s, lastNpcReply, entry, sk)
  } else if (entry?.choices?.length) {
    baseChoices = entry.choices.map((c) => {
      const check = c.check
      const skillName = check?.skill ?? ''
      const diff = check?.difficulty ?? 35
      const tag = skillName ? `${skillName[0].toUpperCase() + skillName.slice(1)} ${diff}` : c.tag ?? 'Inquire'
      return { text: c.text, tag, check, reply: c.reply, failReply: c.failReply, mood: c.mood, heal: c.heal, recruit: c.recruit, discount: c.discount }
    })
  } else {
    baseChoices = generateGenericChoices(it, s, sk)
  }

  if (qChoices.length > 0) {
    return [...qChoices, ...baseChoices].slice(0, 5)
  }
  return baseChoices
}

function generateFollowUpChoices(ctx, it, s, line, entry, sk) {
  const t = line.toLowerCase()
  const out = []

  // Contextual question based on keywords in what the NPC just said
  if (t.includes('boiler') || t.includes('steam') || t.includes('heat')) {
    out.push({ text: "How intense does the steam heat get further down?", tag: `Survival ${sk.survival}` })
  } else if (t.includes('rat') || t.includes('beast') || t.includes('hound') || t.includes('entity') || t.includes('faceling') || t.includes('smiler')) {
    out.push({ text: "What's the best weapon or tactic against them?", tag: `Survival ${sk.survival}` })
  } else if (t.includes('hotel') || t.includes('suite') || (t.includes('room') && !t.includes('snackroom') && !t.includes('restroom') && !t.includes('bathroom') && !t.includes('backroom'))) {
    out.push({ text: "Are there any rooms wanderers should strictly avoid?", tag: "Lore" })
  } else if (t.includes('ballroom') || t.includes('waltz') || t.includes('music')) {
    out.push({ text: "Who is playing the music in the ballroom?", tag: "Lore" })
  } else if (t.includes('samantha') || t.includes('cat') || t.includes('reading')) {
    out.push({ text: "Does Samantha ever lie in her psychic readings?", tag: "Lore" })
  } else if (t.includes('almond') || t.includes('water') || t.includes('ration') || t.includes('stock')) {
    out.push({ text: "Could you spare a little extra for a traveler in need?", tag: `Barter ${sk.barter}`, check: { skill: 'barter', difficulty: 40 } })
  } else if (t.includes('mold') || t.includes('spore')) {
    out.push({ text: "Has anyone ever survived breathing the spores unprotected?", tag: `Medicine ${sk.medicine}` })
  } else if (t.includes('phone') || t.includes('call') || t.includes('ring')) {
    out.push({ text: "Has anyone ever heard a human voice on those desk phones?", tag: "Lore" })
  }

  // High Speech skill check choice
  if (sk.speech >= 25 && out.length < 3) {
    out.push({
      text: "You can count on me out here. Let's look out for each other.",
      tag: `Speech ${Math.max(30, Math.min(80, sk.speech + 5))}`,
      check: { skill: 'speech', difficulty: Math.max(30, Math.min(80, sk.speech + 5)) },
    })
  }

  // Trader/Barter choice
  if (isTrader(it) && out.length < 3) {
    out.push({
      text: "Cut me a small discount and I'll make sure to bring you salvage.",
      tag: `Barter ${Math.max(30, Math.min(80, sk.barter + 5))}`,
      check: { skill: 'barter', difficulty: Math.max(30, Math.min(80, sk.barter + 5)) },
    })
  }

  // Lore / persona inquiry from the entry table if not yet added
  if (entry?.choices) {
    for (const ec of entry.choices) {
      if (out.length >= 3) break
      if (!out.some((o) => o.text === ec.text)) {
        out.push(ec)
      }
    }
  }

  // a reaction to what they just said, then a closer, each drawn for this npc and this turn
  const seed = seedOf(it, s, line.length)
  if (out.length < 3) out.unshift(draw(ASKS.followups, seed, 1, asked(it, s))[0])
  if (out.length < 4) out.push(draw(ASKS.closers, seed + 7, 1, asked(it, s))[0])
  return out.filter(Boolean).slice(0, 4)
}

// a seeded pick: the same npc on the same visit offers the same lines; another npc, another visit, other lines
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function seedOf(it, s, extra = 0) { const id = short(it); return hash(id) + (s?.talks?.[id]?.length ?? 0) * 7919 + extra }
function asked(it, s) { return new Set((s?.talks?.[short(it)] ?? []).filter((r) => r[0] === 'p').map((r) => r[1])) }
function draw(pool, seed, n, skip) {
  const list = (pool ?? []).filter((c) => !skip?.has(c.text)), out = [], src = list.length ? list : (pool ?? [])
  let k = seed
  while (out.length < n && out.length < src.length) { k = (Math.imul(k, 1103515245) + 12345) >>> 0; const c = src[k % src.length]; if (!out.includes(c)) out.push(c) }
  return out
}
function generateGenericChoices(it, s, sk) {
  const role = String(it.state?.role ?? 'survivor').toLowerCase(), place = String(it.place ?? 'main')
  const seed = seedOf(it, s), skip = asked(it, s)
  const roleKey = isTrader(it) ? 'trader' : role
  const picks = [
    ...draw(ASKS.role?.[roleKey] ?? ASKS.role.survivor, seed, 1, skip),
    ...draw(ASKS.place?.[place] ?? [], seed + 3, 1, skip),
    ...draw([...ASKS.personal, ...ASKS.mood], seed + 5, 1, skip),
  ]
  if (sk.speech >= 30 || hash(short(it)) % 3 === 0) picks.push({ text: draw([{ text: "You look like someone who knows their way around. Let's cooperate." }, { text: "We should watch each other's backs." }, { text: "I could use a friend down here." }], seed + 9, 1)[0].text, tag: `Speech ${sk.speech}`, check: { skill: 'speech', difficulty: 40 } })
  else picks.push(draw(ASKS.closers, seed + 11, 1, skip)[0])
  if (isTrader(it) && !picks.some((p) => /trade|sell/i.test(p.text))) picks[0] = { text: "What have you got for trade?", tag: "Help" }
  return picks.filter(Boolean).slice(0, 4)
}
function generateGenericChoicesOld(it, s, sk) {
  const role = it.state?.role
  const out = []

  if (isTrader(it)) {
    out.push({ text: "What supplies do you have available for trade?", tag: "Help" })
    out.push({ text: "I have salvage and parts. Let's negotiate prices.", tag: `Barter ${sk.barter}`, check: { skill: 'barter', difficulty: 35 } })
  } else if (role === 'medic') {
    out.push({ text: "Can you tend to my wounds and patch me up?", tag: "Help" })
    out.push({ text: "What's the best way to keep infection and sanity loss away?", tag: `Medicine ${sk.medicine}` })
  } else if (role === 'scout') {
    out.push({ text: "What entities have been active in this area lately?", tag: `Survival ${sk.survival}` })
    out.push({ text: "Which direction leads forward to the next sector?", tag: "Help" })
  } else {
    out.push({ text: "How long have you survived in this level?", tag: "Lore" })
    out.push({ text: "What's the most important rule for staying alive here?", tag: `Survival ${sk.survival}` })
  }

  out.push({
    text: "You look like someone who knows their way around. Let's cooperate.",
    tag: `Speech ${sk.speech}`,
    check: { skill: 'speech', difficulty: 40 },
  })

  out.push({ text: "Stay safe out there in the corridors.", tag: "Farewell" })

  return out.slice(0, 4)
}

// ---- what fits the level: a safe level (Snackrooms, Refrigerator Paradise) asks no danger questions; the hotel's rooms are asked about in the hotel
// Survival difficulty by place (the wiki's SD class, Savi's reading); 1 = safe: no "what should I avoid", no "best weapon against them"
const SD = { level61: 1, level11: 1, level10: 1, main: 1, level1: 1, level4: 1, level2: 2, level21: 3, level3: 4, gamma: 2, level5: 3, level6: 4, level7: 4, level8: 4, debug: 1 }
const DANGER = /avoid|danger|deadly|entit|hound|smiler|weapon|tactic|stay alive|staying alive|survive|survived|kill|threat|hunt|flicker|dark alone|face the dark|watch out/i
const HOTEL = /\brooms?\b.*avoid|suite|hotel|ballroom/i
const SAFE_ASK = {
  level11: [
    { text: "Where can I find Al's pretzel cart and fresh almond water?", tag: "Help" },
    { text: "How do I take the glass elevator to the rooftop skydeck?", tag: "Help" },
    { text: "Why do the hounds and facelings behave so peacefully here?", tag: "Lore" },
    { text: "Can you tell me about M.E.G. Base Beta and the city layout?", tag: "Lore" },
  ],
  level10: [
    { text: "How does M.E.G. Outpost Bountiful harvest all this wheat?", tag: "Lore" },
    { text: "Where can I draw pure Almond Water from the aquifer?", tag: "Help" },
    { text: "Have you noticed the scarecrows turning in the barley fields?", tag: "Survival 25", check: { skill: 'survival', difficulty: 25 } },
    { text: "Can you teach me how to mill flour and bake bread at the hearth?", tag: "Help" },
  ],
  level61: [
    { text: "What's actually good to eat around here?", tag: "Help" },
    { text: "Who runs all these places? Do the facelings ever talk?", tag: "Lore" },
    { text: "Is the food really free? What's the catch?", tag: "Lore" },
    { text: "What's playing on the speakers? I swear I know this song.", tag: "Chat" },
    { text: "Where are the restrooms, and the way back out?", tag: "Help" },
    { text: "How did you end up in the Snackrooms?", tag: "Lore" },
  ],
  default: [
    { text: "How long have you been here?", tag: "Lore" },
    { text: "What do people do for fun around here?", tag: "Chat" },
    { text: "Anywhere good to rest nearby?", tag: "Help" },
  ],
}
function fitPlace(ctx, it, list) {
  const place = String(it?.place ?? ctx.self?.place ?? 'main')
  const sd = SD[place] ?? 3
  let out = (list ?? []).filter((c) => {
    if (HOTEL.test(c.text) && place !== 'level5') return false
    if (sd <= 1 && DANGER.test(c.text)) return false
    return true
  })
  const pool = ASKS.place?.[place] ?? SAFE_ASK[place] ?? (sd <= 1 ? SAFE_ASK.default : [])
  let k = hash(short(it)) % Math.max(1, pool.length)
  while (out.length < 4 && pool.length) {
    const c = pool[k++ % pool.length]
    if (out.some((o) => o.text === c.text)) { if (out.length + 1 > pool.length) break; if (k > pool.length * 2) break; continue }
    out.splice(Math.max(0, out.length - 1), 0, c)
  }
  return out.slice(0, 4)
}
