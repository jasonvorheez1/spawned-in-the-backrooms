---
name: worldwright-paper
description: "The single Worldwright Studio physical-paper contract — actual-format width, zone capacity, ordered lossless pagination, source/notation distinctions, preflight and saved-row verification. Applies to prose, scores, imports, generated cards and migrations; never bypass line limits or silently change the creator's paper."
---

# Physical paper and lossless pagination

## Non-negotiable

NEVER exceed or ignore a page's line capacity. ALWAYS paginate overflow into ordered continuation pages. This holds for music, prose, imports, generated content and machine-readable tags. A SQL row accepting text is not proof it fits paper. Do not truncate, hide overflow in sections/JSON, collapse a book into a mega-line, shrink leading/margins, or silently enlarge the paper. Only the creator chooses a different format. A failure preserves the source and stops replacement.

`worldwright-routing` owns access, filing and the Codex lift; `worldwright-cards` owns repository operations; `worldwright-writing` owns manuscript structure; `worldwright-piano-roll` owns music. They refer here rather than maintaining independent fit recipes. Their short reminders must not weaken this contract.

## Read the actual sheet

Read `CONFIG.getBook(api,bookId).pageSpec`, including the real stored format and overrides. Resolve missing configuration before writing, not by assuming an old line count. Codex defaults to A3 (297 × 420 mm); A3 is valid for music too. An explicit format wins over that default. Do not change Research, a manuscript, or an existing score merely because another book uses A3.

`lib/pagelayout.js` owns units, dimensions, margins, header/footer bands and leading:

```js
const cfg = await CONFIG.getBook(api, bookId);
const spec = cfg.pageSpec;
if (!spec) throw Error("Resolve this book's paper before writing");
const geometry = PL.toPx(spec);
const capacity = PL.zoneCapacity(spec);
const fit = PL.zoneFit(content, spec, "body");
```

These are real exports, but this snippet does not measure width or write anything. `zoneFit` reports capacity/used/remaining/over/ok from Markdown-weighted SOURCE lines. It is NOT a soft-wrap/line-width detector. One enormous line can pass it and still overflow visibly.

## Width first; then height

Use the chosen sheet's usable width and the renderer's font/size, not a universal character column. Preserve explicit line breaks and paragraph/Markdown structure. Wrap at whole-word boundaries; move complete reference tokens rather than splitting their identifiers. A heading, table or code block may use different typography and needs its own width check. Do not flatten Markdown into plain prose to gain space.

For score source, `lib/score-width.js` supplies `usable(spec)`, `width(text)`, `fits(text,spec)`, `wrap(text,spec)` and `appendTag(lines,tag,spec)`. It estimates the paper's source face conservatively; it is not a general Markdown layout engine. Ordinary plain-body text in that face may use it as a conservative width check. Headings, tables, images and other rendered blocks still require their actual layout to be checked.

A width-valid block must also pass `PL.zoneFit` in the intended band. Check body, header AND footer; a valid body does not excuse an overflowing header. Empty bands are legal. A word/field wider than the available width is a named refusal, not a reason to cut an id or invent a wider sheet. Do not let an error message suggesting wider paper authorize changing the creator's choice.

## Use the full usable A3 page — not a narrow column or tiny fragments

For Codex notes, load `worldwright-codex` too: a concept folder contains its independent part
cards; pages are continuation within one part. Read the actual A3 configuration, then use its
whole body width and available body height. Do not inherit the default small book's line budget,
wrap at an arbitrary character column, or start a page for each short heading or note.

While related material remains, try the next paragraph/block against the CURRENT page first.
If it does not all fit, move a sensible paragraph boundary or fit complete lines/words before
continuing; keep a heading with its following text. A continued page with substantial unused
space needs a real reason (an indivisible block, an authored break, or an actual size constraint),
not habit. Check `used`, `capacity` and `remaining`, not just `ok`, after width-aware layout.
A finished part, a short overview and the final page may be short: never pad, repeat yourself,
compress typography or merge independent subjects just to make a sheet full.

