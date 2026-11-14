// Shared lightweight interactables for cross-level quest props (Level 3 Guild plate, Level 6 acoustic relay).
import { heard } from "./lib/hear.js";
import { setStep61 } from "./lib/level61-quests.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), w = who?.state;
    if (!w) return;
    const now = ctx.now(), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const note = (text) => { w.notice = { text, at: now }; };

    if (s.kind === "l3-guild-plate") {
      heard(ctx, { clip: G("paper-flip-card-stand"), position: pos, volume: 0.45, maxDistance: 10 });
      if (w.l61GuildQ === 1) {
        if (!w.l61L3Logged) { w.l61L3Logged = 1; w.payout = { xp: 25, items: [] }; }
        setStep61(ctx, who, "guild", 2, "Four Hundred and Thirteen · Logged Level 3 suction grille · Ride the lift to Level 4's break room");
        return;
      }
      note("GUILD OF MANY · WAY #412B: Suction vent from the Snackrooms drops above the Level 2 bulkhead. One-way unless crawled back.");
      return;
    }

    if (s.kind === "l6-meg-relay") {
      heard(ctx, { clip: G("walkie-talkie-radio-click-static-burst"), position: pos, volume: 0.55, maxDistance: 12 });
      if (w.l61RelayTape) {
        note("M.E.G. Relay 6-A: Magnetic tape already pulled. Same 60-hertz ballast bleed as Seal 6.1-02.");
        return;
      }
      w.l61RelayTape = 1;
      w.payout = { xp: 30, items: [] };
      note(w.l61SealQ >= 1 && w.l61SealQ < 99
        ? "Relay 6-A tape recovered (+30 XP): the 03:14 tune is bleeding off a wet transformer beside the Level 6 tripwire. Show Vale at Base Gamma."
        : "Recovered M.E.G. Relay 6-A acoustic tape (+30 XP): flooded ballast hum matching 6.1's back hall.");
    }
  },
};
