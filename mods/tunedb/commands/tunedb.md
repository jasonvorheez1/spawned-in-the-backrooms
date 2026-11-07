---
name: tunedb
description: Run the /tunedb command — set up or import the game's GUI database
---

# /tunedb

- `/tunedb` — load the `tunedb#tunedb` skill and run its **First time in this world** section: list what is already on sliders, find the numbers still hidden in code, offer to move them. For an RPG-shaped game also offer the **new game** starter tables.
- `/tunedb import` — load the skill and run its **existing game** section: find the hard-coded gameplay numbers, propose tables, and (after the creator's OK) move the numbers into tables and point the code at them.

Say one line when done: which tables exist and what they drive. Remind the creator where the tab is: god mode → TuneDB tab (🎚️ Tune for sliders, 🗃️ Database for tables). From now on every number Savi writes lands in scripts/lib/data/*.yml with a range comment, so it shows up as a slider.