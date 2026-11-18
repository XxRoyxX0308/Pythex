n = int(input())
pos = {}
for r in range(n):
    row = list(map(int, input().split()))
    for c, v in enumerate(row):
        pos[v] = (r, c)

m = int(input())
calls = list(map(int, input().split()))

lit = [[False] * n for _ in range(n)]
answer = -1
for step, v in enumerate(calls, 1):
    r, c = pos[v]
    lit[r][c] = True
    if (all(lit[r][j] for j in range(n))
            or all(lit[i][c] for i in range(n))
            or (r == c and all(lit[i][i] for i in range(n)))
            or (r + c == n - 1 and all(lit[i][n - 1 - i] for i in range(n)))):
        answer = step
        break

print(answer)
