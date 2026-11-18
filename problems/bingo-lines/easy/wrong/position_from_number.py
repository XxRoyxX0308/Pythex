# 常見錯誤：以為門牌照順序排，直接用號碼算位置，沒有讀卡片內容。
n = int(input())
for _ in range(n):
    input()
m = int(input())
calls = list(map(int, input().split()))
lit = [[False] * n for _ in range(n)]
answer = -1
for step, v in enumerate(calls, 1):
    r, c = divmod(v - 1, n)
    lit[r][c] = True
    if (all(lit[r]) or all(lit[i][c] for i in range(n))
            or all(lit[i][i] for i in range(n))
            or all(lit[i][n - 1 - i] for i in range(n))):
        answer = step
        break
print(answer)
