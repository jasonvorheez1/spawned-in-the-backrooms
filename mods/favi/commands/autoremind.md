---
name: autoremind
description: Favi holds this task and nudges Savi to keep going whenever she stops before it's finished. Put /autoremind anywhere in a prompt. /autoremind stop ends it, /autoremind alone says what she's holding.
---

# /autoremind: Favi keeps you on the task

`/autoremind` can sit anywhere in the creator's message. The rest of the message is the task; do it as a normal ask, AND have Favi hold it.

**Bare `/autoremind`** (no other words): read `world.state.favi.remind` (readOnly) and tell the creator in one line what Favi is holding, its last progress and nudge count, or "favi isn't holding anything".
**`/autoremind stop` / `off` / `cancel`**: set `remind.stopped = "creator"`, say "favi stopped reminding", and stop.

**With a task:**
1. Before any other work, one run_script writes the task (a new task replaces the old one):
   `ctx.world.state.favi ??= {}; ctx.world.state.favi.remind = { id: "r" + ctx.now(), task: "<the task, one plain sentence>", doneWhen: "<what must stand for it to be finished, concrete>", at: ctx.now(), last: ctx.now(), progress: "starting", nudges: 0, nextAt: 0, done: false, stopped: null }`
   Your first text names it: "favi's holding this one: <task>. she'll nudge me if i stop before it's done."
2. Work the task. After every finished step (each landed save), stamp it: `const r = ctx.world.state.favi.remind; r.last = ctx.now(); r.progress = "<what stands now, a few words>"`.
3. When `doneWhen` is true (you looked, it stands, it plays), set `r.done = true; r.last = ctx.now()` and land it as normal.
4. A creator's new ask mid-task does not cancel it: the new ask comes first, and the held task picks up after.

**When a nudge arrives** (a DM starting "favi /autoremind"): read `world.state.favi.remind`. If it's done or stopped, say nothing (".") and end. Otherwise continue from `progress`, stamp after each step as above, and keep the creator's chat to one pulse line ("favi nudged me. back on <task>: <what's next>"). If you are blocked on the creator (a question only they can answer), set `r.stopped = "waiting on creator"`, ask the question once, and stop.

**`/autoremind crew <task>`** (keep working while the creator is out of the app): write the task as above with `crew: true`, then hand the task to a crew in one run_weave (load the weaves skill first): one brief per independent piece, each brief carrying the task, `doneWhen`, the current `progress`, and the rule that each lane stamps `world.state.favi.remind.last` / `.progress` after every landed save. A crew keeps building with the app closed; Favi's nudges cannot reach Savi then, the crew is what keeps going. When the weave reports back: read the remind row; if `doneWhen` is not true and fuel allows, send the next weave on what's left from `progress`, as long as it still can; if done, set `r.done = true`. Stop when done, when `stopped` is set, or when fuel drops below `everything` (then say once what's left). A crew spends fuel per wisp: say so in the first text ("favi's crew is on it: <task>. they keep going while you're away, it burns fuel").

**How Favi nudges:** her brain checks every quarter second. When Savi has gone 30 seconds with no stamp and the task isn't done, she sends one nudge, then another every 30 seconds while it stays quiet. Spawn only wakes Savi for a nudge while someone is playing, and Favi gives up after 30 nudges with a note. Her nudge is a plain message, no AI call, so Favi spends no fuel on it; the work Savi does when woken uses fuel as normal.