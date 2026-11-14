#!/bin/bash
# $1 = line number (1-based)
cd /workspace/world/art/kyoto
IFS=$'\t' read -r seg title who text < <(sed -n "${1}p" lines.tsv)
v=Kenzo; [ "$who" = H ] && v=Kaori
out=$(spawn voice "[Japanese accent] $text" --voice $v --stability creative --name "kd-$1" 2>&1)
clip=$(echo "$out" | grep -o '/cdn/value\.[a-f0-9]*\.mp3' | head -1)
dur=$(echo "$out" | grep -o 'duration: [0-9.]*' | head -1 | cut -d' ' -f2)
echo -e "$1\t$clip\t$dur" > out/$1.tsv
