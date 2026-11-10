#!/bin/bash
# pass 2 (shape.py): moves every split garment with the reshaped bodies' field; writes pairs.txt old->new
set -e; W=/workspace/shape2; mkdir -p $W/g; cd $W
GT="npx -y @gltf-transform/cli@4"
python3 - > list.txt <<'PY'
import yaml; S=yaml.safe_load(open('/workspace/world/scripts/lib/data/wardrobe-split.yml'))
for sex in ('m','f'):
    for k,v in list(S[sex].get('parts',{}).items())+[('inner',S[sex].get('inner'))]:
        if v: print(sex, k, v)
PY
touch pairs.txt
while read sex k url; do
  h=$(basename $url .glb); [ -f g/$h.out ] && continue
  curl -sfL "https://spawn.co$url?raw" -o g/$h.glb || { echo "FETCH FAIL $k"; continue; }
  timeout 120 $GT dequantize g/$h.glb g/$h.dq.glb >/dev/null 2>&1 || { echo "DQ FAIL $k"; continue; }
  r=$(python3 /workspace/world/art/body-shape/fill.py garment $W/${sex}_field.npz g/$h.dq.glb g/$h.fill.glb 2>&1 | tail -1)
  mm=$(echo "$r" | awk '{print $NF}')
  if python3 -c "import sys; sys.exit(0 if float('$mm')>0.5 else 1)" 2>/dev/null; then
    timeout 120 $GT meshopt g/$h.fill.glb g/$h.mo.glb >/dev/null 2>&1
    new=$(spawn upload g/$h.mo.glb --name "${k}_${sex}_shape2" | grep -o '/cdn/value[^ ]*glb' | head -1)
    [ -n "$new" ] && echo "$url $new" >> pairs.txt
    echo "$sex $k $mm mm -> $new"
  else echo "$sex $k unchanged ($r)"; fi
  touch g/$h.out
done < list.txt
for s in m f; do $GT meshopt ${s}_new.glb ${s}_new_mo.glb >/dev/null 2>&1; echo "BODY $s $(spawn upload ${s}_new_mo.glb --name human_${s}_shape2 | grep -o '/cdn/value[^ ]*glb' | head -1)"; done
echo DONE
