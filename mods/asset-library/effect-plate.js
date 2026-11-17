// The handle on a placed effect. Fire has no body: no mesh, no bounds, nothing
// for a click to land on — so every effect the shelf sets down gets this little
// marker floating in it. It's a child of the effect, so dragging the marker
// drags the effect, and deleting the effect takes it along.
//
// It exists ONLY while somebody is in god mode: god.js flips these visible when
// the god entity wakes and hides them when it dies, and `visibleTo: "editors"`
// means a player is never even sent one.

const MARK = "al-fx-handle";

export function parentOf(api) {
  try {
    const p = api.getParent();
    if (typeof p === "string") return p;
    if (p && p.id) return p.id;
  } catch (e) {
    /* orphaned handle — the strip below just won't offer anything */
  }
  return null;
}

export function label(api) {
  const st = api.getState() || {};
  return st.fxName || "effect";
}

export function editor(api, obj) {
  if (!api.authoring || api.authoring.hit) return;
  const host = parentOf(api);
  if (!host) return;
  const view = api.getObject(host);
  const props = (view) || {};
  const paused = !!(props.fx && props.fx.paused);
  const hasFx = !!(props.fx && props.fx.script);

  api.authoring.handle({
    id: "al-fx-head",
    at: "action",
    label: label(api),
    icon: "sparkles",
    color: "oklch(0.82 0.16 85)",
    disabled: true,
    priority: 10,
  });

  if (hasFx) {
    api.authoring.handle({
      id: "al-fx-pause",
      at: "action",
      label: paused ? "▶ play" : "⏸ freeze",
      color: "oklch(0.82 0.16 85)",
      priority: 11,
      click: () => {
        api.withPersistence(() => api.setObjectProperty(host, "fx.paused", !paused));
      },
    });
  }

  api.authoring.handle({
    id: "al-fx-remove",
    at: "action",
    label: "✕ remove",
    color: "oklch(0.65 0.2 25)",
    priority: 12,
    click: () => {
      // The effect owns this handle, so putting the effect out takes the
      // handle with it — no orphan marker left glowing in an empty field.
      api.withPersistence(() => api.destroy(host));
    },
  });
}

export { MARK };
