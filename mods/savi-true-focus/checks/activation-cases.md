# Current activation and wardrobe acceptance contract

The creator simplified the command on 2026-09-13. These cases supersede the older empty/task/status/stop command syntax in the original workflow review. These are specifications unless evidence explicitly says otherwise.

1. `/true-focus` has `requiresArgs: false`, no argument placeholder and no `$ARGUMENTS` form. It enables focus, with no task/confirmation prompt.
2. Clear unfinished work continues; otherwise acknowledge and await the next ordinary message. Repeated activation remains enabled and creates no duplicate wardrobe.
3. A normal completed task keeps focus on for this conversation. Ordinary progress questions only read/report. “Turn true focus off” restores the prior appearance without undoing completed edits.
4. Activation names an explicit Savi helper, never an arbitrary human or a generic player-template override. Humans and non-Savi helpers are rejected.
5. Missing/invalid assets keep the workflow enabled but the appearance explicitly pending; nobody is dressed with a fake URL or claimed-ready placeholder.
6. Actual readiness requires the real augmented avatar, skinned suit and hand-mounted book. Verify exported clip/bone names, then the live readiness phase. Visual fit needs an actual relevant image, not just model state.
7. Off restores Savi's original model/parts and native behavior and removes only the owned suit/book/driver. Preserve a newer explicit outside avatar change instead of overwriting it with a stale snapshot.
8. Controller destruction and mod removal leave no wardrobe behind. Unit cleanup is not proof of a real engine uninstall; label each separately.
9. No terrain, player appearance, controls, camera or UI change. No permanently spawned replacement Savi and no idle per-frame scan.
10. A declared slash command is not a dispatched command. Exercise the actual host path before claiming native chat invocation; if unavailable, name it and retain ordinary-chat activation.

`runtime.test.mjs` executes isolated control-logic tests with mocked scene handles. It does not prove native command routing, renderer fit, real timers, network ownership, or engine uninstall cleanup.
