// scripts/lib/fishing.js
// Complete Backrooms fishing system: canonical water validation, animated casts, physical floating bobbers,
// bite tension & strikes, location-specific aquatic loot, and reel-in rewards.
import { skillsOf, derived } from './stats.js';
import { heard } from './hear.js';
import { takeToken, gain } from '../player.js';
import { raycast } from 'builtin/physics';
import FISH from './data/fish.yml';

const FISH_SPLASH = `fx
pop ring burst=12 life=0.6..1.1 on=disc(0.8) v=sdir()*(1.2..2.4)+up(0.6..1.8) size=0.04..0.12 col=hdr(0.7,0.85,1.0) a=0.8>0 r=sprite(soft-disc,add)
pop foam burst=8 life=0.8..1.4 on=disc(0.4) v=up(0.2..0.8) size=0.15..0.35 col=<0.8,0.92,1> a=0.6>0 sz=$size*(1>1.8) r=sprite(smoke-puff,alpha)`;

const L7_FISH_ARMOR = [
  ['cloth:hat:beanie:d46a28', "Sou'wester storm watch cap"],
  ['cloth:hat:cap:b88838', 'Brass-rimmed dive hood'],
  ['cloth:neck:cape:c85a28', 'Cork lifebelt mantle'],
  ['cloth:topw:apron:1c282e', 'Abyssal tar-scale hauberk'],
];

/**
 * Validates whether the cast lands in a canonical, fishable lake, pond, canal, or sea.
 * Returns { ok: true, waterY, deep, placeName, bx, bz } OR { ok: false, reason }
 */
export function checkFishableWater(ctx, p, f, pc, power = 0) {
  const dist = 4.2 + (power || 0) * 4.2;
  const bx = p.x + f.x * dist;
  const bz = p.z + f.z * dist;
  const place = ctx.self.place ?? '';

  // 1. LEVEL 7: THALASSOPHOBIA (The Infinite Dark Sea & Drowned Entrance Room)
  if (place === 'level7') {
    // Flooded antique entrance parlor
    if (Math.hypot(p.x, p.z) < 3.4 && p.y > 3.4) {
      return { ok: true, waterY: 4.18, deep: false, placeName: 'Flooded Antique Parlor', waterKind: 'parlor', bx, bz };
    }

    // High island rock exclusions (cannot fish into dry stone)
    // Entrance rock flat summit
    if (Math.hypot(bx, bz) < 14 && p.y > 2.0) {
      return { ok: false, reason: 'Hook landed on entrance rock! Cast outward into the open sea.' };
    }
    // Fort Surrender island rocks
    if (Math.hypot(bx - (-70), bz - (-95)) < 28 && p.y > 3.8) {
      return { ok: false, reason: 'Hook landed on Fort Surrender rocks! Cast off the jetty into the sea.' };
    }
    // Near island rocks
    if (Math.hypot(bx - 46, bz - (-120)) < 18 && p.y > 3.0) {
      return { ok: false, reason: 'Hook landed on rocky island shore! Cast into deep water.' };
    }

    const deep = (bz < -22 && Math.hypot(bx - (-70), bz - (-95)) > 35);
    return {
      ok: true,
      waterY: 0.08,
      deep,
      placeName: deep ? 'Abyssal Trench' : 'Level 7 Coastal Sea',
      waterKind: 'saltwater',
      bx,
      bz,
    };
  }

  // 2. LEVEL 10: BUMPER CROP (Wikidot canonical freshwater lake at x: 70, z: -95, radius 26)
  if (place === 'level10') {
    const dLake = Math.hypot(bx - 70, bz - (-95));
    if (dLake <= 28.0) {
      const deep = (dLake < 10.0); // Lake sinkhole down to Level 7
      return {
        ok: true,
        waterY: 0.04,
        deep,
        placeName: deep ? 'Lake Deep Chasm' : 'Bumper Crop Lake',
        waterKind: 'freshwater',
        bx,
        bz,
      };
    }
    return { ok: false, reason: 'Hook landed on dry farmland grass! Cast towards the lake (east of the road).' };
  }

  // 3. LEVEL 184: FIELD OF FORGOTTEN FORTS (Wikidot canonical pond at x: 50, z: 30, radius 14)
  if (place === 'level184') {
    const dPond = Math.hypot(bx - 50, bz - 30);
    if (dPond <= 15.5) {
      return {
        ok: true,
        waterY: 0.04,
        deep: false,
        placeName: 'Forgotten Forts Pond',
        waterKind: 'freshwater',
        bx,
        bz,
      };
    }
    return { ok: false, reason: 'Hook landed in yellow canola fields! Cast towards the pond.' };
  }

  // 4. LEVEL 11: INFINITE CITY (Grand Urban Promenade Canal at z: -30, width: 20, x: -250..250)
  if (place === 'level11') {
    if (Math.abs(bz - (-30)) <= 9.6 && Math.abs(bx) <= 249.5) {
      return {
        ok: true,
        waterY: -2.2,
        deep: false,
        placeName: 'Grand Urban Canal',
        waterKind: 'canal',
        bx,
        bz,
      };
    }
    return { ok: false, reason: 'Hook landed on city pavement! Cast over the promenade railings into the canal.' };
  }

  // Any other water: a pool, fountain, spring, sea plane or a place's terrain sea under the hook
  const any = anyWater(ctx, p, bx, bz);
  if (any) return { ok: true, ...any, bx, bz };
  return {
    ok: false,
    reason: "No water under your hook. Face open water and cast again.",
  };
}

