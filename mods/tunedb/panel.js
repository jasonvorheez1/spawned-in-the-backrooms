// TuneDB — the Database tab. A floating, draggable window (real DOM) in the
// style of an RPG-maker database: tables on the left, rows in the middle, the
// selected row's numbers on the right — or every row at once in Grid view.
// It never writes files itself: each edit goes to the writer on the god rig as
// sendAction("tunedb:op", op), and the writer answers with the whole database.
const G = globalThis;
const LS_LAYOUT = "tunedb.layout.v1";
const LS_LANG = "tunedb.lang";
const LS_MODE = "tunedb.mode";
const TUNE_DIR = "scripts/lib/data/";

const INK = {
  bg: "rgba(14,15,19,0.97)", pane: "rgba(255,255,255,0.03)", line: "#2c3040", text: "#e8e9ee",
  dim: "#8e95a8", accent: "#f0b545", sel: "rgba(240,181,69,0.16)", red: "#e0604d", green: "#6cc28a",
  input: "rgba(0,0,0,0.35)",
};

const STR = {
  en: {
    title: "TuneDB", form: "Form", grid: "Grid", refresh: "Reload", tables: "Tables", rows: "Entries",
    addTable: "+ Table", add: "+ Add", dup: "Duplicate", del: "Delete", confirm: "Sure?", up: "▲", down: "▼",
    id: "ID", idHint: "Game code finds this entry by its ID. Renaming it breaks code that uses the old one.",
    addField: "+ Field", key: "key", label: "Label", labelJa: "Label (JA)", type: "Type", def: "Default",
    types: { number: "Number", int: "Whole number", text: "Text", bool: "On/Off" }, ok: "Add", cancel: "Cancel",
    waiting: "Connecting to the world…", empty: "No tables yet. Start from a starter set and reshape it to your game — every table, field and row can be renamed or deleted.",
    seed: "Create starter tables", saved: "Saved", saving: "Saving…", fieldEdit: "Edit field", min: "Min", max: "Max", step: "Step",
    delField: "Delete field", tableName: "Table name", tableId: "table id (a-z, 0-9, _)", renameTable: "Rename", delTable: "Delete table", regen: "Regenerate from Rules",
    file: "File", usage: "In code",
    errors: { "bad-id": "Use letters a-z, digits and _ .", exists: "That ID is taken.", "no-table": "Table not found — reloaded.", "no-row": "Entry not found — reloaded.", "no-field": "Field not found — reloaded.", "no-cell": "Cell not found — reloaded.", "unknown-op": "Unknown edit.", empty: "Nothing to import." },
    broken: "Couldn't read:",
    links: "Links", linksOk: "All links OK", linksBad: (n) => n + " broken link" + (n > 1 ? "s" : ""),
    linkTo: "Links to (table ids)", linkAllow: "Also OK (words)", linkHint: "Pick a row from", noTable: "table missing:",
    notFound: (v, ts) => "\"" + v + "\" isn't a row in " + ts,
    modeDb: "Database", modeTune: "Tune", files: "Files", search: "Search every number…", reset: "Back to the value when you opened it",
    sheetCopy: "📋 Copy for sheet", sheetPaste: "📥 Paste from sheet", sheetCopyHint: "Selected — press Ctrl+C (⌘C), then paste into Excel / Google Sheets.",
    sheetPasteHint: "Paste cells from Excel / Google Sheets here (Ctrl+V). First row = column names (id, then field keys or labels). Existing ids are updated, new ids are added.",
    sheetImport: "Import", sheetReplace: "Also delete rows not in the paste", sheetClose: "Close", sheetPreview: (n, a, u, cols, skip) => n + " rows · " + a + " new, " + u + " updated · columns: " + cols + (skip ? " · ignored: " + skip : ""), sheetNone: "Nothing to import yet.",
    modeShop: "Spoins", shopNote: "Every buyable in this world. 1 Spoin = $0.01; you keep 50%. Price edits save to world.config.yaml — players on the live game see them after you publish.",
    shopEmpty: "No buyables yet. Ask Savi for one (a tip jar, a cape, a pass) and it shows up here.",
    shopCols: ["Item", "Price (Spoins)", "Buyer pays", "You get", "Once", "Owners here"], shopTotal: "Sum of every price", shopEffect: "Effect script", shopDonation: "none (donation)", shopDesc: "Description",
    rangesNote: (n) => n + " sliders are using guessed ranges. Write the ranges into the files so the sliders stay put and you (and Savi) can adjust them there.", rangesBtn: "Write slider ranges", rangesDone: (n) => "Ranges written for " + n + " values.",
    presets: [["rpg", "⚔️ RPG", "Stats, enemies, weapons, armor, items, skills, states, elements, levels, loot, achievements, save layout."], ["action", "💥 Action", "Rules, player, enemies, weapons, pickups, waves — for shooters, brawlers and arena games."], ["minimal", "▫️ Minimal", "Rules and one blank table to rename and grow."]], presetPick: "Pick a starter set:",
    tuneEmpty: "No tuning files yet. A game's numbers live in scripts/lib/data/*.yml — every file there shows up here as sliders.",
    readOnly: "edit in the file", tuneHowTo: "Tip: a comment on the line sets the slider — walkSpeed: 6  # 1..20 step 0.5 How fast",
    noMatch: "Nothing matches.",
  },
  ja: {
    title: "TuneDB", form: "フォーム", grid: "一覧", refresh: "再読込", tables: "テーブル", rows: "項目",
    addTable: "+ テーブル", add: "+ 追加", dup: "複製", del: "削除", confirm: "本当に？", up: "▲", down: "▼",
    id: "ID", idHint: "ゲームのコードはこのIDで項目を探します。変えると古いIDを使っているコードが動かなくなります。",
    addField: "+ 項目を追加", key: "キー", label: "名前(英)", labelJa: "名前(日)", type: "種類", def: "初期値",
    types: { number: "数値", int: "整数", text: "文字", bool: "オン/オフ" }, ok: "追加", cancel: "やめる",
    waiting: "ワールドに接続中…", empty: "テーブルがまだありません。スターターから始めて、ゲームに合わせて作り替えよう。テーブル・項目・行は全部名前変更・削除できます。",
    seed: "仮データを作る", saved: "保存済み", saving: "保存中…", fieldEdit: "項目を編集", min: "最小", max: "最大", step: "刻み",
    delField: "項目を削除", tableName: "テーブル名", tableId: "テーブルID (a-z, 0-9, _)", renameTable: "名前変更", delTable: "テーブル削除", regen: "ルールから作り直す",
    file: "ファイル", usage: "コードでは",
    errors: { "bad-id": "英小文字・数字・_ で入力してね。", exists: "そのIDはもう使われています。", "no-table": "テーブルが見つかりません（再読込しました）", "no-row": "項目が見つかりません（再読込しました）", "no-field": "項目が見つかりません（再読込しました）", "no-cell": "セルが見つかりません（再読込しました）", "unknown-op": "不明な操作です。", empty: "取り込むものがありません。" },
    broken: "読めなかったファイル:",
    links: "つながり", linksOk: "つながりOK", linksBad: (n) => "つながり切れ " + n + "件",
    linkTo: "つなぐ先 (テーブルID)", linkAllow: "ほかにOKな値", linkHint: "ここから選ぶ:", noTable: "テーブルがない:",
    notFound: (v, ts) => "「" + v + "」は " + ts + " にありません",
    modeDb: "データベース", modeTune: "調整", files: "ファイル", search: "全部の数値から探す…", reset: "開いたときの値に戻す",
    sheetCopy: "📋 表計算用にコピー", sheetPaste: "📥 表計算から貼り付け", sheetCopyHint: "選択済み。Ctrl+C（⌘C）でコピーして、エクセル／Googleスプレッドシートに貼り付けてね。",
    sheetPasteHint: "エクセル／Googleスプレッドシートのセルをここに貼り付け（Ctrl+V）。1行目は列名（id と、項目のキーか名前）。同じidは上書き、新しいidは追加。",
    sheetImport: "取り込む", sheetReplace: "貼り付けにない行は削除する", sheetClose: "閉じる", sheetPreview: (n, a, u, cols, skip) => n + "行 · 追加" + a + " / 上書き" + u + " · 列: " + cols + (skip ? " · 無視: " + skip : ""), sheetNone: "まだ取り込めるものがありません。",
    modeShop: "Spoins", shopNote: "このワールドの課金アイテム全部。1 Spoin = 1セント（約1.5円）、取り分は50%。値段の変更は world.config.yaml に保存され、公開版にはpublishしたときに反映されます。",
    shopEmpty: "課金アイテムはまだありません。サヴィに頼むと（投げ銭、マント、パスなど）ここに並びます。",
    shopCols: ["アイテム", "値段 (Spoins)", "買う人の支払い", "あなたの取り分", "1回限り", "この部屋の所持者"], shopTotal: "全アイテムの合計", shopEffect: "効果スクリプト", shopDonation: "なし（投げ銭）", shopDesc: "説明",
    rangesNote: (n) => n + " 個のスライダーが推測の範囲で動いています。範囲をファイルにコメントとして書き込むと、範囲が固定され、あとからファイルで調整できます。", rangesBtn: "スライダー範囲を書き込む", rangesDone: (n) => n + " 個の範囲を書き込みました。",
    presets: [["rpg", "⚔️ RPG", "ステータス・敵・武器・防具・アイテム・スキル・状態異常・属性・レベル・ドロップ・実績・セーブ構成。"], ["action", "💥 アクション", "ルール・プレイヤー・敵・武器・アイテム・ウェーブ。シューター、ベルトスクロール、アリーナ向け。"], ["minimal", "▫️ 最小", "ルールと空のテーブル1つ。名前を変えて育てる。"]], presetPick: "スターターを選んでね：",
    tuneEmpty: "調整ファイルがまだありません。ゲームの数値は scripts/lib/data/*.yml に置かれ、ここにスライダーで並びます。",
    readOnly: "ファイルで編集", tuneHowTo: "ヒント: 行のコメントでスライダーを決められます — walkSpeed: 6  # 1..20 step 0.5 歩く速さ",
    noMatch: "見つかりません。",
  },
};

