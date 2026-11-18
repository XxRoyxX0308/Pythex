## Description

Three islands A, B and C are linked by a circular ferry route: **A → B → C → A**. A flu is spreading on the islands, and the residents of each island fall into three groups:

- **Susceptible**: people who can still be infected.
- **Immune**: people who are naturally immune or have recovered. They cannot be infected.
- **Sick**: people who are currently ill.

**Day 1**: if an island has population `P` and immune share `a` (a percentage), it has ⌊`P` × `a` / 100⌋ immune people and everyone else is susceptible. Then `F` susceptible people on that island get sick (day 1's new cases are exactly `F`). Nobody recovers and **nobody moves**.

**Day `d` (`d ≥ 2`)**: each island goes through these steps, strictly in this order:

1. **Synchronous movement**: each island has a move rate `m` (a percentage). It sends ⌊susceptible × `m` / 100⌋ susceptible people and ⌊immune × `m` / 100⌋ immune people to the next island. The two groups are computed separately and keep their status. **Sick people do not move.** All three islands move **at the same time**: compute every island's movers from the counts before moving, then apply all the moves together.
2. **Recovery**: people who got sick on day `n` recover on day `n + R` and become immune. So today's recoveries equal this island's new cases on day `d − R` (0 if `d − R < 1`).
3. **New cases**: let `S` be the island's sick count **at the end of yesterday**, `T` its population at the end of yesterday, and `I` its immune count at the end of yesterday (including people who recovered yesterday). Then
   new cases = ⌊ `S` × `c` × (`T` − `I`) / (100 × `R` × `T`) ⌋.
   New cases **cannot exceed the island's susceptible count after today's movement**; if they would, they equal that count. If `T = 0`, there are 0 new cases.
4. **Update**: sick count = yesterday's sick count + today's new cases − today's recoveries. New cases move from susceptible to sick, and recovered people move from sick to immune.

Here `c / 100` is the average number of people one patient infects over the whole illness.

Print each island's sick count, new cases and recoveries for every day. Then print the total number of new cases on all three islands, and the day on which **the three islands together had the most sick people**.

## Input

Seven lines:

1. Three integers `PA PB PC`: the initial populations.
2. One integer `D`: the number of days.
3. Three integers `FA FB FC`: the cases on day 1.
4. One integer `c`: the infectiousness (each patient infects `c / 100` people on average).
5. One integer `R`: the number of days a person stays sick.
6. Three integers `aA aB aC`: the immune shares on day 1 (percent).
7. Three integers `mA mB mC`: the move rates (percent).

## Output

Print `3 × D + 1` lines.

The first `3 × D` lines: for each day, one line for island A, then B, then C. Each line has five fields `d X sick new recovered`: the day, the island letter (`A`, `B` or `C`), the sick count at the end of that day, the new cases that day and the recoveries that day, separated by a single space.

Last line: two integers separated by a single space. The first is the total number of new cases on all three islands over the `D` days (including `FA + FB + FC` on day 1). The second is the day on which the total sick count of the three islands is largest. **If several days tie, print the earliest one.**

## Constraints

- `100 ≤ PA, PB, PC ≤ 10000`
- `1 ≤ D ≤ 20`
- `10 ≤ c ≤ 200`
- `1 ≤ R ≤ 20`
- `0 ≤ aA, aB, aC ≤ 99`
- `1 ≤ F ≤ P − ⌊P × a / 100⌋` (for each island)
- `0 ≤ mA, mB, mC ≤ 100`

## Notes

All divisions are integer divisions rounded down. For example, if island A had 80 sick people, population 1200 and 180 immune people at the end of yesterday, with `c = 140` and `R = 4`, its new cases are ⌊80 × 140 × 1020 / (100 × 4 × 1200)⌋ = 23.
