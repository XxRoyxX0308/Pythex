#!/usr/bin/env python3
"""
建立一個新的題目家族骨架（easy / medium / hard 三題，繁體中文 + 英文）。

    python tools/new_problem.py <family-slug> --title "家族標題" --title-en "Family title"

產生的檔案都帶有 TODO，全部填完前 tools/build.py 會拒絕建置。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "problems"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")

STATEMENT_ZH = """## 題目描述

TODO：用一個具體的情境描述問題。說清楚要「算什麼」，粗體標出關鍵規則（例如平手怎麼處理）。

## 輸入格式

TODO：逐行說明輸入。例如「第一行是一個整數 `n`。第二行有 `n` 個整數，以空白隔開。」

## 輸出格式

TODO：說明輸出幾行、每行是什麼、用什麼隔開。

## 限制

- TODO：`1 ≤ n ≤ 1000`
- TODO：每個數值的範圍
"""

STATEMENT_EN = """## Description

TODO: Describe the problem through a concrete scenario. Say exactly what to compute and put key rules (such as ties) in bold.

## Input

TODO: Describe the input line by line, for example "The first line contains an integer `n`. The second line contains `n` integers separated by spaces."

## Output

TODO: Describe how many lines to print, what each line contains and how values are separated.

## Constraints

- TODO: `1 ≤ n ≤ 1000`
- TODO: the range of each value
"""

SOLUTION = """# 參考解：tools/build.py 會用它產生所有測資的標準答案。
# 只能用 Python 標準函式庫，讀 stdin、寫 stdout。輸出不能依語言而不同。

n = int(input())
# TODO
"""

CASES = '''"""
測資定義。只需要寫輸入，標準答案由 solution.py 自動產生。
所有顯示給使用者的文字都用 L("中文", "English") 提供兩種語言。

SAMPLES：使用者看得到的範例（1 到 3 組）
    {"input": "...", "explain": L("（選填）說明", "(optional) explanation")}

HIDDEN：使用者看不到資料的隱藏測資
    {"label": L("答錯時顯示的情況描述", "What the test covers"), "kind": "edge",
     "input": "...", "hint": L("答錯時的提示", "Hint shown on failure")}
    kind 可用：normal（一般）、edge（極端）、boundary（邊界）、stress（最大資料量）
"""
from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20241119)  # 固定種子，每次建置結果一致

SAMPLES = [
    {"input": "TODO\\n", "explain": L("TODO", "TODO")},
]

HIDDEN = [
    {"label": L("TODO：最小輸入", "TODO: smallest input"), "kind": "edge", "input": "TODO\\n",
     "hint": L("TODO", "TODO")},
]
'''

WRONG = """# 刻意寫錯的解：模擬學生最常見的一種錯誤。
# tools/build.py 會確認至少有一組隱藏測資讓它失敗。
# 檔名請描述錯誤，例如 init_zero.py、off_by_one.py、brute_force.py。

# TODO
"""

LABELS = {"easy": ("簡單", "Easy"), "medium": ("中等", "Medium"), "hard": ("困難", "Hard")}


def both(zh: str, en: str) -> dict:
    return {"zh-Hant": zh, "en": en}


def main() -> int:
    ap = argparse.ArgumentParser(description="建立新的題目家族骨架")
    ap.add_argument("slug", help="家族代號，小寫英數與連字號，例如 two-pointers")
    ap.add_argument("--title", default="TODO", help="家族中文標題，例如「雙指標」")
    ap.add_argument("--title-en", default="TODO", help="家族英文標題，例如 \"Two Pointers\"")
    args = ap.parse_args()

    if not SLUG_RE.match(args.slug):
        print("slug 只能包含小寫英數字與連字號，例如 running-state")
        return 1
    fam_dir = SRC_DIR / args.slug
    if fam_dir.exists():
        print(f"{fam_dir.relative_to(ROOT)} 已經存在，不會覆蓋")
        return 1

    existing = [d for d in SRC_DIR.iterdir() if d.is_dir()] if SRC_DIR.is_dir() else []
    family = {
        "title": both(args.title, args.title_en),
        "concept": both("TODO：一句話說明這個家族練習的核心觀念", "TODO: one sentence on the core idea"),
        "core": both("TODO：讀入 … → 核心操作 → 判斷規則 → 輸出", "TODO: read … → core operation → rules → output"),
        "order": len(existing) + 1,
        "origin": "TODO：貼上收到的原始範例題目（只存在 repo，不會顯示在網頁上）",
    }
    fam_dir.mkdir(parents=True)
    (fam_dir / "family.json").write_text(json.dumps(family, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for diff, (zh, en) in LABELS.items():
        d = fam_dir / diff
        (d / "wrong").mkdir(parents=True)
        meta = {
            "title": both(f"TODO：{zh}題名稱", f"TODO: {en} title"),
            "tags": both(["TODO"], ["TODO"]),
            "time_limit_ms": 2000,
            "compare": "lines",
            "hints": both(["TODO：第一個提示（方向）", "TODO：第二個提示（更具體）"],
                          ["TODO: first hint (direction)", "TODO: second hint (more specific)"]),
        }
        (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (d / "statement.zh-Hant.md").write_text(STATEMENT_ZH, encoding="utf-8")
        (d / "statement.en.md").write_text(STATEMENT_EN, encoding="utf-8")
        (d / "solution.py").write_text(SOLUTION, encoding="utf-8")
        (d / "cases.py").write_text(CASES, encoding="utf-8")
        (d / "wrong" / "common_mistake.py").write_text(WRONG, encoding="utf-8")

    print(f"已建立 {fam_dir.relative_to(ROOT)}/ 的 easy、medium、hard 骨架（中文 + 英文）。")
    print("填完所有 TODO 後執行：python tools/build.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