let S = null;

function L() { return STR[S && S.lang === "ja" ? "ja" : "en"]; }
function lab(o) { return S.lang === "ja" && o.labelJa ? o.labelJa : (o.label || o.key || o.id); }

export function onMount(container) {
  container.style.pointerEvents = "none";
  container.innerHTML = "";
  S = {
    lang: lsGet(LS_LANG) === "ja" ? "ja" : "en", view: "form", data: null, table: null, row: null,
    layout: loadLayout(), status: "", statusAt: 0, pending: false, dirty: false, armed: null, fieldForm: null,
    editField: null, tableForm: null, container, retry: null, off: null,
    mode: ["tune", "shop"].includes(lsGet(LS_MODE)) ? lsGet(LS_MODE) : "db", shop: null, tune: {}, tuneFile: null, tuneQuery: "", tuneOrig: {},
  };
  const win = el("div", {
    position: "fixed", left: S.layout.x + "px", top: S.layout.y + "px", width: S.layout.w + "px", height: S.layout.h + "px",
    background: INK.bg, border: "1px solid " + INK.line, borderRadius: "3px", boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
    color: INK.text, font: "13px/1.4 ui-sans-serif, system-ui, sans-serif", display: "flex", flexDirection: "column",
    overflow: "hidden", pointerEvents: "auto", zIndex: "41",
  });
  win.setAttribute("data-interactive", "");
  for (const ev of ["wheel", "keydown", "keyup", "keypress"]) win.addEventListener(ev, (e) => e.stopPropagation());
  S.win = win;
  container.appendChild(win);
  S.cache = {};
  if (G.spawn && G.spawn.on) S.off = G.spawn.on("event", (name, payload) => {
    if (name === "tunedb:table" && payload && payload.table) { S.cache[payload.table.id] = payload.table; if (S.waitIndex) receive(S.waitIndex); }
    else if (name === "tunedb:tune" && payload && payload.doc) { gotTune(payload.doc); if (S.waitIndex) receive(S.waitIndex); }
    else if (name === "tunedb:index") receive(payload);
    else if (name === "tunedb:shop" && payload) { S.shop = payload; if (S.mode === "shop") { const a = G.document.activeElement; if (!(a && S.win.contains(a) && a.tagName === "INPUT" && a.type !== "checkbox")) draw(); } }
  });
  hello();
  S.retry = G.setInterval(() => { if (!S || S.data) { if (S && S.retry) G.clearInterval(S.retry); return; } hello(); }, 1500);
  draw();
}

export function onDestroy(container) {
  if (S) { if (S.off) try { S.off(); } catch (e) {} if (S.retry) G.clearInterval(S.retry); }
  if (container) container.innerHTML = "";
  S = null;
}

/* ------------------------------------------------------------- wire */

function send(op) {
  op.nonce = Math.floor(Math.random() * 1e9);
  if (op.kind !== "hello") { S.pending = true; setStatus(L().saving); }
  try { G.sendAction("tunedb:op", op); } catch (e) {}
}
function hello() { send({ kind: "hello" }); }

function receive(p) {
  if (!S || !p) return;
  const idx = p.index || [];
  const missing = idx.filter((e) => !S.cache[e.id]).concat((p.tune || []).filter((f) => !S.tune[f]));
  if (missing.length) { S.waitIndex = p; if (!S.askedAgain) { S.askedAgain = true; G.setTimeout(() => { if (S) { S.askedAgain = false; if (S.waitIndex) hello(); } }, 1200); } return; }
  S.waitIndex = null;
  for (const id of Object.keys(S.cache)) if (!idx.find((e) => e.id === id)) delete S.cache[id];
  for (const f of Object.keys(S.tune)) if (!(p.tune || []).includes(f)) delete S.tune[f];
  if (!S.tuneFile || !S.tune[S.tuneFile]) S.tuneFile = (p.tune || [])[0] || null;
  p = Object.assign({}, p, { tables: idx.map((e) => S.cache[e.id]) });
  S.data = p;
  if (p.select) { if (p.select.table) S.table = p.select.table; if (p.select.row !== undefined) S.row = p.select.row; }
  const tables = p.tables || [];
  if (!tables.find((t) => t.id === S.table)) S.table = tables[0] ? tables[0].id : null;
  const t = cur();
  if (t && !(S.row in t.rows)) S.row = Object.keys(t.rows)[0] || null;
  if (S.pending) { S.pending = false; setStatus(p.error ? (L().errors[p.error] || p.error) : (p.ranged ? L().rangesDone(p.ranged) : L().saved), !!p.error); }
  // Don't yank a field out from under the creator's cursor.
  const a = G.document.activeElement;
  if (a && S.win.contains(a) && a.tagName === "INPUT" && a.type !== "checkbox" && a.type !== "range") { S.dirty = true; return; }
  draw();
}

function cur() { return S.data && (S.data.tables || []).find((t) => t.id === S.table) || null; }

// Broken links, recomputed here from the tables the panel holds (the writer's
// list is the same rule; this one also follows optimistic edits).
function tokens(v) { return String(v == null ? "" : v).split(",").map((x) => x.trim()).filter(Boolean); }
function tableById(id) { return S.data && (S.data.tables || []).find((t) => t.id === id); }
function badTokens(f, v) {
  if (!f.ref) return [];
  return tokens(v).filter((tok) => !(f.refAllow && f.refAllow.includes(tok)) && !f.ref.some((id) => { const o = tableById(id); return o && o.rows[tok]; }));
}
function allBroken() {
  const out = [];
  for (const t of (S.data && S.data.tables) || []) for (const f of t.fields) if (f.ref)
    for (const rid of Object.keys(t.rows)) for (const tok of badTokens(f, t.rows[rid][f.key])) out.push({ table: t.id, row: rid, field: f.key, value: tok, targets: f.ref });
  return out;
}
function refLabel(f) { return f.ref.map((id) => { const o = tableById(id); return o ? lab(o) : id + "?"; }).join(" / "); }

