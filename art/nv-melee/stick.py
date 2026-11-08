# proof: stick figure of a decoded .kf at 4 phases, front (x,z) and side (y,z)
import json, sys
from PIL import Image, ImageDraw
J = json.load(open(sys.argv[1])); F = J["frames"]
E = [("Bip01 Pelvis", "Bip01 Spine"), ("Bip01 Spine", "Bip01 Spine1"), ("Bip01 Spine1", "Bip01 Spine2"), ("Bip01 Spine2", "Bip01 Neck"), ("Bip01 Neck", "Bip01 Neck1"), ("Bip01 Neck1", "Bip01 Head")]
for s in "LR": E += [("Bip01 Neck", f"Bip01 {s} Clavicle"), (f"Bip01 {s} Clavicle", f"Bip01 {s} UpperArm"), (f"Bip01 {s} UpperArm", f"Bip01 {s} Forearm"), (f"Bip01 {s} Forearm", f"Bip01 {s} Hand"), (f"Bip01 {s} Hand", f"Bip01 {s} Finger2")]
E += [("Bip01 R Hand", "Weapon")]
im = Image.new("RGB", (1200, 600), "white"); dr = ImageDraw.Draw(im)
P = F[0]["Bip01 Pelvis"]
for k, fi in enumerate([0, len(F)//4, len(F)//2, 3*len(F)//4]):
    f = F[fi]
    for v, (ax, bx) in enumerate([(0, 2), (1, 2)]):
        ox = 150 + k*300; oy = 200 + v*300
        for a, b in E:
            if a in f and b in f:
                A, B = f[a], f[b]; col = "red" if (" R " in a + b or b == "Weapon") else ("blue" if " L " in a + b else "black")
                dr.line([ox + (A[ax]-P[ax])*2, oy - (A[bx]-P[bx])*2, ox + (B[ax]-P[ax])*2, oy - (B[bx]-P[bx])*2], fill=col, width=3)
im.save(sys.argv[2])
