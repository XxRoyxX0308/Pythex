## Description

An apiary keeps `K` hives in a circle, numbered 1 to `K`. Healthy bees often drift into the neighboring hive: **bees from hive `i` drift to hive `i + 1`, and bees from hive `K` drift back to hive 1**. A bee disease is spreading through the apiary, and the bees in each hive fall into three groups:

- **Susceptible**: bees that can still be infected.
- **Resistant**: bees that are naturally resistant or have recovered. They cannot be infected.
- **Sick**: bees that are currently ill.

**Day 1**: if a hive has `P` bees and resistant share `a` (a percentage), it has ⌊`P` × `a` / 100⌋ resistant bees and every other bee is susceptible. Then `F` susceptible bees in that hive get sick (day 1's new cases are exactly `F`). No bee recovers and **no bee moves**.

**Day `d` (`d ≥ 2`)**: each hive goes through these steps, strictly in this order:

1. **Synchronous movement**: each hive has a drift rate `m` (a percentage). It sends ⌊susceptible × `m` / 100⌋ susceptible bees and ⌊resistant × `m` / 100⌋ resistant bees to the next hive. The two groups are computed separately and keep their status. **Sick bees do not move.** All hives move **at the same time**: compute every hive's movers from the counts before moving, then apply all the moves together.
2. **Recovery**: bees that got sick on day `n` recover on day `n + R` and become resistant. So today's recoveries equal this hive's new cases on day `d − R` (0 if `d − R < 1`).
3. **New cases**: let `S` be the hive's sick count **at the end of yesterday**, `T` its bee count at the end of yesterday, and `I` its resistant count at the end of yesterday (including bees that recovered yesterday). Then
   new cases = ⌊ `S` × `c` × (`T` − `I`) / (100 × `R` × `T`) ⌋.
   New cases **cannot exceed the hive's susceptible count after today's movement**; if they would, they equal that count. If `T = 0`, there are 0 new cases.
4. **Update**: sick count = yesterday's sick count + today's new cases − today's recoveries.

The beekeeper wants to know when each hive was **hit hardest**: the largest sick count and the day it **first** occurred. They also want the total number of new cases in the season and the number of sick bees at the end of the last day.

## Input

The first line contains four integers `K D R c`: the number of hives, the number of days, the number of days a bee stays sick, and the infectiousness (each sick bee infects `c / 100` bees on average over its illness).

Each of the next `K` lines contains four integers `P F a m` for hive `i`: the initial number of bees, the cases on day 1, the resistant share (percent) and the drift rate (percent).

## Output

Print `K + 1` lines.

Line `i` (`1 ≤ i ≤ K`): three integers `i peak day`: the hive number, the largest end-of-day sick count of that hive over days 1 to `D`, and the day it occurred. **If several days tie, print the earliest one.**

Line `K + 1`: two integers. The first is the total number of new cases in all hives over the `D` days (including each `F` on day 1). The second is the total number of sick bees in all hives at the end of day `D`.

Separate the numbers on each line with a single space.

## Constraints

- `2 ≤ K ≤ 10`
- `1 ≤ D ≤ 10⁴`
- `1 ≤ R ≤ 10⁴`
- `10 ≤ c ≤ 200`
- `100 ≤ P ≤ 10⁵`
- `0 ≤ a ≤ 99`
- `1 ≤ F ≤ P − ⌊P × a / 100⌋`
- `0 ≤ m ≤ 100`

## Notes

All divisions are integer divisions rounded down. The largest input has 10 hives, 10⁴ days and `R` up to 10⁴. Scanning every past batch of cases, or summing the last `R` days of new cases, every day is too slow.
