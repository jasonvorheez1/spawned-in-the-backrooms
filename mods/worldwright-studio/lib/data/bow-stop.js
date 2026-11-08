// Audition C, accepted 2026-09-19. These are deliberate damped releases,
// NOT intact original tails or recordings of alternating bow directions.
export const BOW_STOP={version:1,shortSeconds:0.32,attack:0.0005,release:0.016,gap:0.008,bodySeconds:0.3,bodyRms:0.16,curvePoints:129,tinySeconds:0.18,hardRelease:0.024,hardExponent:5};
// Held-note audition accepted 2026-09-19; medium notes share its stop, not its leveling.
export const HELD_LEVEL={step:0.020,radius:0.040,targetRms:0.16,rmsFloor:0.02,maxGain:4,warmKnots:64,maxSeconds:300};
export const HELD_CREDIT="Worldwright Studio render 9 articulation: bow-stop notes through 180 ms retain the accepted short-bow envelope; longer notes use 24 ms exponential damping and the same 8 ms stop. Held arco above 320 ms also uses 80 ms local-RMS gain leveling (gain capped at 4). This supersedes earlier held-release processing descriptions. Original forward exact-pitch recordings; no time stretch, looping, reverse, added sample layers or claimed recorded up/down alternates. Deliberately shaped articulation, not intact recorded releases.";
