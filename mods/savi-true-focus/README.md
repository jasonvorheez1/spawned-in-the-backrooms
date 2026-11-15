# Savi True Focus

**Turn it on. Research with sources. Build with a plan. Show what actually worked.**

## One command

Type **`/true-focus`**. Nothing after it: no task field, no status argument, no stop argument.

It enables True Focus for this conversation. Savi continues clear unfinished work, or stays ready for the next ordinary message. Repeating the command keeps it on without duplicating the outfit. Completing one task does not turn it off. Say **“turn true focus off”** in normal chat to leave the mode and restore her prior appearance.

If the host cannot dispatch custom slash commands, ordinary chat — **“turn true focus on”** — is the honest fallback. The package contains a no-argument command definition; a saved definition alone does not prove the current chat client dispatched it.

## Her focus look

Savi herself wears a fitted dark suit, an ivory shirt with cyan detail, and a held open book with a pink bookmark. The real source character keeps her face and hair. The augmented rig supplies reading, page-turn and thinking clips; the separate skinned suit follows her, and the book rides the actual hand bone with its own page-turn clip.

The wardrobe only accepts Savi's helper body. It never replaces the human player's model, controls, camera or UI. Native Savi posing pauses while the focus clips own the pose and resumes on restoration. The world receives one invisible event-driven controller; only an active wearer has temporary visual children. No idle per-frame loop is added.

The visual assets are ready only when `lib/wardrobe.json` contains verified uploaded assets and the runtime reaches its ready state. Missing assets are a presentation blocker, not proof that the workflow failed or permission to claim the outfit appeared.

## The working mode

- Open relevant websites or wiki pages and cite sources actually read.
- Inspect and use real reference images from creator uploads or accessible source pages; retain source links and distinguish viewed images from text-only reads.
- Share a concise public action plan, not private reasoning.
- Do useful work immediately; use independent agents when available and helpful.
- Back progress with saved/read-back facts, relevant views, real tests or opened sources.
- Change approach after a failed check; broaden diagnosis after two missed repairs.
- Name what is verified and what remains blocked.

Tiny edits stay tiny. Browsing and agents are useful tools, not mandatory rituals. True Focus does not change the underlying AI, grant extra tools or agents, increase budgets, bypass access restrictions, or invoke/spend the platform's daily Lock-in. It does not automatically publish, reset data or disclose private information. A clear explicit request for a consequential action remains subject to its real scope and normal rules.

## Evidence and limitations

A saved edit is not a working button. A research receipt is not a full workflow test. A rendered garment is not a successful chat-command invocation. The dated workshop evidence belongs in `checks/verification.md`; `checks/review.md` records the earlier static workflow review, not runtime execution. `checks/activation-cases.md` covers the simplified activation and wardrobe contract.

## Package and removal

- `commands/true-focus.md` — the stable no-argument command.
- `skills/true-focus.md` — the research/build/check/replan guide and wardrobe contract.
- `controller.js`, `wardrobe.js`, `lib/` — event-driven Savi-only appearance and restoration.
- `templates/controller.js` — the one invisible controller placed by installation.
- `art/wardrobe/` — reproducible asset construction and proof.
- `examples/wiki-research.md` — the dated, source-backed research demonstration.
- `checks/` — specifications and clearly labeled evidence.

Turn focus off before removing the mod; verify the original helper look is back. Controller destruction also cleans its wearers. Removal removes the guide, command, controller and package, not the work the creator previously asked Savi to make or notes deliberately stored outside this folder. Never claim cross-room or uninstall behavior has been tested without executing those paths.

Release target: **savi-true-focus 1.0.2**, unlisted and installable by exact package name. Catalog status is the release authority.

## Focus portrait

A focused Savi portrait is prepared in `lib/presentation.json`. Its native chat-message and typing/prompt bindings are **not available through the documented mod API yet**; platform request `d093dc6d-44f5-427f-8063-bb2f28d181c0` tracks that integration. The asset is ready, not the chat override. No substitute chat UI or human-profile edit is included.

Website reading and visual-reference handling are part of the guide and activation text, not new powers granted to the AI. Inaccessible sites or images remain named limitations.

## Focused movement

The same Savi helper follows the requesting player using her own movement behavior: walk with the book held, jog to catch up, then stop to read. A blocked path stops her rather than teleporting. Her native clip library is preserved. The controller requests the outfit from the helper’s own simulator, using stable child ids. That owner repairs a missing driver without making a second helper; repeated delivery is idempotent. Original clothes hide only after the replacement suit loads. A live off/on cycle removed both accessories, restored native behavior, and returned to exactly one driver, suit and book. See `checks/verification.md` for remaining visual and platform limitations.

## Reconnect recovery
While focus is enabled, a one-second controller timer repairs native helper resets. It sleeps when focus is off and preserves genuinely different outside model choices. This is a fallback pending a native helper-rebind event. Assets still need to finish loading after reconnecting; an active workflow alone does not prove its outfit is visible.
