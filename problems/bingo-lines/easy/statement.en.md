## Description

The front of an apartment building has `N × N` windows. Each window belongs to one household, numbered 1 to `N × N`. Every number appears exactly once, but the numbers are **not necessarily in order**.

At night, households turn on their lights one at a time. A photographer across the street takes the shot as soon as **an entire row**, **an entire column**, or **either diagonal** of windows is lit.

Given the window layout and the order in which lights turn on, **after which household** does the photographer take the shot?

## Input

The first line contains an integer `N`.

The next `N` lines each contain `N` integers: the household numbers of the windows, from top to bottom and left to right.

The next line contains an integer `M`, the number of households that turn on their lights.

The last line contains `M` distinct integers: the household numbers in the order their lights turn on.

## Output

Print one integer `k`: right after the `k`-th household turns on its light, a full row, column or diagonal is lit for the first time.

If this never happens after all `M` households, print `-1`.

## Constraints

- `3 ≤ N ≤ 6`
- `1 ≤ M ≤ N × N`
- All numbers in the layout and in the light order are between 1 and `N × N`, with no duplicates in either list
