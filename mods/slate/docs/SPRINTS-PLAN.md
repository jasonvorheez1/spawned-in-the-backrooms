# Slate 1.5 · Sprints (plan v3, 2026-10-03)

Card: sl-sprints. Owner: Savi. Stage: PLAN v3 (both reviews folded in, design sound per second reviewer) → UI concept (psypher5 approves) → build → peer review → QA → final pass → psypher5 OK. Ships only on psypher5's word.

## Approval
- 2026-10-03 14:17 UTC, psypher5: "Yes to sprint btw" (concept /cdn/value.f2c6e8f618f17519a81a52e6b07c4723923ccdd6879496956f7d497c99e20255.png, plan v3). Check 12 gate open.

## Why
psypher5 runs Psyko Studios in sprints, one kind of work per sprint ("triage planned work in chunks of similar work so focus isn't lost"). Today sprints are faked: `plan.projects` of kind "sprint" plus a `card.sprint` field no screen shows.

## Data (world.state.plan, additive)
- `plan.sprints = [{ id, name, chunk, goal, start, end, state: 'next'|'active'|'closed', proj, report? }]`; start/end ms or null (shown as "no dates", never NaN). `proj` '' = whole board.
- One active sprint **per proj** (fix 4). Under the All scope the Board applies no sprint filter.
- `card.sprint = sprintId`. Done = `col==='done'` only; open/unfinished = any other col (fixes 8, 9).
- `sprint.snap = [{ day: 'YYYY-MM-DD' UTC, open, done }]`; today's row written/overwritten at the end of `handle()` whenever any sprint card's col, sprint or existence changed (one place, after the flow stamps); the chart carries the previous row over gap days (fix 8).
- `sprint.report = { built, passed, failed, right, wrong, change, bar }`: built = cards done in the sprint, passed/failed = `card.verdict.v` yes/no within the sprint window; text fields filled at the retro; the close writes a stub with counts and empty text (fix 15).
- Viewing filter is personal: `player.state.planSprint` (APPS.md), never `plan.tab` (fix 11).
- `plan.sprintsV = 1` marks migration done.

## Migration (fixes 1–3)
- Explicit, idempotent `planSprint {op:'migrate'}`, guarded by `sprintsV`, inside `ctx.commit` (one undoable commit). Never inside normPlan or a renderer.
- Sprints come from the **union** of `card.sprint` values and kind-'sprint' projects → 7 sprints S1..S7. S1 closed, S2 active, S3..S7 next; dates null.
- Each card maps by `card.sprint` first, `proj` (pj-s*) second.
- Creates `pj-game` (kind game, "Table Tennis") and sets it on the 27 pj-s* cards and the 10 no-proj cards; the 6 pj-mod-slate cards are untouched.
- Old pj-s* projects stay one release as `kind:'sprint-old'` (hidden from projBar); any `player.state.planProj` pointing at one is cleared.

## Ops (`planSprint`, lib/sprint.js imported by plan.js only; fix 6, 7)
- Routing: `planSprint` added to `KEYS` in lib/plan.js and to mod.json actions; `'sprints'` added to planTab's allow-list and to `PLANNER` in ui-panel.js.
- `add {name, chunk, goal, start, end, proj}` · `edit {id, …}`
- `start {id}`: re-reads `ctx.world.state.plan` at write time; refused with a message if the same proj already has an active one; refused on a closed sprint ("closed sprints stay closed; make a new one") (fixes 5, 10).
- `close {id, carryTo}`: unfinished cards move to `carryTo`; `carryTo` missing or closed → refused ('' = backlog allowed); writes the report stub; listed in `isDelete` in lib/undo.js so it is undoable (fix 9).
- `assign {card, sprint}`: refused onto a closed sprint.
- New cards made while `player.state.planSprint` is set (and not closed) get stamped with it, after the project stamp (fix 11).
- Readers tolerate two actives in one proj (a race): newest `start` wins, the other shows "also active" with a fix button (fix 5).

## Screens
- Planner nav bar: BOARD · ROADMAP · HOME · SPRINTS · SNAP (labels ≤ 7 caps, fix 12).
- SPRINTS tab (lib/ui-sprints.js): active sprint card (goal, dates, progress ring, burndown), sprint pill row, In progress / Up next / Later, Close sprint + Start next. Concept: /cdn/value.f2c6e8f618f17519a81a52e6b07c4723923ccdd6879496956f7d497c99e20255.png
- Board: a sprint pill on cards with a known sprint; sprint filter after the project scope.

