// PageLayout — the page spec model + every measurement the page editor and its rulers need. 5 round down"; margins must be non-negative and must not exceed half the page dimension they sit on.

const PX_PER_IN = 96;

const UNIT_PX = {
  mm: { n: PX_PER_IN, d: 25.4 },
  pt: { n: PX_PER_IN, d: 72 },
  px: { n: 1, d: 1 },
    in: { n: PX_PER_IN, d: 1 },
  cm: { n: PX_PER_IN, d: 2.54 },
};

const UNITS = ["mm", "pt", "px"];

const MIN_PAGE_PX = 8;
const MIN_BODY_PX = 8;

// Ruler thickness is one line of text + his 1px border.
const RULER = {
  fontPx: 13,
  lineHeight: 1.35,
  borderPx: 1,
  minTickGapPx: 3,
  majorMinPx: 32,
  maxTicksPerAxis: 1200,
  tick: { unit: 1, tenth: 0.55, hundredth: 0.3 },
};

// His doc names no leading, so: 14.4pt = 1.2 x the 12pt body the project default stores.
const DEFAULT_LEADING_PT = 14.4;

// His doc gives no page defaults; this is the project's own — 6x9in with 1in margins, exact in mm.
const DEFAULT_SPEC = require("lib/page-sizes.js").preset("book");

const SECTION_NO_LIMIT = 0;


export function isUnit(unit) {
  return UNITS.indexOf(String(unit)) !== -1;
}

// GUARD: kills float dust before any rounding decision — without it a mm page and the same page in
//   pt straddle a .5 boundary and disagree by a pixel.
export function snap(value) {
  const v = Number(value);
  if (!isFinite(v)) return 0;
  return Math.round(v * 1e6) / 1e6;
}

// His rounding policy: fractional part <= 0.5 rounds toward zero, > 0.5 rounds away.
export function roundPx(value) {
  const v = snap(value);
  const sign = v < 0 ? -1 : 1;
  const abs = Math.abs(v);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  return sign * (frac <= 0.5 ? whole : whole + 1);
}

export function unitToPx(value, unit) {
  const u = UNIT_PX[String(unit)] || UNIT_PX.px;
  const v = Number(value);
  if (!isFinite(v)) return NaN;
  return snap((v * u.n) / u.d);
}

export function fromPx(px, unit) {
  const u = UNIT_PX[String(unit)] || UNIT_PX.px;
  const v = Number(px);
  if (!isFinite(v)) return NaN;
  return snap((v * u.d) / u.n);
}

export function pxOf(value, unit) {
  return roundPx(unitToPx(value, unit));
}

export function defaultLeading(unit) {
  return snap(fromPx(unitToPx(DEFAULT_LEADING_PT, "pt"), isUnit(unit) ? unit : "px"));
}

export function firstNumber(values) {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    return Number(v);
  }
  return undefined;
}


export function normalize(spec) {
  const s = spec && typeof spec === "object" ? spec : {};
  const m = s.margins && typeof s.margins === "object" ? s.margins : {};
  const unit = s.unit === undefined || s.unit === null ? DEFAULT_SPEC.unit : String(s.unit);
  const width = firstNumber([s.width, s.pageW, s.pageWidth]);
  const height = firstNumber([s.height, s.pageH, s.pageHeight]);
  const marginL = firstNumber([s.marginL, s.marginLeft, m.left]);
  const marginR = firstNumber([s.marginR, s.marginRight, m.right]);
  const headerH = firstNumber([s.headerH, s.headerHeight, m.top]);
  const footerH = firstNumber([s.footerH, s.footerHeight, m.bottom]);
  const leading = firstNumber([s.leading, s.lineSpacing, s.leadingSize]);
  return {
    unit,
    width: width === undefined ? NaN : width,
    height: height === undefined ? NaN : height,
    marginL: marginL === undefined ? 0 : marginL,
    marginR: marginR === undefined ? 0 : marginR,
    headerH: headerH === undefined ? 0 : headerH,
    footerH: footerH === undefined ? 0 : footerH,
    leading: leading === undefined ? defaultLeading(unit) : leading,
  };
}

