// paste — a pasted block fills the caret's zone to its band and spills the rest into new pages. A runaway guard, not a limit: past it the tail rides on the last page rather than being dropped (house rule 3 — never silently truncated).
const MAX_PAGES = 500;

const KEEP_RATIO = 0.8;

export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

// \r\n and lone \r both become \n — a Windows or old-Mac clipboard must not double every line.
export function normalize(s) {
  return str(s).split("\r\n").join("\n").split("\r").join("\n");
}

export function fieldOf(kind) {
  const k = str(kind);
  if (k === "header") return "header";
  if (k === "footer") return "footer";
  return "content";
}

export function noteFor(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!n) return "filled this page";
  return n === 1 ? "1 page added" : n + " pages added";
}

export function stitchOk(source, value, chunks) {
  const s = normalize(source);
  const v = normalize(value);
  const list = Array.isArray(chunks) ? chunks : [];
  if (s.slice(0, v.length) !== v) {
    return { ok: false, at: 0, reason: "the zone's text is not the head of the pasted text" };
  }
  let i = v.length;
  for (let n = 0; n < list.length; n++) {
    const c = normalize(list[n]);
    if (s.slice(i, i + c.length) !== c && s.charAt(i) === "\n" && s.slice(i + 1, i + 1 + c.length) === c) i += 1;
    if (s.slice(i, i + c.length) !== c) {
      return { ok: false, at: i, page: n + 1, reason: "page " + (n + 1) + " is not the next run of the pasted text" };
    }
    i += c.length;
  }
  if (i !== s.length) return { ok: false, at: i, left: s.length - i, reason: "text left over after the last page" };
  return { ok: true, at: i, left: 0, reason: "" };
}

// GUARD: the realm half is emitted as ONE attribute's worth of JavaScript — single quotes only, no
//   template literals, no line comments a collapsed newline could swallow.

