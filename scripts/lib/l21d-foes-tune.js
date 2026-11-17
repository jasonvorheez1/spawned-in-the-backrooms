// Level 21 foes: the manager's own tuned numbers (the per-kind numbers live in data/l21d.yml kinds).
export const TUNE = {
  wake: 110,          // m: a foe farther than this from every player holds still (no writes)
  clickEar: 42,       // m: the clicking call is only made when someone could hear it
  stillBump: 2.5,     // m: a standing player is only noticed this close
  crouchBump: 1.0,    // m: a slow crouched player is only noticed when walked into
  crouchSlow: 2.9,    // m/s: under this a crouched body makes no sound
  sprintAt: 5.6,      // m/s: over this a body is sprinting
  nestKnowMs: 6000,   // a thing let out of a nest door knows where its opener is this long
  wind: { clicker: 0.45, stalker: 0.4, warden: 0.65 }, // s of wind-up before a blow lands
  pounceAt: 5, pounceCrouch: 0.5, pounceSpeed: 16,     // stalker: crouch, then leap
  lingerMs: 2600,     // how long it listens at an investigate point
  forgetMs: 14000,    // an unreached point is dropped after this
  roam: 12,           // m either side of home it wanders
  file: 2.5,          // m between wardens in a file
  swapFrac: 0.4, swapMs: 3000, hornMs: 9000,
};
