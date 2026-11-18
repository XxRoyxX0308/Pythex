## Description

A school has `N` students. On day 1, `F` students hear a rumor and start passing it on.

Each student **stays eager to pass the rumor on for `R` days, starting on the day they hear it**: a student who hears it on day `n` is "active" on days `n` through `n + R − 1` and **loses interest from day `n + R` on**. A student who has heard the rumor **never hears it a second time** and never becomes active again.

The rumor spreads as follows, where `p` is the spread rate (a percentage):

- **Day 1**: the number of new listeners is `F`, and nobody loses interest.
- **Day `d` (`d ≥ 2`)**, strictly in this order:
  1. **Lost interest** = the number of new listeners on day `d − R`, or 0 if `d − R < 1`.
  2. **New listeners** = ⌊ active count at the end of yesterday × `p` / 100 ⌋ (rounded down). It **cannot exceed the number of students who have not heard the rumor yet**; if it does, it equals that number.
  3. **Today's active count** = active count at the end of yesterday + today's new listeners − today's lost interest.

Print the active count, new listeners and lost interest for every day, and the total number of students who heard the rumor.

## Input

The first line contains two integers `N F`: the number of students and the number who hear the rumor on day 1.

The second line contains three integers `D R p`: the number of days, the active period and the spread rate (percent).

## Output

Print `D + 1` lines.

Lines 1 to `D`: line `d` contains four integers `d active new lost`: the day, the active count at the end of that day, the new listeners that day and the students who lost interest that day, separated by a single space.

Line `D + 1`: one integer, the total number of students who heard the rumor during the `D` days (including the `F` students on day 1).

## Constraints

- `10 ≤ N ≤ 10000`
- `1 ≤ F ≤ N`
- `1 ≤ D ≤ 30`
- `1 ≤ R ≤ 20`
- `0 ≤ p ≤ 300`

## Notes

For example, with `R = 3`, a student who hears the rumor on day 1 is active on days 1, 2 and 3 and loses interest on day 4.
