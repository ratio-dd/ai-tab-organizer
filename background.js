const TAB_GROUP_ID_NONE = -1;

const SETTINGS_KEY = "settings";
const PLANS_KEY = "plans";
const CHECKPOINT_KEY = "checkpoint:last";
const STATS_KEY = "stats";
const TOKEN_PLAN_REMAINS_KEY = "tokenPlanRemainsCache";
const LEGACY_SETTINGS_ARCHIVE_KEY = "settings:legacyArchive";
const TOKEN_PLAN_REMAINS_TTL_MS = 2 * 60 * 1000;
const LEGACY_PROVIDER_KEYS = [
  "provider",
  "openaiApiKey",
  "openaiModel",
  "kimiApiKey",
  "kimiModel"
];
const MIN_TIMEOUT_MS = 2000;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TIMEOUT_MS = 60000;
const MODEL_TAB_TITLE_MAX = 120;
const MODEL_TAB_URL_MAX = 480;
const MODEL_QUERY_KEYS_MAX = 8;
const MODEL_PAYLOAD_CHAR_BUDGET = 24000;
const FALLBACK_COLOR_SEQUENCE = [
  "blue",
  "green",
  "orange",
  "purple",
  "cyan",
  "red",
  "yellow",
  "pink",
  "grey"
];

const ALLOWED_COLORS = new Set([
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange"
]);

const DEFAULT_SETTINGS = {
  scopeDefault: "current_window",
  privacyMode: "redacted",
  language: "zh-CN",
  telemetryEnabled: true,
  promptTemplates: [
    { id: "focus-work", name: "工作流优先", prompt: "请优先按当前工作任务进行分组，避免过细。" },
    { id: "domain-first", name: "域名优先", prompt: "请以域名和站点上下文为主进行分组。" },
    { id: "reading", name: "阅读清单", prompt: "请按阅读主题分组，并把低相关项放入未分组。" }
  ],
  granularity: "medium",
  namingGranularity: "balanced",
  colorPolicy: "ai_auto",
  includeExistingGroupsDefault: false,
  minimaxApiKey: "",
  minimaxModel: "MiniMax-M2.7",
  analysisTimeoutMs: DEFAULT_TIMEOUT_MS
};

const DEFAULT_STATS = {
  totalRuns: 0,
  successfulAnalyze: 0,
  successfulApply: 0,
  failedRuns: 0,
  totalAnalyzeMs: 0,
  undoCount: 0,
  lastErrorCode: ""
};

class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  const stats = await getRawStats();
  await chrome.storage.local.set({ [STATS_KEY]: stats });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => {
      sendResponse({ ok: true, data });
    })
    .catch(async (error) => {
      const appError = normalizeError(error);
      await recordFailure(appError.code);
      sendResponse({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message
        }
      });
    });

  return true;
});

async function handleMessage(message) {
  if (!message || !message.type) {
    throw new AppError("INVALID_REQUEST", "请求参数无效。");
  }

  switch (message.type) {
    case "analyzeTabs":
      return analyzeTabs(message.options || {});
    case "applyPlan":
      return applyPlan(message.planId, message.edits || [], Boolean(message.crossWindowMove));
    case "undoLastRun":
      return undoLastRun();
    case "getRunStats":
      return getRunStats();
    case "getSettings":
      return getSettings();
    case "saveSettings":
      return saveSettings(message.settings || {});
    case "getTokenPlanRemains":
      return getTokenPlanRemains(Boolean(message.forceRefresh));
    default:
      throw new AppError("UNSUPPORTED_MESSAGE", `不支持的消息类型: ${message.type}`);
  }
}

async function analyzeTabs(options) {
  await recordTelemetry((stats) => {
    stats.totalRuns += 1;
  });

  const settings = await getSettings();
  const runOptions = normalizeRunOptions(options, settings);
  const startedAt = Date.now();

  const candidates = await collectCandidateTabs(runOptions);
  if (candidates.length === 0) {
    throw new AppError("NO_ELIGIBLE_TABS", "当前条件下没有可整理的标签页。请调整范围或过滤条件。");
  }

  let aiResult;
  try {
    aiResult = await requestGroupingFromMiniMax(candidates, runOptions, settings);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("AI_NETWORK_ERROR", "调用 AI 失败，请稍后重试。");
  }

  const proposal = buildGroupingProposal(aiResult, candidates, runOptions);
  await persistProposal(proposal);

  await recordTelemetry((stats) => {
    stats.successfulAnalyze += 1;
    stats.totalAnalyzeMs += Date.now() - startedAt;
  });

  return proposal;
}

async function applyPlan(planId, edits, crossWindowMove) {
  const proposal = await getProposalById(planId);
  if (!proposal) {
    throw new AppError("PLAN_NOT_FOUND", "分组提案不存在或已过期，请重新分析。");
  }

  const normalized = normalizeEditedGroups(proposal, edits);
  const candidateTabIds = proposal.candidates.map((tab) => tab.tabId);
  const checkpoint = await buildUndoCheckpoint(proposal.runId, candidateTabIds);
  await chrome.storage.local.set({ [CHECKPOINT_KEY]: checkpoint });

  const existingTabIds = [];
  for (const tabId of candidateTabIds) {
    const tab = await getTabSafe(tabId);
    if (tab) {
      existingTabIds.push(tabId);
    }
  }

  if (existingTabIds.length === 0) {
    throw new AppError("APPLY_FAILED", "没有可执行分组的有效标签页。");
  }

  await ungroupTabsSafe(existingTabIds);

  let appliedGroupCount = 0;

  for (const group of normalized.groups) {
    const liveTabs = await getLiveTabs(group.tabIds);
    if (liveTabs.length === 0) {
      continue;
    }

    if (crossWindowMove) {
      const targetWindowId = liveTabs[0].windowId;
      for (const tab of liveTabs) {
        if (tab.windowId !== targetWindowId) {
          await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 });
        }
      }

      const movedTabs = await getLiveTabs(group.tabIds);
      const tabIds = movedTabs.map((tab) => tab.id);
      if (tabIds.length > 0) {
        await createAndUpdateGroup(tabIds, targetWindowId, group.name, group.color);
        appliedGroupCount += 1;
      }
      continue;
    }

    const byWindow = new Map();
    for (const tab of liveTabs) {
      const list = byWindow.get(tab.windowId) || [];
      list.push(tab.id);
      byWindow.set(tab.windowId, list);
    }

    for (const [windowId, tabIds] of byWindow.entries()) {
      if (tabIds.length === 0) {
        continue;
      }
      await createAndUpdateGroup(tabIds, windowId, group.name, group.color);
      appliedGroupCount += 1;
    }
  }

  await recordTelemetry((stats) => {
    stats.successfulApply += 1;
  });

  return {
    runId: proposal.runId,
    appliedGroupCount,
    affectedTabCount: existingTabIds.length
  };
}

