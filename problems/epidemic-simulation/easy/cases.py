from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20261119)


def fmt(n, f, d, r, p):
    return f"{n} {f}\n{d} {r} {p}\n"


SAMPLES = [
    {
        "input": fmt(100, 4, 6, 3, 50),
        "explain": L(
            "第 2 天：昨天 4 人熱衷，⌊4 × 50 / 100⌋ = 2 人新聽到，熱衷變 6 人。第 4 天：第 1 天那 4 人失去興趣，"
            "新聽到 ⌊9 × 50 / 100⌋ = 4 人，熱衷 9 + 4 − 4 = 9 人。六天共 4 + 2 + 3 + 4 + 4 + 5 = 22 人聽過。",
            "Day 2: 4 students were active yesterday, so ⌊4 × 50 / 100⌋ = 2 hear it and 6 are active. Day 4: the 4 students from "
            "day 1 lose interest, ⌊9 × 50 / 100⌋ = 4 hear it, so 9 + 4 − 4 = 9 are active. In total 4 + 2 + 3 + 4 + 4 + 5 = 22 students heard it."),
    },
    {
        "input": fmt(30, 10, 5, 2, 150),
        "explain": L(
            "第 2 天算出 15 人，但還沒聽過的只剩 20 人，所以是 15。第 3 天算出 ⌊25 × 150 / 100⌋ = 37，"
            "但只剩 5 人沒聽過，新聽到只能是 5。之後全校都聽過了，新聽到都是 0。",
            "On day 2 the formula gives 15, and 20 students have not heard yet, so 15 hear it. On day 3 the formula gives "
            "⌊25 × 150 / 100⌋ = 37, but only 5 students are left, so only 5 hear it. After that everyone has heard it and the count stays 0."),
    },
]

HIDDEN = [
    {
        "label": L("只有一天", "Only one day"),
        "kind": "edge",
        "input": fmt(500, 37, 1, 5, 120),
        "hint": L("第 1 天只有一開始知道的那群人，不用計算傳播。",
                  "Day 1 only has the students who knew from the start. Nothing spreads on day 1."),
    },
    {
        "label": L("傳播比例是 0", "The spread rate is 0"),
        "kind": "edge",
        "input": fmt(1000, 25, 12, 4, 0),
        "hint": L("沒有人會再聽到傳言，但第 1 天那群人還是會在第 R + 1 天失去興趣。",
                  "Nobody new hears it, but the students from day 1 still lose interest on day R + 1."),
    },
    {
        "label": L("熱衷只維持一天 (R = 1)", "Students stay active for only one day (R = 1)"),
        "kind": "edge",
        "input": fmt(5000, 200, 10, 1, 180),
        "hint": L("R = 1 時，昨天新聽到的人今天就失去興趣，但今天的新增仍然要用「昨天」的熱衷人數計算。",
                  "With R = 1, yesterday's new listeners lose interest today, but today's new count still uses yesterday's active count."),
    },
    {
        "label": L("全校很快都聽過了", "The whole school hears it quickly"),
        "kind": "edge",
        "input": fmt(60, 20, 8, 3, 250),
        "hint": L("新聽到的人數不能超過還沒聽過的人數，聽過的人不會再聽一次。",
                  "The new count cannot exceed the number of students who have not heard it yet. Nobody hears it twice."),
    },
    {
        "label": L("第 1 天全校都已經知道", "The whole school knows on day 1"),
        "kind": "edge",
        "input": fmt(40, 40, 7, 3, 200),
        "hint": L("沒有人可以再聽到了，之後每天新增都是 0。",
                  "Nobody is left to hear it, so every later day has 0 new listeners."),
    },
    {
        "label": L("熱衷天數比觀察天數還長", "The active period is longer than the observation"),
        "kind": "boundary",
        "input": fmt(10000, 3, 15, 20, 60),
        "hint": L("第 d − R 天不存在時，當天沒有人失去興趣。",
                  "If day d − R does not exist, nobody loses interest that day."),
    },
    {
        "label": L("剛好在最後一天第一次有人失去興趣", "The first students lose interest on the last day"),
        "kind": "boundary",
        "input": fmt(8000, 50, 9, 8, 70),
        "hint": L("第 n 天聽到的人在第 n + R 天才失去興趣，不是第 n + R − 1 天。",
                  "Students who heard it on day n lose interest on day n + R, not on day n + R − 1."),
    },
    {
        "label": L("最大天數的一般資料", "Typical data with the maximum number of days"),
        "kind": "normal",
        "input": fmt(10000, 12, 30, 6, 45),
    },
    {
        "label": L("隨機資料", "Random data"),
        "kind": "normal",
        "input": fmt(rng.randint(2000, 9000), rng.randint(5, 40), 30, rng.randint(3, 12), rng.randint(20, 120)),
    },
]
