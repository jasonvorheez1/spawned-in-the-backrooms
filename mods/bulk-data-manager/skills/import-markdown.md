---
name: Import Markdown Data
description: Import Markdown files from a URL into the bulk data manager, parsed into records by heading
---

---
description: Import Markdown files from a URL into the bulk data manager
requiresArgs: false
---

# Import Markdown Data

Import Markdown files from a public URL into the bulk data manager. The file is parsed into structured records by heading, making documentation, lore, rules, and reference material queryable from any game behavior.

## Prerequisites

The **bulk-data-manager** mod (v2.8.0+) must be installed. Earlier versions only support JSON import.

## How Markdown Parsing Works

The importer splits the markdown file by headings (`#`, `##`, `###`, etc.). Each heading becomes a record with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | The heading text (without `#` symbols) |
| `level` | number | Heading depth (1 for `#`, 2 for `##`, etc.) |
| `content` | string | All text between this heading and the next heading |
| `order` | number | Sequential index (0-based) for preserving document order |

### Example

Given this markdown:

```md
# Weapons

## Sword
A basic melee weapon. Deals 10 damage.

## Staff
A magical weapon. Deals 8 damage with splash.

# Armor

## Shield
Blocks 5 damage per hit.
```

The importer produces 5 records:

| title | level | content | order |
|-------|-------|---------|-------|
| Weapons | 1 | *(empty)* | 0 |
| Sword | 2 | A basic melee weapon. Deals 10 damage. | 1 |
| Staff | 2 | A magical weapon. Deals 8 damage with splash. | 2 |
| Armor | 1 | *(empty)* | 3 |
| Shield | 2 | Blocks 5 damage per hit. | 4 |

### No Headings

If the file has no headings, the entire file is stored as a single record with `title` set to the collection name and `content` set to the full text.

## Using the Panel

1. Enter god mode
2. Open the **Data Manager** panel
3. Click **+ Import from URL**
4. Select **Markdown** as the file type
5. Enter a **collection name** (e.g. `lore`, `rules`, `bestiary`)
6. Paste the **Markdown URL** (raw GitHub links work well)
7. Click **Import**

## Querying Markdown Data from Behaviors

```js
const dm = require('lib/data-manager.js');

// Get all sections
const allLore = dm.getAll('lore');

// Find a specific section by title
const dragonLore = dm.find('lore', { title: 'Dragons' });

// Get all top-level sections
const chapters = dm.query('lore', { level: 1 });

// Get all subsections
const details = dm.query('lore', { level: 2 });

// Search content (manual filter)
const allRecords = dm.getAll('rules');
const combatRules = allRecords.filter(r => 
  r.content.toLowerCase().includes('damage')
);
```

## Use Cases

- **Game lore / worldbuilding** — Import a lore bible, query sections for NPC dialog or loading screens
- **Rules reference** — Import RPG rules, look up specific mechanics by title
- **Item/enemy descriptions** — Maintain descriptions in readable markdown, query at runtime
- **Documentation** — Import README or wiki pages for creator reference via the data panel
- **Quest scripts** — Structure quests as headings, parse into quest data at runtime
- **Dialog trees** — Organize NPC dialog by heading per conversation topic

## URL Tips

- **GitHub**: Use raw URLs — `https://raw.githubusercontent.com/user/repo/branch/file.md`
- **GitHub private repos**: Raw URLs with token params work but tokens expire
- **Gists**: Use the raw URL from the gist page
- **Dropbox**: Change `?dl=0` to `?dl=1` for direct download

## Gotchas

- Text before the first heading is **discarded**. If your file starts with content before any `#`, wrap it in a heading.
- The parser uses simple regex (`/^(#{1,6})\s+(.+)/`) — ATX headings only. Setext-style underline headings (`===` / `---`) are not detected.
- Code blocks containing `#` on a line start may be misidentified as headings. Indent code blocks or use fenced blocks to avoid this.
- Content includes raw markdown formatting (bold, links, lists, etc.) — it is not rendered to HTML. If you need rendered content, process it in your behavior.
