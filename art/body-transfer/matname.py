# strips Blender's ".001" dedup suffix from glTF material names, so the game's slot keys (cloth_top) still match after a refit export
import json, struct, re, sys
for f in sys.argv[1:]:
    b = open(f, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+n]); rest = b[20+n:]
    ch = 0
    for m in j.get('materials', []):
        s = re.sub(r'\.\d{3}$', '', m.get('name', ''))
        if s != m.get('name'): m['name'] = s; ch += 1
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + len(rest)) + struct.pack('<I', len(js)) + b'JSON' + js + rest
    open(f, 'wb').write(out); print(f, ch, [m['name'] for m in j.get('materials', [])])
