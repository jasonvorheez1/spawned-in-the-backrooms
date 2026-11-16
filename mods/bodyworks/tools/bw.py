"""Medi's BodyWorks: one command takes a rigged humanoid .glb to
   T0 zones (hide-able skin parts) -> T1 cages (layered garment shells on the same rig) -> slots (which variant hides which zone)
   -> T2 bubbles (one collider capsule per zone) -> proofs.
blender -b --factory-startup --python-exit-code 1 --python mods/bodyworks/tools/bw.py -- --body in.glb --out /workspace/bw/<name> [--stages inspect,t0,t1,t2,slots,proof] [--skin REGEX] [--exclude REGEX] [--flip]
Read skills/bodyworks.md first: it is the recipe and the pass/fail checks."""
import sys, os, json, argparse, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--body', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--stages', default='inspect,t0,t1,slots,t2,export,proof')
ap.add_argument('--skin', default=None); ap.add_argument('--exclude', default=r'^(cage_|hair|wear|cloth|Icosphere)|eye|brow|lash|teeth|tongue|beard|mustache')
ap.add_argument('--flip', action='store_true'); ap.add_argument('--bust', default='auto', choices=['auto', 'flat', 'full']); ap.add_argument('--name', default=None)
ap.add_argument('--keep-materials', action='store_true', help='zones keep the source materials (default: one material per zone, a copy of the source)')
a = ap.parse_args(argv)
os.makedirs(a.out, exist_ok=True)
ST = a.stages.split(',')
from bwlib.body import Body
t0 = time.time()
body = Body(a.body, a.skin, a.exclude, a.flip)
DOC = {'bodyworks': 1, 'source': os.path.basename(a.body), 'name': a.name or os.path.splitext(os.path.basename(a.body))[0],
       'units': 'metres; Blender Z-up armature space (glTF Y-up: x, z, -y)', 'height': body.h,
       'landmarks': body.L, 'rig': body.rig.report()}
if 'inspect' in ST:
    r = body.rig.report()
    print('BODYWORKS rig: mapped %d bones, %d inherit a role, %d unmapped' % (r['mapped'], r['inherited'], len(r['unmapped'])))
    for k, v in r['main'].items(): print('   ', k.ljust(12), v)
ZONES = None
if any(s in ST for s in ('t0', 't1', 'slots', 't2', 'export')):
    from bwlib import t0 as T0
    ZONES = T0.run(body, DOC, a)
CAGES = None
if any(s in ST for s in ('t1', 'slots')):
    from bwlib import t1 as T1
    CAGES = T1.run(body, ZONES, DOC, a)
if 'slots' in ST and CAGES:
    from bwlib import slots as SL
    SL.run(body, ZONES, CAGES, DOC, a)
if 't2' in ST:
    from bwlib import t2 as T2
    T2.run(body, ZONES, DOC, a)
if 'export' in ST:
    from bwlib import export as EX
    EX.run(body, ZONES, CAGES, DOC, a)
json.dump(DOC, open(os.path.join(a.out, 'bodyworks.json'), 'w'), indent=1, default=float)
if 'proof' in ST:
    from bwlib import proof as PR
    PR.run(body, ZONES, CAGES, DOC, a)
print('BODYWORKS done in %.0fs -> %s' % (time.time() - t0, a.out))