function anyWater(ctx, p, bx, bz) {
  const h = raycast(ctx, { x: bx, y: p.y + 2, z: bz }, { x: 0, y: -1, z: 0 }, { distance: 60, hits: 'geometry' });
  const o = h?.id ? ctx.getObject(h.id) : null;
  if (o && o.material?.kind === 'water') {
    const id = String(h.id);
    const kind = /pool/.test(id) ? 'pool' : /fountain|^bc-/.test(id) ? 'fountain' : /spring|onsen/.test(id) ? 'spring' : /sea|ocean/.test(id) ? 'ocean' : 'freshwater';
    const name = { pool: 'Swimming Pool', fountain: 'Fountain', spring: 'Hot Spring', ocean: 'Open Sea', freshwater: 'Still Water' }[kind];
    return { waterY: h.position.y + 0.02, deep: kind === 'ocean' && p.y - h.position.y > 8, placeName: name, waterKind: kind };
  }
  const sea = ctx.place.terrain?.marks?.sea, ground = ctx.place.terrain?.heightAt?.(bx, bz);
  if (sea && ground != null && ground < sea.level) return { waterY: sea.level + 0.02, deep: sea.level - ground > 6, placeName: ctx.self.place === 'level132' ? 'Morigont Chalk Sea' : 'Open Sea', waterKind: ctx.self.place === 'level132' ? 'chalksea' : 'ocean' };
  return null;
}

// which species table a water reads; level 7's sea and level 10's lake keep their own kinds
const tableOf = (fs) => FISH[fs.waterKind === 'parlor' ? 'saltwater' : fs.waterKind] ?? FISH.freshwater;
function rollSpecies(ctx, s, fs) {
  const rows = tableOf(fs).filter((r) => !r.deep || fs.deep), luck = 1 + (skillsOf(s).survival ?? 0) * 0.01 + (fs.power ?? 0) * 0.3 + (fs.deep ? 0.4 : 0);
  const wt = (r) => r.rare ? r.w * luck : r.w, total = rows.reduce((a, r) => a + wt(r), 0);
  let x = ctx.random() * total; const r = rows.find((q) => (x -= wt(q)) <= 0) ?? rows[0];
  const kg = Math.round((r.kg[0] + (r.kg[1] - r.kg[0]) * Math.pow(ctx.random(), 1.8)) * 100) / 100;
  return { id: r.id, name: r.name, kg, rare: !!r.rare, hp: r.hp, food: r.food };
}
// the catch log: species seen, how many, the heaviest
function logCatch(s, f) {
  const log = { ...(s.fishLog ?? {}) }, was = log[f.id];
  log[f.id] = { n: (was?.n ?? 0) + 1, kg: Math.max(was?.kg ?? 0, f.kg), name: f.name };
  s.fishLog = log;
  const total = Object.values(FISH).flat().length, have = Object.keys(log).length;
  return !was ? `New species! ${have}/${total} in your catch log` : f.kg > was.kg ? `New record ${f.kg} kg (was ${was.kg} kg)` : `${was.n + 1} caught · best ${log[f.id].kg} kg`;
}

