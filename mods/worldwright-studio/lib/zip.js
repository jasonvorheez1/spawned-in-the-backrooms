// zip.js — a dependency-free, store-only (method 0) ZIP writer. Pure functions, no api, no state. Deterministic: no clock is read, so entries carry a fixed DOS stamp unless the caller passes one — the same input always produces byte-identical output.

let CRC_TABLE = null;

export function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

export function crc32(bytes) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Hand-rolled: TextEncoder is not guaranteed in this sandbox, and the zip spec wants raw bytes.
export function utf8Bytes(str) {
  const s = String(str === undefined || str === null ? "" : str);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        const cp = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        i += 1;
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return new Uint8Array(out);
}

export function utf8String(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b >= 0xc0 && b < 0xe0) {
      out += String.fromCharCode(((b & 31) << 6) | (bytes[i + 1] & 63));
      i += 2;
    } else if (b >= 0xe0 && b < 0xf0) {
      out += String.fromCharCode(((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63));
      i += 3;
    } else {
      const cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      const v = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 1023));
      i += 4;
    }
  }
  return out;
}

export function w16(buf, at, v) {
  buf[at] = v & 0xff;
  buf[at + 1] = (v >>> 8) & 0xff;
}

export function w32(buf, at, v) {
  buf[at] = v & 0xff;
  buf[at + 1] = (v >>> 8) & 0xff;
  buf[at + 2] = (v >>> 16) & 0xff;
  buf[at + 3] = (v >>> 24) & 0xff;
}

export function blit(buf, at, bytes) {
  for (let i = 0; i < bytes.length; i++) buf[at + i] = bytes[i];
  return at + bytes.length;
}

// Forward slashes are kept — they are how a zip spells a folder.
export function safeName(str) {
  let s = String(str === undefined || str === null ? "" : str)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
  if (!s) s = "untitled";
  return s.length > 120 ? s.slice(0, 120) : s;
}

// 1980-01-01 00:00 in DOS stamp form — the epoch of the format itself, and a stable default.
const DOS_DATE = (1 << 5) | 1;
const DOS_TIME = 0;

/**
 * files: [{ name, text }] (or { name, bytes: Uint8Array }). Names may carry folders: "Proj/Book.md".
 * Returns the whole archive as one Uint8Array.
 */
export function zipFiles(files, opts) {
  const date = (opts && Number(opts.dosDate)) || DOS_DATE;
  const time = (opts && Number(opts.dosTime)) || DOS_TIME;
  const entries = [];
  const list = files || [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i] || {};
    const nameBytes = utf8Bytes(String(f.name || "file-" + (i + 1) + ".txt"));
    const data = f.bytes && f.bytes.length !== undefined ? f.bytes : utf8Bytes(f.text);
    entries.push({ nameBytes, data, crc: crc32(data), offset: 0 });
  }

  let local = 0;
  let central = 0;
  for (const e of entries) {
    local += 30 + e.nameBytes.length + e.data.length;
    central += 46 + e.nameBytes.length;
  }
  const buf = new Uint8Array(local + central + 22);

  // Local file headers + stored payloads.
  let at = 0;
  for (const e of entries) {
    e.offset = at;
    w32(buf, at, 0x04034b50); // local file header signature
    w16(buf, at + 4, 20); // version needed to extract (2.0 — stored)
    w16(buf, at + 6, 0x0800); // general purpose flag: bit 11, names are UTF-8
    w16(buf, at + 8, 0); // method 0 — stored
    w16(buf, at + 10, time);
    w16(buf, at + 12, date);
    w32(buf, at + 14, e.crc);
    w32(buf, at + 18, e.data.length); // compressed size == uncompressed, stored
    w32(buf, at + 22, e.data.length);
    w16(buf, at + 26, e.nameBytes.length);
    w16(buf, at + 28, 0); // extra field length
    at = blit(buf, at + 30, e.nameBytes);
    at = blit(buf, at, e.data);
  }

  // Central directory.
  const cdStart = at;
  for (const e of entries) {
    w32(buf, at, 0x02014b50); // central file header signature
    w16(buf, at + 4, 20); // version made by
    w16(buf, at + 6, 20); // version needed
    w16(buf, at + 8, 0x0800);
    w16(buf, at + 10, 0);
    w16(buf, at + 12, time);
    w16(buf, at + 14, date);
    w32(buf, at + 16, e.crc);
    w32(buf, at + 20, e.data.length);
    w32(buf, at + 24, e.data.length);
    w16(buf, at + 28, e.nameBytes.length);
    w16(buf, at + 30, 0); // extra
    w16(buf, at + 32, 0); // comment
    w16(buf, at + 34, 0); // disk number start
    w16(buf, at + 36, 0); // internal attributes
    w32(buf, at + 38, 0); // external attributes
    w32(buf, at + 42, e.offset);
    at = blit(buf, at + 46, e.nameBytes);
  }

  // End of central directory.
  w32(buf, at, 0x06054b50);
  w16(buf, at + 4, 0); // this disk
  w16(buf, at + 6, 0); // disk with the central directory
  w16(buf, at + 8, entries.length);
  w16(buf, at + 10, entries.length);
  w32(buf, at + 12, at - cdStart);
  w32(buf, at + 16, cdStart);
  w16(buf, at + 20, 0); // comment length
  return buf;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toBase64(bytes) {
  let out = "";
  let i = 0;
  const n = bytes.length;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(v >>> 18) & 63] + B64[(v >>> 12) & 63] + B64[(v >>> 6) & 63] + B64[v & 63];
  }
  const rest = n - i;
  if (rest === 1) {
    const v = bytes[i] << 16;
    out += B64[(v >>> 18) & 63] + B64[(v >>> 12) & 63] + "==";
  } else if (rest === 2) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(v >>> 18) & 63] + B64[(v >>> 12) & 63] + B64[(v >>> 6) & 63] + "=";
  }
  return out;
}

module.exports = { zipFiles, crc32, utf8Bytes, utf8String, toBase64, safeName };
