---
name: local-regression-gate
description: 在准备让用户进行本地测试、请求用户重载插件、或计划发布新版本前，执行本地回归门禁检查并输出 PASS/FAIL 结论。适用于 Chrome 扩展代码改动后的功能回归、配置回归、解析与流程稳定性验证。
---

# Local Regression Gate

## Overview

在进入“请用户测试/重载/发版”节点前，先统一执行本地回归 checklist，避免明显功能回归和高风险缺陷泄漏到用户测试环节。

## Workflow

1. 执行 `scripts/run_local_regression.sh <repo-root>`。
2. 检查输出是否包含 `REGRESSION_RESULT=PASS`。
3. 若失败，先修复再重复执行；不得直接让用户测试。
4. 对成功结果进行摘要：列出关键检查项与结论。

## Required Output

- 输出门禁结论：`PASS` 或 `FAIL`。
- 输出失败项（若有）：命令、错误摘要、影响范围。
- 若准备发版/重载：必须在结论中显示当前 `manifest.json` 的版本号。

## Version Rule

当需要用户手动重载扩展时，先执行回归，再 bump 小版本（例如 `0.1.2 -> 0.1.3`），最后再让用户重载验证。

## References

- 回归清单定义：`references/checklist.md`

## Scripts

- 执行入口：`scripts/run_local_regression.sh`
- 背景核心流程 smoke：`scripts/smoke_background.js`

## Constraints

- 未通过门禁时，禁止建议用户“直接测试看看”。
- 若 smoke 用例失败，优先修复后再进入下一轮。
