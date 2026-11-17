// Asset Library catalog — generated. Edited through the Assets tab. This is
// the shelf that travels with the mod; a game's own rows ride lib/local.js
// and the two are merged on read.
//
// The rows live in lib/catalog-1.js onward: the UI realm drops a mount whose
// biggest module passes 1,000,000 chars, and this shelf outgrew that.
// require() takes no computed path, so the shards are listed by hand and a
// slot that isn't filled yet simply reads empty. What comes back is the same
// array of rows this file always exported.
const rows = [];
export function add(part) {
  if (!part || !part.length) return;
  for (let i = 0; i < part.length; i++) rows.push(part[i]);
}
try { add(require("lib/catalog-1.js")); } catch (e) {}
try { add(require("lib/catalog-2.js")); } catch (e) {}
try { add(require("lib/catalog-3.js")); } catch (e) {}
try { add(require("lib/catalog-4.js")); } catch (e) {}
try { add(require("lib/catalog-5.js")); } catch (e) {}
try { add(require("lib/catalog-6.js")); } catch (e) {}
try { add(require("lib/catalog-7.js")); } catch (e) {}
try { add(require("lib/catalog-8.js")); } catch (e) {}
module.exports = rows;
