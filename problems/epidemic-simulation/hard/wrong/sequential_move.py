# 常見錯誤：沒有同步移動。蜂箱依編號一個一個移動，後面的蜂箱用已經收到前一箱移民的數量計算。
import sys

data = sys.stdin.read().split()
k, d, r, c = map(int, data[:4])
pop = []
first = []
sus = []
immune = []
mv = []
pos = 4
for i in range(k):
    p, f, a, m = map(int, data[pos:pos + 4])
    pos += 4
    im = p * a // 100
    pop.append(p)
    first.append(f)
    immune.append(im)
    sus.append(p - im)
    mv.append(m)

new = [[0] * (d + 1) for _ in range(k)]
sick = [0] * k
peak = [-1] * k
peak_day = [0] * k
prev_pop = [0] * k
prev_imm = [0] * k
total = 0
denom = 100 * r
for day in range(1, d + 1):
    if day >= 2:
        for i in range(k):
            j = i + 1 if i + 1 < k else 0
            ms = sus[i] * mv[i] // 100
            mi = immune[i] * mv[i] // 100
            sus[i] -= ms
            sus[j] += ms
            immune[i] -= mi
            immune[j] += mi
    for i in range(k):
        rec = new[i][day - r] if day > r else 0
        if day == 1:
            y = first[i]
        else:
            pp = prev_pop[i]
            y = sick[i] * c * (pp - prev_imm[i]) // (denom * pp) if pp > 0 else 0
            if y > sus[i]:
                y = sus[i]
        new[i][day] = y
        sus[i] -= y
        immune[i] += rec
        s = sick[i] + y - rec
        sick[i] = s
        total += y
        if s > peak[i]:
            peak[i] = s
            peak_day[i] = day
        prev_pop[i] = sus[i] + immune[i] + s
        prev_imm[i] = immune[i]

out = [f"{i + 1} {peak[i]} {peak_day[i]}" for i in range(k)]
out.append(f"{total} {sum(sick)}")
print("\n".join(out))
