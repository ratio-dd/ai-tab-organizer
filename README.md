# AI Tab Organizer（MVP）

一个基于 Chrome Extension MV3 的 AI 标签整理工具，当前版本仅接入 `MiniMax Token Plan`。

## 功能概览
- 手动触发分析：读取标签标题/URL，调用 MiniMax 生成分组提案。
- 预览后执行：可编辑组名、颜色、标签归属。
- 跨窗口策略：全部窗口模式下可选择是否跨窗移动。
- 撤销最近一次：恢复标签到执行前状态（窗口/索引/分组）。
- 设置与统计：隐私模式、MiniMax Key/Model、模板管理、统计开关与指标面板。
- Token Plan 额度查看：设置页手动刷新 remains（含短时缓存）。
- 中英双语界面（`zh-CN` / `en`）。

## 目录结构
- `manifest.json`：扩展清单。
- `background.js`：service worker，负责核心逻辑。
- `popup/popup.html`：弹窗 UI。
- `popup/popup.js`：前端交互逻辑。
- `popup/popup.css`：弹窗样式。
- `docs/`：PRD、技术方案、里程碑文档。

## 本地安装
1. 打开 Chrome，进入 `chrome://extensions/`。
2. 右上角打开“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目目录：
   - `/Users/ratio/Code/ai_playground/chrome_extention_folder`

## 首次使用
1. 点击扩展图标打开弹窗。
2. 在“设置”中填写：
   - `MiniMax Token Plan Key`
   - 模型名（默认 `MiniMax-M2.7`）
3. 可在“Token Plan 额度”区块点击“刷新额度”确认余额。
4. 选择分析范围、分组模式和可选模板/提示词。
5. 点击“开始分析”。
6. 在预览中编辑组名、颜色、标签归属。
7. 点击“应用分组”。
8. 如结果不满意，点击“撤销最近一次”。

## 权限说明
- `tabs`：读取标签标题/URL、移动标签等。
- `tabGroups`：创建与更新标签组。
- `storage`：保存设置、提案、快照、统计、额度缓存。
- `host_permissions: https://api.minimaxi.com/*`：调用 MiniMax Chat Completions。
- `host_permissions: https://www.minimaxi.com/*`：查询 Token Plan remains。

## MiniMax Token Plan 注意事项
- `Token Plan Key` 与普通按量 API Key 不可混用。
- 存储时会自动去除 `Bearer ` 前缀。
- remains 接口：`GET https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`
- 分析接口：`POST https://api.minimaxi.com/v1/chat/completions`
- 常见错误映射：
  - `401`：Token 无效或已过期。
  - `403`：账号/套餐权限不足。
  - `429`：触发限频或窗口限制。

## 当前边界（符合 Chrome 能力）
- Chrome 标签组是扁平结构，不支持树形嵌套。
- 跨窗口移动仅对 `normal` 窗口有效。
- 默认跳过 pinned、`chrome://*`、`chrome-extension://*`、`devtools://*` 等受限页面。

## 认证说明
- 扩展内调用模型接口需要可直接用于 HTTP 请求的 `Token Plan Key`。
- `Codex OAuth 登录态` 不能直接被 Chrome 扩展当作模型 API 凭证使用。

## 参考文档
- [Token Plan FAQ](https://platform.minimaxi.com/docs/token-plan/faq)
- [Token Plan 快速接入](https://platform.minimaxi.com/docs/token-plan/quickstart)
- [Token Plan Codex CLI](https://platform.minimaxi.com/docs/token-plan/codex-cli)
