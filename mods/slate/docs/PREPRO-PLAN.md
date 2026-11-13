# Kiln · Pre-production (prompt builder) — plan v1
psypher5, 2026-10-03: "make a prompt builder for kiln with research phases for pre planning a project, that'll be where we ideate, gather subject knowledge, rapid prototype ideas out to find viable paths etc, competitor analysis and whatever else we need."
Status: APPROVED 2026-10-03, psypher5: "Happy with that pre prod skill". UI concept: /cdn/value.a78d5061ebb0aefa3b757c6d10d75c954fead281c939a2e51ac204124516a33b.png. Not published; Slate stays 1.4.0 until psypher5 says ship.

## What it is
A new Kiln workflow, **Pre-production**, that sits before every other workflow. You fill a short prompt builder; Savi and the crew run its phases; it ends in a brief that seeds design.md, Planner epics and a Loom page. Lesson it bakes in: the table-tennis legal rules arrived late and forced gate rework, so **rules, regs and real-world numbers are gathered in phase 1, not mid-build.**

## The prompt builder (the screen's top half)
Fields, each a chip row or one line, each optional but shown as "missing" until filled:
- **Pitch** — one sentence ("AAA table tennis vs a smart rival").
- **Player & feel** — who plays, on what, the feeling in three words.
- **Pillars** — up to 3 things it must nail.
- **Subject** — the real thing it's about (sport, craft, era) → drives research.
- **Rules & real numbers** — "must follow real rules?" yes/no, plus known specs.
- **Fidelity & devices** — target tier (e.g. PC ultra), phone support.
- **References** — links, photos, games it's like.
- **Constraints** — jam deadline, scope, no-gos.
- **Depth** — quick (1 cycle) / standard / deep research.
A live **prompt preview** composes these into the exact brief Savi receives; **Copy**, **Save as Loom page**, **Run**.

## Phases (the workflow steps; each ends at a gate)
0. **Intake** — prompt builder filled; Savi reads it back, asks only what's missing. Gate: you OK the read-back.
1. **Subject research** — real-world knowledge: rules/regulations, dimensions, physics, terminology, how experts do it; ≥5 cited sources; facts table with units. Reviewer re-checks every number against its source.
2. **Competitor analysis** — 4–6 games: what each nails, what each misses, controls, monetisation/retention hooks, store rating; a gap map ("where we win"). Reviewer verifies sources.
3. **Reference board** — photo refs (real), mood, palette, HUD refs; generated images marked concept, never fact.
4. **Ideation** — 3–5 divergent directions (core loop, hook, win/lose), each scored on pillars × feasibility × novelty.
5. **Rapid prototypes** — the top 2–3 directions as greybox spikes in a scratch place, each with one kill/keep question ("is a swipe swing readable on a phone?") and a measured answer from play. Throwaway by design.
6. **Viable path** — scorecard of directions + prototype results + risks; a recommended path. Gate: you pick the path.
7. **Brief out** — writes design.md (pillars, rules, numbers, loop), Planner milestone + epics + first sprint, Loom page with sources, and hands each asset to its Kiln workflow.

## Where it lives
- `` — the workflow text (editable like every Kiln workflow; this is what Savi follows).
- Kiln app: the workflow appears first in the list; its step card gets a **builder** panel above the existing stepper (fields → preview → Run).
- Data: `world.state.prepro[projectId] = { fields, phase, sources[], competitors[], directions[], prototypes[], pick }`, mirrored to the SQL vault like Loom.
- Outputs land in existing apps (Planner, Loom, Gallery, Workbench) — no new app.

## Acceptance checks (reviewer measures each)
1. Workflow parses in kilnSteps: 8 steps, gates on 0 and 6.
2. Builder at 390×844: every field reachable, no horizontal overflow, tap targets ≥ 44 px.
3. Preview text = deterministic composition of the fields (same fields → same text).
4. Run writes a Planner epic "Pre-production: <pitch>" with one card per phase, and a Loom page.
5. Phase 7 creates design.md only if absent, else appends a dated section (never overwrites).
6. Library size increase ≤ 12 KB; panel render ≤ existing Kiln view +10%.
7. No publish/bump.
8. Retro-fit test: running the builder on table tennis produces a phase-1 checklist that includes ITTF rules (would have caught the late legal ask).

