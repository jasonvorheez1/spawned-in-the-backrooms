---
name: worldwright-codex
description: "Writing Codex entries: concept folders, independently maintainable part cards, full usable A3 pages, bounded saves and identity-preserving subdivision."
---

# Codex: concept → folder, part → card, continuation → page

## Creator correction · 2026-09-17

> "We need to correct that by having you create a main folder for a concept and sub cards for each of that subject's parts."

The earlier “one feature per card” wording did NOT mean an entire subject must remain in one
card forever. This correction supersedes that reading. A concept with multiple parts is a folder;
each independently describable or changeable part is a normal primary card in that folder.

## Plan the hierarchy before writing

1. Read the existing Codex folders and primary cards once; reuse matching identities. Find the
   seeded category that governs the concept (Features, UI, Level Design, etc.).
2. Under that category, use or create the named concept folder. This is the main folder FOR the
   concept, not a replacement Codex root or a new book.
3. List its real parts before writing the prose. Create one ordinary card per part. If a part itself
   has multiple independently maintained subparts, give it a nested folder and smaller cards.
   Choose the split by responsibility, not by arbitrary character counts or numbered “misc” cards.
4. An optional Overview card is a short orientation and ID-linked directory, not a second copy of
   every part. A genuinely single-part concept needs only its part card inside the concept folder;
   do not pad the hierarchy with empty cards.

Example, not a prescribed inventory system:

```
Codex / Features / Inventory/       ← concept folder
  Overview                         ← brief scope + links, if useful
  Capacity and stacking            ← independent part card
  Pick up and drop                  ← independent part card
  Equipment slots                  ← independent part card
  Save and restore                 ← independent part card
```

These are sibling primary cards, NOT stack alternatives, and NOT five pages of one Inventory
card. Every part must remain discoverable and eligible for normal compilation. Stacks mean
alternative versions of the SAME part; subdivision must not make other parts non-primary.
Read the overview and the relevant part plus its real dependencies, not every sibling body
on every edit. Link by saved IDs, avoid duplicated specifications and reference cycles.

## Pages belong to the part, not to the whole subject

Within one part card, use as many ordered continuation pages as its complete content needs.
A page break handles paper overflow; a new part card handles a new responsibility. Do not
turn every page into a new card, and do not append a new subsystem as “page 17” of a parent card.
Growing notes, decisions and tests go with the part they concern. A phase or overview links
those parts; it must not accumulate their entire specifications or an unbounded session transcript.

Use the full USABLE A3 body when the part has more material. Follow worldwright-paper: actual
stored format, full measured body width, headings and margins respected, natural paragraph/word
breaks, next related block fitted before starting a continuation. No inherited small-book line
budget, narrow hard-wrapped column or one tiny thought per A3 sheet. Never pad a finished thought,
repeat material or join different parts just to fill paper. The last page and a short overview may
be short. Long Codex notes use measured pages; short sections point to them, never hold overflow.

## Keep the save unit bounded

A3 capacity and serialized save size are different limits. More pages in the SAME oversized card
do not reduce that card's payload. Split the subject into parts before it grows into a giant card.
Measure the actual serialized unit used by the failing save (pages, sections, metadata and any
history/envelope overhead), not a guessed word/page limit. No universal maximum card size has
been established here; do not invent one, raise limits or claim a saving fix from paper fit alone.

Save one bounded part through the guarded repository, then read back its identity, content,
page order, links and appropriate history result before moving on. An index hold amortizes
indexing; it neither batches every SQL call into one nor makes the pass atomic. On failure,
read what actually persisted, preserve intended remaining work, and retry only missing writes.
Never shrink content, bypass history, impersonate a caller, clear saves or blindly replay creates.
The reported callerless host-history failure is a separate WWS issue, not proof of a size limit;
if that lane is not safe, retain a bounded draft and report the blocker instead of forcing it.

## Subdividing an existing oversized card

This guide changes future authoring; it does not authorize reorganizing other worlds' documents.
When the creator requests a particular subdivision:

- Read the original complete source, page order, quotes, stamps, references and primary selection.
  Plan where each block goes; do not treat a “too big” or history error as proof nothing was saved.
- Preserve the original card ID as a concise overview or the appropriate retained part so existing
  inbound links keep a meaningful target. A folder does not substitute for an existing card link.
- Write the new part cards through the supported lane and verify their content before removing
  any moved text. Keep source until all parts have read back; never destructively trim first.
- Update the overview links, verify no omitted/duplicated source and preserve original attribution,
  unresolved questions and phase stamps. Moving a question does not resolve it.
- Retain real before-values and truthful history; report partial completion. No global card rewrite,
  manuscript reflow, automatic primary switch or direct database repair follows from this rule.

## Handback check

The concept resolves to a folder, each named part resolves to a primary card, no part exists only
as an alternate, related continuation pages use the measured body, all source survives, and every
written part has a fresh readback. State exactly what was checked: a fixture is not a real-world
save or a creator-device acceptance test. No mod or world publication without a separate request.