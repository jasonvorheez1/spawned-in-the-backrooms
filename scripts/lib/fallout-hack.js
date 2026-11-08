// Fallout: New Vegas Terminal Hacking Minigame
// Faithfully reproduces the RobCo / BackOS memory dump terminal hacking minigame:
// - Two-column memory hex address grid (0xF3A4 ...)
// - Themed candidate password words (5-7 letters based on Science difficulty)
// - Matching bracket pairs: (...) [...] {...} <...> that remove duds or replenish allowance
// - Likeness scoring: count of characters matching the password at the exact same index
// - 4 attempts with visual block indicators (■ ■ ■ ■)
// - Lockout protection and Science skill integration

const WORDS_5 = [
  "ALPHA", "BETA0", "CACHE", "CARGO", "DEPTH", "DOORS", "DRAIN", "ENTRY",
  "FLOOR", "FOUND", "GAMMA", "GLOVE", "GUARD", "HEART", "HOUND", "LEVEL",
  "LIGHT", "LOCKS", "MAZE0", "METER", "NIGHT", "NOISE", "OMEGA", "ORDER",
  "PANEL", "PULSE", "RADAR", "RIDGE", "ROUTE", "SEALS", "SHOCK", "SIGMA",
  "SIREN", "SOLID", "SPACE", "STAGE", "STEEL", "SURVEY", "TOWER", "TRACE",
  "VALVE", "WATER"
];

const WORDS_6 = [
  "ACCESS", "ALMOND", "ANCHOR", "BEACON", "BYPASS", "CAMERA", "CIPHER", "COLONY",
  "CREDIT", "DAMAGE", "DANGER", "DOSSIER", "ENTITY", "ESCAPE", "EXODUS", "FILTER",
  "HAZARD", "LOCKED", "LOGOUT", "MATRIX", "MEMORY", "OUTPOST", "OXYGEN", "PATROL",
  "PORTAL", "RADIAL", "RATION", "RECORD", "RELIEF", "SAFETY", "SCHEME", "SECTOR",
  "SERVER", "SIGNAL", "STATIC", "STATUS", "SUBWAY", "SYSTEM", "TARGET", "TUNNEL",
  "UNISON", "VECTOR"
];

const WORDS_7 = [
  "AIRLOCK", "ARCHIVE", "BARRIER", "BATTERY", "BREACH0", "CASCADE", "CAUTION", "CHANNEL",
  "CIRCUIT", "COMMAND", "CONDUIT", "DEFENSE", "DIVIDER", "DYNAMIC", "ENTROPY", "FALLOUT",
  "FISSURE", "GATEWAY", "HABITAT", "JUNCTION", "LOCKOUT", "METRICS", "MONITOR", "NETWORK",
  "PASSAGE", "PIONEER", "PROTOCOL", "REACTOR", "REALITY", "REFUGEE", "RESERVE", "SCANNER",
  "SERVICE", "SHELTER", "STATION", "SURFACE", "SURVEIL", "SURVIVE", "TENSION", "VENTING", "VOLTAGE"
];

const NOISE_SYMBOLS = "!@#$%^&*()_+-=[]{}|;:<>?,./~";
const BRACKET_PAIRS = [
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"],
];

function pseudoRandom(seed) {
  let s = Math.abs(Number(seed) || 12345);
  return function () {
    s = (s * 16807 + 0x7fffffff) % 0x7fffffff;
    return (s - 1) / 0x7ffffffe;
  };
}

function sample(array, n, rand) {
  const copy = [...array];
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function randNoise(len, rand) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += NOISE_SYMBOLS[Math.floor(rand() * NOISE_SYMBOLS.length)];
  }
  return s;
}

export function calculateLikeness(guess, target) {
  if (!guess || !target) return 0;
  let matches = 0;
  const len = Math.min(guess.length, target.length);
  for (let i = 0; i < len; i++) {
    if (guess[i] === target[i]) matches++;
  }
  return matches;
}

