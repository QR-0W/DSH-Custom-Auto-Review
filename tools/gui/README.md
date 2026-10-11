# Integrated Auto Review settings

This directory contains the settings Host component, Client source and generated browser artifact for the root `@local/dsh-independent-auto-review` package. It is no longer a separate installable companion.

Version `0.2.0` is installed in the verified local profile as one package. The Host reads the preserved reviewer settings, and the user confirmed GUI display and saving. Pre-write rejection and isolated cold package restoration also pass. See [current verification](../../docs/gui-verification.md) for limits.

## Ownership

The root bundle inserts the gate and settings Host as sibling Loader rows. The settings service uses the shared ConfigEditor operation for both the GUI and `auto_review_settings` tool. It does not own or change the main model, select Auto, or approve calls.

The Client mounts its strict Remote contribution before creating the child view that explicitly injects `remote.independentAutoReviewSettings`. The root bundle card and the gate row alternate route render the same form. There is no legacy companion-card route or package alias.

## Request behavior

The form sends normalized reviewer values and the revision it read directly to the Host. Unknown raw configuration is preserved by the Host edit. Blank effort restores inherited configuration; timeout is an integer from 1 to 300000 milliseconds.

Only the latest Client request generation may update the page. An old success or old failure, including after effect cleanup/reactivation, cannot overwrite a newer request. Failed saves retain drafts. Diagnostics show allowlisted categories rather than arbitrary potentially private Host messages.

Saving reloads the gate and can move Auto sessions to confined permissions. The user must select Auto again if appropriate. Saving does not test gateway connectivity or backend model identity.

## Build and tests

From the repository root:

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

The builder uses ordinary module imports, not Function.toString. Tests compare the generated artifact with a fresh in-memory build and check its ModuleLoader envelope. They do not replace React or claim browser rendering.

The root package ships the prebuilt artifact and requires no installation build script. Its production peers and runtime files are checked from an extracted package using only declared shipped-runtime dependencies.

## Safety and limits

The gate remains fail-closed and independent of the main model. CAS, cancellation and raw configuration preservation are intentional safeguards. The locally configured GPT Pro gateway uses HTTP without TLS; review evidence may contain private data.

The SDK's generic activation-failure rollback remains a platform limitation. This plugin now rejects the observed invalid inputs before persistence; it does not catch or mask arbitrary startup failures. The approved migration plan uses stopped Host processes and retained old artifacts, verified separately in isolation. Actual installation still requires approval and GUI acceptance.

See the root [license](../../LICENSE) and bundled [third-party notices](THIRD-PARTY-NOTICES.md).