function setStatus(text, bad) {
  S.status = text; S.statusBad = !!bad; S.statusAt = Date.now();
  const n = S.win && S.win.querySelector("[data-status]");
  if (n) { n.textContent = text; n.style.color = bad ? INK.red : INK.dim; }
}

/* ------------------------------------------------------------- draw */

function draw() {
  if (!S) return;
  S.dirty = false;
  const scrollers = {};
  S.win.querySelectorAll("[data-scroll]").forEach((n) => (scrollers[n.getAttribute("data-scroll")] = n.scrollTop));
  S.win.innerHTML = "";
  S.win.appendChild(titleBar());
  const body = el("div", { display: "flex", flex: "1", minHeight: "0" });
  S.win.appendChild(body);
  if (!S.data) {
    body.appendChild(el("div", { padding: "18px", color: INK.dim }, L().waiting));
  } else if (S.mode === "tune") {
    tuneView(body);
  } else if (S.mode === "shop") {
    shopView(body);
  } else if (!(S.data.tables || []).length) {
    const box = el("div", { padding: "22px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "420px" });
    box.appendChild(el("div", { color: INK.dim }, L().empty));
    box.appendChild(el("div", { fontWeight: "600" }, L().presetPick));
    for (const [id, name, desc] of L().presets) {
      const card = el("div", { display: "flex", flexDirection: "column", gap: "4px", padding: "8px 10px", border: "1px solid " + INK.line, borderRadius: "6px" });
      card.appendChild(btn(name, () => send({ kind: "seed", preset: id }), { background: id === "rpg" ? INK.accent : undefined, color: id === "rpg" ? "#1a1406" : undefined, borderColor: INK.accent, alignSelf: "flex-start", fontWeight: "600" }));
      card.appendChild(el("div", { color: INK.dim, fontSize: "12px" }, desc));
      box.appendChild(card);
    }
    body.appendChild(box);
  } else {
    body.appendChild(tableRail());
    if (S.view === "grid") body.appendChild(gridView());
    else { body.appendChild(rowList()); body.appendChild(formView()); }
  }
  if (S.data && S.linksOpen && S.mode === "db") {
    const list = allBroken();
    const box = el("div", { maxHeight: "140px", overflowY: "auto", borderTop: "1px solid " + INK.line, padding: "4px 6px", fontSize: "12px", background: "rgba(224,96,77,0.06)" });
    if (!list.length) box.appendChild(el("div", { color: INK.green, padding: "4px" }, "✓ " + L().linksOk));
    for (const b of list) {
      const t = tableById(b.table); const f = t.fields.find((x) => x.key === b.field);
      const it = listItem("", false, () => { S.table = b.table; S.row = b.row; S.view = "form"; S.editField = null; draw(); });
      it.appendChild(el("span", { color: INK.red }, "✕"));
      it.appendChild(el("span", { fontFamily: "ui-monospace, monospace" }, lab(t) + " › " + b.row + " › " + lab(f)));
      const miss = b.targets.filter((id) => !tableById(id));
      it.appendChild(el("span", { color: INK.dim, marginLeft: "auto" }, miss.length ? L().noTable + " " + miss.join(", ") : L().notFound(b.value, refLabel(f))));
      box.appendChild(it);
    }
    S.win.appendChild(box);
  }
  if (S.data && S.data.broken && S.data.broken.length) {
    S.win.appendChild(el("div", { padding: "4px 10px", color: INK.red, borderTop: "1px solid " + INK.line, fontSize: "12px" }, L().broken + " " + S.data.broken.join(", ")));
  }
  S.win.appendChild(resizeGrip());
  S.win.querySelectorAll("[data-scroll]").forEach((n) => { const k = n.getAttribute("data-scroll"); if (scrollers[k]) n.scrollTop = scrollers[k]; });
}

function titleBar() {
  const bar = el("div", { display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderBottom: "1px solid " + INK.line, cursor: "move", userSelect: "none", background: "rgba(255,255,255,0.03)" });
  bar.appendChild(el("div", { fontWeight: "700", letterSpacing: ".02em" }, "🗃️ TuneDB"));
  bar.appendChild(el("div", { color: INK.dim }, "· " + L().title));
  const st = el("div", { flex: "1", color: S.statusBad ? INK.red : INK.dim, fontSize: "12px", textAlign: "right", paddingRight: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, S.status);
  st.setAttribute("data-status", "");
  bar.appendChild(st);
  if (S.data && S.mode === "db" && (S.data.tables || []).length) {
    const n = allBroken().length;
    bar.appendChild(btn("🔗 " + (n ? L().linksBad(n) : L().linksOk), () => { S.linksOpen = !S.linksOpen; draw(); },
      { minHeight: "26px", padding: "2px 8px", color: n ? "#fff" : INK.green, background: n ? INK.red : "transparent", borderColor: n ? INK.red : INK.line }, L().links));
  }
  bar.appendChild(seg([["db", "🗃️ " + L().modeDb], ["tune", "🎚️ " + L().modeTune], ["shop", "💰 " + L().modeShop]], S.mode, (v) => { S.mode = v; lsSet(LS_MODE, v); draw(); }));
  if (S.mode === "db") bar.appendChild(seg([["form", L().form], ["grid", L().grid]], S.view, (v) => { S.view = v; draw(); }));
  bar.appendChild(btn("↻", () => { const ae = G.document.activeElement; if (ae && ae.blur) ae.blur(); S.cache = {}; S.tune = {}; S.tuneOrig = {}; S.shop = null; S.waitIndex = null; S.askedAgain = false; S.pending = true; setStatus(L().refresh + "…"); hello(); }, { minHeight: "26px", padding: "2px 8px" }, L().refresh));
  bar.appendChild(seg([["en", "EN"], ["ja", "日本語"]], S.lang, (v) => { S.lang = v; lsSet(LS_LANG, v); draw(); }));
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,input,select")) return;
    const sx = e.clientX, sy = e.clientY, ox = S.layout.x, oy = S.layout.y;
    const mv = (ev) => { S.layout.x = clamp(ox + ev.clientX - sx, 0, G.innerWidth - 80); S.layout.y = clamp(oy + ev.clientY - sy, 0, G.innerHeight - 40); S.win.style.left = S.layout.x + "px"; S.win.style.top = S.layout.y + "px"; };
    const up = () => { G.removeEventListener("pointermove", mv); G.removeEventListener("pointerup", up); saveLayout(); };
    G.addEventListener("pointermove", mv); G.addEventListener("pointerup", up);
  });
  return bar;
}

function tableRail() {
  const rail = el("div", { width: "136px", flex: "0 0 136px", borderRight: "1px solid " + INK.line, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)" });
  rail.appendChild(head(L().tables));
  const list = el("div", { flex: "1", overflowY: "auto", padding: "4px" });
  list.setAttribute("data-scroll", "tables");
  for (const t of S.data.tables) {
    const item = listItem(lab(t), t.id === S.table, () => { S.table = t.id; const ids = Object.keys(t.rows); S.row = ids[0] || null; S.tableForm = null; S.fieldForm = null; draw(); });
    const nb = allBroken().filter((b) => b.table === t.id).length;
    if (nb) item.appendChild(el("span", { color: "#fff", background: INK.red, borderRadius: "8px", fontSize: "10px", padding: "0 5px", marginLeft: "auto" }, String(nb)));
    item.appendChild(el("span", { color: INK.dim, fontSize: "11px", marginLeft: nb ? "4px" : "auto" }, String(Object.keys(t.rows).length)));
    list.appendChild(item);
  }
  rail.appendChild(list);
  const foot = el("div", { padding: "6px", borderTop: "1px solid " + INK.line, display: "flex", flexDirection: "column", gap: "4px" });
  if (S.tableForm) {
    const name = input(S.tableForm.label || "", (v) => (S.tableForm.label = v), { placeholder: L().tableName });
    const id = input(S.tableForm.id || "", (v) => (S.tableForm.id = v), { placeholder: L().tableId });
    foot.appendChild(name); foot.appendChild(id);
    const row = el("div", { display: "flex", gap: "4px" });
    row.appendChild(btn(L().ok, () => { const f = S.tableForm; S.tableForm = null; send({ kind: "addTable", label: f.label, labelJa: f.label, id: f.id || f.label }); }, { flex: "1", minHeight: "26px" }));
    row.appendChild(btn("✕", () => { S.tableForm = null; draw(); }, { minHeight: "26px" }));
    foot.appendChild(row);
    G.setTimeout(() => name.focus(), 0);
  } else foot.appendChild(btn(L().addTable, () => { S.tableForm = {}; draw(); }, { minHeight: "26px" }));
  rail.appendChild(foot);
  return rail;
}

function rowList() {
  const t = cur();
  const col = el("div", { width: "178px", flex: "0 0 178px", borderRight: "1px solid " + INK.line, display: "flex", flexDirection: "column" });
  col.appendChild(head(L().rows + " — " + lab(t)));
  const list = el("div", { flex: "1", overflowY: "auto", padding: "4px" });
  list.setAttribute("data-scroll", "rows");
  const ids = Object.keys(t.rows);
  ids.forEach((rid, i) => {
    const r = t.rows[rid];
    const item = listItem("", rid === S.row, () => { S.row = rid; S.fieldForm = null; S.editField = null; draw(); });
    item.appendChild(el("span", { color: INK.dim, fontSize: "11px", width: "22px", flex: "0 0 22px" }, String(i + 1).padStart(3, "0")));
    item.appendChild(el("span", { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, r.name !== undefined && r.name !== "" ? String(r.name) : rid));
    if (t.fields.some((f) => badTokens(f, r[f.key]).length)) item.appendChild(el("span", { color: INK.red, marginLeft: "auto" }, "●"));
    list.appendChild(item);
  });
  col.appendChild(list);
  const foot = el("div", { padding: "6px", borderTop: "1px solid " + INK.line, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" });
  foot.appendChild(btn(L().add, () => send({ kind: "addRow", table: t.id, after: S.row }), { minHeight: "26px" }));
  foot.appendChild(btn(L().dup, () => S.row && send({ kind: "dupRow", table: t.id, row: S.row }), { minHeight: "26px" }));
  foot.appendChild(armedBtn("delRow", L().del, () => S.row && send({ kind: "delRow", table: t.id, row: S.row })));
  const mv = el("div", { display: "flex", gap: "4px" });
  mv.appendChild(btn(L().up, () => S.row && send({ kind: "moveRow", table: t.id, row: S.row, dir: -1 }), { flex: "1", minHeight: "26px", padding: "2px" }));
  mv.appendChild(btn(L().down, () => S.row && send({ kind: "moveRow", table: t.id, row: S.row, dir: 1 }), { flex: "1", minHeight: "26px", padding: "2px" }));
  foot.appendChild(mv);
  col.appendChild(foot);
  return col;
}

function formView() {
  const t = cur();
  const pane = el("div", { flex: "1", minWidth: "0", overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" });
  pane.setAttribute("data-scroll", "form");
  const r = S.row && t.rows[S.row];
  if (r) {
    const idRow = fieldRow(L().id, input(S.row, (v) => { if (v && v !== S.row) send({ kind: "renameRow", table: t.id, row: S.row, to: v }); }, { commit: true, mono: true }));
    idRow.title = L().idHint;
    pane.appendChild(idRow);
    pane.appendChild(el("div", { borderTop: "1px solid " + INK.line, margin: "2px 0" }));
    for (const f of t.fields) pane.appendChild(fieldEditorRow(t, f, r));
  }
  pane.appendChild(fieldAdder(t));
  pane.appendChild(tableFooter(t));
  return pane;
}

function fieldEditorRow(t, f, r) {
  const wrap = el("div", { display: "flex", flexDirection: "column", gap: "4px" });
  const control = valueControl(t, f, S.row, r[f.key]);
  const labelBox = el("div", { display: "flex", flexDirection: "column", minWidth: "0" });
  labelBox.appendChild(el("span", {}, lab(f)));
  labelBox.appendChild(el("span", { color: INK.dim, fontSize: "11px", fontFamily: "ui-monospace, monospace" }, f.key));
  if (f.ref) labelBox.appendChild(el("span", { color: INK.accent, fontSize: "11px" }, "🔗 " + refLabel(f)));
  const row = el("div", { display: "grid", gridTemplateColumns: "120px 1fr auto", gap: "8px", alignItems: "center" });
  row.appendChild(labelBox); row.appendChild(control);
  row.appendChild(btn("⋯", () => { S.editField = S.editField === f.key ? null : f.key; draw(); }, { minHeight: "24px", padding: "0 7px", color: INK.dim }, L().fieldEdit));
  wrap.appendChild(row);
  if (S.editField === f.key) {
    const box = el("div", { display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px", background: INK.pane, border: "1px solid " + INK.line, borderRadius: "2px" });
    box.appendChild(mini(L().label, input(f.label, (v) => send({ kind: "editField", table: t.id, field: f.key, label: v }), { commit: true })));
    box.appendChild(mini(L().labelJa, input(f.labelJa || "", (v) => send({ kind: "editField", table: t.id, field: f.key, labelJa: v }), { commit: true })));
    if (f.type === "number" || f.type === "int") for (const k of ["min", "max", "step"]) {
      box.appendChild(mini(L()[k], input(f[k] === undefined ? "" : String(f[k]), (v) => send({ kind: "editField", table: t.id, field: f.key, [k]: v }), { commit: true, width: "64px" })));
    }
    if (f.type === "text") {
      box.appendChild(mini(L().linkTo, input((f.ref || []).join(", "), (v) => send({ kind: "editField", table: t.id, field: f.key, ref: v }), { commit: true, width: "150px", mono: true, placeholder: "weapons, armors" })));
      if (f.ref) box.appendChild(mini(L().linkAllow, input((f.refAllow || []).join(", "), (v) => send({ kind: "editField", table: t.id, field: f.key, refAllow: v }), { commit: true, width: "100px", mono: true, placeholder: "gold" })));
    }
    const acts = el("div", { display: "flex", gap: "4px", alignItems: "flex-end" });
    acts.appendChild(btn("◀", () => send({ kind: "moveField", table: t.id, field: f.key, dir: -1 }), { minHeight: "26px" }));
    acts.appendChild(btn("▶", () => send({ kind: "moveField", table: t.id, field: f.key, dir: 1 }), { minHeight: "26px" }));
    acts.appendChild(armedBtn("delField:" + f.key, L().delField, () => { S.editField = null; send({ kind: "delField", table: t.id, field: f.key }); }));
    box.appendChild(acts);
    wrap.appendChild(box);
  }
  return wrap;
}

function valueControl(t, f, rid, v) {
  if (f.type === "bool") {
    const c = G.document.createElement("input"); c.type = "checkbox"; c.checked = !!v;
    Object.assign(c.style, { width: "18px", height: "18px", accentColor: INK.accent, justifySelf: "start" });
    c.addEventListener("change", () => send({ kind: "setCell", table: t.id, row: rid, field: f.key, value: c.checked }));
    return c;
  }
  const isNum = f.type === "number" || f.type === "int";
  const box = el("div", { display: "flex", gap: "3px", minWidth: "0" });
  const inp = input(v === undefined ? "" : String(v), (val) => {
    // optimistic: the list shows the new name at once
    t.rows[rid][f.key] = isNum ? parseFloat(val) || 0 : val;
    send({ kind: "setCell", table: t.id, row: rid, field: f.key, value: val });
  }, { commit: true, numeric: isNum });
  inp.style.flex = "1";
  box.appendChild(inp);
  if (f.ref) linkInput(inp, f, v);
  if (isNum) {
    const step = f.step || (f.type === "int" ? 1 : 1);
    const nudge = (d) => (e) => { const cur = parseFloat(inp.value) || 0; const m = e && e.shiftKey ? 10 : 1; const nv = Math.round((cur + d * step * m) * 1e6) / 1e6; inp.value = String(nv); t.rows[rid][f.key] = nv; send({ kind: "setCell", table: t.id, row: rid, field: f.key, value: nv }); };
    box.appendChild(btn("−", nudge(-1), { minHeight: "26px", padding: "0 8px" }));
    box.appendChild(btn("+", nudge(1), { minHeight: "26px", padding: "0 8px" }));
  }
  return box;
}

function fieldAdder(t) {
  const box = el("div", { marginTop: "6px" });
  if (!S.fieldForm) { box.appendChild(btn(L().addField, () => { S.fieldForm = { type: "number" }; draw(); }, { minHeight: "26px" })); return box; }
  const F = S.fieldForm;
  const panel = el("div", { display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px", background: INK.pane, border: "1px solid " + INK.line, borderRadius: "2px", alignItems: "flex-end" });
  const first = input(F.label || "", (v) => (F.label = v), { width: "110px" });
  panel.appendChild(mini(L().label, first));
  panel.appendChild(mini(L().labelJa, input(F.labelJa || "", (v) => (F.labelJa = v), { width: "90px" })));
  panel.appendChild(mini(L().key, input(F.key || "", (v) => (F.key = v), { width: "90px", mono: true, placeholder: "auto" })));
  const sel = G.document.createElement("select");
  Object.assign(sel.style, inputStyle({ width: "110px" }));
  for (const k of ["number", "int", "text", "bool"]) { const o = G.document.createElement("option"); o.value = k; o.textContent = L().types[k]; if (F.type === k) o.selected = true; sel.appendChild(o); }
  sel.addEventListener("change", () => (F.type = sel.value));
  panel.appendChild(mini(L().type, sel));
  panel.appendChild(mini(L().def, input(F.default || "", (v) => (F.default = v), { width: "64px" })));
  panel.appendChild(btn(L().ok, () => { S.fieldForm = null; send(Object.assign({ kind: "addField", table: t.id }, F)); }, { minHeight: "26px", background: INK.accent, color: "#1a1406", borderColor: INK.accent }));
  panel.appendChild(btn(L().cancel, () => { S.fieldForm = null; draw(); }, { minHeight: "26px" }));
  box.appendChild(panel);
  G.setTimeout(() => first.focus(), 0);
  return box;
}

function tableFooter(t) {
  const box = el("div", { marginTop: "auto", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px", color: INK.dim, fontSize: "11px" });
  const names = el("div", { display: "flex", gap: "6px", alignItems: "flex-end", flexWrap: "wrap" });
  names.appendChild(mini(L().tableName + " (EN)", input(t.label, (v) => send({ kind: "editTable", table: t.id, label: v }), { commit: true, width: "110px" })));
  names.appendChild(mini(L().tableName + " (JA)", input(t.labelJa || "", (v) => send({ kind: "editTable", table: t.id, labelJa: v }), { commit: true, width: "110px" })));
  names.appendChild(armedBtn("delTable:" + t.id, L().delTable, () => send({ kind: "delTable", table: t.id })));
  if (t.id === "levels") names.appendChild(armedBtn("regen", L().regen, () => send({ kind: "genLevels" })));
  box.appendChild(names);
  const code = el("div", { fontFamily: "ui-monospace, monospace", userSelect: "text", wordBreak: "break-all" },
    L().file + ": " + (S.data.dir || "") + t.id + ".yml   ·   " + L().usage + ": " + t.id.toUpperCase() + ".rows." + (S.row || "id") + "." + ((t.fields[1] || t.fields[0] || {}).key || "field"));
  box.appendChild(code);
  return box;
}

// Spreadsheet round-trip: TSV is what Excel and Google Sheets put on the clipboard.
function toTSV(t) {
  const cell = (v) => { const s = typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v == null ? "" : v); return /[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [["id"].concat(t.fields.map((f) => f.key)).join("\t")];
  for (const rid of Object.keys(t.rows)) lines.push([rid].concat(t.fields.map((f) => cell(t.rows[rid][f.key]))).map((x, i) => i ? x : cell(x)).join("\t"));
  return lines.join("\n");
}
function parseTSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  const src = String(text || "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"' && cur === "") q = true;
    else if (c === "\t") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}
function sheetPlan(t, text) {
  const grid = parseTSV(text); if (grid.length < 2) return null;
  const norm = (x) => String(x || "").trim().toLowerCase();
  const head = grid[0].map(norm);
  const cols = head.map((h) => {
    if (h === "id" || h === "row id" || h === "rowid") return "#id";
    const f = t.fields.find((f) => norm(f.key) === h || norm(f.label) === h || norm(f.labelJa) === h);
    return f ? f.key : null;
  });
  let idCol = cols.indexOf("#id"); const nameCol = cols.indexOf("name");
  const rows = []; let added = 0, updated = 0;
  for (const r of grid.slice(1)) {
    let id = idCol >= 0 ? String(r[idCol] || "").trim() : "";
    if (!id && nameCol >= 0) id = String(r[nameCol] || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!id) continue;
    const values = {};
    cols.forEach((k, i) => {
      if (!k || k === "#id" || i >= r.length) return;
      const f = t.fields.find((x) => x.key === k); let v = String(r[i]).trim();
      if (f.type === "bool") v = /^(true|1|yes|y|x|o|○|◯|✓|はい)$/i.test(v);
      else if (f.type !== "text") v = v.replace(/^[¥$€]/, "").replace(/%$/, "").replace(/^(-?\d{1,3})((,\d{3})+)(\.\d+)?$/, (m, a, b, c, d) => a + b.replace(/,/g, "") + (d || ""));
      values[k] = v;
    });
    if (t.rows[id]) updated++; else added++;
    rows.push({ id, values });
  }
  return { rows, added, updated, cols: cols.filter((c) => c && c !== "#id"), skipped: grid[0].filter((h, i) => !cols[i]) };
}
function sheetBox(t) {
  const m = S.sheet;
  const box = el("div", { borderBottom: "1px solid " + INK.line, padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px", background: "rgba(240,181,69,0.05)" });
  const ta = G.document.createElement("textarea");
  Object.assign(ta.style, inputStyle({ mono: true }), { height: "120px", resize: "vertical", whiteSpace: "pre", fontSize: "11px" });
  ta.setAttribute("data-sheet", "");
  box.appendChild(el("div", { color: INK.dim, fontSize: "12px" }, m.mode === "copy" ? L().sheetCopyHint : L().sheetPasteHint));
  box.appendChild(ta);
  const bar = el("div", { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" });
  if (m.mode === "copy") {
    ta.value = toTSV(t); ta.readOnly = true;
    G.setTimeout(() => { try { ta.focus(); ta.select(); } catch (e) {} }, 0);
    ta.addEventListener("copy", () => setStatus("✓ " + Object.keys(t.rows).length));
  } else {
    ta.value = m.text || "";
    const info = el("span", { color: INK.dim, fontSize: "12px", flex: "1" });
    const upd = () => { m.text = ta.value; const p = sheetPlan(t, ta.value); info.textContent = p && p.rows.length ? L().sheetPreview(p.rows.length, p.added, p.updated, p.cols.length, p.skipped.join(", ")) : L().sheetNone; return p; };
    ta.addEventListener("input", upd);
    const rep = G.document.createElement("input"); rep.type = "checkbox"; rep.checked = !!m.replace; rep.addEventListener("change", () => (m.replace = rep.checked));
    const repL = el("label", { display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: INK.red }); repL.appendChild(rep); repL.appendChild(el("span", {}, L().sheetReplace));
    bar.appendChild(btn(L().sheetImport, () => { const p = upd(); if (!p || !p.rows.length) return; send({ kind: "importRows", table: t.id, rows: p.rows, replace: !!m.replace }); S.sheet = null; }, { background: INK.accent, color: "#1a1406", borderColor: INK.accent, fontWeight: "600" }));
    bar.appendChild(repL); bar.appendChild(info);
    G.setTimeout(() => { try { ta.focus(); upd(); } catch (e) {} }, 0);
  }
  bar.appendChild(btn(L().sheetClose, () => { S.sheet = null; draw(); }, { marginLeft: "auto" }));
  box.appendChild(bar);
  return box;
}

function gridView() {
  const t = cur();
  const pane = el("div", { flex: "1", minWidth: "0", display: "flex", flexDirection: "column" });
  const tools = el("div", { display: "flex", gap: "6px", padding: "6px 8px", borderBottom: "1px solid " + INK.line });
  tools.appendChild(btn(L().sheetCopy, () => { S.sheet = { mode: "copy" }; draw(); }, { minHeight: "26px", padding: "2px 8px", fontSize: "12px" }));
  tools.appendChild(btn(L().sheetPaste, () => { S.sheet = { mode: "paste", text: "" }; draw(); }, { minHeight: "26px", padding: "2px 8px", fontSize: "12px" }));
  pane.appendChild(tools);
  if (S.sheet && S.sheet.table !== undefined && S.sheet.table !== t.id) S.sheet = null;
  if (S.sheet) { S.sheet.table = t.id; pane.appendChild(sheetBox(t)); }
  const scroll = el("div", { flex: "1", overflow: "auto" });
  scroll.setAttribute("data-scroll", "grid");
  const tbl = G.document.createElement("table");
  Object.assign(tbl.style, { borderCollapse: "collapse", fontSize: "12px", minWidth: "100%" });
  const thead = G.document.createElement("tr");
  const th = (txt, sub, extra) => { const c = G.document.createElement("th"); Object.assign(c.style, { position: "sticky", top: "0", background: "#1b1d25", padding: "4px 6px", textAlign: "left", borderBottom: "1px solid " + INK.line, whiteSpace: "nowrap", fontWeight: "600" }, extra || {}); c.appendChild(el("div", {}, txt)); if (sub) c.appendChild(el("div", { color: INK.dim, fontWeight: "400", fontSize: "10px", fontFamily: "ui-monospace, monospace" }, sub)); return c; };
  thead.appendChild(th(L().id, "", { left: "0", zIndex: "2" }));
  for (const f of t.fields) thead.appendChild(th(lab(f), f.key));
  tbl.appendChild(thead);
  for (const rid of Object.keys(t.rows)) {
    const tr = G.document.createElement("tr");
    const idc = G.document.createElement("td");
    Object.assign(idc.style, { position: "sticky", left: "0", background: rid === S.row ? "#2a2618" : "#16171d", padding: "2px 6px", fontFamily: "ui-monospace, monospace", color: INK.dim, borderBottom: "1px solid " + INK.line, cursor: "pointer", whiteSpace: "nowrap" });
    idc.textContent = rid;
    idc.addEventListener("click", () => { S.row = rid; draw(); });
    tr.appendChild(idc);
    for (const f of t.fields) {
      const td = G.document.createElement("td");
      Object.assign(td.style, { padding: "1px 2px", borderBottom: "1px solid " + INK.line });
      const v = t.rows[rid][f.key];
      if (f.type === "bool") {
        const c = G.document.createElement("input"); c.type = "checkbox"; c.checked = !!v; c.style.accentColor = INK.accent;
        c.addEventListener("change", () => send({ kind: "setCell", table: t.id, row: rid, field: f.key, value: c.checked }));
        td.appendChild(c);
      } else {
        const isNum = f.type !== "text";
        const inp = input(v === undefined ? "" : String(v), (val) => send({ kind: "setCell", table: t.id, row: rid, field: f.key, value: val }), { commit: true, numeric: isNum, width: isNum ? "64px" : "110px" });
        Object.assign(inp.style, { background: "transparent", border: "1px solid transparent", textAlign: isNum ? "right" : "left" });
        const rest = () => (f.ref && badTokens(f, v).length ? INK.red : "transparent");
        inp.style.borderColor = rest();
        inp.addEventListener("focus", () => { inp.style.borderColor = INK.accent; inp.style.background = INK.input; S.row = rid; });
        inp.addEventListener("blur", () => { inp.style.borderColor = rest(); inp.style.background = "transparent"; });
        if (f.ref) linkInput(inp, f, v, true);
        td.appendChild(inp);
      }
      tr.appendChild(td);
    }
    tbl.appendChild(tr);
  }
  scroll.appendChild(tbl);
  pane.appendChild(scroll);
  const foot = el("div", { padding: "6px", borderTop: "1px solid " + INK.line, display: "flex", gap: "4px", flexWrap: "wrap" });
  foot.appendChild(btn(L().add, () => send({ kind: "addRow", table: t.id, after: S.row }), { minHeight: "26px" }));
  foot.appendChild(btn(L().dup, () => S.row && send({ kind: "dupRow", table: t.id, row: S.row }), { minHeight: "26px" }));
  foot.appendChild(armedBtn("delRow", L().del + (S.row ? " " + S.row : ""), () => S.row && send({ kind: "delRow", table: t.id, row: S.row })));
  if (t.id === "levels") foot.appendChild(armedBtn("regen", L().regen, () => send({ kind: "genLevels" })));
  pane.appendChild(foot);
  return pane;
}

// A link cell: suggestions from the target tables, red when it names nothing.
function linkInput(inp, f, v, quiet) {
  const id = "tdb-dl-" + f.ref.join("-") + (f.refAllow ? "-a" : "");
  let dl = S.win.querySelector("#" + id);
  if (!dl) {
    dl = G.document.createElement("datalist"); dl.id = id;
    for (const a of f.refAllow || []) { const o = G.document.createElement("option"); o.value = a; dl.appendChild(o); }
    for (const tid of f.ref) { const o2 = tableById(tid); if (!o2) continue; for (const rid of Object.keys(o2.rows)) { const o = G.document.createElement("option"); o.value = rid; const nm = o2.rows[rid].name; o.label = lab(o2) + (nm ? " · " + nm : ""); dl.appendChild(o); } }
    S.win.appendChild(dl);
  }
  inp.setAttribute("list", id);
  const bad = badTokens(f, v);
  if (bad.length) { if (!quiet) inp.style.borderColor = INK.red; inp.style.color = INK.red; inp.title = L().notFound(bad.join(", "), refLabel(f)); }
  else inp.title = L().linkHint + " " + refLabel(f);
}

/* ------------------------------------------------------------- tune */

function gotTune(doc) {
  S.tune[doc.file] = doc;
  for (const k of doc.knobs) { const id = doc.file + "|" + k.path.join("."); if (!(id in S.tuneOrig) && k.value !== undefined) S.tuneOrig[id] = k.value; }
}
function fileLabel(f) { return f.replace(TUNE_DIR, "").replace(/\.ya?ml$/, ""); }
function pretty(key) {
  const s = String(key).replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function editable(k) { return k.type === "number" || k.type === "bool" || k.type === "text"; }

const YEN_PER_SPOIN = 1.5; // ≈ ¥150 / $1 — a rough guide, not a quote
function money(sp) { return "$" + (sp / 100).toFixed(2) + (S.lang === "ja" ? "  ≈¥" + Math.round(sp * YEN_PER_SPOIN).toLocaleString() : ""); }
function shopView(body) {
  const pane = el("div", { flex: "1", minWidth: "0", display: "flex", flexDirection: "column" });
  pane.appendChild(el("div", { padding: "8px 12px", borderBottom: "1px solid " + INK.line, color: INK.dim, fontSize: "12px" }, L().shopNote));
  const scroll = el("div", { flex: "1", overflow: "auto", padding: "8px 12px" });
  scroll.setAttribute("data-scroll", "shop");
  const items = (S.shop && S.shop.items) || [];
  if (!S.shop) scroll.appendChild(el("div", { color: INK.dim }, L().waiting));
  else if (!items.length) scroll.appendChild(el("div", { color: INK.dim }, L().shopEmpty));
  else {
    const grid = el("div", { display: "grid", gridTemplateColumns: "minmax(160px,1.6fr) 110px 1fr 1fr 60px 80px", gap: "6px 10px", alignItems: "center" });
    for (const c of L().shopCols) grid.appendChild(el("div", { color: INK.accent, fontSize: "11px", letterSpacing: ".04em", borderBottom: "1px solid " + INK.line, paddingBottom: "3px" }, c));
    const set = (it, field, value) => { it[field] = value; send({ kind: "shopSet", id: it.id, field, value }); };
    let total = 0;
    for (const it of items) {
      total += it.priceSpoins;
      const nameBox = el("div", { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" });
      nameBox.appendChild(input(it.name, (v) => set(it, "name", v), { commit: true }));
      const d = input(it.description, (v) => set(it, "description", v), { commit: true, placeholder: L().shopDesc }); d.style.fontSize = "11px"; d.style.color = INK.dim;
      nameBox.appendChild(d);
      nameBox.appendChild(el("div", { color: INK.dim, fontSize: "10px", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, it.id + " · " + L().shopEffect + ": " + (it.onPurchase || L().shopDonation)));
      grid.appendChild(nameBox);
      grid.appendChild(input(String(it.priceSpoins), (v) => { const n = Math.max(1, Math.round(Number(v) || 0)); set(it, "priceSpoins", n); draw(); }, { commit: true, numeric: true, mono: true }));
      grid.appendChild(el("div", { fontFamily: "ui-monospace, monospace" }, money(it.priceSpoins)));
      grid.appendChild(el("div", { fontFamily: "ui-monospace, monospace", color: INK.green }, money(Math.floor(it.priceSpoins / 2))));
      const cb = G.document.createElement("input"); cb.type = "checkbox"; cb.checked = it.once;
      cb.addEventListener("change", () => set(it, "once", cb.checked));
      grid.appendChild(cb);
      grid.appendChild(el("div", { color: INK.dim, fontFamily: "ui-monospace, monospace" }, String(it.ownersHere)));
    }
    scroll.appendChild(grid);
    scroll.appendChild(el("div", { marginTop: "12px", color: INK.dim, fontSize: "12px" }, L().shopTotal + ": " + total + " Spoins · " + money(total) + " → " + money(Math.floor(total / 2))));
  }
  pane.appendChild(scroll);
  body.appendChild(pane);
}

function tuneView(body) {
  const files = S.data.tune || [];
  const rail = el("div", { width: "150px", flex: "0 0 150px", borderRight: "1px solid " + INK.line, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)" });
  rail.appendChild(head(L().files));
  const list = el("div", { flex: "1", overflowY: "auto", padding: "4px" });
  list.setAttribute("data-scroll", "tunefiles");
  for (const f of files) {
    const d = S.tune[f]; const n = d ? d.knobs.filter(editable).length : 0;
    const it = listItem(fileLabel(f), f === S.tuneFile && !S.tuneQuery, () => { S.tuneFile = f; S.tuneQuery = ""; draw(); });
    it.title = f;
    it.appendChild(el("span", { color: INK.dim, fontSize: "11px", marginLeft: "auto" }, String(n)));
    list.appendChild(it);
  }
  rail.appendChild(list);
  body.appendChild(rail);

  const pane = el("div", { flex: "1", minWidth: "0", display: "flex", flexDirection: "column" });
  const top = el("div", { padding: "8px 12px", borderBottom: "1px solid " + INK.line });
  const q = input(S.tuneQuery, (v) => { S.tuneQuery = v; const pos = q.selectionStart; draw(); const n = S.win.querySelector("[data-tq]"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, { placeholder: "🔍 " + L().search });
  q.setAttribute("data-tq", "");
  top.appendChild(q);
  pane.appendChild(top);
  const scroll = el("div", { flex: "1", overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: "6px" });
  scroll.setAttribute("data-scroll", "tune");
  if (!files.length) scroll.appendChild(el("div", { color: INK.dim, padding: "10px 0" }, L().tuneEmpty));
  const guessed = files.reduce((n, f) => n + ((S.tune[f] && S.tune[f].knobs) || []).filter((k) => k.type === "number" && k.guessed).length, 0);
  if (guessed) {
    const note = el("div", { display: "flex", gap: "10px", alignItems: "center", padding: "8px 10px", border: "1px solid " + INK.accent, borderRadius: "6px", background: "rgba(230,180,80,0.08)" });
    note.appendChild(el("div", { flex: "1", fontSize: "12px" }, L().rangesNote(guessed)));
    note.appendChild(btn(L().rangesBtn, () => send({ kind: "tuneRanges" }), { background: INK.accent, color: "#1a1406", borderColor: INK.accent, fontWeight: "600", whiteSpace: "nowrap" }));
    scroll.appendChild(note);
  }
  const query = S.tuneQuery.trim().toLowerCase();
  if (query) {
    let hits = 0;
    for (const f of files) {
      const d = S.tune[f]; if (!d) continue;
      const ks = d.knobs.filter((k) => editable(k) && (k.path.join(".") + " " + pretty(k.key) + " " + (k.hint || "")).toLowerCase().includes(query));
      if (!ks.length) continue;
      scroll.appendChild(el("div", { color: INK.accent, fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", marginTop: "6px" }, fileLabel(f)));
      for (const k of ks) { scroll.appendChild(knobRow(d, k, true)); hits++; }
    }
    if (!hits) scroll.appendChild(el("div", { color: INK.dim }, L().noMatch));
  } else if (S.tuneFile && S.tune[S.tuneFile]) {
    const d = S.tune[S.tuneFile];
    if (d.desc) scroll.appendChild(el("div", { color: INK.dim, marginBottom: "4px" }, d.desc));
    let sec = "";
    for (const k of d.knobs) {
      if (k.section && k.section !== sec) { sec = k.section; scroll.appendChild(el("div", { color: INK.accent, fontWeight: "600", marginTop: "8px", borderBottom: "1px solid " + INK.line, paddingBottom: "2px" }, sec)); }
      if (k.type === "group") { scroll.appendChild(el("div", { fontWeight: "600", marginTop: "6px", paddingLeft: (k.depth * 14) + "px", color: INK.text }, "▾ " + pretty(k.key) + (k.hint ? "  — " + k.hint : ""))); continue; }
      scroll.appendChild(knobRow(d, k, false));
    }
    const foot = el("div", { marginTop: "auto", paddingTop: "14px", color: INK.dim, fontSize: "11px", fontFamily: "ui-monospace, monospace", userSelect: "text", wordBreak: "break-all" });
    foot.appendChild(el("div", {}, L().file + ": " + d.file));
    foot.appendChild(el("div", { marginTop: "3px" }, L().tuneHowTo));
    scroll.appendChild(foot);
  }
  pane.appendChild(scroll);
  body.appendChild(pane);
}

function knobRow(d, k, flat) {
  const id = d.file + "|" + k.path.join(".");
  const row = el("div", { display: "grid", gridTemplateColumns: "150px 1fr auto", gap: "8px", alignItems: "center", paddingLeft: flat ? "0" : (k.depth * 14) + "px" });
  const lb = el("div", { display: "flex", flexDirection: "column", minWidth: "0" });
  lb.appendChild(el("span", { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, pretty(k.key)));
  lb.appendChild(el("span", { color: INK.dim, fontSize: "10px", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, flat ? k.path.join(".") : k.key));
  if (k.hint) lb.title = k.hint;
  row.appendChild(lb);
  const setv = (v) => { k.value = v; send({ kind: "tuneSet", file: d.file, path: k.path, value: v }); };
  const orig = S.tuneOrig[id];
  const changed = orig !== undefined && orig !== k.value;
  const ctl = el("div", { display: "flex", gap: "6px", alignItems: "center", minWidth: "0" });
  if (k.type === "number") {
    const lo = Math.min(k.min, k.value), hi = Math.max(k.max, k.value);
    const r = G.document.createElement("input"); r.type = "range"; r.min = String(lo); r.max = String(hi); r.step = String(k.step || 0.01); r.value = String(k.value);
    Object.assign(r.style, { flex: "1", minWidth: "60px", accentColor: INK.accent });
    const num = input(String(k.value), (v) => { const n = parseFloat(v); if (isFinite(n)) { r.value = String(n); setv(n); } }, { commit: true, numeric: true, width: "72px" });
    num.style.textAlign = "right";
    r.addEventListener("input", () => { num.value = r.value; });
    r.addEventListener("change", () => { const n = parseFloat(r.value); setv(k.int ? Math.round(n) : n); });
    for (const ev of ["pointerdown", "wheel"]) r.addEventListener(ev, (e) => e.stopPropagation());
    ctl.appendChild(r); ctl.appendChild(num);
  } else if (k.type === "bool") {
    const c = G.document.createElement("input"); c.type = "checkbox"; c.checked = !!k.value;
    Object.assign(c.style, { width: "18px", height: "18px", accentColor: INK.accent });
    c.addEventListener("change", () => setv(c.checked));
    ctl.appendChild(c);
  } else if (k.type === "text") {
    const t = input(String(k.value), (v) => setv(v), { commit: true });
    ctl.appendChild(t);
    if (/^#[0-9a-f]{6}$/i.test(String(k.value))) {
      const c = G.document.createElement("input"); c.type = "color"; c.value = k.value;
      Object.assign(c.style, { width: "32px", height: "26px", border: "none", background: "transparent", padding: "0" });
      c.addEventListener("change", () => { t.value = c.value; setv(c.value); });
      ctl.appendChild(c);
    }
  } else {
    ctl.appendChild(el("span", { color: INK.dim, fontFamily: "ui-monospace, monospace", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, String(k.value) + "  · " + L().readOnly));
  }
  row.appendChild(ctl);
  row.appendChild(changed ? btn("↺", () => setv(orig), { minHeight: "24px", padding: "0 7px", color: INK.accent }, L().reset + ": " + orig) : el("span", { width: "30px" }));
  const wrap = el("div", { display: "flex", flexDirection: "column", gap: "1px" });
  wrap.appendChild(row);
  if (k.hint) wrap.appendChild(el("div", { color: INK.dim, fontSize: "11px", paddingLeft: ((flat ? 0 : k.depth * 14) + 158) + "px" }, k.hint));
  return wrap;
}

/* ------------------------------------------------------------- bits */

function el(tag, styles, text) {
  const n = G.document.createElement(tag);
  if (styles) Object.assign(n.style, styles);
  if (text !== undefined) n.textContent = text;
  return n;
}

function btn(label, onClick, styles, title) {
  const b = el("button", Object.assign({ minHeight: "30px", padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid " + INK.line, borderRadius: "2px", color: INK.text, font: "inherit", cursor: "pointer", whiteSpace: "nowrap" }, styles || {}), label);
  if (title) b.title = title;
  b.addEventListener("click", (e) => { e.stopPropagation(); onClick(e); });
  return b;
}

function armedBtn(key, label, onFire) {
  const armed = S.armed === key;
  return btn(armed ? L().confirm : label, () => {
    if (S.armed === key) { S.armed = null; onFire(); return; }
    S.armed = key; draw();
    G.setTimeout(() => { if (S && S.armed === key) { S.armed = null; draw(); } }, 2500);
  }, { minHeight: "26px", color: armed ? "#fff" : INK.red, background: armed ? INK.red : "rgba(255,255,255,0.06)", borderColor: armed ? INK.red : INK.line });
}

function inputStyle(o) {
  return { background: INK.input, border: "1px solid " + INK.line, borderRadius: "2px", color: INK.text, font: o && o.mono ? "12px ui-monospace, monospace" : "inherit", padding: "4px 6px", minHeight: "26px", boxSizing: "border-box", width: (o && o.width) || "100%", minWidth: "0" };
}

// commit: true → fires on Enter / blur only when the value changed.
function input(value, onValue, o) {
  o = o || {};
  const n = G.document.createElement("input");
  n.type = "text"; n.value = value;
  if (o.numeric) n.inputMode = "decimal";
  if (o.placeholder) n.placeholder = o.placeholder;
  Object.assign(n.style, inputStyle(o));
  let last = value;
  const fire = () => { if (n.value === last) return; last = n.value; onValue(n.value); };
  if (o.commit) {
    n.addEventListener("keydown", (e) => { if (e.key === "Enter") { n.blur(); } else if (e.key === "Escape") { n.value = last; n.blur(); } });
    n.addEventListener("blur", () => { fire(); if (S && S.dirty) G.setTimeout(() => { const a = G.document.activeElement; if (S && S.dirty && !(a && S.win.contains(a) && a.tagName === "INPUT")) draw(); }, 0); });
    if (o.numeric) n.addEventListener("wheel", (e) => { if (G.document.activeElement !== n) return; e.preventDefault(); const cur = parseFloat(n.value) || 0; n.value = String(Math.round((cur + (e.deltaY < 0 ? 1 : -1)) * 1e6) / 1e6); }, { passive: false });
  } else n.addEventListener("input", () => onValue(n.value));
  return n;
}

function mini(label, control) {
  const w = el("label", { display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", color: INK.dim });
  w.appendChild(el("span", {}, label)); w.appendChild(control);
  return w;
}

function fieldRow(label, control) {
  const row = el("div", { display: "grid", gridTemplateColumns: "120px 1fr auto", gap: "8px", alignItems: "center" });
  row.appendChild(el("span", { color: INK.dim }, label)); row.appendChild(control); row.appendChild(el("span", { width: "30px" }));
  return row;
}

function head(text) {
  return el("div", { padding: "6px 8px", fontSize: "11px", color: INK.dim, letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid " + INK.line, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, text);
}

function listItem(text, selected, onClick) {
  const n = el("div", { display: "flex", alignItems: "center", gap: "6px", padding: "5px 7px", borderRadius: "2px", cursor: "pointer", background: selected ? INK.sel : "transparent", color: selected ? INK.accent : INK.text, borderLeft: "2px solid " + (selected ? INK.accent : "transparent") }, text || undefined);
  n.addEventListener("click", onClick);
  n.addEventListener("mouseenter", () => { if (!selected) n.style.background = "rgba(255,255,255,0.04)"; });
  n.addEventListener("mouseleave", () => { if (!selected) n.style.background = "transparent"; });
  return n;
}

function seg(options, value, onPick) {
  const w = el("div", { display: "flex", border: "1px solid " + INK.line, borderRadius: "2px", overflow: "hidden" });
  for (const [v, label] of options) {
    const on = v === value;
    w.appendChild(btn(label, () => onPick(v), { minHeight: "26px", padding: "2px 8px", border: "none", borderRadius: "0", background: on ? INK.accent : "transparent", color: on ? "#1a1406" : INK.dim, fontWeight: on ? "600" : "400" }));
  }
  return w;
}

function resizeGrip() {
  const g = el("div", { position: "absolute", right: "0", bottom: "0", width: "14px", height: "14px", cursor: "nwse-resize", background: "linear-gradient(135deg, transparent 50%, " + INK.line + " 50%)" });
  g.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ow = S.layout.w, oh = S.layout.h;
    const mv = (ev) => { S.layout.w = clamp(ow + ev.clientX - sx, 460, G.innerWidth); S.layout.h = clamp(oh + ev.clientY - sy, 260, G.innerHeight); S.win.style.width = S.layout.w + "px"; S.win.style.height = S.layout.h + "px"; };
    const up = () => { G.removeEventListener("pointermove", mv); G.removeEventListener("pointerup", up); saveLayout(); };
    G.addEventListener("pointermove", mv); G.addEventListener("pointerup", up);
  });
  return g;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lsGet(k) { try { return G.localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { G.localStorage.setItem(k, v); } catch (e) {} }

function loadLayout() {
  const vw = G.innerWidth || 1280, vh = G.innerHeight || 720;
  const d = { w: Math.min(760, vw - 120), h: Math.min(500, vh - 120) };
  d.x = Math.max(12, Math.round((vw - d.w) / 2)); d.y = Math.max(12, Math.round((vh - d.h) / 2.4));
  try {
    const s = JSON.parse(lsGet(LS_LAYOUT) || "null");
    if (s && isFinite(s.x)) return { x: clamp(s.x, 0, vw - 120), y: clamp(s.y, 0, vh - 60), w: clamp(s.w, 460, vw), h: clamp(s.h, 260, vh) };
  } catch (e) {}
  return d;
}
function saveLayout() { lsSet(LS_LAYOUT, JSON.stringify(S.layout)); }
