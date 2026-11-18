---
name: pythex-add-problem
description: 為 Pythex Python 練習平台新增題目。當使用者提供一題「範例題目」、要求新增題目、出題、擴充題庫，或修改既有題目的測資時使用。每個範例題目都要做成一個「題目家族」：簡單、中等、困難三題，內容不同但核心結構相同，全部提供繁體中文與英文，並附上公開範例、含極端狀況的隱藏測資、參考解與刻意寫錯的解，最後用 tools/build.py 驗證。
---

# Pythex：新增題目家族

Pythex 是純前端的 Python 線上評測平台（GitHub Pages）。使用者在網頁上的編輯器寫程式，瀏覽器裡的 Pyodide 用 stdin 餵測資、比對 stdout。介面與題目都有**繁體中文（zh-Hant）與英文（en）**兩種語言。沒有後端，**新增題目的唯一方式是修改 repo**。

你的工作：收到一題範例題目後，做出一個**題目家族**（easy / medium / hard 三題），每題都有中英文內容，寫好測資與驗證用的解答，跑過建置工具，讓網頁自動出現新題目。**前端程式碼完全不用動。**

## 檔案結構

```
problems/<family-slug>/          ← 你要新增的東西都在這裡（不會發佈到網頁）
  family.json                    家族資訊：標題、核心觀念、核心結構（中英文），以及原始範例題
  easy/ medium/ hard/            三個資料夾都必須存在，名稱固定
    meta.json                    題名、標籤、提示（中英文）、時限、比對方式
    statement.zh-Hant.md         中文題目敘述
    statement.en.md              英文題目敘述
    solution.py                  參考解：建置工具用它產生所有標準答案
    cases.py                     測資：只寫輸入；SAMPLES 公開、HIDDEN 隱藏
    wrong/*.py                   刻意寫錯的解：證明隱藏測資抓得到常見錯誤
docs/data/                       ← 由 tools/build.py 產生，不要手動編輯
tools/build.py                   驗證 + 產生網頁資料
tools/new_problem.py             產生家族骨架（所有檔案都帶 TODO）
```

完整範例：`problems/bingo-lines/`（從「賓果連線」範例題延伸出的三題）。動手前先讀一遍它的 `family.json`、三個 `meta.json`、`cases.py` 和 `wrong/`。

## 流程

照順序做，每一步都要完成：

1. **拆解範例題的核心結構**（見下一節），寫成一句 `core`。
2. **設計三個變體**：先列出 easy / medium / hard 各自的情境、要求、資料範圍，確認符合「變體設計規則」。
3. **建立骨架**：`python tools/new_problem.py <family-slug> --title "中文標題" --title-en "English Title"`
   - slug 用小寫英文與連字號，描述核心概念，例如 `bingo-lines`、`two-pointers`、`prefix-sum`。
4. **先寫中文版**：題目敘述、參考解、測資、錯誤解。跑一次 `python tools/build.py -v` 確認測資正確。
5. **再寫英文版**：英文題目敘述，以及每個 `L("中文", "English")` 的英文部分（見「雙語規則」）。
6. **建置驗證**：`python tools/build.py -v`，修到 0 個錯誤，並逐條處理警告。
7. **本機預覽**（可選）：`python -m http.server -d docs 8000`，打開 `http://localhost:8000`，用右上角的「EN / 中」切換語言檢查兩個版本。
8. **提交**：`problems/<slug>/` 和 `docs/data/` 一起 commit。CI 會執行 `python tools/build.py --check`，`docs/data` 沒更新就會失敗。

## 拆解核心結構

核心結構 = 解題的骨架，與故事無關。用「輸入形狀 → 核心操作 → 判斷規則 → 輸出」描述。

範例「賓果連線」：
- 表面內容：兩位玩家、賓果卡、A Win / B Win / Tie
- 核心結構：讀入 N × N 格子 → 建立「數字 → 位置」對照 → 依序標記 → 檢查橫排 / 直行 / 兩條對角線 → 依規則（先後、平手、提前結束）輸出

把原始範例題完整貼進 `family.json` 的 `origin`（只存在 repo，不會出現在網頁上，原文即可，不需要翻譯）。

## 變體設計規則

三題**核心結構相同，內容不同**。

**內容必須不同**：
- 不同的情境與角色（賓果卡 → 大樓窗戶 → 闖關地圖 → 社區賓果之夜）
- 不同的提問（不能只是把數字放大，或把「A Win」改成「甲勝」）
- 題名、敘述、範例都不能重複

**核心結構不變**：三題用同一個解題骨架。學生解完 easy，應該覺得 medium 是「同一招再多想一步」。

**難度階梯**：

| 難度 | 設計方向 | 資料量 |
|---|---|---|
| easy | 骨架本身，規則最少。通常是單一主體、單一判斷 | 小，任何正確寫法都會過 |
| medium | 骨架 + 一個額外規則或狀態（多個主體、平手、需要累計 K 次、提前結束） | 中等 |
| hard | 骨架 + 效率要求 + 更細的規則。資料量大到**暴力解會超時**，需要更好的資料結構或演算法 | 大，必須有 `kind: "stress"` 測資 |

