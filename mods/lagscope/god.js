// LAGSCOPE in god mode (mod.json attach "god"): the LAGSCOPE tab on the god-mode rail sends its presses here.
// The same asks as the overlay; the watch on the player's body keeps sampling either way.
import { act } from "./lib/watch.js";
export function onInput(ctx, input) {
  const a = input.actionData?.act ?? input.actionData?.["lagscope:act"];
  if (a) act(ctx, a);
}
