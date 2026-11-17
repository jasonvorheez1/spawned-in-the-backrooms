// Asset Library — the creator tab. Lives on the mount path because it needs
// real DOM: file drops, drag-a-card-into-the-world, inline tag editing.
//
// The catalog is a spec module (lib/catalog.js) written by god.js. The panel
// hydrates from it at mount, mutates its own copy optimistically, and commits
// every change back through sendAction — so the shelf never lags the click.

const S = require("lib/store.js");
const BK = require("lib/brainkit.js");

const PANEL_CSS = `
.alx { position:absolute; top:52px; left:12px; width:352px; max-height:calc(100vh - 76px);
  display:flex; flex-direction:column; pointer-events:auto; font:12px/1.4 ui-sans-serif,system-ui,sans-serif;
  color:#e9e6f2; background:rgba(14,13,20,0.93); border:1px solid rgba(255,255,255,0.11);
  border-radius:2px; box-shadow:0 18px 48px rgba(0,0,0,0.55); backdrop-filter:blur(9px); overflow:hidden; }
.alx-hd { display:flex; align-items:center; gap:8px; padding:9px 11px; border-bottom:1px solid rgba(255,255,255,0.08); }
.alx-ttl { font-size:10px; letter-spacing:.16em; text-transform:uppercase; opacity:.65; }
.alx-ct { margin-left:auto; font-size:10px; opacity:.45; }
.alx-body { overflow-y:auto; overflow-x:hidden; }
.alx-body::-webkit-scrollbar { width:13px; }
.alx-body::-webkit-scrollbar-track { background:rgba(255,255,255,0.04); }
.alx-body::-webkit-scrollbar-thumb { background:rgba(190,215,255,0.34); border-radius:2px; border:3px solid transparent; background-clip:content-box; }
.alx-body::-webkit-scrollbar-thumb:hover { background:rgba(200,225,255,0.6); background-clip:content-box; }
.alx-pad { padding:9px 11px; }
.alx-in { width:100%; box-sizing:border-box; background:rgba(255,255,255,0.06); color:#f2f0f8;
  border:1px solid rgba(255,255,255,0.12); border-radius:2px; padding:6px 8px; font:12px/1.3 inherit; outline:none; }
.alx-in:focus { border-color:rgba(160,200,255,0.55); background:rgba(255,255,255,0.09); }
.alx-row { display:flex; gap:4px; flex-wrap:wrap; }
.alx-kind { flex:1 1 auto; text-align:center; padding:5px 4px; border-radius:2px; cursor:pointer;
  background:rgba(255,255,255,0.05); border:1px solid transparent; font-size:11px; opacity:.7; user-select:none; }
.alx-kind:hover { background:rgba(255,255,255,0.1); opacity:1; }
.alx-kind.on { background:rgba(150,190,255,0.18); border-color:rgba(150,190,255,0.45); opacity:1; }
.alx-tag { padding:2px 7px; border-radius:2px; cursor:pointer; user-select:none; font-size:10px;
  background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.09); opacity:.75; }
.alx-tag:hover { opacity:1; background:rgba(255,255,255,0.12); }
.alx-tag.on { background:rgba(180,255,200,0.18); border-color:rgba(180,255,200,0.4); opacity:1; }
.alx-card { padding:8px 11px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:grab; }
.alx-card:hover { background:rgba(255,255,255,0.045); }
.alx-card.drag { opacity:.35; }
.alx-c1 { display:flex; align-items:flex-start; gap:9px; }
.alx-thumb { position:relative; flex:0 0 auto; width:54px; height:54px; border-radius:2px; overflow:hidden;
  background:linear-gradient(150deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.10); display:flex; align-items:center; justify-content:center; }
.alx-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.alx-thumb img.fit { object-fit:contain; }
.alx-thumb img.off { display:none; }
.alx-thumb .fb { position:absolute; font-size:20px; opacity:.5; }
.alx-thumb.has .fb { display:none; }
.alx-thumb.needs { border:1px dashed rgba(255,255,255,0.20); background:rgba(255,255,255,0.03); }
.alx-thumb.needs .fb { opacity:.32; }
.alx-snap { position:absolute; right:2px; bottom:2px; font-size:10px; line-height:1; padding:2px 3px; border-radius:2px;
  background:rgba(10,12,16,0.72); border:1px solid rgba(255,255,255,0.14); cursor:pointer; opacity:.62; }
.alx-snap:hover { opacity:1; background:rgba(10,12,16,0.92); border-color:rgba(180,255,200,0.5); }
.alx-thumb.busy .alx-snap { opacity:1; border-color:rgba(180,255,200,0.6); }
.alx-thumb.busy::after { content:""; position:absolute; inset:0; border:1px solid rgba(180,255,200,0.55);
  animation:alxpulse 1.1s ease-in-out infinite; }
@keyframes alxpulse { 0%,100% { opacity:.25; } 50% { opacity:.9; } }
.alx-meta { flex:1 1 auto; min-width:0; }
.alx-ico { font-size:14px; line-height:1; }
.alx-nm { font-size:12.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alx-pth { font-size:9.5px; opacity:.35; margin:2px 0 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alx-ctag { display:flex; gap:3px; flex-wrap:wrap; margin:5px 0 0 0; }
.alx-acts { display:none; gap:4px; margin:7px 0 0 0; }
.alx-card:hover .alx-acts, .alx-card.open .alx-acts { display:flex; flex-wrap:wrap; }
.alx-b { padding:3px 7px; font-size:10px; border-radius:2px; cursor:pointer; user-select:none;
  background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); }
.alx-b:hover { background:rgba(255,255,255,0.16); }
a.alx-b { color:inherit; text-decoration:none; display:inline-block; }
.alx-b.go { background:rgba(120,220,160,0.2); border-color:rgba(120,220,160,0.45); }
.alx-b.bad:hover { background:rgba(255,120,120,0.25); }
.alx-b.arm { background:rgba(255,140,140,0.24); border-color:rgba(255,140,140,0.6); }
.alx-ft { border-top:1px solid rgba(255,255,255,0.08); padding:8px 11px; display:flex; flex-direction:column; gap:6px; }
.alx-mini { font-size:9.5px; opacity:.4; }
.alx-drop { position:absolute; inset:0; display:none; align-items:center; justify-content:center;
  background:rgba(120,200,255,0.14); border:2px dashed rgba(150,210,255,0.7); border-radius:2px;
  font-size:13px; font-weight:600; letter-spacing:.04em; pointer-events:none; z-index:5; }
.alx.over .alx-drop { display:flex; }
.alx-ghost { position:fixed; z-index:99; pointer-events:none; padding:5px 10px; border-radius:2px;
  background:rgba(20,18,28,0.95); border:1px solid rgba(150,210,255,0.6); font:11px/1.2 ui-sans-serif,system-ui,sans-serif;
  color:#eaf2ff; box-shadow:0 8px 22px rgba(0,0,0,0.5); transform:translate(-50%,-140%); }
.alx-note { font-size:10px; padding:5px 8px; border-radius:2px; background:rgba(150,210,255,0.14); }
.alx-empty { padding:22px 12px; text-align:center; font-size:11px; opacity:.4; }
.alx-tabs { display:flex; gap:4px; padding:7px 11px 0 11px; }
.alx-mhd { padding:7px 11px 4px 11px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; opacity:.55;
  background:rgba(255,255,255,0.035); border-bottom:1px solid rgba(255,255,255,0.06); }
.alx-mline { font-size:10px; opacity:.5; margin:2px 0 0 0; }
.alx-tab { flex:1 1 auto; text-align:center; padding:5px 4px; font-size:11px; cursor:pointer; user-select:none;
  border-radius:2px; background:rgba(255,255,255,0.05); border:1px solid transparent; opacity:.65; white-space:nowrap; }
.alx-tab:hover { opacity:1; background:rgba(255,255,255,0.1); }
.alx-tab.on { opacity:1; background:rgba(150,190,255,0.18); border-color:rgba(150,190,255,0.45); }
.alx-sync { flex:0 0 auto; align-self:center; padding:3px 8px; font-size:10px; border-radius:2px; cursor:pointer;
  user-select:none; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.07); white-space:nowrap; }
.alx-sync:hover { background:rgba(255,255,255,0.15); }
.alx-sync.on { background:rgba(120,220,160,0.2); border-color:rgba(120,220,160,0.5); }
.alx-where { font-size:9.5px; opacity:.32; margin:3px 0 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alx-mint { display:none; flex-direction:column; gap:5px; }
.alx-mint.on { display:flex; }
.alx-sel { background:rgba(255,255,255,0.06); color:#f2f0f8; border:1px solid rgba(255,255,255,0.12);
  border-radius:2px; padding:5px 6px; font:11px inherit; flex:1 1 0; outline:none; }
.alx-crate { border-bottom:1px solid rgba(255,255,255,0.06); }
.alx-chd { display:flex; align-items:center; gap:8px; padding:8px 11px; cursor:pointer; user-select:none; }
.alx-chd:hover { background:rgba(255,255,255,0.045); }
.alx-cx { flex:0 0 auto; width:9px; text-align:center; font-size:9px; opacity:.4; }
.alx-cnm { font-size:12.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alx-csub { font-size:9.5px; opacity:.4; margin:2px 0 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alx-cbody { border-top:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); }
.alx-cbody .alx-card { padding-left:22px; }
.alx-ta { width:100%; box-sizing:border-box; resize:none; word-break:break-all;
  font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace; }
`;

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];

// The wheel over the panel is god-mode's dolly and the engine keeps it, so the
// list has to be tall enough to live without scrolling — and its scrollbar is
// wide enough to grab when it does.
const LIST_H = "calc(100vh - 340px)";

