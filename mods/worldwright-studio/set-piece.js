// js stood on the set, holding its pose, playing the beats the courier hands it and walking the routes it is sent down.

export const updateSchedule = { every: 3 };

const POSE_CHANNEL = "pose";
const ACT_CHANNEL = "act";
const NAV_CHANNEL = "nav";
const WALK_SPEED = 1.4;

export function onSpawn(api) {
  const s = api.getState() || {};
  holdPose(api, s.pose);
}

export function update(api, dt) {
  const s = api.getState() || {};
  const nav = s.nav && typeof s.nav === "object" ? s.nav : null;
  const nkey = nav ? String(nav.token || 0) + ":" + String(nav.seq || 0) : "";
  if (nav && Array.isArray(nav.points) && nav.points.length && nkey !== String(s.navSeen || "")) {
    startWalk(api, nav, nkey, s.pose);
    return;
  }
  const act = s.act && typeof s.act === "object" ? s.act : null;
  const key = act ? String(act.token || 0) + ":" + String(act.seq || 0) : "";
  if (act && act.clip && key !== String(s.actSeen || "")) {
    fire(api, act, key, s.pose);
    if (!s.walk) return;
  }
  if (s.walk) walk(api, s, dt);
  if (!s.actClip) return;
  // The beat is over when its channel says so: a one-shot reports finished, a held loop has run its
  // seconds (an auto-cleared channel reads back as null — also over).
  const ch = api.getChannel(ACT_CHANNEL);
  const hold = Number(s.actHold || 0);
  const over = !ch || (hold > 0 ? Number(ch.elapsed || 0) >= hold : !!ch.finished);
  if (!over) return;
  api.updateChannel(ACT_CHANNEL, null);
  if (!s.walk) holdPose(api, s.pose);
  api.patchState({ actClip: "", actDone: String(s.actKey || s.actSeen || "") });
}

export function holdPose(api, pose) {
  const clip = String(pose || "").trim();
  if (!clip) return;
  // A loop channel re-sent does not restart, so this is safe both at spawn and after every beat.
  api.updateChannel(POSE_CHANNEL, { clip: clip, loop: "loop", weight: 1, blendIn: 0.2 });
}

export function fire(api, act, key, pose) {
  const hold = Number(act.hold || 0);
  const spec = { clip: String(act.clip), weight: 1, blendIn: 0.15, blendOut: 0.2, loop: hold > 0 ? "loop" : "once" };
  if (hold > 0) spec.duration = hold;
  api.updateChannel(ACT_CHANNEL, spec);
  // Weights are additive, never normalised: the pose steps aside so the beat reads clean.
  if (String(pose || "").trim()) api.updateChannel(POSE_CHANNEL, { weight: 0.001 });
  api.patchState({ actSeen: key, actClip: String(act.clip), actHold: hold, actKey: String(act.key || key) });
  api.log("[set-piece] " + api.id + " plays " + String(act.clip) + (hold > 0 ? " for " + hold + "s" : " once"));
}