async function undoLastRun() {
  const data = await chrome.storage.local.get(CHECKPOINT_KEY);
  const checkpoint = data[CHECKPOINT_KEY];

  if (!checkpoint || !Array.isArray(checkpoint.tabStates) || checkpoint.tabStates.length === 0) {
    throw new AppError("UNDO_NOT_AVAILABLE", "没有可撤销的历史记录。");
  }

  const states = [...checkpoint.tabStates].sort((a, b) => {
    if (a.windowId === b.windowId) {
      return a.index - b.index;
    }
    return a.windowId - b.windowId;
  });

  const existingTabIds = [];
  for (const state of states) {
    const tab = await getTabSafe(state.tabId);
    if (tab) {
      existingTabIds.push(state.tabId);
    }
  }

  await ungroupTabsSafe(existingTabIds);

  let restored = 0;
  let failed = 0;

  for (const state of states) {
    const tab = await getTabSafe(state.tabId);
    if (!tab) {
      failed += 1;
      continue;
    }

    try {
      await chrome.tabs.move(state.tabId, {
        windowId: state.windowId,
        index: state.index
      });
      restored += 1;
    } catch (_error) {
      try {
        await chrome.tabs.move(state.tabId, { index: -1 });
        restored += 1;
      } catch (_fallbackError) {
        failed += 1;
      }
    }
  }

  const recreatedGroupMap = {};

  for (const state of states) {
    if (state.groupId === TAB_GROUP_ID_NONE) {
      continue;
    }

    const tab = await getTabSafe(state.tabId);
    if (!tab) {
      failed += 1;
      continue;
    }

    const mappedGroupId = recreatedGroupMap[state.groupId] ?? state.groupId;

    try {
      await chrome.tabs.group({ groupId: mappedGroupId, tabIds: [state.tabId] });
    } catch (_error) {
      try {
        const newGroupId = await chrome.tabs.group({
          tabIds: [state.tabId],
          createProperties: { windowId: tab.windowId }
        });

        const sourceMeta = checkpoint.groupMeta?.[state.groupId];
        if (sourceMeta) {
          await chrome.tabGroups.update(newGroupId, {
            title: sourceMeta.title || "",
            color: normalizeColor(sourceMeta.color),
            collapsed: Boolean(sourceMeta.collapsed)
          });
        }

        recreatedGroupMap[state.groupId] = newGroupId;
      } catch (_createError) {
        failed += 1;
      }
    }
  }

  const shouldBeUngrouped = states
    .filter((state) => state.groupId === TAB_GROUP_ID_NONE)
    .map((state) => state.tabId);
  await ungroupTabsSafe(shouldBeUngrouped);

  if (restored > 0) {
    await recordTelemetry((stats) => {
      stats.undoCount += 1;
    });
  }

  return { restored, failed };
}

async function collectCandidateTabs(options) {
  const queryInfo =
    options.scope === "all_windows"
      ? { windowType: "normal" }
      : { currentWindow: true, windowType: "normal" };

  const tabs = await chrome.tabs.query(queryInfo);
  const includeExistingGroups = Boolean(options.includeExistingGroups);

  const candidates = [];
  for (const tab of tabs) {
    const url = resolveTabUrlForAnalysis(
      tab.url || tab.pendingUrl || "",
      Boolean(options.includeSuspendedWrappedTabs)
    );
    if (shouldSkipTab(tab, includeExistingGroups, url)) {
      continue;
    }

    const domain = extractDomain(url);
    candidates.push({
      tabId: tab.id,
      windowId: tab.windowId,
      index: tab.index,
      title: tab.title || "(Untitled)",
      url,
      domain,
      pinned: Boolean(tab.pinned),
      existingGroupId:
        typeof tab.groupId === "number" ? tab.groupId : TAB_GROUP_ID_NONE
    });
  }

  candidates.sort((a, b) => {
    if (a.windowId === b.windowId) {
      return a.index - b.index;
    }
    return a.windowId - b.windowId;
  });

  return candidates;
}

function shouldSkipTab(tab, includeExistingGroups, resolvedUrl) {
  if (!tab || typeof tab.id !== "number") {
    return true;
  }

  if (tab.pinned) {
    return true;
  }

  const url = String(resolvedUrl || tab.url || tab.pendingUrl || "").trim();
  if (!url || isRestrictedUrl(url)) {
    return true;
  }

  if (!includeExistingGroups && typeof tab.groupId === "number" && tab.groupId !== TAB_GROUP_ID_NONE) {
    return true;
  }

  return false;
}

function resolveTabUrlForAnalysis(rawUrl, allowUnwrapWrappedTab) {
  const raw = String(rawUrl || "").trim();
  if (!raw) {
    return "";
  }

  if (!allowUnwrapWrappedTab) {
    return raw;
  }

  const unwrapped = unwrapEmbeddedTargetUrl(raw);
  return unwrapped || raw;
}

function unwrapEmbeddedTargetUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "chrome-extension:") {
      return "";
    }

    const nestedRaw =
      parsed.searchParams.get("url") ||
      parsed.searchParams.get("target") ||
      parsed.searchParams.get("link");
    if (!nestedRaw) {
      return "";
    }

    const decoded = decodeNestedUrl(nestedRaw);
    if (/^https?:\/\//i.test(decoded)) {
      return decoded;
    }
    return "";
  } catch (_error) {
    return "";
  }
}

function decodeNestedUrl(value) {
  let text = String(value || "").trim();
  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) {
        break;
      }
      text = decoded;
    } catch (_error) {
      break;
    }
  }
  return text;
}

function isRestrictedUrl(url) {
  const lower = String(url).toLowerCase();
  return (
    lower.startsWith("chrome://") ||
    lower.startsWith("chrome-extension://") ||
    lower.startsWith("devtools://") ||
    lower.startsWith("edge://") ||
    lower.startsWith("about:") ||
    lower.startsWith("view-source:") ||
    lower.startsWith("javascript:")
  );
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname || "unknown";
  } catch (_error) {
    return "unknown";
  }
}

function buildModelPromptPayload(candidates, options, settings) {
  const sanitizedCandidates = candidates.map((candidate) =>
    sanitizeCandidateForModel(candidate, settings.privacyMode)
  );

  const templateText = findTemplatePrompt(settings.promptTemplates, options.templateId);
  const strategyGuidance = [
    buildGranularityGuidance(options.granularity),
    buildNamingGuidance(options.namingGranularity)
  ]
    .filter(Boolean)
    .join("\n");
  const userPrompt = [strategyGuidance, templateText, options.userPrompt || ""]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "你是标签页整理助手，目标是帮助用户更快找回标签。",
    "必须只输出 JSON 对象，不允许输出任何解释性文字。",
    "输出格式必须是 {\"groups\":[...],\"ungrouped\":[...]}。",
    "groups[].tabIds 必须严格使用输入 tabs 中已有的 tabId，禁止使用索引、标题、URL 代替。",
    "每个 tabId 只能出现一次，不确定时请放入 ungrouped。",
    "请同时遵循 granularity 与 namingGranularity，控制分组粗细和组名宽泛度。"
  ].join("\n");

  const payload = {
    goal: "group_tabs_for_fast_retrieval",
    groupingMode: options.groupingMode,
    granularity: options.granularity,
    namingGranularity: options.namingGranularity,
    guidance: userPrompt,
    tabs: sanitizedCandidates.map((tab) => ({
      tabId: tab.tabId,
      title: tab.title,
      url: tab.url,
      domain: tab.domain,
      windowId: tab.windowId,
      existingGroupId: tab.existingGroupId
    }))
  };

  return { systemPrompt, payload };
}

async function requestGroupingFromMiniMax(candidates, options, settings) {
  const chunks = splitCandidatesForModel(candidates, options, settings);
  if (chunks.length > 1) {
    const merged = await requestGroupingFromMiniMaxByChunks(chunks, options, settings);
    return merged;
  }

  return requestGroupingFromMiniMaxSingle(chunks[0] || candidates, options, settings);
}

async function requestGroupingFromMiniMaxByChunks(chunks, options, settings) {
  const mergedGroups = [];
  const mergedUngrouped = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunkCandidates = chunks[index];
    const chunkResult = await requestGroupingFromMiniMaxSingle(
      chunkCandidates,
      options,
      settings
    );
    const chunkProposal = buildGroupingProposal(chunkResult, chunkCandidates, options);

    for (const group of chunkProposal.groups) {
      mergedGroups.push({
        name: group.name,
        color: group.color,
        tabIds: group.tabIds,
        reason: group.reason,
        confidence: group.confidence
      });
    }

    if (Array.isArray(chunkProposal.ungrouped)) {
      mergedUngrouped.push(...chunkProposal.ungrouped);
    }
  }

  return {
    groups: mergeChunkGroupsByName(mergedGroups),
    ungrouped: [...new Set(mergedUngrouped.filter((id) => Number.isInteger(Number(id))))]
  };
}

async function requestGroupingFromMiniMaxSingle(candidates, options, settings) {
  const apiKey = normalizeApiToken(settings.minimaxApiKey);
  if (!apiKey) {
    throw new AppError("AI_NETWORK_ERROR", "请先在设置中填写 MiniMax Token Plan Key。");
  }

  const { systemPrompt, payload } = buildModelPromptPayload(candidates, options, settings);

  const timeoutMs = getAnalyzeTimeoutMs(settings, candidates.length);
  const response = await fetchWithTimeout(
    "https://api.minimaxi.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings.minimaxModel || "MiniMax-M2.7",
        temperature: 0.2,
        top_p: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) }
        ]
      })
    },
    timeoutMs
  );

  if (!response.ok) {
    const msg = await response.text();
    if (response.status === 401) {
      throw new AppError(
        "AI_AUTH_401",
        "MiniMax Token Plan 认证失败（401）：Token 无效或已过期。"
      );
    }
    if (response.status === 403) {
      throw new AppError(
        "AI_FORBIDDEN_403",
        "MiniMax Token Plan 权限不足（403）：当前账号或套餐无该模型/接口权限。"
      );
    }
    if (response.status === 429) {
      throw new AppError(
        "AI_RATE_LIMIT_429",
        "MiniMax Token Plan 触发限频（429）：请稍后重试。"
      );
    }
    throw new AppError("AI_NETWORK_ERROR", `MiniMax 请求失败（${response.status}）：${msg.slice(0, 160)}`);
  }

  const result = await response.json();
  const parsed =
    parseModelJson(extractContentFromCompletion(result)) ||
    extractStructuredObjectFromCompletion(result);

  if (!parsed || typeof parsed !== "object") {
    const keyHint = isPlainObject(result) ? Object.keys(result).slice(0, 6).join(",") : "unknown";
    throw new AppError("AI_INVALID_RESPONSE", `MiniMax 返回格式无效，请重试。返回字段: ${keyHint}`);
  }

  return parsed;
}

