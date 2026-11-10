#!/bin/bash
# refits every split garment to the filled bodies: fetch -> dequantize -> fill.py garment -> meshopt -> upload; writes map.json old->new
set -e; W=/workspace/bodyshape; mkdir -p $W/g; cd $W
GT="npx -y @gltf-transform/cli@4"
python3 - > list.txt <<'PY'
import yaml; S=yaml.safe_load(open('/workspace/world/scripts/lib/data/wardrobe-split.yml'))
for sex in ('m','f'):
    for k,v in list(S[sex].get('parts',{}).items())+[('inner',S[sex].get('inner'))]:
        if v: print(sex, k, v)
PY
echo "{}" > map.json; n=0
while read sex k url; do
  h=$(basename $url .glb); [ -f g/$h.out ] && continue
  curl -sfL "https://spawn.co$url?raw" -o g/$h.glb || { echo "FETCH FAIL $k"; continue; }
  timeout 120 $GT dequantize g/$h.glb g/$h.dq.glb >/dev/null 2>&1 || { echo "DQ FAIL $k"; continue; }
  r=$(python3 /workspace/world/art/body-shape/fill.py garment /workspace/headwork/${sex}_field.npz g/$h.dq.glb g/$h.fill.glb 2>&1 | tail -1)
  mm=$(echo "$r" | awk '{print $NF}')
  if python3 -c "import sys; sys.exit(0 if float('$mm')>0.5 else 1)" 2>/dev/null; then
    timeout 120 $GT meshopt g/$h.fill.glb g/$h.mo.glb >/dev/null 2>&1
    new=$(spawn upload g/$h.mo.glb --name "${k}_${sex}_fill" | grep -o '/cdn/value[^ ]*glb' | head -1)
    [ -n "$new" ] && echo "$url $new" >> pairs.txt
    echo "$sex $k $mm mm -> $new"
  else echo "$sex $k unchanged ($r)"; fi
  touch g/$h.out
done < list.txt
echo DONE
