# swaps the filled bodies and refit garments into the data files; keeps the old ids for saved-look migration
import re, sys
W = '/workspace/world/'
OLD = {'m': '/cdn/value.a7909f9c5a5c2ee1e19878e64defa509257d618b4a033b22179088fdd208ae6f.glb', 'f': '/cdn/value.b7e9e975757bd462383a34e82b2214aa10a8a589b2625ab820e71f5385a8dd7d.glb'}
NEW = {'m': '/cdn/value.a7c2f40f9574ca75d02cce2863ab58d16df8ec6d9bb80c08a570d857aad3113a.glb', 'f': '/cdn/value.44b0539f30681142194747ef8f4fbdd95ba5db883fffe7bdc5f83cb44bb4d5db.glb'}
pairs = dict(OLD[s] and (OLD[s], NEW[s]) for s in 'mf')
for line in open('/workspace/bodyshape/pairs.txt'):
    a, b = line.split(); pairs[a] = b
for f in ('scripts/lib/data/critter-models.yml', 'scripts/lib/data/wardrobe-split.yml'):
    t = open(W + f).read(); n = 0
    for a, b in pairs.items():
        n += t.count(a); t = t.replace(a, b)
    open(W + f, 'w').write(t); print(f, n, 'swaps')
js = open(W + 'scripts/lib/critter-model.js').read()
js = js.replace("const OLD_HUMAN = [", "const OLD_HUMAN = ['%s', '%s', " % (OLD['m'], OLD['f']), 1)
js = js.replace("const femaleBody = (id) => [M.body.f, M.human?.f, ", "const femaleBody = (id) => [M.body.f, M.human?.f, '%s', " % OLD['f'], 1)
js = js.replace("export const STYLE_V = 'sw81' // ", "export const STYLE_V = 'sw82' // sw82: fuller thighs, calves, hips and upper arms on both human bodies, every garment moved with them (art/body-shape); ", 1)
open(W + 'scripts/lib/critter-model.js', 'w').write(js); print('js ok', 'sw82' in js)
