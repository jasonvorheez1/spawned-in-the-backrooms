// Plain speech: what comes out of the language model gets the habits people do not have taken off it before anyone reads or hears it.
// No *stage directions*, no "(sighs)", no dashes or semicolons (people do not talk in them), no curly quotes, no stacked exclamation marks, no sentence that starts by echoing the listener.
const STAGE = /^(?:sighs?|chuckles?|laughs?|smiles?|grins?|pauses?|nods?|shrugs?|winks?|whispers?|mutters?|coughs?|clears throat|looks|glances|leans|shakes|rubs|scratches|taps|he|she|they)\b/i;
export function plain(text) {
  let t = String(text ?? "");
  t = t.replace(/\*[^*\n]{1,80}\*/g, " ").replace(/\[[^\]\n]{1,60}\]/g, " ").replace(/\(([^()\n]{1,70})\)/g, (m, g) => (STAGE.test(g.trim()) ? " " : m));
  t = t.replace(/\s*[—–]\s*/g, ", ").replace(/\s+-\s+/g, ", ").replace(/;\s*/g, ". ");
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?").replace(/\.{4,}/g, "...");
  t = t.replace(/,\s*,/g, ",").replace(/,\s*([.!?])/g, "$1").replace(/\s+([,.!?])/g, "$1").replace(/\s+/g, " ").replace(/^[,.\s]+/, "").trim();
  // a stock opener or closer that every assistant-sounding line has
  t = t.replace(/^(?:ah|oh|well|hmm|ahh),?\s+(?=[a-z])/i, (m) => (Math.random() < 0.6 ? "" : m)).replace(/[\s.!?]*(?:anything else|let me know if you need anything|stay safe(?: out there)?|take care(?: out there)?|good luck(?: out there)?)[.!?]*$/i, ".").replace(/([^.])\.\.$/, "$1.").replace(/^\.$/, "");
  return t.replace(/^[a-z]/, (c) => c).trim();
}
