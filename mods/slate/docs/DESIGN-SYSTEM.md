# Slate OS: Design System & Human Interface Guidelines

**Version:** 1.1 · 2026-10-01 · the single source of truth for every pixel Slate draws
**Scope:** the shell, home, pocket and orb, and every app in it: Planner, Roadmap, Loom, Workbench, Studio, Settings.
**Out of scope:** what any one app's screens look like. This document sets the laws app screens are built from, not the screens themselves.

> Slate is a quiet instrument held up against a loud world.
> Its geometry exists to make it calm. It is not there to make it mystical.

---

## 0. How to read this document

- **MUST / MUST NOT** are law. A screen that breaks one has a bug.
- **SHOULD / SHOULD NOT** are strong defaults. Breaking one needs a reason in a code comment beside it.
- **Every number has a generator.** Each value in this document comes from one of the generators in Appendix B: φ and its powers, the Fibonacci sequence, the φ half-step series, Lucas numbers, the golden angle, √2, √3, √5, the Major Third (1.25), or the CSS reference pixel. A value in code that can't be traced to a generator is drift (§5.3).
- **Human floors beat geometry.** When a human limit (touch size, contrast, legibility, gesture timing) conflicts with a harmonic number, the human limit wins, and the code uses the next harmonic value *above* it. Geometry serves usability. It never overrides it.
- **Measured, not asserted.** Claims about how Slate renders today (sizes, contrast, ratios) were measured from the working copy's code on the date above. Appendix C shows how each one was measured.

---

## 1. Core philosophy & geometric harmony (the why)

### 1.1 Spatial context

#### Where Slate lives

Slate is a **screen-space** overlay: HTML composited over the 3D frame and anchored to the viewport, not to a point in the world. It is a tablet you *hold*, not a monitor you walk up to. Today it is a fixed element at `z-index: 40` that sits under Spawn's own right rail (`--spawn-chrome-reservation-right-inset`, 50 px) and never covers it.

| Anchoring | Use in Slate | Why |
|---|---|---|
| **Screen-space** (default) | The tablet, pocket tab, orb and every app | Text stays sharp at any camera distance or angle, never clips into geometry, and stays readable wherever the body stands. |
| **World-space** (reserved) | Future in-world projections, such as a board pinned to a cabin wall or a hologram over a station | Only for glanceable, low-density content, never for editing. Sized with the camera formula below. |

#### Viewing distance and angular scale

Legibility is a **visual angle**, not a pixel count. CSS defines its reference pixel *angularly*: 1 px subtends **0.0213° ≈ 1.28 arcmin** at arm's length. Browsers and OSes scale device pixels toward that angle, so CSS px sizes hold roughly constant angles across phone, tablet and desktop.

| Token | px | em angle | cap height (≈ 0.70 em) |
|---|---|---|---|
| `--t-meta` | 10.5 | 13.4′ | 9.4′ |
| `--t-body` | 13 | 16.6′ | 11.6′ |
| `--t-title` | 16 | 20.4′ | 14.3′ |
| `--t-head` | 21 | 26.8′ | 18.8′ |

Body text at 13 px matches desktop OS UI conventions (macOS and Windows controls). It sits below the ISO 9241-303 cap-height guidance (≥ 16′) for *sustained reading*, so:
- **Dense UI** (cards, rows, fields) uses `--t-body` 13.
- **Sustained reading** (Loom pages, ticket notes, docs) MUST use `--t-prose` 16 (the title size at prose line-height 26) as its prose size. That puts cap height at 14.3′, as close to the guidance as one tablet can get without breaking density.
- **Metadata** MUST NOT go below 10.5 px, and MUST NOT carry anything the user has to act on.
- **The user's zoom is real.** The reference creator's browser runs at 0.9×, so 10.5 px meta is drawn at about 9.5 px. This is one more reason the meta floor is a floor.

#### World-space panels (reserved)

World-space text is seen *through the game camera*, not by the eye directly. Its on-screen size is:

```
screen_px = text_mm / distance_mm × viewport_height_px / (2 · tan(fov_v / 2))
```

To match `--t-body` (13 screen px) with Starbloom's camera (vertical FOV 70°) at a 1110 px tall viewport, text needs **≥ 16.4 mm per metre of distance**. At 1.2 m that is a 20 mm em, which is **20 px on a 1 px = 1 mm panel**. World-space panels MUST be sized with this formula against the *smallest* viewport they should support (phone portrait), not the largest.

#### The world behind the glass

Slate sits over a scene it doesn't control: Starbloom's warm cabin at hour 0, a noon sky in another world, fx streaks across a third of the frame. Every text-bearing surface MUST stay legible over both the **brightest** and the **darkest** frame the world can draw. §2.4.3 makes this measurable, and Appendix C shows it failing today.

### 1.2 Primary axioms

1. **Deference to content.** Chrome stays quiet so content can be loud. The shell carries no colour except the focal accent of the current view. A card's title MUST outrank every badge on it.
2. **Harmonic proportion.** Every size relates to its neighbours through a generator ratio. Steps are big enough to read as distinct and small enough to read as one family.
3. **Ergonomic coherence.** The same intent gets the same shape, size and place in every app: home, back, the omni bar, a destructive action. A user learns Slate once.
4. **Functional purity.** No geometry is decorative. A golden section that places nothing is removed. Sacred geometry decides *where things go and how big they are*. It never decides *what pattern sits behind them*.
5. **Calm under density.** A board with 200 cards MUST feel calmer than a home screen with six icons feels busy. Density is solved with rhythm (one repeated interval) and hierarchy (one focal point per region), never by shrinking.
6. **The world comes first.** Slate opens and closes within `--d-4` (377 ms), never blocks a frame, and gives the world back the moment it's tucked.

### 1.3 Sacred geometry as a functional framework

Natural proportions are used because they *do work*:

| Principle | Job in Slate |
|---|---|
| **φ self-similarity** | A φ rectangle minus its square is another φ rectangle. A layout can subdivide recursively (shell → content → pane → card) with every level sharing one shape. This is *visual resonance*. |
| **Fibonacci steps** (spacing) | Neighbouring steps differ by about φ: far enough apart to look intentional, close enough to belong together. This removes the "10 or 12?" ambiguity that makes interfaces look accidental. Each step is also the sum of the two below it (13 = 5 + 8), so nested spacing always adds up to a token. |
| **φ half-steps** (component sizes) | Interleaving × √φ between Fibonacci values gives a finer series (21, 27, 34, 44, 55…) for heights and widths. The human 44 px touch floor turns out to be a native member (43.3), not an exception. |
| **Golden section** (0.618 / 0.382) | A frame's optical centre sits above and off its geometric centre. Focal elements placed on golden lines balance optical weight without symmetry. |
| **Golden angle** (137.5°) | Hue stepping and orbital placement. Successive picks never cluster, the same way leaves avoid shading each other. |
| **√2** | Halving keeps the ratio. Used for media that reflows between 1 and 2 columns. |
| **√3** | Equilateral / hexagonal. Used for the phone frame and hex node lattices. |
| **√5** | The diagonal of a 1 : 2 frame. Used for wide strips and timelines. |
| **Concentric circles** | Equal focus from a centre. Used for nested corner radii, radial tools and the orb. |

**Visual calm in high-density work** comes from three of these working together: one interval repeated (rhythm), one shape repeated at every scale (resonance), and one focal point per region (weight).

### 1.4 Interaction paradigm

Slate has three input bodies and one mental model: *the finger is the cursor is the ray.*

| Body | Where | Model |
|---|---|---|
| **Pointer** | God mode, desktop play | Hover reveals, click commits. Opening Slate releases pointer lock (`data-modal`); tucking it relocks. |
| **Direct touch** | Phone and tablet | No hover. Every hover-only affordance MUST have a visible touch equivalent. |
| **Raycast** (reserved) | World-space panels | The pointer ray hits the panel. Same states as pointer, with touch-sized targets. |

**Gesture thresholds.** Every value is a generator value at or above the human or platform norm cited.

| Gesture | Threshold | Norm it clears |
|---|---|---|
| Tap vs drag, pointer | movement < **5 px** | — |
| Tap vs drag, touch | movement < **8 px** | Android touch slop 8 dp |
| Long-press | **377 ms** held, < 8 px drift | Above the ~300 ms tail of deliberate taps; quicker than the 400–500 ms platform defaults |
| Double-tap window | **377 ms** | Android 300 ms. Allowed only where single-tap does nothing or only selects, so no single-tap waits on it |
| Swipe commit (Review deck) | travel ≥ **38.2 %** of card width **or** release velocity ≥ **0.618 px/ms** | iOS flick ≈ 0.5 px/ms |
| Swipe cancel | release below both → spring back (`--e-spring`) | — |
| Radial dead zone | radius **21 px** | — |
| Radial vs tangential | within **±30°** of the radius is radial (pick a ring); otherwise tangential (scrub within the ring) | 30° is half of a hexagon's 60° sector |
| Edge-swipe home | starts within **13 px** of the tablet's bottom edge | — |
| Touch hit area | ≥ **44 px** (φ half-step 43.3) | Apple HIG 44 pt |
| Pointer hit area | ≥ **27 px** (φ half-step 26.8) | — |

