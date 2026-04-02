# AGENT 规则

## 文档语言约定
- 生成各类设计/需求/方案类 `Markdown` 文档时，内容应尽量使用中文表达。
- 专业术语、接口名、类型名、标准名可以使用英文。
- 如无明确要求，不要用全英文撰写整篇设计文档。

## 回归门禁约定
- 每次准备让用户本地测试、让用户重载插件、或升级版本号前，必须先执行本地回归 checklist。
- 固定执行脚本：
  - `.codex/skills/local-regression-gate/scripts/run_local_regression.sh /Users/ratio/Code/ai_playground/chrome_extention_folder`
- 仅当输出包含 `REGRESSION_RESULT=PASS` 时，才允许进入“请用户测试/请用户重载”步骤。
- 若回归失败，先修复并重跑 checklist，禁止跳过。
