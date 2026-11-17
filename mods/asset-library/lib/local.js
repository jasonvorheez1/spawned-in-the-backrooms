// Asset Library — this game's own shelf rows. Generated; edited through the
// Assets tab. The shelf that travels with the mod is lib/catalog.js, and the
// two are merged on read, so mod updates can never overwrite what you added.
//
// The rows live in lib/local-1.js onward: the UI realm drops a mount whose
// biggest module passes 1,000,000 chars, and this shelf outgrew that.
// require() takes no computed path, so the shards are listed by hand and a
// slot that isn't there yet simply reads empty. What comes back is the same
// { rows, hidden } this file always exported.
const rows = [];
export function add(part) {
  if (!part || !part.length) return;
  for (let i = 0; i < part.length; i++) rows.push(part[i]);
}
try { add(require("lib/local-1.js")); } catch (e) {}
try { add(require("lib/local-2.js")); } catch (e) {}
try { add(require("lib/local-3.js")); } catch (e) {}
try { add(require("lib/local-4.js")); } catch (e) {}
try { add(require("lib/local-5.js")); } catch (e) {}
try { add(require("lib/local-6.js")); } catch (e) {}
try { add(require("lib/local-7.js")); } catch (e) {}
try { add(require("lib/local-8.js")); } catch (e) {}
module.exports = { rows: rows, hidden: [] };
