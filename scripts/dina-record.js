import { setDinaStep, questVoice } from "./lib/dina-quest.js";

const RECORDS = {
  freight: {
    stage: 7,
    min: 6,
    text: "C-23. One waterproof case from the Adventure. Pickup at the Electrical Station checkpoint. Paid in batteries. Signed, Voss",
    voice: "bntg-voss", line: "C-23. One waterproof case from the Adventure. Pickup at the Electrical Station checkpoint. Paid in batteries.",
    early: "A stack of freight slips. Every delivery has a ticket number. None of them mean anything to you yet.",
    notice: "Freight slip C-23 names the Electrical Station checkpoint.",
  },
  // detours (Nov 13): side stops on the way, kept as flags so saved games keep their stage numbers
  crate: {
    flag: "dinaCrate", min: 7,
    text: "Empty battery cells, a waybill stub for C-23 and a chalk arrow toward the barred door marked 3. The courier came through here on the way to the Electrical Station.",
    early: "A battery crate. Empty cells, and a torn waybill you can't make sense of.",
    notice: "The courier's crate: C-23 went through Level 2 toward the Electrical Station.",
  },
  carbon: {
    flag: "dinaCarbon", min: 8,
    text: "The torn-out carbon from the handoff log. RETURN TEST 04, filed by RIVER, copy to the Base Gamma public records. Someone has drawn a little smiling face in the margin.",
    early: "A carbon copy of some test filing. The names mean nothing to you yet.",
    notice: "River's carbon copy: Return Test 04 was filed at Base Gamma.",
  },
  handoff: {
    stage: 8, needs: "dinaCrate",
    min: 4,
    text: "C-23 canceled. The stowaway never turned up. River filed a copy of the test results before the drive went missing. Look up Return Test 04 at Base Gamma.",
    early: "A handoff log. The page is indexed by freight ticket. Somebody tore out the carbon paper.",
    notice: "Found River's test number. Check the public records at Base Gamma.",
  },
  archive: {
    stage: 9, needs: "dinaCarbon",
    min: 8,
    text: "RETURN TEST 04. A phone rang on the other side. The operator gave the date. We called again and a second operator gave the same date. When we sent a runner through, she came back on Level 1. Voice contact confirmed. Crossing unverified.",
    early: "The public index lists return experiments by number. Most files are marked UNVERIFIED.",
    notice: "Chapter 1 complete. A signal made it through. A person hasn't.",
  },
};

export const ears = {
  press(ctx, event) {
    const st = ctx.getObject(event?.by)?.state;
    if (ctx.self.state.kind === "cassette") { // Dina's own tape, a real cassette by the log: pocket it, play it on HALOGEN (I > Misc)
      const p = ctx.getObject(event?.by), have = String(st.holotapes ?? "").split(",").filter(Boolean);
      if (!have.includes("dina4")) { st.holotapes = [...have, "dina4"].join(","); st.notice = { text: "Dina, Tape Four · in your bag · play it on HALOGEN (I > Misc)", at: ctx.now() }; }
      else st.notice = { text: "You already have Dina's tape.", at: ctx.now() };
      if (p) p.hidden = [...(p.hidden ?? []), ctx.self.id]; // gone from your hand's side of the shelf
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cassette-tape-pickup-plastic-clack.mp3", position: ctx.self.feetPosition, volume: 0.7 }, { audience: { player: event.by } });
      return;
    }
    const record = RECORDS[ctx.self.state.kind];
    if (!st || !record) return;
    const known = (st.dinaQ ?? 0) >= record.min;
    if (known && record.flag) { if (!st[record.flag]) { st[record.flag] = 1; st.notice = { text: record.notice, at: ctx.now() }; } }
    else if (known && record.needs && !st[record.needs] && (st.dinaQ ?? 0) < record.stage) { st.notice = { text: record.needs === "dinaCrate" ? "The log is indexed by ticket, but C-23's page makes no sense without the courier's waybill." : "The public index says the file was copied from somewhere else. Find the carbon first.", at: ctx.now() }; }
    else if (known) setDinaStep(ctx, st, record.stage, record.notice);
    st.sub = { who: ctx.self.state.name, t: known ? record.text : record.early, at: ctx.now(), d: 15000 };
    questVoice(ctx, known ? record.voice ?? "q-clerk" : "q-clerk", known ? record.line ?? record.text : record.early, event.by);
  },
};
