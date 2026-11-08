// Conversation starters and dynamic choice generation for all NPCs.
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
      { text: "What's the safest way to navigate Level 1?", tag: "Survival 25", check: { skill: 'survival', difficulty: 25 } },
      { text: "What are those lone voices calling hello in the halls?", tag: "Lore" },
      { text: "You know these corridors better than anyone. Mind if I tag along?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "Where can I find almond water and supplies nearby?", tag: "Help" },
    ],
  },
  'meg-ortiz': {
    greeting: "Sit down before you fall down. Let me see where it hurts, and don't tell me you're fine.",
    mood: 'calm',
    returning: "Still walking? Let me know the moment you feel a fever or see shadows twitching.",
    friendly: "Ah, good to see you, wanderer. Take a breath. How is your condition holding up?",
    cold: "I treat injuries, not bad attitudes. What hurts?",
    choices: [
      { text: "Can you patch up my injuries and check my sanity?", tag: "Help" },
      { text: "What causes people to turn into Wretches down here?", tag: "Medicine 30", check: { skill: 'medicine', difficulty: 30 } },
      { text: "How do you stay calm surrounded by concrete and screaming pipes?", tag: "Lore" },
      { text: "You've saved a lot of people here, Dr. Ortiz. Thank you.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
    ],
  },
  'meg-callum': {
    greeting: "Keep your hands where I can see them. We count every can twice here. You looking for supplies or just staring?",
    mood: 'calm',
    returning: "Back at the supply counter? Make it quick, I've got three inventories to tally.",
    friendly: "Well look who's back. Need another ration pack, or did you find something to trade?",
    cold: "Don't touch the crates. State your business or move along.",
    choices: [
      { text: "What provisions and rations can you spare for a runner?", tag: "Help" },
      { text: "Let's talk trade. I've got scrap and items to barter.", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
      { text: "How does M.E.G. keep Base Alpha supplied in Level 1?", tag: "Lore" },
      { text: "I'm heading deeper into the levels. Any gear recommendations?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
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
      { text: "What makes Level 2 so much more dangerous than Level 1?", tag: "Lore" },
      { text: "How do you avoid Hounds when the lights flicker out?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "You don't have to face the dark alone. Let's stick together.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "Which way leads to the next level down?", tag: "Help" },
    ],
  },
  'surv-hollis': {
    greeting: "Static again... Hey, wanderer. You look rough around the edges. Rest by the stove a minute.",
    mood: 'calm',
    returning: "Still with us? Good. Grab some warm water, the pipes are running hot.",
    friendly: "Come on in, friend. The radio's quiet, but you're always welcome at our fire.",
    cold: "Keep your distance from the radio equipment.",
    choices: [
      { text: "Can you treat my burns and injuries?", tag: "Help" },
      { text: "Is that radio picking up any signals from other survivor camps?", tag: "Lore" },
      { text: "How do you treat heat exhaustion from these steam pipes?", tag: "Medicine 35", check: { skill: 'medicine', difficulty: 35 } },
      { text: "What kind of entities nest in these maintenance shafts?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
    ],
  },
  'surv-mags': {
    greeting: "Well look what the pipes washed in! Come closer honey, let's see what shine you've got in your pockets.",
    mood: 'happy',
    returning: "Back for more, honey? My shelves don't stay stocked for long, so let's deal.",
    friendly: "There's my favorite wanderer! I've set aside a special deal just for you.",
    cold: "No free handouts here, sweetie. You got almond water or not?",
    choices: [
      { text: "Cut me a fair deal on ammo and almond water.", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "How do survivors get by down here without M.E.G. support?", tag: "Lore" },
      { text: "Got any tools or keys to get through the locked doors?", tag: "Help" },
      { text: "You've got a sharp eye for profit, Mags. Business going well?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
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
      { text: "What's the safest route through the electrical corridors?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "How do your patrol squads deal with hound packs in the dark?", tag: "Guns 40", check: { skill: 'guns', difficulty: 40 } },
      { text: "How does Base Gamma survive deep inside Level 3?", tag: "Lore" },
      { text: "I'm ready for duty. What sector needs reconnaissance?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
    ],
  },
  'gamma-pell': {
    greeting: "Wipe your feet. Copper wire, batteries, almond water, everything has an inventory line. What's your business?",
    mood: 'calm',
    returning: "Ledger's open. Got supplies to declare, or just browsing the requisition bins?",
    friendly: "Ah, the reliable wanderer. Your credit is good with Base Gamma. Let's talk supplies.",
    cold: "Step away from the ledger. State your requisition.",
    choices: [
      { text: "Show me what supplies and munitions you have in stock.", tag: "Help" },
      { text: "I have salvaged parts and scrap. Let's arrange a trade.", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "How do you keep this fortress powered in the Electrical Station?", tag: "Lore" },
      { text: "I hear there's a brass elevator leading deeper from here.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'gamma-ito': {
    greeting: "Drink some tea. The constant electrical hum does terrible things to your nerves if you don't ground yourself.",
    mood: 'calm',
    returning: "Welcome back. Still feeling the vibrations in your teeth? Sit by the kettle.",
    friendly: "It's so good to see you uninjured. Please, rest as long as you need.",
    cold: "Quiet down, please. There are patients trying to rest.",
    choices: [
      { text: "Can you tend to my wounds and help restore my sanity?", tag: "Help" },
      { text: "How do you treat the psychological strain of the generator hum?", tag: "Medicine 40", check: { skill: 'medicine', difficulty: 40 } },
      { text: "Have you treated survivors coming back from Level 4 or Level 5?", tag: "Lore" },
      { text: "Your calm presence makes this place feel almost human.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
    ],
  },
  'gamma-hask': {
    greeting: "Cpl. Hask here. Watch your step by the perimeter, the liquid pain hoses are pressurized.",
    mood: 'calm',
    returning: "Back through the gates. Keep moving toward the public sector.",
    choices: [
      { text: "What's the protocol for entering Base Gamma?", tag: "Lore" },
      { text: "How effective is the liquid pain defense against entities?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "Seen any hostiles probing the gate recently?", tag: "Guns 35", check: { skill: 'guns', difficulty: 35 } },
    ],
  },
  'gamma-marlo': {
    greeting: "Looking for firepower? Marlo's the name. Shotguns, pistols, modifications, almond water talks.",
    mood: 'happy',
    choices: [
      { text: "Show me what weapons and ammo you've got.", tag: "Help" },
      { text: "Cut me a discount on firearm repairs and shells.", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "What modifications work best against Hounds?", tag: "Guns 40", check: { skill: 'guns', difficulty: 40 } },
    ],
  },
  'gamma-june': {
    greeting: "Pull up a stool! Fresh almond water, warm fruit stew, and zero generator shocks. What'll it be?",
    mood: 'happy',
    choices: [
      { text: "Pour me a cup of almond water and a warm ration.", tag: "Help" },
      { text: "Heard any interesting tales from the runners arriving from Level 2?", tag: "Lore" },
      { text: "You run a lively counter in the middle of a warzone.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
    ],
  },
  'gamma-moss': {
    greeting: "Welcome to Base Gamma. I am Commander Moss. As long as you respect our laws, you have safe harbor here.",
    mood: 'calm',
    choices: [
      { text: "What is Base Gamma's objective in Level 3?", tag: "Lore" },
      { text: "I have skills that could benefit your garrison.", tag: "Speech 50", check: { skill: 'speech', difficulty: 50 } },
      { text: "How do you coordinate with Base Omega on Level 4?", tag: "Help" },
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
      { text: "What supplies does Base Omega carry for wanderers?", tag: "Help" },
      { text: "Who was the last squad sent down toward Level 5?", tag: "Lore" },
      { text: "I need ammunition and almond water for the next run.", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "How does Base Omega maintain order on this floor?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'omega-lin': {
    greeting: "Floor check in progress. Fountains are running, windows are taped. Keep moving and stay out of empty cubicles.",
    mood: 'calm',
    returning: "Still circling? Stick to the main corridors, the side offices are easy to get turned around in.",
    friendly: "Hey. Glad to see you're not seeing things yet. Want a patrol tip?",
    choices: [
      { text: "Why are all the office windows taped over?", tag: "Lore" },
      { text: "Have you heard anything moving behind the locked office doors?", tag: "Survival 40", check: { skill: 'survival', difficulty: 40 } },
      { text: "You walk this floor every day. Seen any strange entities lately?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
      { text: "Where are the emergency stairwells and elevators located?", tag: "Help" },
    ],
  },
  'omega-okafor': {
    greeting: "Sgt. Okafor. State your business on Level 4. Base Omega maintains order here, no looting claimed offices.",
    mood: 'calm',
    choices: [
      { text: "What are the rules regarding office claims?", tag: "Lore" },
      { text: "I'm looking for the stairs to Level 5.", tag: "Help" },
      { text: "I can assist with perimeter security.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'omega-rhea': {
    greeting: "Need your vitals checked? Take a seat. And please don't drink from the fountains without filtering.",
    mood: 'calm',
    choices: [
      { text: "Can you treat my injuries and check my sanity?", tag: "Help" },
      { text: "Is the water in the office coolers actually safe?", tag: "Medicine 35", check: { skill: 'medicine', difficulty: 35 } },
      { text: "What happens to people who stare out the untaped windows?", tag: "Lore" },
    ],
  },
  'l4-moss': {
    greeting: "Oh! Hello there. Did you hear that desk phone ringing a minute ago? Nobody ever answers on the other end...",
    mood: 'calm',
    returning: "You're back! The phones have been ringing on and off all morning.",
    friendly: "It's so wonderful having someone to talk to! Come in, take a seat on the cot.",
    choices: [
      { text: "What happens if someone answers the ringing office phones?", tag: "Lore" },
      { text: "How long have you been living in this office suite?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "How do you survive here without joining M.E.G.?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "Have you collected any stories about the deeper levels?", tag: "Help" },
    ],
  },
  'l4-gus': {
    greeting: "Hey pal! You made it! Want to hear which vending machine on the north corridor gives double chocolate bars?",
    mood: 'happy',
    returning: "Hey buddy! Did you try that vending machine yet? Two bars for the price of one!",
    choices: [
      { text: "Are the vending machines on Level 4 safe to eat from?", tag: "Lore" },
      { text: "You seem in surprisingly high spirits for being trapped here.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "Are the window rooms really that dangerous?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
      { text: "Want to travel together for a while, Gus?", tag: "Help" },
    ],
  },
  'l4-penny': {
    greeting: "Oh... hi. I was just about to take another nap. Did you find where the morning comes from?",
    mood: 'calm',
    returning: "Hi again... I was having the sweetest dream about real sunshine.",
    choices: [
      { text: "How long have you been wearing those pajamas, Penny?", tag: "Speech 30", check: { skill: 'speech', difficulty: 30 } },
      { text: "Do you need any almond water or food rations?", tag: "Help" },
      { text: "Do you remember the world before you fell into the Backrooms?", tag: "Lore" },
      { text: "Make sure you stay close to the safe offices when lights go out.", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
    ],
  },
  'l4-bram': {
    greeting: "Keep your voice down. The acoustics in these drop ceilings carry every whisper. You got almond water on you?",
    mood: 'calm',
    returning: "Back again. Check your seals. Level 5 is no joke, wanderer.",
    choices: [
      { text: "You're planning an expedition to Level 5? How dangerous is it?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
      { text: "What makes the hotel on Level 5 so feared?", tag: "Lore" },
      { text: "I'll trade supplies for your trail knowledge and maps.", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "Two experienced runners have better odds. Let's team up.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'tbd-quill': {
    greeting: "Show me oddities. Strange coins, keys to nowhere, broken dials... Ordinary junk bores me. What've you got?",
    mood: 'happy',
    returning: "Found anything strange yet? Don't waste my time with ordinary scrap.",
    choices: [
      { text: "I have some peculiar trinkets. What will you offer for them?", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "What does T.B.D. do with all these useless, bizarre objects?", tag: "Lore" },
      { text: "Where did you find the strangest item in your collection?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
      { text: "Can you point me toward any unsearched office wings?", tag: "Help" },
    ],
  },
  'tbd-nib': {
    greeting: "Shiny! Everything shines if you turn the desk lamp right! Don't touch my shiny piles!",
    mood: 'happy',
    choices: [
      { text: "How do you slip past the M.E.G. patrols to scavenge shiny things?", tag: "Sneak 35", check: { skill: 'sneak', difficulty: 35 } },
      { text: "Why is your faction called T.B.D.?", tag: "Lore" },
      { text: "Did you find any spare ammo or tools in the executive suites?", tag: "Help" },
      { text: "That's quite a sparkling collection you've gathered, Nib.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
    ],
  },
  'amor-vell': {
    greeting: "Breathe gently. The velvet bloom of the mold purifies the poisoned air of this endless tomb. Are you reverent?",
    mood: 'calm',
    cold: "Trample one spore and the growth will feast on your bones.",
    choices: [
      { text: "What is the holy purpose of this mold garden?", tag: "Lore" },
      { text: "Isn't breathing these spores hazardous to human lungs?", tag: "Medicine 45", check: { skill: 'medicine', difficulty: 45 } },
      { text: "I come in peace and respect for your sanctuary.", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "Does Amor Incrementum trade remedies with outsiders?", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
    ],
  },
  'amor-hask': {
    greeting: "Wanderer! Listen to the spores! The concrete was man's mistake, but the growth will reclaim it all! Join our flock!",
    mood: 'happy',
    choices: [
      { text: "That's a dramatic sermon. How many converts have you gathered?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
      { text: "Why do you believe the mold is the salvation of the Backrooms?", tag: "Lore" },
      { text: "How do your people defend against entity attacks?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "I'll pass on the mold gospel, but stay safe out here.", tag: "Help" },
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
      { text: "Can you tell me about the history of the Homely Hotel?", tag: "Lore" },
      { text: "I would like to inquire about booking a room or suite.", tag: "Help" },
      { text: "Why do the staff in the hallways freeze when watched?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "What happens if someone enters the Beverly Room during the ball?", tag: "Survival 50", check: { skill: 'survival', difficulty: 50 } },
    ],
  },
  'l5-dolores': {
    greeting: "Wipe your hooves at the door! The kitchen is running hot and the salon snobs already sent two roasts back. Hungry or complaining?",
    mood: 'annoyed',
    returning: "Back in my kitchen? The steaks are sizzling. You eating or wasting my time?",
    friendly: "Ah, someone who actually appreciates real cooking! Sit down, honey, I've got fresh stew for you.",
    choices: [
      { text: "What fresh dishes or cuts of meat do you have on the menu?", tag: "Help" },
      { text: "I have almond water. Can I buy some steak or stew?", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "What do the Originals in the salon have against your cooking?", tag: "Lore" },
      { text: "How do you source and preserve fresh food in this hotel?", tag: "Medicine 35", check: { skill: 'medicine', difficulty: 35 } },
    ],
  },
  'l5-pip': {
    greeting: "Eep! O-oh, a guest! Can I carry your luggage, sir or madam? Just... please don't make me take the service elevator...",
    mood: 'scared',
    returning: "Oh! Hello again, guest! Any bags? Any messages to deliver?",
    choices: [
      { text: "What's wrong with the service elevator, Pip?", tag: "Lore" },
      { text: "Have you noticed any room numbers that shouldn't exist?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "What is Mr. Ambrose really like to work for?", tag: "Help" },
      { text: "Relax, Pip. You're doing a fine job.", tag: "Speech 30", check: { skill: 'speech', difficulty: 30 } },
    ],
  },
  'l5-odette': {
    greeting: "If one more guest leaves ash on the Persian rug, I'm locking the broom closet. What do you want?",
    mood: 'annoyed',
    returning: "Still here? Don't make a mess in the halls. It takes hours to get blood out of damask.",
    choices: [
      { text: "Heard any juicy rumors around the hotel wings?", tag: "Lore" },
      { text: "Why do you refuse to clean the ballroom?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
      { text: "Have you found anything interesting in the locked suites?", tag: "Sneak 40", check: { skill: 'sneak', difficulty: 40 } },
      { text: "It must be thankless work cleaning an infinite hotel.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'l5-harlan': {
    greeting: "Step into the post. Keep your weapon holstered unless you're shooting rats. M.E.G. Housekeeping keeps this hotel somewhat civilized.",
    mood: 'calm',
    returning: "Back at Housekeeping. Count your rounds. What do you need?",
    friendly: "Good to see you, soldier. You've earned your keep around here. Let's talk armory.",
    choices: [
      { text: "What munitions and survival supplies does Housekeeping trade?", tag: "Help" },
      { text: "How bad is the Beast prowling the Boiler Room?", tag: "Guns 45", check: { skill: 'guns', difficulty: 45 } },
      { text: "What's your going rate for submachine gun ammo?", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "How does Housekeeping maintain relations with the hotel staff?", tag: "Lore" },
    ],
  },
  'l5-vesna': {
    greeting: "I escort to the Boiler Room threshold and not one step beyond. The heat melts your boots and the sounds will test your nerve.",
    mood: 'calm',
    returning: "Ready for another run to the threshold? Mind your canteen.",
    choices: [
      { text: "Can you escort me safely to the Boiler Room door?", tag: "Help" },
      { text: "What precautions should I take against the boiler heat?", tag: "Survival 50", check: { skill: 'survival', difficulty: 50 } },
      { text: "Have you ever caught a glimpse of the Boiler Room Beast?", tag: "Lore" },
      { text: "You have a dangerous post, Vesna. What keeps you doing it?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
    ],
  },
  'l5-tobias': {
    greeting: "Ah, another exterminator? The Death Rats are breeding behind the hot pipes again. Ten almond water per pelt, interested?",
    mood: 'calm',
    returning: "Got any rat pelts for the bounty board? The boiler crew is begging for relief.",
    choices: [
      { text: "Tell me about the rat bounty contract.", tag: "Help" },
      { text: "What's the best tactic when a swarm of Death Rats attacks?", tag: "Melee 40", check: { skill: 'melee', difficulty: 40 } },
      { text: "Do you believe the rumors that the hotel itself is alive?", tag: "Lore" },
      { text: "Are there any bounties available besides the rats?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'l5-imani': {
    greeting: "Stay alert. The faceless staff are harmless until provoked, but shadows in the east wing have been shifting against the light.",
    mood: 'calm',
    choices: [
      { text: "What should wanderers know about the Facelings here?", tag: "Lore" },
      { text: "Have you spotted anything hostile stalking the guest wings?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
      { text: "How do you tolerate the snooty Originals in the card salon?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "Any advice for someone navigating Level 5 for the first time?", tag: "Help" },
    ],
  },
  'l5-millie': {
    greeting: "Check your compass, flyboy. Lost my Lockheed Electra over the Pacific and ended up in this gilded birdcage. Got anything worth betting?",
    mood: 'happy',
    choices: [
      { text: "How did an airplane from 1937 end up in Level 5?", tag: "Lore" },
      { text: "Those aviator goggles around your neck... do they work in anomalous darkness?", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "Care to trade vintage heirlooms for fresh supplies?", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "What does it take to get invited into the Originals' card salon?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "Have you fed Samantha the cat her meat today?", tag: "Help" },
    ],
  },
  'l5-whitlock': {
    greeting: "Stand straight, traveller. RMS Oceanic went down beneath the grey waves, but etiquette endures even in this bizarre hotel. State your purpose.",
    mood: 'calm',
    choices: [
      { text: "Captain, what happened to your ship in 1912?", tag: "Lore" },
      { text: "A man of your dignity commands respect, Captain.", tag: "Speech 50", check: { skill: 'speech', difficulty: 50 } },
      { text: "What can you tell me about the ballroom across the hall?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
      { text: "Have you ever attempted to find a way back home?", tag: "Help" },
    ],
  },
  'l5-vanderholt': {
    greeting: "Hm? A newcomer in modern rags. If you've come begging for a railway loan, my terms are twenty percent compound interest.",
    mood: 'annoyed',
    choices: [
      { text: "What was your railway empire like before you no-clipped?", tag: "Lore" },
      { text: "Even gilded-age barons need almond water in the Backrooms.", tag: "Barter 55", check: { skill: 'barter', difficulty: 55 } },
      { text: "What do the Originals do all day besides play cards?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "Have you ever attempted checking out of the hotel?", tag: "Help" },
    ],
  },
  'l5-zelda': {
    greeting: "Well don't just stand there like a flat tire, darling! Isn't this hotel simply the bee's knees? Pour some gin and tell me the gossip!",
    mood: 'happy',
    choices: [
      { text: "What year do you think it is in the real world, Zelda?", tag: "Lore" },
      { text: "Heard any juicy secrets about what's behind Room 13?", tag: "Speech 45", check: { skill: 'speech', difficulty: 45 } },
      { text: "Why do the Originals refuse to let new people join?", tag: "Help" },
      { text: "How do you spend your evenings when the music starts playing?", tag: "Survival 40", check: { skill: 'survival', difficulty: 40 } },
    ],
  },
  'l5-wat': {
    greeting: "Sancta Maria... Traveler, pray tell me: is this the purgatory of souls, or have the Black Death fevers finally taken my mind?",
    mood: 'scared',
    choices: [
      { text: "This isn't purgatory, Brother Wat. You've fallen into the Backrooms.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
      { text: "You're safe from the plague here. Breathe easy, brother.", tag: "Medicine 40", check: { skill: 'medicine', difficulty: 40 } },
      { text: "Who was the Abbot you keep searching for?", tag: "Lore" },
      { text: "Are the other salon guests treating you well?", tag: "Help" },
    ],
  },
  'l5-samantha': {
    greeting: "Welcome to my parlor, wanderer. The threads of your past and future hum like plucked harp strings. Do you bring tribute, or just idle words?",
    mood: 'calm',
    returning: "You return to Samantha's presence. Do your hands bear savory meat, or only empty promises?",
    friendly: "Ah, mon cher! The stars sing around you. Have you brought another feast for my reading?",
    cold: "Idle chatter bores me, wanderer. Meat first, or face my claws.",
    choices: [
      { text: "I'd like to offer you meat in exchange for a psychic reading.", tag: "Help" },
      { text: "What do the spirits in the hotel walls whisper to you?", tag: "Lore" },
      { text: "Are those serrated teeth natural for a feline entity?", tag: "Medicine 45", check: { skill: 'medicine', difficulty: 45 } },
      { text: "What is truly lurking in the dark of the Boiler Room?", tag: "Survival 50", check: { skill: 'survival', difficulty: 50 } },
    ],
  },
  'hk-constance': {
    greeting: "Bonsoir. Keep your boots on the runner rug. Housekeeping trades clean linen and field rations. What does your pack lack?",
    mood: 'calm',
    choices: [
      { text: "Show me what supplies Outpost Housekeeping has for trade.", tag: "Help" },
      { text: "Let's negotiate prices on survival gear and rations.", tag: "Barter 45", check: { skill: 'barter', difficulty: 45 } },
      { text: "Why does the orchestral music from the ballroom never stop?", tag: "Lore" },
      { text: "What's your advice for surviving the Boiler Room heat?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
    ],
  },
  'hk-vance': {
    greeting: "Boiler pressure is running red hot today. Keep your distance from the steam vents unless you want your fur scorched.",
    mood: 'calm',
    choices: [
      { text: "What's the safest route through the Boiler Room?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
      { text: "What kind of scrap weapon works best against Death Rats?", tag: "Melee 40", check: { skill: 'melee', difficulty: 40 } },
      { text: "Have you ever caught a glimpse of the Boiler Room Beast?", tag: "Lore" },
      { text: "Need any assistance with maintenance down there?", tag: "Help" },
    ],
  },
  'homely-barnaby': {
    greeting: "A very cordial welcome to the Homely Hotel, honored guest. May I assist you with reservations or suite accommodations today?",
    mood: 'happy',
    choices: [
      { text: "I'd like to inquire about booking a room.", tag: "Help" },
      { text: "What amenities does the hotel provide for wanderers?", tag: "Lore" },
      { text: "It must take extraordinary dedication to keep this place running.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
      { text: "Have you ever seen the manager of this establishment?", tag: "Survival 45", check: { skill: 'survival', difficulty: 45 } },
    ],
  },
  'homely-auguste': {
    greeting: "Ah, bon appétit! Enter the dining room! A wanderer cannot face the boiler halls on an empty stomach! What can I cook for you?",
    mood: 'happy',
    choices: [
      { text: "What fresh dishes or cuts of meat do you have available?", tag: "Help" },
      { text: "I have almond water. Let's trade for some warm rations.", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "Where does the hotel kitchen source its supplies?", tag: "Lore" },
      { text: "Any recommendations for treating Samantha the cat?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
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
      { text: "What are the ocean depth zones and what's lurking down there?", tag: "Lore" },
      { text: "How do I read the sonar pings for Entity 20 and 'Tiny'?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "Let's trade salvage and ammo. I need marine supplies.", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
      { text: "Who are the people living out on the far island at Fort Surrender?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
    ],
  },
  'l7-jude': {
    greeting: "Cease your rowing, wanderer. Listen to the slow breath beneath the waves. You have reached Fort Surrender, where the fear of the deep becomes our sanctuary.",
    mood: 'calm',
    returning: "You return to the rock. Have you heard the Leviathan's song beneath the tar?",
    friendly: "Peace of the Abyss upon you, sibling. Sit by the Leviathan ribs and let the tide quiet your mind.",
    cold: "Do not mock the Thing Below while you stand upon a pebble in Its ocean.",
    choices: [
      { text: "Why does the Society of the Pushing worship the Thing on Level 7?", tag: "Lore" },
      { text: "What lies below the Midnight Zone in the underwater tar caves?", tag: "Survival 40", check: { skill: 'survival', difficulty: 40 } },
      { text: "There's a second gargantuan creature out there, what is 'Tiny'?", tag: "Lore" },
      { text: "Your people built a fortress out of drifting furniture. Share your wisdom with me.", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
    ],
  },
  'l7-mara': {
    greeting: "Brother Jude feeds the soul, I keep the walls lashed and the condenser boiling. You want fresh almond water or deep-sea salvage, let's see what you brought.",
    mood: 'calm',
    returning: "Back from the swells? The tide washed in more furniture and crates if you've got the arm to smash them.",
    friendly: "Hey there, dry-lander! Saved some smoked fish and clean bandages from the last haul for you.",
    cold: "Everything on this rock was hauled out of freezing water. Pay fair or start swimming.",
    choices: [
      { text: "Show me your stock. I've got almond water to trade.", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
      { text: "How does your copper still turn Level 7 seawater into Almond Water?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "What's down inside that rusted Diving Bell on the north cliff?", tag: "Lore" },
      { text: "It takes grit to hold this island together. Cut me a friendly deal?", tag: "Speech 40", check: { skill: 'speech', difficulty: 40 } },
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
      { text: "What is this city, and why do the entities act peaceful here?", tag: "Lore" },
      { text: "How does M.E.G. operate Base Beta across such a massive urban sprawl?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "The terminal mentioned the 'Level 11 Effect' and security sector logs. Can you brief me?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Any tips for navigating the road network and canal safely?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
      { text: "Can you spare some extra ammunition and medical supplies from Base Beta's cache?", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
    ],
  },
  'l11-trader-kael': {
    greeting: "Greetings, citizen! Fresh bread and apples just noclipped into our crates this morning. The Capital always keeps its people fed.",
    mood: 'calm',
    returning: "Back to the market? We just unpacked a fresh crate of Level 6.1 roasted coffee and bottled sodas.",
    friendly: "Always good to see a loyal customer! Tell you what, I'll knock a few Backdollars off your bulk order today.",
    cold: "Take your free ration and keep moving. The Guild's got a schedule to keep.",
    choices: [
      { text: "Show me your wares. What has the Traders Guild brought to the Capital?", tag: "Barter 30", check: { skill: 'barter', difficulty: 30 } },
      { text: "How does the food supply work? Does food really noclip into crates out of thin air?", tag: "Lore" },
      { text: "How does the B.N.T.G. navigate trade caravans through the canal locks to other levels?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "I've brought valuable salvage from the utility tunnels. Let's make a mutually profitable deal.", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "What's in that pamphlet, 'A Different Kind of Urban'?", tag: "Lore" },
    ],
  },
  'l11-commuter-faceling': {
    greeting: "Good afternoon. Quite pleasant weather for a stroll along the canal promenade, wouldn't you say?",
    mood: 'calm',
    returning: "Ah, hello again. Just taking care of my daily rounds before evening settles in.",
    friendly: "Always a pleasure to see courteous passersby on the boulevard. The city feels much brighter with friendly company.",
    cold: "Pardon me, I have urgent appointments to keep at the commercial plaza.",
    choices: [
      { text: "You seem completely at ease. Don't you know we're in the Backrooms?", tag: "Speech 25", check: { skill: 'speech', difficulty: 25 } },
      { text: "Where does this endless avenue lead, and what is the Capital district?", tag: "Lore" },
      { text: "How do the day-night cycle, traffic lights, and crosswalk chimes work here?", tag: "Science 30", check: { skill: 'science', difficulty: 30 } },
      { text: "Have you seen any unmapped road barricades or anomalous rifts nearby?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
    ],
  },
  'l11-walker-1': {
    greeting: "Can't stop, kid! Dispatch manifest for Sedco Tower and the commercial elevator's being moody again.",
    mood: 'calm',
    returning: "Hey, runner! Still alive on the avenue? Watch out for the delivery skiff down by the locks, wake was choppy earlier.",
    friendly: "Yo! Good to run into you. If you ever need to know which alleys are dead ends and which ones lead to Level 6.1, just ask.",
    cold: "Out of the way! If this cargo is two minutes late, dispatch docks my pay.",
    choices: [
      { text: "Slow down for a second. What are you delivering across the city?", tag: "Speech 30", check: { skill: 'speech', difficulty: 30 } },
      { text: "What's the best shortcut between M.E.G. Base Beta and the market?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
      { text: "What's the deal with the parked cars along the curbs? Do they actually drive?", tag: "Science 25", check: { skill: 'science', difficulty: 25 } },
      { text: "Have you noticed any strange rifts or spontaneous roadworks on your route?", tag: "Lore" },
    ],
  },
  'l11-walker-2': {
    greeting: "Third week in the city! The coffee cart guy on 11th already knows my order. Is it weird that this feels normal?",
    mood: 'calm',
    returning: "Oh, hi! Taking another break from the filing department. The breeze coming off the canal is lovely today.",
    friendly: "Hey there! It's so nice having someone normal to talk to. All the senior accountants do is talk about building maintenance.",
    cold: "I really need to get back to the office. Supervisor was already tapping her watch.",
    choices: [
      { text: "How did you end up working in an office inside the Backrooms?", tag: "Lore" },
      { text: "You seem stressed. Take a breath, you're doing great out here.", tag: "Medicine 25", check: { skill: 'medicine', difficulty: 25 } },
      { text: "What's inside that enterable brick apartment down the block?", tag: "Speech 25", check: { skill: 'speech', difficulty: 25 } },
      { text: "Do the office telephones ever ring? Does anyone ever answer them?", tag: "Lore" },
    ],
  },
  'l11-walker-3': {
    greeting: "Every block looks like the last one if you walk it long enough. Keep your map close and don't trip over the curbs, wanderer.",
    mood: 'calm',
    returning: "Back again? Steam lines on 11th Avenue are hissing steady. Just vented three manholes of Almond Water vapor.",
    friendly: "Good to see someone with good sense. Here, take this spare flashlight battery. A good wanderer never walks into a dark stairwell unprepared.",
    cold: "Step around the wet sealant, kid. Don't make my shift longer than it already is.",
    choices: [
      { text: "What are those steam seeps coming out of the manhole covers?", tag: "Science 30", check: { skill: 'science', difficulty: 30 } },
      { text: "What's the story behind the spontaneous roadworks and scaffolding?", tag: "Lore" },
      { text: "How do the apartment radiators and Almond Water taps keep running without an active power grid?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Got any advice for surviving the streets when darkness falls?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
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
      { text: "Can you teach me how to harvest wheat and bake bread?", tag: "Help" },
      { text: "I'd like to help Outpost Bountiful with the harvest.", tag: "Survival 25", check: { skill: 'survival', difficulty: 25 } },
      { text: "How did M.E.G. establish an agricultural outpost in the Backrooms?", tag: "Lore" },
      { text: "Let's trade for fresh rations and supplies.", tag: "Barter 30", check: { skill: 'barter', difficulty: 30 } },
    ],
  },
  'l10-meg-hale': {
    greeting: "Quartermaster's post. Grain, rations, rope, lamp oil. All of it weighed, all of it logged. What do you need?",
    mood: 'calm',
    returning: "You again. Bring anything worth putting on the scale?",
    friendly: "Good to see a steady customer. I set aside a sack of the good flour for you.",
    cold: "Everything here is counted. Remember that before you reach for anything.",
    choices: [
      { text: "What does the outpost need most right now?", tag: "Help" },
      { text: "Where does all this grain go?", tag: "Lore" },
      { text: "Can you knock a few backbucks off for a regular?", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
      { text: "Someone ate one of the caravan loaves, didn't they?", tag: "Chat" },
    ],
  },
  'l10-meg-wren': {
    greeting: "Oh! Hi. Watch your step, this row's half harvested. You lost or just looking?",
    mood: 'happy',
    returning: "Back again? Grab a sickle, I won't tell Cooper you're not on the roster.",
    friendly: "Hey, you! Saved you a spot by the fire tonight.",
    cold: "Rows are for working. Go stand somewhere else.",
    choices: [
      { text: "What's it like working the fields here?", tag: "Chat" },
      { text: "Have you ever dug deeper than you should have?", tag: "Lore" },
      { text: "Why won't anyone turn the scarecrows back around?", tag: "Survival 25", check: { skill: 'survival', difficulty: 25 } },
      { text: "How'd you end up at Bountiful?", tag: "Lore" },
    ],
  },
  'l10-meg-sully': {
    greeting: "Hold on, hold on... no, that's static. Sorry. Sully, radio. You need a message sent somewhere?",
    mood: 'calm',
    returning: "Nothing back from Alpha yet. You'll be the first to know. Well. Second.",
    friendly: "Pull up a crate. I caught something odd on the band last night, you'll want to hear it.",
    cold: "Don't touch the dials. They took me three weeks to tune.",
    choices: [
      { text: "Who are you trying to reach?", tag: "Lore" },
      { text: "What did you hear on the shortwave last night?", tag: "Lore" },
      { text: "Can you boost the signal toward the city?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Do you ever get an answer?", tag: "Chat" },
    ],
  },
  'l10-meg-maeve': {
    greeting: "Greetings. Mind the specimen jars. I'm cataloging anomalous grain growth and soil composition for M.E.G. Research Wing.",
    mood: 'calm',
    returning: "Back from the plots? Did you notice any spatial distortions near the perimeter fences?",
    friendly: "Good to see you again! Your field observations have been remarkably helpful.",
    cold: "Please avoid touching the microscope slides. State your query.",
    choices: [
      { text: "What can you tell me about the anomalous scarecrows in the fields?", tag: "Lore" },
      { text: "I can investigate the eastern scarecrow for your research.", tag: "Medicine 30", check: { skill: 'medicine', difficulty: 30 } },
      { text: "Is the wheat here safe for human consumption?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Where does the road lead if I follow it to the horizon?", tag: "Help" },
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
      { text: "Tell me about the house. What comes with the deed?", tag: "Lore" },
      { text: "Is the price flexible for an honest explorer?", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "How does property ownership work when levels shift?", tag: "Speech 35", check: { skill: 'speech', difficulty: 35 } },
      { text: "What's the neighborhood like after dark?", tag: "Survival 30", check: { skill: 'survival', difficulty: 30 } },
    ],
  },
  'l11-tm-clerk': {
    greeting: "Welcome to Thrift Mode! Hand-washed garments, fresh threads, odd jackets. We take Backdollars or good trades. Don't touch the mannequin.",
    mood: 'happy',
    returning: "Back to browse the racks? We got a new batch of courier vests and denim in.",
    friendly: "Hey, friend! For you, I'll pull the good jackets from the back rack.",
    cold: "Browse all you want, but shoplifters answer to Base Beta security.",
    choices: [
      { text: "Let me see what clothing and jackets you have in stock.", tag: "Help" },
      { text: "Who trades clothing down here in the city?", tag: "Lore" },
      { text: "Can you cut me a discount on winter coats?", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
      { text: "What's the story with the hoodie with the red smile?", tag: "Lore" },
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
      { text: "What is the 9th Road, and where does it lead?", tag: "Lore" },
      { text: "How do you defend the camp against the giant spiders?", tag: "Guns 35", check: { skill: 'guns', difficulty: 35 } },
      { text: "Who are the Lightless in the side tunnels?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "Can you spare some torches or fuel?", tag: "Barter 30", check: { skill: 'barter', difficulty: 30 } },
    ],
  },
  'l8-wen': {
    greeting: "Watch your step around the crates! Wen's the name, B.N.T.G. trade outpost. Spider silk, cave caps, ironstone. If it's in Level 8, I've got a price on it.",
    mood: 'happy',
    returning: "Back for more trade? I just sorted a fresh bundle of clean spider silk.",
    friendly: "My favorite caver! What oddities did you drag out of the karst today?",
    cold: "I don't do charity. Backbucks or trade goods, let's see them.",
    choices: [
      { text: "What supplies do you have for sale?", tag: "Help" },
      { text: "How did you set up those glowing mushroom light guides?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Let's negotiate a bulk discount on cave supplies.", tag: "Barter 40", check: { skill: 'barter', difficulty: 40 } },
      { text: "What's at the end of Hyperspace Lane?", tag: "Lore" },
    ],
  },
  'l8-ivo': {
    greeting: "Shh. Did you hear that resonance in the stone? Ivo, Harmouth Speleological Society. I'm mapping the karst fissures.",
    mood: 'scared',
    returning: "You made it back! The road past Marker 74 didn't flood, did it?",
    friendly: "It's so reassuring seeing someone who can read a compass. Let me show you what I've surveyed.",
    cold: "Don't smudge my survey charts! These maps cost people their lives.",
    choices: [
      { text: "What happened to the rest of your survey team?", tag: "Lore" },
      { text: "How do I navigate past the flooding cavern safely?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "Where did this old asphalt road come from inside a cave?", tag: "Speech 30", check: { skill: 'speech', difficulty: 30 } },
      { text: "Let me inspect your survey notes. Maybe I can help.", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
    ],
  },
  'l8-marit': {
    greeting: "Sit down by the fire. Let me check your arms for spider bites. Neurotoxin works slow, but it works thorough.",
    mood: 'calm',
    returning: "Still on two feet? Good. Let me know if your joints ache or if your vision blurs.",
    friendly: "Good to see you whole, wanderer. Take a clean bandage, you've earned it.",
    cold: "If you got bitten and hid it, that's on you. What do you need?",
    choices: [
      { text: "Can you treat my venom wounds and fractures?", tag: "Help" },
      { text: "How do you extract antivenom from the spider gland sacs?", tag: "Medicine 35", check: { skill: 'medicine', difficulty: 35 } },
      { text: "You knew Sister Lull before she joined the Lightless?", tag: "Lore" },
      { text: "What keeps you going out here in the dark?", tag: "Chat" },
    ],
  },
  'l8-carla-kid': {
    greeting: "Three Backbucks for soup! Hobb says hot food keeps the chills out of your ribs. It's mushroom and salt.",
    mood: 'happy',
    returning: "More soup? The pot's bubbling. I stirred it fifty times!",
    friendly: "Yay, you're back! You're my best customer. Hobb says I can buy my own boots soon!",
    cold: "No soup without three Backbucks. Hobb's watching.",
    choices: [
      { text: "I'll take a bowl of hot soup. Here are three Backbucks.", tag: "Help" },
      { text: "How did a kid end up living in a cave camp?", tag: "Lore" },
      { text: "Are you scared of the dark outside the torches?", tag: "Speech 25", check: { skill: 'speech', difficulty: 25 } },
      { text: "You're doing a great job tending the fire, Carla.", tag: "Chat" },
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
      { text: "How does the Base Alef lockout work, and who are you?", tag: "Lore" },
      { text: "What errands does the quartermaster board have posted?", tag: "Help" },
      { text: "Can you teach me how to repair cooling systems and wiring?", tag: "Science 35", check: { skill: 'science', difficulty: 35 } },
      { text: "Let's trade for emergency rations and batteries.", tag: "Barter 35", check: { skill: 'barter', difficulty: 35 } },
    ],
  },
  'l21-goknar': {
    greeting: "Keep your voice down. The hum of the fridges covers our noise, but the Smilers in The Edges have sharp ears.",
    mood: 'calm',
    returning: "Back alive from the dark corridors? Good. Keep your flashlight batteries fresh.",
    friendly: "Glad you made it through the numbered doors. It's rare seeing runners with your kind of grit.",
    cold: "Watch where you point that barrel. I've got enough headaches with the perimeter.",
    choices: [
      { text: "How do you fight off Smilers in these tight freezer hallways?", tag: "Guns 40", check: { skill: 'guns', difficulty: 40 } },
      { text: "What's out past the white block rooms in The Edges?", tag: "Survival 35", check: { skill: 'survival', difficulty: 35 } },
      { text: "What happened when John Banks blew the dynamite plunger?", tag: "Lore" },
      { text: "How do I reach the cold karst descent to Level 8?", tag: "Help" },
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
  return realtyChoice(ctx, it, s, list)
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

  // Quest dialogue hooks for Level 11
  const qChoices = []
  if (id === 'l11-walker-1') {
    if (!s?.sedcoQ) {
      qChoices.push({ text: "You look overwhelmed with those parcels. Need a hand with a Sedco manifest?", tag: "Quest Start" })
    } else if (s?.sedcoQ === 5) {
      qChoices.push({ text: "I've retrieved the Sedco Master Security Drive from the vault.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-meg-agent-vance') {
    if (s?.sedcoQ === 5) {
      qChoices.push({ text: "I've recovered the Sedco Master Security Drive from the 14th St vault for M.E.G.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-trader-kael') {
    if (!s?.craneQ) {
      qChoices.push({ text: "Is something wrong with the canal trade route? The docks seem quiet.", tag: "Quest Start" })
    } else if (s?.craneQ === 4) {
      qChoices.push({ text: "I cleared the canal lock spillway and brought pure Almond Water.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l11-walker-3') {
    if (!s?.maintQ) {
      qChoices.push({ text: "How are the maintenance rounds? Need assistance with the infrastructure?", tag: "Quest Start" })
    } else if (s?.maintQ === 4) {
      qChoices.push({ text: "The compressor is bypassed and the apartment 11-B utilities are running smooth.", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-cooper') {
    if (!s?.wheatQ) {
      qChoices.push({ text: "I'd like to help Outpost Bountiful with the harvest. Need another hand?", tag: "Quest Start" })
    } else if (s?.wheatQ === 5 && (s?.bread ?? 0) >= 1) {
      qChoices.push({ text: "I've baked a fresh Homestead Loaf for the caravan at the hearth oven!", tag: "Quest Turn-In" })
    }
  } else if (id === 'l10-meg-maeve') {
    if (!s?.watcherQ) {
      qChoices.push({ text: "I can investigate the strange scarecrows in the eastern barley for your research.", tag: "Quest Start" })
    } else if (s?.watcherQ === 3) {
      qChoices.push({ text: "I found Document 24 in the scarecrow's coat: 'The Watchers of Level 10'.", tag: "Quest Turn-In" })
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
      return { text: c.text, tag, check }
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
