# 參考解：tools/build.py 會用它產生所有測資的標準答案。
n, f = map(int, input().split())
d, r, p = map(int, input().split())

new = [0] * (d + 1)       # new[i]：第 i 天新聽到的人數
active = 0                # 昨天結束時的熱衷人數
heard = 0                 # 到目前為止聽過傳言的人數
out = []
for day in range(1, d + 1):
    lost = new[day - r] if day - r >= 1 else 0
    if day == 1:
        y = f
    else:
        y = min(active * p // 100, n - heard)
    new[day] = y
    heard += y
    active = active + y - lost
    out.append(f"{day} {active} {y} {lost}")
out.append(str(heard))
print("\n".join(out))
