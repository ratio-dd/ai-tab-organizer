const I18N = {
  "zh-CN": {
    app_title: "AI 标签整理器",
    analysis_title: "分析参数",
    scope_label: "范围",
    include_existing: "纳入已有分组",
    mode_label: "分组模式",
    template_label: "模板",
    prompt_label: "补充提示词",
    analyze_btn: "开始分析",
    undo_btn: "撤销最近一次",
    preview_title: "预览与编辑",
    tab_assignment_title: "标签分配",
    cross_window_label: "跨窗口策略",
    apply_btn: "应用分组",
    stats_title: "统计",
    settings_title: "设置",
    language_label: "语言",
    privacy_label: "隐私模式",
    telemetry_label: "开启匿名统计",
    include_existing_default: "默认纳入已有分组",
    model_label: "MiniMax 模型",
    api_key_label: "MiniMax Token Plan Key",
    timeout_label: "请求超时(ms)",
    token_plan_title: "Token Plan 额度",
    refresh_remains_btn: "刷新额度",
    template_manage_title: "模板管理",
    template_name_label: "模板名称",
    template_prompt_label: "模板提示词",
    add_template_btn: "新增模板",
    save_settings_btn: "保存设置",
    scope_current: "当前窗口",
    scope_all: "全部窗口",
    mode_hybrid: "混合（主题+域名）",
    mode_domain: "域名优先",
    privacy_redacted: "脱敏",
    privacy_full: "完整",
    cross_keep: "不跨窗移动（每窗分别建组）",
    cross_move: "允许跨窗移动（按组归并）",
    ungrouped: "未分组",
    no_proposal: "还没有提案。",
    analyzing: "分析中，请稍候...",
    applying: "正在应用分组...",
    saving: "正在保存设置...",
    loading: "加载中...",
    remains_loading: "正在查询 Token Plan 额度...",
    remains_updated: "Token Plan 额度已更新。",
    remains_empty: "暂无额度数据",
    remains_source_live: "实时",
    remains_source_cache: "缓存",
    remains_updated_at: "更新时间",
    remains_field_remains: "剩余额度",
    remains_field_limit: "总额度",
    remains_field_used: "已使用",
    remains_field_reset: "重置时间",
    analyze_success: "分析完成，共 {count} 个候选标签。",
    apply_success: "分组应用完成。",
    settings_saved: "设置已保存。",
    template_added: "模板已添加。",
    undo_success: "撤销完成。恢复 {restored} 个标签。",
    undo_partial: "撤销完成，但有 {failed} 个标签恢复失败。",
    need_prompt: "模板提示词不能为空。",
    need_proposal: "请先完成分析并生成提案。",
    need_groups: "至少保留一个有标签的分组。",
    stat_total_runs: "分析总次数",
    stat_analyze_success: "分析成功",
    stat_apply_success: "执行成功",
    stat_failed: "失败次数",
    stat_avg_ms: "平均分析耗时(ms)",
    stat_acceptance: "接受率",
    stat_undo_rate: "撤销率",
    stat_error_rate: "错误率",
    stat_last_error: "最近错误码",
    prompt_placeholder: "例如：按项目优先，别分太细。",
    template_default: "不使用模板"
  },
  en: {
    app_title: "AI Tab Organizer",
    analysis_title: "Analysis",
    scope_label: "Scope",
    include_existing: "Include existing groups",
    mode_label: "Grouping mode",
    template_label: "Template",
    prompt_label: "Extra prompt",
    analyze_btn: "Analyze",
    undo_btn: "Undo last run",
    preview_title: "Preview & Edit",
    tab_assignment_title: "Tab assignment",
    cross_window_label: "Cross-window strategy",
    apply_btn: "Apply",
    stats_title: "Stats",
    settings_title: "Settings",
    language_label: "Language",
    privacy_label: "Privacy mode",
    telemetry_label: "Enable anonymous telemetry",
    include_existing_default: "Include existing groups by default",
    model_label: "MiniMax model",
    api_key_label: "MiniMax Token Plan Key",
    timeout_label: "Request timeout (ms)",
    token_plan_title: "Token Plan Remains",
    refresh_remains_btn: "Refresh remains",
    template_manage_title: "Template manager",
    template_name_label: "Template name",
    template_prompt_label: "Template prompt",
    add_template_btn: "Add template",
    save_settings_btn: "Save settings",
    scope_current: "Current window",
    scope_all: "All windows",
    mode_hybrid: "Hybrid (topic + domain)",
    mode_domain: "Domain first",
    privacy_redacted: "Redacted",
    privacy_full: "Full",
    cross_keep: "Do not move across windows",
    cross_move: "Allow moving across windows",
    ungrouped: "Ungrouped",
    no_proposal: "No proposal yet.",
    analyzing: "Analyzing...",
    applying: "Applying groups...",
    saving: "Saving settings...",
    loading: "Loading...",
    remains_loading: "Fetching Token Plan remains...",
    remains_updated: "Token Plan remains updated.",
    remains_empty: "No remains data",
    remains_source_live: "live",
    remains_source_cache: "cache",
    remains_updated_at: "Updated at",
    remains_field_remains: "Remains",
    remains_field_limit: "Limit",
    remains_field_used: "Used",
    remains_field_reset: "Reset at",
    analyze_success: "Analyze complete. Candidate tabs: {count}.",
    apply_success: "Applied successfully.",
    settings_saved: "Settings saved.",
    template_added: "Template added.",
    undo_success: "Undo completed. Restored {restored} tabs.",
    undo_partial: "Undo completed with {failed} failures.",
    need_prompt: "Template prompt cannot be empty.",
    need_proposal: "Please analyze tabs first.",
    need_groups: "At least one group with tabs is required.",
    stat_total_runs: "Analyze runs",
    stat_analyze_success: "Analyze success",
    stat_apply_success: "Apply success",
    stat_failed: "Failures",
    stat_avg_ms: "Avg analyze ms",
    stat_acceptance: "Acceptance",
    stat_undo_rate: "Undo rate",
    stat_error_rate: "Error rate",
    stat_last_error: "Last error",
    prompt_placeholder: "Example: prioritize project context and avoid tiny groups.",
    template_default: "No template"
  }
};

