# @luxass/pi-btw

Ask [Pi](https://github.com/badlogic/pi-mono) a side question in a popover without derailing the main conversation.

## Install

```sh
pi install npm:@luxass/pi-btw
```

## Use

Run `/btw` to open the side thread, or `/btw <text>` to open it and ask right away. If a thread already exists, `/btw` asks whether to continue it or start fresh.

In the popover, **Enter** asks, **Esc** stops a running answer or closes the popover, and **↑↓** / **PgUp PgDn** scroll. Closing a non-empty thread asks whether to keep it or inject a summary into the main chat.

The side thread sees the main conversation up to the moment you ask, using your current model and thinking level. Its tools are read-only (`read`, `grep`, `find`, `ls`), so it can look things up but not change files. Because the side request starts with the same prefix as the main chat, providers with prompt caching can reuse the main conversation's cache.

Injecting asks the model for a summary, sends it as a user message, and clears the side thread. If the main agent is busy, the summary is queued as a follow-up.

The side thread is stored in the session log, follows branch navigation, and never enters the main agent's context unless you inject it.

Models from providers registered by other extensions are not available in the side thread; it resolves models from Pi's `auth.json` and `models.json`.
