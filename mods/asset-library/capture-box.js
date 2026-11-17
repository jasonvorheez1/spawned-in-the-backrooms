// Asset Library — the capture box.
//
// A translucent volume the creator drops over a scene and stretches with the
// normal god-mode handles. Everything standing inside it is a set member: one
// click on "Select inside" fills the god-mode selection with those pieces, and
// the Sets tab's "save selection" turns them into a named set. Nothing about it
// is a second saving path — it is a faster way to fill the same selection a
// shift-right-click builds one piece at a time.

// Only the library's OWN scaffolding is invisible to the box — ghosts mid-drag,
// the photo booth, hover previews and the box itself. Everything the creator
// placed from the shelf is exactly what he came here to capture.
const SKIP_TAGS = ["capture-box", "ghost", "stage", "preview"];

export function corners(box) {
  if (!box) return null;
  const min = box.min || box.minimum;
  const max = box.max || box.maximum;
  if (!min || !max) return null;
  const g = (v, k, i) => (v[k] != null ? v[k] : v[i]);
  return {
    minX: Math.min(g(min, "x", 0), g(max, "x", 0)),
    maxX: Math.max(g(min, "x", 0), g(max, "x", 0)),
    minY: Math.min(g(min, "y", 1), g(max, "y", 1)),
    maxY: Math.max(g(min, "y", 1), g(max, "y", 1)),
    minZ: Math.min(g(min, "z", 2), g(max, "z", 2)),
    maxZ: Math.max(g(min, "z", 2), g(max, "z", 2)),
  };
}

export function skippable(o) {
  if (!o || !o.id) return true;
  if (String(o.id).indexOf("capture-box") === 0) return true;
  const tags = o.tags || [];
  for (let i = 0; i < SKIP_TAGS.length; i++) {
    if (tags.indexOf(SKIP_TAGS[i]) !== -1) return true;
  }
  return false;
}

// Who is standing in the volume right now. Feet decide membership: a thing is in
// the set if it is PLANTED in the box, so a tall tree leaning over the rim still
// belongs to the courtyard it grows in.
export function inside(api) {
  const c = corners(api.getWorldBoundsBox());
  if (!c) return [];
  const centre = { x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2, z: (c.minZ + c.maxZ) / 2 };
  const radius =
    Math.sqrt(
      Math.pow(c.maxX - c.minX, 2) + Math.pow(c.maxY - c.minY, 2) + Math.pow(c.maxZ - c.minZ, 2)
    ) /
      2 +
    1;

  const found = api.query({ center: centre, radius: radius }) || [];
  const out = [];
  for (let i = 0; i < found.length; i++) {
    const o = found[i];
    if (skippable(o)) continue;
    const p = o.feetPosition;
    if (!p) continue;
    if (p.x < c.minX || p.x > c.maxX) continue;
    if (p.z < c.minZ || p.z > c.maxZ) continue;
    // A little slack under the floor so ground-planted things aren't excluded by
    // a few centimetres of terrain.
    if (p.y != null && (p.y < c.minY - 0.75 || p.y > c.maxY)) continue;
    out.push(o.id);
  }
  return out;
}

export function editor(api, obj) {
  if (api.authoring.hit) return; // hover mode — nothing contextual to offer

  const ids = inside(api);

  api.authoring.handle({
    id: "capture",
    at: "action",
    label: "Select inside",
    icon: "box",
    stateText: ids.length + (ids.length === 1 ? " piece" : " pieces"),
    disabled: ids.length === 0,
    click: () => {
      const live = inside(api);
      // The box REMEMBERS what it framed. God mode owns the selection and can
      // take it back the instant this chip closes (re-selecting the box itself),
      // so the remembered list is what the Sets tab actually saves from.
      api.patchState({ held: live, heldCount: live.length });
      api.clearSelection();
      for (let i = 0; i < live.length; i++) api.selectEntity(live[i]);
      api.notifyDm(
        "Asset Library: capture box holds " +
          live.length +
          (live.length === 1 ? " piece" : " pieces") +
          " — name it in the Sets tab and hit save selection."
      );
    },
  });
}
