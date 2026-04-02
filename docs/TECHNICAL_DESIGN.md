# Chrome AI 标签整理器 - 技术方案（MiniMax Token Plan v0.2.0）

## 1. 架构概览
- 平台：Chrome Extension Manifest V3。
- 组件：
  - `background service worker`：采集标签、调用 MiniMax、生成提案、执行分组、回滚、统计、设置迁移。
  - `popup`：参数输入、提案预览与编辑、执行与撤销、设置、额度查询与统计展示。
  - `chrome.storage.local`：保存设置、提案、回滚快照、统计、Token Plan remains 缓存、旧配置归档。

设计原则：
- 执行前不改动标签状态；
- 仅支持最近一次回滚；
- AI 失败即终止（fail-closed）；
- provider 固定为 MiniMax，避免多路分流复杂性。

## 2. 数据模型
```ts
export type Scope = "current_window" | "all_windows";
export type PrivacyMode = "redacted" | "full";
export type GroupingMode = "hybrid" | "domain_first";
export type Language = "zh-CN" | "en";

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
}

export interface UserSettings {
  scopeDefault: Scope;
  privacyMode: PrivacyMode;
  language: Language;
  telemetryEnabled: boolean;
  promptTemplates: PromptTemplate[];
  granularity: "coarse" | "medium" | "fine";
  colorPolicy: "ai_auto" | "domain_palette";
  includeExistingGroupsDefault: boolean;
  minimaxApiKey: string;
  minimaxModel: string; // default: MiniMax-M2.7
  analysisTimeoutMs: number;
}

export interface RunOptions {
  scope: Scope;
  crossWindowMove?: boolean;
  includeExistingGroups: boolean;
  includeSuspendedWrappedTabs?: boolean;
  groupingMode: GroupingMode;
  userPrompt?: string;
  templateId?: string;
}

export interface GroupingProposal {
  planId: string;
  runId: string;
  groups: Array<{
    id: string;
    name: string;
    color: string;
    tabIds: number[];
    reason: string;
    confidence: number;
  }>;
  ungrouped: number[];
  generatedAt: number;
}

export interface UndoCheckpoint {
  runId: string;
  timestamp: number;
  tabStates: Array<{
    tabId: number;
    windowId: number;
    index: number;
    groupId: number;
  }>;
  groupMeta?: Record<number, { title: string; color: string; collapsed: boolean }>;
}

export interface TokenPlanRemains {
  fromCache: boolean;
  fetchedAt: number;
  data: {
    remains: number | null;
    limit: number | null;
    used: number | null;
    resetAt: string | null;
    raw: unknown;
  };
}
```

## 3. UI 与后台消息契约
```ts
type Request =
  | { type: "analyzeTabs"; options: RunOptions }
  | { type: "applyPlan"; planId: string; edits: any[]; crossWindowMove?: boolean }
  | { type: "undoLastRun" }
  | { type: "getRunStats" }
  | { type: "getSettings" }
  | { type: "saveSettings"; settings: Partial<UserSettings> }
  | { type: "getTokenPlanRemains"; forceRefresh?: boolean };
```

Popup 预览交互（v0.2.0）：
- 改为“按组卡片”展示，每组内部直接展示 tab 列表；
- 每条 tab 提供 `Move` 按钮，点击后弹出目标组下拉；
- 组外额外渲染“未分组池”卡片；
- 最终执行仍由 `tabAssignments` 统一汇总为 `edits` 发送给后台。

错误码映射重点：
- `AI_TIMEOUT`
- `AI_INVALID_RESPONSE`
- `AI_NETWORK_ERROR`
- `AI_AUTH_401`
- `AI_FORBIDDEN_403`
- `AI_RATE_LIMIT_429`
- `NO_ELIGIBLE_TABS`
- `PLAN_NOT_FOUND`
- `APPLY_FAILED`
- `UNDO_NOT_AVAILABLE`

MiniMax HTTP 错误语义：
- `401`：Token 无效或已过期；
- `403`：账号无权限或套餐不匹配；
- `429`：触发限频。