/**
 * Initiates the casting sequence when the player swings a fishing rod.
 */
export function startFishing(ctx, s, w, p, f, pc, power = 0) {
  const chk = checkFishableWater(ctx, p, f, pc, power);
  const now = ctx.now();

  if (!chk.ok) {
    ctx.emit('damageNumber', {
      position: { x: p.x + f.x * 2.2, y: p.y + 0.8, z: p.z + f.z * 2.2 },
      text: 'NO FISHABLE WATER',
      color: '#e57373',
      size: 1.15,
    }, { audience: { player: ctx.self.id } });
    s.notice = { text: chk.reason, at: now };
    heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-brass-elevator-button-click.mp3', position: p, volume: 0.45, pitch: 0.75 });
    return true;
  }

  // Set swing and fishing timers
  w.fishingUntil = now + 4000;
  w.nextSwing = now + 750;

  // Sound effects: rod overhead whip whoosh + reel release buzz
  heard(ctx, { clip: '/cdn/sfx-small-swing-whoosh-fast-hkdsujvu.mp3', position: p, volume: 0.7 });
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3', position: p, volume: 0.35, pitch: 1.6 });

  // Spawn physical floating bobber entity in the world
  const bobberId = `bobber-${ctx.self.id}`;
  if (ctx.getObject(bobberId)) ctx.destroy(bobberId);

  ctx.spawn(bobberId, {
    feetPosition: { x: chk.bx, y: chk.waterY, z: chk.bz },
    behavior: 'scripts/bobber.js',
    primitive: { kind: 'sphere', radius: 0.075 },
    material: { color: 'oklch(0.62 0.22 28)', roughness: 0.3 }, // High-visibility marine red dome
    children: [
      // Bright white hull lower dome
      {
        feetPosition: { x: 0, y: -0.065, z: 0 },
        primitive: { kind: 'sphere', radius: 0.072 },
        material: { color: 'oklch(0.98 0.01 90)', roughness: 0.3 },
      },
      // Antenna stem pin
      {
        feetPosition: { x: 0, y: 0.07, z: 0 },
        primitive: { kind: 'cylinder', radiusTop: 0.008, radiusBottom: 0.008, height: 0.12 },
        material: { color: 'oklch(0.2 0.01 250)' },
      },
      // Fluorescent neon tip bead
      {
        feetPosition: { x: 0, y: 0.13, z: 0 },
        primitive: { kind: 'sphere', radius: 0.018 },
        material: { color: 'oklch(0.85 0.22 80)', roughness: 0.2 },
      },
    ],
    state: {
      owner: ctx.self.id,
      waterY: chk.waterY,
      phase: 'float',
      lastPhase: 'float',
    },
    lifetime: 25,
  });

  // Track active fishing session state on player
  s.fishingState = {
    id: bobberId,
    bx: chk.bx,
    waterY: chk.waterY,
    bz: chk.bz,
    castAt: now,
    power: power || 0,
    deep: chk.deep,
    place: ctx.self.place,
    placeName: chk.placeName,
    waterKind: chk.waterKind,
    phase: 'float',
  };

  // Water entry splash at landing
  ctx.emit('fx', { position: { x: chk.bx, y: chk.waterY, z: chk.bz }, script: FISH_SPLASH });
  heard(ctx, {
    clip: '/cdn/moodboard-realistic-gritty/sfx-water-pour-splash-short.mp3',
    position: { x: chk.bx, y: chk.waterY, z: chk.bz },
    volume: 0.75,
    maxDistance: 20,
  });

  ctx.emit('damageNumber', {
    position: { x: chk.bx, y: chk.waterY + 0.6, z: chk.bz },
    text: power ? 'LONG SWELL CAST' : 'LINE CAST',
    color: '#88ddff',
    size: 1.2,
  }, { audience: { player: ctx.self.id } });

  // Schedule bite progression
  const fish = rollSpecies(ctx, s, s.fishingState); s.fishingState.fish = fish;
  const nib = 1.2 + ctx.random() * 3.2, bite = nib + 0.7 + ctx.random() * 1.6, win = fish.rare ? 0.85 : 1.4;
  ctx.after(nib, 'fishNibble', { id: bobberId });
  ctx.after(bite, 'fishBite', { id: bobberId });
  ctx.after(bite + win, 'fishAutoCatch', { id: bobberId });

  return true;
}

