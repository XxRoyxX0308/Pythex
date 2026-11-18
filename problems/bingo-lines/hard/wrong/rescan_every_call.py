# 常見錯誤：答案正確，但每抽一個號碼就重新檢查整張卡的每條線，資料大時超時。
import sys

data = sys.stdin.read().split()
p, n = int(data[0]), int(data[1])
idx = 2
cards = []
for _ in range(p):
    cards.append([[int(data[idx + r * n + c]) for c in range(n)] for r in range(n)])
    idx += n * n
m = int(data[idx])
calls = [int(x) for x in data[idx + 1: idx + 1 + m]]

called = set()
first = [-1] * p
for step, v in enumerate(calls, 1):
    called.add(v)
    for i in range(p):
        if first[i] != -1:
            continue
        g = cards[i]
        lines = [g[r] for r in range(n)]
        lines += [[g[r][c] for r in range(n)] for c in range(n)]
        lines.append([g[k][k] for k in range(n)])
        lines.append([g[k][n - 1 - k] for k in range(n)])
        if any(all(x in called for x in line) for line in lines):
            first[i] = step

done = [s for s in first if s != -1]
if done:
    s = min(done)
    print(s, *[i + 1 for i in range(p) if first[i] == s])
else:
    print("No Bingo")
print(*first)