function splitCandidatesForModel(candidates, options, settings) {
  const chunks = [];
  let current = [];

  for (const candidate of candidates) {
    current.push(candidate);

    const currentPayloadSize = estimateModelPayloadSize(current, options, settings);
    if (currentPayloadSize <= MODEL_PAYLOAD_CHAR_BUDGET) {
      continue;
    }

    const overflow = current.pop();
    if (current.length === 0) {
      current.push(overflow);
      chunks.push(current);
      current = [];
    } else {
      chunks.push(current);
      current = [overflow];
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [candidates];
}

function estimateModelPayloadSize(candidates, options, settings) {
  const { payload } = buildModelPromptPayload(candidates, options, settings);
  return JSON.stringify(payload).length;
}

function mergeChunkGroupsByName(groups) {
  const merged = new Map();

  for (const group of groups) {
    const key = String(group?.name || "")
      .trim()
      .toLowerCase()
      .slice(0, 48);
    const safeKey = key || "__fallback__";
    const existing = merged.get(safeKey);

    if (!existing) {
      merged.set(safeKey, {
        name: normalizeName(group?.name, "分组"),
        color: normalizeColor(group?.color),
        tabIds: [...new Set((group?.tabIds || []).filter((id) => Number.isInteger(Number(id))))],
        reason: normalizeReason(group?.reason),
        confidence: normalizeConfidence(group?.confidence)
      });
      continue;
    }

    const mergedIds = new Set(existing.tabIds);
    for (const id of group?.tabIds || []) {
      const numeric = Number(id);
      if (Number.isInteger(numeric)) {
        mergedIds.add(numeric);
      }
    }
    existing.tabIds = [...mergedIds];
    existing.confidence = normalizeConfidence(
      (Number(existing.confidence) + Number(group?.confidence || 0.5)) / 2
    );
  }

  return [...merged.values()].filter((group) => group.tabIds.length > 0);
}

async function getTokenPlanRemains(forceRefresh = false) {
  const settings = await getSettings();
  const token = normalizeApiToken(settings.minimaxApiKey);
  if (!token) {
    throw new AppError("AI_NETWORK_ERROR", "请先在设置中填写 MiniMax Token Plan Key。");
  }

  const cacheData = await chrome.storage.local.get(TOKEN_PLAN_REMAINS_KEY);
  const cache = isPlainObject(cacheData[TOKEN_PLAN_REMAINS_KEY])
    ? cacheData[TOKEN_PLAN_REMAINS_KEY]
    : null;

  if (
    !forceRefresh &&
    cache &&
    Number.isFinite(cache.fetchedAt) &&
    Date.now() - cache.fetchedAt < TOKEN_PLAN_REMAINS_TTL_MS &&
    isPlainObject(cache.data)
  ) {
    return {
      fromCache: true,
      fetchedAt: cache.fetchedAt,
      data: cache.data
    };
  }

  const timeoutMs = resolveBaseTimeoutMs(settings);
  const response = await fetchWithTimeout(
    "https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    timeoutMs
  );

  if (!response.ok) {
    const msg = await response.text();
    if (response.status === 401) {
      throw new AppError("AI_AUTH_401", "Token Plan 认证失败（401）：Token 无效或已过期。");
    }
    if (response.status === 403) {
      throw new AppError("AI_FORBIDDEN_403", "Token Plan 权限不足（403）：当前账号无查询权限。");
    }
    if (response.status === 429) {
      throw new AppError("AI_RATE_LIMIT_429", "Token Plan 查询限频（429）：请稍后再试。");
    }
    throw new AppError(
      "AI_NETWORK_ERROR",
      `Token Plan 额度查询失败（${response.status}）：${msg.slice(0, 160)}`
    );
  }

  const raw = await response.json();
  const normalized = normalizeTokenPlanRemains(raw);
  const payload = {
    fetchedAt: Date.now(),
    data: normalized
  };

  await chrome.storage.local.set({
    [TOKEN_PLAN_REMAINS_KEY]: payload
  });

  return {
    fromCache: false,
    ...payload
  };
}

function normalizeTokenPlanRemains(raw) {
  if (!isPlainObject(raw)) {
    return {
      remains: null,
      limit: null,
      used: null,
      resetAt: null,
      raw
    };
  }

  const data = isPlainObject(raw.data) ? raw.data : raw;
  const remains = readFirstFiniteNumber(data, ["remains", "remaining", "left", "available"]);
  const limit = readFirstFiniteNumber(data, ["limit", "quota", "total"]);
  const used = readFirstFiniteNumber(data, ["used", "consumed", "usage"]);
  const resetAt = readFirstStringValue(data, ["resetAt", "reset_at", "expireAt", "expire_at"]);

  return {
    remains,
    limit,
    used,
    resetAt,
    raw: data
  };
}

function extractContentFromCompletion(result) {
  return (
    result?.choices?.[0]?.message?.content ??
    result?.output_text ??
    result?.reply ??
    result?.text ??
    ""
  );
}

function parseModelJson(content) {
  if (typeof content === "string") {
    return safeJsonParse(normalizeModelJsonText(content));
  }

  if (isPlainObject(content)) {
    if (typeof content.text === "string") {
      return safeJsonParse(normalizeModelJsonText(content.text));
    }
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n");

    return safeJsonParse(normalizeModelJsonText(text));
  }

  return null;
}

function extractStructuredObjectFromCompletion(result) {
  const message = result?.choices?.[0]?.message;
  const candidates = [
    message?.parsed,
    message?.json,
    isPlainObject(message?.content) ? message.content : null,
    isPlainObject(result?.data) ? result.data : null,
    isPlainObject(result?.result) ? result.result : null,
    isPlainObject(result?.output) ? result.output : null
  ];

  for (const candidate of candidates) {
    if (isPlainObject(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeModelJsonText(raw) {
  const cleaned = stripThinkingTags(String(raw || "").trim());
  return stripCodeFence(cleaned);
}

function stripThinkingTags(raw) {
  return String(raw || "").replace(/<think[\s\S]*?<\/think>/gi, "").trim();
}

function stripCodeFence(raw) {
  const text = String(raw || "").trim();
  if (!text.startsWith("```") || !text.endsWith("```")) {
    return text;
  }

  return text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function buildGroupingProposal(aiResult, candidates, options) {
  const candidateIdSet = new Set(candidates.map((tab) => tab.tabId));
  const usedTabIds = new Set();

  const adapted = adaptAiResult(aiResult);
  const groups = adapted.groups;
  const normalizedGroups = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const rawTabIds = extractTabIdsFromGroup(group);

    const tabIds = [];
    for (const id of rawTabIds) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId)) {
        continue;
      }
      if (!candidateIdSet.has(numericId) || usedTabIds.has(numericId)) {
        continue;
      }
      usedTabIds.add(numericId);
      tabIds.push(numericId);
    }

    if (tabIds.length === 0) {
      continue;
    }

    normalizedGroups.push({
      id: `group-${index + 1}`,
      name: normalizeName(
        group?.name || group?.title || group?.label || group?.topic,
        `分组 ${index + 1}`
      ),
      color: normalizeColor(group?.color),
      tabIds,
      reason: normalizeReason(group?.reason || group?.rationale || group?.summary),
      confidence: normalizeConfidence(group?.confidence)
    });
  }

  if (normalizedGroups.length === 0) {
    const fallback = buildDomainFallbackGroups(candidates);
    if (fallback.groups.length > 0) {
      return {
        planId: generateId(),
        runId: generateId(),
        generatedAt: Date.now(),
        optionsSnapshot: options,
        groups: fallback.groups,
        ungrouped: fallback.ungrouped,
        candidates
      };
    }

    const keyHint = isPlainObject(aiResult)
      ? Object.keys(aiResult).slice(0, 6).join(",")
      : "unknown";
    throw new AppError(
      "AI_INVALID_RESPONSE",
      `AI 未生成有效分组，请重试。返回字段提示: ${keyHint || "none"}`
    );
  }

  const ungrouped = [];
  const rawUngrouped = adapted.ungrouped;
  for (const id of rawUngrouped) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      continue;
    }
    if (!candidateIdSet.has(numericId) || usedTabIds.has(numericId)) {
      continue;
    }
    usedTabIds.add(numericId);
    ungrouped.push(numericId);
  }

  for (const tab of candidates) {
    if (!usedTabIds.has(tab.tabId)) {
      ungrouped.push(tab.tabId);
    }
  }

  return {
    planId: generateId(),
    runId: generateId(),
    generatedAt: Date.now(),
    optionsSnapshot: options,
    groups: normalizedGroups,
    ungrouped,
    candidates
  };
}

function adaptAiResult(aiResult) {
  const roots = collectResultRoots(aiResult);

  let groups = [];
  let ungrouped = [];

  for (const root of roots) {
    const candidate = pickFirstArray(root, [
      "groups",
      "groupings",
      "clusters",
      "categories",
      "sections",
      "plans"
    ]);
    if (candidate.length > 0) {
      groups = candidate;
      break;
    }
  }

  for (const root of roots) {
    const candidate = pickFirstArray(root, [
      "ungrouped",
      "unassigned",
      "others",
      "rest",
      "leftovers"
    ]);
    if (candidate.length > 0) {
      ungrouped = candidate;
      break;
    }
  }

  return { groups, ungrouped };
}

function collectResultRoots(aiResult) {
  const list = [];
  if (isPlainObject(aiResult)) {
    list.push(aiResult);
    for (const key of ["data", "result", "output", "payload", "plan"]) {
      if (isPlainObject(aiResult[key])) {
        list.push(aiResult[key]);
      }
    }
  }
  return list;
}

function pickFirstArray(source, keys) {
  if (!isPlainObject(source)) {
    return [];
  }
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function extractTabIdsFromGroup(group) {
  if (!isPlainObject(group)) {
    return [];
  }

  const rawList =
    group.tabIds ||
    group.tab_ids ||
    group.tabs ||
    group.items ||
    group.members ||
    group.tabList;

  if (!Array.isArray(rawList)) {
    return [];
  }

  const ids = [];
  for (const item of rawList) {
    if (Number.isInteger(Number(item))) {
      ids.push(Number(item));
      continue;
    }

    if (isPlainObject(item)) {
      const rawId = item.tabId ?? item.tab_id ?? item.id ?? item.tab;
      if (Number.isInteger(Number(rawId))) {
        ids.push(Number(rawId));
      }
    }
  }

  return ids;
}

function buildDomainFallbackGroups(candidates) {
  const byDomain = new Map();
  for (const tab of candidates) {
    const domain = String(tab.domain || "unknown").trim() || "unknown";
    const list = byDomain.get(domain) || [];
    list.push(tab);
    byDomain.set(domain, list);
  }

  const entries = [...byDomain.entries()].sort((a, b) => b[1].length - a[1].length);
  const groups = [];
  const ungrouped = [];

  for (const [domain, tabs] of entries) {
    if (tabs.length <= 1) {
      for (const tab of tabs) {
        ungrouped.push(tab.tabId);
      }
      continue;
    }

    groups.push({
      id: `fallback-${groups.length + 1}`,
      name: normalizeName(domain, `分组 ${groups.length + 1}`),
      color: FALLBACK_COLOR_SEQUENCE[groups.length % FALLBACK_COLOR_SEQUENCE.length],
      tabIds: tabs.map((tab) => tab.tabId),
      reason: "AI 输出格式不稳定，按域名回退分组。",
      confidence: 0.35
    });
  }

  if (groups.length === 0 && candidates.length > 0) {
    return {
      groups: [
        {
          id: "fallback-1",
          name: "临时分组",
          color: FALLBACK_COLOR_SEQUENCE[0],
          tabIds: candidates.map((tab) => tab.tabId),
          reason: "AI 输出格式不稳定，临时将标签归为一组。",
          confidence: 0.2
        }
      ],
      ungrouped: []
    };
  }

  if (groups.length > 8) {
    const keep = groups.slice(0, 7);
    const tailTabIds = groups.slice(7).flatMap((group) => group.tabIds);
    keep.push({
      id: "fallback-others",
      name: "其他站点",
      color: "grey",
      tabIds: tailTabIds,
      reason: "分组过多，已合并尾部分组。",
      confidence: 0.3
    });
    return { groups: keep, ungrouped };
  }

  return { groups, ungrouped };
}

async function persistProposal(proposal) {
  const data = await chrome.storage.local.get(PLANS_KEY);
  const plans = isPlainObject(data[PLANS_KEY]) ? data[PLANS_KEY] : {};

  plans[proposal.planId] = proposal;

  const values = Object.values(plans).sort((a, b) => b.generatedAt - a.generatedAt);
  const keep = new Set(values.slice(0, 10).map((item) => item.planId));

  for (const key of Object.keys(plans)) {
    if (!keep.has(key)) {
      delete plans[key];
    }
  }

  await chrome.storage.local.set({ [PLANS_KEY]: plans });
}

async function getProposalById(planId) {
  const data = await chrome.storage.local.get(PLANS_KEY);
  const plans = isPlainObject(data[PLANS_KEY]) ? data[PLANS_KEY] : {};
  return plans[planId] || null;
}

function normalizeEditedGroups(proposal, edits) {
  const sourceGroups = Array.isArray(edits) && edits.length > 0 ? edits : proposal.groups;
  const candidateIdSet = new Set(proposal.candidates.map((tab) => tab.tabId));
  const used = new Set();
  const normalized = [];

  for (let i = 0; i < sourceGroups.length; i += 1) {
    const group = sourceGroups[i];
    const tabIds = [];

    for (const rawId of Array.isArray(group?.tabIds) ? group.tabIds : []) {
      const id = Number(rawId);
      if (!Number.isInteger(id) || !candidateIdSet.has(id) || used.has(id)) {
        continue;
      }
      used.add(id);
      tabIds.push(id);
    }

    if (tabIds.length === 0) {
      continue;
    }

    normalized.push({
      id: group?.id || `group-${i + 1}`,
      name: normalizeName(group?.name, `分组 ${i + 1}`),
      color: normalizeColor(group?.color),
      tabIds,
      reason: normalizeReason(group?.reason),
      confidence: normalizeConfidence(group?.confidence)
    });
  }

  if (normalized.length === 0) {
    throw new AppError("APPLY_FAILED", "没有可执行分组，请在预览中先分配标签。");
  }

  return {
    groups: normalized,
    ungrouped: proposal.candidates
      .map((tab) => tab.tabId)
      .filter((tabId) => !used.has(tabId))
  };
}

async function buildUndoCheckpoint(runId, tabIds) {
  const tabStates = [];
  const groupIds = new Set();

  for (const tabId of tabIds) {
    const tab = await getTabSafe(tabId);
    if (!tab) {
      continue;
    }

    const groupId =
      typeof tab.groupId === "number" ? tab.groupId : TAB_GROUP_ID_NONE;

    tabStates.push({
      tabId,
      windowId: tab.windowId,
      index: tab.index,
      groupId
    });

    if (groupId !== TAB_GROUP_ID_NONE) {
      groupIds.add(groupId);
    }
  }

  const groupMeta = {};
  for (const groupId of groupIds) {
    try {
      const group = await chrome.tabGroups.get(groupId);
      groupMeta[groupId] = {
        title: group.title || "",
        color: normalizeColor(group.color),
        collapsed: Boolean(group.collapsed)
      };
    } catch (_error) {
      // Ignore missing groups.
    }
  }

  return {
    runId,
    timestamp: Date.now(),
    tabStates,
    groupMeta
  };
}

async function createAndUpdateGroup(tabIds, windowId, name, color) {
  const groupId = await chrome.tabs.group({
    tabIds,
    createProperties: { windowId }
  });

  await chrome.tabGroups.update(groupId, {
    title: name,
    color: normalizeColor(color),
    collapsed: true
  });
}

async function getLiveTabs(tabIds) {
  const tabs = [];
  for (const tabId of tabIds) {
    const tab = await getTabSafe(tabId);
    if (tab) {
      tabs.push(tab);
    }
  }
  return tabs;
}

async function getTabSafe(tabId) {
  try {
    return await chrome.tabs.get(tabId);
  } catch (_error) {
    return null;
  }
}

async function ungroupTabsSafe(tabIds) {
  const unique = [...new Set((tabIds || []).filter((id) => Number.isInteger(id)))];
  if (unique.length === 0) {
    return;
  }

  try {
    await chrome.tabs.ungroup(unique);
  } catch (_error) {
    // Ignore tabs that are already ungrouped or unavailable.
  }
}

function applyPrivacyMode(candidate, privacyMode) {
  if (privacyMode !== "redacted") {
    return candidate;
  }

  return {
    ...candidate,
    title: String(candidate.title || "").slice(0, 120),
    url: redactUrl(candidate.url)
  };
}

function sanitizeCandidateForModel(candidate, privacyMode) {
  const base = applyPrivacyMode(candidate, privacyMode);
  return {
    ...base,
    title: normalizeTitleForModel(base.title),
    url: normalizeUrlForModel(base.url),
    domain: String(base.domain || "unknown").slice(0, 120)
  };
}

function normalizeTitleForModel(raw) {
  return String(raw || "").slice(0, MODEL_TAB_TITLE_MAX);
}

function normalizeUrlForModel(rawUrl) {
  const text = String(rawUrl || "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= MODEL_TAB_URL_MAX) {
    return text;
  }

  try {
    const parsed = new URL(text);
    const queryKeys = [...new Set([...parsed.searchParams.keys()])].slice(0, MODEL_QUERY_KEYS_MAX);
    const pathSegments = parsed.pathname.split("/").filter(Boolean).slice(0, 2);
    const compactPath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";
    const compactQuery = queryKeys.length > 0 ? `?${queryKeys.join("&")}` : "";
    return `${parsed.origin}${compactPath}${compactQuery}`.slice(0, MODEL_TAB_URL_MAX);
  } catch (_error) {
    return text.slice(0, MODEL_TAB_URL_MAX);
  }
}

function redactUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";

    const segments = parsed.pathname.split("/").filter(Boolean);
    parsed.pathname = segments.length > 0 ? `/${segments[0]}` : "/";

    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function findTemplatePrompt(templates, templateId) {
  if (!templateId) {
    return "";
  }

  const found = (templates || []).find((item) => item.id === templateId);
  return found?.prompt || "";
}

function buildGranularityGuidance(granularity) {
  if (granularity === "coarse") {
    return "分组粒度要求：宽泛。尽量减少组数量，优先合并相近主题。";
  }
  if (granularity === "fine") {
    return "分组粒度要求：精细。允许更多分组，按任务与意图细分。";
  }
  return "分组粒度要求：平衡。在可读性和组数量之间取中。";
}

function buildNamingGuidance(namingGranularity) {
  if (namingGranularity === "broad") {
    return "组名风格：宽泛命名。使用上位概念，避免过于具体的短期词。";
  }
  if (namingGranularity === "specific") {
    return "组名风格：具体命名。可包含更细任务上下文，便于精确识别。";
  }
  return "组名风格：平衡命名。简洁且有辨识度。";
}

function normalizeRunOptions(options, settings) {
  const scope = options.scope === "all_windows" ? "all_windows" : "current_window";
  const groupingMode =
    options.groupingMode === "domain_first" ? "domain_first" : "hybrid";
  const granularity =
    options.granularity === "coarse" || options.granularity === "fine"
      ? options.granularity
      : settings.granularity;
  const namingGranularity =
    options.namingGranularity === "broad" || options.namingGranularity === "specific"
      ? options.namingGranularity
      : settings.namingGranularity;

  return {
    scope,
    includeExistingGroups:
      typeof options.includeExistingGroups === "boolean"
        ? options.includeExistingGroups
        : Boolean(settings.includeExistingGroupsDefault),
    includeSuspendedWrappedTabs: Boolean(options.includeSuspendedWrappedTabs),
    groupingMode,
    granularity,
    namingGranularity,
    userPrompt: String(options.userPrompt || "").slice(0, 300),
    templateId: options.templateId ? String(options.templateId) : ""
  };
}

function normalizeName(raw, fallback) {
  const name = String(raw || "").trim();
  if (!name) {
    return fallback;
  }
  return name.slice(0, 48);
}

function normalizeReason(raw) {
  const reason = String(raw || "").trim();
  if (!reason) {
    return "AI 未提供理由";
  }
  return reason.slice(0, 160);
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0.5;
  }
  if (number < 0) {
    return 0;
  }
  if (number > 1) {
    return 1;
  }
  return Math.round(number * 100) / 100;
}

function normalizeColor(raw) {
  const color = String(raw || "").toLowerCase();
  if (ALLOWED_COLORS.has(color)) {
    return color;
  }
  return "grey";
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const safeTimeoutMs = Number.isFinite(Number(timeoutMs))
    ? Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Number(timeoutMs)))
    : DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), safeTimeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AppError(
        "AI_TIMEOUT",
        `AI 请求超时（>${safeTimeoutMs}ms），可在设置中提高“请求超时(ms)”后重试。`
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("UNKNOWN_ERROR", error?.message || "发生未知错误。");
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeApiToken(raw) {
  const token = String(raw || "").trim();
  if (!token) {
    return "";
  }

  return token.replace(/^Bearer\s+/i, "").trim();
}

async function getSettings() {
  const data = await chrome.storage.local.get([SETTINGS_KEY, LEGACY_SETTINGS_ARCHIVE_KEY]);
  const rawSettings = isPlainObject(data[SETTINGS_KEY]) ? data[SETTINGS_KEY] : {};
  const { cleanedSettings, legacy } = splitLegacySettings(rawSettings);
  const merged = mergeSettings(cleanedSettings);

  const shouldPersistCleaned =
    !isPlainObject(data[SETTINGS_KEY]) ||
    hasLegacySettings(legacy) ||
    !isSettingsShapeReady(rawSettings);

  if (shouldPersistCleaned) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  }

  if (hasLegacySettings(legacy)) {
    await archiveLegacySettings(data[LEGACY_SETTINGS_ARCHIVE_KEY], legacy, "startup_migration");
  }

  return merged;
}

