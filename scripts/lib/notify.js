// One line on one player's screen (their notice). Shared by every level: change how notices behave here once.
export function notify(ctx, who, text) { if (who?.state && text) who.state.notice = { text, at: ctx.now() }; }
