# Agent 指南

這是 Pythex：部署在 GitHub Pages 的純前端 Python 評測練習平台。

- **新增或修改題目**：先完整閱讀 `.claude/skills/pythex-add-problem/SKILL.md`，照它的流程做。每個範例題目要做成 easy / medium / hard 三題的題目家族。
- 題目原始檔在 `problems/`；`docs/data/` 由 `python tools/build.py` 產生，不要手動編輯。
- 改完題目一定要跑 `python tools/build.py -v`，0 個錯誤才算完成，並把 `problems/` 與 `docs/data/` 一起 commit。
- 新增題目不需要修改 `docs/assets/` 裡的任何前端程式碼。
