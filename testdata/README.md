# Test Data

This directory stores data samples for regression and harness runs.

## Layout
- `testdata/local/`: local-only samples (ignored by git).

## Local Sample Format
- One line per tab URL.
- Supports normal URLs (for example `https://...`) and wrapped suspended-tab URLs:
  - `chrome-extension://.../park.html?...&url=<encoded_target_url>`

## Notes
- Do not commit local dumps with personal sessions or base64 icons.
- Keep sanitized, shareable fixtures in a tracked directory only when needed.

## Optional Harness Preprocess
- Purpose: unwrap suspended wrapper URLs and generate normalized JSON for local regression analysis.
- Command:
  - `node tools/harness/preprocess_tab_dump.js testdata/local/test_case1.md testdata/local/test_case1.normalized.json`