export function initHacking(host, need = 10, scienceSkill = 0, seed) {
  const rand = pseudoRandom(seed ?? Date.now() + (host ? host.charCodeAt(0) : 0));

  // Determine word length by lock difficulty
  let dict = WORDS_6;
  let wordLen = 6;
  if (need <= 15) {
    dict = WORDS_5;
    wordLen = 5;
  } else if (need > 30) {
    dict = WORDS_7;
    wordLen = 7;
  }

  // Pick candidate words
  const wordCount = 12;
  const candidates = sample(dict, wordCount, rand);
  const targetWord = candidates[Math.floor(rand() * candidates.length)];

  // 32 memory lines (16 per column)
  const TOTAL_LINES = 32;
  const LINE_WIDTH = 12;
  const baseAddr = 0xf200 + Math.floor(rand() * 0x0c00);

  // Distribute word lines across the 32 rows
  // Ensure roughly equal distribution between col 0 (0..15) and col 1 (16..31)
  const lineIndices = Array.from({ length: TOTAL_LINES }, (_, i) => i);
  const col0 = lineIndices.slice(0, 16);
  const col1 = lineIndices.slice(16, 32);

  const wordLines0 = sample(col0, Math.floor(wordCount / 2), rand);
  const wordLines1 = sample(col1, wordCount - wordLines0.length, rand);
  const wordLineSet = new Set([...wordLines0, ...wordLines1]);

  let wordIdx = 0;
  let bracketCounter = 0;
  const lines = [];

  for (let i = 0; i < TOTAL_LINES; i++) {
    const addr = "0x" + (baseAddr + i * 12).toString(16).toUpperCase();
    const tokens = [];

    if (wordLineSet.has(i) && wordIdx < candidates.length) {
      const word = candidates[wordIdx++];
      const maxOffset = LINE_WIDTH - wordLen;
      const offset = Math.floor(rand() * (maxOffset + 1));
      const preNoiseLen = offset;
      const postNoiseLen = LINE_WIDTH - offset - wordLen;

      if (preNoiseLen > 0) {
        tokens.push({ type: "text", text: randNoise(preNoiseLen, rand) });
      }
      tokens.push({ type: "word", text: word, word });
      if (postNoiseLen > 0) {
        tokens.push({ type: "text", text: randNoise(postNoiseLen, rand) });
      }
    } else {
      // Non-word line: opportunity for bracket pairs
      // ~45% chance to embed a bracket pair
      if (rand() < 0.45 && bracketCounter < 8) {
        const pairType = BRACKET_PAIRS[Math.floor(rand() * BRACKET_PAIRS.length)];
        const innerLen = Math.floor(rand() * 4) + 1; // 1 to 4 chars inside
        const pairTotalLen = innerLen + 2;
        const maxOffset = LINE_WIDTH - pairTotalLen;
        const offset = Math.floor(rand() * (maxOffset + 1));

        const pre = offset > 0 ? randNoise(offset, rand) : "";
        const inner = randNoise(innerLen, rand);
        const bracketText = pairType[0] + inner + pairType[1];
        const postLen = LINE_WIDTH - offset - pairTotalLen;
        const post = postLen > 0 ? randNoise(postLen, rand) : "";

        const bId = "b_" + bracketCounter++;
        if (pre) tokens.push({ type: "text", text: pre });
        tokens.push({ type: "bracket", text: bracketText, bracketId: bId });
        if (post) tokens.push({ type: "text", text: post });
      } else {
        tokens.push({ type: "text", text: randNoise(LINE_WIDTH, rand) });
      }
    }

    lines.push({ addr, tokens });
  }

  const dudsRemoved = [];
  const log = [
    "ROBCO TERMLINK PROTOCOL (BACKDOOR CLIENT)",
    "INITIALIZING SECURITY OVERRIDE...",
    "ENTER PASSWORD NOW",
  ];

  // High Science Bonus: automatically prune 1 dud if Science significantly exceeds requirement
  if (scienceSkill >= need + 15) {
    const wrong = candidates.filter((w) => w !== targetWord);
    if (wrong.length > 0) {
      const freeDud = wrong[Math.floor(rand() * wrong.length)];
      dudsRemoved.push(freeDud);
      log.push(`[Science ${scienceSkill}] Pruned dud: ${freeDud}`);
    }
  }

  return {
    targetWord,
    wordLength: wordLen,
    words: candidates,
    dudsRemoved,
    bracketsUsed: [],
    attempts: 4,
    maxAttempts: 4,
    lines,
    log,
    won: false,
    lockedOut: false,
    lockedUntil: 0,
    scienceNeed: need,
  };
}