/**
 * Handle a player click while line is actively in the water.
 */
export function handleFishingClick(ctx, s, w) {
  const fs = s.fishingState;
  if (!fs) return false;

  const now = ctx.now();
  if (fs.phase === 'bite') {
    // Player reacted to the bite! Instant manual hook set!
    fs.phase = 'reeling';
    finishFishingCatch(ctx, s, fs, true);
    return true;
  }

  // Player clicked before bite: cancel and reel in early
  ctx.emit('damageNumber', {
    position: { x: fs.bx, y: fs.waterY + 0.5, z: fs.bz },
    text: 'LINE REELED IN',
    color: '#a0a0a0',
    size: 1.0,
  }, { audience: { player: ctx.self.id } });

  cancelFishing(ctx, s, 'early');
  return true;
}

/**
 * Nibble stage: bobber twitches, curious aquatic life circles.
 */
export function onFishNibble(ctx, bobberId) {
  const s = ctx.self.state;
  if (!s || s.dead || !s.fishingState || s.fishingState.id !== bobberId) return;

  const fs = s.fishingState;
  fs.phase = 'nibble';

  const bobber = ctx.getObject(bobberId);
  if (bobber?.state) bobber.state.phase = 'nibble';

  ctx.emit('damageNumber', {
    position: { x: fs.bx, y: fs.waterY + 0.5, z: fs.bz },
    text: '...NIBBLE...',
    color: '#68c8e8',
    size: 0.95,
  }, { audience: { player: ctx.self.id } });

  heard(ctx, {
    clip: '/cdn/moodboard-realistic-gritty/sfx-water-drop-single-echo-cave.mp3',
    position: { x: fs.bx, y: fs.waterY, z: fs.bz },
    volume: 0.55,
    maxDistance: 16,
  });
}

/**
 * Strike/Bite stage: fish lunges and drags bobber underwater.
 */
export function onFishBite(ctx, bobberId) {
  const s = ctx.self.state;
  if (!s || s.dead || !s.fishingState || s.fishingState.id !== bobberId) return;

  const fs = s.fishingState;
  fs.phase = 'bite';
  fs.biteAt = ctx.now();

  const bobber = ctx.getObject(bobberId);
  if (bobber?.state) bobber.state.phase = 'bite';

  // Camera strike vibration & clicker sound
  ctx.emit('cameraPunch', { direction: { x: 0, y: -0.35, z: 0 }, intensity: 0.18 }, { audience: { player: ctx.self.id } });
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3', position: ctx.self.feetPosition, volume: 0.5, pitch: 1.8 });

  ctx.emit('damageNumber', {
    position: { x: fs.bx, y: fs.waterY + 0.7, z: fs.bz },
    text: fs.fish?.rare ? 'BIG ONE! CLICK NOW!' : 'STRIKE! CLICK!',
    color: '#ffdd59',
    size: 1.35,
  }, { audience: { player: ctx.self.id } });
}