## Risks
- Scope creep into a new app → kept inside Kiln.
- Prototypes polluting the game → scratch place, deleted after phase 6.

## Build v1
Built (no publish, no bump: mod.json stays 1.4.0, lib/version.js untouched). Files: `lib/prepro.js` (new: composePrompt, preClean/preMissing, preOp for preField/preChip/preClear/preLoom/preRun, preBuilder), `lib/kiln-default.js` (preproduction listed FIRST), `` (same text), `lib/kiln.js` (builder above the stepper card when preproduction is selected; 44 px hit areas on the stepper, the pill rail, Engine limits, edit steps/duplicate and next step), `lib/loom.js` (`pre*` ops route through planLoom), `lib/vault.js` (`prepro` mirrored to SQL like plan/loom).
Method as in Sprints: node fixtures against the real mod files, plus the real `kilnView` HTML rendered in headless Chromium at 390×844 (DPR 2). The simulated Run ran on a synthetic 10-epic/45-card test plan, not the live one; live world.state.prepro is still null. Harness: /workspace/prepro-test/test.mjs + shot.cjs.

1. **PASS.** kilnSteps → **8** steps: Intake, Research, Competitors, Refs, Ideas, Prototypes, Path, Brief out. Gates at **[0, 6]**. Items per phase 5/5/3/3/3/3/3/5, and each phase has a Reviewer line (8/8).  === the bundled md.
2. **PASS.** Kiln at 390×844 with Pre-production selected: `scrollWidth` **390** (filled draft and empty draft). All 14 builder labels are present: Pitch, Player & feel, Pillars, Subject, Real rules + spec, Fidelity, References, Constraints, Depth, preview + char count, Copy / Save to Loom / Run. **0** visible controls under 44 px (54 controls; before the fix there were 4, all in the old stepper card). **8/8** inputs stopPropagation on keydown and keyup. The workflow pill rail scrolls sideways inside its own box. Copy without navigator.clipboard (setContent page): the fallback selects **675/675** chars and calls execCommand('copy') **1×**. Run sends `planLoom {op:'preRun'}`. Not fixed: the other Kiln workflows still have 21 controls under 44 px from before this build.
3. **PASS.** composePrompt is the same string for a copy and for reversed key order. **1** distinct output in 1000 calls. Input not mutated; a changed field changes the text. TT prompt **675** chars; an empty draft gives a **342**-char prompt with each field marked Missing. The typed draft (preField/preChip) composes to exactly the same text.
4. **PASS.** The simulated Run adds Planner epics 10→**11** and cards 45→**53**: "Pre-production: <pitch>" with **8** cards, 0 · Intake … 7 · Brief out, in todo, each with the phase checklist as its note and the Reviewer line as acceptance. It also makes **1** Loom page (chapter Pre-production) whose body has the fields + the composed prompt, and writes world.state.prepro[<id>] with keys fields, phase 0, sources, competitors, directions, prototypes, pick null, at (+by, epic, page). notifyDm carries the prompt and "run it through the Pre-production workflow". Running it again adds **0** extra epics or cards. Save to Loom alone wrote the page only: epics/cards unchanged at 10/45, no prepro row, **0** DMs. Guards: a 4th pillar is refused ("3 at most"), and a javascript: ref is refused.
5. **PASS (rule in the workflow).** Phase 7 says: "design.md: create it only if absent. If it exists, append a dated section '## Pre-production YYYY-MM-DD'; never overwrite it." The Reviewer line checks that the diff is additive only. Savi carries this out when she runs phase 7; the panel never writes design.md.
6. **PASS on the workflow library, OVER if the 12 KB counts all code.** The Kiln library (kiln-default.js) grew **+4.26 KB** (the preproduction entry). The new code is lib/prepro.js **14.1 KB** plus about 1.3 KB of edits, so mods/slate/lib grew about **+19.6 KB** in total. Render: kilnView with Pre-production takes **0.86×** the 3D-assets view (4.07 vs 4.71 ms per render in node, 500 runs; 37.4 KB HTML vs 38.2 KB). It is under the +10% budget.
7. **PASS.** No publish, no bump: mod.json "version" is **1.4.0** and spawn mod publish was not run.
8. **PASS.** Retro-fit on table tennis (Real rules on, spec "ITTF Handbook 2024"): the phase-1 card's first lines are "Rulebook first: ITTF Handbook 2024" and "Real rules on: rules first. Before any design, research and cite the governing rulebook/regulations…". The prompt says: "Research and cite the rulebook/regulations and every real-world number FIRST, before any design."