## Acceptance checks (a reviewer measures, never the maker)
1. A fixture plan with no `sprints` key and no `card.sprint` renders byte-identical Board/Roadmap HTML to today's; a card with an unknown `sprint` shows no pill.
2. Migration on this board: 7 sprints; 37 cards with a sprint before = 37 after; 43 cards total before = after; 0 cards whose `sprint` is not a `plan.sprints` id; 6 pj-mod-slate cards unchanged; running it twice changes nothing.
3. Fixture sprint with exactly 6 unfinished + N done: close moves the 6 to `carryTo`, done keep the closed sprint, stub counts match; undo restores all.
4. A second start in the same proj is refused with a message; a start in another proj succeeds; start on a closed sprint is refused.
5. Two actives forced into the data: Board renders, SPRINTS shows one active + a warning.
6. Burndown: after 3 scripted ops on two different UTC days, today's row equals the live open/done count and gap days equal the prior row.
7. Pressing SPRINTS opens it (`plan.tab==='sprints'`); planSprint ops route (KEYS + mod.json).
8. A card made while viewing a sprint carries that sprint.
9. At 390×844: `scrollWidth ≤ 390`; every button ≥ 40 px tall except pills in `.pj-bar`/sprint row (≥ 32, scroll sideways).
10. lib/ui-sprints.js ≤ 8 KB, imported only by ui-panel.js; total `mods/slate/lib` grows ≤ 8 KB over 553,985 B (wc -c before/after). Note: ui-pocket imports ui-panel, so this lands in every player's boot; the limit stays tight for that reason.
11. Report: built/passed/failed counts equal the cards and verdicts in the sprint window.
12. psypher5's approval of the concept is quoted with its date in this file before the first UI commit (reviewer checks file history order).
13. Slate's own planner cards updated by Savi as each stage passes.

## v3 amendments (second review A–H + partials, 2026-10-03). These win over v2 where they differ
- **A.** `projOf`/`scopePlan` treat `kind:'sprint-old'` as unknown, so the board falls back to All; handle() clears a sprint-old `planProj` on that player's next op. Check 2b: a player with planProj=pj-s2 after the migration sees all 43 cards.
- **B.** Check 1 diffs only the board/roadmap body renderer, with the nav excluded. Check 9's pill floor is ≥ 30 px (today's `.pj`), so the Board CSS stays as it is.
- **C.** "Undoable" means Slate's planUndo. undo.js LISTS gains `sprints` and `projects`, so close and migrate restore sprint state, reports and projects. Check 3 asserts it. The vault mirror writes after the undo, so the undo's state is what persists.
- **D.** The migration moves S1's 3 open (test) cards to S2, then closes S1 with a report stub. Check 2 asserts S1 has 0 unfinished cards.
- **E.** Migrated S1..S7 get `proj:'pj-game'`.
- **F.** Stamp a new card's sprint only when `sprint.proj` is '' or equals the card's proj and the filter is visibly on. Changing the scope clears a `planSprint` from another project.
- **G.** Start and close store `startedAt`/`closedAt`. The report window and the burndown x-axis use those dates; planned start/end only drive the label.
- **H / 6.** Register `sprints` in the `APPS` map in ui-panel.js and in `APP_OF` in lib/seen.js. Check 7 covers it.
- **5.** Readers' tolerance of two active sprints is the real race guard (the re-read line is dropped). The race between a close and a card move is accepted: the moved card keeps its new col, and the close re-reads that card's col before carrying it.
- **8.** Writes that bypass handle() (undo restore, archive, agent writes) leave today's burndown row stale until the next accepted op; the tab recomputes today's row on read, without writing.

## Plan review (reviewer wisp, 2026-10-03)

Verdict: **CHANGES-NEEDED.** Measured against live `world.state.plan` (43 cards, read-only): `card.sprint` counts S1 8 · S2 15 · S3 2 · S4 5 · S5 4 · S6 2 · S7 1 · none 6; `card.proj` counts pj-s2 13 · pj-s3 2 · pj-s4 5 · pj-s5 4 · pj-s6 2 · pj-s7 1 · pj-mod-slate 6 · none 10. Projects: pj-mod-slate (kind mod) + pj-s2..pj-s7 (kind sprint). No sprint project has dates or a state. cfg columns: idea, todo, doing, **review**, test, done. Worst first:

1. **Check 2's numbers are wrong and migration loses S1.** Cards with `sprint` S2..S7 = **29**, not 27; 27 is the count of cards with `proj` pj-s2..s7 (2 S2 cards carry `sprint:'S2'` but no proj). And 8 cards carry `sprint:'S1'` (5 done, 3 test) with no S1 project, so "projects of kind sprint become sprints" makes 6 sprints and leaves 8 cards pointing at an id that doesn't exist (dangling pill). Fix: migrate from the union of `card.sprint` values and sprint projects → **7 sprints (S1..S7)**; map each card by `card.sprint` first, `proj` second; check 2 becomes "7 sprints; 37 cards with a sprint before = 37 after; 43 cards total before = after; 0 cards whose `sprint` is not a `plan.sprints` id".
2. **Migration names a "game's project" that doesn't exist.** The only non-sprint project is pj-mod-slate; clearing proj leaves 10+27 = 37 cards with `proj:''` (shown only under All). Fix: say it plainly: either create `pj-game` (kind game) in the same op and set it on the 27 pj-s* cards **and** the 10 no-proj cards, or set `proj:''`; never touch the 6 pj-mod-slate cards. Also state the migrated states/dates (proposal: S1 closed, S2 active, S3..S7 next; start/end = null until set; the board shows "no dates" not NaN).
3. **Migration trigger and safety unspecified.** If it runs in `normPlan` it runs inside every renderer read (renderers must not write) and every handle(). Fix: an explicit, idempotent `planSprint {op:'migrate'}` guarded by `plan.sprintsV=1`, run inside `ctx.commit` so it is one undoable commit; keep the old pj-s* projects with `kind:'sprint-old'` (hidden from projBar) for one release instead of deleting them; and players whose `player.state.planProj` is a pj-s* id are re-pointed (scopePlan already falls back to All, but stale ids should be cleared).
4. **One active "per project" (Data) vs "only one active sprint" (check 4) contradict.** pj-mod-slate cards (6) need their own cadence, or not. Fix: pick one. Recommendation: one active **per proj** (`sprint.proj`, '' = whole board); check 4 becomes "a second start in the same proj is refused with a message; a start in another proj succeeds". Define what Board defaults to when the scope is All and two projs each have an active sprint (proposal: no sprint filter under All).
5. **Two editors race.** `handle()` deep-copies `world.state.plan`, mutates, and writes the whole row back: two editors pressing Start on different sprints at once can both pass the "no active" test → two active sprints; a close racing a card move can drop the move. Fix: readers tolerate >1 active (newest `start` wins; others shown as "also active" with a fix button); the start op re-reads `ctx.world.state.plan` at write time; add an edge-case check: "two actives in data → board renders, Sprints tab shows one active + a warning".
6. **planSprint is not routable as written.** Every op must be in `KEYS` in lib/plan.js **and** declared in mod.json actions (planFlow is declared there as `"planFlow": {}`); `planTab`'s tab allow-list and `PLANNER=['board','miles','cam']` in ui-panel.js must gain `'sprints'`, or the tab silently falls back to board. Fix: add to the build checklist; add check "pressing SPRINTS opens it (plan.tab==='sprints')".
7. **Check 8 is not achievable as worded; boot risk is bigger than the panel.** There is no lazy/dynamic import anywhere in Slate: panel.js re-exports lib/ui-panel.js, which statically imports every view, and **lib/ui-pocket.js (play-mode HUD) imports ui-panel.js**, so new sprint code ships in every player's boot, not on first open. Fix: reword to "the new module (lib/ui-sprints.js) is ≤ 8 KB source, imported only by ui-panel.js; total `mods/slate/lib` bytes grow ≤ 8 KB (measure `wc -c` before/after; today 553,985 B)"; keep sprint ops in a separate lib/sprint.js imported by plan.js (server/input side only).
8. **Check 5 (burndown) can't pass with the stated write rule.** Snaps are written "when a card moves": a quiet day has no row, so "equal on each day" fails or is untestable; "day" has no timezone; and moves aren't the only changes (assign, planDel, planAdd while scoped, close carry-over, column rename/delete in cfgOp, planFlow review swipes test→done). Also "done" is undefined while cfg has `review` and `test`. Fix: done = `col==='done'` only, open = everything else in the sprint; day = UTC date of `ctx.now()`; write/overwrite today's row at the end of `handle()` whenever any sprint card's col/sprint/existence changed (one place, after the flow stamps); the chart carries the previous row forward over gaps; check 5 = "after 3 scripted ops on two different days, today's row equals the live count and gap days equal the prior row".
9. **Check 3 is a fixture, not this board, and "unfinished" is undefined.** On this board S2 has 13 not-done cards (7 doing, 1 review, 5 test). Fix: "unfinished = col !== 'done'"; check 3 runs on a fixture sprint with exactly 6 unfinished + N done; asserts the 6 have `sprint=carryTo`, the done ones keep the closed sprint, report stub counts match. Define `carryTo` absent / pointing at a closed sprint → refuse (or `''` = backlog). Make `close` undoable: add it to `isDelete` in lib/undo.js (it rewrites many cards at once).
10. **Closed sprint reopen not covered.** Fix: either refuse `start` on a closed sprint ("closed sprints stay closed; make a new one") or add `reopen` that clears `report`, sets active (subject to #4), and does not pull carried cards back. Add an edge check either way. Also `assign` to a closed sprint: refuse.
11. **New cards and the existing project auto-scope.** handle() already stamps `proj` on anything made while `player.state.planProj` is set; sprints need the same rule or new tickets fall out of the sprint being viewed. Fix: the Board's sprint filter lives on `player.state.planSprint` (APPS.md: what one person looks at is theirs; `plan.tab` is already shared and should not gain more view state), and the same end-of-handle block stamps `sprint` on new cards when that filter is set and not closed. Order: scopePlan (project) then sprint filter.
12. **Check 6 vs existing components.** Project pills (`.pj`) are 30 px tall, and the Board nav bar already holds BOARD/ROADMAP/SNAP; APPS.md wants HOME centred in that same bar → 5 cells at 390 px ≈ 78 px each, labels must be ≤ 7 caps. Fix: check 6 = "at 390×844 `document.documentElement.scrollWidth ≤ 390`; every `button` rect height ≥ 40 except inside `.pj-bar`/sprint pill row (≥ 32, horizontally scrollable)"; state the bar order (BOARD · ROADMAP · HOME · SPRINTS · SNAP) in the concept for psypher5.
13. **Check 1 is ambiguous on this board.** After migration projBar loses 6 sprint pills, so "unchanged" can't mean this board. Fix: "a plan with no `sprints` key and no `card.sprint` renders byte-identical Board/Roadmap HTML to today's (diff the renderer output for a fixture)"; plus "a card whose `sprint` is unknown shows no pill".
14. **Check 7 is a gate, not a measurement.** Fix: "approval recorded: psypher5's OK quoted with date in this file before the first UI commit" — reviewer checks file history order.
15. **Report shape vs reality.** `report.{built,passed,failed}` will be counted how? Fix: built = cards done in sprint, passed/failed = `card.verdict.v` yes/no during the sprint window (planFlow review already writes verdicts), right/wrong/change/bar = text filled by the retro, stub = counts filled, text empty.

## Re-review (second reviewer, 2026-10-03)

Verdict: **CHANGES-NEEDED** (small, all plan-text fixes; the design is sound).

### Numbers re-measured (read-only, live `world.state.plan` + `wc -c`)
All hold: 43 cards · 37 with `sprint` (S1 8 + S2..S7 29) · 6 `pj-mod-slate` · 27 `pj-s*` · 10 no proj · `mods/slate/lib` = 553,985 B. Projects pj-mod-slate + pj-s2..s7, no `plan.sprints`, no verdicts yet. Note the 37 cards with a sprint and the 37 cards that get `pj-game` (27 + 10) are different sets that happen to share a count; keep them apart in check 2. Nothing of v2 is built yet (no `planSprint` in KEYS/mod.json, no `sprints` in planTab/PLANNER, no lib/sprint.js or lib/ui-sprints.js): correct for a plan.

### Findings 1–15
1. **yes**: union → 7 sprints, card.sprint first; check 2 rewritten with correct numbers.
2. **yes**: pj-game created; states/dates stated; pj-mod-slate untouched.
3. **partly**: explicit guarded op, yes. But "any planProj pointing at one is cleared" can't reach players who aren't online, and since pj-s* stay as `sprint-old`, `scopePlan` (`projOf` finds them) keeps scoping to them. See new A. "One undoable commit" also needs to say which undo (see C).
4. **partly**: per proj chosen, All = no filter. Migrated sprints' `proj` isn't set (see E), so the rule has nothing to key on for S1..S7.
5. **partly**: reader tolerance + check 5, yes. "Re-reads at write time" adds nothing: handle() copies and writes in one synchronous call, so tolerance is the real fix and the line should say so. A close racing a card move (a dropped move) isn't addressed. Accept that with a sentence, or re-check the moved card after close.
6. **partly**: KEYS, mod.json, planTab and PLANNER, yes. Missing: the `APPS` map in ui-panel.js (`appBar(tab)` returns '' when `APPS[tab]` is undefined, so SPRINTS gets no app bar) and `APP_OF` in lib/seen.js (unseen dots).
7. **yes**: check 10 is measurable (module ≤ 8 KB, lib ≤ +8 KB, boot exposure noted).
8. **yes**: done/open, UTC, end-of-handle write, carry-forward. Gap left: writes that bypass handle() (planUndo restore, archive restore, Savi or agent writes) leave today's row stale until the next op. Say "stale until the next op is accepted," or recompute on read.
9. **partly**: unfinished defined, fixture, carryTo refusal, close in `isDelete`. But undo.js snapshots/restores only its LISTS (cards etc.), not `sprints`/`projects`, so undo can't put back `sprint.state` or the report stub, and "undo restores all" in check 3 fails as specified (see C).
10. **yes**: start on closed refused, assign onto closed refused.
11. **partly**: personal `planSprint` + stamping, yes. Cross-scope cases (see F) are undefined.
12. **partly**: nav order and label length, yes. The ≥ 32 px pill rule in check 9 fails today's 30 px `.pj` pills, and resizing them changes Board HTML, which breaks check 1 (see B).
13. **partly**: fixture wording, yes, but it collides with the nav change (B).
14. **yes**: check 12, a history-order gate.
15. **partly**: counts defined, but "the sprint window" has no stored edges: migrated sprints have null dates and no close timestamp is recorded (see G).

### New issues v2 introduced (worst first)
- **A. A stale planProj blanks the Board after migration.** A player offline at migration keeps `planProj:'pj-s2'`. `pj-s2` still exists (`sprint-old`), so `scopePlan` scopes to it. Its cards now carry `pj-game`, so that player sees an **empty board**, and the pill that would explain it is hidden. Fix: `scopePlan`/`projOf` treat `kind:'sprint-old'` as unknown (falls back to All), and handle() clears a sprint-old `planProj` on that player's next op. Add a check: "player with planProj=pj-s2 after migrate sees all 43."
- **B. Check 1 vs nav vs check 9.** The nav gains HOME + SPRINTS, so any Board HTML that includes the nav is not byte-identical. Also, check 9's ≥ 32 px either fails the existing 30 px `.pj` or forces a CSS change inside the Board render. Fix: check 1 diffs only the board/roadmap body renderer (nav excluded, stated), and check 9 says `.pj` ≥ 30 (today's) or names the resize as an accepted diff.
- **C. Undo coverage.** (i) `close` in `isDelete` only snapshots cards: add `sprints` (and `projects` for migrate) to undo.js's LISTS, or the close/migrate undo leaves sprint state/report behind. (ii) Say whether "undoable" means Slate's planUndo or world history. A world-history revert of world.state may also be overwritten by the vault SQL mirror; name one.
- **D. Migrated S1 breaks the close invariant.** S1 is "closed" but 3 of its 8 cards are in `test` (unfinished), with no carryTo and no report stub. Pick one: migrate S1 as `active`/`next`, or move its 3 open cards to S2 during migration with a stub report. Check 2 should assert it.
- **E. `sprint.proj` for migrated sprints is unset.** Proposal: `pj-game` for S1..S7 (their cards are all pj-game after migration). Without it, "one active per proj" and the Sprints tab grouping are undefined.
- **F. Stamping across scopes.** (i) With planSprint S2 (pj-game) set while scoped to pj-mod-slate, a new card gets proj pj-mod-slate + sprint S2, a cross-project card. (ii) Under All, no sprint filter applies, yet planSprint still stamps silently. Rule: stamp only when `sprint.proj` is '' or equals the card's proj, and only when the filter is visibly applied. Clear `planSprint` on a scope change it doesn't belong to.
- **G. Report/burndown window edges.** Store `startedAt`/`closedAt` (ctx.now()) on start/close, separate from planned start/end. Check 11 and the burndown x-axis use them; null planned dates then only affect the "no dates" label.
- **H. APPS / APP_OF registration** (from 6): add to the routing list and to check 7.

