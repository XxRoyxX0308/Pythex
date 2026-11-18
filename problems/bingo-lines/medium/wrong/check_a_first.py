# 常見錯誤：A 隊一達成就結束，沒有檢查 B 隊是否同時達成 (Draw)。
n, k = map(int, input().split())


def read_map():
    pos = {}
    for r in range(n):
        for c, v in enumerate(map(int, input().split())):
            pos[v] = (r, c)
    return pos


maps = [read_map(), read_map()]
m = int(input())
calls = list(map(int, input().split()))
marked = [[[False] * n for _ in range(n)] for _ in range(2)]
lines = [0, 0]
result = "None"
for step, v in enumerate(calls, 1):
    winner = None
    for t, name in ((0, "A"), (1, "B")):
        r, c = maps[t][v]
        g = marked[t]
        g[r][c] = True
        lines[t] += all(g[r]) + all(g[i][c] for i in range(n))
        lines[t] += (r == c and all(g[i][i] for i in range(n)))
        lines[t] += (r + c == n - 1 and all(g[i][n - 1 - i] for i in range(n)))
        if lines[t] >= k:
            winner = name
            break
    if winner:
        result = f"{winner} {step}"
        break
print(result)
