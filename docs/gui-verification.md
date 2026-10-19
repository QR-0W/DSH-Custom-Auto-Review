# Single-bundle verification — 0.2.0

> Historical record for 0.2.0, not acceptance evidence for DSH Custom Auto Review 0.3.0. Current behavior and limits are documented in the root README and maintenance policy.

Target: DSH `0.2.0-rc.2`, Node `v24.19.0`, root package `0.2.0`. The local profile has been migrated and the user confirmed the new GUI displays and saves correctly.

## Current results

`npm run check` passes 120 tests. The earlier crash-characterization case has been replaced by a stronger, relevant assertion: all three route identifiers reject empty or padded values through real ConfigEditor **before any disk write or gate reload**. This is prevention, not SDK rollback.

The separate cold-migration acceptance test also passes. It uses the actual retained old root/companion archives, verifies their hashes, builds the new tarball, and starts three separate Host composition processes sequentially:

1. Original two packages with complete synthetic raw configuration.
2. New single package with that same configuration, including a successful changed-value save.
3. Restored original two packages with the original full configuration.

Each process finishes cleanup and exits before the next starts. Built-in review remains suppressed; only one settings tool and one Auto integration are present. The restored reviewer and complete raw configuration equal the baseline. No production server, browser, profile or external model is involved.

| Check | Evidence |
| --- | --- |
| Necessary review safety | Existing policy, decision, cancellation and guard tests pass; gate implementation unchanged. |
| Minimal Config correction | Three schema fields share the existing nonempty/unpadded identifier rule; no retry or fallback added. |
| Pre-write rejection | Empty, whitespace-only and padded provider/model/effort values do not change disk, revision, gate config or settings store. |
| Normal save lifecycle | Real Loader, root Include, disk ConfigEditor and Gateway; gate effects restart, settings sibling/store/tool survive. |
| Concurrency and raw data | Stale/concurrent saves rejected; unknown root/reviewer fields and inherited effort retained. |
| Pending review | Synthetic LLM cancelled/drained; tool body not run; confined sandbox and never preserved. |
| Headless and packed package | Actual extracted root exports/patch mounted with declared peers only; headless gate works without settings services. |
| Client requests/build | Latest request wins, obsolete failures cannot replace current state; artifact matches ordinary module build. |
| Cold migration/restoration | Passed using retained old artifacts and separate Host processes. Not arbitrary SDK automatic rollback. |
| Actual profile and GUI | One root bundle 0.2.0 remains; old companion removed. After the actual Host restart, the settings tool reads successfully, the root Client form is active, and the user explicitly confirmed display and saving. |

## Historical SDK issue — not claimed fixed

The old schema accepted padded model identifiers that activation rejected. On the shipped SDK, that path produced an unhandled Promise rejection before reliable automatic rollback completed. Earlier sources and the reproduction remain in the private checkpoint.

The runtime correction is deliberately small: the plugin schema now rejects the same invalid values before ConfigEditor persists them. The new test proves there was no write and no reload; it does not infer that SDK rollback works. Other SDK startup failures remain a platform limitation.

The user approved cold package restoration instead of requiring this plugin to repair arbitrary SDK failures. The former `check:recovery`/`check:release` layers were removed rather than extended with catches or bypass switches. The concrete migration check below requires both normal regression checks and actual old-artifact cold restoration.

## Commands

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check

# Directory must hold the retained old artifacts plus artifacts.json; no synthetic old package is generated.
IAR_ROLLBACK_DIR=/path/to/private/rollback-baseline npm run check:migration
```

These commands are offline checks, not authorization to stop a user's Host. In the completed local migration, the old process initially remained alive after package replacement and extension restarts. After an explicitly authorized termination, the VS Code extension started a new Host process; the settings service and root form then became active. A live read retained the locally configured provider/model, `high` reasoning effort, and a 60000 ms timeout. The user confirmed both display and saving. No additional backup or automatic recovery was introduced after the user prohibited them.

## Limits and privacy

The new single-bundle display/save confirmation is separate from the earlier two-bundle observation. No separate Reload-button, keyboard or light/dark-theme acceptance was recorded. No real model request was made for these tests. The historical local provider used HTTP without TLS; review evidence may contain private data. This project distributes no endpoint, credentials, provider route or free service.

See [Goal boundaries](migration-goal.md), [migration steps](single-bundle-migration.md), and [historical gate checks](verification.md).
