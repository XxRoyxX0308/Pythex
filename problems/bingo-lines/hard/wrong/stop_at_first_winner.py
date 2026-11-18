# 常見錯誤：照一般賓果規則，有人連線就結束遊戲，其他住戶都變成 -1。
import sys

data = sys.stdin.read().split()
p, n = int(data[0]), int(data[1])
idx = 2
cell = []
for _ in range(p):
    where = {}
    for k in range(n * n):
        where[int(data[idx + k])] = divmod(k, n)
    idx += n * n
    cell.append(where)
m = int(data[idx])
calls = [int(x) for x in data[idx + 1: idx + 1 + m]]

rows = [[0] * n for _ in range(p)]
cols = [[0] * n for _ in range(p)]
diag, anti = [0] * p, [0] * p
first = [-1] * p
for step, v in enumerate(calls, 1):
    for i in range(p):
        r, c = cell[i][v]
        rows[i][r] += 1
        cols[i][c] += 1
        diag[i] += r == c
        anti[i] += r + c == n - 1
        if n in (rows[i][r], cols[i][c], diag[i], anti[i]) and first[i] == -1:
            first[i] = step
    if any(s != -1 for s in first):
        break

done = [s for s in first if s != -1]
if done:
    s = min(done)
    print(s, *[i + 1 for i in range(p) if first[i] == s])
else:
    print("No Bingo")
print(*first)