The short NOTES-section limit does not shrink an A3 page's body. Long Codex notes and quotations
use measured pages in their owning part; leave a short section pointer. More pages in the same
oversized card are not a save-size fix. Measure the serialized save unit separately and subdivide
parts before growing an umbrella card; no universal safe byte or page limit is claimed here.

## Prose: preflight the whole sequence

1. Read existing pages and their reading order. Keep their ids, titles, reference targets and authorship where possible.
2. Wrap using the actual width and preserve syntax. Fill related content across the current usable body before starting a continuation; split near a paragraph boundary, otherwise at a complete line or word. No content is dropped to get a green measure.
3. Measure every proposed body/header/footer before the FIRST content replacement. Include continuation titles/headers in those measurements.
4. Write through `CARDS` with the normal access/conflict discipline. `createPage(...,{afterId:<previous-page>})` maintains order. Never hand-edit storage to bypass the pen, history, index or write fence. Do not claim a generic multi-page operation is atomic unless its implementation is.
5. Read back every affected page after writes settle. Check text, order, ids and all zone fits again. Compare complete source content across the sequence, allowing intended line breaks only. A partial failure is reported and remaining work is preserved—not disguised as completion.

Sections remain short metadata/beats or defined machine sections such as Set/Body. They are not overflow storage for pages. The same contract applies to Encyclopedia imports and Codex notes, not just manuscripts typed by a human.

## Scores: use the existing lossless paginator

Do not manually chunk note counts, take only the active page, or paginate by the viewport. Use `lib/sound-document.js`:

```js
const prepared = PAGES.paginate(data, spec);
const joined = PIANO.document([], prepared.pages);
if (joined.error) throw Error(joined.error);
for (const page of prepared.pages) {
  for (const zone of ["header", "body", "footer"]) {
    const text = zone === "body" ? page.content : page[zone] || "";
    if (!PL.zoneFit(text, spec, zone).ok) throw Error("Paper overflow");
    if (!WIDTH.fits(text, spec)) throw Error("Source width overflow");
  }
}
```

Here PAGES/PIANO/PL/WIDTH mean the existing package's piano-pages/pianoroll/pagelayout/score-width modules, not new helper files. The example is pure preflight and never replaces saved pages.

The paginator packs consecutive tags where they fit and wraps a chord without splitting it across pages. It retains complete `Part: n/total` numbering, common global beats, matching tracks/sample declarations and first-header settings. It checks canonical notes, pauses and clip descriptors against the source. The authoring pass must ALSO preserve first-header settings, unrelated header/footer text and source attribution; the paginator cannot know the saved manuscript's extra text.

Compare combined notes (pitch, at, hold, velocity, track, fade, trigger), pauses, tempo/settings, track order, instrument/sample identity and total span. A matching count alone is not equivalence. Use the guarded score save/reflow lane when editing existing content. `paper-format.js` preflights format changes; `roll-track-save.js` owns matching-track changes across the complete score. A skill refresh never authorizes running a reflow on someone's music.

## Source paper, notation and continuous roll

Piano Paper is landscape A3 with no footer. It allocates four grand-staff systems per notation sheet. Do not remove a nonempty saved footer silently when changing formats; it must be relocated with the author's intent or the change refused.

Source pages contain readable tags; notation sheets are derived engraving; the editor is a continuous score viewport. Their page counts need not match. Visible neighboring source pages load together, including held tails/rests. Offscreen visual payloads may unload while drafts and scheduled audio remain intact. A musical tie across systems is not a new note.

Never publish an old example's page count as current truth. Measure the actual card/format and prove unchanged musical content whenever it is reorganized.

## Done means read back, not just written

Use pure preflight fixtures for normal/A3/Piano Paper, narrow sheets, wrapped tags, multi-tag lines, header overflow, independent holds, sample declarations and long unbreakable fields. Assert refusal preserves source. Use measured rendered layout for typography that the source-width estimator cannot establish. Then read all saved pages, not a single successful first page. `worldwright-maintenance` names the surrounding draft, Undo and audio regressions.