以 `bingo-lines` 為例：
- easy「大樓窗景 / Lit Windows」：一張格子，輸出第幾步第一次連線
- medium「校慶闖關賽 / School Fair Challenge」：兩隊、需要累積 K 條連線、一格可能同時完成多條、平手輸出 Draw
- hard「社區賓果之夜 / Community Bingo Night」：P 位住戶、N ≤ 30、遊戲不提前結束、要列出最早的所有贏家；每次重掃整張卡會超時，要用計數器

**不要**：
- 三題只差在資料範圍（那是同一題）
- 換一個完全不同的演算法（那是不同家族）
- 題目敘述模糊。每個規則（平手、0、空輸入、編號從 0 或 1 開始）都要寫清楚

## 雙語規則

- **輸出必須與語言無關**：一套測資同時給中文與英文題目使用，所以輸出只能是數字或固定的英文詞（例如 `YES` / `NO`、`Draw`、`None`、`No Bingo`）。不要設計需要輸出中文的題目。
- **每個顯示給使用者的文字欄位都是 `{"zh-Hant": ..., "en": ...}`**：`family.json` 的 title / concept / core；`meta.json` 的 title / tags / hints；`cases.py` 的 label / hint / explain。缺任何一種語言，建置會失敗。
- `cases.py` 裡用 `L("中文", "English")` 產生這種物件（骨架已經定義好 `L`）。
- 兩份 statement 的**內容與規則必須完全一致**，只有語言不同。數字、限制、輸出範例逐字相同。
- 英文寫法：用平實、直接的英文，像程式競賽題目（Codeforces / AtCoder 英文版）的語氣。數學範圍一樣用 `` `1 ≤ n ≤ 10⁵` ``。
- `hints` 兩種語言的條數要一樣，逐條對應。

## 檔案規格

### family.json

```json
{
  "title": {"zh-Hant": "賓果連線", "en": "Bingo Lines"},
  "concept": {"zh-Hant": "一句話說明練習的觀念", "en": "One sentence on the core idea"},
  "core": {"zh-Hant": "輸入形狀 → 核心操作 → 判斷規則 → 輸出", "en": "input → core operation → rules → output"},
  "order": 1,
  "origin": "原始範例題全文"
}
```

`order` 決定在列表中的順序，新家族用目前最大值 + 1。

### meta.json

```json
{
  "title": {"zh-Hant": "大樓窗景", "en": "Lit Windows"},
  "tags": {"zh-Hant": ["二維串列", "模擬"], "en": ["2D list", "simulation"]},
  "time_limit_ms": 2000,
  "compare": "lines",
  "hints": {
    "zh-Hant": ["方向提示", "更具體的提示", "接近答案的提示"],
    "en": ["Direction", "More specific", "Close to the answer"]
  }
}
```

- `time_limit_ms`：瀏覽器裡的時限，500 到 10000。一般用 2000。
- `compare`：`lines`（預設：每行去掉行尾空白後逐行比對）、`tokens`（忽略所有空白與換行）、`float:1e-6`（數字允許誤差）。有小數輸出的題目用 `float`。
- `hints`：2 到 3 個，由淺到深。使用者自己決定要不要看，不要直接給完整程式碼。

### statement.zh-Hant.md / statement.en.md

必須包含這四個段落標題（建置工具會檢查），可選「備註 / Notes」：

| zh-Hant | en |
|---|---|
| `## 題目描述` | `## Description` |
| `## 輸入格式` | `## Input` |
| `## 輸出格式` | `## Output` |
| `## 限制` | `## Constraints` |
| `## 備註`（選填） | `## Notes`（optional） |

不要寫「範例 / Example」段落，網頁會從 `cases.py` 的 `SAMPLES` 自動產生。

寫作規則：
- 情境具體，規則用**粗體**標出
- 變數與數值用行內程式碼：`` `1 ≤ n ≤ 10⁵` ``（用 ≤ 與上標數字，不要用 LaTeX）
- 輸出格式要精確到空白與換行，例如「中間以一個空白隔開 / separated by a single space」
- 寫清楚每個邊界：n 可不可以是 0、平手怎麼處理、沒有答案時輸出什麼

### solution.py

- 只用標準函式庫，讀 stdin、寫 stdout
- 必須正確處理所有測資，**在本機 CPython 上最多只能用掉時限的 25%**（瀏覽器的 Pyodide 比較慢）
- 大量輸入用 `sys.stdin.read().split()` 一次讀完

### cases.py

只寫輸入，標準答案由 `solution.py` 自動產生。