export function convert(spec, toUnit) {
  const s = normalize(spec);
  const target = String(toUnit);
  if (!UNIT_PX[target]) return s;
  const out = { unit: target };
  const keys = ["width", "height", "marginL", "marginR", "headerH", "footerH", "leading"];
  for (const k of keys) out[k] = snap(fromPx(unitToPx(s[k], s.unit), target));
  return out;
}


// The ONLY place a standard sheet is named: every row a physical page in millimetres, portrait, exact.
const FORMATS = [
  { id: "piano-paper", name: "Piano Paper", group: "Music · landscape A3 · no footer", w: 420, h: 297, orient: "landscape", footerH: 0 },
  { id: "a3", name: "A3", group: "ISO A", w: 297, h: 420 },
  { id: "a4", name: "A4", group: "ISO A", w: 210, h: 297 },
  { id: "a5", name: "A5", group: "ISO A", w: 148, h: 210 },
  { id: "a6", name: "A6", group: "ISO A", w: 105, h: 148 },
  { id: "b5", name: "B5", group: "ISO B", w: 176, h: 250 },
  { id: "b6", name: "B6", group: "ISO B", w: 125, h: 176 },
  { id: "letter", name: "US Letter", group: "US", w: 215.9, h: 279.4 },
  { id: "legal", name: "US Legal", group: "US", w: 215.9, h: 355.6 },
  { id: "tabloid", name: "US Tabloid", group: "US", w: 279.4, h: 431.8 },
  { id: "trade-5x8", name: "5 × 8 in", group: "Trade", w: 127, h: 203.2 },
  { id: "trade-55x85", name: "5.5 × 8.5 in", group: "Trade", w: 139.7, h: 215.9 },
  { id: "trade-6x9", name: "6 × 9 in", group: "Trade", w: 152.4, h: 228.6 },
];

const FORMAT_EPS = 0.05;

const MIN_BODY_MM = snap((MIN_BODY_PX * 25.4) / PX_PER_IN);

export function formatById(id) {
  const key = String(id === undefined || id === null ? "" : id);
  for (const f of FORMATS) if (f.id === key) return f;
  return null;
}

export function matchFormat(spec) {
  const mm = convert(spec, "mm");
  const w = mm.width;
  const h = mm.height;
  if (!isFinite(w) || !isFinite(h)) return null;
  const near = (a, b) => Math.abs(a - b) <= FORMAT_EPS;
  for (const f of FORMATS) {
    if (near(w, f.w) && near(h, f.h)) return { format: f, landscape: w>h };
    if (!f.orient&&near(w, f.h) && near(h, f.w)) return { format: f, landscape: w>h };
  }
  return null;
}

export function fitBandsMm(total, a, b) {
  const wanted = [Math.max(0, snap(a)), Math.max(0, snap(b))];
  let x = wanted[0];
  let y = wanted[1];
  let clamped = x !== snap(a) || y !== snap(b);
  const half = snap(total / 2);
  if (x > half) {
    x = half;
    clamped = true;
  }
  if (y > half) {
    y = half;
    clamped = true;
  }
  const room = Math.max(0, snap(total - MIN_BODY_MM));
  if (x + y > room) {
    const sum = x + y;
    const k = sum > 0 ? room / sum : 0;
    x = snap(x * k);
    y = snap(y * k);
    clamped = true;
  }
  return { a: x, b: y, clamped };
}

