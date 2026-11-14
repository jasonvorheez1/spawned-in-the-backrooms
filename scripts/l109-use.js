import { ears as computer } from "./computer.js";
// Level 109 shared interactables: corridor switches/intercoms/coolers/vending and department equipment.
import { heard } from "./lib/hear.js";
import { skillsOf } from "./lib/stats.js";
import { queuePayout, payOnce } from "./lib/quests.js";

const SFX = "/cdn/moodboard-realistic-gritty/";
const HOUR = 3600000;
const TROFFER_ON = { color: "#fffdf2", emissive: "#fff6dc", emissiveIntensity: 2.4 };
const TROFFER_OFF = { color: "#8a887c" };

const PAGES_RE = (s, n) => String(s.pages ?? "").split(",").includes(String(n));

const DISPATCHES = [
  "NURSE CALL 109: Outpost East is 424 metres east of the first cross hall. marked EXIT sits 1.3 km west.",
  "PA LINE (STATIC): Dr. Vance to Theatre Four. Please ignore any knocking from inside Theatre Four.",
  "TELEMETRY: Three wards on corridor NS-0 remain sealed. Do not open doors marked red on Halloran's board.",
  "DISPATCH: Negative-pressure biohazard bays have green purge switches just outside the plastic strip curtain.",
  "VOICE ON HOLD: ...thirty-one segments, thirty-two... wait, why is my monitor still beeping from yesterday...",
  "SUB-LEVEL RELAY: Basement stairwell off the arrival hall west wall is closed under M.E.G. Order 109-C.",
];

const VITALS = [
  "ECG TRACE: 38 BPM · sinus pause. Nobody is in this bed.",
  "VITALS LOG: Last alarm tripped 14 days after evacuation. Silencing chime.",
  "CHART BUFFER: SpO2 99% · ambient pressure fluctuating along exterior corridor.",
  "PUMP STATUS: Intravenous line dry. Battery pack intact inside housing.",
];

function book(ctx, key, id, val) {
  const s = ctx.place.state, b = { ...(s[key] ?? {}) };
  if (val === undefined) delete b[id];
  else b[id] = val;
  s[key] = b;
}

function usedAt(ctx, id) {
  const until = ctx.place.state.l109Used?.[id] ?? 0;
  return until > ctx.now();
}

function markUsed(ctx, id, ms = HOUR) {
  book(ctx, "l109Used", id, ctx.now() + ms);
}

function toast(ctx, who, text, clip, pos, vol = 0.6) {
  who.state.notice = { text, at: ctx.now() };
  if (clip) heard(ctx, { clip: SFX + clip, position: pos, volume: vol, maxDistance: 16 });
}

function sub(who, title, text, d = 4800, now) {
  who.state.sub = { who: title, t: text, at: now, d };
}

