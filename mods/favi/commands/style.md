---
name: style
description: Use Favi's saved reference images as this conversation's style references (fetches 10+ first if the style isn't saved yet). Usage: /style [art style]
---

# /style: Favi's reference set, loaded as references

The creator's words after /style name an art style (or nothing: then use the ACTIVE set). This command is equivalent to the creator uploading every image in that set as a reference picture.

1. Read the sets: `run_script` (readOnly) `return ctx.world.state.favi?.refs` → `{ styles: { <key>: { name, images: [{ url, src, license }], at } }, active, pending }`. The key is the style lowercased, non-alphanumerics → "-".
2. If the named style (or `pending`) has fewer than 10 images, fetch it now, on the workshop box:
   - search Openverse (openly licensed art, direct image urls): `curl -s "https://api.openverse.org/v1/images/?q=<style, url-encoded>&page_size=30&mature=false"`; keep results with width ≥ 500; prefer licenses cc0, by, by-sa, pdm. If fewer than 12 come back, add `spawn web_search "<style> art"` pages and pull image urls from them with `spawn read_url`.
   - download 12–16 to /tmp/refs/<key>/, drop anything that isn't a real image (`file` says JPEG/PNG/WebP) or is under 20 KB, then `spawn see` a contact sheet (imagemagick `montage`) and drop off-style ones. Keep at least 10.
   - `spawn upload` each kept file → its /cdn/ address.
   - write back with one run_script: `const r = ctx.world.state.favi.refs; r.styles = { ...r.styles, [key]: { name, images: [{ url, src, license }, …], at: ctx.now() } }; r.active = key; r.pending = null;`
2b. **More like one image**: when `pending.like` is set (the creator tapped an image), reshape the set around it. Look at `like` and the `avoid` images (`spawn see`), name what sets `like` apart (subject, medium, palette, framing) and search for THAT (Openverse with those words, the like-image's own source title/tags, web search). Download 15+, contact-sheet them beside `like`, keep the ones closest to `like` and least like the avoided ones. Write back: the `like` image first with `seed: true`, then the new finds, then at most a few of the old ones that still match, 10+ total; `pending = null`.
3. Take them in as references: `Read` (or `spawn see`) every image in the set so you have actually looked at each, then write a 3-line style read (palette, line/edge, light, texture, what makes it THIS style) to `memory/game/style-<key>.md` with the urls.
4. From here on in this conversation, treat the set exactly like creator-uploaded references: every `spawn paint` gets `--ref <url>` for the 3–5 closest images, every `look` that judges the build passes one as `reference`, and textures, palette, materials and the aesthetic file follow the style read. Say in one line which style is loaded and how many images.