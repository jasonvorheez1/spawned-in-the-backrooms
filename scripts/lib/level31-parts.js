// Level 31's dressed zones. Each part is one file with one export lay<Part>(ctx); this file is the only list the sim reads.
const PARTS = [];
export function layParts(ctx) { for (const lay of PARTS) lay(ctx); }
