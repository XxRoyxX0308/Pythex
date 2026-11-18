# 常見錯誤：有隊伍達成後忘了 break，結果被後面的廣播覆蓋。
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
    for t in range(2):
        r, c = maps[t][v]
        g = marked[t]
        g[r][c] = True
        lines[t] += all(g[r]) + all(g[i][c] for i in range(n))
        lines[t] += (r == c and all(g[i][i] for i in range(n)))
        lines[t] += (r + c == n - 1 and all(g[i][n - 1 - i] for i in range(n)))
    a, b = lines[0] >= k, lines[1] >= k
    if a or b:
        result = f"{'Draw' if a and b else 'A' if a else 'B'} {step}"
print(result)