/**
 * Roll location-specific loot for successful catches.
 */
export function getFishingLoot(ctx, s, fs) {
  const surv = (skillsOf(s).survival ?? 0);
  const bonus = surv * 0.003 + (fs.power ?? 0) * 0.09 + (fs.deep ? 0.08 : 0) + (derived(s).scav ?? 0) * 0.15;
  const raw = ctx.random(), r = raw + bonus;

  // Level 7: Thalassophobia
  if (fs.place === 'level7') {
    if (fs.deep && raw < 0.06) {
      return {
        tok: 'meat:fish',
        label: 'an Abyssal Pale Leviathan (+25 XP)',
        xp: 25,
        sound: '/cdn/moodboard-realistic-gritty/sfx-deep-whale-like-groan-from-far-under-dark-water.mp3',
        shake: 0.22,
      };
    }
    if (r > 1.02) {
      const pick = L7_FISH_ARMOR[Math.floor(ctx.random() * L7_FISH_ARMOR.length)];
      return { tok: pick[0], label: `sunken ${pick[1]} (Level 7 Armor!)`, xp: 35 };
    }
    if (r > 0.86) {
      const pool = [
        ['almond:blue', 'a drifting bottle of Blue Almond Water'],
        ['firesalt', 'a crystallized cluster of Abyssal Fire Salt'],
        ['battery', 'a wax-sealed waterproof Battery'],
        ['shells', 'an oiled pouch of Shotgun Shells'],
        ['ammo', 'a salvaged tin of Pistol Rounds'],
      ];
      const pick = pool[Math.floor(ctx.random() * pool.length)];
      return { tok: pick[0], label: pick[1], xp: 22 };
    }
    if (r > 0.42) {
      return ctx.random() < 0.72
        ? { tok: 'meat:fish', label: 'a Blind Cave-Carp (+14 HP, +25 Food)', xp: 16 }
        : { tok: 'almond', label: 'a barnacled bottle of Almond Water', xp: 15 };
    }
    const pool = [
      ['meat:sardines', 'a sealed tin of Drowned Sardines (+7 HP, +14 Food)'],
      ['meat:fish', 'a silver Trench-Smelt (+14 HP, +25 Food)'],
      ['bobbypin', 'a tangled bundle of Bobby Pins'],
    ];
    const pick = pool[Math.floor(ctx.random() * pool.length)];
    return { tok: pick[0], label: pick[1], xp: 12 };
  }

  // Level 10: Bumper Crop Lake
  if (fs.place === 'level10') {
    if (fs.deep && raw < 0.08) {
      return {
        tok: 'almond:blue',
        label: 'a pristine bottle of Blue Almond Water (from the deep lake spring)',
        xp: 28,
        sound: '/cdn/moodboard-realistic-gritty/sfx-deep-underwater-low-drone-with-faint-bubbles-loop.mp3',
      };
    }
    if (r > 0.94) {
      const pool = [
        ['page:24', 'a water-sealed canister containing Field Doc #24'],
        ['battery', 'a waterproof pioneer Battery'],
        ['flour_sack', 'a sealed sack of milled flour from the bed'],
      ];
      const pick = pool[Math.floor(ctx.random() * pool.length)];
      return { tok: pick[0], label: pick[1], xp: 25 };
    }
    if (r > 0.45) {
      const fishPool = [
        ['meat:fish', 'a plump Golden Bumper Bass (+18 HP, +30 Food)'],
        ['meat:fish', 'a Silver-Finned Lake Trout (+14 HP, +25 Food)'],
        ['almond', 'a cool bottle of Almond Water from the lake bed'],
      ];
      const pick = fishPool[Math.floor(ctx.random() * fishPool.length)];
      return { tok: pick[0], label: pick[1], xp: 18 };
    }
    const commonPool = [
      ['meat:fish', 'a freshwater Lake Minnow (+10 HP, +18 Food)'],
      ['meat:sardines', 'a tin of Homestead Sardines'],
      ['bobbypin', 'a dropped brass Hairpin'],
    ];
    const pick = commonPool[Math.floor(ctx.random() * commonPool.length)];
    return { tok: pick[0], label: pick[1], xp: 14 };
  }

  // Level 11: Grand Urban Canal
  if (fs.place === 'level11') {
    if (r > 0.92) {
      const pool = [
        ['battery', 'a discarded Industrial Lithium Battery'],
        ['wire', 'a spool of copper canal wiring'],
        ['ammo', 'a waterlogged box of 9mm Cartridges'],
      ];
      const pick = pool[Math.floor(ctx.random() * pool.length)];
      return { tok: pick[0], label: pick[1], xp: 22 };
    }
    if (r > 0.45) {
      const fishPool = [
        ['meat:fish', 'a hardy Canal Catfish (+14 HP, +25 Food)'],
        ['meat:fish', 'an Albino Urban Koi (+16 HP, +26 Food)'],
        ['almond', 'a chilled can of Municipal Almond Water'],
      ];
      const pick = fishPool[Math.floor(ctx.random() * fishPool.length)];
      return { tok: pick[0], label: pick[1], xp: 16 };
    }
    const pool = [
      ['meat:spam', 'an unopened tin of Luncheon Meat'],
      ['meat:sardines', 'a can of Urban Sardines'],
      ['bobbypin', 'a lost lockpick wire pin'],
    ];
    const pick = pool[Math.floor(ctx.random() * pool.length)];
    return { tok: pick[0], label: pick[1], xp: 12 };
  }

  // Level 184 / Fallback
  const pool = [
    ['meat:fish', 'a Canola-Rimmed Sunfish (+14 HP, +25 Food)'],
    ['almond', 'a bottle of Almond Water'],
    ['scrap_metal', 'a piece of rusted Fort Shrapnel'],
  ];
  const pick = pool[Math.floor(ctx.random() * pool.length)];
  return { tok: pick[0], label: pick[1], xp: 15 };
}

