# 常見錯誤：只檢查橫排與直行，忘了對角線。
n = int(input())
pos = {}
for r in range(n):
    for c, v in enumerate(map(int, input().split())):
        pos[v] = (r, c)
m = int(input())
calls = list(map(int, input().split()))
lit = [[False] * n for _ in range(n)]
answer = -1
for step, v in enumerate(calls, 1):
    r, c = pos[v]
    lit[r][c] = True
    if all(lit[r]) or all(lit[i][c] for i in range(n)):
        answer = step
        break
print(answer)
