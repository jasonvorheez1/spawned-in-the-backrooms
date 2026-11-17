// Asset Library — the two hands that build a set's member list.
//
// Rides the god entity beside god.js and owns exactly one thing: additive
// picking. Shift + right-click adds whatever is under the cursor to the god-mode
// selection (and shift-clicking it again takes it back out), so a castle can be
// gathered piece by piece and then saved from the Sets tab.
//
// The capture box is the other hand and lives in capture-box.js — it fills the
// same selection in one gesture instead of one click at a time.

// Library-placed content is fair game — only the tool's own scaffolding is not.
const SKIP_TAGS = ["capture-box", "ghost", "stage", "preview"];

export function skippable(api, id) {
  if (!id) return true;
  if (String(id).indexOf("capture-box") === 0) return true;
  const o = api.getObject(id);
  const tags = (o && o.tags) || [];
  for (let i = 0; i < SKIP_TAGS.length; i++) {
    if (tags.indexOf(SKIP_TAGS[i]) !== -1) return true;
  }
  return false;
}

const BOX_ID = "capture-box-1";

export function liveBoxes(api) {
  return api.query({ tags: ["capture-box"] }) || [];
}

export function clearBoxes(api) {
  const held = liveBoxes(api);
  if (!held.length) return 0;
  api.withPersistence(() => {
    for (let i = 0; i < held.length; i++) api.destroy(held[i].id);
  });
  return held.length;
}

// One box per scene. mode "place" always leaves exactly one box in front of the
// creator (re-dropping a stray one at their feet instead of making them hunt it),
// mode "away" always leaves none. No hidden state, so no button can read wrong.
export function placeBox(api) {
  clearBoxes(api);

  const cam = api.getCamera() || {};
  const p = cam.position || { x: 0, y: 2, z: 0 };
  const f = cam.forward || { x: 0, y: 0, z: -1 };
  const flat = Math.max(0.001, Math.sqrt(f.x * f.x + f.z * f.z));
  const dist = 9;
  const x = p.x + (f.x / flat) * dist;
  const z = p.z + (f.z / flat) * dist;

  api.withPersistence(() =>
    api.spawn(BOX_ID, {
      tags: ["capture-box"],
      behavior: ["scripts/asset-library/capture-box.js"],
      feetPosition: { x: x, z: z, y: { terrain: 0 } },
        primitive: { kind: "box", width: 10, height: 6, depth: 10 },
        material: {
          color: "oklch(0.82 0.13 205)",
          opacity: 0.16,
          transparent: true,
          emissive: "oklch(0.82 0.13 205)",
          emissiveIntensity: 0.35,
          side: "double",
        },
        physics: "none",
        castShadow: false,
        receiveShadow: false,
        blueprint: { label: "Capture Box", category: "Sets", icon: "box" },
    })
  );
  api.notifyDm(
    "Asset Library: capture box dropped in front of you — stretch it over the scene, then hit “select inside” on it."
  );
}

export function onInput(api, input) {
  if (!input || !input.actions) return;

  if (input.actions.alCaptureBox) {
    const p = (input.actionData && input.actionData.alCaptureBox) || {};
    if (p.mode === "away") {
      const gone = clearBoxes(api);
      api.notifyDm(
        gone
          ? "Asset Library: capture box put away."
          : "Asset Library: no capture box was out."
      );
    } else if (p.mode === "place") {
      placeBox(api);
    } else {
      // bare keypress keeps the old flip
      if (clearBoxes(api)) api.notifyDm("Asset Library: capture box put away.");
      else placeBox(api);
    }
  }

  if (!input.actions.alPick) return;

  const ray = api.getInputRay(input);
  if (!ray) return;

  const hit = api.raycast(ray.origin, ray.direction, 600);
  if (!hit || !hit.objectId) return;

  const id = hit.objectId;
  // The library's own tooling is never a set member — picking the ghost or the
  // capture box itself would poison every set saved afterwards.
  if (skippable(api, id)) return;

  const held = api.getSelectedEntityIds() || [];
  if (held.indexOf(id) !== -1) {
    api.deselectEntity(id);
  } else {
    api.selectEntity(id);
  }
}
