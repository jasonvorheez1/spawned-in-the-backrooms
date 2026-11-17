// Asset Library — the photo booth. Rides the instance god.js stands up for a
// card's picture, and its whole job is framing: read the body's real bounds,
// then park that body ON the viewer's view ray at the distance where it fills
// the frame, with the backdrop panel behind it wide enough to fill the rest.
// The picture is then a portrait of THIS asset standing in THIS game — not a
// screenshot of whatever the creator happened to be looking at.
//
// The camera is read live every tick, so a creator who is still flying drags
// the booth along with them and the shot still lands centred.

const V = require("builtin/vec3");

// How much of the frame's height the body should fill.
const FILL = 0.62;

export function extents(box) {
  if (!box) return null;
  const min = box.min || box.minimum;
  const max = box.max || box.maximum;
  if (!min || !max) return null;
  const g = (v, k, i) => (v[k] != null ? v[k] : v[i]);
  const w = Math.abs(g(max, "x", 0) - g(min, "x", 0));
  const h = Math.abs(g(max, "y", 1) - g(min, "y", 1));
  const d = Math.abs(g(max, "z", 2) - g(min, "z", 2));
  return { w: w, h: h, d: d, span: Math.max(w, h, d) };
}

export const updateSchedule = { every: 3 };

export function update(api, dt) {
  const st = api.getState() || {};

  // Live view first — the creator may have moved since the shutter was asked
  // for, and a booth framed against a stale camera is the old bug.
  const live = api.getCamera();
  const cam = live && live.position ? live.position : st.cam;
  const rawFwd = live && live.forward ? live.forward : st.fwd;
  const fov = (live && live.fov) || 60;
  if (!cam || !rawFwd) return;

  const tries = (st.tries || 0) + 1;
  api.patchState({ tries: tries });

  const ext = extents(api.getWorldBoundsBox());
  const span = ext ? ext.span : 0;
  if (span < 0.15) {
    // Nothing standing here yet — the body is still cooking. Give it a while,
    // then say so instead of letting the panel photograph an empty field.
    if (tries === 15) {
      api.uiEvent("alStaged", { asset: st.asset, ready: false }, { kind: "all" });
    }
    return;
  }

  // Re-frame when the body changes (a model swapping in late is a different
  // size than the placeholder it was framed against) or when the view moves.
  const lastSize = st.lastSize || 0;
  const lastCam = st.lastCam;
  const sizeMoved = !lastSize || Math.abs(span - lastSize) / Math.max(span, lastSize) >= 0.06;
  const camMoved =
    !lastCam ||
    Math.abs(lastCam.x - cam.x) + Math.abs(lastCam.y - cam.y) + Math.abs(lastCam.z - cam.z) > 0.35 ||
    Math.abs((lastCam.fx || 0) - rawFwd.x) + Math.abs((lastCam.fz || 0) - rawFwd.z) > 0.02;
  if (!sizeMoved && !camMoved) return;

  const dir = V.normalize({ x: rawFwd.x, y: rawFwd.y, z: rawFwd.z });
  const halfFov = Math.max(0.15, ((fov || 60) * Math.PI) / 360);
  // The distance at which a body this tall fills FILL of the frame's height.
  const dist = Math.max(1.4, span / (2 * FILL * Math.tan(halfFov)));

  // The body's CENTRE goes on the view ray; feet hang half a height below it.
  const centre = { x: cam.x + dir.x * dist, y: cam.y + dir.y * dist, z: cam.z + dir.z * dist };
  const feetY = centre.y - (ext.h || span) * 0.5;
  api.setProperty("feetPosition", { x: centre.x, y: feetY, z: centre.z });
  api.setProperty("rotation", { lookAt: { x: cam.x, y: feetY, z: cam.z } });

  api.patchState({ lastSize: span, lastCam: { x: cam.x, y: cam.y, z: cam.z, fx: dir.x, fz: dir.z } });

  // The backdrop sits just behind the body and is scaled to overfill the frame
  // at its own distance, so the portrait has no world leaking in around it.
  const back = st.back;
  if (back) {
    const backDist = dist + Math.max(1.2, span * 0.9);
    const need = backDist * Math.tan(halfFov) * 2 * 1.9;
    api.setObjectProperty(back, "feetPosition", {
      x: cam.x + dir.x * backDist,
      y: centre.y - need * 0.5,
      z: cam.z + dir.z * backDist,
    });
    // A slab, not a plane: a box's face turns to meet a lookAt every time,
    // where a flat plane's normal is up and can end up edge-on to the camera.
    api.setObjectProperty(back, "primitive", { kind: "box", width: 20, height: 20, depth: 0.4 });
    // Open air behind the asset, lit from itself so the portrait never comes
    // back as a dark wall no matter what hour the world is at.
    api.setObjectProperty(back, "material", {
      color: "oklch(0.82 0.06 245)",
      emissive: "oklch(0.82 0.06 245)",
      emissiveIntensity: 0.55,
      roughness: 1,
      metalness: 0,
    });
    api.setObjectProperty(back, "rotation", { lookAt: { x: cam.x, y: centre.y, z: cam.z } });
    api.setObjectProperty(back, "scale", Math.max(0.25, need / 20));
  }

  // One more tick of settling before the shutter — the panel uses this to pull
  // its next frame forward, but it never waits on it.
  api.runInSeconds(0.4, () => api.uiEvent("alStaged", { asset: st.asset, ready: true }, { kind: "all" }));
}