/**
 * Awards catch loot, plays celebration audio and effects, and cleans up the bobber.
 */
export function finishFishingCatch(ctx, s, fs, manualHook = false) {
  const p = ctx.self.feetPosition;
  const bobber = ctx.getObject(fs.id);
  if (bobber?.state) bobber.state.phase = 'reeling';

  // a rare fish not hooked by hand in its window slips the line
  if (!manualHook && fs.fish?.rare && ctx.random() < 0.65) {
    ctx.emit('fx', { position: { x: fs.bx, y: fs.waterY, z: fs.bz }, script: FISH_SPLASH });
    ctx.emit('damageNumber', { position: { x: p.x, y: p.y + 1.25, z: p.z }, text: `IT GOT AWAY: ${fs.fish.name.toUpperCase()}`, color: '#e09060', size: 1.25 }, { audience: { player: ctx.self.id } });
    s.notice = { text: `The ${fs.fish.name} snapped free. Click the moment the float goes under.`, at: ctx.now() };
    cancelFishing(ctx, s, 'escaped'); return;
  }
  // Award loot
  let loot = (['freshwater', 'saltwater', 'canal', 'parlor'].includes(fs.waterKind) && ['level7', 'level10', 'level11', 'level184'].includes(fs.place)) ? getFishingLoot(ctx, s, fs) : extraLoot(ctx, s, fs);
  let logLine = null;
  if (loot.tok === 'meat:fish' && fs.fish) {
    const f = fs.fish;
    loot = { ...loot, label: `a ${f.kg} kg ${f.name} (+${f.hp} HP, +${f.food} Food)`, xp: Math.round(loot.xp + (f.rare ? 15 : 0) + f.kg * 1.5) };
    logLine = logCatch(s, f);
  }
  const res = takeToken(ctx, loot.tok);
  const totalXp = loot.xp + (manualHook ? 10 : 0);
  gain(ctx, totalXp);

  // Splash at bobber landing
  ctx.emit('fx', { position: { x: fs.bx, y: fs.waterY, z: fs.bz }, script: FISH_SPLASH });
  heard(ctx, {
    clip: '/cdn/moodboard-realistic-gritty/sfx-water-splash-thrown-from-bottle.mp3',
    position: { x: fs.bx, y: fs.waterY, z: fs.bz },
    volume: 0.75,
    maxDistance: 20,
  });

  if (loot.sound) {
    heard(ctx, { clip: loot.sound, position: { x: fs.bx, y: fs.waterY, z: fs.bz }, volume: 0.8, maxDistance: 40 });
  }
  if (loot.shake) {
    ctx.emit('screenShake', { intensity: loot.shake, duration: 0.9 }, { audience: { player: ctx.self.id } });
  }

  // Celebratory level-up chime
  heard(ctx, {
    clip: '/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3',
    position: p,
    volume: 0.85,
    maxDistance: 16,
  }, { audience: { player: ctx.self.id } });

  const shortName = loot.label.split('(')[0].replace(/^a\s+|^an\s+|^sunken\s+/i, '').trim().toUpperCase();
  const bonusTag = manualHook ? ' [PERFECT REEL-IN!]' : '';

  ctx.emit('damageNumber', {
    position: { x: p.x, y: p.y + 1.25, z: p.z },
    text: res.ok ? `HOOKED: ${shortName}${bonusTag} (+${totalXp} XP)` : `FULL PACK: LOST ${shortName} (+${totalXp} XP)`,
    color: res.ok ? '#68e0d0' : '#e09060',
    size: 1.3,
  }, { audience: { player: ctx.self.id } });

  if (logLine) s.notice = { text: `${loot.label.split(' (')[0].replace(/^an? /, '')} · ${logLine}`, at: ctx.now() };
  cancelFishing(ctx, s, 'done');
}

