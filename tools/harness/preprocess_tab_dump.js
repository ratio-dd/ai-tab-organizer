#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function decodeNestedUrl(value, maxRounds = 2) {
  let text = String(value || "").trim();
  for (let i = 0; i < maxRounds; i += 1) {
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

function unwrapSuspendedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "chrome-extension:") {
      return { unwrappedUrl: "", tabId: null, wrappedTitle: "" };
    }

    const nestedRaw =
      parsed.searchParams.get("url") ||
      parsed.searchParams.get("target") ||
      parsed.searchParams.get("link") ||
      "";
    const decodedUrl = decodeNestedUrl(nestedRaw);
    const unwrappedUrl = /^https?:\/\//i.test(decodedUrl) ? decodedUrl : "";

    const tabIdRaw = parsed.searchParams.get("tabId");
    const tabId = Number.isInteger(Number(tabIdRaw)) ? Number(tabIdRaw) : null;
    const wrappedTitle = decodeNestedUrl(parsed.searchParams.get("title") || "").slice(0, 300);

    return { unwrappedUrl, tabId, wrappedTitle };
  } catch (_error) {
    return { unwrappedUrl: "", tabId: null, wrappedTitle: "" };
  }
}

function detectKind(urlText) {
  const text = String(urlText || "").trim().toLowerCase();
  if (!text) {
    return "invalid";
  }
  if (text.startsWith("https://")) {
    return "https";
  }
  if (text.startsWith("http://")) {
    return "http";
  }
  if (text.startsWith("chrome-extension://")) {
    return "chrome_extension";
  }
  if (text.startsWith("chrome://")) {
    return "chrome_internal";
  }
  return "other";
}

function extractDomain(urlText) {
  try {
    return new URL(urlText).hostname || "";
  } catch (_error) {
    return "";
  }
}

function buildNormalizedItem(rawUrl, lineNo) {
  const raw = String(rawUrl || "").trim();
  const rawKind = detectKind(raw);
  const unwrap = unwrapSuspendedUrl(raw);
  const effectiveUrl = unwrap.unwrappedUrl || raw;
  const effectiveKind = detectKind(effectiveUrl);

  return {
    lineNo,
    rawUrl: raw,
    rawKind,
    isWrappedSuspendedTab: Boolean(unwrap.unwrappedUrl),
    wrappedTabId: unwrap.tabId,
    wrappedTitle: unwrap.wrappedTitle,
    unwrappedUrl: unwrap.unwrappedUrl,
    effectiveUrl,
    effectiveKind,
    domain: extractDomain(effectiveUrl)
  };
}

function summarize(items) {
  const counts = {
    total: items.length,
    wrapped: 0,
    http: 0,
    https: 0,
    chrome_extension: 0,
    chrome_internal: 0,
    other: 0,
    invalid: 0
  };

  for (const item of items) {
    if (item.isWrappedSuspendedTab) {
      counts.wrapped += 1;
    }
    if (Object.prototype.hasOwnProperty.call(counts, item.effectiveKind)) {
      counts[item.effectiveKind] += 1;
    } else {
      counts.other += 1;
    }
  }

  return counts;
}

function main() {
  const repoRoot = process.cwd();
  const inputPath = path.resolve(
    process.argv[2] || path.join(repoRoot, "testdata/local/test_case1.md")
  );
  const outputPath = path.resolve(
    process.argv[3] || path.join(repoRoot, "testdata/local/test_case1.normalized.json")
  );

  if (!fs.existsSync(inputPath)) {
    console.error(`[tabdump] input not found: ${inputPath}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/);
  const items = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || "").trim();
    if (!line) {
      continue;
    }
    items.push(buildNormalizedItem(line, i + 1));
  }

  const result = {
    sourceFile: inputPath,
    generatedAt: new Date().toISOString(),
    counts: summarize(items),
    items
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[tabdump] input=${inputPath}`);
  console.log(`[tabdump] output=${outputPath}`);
  console.log(
    `[tabdump] total=${result.counts.total} wrapped=${result.counts.wrapped} https=${result.counts.https} http=${result.counts.http} chrome_internal=${result.counts.chrome_internal}`
  );
}

main();
