#!/bin/bash
# pass 3, men (Shelly Nov 11 "male bodies need a bit of a makeover"): shoulders.py (DX 3.2 cm, DZ 0.6, deltoid .10) then
# male3.py's field (flat chest, narrow hips, wider back), weld_weights on the body; every men's garment moved the same way.
W=/workspace/male3; mkdir -p $W/g; cd $W
GT="npx -y @gltf-transform/cli@4"; B="/opt/blender/blender -b --factory-startup --python-exit-code 1 --python"
export DX=0.032 DZ=0.006 DELT=0.10
python3 - > list.txt <<'PY'
import yaml; S=yaml.safe_load(open('/workspace/world/scripts/lib/data/wardrobe-split.yml'))['m']
for k,v in list(S.get('parts',{}).items())+[('inner',S.get('inner'))]:
    if v: print(k, v)
PY
touch pairs.txt
while read k url; do
  h=$(basename $url .glb); [ -f g/$h.out ] && continue
  curl -sfL "https://spawn.co$url?raw" -o g/$h.glb || { echo "FETCH FAIL $k"; continue; }
  timeout 120 $GT dequantize g/$h.glb g/$h.dq.glb >/dev/null 2>&1 || { echo "DQ FAIL $k"; continue; }
  $B /workspace/world/art/human-body/shoulders.py -- g/$h.dq.glb g/$h.sh.glb >/dev/null 2>&1 || { echo "SH FAIL $k"; continue; }
  python3 /workspace/world/art/body-shape/fill.py garment $W/m_field.npz g/$h.sh.glb g/$h.fill.glb >/dev/null 2>&1 || { echo "FILL FAIL $k"; continue; }
  timeout 120 $GT meshopt g/$h.fill.glb g/$h.mo.glb >/dev/null 2>&1 || cp g/$h.fill.glb g/$h.mo.glb
  new=$(spawn upload g/$h.mo.glb --name "${k}_m_male3" | grep -o '/cdn/value[^ ]*glb' | head -1)
  [ -n "$new" ] && echo "$url $new" >> pairs.txt && echo "$k -> ok"
  touch g/$h.out
done < list.txt
$GT meshopt m3w.glb m3w_mo.glb >/dev/null 2>&1
echo "BODY $(spawn upload m3w_mo.glb --name human_m_male3 | grep -o '/cdn/value[^ ]*glb' | head -1)"
echo DONE $(wc -l < pairs.txt)