// -> { spec, format, landscape, clamped }, or null when the request names no page.
export function applyFormat(spec, req) {
  const o = req || {};
  const named = o.id ? formatById(o.id) : null;
  if (o.id && !named) return null;
  const w = named ? named.w : Number(o.w_mm);
  const h = named ? named.h : Number(o.h_mm);
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
  const cur = convert(spec, "mm");
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  const orient = String(o.orient === undefined || o.orient === null ? "" : o.orient);
  const landscape =
    orient === "landscape"
      ? true
      : orient === "portrait"
      ? false
      : named&&named.orient
      ? named.orient === "landscape"
      : isFinite(cur.width) && isFinite(cur.height)
      ? cur.width > cur.height
      : false;
  const width = snap(landscape ? long : short);
  const height = snap(landscape ? short : long);

  const lr = fitBandsMm(width, cur.marginL, cur.marginR);
  const furniture = named&&named.footerH!==undefined?named:matchFormat({unit:"mm",width,height})?.format;
  const hf = fitBandsMm(height, cur.headerH, furniture&&furniture.footerH!==undefined?furniture.footerH:cur.footerH);
  let clamped = lr.clamped || hf.clamped;

  let leading = snap(cur.leading);
  if (!isFinite(leading) || leading <= 0) {
    leading = defaultLeading("mm");
    clamped = true;
  }
  // GUARD: floored a thousandth under the body, not set equal — `leading === body` lands a float-hair
  // over the line validate() draws and the write is refused.
  const body = snap(height - hf.a - hf.b);
  if (body > 0 && leading > body) {
    leading = Math.max(0.001, Math.floor(body * 1000) / 1000);
    clamped = true;
  }

  const out = {
    unit: "mm",
    width,
    height,
    marginL: lr.a,
    marginR: lr.b,
    headerH: hf.a,
    footerH: hf.b,
    leading,
  };
  const hit = named ? { format: named, landscape } : matchFormat(out);
  return { spec: out, format: hit ? hit.format : null, landscape, clamped };
}


export function validate(spec) {
  if (!spec || typeof spec !== "object") {
    return { ok: false, error: "There's no page spec here to check.", errors: ["There's no page spec here to check."], spec: normalize(null) };
  }
  const s = normalize(spec);
  const errors = [];
  const unitOk = isUnit(s.unit);
  const u = unitOk ? s.unit : "";

  if (!unitOk) errors.push(`"${s.unit}" isn't a page unit — use mm, pt or px.`);

  const wOk = isFinite(s.width) && s.width > 0;
  const hOk = isFinite(s.height) && s.height > 0;
  if (!wOk) errors.push(`Page width must be a positive number${u ? " of " + u : ""}.`);
  if (!hOk) errors.push(`Page height must be a positive number${u ? " of " + u : ""}.`);

  const bands = [
    { key: "marginL", label: "left margin", along: "width", dim: "page width", ok: wOk, total: s.width },
    { key: "marginR", label: "right margin", along: "width", dim: "page width", ok: wOk, total: s.width },
    { key: "headerH", label: "header height", along: "height", dim: "page height", ok: hOk, total: s.height },
    { key: "footerH", label: "footer height", along: "height", dim: "page height", ok: hOk, total: s.height },
  ];
  for (const b of bands) {
    const v = s[b.key];
    if (!isFinite(v)) {
      errors.push(`The ${b.label} must be a number.`);
      continue;
    }
    // "Margins must be non-negative"
    if (v < 0) errors.push(`Margins must be non-negative — the ${b.label} is ${v}.`);
    // "Margins must not exceed half the corresponding page dimension"
    else if (b.ok && v > b.total / 2) errors.push(`The ${b.label} can't be more than half the ${b.dim}.`);
  }

    if (wOk && isFinite(s.marginL) && isFinite(s.marginR) && s.marginL >= 0 && s.marginR >= 0 && s.marginL + s.marginR >= s.width) {
    errors.push("The left and right margins leave no page between them.");
  }
  if (hOk && isFinite(s.headerH) && isFinite(s.footerH) && s.headerH >= 0 && s.footerH >= 0 && s.headerH + s.footerH >= s.height) {
    errors.push("The header and footer leave no body between them.");
  }

  if (!isFinite(s.leading) || s.leading <= 0) {
    errors.push(`Leading must be a positive number${u ? " of " + u : ""}.`);
  } else if (hOk && isFinite(s.headerH) && isFinite(s.footerH)) {
    const body = s.height - s.headerH - s.footerH;
    if (body > 0 && s.leading > body) errors.push("Leading is taller than the body — no line of text would fit.");
  }

  return { ok: errors.length === 0, error: errors.length ? errors[0] : null, errors, spec: s };
}


