import { expect, mock, test } from "bun:test";
import { actedVoice, isVoiceClip, recordedDuration, vo } from "../scripts/lib/voices.js";
import ACTED from "../scripts/lib/data/voice-acted.yml";
import TIMING from "../scripts/lib/data/voice-timing.yml";

mock.module("builtin/physics", () => ({ raycast: () => null }));
const { heard } = await import("../scripts/lib/hear.js");

const rico = actedVoice("bonus-rico", "Arms in, eyes front!");
const second = actedVoice("bonus-rico", "Mind the yellow.");

test("recorded speech uses its source text and measured duration", () => {
  expect(actedVoice("bonus-rico", "Uh. That's not a rider.")).toBeTruthy();
  expect(actedVoice("bonus-rico", "That's not a rider.")).toBeNull();
  expect(isVoiceClip(rico)).toBe(true);
  expect(recordedDuration(rico)).toBe(1800);
  expect(recordedDuration(actedVoice("bonus-rico", "All aboard! Arms in!"))).toBeGreaterThan(0);
  expect(isVoiceClip(vo("stranger", "Keep walking."))).toBe(true);
  expect(isVoiceClip("/cdn/value.not-a-voice.mp3")).toBe(false);
  expect(Object.keys(TIMING).every((key) => ACTED[key] && TIMING[key] > 0)).toBe(true);
});

test("voice overlap is tracked per listener and a direct reply interrupts ambient speech", () => {
  let now = 1000;
  const position = { x: 0, y: 0, z: 0 }, events = [];
  const players = ["one", "two"].map((id) => ({ id, feetPosition: position, state: {} }));
  const ctx = {
    place: { players },
    now: () => now,
    emit(event, data, opts) { events.push([event, data, opts.audience.player]); return events.length; },
  };

  heard(ctx, { clip: rico, position });
  expect(events.map(([event, data, id]) => [event, data.bus, id]))
    .toEqual([["playSound", "Voice", "one"], ["playSound", "Voice", "two"]]);

  now += 900;
  heard(ctx, { clip: second, position });
  expect(events).toHaveLength(2);
  heard(ctx, { clip: second, position }, undefined, { listener: "one" });
  expect(events.slice(2).map(([event, data, id]) => [event, data.soundId ?? data.clip, id]))
    .toEqual([["stopSound", 1, "one"], ["playSound", second, "one"]]);

  players[0].state.talkWith = "bonus-rico";
  now += 2200;
  heard(ctx, { clip: second, position }, undefined, { ambient: true });
  expect(events.at(-1)).toEqual(["playSound", { clip: second, position, bus: "Voice" }, "two"]);
});
