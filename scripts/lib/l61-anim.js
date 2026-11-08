// Level 6.1 "The Snackrooms" - Custom Humanoid Animation Library
// Tailored procedural animations for retro 1980s food court life:
// Counter scrubbing, plate serving, burger flipping, snacking, coffee sipping,
// waiter tray carrying, 80s jukebox grooving, booth lounging, and sanctuary sighs of relief.

export const WIPE_COUNTER = {
  duration: 2.4,
  tracks: {
    Spine: { pitch: [-10, -14, -12, -15, -10], yaw: [-4, 2, -2, 4, -4] },
    Spine02: { pitch: [-6, -10, -8, -10, -6], roll: [-3, 3, -2, 2, -3] },
    Head: { pitch: [-18, -22, -20, -24, -18], yaw: [-8, 6, -4, 8, -8], roll: [-4, 2, -2, 4, -4] },
    LeftArm: { pitch: [42, 45, 43, 44, 42], roll: [12, 16, 14, 15, 12], yaw: [-10, -8, -10, -8, -10] },
    LeftForeArm: { pitch: [55, 58, 56, 57, 55], roll: [20, 22, 20, 22, 20] },
    RightArm: { pitch: [38, 48, 54, 44, 38], yaw: [-18, 12, -14, 16, -18], roll: [-10, 8, -6, 10, -10] },
    RightForeArm: { pitch: [62, 78, 68, 82, 62], roll: [25, -15, 20, -10, 25] },
    RightHand: { pitch: [-15, 10, -10, 15, -15], yaw: [-25, 20, -20, 25, -25] },
  },
};

export const SERVE_PLATE = {
  duration: 2.0,
  tracks: {
    Spine: { pitch: [0, -12, -14, -6, 0], roll: [0, 2, 3, 1, 0] },
    Head: { pitch: [-5, -18, -22, 4, 0], yaw: [0, 0, 0, 0, 0] },
    LeftArm: { pitch: [10, 16, 18, 12, 10], roll: [-8, -12, -10, -8, -8] },
    RightArm: { pitch: [12, 35, 58, 48, 15], yaw: [0, -8, -12, -4, 0], roll: [5, 8, 10, 6, 5] },
    RightForeArm: { pitch: [20, 55, 75, 45, 20], roll: [10, 25, 30, 15, 10] },
    RightHand: { pitch: [0, -12, -20, 5, 0], yaw: [0, 10, 15, 0, 0] },
  },
};

export const FLIP_BURGER = {
  duration: 2.8,
  tracks: {
    Spine: { pitch: [-8, -16, -18, -12, -4, 0] },
    Head: { pitch: [-14, -22, -26, -18, 0, -8] },
    RightArm: { pitch: [30, 55, 58, 68, 45, 25], yaw: [-10, -15, -18, -12, -8, -5], roll: [0, 8, 12, -5, 0, 0] },
    RightForeArm: { pitch: [50, 75, 82, 95, 60, 35], roll: [15, 25, 35, -45, 15, 10] },
    RightHand: { pitch: [-5, -20, -25, 30, -5, 0], roll: [0, 10, 15, -60, 5, 0] },
    LeftArm: { pitch: [15, 20, 25, 78, 85, 20], roll: [10, 12, 15, 28, 32, 10] },
    LeftForeArm: { pitch: [30, 35, 40, 105, 115, 30], roll: [10, 12, 15, 45, 50, 10] },
  },
};

export const EAT_SNACK = {
  duration: 3.2,
  tracks: {
    Spine: { pitch: [0, -3, -5, -4, -2, 0], roll: [0, 2, 1, 3, 1, 0] },
    Head: { pitch: [0, 10, 14, 8, 12, 6, 10, 2], roll: [0, -3, -4, 2, -2, 3, 0, 0] },
    LeftArm: { pitch: [18, 22, 24, 20, 18], roll: [10, 14, 12, 10, 10] },
    RightArm: { pitch: [15, 48, 72, 75, 72, 50, 20], roll: [-5, 8, 18, 22, 18, 5, -5], yaw: [0, -8, -16, -18, -16, -8, 0] },
    RightForeArm: { pitch: [25, 70, 105, 112, 108, 65, 25], roll: [10, 25, 45, 50, 45, 20, 10] },
    RightHand: { pitch: [0, 15, 25, 28, 24, 10, 0], yaw: [0, 10, 20, 22, 20, 10, 0] },
  },
};

export const SIP_DRINK = {
  duration: 3.0,
  tracks: {
    Spine: { pitch: [0, -2, 4, 2, 0] },
    Head: { pitch: [0, 6, -16, -18, -10, 4, 0], yaw: [0, 0, 2, -2, 0, 0, 0] },
    LeftArm: { pitch: [15, 18, 20, 18, 15] },
    RightArm: { pitch: [15, 52, 78, 82, 76, 45, 15], roll: [-4, 6, 16, 20, 16, 4, -4], yaw: [0, -10, -18, -20, -18, -8, 0] },
    RightForeArm: { pitch: [20, 68, 102, 110, 104, 55, 20], roll: [15, 28, 48, 55, 48, 25, 15] },
    RightHand: { pitch: [0, 10, 28, 35, 25, 5, 0] },
  },
};