export function guessPassword(hack, word, now = Date.now()) {
  if (hack.won) return { result: "idle" };
  if (hack.lockedOut) {
    if (now < hack.lockedUntil) return { result: "locked" };
    hack.lockedOut = false;
    hack.attempts = hack.maxAttempts;
    hack.log.push("> SYSTEM REBOOT COMPLETE.");
    hack.log.push("> LOCKOUT CLEARED. PROCEED.");
  }

  const w = String(word || "").toUpperCase().trim();
  if (hack.dudsRemoved.includes(w)) {
    return { result: "dud" };
  }

  if (w === hack.targetWord) {
    hack.won = true;
    hack.log.push(`> ${w}`);
    hack.log.push("> EXACT MATCH!");
    hack.log.push("> ACCESS GRANTED.");
    hack.log.push("> INITIALIZING ADMINISTRATOR PRIVILEGES...");
    return { result: "win", target: w };
  }

  const likeness = calculateLikeness(w, hack.targetWord);
  hack.attempts = Math.max(0, hack.attempts - 1);
  hack.log.push(`> ${w}`);
  hack.log.push("> ENTRY DENIED.");
  hack.log.push(`> ${likeness}/${hack.wordLength} CORRECT.`);

  if (hack.attempts <= 0) {
    hack.lockedOut = true;
    hack.lockedUntil = now + 15000;
    hack.log.push("> TERMINAL LOCKED OUT.");
    hack.log.push("> PLEASE CONTACT AN ADMINISTRATOR.");
    return { result: "lockout", likeness };
  }

  return { result: "miss", likeness, attemptsLeft: hack.attempts };
}

export function activateBracket(hack, bracketId, now = Date.now()) {
  if (hack.won) return { result: "idle" };
  if (hack.lockedOut) {
    if (now < hack.lockedUntil) return { result: "locked" };
    hack.lockedOut = false;
    hack.attempts = hack.maxAttempts;
    hack.log.push("> SYSTEM REBOOT COMPLETE.");
  }
  if (hack.bracketsUsed.includes(bracketId)) return { result: "already_used" };

  hack.bracketsUsed.push(bracketId);

  // Find line and bracket text
  let bracketText = "";
  for (const line of hack.lines) {
    for (const t of line.tokens) {
      if (t.type === "bracket" && t.bracketId === bracketId) {
        bracketText = t.text;
        break;
      }
    }
    if (bracketText) break;
  }

  if (bracketText) {
    hack.log.push(`> ${bracketText}`);
  }

  // 75% chance: Remove a dud word, 25% chance (or if no duds left): Replenish attempts
  const remainingDuds = hack.words.filter(
    (w) => w !== hack.targetWord && !hack.dudsRemoved.includes(w)
  );

  const shouldReplenish = hack.attempts < hack.maxAttempts && (Math.random() < 0.25 || remainingDuds.length === 0);

  if (shouldReplenish) {
    hack.attempts = hack.maxAttempts;
    hack.log.push("> Allowance replenished.");
    return { result: "replenished" };
  }

  if (remainingDuds.length > 0) {
    const dud = remainingDuds[Math.floor(Math.random() * remainingDuds.length)];
    hack.dudsRemoved.push(dud);
    hack.log.push("> Dud removed.");
    return { result: "dud_removed", dud };
  }

  hack.log.push("> Error: Routine inactive.");
  return { result: "inert" };
}
