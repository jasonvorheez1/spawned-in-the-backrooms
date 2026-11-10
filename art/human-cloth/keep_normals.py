"""Copy NORMAL from the source garment .glb into a reworked one (same vertex order). Blender's re-export recomputes
normals and flips some on the shell, so the engine culls them and skin shows through as holes. Usage: src.glb new.glb out.glb"""
import json, struct, sys, numpy as np
def load(f):
    d = open(f, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; return json.loads(d[20:20 + n]), bytearray(d), 20 + n + 8
def view(j, d, base, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; o = base + bv.get('byteOffset', 0) + a.get('byteOffset', 0); return o, a['count'] * 12
(ja, da, ba), (jb, db, bb) = load(sys.argv[1]), load(sys.argv[2])
for ma, mb in zip(ja['meshes'], jb['meshes']):
    for pa, pb in zip(ma['primitives'], mb['primitives']):
        oa, na = view(ja, da, ba, pa['attributes']['NORMAL']); ob, nb = view(jb, db, bb, pb['attributes']['NORMAL'])
        assert na == nb; db[ob:ob + nb] = da[oa:oa + na]; print('normals kept', na // 12)
open(sys.argv[3], 'wb').write(db)
