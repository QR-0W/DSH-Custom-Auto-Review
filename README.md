# Independent Auto Review

Use a separate model to review DSH tool calls. Keep the main model unchanged.

This project targets DSH `0.2.0-rc.2` and Node 24. It replaces the built-in experimental Auto Review component. It does not replace the main agent or the model adapter. Other DSH versions are not verified.

## Repository and distribution

Public source repository: [QR-0W/dsh-independent-auto-review](https://github.com/QR-0W/dsh-independent-auto-review).

**Version `0.2.0` combines the gate and settings into one installed package.** The local profile was migrated, the restarted Host reads the original reviewer configuration, and the user confirmed that the new GUI displays and saves correctly. Minimal pre-write validation and isolated cold migration/restoration tests also pass. The SDK has not been modified and generic automatic rollback is not claimed. See [verification status](docs/gui-verification.md) and [scope](docs/migration-goal.md).

The new package contains two sibling Host components: the review gate and the settings service. The settings service is exported as `@local/dsh-independent-auto-review/settings`; it is not a separate installed package. The root also ships the Client form and its prebuilt artifact. No install-time build script is needed.

The old `@local/dsh-independent-auto-review-settings` companion must not coexist as an active provider with the integrated settings service. Its separate package and patch have been removed from this source, and the old companion is no longer installed in the verified local profile.

## Installation

The verified handoff uses an actual Host restart rather than dependence on generic SDK automatic rollback. Profile changes affect all sessions; obtain permission before stopping another installation's Host.

1. Use a tested, reviewed artifact or commit. Register a valid review model adapter; explicit reasoning effort must be supported.
2. In a development checkout, run `npm run link:runtime` to link the exact shipped APIs. Do not install another runtime or hand-edit the profile.
3. Confirm the current reviewer values. Quiesce saves and have the user select a manual permission mode before the handoff; do not change the main model.
4. Disable the old settings companion through Plugin Manager before activating the integrated settings provider. Keep the built-in gate suppressed. Disabling the entire old root bundle can remove its suppression override; either prove an independently durable override or use an approved stopped-Host update whose first startup retains suppression.
5. Install only the root package through Plugin Manager. Its two Host rows must remain siblings. Check application outcomes and absence of duplicate service, tool or Auto-gate registrations.
6. Refresh the existing GUI and verify **Plugins → Installed → Independent Auto Review** displays and reads the form. Verify reload and changed-value saving with approved temporary values, then restore them.
7. Remove the disabled old companion only after successful new-package validation. Confirm exactly one installed bundle card. Auto selection remains a separate user action.

Do not hand-edit the profile's package manifest or patch. Package and profile changes use the plugin manager. Configuration writes use the public Host configuration service.

The checked-in default is environment-specific:

```yaml
reviewer:
  provider: gptpro
  model: codex-auto-review
  reasoningEffort: medium
  timeoutMs: 60000
```

It is not a bundled model service. Public users must supply a valid registered route. The local `tools/preflight` helper fills missing metadata for this specific route only. It declares local limits of 128000 context tokens and 8192 output tokens, not measured gateway capacities. It preserves other models, provider settings, and credential references. It does not read or store API keys.

## Configure the reviewer

The GUI edits the independent reviewer, not the main model. Only an explicit save writes. The form retains its draft after a failure and uses a revision fence to prevent overwriting concurrent changes.

The core reviewer is not a volatile settings consumer. Saving through the shared ConfigEditor operation uses its normal configuration lifecycle. It reloads the reviewer and can move Auto sessions to confined `workspace-write`. Select Auto again after the new configuration is active. Changing the main-model selection does not reload the reviewer. Saving does not test the gateway or select Auto.

Provider and model identifiers are exact. The GUI does not prove gateway connectivity or backend model identity. An unsupported route or explicit reasoning level stops review; no main-model fallback exists.

An empty GUI reasoning field inherits the bundle's default. If `reasoningEffort` is absent from all configuration layers, the review adapter uses its own default. Timeout must be an integer from 1 to 300000 milliseconds.

The deferred `auto_review_settings` management tool reads and saves through the same Host operation. Use `get` first, then supply that revision as `expectedRevision` with `set`. A stale revision rejects the write. The tool cannot select Auto or approve a pending tool call.

## Safety

- Review native tool calls and PTC inner calls, not the outer `run_code` transport.
- Retain the upstream policy and evidence roles.
- Require a valid decision and a terminal `stop`.
- Deny on review failure. Do not start the tool body.
- Preserve later permission denials and tool guards.
- Under `ask`, a review denial can request manual approval. Under `never`, the denial is final.
- Cancellation cannot grant a pending call.
- Removal cancels active reviews and selects confined `workspace-write` for Auto sessions. Preserve an existing `never` policy.

The adapter must honor abort. Iterator cleanup waits at most one second. A defective adapter can retain network activity after that wait, but cannot grant the pending call.

Model review is probabilistic. Do not use it as the only control for sensitive systems.

**Warning:** The locally configured GPT Pro gateway uses HTTP. Review evidence can contain private project data. That connection has no TLS protection.

## Remove or roll back

The integrated package has no separately installed GUI companion. Disabling its settings Host row withdraws the settings service and tool; disabling the gate withdraws independent review. Whole-bundle disable removes both and can also remove the built-in suppression patch.

For migration rollback, remain in manual mode and withdraw new providers before restoring old artifacts and the complete raw gate override through supported management/configuration APIs. Prove durable built-in suppression or use an approved stopped-Host handoff. Restore the old companion only after the new service/tool is gone. Verify the recovered configuration and single review integration before the user selects Auto. Do not infer safe recovery from a successful install response.

Review-model metadata added during setup remains after removal. It does not affect the main model.

## Development and verification

End users do not need a compiler. For development, rebuild the GUI after editing its source:

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

Tests use the installed runtime. Set `DSH_RUNTIME_DIR` when DSH is not in the global npm directory. Shared APIs are declared in peer and development dependencies. The linking helper supplies the exact shipped APIs; it does not install another runtime. The compiler dependencies stay in the separate build-tools directory.

The current suite passes 120 tests, including real rejection of invalid identifiers before disk writes or gate reload. The gate implementation is unchanged; its Config schema now matches the existing identifier rules. With `IAR_ROLLBACK_DIR` naming the retained old-artifact directory, `npm run check:migration` also passes the separate-process old-packages → new-package → restored-old-packages acceptance test. Normal saves, sibling lifetime, CAS, unknown fields, cancellation, headless use and packed dependencies are verified offline. The local profile migration and Host read are verified, and the user confirmed GUI display and saving. A separate explicit Reload-button check was not recorded. See [GUI verification](docs/gui-verification.md) for limits and [earlier gate verification](docs/verification.md) for history. No SDK automatic-recovery fix is claimed.

See the [source notice](NOTICE.md) and the GUI's [third-party notices](tools/gui/THIRD-PARTY-NOTICES.md). Private local reports, dependencies, environment files, and logs are excluded from Git. Ignore rules do not remove files already committed.

Project reports use short, direct English. They are not certified for full ASD-STE100 compliance. The upstream policy and license remain unchanged.
