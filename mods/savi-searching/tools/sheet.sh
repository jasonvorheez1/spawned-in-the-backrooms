#!/usr/bin/env bash
# savi-searching: turn any picture, gif or video into ONE readable contact sheet png.
# usage: bash mods/savi-searching/tools/sheet.sh <file> [out.png] [frames]
#   png/jpg/webp : pixel art (< 256 px) is upscaled nearest-neighbour so a sprite reads
#   gif          : every frame, or exactly <frames> (default 12) evenly spread, numbered i/total, in order (+ <out>.mp4)
#   big stills are capped at 1600 px so the sheet reads in one look
#   mp4/webm/mov : <frames> keyframes (default 12) spread across the clip, each stamped with its time
# prints the sheet path, the frame count and, for video, its duration. then: spawn see <sheet>
set -euo pipefail
[ $# -ge 1 ] && [ -f "$1" ] || { echo "usage: bash sheet.sh <file> [out.png] [frames]  (file not found: ${1:-none})"; exit 2; }
in="$1"; out="${2:-${in%.*}.sheet.png}"; n="${3:-12}"
ext="$(echo "${in##*.}" | tr A-Z a-z)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
up() { # nearest-neighbour upscale small art so its pixels read
  local w; w=$(identify -format '%w' "$1[0]" 2>/dev/null || echo 999)
  if [ "$w" -lt 256 ]; then local k=$(( 256 / w )); [ "$k" -lt 2 ] && k=2; mogrify -filter point -resize "$((k*100))%" "$1"; fi
}
label() { # a caption bar sized to the frame, so it stays readable when the sheet is shown shrunk
  local w ps; w=$(identify -format '%w' "$1"); ps=$(( w / 12 )); [ "$ps" -lt 12 ] && ps=12; [ "$ps" -gt 28 ] && ps=28
  convert "$1" -background '#222' -fill white -gravity north -splice 0x$((ps+6)) -pointsize "$ps" -annotate +0+2 "$2" "$1"
}
cols() { # columns so the sheet stays under ~1600 px wide
  local w c; w=$(identify -format '%w' "$1"); c=$(( 1600 / (w + 8) )); [ "$c" -lt 1 ] && c=1; [ "$c" -gt 6 ] && c=6; [ "$c" -gt "$2" ] && c=$2; echo "$c"
}
case "$ext" in
  gif)
    convert "$in" -coalesce "$tmp/f_%03d.png"
    files=( "$tmp"/f_*.png ); total=${#files[@]}
    show=$n; [ "$total" -lt "$show" ] && show=$total
    # exactly <show> frames, evenly spread over the whole loop (first and last included)
    idx=$(python3 -c "t,s=$total,$show;print(' '.join(str(round(k*(t-1)/(s-1))) if s>1 else '0' for k in range(s)))")
    keep=()
    for i in $idx; do f="${files[$i]}"; up "$f"; label "$f" "frame $i/$total"; keep+=("$f"); done
    montage "${keep[@]}" -tile "$(cols "${keep[0]}" ${#keep[@]})x" -geometry +4+4 -background '#111' "$out"
    echo "sheet: $out  (gif, $total frames, showing ${#keep[@]}; read left to right, top to bottom)"
    # an mp4 copy too, so the motion can be uploaded and watched (gif is not a store type)
    mp4="$(dirname "$out")/$(basename "${in%.*}").mp4"
    gw=$(identify -format '%w' "$in[0]"); k=1; [ "$gw" -lt 256 ] && k=4
    ffmpeg -loglevel error -y -i "$in" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw*$k/2)*2:trunc(ih*$k/2)*2:flags=neighbor" "$mp4" && echo "motion copy: $mp4  (spawn upload it for a /cdn/ address)"
    ;;
  mp4|webm|mov|mkv|m4v)
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in"); [ -z "$dur" ] && dur=1
    for k in $(seq 0 $((n-1))); do
      t=$(python3 -c "print(round(($k+0.5)*float('$dur')/$n,2))")
      ffmpeg -loglevel error -y -ss "$t" -i "$in" -frames:v 1 -vf "scale=360:-2" "$tmp/k_$(printf %03d $k).png" || continue
      [ -f "$tmp/k_$(printf %03d $k).png" ] || continue
      convert "$tmp/k_$(printf %03d $k).png" -background '#222' -fill white -gravity north -splice 0x18 -pointsize 14 -annotate +0+1 "t=${t}s" "$tmp/k_$(printf %03d $k).png"
    done
    montage "$tmp"/k_*.png -tile 4x -geometry +4+4 -background '#111' "$out"
    echo "sheet: $out  (video, $(printf %.1f "$dur")s, $n keyframes; read them in order, left to right, top to bottom)"
    ;;
  *)
    convert "$in[0]" "$tmp/one.png"; up "$tmp/one.png"; convert "$tmp/one.png" -resize '1600x1600>' "$out"   # big art capped at 1600 px
    echo "sheet: $out  (still, $(identify -format '%wx%h' "$in[0]") source px)"
    ;;
esac