// the new waters: mostly fish, and what each water would hide
function extraLoot(ctx, s, fs) {
  const r = ctx.random() + (fs.fish?.rare ? 0.2 : 0);
  const JUNK = {
    pool: [['almond', 'a sealed bottle of Almond Water from the drain', 14], ['bobbypin', 'a hair clip off the pool floor', 10], ['balloon', 'a deflated party balloon', 8]],
    fountain: [['coin', 'a wish coin someone threw in', 12], ['bobbypin', 'a lost hairpin', 10], ['almond', 'a bottle of Almond Water wedged by the jets', 14]],
    spring: [['almond', 'a warm bottle of Almond Water', 14], ['bobbypin', 'a kanzashi pin from the bathhouse', 12]],
    ocean: [['shells', 'a waxed pouch of Shotgun Shells off a sunk crate', 22], ['battery', 'a sealed Battery from a drowned locker', 20], ['wire', 'a tangle of mooring wire', 12]],
    chalksea: [['gear', 'a brass gear the tide polished', 18], ['wire', 'a coil of copper cable from a sunk relay', 16], ['almond', 'a corked bottle of Almond Water', 14]],
  }[fs.waterKind] ?? [['almond', 'a bottle of Almond Water', 14], ['scrap_metal', 'a piece of rusted scrap', 12]];
  const fishShare = { pool: 0.35, fountain: 0.3 }[fs.waterKind] ?? 0.72;
  if (r < fishShare || fs.fish?.rare) return { tok: 'meat:fish', label: fs.fish?.name ?? 'a fish', xp: 14 };
  const pick = JUNK[Math.floor(ctx.random() * JUNK.length)];
  return { tok: pick[0], label: pick[1], xp: pick[2] };
}

/**
 * Cleans up bobber entity and clears active fishing state.
 */
export function cancelFishing(ctx, s, reason = 'done') {
  if (s?.fishingState?.id) {
    const bobber = ctx.getObject(s.fishingState.id);
    if (bobber) ctx.destroy(bobber.id);
  }
  if (s) s.fishingState = null;
}
