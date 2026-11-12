import { setDinaStep, questVoice } from "./lib/dina-quest.js";

const RECORDS = {
  freight: {
    stage: 7,
    min: 6,
    text: "C-23. One waterproof case from the Adventure. Pickup at the Electrical Station checkpoint. Paid in batteries. — Voss",
    voice: "bntg-voss", line: "C-23. One waterproof case from the Adventure. Pickup at the Electrical Station checkpoint. Paid in batteries.",
    early: "Freight slips from the Habitable Zone. Each delivery has a ticket number.",
    notice: "Freight slip C-23 names the Electrical Station checkpoint.",
  },
  handoff: {
    stage: 8,
    min: 4,
    text: "C-23 canceled. The stowaway never turned up. River filed a copy of the test results before the drive went missing. Look up Return Test 04 at Base Gamma.",
    early: "A handoff log. The page is indexed by freight ticket. Somebody tore out the carbon paper.",
    notice: "Found River's test number. Check the public records at Base Gamma.",
  },
  archive: {
    stage: 9,
    min: 8,
    text: "RETURN TEST 04. A phone rang on the other side. The operator gave the date. We called again and a second operator gave the same date. When we sent a runner through, she came back on Level 1. Voice contact confirmed. Crossing unverified.",
    early: "The public index lists return experiments by number. Most files are marked UNVERIFIED.",
    notice: "Chapter 1 complete. A signal made it through. A person hasn't.",
  },
};

export const ears = {
  press(ctx, event) {
    const st = ctx.getObject(event?.by)?.state;
    const record = RECORDS[ctx.self.state.kind];
    if (!st || !record) return;
    const known = (st.dinaQ ?? 0) >= record.min;
    if (known) setDinaStep(ctx, st, record.stage, record.notice);
    st.sub = { who: ctx.self.state.name, t: known ? record.text : record.early, at: ctx.now(), d: 15000 };
    questVoice(ctx, known ? record.voice ?? "q-clerk" : "q-clerk", known ? record.line ?? record.text : record.early, event.by);
  },
};
