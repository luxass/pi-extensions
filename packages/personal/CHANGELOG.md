# @luxass/pi-personal

## 0.1.0

### Minor Changes

- [`d7c5bb1`](https://github.com/luxass/pi-extensions/commit/d7c5bb1ff1da86111f608729f3d4b97095208e6f) Thanks [@luxass](https://github.com/luxass)! - Add `@luxass/pi-personal` and migrate the personal Pi extensions from the dotfiles repository into the package:

  - Continue the active task after compaction.
  - Prevent interactive Git editors and block `--no-verify` hook bypasses.
  - Require Socket Firewall for package-manager installs.
  - Guard Wrangler's generated `worker-configuration.d.ts` against manual changes.
  - Show a custom session header and a `/resources` view.
  - Add the Crow CLIProxyAPI provider with login, model discovery, streaming, retry, and proactive compaction support.

  Expose each extension separately in the Pi package manifest so users can select which ones to load.
