"""Nov 11: the collar-split export (collar_split.py) wrote a second, unused armature ('Armature.001', skin 1, the same
54 bone names). Hair, eyewear and held weapons that seat on bones by name found that idle copy: the face turned with the
live rig while hair/glasses stayed put, and swings broke (Shelly: "the hair doesnt follow my head anymore and i cant swing
my weapon right"). This deletes the bones-only copy and its skin, names the live rig 'Armature' again from the .glb JSON, reindexing nodes; the mesh data is untouched.
usage: python3 drop_dup_rig.py in.glb out.glb"""
import json, struct, sys
src, out = sys.argv[1:3]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); rest = b[20 + jl:]
N = j['nodes']; sc = j['scenes'][j.get('scene', 0)]
def tree(r):
    out, st = set(), [r]
    while st:
        i = st.pop(); out.add(i); st += N[i].get('children', [])
    return out
roots = [r for r in sc['nodes'] if N[r].get('name', '').startswith('Armature')]
live = [r for r in roots if any('mesh' in N[i] for i in tree(r))]
dup = [r for r in roots if r not in live]           # the copy with bones and no meshes (skin 1); the meshes' rig is the live one
kill = set().union(*[tree(r) for r in dup]) if dup else set()
for r in live: N[r]['name'] = 'Armature'
used = {n.get('skin') for k, n in enumerate(N) if k not in kill and 'skin' in n}
dead_sk = [s for s in range(len(j.get('skins', []))) if s not in used]
remap = {}; keep = []
for i, n in enumerate(N):
    if i not in kill: remap[i] = len(keep); keep.append(n)
skmap = {}; skins = []
for s, sk in enumerate(j.get('skins', [])):
    if s in dead_sk: continue
    skmap[s] = len(skins); sk['joints'] = [remap[x] for x in sk['joints']]
    if 'skeleton' in sk: sk['skeleton'] = remap[sk['skeleton']]
    skins.append(sk)
for n in keep:
    if 'children' in n: n['children'] = [remap[c] for c in n['children'] if c in remap]
    if 'skin' in n: n['skin'] = skmap[n['skin']]
for s in j['scenes']: s['nodes'] = [remap[i] for i in s['nodes'] if i in remap]
for a in j.get('animations', []):
    a['channels'] = [c for c in a['channels'] if c['target'].get('node') in remap]
    for c in a['channels']: c['target']['node'] = remap[c['target']['node']]
j['nodes'] = keep; j['skins'] = skins
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
body = struct.pack('<II', len(js), 0x4E4F534A) + js + rest
open(out, 'wb').write(b[:8] + struct.pack('<I', 12 + len(body)) + body)
print('DROP', [N[i].get('name') for i in dup], 'nodes', len(N), '->', len(keep), 'skins', len(skins), 'dead', dead_sk)
