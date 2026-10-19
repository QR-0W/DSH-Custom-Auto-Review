<h1 align="center">DSH-Custom-Auto-Review（自定义自动审查）</h1>
<p align="center">为工具调用配置独立的 DSH 模型审查路由。</p>
<p align="center">
  <a href="https://github.com/QR-0W/DSH-Custom-Auto-Review"><img alt="GitHub 仓库" src="https://img.shields.io/badge/GitHub-QR--0W%2FDSH--Custom--Auto--Review-181717?logo=github&style=flat-square"></a>
  <a href="https://github.com/QR-0W/DSH-Custom-Auto-Review/releases"><img alt="发布归档" src="https://img.shields.io/badge/releases-固定版本归档-2F81F7?style=flat-square"></a>
  <img alt="包版本 0.3.0" src="https://img.shields.io/badge/package-0.3.0-347D39?style=flat-square">
  <img alt="MIT 许可证" src="https://img.shields.io/badge/license-MIT-6F42C1?style=flat-square">
</p>
<p align="center"><a href="README.md">English</a> · <a href="docs/MAINTENANCE.md">维护政策</a></p>

DSH-Custom-Auto-Review 为 DSH 工具调用增加可配置的审查门禁。审查路由与主模型路由分别设置，但审查请求仍包含会话和工具调用信息。独立配置不等于上下文隔离，也不构成隐私边界。

包名：`@local/dsh-custom-auto-review@0.3.0`。请从本仓库的 GitHub Releases 下载按版本固定的 `.tgz`。该包不作为 npm registry 包发布。

## 功能

- 使用用户在 DSH 中已配置的模型供应商和模型执行审查。
- 在工具主体运行前审查受支持的原生工具调用和已启动的 PTC 内部调用。
- 审查无法完成时 fail-closed，不回落到主模型。
- 审查模型设置与主模型选择保持分离。

模型审查具有概率性，不构成安全保证，也不能替代 DSH 权限控制或敏感操作的人为审核。

## 兼容范围

| DSH 版本 | 支持状态 |
| --- | --- |
| `0.2.1-rc.1` | 属于已测试的兼容范围 |
| `0.2.1-rc.2` | 属于已测试的兼容范围；本轮维护以此版本为主要验收目标 |
| 其他版本 | 未验证，不作兼容声明 |

包要求 Node.js `>=24`。自动化测试套件在 `0.2.1-rc.1` 和 `0.2.1-rc.2` 上均通过 134 项测试。测试结果不能证明 GUI 交互或实时模型服务验收通过，这两项仍需用户确认。

## 安装或回滚

1. 打开 [GitHub Releases](https://github.com/QR-0W/DSH-Custom-Auto-Review/releases)，选择确切的发布 tag。
2. 下载该 release 附带的 `.tgz`，通过 DSH Plugin Manager 安装本地归档。核对已安装的包版本，并按管理器显示的结果继续。
3. 回滚时，选择先前的 release tag，再通过同一管理器安装对应 `.tgz`。不要安装浮动或未固定版本的包。

每次只使用一个 release 归档。按所选 release 的迁移说明操作，并在启用 Auto 前检查当前审查路由。

## 配置审查模型

1. 先在 DSH 中配置模型供应商。本插件不包含模型服务，也不提供模型访问权限。
2. 打开插件设置表单。初始审查路由为空；选择已注册的供应商和模型。模型提供推理强度选项时，只能选择该模型支持的值。
3. 显式保存审查设置。保存不会更改主模型，也不会选择或自动启用 Auto。
4. 核对路由、审查行为和权限策略后，再单独选择 Auto。

插件不会静默继承主模型，也不会回落到主模型。没有有效审查路由时，审查不可用，门禁不会放行工具执行。本项目不承诺免费模型或托管服务。

## 隐私与安全

每次审查请求会向所选审查模型提交工作目录、项目指令、筛选后的会话历史，以及完成判断所需的待执行工具调用信息。这些输入可能含有私有项目数据。审查路由分开配置只代表路由选择不同，不会隔离上下文或自动脱敏。请使用获准处理当前会话数据的模型服务，不要在测试提示或公开示例中放入密钥。

审查模型拒绝调用后，DSH 的人工审批策略仍可决定是否继续询问用户。审查失败、超时、取消或输出无效时，不会授权待执行工具主体。保持 DSH 权限防护，并将模型输出视为可能出错的判断。

## 开发

以下命令来自仓库现有开发脚本。`npm run link:runtime` 会链接测试所用的精确 DSH API，不会安装第二套运行时。版本检查和发布流程见[维护政策](docs/MAINTENANCE.md)。

```sh
npm run link:runtime
npm ci --ignore-scripts --prefix tools/gui/build-tools
npm run build:gui
npm run check
```

不要把真实模型网关作为常规测试目标。实时服务检查需要明确授权，并且只能使用合成的非敏感输入。

## 来源与许可证

本项目包含 DeepSeek [`@deepseek-ai/dsh-experimental-auto-review`](https://github.com/deepseek-ai/deepseek-harness) `0.2.1-rc.1` 版本的源代码，该代码采用 MIT 许可证。本项目增加独立审查路由和设置界面。参见[来源声明](NOTICE.md)、[许可证](LICENSE)和[维护政策](docs/MAINTENANCE.md)。

## 链接

- [源码与问题反馈](https://github.com/QR-0W/DSH-Custom-Auto-Review)
- [发布归档](https://github.com/QR-0W/DSH-Custom-Auto-Review/releases)
- [English README](README.md)
- [维护政策](docs/MAINTENANCE.md)
