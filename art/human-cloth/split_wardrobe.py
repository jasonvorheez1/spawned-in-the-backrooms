"""Split the packed human body .glb (every garment and beard inside one 33 MB file) into
the bare body plus one .glb per garment/beard, each keeping the whole rig so it can ride the body
as a skinned child (attachment: { skin: true }). Usage: split_wardrobe.py packed.glb outdir"""
import json, struct, sys, pathlib, copy
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
b = src.read_bytes(); L = struct.unpack('<I', b[12:16])[0]; J = json.loads(b[20:20 + L])
off = 20 + L; BL = struct.unpack('<I', b[off:off + 4])[0]; BIN = b[off + 8:off + 8 + BL]
SPLIT = lambda n: n.startswith('Ward_') or n.startswith('Beard_')

def write(keep_mesh_nodes, path):
    j = copy.deepcopy(J)
    for i, n in enumerate(j['nodes']):
        if 'mesh' in n and i not in keep_mesh_nodes: del n['mesh']; n.pop('skin', None)
    used_meshes = sorted({n['mesh'] for n in j['nodes'] if 'mesh' in n})
    mremap = {o: k for k, o in enumerate(used_meshes)}; j['meshes'] = [j['meshes'][o] for o in used_meshes]
    for n in j['nodes']:
        if 'mesh' in n: n['mesh'] = mremap[n['mesh']]
    # accessors still referenced
    acc = set()
    for m in j['meshes']:
        for p in m['primitives']:
            acc.update(p['attributes'].values()); acc.add(p['indices']) if 'indices' in p else None
            for t in p.get('targets', []): acc.update(t.values())
    for s in j.get('skins', []): acc.add(s['inverseBindMatrices'])
    for a in j.get('animations', []):
        for sm in a['samplers']: acc.update([sm['input'], sm['output']])
    acc = sorted(acc); aremap = {o: k for k, o in enumerate(acc)}
    views = sorted({J['accessors'][o]['bufferView'] for o in acc if 'bufferView' in J['accessors'][o]} | {im['bufferView'] for im in J.get('images', []) if 'bufferView' in im})
    blob = bytearray(); vremap = {}; nviews = []
    for o in views:
        v = copy.deepcopy(J['bufferViews'][o]); data = BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        while len(blob) % 4: blob.append(0)
        v['byteOffset'] = len(blob); blob += data; vremap[o] = len(nviews); nviews.append(v)
    j['bufferViews'] = nviews
    j['accessors'] = [dict(J['accessors'][o], **({'bufferView': vremap[J['accessors'][o]['bufferView']]} if 'bufferView' in J['accessors'][o] else {})) for o in acc]
    for m in j['meshes']:
        for p in m['primitives']:
            p['attributes'] = {k: aremap[v] for k, v in p['attributes'].items()}
            if 'indices' in p: p['indices'] = aremap[p['indices']]
            p['targets'] = [{k: aremap[v] for k, v in t.items()} for t in p.get('targets', [])] or p.pop('targets', None) or []
            if not p['targets']: p.pop('targets')
    for s in j.get('skins', []): s['inverseBindMatrices'] = aremap[s['inverseBindMatrices']]
    for a in j.get('animations', []):
        for sm in a['samplers']: sm['input'] = aremap[sm['input']]; sm['output'] = aremap[sm['output']]
    for im in j.get('images', []):
        if 'bufferView' in im: im['bufferView'] = vremap[im['bufferView']]
    # drop materials nothing uses? keep: indices stay valid and they cost bytes only through textures
    while len(blob) % 4: blob.append(0)
    j['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(blob)) + b'BIN\0' + bytes(blob)
    path.write_bytes(glb); return len(glb)

mesh_nodes = {i: n['name'] for i, n in enumerate(J['nodes']) if 'mesh' in n}
base = {i for i, n in mesh_nodes.items() if not SPLIT(n)}
report = {'body': write(base, out / 'body.glb')}
for i, n in mesh_nodes.items():
    if SPLIT(n): report[n] = write({i}, out / f'{n}.glb')
print(json.dumps({k: round(v / 1e6, 2) for k, v in report.items()}))