const COLOR_OPTIONS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange"
];

const state = {
  settings: null,
  proposal: null,
  draftGroups: [],
  tabAssignments: new Map(),
  tokenPlanRemains: null
};

const el = {
  status: document.getElementById("status"),
  scopeSelect: document.getElementById("scopeSelect"),
  includeExistingCheckbox: document.getElementById("includeExistingCheckbox"),
  groupingModeSelect: document.getElementById("groupingModeSelect"),
  templateSelect: document.getElementById("templateSelect"),
  userPromptInput: document.getElementById("userPromptInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  undoBtn: document.getElementById("undoBtn"),
  previewSection: document.getElementById("previewSection"),
  groupsEditor: document.getElementById("groupsEditor"),
  tabsEditor: document.getElementById("tabsEditor"),
  crossWindowRow: document.getElementById("crossWindowRow"),
  crossWindowSelect: document.getElementById("crossWindowSelect"),
  applyBtn: document.getElementById("applyBtn"),
  statsPanel: document.getElementById("statsPanel"),
  languageSelect: document.getElementById("languageSelect"),
  privacyModeSelect: document.getElementById("privacyModeSelect"),
  telemetryCheckbox: document.getElementById("telemetryCheckbox"),
  includeExistingDefaultCheckbox: document.getElementById("includeExistingDefaultCheckbox"),
  modelLabel: document.getElementById("modelLabel"),
  apiKeyLabel: document.getElementById("apiKeyLabel"),
  modelInput: document.getElementById("modelInput"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  analysisTimeoutInput: document.getElementById("analysisTimeoutInput"),
  tokenPlanRemainsMeta: document.getElementById("tokenPlanRemainsMeta"),
  tokenPlanRemainsBody: document.getElementById("tokenPlanRemainsBody"),
  refreshRemainsBtn: document.getElementById("refreshRemainsBtn"),
  templateNameInput: document.getElementById("templateNameInput"),
  templatePromptInput: document.getElementById("templatePromptInput"),
  addTemplateBtn: document.getElementById("addTemplateBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn")
};

init().catch((error) => {
  setStatus(error.message, "error");
});

async function init() {
  bindEvents();
  setStatus(t("loading"), "info");

  const settings = await sendMessage({ type: "getSettings" });
  state.settings = settings;

  applyI18n(settings.language || "zh-CN");
  renderStaticOptions();
  fillSettingsForm();
  populateTemplateSelect();
  syncControlsWithDefaults();

  await refreshStats();
  await refreshTokenPlanRemains(false);
  setStatus("", "info");
}

function bindEvents() {
  el.scopeSelect.addEventListener("change", () => {
    renderCrossWindowStrategyVisibility();
  });

  el.analyzeBtn.addEventListener("click", async () => {
    await onAnalyze();
  });

  el.applyBtn.addEventListener("click", async () => {
    await onApply();
  });

  el.undoBtn.addEventListener("click", async () => {
    await onUndo();
  });

  el.saveSettingsBtn.addEventListener("click", async () => {
    await onSaveSettings();
  });

  el.addTemplateBtn.addEventListener("click", async () => {
    await onAddTemplate();
  });

  el.refreshRemainsBtn.addEventListener("click", async () => {
    await refreshTokenPlanRemains(true);
  });
}

async function onAnalyze() {
  setStatus(t("analyzing"), "info");
  el.analyzeBtn.disabled = true;

  try {
    const options = {
      scope: el.scopeSelect.value,
      includeExistingGroups: el.includeExistingCheckbox.checked,
      groupingMode: el.groupingModeSelect.value,
      userPrompt: el.userPromptInput.value.trim(),
      templateId: el.templateSelect.value || ""
    };

    const proposal = await sendMessage({
      type: "analyzeTabs",
      options
    });

    state.proposal = proposal;
    buildDraftFromProposal();
    renderProposal();

    setStatus(
      t("analyze_success", {
        count: String(proposal.candidates?.length || 0)
      }),
      "ok"
    );
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    el.analyzeBtn.disabled = false;
    await refreshStats();
  }
}

async function onApply() {
  if (!state.proposal) {
    setStatus(t("need_proposal"), "warn");
    return;
  }

  const edits = buildEditedGroups();
  if (edits.length === 0) {
    setStatus(t("need_groups"), "warn");
    return;
  }

  setStatus(t("applying"), "info");
  el.applyBtn.disabled = true;

  try {
    const crossWindowMove =
      el.scopeSelect.value === "all_windows"
        ? el.crossWindowSelect.value === "move"
        : false;

    await sendMessage({
      type: "applyPlan",
      planId: state.proposal.planId,
      edits,
      crossWindowMove
    });

    setStatus(t("apply_success"), "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    el.applyBtn.disabled = false;
    await refreshStats();
  }
}

async function onUndo() {
  el.undoBtn.disabled = true;

  try {
    const result = await sendMessage({ type: "undoLastRun" });
    if (result.failed > 0) {
      setStatus(
        t("undo_partial", {
          failed: String(result.failed)
        }),
        "warn"
      );
    } else {
      setStatus(
        t("undo_success", {
          restored: String(result.restored)
        }),
        "ok"
      );
    }
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    el.undoBtn.disabled = false;
    await refreshStats();
  }
}

async function onSaveSettings() {
  setStatus(t("saving"), "info");

  try {
    const partial = {
      scopeDefault: el.scopeSelect.value,
      language: el.languageSelect.value,
      privacyMode: el.privacyModeSelect.value,
      telemetryEnabled: el.telemetryCheckbox.checked,
      includeExistingGroupsDefault: el.includeExistingDefaultCheckbox.checked,
      promptTemplates: state.settings.promptTemplates,
      minimaxModel: el.modelInput.value.trim(),
      minimaxApiKey: el.apiKeyInput.value.trim(),
      analysisTimeoutMs: normalizeTimeoutInput(
        el.analysisTimeoutInput.value,
        state.settings.analysisTimeoutMs
      )
    };

    const settings = await sendMessage({
      type: "saveSettings",
      settings: partial
    });

    state.settings = settings;

    applyI18n(settings.language);
    renderStaticOptions();
    fillSettingsForm();
    populateTemplateSelect();
    syncControlsWithDefaults();
    renderProposal();

    await refreshTokenPlanRemains(false);
    setStatus(t("settings_saved"), "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function onAddTemplate() {
  const prompt = el.templatePromptInput.value.trim();
  if (!prompt) {
    setStatus(t("need_prompt"), "warn");
    return;
  }

  const name = el.templateNameInput.value.trim() || `template-${Date.now()}`;
  const template = {
    id: `tpl-${Date.now()}`,
    name: name.slice(0, 30),
    prompt: prompt.slice(0, 300)
  };

  try {
    const nextTemplates = [...state.settings.promptTemplates, template];
    const settings = await sendMessage({
      type: "saveSettings",
      settings: { promptTemplates: nextTemplates }
    });

    state.settings = settings;
    populateTemplateSelect();
    el.templateSelect.value = template.id;
    el.templateNameInput.value = "";
    el.templatePromptInput.value = "";

    setStatus(t("template_added"), "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function buildDraftFromProposal() {
  if (!state.proposal) {
    state.draftGroups = [];
    state.tabAssignments = new Map();
    return;
  }

  state.draftGroups = state.proposal.groups.map((group) => ({
    id: group.id,
    name: group.name,
    color: group.color,
    reason: group.reason,
    confidence: group.confidence
  }));

  state.tabAssignments = new Map();

  for (const group of state.proposal.groups) {
    for (const tabId of group.tabIds) {
      state.tabAssignments.set(tabId, group.id);
    }
  }

  for (const tabId of state.proposal.ungrouped || []) {
    state.tabAssignments.set(tabId, "ungrouped");
  }

  for (const tab of state.proposal.candidates || []) {
    if (!state.tabAssignments.has(tab.tabId)) {
      state.tabAssignments.set(tab.tabId, "ungrouped");
    }
  }
}

function renderProposal() {
  if (!state.proposal) {
    el.previewSection.hidden = true;
    return;
  }

  el.previewSection.hidden = false;
  el.applyBtn.disabled = false;

  renderCrossWindowStrategyVisibility();
  renderGroupsEditor();
  renderTabsEditor();
}

function renderCrossWindowStrategyVisibility() {
  const visible = el.scopeSelect.value === "all_windows";
  el.crossWindowRow.hidden = !visible;
}

function renderGroupsEditor() {
  if (!state.proposal || state.draftGroups.length === 0) {
    el.groupsEditor.innerHTML = `<div class="empty">${escapeHtml(t("no_proposal"))}</div>`;
    return;
  }

  const items = state.draftGroups
    .map((group, index) => {
      const colorOptions = COLOR_OPTIONS.map((color) => {
        const selected = group.color === color ? "selected" : "";
        return `<option value="${color}" ${selected}>${color}</option>`;
      }).join("");

      return `
        <div class="group-item" data-group-id="${group.id}">
          <label class="field">
            <span>#${index + 1}</span>
            <input class="group-name-input" data-group-id="${group.id}" maxlength="48" value="${escapeHtml(
              group.name
            )}" />
          </label>
          <label class="field">
            <span>Color</span>
            <select class="group-color-select" data-group-id="${group.id}">
              ${colorOptions}
            </select>
          </label>
          <div class="group-meta">${escapeHtml(group.reason || "")}, confidence: ${Number(
            group.confidence || 0
          ).toFixed(2)}</div>
        </div>
      `;
    })
    .join("");

  el.groupsEditor.innerHTML = items;

  el.groupsEditor.querySelectorAll(".group-name-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const groupId = event.target.dataset.groupId;
      const group = state.draftGroups.find((item) => item.id === groupId);
      if (!group) {
        return;
      }
      group.name = String(event.target.value || "").slice(0, 48);
      renderTabsEditor();
    });
  });

  el.groupsEditor.querySelectorAll(".group-color-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const groupId = event.target.dataset.groupId;
      const group = state.draftGroups.find((item) => item.id === groupId);
      if (!group) {
        return;
      }
      group.color = event.target.value;
    });
  });
}

function renderTabsEditor() {
  if (!state.proposal || !Array.isArray(state.proposal.candidates)) {
    el.tabsEditor.innerHTML = "";
    return;
  }

  const rows = state.proposal.candidates
    .map((tab) => {
      const assignment = state.tabAssignments.get(tab.tabId) || "ungrouped";
      const groupOptions = state.draftGroups
        .map((group) => {
          const selected = assignment === group.id ? "selected" : "";
          return `<option value="${group.id}" ${selected}>${escapeHtml(group.name)}</option>`;
        })
        .join("");

      const ungroupSelected = assignment === "ungrouped" ? "selected" : "";

      return `
        <div class="tab-row" data-tab-id="${tab.tabId}">
          <div>
            <div class="tab-title">${escapeHtml(tab.title || "(Untitled)")}</div>
            <div class="tab-sub">${escapeHtml(tab.domain || "unknown")} · #${tab.tabId}</div>
          </div>
          <select class="tab-assignment" data-tab-id="${tab.tabId}">
            ${groupOptions}
            <option value="ungrouped" ${ungroupSelected}>${escapeHtml(t("ungrouped"))}</option>
          </select>
        </div>
      `;
    })
    .join("");

  el.tabsEditor.innerHTML = rows;

  el.tabsEditor.querySelectorAll(".tab-assignment").forEach((select) => {
    select.addEventListener("change", (event) => {
      const tabId = Number(event.target.dataset.tabId);
      state.tabAssignments.set(tabId, event.target.value);
    });
  });
}

function buildEditedGroups() {
  if (!state.proposal) {
    return [];
  }

  const groups = [];

  for (const draft of state.draftGroups) {
    const tabIds = state.proposal.candidates
      .map((tab) => tab.tabId)
      .filter((tabId) => state.tabAssignments.get(tabId) === draft.id);

    if (tabIds.length === 0) {
      continue;
    }

    groups.push({
      id: draft.id,
      name: draft.name,
      color: draft.color,
      tabIds,
      reason: draft.reason,
      confidence: draft.confidence
    });
  }

  return groups;
}

function fillSettingsForm() {
  if (!state.settings) {
    return;
  }

  el.languageSelect.value = state.settings.language || "zh-CN";
  el.privacyModeSelect.value = state.settings.privacyMode || "redacted";
  el.telemetryCheckbox.checked = Boolean(state.settings.telemetryEnabled);
  el.includeExistingDefaultCheckbox.checked = Boolean(
    state.settings.includeExistingGroupsDefault
  );
  el.analysisTimeoutInput.value = String(state.settings.analysisTimeoutMs || 15000);
  updateMiniMaxFields();

  el.userPromptInput.placeholder = t("prompt_placeholder");
}

function syncControlsWithDefaults() {
  if (!state.settings) {
    return;
  }

  el.scopeSelect.value = state.settings.scopeDefault || "current_window";
  el.includeExistingCheckbox.checked = Boolean(
    state.settings.includeExistingGroupsDefault
  );
  renderCrossWindowStrategyVisibility();
}

function populateTemplateSelect() {
  if (!state.settings) {
    return;
  }

  const options = [`<option value="">${escapeHtml(t("template_default"))}</option>`];

  for (const template of state.settings.promptTemplates || []) {
    options.push(
      `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`
    );
  }

  el.templateSelect.innerHTML = options.join("");
}

function renderStaticOptions() {
  el.scopeSelect.innerHTML = `
    <option value="current_window">${escapeHtml(t("scope_current"))}</option>
    <option value="all_windows">${escapeHtml(t("scope_all"))}</option>
  `;

  el.groupingModeSelect.innerHTML = `
    <option value="hybrid">${escapeHtml(t("mode_hybrid"))}</option>
    <option value="domain_first">${escapeHtml(t("mode_domain"))}</option>
  `;

  el.crossWindowSelect.innerHTML = `
    <option value="keep">${escapeHtml(t("cross_keep"))}</option>
    <option value="move">${escapeHtml(t("cross_move"))}</option>
  `;

  el.languageSelect.innerHTML = `
    <option value="zh-CN">中文</option>
    <option value="en">English</option>
  `;

  el.privacyModeSelect.innerHTML = `
    <option value="redacted">${escapeHtml(t("privacy_redacted"))}</option>
    <option value="full">${escapeHtml(t("privacy_full"))}</option>
  `;
}

function applyI18n(language) {
  const lang = language === "en" ? "en" : "zh-CN";
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    node.textContent = t(key, {}, lang);
  });

  updateMiniMaxFields();
  renderTokenPlanRemains();
}