export const CARRY_TRAY = {
  duration: 1.6,
  tracks: {
    Spine: { pitch: [-2, 0, -2, 0, -2], roll: [-1, 1, -1, 1, -1] },
    Head: { pitch: [0, -2, 0, -2, 0], yaw: [-6, 0, 6, 0, -6] },
    RightArm: { pitch: [82, 85, 82, 85, 82], roll: [-32, -30, -32, -30, -32], yaw: [-14, -12, -14, -12, -14] },
    RightForeArm: { pitch: [105, 108, 105, 108, 105], roll: [42, 45, 42, 45, 42] },
    RightHand: { pitch: [-32, -30, -32, -30, -32], roll: [8, 10, 8, 10, 8] },
    LeftArm: { pitch: [-12, 12, -12, 12, -12], roll: [-8, -6, -8, -6, -8] },
  },
};

export const GROOVE_80S = {
  duration: 2.0,
  tracks: {
    Hips: { y: [0, -0.02, 0.005, -0.02, 0], roll: [-2, 2, -2, 2, -2] },
    Spine: { pitch: [0, 3, -1, 3, 0], roll: [-5, 0, 5, 0, -5], yaw: [-4, 0, 4, 0, -4] },
    Spine02: { pitch: [-2, 4, -2, 4, -2], roll: [-6, 0, 6, 0, -6] },
    Neck: { pitch: [0, 4, 0, 4, 0], roll: [2, 0, -2, 0, 2] },
    Head: { pitch: [-4, 8, -2, 10, -4], yaw: [-6, 2, 6, -2, -6], roll: [-4, 3, 4, -3, -4] },
    LeftArm: { pitch: [22, 34, 20, 32, 22], roll: [12, 18, 10, 16, 12] },
    RightArm: { pitch: [24, 18, 36, 22, 24], roll: [-12, -8, -16, -10, -12] },
    LeftForeArm: { pitch: [55, 68, 52, 65, 55] },
    RightForeArm: { pitch: [52, 65, 55, 68, 52] },
  },
};

export const DINER_LOUNGE = {
  duration: 4.0,
  tracks: {
    Spine: { pitch: [-8, -6, -8, -6, -8], roll: [-4, -3, -4, -3, -4], yaw: [3, 2, 3, 2, 3] },
    Spine02: { pitch: [-4, -2, -4, -2, -4], roll: [-5, -4, -5, -4, -5] },
    Head: { pitch: [-2, 2, -1, 3, -2], roll: [-10, -8, -10, -8, -10], yaw: [8, 12, 6, 10, 8] },
    LeftArm: { pitch: [58, 60, 58, 60, 58], roll: [24, 26, 24, 26, 24], yaw: [-12, -10, -12, -10, -12] },
    LeftForeArm: { pitch: [85, 88, 85, 88, 85], roll: [-18, -16, -18, -16, -18] },
    LeftHand: { pitch: [-25, -23, -25, -23, -25], roll: [15, 17, 15, 17, 15] },
    RightArm: { pitch: [45, 47, 45, 47, 45], roll: [-12, -10, -12, -10, -12] },
    RightForeArm: { pitch: [62, 65, 62, 65, 62], roll: [14, 16, 14, 16, 14] },
  },
};

export const RELIEF_SIGH = {
  duration: 3.5,
  tracks: {
    Spine: { pitch: [0, -6, -8, 2, 4, 0], roll: [0, 1, 0, -1, 0] },
    Spine02: { pitch: [-2, -8, -10, 4, 6, -2] },
    Head: { pitch: [0, -14, -18, 6, 8, 0], roll: [0, 3, 4, -2, 0, 0] },
    LeftShoulder: { pitch: [0, 8, 12, -4, 0] },
    RightShoulder: { pitch: [0, 8, 12, -4, 0] },
    LeftArm: { pitch: [15, 10, 8, 20, 22, 15], roll: [-5, -2, 0, -10, -12, -5] },
    RightArm: { pitch: [15, 10, 8, 20, 22, 15], roll: [5, 2, 0, 10, 12, 5] },
  },
};

// Play an animation on an entity with clean blending and timing
export function playGesture(entity, clipSpec, durationMs, weight = 0.85, maskFrom = "Spine") {
  if (!entity?.anim) return;
  entity.anim.gest = {
    clip: clipSpec,
    loop: typeof clipSpec === "string" && /loop/.test(clipSpec) ? "loop" : "once",
    weight,
    blendIn: 0.25,
    blendOut: 0.35,
    mask: maskFrom ? { from: maskFrom } : undefined,
  };
}