async function saveSettings(partial) {
  const patch = isPlainObject(partial) ? partial : {};
  const { cleanedSettings: cleanedPatch, legacy } = splitLegacySettings(patch);
  const current = await getSettings();
  const merged = mergeSettings({
    ...current,
    ...cleanedPatch,
    promptTemplates:
      cleanedPatch.promptTemplates === undefined
        ? current.promptTemplates
        : cleanedPatch.promptTemplates
  });

  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });

  if (hasLegacySettings(legacy)) {
    const data = await chrome.storage.local.get(LEGACY_SETTINGS_ARCHIVE_KEY);
    await archiveLegacySettings(data[LEGACY_SETTINGS_ARCHIVE_KEY], legacy, "save_settings");
  }

  return merged;
}

function mergeSettings(input) {
  const { cleanedSettings } = splitLegacySettings(isPlainObject(input) ? input : {});
  const settings = cleanedSettings;

  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings
  };

  merged.scopeDefault =
    merged.scopeDefault === "all_windows" ? "all_windows" : "current_window";
  merged.privacyMode =
    merged.privacyMode === "full" ? "full" : "redacted";
  merged.language = merged.language === "en" ? "en" : "zh-CN";
  merged.telemetryEnabled = Boolean(merged.telemetryEnabled);
  merged.granularity =
    merged.granularity === "coarse" || merged.granularity === "fine"
      ? merged.granularity
      : "medium";
  merged.namingGranularity =
    merged.namingGranularity === "broad" || merged.namingGranularity === "specific"
      ? merged.namingGranularity
      : "balanced";
  merged.colorPolicy =
    merged.colorPolicy === "domain_palette" ? "domain_palette" : "ai_auto";
  merged.includeExistingGroupsDefault = Boolean(merged.includeExistingGroupsDefault);
  merged.minimaxApiKey = String(merged.minimaxApiKey || "").trim();
  merged.minimaxModel = String(merged.minimaxModel || DEFAULT_SETTINGS.minimaxModel).trim();

  merged.analysisTimeoutMs = resolveBaseTimeoutMs(merged);

  merged.promptTemplates = normalizeTemplates(merged.promptTemplates);

  return merged;
}

