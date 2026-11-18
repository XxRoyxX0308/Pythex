from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20241121)


def fmt(cards, calls):
    n = len(cards[0])
    body = "".join(" ".join(map(str, row)) + "\n" for card in cards for row in card)
    return f"{len(cards)} {n}\n{body}{len(calls)}\n{' '.join(map(str, calls))}\n"


def sorted_grid(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]


def transposed_grid(n):
    return [[c * n + r + 1 for c in range(n)] for r in range(n)]


def shuffled_grid(n):
    vals = list(range(1, n * n + 1))
    rng.shuffle(vals)
    return [vals[r * n:(r + 1) * n] for r in range(n)]


def full_order(n):
    vals = list(range(1, n * n + 1))
    rng.shuffle(vals)
    return vals


def row_shuffled(n):
    """把 sorted_grid 的橫排順序與每排內部順序打亂，橫排的數字組合不變。"""
    g = [row[:] for row in sorted_grid(n)]
    rng.shuffle(g)
    for row in g:
        rng.shuffle(row)
    return g


# 兩條對角線：住戶 1 靠右上到左下，住戶 2 靠左上到右下
D1, D2 = shuffled_grid(5), shuffled_grid(5)
D_CALLS = [D1[i][4 - i] for i in range(5)]
D_CALLS += [D2[i][i] for i in range(5) if D2[i][i] not in D_CALLS]

# 最早連線的是編號最大的住戶
LAST = [shuffled_grid(4) for _ in range(3)] + [sorted_grid(4)]
LAST_CALLS = [13, 14, 15, 16] + [v for v in full_order(4) if v not in (13, 14, 15, 16)]

SAMPLES = [
    {
        "input": fmt([[[6, 1, 8], [4, 7, 2], [5, 9, 3]],
                      [[9, 6, 4], [5, 1, 8], [2, 7, 3]],
                      sorted_grid(3)], [6, 1, 8, 3, 5, 9]),
        "explain": L("住戶 1 在第 3 個號碼完成第一排；住戶 2 在第 5 個號碼完成 5 1 8；住戶 3 在第 6 個號碼完成對角線 1 5 9。", "Resident 1 completes the first row at draw 3, resident 2 completes 5 1 8 at draw 5, and resident 3 completes the diagonal 1 5 9 at draw 6."),
    },
    {
        "input": fmt([sorted_grid(3), transposed_grid(3)], [1, 2, 3]),
        "explain": L("兩位住戶都在第 3 個號碼完成連線，所以第一行列出 3 1 2。", "Both residents complete a line at draw 3, so the first line is 3 1 2."),
    },
]

HIDDEN = [
    {
        "label": L("沒有任何人連線", "Nobody completes a line"),
        "kind": "edge",
        "input": fmt([shuffled_grid(4) for _ in range(3)], rng.sample(range(1, 17), 3)),
        "hint": L("沒有人連線時，第一行輸出 No Bingo，第二行每個人都是 -1。", "If nobody completes a line, print No Bingo on the first line and -1 for everyone on the second."),
    },
    {
        "label": L("所有住戶同時連線", "Every resident completes a line at the same time"),
        "kind": "edge",
        "input": fmt([row_shuffled(3) for _ in range(5)], [1, 2, 3, 9]),
        "hint": L("同時最早連線的住戶要全部列出來，而且依編號由小到大。", "List every resident who completes a line at the earliest draw, in increasing order."),
    },
    {
        "label": L("連線之後又完成更多連線", "More lines are completed after the first one"),
        "kind": "edge",
        "input": fmt([sorted_grid(3), shuffled_grid(3)], [1, 2, 3, 4, 5, 6, 7, 8, 9]),
        "hint": L("只記錄「第一次」完成連線的時間，之後再完成的連線不能覆蓋它。", "Record only the first time a line is completed. Later lines must not overwrite it."),
    },
    {
        "label": L("最早連線的是編號最大的住戶", "The earliest line belongs to the highest-numbered resident"),
        "kind": "edge",
        "input": fmt(LAST, LAST_CALLS),
    },
    {
        "label": L("兩條對角線各有一位住戶完成", "One resident completes each diagonal"),
        "kind": "boundary",
        "input": fmt([D1, D2], D_CALLS),
        "hint": L("兩條對角線都要檢查：r == c 以及 r + c == N - 1。", "Check both diagonals: r == c and r + c == N - 1."),
    },
    {
        "label": L("抽到最後一個號碼才有人連線", "Nobody completes a line until the last draw"),
        "kind": "boundary",
        "input": fmt([sorted_grid(3), [[1, 9, 2], [8, 3, 7], [4, 6, 5]]], [1, 2, 6, 4, 8, 5]),
    },
    {
        "label": L("N = 3、號碼全部抽完", "N = 3, every number drawn"),
        "kind": "boundary",
        "input": fmt([shuffled_grid(3) for _ in range(4)], full_order(3)),
    },
    {
        "label": L("10 張 8 × 8 卡片的隨機資料", "Random data: 10 cards of 8 × 8"),
        "kind": "normal",
        "input": fmt([shuffled_grid(8) for _ in range(10)], full_order(8)),
    },
    {
        "label": L("80 張 30 × 30 卡片，號碼全部抽完", "80 cards of 30 × 30, every number drawn"),
        "kind": "stress",
        "input": fmt([shuffled_grid(30) for _ in range(80)], full_order(30)),
        "hint": L("每抽一個號碼都重新檢查整張卡會太慢。用計數器記錄每條線圈了幾格，圈一格只需要更新最多 4 個計數器。", "Re-checking the whole card after every draw is too slow. Keep a counter for each line; circling a cell updates at most 4 counters."),
    },
    {
        "label": L("40 張 30 × 30 卡片，只抽 600 個號碼", "40 cards of 30 × 30, only 600 numbers drawn"),
        "kind": "stress",
        "input": fmt([shuffled_grid(30) for _ in range(40)], rng.sample(range(1, 901), 600)),
        "hint": L("抽到一半時可能沒有人連線，也可能只有部分住戶連線，沒連線的要輸出 -1。", "Partway through the draws, some residents may have no line yet. Print -1 for them."),
    },
]
