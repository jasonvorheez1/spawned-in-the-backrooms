# Release verification — 2026-09-13, ownership and overlap repair

This receipt supersedes the historical receipts below. Release target: unlisted `savi-true-focus@1.0.2`; the catalog response is the authority on publication.

## Live runtime facts observed in this release pass
- Savi's own simulator now creates her invisible wardrobe driver and the two accessories. The controller only validates and queues activation; it does not create a remote-owned outfit.
- The owner read resolves exactly **one helper, one driver, one suit and one book**. Driver, suit and book all reached ready.
- Original shirt and trousers both read `visible:false` after replacement readiness. They previously lacked that mask and overlapped the suit.
- The live book now reads the corrected normalized quaternion: approximately (0.706, 0.704, -0.0376, 0.0661), on `hand_l`.
- A real stop event removed the focus marker, all drivers and both accessories, restored the native model/presence behavior, and removed focus movement. Registry enabled was empty.
- A real reactivation through the new controller/owner path reached ready with one helper, one driver and two accessories again; `FocusRead` was active and the original clothing masks were retained.
- **28 mocked control/safety cases pass**, including owner idempotence, unrelated-child protection and human refusal. These are separate from the live reads above.

## Reconnect patch
After the successful ready/off/on reads, a helper rebind restored the native model and behavior while retaining the focus marker; accessories disappeared. An enabled-only one-second recovery timer now detects that exact native reset, requeues owner creation, and leaves unrelated outside avatar changes alone. The subsequent live read resolved a new driver; visual/asset readiness after this rebind is a separate check. Platform lifecycle request: `2e30be8c-69e9-4df8-8ef4-9ec51332b1ba`.

A late-rig race was also observed: the driver initially lacked the hand bone, while a later live read found 560 bones including `hand_l`. Dressing now retries at 0.5 s while loading, bounded by the existing 90 s load timeout. This is separate from requiring a visually confirmed pose.

## Focus-only garment removal
The native garment visibility flags were later overwritten again despite a ready driver. The final focus asset therefore removes the four obsolete native garment mesh bindings themselves: shirt, trousers and both hair ties. The original avatar remains untouched for restoration. Export inspection confirmed those four nodes have no drawable mesh, while face, body, hair, skins and materials are unchanged. Only now-meaningless garment morph channels are removed; the five focus clips pass upload skin checks. The new avatar is `/cdn/value.dbcd78d28e9bc5f5b2fcd40af0d4dcc0415114a793e4b9f7a6e869a8b2d4b319.glb`. This removes reliance on mutable clothing visibility flags; final appearance still requires a fresh creator view.

## Remaining limitations, not claimed fixed
- The creator's initial frame showed the overlap, but a fresh visual confirmation was unavailable: the later capture used the helper's CPU camera, which hides its own first-person body and still had assets arriving. Mouth, stride, book-fit appearance and observer-client rendering remain visually unverified; no substitute render is claimed as proof.
- Departure and full package-uninstall paths were not exercised. The live dressed off/on cleanup path was exercised successfully.
- Native chat/typing portrait binding still awaits the platform hook. Prepared portrait metadata is not an active chat override.
- Native command dispatch was observed earlier; palette refresh is a separate host concern. The exact no-argument command remains `/true-focus`.
- No human appearance, human controls, world camera, terrain, replacement chat or gameplay mode was changed.

---
# Historical receipts — superseded by the release receipt above

# Current verification — 2026-09-13, movement and portrait update

## Observed runtime
- Native no-argument `/true-focus` dispatch was observed earlier. The package remains local/unpublished; its visibility is configured unlisted.
- The existing Savi helper, not a new NPC or human body, has the moving focus avatar and `motion.js` attached.
- A fresh live read observed the helper at (19.65, 0.02, -33.81), velocity (6.01, -0.4, -3.19), `moving:true`, `route-ready`, model-ready true, and `FocusJog` playing with a resolved 6.4 s duration at speed 1.7. Earlier she stood at (-2.75, 0.02, 1.25). This establishes real movement and animation resolution, not visual fit or foot-slide quality.
- Walking begins beyond 3.2 m and stops around 2.5 m. Catch-up has separate 8 m / 4.5 m thresholds to avoid repeatedly restarting the gait at one threshold.
- One earlier creator-client read reached wardrobe ready, but the helper-client copy could not resolve its stored driver or accessories. A book refit event explicitly returned `no-active-savi-wardrobe-to-refit`. This is not a successful grip verification. Report: `f50bd04e-2497-45ec-b0d4-f1bdef95ebe0`.
- The most recent isolated capture hid the helper via the first-person body's no-camera visibility mask. Its slow CPU strip also missed the requested motion timing. It does not verify the face, grip, or stride. No substitute rendering is called a live fix.
- A console-local scratch baseline did not survive a later console read; its false comparison is discarded, not evidence of a changed human avatar. Human protection is covered by the mocked tests below; these scripts do not write the followed player's appearance or controls.

## Executed checks and export evidence
- **21 mocked unit cases**, not engine end-to-end tests: targeting, pending assets, idempotence, restoration, changed-outside-model preservation, quaternion validation, pre-readiness pose queuing, accessory-only refit, missing-driver duplicate prevention, motion cleanup, and human protection even with a helper tag.
- Package validation succeeds with the supported library import boundary. No publication was performed.
- The saved book quaternion is normalized (norm approximately 1.000000022). The old engine Euler interpretation differed from the measured attachment by about 179.432 degrees. This proves a substantial saved orientation correction, not that every live copy applied it.
- Movement export adds FocusWalk and FocusJog by combining native lower-body tracks with the reading upper body. Nodes, meshes, skins and materials are unchanged; all 39 original native clips are preserved beside the five focus clips. Upload skin checks report all five focus clips holding. Some original toy/gesture clips produce pre-existing deformation warnings; do not claim the whole native library passed, and do not play those unrelated clips during focus.

