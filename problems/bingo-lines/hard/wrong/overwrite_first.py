# 常見錯誤：每次完成連線都更新時間，記到的是「最後一次」而不是第一次；同時也只列出一位最早的住戶。
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
        if r == c:
            diag[i] += 1
        if r + c == n - 1:
            anti[i] += 1
        if rows[i][r] == n or cols[i][c] == n or (r == c and diag[i] == n) or (r + c == n - 1 and anti[i] == n):
            first[i] = step

done = [s for s in first if s != -1]
if done:
    s = min(done)
    print(s, first.index(s) + 1)
else:
    print("No Bingo")
print(*first)