function setTroffers(ctx, seg, on) {
  for (const du of [-4, 4]) {
    const t = ctx.getObject(`l109s-${seg}-l${du}`);
    if (!t) continue;
    t.material = on ? TROFFER_ON : TROFFER_OFF;
    t.light = on ? { kind: "point", color: "#fff3d6", intensity: 2.2, distance: 11, shadow: { enabled: false } } : null;
  }
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), w = who?.state;
    if (!s || !w) return;
    if (s.kind === "terminal") {
      const prefix = s.mode === "outpost" ? "L109-TRIAGE-" : s.mode === "supply" ? "L109-STOCK-" : s.mode === "lore" ? "L109-LORE-" : "L109-WARD-";
      s.host ??= prefix + (s.roomId ?? "OUTPOST");
      if (s.mode === "supply") s.lock ??= "science:25";
      return computer.press(ctx, { by });
    }
    const now = ctx.now(), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const sk = skillsOf(w), ses = ((ctx.self.session.by ??= {})[who.id] ??= {}); // cooldowns per presser, kept on this fixture's own session (another body's session is not ours to write)

    if (s.kind === "intercom") {
      heard(ctx, { clip: SFX + "sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3", position: pos, volume: 0.6, maxDistance: 14 });
      heard(ctx, { clip: SFX + "sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3", position: pos, volume: 0.55, maxDistance: 10 }, { audience: { player: who.id } });
      const idx = ((s.idx ?? 0) + (s.turns ?? 0)) % DISPATCHES.length;
      s.turns = (s.turns ?? 0) + 1;
      sub(who, "HOSPITAL INTERCOM", DISPATCHES[idx], 5200, now);
      ctx.emit("noise", { position: pos, radius: 12, kind: "intercom" }, { audience: { nearby: pos, radius: 12 } });
      if (payOnce(w, "l109-intercom")) queuePayout(w, { xp: 20, items: [], text: "Logged hospital intercom channel (+20 XP)" });
      return;
    }

    if (s.kind === "breaker") {
      if (s.tripped && !s.repaired) {
        if ((sk.repair ?? 0) >= 20 || (sk.science ?? 0) >= 25) {
          s.repaired = true;
          s.tripped = false;
          book(ctx, "l109Dark", s.seg, undefined);
          setTroffers(ctx, s.seg, true);
          s.verb = "Cut Lights";
          s.info = "circuit restored";
          if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, on: true, tripped: false } };
          toast(ctx, who, "Ballast fault cleared · corridor lights restored", "sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3", pos, 0.7);
          if (payOnce(w, "l109-breaker")) queuePayout(w, { xp: 25, items: [], text: "First wing circuit restored (+25 XP)" });
          return;
        }
        toast(ctx, who, "Tripped circuit · requires Repair 20 or Science 25 to reset", "sfx-ui-denied-click.mp3", pos, 0.45);
        return;
      }
      const dark = !ctx.place.state.l109Dark?.[s.seg];
      book(ctx, "l109Dark", s.seg, dark ? 1 : undefined);
      setTroffers(ctx, s.seg, !dark);
      s.verb = dark ? "Restore Lights" : "Cut Lights";
      s.info = dark ? "lights cut · quiet ballast" : "power on";
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, on: !dark } };
      ctx.emit("noise", { position: pos, radius: 18, kind: "breaker" }, { audience: { nearby: pos, radius: 18 } });
      toast(ctx, who, dark ? "Wing breaker thrown OFF · troffers cut" : "Wing breaker thrown ON", "sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3", pos, 0.75);
      return;
    }

    if (s.kind === "alarm") {
      if (now < (s.coolAt ?? 0)) { toast(ctx, who, "Alarm bell resetting...", "sfx-ui-denied-click.mp3", pos, 0.4); return; }
      s.coolAt = now + 15000;
      heard(ctx, { clip: SFX + "sfx-building-security-alarm-bell-ringing-short.mp3", position: pos, volume: 0.9, maxDistance: 36 });
      ctx.emit("noise", { position: pos, radius: 34, kind: "alarm" }, { audience: { nearby: pos, radius: 34 } });
      toast(ctx, who, "Code Blue alarm tripped — nearby hostiles will investigate!");
      return;
    }

    if (s.kind === "cooler" || s.kind === "sink" || s.kind === "kettle") {
      const key = s.kind === "cooler" ? "l109CoolAt" : s.kind === "sink" ? "l109WashAt" : "l109TeaAt";
      const cd = s.kind === "kettle" ? 120000 : 45000;
      if (now < (ses[key] ?? 0)) { toast(ctx, who, s.kind === "kettle" ? "Kettle is still warming up." : "You already cooled off recently.", "sfx-ui-denied-click.mp3", pos, 0.4); return; }
      ses[key] = now + cd;
      const hpAdd = s.kind === "kettle" ? 10 : s.kind === "cooler" ? 4 : 0;
      const sanAdd = s.kind === "kettle" ? 14 : s.kind === "sink" ? 6 : 6;
      const staAdd = s.kind === "kettle" ? 25 : 30;
      if (hpAdd) w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 100) + hpAdd);
      w.sanity = Math.min(100, (w.sanity ?? 80) + sanAdd);
      w.stamina = Math.min(100, (w.stamina ?? 60) + staAdd);
      if (s.kind !== "sink") w.thirst = Math.min(100, (w.thirst ?? 60) + (s.kind === "kettle" ? 25 : 30));
      const clip = s.kind === "sink" ? "sfx-shower-water-running-then-turned-off-squeak.mp3" : "sfx-cupped-hands-scooping-and-drinking-water-gulp.mp3";
      const msg = s.kind === "kettle" ? "Hot almond tea · +10 HP · +14 Sanity" : s.kind === "cooler" ? "Cold filtered water · +4 HP · +6 Sanity · Stamina" : "Cold scrub · +6 Sanity · +20 Stamina";
      toast(ctx, who, msg, clip, pos, 0.65);
      return;
    }

    if (s.kind === "vending") {
      const uid = s.uid ?? ctx.self.id;
      if ((w.cents ?? 0) >= 100 && now >= (ses.l109VendAt ?? 0)) {
        ses.l109VendAt = now + 8000;
        w.cents -= 100;
        const pool = ["purified_water", "almond", "diner_coffee", "sprite", "bar"];
        const item = pool[Math.floor(ctx.random() * pool.length)];
        queuePayout(w, { xp: 0, items: [item], text: `Vending machine dispensed (${item.replace("_", " ")}) · -$1.00` });
        heard(ctx, { clip: SFX + "sfx-vending-machine-heavy-clunk.mp3", position: pos, volume: 0.7, maxDistance: 16 });
        return;
      }
      if (!usedAt(ctx, uid) && ((sk.lockpick ?? 0) >= 25 || (sk.repair ?? 0) >= 20)) {
        markUsed(ctx, uid);
        queuePayout(w, { xp: 0, items: ["almond", "bandage"], text: "Freed jammed tray · +Almond Water, +Bandage" });
        heard(ctx, { clip: SFX + "sfx-vending-machine-heavy-clunk.mp3", position: pos, volume: 0.75, maxDistance: 16 });
        return;
      }
      toast(ctx, who, "Insert $1.00 (or Lockpick 25 / Repair 20 when jammed)", "sfx-ui-denied-click.mp3", pos, 0.45);
      return;
    }

    if (s.kind === "monitor") {
      const uid = s.uid ?? ctx.self.id;
      if (s.on) {
        s.on = false;
        s.verb = "Inspect Housing";
        s.info = "silenced";
        if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, on: false } };
        const msg = VITALS[Math.floor(ctx.random() * VITALS.length)];
        sub(who, "PATIENT MONITOR", msg, 4500, now);
        toast(ctx, who, "Monitor silenced", "sfx-soft-pda-beep-confirm.mp3", pos, 0.55);
        return;
      }
      if (!usedAt(ctx, uid) && ((sk.medicine ?? 0) >= 20 || (sk.repair ?? 0) >= 20)) {
        markUsed(ctx, uid);
        const drop = (sk.repair ?? 0) >= 20 ? "circuit" : "battery";
        s.info = "salvaged";
        queuePayout(w, { xp: 0, items: [drop], text: `Salvaged ${drop} from monitor` });
        heard(ctx, { clip: SFX + "sfx-computer-terminal-beep-confirm.mp3", position: pos, volume: 0.55, maxDistance: 10 });
        return;
      }
      toast(ctx, who, "Dead monitor · Medicine 20 or Repair 20 can salvage parts", "sfx-ui-denied-click.mp3", pos, 0.4);
      return;
    }

    if (s.kind === "surglamp") {
      s.on = !s.on;
      s.verb = s.on ? "Switch Off" : "Switch On";
      s.info = s.on ? "spot lit" : "off";
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, on: s.on } };
      ctx.self.light = s.on ? { kind: "spot", color: "#fff8ea", intensity: 5, distance: 7, angle: 55, penumbra: 0.6, aim: s.aim ?? { x: pos.x, y: 0, z: pos.z }, shadow: { enabled: false } } : null;
      toast(ctx, who, s.on ? "Surgical lamp ON" : "Surgical lamp OFF", "sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3", pos, 0.45);
      return;
    }

    if (s.kind === "gas") {
      const uid = s.uid ?? ctx.self.id;
      if (!usedAt(ctx, uid) && ((sk.repair ?? 0) >= 25 || (sk.science ?? 0) >= 25)) {
        markUsed(ctx, uid);
        queuePayout(w, { xp: 0, items: ["brass_valve", "copper_coil"], text: "Bled manifold · +Valve, +Copper coil" });
        heard(ctx, { clip: SFX + "sfx-rusty-iron-valve-handwheel-quarter-turn-squeal.mp3", position: pos, volume: 0.65, maxDistance: 12 });
        return;
      }
      if (now < (ses.l109O2At ?? 0)) { toast(ctx, who, "O2 regulator pressure rebuilding.", "sfx-ui-denied-click.mp3", pos, 0.4); return; }
      ses.l109O2At = now + 60000;
      w.sanity = Math.min(100, (w.sanity ?? 80) + 10);
      w.stamina = Math.min(100, (w.stamina ?? 60) + 45);
      toast(ctx, who, "Pure O2 hit · +10 Sanity · +45 Stamina", "sfx-pipe-vents-freezing-steam-loud-hiss.mp3", pos, 0.5);
      return;
    }

    if (s.kind === "curtain") {
      const drawn = (ctx.self.primitive?.params?.drawn ?? 0.6) > 0.55 ? 0.25 : 0.85;
      s.verb = drawn > 0.55 ? "Open Curtain" : "Draw Curtain";
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, drawn } };
      heard(ctx, { clip: SFX + "sfx-bedsheets-rustle-settle-sigh.mp3", position: pos, volume: 0.6, maxDistance: 10 });
      const uid = s.uid ?? ctx.self.id;
      if (s.stash && !usedAt(ctx, uid)) {
        markUsed(ctx, uid);
        const drop = s.stash;
        s.stash = "";
        queuePayout(w, { xp: 0, items: [drop], text: `Found behind curtain: ${drop}` });
        return;
      }
      toast(ctx, who, drawn > 0.55 ? "Curtain drawn" : "Curtain pulled back");
      return;
    }

    if (s.kind === "shutter") {
      if (s.lock) {
        const need = Number(String(s.lock).split(":")[1] ?? 35);
        if ((sk.lockpick ?? 0) < need && (sk.repair ?? 0) < 25) {
          toast(ctx, who, `Shutter jammed · needs Lockpick ${need} or Repair 25`, "sfx-ui-denied-click.mp3", pos, 0.5);
          return;
        }
        s.lock = "";
      }
      const open = (ctx.self.primitive?.params?.open ?? 0.12) > 0.5 ? 0.12 : 0.85;
      s.verb = open > 0.5 ? "Lower Shutter" : "Raise Shutter";
      s.info = open > 0.5 ? "window open" : "closed";
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, open } };
      toast(ctx, who, open > 0.5 ? "Dispensary shutter raised" : "Dispensary shutter lowered", "sfx-pneumatic-sliding-metal-door-hiss-open.mp3", pos, 0.7);
      return;
    }

    if (s.kind === "tube") {
      const uid = s.uid ?? ctx.self.id;
      if (usedAt(ctx, uid)) { toast(ctx, who, "Pneumatic tube pressure rebuilding · check back later.", "sfx-ui-denied-click.mp3", pos, 0.45); return; }
      markUsed(ctx, uid);
      s.info = "recharging";
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, ready: false } };
      const items = ["bandage", "almond"];
      if (ctx.random() < 0.45) items.push("firstaid");
      if (ctx.random() < 0.4) items.push("cash:25");
      if (!PAGES_RE(w, 104)) items.push("page:104");
      const first = payOnce(w, "l109-tube");
      queuePayout(w, { xp: first ? 25 : 0, items, text: "Pneumatic capsule arrived!" });
      heard(ctx, { clip: SFX + "sfx-pneumatic-sliding-metal-door-hiss-open.mp3", position: pos, volume: 0.7, maxDistance: 14 });
      return;
    }

    if (s.kind === "decon") {
      if (s.purged || ctx.place.state.l109Purged?.[s.roomId]) {
        if (now < (ses.l109EyeAt ?? 0)) { toast(ctx, who, "Air clean · eyewash resetting.", "sfx-ui-denied-click.mp3", pos, 0.4); return; }
        ses.l109EyeAt = now + 45000;
        w.sanity = Math.min(100, (w.sanity ?? 80) + 8);
        if ((w.e19 ?? 0) > 0) { w.e19 = 0; toast(ctx, who, "Decon shower · the red fades. Entity 19 cleared", "sfx-shower-water-running-then-turned-off-squeak.mp3", pos, 0.55); return; }
        toast(ctx, who, "Eyewash rinse · +8 Sanity", "sfx-shower-water-running-then-turned-off-squeak.mp3", pos, 0.55);
        return;
      }
      s.purged = true;
      s.verb = "Use Eyewash";
      s.info = "scrubbers running · safe";
      if (s.roomId) book(ctx, "l109Purged", s.roomId, 1);
      if (ctx.self.primitive?.params) ctx.self.primitive = { ...ctx.self.primitive, params: { ...ctx.self.primitive.params, purged: true } };
      const hz = ctx.getObject(`l109o-${s.roomId}-hz`);
      if (hz) { hz.state.purged = true; hz.light = { kind: "point", color: "#eef8ff", intensity: 1.8, distance: 15, shadow: { enabled: false } }; }
      w.sanity = Math.min(100, (w.sanity ?? 80) + 12);
      const first = payOnce(w, "l109-bio-purge");
      queuePayout(w, { xp: first ? 35 : 0, items: [], text: "Negative-pressure purge complete · room air safe (+12 Sanity)" });
      heard(ctx, { clip: SFX + "sfx-pipe-vents-freezing-steam-loud-hiss.mp3", position: pos, volume: 0.8, maxDistance: 18 });
      return;
    }

    if (s.kind === "aed") {
      const uid = s.uid ?? ctx.self.id;
      if (!usedAt(ctx, uid) && (sk.medicine ?? 0) >= 20) {
        markUsed(ctx, uid);
        const first = payOnce(w, "l109-aed");
        queuePayout(w, { xp: first ? 20 : 0, items: ["firstaid", "bandage"], text: "Claimed triage AED trauma pouch" });
        heard(ctx, { clip: SFX + "sfx-plastic-hinged-cover-latch-pop-and-flip-open.mp3", position: pos, volume: 0.6, maxDistance: 10 });
        return;
      }
      if (now < (ses.l109AedAt ?? 0)) { toast(ctx, who, "AED trauma gel pack empty · Medicine 20 opens full pouch.", "sfx-ui-denied-click.mp3", pos, 0.4); return; }
      ses.l109AedAt = now + 60000;
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 100) + 6);
      toast(ctx, who, "Applied glucose & antiseptic swab (+6 HP · Medicine 20 for trauma kit)", "sfx-plastic-hinged-cover-latch-pop-and-flip-open.mp3", pos, 0.55);
      return;
    }

    if (s.kind === "board") {
      sub(who, "WARD WHITEBOARD (DR. HALLORAN)", "SAFE: ns0_n1p, ew0_13m, ew0_14m, ew0_13p · DO NOT OPEN: ns0_0m, ew0_6p (OPEN!!), ew0_9m · 'If it knocks, it is not a patient.'", 6500, now);
      toast(ctx, who, "Read ward whiteboard", "sfx-paper-notebook-page-flip.mp3", pos, 0.45);
      return;
    }


  },
};