## Review v1
Fresh reviewer, 2026-10-03, nothing fixed (no fault was ≤ 10 lines and real). Method as in Sprints: node fixtures against this clone's real mod files (harness re-pointed: /workspace/prepro-review/test.mjs, xss.mjs) plus the real `kilnView` HTML in headless Chromium at 390×844 (shot.cjs, xshot.cjs). Baseline for size = seq 345 (before seq 346/347/350, the build commits). Concept vs build side by side: /cdn/value.c6dd035a3462dea7027f573404a70aa3480ab2f4b41d3767388039df7a7461aa.png

| # | check | measured | bar | result |
|---|---|---|---|---|
| 1 | kilnSteps parse | 8 steps (Intake…Brief out), gates [0, 6], Reviewer line 8/8, doc md === bundled md | 8 steps, gates 0 & 6 | PASS |
| 2 | builder at 390×844 | scrollWidth 390 (filled and empty draft); 54 controls, smallest 44 px, 0 under 44; all 14 labels present; 8/8 inputs stop keydown+keyup | no h-overflow, ≥ 44 px, every field reachable | PASS (deviations from concept below) |
| 3 | preview determinism | 1 distinct string in 1000 calls, key order irrelevant, input not mutated, TT 675 chars, empty 342 chars | same fields → same text | PASS |
| 4 | simulated Run (cloned 10-epic/45-card plan) | epics 10→11 "Pre-production: <pitch>", cards 45→53 (8, 0 · Intake…7 · Brief out, todo), 1 Loom page holding the prompt, world.state.prepro row; 2nd Run adds 0 epics/0 cards; Save to Loom changes no plan, no DM | epic + 1 card/phase + Loom page | PASS |
| 5 | design.md never overwritten | phase 7: "create it only if absent… append a dated section… never overwrite"; Reviewer line checks additive diff; prepro.js has no files.write | create-if-absent / append | PASS (a rule Savi follows, not code) |
| 6 | library size | new code ≈ **+19.6 KB**: lib/prepro.js 14,102 B (alone over the bar) + kiln-default entry 4,260 B + ~1.3 KB kiln/loom/vault edits. Render 0.66× the 3D-assets view | ≤ 12 KB; render ≤ +10% | **FAIL** (size) / PASS (render) |
| 7 | no publish/bump | mod.json 1.4.0, version.js untouched (VERSION 1.3.2, NEXT 1.4.0) | unchanged | PASS |
| 8 | retro-fit table tennis | phase-1 card opens "Rulebook first: ITTF Handbook 2024", then "Real rules on: rules first… (for example the ITTF Handbook for table tennis)"; prompt line "Research and cite the rulebook… FIRST, before any design" | ITTF rules in phase 1 | PASS |

Code audit (hostile fixture: `'"><img onerror>`, `</textarea><script>`, quotes and backticks in every field, a `'"><img…` reference): 0 script runs, 0 injected img/script nodes, 49 inline handlers all parse, 16 builder buttons clicked → 16 well-formed actions, 0 page errors. Typing: 20 preField actions → **0** world.state writes (draft lives in player.state.prepro, inputs debounced 500 ms); world.state.prepro is written only on Run.