## Portrait and research
- Prepared portrait: `/cdn/value.98905faf66a25874b32491ea2e9bdcaff9f3e4a23c855627f186638b0211a5a8.png`, generated with one actual Savi fitting reference: `/cdn/value.340a1c1374136cb0f1a177aca0d5daa01d6784bcf1921cdf02e535de1b292eea.png`.
- Native chat-message and typing/prompt portrait binding is **not implemented**: there is no documented mod hook. Request `d093dc6d-44f5-427f-8063-bb2f28d181c0` tracks it. The data file is prepared metadata, not an active override.
- Opened and read: [Rotation Modes — Blender 5.2 LTS Manual](https://docs.blender.org/manual/en/latest/advanced/appendices/rotations.html), accessed 2026-09-13. It explains Euler order dependence and normalized quaternions. This is an actual web-text read.
- The attempted latest-version glTF add-on documentation URL returned HTTP 404. No website-sourced image was fetched from it. The demonstrated picture-reference flow used the supplied/exported Savi image, not a falsely claimed website image.
- Website/source-image selection, pixel inspection, provenance and supported reference inputs are documented in the guide. This is workflow, not an upgrade of the AI's underlying capabilities.

## Still open
Live mouth/stride/grip visual verification, accessory cross-client synchronization and dressed cleanup/departure/uninstall checks; native chat portrait binding. The workflow stays enabled for the conversation. No terrain, camera, human-player template, replacement chat or gameplay mode was added.

---
## Historical receipt below — superseded where it conflicts with the current checks

# Verification receipt — 2026-09-13

## Current command

The creator's final requested spelling is **`/true-focus`**. There is exactly one command file, `commands/true-focus.md`, with `name: true-focus` and `requiresArgs: false`. Its frontmatter has no argument placeholder. The guide and current README use that spelling and no task/status/stop command form.

This definition was read back from the live world and package validation accepts it. Later on 2026-09-13 the creator invoked `/true-focus` twice with no arguments, and the native host supplied this command's correct activation text each time. **Native no-argument dispatch is now observed.** That does not prove the unfinished wardrobe appeared.

## Executed checks

- `node mods/savi-true-focus/checks/runtime.test.mjs`: **13 mocked unit cases passed**. These cover explicit target requirements, human/non-Savi rejection, pending/invalid data, helper-owned spawning, duplicate prevention (including a second activation before the first spawn hook), pending-mode off, original-look restoration, preserving a newer outside model change, refusing restoration onto a human, and controller cleanup.
- The real event-driven controller received a start event targeting a human and returned `target-is-not-an-idle-savi-helper` with zero wearers.
- A separate live-handle check ran the same controller function and compared the human's model, primitive, material and scale immediately before and after in one call: **unchanged**. An earlier across-call scratch comparison was inconclusive and is not counted as proof.
- A real start event targeting Savi returned `{ok:true, enabled:true, presentation:"pending", reason:"wardrobe-assets-not-ready"}`. It created no wearer or accessory.
- A real off event cleared that test activation: `{ok:true, enabled:false, active:false, restored:false}`, enabled count **0**, controller count **1**, wearer count **0**. `restored:false` is expected here: missing assets meant no appearance was ever replaced. This is not a dressed-avatar restoration test.
- The package is valid locally and **not published**. The catalog's installed-mod list is empty; this is a local development folder, not an installed catalog release.

## Native command dispatch: observed; earlier menu staleness recorded

The creator supplied a screenshot of the current palette still showing `/True Focus` and the original `<task, status, or stop>` hint after the old definition had been removed. Changing command filenames/frontmatter and validating the package did not prove a refreshed palette. Re-running the supported `mod develop` action reported the existing folder and did not provide a refresh operation.

A platform bug was filed: **ca883b02-8ad0-459b-9105-70c04d2684b9**. Subsequently, two real no-argument `/true-focus` invocations delivered the correct command text through the native host. That confirms dispatch now works in this session; it does not prove every open palette refreshes immediately or establish why the earlier menu was stale. Ordinary-chat activation remains a fallback on other hosts. No replacement chat was built.

## Wardrobe: still in progress

At this receipt, `lib/wardrobe.json` is absent. The existing specialist lane is building the real Savi-only suit, book, focus animations, exports and proof. No second lane was started. Native posing will pause while focus clips run and the original source model will be restored afterward; the temporary focus export need not duplicate the original animation library.

The following are **not yet verified**: uploaded wardrobe URLs, live load-ready phase, rendered suit fit, hand/book contact, real reading/page-turn/thinking playback, real dressed-avatar restoration, actual departure/uninstall behavior. Do not describe any of those as passed based on the unit tests or this receipt.

The previous `review.md` is a historical static workflow review. `activation-cases.md` is the current acceptance contract, not an execution log. The wiki example's opened-source receipt is research evidence only.

The creator’s later real activation remains **enabled**, with presentation pending until the wardrobe contract lands. The earlier off event above was a completed test, not the current mode state. The source-built suit/book fitting has now been viewed in its real workshop render; that is asset-fit evidence, not an in-game animation check.
