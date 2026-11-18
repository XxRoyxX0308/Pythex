# 常見錯誤：差一天。以為第 n 天聽到的人在第 n + R - 1 天就失去興趣。
n, f = map(int, input().split())
d, r, p = map(int, input().split())
new = [0] * (d + 2)
active = 0
heard = 0
for day in range(1, d + 1):
    lost = new[day - r + 1] if day - r + 1 >= 1 and r > 1 else 0
    y = f if day == 1 else min(active * p // 100, n - heard)
    new[day] = y
    heard += y
    active = active + y - lost
    print(day, active, y, lost)
print(heard)