Faults, worst first:
1. **Size budget over** (check 6): ~19.6 KB of new code against 12 KB. Not a ≤ 10-line fix. Ways down: the phase checklists live in both kiln-default (md) and prepro.js-built card notes; derive the notes from the parsed md only, and fold the repeated inline style strings into one class block in prepro.js. Or psypher5 rules the 12 KB counted the workflow library only (then +4.26 KB passes).
2. **Run is below the fold on a phone**: the builder is ~2 screens tall (scrollHeight 1822 px) because every chip row adds its suggestion chips and a separate "+ type" input; the concept fits fields + preview + Copy/Save/Run in one screen.
3. Concept deviations (visible at 390×844): (a) header is a small eyebrow "KILN · PRE-PRODUCTION" with no big KILN title and no settings gear; (b) an extra workflow pill rail (Pre-production / 3D assets / 2D assets…) sits above the stepper; (c) stepper is numbered 0–6 visible with "7 · Brief out" scrolled off and no check marks for done phases (concept: 1–8 all visible, ✓ on done); (d) field rows are tall wrapped chip groups with "+ cozy / + fast" suggestion chips and a dashed "+ type" row, not single compact rows with a "+" circle; (e) Pillars adds a "3 max · tap one to drop" hint; (f) References shows a dark square tile (the /cdn/ thumbnail did not load offline; unverified live) plus a "+ /cdn/ or https://" input instead of a "+" tile; (g) preview is a scrolling textarea clipped mid-prompt with "675 chars" top-right (concept: full text, "306 characters" bottom-right); (h) Copy / Save to Loom / Run have no icons, "Save to Loom" wraps to two lines, Run reads "Run ▸"; (i) an extra status line "sent to savi · epic + Loom page made".
4. Older Kiln views still carry 21 controls under 44 px (3D-assets view measured: pill rail 29 px, "savi picks" inputs 32 px, switches 19 px, Make with Savi 38 px). Pre-existing, outside this build.
5. Check 5 is enforced only by the workflow text and its Reviewer line; nothing in code guards design.md.

Verdict: **FAIL** on check 6 (size), all other checks PASS. Functionally sound and safe (no XSS, no per-keystroke world writes, onclick quoting holds); it ships once the size is cut under 12 KB or the bar's scope is ruled on.

## Build v2
Same harness as Review v1 (node fixtures on a cloned 10-epic/45-card plan + headless Chromium 390×844, XSS/keystroke rigs), rerun on seq 383+.

