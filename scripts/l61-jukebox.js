// Level 6.1 "The Snackrooms" - Interactive 80s Internet Radio Jukebox
// Streams live HTTPS internet radio stations directly in 3D spatial audio
import { heard } from "./lib/hear.js";

export const STATIONS = [
  {
    id: "heart80s",
    name: "A1 · Side A",
    genre: "Pop Hits & New Wave",
    url: "https://media-ssl.musicradio.com/Heart80sMP3",
    color: "#ff3888",
    badge: "#ff6bb0",
  },
  {
    id: "somafm80s",
    name: "B4 · Side B",
    genre: "Late Night Synth",
    url: "https://ice6.somafm.com/u80s-128-mp3",
    color: "#00d8f0",
    badge: "#5ce6ff",
  },
  {
    id: "rock80s",
    name: "C7 · Side C",
    genre: "Arena Rock",
    url: "https://0n-classicrock.radionetz.de/0n-classicrock.mp3",
    color: "#ffaa20",
    badge: "#ffd060",
  },
];

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

function renderDisplay(station, playing) {
  if (!playing || !station) {
    return `<div face="front" width="0.75m" style="font-family:'Courier New',monospace;font-weight:900;background:#0d0d12;color:#555566;padding:12px;border:2px solid #222233;text-align:center;line-height:1.2">
      <div style="font-size:32px;color:#884444;margin-bottom:6px">JUKEBOX STANDBY</div>
      <div style="font-size:22px;color:#444455">[PRESS E TO PLAY]</div>
      <div style="font-size:18px;color:#333344;margin-top:6px">WURLITZER · A · B · C</div>
    </div>`;
  }

  return `<div face="front" width="0.75m" style="font-family:Arial,sans-serif;font-weight:900;background:#0d0d18;color:#ffffff;padding:12px;border:2px solid ${station.color};text-align:center;line-height:1.15;box-shadow:inset 0 0 15px rgba(255,255,255,0.2)">
    <div style="font-size:22px;color:${station.badge};letter-spacing:1px;margin-bottom:4px">★ NOW PLAYING ★</div>
    <div style="font-size:42px;color:#ffffff;font-weight:900;border-bottom:1px solid ${station.color};padding-bottom:4px;margin-bottom:6px">${station.name.toUpperCase()}</div>
    <div style="font-size:24px;color:${station.badge};margin-bottom:6px">${station.genre.toUpperCase()}</div>
    <div style="font-size:20px;color:#88ff88;letter-spacing:2px">● PLAYING ●</div>
    <div style="font-size:18px;color:#ffd700;margin-top:4px">[E: NEXT RECORD / OFF]</div>
  </div>`;
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;

    // Cycle: Off -> Station 0 -> Station 1 -> Station 2 -> Off
    let idx = s.stationIndex ?? 0;
    if (!s.playing) {
      s.playing = true;
      idx = 0;
    } else {
      idx++;
      if (idx >= STATIONS.length) {
        s.playing = false;
        idx = 0;
      }
    }

    s.stationIndex = idx;
    const cur = STATIONS[idx];

    if (s.playing && cur) {
      // a live stream won't swap in place: drop the old one, tune the new one a beat later
      ctx.self.audio = null;
      s.tuneTo = idx;
      ctx.after(0.4, "tune", { idx });
      ctx.self.session.next = {
        clip: cur.url,
        gain: 0.65,
        loop: true,
        spatial: true,
        refDistance: 3.5,
        maxDistance: 45,
        bus: "Music",
      };
      ctx.self.session.next.clip = cur.url;

      // In-world UI update
      ctx.self.ui = renderDisplay(cur, true);

      // Sound feedback: coin drop and dial click
      heard(ctx, { clip: G("pickup-ammo"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.8, maxDistance: 12 });
      heard(ctx, { clip: G("radio-dial-click-static"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.6, maxDistance: 12 });

      // Visual feedback: floating banner with station info
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.8, z: pos.z },
        text: `♫ ${cur.name.toUpperCase()} (${cur.genre.toUpperCase()}) ♫`,
        color: cur.color,
        size: 1.15,
      });

      // Listening boost: small sanity reward
      if (who?.state) {
        who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 12);
        ctx.emit("damageNumber", {
          position: { x: who.feetPosition.x, y: who.feetPosition.y + 1.2, z: who.feetPosition.z },
          text: "+12 SANITY (80s RADIO)",
          color: "#80ffaa",
          size: 0.95,
        }, { audience: { player: who.id } });
      }
    } else {
      // Turn off
      ctx.self.audio = null;
      ctx.self.ui = renderDisplay(null, false);
      heard(ctx, { clip: G("radio-dial-click-static"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.6, maxDistance: 10 });
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.5, z: pos.z },
        text: "JUKEBOX: OFF",
        color: "#9999aa",
        size: 0.9,
      });
    }
  },
};

export function tune(ctx, { idx }) {
  const s = ctx.self.state; if (!s.playing || s.tuneTo !== idx) return;
  const cur = STATIONS[idx];
  ctx.self.audio = { clip: cur.url, gain: 0.65, loop: true, spatial: true, refDistance: 3.5, maxDistance: 45, bus: "Music" };
}