## Build review (independent reviewer, 2026-10-03)

Verdict: **FAIL: 2 of 13 checks** (9 and 10). Nothing was fixed. I measured fixtures with node against the real mod files (plan.js handle, undo.js snapshot/remember/restore), read the live `world.state.plan` without writing it, and rendered the real `ui-panel.js` output in headless Chromium at 390×844, since the Slate tab is a god-mode tab and the shared phone client can't mount it.

Worst first:
- **9 FAIL.** In the SPRINTS tab the sprint pills (`.pj-bar.sp-row` S2..S7) measure **21 px** tall, under the 30 px floor. They also draw as unstyled browser-default buttons (white boxes, black text): the `.pj` CSS (height 30 px) lives in ui-board.js's style block, and the SPRINTS body never carries it. `scrollWidth` = **390** on both SPRINTS and Board. The Board's sub-40 px controls (kb-chip 22, kb-acts 19, sl-ib 22) were there before, and per amendment B its CSS stays. Also off spec, though no check measures it: the nav bar reads BOARD · ROADMAP · SPRINTS · SNAP, with **no HOME**, and the SPRINTS glyph renders as a tiny dot. Everything else matches the concept: navy card, ring, burndown, Close sprint + Start next, In progress list.
- **10 FAIL.** `mods/slate/lib` is now **569,982 B**, which is **+15,997 B** over 553,985 against a limit of 8,192. ui-sprints.js is 8,169 B (≤ 8 KB, passes) and ui-panel.js is the only file that imports it (passes). sprint.js (6,045 B) plus the edits push the total over.
- **1 PASS.** With no sprints the card-pill code adds '' and the sprint row is absent. A card with unknown `sprint:'S9'` renders Board HTML byte-identical to the same card without it (fixture).
- **2 PASS (numbers moved).** Live: **45** cards, **39** sprinted, 7 sprints (S1 closed 5 · S2 active 18 · S3..S7 next 4/5/4/2/1, all `proj:'pj-game'`), **0** dangling, 6 pj-mod-slate cards, none sprinted, S1 **0** unfinished, `sprintsV:1`, pj-s2..s7 `sprint-old`. The 43/37 baseline was stale: the board had grown to 45/39 before the run, and the before = after invariant holds. On a fixture shaped like the live board, a second migrate gives byte-identical output.
- **2b PASS.** A player with planProj=pj-s2: `projOf` → none, scope shows all **45**, and that player's next op clears planProj to ''.
- **3 PASS.** A fixture with 6 unfinished + 3 done: close with no carryTo is refused ("Pick where unfinished cards go"). With carryTo it moves **6**, the done cards keep **3**, and the stub is built 3 / passed 2 / failed 1, matching the verdicts. planUndo then restores cards and sprints exactly. Close-to-backlog sends 6 to the backlog, and undo restores them. Migration undo (fixture): cards byte-identical, sprints removed, sprint-old kinds and pj-game reverted, and re-migrating afterwards works. Residue: `sprintsV:1` stays after the undo (harmless, because the guard needs sprints.length), and players' re-pointed planProj isn't put back.
- **4 PASS.** A second start in the same project is refused ("S1 is still active here: close it first"). A start in another project goes active. Starting a closed sprint is refused ("Closed sprints stay closed; make a new one").
- **5 PASS.** With two actives forced into the data, the Board renders and SPRINTS shows **1** "is also active" warning.
- **6 PASS.** Three moves across 10-05 and 10-07 UTC give snap rows 10-05 {4 open, 5 done} and 10-07 {3, 6}. Live is {3, 6}, and the 10-06 gap point equals the 10-05 row. Minor: days before the first snap row plot the live count, not the start count.
- **7 PASS.** `planTab {tab:'sprints'}` → `plan.tab==='sprints'` (fixture). planSprint is in KEYS and in the mod.json actions, `sprints` is in ui-panel APPS and seen.js APP_OF, and the panel routes the tab to sprintsView.
- **8 PASS.** A card made while viewing sprint X with matching planProj is stamped `sprint:'X'`. With no project scope the filter isn't visibly on, so the card gets none (amendment F).
- **11 PASS.** Live S1 report built 5 / passed 0 / failed 0 = 5 done cards, 0 verdicts. Fixture 3/2/1 matches.
- **12 PASS.** Approval commit seq 261 (13:17) comes before the first UI commit, seq 274 (13:23).
- **13 PASS (so far).** sl-sprints sits in *doing* and no stage has passed review yet. sl-burndown is still *idea* although burndown code exists.