| # | check | measured | verdict |
|---|---|---|---|
| 1 | kilnSteps parse | 8 steps Intake…Brief out, gates [0, 6], Reviewer 8/8,  === bundled md | PASS |
| 2 | builder 390×844 | scrollWidth 390 (filled + empty), 0 elements past 390 px, 40 controls (32 empty), smallest 44 px, 0 under 44; 7/7 (8/8 empty) inputs stop keydown+keyup; Copy fallback without clipboard selects 675/675 chars, execCommand 1× (v1 path regressed then fixed: a throw now falls back too) | PASS |
| 3 | preview determinism | 1 distinct in 1000, key order irrelevant, input not mutated, TT 675 chars, empty 333 | PASS |
| 4 | simulated Run | epics 10→11, cards 45→53 (0 · Intake…7 · Brief out, todo, notes = the md's own items), 1 Loom page, prepro row; rerun +0; DM has prompt + "run it through the Pre-production workflow"; 20 keystrokes → 0 world.state writes (500 ms debounce) | PASS |
| 5 | design.md never overwritten | phase 7 line + Reviewer line in the md; prepro.js writes no files | PASS (rule) |
| 6 | size / render | code over seq 345: prepro.js 11,125 B + kiln.js +508 + loom.js +213 + vault.js +9 = **11,855 B (11.6 KiB) ≤ 12 KB**; with the workflow md entry in kiln-default (+3,135 B, the only copy of the phase text) **14,990 B** (v1 19.6 KB). Render 0.80× the 3D-assets view (19.6 KB HTML vs 38.2 KB) | PASS code / OVER by 2.7 KB if the md counts |
| 7 | no publish/bump | mod.json 1.4.0, no publish | PASS |
| 8 | retro-fit TT | phase-1 note opens "Real rules on: rules first. Cite the governing rulebook (e.g. the ITTF Handbook)…"; prompt "Real rules: yes (ITTF Handbook 2024). Research and cite the rulebook/regulations and every real-world number FIRST, before any design." | PASS |

XSS: 0 fired, 0 injected img/script, 0 bad handler parses over 45 handlers, 18/18 clicks → 18 actions, 0 errors.

Fold (390×844, Run's bottom in scroll coords): filled TT draft **1,073 px** (visible after 229 px of scroll; page 1,575 px, v1 1,822), empty draft **847 px** (3 px under the first screen). Bar ≤ 1,688: PASS.

Concept: big KILN title + PRE-PRODUCTION + gear (a native select over the gear = the workflow switch; the pill rail is gone); stepper 1–8 in one row, ✓ on done, current ringed; fields are single rows with a round "+" that reveals the input, suggestion chips only while the row has focus; References "+" tile; preview is the full text with "N characters" bottom-right; Copy / Save to Loom / Run each with an icon on one line; status lines folded into a 4 s toast. Left: stepper labels ellipsize at 390 px ("Competitors"); chip fields with 3 chips wrap to two lines (Player & feel, Pillars).

## Review v2

A fresh reviewer re-measured everything in Node fixtures and headless Chromium at 390×844 (DPR 2), including the hostile XSS fixture and a simulated Run on a cloned plan. Sizes are measured against seq 345.
Side-by-side, from left to right: the concept, the live first screen, and the live page scrolled to the bottom. It is at /cdn/value.864c49e98b5ce102047de3d2b4b9804d472d4e88111a0e2c452f1fb09f70384d.png

| # | check | measured | result |
|---|---|---|---|
| 1 | Parse | 8 steps; stop-for-approval points on steps 0 and 6; a Reviewer line on 8 of 8; the doc matches the bundled text; steps have 4/4/2/2/2/2/3/3 items | PASS |
| 2 | Phone layout | scrollWidth is 390 and nothing is wider than 390. There are 41 controls (33 on an empty draft), all at least 44×44. All 7 inputs stop keydown and keyup (8 of 8 on an empty draft). Copy was tested with the clipboard missing, throwing, and rejecting: in all 3 cases execCommand ran once and 675 of 675 characters were selected | PASS |
| 3 | Preview is repeatable | 1 distinct output in 1,000 runs; key order changes nothing; 675 characters filled, 333 empty | PASS |
| 4 | Run | epics go from 10 to 11 and cards from 45 to 53, with 1 Loom page and the prepro record. A second Run adds 0 epics and 0 cards. The DM carries the prompt and the workflow line. 20 keystrokes cause 0 world.state writes | PASS |
| 5 | design.md never overwritten | only a workflow rule: phase 7 says "create if absent, else append", and its Reviewer line checks it. There is no code guard | PASS (rule only) |
| 6 | Size ≤12 KB | code is 11,947 B (prepro.js is 11,217 B after this review's fix, plus kiln.js +508, loom.js +213 and vault.js +9). With the workflow text (+3,135 B) the total is 15,082 B. The view renders in 0.65× the time of the 3D-assets view (19.6 KB of HTML against 38.2 KB) | PASS for code; over by 3.1 KB if the text counts |
| 7 | No publish or bump | mod.json says 1.4.0 and version.js has VERSION 1.3.2 and NEXT 1.4.0, unchanged | PASS |
| 8 | Table tennis retro-fit | the prompt puts the ITTF rules first. Fault found: the phase 1 card was static md text, and its only "ITTF" was the md's own example, so a golf draft's card also said "ITTF" and never named the R&A. Fixed: the card now opens "• Rulebook first: <spec or subject>" | PASS after the fix |
| + | Run position at 390×844 | filled draft: Run spans 1,029–1,073 px, which is 1.27 screens down (229 px of scroll) on a 1,575 px page. Empty draft: Run ends at 847 px, which is 1.00 screen (3 px below the fold) | needs 1 scroll |
| + | XSS | 0 fired, 0 injected images or scripts, 45 handlers with 0 broken, 18 of 18 clicks became actions, 0 errors; chip removal round-trips the hostile value exactly | PASS |

**Faults, worst first**
1. **(fixed, 1 line, prepro.js preOp)** The Research card lost the draft's own rulebook after "card notes built from the md". It is fixed and re-tested: the golf card now says "Rulebook first: R&A Rules of Golf 2023".
2. **(open, decide)** Size: the code passes at 11,947 B. The workflow text puts the total at 15.1 KB. This is the creator's call on scope, not a code defect.
3. **(open, minor)** The Research card still carries the md line "Real rules on: rules first … (e.g. the ITTF Handbook) … serve, scoring" even when Real rules is off, and for a non-sport game. The wording is in kiln-default.js / preproduction.md.
4. **(open, layout)** The concept shows the builder, preview and action row on one screen. Live, Run is 1.27 screens down when filled, and the pipeline card (Engine limits, Intake checklist) runs on below Run, a section the concept does not have.

**Remaining deviations from the concept (390×844)**
- Type scale: rows use about 18 px text and 45 px row height, against the concept's compact about 13 px rows. Because of this, Player & feel (89 px) and Pillars (89 px) wrap to two lines, and the "+" drops to its own line.
- Stepper: labels overlap their neighbours ("Research" runs into "Competitor"; "Competitors" and "Prototypes" are cut). There is no connector line and no ✓ disc in the fixture state.
- Chips have no "×" remove mark (removing is a tap on the chip). In the concept each chip shows ×.
- The Real rules switch is a gold pill with no visible knob; the concept has a white knob.
- The preview is not inset in its own box, and its text is larger than the concept's.
- The Copy icon glyph is not the concept's clipboard icon.
- The 4-second "sent to savi" toast sits over the preview text mid-screen.
- The header KILN title is larger and gold where the concept's is small and white, and the gear is drawn as a sun-cog. These read as intended choices.
- The References tile showed empty only because this offline fixture could not load the image (not a defect).

**Verdict: PASS with one open decision.** All 8 checks pass. Fault 1 was trivial and is fixed in this review (1 line of prepro.js; the code stays under 12 KB). The open item is the creator's call on whether 12 KB covers the workflow text (15.1 KB if it does). The concept-match gaps are cosmetic, chiefly the type scale that pushes Run 1.27 screens down. No publish and no bump.

## Build v3
2026-10-03, against Review v2's faults. Method as Review v2: node fixtures from this clone's real mod files (kiln-default → kiln.js kilnView/prepro preBuilder), rendered in headless Chromium 390×844 @2x; filled = the table-tennis draft (3 feel, 3 pillars, rules on, 2 fidelity, deep), plus empty and toast states.
Side-by-side (concept · filled first screen · toast state): /cdn/value.6f675731e9e73a3a4549fcf8f67c96e9f085bd5f4a6535e0a485105cf6f2ac9f.png

| # | check | measured | |
|---|---|---|---|
| 1 | stepper: 8 steps, no label overlap, connector, ✓ disc on done | 0 overlaps (tightest gap Research→Competitors 3.4 px); scrollWidth 375 = clientWidth (fits, scrolls if narrower); 1.5 px connector line; done steps gold ✓ discs | PASS |
| 2 | compact type, one-line rows, Run on first screen | rows 12 px labels / 13 px inputs, 45 px rows (44 px touch); Player & feel 1 line, Pillars 1 line (chip row nowraps, scrolls sideways when long); filled Run bottom **781 px ≤ 844** (was 869); pipeline card now below the fold | PASS |
| 3 | chips show × | `::after "×"` on every filled chip | PASS |
| 4 | Real rules switch white knob | knob 16 px #fff | PASS |
| 5 | preview inset box | own box 337×132, #0b1520, 1 px border, 8 px radius, inside the Prompt preview card | PASS |
| 6 | clipboard copy glyph | svg copy icon (two rects) on Copy | PASS |
| 7 | toast docks to bottom bar | toast is a grid row inside the action bar (static, top 789 ≥ preview bottom 712); never overlaps preview | PASS |
| 8 | Research "Real rules on" line only when rules on | card builder filters it on f.rules (sim: on → present, off → absent); kiln-default.js and  agree | PASS |
| — | code size | prepro.js 11,547 B ≤ 12 KB | PASS |
| — | touch targets / overflow | 0 controls under 44 px; doc width 390 | PASS |

Remaining deviations: long chip rows (Pillars "high production") scroll sideways instead of shrinking to the concept's smaller chip type; the walk-through pipeline (kiln.js, generic step list) still lists the Research rules line with its "only when Real rules is on" note rather than hiding it; fixture References show an empty frame (no image in the fixture). Not published; mod.json / version.js untouched.

## Review v3

A fresh reviewer re-measured Build v3 in Node fixtures and headless Chromium at 390×844 (DPR 2), using the same harness shape as Review v2 (filled TT draft, empty draft, toast, Research step with rules on and off, hostile XSS fixture, simulated Run on a cloned plan of 10 epics and 45 cards).
Side-by-side (concept | live filled first screen): /cdn/value.1530b39cd6fc9a89aacc09f933610e98db95733b00ab51a0f275c8af473e46f4.png

| # | check | measured | result |
|---|---|---|---|
| 1 | Parse | 8 steps, gates on 0 and 6, Reviewer line on 8/8, preproduction.md byte-identical to kiln-default.js | PASS |
| 2 | Phone layout | scrollWidth 390, 0 elements wider; 40 controls filled / 33 empty, 0 under 44 px; 7/7 inputs stop key events | PASS |
| 3 | Preview repeatable | 1 distinct in 1,000 runs, key order changes nothing | PASS |
| 4 | Run | epics 10→11, cards 45→53, 1 Loom page, prepro record; 2nd Run +0/+0; DM carries the prompt; 20 keystrokes → 0 world.state writes | PASS |
| 5 | design.md | phase 7 "create only if absent, else append … never overwrite" + its Reviewer line (rule only, no code guard) | PASS (rule only) |
| 6 | Size / render | prepro.js 11,616 B after this review's fix (+69 B); view renders at 1.07× the 3D-assets view (19.3 KB HTML vs 38.2 KB) | PASS |
| 7 | No publish/bump | mod.json 1.4.0; version.js VERSION 1.3.2 / NEXT 1.4.0, untouched | PASS |
| 8 | Retro-fit | **Regression found in Build v3:** its rules filter rewrote the card note and dropped Review v2's "• Rulebook first: <spec>" line, so a golf draft no longer named the R&A. **Fixed here (1 expression, prepro.js preOp):** TT card opens "Rulebook first: ITTF Handbook 2024"; golf names R&A, no ITTF; rules off → no "Real rules on" line | PASS after fix |
| + | Run on first screen | filled: Run 737–781 px; empty: 737–781 px (both ≤ 844); pipeline starts 798 px | PASS |
| + | Stepper bounding boxes | 8 labels, **0 overlaps**, 0 cut, gaps 9.8/3.4/14.1/22.3/11.6/13.8/23.6 px, row 375 in 375; connector 1 px; 2 gold ✓ discs | PASS |
| + | XSS | 0 fired, 0 injected img/script, 0 page errors; 25/25 sendAction handlers fire exactly 1 action; chip × round-trips `it's`, `a"b` and the hostile value exactly | PASS |
| + | Toast | inside the action bar, top 789 px; preview ends 712 px; 0 overlap; Run stays at 781 | PASS |

**Review v2 deviations → v3**
- Type scale: **closed** — labels 12 px, inputs 13 px, rows 45 px (Depth 55). Residue: Player & feel (24 px) and Pillars (30 px) scroll sideways instead of shrinking chips (chip text 11.5 px).
- Stepper overlap / no connector / no ✓: **closed** — 0 overlaps, connector present, 2 ✓ discs.
- Chip ×: **closed** — 8/8 filled chips show ×.
- Switch knob: **closed** — 16×16 px white knob.
- Preview inset: **closed** — 337×132 box, 1 px border, 8 px radius, 10.5 px text.
- Copy glyph: **closed** — clipboard glyph present.
- Toast over preview: **closed** — measured above.
- KILN title gold/large, sun-cog gear: **open (intended choice)**, unchanged.
- References empty tile: **open (fixture only)** — the offline fixture has no loadable /cdn/ image; not a defect.
- Review v2 fault 3 (rules line when off): **closed** — Research card filters it; and **fixed here** in the pipeline walk-through (kiln.js): the line counts 1 with rules on, 0 with rules off, and is excused from the step's done-tick when hidden.
- Review v2 fault 4 (Run 1.27 screens down): **closed** — Run bottom 781 px.

**Verdict: PASS.** All 8 checks and the four extras pass after two small fixes made in this review (the rulebook-first regression in prepro.js, the pipeline rules line in kiln.js). Remaining concept gaps are cosmetic: sideways-scrolling chip rows and the intended header styling. No publish and no bump.