## 4. MiniMax 接入设计
### 4.1 分析请求
- Endpoint：`POST https://api.minimaxi.com/v1/chat/completions`
- Authorization：`Bearer <TokenPlanKey>`
- 默认模型：`MiniMax-M2.7`
- 请求体：
  - `messages[system]`：仅输出 JSON 的约束
  - `messages[user]`：运行参数 + tabs 列表（JSON 字符串）
- 输入规整（防上下文超限）：
  - 标题长度裁剪（`MODEL_TAB_TITLE_MAX=120`）
  - URL 长度裁剪（`MODEL_TAB_URL_MAX=480`）
  - 超长 query 仅保留有限 key（`MODEL_QUERY_KEYS_MAX=8`）
- payload 预算（`MODEL_PAYLOAD_CHAR_BUDGET=24000`）：
  - 单次估算超预算时，自动按候选 tab 分块调用；
  - 分块结果按组名归并并去重 tabId。

### 4.2 额度查询
- Endpoint：`GET https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`
- 触发方式：设置页手动刷新；
- 缓存策略：本地缓存 `2 分钟`，`forceRefresh=true` 时绕过缓存；
- 存储键：`tokenPlanRemainsCache`。

### 4.3 休眠包装页 URL 解包
- 输入来源可能是 `chrome-extension://.../park.html?...&url=<encoded-target>`。
- 默认行为：按受限页面跳过。
- 用户勾选 `includeSuspendedWrappedTabs=true` 时：
  - 仅在分析阶段尝试从 `url/target/link` 参数解包原始目标 URL；
  - 支持最多两轮 `decodeURIComponent`；
  - 仅接受 `http/https` 目标。
- 执行阶段不重新打开 URL，仍基于原 tabId 做 `tabs.move / tabs.group`，避免激活休眠页。

## 5. 设置迁移策略
- 启动读取设置时执行迁移：
  - 检测旧字段：`provider/openaiApiKey/openaiModel/kimiApiKey/kimiModel`
  - 旧字段从运行配置中剔除；
  - 归档至 `settings:legacyArchive`（保留最近 20 条）；
  - 不阻塞当前版本运行。

## 6. 执行与回滚算法
### 6.1 执行
1. 读取提案并校验。
2. 记录执行前 `UndoCheckpoint`。
3. 先解除目标标签已有分组。
4. 按分组结果创建标签组并更新组名/颜色。
5. 若允许跨窗移动，则先 `tabs.move` 到目标窗口再分组。
6. 即使分析时发生包装页解包，执行仍对原 tabId 操作，不新建标签。

### 6.2 回滚
1. 读取 `checkpoint:last`。
2. 恢复标签 window/index。
3. 复建或重挂原 `groupId`，并恢复组标题/颜色/折叠状态。
4. 输出 `restored/failed`。

## 7. 权限模型
- `permissions`: `tabs`, `tabGroups`, `storage`
- `host_permissions`:
  - `https://api.minimaxi.com/*`
  - `https://www.minimaxi.com/*`

说明：
- 不读取页面正文；
- 只使用标题/URL/域名与标签元信息。

## 8. 测试策略
### 8.1 单元测试
- 旧设置迁移（含归档）。
- Token 规范化（去除 `Bearer ` 前缀）。
- remains 解析与 `401/403/429` 错误映射。

### 8.2 集成测试
- 设置页：保存 Key -> 查询额度 -> 发起分析。
- 无效/过期/空 Key 的一致错误提示。
- AI 失败路径下确认零变更。

### 8.3 手工回归
- MiniMax-only 模式下完成主流程闭环。
- 额度查询成功/失败场景。
- 80 标签场景性能目标不回退。
- 包装页开关回归：
  - 关闭开关时包装页不参与分析；
  - 打开开关时可识别包装页内原始 URL 且执行不激活新标签。
- 预览交互回归：
  - 组卡片内 `Move` 调组后，组内 tab 分布即时刷新；
  - `analyze/apply/undo` smoke 全通过。
