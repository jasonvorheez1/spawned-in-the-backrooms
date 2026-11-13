# Story spine (Shelly, Nov 13 #lock-in). Every line of dialogue is written to this page.

Shelly's words: "I start out and i can just immediately get to SS fun. but i cant ask around 1. where am i, 2. how to get out of the Backrooms (i sohuldnt know what backrooms even is) and 3. Who dina even is. This goes against fallout new vegas story rules because I have to go around searching for clues. this should give levels more of a reason to go to for the main quest including levels like level 5 and level 11." And: "this should give me more quests, more things to do and more errands and tasks to run for npcs who currently may or may not have a purpose."

## What the player knows
The player wakes knowing NOTHING. Not the word "Backrooms", not "levels", not Dina, not any faction, not the way out.
No player choice may use a word the player has not been told. Player lines before a fact is learned are plain:
"Where am I?", "What is this place?", "How do I get out?", "Who is Dina?".
NPCs do not know the player and use their own word for them (existing rule). No NPC knows more than their life explains:
a hotel maid knows room numbers, not exits; a M.E.G. registrar knows names on a list, not where they went.

## The three questions
Anyone who talks can be asked the three questions. Answers differ by who they are, are partial, and sometimes wrong.
1. Where am I?        2. How do I get out?        3. Who is Dina?   (3 appears only after the player has seen her name)

## The clue trail (main quest). Data contract: player.state.trail = { <key>: 1 }, written once when learned.
Order is the intended road; sequence breaking stays allowed (a speech/barter/sneak way past each gate).
| key   | where            | what the player learns                                                              | from |
|-------|------------------|-------------------------------------------------------------------------------------|------|
| name  | Level 0 / tutorial | a name only: "DINA" on a recorder/wall. Nothing else.                             | found thing |
| word  | Level 1 camp     | this place is called the Backrooms; it has levels; nobody here has walked out       | people |
| list  | Level 1 camp     | Dina is on the registrar's list of the lost: she came through, asked about exits, went down | person + ledger |
| tape  | Level 2 or 3     | Dina's own tape: she was mapping exits and heard of a signal "from home"            | tape |
| room  | Level 5 hotel    | Dina kept a room; the ledger and what she left say she went to the city to find a radio | ledger + staff |
| radio | Level 11 city    | someone ran the radio for her: the broadcast is real; she booked passage on a ship  | person |
| pass  | Level 11 city    | the ship is the SS Fun, where it boards, and River's cabin number                   | person/errand reward |
The SS Fun stage of the main quest (and its HUD objective text) only appears once trail.pass is set, or the player
sequence-breaks at the gangway (hard speech check, bribe, or stowing away). The quest tracker never names a place or
person the player has not learned: before `pass` it reads as questions ("Find out who Dina is").

## Errands
Every named NPC who had no purpose gets one small task (fetch, carry, find, talk someone round, clear a pest, repair),
3+ stages where it earns it, an alternate way to finish, and a reward. Some errands pay in a trail clue.

## Voice
Human, short, Fallout New Vegas plain talk. No em dashes. Jokes fit the speaker. Short UI choices. No gore.
Froidlings is what the Level 70 townspeople call themselves, never an enemy.
