#!/usr/bin/env python3
"""
Pythex 題庫建置與驗證工具。

    python tools/build.py              驗證所有題目，並輸出到 docs/data/
    python tools/build.py --check      只驗證，並確認 docs/data/ 已是最新（CI 使用）
    python tools/build.py -v           顯示每組測資的詳細報告

這支程式會：
  1. 讀取 problems/<family>/{easy,medium,hard}/ 的原始檔
  2. 用 solution.py 跑出每組測資的標準答案（測資作者只需要寫輸入）
  3. 跑 wrong/*.py 這些「刻意寫錯的解」，確認隱藏測資真的抓得到常見錯誤
  4. 輸出前端使用的 JSON（隱藏測資經過編碼，不會在網頁上直接顯示）
"""
from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import math
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "problems"
OUT_DIR = ROOT / "docs" / "data"

DIFFICULTIES = ("easy", "medium", "hard")
KINDS = ("normal", "edge", "boundary", "stress")
MIN_SAMPLES, MAX_SAMPLES = 1, 3
MIN_HIDDEN = {"easy": 6, "medium": 7, "hard": 8}
MIN_EDGE = 2                      # 每題至少幾組 kind == "edge"
MAX_CASE_BYTES = 400_000          # 單組測資輸入上限
MAX_PROBLEM_BYTES = 1_500_000     # 單題 JSON 上限
NATIVE_BUDGET = 0.25              # 參考解在本機最多用掉時限的 25%（瀏覽器的 Pyodide 比較慢）
DEFAULT_TIME_LIMIT = 2000

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
COMPARE_RE = re.compile(r"^(lines|tokens|float:\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)$")
REQUIRED_HEADINGS = ("## 題目描述", "## 輸入格式", "## 輸出格式", "## 限制")
SAMPLE_KEYS = {"input", "explain"}
HIDDEN_KEYS = {"input", "label", "kind", "hint"}
META_KEYS = {"title", "tags", "time_limit_ms", "compare", "hints"}
FAMILY_KEYS = {"title", "concept", "core", "order", "origin"}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")
sys.dont_write_bytecode = True  # 載入 cases.py 時不要在 problems/ 留下 __pycache__


# ---------------------------------------------------------------- helpers

def normalize(text: str) -> str:
    """與前端相同：每行去掉行尾空白，去掉結尾空行。"""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = [ln.rstrip() for ln in lines]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines) + ("\n" if lines else "")


def outputs_match(expected: str, got: str, mode: str) -> bool:
    exp, out = normalize(expected), normalize(got)
    if mode == "lines":
        return exp == out
    exp_t, out_t = exp.split(), out.split()
    if mode == "tokens":
        return exp_t == out_t
    eps = float(mode.split(":", 1)[1])
    if len(exp_t) != len(out_t):
        return False
    for a, b in zip(exp_t, out_t):
        if a == b:
            continue
        try:
            x, y = float(a), float(b)
        except ValueError:
            return False
        if not (math.isfinite(x) and math.isfinite(y)):
            return False
        if abs(x - y) > eps * max(1.0, abs(x)):
            return False
    return True


@dataclass
class RunResult:
    status: str        # OK | RE | TLE
    stdout: str
    stderr: str
    seconds: float


