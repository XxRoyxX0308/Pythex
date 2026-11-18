from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20241119)


def fmt(grid, calls):
    n = len(grid)
    rows = "".join(" ".join(map(str, row)) + "\n" for row in grid)
    return f"{n}\n{rows}{len(calls)}\n{' '.join(map(str, calls))}\n"


def sorted_grid(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]


def shuffled_grid(n):
    vals = list(range(1, n * n + 1))
    rng.shuffle(vals)
    return [vals[r * n:(r + 1) * n] for r in range(n)]


def finish_last(target, extras):
    """把 extras 與 target 前 n-1 格打散，target 的最後一格放在最後公布。"""
    head = target[:-1] + extras
    rng.shuffle(head)
    return head + [target[-1]]


# 範例
G1 = [[6, 1, 8], [4, 7, 2], [5, 9, 3]]

# 只有右上到左下的對角線 (N = 6)
G_ANTI = shuffled_grid(6)
ANTI = [G_ANTI[i][5 - i] for i in range(6)]
ANTI_EXTRA = [G_ANTI[i][(i + 2) % 6] for i in range(6)]

# 只有左上到右下的對角線 (N = 4)
G_MAIN = shuffled_grid(4)
MAIN = [G_MAIN[i][i] for i in range(4)]
MAIN_EXTRA = [G_MAIN[i][(i + 2) % 4] for i in range(4)]

# 直行 (N = 5)
G_COL = shuffled_grid(5)
COL = [G_COL[i][3] for i in range(5)]
COL_EXTRA = [G_COL[i][(i + 1) % 5] for i in range(5) if (i + 1) % 5 != 3]

# 最少步數 (N = 4)
G_FAST = shuffled_grid(4)
FAST = [G_FAST[i][2] for i in range(4)]
FAST_REST = [v for row in G_FAST for v in row if v not in FAST]
rng.shuffle(FAST_REST)

# 門牌沒有照順序 (N = 4)
G_PERM = shuffled_grid(4)
PERM_REST = list(range(5, 17))
rng.shuffle(PERM_REST)

G_RAND6 = shuffled_grid(6)
RAND6 = list(range(1, 37))
rng.shuffle(RAND6)

G_RAND5 = shuffled_grid(5)
RAND5 = rng.sample(range(1, 26), 12)

SAMPLES = [
    {"input": fmt(G1, [4, 6, 7, 1, 2, 8]),
     "explain": L("第 5 戶（門牌 2）開燈後，第二排 4 7 2 全部亮起。", "After the 5th light (household 2), the second row 4 7 2 is fully lit.")},
    {"input": fmt(sorted_grid(3), [1, 2, 4, 5]),
     "explain": L("4 戶開燈之後都沒有任何一排、一行或對角線全亮，輸出 -1。", "After 4 lights, no row, column or diagonal is fully lit, so the answer is -1.")},
]

HIDDEN = [
    {
        "label": L("開燈戶數比 N 還少 (M < N)", "Fewer lights than N (M < N)"),
        "kind": "edge",
        "input": fmt(shuffled_grid(5), rng.sample(range(1, 26), 3)),
        "hint": L("亮的窗戶少於 N 扇時不可能連線，全部看完都沒有就要輸出 -1。", "With fewer than N lit windows no line can be complete. If nothing completes, print -1."),
    },
    {
        "label": L("中心格同時屬於兩條對角線", "The center cell lies on both diagonals"),
        "kind": "edge",
        "input": fmt(sorted_grid(3), [1, 9, 3, 7, 5]),
        "hint": L("N 是奇數時，正中間那格同時在兩條對角線上，兩條都要檢查。", "When N is odd, the center cell lies on both diagonals, so check both."),
    },
    {
        "label": L("只有右上到左下的對角線連線", "Only the top-right to bottom-left diagonal completes"),
        "kind": "edge",
        "input": fmt(G_ANTI, finish_last(ANTI, ANTI_EXTRA)),
        "hint": L("對角線有兩條。右上到左下那條的格子滿足 r + c == N - 1。", "There are two diagonals. Cells on the top-right to bottom-left one satisfy r + c == N - 1."),
    },
    {
        "label": L("只有左上到右下的對角線連線", "Only the top-left to bottom-right diagonal completes"),
        "kind": "edge",
        "input": fmt(G_MAIN, finish_last(MAIN, MAIN_EXTRA)),
        "hint": L("左上到右下那條對角線的格子滿足 r == c。", "Cells on the top-left to bottom-right diagonal satisfy r == c."),
    },
    {
        "label": L("前 N 戶剛好連成一直行", "The first N lights form a column"),
        "kind": "edge",
        "input": fmt(G_FAST, FAST + FAST_REST),
        "hint": L("連線之後要立刻停下來，輸出當下是第幾戶。", "Stop as soon as a line is complete and print which light it was."),
    },
    {
        "label": L("只有直行連線", "Only a column completes"),
        "kind": "boundary",
        "input": fmt(G_COL, finish_last(COL, COL_EXTRA)),
        "hint": L("除了橫排，也要檢查直行。", "Check columns as well as rows."),
    },
    {
        "label": L("公布的最後一戶才完成連線", "The line completes only at the last light"),
        "kind": "boundary",
        "input": fmt(sorted_grid(3), [1, 2, 6, 4, 8, 5]),
        "hint": L("最後一個號碼也要檢查，注意迴圈有沒有少跑一次。", "The last number must be checked too. Make sure your loop does not stop one step early."),
    },
    {
        "label": L("門牌號碼沒有照順序排", "Household numbers are not in order"),
        "kind": "boundary",
        "input": fmt(G_PERM, [1, 2, 3, 4] + PERM_REST),
        "hint": L("號碼 1 到 N 不一定在第一排。請用字典記錄每個號碼實際的位置，不要用號碼直接算位置。", "Numbers 1 to N are not necessarily in the first row. Store each number's real position in a dict instead of computing it from the number."),
    },
    {
        "label": L("N = 6，36 戶全部開燈的隨機順序", "N = 6, all 36 lights in random order"),
        "kind": "normal",
        "input": fmt(G_RAND6, RAND6),
    },
    {
        "label": L("N = 5，12 戶開燈的隨機資料", "Random data: N = 5 with 12 lights"),
        "kind": "normal",
        "input": fmt(G_RAND5, RAND5),
    },
]
