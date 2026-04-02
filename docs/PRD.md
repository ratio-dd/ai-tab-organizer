# Chrome AI 标签整理器 - 产品需求文档（MiniMax Token Plan v0.2.0）

## 1. 文档信息
- 版本：`v1.2`
- 日期：`2026-04-02`
- 状态：`开发中`
- 目标浏览器：`仅 Google Chrome`
- 模型供应商：`仅 MiniMax Token Plan`

## 2. 问题定义
重度标签页用户在一个或多个 Chrome 窗口中常常同时打开几十到上百个标签。虽然 Chrome 提供标签组，但人工整理成本高，且会打断当前任务流，导致：
- 找到目标标签耗时长；
- 同类页面重复打开；
- 多窗口上下文分散。

产品目标：通过 AI 生成分组建议，并采用“先预览、后执行、可回滚”的流程，降低找标签成本。

## 3. MVP 目标与成功标准
- 主流程闭环：`分析 -> 预览 -> 执行 -> 撤销最近一次`。
- 支持范围切换：`当前窗口` / `全部窗口`。
- 全部窗口执行前可选择是否跨窗移动。
- 执行前可选择是否纳入已有分组。
- 预览按“分组卡片”展示，并可编辑组名、颜色、标签归属。
- 支持在组内单 tab 粒度手动调组（Move 按钮 + 目标组选择）。
- 可选纳入休眠包装页（解包 extension 包装 URL 中的原始 `url`）。
- 性能目标：`80` 标签在网络正常时 `10 秒内`返回预览。
- 异常安全：AI 超时/失败不修改任何标签分组。
- 统计可见且可关闭。
- 设置页可手动查询 Token Plan 剩余额度（remains）。

## 4. 范围定义
### 4.1 MVP 范围内
- 仅手动触发。
- AI 模式：混合（主题+域名）/ 域名优先。
- 支持模板 + 短 prompt。
- 仅 MiniMax Token Plan：
  - 分析接口：`POST https://api.minimaxi.com/v1/chat/completions`
  - 额度接口：`GET https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`
- 隐私模式：`redacted` / `full`。
- 支持最近一次回滚。
- 中英双语。

### 4.2 MVP 范围外
- 树形标签结构（Chrome 原生不支持嵌套组）。
- 自动触发、定时触发。
- 多 provider 切换（OpenAI/Kimi 不纳入当前版本）。
- 页面正文抓取与语义提取。
- 云端账号体系与团队协作。

## 5. 功能需求
### 5.1 标签采集与过滤
- 默认跳过：
  - pinned 标签；
  - `chrome://*`、`devtools://*`、`about:*` 等受限页面；
  - URL 无效或不可访问页面。
- 可选择是否纳入已有分组标签。
- `chrome-extension://...` 休眠包装页默认跳过；用户勾选“纳入休眠包装页”后，允许解析 query 中的原始 `url` 并参与分析。

### 5.2 AI 分析与提案
- 输入仅包含标题、URL 与基础元数据。
- 模型输出必须是结构化 JSON（groups/ungrouped）。
- 为避免长 URL 和大量 tabs 触发上下文超限，分析阶段需支持：
  - 标题与 URL 归一化裁剪；
  - 当 payload 超预算时自动分块调用模型并合并结果。
- 失败策略：fail-closed（失败即停止，不改动标签）。
- 错误码映射：
  - `401`：Token 无效/过期；
  - `403`：权限或套餐不匹配；
  - `429`：限流或窗口限制；
  - 其他：统一网络错误提示。

### 5.3 预览与执行
- 预览展示：按组显示组名、颜色、成员、置信度、理由，并包含“未分组池”。
- 支持编辑组名/颜色/成员归属。
- 组内每条 tab 提供 “Move” 入口，可显式选择迁移到其他组或未分组池。
- 全部窗口执行前可选跨窗移动。
- 执行前保存回滚快照。
- 对解包自包装页的 tab，执行阶段仍使用原 tabId 移动/分组，不通过重新打开 URL 激活标签。

### 5.4 撤销
- 仅支持撤销最近一次执行。
- 恢复标签原始 `windowId/groupId/index`。
- 部分恢复失败需给出统计反馈。

### 5.5 设置与额度
- 设置项：
  - `minimaxApiKey`
  - `minimaxModel`（默认 `MiniMax-M2.7`）
  - `privacyMode`
  - `telemetryEnabled`
  - `scopeDefault`
  - `includeExistingGroupsDefault`
  - `promptTemplates`
- 设置页提供“刷新额度”按钮，手动拉取 remains。
- 额度结果允许短时缓存，避免频繁请求。

### 5.6 配置迁移
- 启动时若检测到旧字段（`provider/openai*/kimi*`），自动归档到本地归档区并忽略，不阻塞升级。

## 6. 非功能需求
- 80 标签分析预览 <= 10 秒。
- 未点击执行前，禁止任何标签布局修改。
- 最小权限原则。
- 默认不读取页面正文。

## 7. 权限与隐私
- 必需权限：`tabs`、`tabGroups`、`storage`。
- host 权限：
  - `https://api.minimaxi.com/*`
  - `https://www.minimaxi.com/*`
- 隐私模式：
  - `redacted`：URL 去 query/hash，path 截断；标题长度规整；
  - `full`：完整标题与 URL。

## 8. Chrome 能力边界（已确认）
- 标签组为扁平结构：每个标签只有一个 `groupId`，不支持嵌套树形。
- `tabs.move` 仅支持 `window.type === "normal"` 窗口间移动。
- `tabGroups` 与 `tabs` API 可在 MV3 service worker/扩展页中使用。

## 9. 验收标准
1. 能完成 `分析 -> 预览 -> 执行 -> 撤销最近一次` 全闭环。
2. AI 失败/超时不产生标签变更。
3. 设置页可成功查询与展示 remains；失败场景提示清晰。
4. 旧 provider 配置升级后不阻塞，且 MiniMax 默认配置可正常工作。
5. 预览为“按组展示”并支持组内单 tab 调组。
6. 勾选“纳入休眠包装页”后，包装页中的原始 URL 可参与分析；不勾选时保持跳过。
7. 80 标签性能目标无回退，超长 URL/大批量场景不会因单次 payload 过大直接失败。