export function fitPair(total, a, b, minMiddle, warnings, what) {
  let x = Math.max(0, a);
  let y = Math.max(0, b);
  const room = Math.max(0, total - minMiddle);
  if (x + y > room) {
    const sum = x + y;
    const k = sum > 0 ? room / sum : 0;
    x = Math.floor(x * k);
    y = Math.floor(y * k);
    warnings.push(`${what} left no room for the body — trimmed to fit.`);
  }
  return [x, y];
}

export function toPx(spec) {
  const v = validate(spec);
  const s = v.spec;
  const unit = isUnit(s.unit) ? s.unit : "px";
  const warnings = [];

  let pageW = pxOf(isFinite(s.width) ? s.width : 0, unit);
  let pageH = pxOf(isFinite(s.height) ? s.height : 0, unit);
  if (!(pageW >= MIN_PAGE_PX)) {
    if (v.ok) warnings.push("page width came out under the safe minimum — clamped.");
    pageW = MIN_PAGE_PX;
  }
  if (!(pageH >= MIN_PAGE_PX)) {
    if (v.ok) warnings.push("page height came out under the safe minimum — clamped.");
    pageH = MIN_PAGE_PX;
  }

  const lr = fitPair(pageW, pxOf(isFinite(s.marginL) ? s.marginL : 0, unit), pxOf(isFinite(s.marginR) ? s.marginR : 0, unit), MIN_BODY_PX, warnings, "The left and right margins");
  const hf = fitPair(pageH, pxOf(isFinite(s.headerH) ? s.headerH : 0, unit), pxOf(isFinite(s.footerH) ? s.footerH : 0, unit), MIN_BODY_PX, warnings, "The header and footer");

  const marginL = lr[0];
  const marginR = lr[1];
  const headerH = hf[0];
  const footerH = hf[1];
  let leading = pxOf(isFinite(s.leading) ? s.leading : defaultLeading(unit), unit);
  if (leading < 1) leading = 1;

  return {
   
    pageW,
    pageH,
    marginL,
    marginR,
    headerH,
    footerH,
    leading,
   
    bodyW: pageW - marginL - marginR,
    bodyH: pageH - headerH - footerH,
    unit,
    ok: v.ok,
    error: v.error,
    warnings,
  };
}

export function zones(spec) {
  const g = toPx(spec);
  const x = g.marginL;
  const w = g.bodyW;
  return {
    header: { x, y: 0, w, h: g.headerH },
    body: { x, y: g.headerH, w, h: g.bodyH },
    footer: { x, y: g.pageH - g.footerH, w, h: g.footerH },
  };
}


// "Ruler thickness (both axes): one line of text height + 1px border."
export function rulerMetrics(opts) {
  const o = opts || {};
  const fontPx = isFinite(Number(o.fontPx)) && Number(o.fontPx) > 0 ? Number(o.fontPx) : RULER.fontPx;
  const lineHeight = isFinite(Number(o.lineHeight)) && Number(o.lineHeight) > 0 ? Number(o.lineHeight) : RULER.lineHeight;
  const borderPx = o.borderPx === undefined ? RULER.borderPx : Math.max(0, Number(o.borderPx) || 0);
  const lineHeightPx = roundPx(fontPx * lineHeight);
  const thickness = lineHeightPx + borderPx;
  const ink = lineHeightPx;
  return {
    fontPx,
    lineHeight,
    lineHeightPx,
    borderPx,
    thickness,
    ink,
    tick: {
      unit: Math.max(1, roundPx(ink * RULER.tick.unit)),
      tenth: Math.max(1, roundPx(ink * RULER.tick.tenth)),
      hundredth: Math.max(1, roundPx(ink * RULER.tick.hundredth)),
    },
  };
}