export function onMount(container, localPlayer) {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  const send = (name, payload) => win.sendAction(name, payload);

  let assets = hydrate();
  let crates = hydrateCrates();

  // ---- the Motions shelf -------------------------------------------------
  // Motion rows are not catalog rows and never become any: the authored clips
  // ARE the library, so the cards are built from lib/motions.js every render.
  // Only their pictures are kept, in their own generated module keyed by the
  // registry key — photographing a motion never writes into the catalog.
  function hydrateMotionShots() {
    try {
      const raw = require("lib/shots.js");
      return JSON.parse(JSON.stringify(raw || {}));
    } catch (e) {
      return {};
    }
  }

  function motionCards() {
    try {
      return require("lib/motions.js").cards() || [];
    } catch (e) {
      return [];
    }
  }

  function motionRows() {
    return motionCards().map((c) => S.motionAsset(c, motionShots[c.key] || ""));
  }

  // The body a motion is photographed on: a rigged character off this shelf.
  // Every authored clip is written against the one 24-joint skeleton every
  // conjured character shares, so any of them wears any motion.
  function motionBody() {
    const pool = assets.filter(
      (a) => a.kind === "animation" && /\.glb/i.test(a.path) && (a.tags || []).indexOf("unrigged") < 0 && (a.clips || []).length
    );
    const nice = pool.find((a) => /humanoid|portrait|villager|knight|beggar|hero/i.test(a.path));
    const pick = nice || pool[0];
    return pick ? pick.path : "";
  }

  // key → the /cdn/ picture taken of a body wearing that motion.
  let motionShots = hydrateMotionShots();
  // Whose name goes on a crate he packs. The mount realm has no world to ask,
  // so it's whatever the player snapshot already carries — often nothing, and
  // an unsigned crate is fine.
  const me = creatorName(localPlayer);
  const view = { q: "", tagq: "", kind: "all", tags: [], open: null, minting: false, note: "", tab: "shelf", crateOpen: {}, code: "", editNote: "", mgroup: "all" };
  const project = { rows: hydrateProject(), asked: false };
  // The merged project cards from the last render — how byId() finds an asset
  // that lives in the game but not on the shelf.
  let projectList = [];

  container.style.pointerEvents = "none";
  container.innerHTML = `<style>${PANEL_CSS}</style>
    <div class="alx" id="alx" data-input-capture="ignore" data-interactive>
      <div class="alx-hd"><span class="alx-ttl">Asset Library</span><span class="alx-ct" id="alx-ct"></span></div>
      <div class="alx-tabs">
        <div class="alx-tab on" data-tab="shelf">🗄️ Shelf</div>
        <div class="alx-tab" data-tab="project">📁 Project</div>
        <div class="alx-tab" data-tab="sets">🏛️ Sets</div>
        <div class="alx-tab" data-tab="motions">🎞️ Motions</div>
        <div class="alx-tab" data-tab="crates">🧰 Crates</div>
      </div>
      <div class="alx-pad" id="alx-tools" style="display:flex;flex-direction:column;gap:7px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <input class="alx-in" id="alx-q" placeholder="search  ·  #tag  ·  words" autocomplete="off" spellcheck="false" />
        <div class="alx-row" id="alx-kinds"></div>
        <div class="alx-row" style="align-items:center;gap:5px">
          <input class="alx-in" id="alx-tagq" style="flex:1 1 auto;font-size:11px;padding:4px 7px" placeholder="🏷 find a tag" autocomplete="off" spellcheck="false" />
          <span class="alx-mini" id="alx-tagct" style="flex:0 0 auto;opacity:.4"></span>
        </div>
        <div class="alx-row" id="alx-tags"></div>
        <div class="alx-row">
          <div class="alx-b" id="alx-shootall" title="stands each one in front of your camera and photographs it — that shot becomes the card">📷 photograph the blanks</div>
          <div class="alx-b" id="alx-matscan" title="reads every surface this game is wearing — scripts, terrain, objects — and puts any new material on the shelf, its own picture on the card">🎨 Scan materials</div>
        </div>
      </div>
      <div class="alx-pad" id="alx-stools" style="display:none;flex-direction:column;gap:5px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div class="alx-row" style="align-items:center;gap:5px">
          <input class="alx-in" id="alx-setname" style="flex:1 1 auto;font-size:11px;padding:4px 7px" placeholder="name it — “stone keep”" autocomplete="off" />
          <div class="alx-b go" id="alx-setsave" title="everything you have selected in the world, saved together with its arrangement">🏛️ save selection</div>
        </div>
        <div class="alx-row" style="align-items:center;gap:5px">
          <div class="alx-b" id="alx-cbox" title="drops one box in front of you — stretch it over a scene and hit “select inside”">◻ capture box</div>
          <div class="alx-b" id="alx-cboxoff" title="removes the capture box from the scene">✕</div>
          <span class="alx-mini" style="flex:1 1 auto;opacity:.45">or shift + right-click pieces one at a time</span>
          <div class="alx-b" id="alx-clear" title="removes everything this tool has placed in the world — the shelf keeps every asset">🧹 clear the scene</div>
        </div>
        <span class="alx-mini" style="opacity:.45">select a whole scene in the world — buildings, furniture, characters — name it, and it keeps its arrangement</span>
      </div>
      <div class="alx-pad" id="alx-mtools" style="display:none;flex-direction:column;gap:5px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div class="alx-row" style="align-items:center;gap:5px">
          <span class="alx-mini" style="flex:1 1 auto;opacity:.5">drag a motion onto a body in the world — it starts moving where it stands</span>
          <div class="alx-b" id="alx-moff" title="clears the motion off whatever you have selected — the body goes back to its own idle">✕ take it off</div>
        </div>
      </div>
      <div class="alx-pad" id="alx-ptools" style="display:none;gap:6px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08)">
        <span class="alx-mini" id="alx-pcount" style="flex:1 1 auto"></span>
        <div class="alx-b" id="alx-padd" title="select a thing in the world, then click this — everything it wears joins the list and stays">＋ add selection</div>
        <div class="alx-b" id="alx-rescan">↻ rescan</div>
        <div class="alx-b go" id="alx-syncall">sync all</div>
      </div>
      <div class="alx-pad" id="alx-ctools" style="display:none;flex-direction:column;gap:5px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div class="alx-row" style="align-items:center;gap:5px">
          <input class="alx-in" id="alx-code" style="flex:1 1 auto;font-size:11px;padding:4px 7px" placeholder="paste a share code…" autocomplete="off" spellcheck="false" />
          <div class="alx-b go" id="alx-unpack" title="reads a code someone sent you — its assets land on your shelf">📥 unpack</div>
        </div>
        <div class="alx-row" style="align-items:center;gap:5px">
          <input class="alx-in" id="alx-cnamein" style="flex:1 1 auto;font-size:11px;padding:4px 7px" placeholder="name it — “forest kit”" autocomplete="off" />
          <div class="alx-b" id="alx-cnew" title="packs whatever the search above is showing into a crate you can hand to someone">＋ new crate</div>
        </div>
        <input class="alx-in" id="alx-cdescin" style="font-size:11px;padding:4px 7px" placeholder="a line about it — what it's for, who it's from (optional)" autocomplete="off" maxlength="240" />
        <span class="alx-mini" id="alx-cnote" style="opacity:.45"></span>
      </div>
      <div id="alx-note"></div>
      <div class="alx-body" id="alx-list"></div>
      <div class="alx-ft" id="alx-ftr">
        <input class="alx-in" id="alx-paste" placeholder="paste a /cdn/ path — or a whole crate from another game" autocomplete="off" spellcheck="false" />
        <div class="alx-row">
          <div class="alx-b" id="alx-newbtn" style="flex:1 1 auto;text-align:center">✦ conjure something new</div>
          <div class="alx-b" id="alx-crate" title="copy this whole shelf as a crate — paste it into another game's shelf">📦 crate</div>
        </div>
        <div class="alx-mint" id="alx-mint">
          <input class="alx-in" id="alx-mname" placeholder="what is it? (mossy stone bridge)" autocomplete="off" />
          <div class="alx-row">
            <select class="alx-sel" id="alx-mkind"></select>
            <select class="alx-sel" id="alx-mfam"></select>
          </div>
          <input class="alx-in" id="alx-mclips" placeholder="clips, models only (Idle,Walk,Run)" autocomplete="off" />
          <input class="alx-in" id="alx-mtags" placeholder="tags (village, prop)" autocomplete="off" />
          <div class="alx-row"><div class="alx-b go" id="alx-mgo" style="flex:1 1 auto;text-align:center">mint + shelve</div></div>
        </div>
        <div class="alx-mini">drag a card into the world to place it · .png files drop straight in · 📦 crates carry a shelf between games</div>
      </div>
      <div class="alx-drop">drop images to shelve them</div>
    </div>`;

  const $ = (id) => container.querySelector("#" + id);
  const panel = $("alx");
  const listEl = $("alx-list");
  const qEl = $("alx-q");

  const kindSel = $("alx-mkind");
  // A set is captured from the world, never typed into the mint form.
  kindSel.innerHTML = S.KINDS.filter((k) => k !== "set")
    .map((k) => `<option value="${k}">${S.KIND_META[k].label}</option>`)
    .join("");
  const famSel = $("alx-mfam");
  famSel.innerHTML = S.FAMILIES.map((f) => `<option value="${f}">${f}</option>`).join("") + `<option value="">no family</option>`;

  function hydrate() {
    try {
      // Two halves: the shelf that travelled here inside the mod, and whatever
      // this game added on top of it. Merged, they are one shelf.
      const raw = require("lib/catalog.js");
      let own = null;
      try {
        own = require("lib/local.js");
      } catch (e) {
        own = null;
      }
      // Effects ship in their own module — fire, weather, lamplight — so a new
      // release can refresh them without touching a game's own shelf edits.
      let fx = null;
      try {
        fx = require("lib/effects.js");
      } catch (e) {
        fx = null;
      }
      const merged = S.mergeShelf((raw || []).concat(fx || []), own || {});
      return JSON.parse(JSON.stringify(merged)).map(makeRow);
    } catch (e) {
      return [];
    }
  }

  function makeRow(raw) {
    return S.makeAsset(raw);
  }

  function metaOf(kind) {
    return (S.KIND_META && S.KIND_META[kind]) || S.KIND_META.model;
  }

  // The Shelf is everything with a file behind it. Sets have their own tab and
  // their own verbs, so they never crowd it — and a crate packs files.
  function plainRows() {
    return assets.filter((a) => a.kind !== "set");
  }

  // The Project list is written by god.js the same way the shelf is — a spec
  // module. At mount we read whatever the last scan left; a fresh scan arrives
  // live through the game-event lane below.
  function hydrateProject() {
    try {
      const raw = require("lib/project.js");
      return JSON.parse(JSON.stringify(raw || []));
    } catch (e) {
      return [];
    }
  }

  // Crates are the same kind of module — written by god.js, read here at mount.
  // A crate row is only a name and a list of shelf paths: the assets themselves
  // live on the one shelf, always.
  function hydrateCrates() {
    try {
      const raw = require("lib/crates.js");
      return JSON.parse(JSON.stringify(raw || [])).map((c) => S.makeCrate(c));
    } catch (e) {
      return [];
    }
  }

  function creatorName(who) {
    const p = who || {};
    const st = p.state || {};
    return String(st.username || st.name || p.username || p.name || "").slice(0, 48);
  }

  // Sets are born in the world, not here — a panel that mounted before one was
  // captured must never erase it, so the world keeps its own set rows unless
  // this list names the ones the creator actually threw away.
  const droppedSets = [];

  function commit() {
    try {
      send("alSave", { assets: assets, dropSets: droppedSets.slice() });
    } catch (e) {
      /* the shelf still shows the change; the write retries on the next edit */
    }
  }

  function flash(text) {
    view.note = text;
    render();
    win.setTimeout(() => {
      if (view.note === text) {
        view.note = "";
        render();
      }
    }, 2600);
  }

  // A line the panel says without a re-render — during a drag the list can't be
  // torn out from under the pointer, so the note strip is painted on its own.
  function paintNote() {
    $("alx-note").innerHTML = view.note
      ? `<div class="alx-pad" style="padding-top:7px;padding-bottom:0"><div class="alx-note">${esc(view.note)}</div></div>`
      : "";
  }

  function say(text) {
    view.note = text;
    paintNote();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function render() {
    const proj = view.tab === "project";
    const sets = view.tab === "sets";
    const crat = view.tab === "crates";
    const mot = view.tab === "motions";
    const tabs = container.querySelectorAll("[data-tab]");
    for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i].getAttribute("data-tab") === view.tab);
    $("alx-tools").style.display = "flex";
    $("alx-ptools").style.display = proj ? "flex" : "none";
    $("alx-stools").style.display = sets ? "flex" : "none";
    $("alx-ctools").style.display = crat ? "flex" : "none";
    $("alx-mtools").style.display = mot ? "flex" : "none";
    // On the Sets tab every row is a set, so the kind chips have nothing to say.
    // On Motions the same row carries the groups instead — Move, Fight, Rest.
    $("alx-kinds").style.display = sets ? "none" : "flex";
    // Crates have their own box for a code, so the shelf's footer stands down.
    $("alx-ftr").style.display = sets || crat || mot ? "none" : "flex";
    paintNote();
    if (proj) renderProject();
    else if (sets) renderSets();
    else if (crat) renderCrates();
    else if (mot) renderMotions();
    else renderShelf();
  }

  // The Project tab is the same shelf, filtered to what this game is actually
  // wearing — every card the shelf shows, plus the assets in the game that were
  // never shelved. An unshelved one gets a real card too, synthesized from its
  // path; touching it (tags, a photograph, a rename) shelves it first.
  function projectAssets() {
    const byPath = {};
    for (const a of assets) byPath[a.path] = a;
    const seen = {};
    const out = [];
    for (const r of project.rows) {
      if (seen[r.path]) continue;
      seen[r.path] = true;
      const shelf = byPath[r.path];
      const a = shelf ? Object.assign({}, shelf) : S.makeAsset(Object.assign({ autoTag: true }, r));
      a.__synced = !!shelf;
      a.__where = r.where || [];
      a.__uses = r.uses || 0;
      if (!a.thumb) {
        const twin = assets.find((x) => x.thumb && S.basePath(x.path) === S.basePath(a.path));
        if (twin) a.thumb = twin.thumb;
      }
      out.push(a);
    }
    return out;
  }

  function renderProject() {
    const list = projectAssets();
    projectList = list;
    const unsynced = list.filter((a) => !a.__synced).length;
    $("alx-ct").textContent = list.length ? list.length + " in this game" : "";
    $("alx-pcount").textContent = list.length
      ? unsynced
        ? unsynced + (unsynced === 1 ? " isn't on the shelf" : " aren't on the shelf")
        : "every asset in this game is shelved"
      : project.asked
        ? "looking…"
        : "nothing scanned yet — hit ↻ rescan, then close and reopen this tab";
    renderTools(list);
    const rows = S.search(list, view.q, view.kind, view.tags);
    listEl.style.maxHeight = LIST_H;
    listEl.innerHTML = rows.length
      ? rows.map(card).join("")
      : `<div class="alx-empty">${
          list.length ? "nothing here matches — loosen the search" : project.asked ? "reading this game…" : "nothing found in this game yet"
        }</div>`;
    wireThumbs();
  }

  // Filters, tag chips and the photograph-the-blanks button, derived from
  // whichever list the open tab is showing.
  function renderTools(list) {
    const kc = S.kindCounts(list);

    if (view.tab === "motions") {
      // Same chip row, different question: on the Motions shelf the filters are
      // the groups the registry reads under — Move, Fight, Rest & work, Social.
      const gc = { all: list.length };
      const seen = [];
      for (const a of list) {
        if (gc[a.group] === undefined) {
          gc[a.group] = 0;
          seen.push(a);
        }
        gc[a.group]++;
      }
      $("alx-kinds").innerHTML = [`<div class="alx-kind ${view.mgroup === "all" ? "on" : ""}" data-mgroup="all">✦ All <span style="opacity:.5">${list.length}</span></div>`]
        .concat(
          seen.map(
            (a) =>
              `<div class="alx-kind ${view.mgroup === a.group ? "on" : ""}" data-mgroup="${esc(a.group)}">${esc(a.icon || "🎞️")} ${esc(
                a.groupLabel || a.group
              )} <span style="opacity:.5">${gc[a.group]}</span></div>`
          )
        )
        .join("");
    } else {
      $("alx-kinds").innerHTML = [{ k: "all", label: "All", icon: "✦" }]
        // Sets and motions are their own tabs, so they never crowd this row.
        .concat(S.KINDS.filter((k) => k !== "set" && k !== "motion").map((k) => ({ k, label: S.KIND_META[k].label, icon: S.KIND_META[k].icon })))
        .map(
          (r) =>
            `<div class="alx-kind ${view.kind === r.k ? "on" : ""}" data-kind="${r.k}">${r.icon} ${esc(r.label)} <span style="opacity:.5">${kc[r.k] || 0}</span></div>`
        )
        .join("");
    }

    // Tags are searched, not listed. What shows: the ones currently filtering
    // (so they can be switched off) plus whatever the tag box is finding.
    const found = S.searchTags(list, view.tagq, view.tags);
    const chip = (t) =>
      `<div class="alx-tag ${view.tags.includes(t.tag) ? "on" : ""}" data-tag="${esc(t.tag)}">${esc(t.tag)} <span style="opacity:.45">${t.count}</span></div>`;
    const chips = found.active.map(chip).concat(found.hits.slice(0, 14).map(chip));
    $("alx-tagct").textContent = found.total ? found.total + " tags" : "";
    $("alx-tags").innerHTML = chips.length
      ? chips.join("") +
        (found.hits.length > 14 ? `<span class="alx-mini" style="align-self:center">+${found.hits.length - 14} more</span>` : "")
      : found.total
        ? `<span class="alx-mini">${view.tagq ? "no tag matches “" + esc(view.tagq) + "”" : "type above to filter by tag"}</span>`
        : `<span class="alx-mini">no tags yet — drop something in, it labels itself</span>`;

    const blanks = unshot(list).length;
    const sb = $("alx-shootall");
    sb.style.display = blanks ? "block" : "none";
    sb.textContent = "📷 photograph " + (blanks === 1 ? "the blank one" : "the " + blanks + " blanks");
  }

  // Sets get their own shelf: same cards, same search, but every row is a whole
  // scene waiting to be set back down.
  function renderSets() {
    const list = assets.filter((a) => a.kind === "set");
    $("alx-ct").textContent = list.length === 1 ? "1 set" : list.length + " sets";
    renderTools(list);
    const rows = S.search(list, view.q, "all", view.tags);
    listEl.style.maxHeight = LIST_H;
    listEl.innerHTML = rows.length
      ? rows.map(card).join("")
      : list.length
        ? `<div class="alx-empty">no set matches that</div>`
        : `<div class="alx-empty">no sets yet — select a scene in the world, name it above, and save it</div>`;
    wireThumbs();
  }

  // Motions get their own shelf: the registry's cards, gathered under the group
  // they read as, searched by the same box, dragged into the world the same way.
  function renderMotions() {
    const list = motionRows();
    $("alx-ct").textContent = list.length ? list.length + " motions" : "";
    renderTools(list);
    const rows = S.search(list, view.q, "all", view.tags).filter((a) => view.mgroup === "all" || a.group === view.mgroup);
    listEl.style.maxHeight = LIST_H;
    if (!list.length) {
      listEl.innerHTML = `<div class="alx-empty">no motion library in this game — lib/motions.js isn't here</div>`;
      return;
    }
    if (!rows.length) {
      listEl.innerHTML = `<div class="alx-empty">no motion matches that — loosen the search</div>`;
      return;
    }
    const order = [];
    const bucket = {};
    for (const a of rows) {
      if (!bucket[a.group]) {
        bucket[a.group] = [];
        order.push(a.group);
      }
      bucket[a.group].push(a);
    }
    listEl.innerHTML = order
      .map((g) => {
        const head = bucket[g][0];
        return (
          `<div class="alx-mhd">${esc(head.icon || "🎞️")} ${esc(head.groupLabel || g)} <span style="opacity:.45">${bucket[g].length}</span></div>` +
          bucket[g].map(card).join("")
        );
      })
      .join("");
    wireThumbs();
  }

  // Motions get their own shelf: the registry's cards, gathered under the group
  // they read as, searched by the same box, dragged into the world the same way.
  function renderMotions() {
    const list = motionRows();
    $("alx-ct").textContent = list.length ? list.length + " motions" : "";
    renderTools(list);
    const rows = S.search(list, view.q, "all", view.tags).filter((a) => view.mgroup === "all" || a.group === view.mgroup);
    listEl.style.maxHeight = LIST_H;
    if (!list.length) {
      listEl.innerHTML = `<div class="alx-empty">no motion library in this game — lib/motions.js isn't here</div>`;
      return;
    }
    if (!rows.length) {
      listEl.innerHTML = `<div class="alx-empty">no motion matches that — loosen the search</div>`;
      return;
    }
    const order = [];
    const bucket = {};
    for (const a of rows) {
      if (!bucket[a.group]) {
        bucket[a.group] = [];
        order.push(a.group);
      }
      bucket[a.group].push(a);
    }
    listEl.innerHTML = order
      .map((g) => {
        const head = bucket[g][0];
        return (
          `<div class="alx-mhd">${esc(head.icon || "🎞️")} ${esc(head.groupLabel || g)} <span style="opacity:.45">${bucket[g].length}</span></div>` +
          bucket[g].map(card).join("")
        );
      })
      .join("");
    wireThumbs();
  }

  function renderShelf() {
    const shelfRows = plainRows();
    $("alx-ct").textContent = shelfRows.length + " shelved";
    renderTools(shelfRows);
    const rows = S.search(shelfRows, view.q, view.kind, view.tags);
    listEl.style.maxHeight = LIST_H;
    listEl.innerHTML = rows.length
      ? rows.map(card).join("")
      : `<div class="alx-empty">nothing on this shelf${assets.length ? " — loosen the search" : " yet"}</div>`;
    wireThumbs();
  }

  // ---- the Crates tab ----------------------------------------------------
  // A crate is a way of LOOKING at the shelf: a name, who packed it, and the
  // paths that belong to it. The assets themselves never move — throwing a crate
  // away never takes one with it. The share code IS the crate: every row in it
  // written out in letters, so it can ride a chat message to somebody on another
  // account and land on their shelf.

  function crateAssets(c) {
    const out = [];
    for (const p of (c && c.paths) || []) {
      const a = assets.find((x) => x.path === p);
      if (a) out.push(a);
    }
    return out;
  }

  // A short list opens itself; a long one waits to be asked. Either way what he
  // clicks last wins.
  function crateOpen(id) {
    if (Object.prototype.hasOwnProperty.call(view.crateOpen, id)) return !!view.crateOpen[id];
    return crates.length <= 3;
  }

  // No clock in this realm — a crate's stamp is just one past the last one.
  function nextCrateAdded() {
    let top = 0;
    for (const c of crates) top = Math.max(top, Number(c.added) || 0);
    return top + 1;
  }

  // What ＋ new crate would pack right now: exactly the rows the Shelf tab is
  // showing under the search and the filters above.
  function packable() {
    return S.search(plainRows(), view.q, view.kind, view.tags);
  }

  function crateCard(c) {
    const rows = crateAssets(c);
    const gone = ((c.paths || []).length - rows.length) || 0;
    const open = crateOpen(c.id);
    const bits = [rows.length === 1 ? "1 asset" : rows.length + " assets"];
    if (gone > 0) bits.push(gone === 1 ? "1 no longer on the shelf" : gone + " no longer on the shelf");
    if (c.by) bits.push("packed by " + c.by);
    const showCode = view.code === c.id;
    const code = showCode ? S.writeCrate({ name: c.name, by: c.by || me, note: c.note || "", assets: rows }) : "";
    const editing = view.editNote === c.id;
    const noteBox = editing
      ? `<div class="alx-pad" style="padding-top:0">
          <textarea class="alx-in alx-ta" data-note="${esc(c.id)}" rows="3" maxlength="240" spellcheck="false"
            style="font:11px/1.4 inherit" placeholder="what's in it, what it's for, who it's from">${esc(c.note || "")}</textarea>
          <div class="alx-row" style="margin-top:5px;gap:5px">
            <div class="alx-b go" data-crateact="notesave" data-crate="${esc(c.id)}">save</div>
            <div class="alx-b" data-crateact="notecancel" data-crate="${esc(c.id)}">cancel</div>
            <span class="alx-mini" style="flex:1 1 auto;opacity:.45">it rides along inside the share code</span>
          </div>
        </div>`
      : c.note
        ? `<div class="alx-pad alx-cnote-l" data-crateact="note" data-crate="${esc(c.id)}" title="click to rewrite it"
             style="padding-top:0;font-size:11px;opacity:.62;cursor:text">${esc(c.note)}</div>`
        : "";
    const codeBox = showCode
      ? `<div class="alx-pad" style="padding-top:0">
          <textarea class="alx-in alx-ta" data-code="${esc(c.id)}" rows="4" readonly spellcheck="false">${esc(code)}</textarea>
          <div class="alx-mini" style="margin-top:4px">copy all of it and paste it to whoever you're sharing with — they paste it into their own library</div>
        </div>`
      : "";
    const body = open
      ? `<div class="alx-cbody">${
          rows.length ? rows.map(card).join("") : `<div class="alx-empty">nothing from this crate is on the shelf anymore</div>`
        }</div>`
      : "";
    return `<div class="alx-crate">
      <div class="alx-chd" data-crateopen="${esc(c.id)}" title="${open ? "hide what's in it" : "see what's in it"}">
        <span class="alx-cx">${open ? "▾" : "▸"}</span>
        <span class="alx-ico">🧰</span>
        <div class="alx-meta">
          <div class="alx-cnm">${esc(c.name)}</div>
          <div class="alx-csub">${esc(bits.join(" · "))}</div>
        </div>
        <div class="alx-b" data-crateact="note" data-crate="${esc(c.id)}" title="${c.note ? "rewrite what this crate says about itself" : "say what's in it — it travels with the code"}">✎</div>
        <div class="alx-b" data-crateact="code" data-crate="${esc(c.id)}" title="the whole crate as one code — hand it to someone on another account">📋 code</div>
        <div class="alx-b bad" data-crateact="drop" data-crate="${esc(c.id)}" title="takes this crate off the list — every asset in it stays on the shelf">✕</div>
      </div>
      ${noteBox}
      ${codeBox}
      ${body}
    </div>`;
  }

  function renderCrates() {
    const shelfRows = plainRows();
    $("alx-ct").textContent = crates.length === 1 ? "1 crate" : crates.length + " crates";
    renderTools(shelfRows);
    const ready = packable().length;
    $("alx-cnote").textContent = ready
      ? "＋ packs the " + ready + " the search above is showing"
      : "nothing up there matches — loosen the search to pack";
    listEl.style.maxHeight = LIST_H;
    listEl.innerHTML = crates.length
      ? crates.map(crateCard).join("")
      : `<div class="alx-empty">no crates yet — filter the shelf to what you want to send, then ＋ new crate<div style="margin-top:6px;font-size:10px;opacity:.7">or paste a share code above to unpack someone else's</div></div>`;
    wireThumbs();
  }

  // The crate list is the panel's own bookkeeping, so it goes over alone. The
  // shelf only rides along when an unpack actually changed it.
  function saveCrates(dm) {
    try {
      send("alCrateSave", { crates: crates.slice(), dm: dm || "" });
    } catch (e) {
      /* the list still shows it; the next crate edit writes them all again */
    }
  }

  function saveCratesAndShelf(dm) {
    try {
      send("alCrateSave", { assets: assets, crates: crates.slice(), dropSets: droppedSets.slice(), dm: dm || "" });
    } catch (e) {
      /* the shelf still shows the change; the write retries on the next edit */
    }
  }

  function packCrate() {
    const box = $("alx-cnamein");
    const name = (box.value || "").trim();
    const rows = packable();
    if (!rows.length) {
      flash("nothing up there matches — loosen the search, then pack");
      return;
    }
    if (!name) {
      flash("name it first — then ＋ new crate packs the " + rows.length + " showing");
      box.focus();
      return;
    }
    const descBox = $("alx-cdescin");
    const desc = descBox ? String(descBox.value || "").trim().slice(0, 240) : "";
    const c = S.makeCrate({ name: name.slice(0, 64), by: me, note: desc, paths: rows.map((r) => r.path), added: nextCrateAdded() });
    crates = [c].concat(crates);
    view.crateOpen[c.id] = true;
    box.value = "";
    if (descBox) descBox.value = "";
    saveCrates();
    flash("packed “" + c.name + "” — " + c.paths.length + " assets. hit 📋 code to hand it to someone");
    render();
  }

  function unpackCode() {
    const box = $("alx-code");
    const text = (box.value || "").trim();
    if (!text) {
      flash("paste the code someone sent you into the box first — it starts with " + S.CODE_TAG);
      box.focus();
      return;
    }
    const read = S.readCrate(text);
    if (!read.ok) {
      flash(read.error);
      return;
    }
    const have = {};
    for (const a of assets) have[a.path] = true;
    const paths = [];
    const fresh = [];
    for (const row of read.assets) {
      const p = String((row && row.path) || "");
      if (!p) continue;
      if (paths.indexOf(p) < 0) paths.push(p);
      // A path that's already here keeps the row that's already here — his tags,
      // his photograph, the name he gave it. A crate never overwrites his work.
      if (have[p]) continue;
      have[p] = true;
      fresh.push(S.makeAsset(Object.assign({}, row, { added: assets.length + fresh.length + 1 })));
    }
    if (!paths.length) {
      flash("that crate came through empty");
      return;
    }
    if (fresh.length) assets = fresh.reverse().concat(assets);
    const c = S.makeCrate({ name: read.name, by: read.by, note: read.note || "", paths, added: nextCrateAdded() });
    crates = [c].concat(crates);
    view.crateOpen[c.id] = true;
    box.value = "";
    saveCratesAndShelf(
      "unpacked the crate “" +
        c.name +
        "” — " +
        paths.length +
        " assets on the shelf, " +
        (fresh.length ? fresh.length + " of them new" : "none of them new")
    );
    flash(
      "unpacked “" +
        c.name +
        "” — " +
        paths.length +
        " assets" +
        (fresh.length ? ", " + fresh.length + " new on the shelf" : ", every one already yours")
    );
    render();
  }

  function onCrateAct(act, id) {
    const c = crates.find((x) => x.id === id);
    if (!c) return;
    if (act === "code") {
      const show = view.code !== c.id;
      view.code = show ? c.id : "";
      render();
      if (!show) return;
      // The clipboard is usually walled off in here, so the box itself is the
      // road out: selected and waiting for a plain ctrl+c.
      const ta = container.querySelector('[data-code="' + c.id + '"]');
      if (!ta) return;
      ta.focus();
      ta.select();
      try {
        if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) win.navigator.clipboard.writeText(ta.value);
      } catch (e) {
        /* the code is selected in the box — that always works */
      }
      return;
    }
    if (act === "note") {
      view.editNote = view.editNote === c.id ? "" : c.id;
      view.code = "";
      render();
      if (view.editNote !== c.id) return;
      const ta = container.querySelector('[data-note="' + c.id + '"]');
      if (ta) {
        ta.focus();
        const end = ta.value.length;
        try { ta.setSelectionRange(end, end); } catch (e) { /* focus is enough */ }
      }
      return;
    }
    if (act === "notecancel") {
      view.editNote = "";
      render();
      return;
    }
    if (act === "notesave") {
      const ta = container.querySelector('[data-note="' + c.id + '"]');
      const text = ta ? String(ta.value || "").trim().slice(0, 240) : "";
      c.note = text;
      view.editNote = "";
      saveCrates();
      flash(text ? "“" + c.name + "” says what it is now — the line travels with the code" : "cleared the line on “" + c.name + "”");
      render();
      return;
    }
    if (act === "drop") {
      crates = crates.filter((x) => x.id !== c.id);
      if (view.code === c.id) view.code = "";
      saveCrates();
      flash("put the crate “" + c.name + "” away — every asset in it is still on the shelf");
      render();
    }
  }

  // A conjured preview is invisible while it cooks, so a card that comes back
  // empty keeps knocking instead of settling for the icon.
  function wireThumbs() {
    const imgs = listEl.querySelectorAll("img[data-fallback]");
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const tile = img.parentNode;
      let tries = 0;
      img.addEventListener("load", () => {
        img.classList.remove("off");
        tile.classList.add("has");
      });
      img.addEventListener("error", () => {
        img.classList.add("off");
        tile.classList.remove("has");
        if (tries++ > 7) return;
        const src = img.getAttribute("src");
        win.setTimeout(() => {
          if (img.parentNode) img.setAttribute("src", src.split("#")[0] + "#" + tries);
        }, 15000);
      });
      if (img.complete && img.naturalWidth > 0) tile.classList.add("has");
    }
  }

  function card(a) {
    const meta = metaOf(a.kind);
    const isOpen = view.open === a.id;
    const tagRow = (a.tags || [])
      .map((t) => `<span class="alx-tag" data-cardtag="${esc(t)}" data-id="${a.id}" title="click to drop this tag">${esc(t)} ✕</span>`)
      .join("");
    const clipRow = (a.clips || []).length ? `<span class="alx-tag" style="opacity:.55">${esc(a.clips.join(" · "))}</span>` : "";
    const isSet = a.kind === "set";
    const span = isSet && a.span ? a.span : null;
    // A set that was captured mid-thought says so on its face: these pieces
    // stand back up still wandering, still guarding, still about somebody.
    const brains = isSet ? BK.brainsIn(a.members) : [];
    const pieceLine = isSet
      ? `${a.count || (a.members || []).length} pieces${a.ref && !(a.members || []).length ? " (by reference)" : ""}${
          span ? ` · ${Math.round(span.w)}×${Math.round(span.h)}×${Math.round(span.d)}m` : ""
        }${brains.length ? ` · 🧠 ${brains.map((b) => BK.prettyBrain(b)).join(", ")}` : ""}`
      : "";
    // A motion has no ground to land on — what it needs is a body, so its card
    // reads as what a click does: give it to whatever is selected. (Dragging it
    // onto a body in the world is the other road, and the one it was built for.)
    const motionLine =
      a.kind === "motion"
        ? `${esc(a.groupLabel || a.group)} · ${(Math.round(a.seconds * 10) / 10).toFixed(1)}s cycle · ${a.loop === "once" ? "held pose" : "loops"}`
        : "";
    const placeLabel = isSet
      ? "place set"
      : a.kind === "motion"
      ? "give to selection"
      : a.kind === "sound"
      ? "place emitter"
      : a.kind === "image"
      ? "place panel"
      : a.kind === "effect"
      ? "light it up"
      : "place";
    const extra = isSet || a.kind === "motion"
      ? ""
      : a.kind === "effect"
        ? ""
        : a.kind === "sound"
        ? `<div class="alx-b" data-act="preview" data-id="${a.id}">▶ hear it</div>`
        : a.kind === "animation"
        ? `<div class="alx-b" data-act="clips" data-id="${a.id}">give clips to selection</div>`
        : a.kind === "image"
        ? `<div class="alx-b" data-act="paint" data-id="${a.id}" title="writes this texture onto whatever you have selected — and onto its pieces, since almost everything here is an assembly">🖌 paint</div>`
        : `<div class="alx-b" data-act="swap" data-id="${a.id}">swap selection</div>`;
    // Sounds have no body to photograph; an image already IS its own picture;
    // an effect is motion, and a still of it would lie.
    // A GEOMETRY effect (a scripted primitive — a HYLLA table) has a body and
    // photographs fine; rows land with thumb "" and wait for the 📷 click.
    const shootable = a.kind !== "sound" && a.kind !== "image" && (a.kind !== "effect" || geometryRow(a));
    const preview = S.previewPath(a) || (isSet ? a.thumb || "" : sharedShot(a));
    const snapAct = isSet ? "snapset" : "snap";
    const snap = shootable
      ? isSet
        ? `<div class="alx-b" data-act="snapset" data-id="${a.id}" title="uses your view right now as this set's picture — line the scene up first">📷 ${
            preview ? "new picture" : "use this view"
          }</div>`
        : `<div class="alx-b" data-act="snap" data-id="${a.id}" title="stands it in front of your camera and photographs it — that shot becomes the card">📷 ${
            preview ? "new picture" : "photograph it"
          }</div>`
      : "";
    // The retake lives ON the tile, always visible — a picture you can see is a
    // picture you should be able to redo without hunting for a button.
    const badge = shootable
      ? `<span class="alx-snap" data-act="${snapAct}" data-id="${a.id}" title="${preview ? "take a new picture of this one" : "no picture yet — take one"}">📷</span>`
      : "";
    // Sets and effects are arrangements, not files — there's nothing to hand a
    // download of. Everything else is a real file sitting on the CDN, so the
    // button is just a link to it: the browser saves it or opens it, and the
    // dev has the .glb / .png / .mp3 in their own hands.
    const fileName = String(a.path || "").split("?")[0].split("/").pop() || "asset";
    const dl =
      a.kind === "set" || a.kind === "effect" || !a.path
        ? ""
        : `<div class="alx-b" data-act="dl" data-id="${a.id}" title="save ${esc(fileName)} to your computer">⤓ download</div>`;
    const busy = inFlight[a.id] ? " busy" : "";
    const thumb = preview
      ? `<div class="alx-thumb${busy}" data-thumb="${a.id}"><span class="fb">${meta.icon}</span><img class="${a.kind === "image" ? "" : "fit"}" src="${esc(preview)}" alt="" data-fallback="1" />${badge}</div>`
      : `<div class="alx-thumb needs${busy}" title="no photograph of this one yet — hit 📷"><span class="fb">${meta.icon}</span>${badge}</div>`;
    const inProject = a.__where !== undefined;
    const where = inProject ? (a.__where || []).join(" · ") : "";
    const extraUses = inProject && a.__uses > (a.__where || []).length ? " +" + (a.__uses - (a.__where || []).length) : "";
    const syncPill = inProject
      ? `<div class="alx-sync ${a.__synced ? "on" : ""}" data-sync="${esc(a.path)}" title="${
          a.__synced ? "on the shelf — click to unsync" : "click to sync onto the shelf"
        }">${a.__synced ? "✓ synced" : "＋ sync"}</div>`
      : "";
    return `<div class="alx-card ${isOpen ? "open" : ""}" data-id="${a.id}" data-drag="1">
      <div class="alx-c1">
        ${thumb}
        <div class="alx-meta">
          <div class="alx-nm">${esc(a.name)}</div>
          <div class="alx-pth" title="${esc(a.path)}">${esc(isSet ? pieceLine : a.kind === "motion" ? motionLine : a.path)}</div>
          ${a.kind === "motion" && !preview ? `<div class="alx-mline">no picture yet — hit 📷 to stand a body up in it</div>` : ""}
          ${where ? `<div class="alx-where">used by ${esc(where)}${extraUses}</div>` : ""}
          <div class="alx-ctag">${tagRow}${clipRow}<span class="alx-tag" data-act="addtag" data-id="${a.id}" style="opacity:.5">+ tag</span></div>
          ${isOpen ? `<div style="margin:6px 0 0 0"><input class="alx-in" data-tagin="${a.id}" placeholder="tags, comma separated — enter to keep" autocomplete="off" /></div>` : ""}
          <div class="alx-acts">
            <div class="alx-b go" data-act="place" data-id="${a.id}">${placeLabel}</div>
            ${extra}
            ${snap}
            ${dl}
            <div class="alx-b" data-act="share" data-id="${a.id}" title="hands Savi this exact card — name, path, tags, clips — so you can just say “make this one bigger”">💬 tell savi</div>
            <div class="alx-b" data-act="copy" data-id="${a.id}">copy path</div>
            <div class="alx-b" data-act="rename" data-id="${a.id}">rename</div>
            ${inProject ? "" : `<div class="alx-b bad" data-act="drop" data-id="${a.id}">✕</div>`}
          </div>
        </div>
        ${syncPill}
      </div>
    </div>`;
  }

  function byId(id) {
    if (String(id || "").indexOf("motion-") === 0) {
      const key = String(id).slice(7);
      const card = motionCards().find((c) => c.key === key);
      if (card) return S.motionAsset(card, motionShots[key] || "");
    }
    return assets.find((a) => a.id === id) || projectList.find((a) => a.id === id);
  }

  // A card in the Project tab may not be on the shelf yet. Anything that edits
  // an asset — tags, a rename, a photograph it needs to keep — shelves it first,
  // and hands back the real shelf row so the write lands somewhere durable.
  function ensureShelved(a) {
    if (!a) return null;
    const own = assets.find((x) => x.id === a.id || x.path === a.path);
    if (own) return own;
    const made = shelve({ path: a.path, name: a.name, kind: a.kind, tags: a.tags, clips: a.clips }, true);
    return made || assets.find((x) => x.path === a.path) || a;
  }

  // One body, one portrait: the bare glb and its ?animations= twin are the same
  // asset in this project, so they wear the same photograph.
  function sharedShot(a) {
    const base = S.basePath(a.path);
    const twin = assets.find((x) => x.thumb && S.basePath(x.path) === base);
    return twin ? twin.thumb : "";
  }

  // An effect row with a body of its own — a scripted primitive, not an fx
  // program. Those photograph; fx programs are motion and a still would lie.
  function geometryRow(a) {
    return !!(a && a.kind === "effect" && a.props && a.props.primitive);
  }

  function unshot(list) {
    return (list || assets).filter(
      (a) =>
        a.kind !== "sound" && a.kind !== "image" && a.kind !== "set" && (a.kind !== "effect" || geometryRow(a)) && !a.thumb && !sharedShot(a)
    );
  }

  // Photographs of geometry rows are filed in one batch through alThumb — the
  // catalog write (alSave) never carries effect rows, so a per-shot commit
  // would lose every one of them.
  let thumbBatch = [];

  function shelve(input, quiet) {
    // Everything that lands on the shelf reads its own name on the way in.
    const a = S.makeAsset(Object.assign({ added: assets.length + 1, autoTag: true }, input));
    if (!a.path) return null;
    const dupe = assets.find((x) => x.path === a.path);
    if (dupe) {
      if (!quiet) flash(a.name + " is already on the shelf");
      return dupe;
    }
    assets = [a].concat(assets);
    commit();
    return a;
  }

  // ---- the Project tab ---------------------------------------------------
  // god.js does the reading (the mount realm can't see the world), so the tab
  // asks, then listens. The answer arrives as a game event, or — if the event
  // lane is quiet — as lib/project.js on the next mount.

  function askScan() {
    project.asked = true;
    send("alScan", { at: 1 });
  }

  function setTab(tab) {
    view.tab = tab;
    view.note = "";
    if (tab === "project") askScan();
    render();
  }

  function toggleSync(path) {
    const row = project.rows.find((r) => r.path === path);
    if (!row) return;
    const have = assets.find((a) => a.path === path);
    if (have) {
      assets = assets.filter((a) => a.path !== path);
      commit();
      flash("unsynced " + row.name);
    } else {
      shelve({ path: row.path, name: row.name, kind: row.kind, clips: row.clips, tags: ["project"] }, true);
      flash("synced " + row.name);
    }
    render();
  }

  function syncAll() {
    const have = {};
    for (const a of assets) have[a.path] = true;
    const fresh = [];
    for (const r of project.rows) {
      if (!r.path || have[r.path]) continue;
      have[r.path] = true;
      fresh.push(
        S.makeAsset({
          path: r.path,
          name: r.name,
          kind: r.kind,
          clips: r.clips,
          tags: ["project"],
          autoTag: true,
          added: assets.length + fresh.length + 1,
        })
      );
    }
    if (!fresh.length) {
      flash("already all shelved");
      render();
      return;
    }
    assets = fresh.reverse().concat(assets);
    commit();
    flash("synced " + fresh.length + " onto the shelf");
    render();
  }

  function onProjectRows(payload) {
    if (!payload || !Array.isArray(payload.rows)) return;
    project.rows = payload.rows;
    project.asked = false;
    if (view.tab === "project") render();
  }

  try {
    if (win.spawn && win.spawn.on) {
      win.spawn.on("event", (name, payload) => {
        if (name === "alMotion") onMotionResult(payload);
        if (name === "alProject") onProjectRows(payload);
        if (name === "alStaged" && pending) {
          const p = payload || {};
          if (p.asset === pending.id) pending.shutter(!!p.ready);
        }
      });
    }
  } catch (e) {
    /* no event lane in this realm — the mount hydrate still shows the last scan */
  }
  // What the world half saw of a motion drop — the same lane the Project scan
  // and the stage's ready signal already ride.
  function onMotionResult(p) {
    const r = p || {};
    if (r.tab) {
      setTab(String(r.tab));
      return;
    }
    flash(String(r.say || ""));
  }

  const onGameEvent = (ev) => {
    const d = ev && ev.detail;
    if (!d) return;
    if (d.name === "alMotion") onMotionResult(d.payload);
    if (d.name === "alProject") onProjectRows(d.payload);
    if (d.name === "alStaged" && pending) {
      const p = d.payload || {};
      if (p.asset === pending.id) pending.shutter(!!p.ready);
    }
  };
  doc.addEventListener("spawn:game-event", onGameEvent);
  container._alxGameEvent = onGameEvent;

  // ---- the shooter -------------------------------------------------------
  // A card's picture is a photograph of the asset itself. god.js stands the real
  // model in front of the camera against a plain backdrop, we photograph the
  // frame, crop the middle out of it (the panel lives off to the right) and that
  // square becomes the card. No painted stand-ins anywhere in this tool.

  let shooting = false;
  let pending = null;
  // Which cards are on the stage right now — the tile shows it.
  const inFlight = {};

  function centerSquare(blob, size) {
    return new win.Promise((resolve, reject) => {
      const url = win.URL.createObjectURL(blob);
      const img = new win.Image();
      img.onload = () => {
        const side = Math.max(32, Math.min(img.width, img.height) * 0.62);
        const cv = doc.createElement("canvas");
        cv.width = size;
        cv.height = size;
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        win.URL.revokeObjectURL(url);
        // A model that hasn't finished cooking is invisible, and the photograph
        // would be a picture of the empty backdrop. Flat pixels = nothing stood
        // there, so the card keeps its blank and says why.
        let spread = 999;
        try {
          const d = ctx.getImageData(0, 0, size, size).data;
          let sum = 0;
          let sum2 = 0;
          let n = 0;
          for (let i = 0; i < d.length; i += 64) {
            const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            sum += l;
            sum2 += l * l;
            n++;
          }
          const mean = sum / n;
          spread = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
        } catch (e) {
          /* tainted canvas — trust the frame */
        }
        if (spread < 5) {
          reject(new Error("empty stage"));
          return;
        }
        if (cv.toBlob) cv.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
        else reject(new Error("no toBlob"));
      };
      img.onerror = () => {
        win.URL.revokeObjectURL(url);
        reject(new Error("bad frame"));
      };
      img.src = url;
    });
  }

  // The stage takes a moment to stand up and a model can swap in late, so the
  // shutter doesn't fire once and hope: it takes a few frames spread over the
  // stage's life, throws away the flat ones (nothing standing there yet), and
  // keeps the last good square. If stage.js's ready signal makes it across the
  // realm boundary it just pulls the next try forward — the shot never depends
  // on it.
  const SHOT_TRIES = [1300, 1500, 1700, 1900];

  // A set has no single body to stand on the stage — it's a whole scene, and
  // the creator is already looking at it. So its picture is just the view out
  // the window, right now.
  function snapLive(a) {
    let chain;
    try {
      chain = win.spawn.view.captureFrame({ type: "image/png", maxSize: 900 });
    } catch (e) {
      chain = null;
    }
    if (!chain) {
      flash("couldn't reach the camera for that shot");
      return;
    }
    inFlight[a.id] = true;
    render();
    chain
      .then((blob) => centerSquare(blob, 384))
      .then((sq) => win.spawn.assets.uploadImage({ blob: sq, name: "thumb-" + a.id + "-" + (a.shots = (a.shots || 0) + 1) + ".png" }))
      .then((res) => {
        a.thumb = res.url;
        delete inFlight[a.id];
        commit();
        flash("that view is now " + a.name + "'s picture");
        render();
      })
      .catch(() => {
        delete inFlight[a.id];
        flash("that shot came back empty — line the scene up and try again");
        render();
      });
  }

  // `keep` is where the picture goes when it lands. Shelf cards file it on the
  // asset and commit the catalog; a motion has no catalog row, so it files its
  // shot in the motion-shots module instead.
  function shootOne(a, done, keep) {
    let step = 0;
    let best = null;
    let timer = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      pending = null;
      if (!best) {
        done(false);
        return;
      }
      win.spawn.assets
        .uploadImage({ blob: best, name: "thumb-" + a.id + "-" + (a.shots = (a.shots || 0) + 1) + ".png" })
        .then((res) => {
          if (keep) keep(res.url);
          else if (geometryRow(a)) {
            a.thumb = res.url;
            thumbBatch.push({ id: a.id, thumb: res.url });
          } else {
            a.thumb = res.url;
            commit();
          }
          render();
          done(true);
        })
        .catch(() => done(false));
    };

    const grab = () => {
      let chain;
      try {
        chain = win.spawn.view.captureFrame({ type: "image/png", maxSize: 900 });
      } catch (e) {
        chain = null;
      }
      if (!chain) {
        finish();
        return;
      }
      chain
        .then((blob) => centerSquare(blob, 384))
        .then((sq) => {
          best = sq;
          next();
        })
        .catch(() => next());
    };

    const next = () => {
      if (settled) return;
      if (step >= SHOT_TRIES.length) {
        finish();
        return;
      }
      const wait = SHOT_TRIES[step++];
      timer = win.setTimeout(grab, wait);
    };

    // A ready signal (if the lane carries it) just shortens the current wait.
    pending = {
      id: a.id,
      shutter: () => {
        if (settled || !timer) return;
        win.clearTimeout(timer);
        timer = null;
        win.setTimeout(grab, 120);
      },
    };

    send("alShoot", { asset: a });
    next();
  }

  function shoot(list) {
    if (shooting) return;
    const queue = list.filter((a) => a && a.path && a.kind !== "sound" && a.kind !== "image" && (a.kind !== "effect" || geometryRow(a)));
    if (!queue.length) {
      flash("nothing here needs a photograph — images already show themselves");
      return;
    }
    shooting = true;
    let hit = 0;
    // Geometry rows' pictures go to the shelf in ONE batch when the ladder empties.
    const fileBatch = () => {
      if (!thumbBatch.length) return;
      const thumbs = thumbBatch.slice();
      thumbBatch = [];
      send("alThumb", { thumbs });
    };
    const step = (i) => {
      if (!container.isConnected) {
        shooting = false;
        fileBatch();
        send("alUnshoot", { at: 1 });
        return;
      }
      if (i >= queue.length) {
        shooting = false;
        fileBatch();
        send("alUnshoot", { at: 1 });
        flash(
          queue.length === 1
            ? hit
              ? "new picture of " + queue[0].name + " — that's the real thing"
              : queue[0].name + " didn't stand up — still cooking, try again in a bit"
            : hit === queue.length
            ? "photographed all " + hit + " — those are the real things"
            : hit
              ? "photographed " + hit + " of " + queue.length + " — the rest are still cooking, hit 📷 again in a bit"
              : "nothing stood up to photograph yet — those models are still cooking"
        );
        render();
        return;
      }
      const one = queue.length === 1;
      view.note = one
        ? "standing " + queue[i].name + " up for a new picture…"
        : "photographing " + queue[i].name + " (" + (i + 1) + "/" + queue.length + ")…";
      inFlight[queue[i].id] = true;
      render();
      shootOne(queue[i], (ok) => {
        delete inFlight[queue[i].id];
        if (ok) hit++;
        win.setTimeout(() => step(i + 1), 250);
      });
    };
    step(0);
  }

  // A motion's picture is a body IN it: god.js stands a rigged character on the
  // stage wearing the motion, and the same shutter that photographs a model
  // photographs the pose. Nothing painted, nothing stood in for.
  function shootMotions(list) {
    if (shooting) return;
    const body = motionBody();
    if (!body) {
      flash("no rigged body on the shelf to stand up — shelve a character first, then hit 📷");
      return;
    }
    const queue = (list || []).filter((a) => a && a.key);
    if (!queue.length) {
      flash("every motion here already has its picture");
      return;
    }
    shooting = true;
    let hit = 0;
    const step = (i) => {
      if (!container.isConnected) {
        shooting = false;
        send("alUnshoot", { at: 1 });
        return;
      }
      if (i >= queue.length) {
        shooting = false;
        send("alUnshoot", { at: 1 });
        if (hit) send("alMotionShot", { shots: motionShots });
        flash(
          hit === queue.length
            ? queue.length === 1
              ? "that's " + queue[0].name + " on a real body"
              : "photographed all " + hit + " — real poses, real body"
            : hit
              ? "photographed " + hit + " of " + queue.length + " — the rest didn't stand up, hit 📷 again in a bit"
              : "nothing stood up to photograph — that body may still be cooking"
        );
        render();
        return;
      }
      const a = queue[i];
      view.note = "standing a body up in " + a.name + (queue.length > 1 ? " (" + (i + 1) + "/" + queue.length + ")" : "") + "…";
      inFlight[a.id] = true;
      render();
      shootOne(
        // The stage carries the body AND the motion: god.js reads .motion off it.
        { id: a.id, name: a.name, path: body, kind: "motion", motion: a.key, loop: a.loop },
        (ok) => {
          delete inFlight[a.id];
          if (ok) hit++;
          win.setTimeout(() => step(i + 1), 250);
        },
        (url) => {
          motionShots[a.key] = url;
        }
      );
    };
    step(0);
  }

  // ---- interaction -------------------------------------------------------

  qEl.addEventListener("input", () => {
    view.q = qEl.value;
    render();
  });

  const tagqEl = $("alx-tagq");
  tagqEl.addEventListener("input", () => {
    view.tagq = tagqEl.value;
    render();
  });
  // Enter takes the first match — type "wood", hit enter, the shelf is wood.
  tagqEl.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const list =
      view.tab === "project" ? projectList : view.tab === "sets" ? assets.filter((a) => a.kind === "set") : assets;
    const hit = S.searchTags(list, view.tagq, view.tags).hits[0];
    if (hit) {
      view.tags = view.tags.concat([hit.tag]);
      view.tagq = "";
      tagqEl.value = "";
      render();
    }
  });

  $("alx-paste").addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const text = ev.target.value.trim();
    if (!text) return;
    ev.target.value = "";
    const landed = intake(text);
    if (landed === 1) flash("shelved " + assets[0].name);
    else if (landed > 1) flash("crate unpacked — " + landed + " onto the shelf");
    else flash("nothing new in that — already shelved, or not a path i can read");
    render();
  });

  // A crate is the whole shelf as text: paths, names, tags, clips. It travels
  // between games by clipboard, which is the only road across projects today.
  function crateText() {
    return JSON.stringify(
      { crate: "asset-library", assets: assets.map((a) => S.makeAsset(a)) },
      null,
      0
    );
  }

  // One intake door: a crate, a list of paths, or a single path. A whole crate
  // lands in one write — no fifty saves in a row.
  function intake(text) {
    let rows = null;
    if (/^[[{]/.test(text)) {
      try {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.assets) ? parsed.assets : null;
      } catch (e) {
        rows = null;
      }
    }
    if (!rows) {
      const paths = text
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter((p) => p.indexOf("/cdn/") >= 0 || /^https?:\/\//.test(p));
      if (paths.length > 1) rows = paths.map((p) => ({ path: p }));
    }
    if (!rows) return shelve({ path: text }) ? 1 : 0;

    const have = {};
    for (const a of assets) have[a.path] = true;
    const fresh = [];
    for (const row of rows) {
      if (!row || !row.path) continue;
      const a = S.makeAsset(Object.assign({ autoTag: true }, row, { added: assets.length + fresh.length + 1 }));
      if (!a.path || have[a.path]) continue;
      have[a.path] = true;
      fresh.push(a);
    }
    if (!fresh.length) return 0;
    assets = fresh.reverse().concat(assets);
    commit();
    return fresh.length;
  }

  $("alx-shootall").addEventListener("click", () => {
    if (view.tab === "motions") {
      shootMotions(motionRows().filter((a) => !a.thumb));
      return;
    }
    shoot(unshot());
  });

  // The materials rescan. The world half does the reading and the writing —
  // this side only asks, and says so while it waits.
  $("alx-matscan").addEventListener("click", () => {
    send("alMatScan", { at: 1 });
    flash("reading this game's surfaces…");
  });

  $("alx-moff").addEventListener("click", () => {
    send("alMotionClear", { at: 1 });
    flash("taking the motion off what you have selected…");
  });

  // Capturing a set is a world job: the panel can't see the selection, so it
  // just hands the name over and the world answers with a receipt.
  function saveSet() {
    const box = $("alx-setname");
    const name = (box.value || "").trim();
    if (!name) {
      flash("name it first, then hit save — whatever you have selected goes in");
      box.focus();
      return;
    }
    send("alSetSave", { name: name.slice(0, 64), tags: view.tags.slice(0, 4) });
    box.value = "";
    flash("saving “" + name + "” — close and reopen the tab and it'll be sitting here");
  }

  // One box in the world at a time, and the world owns that truth — the panel
  // just asks for the flip and tells you which way it went.
  // Each control means exactly one thing, so neither can ever read backwards:
  // "capture box" always leaves one box in front of you, "✕" always leaves none.
  $("alx-cbox").addEventListener("click", () => {
    send("alCaptureBox", { mode: "place" });
    flash("box is in front of you — stretch it over the scene, then hit “select inside” on it");
  });
  $("alx-cboxoff").addEventListener("click", () => {
    send("alCaptureBox", { mode: "away" });
    flash("box put away");
  });
  $("alx-clear").addEventListener("click", () => {
    send("alClear", {});
    flash("clearing everything the library put in the world — the shelf is untouched");
  });

  $("alx-setsave").addEventListener("click", saveSet);
  $("alx-setname").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveSet();
  });

  $("alx-unpack").addEventListener("click", unpackCode);
  $("alx-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") unpackCode();
  });
  $("alx-cnew").addEventListener("click", packCrate);
  $("alx-cnamein").addEventListener("keydown", (e) => {
    if (e.key === "Enter") packCrate();
  });
  $("alx-cdescin").addEventListener("keydown", (e) => {
    if (e.key === "Enter") packCrate();
  });

  $("alx-crate").addEventListener("click", () => {
    if (!assets.length) {
      flash("shelf's empty — nothing to crate up");
      return;
    }
    copyText(crateText());
    flash("crate copied — " + assets.length + " assets. paste it into another game's shelf");
  });

  $("alx-newbtn").addEventListener("click", () => {
    view.minting = !view.minting;
    $("alx-mint").classList.toggle("on", view.minting);
    if (view.minting) $("alx-mname").focus();
  });

  $("alx-mgo").addEventListener("click", () => {
    const name = $("alx-mname").value.trim();
    if (!name) {
      flash("name it first");
      return;
    }
    const kind = kindSel.value;
    const clips = $("alx-mclips")
      .value.split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const path = S.conjurePath({
      kind,
      family: famSel.value,
      name,
      clips,
      sprite: /sprite/i.test(name),
      music: /music|theme|song/i.test(name),
    });
    const a = shelve({
      path,
      name,
      kind,
      clips,
      tags: $("alx-mtags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    if (a) {
      send("alMint", { asset: a });
      flash("minting " + a.name + " — it cooks, then it's yours");
      $("alx-mname").value = "";
      $("alx-mclips").value = "";
      $("alx-mtags").value = "";
    }
    render();
  });

  listEl.addEventListener("keydown", (ev) => {
    const tagin = ev.target.getAttribute && ev.target.getAttribute("data-tagin");
    if (!tagin || ev.key !== "Enter") return;
    const a = ensureShelved(byId(tagin));
    if (a) {
      a.tags = S.normalizeTags((a.tags || []).concat(ev.target.value.split(",")));
      commit();
    }
    view.open = null;
    render();
  });

  $("alx-padd").addEventListener("click", () => {
    project.asked = true;
    send("alSyncSel", { at: 1 });
    flash("adding what you have selected…");
  });

  $("alx-rescan").addEventListener("click", () => {
    askScan();
    flash("re-reading this game…");
  });
  $("alx-syncall").addEventListener("click", syncAll);

  container.addEventListener("click", (ev) => {
    const t = ev.target;
    const tab = t.getAttribute && t.getAttribute("data-tab");
    if (tab) {
      setTab(tab);
      return;
    }
    const syncPath = t.getAttribute && t.getAttribute("data-sync");
    if (syncPath) {
      toggleSync(syncPath);
      return;
    }
    const mgroup = t.getAttribute && t.getAttribute("data-mgroup");
    if (mgroup) {
      view.mgroup = mgroup;
      render();
      return;
    }
    const kind = t.getAttribute && t.getAttribute("data-kind");
    if (kind) {
      view.kind = kind;
      render();
      return;
    }
    const tag = t.getAttribute && t.getAttribute("data-tag");
    if (tag) {
      view.tags = view.tags.includes(tag) ? view.tags.filter((x) => x !== tag) : view.tags.concat([tag]);
      render();
      return;
    }
    const cardTag = t.getAttribute && t.getAttribute("data-cardtag");
    if (cardTag) {
      const a = ensureShelved(byId(t.getAttribute("data-id")));
      if (a) {
        a.tags = (a.tags || []).filter((x) => x !== cardTag);
        commit();
      }
      render();
      return;
    }
    const crateAct = t.getAttribute && t.getAttribute("data-crateact");
    if (crateAct) {
      onCrateAct(crateAct, t.getAttribute("data-crate"));
      return;
    }
    const head = t.closest ? t.closest("[data-crateopen]") : null;
    if (head) {
      const cid = head.getAttribute("data-crateopen");
      view.crateOpen[cid] = !crateOpen(cid);
      render();
      return;
    }
    const act = t.getAttribute && t.getAttribute("data-act");
    if (!act) return;
    const a = byId(t.getAttribute("data-id"));
    if (!a) return;
    if (act === "addtag") {
      view.open = view.open === a.id ? null : a.id;
      render();
      const box = container.querySelector(`[data-tagin="${a.id}"]`);
      if (box) box.focus();
      return;
    }
    if (act === "drop") {
      assets = assets.filter((x) => x.id !== a.id);
      if (a.kind === "set" && droppedSets.indexOf(a.id) === -1) droppedSets.push(a.id);
      commit();
      flash("took " + a.name + " off the shelf");
      render();
      return;
    }
    if (act === "share") {
      // Two roads at once: the world half tells Savi in her own chat, and the
      // reference lands on the clipboard so it can be pasted into a sentence.
      send("alShare", { asset: a });
      copyText(a.kind === "set" ? a.id : a.path);
      flash("told savi about " + a.name);
      return;
    }
    if (act === "copy") {
      copyText(a.path);
      flash("path copied");
      return;
    }
    if (act === "dl") {
      grabFile(a);
      return;
    }
    if (act === "rename") {
      const next = win.prompt("Name it:", a.name);
      if (next && next.trim()) {
        const own = ensureShelved(a);
        own.name = next.trim().slice(0, 64);
        commit();
      }
      render();
      return;
    }
    if (act === "place") {
      if (a.kind === "motion") {
        send("alMotionApply", { key: a.key, loop: a.loop, label: a.name });
        flash("giving " + a.name + " to what you have selected…");
        return;
      }
      if (a.kind === "set") {
        send("alSetPlace", { id: a.id, asset: { id: a.id, name: a.name, kind: "set" }, aim: "front" });
        flash("setting down " + a.name + " — " + (a.members || []).length + " pieces");
        return;
      }
      send("alPlace", { asset: a, aim: "front" });
      flash("placed " + a.name);
      return;
    }
    if (act === "snapset") {
      snapLive(a);
      return;
    }
    if (act === "preview") {
      send("alPreview", { asset: a });
      return;
    }
    if (act === "snap" && a.kind === "motion") {
      shootMotions([a]);
      return;
    }
    if (act === "snap") {
      // A picture has to be kept somewhere, so photographing an unshelved
      // project asset puts it on the shelf on the way to the stage.
      shoot([ensureShelved(a)]);
      return;
    }
    if (act === "paint") {
      // A material card dresses what's selected — the click road to the same
      // thing dragging it onto a wall does.
      send("alMatPaint", { asset: a });
      flash("painting " + a.name + " onto your selection…");
      return;
    }
    if (act === "clips" || act === "skin" || act === "swap") {
      send("alApply", { asset: a, mode: act });
      flash("applied to your selection");
      return;
    }
  });

  // Handing the file to the creator. This panel lives in a locked-down frame:
  // it may not open tabs, so a plain <a target="_blank"> click died silently.
  // What it MAY do is download. First road: pull the bytes and hand the browser
  // a named blob, which gives a real "saved to Downloads" with the right file
  // name. If the frame isn't allowed to read those bytes, second road: a hidden
  // child frame pointed straight at the file — the browser saves it, and the
  // panel never navigates away. Either way the path goes on the clipboard, so
  // there's always a third road he can paste into a tab himself.
  function grabFile(a) {
    const url = String(a.path || "");
    if (!url) return;
    const name = url.split("?")[0].split("/").pop() || "asset";
    copyText(url);
    flash("downloading " + name + " — path copied too");
    const save = (href, revoke) => {
      const link = doc.createElement("a");
      link.href = href;
      link.download = name;
      link.rel = "noopener";
      link.style.display = "none";
      doc.body.appendChild(link);
      link.click();
      win.setTimeout(() => {
        link.remove();
        if (revoke && win.URL && win.URL.revokeObjectURL) win.URL.revokeObjectURL(href);
      }, 4000);
    };
    const viaFrame = () => {
      const f = doc.createElement("iframe");
      f.style.display = "none";
      f.src = url;
      doc.body.appendChild(f);
      win.setTimeout(() => f.remove(), 30000);
    };
    try {
      const grab = win.fetch;
      if (typeof grab !== "function" || !win.URL || !win.URL.createObjectURL) {
        viaFrame();
        return;
      }
      grab.call(win, url)
        .then((res) => (res && res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) save(win.URL.createObjectURL(blob), true);
          else viaFrame();
        })
        .catch(() => viaFrame());
    } catch (err) {
      viaFrame();
    }
  }

  function copyText(text) {
    try {
      if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
        win.navigator.clipboard.writeText(text);
        return;
      }
    } catch (e) {
      /* fall through to the textarea trick */
    }
    const ta = doc.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    container.appendChild(ta);
    ta.select();
    try {
      doc.execCommand("copy");
    } catch (e) {
      /* nothing else to try */
    }
    container.removeChild(ta);
  }

  // ---- drag a card into the world ---------------------------------------

  let drag = null;

  listEl.addEventListener("pointerdown", (ev) => {
    const cardEl = ev.target.closest ? ev.target.closest("[data-drag]") : null;
    if (!cardEl || (ev.target.getAttribute && (ev.target.getAttribute("data-act") || ev.target.getAttribute("data-cardtag")))) return;
    if (ev.target.tagName === "INPUT") return;
    const a = byId(cardEl.getAttribute("data-id"));
    if (!a) return;
    drag = { a, cardEl, x: ev.clientX, y: ev.clientY, live: false, id: ev.pointerId };
    try {
      cardEl.setPointerCapture(ev.pointerId);
    } catch (e) {
      /* capture is a nicety; document listeners still see the move */
    }
  });

  function aimOf(ev) {
    return { x: ev.clientX, y: ev.clientY, w: win.innerWidth, h: win.innerHeight };
  }

  function onMove(ev) {
    if (!drag) return;
    if (!drag.live && Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) < 6) return;
    if (!drag.live) {
      drag.live = true;
      drag.cardEl.classList.add("drag");
      container.style.pointerEvents = "auto";
      drag.ghost = doc.createElement("div");
      drag.ghost.className = "alx-ghost";
      drag.ghost.textContent = metaOf(drag.a.kind).icon + "  " + drag.a.name;
      container.appendChild(drag.ghost);
      // A motion has no body of its own to stand under the cursor — what it
      // needs is a body already out there, so it drags as the chip and lands on
      // whatever it is let go over.
      if (drag.a.kind !== "sound" && drag.a.kind !== "motion") {
        // Visual assets get the real thing floating in the world under the cursor.
        drag.world = true;
        drag.last = 0;
        // A set's members live in the world's own catalog — the drag only needs
        // to name it and say how big the footprint is.
        const carried =
          drag.a.kind === "set"
            ? { id: drag.a.id, name: drag.a.name, kind: "set", path: drag.a.path, span: drag.a.span }
            : drag.a;
        send("alGhost", Object.assign({ asset: carried }, aimOf(ev)));
      }
    }
    drag.ghost.style.left = ev.clientX + "px";
    drag.ghost.style.top = ev.clientY + "px";
    if (drag.world) {
      const now = win.performance && win.performance.now ? win.performance.now() : drag.last + 100;
      if (now - drag.last >= 55) {
        drag.last = now;
        send("alGhostMove", aimOf(ev));
      }
    }
  }

  function onUp(ev) {
    if (!drag) return;
    const d = drag;
    drag = null;
    container.style.pointerEvents = "none";
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    d.cardEl.classList.remove("drag");
    if (!d.live) return;
    const r = panel.getBoundingClientRect();
    const outside = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
    if (d.world) {
      if (outside) {
        send("alGhostDrop", aimOf(ev));
        flash("dropped " + d.a.name + " where you let go");
      } else {
        send("alGhostCancel", {});
      }
      return;
    }
    if (!outside) return;
    if (d.a.kind === "motion") {
      send("alMotion", Object.assign({ key: d.a.key, loop: d.a.loop, label: d.a.name, aim: "screen" }, aimOf(ev)));
      flash("putting " + d.a.name + " on whatever you dropped it on…");
      return;
    }
    send("alPlace", Object.assign({ asset: d.a, aim: "screen" }, aimOf(ev)));
    flash("dropped " + d.a.name + " where you let go");
  }

  doc.addEventListener("pointermove", onMove, true);
  doc.addEventListener("pointerup", onUp, true);
  container._alxMove = onMove;
  container._alxUp = onUp;

  // ---- keep the caret in the field ---------------------------------------
  // A press the engine reads as a world click bounces focus back to the game
  // canvas, and the field loses the caret before the first keystroke. The
  // panel root is marked data-input-capture="ignore" so presses over it read
  // as UI; this is the belt: a press on a text field takes focus by hand and
  // never bubbles further.
  panel.addEventListener("pointerdown", (ev) => {
    const t = ev.target;
    if (!t || !t.tagName) return;
    const tag = String(t.tagName).toUpperCase();
    if (tag !== "INPUT" && tag !== "TEXTAREA") return;
    ev.stopPropagation();
    if (doc.activeElement !== t && typeof t.focus === "function") t.focus();
  });

  // ---- the wheel over the panel belongs to the panel ---------------------
  // Bare scroll is god-mode's dolly, so a wheel over the shelf used to fly the
  // creator through the world. Swallow it here and scroll the list by hand.
  function onWheel(ev) {
    if (ev.alxHandled) return;
    if (!panel.contains(ev.target)) return;
    ev.alxHandled = true;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
    const box = (ev.target.closest && ev.target.closest(".alx-body")) || listEl;
    const step = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * box.clientHeight : ev.deltaY;
    const before = box.scrollTop;
    box.scrollTop += step;
    // One receipt, once per mount: did a wheel notch reach this realm at all,
    // and did the list move? That splits "the engine never forwards it" from
    // "it forwards it AND keeps its own copy".
    if (!container._alxWheelSeen) {
      container._alxWheelSeen = true;
      try {
        send("alWheel", { dy: ev.deltaY, mode: ev.deltaMode, from: before, to: box.scrollTop, ctrl: !!ev.ctrlKey });
      } catch (e) {
        /* the scroll already happened; the receipt is a bonus */
      }
    }
  }
  const wheelOpts = { capture: true, passive: false };
  win.addEventListener("wheel", onWheel, wheelOpts);
  doc.addEventListener("wheel", onWheel, wheelOpts);
  panel.addEventListener("wheel", onWheel, wheelOpts);
  container._alxWheel = onWheel;
  container._alxWheelOpts = wheelOpts;

  // ---- file drops -------------------------------------------------------

  function stop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  panel.addEventListener("dragover", (ev) => {
    stop(ev);
    panel.classList.add("over");
  });
  panel.addEventListener("dragleave", (ev) => {
    stop(ev);
    panel.classList.remove("over");
  });
  panel.addEventListener("drop", (ev) => {
    stop(ev);
    panel.classList.remove("over");
    const files = ev.dataTransfer && ev.dataTransfer.files ? Array.from(ev.dataTransfer.files) : [];
    const text = ev.dataTransfer ? ev.dataTransfer.getData("text/plain") : "";
    if (!files.length && text && (text.indexOf("/cdn/") >= 0 || /^[[{]/.test(text.trim()))) {
      const landed = intake(text.trim());
      if (landed === 1) flash("shelved " + assets[0].name);
      else if (landed > 1) flash("crate unpacked — " + landed + " onto the shelf");
      else flash("nothing new in that drop");
      render();
      return;
    }
    handleFiles(files);
  });

  function handleFiles(files) {
    const images = files.filter((f) => IMAGE_EXT.some((e) => f.name.toLowerCase().endsWith(e)));
    const rest = files.filter((f) => images.indexOf(f) < 0);
    if (rest.length) {
      send("alRequest", { names: rest.map((f) => f.name) });
      flash("models and audio ride in through chat — asked Savi to shelve " + rest.length);
    }
    if (!images.length) {
      render();
      return;
    }
    flash("uploading " + images.length + " image" + (images.length > 1 ? "s" : "") + "…");
    images.forEach((file) => {
      win.spawn.assets
        .uploadImage({ blob: file, name: file.name })
        .then((res) => {
          const a = shelve({ path: res.url, name: file.name.replace(/\.[a-z0-9]+$/i, ""), kind: "image", tags: ["uploaded"] });
          if (a) flash("shelved " + a.name);
          render();
        })
        .catch((err) => {
          flash("upload refused: " + (err && err.message ? err.message : "unknown"));
          render();
        });
    });
  }

  render();

  // Every card owes a picture of the real thing, so the shelf photographs its own
  // blanks the first time the tab opens instead of waiting to be asked.
  win.setTimeout(() => {
    if (!container.isConnected || view.tab !== "shelf") return;
    const blanks = unshot();
    if (blanks.length) shoot(blanks);
  }, 1200);
}

export function onDestroy(container) {
  const doc = container.ownerDocument;
  if (container._alxGameEvent) doc.removeEventListener("spawn:game-event", container._alxGameEvent);
  if (container._alxMove) doc.removeEventListener("pointermove", container._alxMove, true);
  if (container._alxUp) doc.removeEventListener("pointerup", container._alxUp, true);
  if (container._alxWheel) {
    const opts = container._alxWheelOpts || true;
    const win = doc.defaultView || window;
    win.removeEventListener("wheel", container._alxWheel, opts);
    doc.removeEventListener("wheel", container._alxWheel, opts);
  }
  container.style.pointerEvents = "";
  container.innerHTML = "";
}
