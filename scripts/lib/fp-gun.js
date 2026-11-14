// First-person fit only. At and turn place the model against the right grip.
// Left is the support wrist [x, y, z], muzzle is the effect socket, and ADS aligns the visible sights.
export const FP_GUN = {
  pistol:       { at: [0, .025, -.025], turn: [3, -14, 0], ads: [0, -.15, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .134, -.166] },
  revolver:     { at: [0, .008, -.14], turn: [0, 0, 0], ads: [0, -.204, .48, 1], hold: [-.01, -.018, .11, 0, 9, -4], muzzle: [0, .192, -.365] },
  // Nov 13: the split pocket 9, .45 and .22 and the flare gun have level barrels (the service pistol's mesh rises 13° to the muzzle, hence its -14),
  // so they turn 0 and sit where their grip's middle lands on the service pistol's: at = (0.048 - grip mid y, 0.027 - grip z); ads y = -(sight top)
  pocket9:      { at: [0, .042, -.027], turn: [3, 0, 0], ads: [0, -.124, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .112, -.11] },
  govt45:       { at: [0, .048, -.045], turn: [3, 0, 0], ads: [0, -.132, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .118, -.153] },
  target22:     { at: [0, .048, -.077], turn: [3, 0, 0], ads: [0, -.131, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .118, -.217] },
  flaregun70:   { at: [0, .076, -.051], turn: [3, 0, 0], ads: [0, -.184, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .154, -.181] },
  laser_pistol: { at: [0, .049, -.028], turn: [0, 0, 0], ads: [0, -.149, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], muzzle: [0, .126, -.188] },
  raygun:       { at: [0, .076, -.072], turn: [0, 0, 0], ads: [0, -.218, .64, 0], hold: [-.012, -.055, .19, 0, 7, -4], muzzle: [0, .132, -.22] }, // Nov 12: the re-baked R-55 already faces -z; the old 180 turn pointed it at the player
  shotgun:      { at: [0, .082, -.19], turn: [0, -2, 0], ads: [0, -.13, .46, 0], hold: [0, -.02, .06, 0, 5, -3], left: [-.068, .02, -.17], muzzle: [0, .119, -.67] },
  coach_gun:    { at: [0, -.072, -.211], turn: [0, 0, 0], ads: [0, -.137, .47, 0], hold: [0, -.022, .08, 0, 5, -3], left: [-.068, .022, -.23], muzzle: [0, .103, -.64] },
  lever_rifle:  { at: [0, .023, .007], turn: [180, 0, 0], ads: [0, -.123, .48, .5], hold: [0, -.02, .06, 0, 5, -3], left: [-.068, .015, -.239], muzzle: [0, .105, -.635] },
  hunting_rifle: { at: [0, -.149, -.123], turn: [0, -25, 0], ads: [0, -.139, .42, 0], hold: [0, -.024, .08, 0, 5, -3], left: [-.068, .008, -.24], muzzle: [0, .084, -.735] },
  smg:          { at: [0, .049, .134], turn: [180, 0, 0], ads: [0, -.15, .47, 0], hold: [0, -.018, .065, 0, 5, -3], left: [-.03, .037, -.21], vertical: true, muzzle: [0, .119, -.503] },
  carbine:      { at: [0, .067, .066], turn: [180, 0, 0], ads: [0, -.177, .48, 0], hold: [0, -.02, .07, 0, 5, -3], left: [-.068, .078, -.23], muzzle: [0, .149, -.494] },
  m72:          { at: [0, .02, 0], turn: [0, 0, 0], ads: [0, -.2, .55, 0], hold: [0, -.1, .14, 0, 5, -3], left: [-.068, .1, -.38], muzzle: [0, .17, -.75] }, // the M.E.G. launcher: grip at the origin, tube over the hand, muzzle out front
  carolynne:    { at: [.02, -.09, -.04], turn: [184, -18, 0], ads: [0, -.2, .55, 0], hold: [0, -.1, .14, 0, 5, -3], left: [-.068, .06, -.3], muzzle: [0, .12, -.85] }, // the ornament launcher: the mesh's tube rises ~18° in its own frame, so pitch -18 levels the barrel on the crosshair
  // Nov 13 (Shelly: "laser rifle is still wrong"): the Tripo ZR-7 lies yawed ~19° left and rises ~11° in its own file, its pistol grip at file (0.098, -0.15, 0.41):
  // Shelly, Nov 13: "just move it down": hip hold y -.16 to -.24. turn yaw -19 / pitch -11 lines it up, and at puts that grip where the pistol's grip sits (0, .048, .027), so the gun no longer runs back through the camera
  laser_rifle:  { at: [.038, .115, -.414], turn: [-19, -11, 0], ads: [0, -.33, .61, 0], hold: [0, -.24, .2, 0, 5, -3], left: [-.04, .14, -.40], muzzle: [-.03, .3, -.765] },
}

const SHORT_SHOTGUN = { ...FP_GUN.shotgun, at: [0, .082, -.13], left: [-.068, .02, -.13], muzzle: [0, .119, -.48] }

export function firstPersonGun(base, look) {
  return base === 'shotgun' && look === 'sawn' ? SHORT_SHOTGUN : FP_GUN[base]
}

// Old saved offsets were global and could separate a new weapon from its paws.
export function firstPersonTuning(state) {
  const tune = state.vmTune
  return tune?.weapon === (state.equipped ?? 'fists') ? tune : null
}
