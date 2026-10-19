# Maintenance policy / 维护政策

[English](#english) · [简体中文](#中文)

## English

### Project identity

- Repository: [QR-0W/DSH-Custom-Auto-Review](https://github.com/QR-0W/DSH-Custom-Auto-Review)
- Package: `@local/dsh-custom-auto-review`
- Rename-line version: `0.3.0`
- Distribution: versioned `.tgz` assets attached to GitHub Releases; no npm registry publication or floating install channel.

The package provides settings for an independently selected reviewer model. It does not include a model service or provide model access. Public defaults must leave the reviewer route empty. Do not add a user-specific provider, model, IP address, service URL, credential, or gateway default to source, examples, documentation, test fixtures, or release assets.

### Compatibility claims

The declared DSH compatibility scope is limited to `0.2.1-rc.1` and `0.2.1-rc.2`. The current maintenance round focuses on `0.2.1-rc.2`. Other DSH versions are not verified and must not be listed as supported. The package requires Node.js `>=24`.

Add a DSH version to the public compatibility table only after that version's automated checks and required Host/Client acceptance pass. An identical tarball, type check, or unit test does not establish real GUI, profile, or model-provider acceptance. Record those results separately.

### Configuration and behavior contract

- The reviewer provider and model are selected from models already configured in DSH. Reasoning-effort choices must come from the selected model's advertised capabilities.
- The initial public reviewer route is empty. An incomplete or invalid route must fail closed; it must not inherit or fall back to the main model.
- Only an explicit save writes reviewer configuration. Saving does not change the main model and does not select or enable Auto.
- Provider/model loading must not save implicitly. A failed, stale, or unsupported selection must not silently change the route.
- Keep the settings operation shared with the management interface and protect concurrent writes with the expected revision. Validate the route before writing.
- Preserve review cancellation, timeout handling, strict decision parsing, later DSH permission checks, and safe removal behavior. A review failure must not authorize the tool body.

These are release gates. Do not claim a gate passed until the candidate release has evidence for it.

### Build and test commands

The current repository scripts are:

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

`npm run link:runtime` links the exact installed DSH packages used by the project; it must not install another DSH runtime. `npm run build:gui` rebuilds the Client form artifact. `npm run check` runs the configured source and test checks.

The migration acceptance check uses retained, real old-package archives. When that test is available and the required private archive directory is prepared, run:

```sh
IAR_ROLLBACK_DIR=/path/to/retained-artifacts npm run check:migration
```

The archive directory is a local test fixture, not a public dependency. Do not generate substitute historical packages or put profile data, credentials, or private reports in Git. Lead must rerun the applicable checks against the final source and release archive.

### Release, install, migration, and rollback

1. Run the release checks for the exact DSH versions claimed in the README. Separate automated test evidence from real Host/Client or external-provider acceptance.
2. Build and inspect the `.tgz` attached to the versioned GitHub Release. Keep the package version, release tag, and asset matched.
3. Install the exact asset through DSH Plugin Manager. Use the manager's application result and `nextStep` for activation or migration; do not hand-edit a profile manifest or patch.
4. During a migration from an older package layout, prevent duplicate active review/settings providers. Follow Plugin Manager's result for disabling or removing the old provider before enabling its replacement.
5. Roll back by choosing a prior release tag and installing that tag's matching `.tgz` through Plugin Manager. Verify the resulting package and reviewer configuration. Do not infer successful activation from an install response alone.

Do not replace an already published tag's archive. Publish a new version for a changed artifact. Auto remains a separate user action after the reviewer route is checked.

### Privacy and safety

A review request includes the working directory, project instructions, filtered session history, and the pending tool-call details. These fields can expose private project content to the selected model provider. A separately configured model route is not an isolated context, does not redact data, and does not guarantee data residency. The user must select a provider approved for that data.

Do not promise free model access. Do not include user-specific routes, private IPs, service URLs, API keys, or credentials in public defaults or test fixtures. Use synthetic, non-sensitive data for automated and live-provider tests. Do not describe probabilistic model review as a security guarantee; keep DSH's permission controls active.

### Upstream and license

The project includes source from DeepSeek's `@deepseek-ai/dsh-experimental-auto-review` version `0.2.1-rc.1`, licensed under MIT. The source notice and license are in [`NOTICE.md`](../NOTICE.md) and [`LICENSE`](../LICENSE). Preserve those notices when redistributing the package.

## 中文

### 项目标识

- 仓库：[QR-0W/DSH-Custom-Auto-Review](https://github.com/QR-0W/DSH-Custom-Auto-Review)
- 包名：`@local/dsh-custom-auto-review`
- 更名版本：`0.3.0`
- 分发方式：GitHub Release 附带按版本固定的 `.tgz`；不发布到 npm registry，也不提供浮动版本安装渠道。

本包提供独立审查模型的配置能力，不包含模型服务，也不提供模型访问权限。公开默认审查路由必须为空。源码、示例、文档、测试夹具和发布归档不得加入用户专属供应商、模型、IP 地址、服务 URL、凭据或网关默认值。

### 兼容声明

声明的 DSH 兼容范围仅限 `0.2.1-rc.1` 和 `0.2.1-rc.2`，本轮维护以 `0.2.1-rc.2` 为主要验收目标。其他 DSH 版本未验证，不得列为受支持版本。包要求 Node.js `>=24`。

只有某个 DSH 版本通过对应的自动化检查和所需 Host/Client 验收后，才能加入公开兼容表。归档相同、类型检查通过或单元测试通过，都不能证明真实 GUI、profile 或模型服务验收通过。请分别记录这些结果。

### 配置与行为约定

- 审查供应商和模型从 DSH 中已配置的模型目录选择。推理强度选项必须来自当前模型公开的能力信息。
- 公开默认审查路由为空。不完整或无效的路由必须 fail-closed，不能继承或回落到主模型。
- 只有用户显式保存时才写入审查配置。保存不会更改主模型，也不会选择或启用 Auto。
- 加载供应商或模型列表不得隐式保存配置。失效、过期或不受支持的选择不得静默更改路由。
- 设置界面和管理工具共用 Host 写入操作，并使用 `expectedRevision` 防止并发覆盖。写入前验证路由。
- 保留审查取消、超时处理、严格输出解析、后续 DSH 权限检查和安全卸载行为。审查失败不得放行工具主体。

以上内容是发布门槛。候选版本没有对应证据时，不得声称门槛已通过。

### 构建与测试命令

当前仓库脚本如下：

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

`npm run link:runtime` 链接项目使用的精确 DSH 安装包，不得安装第二套 DSH 运行时。`npm run build:gui` 重新构建 Client 设置表单产物。`npm run check` 执行已配置的源码和测试检查。

迁移验收使用实际保留的旧包归档。具备该测试并准备好所需的本地归档目录后，运行：

```sh
IAR_ROLLBACK_DIR=/path/to/retained-artifacts npm run check:migration
```

归档目录只用于本地测试，不是公开依赖。不要生成替代的历史包，也不要把 profile 数据、凭据或私有报告提交到 Git。Lead 必须针对最终源码和发布归档重新运行适用检查。

### 发布、安装、迁移与回滚

1. 对 README 声明的确切 DSH 版本运行发布检查。自动化测试证据、真实 Host/Client 验收和外部模型服务验收应分别记录。
2. 构建并检查将附加到版本化 GitHub Release 的 `.tgz`。包版本、release tag 和归档必须相互匹配。
3. 通过 DSH Plugin Manager 安装确切归档。启用或迁移操作遵循管理器返回的应用结果和 `nextStep`；不要手改 profile 清单或 patch。
4. 从旧包布局迁移时，避免审查服务或设置服务重复启用。根据 Plugin Manager 的结果，先处理旧服务，再启用替代服务。
5. 回滚时选择先前 release tag，并通过 Plugin Manager 安装该 tag 对应的 `.tgz`。核对最终包版本和审查配置。不能仅凭安装响应推断插件已经成功激活。

不得替换已发布 tag 的归档。产物变化时发布新版本。核对审查路由后，Auto 仍由用户单独选择。

### 隐私与安全

审查请求包含工作目录、项目指令、筛选后的会话历史和待执行工具调用信息。这些字段可能向所选模型服务提供私有项目内容。单独配置模型路由不等于隔离上下文，不会自动脱敏，也不保证数据驻留。用户必须选择获准处理这些数据的服务。

不得承诺免费模型访问。公开默认值和测试夹具不得包含用户专属路由、私有 IP、服务 URL、API Key 或凭据。自动化测试和实时模型服务测试使用合成、非敏感数据。不得把概率性模型审查描述为安全保证，并保持 DSH 权限控制启用。

### 上游与许可证

本项目包含 DeepSeek `@deepseek-ai/dsh-experimental-auto-review` `0.2.1-rc.1` 版本的代码，采用 MIT 许可证。来源和许可证见 [`NOTICE.md`](../NOTICE.md) 与 [`LICENSE`](../LICENSE)。重新分发包时必须保留这些声明。