```python
from random import Random


def L(zh, en):
    return {"zh-Hant": zh, "en": en}


rng = Random(20241119)   # 固定種子，每次建置結果一致（CI 會比對）

SAMPLES = [               # 1 到 3 組，使用者看得到
    {"input": "3\n1 2 3\n", "explain": L("說明為什麼是這個答案", "Why this is the answer")},
]

HIDDEN = [                # 使用者看不到資料
    {
        "label": L("只有一筆資料 (n = 1)", "Only one item (n = 1)"),   # 答錯時顯示，描述「情況」
        "kind": "edge",                                                # normal / edge / boundary / stress
        "input": "1\n5\n",
        "hint": L("只有一筆時，迴圈可能一次都不會執行。",
                  "With one item, the loop may never run."),        # 答錯時顯示，引導思考
    },
]
```

建置工具的要求：
- 隱藏測資數量：easy ≥ 6、medium ≥ 7、hard ≥ 8
- 至少 2 組 `kind: "edge"`；hard 至少 1 組 `kind: "stress"`
- `label` 必填且不可重複；`hint`、`explain` 選填，但有寫就必須兩種語言都有
- 所有測資的輸入不可重複
- 單組輸入 ≤ 400 KB，單題輸出 JSON ≤ 1.5 MB（壓力測資請算一下大小）
- 可以在 `cases.py` 裡寫輔助函式產生資料（格式化、洗牌、建構特定情況），參考 `problems/bingo-lines/*/cases.py`

### wrong/*.py

每題寫 1 到 3 個「學生最常犯的錯」，檔名描述錯誤，例如 `init_zero.py`、`off_by_one.py`、`check_a_first.py`、`brute_force.py`。開頭一行註解說明錯在哪。

建置工具會用它們跑所有測資：
- 錯誤解通過所有測資 → **建置失敗**，代表隱藏測資不夠嚴格，要補測資
- 錯誤解只被範例抓到 → 警告，代表隱藏測資沒有針對這個錯誤

hard 題至少要有一個「答案正確但太慢」的錯誤解，證明壓力測資有效。

## 隱藏測資設計清單

每題都要依照題型逐項檢查，挑出適用的做成隱藏測資。**極端狀況要依照題目改變**，不是每題都塞同一組 0。

**數值**
- 0、負數、最小值、最大值
- 答案剛好是 0、-1、或「找不到」的情況
- 數值相同（全部一樣、出現平手）

**數量 / 陣列**
- 最小 n（n = 1，若允許則 n = 0）
- 最大 n（壓力測資，hard 必備）
- 已排序、反向排序、全部相同
- 答案在第一個、最後一個位置
- 讀到的數量少於題目最大值（例如 M < N）

**字串**
- 只有一個字元、全部空白（若允許）
- 大小寫、重複字元、一個字串是另一個的開頭

**規則**
- 平手、同時發生
- 提前結束 vs. 繼續處理
- 一個動作同時觸發多個效果
- 題目敘述裡每一條「如果…就…」都至少有一組測資

**二維 / 格子**
- 橫排、直行、兩條對角線各自單獨觸發
- 奇數 N 的中心格（同時屬於兩條對角線）
- 位置不能從數值推算（打亂排列）

**效能（hard）**
- 最大資料量下，暴力解在本機 CPython 至少要慢到時限的 2 倍以上，才能確保在瀏覽器裡超時
- 先寫好 `wrong/brute_force.py`，實際量時間再調整資料量

## label 與 hint 的寫法

使用者答錯隱藏測資時，看到的是 `label` 和 `hint`，看不到資料。

- `label` 描述**情況**：「每天都是負溫 / Every day is below zero」「兩隊在同一次廣播後同時達成 / Both teams finish after the same announcement」。不要寫輸入內容或答案。
- `hint` 引導**思考**：指出這個情況容易錯在哪，例如「如果把最大值的初始值設成 0，全部都是負數時會怎樣？」不要給程式碼，不要給答案。
- 一般隨機測資可以省略 hint。

## 完成前檢查

- [ ] `python tools/build.py -v` 顯示 0 個錯誤
- [ ] 每個 wrong 解都被**隱藏**測資抓到（報告裡看得到是哪幾組）
- [ ] hard 的暴力解是被 stress 測資以 TLE 抓到
- [ ] 參考解沒有「超過時限 25%」的警告
- [ ] 三題的題名、情境、提問都不同，但核心結構一致
- [ ] 中英文 statement 規則一致，範例的 `explain` 兩種語言都正確
- [ ] 輸出與語言無關（只有數字或固定英文詞）
- [ ] `problems/<slug>/` 與 `docs/data/` 一起 commit

## 常見錯誤

- **手動編輯 `docs/data/`**：會被下一次建置覆蓋，CI 也會失敗。只改 `problems/`。
- **在 `cases.py` 手寫輸出**：不需要也不支援，答案一律由 `solution.py` 產生。
- **用沒有固定種子的亂數**：每次建置結果不同，CI 的 `--check` 會失敗。
- **只寫一種語言**：`label: "只有一天"` 這種純字串會讓建置失敗，要寫成 `L("只有一天", "Only one day")`。
- **範例的 explain 跟實際答案不符**：寫完後用 `python problems/<slug>/<diff>/solution.py` 手動跑一次範例確認。
- **壓力測資太大**：單題 JSON 超過 1.5 MB 會讓網頁載入變慢，建置會失敗。
