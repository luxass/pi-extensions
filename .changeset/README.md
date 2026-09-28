# Releases

This workspace uses pnpm's native release management (pnpm 12+), not `@changesets/cli`.

The extension packages start at `0.1.0`. First releases publish the version already in each package manifest. Publish `@luxass/agent-voice@0.1.0` in its own repository before installing dependencies or publishing `@luxass/pi-voice` here. The workspace exempts only that version from its five-day minimum release age so it can be installed as soon as it is published. The lockfile still records the old local link until the next install; do not publish pi-voice with that stale lockfile.

Once agent-voice is available:

1. Run `pnpm install` and commit the updated lockfile.
2. Run `pnpm check`, then inspect each package with `pnpm --filter @luxass/pi-whimsical pack` and `pnpm --filter @luxass/pi-voice pack` before publishing.
3. Publish the initial `0.1.0` versions with `pnpm --filter @luxass/pi-whimsical publish --access public` and `pnpm --filter @luxass/pi-voice publish --access public`. Publish only packages that are ready.

For subsequent releases, run `pnpm change` for user-facing changes and commit the generated `.changeset/*.md` files with the code. Preview with `pnpm change status` and `pnpm version -r --dry-run`. At release time, run `pnpm version -r`, `pnpm install`, and `pnpm check`; commit the version, changelog, and lockfile changes before `pnpm publish -r`.
