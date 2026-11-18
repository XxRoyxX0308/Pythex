# 常見錯誤：沒有同步移動。島 A 移動完之後，島 B 用已經收到島 A 移民的人數計算移動人數。
import sys

data = sys.stdin.read().split()
pop = list(map(int, data[0:3]))
d = int(data[3])
first = list(map(int, data[4:7]))
c = int(data[7])
r = int(data[8])
imm_pct = list(map(int, data[9:12]))
mv = list(map(int, data[12:15]))

immune = [pop[k] * imm_pct[k] // 100 for k in range(3)]
sus = [pop[k] - immune[k] for k in range(3)]
sick = [0, 0, 0]
new = [[0] * (d + 1) for _ in range(3)]

out = []
total = 0
best, best_day = -1, 0
for day in range(1, d + 1):
    if day >= 2:
        # 1. 同步移動：先用移動前的人數算好三座島各自要走多少人，再一起套用
        for k in range(3):
            nxt = (k + 1) % 3
            ms = [sus[j] * mv[j] // 100 for j in range(3)]
            mi = [immune[j] * mv[j] // 100 for j in range(3)]
            sus[k] -= ms[k]
            sus[nxt] += ms[k]
            immune[k] -= mi[k]
            immune[nxt] += mi[k]
    # 前一天結束時的狀態（移動前就要記下來，這裡用上一輪留下的 prev_*）
    for k in range(3):
        rec = new[k][day - r] if day - r >= 1 else 0
        if day == 1:
            y = first[k]
        else:
            p_prev, i_prev = prev_pop[k], prev_imm[k]
            y = sick[k] * c * (p_prev - i_prev) // (100 * r * p_prev) if p_prev > 0 else 0
            y = min(y, sus[k])
        new[k][day] = y
        sus[k] -= y
        immune[k] += rec
        sick[k] = sick[k] + y - rec
        total += y
        out.append(f"{day} {'ABC'[k]} {sick[k]} {y} {rec}")
    prev_pop = [sus[k] + immune[k] + sick[k] for k in range(3)]
    prev_imm = immune[:]
    s = sum(sick)
    if s > best:
        best, best_day = s, day
out.append(f"{total} {best_day}")
print("\n".join(out))