**Scroll physics.** Slate uses native momentum scrolling and MUST NOT hijack the wheel or touch scroll. Horizontal regions (Planner columns, the project bar) snap to column starts with `scroll-snap-type: x proximity`, never `mandatory`, so a fast flick is never fought. Scrollbars are 5 px thumbs in `--c-line`, widening to 8 px on hover (the creator's standing ask: minimal, never bright white).

---

## 2. Foundations & geometric design tokens (the what)

### 2.1 The proportional system

#### 2.1.1 Aspect ratios and viewports

| Frame | Ratio | Size (px) | Use |
|---|---|---|---|
| **Tablet, default** | φ : 1 | **987 × 610** | God-mode tablet |
| **Tablet, large** | φ : 1 | **1220 × 754** (2 × 610, 2 × 377) | Large preset; clamped to the viewport minus the rail |
| **Tablet, compact** | φ : 1 | **610 × 377** | Docked or side-by-side with play |
| **Fullscreen** | viewport − rail − 2 × `--s-5` | — | Planner and Workbench in fullscreen; internal splits stay golden (§2.1.2) |
| **Phone** | 1 : √3 | **360 × 623** | Pocket / phone layout |
| **Media / shot** | √2 : 1 | width-driven | Ticket shots, gallery tiles |
| **Card cover** | φ : 1 | height = width ÷ φ | Planner card cover image |
| **Strip / timeline** | √5 : 1 | height-driven | Flow strip, Roadmap lanes |
| **Icon tile** | 1 : 1 | 55 | Home launcher |

Users MAY resize freely. The presets are where the resize grip snaps (within 8 px), and where every layout MUST look its best. Free sizes still lay out correctly; they just aren't the reference.

*Today:* the desktop default is 1120 × 720 (1.556 : 1) and the phone is 360 × 620 (1 : 1.722, within 0.6 % of √3). See §5.3.

#### 2.1.2 The modular grid

**Spacing is Fibonacci, and nothing else:**

| Token | px | Typical job |
|---|---|---|
| `--s-0` | **1** | hairline separators only |
| `--s-1` | **2** | optical nudges of icons; segment inset and focus-ring offset only |
| `--s-2` | **3** | badge inner padding |
| `--s-3` | **5** | inside a control (icon ↔ label); chip gap; launcher label gap |
| `--s-4` | **8** | between sibling controls; between cards in a column; card's internal gap |
| `--s-5` | **13** | card padding, field padding-x, screen content padding, column padding |
| `--s-6` | **21** | column gutters, section gaps, lane gaps |
| `--s-7` | **34** | region separation |
| `--s-8` | **55** | hero spacing |
| `--s-9` | **89** | empty-state padding |

**Component sizes use the φ half-step series** (13 · φ^(n/2), rounded):

| Token | px | Typical job |
|---|---|---|
| `--h-1` | 17 | inline icon, small avatar |
| `--h-2` | 21 | badge, compact icon button (visual), home pill |
| `--h-3` | **27** | chips, fields, segmented controls, omni bar (pointer hit floor; on touch the hit area extends to 44) |
| `--h-4` | **34** | app bar, dock, bezel row, disclosure rows |
| `--h-5` | **44** | touch rows, touch buttons (touch hit floor) |
| `--h-6` | 55 | launcher tiles, primary buttons in a deck |
| `--h-7` | 70 | large touch actions |
| `--h-8` | 89 | collapsed rails, avatars in a header |
| widths | 144 · 183 · 233 · 297 · 377 | menus (183), sidebars (233), flyouts (297), sheets (377) |

**Laws:**
- **Group rule:** a container's padding MUST be one spacing step larger than the gap between its children (card: padding 13, gap 8; column: padding 13, card gap 8). Columns on a screen are peer regions and follow the peer rule below. This is what makes a group read as a group.
- **Peer rule:** gutters between peer regions MUST be one step larger than the padding inside them (columns 21 apart, 13 inside).
- **Centering in bars:** a control sits centred in its bar. The inset is derived as `(bar − control) ÷ 2` and is never tokenised separately. (34 bar, 27 control → 3.5 px inset.)
- **Golden subdivision:** a region splits **0.618 / 0.382** (primary / secondary). Two-pane screens (ticket view, settings, Workbench detail) use this split. A third pane recurses on the smaller side (0.382 → 0.236 / 0.146).
- **Sidebars** are **233 px**, collapsible to a **34 px** rail. On the 987 px tablet that is exactly W ÷ φ³.
- **Responsive boundaries** (container queries on `slate` width): **377**, **610**, **987**, **1597**. Below 610, two-pane screens collapse to one; below 377, phone layout.

### 2.2 Typographic scale & rhythm

**Two ratios, one system.** Sizes *below* body step by the **Major Third (1.25)**, because dense UI needs fine steps. Sizes *above* body step by **φ**, because hierarchy needs unmistakable jumps. 16 px (13 × 1.25) is the one Major-Third step above body, kept for titles and prose.

**Line height = size × (1 + φ⁻ᵏ)**, with k chosen by density. Tight k = 3 (×1.236) for display and meta, UI k = 2 (×1.382), prose k = 1 (×1.618). Rounded to whole pixels.

| Token | Size | Generator | k | Line-height | Tracking | Weight | Use |
|---|---|---|---|---|---|---|---|
| `--t-hero` | **55** | 34 × φ | 3 | 68 | `--tr-tight` | 200 | Big numerals: clock, flow stats |
| `--t-display` | **34** | 21 × φ | 3 | 42 | `--tr-tight` | 600 | Home title, empty-state headline |
| `--t-head` | **21** | 13 × φ | 2 | 29 | `--tr-tight` | 600 | Screen title, ticket title |
| `--t-title` | **16** | 13 × 1.25 | 2 | 22 | 0 | 600 | Section and column headers |
| `--t-prose` | **16** | = title | 1 | 26 | 0 | 400 | Sustained reading (Loom, notes) |
| `--t-body` | **13** | base | 2 | 18 | 0 | 400 / 500 | Card titles, fields, list rows |
| `--t-meta` | **10.5** | 13 ÷ 1.25 | 3 | 13 | `--tr-meta` | 400 / 500 | Ages, counts, ids, timestamps |
| `--t-mono` | **10.5** | = meta | 3 | 13 | 0 | 400 | Ticket ids, coordinates, versions (`ui-monospace`) |
| `--t-caps` | **10.5** | = meta | 3 | 13 | `--tr-caps` | 600 | Uppercase labels ("WHAT'S HAPPENING") |

**Tracking** is in em and comes from powers of φ: `--tr-tight` −0.021 em (φ⁻⁸), `--tr-meta` +0.021 em (φ⁻⁸), `--tr-caps` +0.146 em (φ⁻⁴), `--tr-mark` +0.236 em (φ⁻³, the SLATE wordmark only).

**Weights:** 400 (text), 500 (emphasis), 600 (titles). 200 is reserved for `--t-hero` numerals and the wordmark. 700 and 800 aren't used: in a theme-swappable shell, weight steps above 600 render inconsistently across the font choices in Settings.

**Rhythm.** Component *heights* carry the rhythm, not line-heights. Every row, chip, bar and button snaps to an `--h` token, and every gap to an `--s` token. Text centres inside them. Example: a one-line card is 13 + 18 + 8 + 13 + 13 = **65** tall (padding + body + gap + meta + padding). Its minimum height is set by the card proportion law (§3.3), not by the text.

**Prose measure:** 55 characters target, 76 maximum (Lucas L₉, the nearest integer to φ⁹).

**Faces.** A user's font choice (Settings → Fonts) changes the family only. Sizes, weights, line-heights and tracking in this table MUST NOT change with font choice. Fun fonts MUST be checked at `--t-meta` before they ship.

### 2.3 Elevation, z-stack & concentric depth

Depth is four concentric planes. Each sits one ring further from the world and one ring closer to the user's focus. Edge light, shadow and blur all step by powers of φ.

| Level | Plane | Members | Edge light (inset 0.5 px white) | Fill | Backdrop blur | Shadow |
|---|---|---|---|---|---|---|
| **Z0** | Canvas | The tablet screen | **9.0 %** (φ⁻⁵) | `bg` | per theme, 0 – 34 | none |
| **Z1** | Surface | Cards, fields, columns, rows | **14.6 %** (φ⁻⁴) | `panel` | 0 | `0 2px 8px` black **23.6 %** (φ⁻³) |
| **Z2** | Flyout | Menus, popovers, the customize panel, tooltips | **23.6 %** (φ⁻³), top edge 1 px at 38.2 % | `panel` + 1 lightness step | **13** | `0 8px 21px` black **38.2 %** (φ⁻²) |
| **Z3** | Focal | Modals, lightbox, Review deck, confirm sheets | **38.2 %** (φ⁻²), top edge 1 px at 61.8 % | `panel` + 1 step, with scrim | **21** | `0 21px 55px` black **61.8 %** (φ⁻¹) |

**Laws:**
- Elevation reads through **edge light** first and shadow second: each level's hairline is brighter than the one beneath it, like glass catching more light as it comes closer.
- **One Z3 at a time.** When a Z3 opens, Z0–Z2 dim under a scrim of **38.2 %** black on desktop and **61.8 %** on phone.
- **Stacking order in the page:** inside the tablet, Z0–Z3 map to local `z-index` 0–3. In the page, the tablet sits at `--zi-tablet` **34**, and system overlays that escape it (lightbox, toasts, drag ghosts) at `--zi-system` **89**. Nothing uses 99999.

**Concentric radii.** A child that sits *in its parent's corner* takes `r_child = r_parent − inset`, so the corners share one centre like rings. A child inset by its parent's radius or more is out of the corner's reach and takes its own token.

| Token | px | Use |
|---|---|---|
| `--r-1` | **3** | badges (a focus ring takes r + 2, §4.3) |
| `--r-2` | **5** | chips inside cards, tags |
| `--r-3` | **8** | cards, fields, inline controls |
| `--r-4` | **13** | the screen (Z0), columns, flyouts (Z2) |
| `--r-5` | **21** | the tablet shell, modals (Z3) |
| `--r-6` | **34** | the phone frame only (its corner matches a phone's own, ≈ 5.5 % of height) |
| `--r-pill` | height ÷ 2 | chips and buttons of fixed height |

Worked chain: shell **21** − shell inset 8 = screen **13** (concentric). The screen's content padding is 13 ≥ 13, so columns are out of reach and take their own **13**. Cards are inset 13 inside a column, out of reach, own token **8**. A cover image flush in a card's top corner (inset 0) takes **8** on its top corners. A chip inside a card's padding takes its own **5**.

### 2.4 Color, light & radial harmonization

#### 2.4.1 Functional tokens: the nine roles

Slate's colour system already exists in `lib/themes.js`: every app draws in the house tones, and a theme remaps each **role** while keeping the small shade steps inside it. The spec names the roles as tokens. A colour is named by its **job**, never by its hue.

| Token | Role | House value (Starbloom Brass) | Job |
|---|---|---|---|
| `--c-bg` | `bg` | `#0d1522` | Z0 canvas and wells |
| `--c-panel` | `panel` | `#1a2b3d` | Z1–Z3 surfaces |
| `--c-bezel` | `bezel` | `#22262b` | Shell frame |
| `--c-line` | `line` | `#2c3b4c` | Structural hairlines, dividers, scrollbars |
| `--c-ink` | `ink` | `#d9e0d9` | Primary text |
| `--c-dim` | `dim` | `#8a9aa0` | Secondary text |
| `--c-accent` | `accent` | `#a37d45` brass | **The focal accent:** selection, primary action, focus |
| `--c-soft` | `soft` | `#ffd79a` | Text on or beside the accent; highlights |
| `--c-glow` | `glow` | `#53d9e5` | Live and system signals: LED, active, "now" |

**Status tokens** are theme-invariant in hue but **polarity-aware**:

| Token | Dark polarity | Light polarity | Job |
|---|---|---|---|
| `--c-danger` | `#ff453a` | `#d70015` | Blocked, urgent, destructive |
| `--c-warn` | `#ff9f0a` | `#c93400` | Aging, high |
| `--c-caution` | `#ffd60a` | `#a05a00` | Medium |
| `--c-ok` | `#30d158` | `#248a3d` | Approved, done |
| `--c-info` | `#64d2ff` | `#0071a4` | Informational, low |

A theme is light-polarity when its `bg` is lighter than its `ink`.

**User-defined colours** (ticket types, priorities, project dots from Planner → Customize) are data, not tokens. They MUST appear only as **dots (8 px), bars, or 3 px edges**, never as card fills or text colour, so a board stays calm whatever palette the user picks.

#### 2.4.2 Radial harmonization

- On the OKLCH hue wheel, the theme's `accent` sets **0°**. Status colours sit where meaning puts them (red, amber, green). *Decorative* secondary hues (theme tints, default project dots) step by the **golden angle, ±137.5°**, from the accent hue, so successive picks never cluster.
- **Chroma budget:** surfaces ≤ 0.02, text ≤ 0.02, accent and status 0.12–0.20. **One** high-chroma element per region.
- **Lightness order:** every theme MUST keep the order `bg < panel < line < dim < ink` for dark polarity, and its exact reverse for light polarity. `themes.js`'s shade-step remap preserves this whenever the role values do.

#### 2.4.3 Contrast and legibility over a 3D world

| Pair | Minimum | Standard |
|---|---|---|
| `ink` on any surface | **7 : 1** | WCAG AAA body |
| `dim` on any surface | **4.5 : 1** | WCAG AA |
| `accent` or `soft` used as **text** | **4.5 : 1** | WCAG AA |
| Status, user colours, focus ring and control borders vs neighbours | **3 : 1** | WCAG 1.4.11 non-text |

**The glass law.** The Glass setting makes the tablet see-through. That is the creator's intent ("glass should make it see through not white"), and the frame and canvas MAY go fully transparent. But blur doesn't change a backdrop's *average* brightness, so contrast is decided by the opacity of the surface *under the text*:
- A text-bearing surface MUST keep an effective opacity ≥ **0.910** (1 − φ⁻⁵). Measured across all nine shipped themes, `ink` holds 7 : 1 over both a white and a black world from .87 up (Appendix C); .910 is the next φ value above it.
- `dim` text MUST sit on a surface ≥ **0.966** (1 − φ⁻⁷), or be promoted to `ink` while glass is on.
- Glass therefore lives on `bg`, `bezel` and the gaps between surfaces. That is exactly where see-through reads as glass, while the cards stay quietly solid.

**Polarity.** Slate defaults to dark polarity, because 3D worlds are mostly mid-to-dark and a bright panel would bloom over the scene. A light theme MUST use the light-polarity status set, and MUST raise its surface opacity under glass rather than lowering its text weight.

Text MUST NOT sit directly over live video, snow, leaves or the world. It sits on a Z1 surface or a scrim.

---

## 3. Sacred component geometry & schemas

### 3.1 Shell & window primitive

```
┌──────────────── tablet  φ : 1 · r 21 · Z1 frame in --c-bezel ────────────────┐
│ bezel 34   ● LED   SLATE ─────────────────────────   stats   ⟲  ◉  ▭  ⇤      │ ← grab anchor: the whole bezel row
│ ┌──────────────── screen  r 13 (= 21 − 8, concentric) · Z0 ─────────────────┐ │
│ │ app bar 34    ← back   Title                                actions       │ │
│ │ ───────────────────────────────────────────────────────────────────────── │ │
│ │                                                                           │ │
│ │     content region · padding 13 · splits 0.618 / 0.382                    │ │
│ │                                                                           │ │
│ │ ───────────────────────────────────────────────────────────────────────── │ │
│ │ dock 34     (only when an app has sub-tabs)                               │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│                                ( home 21 · hit 34 )                     ◢ 21  │
└───────────────────────────────────────────────────────────────────────────────┘
  shell inset 8 on the sides and between bezel and screen · 34 below the screen for home
```

| Part | Size | Law |
|---|---|---|
| Shell inset | **8** at the sides and between bezel and screen; **34** below the screen | the 34 band holds the home button and grip |
| Bezel row | `--h-4` **34** | The whole row is the drag anchor. Its buttons stop propagation and are 21 visual / 27 hit (44 on touch) |
| App bar | `--h-4` **34** | Back on the left. With no back, the title sits on the left golden line (38.2 %) |
| Dock | `--h-4` **34** | Max 5 items, centred on equal sectors |
| Home button | **21** visual, **34** hit (**44** on touch), centred in the bottom band | Same place in every app, always |
| Home LED breath | between **23.6 %** (φ⁻³) and 100 % brightness, period `--d-loop-2` (2584 ms) at speed 1×; colour and speed are user settings | The floor honours "never lower than like 20 %" |
| Resize grip | **21** square visual, **27** hit (**44** on touch), bottom-right | Snaps to the presets in §2.1.1 |

**Fullscreen apps** (Planner, Workbench) fill the whole screen with their content: they drop the content padding to 0 and let their own panes carry it. The screen's r 13 still clips them, and the app bar stays. "Fullscreen" means *fills the Slate screen edge to edge*. A separate shell-level control may also expand the whole tablet to the Fullscreen frame (§2.1.1); the two are different controls.

### 3.2 Navigation & spatial organization

| Pattern | Geometry | Use |
|---|---|---|
| **Orthogonal grid** | tiles 55, gutter 21, label gap 5 under the tile; columns = ⌊(W − 2·21 + 21) ÷ (55 + 21)⌋ | Home launcher |
| **Orbital ring** | items on a circle of radius **89** (collapsed orb menu) or **144** (expanded), item *i* at 360° · i ÷ n from 12 o'clock; when n is open-ended, at i · 137.5° | The play-mode orb |
| **Hexagonal lattice** | cell width w, row step w · √3 ÷ 2, odd rows offset w ÷ 2 | Workbench asset nodes, Studio box-set wall |
| **Segmented control** | equal-width segments, `--h-3` 27 tall, inset 2, `--r-pill` | View switches, board grouping. Max 5 segments |
| **Sector switcher** | n equal sectors around the 21 px dead zone; pick by angle | Radial tools (§3.4) |
| **Chip rail** | chips `--h-3` 27, padding-x 13, gap 5, horizontal scroll, no wrap | Filters, projects |

**Laws:**
- Navigation and filtering MUST look different: navigation is a segmented control or dock, filtering is chips.
- Peers at one level SHOULD number 3, 5 or 8. More than 8 peers become a list or a search.
- Selection is `accent` fill with `soft` text, never a second accent colour.
- A control that *changes the view* (grouping, layout) and a control that *configures the data* (columns, types, priorities) MUST NOT share a shape. Configuration lives behind one Customize entry in the app bar.

### 3.3 High-density productivity surfaces (Planner and Roadmap)

**Column:** Z1, `--r-4` 13, min-width **233**, padding 13, gutter 21. Header `--h-4` 34 (title `--t-title`, count `--t-meta`, WIP limit right-aligned). Cards 8 apart.

**Card:** Z1, `--r-3` 8, padding 13, internal gap 8.

```
┌──────────────────────────── card width w ────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓ cover: w × w/φ, flush, top corners r 8 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  optional
│ ┃ ● Title of the ticket, up to two lines at 13 / 18             ◆   │  ◆ focal node at the top-right golden point
│ ┃                                                                   │
│ ┃ meta 10.5 · age · project                              avatar 17 │
└──────────────────────────────────────────────────────────────────────┘
  ┃ = 3 px type edge (optional)    min-height = w ÷ φ²  (≈ 79 at w = 207, the card inside a 233 column: 233 − 2 × 13)
```

| Element | Rule |
|---|---|
| Proportion | Collapsed card min-height = **w ÷ φ²**. A cover is **w × w ÷ φ** |
| Title | `--t-body` 500, max 2 lines, always the heaviest thing on the card |
| Focal badge (priority) | **One** glyph, 13 px, at the card's top-right golden point. Never more than one focal badge per card |
| Type | an 8 px dot before the title, or a 3 px left edge. Never a filled pill |
| Meta row | `--t-meta` in `dim`, max 3 facts separated by ` · ` |
| Blocked | 3 px `--c-danger` edge and "blocked" in the meta row. Never a red fill |
| Aging | Heat shows on the edge only, from `--c-warn` at the threshold to `--c-danger` at 2× |

**Swimlanes:** lane header `--h-4` 34, lanes 21 apart, every lane on the same column template so the eye crosses lanes in one beat. A lane with no visible cards under a filter MUST hide.

**Omni bar:** `--h-3` 27 tall, max-width **377**, one field for search and creation (`!add …` quick-creates, `!new` opens the full form). It shows its mode (search vs create) on its own edge only: `line` for search, `accent` for create.

**Full ticket view:** splits 0.618 (content: title, notes, shots) / 0.382 (fields: column, type, priority, project, blocked, links). Every field a card can show is editable here.

**Flow strip** (WIP, throughput, cycle time): a √5 strip, values in `--t-head`, labels in `--t-caps`.

**Review deck:** a Z3 card **377** wide, `--r-5` 21. The card beneath is at scale **0.944** (1 − φ⁻⁶), offset 13 down. Secondary actions (defer, undo) are **44**, primary (approve, send back) are **55**.

### 3.4 3D creation & tooling surfaces

Tools frame the work. They never sit on it.

```
┌────────────────── viewport: the golden region (0.618 of width) ─────────────┐┌── inspector 233 ──┐
│                                                                             ││ ▸ Transform        │
│                          the work stays in here                             ││ ▸ Material         │
│                                                                             ││ ▸ Physics          │
│            ◯ radial dial · rings 34 / 55 / 89 · dead zone 21                ││                    │
└─────────────────────────────────────────────────────────────────────────────┘└────────────────────┘
```

| Element | Geometry |
|---|---|
| **Radial / concentric dial** | Rings at radii **34, 55, 89**: inner = mode, middle = tool, outer = parameter. Dead zone 21. Opens centred on the pointer, clamped so the outer ring stays on screen. Ring selection is radial movement, scrubbing within a ring is tangential (§1.4) |
| **Inspector** | 233 wide, collapsible to a 34 rail. Sections are 34-tall disclosure rows, and open sections indent 13 |
| **Isometric layout nodes** | Hex lattice (§3.2) projected at 30°. Nodes 55, links in `--c-line`, selection a 2 px `accent` ring |
| **Viewport rule** | The working object's bounds MUST stay inside the golden region left after removing tool columns. A panel that would cover it collapses to its rail first |
| **Media lightbox** | Z3, image fitted inside the viewport at √2 or its own ratio, close at top-right (44 hit), arrows at the golden lines of the side edges. Every image Slate shows MUST open in it |

---

## 4. Motion, kinetics & temporal physics (the how)

### 4.1 Motion curves

**Durations are Fibonacci milliseconds:**

| Token | ms | Use |
|---|---|---|
| `--d-1` | **89** | hover, colour change |
| `--d-2` | **144** | press, toggle, chip select; the reduced-motion crossfade |
| `--d-3` | **233** | menus, flyouts, a card moving columns |
| `--d-4` | **377** | sheets, modals, the tablet opening and closing |
| `--d-5` | **610** | background crossfade |
| `--d-loop-1` · `--d-loop-2` | **1597** · **2584** | ambient loops: LED breath, ambient particles |
| `--d-drift-1` · `--d-drift-2` | **46 368** · **75 025** | slow drifts: live wallpaper pans |

Nothing interactive runs longer than 377 ms. Ambient motion never blocks input.

**Curves:**

| Token | Definition | Use |
|---|---|---|
| `--e-phi-out` | `cubic-bezier(.236, .618, .382, 1)` | Golden deceleration for things arriving. The default |
| `--e-phi-in` | `cubic-bezier(.618, 0, .764, .382)` | Things leaving |
| `--e-phi-io` | `cubic-bezier(.618, 0, .382, 1)` | Things travelling from A to B on screen |
| `--e-spring` | Golden spring, see below | Drag release, swipe snap-back, Review card return |
| `linear` | — | Progress bars and the LED breath only |

**The golden spring.** A damped harmonic oscillator with damping ratio **ζ = 1 / √φ ≈ 0.786**. Then ζ² = φ⁻¹, and the damped-to-natural frequency ratio √(1 − ζ²) comes out at exactly **φ⁻¹ = 0.618**. φ appears in the physics itself, not only in the timing. It is tuned so the single overshoot peaks at **233 ms** and the spring rests by **377 ms**:

- natural frequency ω₀ = 21.82 rad/s (stiffness 476, damping 34.3 per unit mass)
- overshoot **1.84 %**, below the 4 % ceiling for anything carrying text
- CSS: `--e-spring: linear(0, .068 5%, .218 10%, .393 15%, .559 20%, .700 25%, .811 30%, .892 35%, .948 40%, .984 45%, 1.004 50%, 1.015 55%, 1.018 61.8%, 1.015 70%, 1.009 80%, 1.004 90%, 1)`, run over **377 ms**

### 4.2 Kinetic choreography

- **Stagger by logarithmic distance.** When many items reveal (a board loads, a menu opens), the item at distance *d* px from the interaction origin starts after
  `delay = 34 ms × log_φ(1 + d ÷ 34)`, capped at **233 ms**.
  An item 34 px away starts at 49 ms, one 1000 px away at 233 ms. Near items arrive almost together, far ones trail, and the wave reads as coming *from your finger*.
- **Origin.** Flyouts scale from their anchor (`transform-origin` at the trigger), from 0.944 to 1 over `--d-3`. Modals rise 13 px and fade in over `--d-4`. The tablet opens from the pocket tab's side.
- **Continuity.** A card opening into the full ticket view MUST carry its cover image to the shot's place (a shared element), never cut.
- **Reduced motion.** Under `prefers-reduced-motion`, every transform becomes an opacity crossfade over `--d-2`, stagger is removed, and ambient loops and drifts stop.

### 4.3 State machine & feedback

```
           hover (pointer only)              press                  release
 DEFAULT ─────────────────────▶ HOVER ───────────────▶ ACTIVE ───────────────▶ action ──▶ DEFAULT
    │                                                     │
    ├── keyboard / tab ─────────▶ FOCUSED ◀───────────────┘
    ├── selected ───────────────▶ SELECTED
    ├── a rule forbids it ──────▶ LOCKED     (visible, says why)
    └── nothing to act on ──────▶ DISABLED
```

| State | Visual | Spatial | Sound (optional, gain ≤ 0.146) |
|---|---|---|---|
| Default | token fill | at rest | — |
| Hover | + white **5.6 %** overlay (φ⁻⁶), `--d-1` | none: lift is reserved for meaning | — |
| Active | + white **14.6 %** overlay (φ⁻⁴), scale **0.979** (1 − φ⁻⁸), `--d-2` | presses *in* | soft tick |
| Focused | 2 px `accent` ring at offset 2, radius = r + 2 (concentric) | — | — |
| Selected | `accent` fill, `soft` text | — | — |
| Locked | `dim` text with a lock glyph; a tooltip (or tap) names the reason | — | low thud on attempt |
| Disabled | opacity **38.2 %** (φ⁻²) | — | — |
| Destructive | first press turns the label `--c-danger` and asks; the second press commits. Never a red fill | — | — |

Every press MUST answer within one frame (a state change), even while its action is still travelling.

**Opacity scale** (anything translucent that isn't glass): 1, **.854** (1 − φ⁻⁴), **.618**, **.382**, **.236**, **.146**, 0.

---

## 5. Governance & do / don't criteria

### 5.1 Do / don't

| ✅ DO | ❌ DON'T |
|---|---|
| Align child edges to the parent's padding line, and nest corner radii concentrically (§2.3) | Put a 10 px card inside a 16 px screen with 12 px padding |
| Use only `--s` tokens for spacing and `--h` tokens for component sizes | Write `gap:6px`, `padding:7px 11px`, `height:30px` |
| Give each region one focal accent, placed on a golden line | Put two coloured primary buttons side by side |
| Balance a multi-tool window around one focal node (the primary action, or the work itself) at the golden point | Centre everything symmetrically and let the eye wander |
| Use geometry to place and size | Draw flowers of life, Metatron's cubes or spirals behind content. Decorative sacred geometry that competes with text or touch targets is banned |
| Keep touch hit areas ≥ 44 px and pointer hit areas ≥ 27 px (the visual may be smaller) | Shrink a 21 px icon button's hit area to 21 px |
| Show user-defined colours as dots, bars and edges | Fill cards with a ticket type's colour |
| Use the light-polarity status set on light themes | Put `#ffd60a` on Linen (1.0 : 1, invisible) |
| Keep text surfaces ≥ 0.910 opaque under glass | Let ink drop to 4 : 1 over a bright sky because "it's glass" |
| Reveal with log-distance stagger capped at 233 ms | Stagger 40 items at a fixed 50 ms (a two-second wait) |
| Keep text on a surface or scrim | Put text straight over snow, video or the live world |
| Collapse a panel to its rail before it covers the work | Float a tool palette over the object being edited |
| Hide empty swimlanes under a filter | Leave rows of nothing on screen |
| Keep view controls and configuration controls visibly different | Make a "group by" button look like "edit columns" |

### 5.2 Review checklist (every Slate change)

1. Every spacing, size, radius, duration, opacity and z-index is a token, or carries a comment naming its generator.
2. Radii nest: a child in its parent's corner has `r_parent − inset`.
3. One focal accent per region.
4. §2.4.3 passes over a white world and a black world, at glass 0 and at the theme's glass.
5. Touch hit ≥ 44, pointer hit ≥ 27; hover affordances have touch equivalents.
6. Works at 360, 610, 987 and 1597 wide.
7. The reduced-motion path exists.
8. Every shipped theme keeps the lightness order, and light themes use the light status set.
9. Every image opens in the lightbox; every link is selectable.

### 5.3 Current drift: audit of 2026-10-01

**Method.** Every inline style in every Slate file that draws was parsed, 15 files: `ui-panel`, `ui-board`, `ui-loom`, `ui-studio`, `ui-tome`, `ui-flowview`, `ui-gallery`, `ui-pocket`, `ui-archive`, `ui-environment`, `ui-notifications`, `glass`, `themes`, `fill` and `led`. Counts are uses in source. One use in a template can draw many times on screen.

| Property | Distinct values today | Uses | Allowed by this spec |
|---|---|---|---|
| font-size | **27** | 510 | 6 (10.5, 13, 16, 21, 34, 55) |
| border-radius | **22** | 221 | 6 + pill |
| gap | **18** | 271 | 10 (`--s-0` – `--s-9`); 5 in practice |
| padding (per side) | **25** | 485 | the same 10 |
| line-height | **16** | 48 | 4 ratios + per-role values |
| letter-spacing | **19** | 95 | 4 |
| transition / animation durations | **14** | 25 | 9 |
| z-index | **12** | 29 | local 0–3, plus 34 and 89 |
| font-weight | **6** | 45 | 3 (+200 reserved) |
| opacity | **15** | 55 | 7 |
| fixed heights | **48** | 143 | `--h` series |
| fixed widths | **56** | 164 | `--h` series and widths |

**Structural findings** (each verified in code or by calculation, Appendix C):

| # | Finding | Rule broken | Fix |
|---|---|---|---|
| D1 | The desktop tablet defaults to 1120 × 720 (1.556 : 1); the shell is r 16 with padding 12 / 10 / 40 | §2.1.1, §3.1 | 987 × 610 default, r 21, insets 8 / 34 |
| D2 | **Two colour systems.** The Planner's `.kb-glass` scope (`glass.js`) draws in Apple system tokens (`label`, `tint #0a84ff`), while every other app draws in the nine theme roles | §2.4.1 | Map glass tokens onto roles: label → `ink`, label2 → `dim`, label3 → `dim` at .618, tint → `accent`, hair → `line` |
| D3 | **Glass fails over a bright world.** `themes.js` sets panel opacity to 1 − 0.6 × glass. At glass 55 (the wallpaper default), `ink` on panel drops to **3.7–4.1 : 1** over a white backdrop on every dark theme, and `dim` to **1.6–2.1 : 1** | §2.4.3 glass law | Floor panel opacity at 0.910 under text and promote `dim` to `ink` below 0.966. Glass stays fully free on `bg` and `bezel` |
| D4 | **Status colours vanish on light themes.** On Linen and Spring, priority and status colours measure **1.0 – 2.7 : 1** (Medium `#ffd60a` on Linen: 1.0) | §2.4.1 polarity | The light-polarity set measures 3.2 – 4.3 : 1 on both themes |
| D5 | `dim` on `panel` is **3.9 : 1** on Linen and Spring (needs 4.5); `accent` on `bg` is 3.0 on Spring, 4.2 on Linen and 4.4 on Autumn | §2.4.3 | Darken the dim role of Linen and Spring, and the accent role of Spring, Linen and Autumn, by one lightness step |
| D6 | `z-index: 99999` is used 7 times | §2.3 | `--zi-system` 89 |
| D7 | Weights 700 and 800 (23 uses) | §2.2 | 600 |
| D8 | Ambient loops at 2400, 1600, 40 000, 70 000 and 90 000 ms | §4.1 | 2584, 1597, 46 368, 75 025, 75 025 |
| D9 | Ticket view split is 1.45 : 1 | §2.1.2 | 0.618 / 0.382 |
| D10 | Scrollbars use the browser default (bright white on some platforms) | §1.4 | 5 px thumb in `line` |

**Migration order.** One app per change, each with a before-and-after capture and the §5.2 checklist: (1) the shell and theme fixes D1–D6, which every app inherits, (2) Planner, (3) Workbench, (4) Loom, (5) Settings, Studio and the rest. Nothing migrates as a side effect of unrelated work. The token block (Appendix A) lands first as `lib/tokens.js`, so each app migration replaces literals with tokens and never with new literals.

### 5.4 Complete migration map

Each value found in code maps to its token by the nearest value on a log scale, because a 2 px error matters more at 8 than at 89. Where context decides (11 px text, radii in a corner), the rule is named.

#### font-size: 27 distinct values, 510 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 8 | 4 | 2 | `--t-meta` 10.5 (floor) |
| 8.5 | 1 | 1 | `--t-meta` 10.5 (floor) |
| 9 | 17 | 4 | `--t-meta` 10.5 (floor) |
| 9.5 | 20 | 8 | `--t-meta` 10.5 (floor) |
| 10 | 96 | 10 | `--t-meta` 10.5 (floor) |
| 10.5 | 50 | 10 | `--t-meta` 10.5 |
| 11 | 108 | 12 | 10.5 if metadata · 13 if a control label |
| 11.5 | 29 | 8 | 10.5 if metadata · 13 if a control label |
| 12 | 75 | 14 | `--t-body` 13 |
| 12.5 | 19 | 6 | `--t-body` 13 |
| 13 | 18 | 6 | `--t-body` 13 |
| 13.5 | 4 | 4 | `--t-body` 13 |
| 14 | 7 | 2 | `--t-body` 13 |
| 15 | 8 | 5 | `--t-title` 16 |
| 16 | 6 | 4 | `--t-title` 16 |
| 17 | 6 | 4 | `--t-title` 16 |
| 18 | 4 | 3 | `--t-title` 16 |
| 19 | 2 | 1 | `--t-head` 21 |
| 20 | 10 | 6 | `--t-head` 21 |
| 21 | 1 | 1 | `--t-head` 21 |
| 22 | 7 | 5 | `--t-head` 21 |
| 24 | 5 | 4 | `--t-head` 21 |
| 26 | 6 | 3 | `--t-head` 21 |
| 28 | 3 | 2 | `--t-display` 34 |
| 30 | 2 | 2 | `--t-display` 34 |
| 34 | 1 | 1 | `--t-display` 34 |
| 42 | 1 | 1 | `--t-display` 34 |

#### border-radius: 22 distinct values, 221 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 1 | 1 | 1 | hairline: 0 or `--r-1` |
| 2 | 13 | 6 | `--r-1` 3 *(or the concentric value, §2.3)* |
| 3 | 29 | 7 | `--r-1` 3 *(or the concentric value, §2.3)* |
| 4 | 20 | 6 | `--r-2` 5 *(or the concentric value, §2.3)* |
| 5 | 7 | 5 | `--r-2` 5 *(or the concentric value, §2.3)* |
| 6 | 37 | 9 | `--r-2` 5 *(or the concentric value, §2.3)* |
| 7 | 4 | 3 | `--r-3` 8 *(or the concentric value, §2.3)* |
| 8 | 27 | 11 | `--r-3` 8 *(or the concentric value, §2.3)* |
| 9 | 5 | 3 | `--r-3` 8 *(or the concentric value, §2.3)* |
| 10 | 29 | 10 | `--r-3` 8 *(or the concentric value, §2.3)* |
| 12 | 12 | 6 | `--r-4` 13 *(or the concentric value, §2.3)* |
| 13 | 5 | 3 | `--r-4` 13 *(or the concentric value, §2.3)* |
| 14 | 12 | 5 | `--r-4` 13 *(or the concentric value, §2.3)* |
| 15 | 3 | 2 | `--r-4` 13 *(or the concentric value, §2.3)* |
| 16 | 8 | 4 | `--r-4` 13 *(or the concentric value, §2.3)* |
| 17 | 1 | 1 | `--r-5` 21 *(or the concentric value, §2.3)* |
| 18 | 1 | 1 | `--r-5` 21 *(or the concentric value, §2.3)* |
| 20 | 3 | 3 | `--r-5` 21 *(or the concentric value, §2.3)* |
| 22 | 1 | 1 | `--r-5` 21 *(or the concentric value, §2.3)* |
| 24 | 1 | 1 | `--r-5` 21 *(or the concentric value, §2.3)* |
| 28 | 1 | 1 | `--r-6` 34 *(or the concentric value, §2.3)* |
| 999 | 1 | 1 | `--r-pill` |

#### gap: 18 distinct values, 271 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 1 | 3 | 3 | `--s-0` 1 |
| 2 | 4 | 3 | `--s-1` 2 |
| 3 | 14 | 8 | `--s-2` 3 |
| 4 | 26 | 7 | `--s-3` 5 |
| 5 | 27 | 11 | `--s-3` 5 |
| 6 | 44 | 8 | `--s-3` 5 |
| 7 | 3 | 2 | `--s-4` 8 |
| 8 | 52 | 11 | `--s-4` 8 |
| 9 | 1 | 1 | `--s-4` 8 |
| 10 | 52 | 9 | `--s-4` 8 |
| 11 | 1 | 1 | `--s-5` 13 |
| 12 | 29 | 9 | `--s-5` 13 |
| 14 | 7 | 4 | `--s-5` 13 |
| 16 | 2 | 2 | `--s-5` 13 |
| 18 | 1 | 1 | `--s-6` 21 |
| 20 | 1 | 1 | `--s-6` 21 |
| 22 | 2 | 2 | `--s-6` 21 |
| 26 | 2 | 1 | `--s-6` 21 |

#### padding (each side value): 25 distinct values, 485 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 1 | 21 | 7 | `--s-0` 1 |
| 2 | 43 | 11 | `--s-1` 2 |
| 3 | 28 | 9 | `--s-2` 3 |
| 4 | 45 | 12 | `--s-3` 5 |
| 5 | 29 | 10 | `--s-3` 5 |
| 6 | 60 | 9 | `--s-3` 5 |
| 7 | 37 | 11 | `--s-4` 8 |
| 8 | 51 | 11 | `--s-4` 8 |
| 9 | 26 | 11 | `--s-4` 8 |
| 10 | 51 | 11 | `--s-4` 8 |
| 11 | 5 | 4 | `--s-5` 13 |
| 12 | 40 | 9 | `--s-5` 13 |
| 13 | 1 | 1 | `--s-5` 13 |
| 14 | 20 | 7 | `--s-5` 13 |
| 16 | 10 | 5 | `--s-5` 13 |
| 18 | 4 | 3 | `--s-6` 21 |
| 20 | 3 | 2 | `--s-6` 21 |
| 22 | 1 | 1 | `--s-6` 21 |
| 24 | 1 | 1 | `--s-6` 21 |
| 26 | 2 | 2 | `--s-6` 21 |
| 28 | 1 | 1 | `--s-7` 34 |
| 30 | 3 | 3 | `--s-7` 34 |
| 40 | 1 | 1 | `--s-7` 34 |
| 60 | 1 | 1 | `--s-8` 55 |
| 64 | 1 | 1 | `--s-8` 55 |

#### line-height: 16 distinct values, 48 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 0 | 2 | 2 | 0 (hidden text, keep) |
| 1 | 9 | 3 | 1 (glyph-only boxes) |
| 1.08 | 2 | 1 | 1 (glyph-only boxes) |
| 1.1 | 3 | 2 | 1 (glyph-only boxes) |
| 1.15 | 1 | 1 | `--lhr-tight` 1.236 |
| 1.2 | 3 | 2 | `--lhr-tight` 1.236 |
| 1.25 | 1 | 1 | `--lhr-tight` 1.236 |
| 1.3 | 1 | 1 | `--lhr-tight` 1.236 |
| 1.32 | 1 | 1 | `--lhr-ui` 1.382 |
| 1.35 | 4 | 4 | `--lhr-ui` 1.382 |
| 1.4 | 4 | 3 | `--lhr-ui` 1.382 |
| 1.45 | 7 | 3 | `--lhr-ui` 1.382 |
| 1.5 | 6 | 5 | `--lhr-prose` 1.618 |
| 1.6 | 2 | 2 | `--lhr-prose` 1.618 |
| 1.7 | 1 | 1 | `--lhr-prose` 1.618 |
| 16px | 1 | 1 | role token (§2.2) |

#### letter-spacing: 19 distinct values, 95 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| -.01em | 1 | 1 | `--tr-tight` −0.021em |
| .01em | 2 | 2 | 0 or `--tr-meta` |
| .02em | 1 | 1 | 0 or `--tr-meta` |
| .04em | 6 | 2 | `--tr-meta` +0.021em |
| .05em | 2 | 2 | `--tr-meta` +0.021em |
| .06em | 8 | 6 | `--tr-caps` +0.146em |
| .08em | 5 | 3 | `--tr-caps` +0.146em |
| .1em | 7 | 5 | `--tr-caps` +0.146em |
| .12em | 10 | 6 | `--tr-caps` +0.146em |
| .14em | 12 | 5 | `--tr-caps` +0.146em |
| .15em | 1 | 1 | `--tr-caps` +0.146em |
| .16em | 13 | 8 | `--tr-caps` +0.146em |
| .18em | 2 | 2 | `--tr-caps` +0.146em |
| .2em | 14 | 5 | `--tr-mark` +0.236em |
| .22em | 2 | 1 | `--tr-mark` +0.236em |
| .24em | 5 | 3 | `--tr-mark` +0.236em |
| .26em | 1 | 1 | `--tr-mark` +0.236em |
| .28em | 1 | 1 | `--tr-mark` +0.236em |
| .3em | 2 | 2 | `--tr-mark` +0.236em |

#### duration (ms): 14 distinct values, 25 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 100 | 1 | 1 | `--d-1` 89 ms |
| 150 | 3 | 2 | `--d-2` 144 ms |
| 180 | 3 | 2 | `--d-2` 144 ms |
| 200 | 5 | 3 | `--d-3` 233 ms |
| 220 | 1 | 1 | `--d-3` 233 ms |
| 250 | 1 | 1 | `--d-3` 233 ms |
| 350 | 1 | 1 | `--d-4` 377 ms |
| 500 | 2 | 1 | `--d-5` 610 ms |
| 600 | 1 | 1 | `--d-5` 610 ms |
| 1600 | 1 | 1 | `--d-loop-1` 1597 ms |
| 2400 | 1 | 1 | `--d-loop-2` 2584 ms (the home LED breath, `led`) |
| 40000 | 1 | 1 | `--d-drift-1` 46368 ms |
| 70000 | 1 | 1 | `--d-drift-2` 75025 ms |
| 90000 | 3 | 1 | `--d-drift-2` 75025 ms |

#### font-weight: 6 distinct values, 45 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 200 | 9 | 4 | 200 (wordmark / big numerals only) |
| 400 | 1 | 1 | 400 |
| 500 | 5 | 2 | 500 |
| 600 | 7 | 2 | 600 |
| 700 | 21 | 7 | 600 |
| 800 | 2 | 2 | 600 |

#### z-index: 12 distinct values, 29 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| -1 | 1 | 1 | local stack 0–3 (Z0–Z3) |
| 0 | 1 | 1 | local stack 0–3 (Z0–Z3) |
| 1 | 4 | 3 | local stack 0–3 (Z0–Z3) |
| 2 | 2 | 2 | local stack 0–3 (Z0–Z3) |
| 3 | 2 | 2 | local stack 0–3 (Z0–Z3) |
| 4 | 3 | 2 | local stack 0–3 (Z0–Z3) |
| 5 | 3 | 2 | local stack 0–3 (Z0–Z3) |
| 6 | 2 | 2 | local stack 0–3 (Z0–Z3) |
| 20 | 1 | 1 | `--zi-tablet` 34 |
| 30 | 1 | 1 | `--zi-tablet` 34 |
| 40 | 2 | 1 | `--zi-tablet` 34 |
| 99999 | 7 | 3 | `--zi-system` 89 |

#### opacity: 15 distinct values, 55 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 0 | 12 | 4 | 0 |
| .2 | 1 | 1 | `--o-1` .236 |
| .3 | 1 | 1 | `--o-1` .236 (the LED breath floor, `led`) |
| .32 | 1 | 1 | `--o-2` .382 |
| .35 | 5 | 3 | `--o-2` .382 |
| .45 | 1 | 1 | `--o-2` .382 |
| .5 | 3 | 3 | `--o-3` .618 |
| .55 | 4 | 1 | `--o-3` .618 |
| .6 | 5 | 5 | `--o-3` .618 |
| .7 | 1 | 1 | `--o-3` .618 |
| .75 | 2 | 2 | `--o-4` .854 |
| .8 | 4 | 4 | `--o-4` .854 |
| .85 | 5 | 3 | `--o-4` .854 |
| .9 | 1 | 1 | `--o-4` .854 |
| 1 | 9 | 4 | 1 |

#### height (fixed px): 48 distinct values, 143 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 1 | 1 | 1 | spacing token `--s-0` 1 |
| 2 | 2 | 2 | spacing token `--s-1` 2 |
| 3 | 3 | 1 | spacing token `--s-2` 3 |
| 4 | 5 | 5 | spacing token `--s-3` 5 |
| 5 | 7 | 3 | spacing token `--s-3` 5 |
| 6 | 6 | 3 | spacing token `--s-3` 5 |
| 7 | 2 | 1 | spacing token `--s-4` 8 |
| 8 | 2 | 2 | spacing token `--s-4` 8 |
| 9 | 2 | 1 | spacing token `--s-4` 8 |
| 12 | 1 | 1 | spacing token `--s-5` 13 |
| 13 | 3 | 1 | spacing token `--s-5` 13 |
| 14 | 1 | 1 | spacing token `--s-5` 13 |
| 15 | 4 | 1 | `--h-1` 17 |
| 16 | 7 | 6 | `--h-1` 17 |
| 18 | 6 | 4 | `--h-1` 17 |
| 20 | 2 | 1 | `--h-2` 21 |
| 22 | 14 | 5 | `--h-2` 21 |
| 24 | 1 | 1 | `--h-3` 27 |
| 26 | 12 | 7 | `--h-3` 27 |
| 28 | 7 | 6 | `--h-3` 27 |
| 30 | 8 | 4 | `--h-3` 27 |
| 32 | 3 | 2 | `--h-4` 34 |
| 34 | 5 | 3 | `--h-4` 34 |
| 38 | 1 | 1 | `--h-4` 34 |
| 40 | 1 | 1 | `--h-5` 44 |
| 44 | 1 | 1 | `--h-5` 44 |
| 46 | 2 | 1 | `--h-5` 44 |
| 50 | 2 | 1 | `--h-6` 55 |
| 54 | 2 | 2 | `--h-6` 55 |
| 56 | 1 | 1 | `--h-6` 55 |
| 60 | 1 | 1 | `--h-6` 55 |
| 62 | 1 | 1 | `--h-6` 55 |
| 64 | 5 | 2 | `--h-7` 70 |
| 66 | 1 | 1 | `--h-7` 70 |
| 70 | 2 | 2 | `--h-7` 70 |
| 74 | 1 | 1 | `--h-7` 70 |
| 75 | 1 | 1 | `--h-7` 70 |
| 78 | 1 | 1 | `--h-7` 70 |
| 80 | 1 | 1 | `--h-8` 89 |
| 90 | 1 | 1 | `--h-8` 89 |
| 92 | 1 | 1 | `--h-8` 89 |
| 96 | 3 | 2 | `--h-8` 89 |
| 110 | 2 | 2 | φ half-step 113 *(no token: comment the generator, §5.2)* |
| 120 | 2 | 2 | φ half-step 113 *(no token: comment the generator, §5.2)* |
| 128 | 1 | 1 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 150 | 1 | 1 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 188 | 2 | 1 | φ half-step 183 *(no token: comment the generator, §5.2)* |
| 220 | 1 | 1 | `--w-side` 233 |

#### width (fixed px): 56 distinct values, 164 uses

| Found | Uses | Files | → Token |
|---|---|---|---|
| 1 | 1 | 1 | spacing token `--s-0` 1 |
| 2 | 1 | 1 | spacing token `--s-1` 2 |
| 3 | 1 | 1 | spacing token `--s-2` 3 |
| 5 | 1 | 1 | spacing token `--s-3` 5 |
| 6 | 3 | 2 | spacing token `--s-3` 5 |
| 7 | 3 | 2 | spacing token `--s-4` 8 |
| 8 | 2 | 2 | spacing token `--s-4` 8 |
| 9 | 2 | 1 | spacing token `--s-4` 8 |
| 12 | 1 | 1 | spacing token `--s-5` 13 |
| 13 | 2 | 1 | spacing token `--s-5` 13 |
| 14 | 1 | 1 | spacing token `--s-5` 13 |
| 15 | 4 | 1 | `--h-1` 17 |
| 16 | 6 | 3 | `--h-1` 17 |
| 18 | 6 | 3 | `--h-1` 17 |
| 20 | 3 | 1 | `--h-2` 21 |
| 22 | 13 | 5 | `--h-2` 21 |
| 24 | 5 | 3 | `--h-3` 27 |
| 26 | 8 | 5 | `--h-3` 27 |
| 28 | 4 | 4 | `--h-3` 27 |
| 30 | 7 | 6 | `--h-3` 27 |
| 34 | 4 | 2 | `--h-4` 34 |
| 36 | 1 | 1 | `--h-4` 34 |
| 38 | 2 | 1 | `--h-4` 34 |
| 40 | 8 | 3 | `--h-5` 44 |
| 42 | 1 | 1 | `--h-5` 44 |
| 44 | 3 | 3 | `--h-5` 44 |
| 46 | 1 | 1 | `--h-5` 44 |
| 52 | 1 | 1 | `--h-6` 55 |
| 54 | 2 | 2 | `--h-6` 55 |
| 56 | 1 | 1 | `--h-6` 55 |
| 60 | 1 | 1 | `--h-6` 55 |
| 62 | 2 | 2 | `--h-6` 55 |
| 64 | 3 | 2 | `--h-7` 70 |
| 70 | 3 | 2 | `--h-7` 70 |
| 72 | 1 | 1 | `--h-7` 70 |
| 78 | 4 | 3 | `--h-7` 70 |
| 80 | 2 | 2 | `--h-8` 89 |
| 90 | 1 | 1 | `--h-8` 89 |
| 92 | 1 | 1 | `--h-8` 89 |
| 100 | 1 | 1 | `--h-8` 89 |
| 110 | 8 | 3 | φ half-step 113 *(no token: comment the generator, §5.2)* |
| 120 | 3 | 1 | φ half-step 113 *(no token: comment the generator, §5.2)* |
| 128 | 2 | 1 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 130 | 2 | 2 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 140 | 2 | 1 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 150 | 7 | 7 | φ half-step 144 *(no token: comment the generator, §5.2)* |
| 165 | 1 | 1 | `--w-menu` 183 |
| 170 | 1 | 1 | `--w-menu` 183 |
| 176 | 2 | 2 | `--w-menu` 183 |
| 180 | 2 | 2 | `--w-menu` 183 |
| 188 | 1 | 1 | `--w-menu` 183 |
| 240 | 1 | 1 | `--w-side` 233 |
| 250 | 3 | 2 | `--w-side` 233 |
| 260 | 8 | 2 | `--w-side` 233 |
| 270 | 1 | 1 | `--w-flyout` 297 |
| 330 | 2 | 2 | `--w-flyout` 297 |

### 5.5 Changing this document

This spec is the single source of truth. It changes only by a dated entry below that states the old rule, the new rule and the reason. Code that disagrees with the spec is wrong until the spec changes.

| Date | Change | Reason |
|---|---|---|
| 2026-10-01 | v1.0 established | psypher5: one authoritative HIG for Slate OS before any further app UI |
| 2026-10-01 | **v1.1, full re-walk.** Line-heights now come from size × (1 + φ⁻ᵏ): head 26 → 29, title 21 → 22, prose moves to 16 / 26. Added the φ half-step size series, so chips, fields and the omni bar (26 / 30) become 27, the touch floor 44 is native, and Review buttons 64 / 89 become 44 / 55. Spring ζ 0.618 (which overshoots 8.5 %, contradicting v1.0's own 4 % limit) becomes ζ = 1/√φ (1.84 %). Active scale 0.982 becomes 0.979, the true 1 − φ⁻⁸. Edge light, shadows and overlays now follow φ powers. Colour tokens rebuilt on the nine real theme roles, with a light-polarity status set. Glass law added from measured contrast. Shell radius chain corrected (34 / 21 / 13 with a padding contradiction → 21 / 13 / 8). Card proportions became width-relative, because a 233 card can't fit a 233 column. Removed v1.0's false claim that content fills 0.618 of the tablet (measured: 0.78). Double-tap 233 → 377. Drift audit widened from 3 files to 15, with exact counts | psypher5 lock-in: "go over it again" |

---

## Appendix A: token block (reference implementation)

```css
:root{
  /* space: Fibonacci */
  --s-0:1px; --s-1:2px; --s-2:3px; --s-3:5px; --s-4:8px; --s-5:13px; --s-6:21px; --s-7:34px; --s-8:55px; --s-9:89px;
  /* component size: φ half-steps, 13·φ^(n/2) */
  --h-1:17px; --h-2:21px; --h-3:27px; --h-4:34px; --h-5:44px; --h-6:55px; --h-7:70px; --h-8:89px;
  --w-menu:183px; --w-side:233px; --w-flyout:297px; --w-sheet:377px; --w-rail:34px;
  /* type: Major Third below body, φ above; line-height = size·(1+φ^-k) */
  --t-meta:10.5px; --t-body:13px; --t-title:16px; --t-prose:16px; --t-head:21px; --t-display:34px; --t-hero:55px; --t-mono:10.5px; --t-caps:10.5px;
  --lh-meta:13px; --lh-body:18px; --lh-title:22px; --lh-prose:26px; --lh-head:29px; --lh-display:42px; --lh-hero:68px;
  --lhr-tight:1.236; --lhr-ui:1.382; --lhr-prose:1.618; /* unitless ratios, k = 3 / 2 / 1 */
  --tr-tight:-.021em; --tr-meta:.021em; --tr-caps:.146em; --tr-mark:.236em;
  /* radius: concentric Fibonacci */
  --r-1:3px; --r-2:5px; --r-3:8px; --r-4:13px; --r-5:21px; --r-6:34px; --r-pill:999px;
  /* depth: φ powers */
  --z0-edge:rgba(255,255,255,.090); --z1-edge:rgba(255,255,255,.146); --z2-edge:rgba(255,255,255,.236); --z3-edge:rgba(255,255,255,.382);
  --z1-shadow:0 2px 8px rgba(0,0,0,.236); --z2-shadow:0 8px 21px rgba(0,0,0,.382); --z3-shadow:0 21px 55px rgba(0,0,0,.618);
  --z2-blur:13px; --z3-blur:21px; --scrim-desk:rgba(0,0,0,.382); --scrim-phone:rgba(0,0,0,.618);
  --zi-tablet:34; --zi-system:89;
  --text-surface-min:.910; --dim-surface-min:.966;
  /* opacity scale: φ powers */
  --o-1:.236; --o-2:.382; --o-3:.618; --o-4:.854;
  /* state overlays */
  --o-hover:.056; --o-active:.146; --o-disabled:.382; --scale-active:.979;
  /* time: Fibonacci ms */
  --d-1:89ms; --d-2:144ms; --d-3:233ms; --d-4:377ms; --d-5:610ms; --d-loop-1:1597ms; --d-loop-2:2584ms; --d-drift-1:46368ms; --d-drift-2:75025ms;
  --e-phi-out:cubic-bezier(.236,.618,.382,1); --e-phi-in:cubic-bezier(.618,0,.764,.382); --e-phi-io:cubic-bezier(.618,0,.382,1);
  --e-spring:linear(0,.068 5%,.218 10%,.393 15%,.559 20%,.7 25%,.811 30%,.892 35%,.948 40%,.984 45%,1.004 50%,1.015 55%,1.018 61.8%,1.015 70%,1.009 80%,1.004 90%,1);
  /* proportion */
  --phi:1.618; --phi-major:61.8%; --phi-minor:38.2%;
}
```

When adopted, this block lives in **one** file, `lib/tokens.js`, and is the only place these numbers are written. Colour roles stay in `themes.js` (`--c-*` are emitted from the active theme). `themes.js` never touches space, type, radius, depth or time.

## Appendix B: generator reference

| Generator | Value | Sequence used |
|---|---|---|
| φ powers | 1.6180339… | φ⁻⁸ .021 · φ⁻⁷ .034 · φ⁻⁶ .056 · φ⁻⁵ .090 · φ⁻⁴ .146 · φ⁻³ .236 · φ⁻² .382 · φ⁻¹ .618 · 1 · φ 1.618 |
| Fibonacci | — | 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584 … 46 368, 75 025 |
| φ half-steps | 13 · φ^(n/2) | 13, 16.5, 21, 26.8, 34, 43.3, 55.1, 70, 89.1, 113, 144, 183, 233, 297, 377 |
| Lucas | round(φⁿ) | 18, 29, 47, 76 (prose measure) |
| Golden angle | 137.508° | hue stepping, open-ended orbital placement |
| √2 | 1.4142 | media |
| √3 | 1.7321 | phone frame; hex row step (√3 / 2 = 0.866) |
| √5 | 2.2361 | strips, timelines |
| Major Third | 1.25 | text below body |
| CSS reference pixel | 0.0213° ≈ 1.28′ | angular legibility |

## Appendix C: verification

Every measured claim, and how it was made on 2026-10-01.

**Ratios and arithmetic.** 987 ÷ 610 = 1.6180 · 1220 ÷ 754 = 1.6180 · 360 × √3 = 623.5 · 987 ÷ φ³ = 233.0 · today's phone 620 ÷ 360 = 1.722 (0.6 % from √3) · today's desktop 1120 ÷ 720 = 1.556 · v1.0's "content ≈ 0.618 of the tablet": with v1.0's own chrome it was 474 ÷ 610 = **0.78**, so the claim was removed.

**Spring.** ζ = 1/√φ = 0.7862; √(1 − ζ²) = 0.6180 = φ⁻¹. Overshoot e^(−πζ/√(1−ζ²)) = 1.84 %. Tuned so the peak lands at π / ω_d = 233 ms, giving ω₀ = 21.82 rad/s. At 377 ms the position is 1.0013 (at rest). The `linear()` stops are samples of x(t) = 1 − e^(−ζω₀t)(cos ω_d t + ζ/√(1−ζ²) · sin ω_d t). v1.0's ζ = 0.618 overshoots 8.5 %.

**Contrast**, WCAG relative luminance, theme role values from `lib/themes.js` SHIPPED:

| Theme | ink/bg | ink/panel | dim/bg | dim/panel | accent/bg | ink/panel at glass 55 over white | dim/panel at glass 55 over white |
|---|---|---|---|---|---|---|---|
| Brass | 13.6 | 10.7 | 6.3 | 4.9 | 4.9 | **3.7** | **1.7** |
| Glass | 14.7 | 11.9 | 7.3 | 5.9 | 6.4 | **4.1** | **2.1** |
| Linen | 12.0 | 10.5 | 4.5 | **3.9** | **4.2** | 11.7 | **4.4** |
| Winter | 13.9 | 11.9 | 6.0 | 5.1 | 8.2 | **4.0** | **1.7** |
| Spring | 11.8 | 10.8 | **4.3** | **3.9** | **3.0** | 11.7 | **4.3** |
| Summer | 13.2 | 10.9 | 6.3 | 5.2 | 7.5 | **3.8** | **1.8** |
| Autumn | 14.0 | 12.2 | 5.7 | 4.9 | **4.4** | **4.1** | **1.7** |
| Christmas | 13.7 | 11.5 | 6.1 | 5.1 | 6.3 | **3.9** | **1.8** |
| Halloween | 13.6 | 12.2 | 5.4 | 4.8 | 5.5 | **4.0** | **1.6** |

Bold = fails §2.4.3. (accent/bg fails only where accent is used as text; as a graphic it needs 3 : 1.) Light themes fail the same way over a *black* world: Linen ink at glass 55 over black measures 4.7.

**Minimum surface opacity for `ink` ≥ 7 : 1 over both a white and a black world:** Brass .87, Glass .84, Linen .83, Winter .84, Spring .82, Summer .86, Autumn .83, Christmas .85, Halloween .83. The worst case is .87, so the law uses the next φ value above it: **.910** (1 − φ⁻⁵). For `dim` ≥ 4.5 : 1, dark themes need .92 – .98, hence **.966** (1 − φ⁻⁷) with promotion to `ink`. On Linen and Spring, `dim` never reaches 4.5 at any opacity, which is finding D5.

**Status colours on panel:**

| Theme | danger | warn | caution | ok | info |
|---|---|---|---|---|---|
| Dark themes (range) | 4.1 – 5.0 | 6.7 – 8.3 | 9.8 – 12.1 | 6.9 – 8.4 | 8.1 – 9.9 |
| Linen, dark set | 2.5 | 1.5 | **1.0** | 1.5 | 1.3 |
| Spring, dark set | 2.7 | 1.6 | 1.1 | 1.6 | 1.4 |
| Linen, light set | 3.9 | 3.9 | 3.9 | 3.2 | 3.9 |
| Spring, light set | 4.3 | 4.2 | 4.2 | 3.5 | 4.3 |

**Angular size.** CSS reference pixel 0.0213° × size in px; cap height taken as 0.70 em, typical of SF, Inter and Segoe. World-space: Starbloom camera vertical FOV 70° (`scripts/camera.js`), 1110 px viewport → 792.6 px per radian → 13 px needs 16.4 mm per metre.

**Drift counts.** A regex over inline `style=` and CSS text in the 15 files listed in §5.3. Durations count only inside `transition` and `animation` declarations.
