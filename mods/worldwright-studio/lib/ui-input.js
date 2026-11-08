// UI-only sendAction commands have one payload on their delivery tick, never a held payload. 6.0 may deliver that payload with actions/pressed=false (report 9bc81655). Read the delivery without mutating shared input or manufacturing key/held/release presses.
export function read(input) {
  input = input || {};
  const actions = Object.assign({}, input.actions || {});
  const data = Object.assign({}, input.actionData || {});
  const pressed = input.pressed || {}, released = input.released || {};
  for (const name of Object.keys(pressed)) if (pressed[name]) actions[name] = true;
  for (const name of Object.keys(data)) if (!released[name]) actions[name] = true;
  for (const name of Object.keys(actions)) {
    if (name.indexOf("worldwright-studio:") !== 0) continue;
    const bare = name.slice("worldwright-studio:".length);
    if (actions[name]) actions[bare] = true;
    if (Object.prototype.hasOwnProperty.call(data, name)) data[bare] = data[name];
  }
  return { actions, data };
}