// ── THE WALK ──────────────────────────────────────────────────────────────────────────────────
export function startWalk(api, nav, key, pose) {
  const here = api.getProperty("feetPosition") || { x: 0, y: 0, z: 0 };
  const pts = [];
  for (let i = 0; i < nav.points.length; i++) {
    const p = nav.points[i] || {};
    pts.push({ x: Number(p.x || 0), y: Number(p.y || 0), z: Number(p.z || 0) });
  }
  let length = 0;
  let prev = { x: Number(here.x || 0), y: Number(here.y || 0), z: Number(here.z || 0) };
  for (let i = 0; i < pts.length; i++) {
    length += Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y, pts[i].z - prev.z);
    prev = pts[i];
  }
  const seconds = Number(nav.seconds || 0);
  const speed = seconds > 0 && length > 0 ? length / seconds : WALK_SPEED;
  if (nav.enter) api.setProperty("visible", true);
  api.setUpdateSchedule({ every: 1 });
  const clip = String(nav.clip || "").trim();
  if (clip) {
    api.updateChannel(NAV_CHANNEL, { clip: clip, loop: "loop", weight: 1, blendIn: 0.2 });
    if (String(pose || "").trim()) api.updateChannel(POSE_CHANNEL, { weight: 0.001 });
  }
  api.patchState({
    navSeen: key,
    walk: {
      key: String(nav.key || key),
      points: pts,
      facings: Array.isArray(nav.facings) ? nav.facings : [],
      pauses: Array.isArray(nav.pauses) ? nav.pauses : [],
      next: 0,
      speed: speed,
      clip: clip,
      exit: !!nav.exit,
      pause: 0,
      pos: { x: Number(here.x || 0), y: Number(here.y || 0), z: Number(here.z || 0) },
    },
  });
  api.log("[set-piece] " + api.id + " walks " + pts.length + " points over " + (seconds > 0 ? seconds + "s" : Math.round(length / speed) + "s"));
}

export function walk(api, s, dt) {
  const w = s.walk;
  const step = Math.max(0, Number(dt || 0));
  // A pause at a waypoint: the walk clip steps aside and the pose stands until the seconds run out.
  if (w.pause > 0) {
    const left = w.pause - step;
    if (left > 0) {
      api.patchState({ walk: Object.assign({}, w, { pause: left }) });
      return;
    }
    if (w.clip) {
      api.updateChannel(NAV_CHANNEL, { weight: 1 });
      if (String(s.pose || "").trim()) api.updateChannel(POSE_CHANNEL, { weight: 0.001 });
    }
    w.pause = 0;
  }
  let pos = { x: w.pos.x, y: w.pos.y, z: w.pos.z };
  let budget = w.speed * step;
  let next = w.next;
  let yaw = null;
  let arrivedAt = -1;
  while (budget > 0 && next < w.points.length) {
    const tgt = w.points[next];
    const dx = tgt.x - pos.x;
    const dz = tgt.z - pos.z;
    const dy=tgt.y-pos.y;
    const d = Math.hypot(dx,dy,dz);
    if (Math.hypot(dx,dz) > 0.0005) yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    if (d <= budget) {
      pos = { x: tgt.x, y: tgt.y, z: tgt.z };
      budget -= d;
      arrivedAt = next;
      next++;
      if (Number(w.pauses[arrivedAt] || 0) > 0) break;
    } else {
      pos = { x: pos.x + (dx / d) * budget, y: pos.y + ((tgt.y - pos.y) / d) * budget, z: pos.z + (dz / d) * budget };
      budget = 0;
    }
  }
  api.setProperty("feetPosition", { x: pos.x, y: pos.y, z: pos.z });
  if (yaw !== null) api.setProperty("rotation", { yaw: ((yaw % 360) + 360) % 360 });
  const patch = { walk: Object.assign({}, w, { pos: pos, next: next }) };
  if (arrivedAt >= 0) {
    const face = w.facings[arrivedAt];
    if (face === 0 || face) api.setProperty("rotation", { yaw: Number(face) });
    const pause = Number(w.pauses[arrivedAt] || 0);
    if (pause > 0 && next < w.points.length) {
      patch.walk.pause = pause;
      if (w.clip) {
        api.updateChannel(NAV_CHANNEL, { weight: 0.001 });
        holdPose(api, s.pose);
      }
    }
  }
  if (next >= w.points.length) {
    // Arrival: the walk clip goes, the pose comes back, the piece exits if asked, the cadence relaxes.
    api.updateChannel(NAV_CHANNEL, null);
    if (!s.actClip) holdPose(api, s.pose);
    if (w.exit) api.setProperty("visible", false);
    api.setUpdateSchedule({ every: 3 });
    api.patchState({ walk: null, navDone: String(w.key) });
    api.log("[set-piece] " + api.id + " arrived (" + String(w.key) + ")");
    return;
  }
  api.patchState(patch);
}
