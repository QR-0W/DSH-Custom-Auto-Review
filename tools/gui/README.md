# DSH Custom Auto Review settings

This directory contains the settings Host component, Client source and generated browser artifact shipped by `@local/dsh-custom-auto-review`. It is not a separate bundle.

## Ownership and discovery

The root bundle inserts the review gate and settings Host as sibling Loader rows. The strict Remote service `dshCustomAutoReviewSettings` provides `read`, `save` and `catalog`. The GUI and `auto_review_settings` tool share the same revision-checked settings store.

`catalog` reads public provider/model IDs, names and reasoning capabilities through DSH's LLM directory. It does not read endpoints or credentials, stream a model response, or change settings. Provider, model and effort controls are real selects. Unsupported saved values remain visible and cannot be silently substituted or saved.

The initial reviewer route is empty, so the gate does not register Auto. Saving a valid user-selected route makes the gate available without selecting Auto or changing the main model. A missing or invalid route never falls back to the main model.

## Requests and persistence

Only the latest request generation can update the form or capability directory. Failed saves preserve the draft. Save validates the selected route and effort, checks the read revision, then rechecks raw/inherited configuration inside ConfigEditor before writing. Unknown raw fields are preserved.

Blank effort means the selected adapter's default. An explicit `null` mask prevents an inherited effort from reappearing; it is normalized away before model dispatch. Timeout is an integer from 1 to 300000 milliseconds.

A gate reload cancels and drains in-flight reviews and returns Auto sessions to workspace-write, preserving an explicit never-ask policy. Users must deliberately reselect Auto. Saving and directory inspection do not test provider connectivity or backend model identity.

## Build and tests

From the repository root, with a supported DSH runtime installed:

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
npm run check:upstream
```

The committed Client is reproducibly built from ordinary module imports. Strict RPC, real ConfigEditor/Loader reloads, tool execution, packed-bundle restoration and unconfigured startup are exercised with synthetic adapters in temporary profiles. These tests do not establish browser appearance or live-provider acceptance.

## Privacy

Review evidence can include private project and session data. Use an approved provider and HTTPS whenever evidence crosses a network. Independent route selection does not isolate shared session context, redact evidence or guarantee a safe decision. No provider endpoint, credentials, model catalog or model access is distributed by this project.

See [maintenance](../../docs/MAINTENANCE.md), [license](../../LICENSE) and [third-party notices](THIRD-PARTY-NOTICES.md).