export function jsQuote(s) {
  return str(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

const REALM = [
  "(function(ev, el, cardId, pageId, field){",
  "  var cd = ev.clipboardData || window.clipboardData;",
  "  if (!cd) return;",
  "  var raw = cd.getData ? cd.getData('text') : '';",
  "  if (raw === null || raw === undefined) raw = '';",
  "  var src = String(raw).split('\\r\\n').join('\\n').split('\\r').join('\\n');",
  "  if (!src) return;",
  "  ev.preventDefault();",
  "  var doc = el.ownerDocument || document;",
  "  var twin = function(from){",
  "    var n = doc.createElement('textarea');",
  "    var cs = window.getComputedStyle(from);",
  "    var keys = ['fontFamily','fontSize','fontWeight','fontStyle','fontVariant','letterSpacing','lineHeight','textIndent','textTransform','wordSpacing','whiteSpace','wordBreak','overflowWrap','tabSize','textAlign','direction','boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle'];",
  "    for (var i = 0; i < keys.length; i++) { try { n.style[keys[i]] = cs[keys[i]]; } catch (e1) {} }",
  "    var r = from.getBoundingClientRect();",
  // PAPER ZOOM (--pz): the rect is post-zoom, the copied styles pre-zoom — an unzoomed twin sized from a zoomed rect packs the wrong amount of text per page. Dress the twin in the box's own effective zoom and size it in pre-zoom units; at zoom 1 this is a no-op.
  "    var z = from.offsetWidth ? (r.width / from.offsetWidth) : 1;",
  "    if (!isFinite(z) || z <= 0) z = 1;",
  "    n.style.position = 'fixed'; n.style.left = '-4000px'; n.style.top = '0px';",
  "    try { n.style.zoom = z; } catch (e2) {}",
  "    n.style.width = (r.width / z) + 'px'; n.style.height = (r.height / z) + 'px';",
  "    n.style.overflow = 'hidden'; n.style.resize = 'none'; n.style.visibility = 'hidden';",
  "    n.setAttribute('aria-hidden', 'true'); n.tabIndex = -1;",
  "    doc.body.appendChild(n);",
  "    return n;",
  "  };",
  "  var fits = function(n, v){ n.value = v; return n.scrollHeight <= n.clientHeight + 1; };",
  "  var most = function(n, head, tail, s){",
  "    if (fits(n, head + s + tail)) return s.length;",
  "    var lo = 0, hi = s.length;",
  "    while (lo < hi) {",
  "      var mid = Math.floor((lo + hi + 1) / 2);",
  "      if (fits(n, head + s.slice(0, mid) + tail)) lo = mid; else hi = mid - 1;",
  "    }",
  "    return lo;",
  "  };",
  "  var cut = function(s, k){",
  "    if (k >= s.length) return { keep: s.length, next: s.length };",
  "    var p = s.slice(0, k);",
  "    var nl = p.lastIndexOf('\\n');",
  "    if (nl >= 0 && nl >= k * " + KEEP_RATIO + ") return { keep: nl, next: nl + 1 };",
  "    var sp = p.lastIndexOf(' ');",
  "    if (sp >= 0 && sp + 1 >= k * " + KEEP_RATIO + ") return { keep: sp + 1, next: sp + 1 };",
  "    return { keep: k, next: k };",
  "  };",
  "  var zoneTwin = twin(el);",
  "  var bodyEl = doc.getElementById('sb-raw-body') || el;",
  "  var bodyTwin = bodyEl === el ? zoneTwin : twin(bodyEl);",
  "  var chunks = [];",
  "  var kept = el.value;",
  "  var caret = el.selectionStart || 0;",
  "  try {",
  "    var v = el.value;",
  "    var a = el.selectionStart, b = el.selectionEnd;",
  "    if (a === null || a === undefined) a = v.length;",
  "    if (b === null || b === undefined) b = a;",
  "    if (b < a) { var swap = a; a = b; b = swap; }",
  "    var head = v.slice(0, a), tail = v.slice(b);",
  "    var first = cut(src, most(zoneTwin, head, tail, src));",
  "    kept = head + src.slice(0, first.keep) + tail;",
  "    caret = head.length + first.keep;",
  "    var rest = src.slice(first.next);",
  "    while (rest.length && chunks.length < " + MAX_PAGES + ") {",
  "      var k = most(bodyTwin, '', '', rest);",
  "      if (k >= rest.length) { chunks.push(rest); rest = ''; break; }",
  "      var c = cut(rest, k);",
  "      if (c.next <= 0) { c = { keep: 1, next: 1 }; }",
  "      chunks.push(rest.slice(0, c.keep));",
  "      rest = rest.slice(c.next);",
  "    }",
  "    if (rest.length) { if (chunks.length) chunks[chunks.length - 1] += rest; else chunks.push(rest); }",
  "  } finally {",
  "    if (zoneTwin && zoneTwin.parentNode) zoneTwin.parentNode.removeChild(zoneTwin);",
  "    if (bodyTwin && bodyTwin !== zoneTwin && bodyTwin.parentNode) bodyTwin.parentNode.removeChild(bodyTwin);",
  "  }",
  "  el.value = kept;",
  "  el.setAttribute('data-fit', kept);",
  "  el.scrollTop = 0;",
  "  try { el.setSelectionRange(caret, caret); } catch (e2) {}",
  "  sendAction('cardAct', { op: 'pagePaste', cardId: cardId, pageId: pageId, field: field, value: kept, chunks: chunks });",
  "})(event, this, ",
].join("\n");

export function handlerScript(opts) {
  const o = opts || {};
  const kind = str(o.field) === "header" ? "header" : str(o.field) === "footer" ? "footer" : "body";
  return REALM + "'" + jsQuote(o.cardId) + "', '" + jsQuote(o.pageId) + "', '" + kind + "')";
}

module.exports = {
  MAX_PAGES,
  KEEP_RATIO,
  normalize,
  fieldOf,
  noteFor,
  stitchOk,
  handlerScript,
};
