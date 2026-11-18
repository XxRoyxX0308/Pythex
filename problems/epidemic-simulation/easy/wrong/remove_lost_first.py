# 常見錯誤：順序錯了。先把今天失去興趣的人扣掉，再用剩下的人數計算新聽到的人數。
n, f = map(int, input().split())
d, r, p = map(int, input().split())
new = [0] * (d + 1)
active = 0
heard = 0
for day in range(1, d + 1):
    lost = new[day - r] if day - r >= 1 else 0
    active -= lost
    y = f if day == 1 else min(active * p // 100, n - heard)
    new[day] = y
    heard += y
    active += y
    print(day, active, y, lost)
print(heard)
