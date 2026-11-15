---
name: Savi Searching
description: "Research before building. Load whenever the creator's message names, or MIGHT name, a specific thing from outside this world (a character, creature, game, franchise, show, film, book, song, meme, real place, real event, brand or artist: \"Aqua from Deltarune\", \"like Mario Kart\", \"the Titanic\", \"Backrooms\", an unfamiliar capitalised name), says \"savi search <subject>\", or attaches/links a picture, gif or video. Savi thinks first, views every gif and video before acting, searches the web, pulls and views official art, sprites and fan art, summarises videos (gifs get a motion line, not a summary), writes research/<slug>.md, and plans before touching the world."
---

# Savi Searching

The creator installed this so you **know the thing before you build it**. A named character
built from memory is a guess; built from twenty pictures you actually looked at, it is *them*.
No magic words: the trigger is any name you would otherwise be guessing about. **When in doubt
whether a word is a character, event or thing, it is: one `spawn web_search` settles it** (a hit
means research it; nothing that matches means it is the creator's own, so ask for pictures).
Never ask permission to research. Never research generic words ("a tree", "a sword").

## The order, every time

1. **Think** (silently, before any tool): what exactly is named, which one (Aqua: Deltarune /
   Kingdom Hearts / Konosuba; context decides, else the likeliest), what the creator wants done
   with it (build, flavour, just know), which pass below, and does `research/<slug>.md` exist.
2. **Opener**: one line to the creator naming the subject back, and which one if ambiguous.
   "oh, aqua from deltarune. watching her fights and pulling her sprites first, then building."
3. **The creator's own media first**: `spawn attachments` plus every link in the message. Every
   picture, gif and video they gave is viewed (step C) **before any search or any world write**.
   Theirs outrank anything found.
4. **Search, pull, view** (steps A to C). Every gif and video found is viewed before step D.
5. **Brief** (D), then **think, say, build** (E).

## How deep

| what the message does | pass |
|---|---|
| asks to build, remodel or animate a named outside thing ("make Aqua", "a Hogwarts castle") | **full** |
| says `savi search <x>` or `/savi-search <x>` | **full** |
| names something in passing, as flavour or comparison ("drifting like Mario Kart") | **light** |
| attaches or links a picture, gif or video | **media**: every one viewed, on top of the pass |
| names something already researched (`research/<slug>.md` exists) | **re-read** the brief, top up only what's missing |
| a search finds nothing that matches (the creator's own idea) | **ask** for pictures in one line; don't invent a canon |

- **full**: 3 to 6 searches, the main wiki page read whole, 8 to 20 official images + **at least 3
  fan art pieces** pulled and viewed, **every** gif on the wiki page read, 1 to 3 videos watched and summarised.
- **light**: 1 to 2 searches, the wiki lead + Appearance + attacks/abilities, 2 to 4 official
  images, **1 fan art piece**, **every gif on the page** (gifs are cheap: a sheet each), 1 video
  if the subject is known by how it moves or fights. A short brief in the same shape. Under ten minutes.
- No pass skips a gif or a video. One you couldn't open is named in the brief with why.

## Step A: find the sources

`spawn web_search "<subject> <franchise>"`, then `"<subject> sprite"`, `"<subject> official art"`,
`"<subject> fan art"`, `"<subject> <fight|scene|trailer> youtube"`. Rank:

1. **the franchise's own wiki** (game-name.wiki, wiki.gg, then fandom): canon facts and every official file
2. **The Spriters Resource / Models Resource**: sprite sheets and in-game models
3. **official art**: the studio's site, press kits, store pages
4. **fan art**: safebooru (below, it answers), then pixiv / DeviantArt / Tumblr / X, which often 403: note a refusal and move on
5. **video**: YouTube fights, trailers, cutscenes

Read the main page whole on a full pass: `spawn read_url <url>`, then `--offset` until it ends.
`read_url` drops galleries, so list every file on the page from the MediaWiki API:
`curl -sfL -A "Mozilla/5.0" "https://<wiki>/api.php?action=parse&page=<Name>&prop=images&format=json"`
(fandom: `/api.php` under the wiki's host). Every `.gif` in that list gets pulled and read.

Fan art that answers (SFW only, `rating:general`; the tag is the wiki name in lower case, `_(<franchise>)`):
`curl -sfL -A "Mozilla/5.0" "https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=40&tags=aqua_(deltarune)+rating:general"`
Each row has `file_url` (or the lighter `sample_url`) and `source` (the artist's link: the credit).
Pick pieces that show the subject whole and clearly, from different artists.

## Step B: pull every picture

Work in `/workspace/research/<slug>/` (the workshop, not the world's tree).

```bash
mkdir -p /workspace/research/aqua && cd /workspace/research/aqua
spawn fetch "https://deltarune.wiki/images/Aqua_overworld.png" Aqua_overworld.png
curl -sfL -A "Mozilla/5.0" -o attack_knife_fan.gif "https://deltarune.wiki/images/Aqua_attack_knife_fan.gif"
```

- `spawn fetch` stores a png/jpg/webp/mp4, registers it in `world.assets.yaml` and prints its
  `/cdn/value.<sha>` address: the address a build, a `--ref` or a wisp's `referenceImages` uses.
- **gif is not a store type**: curl it, run it through `sheet.sh` (step C), then `spawn upload`
  the `.mp4` motion copy it writes (its address: `grep -i <name> world.assets.yaml`).
- MediaWiki `File:Name.png` → raw file `https://<wiki>/images/Name.png` (fandom: the File: page's `static.wikia` link).
- Links the creator pastes: Tenor/Giphy pages → `spawn read_url` the page, take its `.gif`/`.mp4`
  media URL, curl it. A direct .mp4/.webm → curl it. YouTube → `yt.sh`. TikTok/X/Instagram video
  you can't download → `read_url` for the caption, view whatever stills it gives, and tell the creator you only saw stills.
- Name files by what they show (`front_idle.png`, `attack_knife_chain.gif`, `fan_karakara.jpg`).

## Step C: look at everything. Really look.

A picture you fetched and never opened taught you nothing. Every file goes through a tool and you
**Read** (or `spawn see`) the sheet it prints. Run the tools from the shell's starting cwd (the world
clone, every call starts there) and hand them absolute paths; the sheet lands beside the input:

```bash
bash mods/savi-searching/tools/sheet.sh /workspace/research/aqua/front_idle.png           # still; sprites < 256 px upscaled crisp
bash mods/savi-searching/tools/sheet.sh /workspace/research/aqua/attack_knife_chain.gif   # gif: up to 12 frames, numbered, in order (+ .mp4)
bash mods/savi-searching/tools/sheet.sh /workspace/research/aqua/fight.mp4 "" 16          # video file: 16 time-stamped keyframes
bash mods/savi-searching/tools/yt.sh "https://youtube.com/watch?v=ID" /workspace/research/aqua   # youtube: title, length, description,
   # captions if any, and 16 time-stamped frames across the WHOLE video from its storyboard (dialogue boxes read)
montage a.png b.png c.png -filter point -resize 400% -tile 6x -geometry +6+6 -background '#ddd' stills.png   # many tiny sprites
```

- **A still**: one note line: what it shows, pose, colours, anything new.
- **A gif is a motion, not a story: it gets a motion line, never a summary.** Read the frames in
  order and say what moves and how (a twirl, a bob, knives closing like a jaw), with the frame count.
  That line becomes the idle, the attack, the clip you key. A gif over 24 frames: pass `""  24` so the motion isn't skipped.
- **A video is a story: summarise it before anything else**, 3 to 6 sentences in order: who is there,
  what happens, how it ends, what it shows about how the subject looks, moves or fights. Use the
  captions file or `spawn read_url <url>` transcript when there is one; otherwise summarise from the
  frames (dialogue boxes, on-screen text) plus what the wiki says that scene is, and the brief says
  "from frames". A video over ~8 min, or one the frames don't explain: run `yt.sh … 32`.
- `yt.sh` saying "fallback, 4 stills only" means you did NOT watch it: say so in the summary.

## Step D: the brief: `research/<slug>.md` in the world

One page, written before anything is built; the next Savi reads it instead of searching again.

```markdown
---
summary: <who/what in one line>
subject: <name> (<franchise>)
researched: <date>
pass: full | light
sources: [<url>, …]
---
# <Name>
## Who
3-5 lines: what they are, role, personality, the one quote that sounds like them.
## Look sheet
- silhouette: the 2-3 shapes that make them recognisable at 20 m
- proportions: heads tall, height vs others
- palette: hex values sampled from the sprites, most-used first
- signature details: what must never be missing
## Motion & moves
One motion line per gif (file, frame count, what moves). Moves the wiki describes.
## Video summaries
One paragraph per video: link, what happens, what it teaches the build. "From frames" when it was.
## Refs
| what | /cdn/ address | source | credit |   (fan art: artist + link)
## For the build
Which ref feeds which piece (model, texture, clip, icon), the 3 things that make it read as them,
what you'll deliberately simplify.
## Open questions
What you couldn't confirm or open. Ask the creator only the ones that change the build.
```

Sample real colours: `convert sprite.png -format %c histogram:info:- | sort -rn | head -12` (skip the
alpha-0 key colour and the near-black outline when naming the palette).

## Step E: think, then say, then build

Before the first world write:
1. Re-read the brief's **Look sheet**, **Motion** and **For the build**. Decide the plan: pieces,
   which refs each gets, what you'll check at the end.
2. Tell the creator in one or two texts what you found that shapes the build: "she's a tiny cyan
   plant-girl, horn-curl black hair, red heart bow, throws knives in fans and chains. building her from the sprites now."
   If they only asked to search, stop here and offer the build.
3. Build **from the refs**, using every one the brief maps:
   - a wisp's brief carries up to 4 `/cdn/` refs on `referenceImages` (official first, one fan art piece for a 3D read), plus the look sheet word for word
   - `spawn paint "<what>" --ref <cdn address>` for icons, portraits and posters in the subject's style
   - geometry: the palette's hex values, the silhouette's shapes, the sprite's proportions; clips from the gif motion lines
4. When it stands, **look at it beside the ref** (`look` with `reference: "<cdn address>"`) and fix what differs.

## Using what you found

- Pulled art is **reference**: looked at, colour-sampled, handed to `--ref` and to wisps. What stands
  in the game is made here. Don't hang a ripped sprite sheet or someone's fan art as the game's own
  art unless the creator hands it to you as theirs to use; say so when they ask for "the real sprite".
- Credit fan artists in the Refs table: artist and link.
- A source that refuses (403, login wall): note it and go to the next. Don't hunt for ways around it.
- Facts about a real person or event come from the page you read, never memory, with the link.

## Done means

- [ ] thought first; the opener went out before the first search
- [ ] the creator's attachments and links were viewed before anything else
- [ ] every pulled image, gif and video went through a sheet you Read
- [ ] every gif has a motion line (no summary); every video a summary (or "only stills" said)
- [ ] fan art pulled (full ≥ 3, light ≥ 1) or the refusal noted
- [ ] `research/<slug>.md` stands, with the /cdn/ refs
- [ ] the creator heard the takeaway before the build; the build was looked at beside its ref

## Worked example
`examples/aqua.md` in this mod is a full pass on Aqua (Deltarune). It has the brief, the sampled palette, gif motion lines, a video summary read from frames, the refs table, and a progress picture from refs to the finished figure. Match its depth.