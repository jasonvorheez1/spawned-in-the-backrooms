# Upload the v2 animal heads (heads2.py) and point critter-models.yml at them. Human and faceling heads are never touched.
# Run from the repo root: python art/critter-cute/upload2.py
# Pack first into out/packed (gltf-transform: sparse morphs, quantize, meshopt; never dedup, it merges slots that share a default colour): raw heads are over the upload cap.
import concurrent.futures, glob, hashlib, os, re, urllib.request
tok = open(os.path.expanduser('~/.spawn/token')).read().strip()
wid = '1396599f-f852-4004-a2e6-87336fcb919c'
SKIP = {'human', 'faceling'}
files = [f for f in sorted(glob.glob('art/critter-cute/out/packed/critter-sp-*.glb')) if re.match(r'critter-sp-(.+)-[mf]\.glb', os.path.basename(f)).group(1) not in SKIP]

def up(f):
    b = open(f, 'rb').read(); sha = hashlib.sha256(b).hexdigest()
    req = urllib.request.Request(f'https://www.spawn.co/api/sdk/v1/{wid}/assets/value.{sha}.glb', data=b, method='PUT',
                                 headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'model/gltf-binary'})
    try: code = urllib.request.urlopen(req, timeout=120).status
    except Exception as e: code = str(e)[:80]
    return os.path.basename(f), code, f'/cdn/value.{sha}.glb'

res, bad = {}, []
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for name, code, cdn in ex.map(up, files):
        if code in (200, 201): res[name] = cdn
        else: bad.append((name, code))
print('uploaded', len(res), 'failed', bad)
with open('art/critter-cute/uploads-heads-v2.txt', 'w') as f:
    for n in sorted(res): f.write(f'{n} {res[n]}\n')
p = 'scripts/lib/data/critter-models.yml'; lines = open(p, encoding='utf-8').read().split('\n'); n = 0
for i, line in enumerate(lines):
    m = re.match(r'^  ([a-z0-9]+):\s*\{\s*head:\s*"[^"]*",\s*headM:\s*"[^"]*",\s*headF:\s*"[^"]*"(.*)$', line)
    if not m or m.group(1) in SKIP: continue
    sp = m.group(1); hm, hf = res.get(f'critter-sp-{sp}-m.glb'), res.get(f'critter-sp-{sp}-f.glb')
    if hm and hf: lines[i] = f'  {sp}: {{ head: "{hm}", headM: "{hm}", headF: "{hf}"{m.group(2)}'; n += 1
open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
print('species updated', n)
