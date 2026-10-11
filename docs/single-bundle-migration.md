# Single-bundle migration — completed locally

The root package `@local/dsh-independent-auto-review` 0.2.0 is installed. The old settings companion was removed. After the actual Host process was restarted, the user confirmed that the new form displays and saves correctly.

## Package shape

One installed package owns two sibling Host rows:

- `independent-auto-review`: unchanged review/configuration identity.
- `independent-auto-review-settings-host`: settings service exported as `@local/dsh-independent-auto-review/settings`.

The logical service and tool names remain `independentAutoReviewSettings` and `auto_review_settings`. There is no permanent legacy package alias or second GUI package.

## What happened

1. The user used the supported CLI to remove the old companion and install the new root package.
2. The old Host process remained alive. Package inventory showed 0.2.0, but the settings component was inactive and no form was registered. Installation metadata alone was not treated as successful activation.
3. Restarting the VS Code extension/extension host did not stop the old service, which the extension was reusing.
4. The user explicitly authorized ending that process, then reopened DSH through the extension. The listener PID changed, the settings tool became callable and the root Client form registered successfully.
5. The Host read preserved `gptpro / codex-auto-review / high / 60000`. The user then explicitly confirmed GUI display and saving.

No SDK change, main-model change, automatic Auto selection or version exemption was made. After the user prohibited more backups and fallback logic, no additional backup or automatic recovery mechanism was added.

## Other installations

Use the supported Plugin Manager/CLI. Stop the actual Host before switching package providers; restarting a UI extension alone might only reconnect to an existing service. Keep the root's built-in review suppression active. Remove the old settings provider before enabling its integrated replacement.

If an operation fails, stop and report the error rather than adding retries or alternate installation paths. Do not modify profile files by hand or run pnpm directly inside the profile.

## Evidence and limits

- 120 regression tests pass, including invalid-input rejection before disk write/reload.
- Packed-artifact and real Loader tests cover sibling lifetime, normal saves, CAS, unknown fields, cancellation and headless activation.
- An earlier separate-process test verified original packages → candidate → restored original using already retained artifacts. This is historical test evidence, not a newly added runtime fallback.
- The local Host/Client inspection and user display/save confirmation are recorded in [verification details](gui-verification.md).
- No separate Reload-button, dual-theme, keyboard or external model-gateway acceptance is claimed. SDK generic automatic rollback is not claimed fixed.
