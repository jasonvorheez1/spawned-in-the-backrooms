"""Run in Blender: --python check-fit.py -- <wardrobe output folder>."""
import bpy, sys
from pathlib import Path

root = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
for tag in ['m', 'f', 'fur_m', 'fur_f']:
    bpy.ops.wm.open_mainfile(filepath=str(root / f'wardrobe_{tag}.glb.blend'))
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    hip = (rig.matrix_world @ rig.data.bones['Hips'].head_local).z
    neck = 'Neck' if 'Neck' in rig.data.bones else 'neck'
    scale = ((rig.matrix_world @ rig.data.bones[neck].head_local).z - hip) / .51
    for name in ['jacket', 'hoodie', 'megjacket', 'padjacket', 'longsleeve', 'sweater', 'shirt', 'blazer']:
        garment = bpy.data.objects['Ward_' + name]
        band = [garment.matrix_world @ v.co for v in garment.data.vertices]
        band = [p for p in band if hip + .12 * scale < p.z < hip + .24 * scale]
        width = max(abs(p.x) for p in band)
        assert width < .26 * scale, f'{tag} {name}: torso half-width {width:.3f} m exceeds body fit'
    print('PASS: torso fit', tag, flush=True)
