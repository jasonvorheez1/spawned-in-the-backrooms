export async function run(job, args) {
  const l = job.llm; const out = { type: typeof l, keys: [], src: String(l).slice(0, 300) };
  if (l && typeof l === "object") for (const k in l) out.keys.push(k + ":" + typeof l[k] + ":" + String(l[k]).slice(0, 200));
  try { const r = await (typeof l === "function" ? l({ message: "say hi in 3 words", system: "be brief" }) : l.chat({ message: "say hi in 3 words", system: "be brief" })); out.r = r; } catch (e) { out.err = String(e); }
  return out;
}
