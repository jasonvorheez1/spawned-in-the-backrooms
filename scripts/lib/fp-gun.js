// First-person fit only. At and turn place the model against the right grip.
// Left is the support wrist [x, y, z], muzzle is the effect socket, and ADS aligns the visible sights.
export const FP_GUN = {
  pistol:       { at: [0, .025, -.025], turn: [3, -14, 0], ads: [0, -.15, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [0, .038, .025], muzzle: [0, .134, -.166] },
  revolver:     { at: [0, .008, -.14], turn: [0, 0, 0], ads: [0, -.204, .48, 1], hold: [-.01, -.018, .11, 0, 9, -4], grip: [0, .01, .025], muzzle: [0, .192, -.365] },
  // Nov 13: the split pocket 9, .45 and .22 and the flare gun have level barrels (the service pistol's mesh rises 13° to the muzzle, hence its -14),
  // so they turn 0 and sit where their grip's middle lands on the service pistol's: at = (0.048 - grip mid y, 0.027 - grip z); ads y = -(sight top)
  pocket9:      { at: [0, .042, -.027], turn: [3, 0, 0], ads: [0, -.124, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.004, .05, .022], muzzle: [0, .112, -.11] },
  govt45:       { at: [0, .048, -.045], turn: [3, 0, 0], ads: [0, -.132, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.005, .045, .025], muzzle: [0, .118, -.153] },
  target22:     { at: [0, .048, -.077], turn: [3, 0, 0], ads: [0, -.131, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.005, .045, .025], muzzle: [0, .118, -.217] },
  squirt_gun:   { at: [0, .07, -.06], turn: [3, 0, 0], ads: [0, -.24, .5, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.002, .042, -.005], muzzle: [0, .08, -.3] },
  balloon_pistol: { at: [0, .07, -.04], turn: [3, 0, 0], ads: [0, -.262, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.001, .062, -.012], muzzle: [0, .1, -.2] },
  balloon_shotgun: { at: [0, .1, -.19], turn: [0, -2, 0], ads: [0, -.188, .46, 0], hold: [.01, -.025, .05, 0, 14, -3], grip: [-.008, .025, .1], left: [0, .07, -.22], muzzle: [0, .12, -.62] },
  flaregun70:   { at: [0, .076, -.051], turn: [3, 0, 0], ads: [0, -.184, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [.004, .035, .025], muzzle: [0, .154, -.181] },
  laser_pistol: { at: [0, .049, -.028], turn: [0, 0, 0], ads: [0, -.149, .46, 0], hold: [-.02, .005, .08, 0, 9, -3], grip: [0, .04, .03], muzzle: [0, .126, -.188] },
  raygun:       { at: [0, .076, -.072], turn: [0, 0, 0], ads: [0, -.218, .64, 0], hold: [-.012, -.055, .19, 0, 7, -4], grip: [0, .055, -.015], muzzle: [0, .132, -.22] }, // Nov 12: the re-baked R-55 already faces -z; the old 180 turn pointed it at the player
  shotgun:      { at: [0, .082, -.19], turn: [0, -2, 0], ads: [0, -.13, .46, 0], hold: [.02, -.025, .05, 0, 17, -3], grip: [-.007, .025, .075], left: [0, .07, -.26], muzzle: [0, .119, -.67] },
  coach_gun:    { at: [0, -.072, -.211], turn: [0, 0, 0], ads: [0, -.137, .47, 0], hold: [.01, -.025, .07, 0, 14, -3], grip: [.004, .025, .075], left: [.002, .07, -.22], muzzle: [0, .103, -.64] },
  lever_rifle:  { at: [0, .023, .007], turn: [180, 0, 0], ads: [0, -.123, .48, .5], hold: [.01, -.025, .05, 0, 14, -3], grip: [0, .025, .035], left: [0, .077, -.26], muzzle: [0, .105, -.635] },
  hunting_rifle: { at: [-.025, -.15, -.123], turn: [-13, -24, 0], ads: [0, -.139, .42, 0], hold: [.01, -.03, .06, 0, 14, -3], grip: [.02, .04, .085], left: [.015, .105, -.23], muzzle: [0, .084, -.735] },
  smg:          { at: [0, .049, .134], turn: [180, 0, 0], ads: [0, -.15, .47, 0], hold: [.01, -.02, .055, 0, 14, -3], grip: [0, .03, .03], left: [0, .015, -.28], vertical: true, muzzle: [0, .119, -.503] },
  carbine:      { at: [.005, .02, -.09], turn: [0, 0, 0], ads: [0, -.21, .48, 0], hold: [.02, -.025, .06, 0, 18, -3], grip: [0, .055, .095], left: [0, .13, -.27], muzzle: [0, .15, -.46] },
  m72:          { at: [0, .02, -.12], turn: [0, 0, 0], ads: [.02, -.16, .62, 0], hold: [.07, .035, .2, 1, -3, 0], grip: [.01, .01, .16], left: [.01, .14, -.24], shoulder: true, muzzle: [0, .17, -.87] }, // the M.E.G. launcher: grip near origin, tube over the hand, muzzle out front
  carolynne:    { at: [.02, -.09, -.04], turn: [184, -18, 0], ads: [0, -.2, .55, 0], hold: [.01, -.1, .12, 0, 13, -3], grip: [.025, -.02, .06], left: [-.02, .11, -.28], muzzle: [0, .12, -.85] }, // the ornament launcher: the mesh's tube rises ~18° in its own frame, so pitch -18 levels the barrel on the crosshair
  // Nov 13 (Shelly: "laser rifle is still wrong"): the Tripo ZR-7 lies yawed ~19° left and rises ~11° in its own file, its pistol grip brought to the origin so the paw reaches it cleanly:
  laser_rifle:  { at: [-.022, 0, -.139], turn: [-19, -11, 0], ads: [0, -.215, .335, 0], hold: [.01, -.045, .05, 0, 13, -3], grip: [-.002, .075, .065], left: [-.012, .21, -.25], muzzle: [-.09, .185, -.49] },
  xbow325:      { at: [0, -.04, 0], turn: [180, 0, 0], ads: [0, -.12, .46, 0], hold: [.02, -.03, .04, 0, 14, -3], grip: [.015, .045, .075], left: [.015, .065, -.22], muzzle: [0, .08, -.5] },
}

const SHORT_SHOTGUN = { ...FP_GUN.shotgun, at: [0, .082, -.13], grip: [-.007, .035, .04], left: [0, .082, -.13], muzzle: [0, .119, -.48] }

export function firstPersonGun(base, look) {
  return base === 'shotgun' && look === 'sawn' ? SHORT_SHOTGUN : FP_GUN[base]
}

// Old saved offsets were global and could separate a new weapon from its paws.
export function firstPersonTuning(state) {
  const tune = state.vmTune
  return tune?.weapon === (state.equipped ?? 'fists') ? tune : null
}
