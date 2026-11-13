// Clump (Entity 5): one shared body language for every clump in every level (Shelly, Nov 13: "make them animated, more interesting").
// The Tripo rig: Spine_0/1, Head_0, limbs <n>_<Left|Right>_Limb_<seg>; 2_Left is the long one (five segments): the arm that snags you.
const LIMBS = ["0_Left", "0_Right", "1_Left", "1_Right", "2_Right", "3_Left", "3_Right"];
const B = (n) => `tripo::${n}`;
const rot = (a, k) => a.slice(0, -1).map((_, i, s) => s[(i + k) % s.length]).concat([a.slice(0, -1)[k % (a.length - 1)]]);
function swipe(dur, amp, body, jitter) { // limbs swipe at the floor out of step, the knot heaves over them
  const t = { [B("Spine_0")]: { pitch: [0, body, 0, -body * 0.8, 0], roll: [0, -body * 0.5, 0, body * 0.5, 0] }, [B("Spine_1")]: { yaw: [0, body * 0.6, 0, -body * 0.6, 0] },
    [B("Head_0")]: { yaw: [0, amp * 0.4, -amp * 0.5 * jitter, amp * 0.3, 0], pitch: [0, -amp * 0.2, amp * 0.25, 0, 0] } };
  LIMBS.forEach((l, i) => { const k = (i * 3) % 4, s = l.includes("Left") ? 1 : -1;
    t[B(l + "_Limb_0")] = { pitch: rot([0, -amp, -amp * 0.3, amp * 0.7, 0], k), yaw: rot([0, s * amp * 0.5, 0, -s * amp * 0.35 * jitter, 0], k) };
    t[B(l + "_Limb_1")] = { pitch: rot([0, amp * 0.9, amp * 0.3, -amp * 0.6, 0], k) }; });
  t[B("2_Left_Limb_0")] = { pitch: [0, -amp * 0.6, 0, amp * 0.5, 0], yaw: [0, amp * 0.3, 0, -amp * 0.3, 0] };
  for (let i = 1; i <= 4; i++) t[B(`2_Left_Limb_${i}`)] = { pitch: rot([0, amp * 0.4, -amp * 0.3, amp * 0.2, 0], i % 4), roll: [0, amp * 0.3 * jitter, 0, -amp * 0.3, 0] };
  return { duration: dur, tracks: t };
}
export const CRAWL = swipe(0.55, 38, 10, 1);     // the run: fast, scrabbling
export const PROWL = swipe(1.1, 24, 6, 1.4);     // a slow drag across the floor
export const FIDGET = swipe(2.4, 8, 3, 2.5);     // at rest it never stops twitching
export const REACH = { duration: 0.5, tracks: { // the long arm uncoils at you, the body leaning into it
  [B("Spine_0")]: { pitch: [0, -18, -24] }, [B("Head_0")]: { pitch: [0, 15, 25] },
  [B("2_Left_Limb_0")]: { pitch: [0, -70, -85], yaw: [0, 20, 25] }, [B("2_Left_Limb_1")]: { pitch: [0, -30, -5] }, [B("2_Left_Limb_2")]: { pitch: [0, -20, 0] },
  [B("2_Left_Limb_3")]: { pitch: [0, -15, 0] }, [B("2_Left_Limb_4")]: { pitch: [0, -25, 10] } } };
export const MAW = { duration: 0.55, tracks: { // reeled in to the centre: the knot opens on its teeth, every limb clutching inward
  [B("Spine_0")]: { pitch: [0, 22, -10, 18, 0] }, [B("Spine_1")]: { pitch: [0, 18, -6, 14, 0] }, [B("Head_0")]: { pitch: [0, -35, 10, -30, 0] },
  ...Object.fromEntries(LIMBS.flatMap((l) => [[B(l + "_Limb_0"), { pitch: [0, 50, 30, 55, 0] }], [B(l + "_Limb_1"), { pitch: [0, 60, 40, 65, 0] }]])),
  [B("2_Left_Limb_0")]: { pitch: [0, 40, 30, 45, 0] }, [B("2_Left_Limb_1")]: { pitch: [0, 55, 45, 60, 0] } } };
export const COWER = { duration: 1.6, tracks: { // hurt near death it folds up and shudders; somewhere in there a pair of eyes is crying
  [B("Spine_0")]: { pitch: [30, 34, 28, 34, 30] }, [B("Head_0")]: { pitch: [25, 30, 22, 30, 25], yaw: [0, 6, -6, 4, 0] },
  ...Object.fromEntries([...LIMBS, "2_Left"].flatMap((l) => [[B(l + "_Limb_0"), { pitch: [70, 74, 66, 74, 70] }], [B(l + "_Limb_1"), { pitch: [80, 84, 78, 84, 80] }]])) } };
