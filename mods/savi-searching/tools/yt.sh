#!/usr/bin/env bash
# savi-searching: watch a YouTube video you cannot download, as pictures across its WHOLE length.
# usage: bash mods/savi-searching/tools/yt.sh <youtube-url-or-id> <outdir> [frames]
# Reads the watch page for the title, length and description, then YouTube's own storyboard
# (the seek-bar previews: a 320x180 frame every few seconds, start to end) and lays <frames>
# (default 16) evenly spaced, time-stamped frames on one sheet, in order. Any captions are saved
# as <outdir>/yt_<id>.captions.txt. When the storyboard is missing it falls back to the cover
# plus YouTube's three stills at ~25/50/75% (the last is often the outro).
set -euo pipefail
u="${1:?usage: yt.sh <url-or-id> <outdir> [frames]}"; out="${2:-.}"; n="${3:-16}"; mkdir -p "$out"
id=$(python3 -c "import re,sys;m=re.search(r'(?:v=|youtu\.be/|shorts/|embed/|live/)([A-Za-z0-9_-]{11})',sys.argv[1]);print(m.group(1) if m else sys.argv[1])" "$u")
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
curl -sfL -m 20 -A "Mozilla/5.0" -H "Accept-Language: en" "https://www.youtube.com/watch?v=$id" -o "$tmp/page.html" || true
sheet="$out/yt_$id.sheet.png"
if [ -s "$tmp/page.html" ] && python3 - "$tmp" "$n" "$id" "$out" <<'PY'
import re, sys, json, subprocess, os, math
tmp, n, vid, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
h = open(f"{tmp}/page.html", encoding="utf-8", errors="ignore").read()
def js(key):
    m = re.search(r'"%s":"((?:[^"\\]|\\.)*)"' % key, h)
    return json.loads('"%s"' % m.group(1)) if m else ""
title, length, desc = js("title"), js("lengthSeconds"), js("shortDescription")
print(f"title: {title}\nlength: {length}s\ndescription: {desc[:400]}")
cap = re.search(r'"captionTracks":\[\{"baseUrl":"([^"]*)', h)
if cap:
    url = json.loads('"%s"' % cap.group(1)) + "&fmt=json3"
    r = subprocess.run(["curl", "-sfL", "-m", "20", "-A", "Mozilla/5.0", url], capture_output=True, text=True)
    try:
        ev = json.loads(r.stdout).get("events", [])
        txt = " ".join("".join(s.get("utf8", "") for s in e.get("segs", [])) for e in ev).split()
        if txt:
            open(f"{out}/yt_{vid}.captions.txt", "w").write(" ".join(txt)); print(f"captions: {out}/yt_{vid}.captions.txt ({len(txt)} words)")
    except Exception: pass
m = re.search(r'"playerStoryboardSpecRenderer":\{"spec":"([^"]*)', h)
if not m: sys.exit(3)
p = json.loads('"%s"' % m.group(1)).split("|"); base = p[0]; L = len(p) - 2
w, hh, count, cols, rows, ival, name, sigh = p[-1].split("#")[:8]
w, hh, count, cols, rows, ival = map(int, (w, hh, count, cols, rows, ival))
per = cols * rows; pages = math.ceil(count / per)
for k in range(pages):
    url = base.replace("$L", str(L)).replace("$N", name.replace("$M", str(k))) + "&sigh=" + sigh
    subprocess.run(["curl", "-sfL", "-m", "20", "-o", f"{tmp}/sb_{k}.jpg", url])
show = min(n, count); keep = []
for j in range(show):
    i = round(j * (count - 1) / (show - 1)) if show > 1 else 0
    pg, cell = divmod(i, per); src = f"{tmp}/sb_{pg}.jpg"
    if not os.path.exists(src): continue
    t = i * ival / 1000 if ival else (i * int(length or 0) / max(count - 1, 1))
    f = f"{tmp}/k_{j:03d}.png"
    subprocess.run(["convert", src, "-crop", f"{w}x{hh}+{(cell % cols) * w}+{(cell // cols) * hh}", "+repage",
                    "-background", "#222", "-fill", "white", "-gravity", "north", "-splice", "0x18", "-pointsize", "14",
                    "-annotate", "+0+1", f"t={int(t)//60}:{int(t)%60:02d}", f])
    keep.append(f)
if not keep: sys.exit(3)
subprocess.run(["montage", *keep, "-tile", "4x", "-geometry", "+4+4", "-background", "#111", f"{out}/yt_{vid}.sheet.png"], check=True)
print(f"sheet: {out}/yt_{vid}.sheet.png  (storyboard: {len(keep)} of {count} frames across the whole video, in order)")
PY
then exit 0; fi
# fallback: the cover and YouTube's three stills
got=()
for k in hqdefault 1 2 3; do
  src=$k; [ "$k" != hqdefault ] && src=hq$k
  if curl -sfL -o "$out/yt_${id}_$k.jpg" "https://i.ytimg.com/vi/$id/$src.jpg" || curl -sfL -o "$out/yt_${id}_$k.jpg" "https://i.ytimg.com/vi/$id/$k.jpg"; then
    convert "$out/yt_${id}_$k.jpg" -resize 480x360 -background '#222' -fill white -gravity north -splice 0x18 -pointsize 14 -annotate +0+1 "$( [ $k = hqdefault ] && echo cover || echo "~$((k*25))%")" "$out/yt_${id}_$k.jpg"; got+=("$out/yt_${id}_$k.jpg")
  fi
done
[ ${#got[@]} -eq 0 ] && { echo "no stills for $id (private, removed or not a video id)"; exit 1; }
montage "${got[@]}" -tile 4x -geometry +4+4 -background '#111' "$sheet"
echo "sheet: $sheet  (fallback, 4 stills only: cover, ~25% ~50% ~75%; say so in the brief)"
