import concurrent.futures, glob, hashlib, os, re, urllib.request

tok = open(os.path.expanduser('~/.spawn/token')).read().strip()
wid = '1396599f-f852-4004-a2e6-87336fcb919c'
out_dir = 'art/critter-cute/out'
files = sorted(glob.glob(os.path.join(out_dir, 'critter-sp-*.glb')))

def upload_file(f):
    b = open(f, 'rb').read()
    sha = hashlib.sha256(b).hexdigest()
    url = f'https://www.spawn.co/api/sdk/v1/{wid}/assets/value.{sha}.glb'
    req = urllib.request.Request(url, data=b, method='PUT', headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'model/gltf-binary'})
    code = 'err'
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        code = resp.status
    except Exception as e:
        code = str(e)
    name = os.path.basename(f)
    cdn_path = f'/cdn/value.{sha}.glb'
    return name, code, cdn_path

results = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for name, code, cdn_path in ex.map(upload_file, files):
        results[name] = cdn_path
        print(f'{name} -> {code} {cdn_path}')

with open('art/critter-cute/uploads-heads-facetypes.txt', 'w') as f:
    for name in sorted(results.keys()):
        f.write(f'{name} 201 {results[name]}\n')

yml_path = 'scripts/lib/data/critter-models.yml'
with open(yml_path, 'r') as f:
    lines = f.readlines()

new_lines = []
updated_count = 0
for line in lines:
    m = re.match(r'^  ([a-z0-9]+):\s*\{\s*head:\s*"[^"]*",\s*headM:\s*"[^"]*",\s*headF:\s*"[^"]*"(.*)$', line)
    if m:
        sp = m.group(1)
        rest = m.group(2)
        head_m = results.get(f'critter-sp-{sp}-m.glb')
        head_f = results.get(f'critter-sp-{sp}-f.glb')
        if head_m and head_f:
            new_lines.append(f'  {sp}: {{ head: "{head_m}", headM: "{head_m}", headF: "{head_f}"{rest}\n')
            updated_count += 1
            continue
    new_lines.append(line)

with open(yml_path, 'w') as f:
    f.writelines(new_lines)

print(f'Updated {updated_count} species in critter-models.yml successfully!')