function updateMiniMaxFields() {
  if (!state.settings) {
    return;
  }

  el.modelLabel.textContent = t("model_label");
  el.apiKeyLabel.textContent = t("api_key_label");
  el.modelInput.placeholder = "MiniMax-M2.7";
  el.apiKeyInput.placeholder = "sk-...";
  el.modelInput.value = state.settings.minimaxModel || "MiniMax-M2.7";
  el.apiKeyInput.value = state.settings.minimaxApiKey || "";
}

async function refreshTokenPlanRemains(forceRefresh) {
  if (!state.settings) {
    return;
  }

  if (forceRefresh) {
    setStatus(t("remains_loading"), "info");
  }

  el.refreshRemainsBtn.disabled = true;

  try {
    const remains = await sendMessage({
      type: "getTokenPlanRemains",
      forceRefresh: Boolean(forceRefresh)
    });
    state.tokenPlanRemains = remains;
    renderTokenPlanRemains();

    if (forceRefresh) {
      setStatus(t("remains_updated"), "ok");
    }
  } catch (error) {
    state.tokenPlanRemains = null;
    renderTokenPlanRemains();
    if (forceRefresh) {
      setStatus(error.message, "error");
    }
  } finally {
    el.refreshRemainsBtn.disabled = false;
  }
}

