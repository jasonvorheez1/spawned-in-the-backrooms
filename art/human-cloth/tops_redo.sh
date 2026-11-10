#!/bin/bash
# tops redo driver: name sleeve hem standoff tailhem(-=none) tank(0/1); body glb in $1, originals in $2, out dir $3
B=$1; O=$2; D=$3; shift 3
BL="/opt/blender/blender -b --factory-startup --python-exit-code 1 --python"
while read n sl hem st tl tk; do
  [ -z "$n" ] && continue
  W=Ward_$n
  WARD=$W SLEEVE=$sl HEM=$hem STANDOFF=$st FLARE=0.012 TANK=$tk $BL art/human-cloth/tee_shell.py -- $B $D/_s_$n.glb >/dev/null 2>&1 || { echo FAIL shell $n; continue; }
  T=-; if [ "$tl" != "-" ]; then WARD=$W HEM=$tl FLARE=0.14 STANDOFF=$(python3 -c "print($st+0.006)") WAIST=0.09 $BL art/human-cloth/skirt_shell.py -- $B $D/_t_$n.glb >/dev/null 2>&1 && T=$D/_t_$n.glb; fi
  WARD=$W $BL art/human-cloth/top_join.py -- $B $D/$W.glb $D/_s_$n.glb $T - 2>&1 | grep JOINED || echo FAIL join $n
done
