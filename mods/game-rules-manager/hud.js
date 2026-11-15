// The mod's own screen: a tab on the god-mode rail (Tab, then G). Lives only in the mod folder, so
// removing the mod removes the screen with it.
import { rulesHtml, grm as grmPress, grmType as grmTyped } from "lib/panel.js";
export function grm(a, i, s) { grmPress(a, i, s); }
export function grmType(i, v) { grmTyped(i, v); }
export default function render(ctx, player) { return rulesHtml(ctx, player, { embedded: true }); }