function renderTokenPlanRemains() {
  const payload = state.tokenPlanRemains;
  if (!payload || !payload.data) {
    el.tokenPlanRemainsMeta.textContent = t("remains_empty");
    el.tokenPlanRemainsBody.textContent = "-";
    return;
  }

  const sourceText = payload.fromCache ? t("remains_source_cache") : t("remains_source_live");
  const fetchedAtText = payload.fetchedAt ? formatTimestamp(payload.fetchedAt) : "-";
  const detailParts = [];

  if (Number.isFinite(payload.data.remains)) {
    detailParts.push(`${t("remains_field_remains")}: ${formatNumber(payload.data.remains)}`);
  }
  if (Number.isFinite(payload.data.limit)) {
    detailParts.push(`${t("remains_field_limit")}: ${formatNumber(payload.data.limit)}`);
  }
  if (Number.isFinite(payload.data.used)) {
    detailParts.push(`${t("remains_field_used")}: ${formatNumber(payload.data.used)}`);
  }
  if (payload.data.resetAt) {
    detailParts.push(`${t("remains_field_reset")}: ${payload.data.resetAt}`);
  }

  const summary = detailParts.length > 0 ? ` · ${detailParts.join(" | ")}` : "";
  el.tokenPlanRemainsMeta.textContent =
    `${t("remains_updated_at")}: ${fetchedAtText} · ${sourceText}${summary}`;

  const raw = payload.data.raw ?? payload.data;
  el.tokenPlanRemainsBody.textContent = JSON.stringify(raw, null, 2);
}

