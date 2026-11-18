# Pythex

純前端的 Python 線上評測練習平台，直接部署在 GitHub Pages。

- 直接在題目頁的編輯器寫程式（語法上色、自動縮排、Tab / Ctrl + / / Ctrl + Enter），草稿自動存在瀏覽器
- 程式在瀏覽器裡用 [Pyodide](https://pyodide.org) 執行，不會上傳到任何地方；可以「執行範例」快速檢查、「提交」跑全部測資，或用自訂輸入試跑
- 介面與題目支援繁體中文與英文，右上角切換
- 每題都有公開範例測資，以及看不到資料的隱藏測資（專挑 0、最小值、平手、最大資料量等極端狀況）
- 答錯時指出可能的原因：錯誤行號（在編輯器中標紅，可一鍵跳過去）、常見例外的解釋、全形符號（打字時即時標出）、`input("提示")` 多印的文字、輸出格式、差一錯誤、超時原因，以及隱藏測資的描述與提示
- 完成紀錄存在瀏覽器的 localStorage，可以匯出與匯入
- 每個主題是一個「題目家族」：簡單、中等、困難三題，內容不同，核心結構相同

## 專案結構

```
docs/                     GitHub Pages 網站（純靜態，不需要建置前端）
  index.html
  assets/js/              app.js（介面）、editor.js（程式編輯器）、i18n.js（中英文介面文字）、
                          judge.js（評測流程）、judge-worker.js（Pyodide）、diagnose.js（錯誤分析）、
                          highlight.js、store.js（localStorage）
  assets/css/style.css
  data/                   由 tools/build.py 產生的題庫資料，不要手動編輯
problems/                 題目原始檔（不會發佈到網頁）
  <family>/{easy,medium,hard}/
    meta.json  statement.zh-Hant.md  statement.en.md  solution.py  cases.py  wrong/*.py
tools/
  build.py                驗證題目並產生 docs/data/
  new_problem.py          建立新題目家族骨架
.claude/skills/pythex-add-problem/SKILL.md   給 AI agent 的出題流程
```

## 本機預覽

```bash
python tools/build.py              # 驗證題目並產生 docs/data
python -m http.server -d docs 8000 # 開啟 http://localhost:8000
```

直接雙擊 `index.html` 不行，瀏覽器不允許 `file://` 讀取題庫。

## 部署到 GitHub Pages

1. 把專案推到 GitHub
2. Settings → Pages → Build and deployment → Source 選 **Deploy from a branch**
3. Branch 選 `main`，資料夾選 **`/docs`**，儲存

之後每次 push，網站會自動更新。`.github/workflows/validate.yml` 會在每次 push / PR 時檢查題目是否正確、`docs/data` 是否已更新。

## 新增題目

給 agent 一題範例題目，並請它使用 `pythex-add-problem` skill。它會：

1. 拆解範例題的核心結構
2. 設計簡單、中等、困難三個不同內容的變體
3. 寫中英文題目敘述、參考解、公開範例、隱藏測資（含極端狀況）與刻意寫錯的解
4. 執行 `python tools/build.py` 驗證：參考解產生所有答案，錯誤解必須被隱藏測資抓到

手動新增的流程相同：

```bash
python tools/new_problem.py two-pointers --title "雙指標" --title-en "Two Pointers"
# 填完 problems/two-pointers/ 裡所有 TODO
python tools/build.py -v
```

詳細規格見 [.claude/skills/pythex-add-problem/SKILL.md](.claude/skills/pythex-add-problem/SKILL.md)。

## 評測細節

- 程式在 Web Worker 裡執行，超時會直接終止 worker 並重新啟動，無窮迴圈不會卡住頁面
- 輸出比對預設忽略行尾空白與結尾空行（`compare: "lines"`），也支援 `tokens` 與 `float:<誤差>`
- 連續兩組超時後，剩下的測資會略過，避免等太久
- 每題的程式草稿分開存在 localStorage（`pythex:code:<題目 id>`），完成紀錄另外存，可以匯出與匯入
- 題目的顯示文字都是 `{"zh-Hant": ..., "en": ...}`，測資輸出與語言無關，一套測資同時給兩種語言使用

## 關於隱藏測資

沒有後端就沒辦法真正隱藏資料。隱藏測資在網頁資料中經過編碼，介面上不會顯示，但懂得開發者工具的人還是看得到；公開 repo 裡的 `problems/` 也看得到參考解。這個平台的定位是自我練習，不適合用在需要防作弊的正式考試。

## 使用的外部資源

- Pyodide 0.26.4（jsDelivr）：瀏覽器內的 Python 3.12
- marked 12.0.2（jsDelivr）：Markdown 題目敘述
- Phosphor Icons 2.1.1（unpkg）
- Geist / Geist Mono（Google Fonts）
