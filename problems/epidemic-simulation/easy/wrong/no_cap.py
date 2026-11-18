# 常見錯誤：忘記「新聽到的人數不能超過還沒聽過的人數」，全校都聽過之後還在增加。
n, f = map(int, input().split())
d, r, p = map(int, input().split())
new = [0] * (d + 1)
active = 0
heard = 0
for day in range(1, d + 1):
    lost = new[day - r] if day - r >= 1 else 0
    y = f if day == 1 else active * p // 100
    new[day] = y
    heard += y
    active = active + y - lost
    print(day, active, y, lost)
print(heard)