def run_python(script: Path, stdin: str, timeout: float) -> RunResult:
    start = time.perf_counter()
    try:
        proc = subprocess.run(
            [sys.executable, "-I", "-X", "utf8", str(script)],
            input=stdin.encode("utf-8"),
            capture_output=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return RunResult("TLE", "", "", timeout)
    elapsed = time.perf_counter() - start
    out = proc.stdout.decode("utf-8", errors="replace")
    err = proc.stderr.decode("utf-8", errors="replace")
    return RunResult("OK" if proc.returncode == 0 else "RE", out, err, elapsed)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def encode_hidden(cases: list[dict]) -> str:
    raw = json.dumps(cases, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def has_todo(text: str) -> bool:
    return "TODO" in text


# ---------------------------------------------------------------- model

@dataclass
class Case:
    name: str
    input: str
    hidden: bool
    label: str = ""
    kind: str = "normal"
    hint: str = ""
    explain: str = ""
    output: str = ""


@dataclass
class Problem:
    family: str
    difficulty: str
    path: Path
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    report: list[str] = field(default_factory=list)
    meta: dict = field(default_factory=dict)
    statement: str = ""
    cases: list[Case] = field(default_factory=list)

    @property
    def id(self) -> str:
        return f"{self.family}-{self.difficulty}"

    @property
    def time_limit(self) -> int:
        return int(self.meta.get("time_limit_ms", DEFAULT_TIME_LIMIT))

    @property
    def compare(self) -> str:
        return self.meta.get("compare", "lines")

    def err(self, msg: str):
        self.errors.append(msg)

    def warn(self, msg: str):
        self.warnings.append(msg)


# ---------------------------------------------------------------- loading

def load_problem(family: str, difficulty: str, path: Path) -> Problem:
    p = Problem(family, difficulty, path)
    for fname in ("meta.json", "statement.md", "solution.py", "cases.py"):
        if not (path / fname).is_file():
            p.err(f"缺少 {fname}")
    if p.errors:
        return p

    # meta.json
    try:
        p.meta = read_json(path / "meta.json")
    except Exception as exc:  # noqa: BLE001
        p.err(f"meta.json 格式錯誤：{exc}")
        return p
    unknown = set(p.meta) - META_KEYS
    if unknown:
        p.err(f"meta.json 有未知欄位：{sorted(unknown)}")
    if not isinstance(p.meta.get("title"), str) or not p.meta["title"].strip():
        p.err("meta.json 需要 title")
    if not isinstance(p.meta.get("tags", []), list):
        p.err("tags 必須是陣列")
    tl = p.meta.get("time_limit_ms", DEFAULT_TIME_LIMIT)
    if not isinstance(tl, int) or not 500 <= tl <= 10000:
        p.err("time_limit_ms 必須是 500 到 10000 的整數")
    if not COMPARE_RE.match(str(p.meta.get("compare", "lines"))):
        p.err("compare 只能是 lines、tokens 或 float:<誤差>")
    hints = p.meta.get("hints", [])
    if not isinstance(hints, list) or not all(isinstance(h, str) for h in hints):
        p.err("hints 必須是字串陣列")
    elif not hints:
        p.warn("沒有任何 hints，建議至少寫 1 到 3 個循序漸進的提示")
    if has_todo(json.dumps(p.meta, ensure_ascii=False)):
        p.err("meta.json 還有 TODO")

    # statement.md
    p.statement = (path / "statement.md").read_text(encoding="utf-8").strip() + "\n"
    if has_todo(p.statement):
        p.err("statement.md 還有 TODO")
    for heading in REQUIRED_HEADINGS:
        if heading not in p.statement:
            p.err(f"statement.md 缺少段落「{heading}」")
    if "## 範例" in p.statement:
        p.warn("statement.md 不需要寫範例，網頁會自動從 cases.py 的 SAMPLES 產生")

    for script in ("solution.py", "cases.py"):
        if has_todo((path / script).read_text(encoding="utf-8")):
            p.err(f"{script} 還有 TODO")

    # cases.py
    try:
        mod = load_module(path / "cases.py", f"pythex_cases_{family}_{difficulty}".replace("-", "_"))
    except Exception as exc:  # noqa: BLE001
        p.err(f"cases.py 執行失敗：{exc!r}")
        return p
    samples = getattr(mod, "SAMPLES", None)
    hidden = getattr(mod, "HIDDEN", None)
    if not isinstance(samples, list) or not isinstance(hidden, list):
        p.err("cases.py 必須定義 SAMPLES 與 HIDDEN 兩個 list")
        return p

    for i, item in enumerate(samples, 1):
        if not isinstance(item, dict) or not isinstance(item.get("input"), str):
            p.err(f"SAMPLES[{i - 1}] 必須是含 input 字串的 dict")
            continue
        extra = set(item) - SAMPLE_KEYS
        if extra:
            p.err(f"SAMPLES[{i - 1}] 有未知欄位 {sorted(extra)}")
        p.cases.append(Case(f"範例 {i}", fix_input(item["input"]), False, explain=item.get("explain", "")))

    for i, item in enumerate(hidden, 1):
        if not isinstance(item, dict) or not isinstance(item.get("input"), str):
            p.err(f"HIDDEN[{i - 1}] 必須是含 input 字串的 dict")
            continue
        extra = set(item) - HIDDEN_KEYS
        if extra:
            p.err(f"HIDDEN[{i - 1}] 有未知欄位 {sorted(extra)}")
        label = str(item.get("label", "")).strip()
        kind = item.get("kind", "normal")
        if not label:
            p.err(f"HIDDEN[{i - 1}] 需要 label（使用者答錯時看到的測資描述）")
        if kind not in KINDS:
            p.err(f"HIDDEN[{i - 1}] kind 必須是 {KINDS} 之一")
        p.cases.append(Case(f"隱藏 {i}", fix_input(item["input"]), True,
                            label=label, kind=kind, hint=str(item.get("hint", "")).strip()))

    sample_cases = [c for c in p.cases if not c.hidden]
    hidden_cases = [c for c in p.cases if c.hidden]
    if not MIN_SAMPLES <= len(sample_cases) <= MAX_SAMPLES:
        p.err(f"範例測資需要 {MIN_SAMPLES} 到 {MAX_SAMPLES} 組，目前 {len(sample_cases)} 組")
    if len(hidden_cases) < MIN_HIDDEN[difficulty]:
        p.err(f"{difficulty} 題至少需要 {MIN_HIDDEN[difficulty]} 組隱藏測資，目前 {len(hidden_cases)} 組")
    if sum(c.kind == "edge" for c in hidden_cases) < MIN_EDGE:
        p.err(f"隱藏測資至少需要 {MIN_EDGE} 組 kind=\"edge\"（極端狀況，例如 0、最小 n、全部相同）")
    if difficulty == "hard" and not any(c.kind == "stress" for c in hidden_cases):
        p.err("hard 題需要至少 1 組 kind=\"stress\"（最大資料量，用來擋掉太慢的解法）")
    labels = [c.label for c in hidden_cases]
    dup_labels = {x for x in labels if labels.count(x) > 1}
    if dup_labels:
        p.err(f"隱藏測資 label 重複：{sorted(dup_labels)}")
    inputs = [c.input for c in p.cases]
    if len(set(inputs)) != len(inputs):
        p.err("有兩組測資的輸入完全相同")
    for c in p.cases:
        if len(c.input.encode("utf-8")) > MAX_CASE_BYTES:
            p.err(f"{c.name} 輸入超過 {MAX_CASE_BYTES // 1000} KB，請縮小資料量")
    return p


def fix_input(text: str) -> str:
    text = text.replace("\r\n", "\n")
    return text if text.endswith("\n") else text + "\n"


# ---------------------------------------------------------------- judging

def judge_problem(p: Problem, pool: ThreadPoolExecutor, verbose: bool):
    solution = p.path / "solution.py"
    limit_s = p.time_limit / 1000
    results = list(pool.map(lambda c: run_python(solution, c.input, max(10.0, limit_s * 4)), p.cases))

    slowest = 0.0
    for case, res in zip(p.cases, results):
        where = f"{case.name}{'（' + case.label + '）' if case.label else ''}"
        if res.status == "TLE":
            p.err(f"solution.py 在 {where} 執行超時")
            continue
        if res.status == "RE":
            p.err(f"solution.py 在 {where} 發生錯誤：\n{indent(res.stderr.strip())}")
            continue
        if not res.stdout.strip():
            p.err(f"solution.py 在 {where} 沒有任何輸出")
        case.output = normalize(res.stdout)
        slowest = max(slowest, res.seconds)
        if res.seconds > limit_s * NATIVE_BUDGET:
            p.warn(f"參考解在 {where} 用了 {res.seconds * 1000:.0f} ms，"
                   f"超過時限 {p.time_limit} ms 的 {int(NATIVE_BUDGET * 100)}%，瀏覽器裡可能會超時")
        if verbose:
            p.report.append(f"    {where:<34} {res.seconds * 1000:6.0f} ms  輸出 {len(case.output)} 字元")
    p.report.insert(0, f"  參考解最慢 {slowest * 1000:.0f} ms（本機 CPython，含啟動時間）")

    if p.errors:
        return

    wrong_dir = p.path / "wrong"
    wrong_files = sorted(wrong_dir.glob("*.py")) if wrong_dir.is_dir() else []
    if not wrong_files:
        p.warn("沒有 wrong/*.py。建議寫 1 到 3 個「常見錯誤解」，用來證明隱藏測資抓得到它們")
    for wrong in wrong_files:
        if has_todo(wrong.read_text(encoding="utf-8")):
            p.err(f"wrong/{wrong.name} 還有 TODO（寫好錯誤解，或刪掉這個檔案）")
            continue
        runs = list(pool.map(lambda c: run_python(wrong, c.input, limit_s), p.cases))
        caught = []
        for case, res in zip(p.cases, runs):
            if res.status != "OK":
                caught.append((case, res.status))
            elif not outputs_match(case.output, res.stdout, p.compare):
                caught.append((case, "WA"))
        if not caught:
            p.err(f"錯誤解 wrong/{wrong.name} 通過了所有測資，請補上能抓到它的隱藏測資")
            continue
        if not any(c.hidden for c, _ in caught):
            p.warn(f"錯誤解 wrong/{wrong.name} 只被範例測資抓到，隱藏測資沒有抓到它")
        names = ", ".join(f"{c.name}({v})" for c, v in caught[:4])
        more = f" 等 {len(caught)} 組" if len(caught) > 4 else ""
        p.report.append(f"  wrong/{wrong.name:<22} 被抓到：{names}{more}")


def indent(text: str, prefix: str = "      ") -> str:
    return "\n".join(prefix + ln for ln in text.splitlines()[-12:])


# ---------------------------------------------------------------- output

def problem_payload(p: Problem, family_meta: dict) -> dict:
    samples = [c for c in p.cases if not c.hidden]
    hidden = [c for c in p.cases if c.hidden]
    return {
        "id": p.id,
        "family": p.family,
        "family_title": family_meta["title"],
        "difficulty": p.difficulty,
        "title": p.meta["title"].strip(),
        "tags": p.meta.get("tags", []),
        "time_limit_ms": p.time_limit,
        "compare": p.compare,
        "statement": p.statement,
        "hints": p.meta.get("hints", []),
        "samples": [{"input": c.input, "output": c.output, "explain": c.explain} for c in samples],
        "hidden_count": len(hidden),
        "hidden": encode_hidden([
            {"label": c.label, "kind": c.kind, "hint": c.hint, "input": c.input, "output": c.output}
            for c in hidden
        ]),
    }


def dump(data, compact: bool) -> str:
    if compact:
        return json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


# ---------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description="Pythex 題庫建置工具")
    ap.add_argument("--check", action="store_true", help="只驗證，並確認 docs/data 是最新的")
    ap.add_argument("-v", "--verbose", action="store_true", help="顯示每組測資的執行時間")
    args = ap.parse_args()

    families = []
    fatal = []
    for fam_dir in sorted(d for d in SRC_DIR.iterdir() if d.is_dir() and not d.name.startswith((".", "_"))):
        slug = fam_dir.name
        if not SLUG_RE.match(slug):
            fatal.append(f"資料夾名稱 {slug!r} 必須是小寫英數字與連字號（例如 running-state）")
            continue
        fam_file = fam_dir / "family.json"
        if not fam_file.is_file():
            fatal.append(f"{slug}: 缺少 family.json")
            continue
        try:
            fam_meta = read_json(fam_file)
        except Exception as exc:  # noqa: BLE001
            fatal.append(f"{slug}: family.json 格式錯誤：{exc}")
            continue
        unknown = set(fam_meta) - FAMILY_KEYS
        if unknown:
            fatal.append(f"{slug}: family.json 有未知欄位 {sorted(unknown)}")
        for key in ("title", "concept", "core"):
            if not str(fam_meta.get(key, "")).strip():
                fatal.append(f"{slug}: family.json 需要 {key}")
        if has_todo(json.dumps(fam_meta, ensure_ascii=False)):
            fatal.append(f"{slug}: family.json 還有 TODO")
        problems = []
        for diff in DIFFICULTIES:
            pdir = fam_dir / diff
            if not pdir.is_dir():
                fatal.append(f"{slug}: 缺少 {diff}/ 資料夾（每個家族必須剛好有 easy、medium、hard 三題）")
                continue
            problems.append(load_problem(slug, diff, pdir))
        extra = [d.name for d in fam_dir.iterdir() if d.is_dir() and d.name not in DIFFICULTIES]
        if extra:
            fatal.append(f"{slug}: 不認得的資料夾 {extra}，只允許 easy / medium / hard")
        titles = [p.meta.get("title") for p in problems if p.meta]
        if len(set(titles)) != len(titles):
            fatal.append(f"{slug}: 三個難度的題目名稱必須不同")
        families.append((slug, fam_meta, problems))

    workers = max(2, (os.cpu_count() or 4))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for _, _, problems in families:
            for p in problems:
                if not p.errors:
                    judge_problem(p, pool, args.verbose)

    # report
    total_err = len(fatal)
    total_warn = 0
    for msg in fatal:
        print(f"[錯誤] {msg}")
    for slug, fam_meta, problems in families:
        print(f"\n{slug}  {fam_meta.get('title', '')}")
        for p in problems:
            hidden = [c for c in p.cases if c.hidden]
            kinds = {k: sum(c.kind == k for c in hidden) for k in KINDS}
            kind_txt = " ".join(f"{k}:{v}" for k, v in kinds.items() if v)
            mark = "失敗" if p.errors else "通過"
            print(f"  [{mark}] {p.difficulty:<6} {p.meta.get('title', '?')}  "
                  f"範例 {len(p.cases) - len(hidden)} / 隱藏 {len(hidden)} ({kind_txt})")
            for line in p.report:
                print(line)
            for w in p.warnings:
                print(f"    [警告] {w}")
            for e in p.errors:
                print(f"    [錯誤] {e}")
            total_err += len(p.errors)
            total_warn += len(p.warnings)

    if total_err:
        print(f"\n建置失敗：{total_err} 個錯誤，{total_warn} 個警告。docs/data 沒有更新。")
        return 1

    # build outputs
    families.sort(key=lambda f: (f[1].get("order", 999), f[0]))
    outputs: dict[Path, str] = {}
    index = {"version": 1, "families": []}
    for slug, fam_meta, problems in families:
        entry = {
            "id": slug,
            "title": fam_meta["title"],
            "concept": fam_meta["concept"],
            "core": fam_meta["core"],
            "problems": [],
        }
        for p in problems:
            payload = problem_payload(p, fam_meta)
            text = dump(payload, compact=True)
            if len(text.encode("utf-8")) > MAX_PROBLEM_BYTES:
                print(f"[錯誤] {p.id} 輸出 {len(text) // 1000} KB，超過上限，請縮小壓力測資")
                return 1
            outputs[OUT_DIR / "problems" / f"{p.id}.json"] = text
            entry["problems"].append({
                "id": p.id,
                "difficulty": p.difficulty,
                "title": payload["title"],
                "tags": payload["tags"],
                "sample_count": len(payload["samples"]),
                "hidden_count": payload["hidden_count"],
            })
        index["families"].append(entry)
    outputs[OUT_DIR / "index.json"] = dump(index, compact=False)

    existing = set((OUT_DIR / "problems").glob("*.json")) if (OUT_DIR / "problems").is_dir() else set()
    stale = existing - set(outputs)

    if args.check:
        outdated = [p for p, text in outputs.items()
                    if not p.is_file() or p.read_text(encoding="utf-8") != text]
        outdated += sorted(stale)
        if outdated:
            print("\n[錯誤] docs/data 不是最新的，請執行 python tools/build.py 後一起 commit：")
            for path in outdated:
                print(f"  {path.relative_to(ROOT)}")
            return 1
        print(f"\n檢查通過：{len(outputs) - 1} 題，{total_warn} 個警告。")
        return 0

    (OUT_DIR / "problems").mkdir(parents=True, exist_ok=True)
    for path, text in outputs.items():
        if not path.is_file() or path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8", newline="\n")
    for path in stale:
        path.unlink()
    print(f"\n建置完成：{len(outputs) - 1} 題寫入 docs/data/，{total_warn} 個警告。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
