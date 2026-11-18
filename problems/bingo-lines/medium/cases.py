from random import Random

rng = Random(20241120)


def fmt(n, k, a, b, calls):
    def grid(g):
        return "".join(" ".join(map(str, row)) + "\n" for row in g)
    return f"{n} {k}\n{grid(a)}{grid(b)}{len(calls)}\n{' '.join(map(str, calls))}\n"


def sorted_grid(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]


def transposed_grid(n):
    return [[c * n + r + 1 for c in range(n)] for r in range(n)]


def reversed_grid(n):
    return [[n * n - (r * n + c) for c in range(n)] for r in range(n)]


def shuffled_grid(n):
    vals = list(range(1, n * n + 1))
    rng.shuffle(vals)
    return [vals[r * n:(r + 1) * n] for r in range(n)]


def full_order(n):
    vals = list(range(1, n * n + 1))
    rng.shuffle(vals)
    return vals


# A 的右上到左下對角線 (N = 5)
G_ANTI_A = shuffled_grid(5)
G_ANTI_B = shuffled_grid(5)
ANTI = [G_ANTI_A[i][4 - i] for i in range(5)]
ANTI_REST = [v for v in full_order(5) if v not in ANTI]

SAMPLES = [
    {
        "input": fmt(3, 1, [[6, 1, 8], [4, 7, 2], [5, 9, 3]], [[9, 6, 4], [5, 1, 8], [2, 7, 3]], [6, 1, 8, 3]),
        "explain": "第 3 次廣播後，A 隊第一排 6 1 8 全部圈起，達到 K = 1 條，比賽結束。",
    },
    {
        "input": fmt(3, 2, sorted_grid(3), reversed_grid(3), [1, 2, 3, 5, 9]),
        "explain": "兩隊都在第 3 次廣播完成一條橫排、第 5 次完成一條對角線，同時達到 K = 2 條。",
    },
]

HIDDEN = [
    {
        "label": "圈一格同時完成兩條連線",
        "kind": "edge",
        "input": fmt(3, 2, sorted_grid(3), [[1, 9, 2], [8, 3, 7], [4, 6, 5]], [2, 8, 4, 6, 5]),
        "hint": "最後圈起的那格同時完成了一條橫排和一條直行，兩條都要算進連線數。",
    },
    {
        "label": "兩隊在同一次廣播後同時達成 (K = 1)",
        "kind": "edge",
        "input": fmt(4, 1, sorted_grid(4), transposed_grid(4), [1, 2, 3, 4, 5, 6]),
        "hint": "同一次廣播後兩隊都達到 K，要輸出 Draw。先把兩隊都更新完再判斷，不要檢查到 A 就直接結束。",
    },
    {
        "label": "K = 2N + 2，要完成所有連線",
        "kind": "edge",
        "input": fmt(3, 8, shuffled_grid(3), shuffled_grid(3), full_order(3)),
        "hint": "K 最大可以是 2N + 2，也就是全部橫排、直行、對角線都要完成。",
    },
    {
        "label": "廣播完都沒有隊伍達成",
        "kind": "edge",
        "input": fmt(4, 3, shuffled_grid(4), shuffled_grid(4), rng.sample(range(1, 17), 5)),
        "hint": "全部廣播完都沒有隊伍達到 K 條，要輸出 None。",
    },
    {
        "label": "B 隊先達成，之後 A 隊也會達成",
        "kind": "boundary",
        "input": fmt(4, 1, sorted_grid(4), [[13, 14, 15, 16], [1, 2, 3, 9], [4, 5, 6, 10], [7, 8, 11, 12]],
                     [9, 1, 2, 3, 4, 5]),
        "hint": "有隊伍達成時比賽要立刻結束，後面的廣播不能再改變結果。",
    },
    {
        "label": "A 隊靠右上到左下的對角線獲勝",
        "kind": "boundary",
        "input": fmt(5, 1, G_ANTI_A, G_ANTI_B, ANTI + ANTI_REST),
        "hint": "對角線有兩條，右上到左下那條的格子滿足 r + c == N - 1。",
    },
    {
        "label": "N = 8、K = 1 的隨機資料",
        "kind": "boundary",
        "input": fmt(8, 1, shuffled_grid(8), shuffled_grid(8), full_order(8)),
    },
    {
        "label": "N = 8、K = 5 的隨機資料",
        "kind": "normal",
        "input": fmt(8, 5, shuffled_grid(8), shuffled_grid(8), full_order(8)),
    },
    {
        "label": "N = 6、K = 3，只廣播 30 個編號",
        "kind": "normal",
        "input": fmt(6, 3, shuffled_grid(6), shuffled_grid(6), rng.sample(range(1, 37), 30)),
    },
]
