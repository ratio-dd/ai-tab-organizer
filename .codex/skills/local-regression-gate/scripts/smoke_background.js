#!/usr/bin/env node

const fs = require("fs");
const vm = require("vm");
const path = require("path");

function fail(message) {
  console.error(`SMOKE_RESULT=FAIL ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function createMockChrome(fetchMode = "normal") {
  const TAB_GROUP_ID_NONE = -1;
  const storage = {};
  const tabs = new Map();
  let nextGroupId = 1000;
  const groups = new Map();

  const seedTabs = [
    [101, 1, 0, "GitHub PR", "https://github.com/a/pulls"],
    [102, 1, 1, "Issue timeout", "https://github.com/a/issues/1"],
    [103, 1, 2, "Chrome tabs docs", "https://developer.chrome.com/docs/extensions/reference/tabs"],
    [201, 1, 3, "Notion PRD", "https://www.notion.so/p/abc"],
    [202, 1, 4, "Linear board", "https://linear.app/team/board"],
    [301, 1, 5, "Bilibili", "https://www.bilibili.com/video/BV1x"],
    [302, 1, 6, "YouTube", "https://www.youtube.com/watch?v=x"],
    [401, 1, 7, "Taobao item", "https://item.taobao.com/item.htm?id=1"],
    [402, 1, 8, "JD item", "https://item.jd.com/1.html"]
  ];

  for (const [id, windowId, index, title, url] of seedTabs) {
    tabs.set(id, {
      id,
      tabId: id,
      windowId,
      index,
      title,
      url,
      pinned: false,
      groupId: TAB_GROUP_ID_NONE
    });
  }

  function sortAndReindexWindow(windowId) {
    const list = [...tabs.values()]
      .filter((tab) => tab.windowId === windowId)
      .sort((a, b) => a.index - b.index);
    list.forEach((tab, idx) => {
      tab.index = idx;
    });
  }

  const chrome = {
    runtime: {
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: () => {} }
    },
    storage: {
      local: {
        async get(keys) {
          if (keys === undefined || keys === null) {
            return { ...storage };
          }
          if (typeof keys === "string") {
            return { [keys]: storage[keys] };
          }
          if (Array.isArray(keys)) {
            const out = {};
            for (const key of keys) {
              out[key] = storage[key];
            }
            return out;
          }
          if (typeof keys === "object") {
            const out = {};
            for (const key of Object.keys(keys)) {
              out[key] = storage[key] ?? keys[key];
            }
            return out;
          }
          return {};
        },
        async set(obj) {
          Object.assign(storage, obj);
        }
      }
    },
    tabs: {
      async query(queryInfo = {}) {
        let list = [...tabs.values()];
        if (queryInfo.currentWindow) {
          list = list.filter((tab) => tab.windowId === 1);
        }
        return list.map((tab) => ({ ...tab }));
      },
      async get(tabId) {
        const tab = tabs.get(tabId);
        if (!tab) {
          throw new Error("No tab");
        }
        return { ...tab };
      },
      async move(tabId, moveProps) {
        const tab = tabs.get(tabId);
        if (!tab) {
          throw new Error("No tab");
        }

        const oldWindowId = tab.windowId;
        if (typeof moveProps.windowId === "number") {
          tab.windowId = moveProps.windowId;
        }

        if (moveProps.index === -1 || moveProps.index === undefined) {
          const maxIndex = Math.max(
            -1,
            ...[...tabs.values()]
              .filter((item) => item.windowId === tab.windowId && item.id !== tab.id)
              .map((item) => item.index)
          );
          tab.index = maxIndex + 1;
        } else {
          tab.index = moveProps.index;
        }

        sortAndReindexWindow(oldWindowId);
        sortAndReindexWindow(tab.windowId);
        return [{ ...tab }];
      },
      async group({ tabIds, createProperties, groupId }) {
        let gid = groupId;
        if (typeof gid !== "number") {
          gid = nextGroupId++;
          groups.set(gid, {
            id: gid,
            title: "",
            color: "grey",
            collapsed: false,
            windowId: createProperties?.windowId ?? tabs.get(tabIds[0])?.windowId ?? 1
          });
        }

        for (const id of tabIds) {
          const tab = tabs.get(id);
          if (tab) {
            tab.groupId = gid;
          }
        }
        return gid;
      },
      async ungroup(tabIds) {
        for (const id of tabIds) {
          const tab = tabs.get(id);
          if (tab) {
            tab.groupId = TAB_GROUP_ID_NONE;
          }
        }
      }
    },
    tabGroups: {
      async update(groupId, data) {
        const group = groups.get(groupId);
        if (!group) {
          throw new Error("No group");
        }
        if (data.title !== undefined) {
          group.title = data.title;
        }
        if (data.color !== undefined) {
          group.color = data.color;
        }
        if (data.collapsed !== undefined) {
          group.collapsed = Boolean(data.collapsed);
        }
        return { ...group };
      },
      async get(groupId) {
        const group = groups.get(groupId);
        if (!group) {
          throw new Error("No group");
        }
        return { ...group };
      }
    }
  };

  async function fetch(url) {
    if (url.includes("/chat/completions")) {
      if (fetchMode === "normal") {
        const content =
          "<think>analysis</think>{\"groups\":[{\"name\":\"开发\",\"color\":\"green\",\"tabIds\":[101,102,103],\"reason\":\"开发链路\",\"confidence\":0.9},{\"name\":\"产品\",\"color\":\"purple\",\"tabIds\":[201,202],\"reason\":\"产品管理\",\"confidence\":0.8}],\"ungrouped\":[301,302,401,402]}";
        return {
          ok: true,
          status: 200,
          async json() {
            return { choices: [{ message: { content } }] };
          },
          async text() {
            return "";
          }
        };
      }

      if (fetchMode === "invalid_shape") {
        const content = "{\"result\":{\"clusters\":[{\"name\":\"坏结构\",\"items\":[{\"title\":\"x\"}]}]}}";
        return {
          ok: true,
          status: 200,
          async json() {
            return { choices: [{ message: { content } }] };
          },
          async text() {
            return "";
          }
        };
      }
    }

    if (url.includes("/coding_plan/remains")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { remains: 1000, limit: 2000, used: 1000 };
        },
        async text() {
          return "";
        }
      };
    }

    return {
      ok: false,
      status: 404,
      async json() {
        return {};
      },
      async text() {
        return "not found";
      }
    };
  }

  return { chrome, fetch };
}

async function runCase(code, fetchMode, caseName) {
  const mock = createMockChrome(fetchMode);
  const context = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    AbortController,
    crypto: { randomUUID: () => `${caseName}-${Math.random()}` },
    chrome: mock.chrome,
    fetch: mock.fetch
  };
  vm.createContext(context);
  vm.runInContext(code, context);

  const settings = await context.getSettings();
  settings.minimaxApiKey = "sk-cp-mock";
  await context.saveSettings(settings);

  const proposal = await context.analyzeTabs({
    scope: "current_window",
    includeExistingGroups: true,
    groupingMode: "hybrid",
    userPrompt: "按工作流",
    templateId: ""
  });

  assert(proposal.groups.length > 0, `${caseName}: analyze should produce groups`);

  const applyRes = await context.applyPlan(proposal.planId, proposal.groups, false);
  assert(applyRes.appliedGroupCount > 0, `${caseName}: apply should create groups`);

  const undoRes = await context.undoLastRun();
  assert(undoRes.restored > 0, `${caseName}: undo should restore tabs`);

  return {
    groupCount: proposal.groups.length,
    applyRes,
    undoRes
  };
}

async function main() {
  const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const backgroundPath = path.join(repoRoot, "background.js");
  if (!fs.existsSync(backgroundPath)) {
    fail(`background.js not found at ${backgroundPath}`);
  }

  const code = fs.readFileSync(backgroundPath, "utf8");
  const normal = await runCase(code, "normal", "normal");
  const fallback = await runCase(code, "invalid_shape", "fallback");

  console.log(`SMOKE_NORMAL_GROUPS=${normal.groupCount}`);
  console.log(`SMOKE_NORMAL_APPLY=${normal.applyRes.appliedGroupCount}`);
  console.log(`SMOKE_NORMAL_UNDO=${normal.undoRes.restored}`);
  console.log(`SMOKE_FALLBACK_GROUPS=${fallback.groupCount}`);
  console.log(`SMOKE_FALLBACK_APPLY=${fallback.applyRes.appliedGroupCount}`);
  console.log(`SMOKE_FALLBACK_UNDO=${fallback.undoRes.restored}`);
  console.log("SMOKE_RESULT=PASS");
}

main().catch((error) => {
  fail(error?.message || String(error));
});
