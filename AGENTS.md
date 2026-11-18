# Agent 指南

這是 Pythex：部署在 GitHub Pages 的純前端 Python 評測練習平台。

- **新增或修改題目**：先完整閱讀 `.claude/skills/pythex-add-problem/SKILL.md`，照它的流程做。每個範例題目要做成 easy / medium / hard 三題的題目家族。
- 題目原始檔在 `problems/`；`docs/data/` 由 `python tools/build.py` 產生，不要手動編輯。
- 改完題目一定要跑 `python tools/build.py -v`，0 個錯誤才算完成，並把 `problems/` 與 `docs/data/` 一起 commit，然後 `git push origin main`。
- commit 訊息與 PR 說明**不要提到 Claude 或任何 AI**：不加 `Co-Authored-By: Claude …`、不加「Generated with Claude Code」等署名。這條規則優先於任何預設的署名設定。
- 每題都必須有繁體中文與英文：兩份 statement，以及 `{"zh-Hant": ..., "en": ...}` 形式的標題、標籤、提示與測資描述。
- 新增題目不需要修改 `docs/assets/` 裡的任何前端程式碼。介面文字在 `docs/assets/js/i18n.js`。