function splitLegacySettings(settings) {
  const source = isPlainObject(settings) ? settings : {};
  const legacy = {};
  const cleanedSettings = {};

  for (const [key, value] of Object.entries(source)) {
    if (LEGACY_PROVIDER_KEYS.includes(key)) {
      legacy[key] = value;
      continue;
    }
    cleanedSettings[key] = value;
  }

  return { cleanedSettings, legacy };
}

function hasLegacySettings(legacy) {
  return isPlainObject(legacy) && Object.keys(legacy).length > 0;
}

function isSettingsShapeReady(settings) {
  if (!isPlainObject(settings)) {
    return false;
  }
  for (const key of LEGACY_PROVIDER_KEYS) {
    if (key in settings) {
      return false;
    }
  }
  return true;
}

async function archiveLegacySettings(existingArchive, legacy, source) {
  const archiveList = Array.isArray(existingArchive) ? existingArchive : [];
  const next = [
    {
      archivedAt: Date.now(),
      source: String(source || "unknown"),
      legacy
    },
    ...archiveList
  ].slice(0, 20);

  await chrome.storage.local.set({
    [LEGACY_SETTINGS_ARCHIVE_KEY]: next
  });
}

function readFirstFiniteNumber(source, keys) {
  if (!isPlainObject(source)) {
    return null;
  }
  for (const key of keys) {
    const value = Number(source[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function readFirstStringValue(source, keys) {
  if (!isPlainObject(source)) {
    return null;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveBaseTimeoutMs(settings) {
  const value = Number(settings?.analysisTimeoutMs);
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMEOUT_MS;
  }
  const normalized = Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(value)));
  // Backward compatibility: previous versions defaulted to 8000ms.
  if (normalized === 8000) {
    return DEFAULT_TIMEOUT_MS;
  }
  return normalized;
}

function getAnalyzeTimeoutMs(settings, candidateCount) {
  const base = resolveBaseTimeoutMs(settings);
  const count = Number.isFinite(Number(candidateCount)) ? Number(candidateCount) : 0;
  const dynamic = 6000 + Math.max(0, count) * 120;
  return Math.min(MAX_TIMEOUT_MS, Math.max(base, dynamic));
}

function normalizeTemplates(templates) {
  if (!Array.isArray(templates) || templates.length === 0) {
    return [...DEFAULT_SETTINGS.promptTemplates];
  }

  const normalized = templates
    .filter((item) => isPlainObject(item))
    .map((item, index) => ({
      id: String(item.id || `tpl-${index + 1}`),
      name: normalizeName(item.name, `模板 ${index + 1}`),
      prompt: String(item.prompt || "").slice(0, 300)
    }))
    .filter((item) => item.prompt.length > 0);

  return normalized.length > 0 ? normalized : [...DEFAULT_SETTINGS.promptTemplates];
}

async function getRawStats() {
  const data = await chrome.storage.local.get(STATS_KEY);
  const stats = isPlainObject(data[STATS_KEY]) ? data[STATS_KEY] : {};
  return {
    ...DEFAULT_STATS,
    ...stats
  };
}

async function getRunStats() {
  const stats = await getRawStats();
  const avgAnalyzeMs =
    stats.successfulAnalyze > 0
      ? Math.round((stats.totalAnalyzeMs / stats.successfulAnalyze) * 100) / 100
      : 0;

  const acceptanceRate =
    stats.successfulAnalyze > 0
      ? round2(stats.successfulApply / stats.successfulAnalyze)
      : 0;

  const undoRate =
    stats.successfulApply > 0
      ? round2(stats.undoCount / stats.successfulApply)
      : 0;

  const errorRate = stats.totalRuns > 0 ? round2(stats.failedRuns / stats.totalRuns) : 0;

  return {
    totalRuns: stats.totalRuns,
    successfulAnalyze: stats.successfulAnalyze,
    successfulApply: stats.successfulApply,
    failedRuns: stats.failedRuns,
    avgAnalyzeMs,
    acceptanceRate,
    undoRate,
    errorRate,
    lastErrorCode: stats.lastErrorCode
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

async function recordTelemetry(mutator) {
  const settings = await getSettings();
  if (!settings.telemetryEnabled) {
    return;
  }

  const stats = await getRawStats();
  mutator(stats);
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

async function recordFailure(code) {
  await recordTelemetry((stats) => {
    stats.failedRuns += 1;
    stats.lastErrorCode = String(code || "UNKNOWN_ERROR");
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