// His rule: "Both rulers are attached to the page, not the pane" — each matches the page exactly.
export function rulerFrame(spec, opts) {
  const g = toPx(spec);
  const m = rulerMetrics(opts);
  const t = m.thickness;
  return {
    thickness: t,
    metrics: m,
    corner: { x: 0, y: 0, w: t, h: t, inert: true },
    h: { x: t, y: 0, w: g.pageW, h: t },
    v: { x: 0, y: t, w: t, h: g.pageH },
    page: { x: t, y: t, w: g.pageW, h: g.pageH },
    w: t + g.pageW,
    h: t + g.pageH,
  };
}

export function majorStep(pxPerUnit) {
  let step = 1;
  let guard = 0;
  while (step * pxPerUnit < RULER.majorMinPx && guard++ < 12) step *= 10;
  guard = 0;
  while (step > 1 && (step / 10) * pxPerUnit >= RULER.majorMinPx && guard++ < 12) step /= 10;
  return step;
}

export function ticksAlong(lengthPx, pxPerUnit, tiers, sizes) {
  const out = [];
  const seen = {};
  for (const tier of tiers) {
    const gap = tier.step * pxPerUnit;
    if (!(gap > 0)) continue;
    const count = Math.floor(snap(lengthPx / gap));
    if (out.length + count + 1 > RULER.maxTicksPerAxis) break;
    for (let i = 0; i <= count; i++) {
      const px = Math.round(snap(i * gap) * 100) / 100;
      if (px > lengthPx + 0.01) break;
      const key = String(px);
      if (seen[key]) continue;
      seen[key] = 1;
      const value = snap(i * tier.step);
      out.push({
        px,
        size: sizes[tier.tier],
        tier: tier.tier,
        value,
        label: tier.tier === "unit" ? String(value) : null,
      });
    }
  }
  out.sort((a, b) => a.px - b.px);
  return out;
}

export function rulerTicks(spec, opts) {
  const o = opts || {};
  const g = toPx(spec);
  const m = rulerMetrics(o);
  const zoom = isFinite(Number(o.zoom)) && Number(o.zoom) > 0 ? Number(o.zoom) : 1;
  const pxPerUnit = unitToPx(1, g.unit) * zoom;
  const step = majorStep(pxPerUnit);
  const tiers = [
    { tier: "unit", step },
    { tier: "tenth", step: step / 10 },
    { tier: "hundredth", step: step / 100 },
  ].filter((t) => t.step * pxPerUnit >= RULER.minTickGapPx);
  return {
    h: ticksAlong(g.pageW, pxPerUnit, tiers, m.tick),
    v: ticksAlong(g.pageH, pxPerUnit, tiers, m.tick),
    unit: g.unit,
    zoom,
    pxPerUnit: snap(pxPerUnit),
    step,
    tiers: tiers.map((t) => t.tier),
    metrics: m,
  };
}

// Capacity is band height px ÷ leading px, weighted: a Markdown line costs what the type ramp in
//   lib/ui-page.js draws, rounded UP to a whole leading.

const LINE_WEIGHT = {
  h1: 2,
  h2: 1.7,
  h3: 1.4,
  h4: 1.2,
  h5: 1.1,
  h6: 1.1,
  rule: 1,
  quote: 1,
  code: 1,
  list: 1,
  blank: 1,
  text: 1,
};