Races and renderer writes: ui-sprints.js and sprintScope write nothing (pure reads; burn() recomputes today's row without writing). handle() still does a whole-row read-modify-write of `world.state.plan`, which is the race amendment 5 accepts. There's also one data oddity on the live S1: it has no `startedAt`, so its report window starts at 0.

## Fix round (2026-10-03)
Maker, after the review that failed checks 9 and 10. Slate stays installed at 1.4.0: not published, not bumped.

- **9: SPRINTS tab at 390x844.** `ui-board.js` now exports `PCSS`, the Board's pill styles, and `ui-panel.js` adds it to the sprints branch (`GLASS_BOARD + <style>PCSS</style> + sprintsView`). Re-tested by rendering `ui-panel` offline in headless Chromium at 390x844, using the live sprint list (S1..S7) and the live card/sprint mapping. Every `.pj` measures 30 px tall with a 15 px radius and the design-system fills (rgba(118,118,128,.2), and white .92 when on). scrollWidth is 390 on SPRINTS and on Board.
- **Nav HOME.** The Planner nav now reads BOARD · ROADMAP · HOME · SPRINTS · SNAP, and each button is 44 px tall. The SPRINTS glyph went from ◔ to ◷ so it reads at 15 px.
- **10: lib size.** Removed code with no callers: icons.js text-glyph maps (MAP/RE/iconize), plus unused exports and blocks in kiln-default.js, themes.js and ui-studio.js. Each removal was grep-verified across mods/slate first, and every lib module still imports. `mods/slate/lib` now measures 561,164 B, which is +7,179 B over the 553,985 baseline and under the 8,192 B limit. ui-sprints.js is unchanged at 8,169 B.
- Checks 1–8 and 11–13: no logic file they cover was touched (plan.js, sprint.js, undo.js, seen.js, board-cfg.js, input.js).
- Still open from the review, not changed this round: the migration undo leaves `sprintsV:1` behind.

## Re-review (fresh reviewer, 2026-10-03)
Verdict: **PASS.** I re-measured checks 9 and 10, which failed the build review, and checks 2 and 9 again as asked. Nothing was changed except this section. Slate stays at 1.4.0: not published, not bumped.

- **9 PASS.** I rendered the real `ui-panel.js` offline in headless Chromium at 390×844, phone god size. It used the live S1..S7 list, the live card↔sprint mapping, and planProj set to pj-game.
  - **SPRINTS tab:** `scrollWidth` = **390**. The S2..S7 pills are each **30 px** tall with a 15 px radius. Fills are rgba(118,118,128,.2), and white .92 for the selected pill. The nav reads BOARD · ROADMAP · HOME · SPRINTS · SNAP.
  - **Under 40 px on SPRINTS:** only the shell's four `sl-ib` window icons (22 px) and one 24 px shell button. Both also appear on Board and are older than Sprints.
  - **Board:** `scrollWidth` = **390**. All 12 pills measure 30 px. Its sub-40 controls (kb-chip, kb-pri, card actions) are older than Sprints and stay as they are, per amendment B.
  - **Against the concept:** the screenshot shows the navy active card with ring (22%), burndown, Close sprint and Start next, the In progress list, and the sprint pills.
- **10 PASS.** `mods/slate/lib` measures **561,164 B**, which is +7,179 B over 553,985 and within the +8,192 B limit. `ui-sprints.js` is **8,169 B**, and `lib/ui-panel.js` is the only file that imports it.
- **2 PASS.** Live: **45** cards, **39** with a sprint, **7** sprints, **0** dangling sprint ids, S1 closed with **0** unfinished. The **6** pj-mod-slate cards have no sprint and their proj is unchanged. `sprintsV:1`, and pj-s2..s7 are `sprint-old`.
  - The 43/37 baseline is stale; the build review recorded the before = after invariant at 45/39.
  - I didn't re-run the idempotency (second migrate) test on a fixture; the build review's result stands.
- Still open, not checked here: migration undo leaves `sprintsV:1` behind (harmless).
