from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20261121)


def fmt(d, r, c, hives):
    """hives：每個蜂箱 (P, F, a, m)。"""
    body = "".join(f"{p} {f} {a} {m}\n" for p, f, a, m in hives)
    return f"{len(hives)} {d} {r} {c}\n{body}"


def rand_hive(pmin, pmax, amax, mmax, fdiv):
    p = rng.randint(pmin, pmax)
    a = rng.randint(0, amax)
    s = p - p * a // 100
    return (p, rng.randint(1, max(1, s // fdiv)), a, rng.randint(0, mmax))


SAMPLES = [
    {
        "input": fmt(8, 4, 140, [(1200, 80, 15, 25), (900, 45, 35, 40), (700, 25, 5, 15)]),
        "explain": L(
            "蜂箱 1 的確診蜂在第 4 天與第 8 天都是 174 隻，平手輸出較早的第 4 天。"
            "8 天內三箱共新增 609 隻確診蜂，第 8 天結束時還有 174 + 74 + 48 = 296 隻生病。",
            "Hive 1 has 174 sick bees on both day 4 and day 8. It is a tie, so the earlier day 4 is printed. "
            "The three hives have 609 new cases in total, and 174 + 74 + 48 = 296 bees are still sick at the end of day 8."),
    },
    {
        "input": fmt(6, 2, 200, [(500, 50, 0, 50), (300, 1, 0, 0)]),
        "explain": L(
            "K = 2 時，蜂箱 1 的健康蜂飛到蜂箱 2，蜂箱 2 的飛回蜂箱 1；蜂箱 2 的移動比例是 0，所以只有蜂箱 1 的蜂在飛。",
            "With K = 2, healthy bees from hive 1 drift to hive 2 and hive 2's drift back to hive 1. Hive 2's rate is 0, so only bees from hive 1 move."),
    },
]

HIDDEN = [
    {
        "label": L("只有一天", "Only one day"),
        "kind": "edge",
        "input": fmt(1, 3, 150, [(1000, 10, 20, 30), (2000, 20, 10, 40), (3000, 5, 0, 50)]),
        "hint": L("第 1 天就是每個蜂箱的最高峰，總新增就是所有 F 的和。",
                  "Day 1 is every hive's peak, and the total is the sum of all F."),
    },
    {
        "label": L("確診數一直不變，每一天都是最高峰", "The sick count never changes, so every day ties for the peak"),
        "kind": "edge",
        "input": fmt(500, 1000, 10, [(100000, 1, 50, 20), (90000, 2, 50, 20), (80000, 3, 50, 20), (70000, 4, 50, 20)]),
        "hint": L("最高峰平手時要輸出最早的那一天，不是最後一天。",
                  "When several days tie for the peak, print the earliest one, not the latest."),
    },
    {
        "label": L("一個蜂箱的健康蜂全部飛走，蜂箱變空", "All healthy bees leave one hive until it is empty"),
        "kind": "edge",
        "input": fmt(30, 2, 120, [(400, 5, 0, 100), (800, 10, 10, 0), (600, 10, 10, 0)]),
        "hint": L("蜂箱前一天結束時一隻蜂都沒有，當天新增就是 0，不能拿 0 去當分母。",
                  "If a hive had no bees at the end of yesterday, it has 0 new cases today. Do not divide by 0."),
    },
    {
        "label": L("生病只持續一天 (R = 1)", "Illness lasts only one day (R = 1)"),
        "kind": "edge",
        "input": fmt(40, 1, 200, [(3000, 300, 5, 10), (2500, 200, 10, 20), (2000, 100, 15, 30)]),
        "hint": L("第 n 天生病的蜂在第 n + R 天康復；R = 1 時就是隔天，但新增仍然用昨天的確診數計算。",
                  "Bees that got sick on day n recover on day n + R, the next day when R = 1. New cases still use yesterday's sick count."),
    },
    {
        "label": L("觀察期間沒有任何蜂康復", "No bee recovers during the observation"),
        "kind": "boundary",
        "input": fmt(60, 60, 180, [(5000, 40, 10, 10), (4000, 30, 20, 20), (3000, 20, 30, 5), (2000, 10, 0, 15), (1000, 5, 40, 25)]),
        "hint": L("第 d − R 天不存在時，當天沒有蜂康復。",
                  "If day d − R does not exist, no bee recovers that day."),
    },
    {
        "label": L("10 個蜂箱、移動比例差很多", "10 hives with very different drift rates"),
        "kind": "normal",
        "input": fmt(200, 7, 190, [(rng.randint(1000, 100000), rng.randint(1, 300), rng.randint(0, 60), m)
                                   for m in [90, 0, 75, 5, 100, 30, 60, 10, 85, 45]]),
        "hint": L("所有蜂箱同時移動：先用移動前的數量算好每個蜂箱飛走多少，再一起更新。最後一個蜂箱飛回第 1 個。",
                  "All hives move at the same time: compute every hive's movers from the counts before moving, then apply them together. The last hive drifts back to hive 1."),
    },
    {
        "label": L("隨機中型資料", "Random medium-sized data"),
        "kind": "normal",
        "input": fmt(800, 30, 160, [rand_hive(500, 20000, 50, 40, 10) for _ in range(6)]),
    },
    {
        "label": L("10 個蜂箱、10000 天、生病 5000 天", "10 hives, 10000 days, illness lasts 5000 days"),
        "kind": "stress",
        "input": fmt(10000, 5000, 200, [rand_hive(50000, 100000, 30, 30, 4) for _ in range(10)]),
        "hint": L("每天都掃過所有過去的批次、或把最近 R 天加總，會變成 D × R 次運算。第 d 天康復的就是第 d − R 天那一批。",
                  "Scanning every past batch or summing the last R days every day costs D × R operations. The batch recovering on day d is the one from day d − R."),
    },
    {
        "label": L("10 個蜂箱、10000 天、生病 30 天", "10 hives, 10000 days, illness lasts 30 days"),
        "kind": "stress",
        "input": fmt(10000, 30, 200, [rand_hive(50000, 100000, 40, 60, 3) for _ in range(10)]),
    },
    {
        "label": L("10 個蜂箱、10000 天、整段期間都沒有康復", "10 hives, 10000 days, nobody recovers during the whole period"),
        "kind": "stress",
        "input": fmt(10000, 10000, 120, [rand_hive(80000, 100000, 20, 50, 5) for _ in range(10)]),
    },
]