export function lineWeight(line, plain) {
  const s = String(line === undefined || line === null ? "" : line);
  const t = s.trim();
  if (plain) return 1;
  if (t === "") return LINE_WEIGHT.blank;
  const h = /^(#{1,6})\s/.exec(t);
  if (h) return LINE_WEIGHT["h" + h[1].length] || 1;
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return LINE_WEIGHT.rule;
  if (/^>/.test(t)) return LINE_WEIGHT.quote;
  if (/^```/.test(t)) return LINE_WEIGHT.code;
  if (/^([-*+]\s|\d+\.\s)/.test(t)) return LINE_WEIGHT.list;
  return LINE_WEIGHT.text;
}

// The whole zone's cost in leadings — the number that is compared against capacity.
export function textCost(content, plain) {
  const s = content === undefined || content === null ? "" : String(content);
  if (s === "") return 0;
  const lines = s.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  let total = 0;
  for (const line of lines) total += lineWeight(line, plain);
  return Math.ceil(snap(total));
}

// How many lines each band holds at this page spec. Geometry only — no text involved.
export function zoneCapacity(spec) {
  const g = toPx(spec);
  const lead = g.leading > 0 ? g.leading : 1;
  const cap = (px) => Math.max(0, Math.floor(Math.max(0, px) / lead));
  return {
    header: cap(g.headerH),
    body: cap(g.bodyH),
    footer: cap(g.footerH),
    leadingPx: lead,
    bodyHpx: g.bodyH,
    headerHpx: g.headerH,
    footerHpx: g.footerH,
  };
}

// One zone, weighed: what it holds, what is in it, and whether the next line still fits.
// zone is "header" | "body" | "footer"; only the body is read as Markdown.
export function zoneFit(content, spec, zone) {
  const which = zone === "header" || zone === "footer" ? zone : "body";
  const caps = zoneCapacity(spec);
  const capacity = caps[which];
  // Headings print big in the running head and foot too (lib/ui-page.js chromeRender), so every
  // band weighs them alike. `plain` survives on lineWeight/textCost for callers wanting raw lines.
  const used = textCost(content, false);
  return {
    zone: which,
    capacity,
    used,
    remaining: Math.max(0, capacity - used),
    over: Math.max(0, used - capacity),
    ok: used <= capacity,
    full: used >= capacity,
    text: used + "/" + capacity,
  };
}

// --- sections --------------------------------------------------------------

// Lines of content, the way an author counts them: a trailing newline doesn't invent a line.
export function countLines(content) {
  const s = content === undefined || content === null ? "" : String(content);
  if (s === "") return 0;
  const lines = s.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.length;
}

// "Section list: name, content preview, line count vs limit." lineLimit 0 (the column default)
// means no ceiling, so remaining is null and nothing is ever over.
export function sectionLines(content, limit) {
  const count = countLines(content);
  const lim = Math.max(0, Math.floor(Number(limit) || 0));
  if (lim === SECTION_NO_LIMIT) {
    return { count, limit: 0, limited: false, remaining: null, over: 0, ok: true, atLimit: false, text: String(count) };
  }
  const over = Math.max(0, count - lim);
  return {
    count,
    limit: lim,
    limited: true,
    remaining: Math.max(0, lim - count),
    over,
    ok: over === 0,
    atLimit: count >= lim,
    text: count + "/" + lim,
  };
}

module.exports = {
  // constants
  PX_PER_IN,
  UNITS,
  UNIT_PX,
  MIN_PAGE_PX,
  MIN_BODY_PX,
  RULER,
  DEFAULT_SPEC,
  DEFAULT_LEADING_PT,
  SECTION_NO_LIMIT,
  FORMATS,
  FORMAT_EPS,
  MIN_BODY_MM,
  LINE_WEIGHT,
  // numbers
  roundPx,
  unitToPx,
  fromPx,
  isUnit,
  // spec
  normalize,
  convert,
  validate,
  toPx,
  zones,
  // rulers
  rulerMetrics,
  rulerFrame,
  rulerTicks,
  // formats
  formatById,
  matchFormat,
  applyFormat,
  fitBandsMm,
  // capacity
  lineWeight,
  textCost,
  zoneCapacity,
  zoneFit,
  // sections
  countLines,
  sectionLines,
};
