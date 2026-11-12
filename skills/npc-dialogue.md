# NPC dialogue and voices

Every word an NPC says is written by hand. Nothing is generated: there is no model call in talk any more, and the player
cannot type. When you add a person, or a line for one, write it in the files below.

## Where the words live

- `scripts/lib/data/dlg-*.yml`: one entry per person, keyed by their id (the last part of their object id, like
  `meg-ale`). People with no entry speak as their archetype, `"faction:role"` (`"survivor:default"`, `"meg:scout"`,
  `"city:default"`...) in `dlg-generic.yml`.
- `scripts/lib/data/npc-voices.yml`: the voice of every named person. Read it before you write for someone.
- `scripts/lib/dialogue.js`: reads the files. `scripts/talk.js` runs the conversation, `scripts/meg-agent.js` the barks.
- Quest lines: the choice text is in `scripts/lib/npc-starters.js` (`questChoices`), `scripts/lib/level1-quests.js` (`C`)
  and `scripts/lib/zenith-quest.js`; the answers are in each `scripts/lib/level*-quests.js` handler. A handler matches
  words in the choice text, so keep its trigger phrase in any rewrite.
- NPC-to-NPC talk: `scripts/lib/data/chatter.yml` (camps), `scripts/lib/npc-social.js` (strangers),
  `scripts/lib/data/level4-people.yml` and `level5-people.yml` (residents).

## An entry

```yaml
meg-ale:
  hi: "First time you talk to them."
  back: ["Later times. A list draws one at random."]
  warm: "When they like you (rapport 35+)."
  cold: "When they don't (rapport -25 or less)."
  follow: "While they walk with you."
  bye: "When you pick 'That's all for now.'"
  walk: "When you walk off mid-talk."
  ask:                           # the choices, in order; the card shows the first four not asked this visit
    - q: "What the player says."
      a: "Their answer."
      sk: speech 35              # optional roll: speech, barter, survival, medicine, science, sneak, guns...
      fail: "Their answer when the roll fails."
      do: recruit                # optional: recruit | heal | discount
      then:                      # optional follow-ups, offered after this answer
        - q: "..."
          a: "..."
  barks:                         # one-liners, a list each
    idle: []                     # standing around
    hi: []                       # seeing you
    drawn: []                    # you have a weapon out
    hurt: []                     # you're badly hurt
    sneak: []                    # you're creeping
    close: []                    # you're too close
    spot: []                     # sees an enemy
    hostile: []                  # turns on you
    hit: []                      # takes a hit
    kill: []                     # kills something
    clear: []                    # fight's over
    flee: []                     # running
    death: []                    # going down
    reload: []
  gest: { wave: "", gift: "", dance: "", nodance: "", insult: "" }
```

Use `fail:`, never `no:` (YAML reads a bare `no` as false). Quote every line.

## How to write a line

- Say it out loud as them. If it could come from anyone, it's not theirs.
- Show, don't tell. A detail ("my brother's in Ohio") beats an explanation ("the voices are mimics").
- Short. Most lines are one or two sentences. No speeches, no lists of rewards.
- No stock phrases: no "wanderer" every line, no "stay safe out there", no "I'm glad you asked".
- No dashes and no `*actions*`; the speech cleaner strips them.
- Lore is hinted, not explained: the hotel's guests never check out, but nobody says so plainly.

## Voices

A clip is `/cdn/voice-<voice>-saying-<the line>.mp3`, so the voice text is the voice. `npc-voices.yml` maps an id to a
voice type: sex, age, timbre, accent, manner, joined by hyphens, for example
`tired-middle-aged-woman-doctor-calm-dry-spanish-accent`. Each named person has their own; two people never share one.
Changing a voice re-voices everything that person says. Unnamed people get one from the pool in `scripts/lib/voices.js`,
chosen by id and sex. Every script that voices an NPC should go through `voiceKey(o)` (or `vo(id, line)` with the id) from
`scripts/lib/voices.js`, never a hard-coded cast name.
