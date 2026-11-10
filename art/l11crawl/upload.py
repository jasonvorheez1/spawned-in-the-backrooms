# uploads art/l11crawl/out/l11c_*.glb by sha256 and writes art/l11crawl/uploads.json { name: "/cdn/value.<sha>.glb" }
import hashlib, json, os, glob, urllib.request
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out")
tok = open(os.path.expanduser("~/.spawn/token")).read().strip(); wid = "1396599f-f852-4004-a2e6-87336fcb919c"
P = os.path.join(D, "uploads.json"); res = json.load(open(P)) if os.path.exists(P) else {}
for f in sorted(glob.glob(os.path.join(OUT, "l11c_*.glb"))):
    b = open(f, "rb").read(); sha = hashlib.sha256(b).hexdigest(); name = os.path.basename(f)[5:-4]
    req = urllib.request.Request(f"https://www.spawn.co/api/sdk/v1/{wid}/assets/value.{sha}.glb", data=b, method="PUT", headers={"Authorization": "Bearer " + tok, "Content-Type": "model/gltf-binary"})
    try: code = urllib.request.urlopen(req, timeout=120).status
    except Exception as e: code = str(e)
    print(name, len(b) // 1024, "KB", code); res[name] = f"/cdn/value.{sha}.glb"
json.dump(res, open(P, "w"), indent=1)
