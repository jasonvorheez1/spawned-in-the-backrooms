// Document policy only. Never follows file paths, CDN references, or linked projects.
export const DOCUMENT_BOOKS = [
  { id: "RESEARCH0BOOK", name: "Research" },
  { id: "0MUSIC00BOOK0", name: "Sound Studio" },
  { id: "ASSET00STUDIO", name: "Asset Studio" },
];
export function isExportable(id) {
  const key = String(id == null ? "" : id).trim().toUpperCase();
  return !!key && key !== "CODEX0000BOOK" && key !== "WWSCODE0BOOK";
}
export function assertExportable(id) {
  if (!isExportable(id)) throw new Error("This book is not available for document export.");
}
export function isDocumentBook(id) {
  return DOCUMENT_BOOKS.some((b) => b.id === String(id));
}
export function exportBooks(rows) {
  const out = [], seen = {};
  for (const b of DOCUMENT_BOOKS.concat(rows || [])) {
    if (!b || !isExportable(b.id) || seen[b.id]) continue;
    seen[b.id] = true; out.push({ id: String(b.id), name: String(b.name || "Book") });
  }
  return out;
}
module.exports = { DOCUMENT_BOOKS, isExportable, assertExportable, isDocumentBook, exportBooks };
