// The HUD (world.config.yaml ui.render): render(ctx, player) → HTML, drawn for every player: ctx the read-only world,
// player the viewer's own body (player.state the dots it writes). Renders nothing yet. The type is already the game's: the
// engine's pixel face, Jersey 10 (engine.ui.theme.font names a bundled Geist Pixel face): a font-family
// here replaces it. The palette is the world's. The right-middle rail is Spawn's; every corner is yours.
// A word naming a control reads ctx.world.inputs.actions.<name>.label or axes.<name>.label, never a key written as
// text: the engine fills it for this player's device and no config declares it. It is null before their controls stand
// and where the device has none, and the line then drops the word, with no fallback.
// The game-ui skill carries finished screens to start from.
export default function render(ctx, player) {
  return ''
}
