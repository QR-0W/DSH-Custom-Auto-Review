<h1 align="center">DSH-Custom-Auto-Review</h1>
<p align="center">Configure a separate DSH model route to review tool calls before execution.</p>
<p align="center">
  <a href="https://github.com/QR-0W/DSH-Custom-Auto-Review"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-QR--0W%2FDSH--Custom--Auto--Review-181717?logo=github&style=flat-square"></a>
  <a href="https://github.com/QR-0W/DSH-Custom-Auto-Review/releases"><img alt="Release assets" src="https://img.shields.io/badge/releases-fixed%20tag%20assets-2F81F7?style=flat-square"></a>
  <img alt="Package version 0.3.0" src="https://img.shields.io/badge/package-0.3.0-347D39?style=flat-square">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-6F42C1?style=flat-square">
</p>
<p align="center"><a href="README.zh-CN.md">简体中文</a> · <a href="docs/MAINTENANCE.md">Maintenance policy</a></p>

DSH-Custom-Auto-Review adds a configurable review gate for DSH tool calls. The reviewer route is selected independently from the main model route. The review request still contains session and tool-call information, so a separate route does not create an isolated context or a privacy boundary.

Package: `@local/dsh-custom-auto-review@0.3.0`. Install a versioned `.tgz` from this repository's GitHub Releases. The package is not published as an npm registry package.

## What it does

- Uses a user-selected, already configured DSH model provider and model for review.
- Reviews supported native tool calls and started PTC inner calls before their tool bodies run.
- Fails closed when review cannot complete; it does not fall back to the main model.
- Keeps review-model settings separate from the main-model selection.

Model-based review is probabilistic. It is not a security guarantee and must not replace DSH permission controls or human review for sensitive operations.

## Compatibility

| DSH version | Support status |
| --- | --- |
| `0.2.1-rc.1` | In the tested compatibility scope |
| `0.2.1-rc.2` | In the tested compatibility scope; primary target for this maintenance round |
| Other versions | Not verified; no compatibility claim |

The package requires Node.js `>=24`. The automated suite passed 134 tests on each of `0.2.1-rc.1` and `0.2.1-rc.2`. These results do not establish GUI interaction or live-provider acceptance, which require user confirmation.

## Install or roll back

1. Open the [GitHub Releases](https://github.com/QR-0W/DSH-Custom-Auto-Review/releases) page and select the exact release tag.
2. Download that release's `.tgz` asset and install the local archive through DSH Plugin Manager. Confirm the installed package version and follow the result shown by the manager.
3. To roll back, choose a prior release tag and install its matching `.tgz` through the same manager. Do not install a floating or unpinned package.

Use one release artifact at a time. Follow the selected release's migration notes and verify the active review provider before enabling Auto.

## Configure the reviewer

1. Configure a model provider in DSH first. This plugin does not include a model service or supply model access.
2. Open the plugin's settings form. The initial reviewer route is empty; choose a registered provider and model, then select a reasoning effort supported by that model when available.
3. Save the reviewer settings explicitly. Saving does not change the main model and does not select or enable Auto.
4. Select Auto separately only after checking the route, review behavior, and permission policy.

The plugin never silently inherits or falls back to the main model. Without a valid reviewer route, review is unavailable and tool execution remains blocked by the gate. There is no free-model or hosted-service promise.

## Privacy and safety

For a review request, the plugin sends the selected reviewer the working directory, project instructions, filtered session history, and the pending tool-call details needed for the decision. These inputs can contain private project information. Review-route separation is a configuration choice, not context isolation or data redaction. Use a provider approved for the data in the session, and do not include secrets in test prompts or public examples.

A reviewer denial can still be subject to DSH's configured human-approval policy. A failed, timed-out, cancelled, or invalid review does not authorize the pending tool body. Keep DSH permission guards enabled and treat model output as fallible.

## Development

The following commands are the repository's current development scripts. `npm run link:runtime` links the exact DSH APIs used by the test harness; it does not install another runtime. See [maintenance policy](docs/MAINTENANCE.md) for the version-specific checks and release process.

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

Do not use a live model gateway as a routine test target. Live-provider checks require explicit authorization and must use synthetic, non-sensitive input.

## Attribution and license

This project includes source from DeepSeek's [`@deepseek-ai/dsh-experimental-auto-review`](https://github.com/deepseek-ai/deepseek-harness) version `0.2.1-rc.1`, licensed under MIT. This project adds a separately configurable reviewer route and settings UI. See [source notice](NOTICE.md), [license](LICENSE), and [maintenance policy](docs/MAINTENANCE.md).

## Links

- [Source and issues](https://github.com/QR-0W/DSH-Custom-Auto-Review)
- [Releases](https://github.com/QR-0W/DSH-Custom-Auto-Review/releases)
- [中文说明](README.zh-CN.md)
- [Maintenance policy](docs/MAINTENANCE.md)