function formatTimestamp(ms) {
  try {
    return new Date(ms).toLocaleString(
      state.settings?.language === "en" ? "en-US" : "zh-CN"
    );
  } catch (_error) {
    return String(ms);
  }
}

function formatNumber(value) {
  return Number(value).toLocaleString(state.settings?.language === "en" ? "en-US" : "zh-CN");
}

function normalizeTimeoutInput(raw, fallback) {
  const value = Number(raw);
  const base = Number.isFinite(value) ? value : Number(fallback);
  if (!Number.isFinite(base)) {
    return 15000;
  }
  return Math.min(60000, Math.max(2000, Math.round(base)));
}

async function refreshStats() {
  try {
    const stats = await sendMessage({ type: "getRunStats" });
    renderStats(stats);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderStats(stats) {
  const rows = [
    [t("stat_total_runs"), stats.totalRuns],
    [t("stat_analyze_success"), stats.successfulAnalyze],
    [t("stat_apply_success"), stats.successfulApply],
    [t("stat_failed"), stats.failedRuns],
    [t("stat_avg_ms"), stats.avgAnalyzeMs],
    [t("stat_acceptance"), ratioText(stats.acceptanceRate)],
    [t("stat_undo_rate"), ratioText(stats.undoRate)],
    [t("stat_error_rate"), ratioText(stats.errorRate)],
    [t("stat_last_error"), stats.lastErrorCode || "-"]
  ];

  el.statsPanel.innerHTML = rows
    .map(
      ([key, value]) =>
        `<div class="stat-key">${escapeHtml(String(key))}</div><div>${escapeHtml(String(value))}</div>`
    )
    .join("");
}

function ratioText(value) {
  const number = Number(value || 0);
  return `${(number * 100).toFixed(1)}%`;
}

function setStatus(message, type = "info") {
  el.status.dataset.type = type;
  el.status.textContent = message || "";
}

function t(key, vars = {}, languageOverride) {
  const language = languageOverride || state.settings?.language || "zh-CN";
  const dict = I18N[language] || I18N["zh-CN"];
  let text = dict[key] || key;

  for (const [name, value] of Object.entries(vars)) {
    text = text.replace(`{${name}}`, String(value));
  }

  return text;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error("后台无响应"));
        return;
      }

      if (!response.ok) {
        const code = response.error?.code || "UNKNOWN";
        const msg = response.error?.message || "请求失败";
        reject(new Error(`[${code}] ${msg}`));
        return;
      }

      resolve(response.data);
    });
  });
}
