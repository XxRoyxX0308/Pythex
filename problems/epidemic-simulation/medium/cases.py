from random import Random


def L(zh, en):
    """多語言文字：zh-Hant 與 en 都必須提供。"""
    return {"zh-Hant": zh, "en": en}


rng = Random(20261120)


def fmt(pop, d, first, c, r, imm, mv):
    line = lambda xs: " ".join(map(str, xs))
    return f"{line(pop)}\n{d}\n{line(first)}\n{c}\n{r}\n{line(imm)}\n{line(mv)}\n"


def rand_case(d):
    pop = [rng.randint(100, 10000) for _ in range(3)]
    imm = [rng.randint(0, 80) for _ in range(3)]
    first = [rng.randint(1, max(1, (p - p * a // 100) // 5)) for p, a in zip(pop, imm)]
    return fmt(pop, d, first, rng.randint(60, 200), rng.randint(2, 9), imm, [rng.randint(0, 40) for _ in range(3)])


SAMPLES = [
    {
        "input": fmt([1200, 900, 700], 8, [80, 45, 25], 140, 4, [15, 35, 5], [25, 40, 15]),
        "explain": L(
            "第 1 天島 A 免疫者 ⌊1200 × 15 / 100⌋ = 180 人。第 2 天先移動，再算島 A 新增："
            "⌊80 × 140 × (1200 − 180) / (100 × 4 × 1200)⌋ = 23。第 5 天第 1 天那批 80 人康復，島 A 變成 174 + 52 − 80 = 146 人。"
            "八天內最多同時有 174 + 86 + 53 = 313 人生病，發生在第 4 天。",
            "On day 1 island A has ⌊1200 × 15 / 100⌋ = 180 immune people. On day 2 people move first, then island A gets "
            "⌊80 × 140 × (1200 − 180) / (100 × 4 × 1200)⌋ = 23 new cases. On day 5 the 80 patients from day 1 recover, so A has "
            "174 + 52 − 80 = 146. The most patients at once is 174 + 86 + 53 = 313, on day 4."),
    },
    {
        "input": fmt([300, 450, 600], 7, [200, 250, 300], 200, 3, [0, 0, 0], [0, 0, 0]),
        "explain": L(
            "第 2 天島 A 算出 ⌊200 × 200 × 300 / (100 × 3 × 300)⌋ = 133，但島 A 只剩 100 個易感者，所以新增 100。"
            "第 3 天島 A 已經沒有易感者，新增 0。",
            "On day 2 the formula gives ⌊200 × 200 × 300 / (100 × 3 × 300)⌋ = 133 for island A, but only 100 people there "
            "are susceptible, so there are 100 new cases. On day 3 nobody on island A is susceptible, so there are 0."),
    },
]

HIDDEN = [
    {
        "label": L("只有一天", "Only one day"),
        "kind": "edge",
        "input": fmt([5000, 4000, 3000], 1, [10, 20, 30], 150, 5, [20, 40, 60], [30, 30, 30]),
        "hint": L("第 1 天不移動也不傳染，最大確診日就是第 1 天。",
                  "Nobody moves or gets infected by others on day 1, so the peak day is day 1."),
    },
    {
        "label": L("一座島的健康居民全部搬走，島上最後沒有人", "Every healthy resident leaves one island until it is empty"),
        "kind": "edge",
        "input": fmt([400, 800, 600], 12, [5, 10, 10], 120, 2, [0, 10, 10], [100, 0, 0]),
        "hint": L("某座島前一天結束時人口是 0，當天新增就是 0，不能拿 0 去當分母。",
                  "If an island had no people at the end of yesterday, it has 0 new cases today. Do not divide by 0."),
    },
    {
        "label": L("三座島移動比例差很多", "The three islands have very different move rates"),
        "kind": "normal",
        "input": fmt([6000, 1500, 3000], 15, [200, 30, 120], 180, 6, [10, 50, 25], [70, 5, 90]),
        "hint": L("三座島要同時移動：先用移動前的人數算出每座島走多少人，再一起更新。",
                  "All three islands move at the same time: compute every island's movers from the counts before moving, then update them together."),
    },
    {
        "label": L("移動後易感者變少，新增被上限擋住", "Movement shrinks the susceptible group and the cap kicks in"),
        "kind": "edge",
        "input": fmt([400, 9000, 9000], 6, [150, 1, 1], 200, 2, [0, 90, 90], [60, 0, 0]),
        "hint": L("上限是「當天移動完之後」、加入新病例之前的易感者人數。",
                  "The cap is the number of susceptible people after today's movement and before adding today's cases."),
    },
    {
        "label": L("生病只持續一天 (R = 1)", "Illness lasts only one day (R = 1)"),
        "kind": "edge",
        "input": fmt([3000, 2500, 2000], 10, [300, 200, 100], 200, 1, [5, 10, 15], [10, 20, 30]),
        "hint": L("第 n 天生病的人在第 n + R 天康復；R = 1 時就是隔天。新增仍然用昨天的確診中人數計算。",
                  "People who got sick on day n recover on day n + R, which is the next day when R = 1. New cases still use yesterday's patient count."),
    },
    {
        "label": L("確診總數一直不變，最大值同時出現在每一天", "The patient total never changes, so every day ties for the peak"),
        "kind": "edge",
        "input": fmt([10000, 9000, 8000], 9, [1, 2, 3], 10, 20, [50, 50, 50], [10, 10, 10]),
        "hint": L("最大值平手時要輸出最早的那一天。",
                  "When several days tie for the most patients, print the earliest one."),
    },
    {
        "label": L("幾乎全部居民一開始就免疫", "Almost everyone is immune from the start"),
        "kind": "boundary",
        "input": fmt([100, 100, 100], 10, [1, 1, 1], 200, 3, [99, 99, 99], [50, 50, 50]),
    },
    {
        "label": L("康復的人搬到下一座島", "Recovered people move to the next island"),
        "kind": "normal",
        "input": fmt([2000, 2000, 2000], 14, [400, 10, 10], 160, 3, [0, 0, 0], [0, 50, 50]),
        "hint": L("康復的人變成免疫者，隔天也會照比例移動，而且會改變那座島的免疫比例。",
                  "Recovered people become immune. From the next day they move like other immune people and change that island's immune share."),
    },
    {
        "label": L("最大天數的隨機資料 1", "Random data with the maximum number of days 1"),
        "kind": "normal",
        "input": rand_case(20),
    },
    {
        "label": L("最大天數的隨機資料 2", "Random data with the maximum number of days 2"),
        "kind": "normal",
        "input": rand_case(20),
    },
]
