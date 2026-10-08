---
"@luxass/pi-personal": minor
---

Add `@luxass/pi-personal` and migrate the personal Pi extensions from the dotfiles repository into the package:

- Continue the active task after compaction.
- Prevent interactive Git editors and block `--no-verify` hook bypasses.
- Require Socket Firewall for package-manager installs.
- Guard Wrangler's generated `worker-configuration.d.ts` against manual changes.
- Show a custom session header and a `/resources` view.
- Add the Crow CLIProxyAPI provider with login, model discovery, streaming, retry, and proactive compaction support.

Expose each extension separately in the Pi package manifest so users can select which ones to load.
