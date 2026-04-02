# 本地回归 Checklist

## 触发时机
- 准备让用户本地测试前
- 准备让用户重载插件前
- 准备 bump 版本并交付验证前

## 必跑项
1. 语法检查
   - `node --check background.js`
   - `node --check popup/popup.js`
   - `jq empty manifest.json`
2. Provider/路由残留扫描
   - 关键文件中不得保留运行时 `api.moonshot.cn`、`api.openai.com` 请求路径
3. 背景流程 smoke
   - `analyze -> apply -> undo` 正常链路必须通过
   - “AI 返回非标准结构”回退分组链路必须通过
4. 版本确认
   - 输出当前 `manifest.json` 的 `version`

## 通过标准
- 所有必跑项成功
- 输出 `REGRESSION_RESULT=PASS`

## 失败处理
- 输出 `REGRESSION_RESULT=FAIL`
- 列出失败命令与错误摘要
- 修复后完整重跑 checklist
