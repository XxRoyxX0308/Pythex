## Description

At the school fair, teams A and B each receive an `N × N` challenge map. Each cell holds a checkpoint number from 1 to `N × N`. Every number appears exactly once, and the two maps are arranged differently.

The host announces `M` checkpoint numbers one by one. Each time a number is announced, the cell with that number is circled on both maps.

When **an entire row**, **an entire column**, or **one of the two diagonals** is fully circled, it counts as one completed line. The first team to **reach `K` completed lines** wins, and the game ends immediately.

Note: circling one cell can complete several lines at once, and every one of them counts.

## Input

The first line contains two integers `N K`.

The next `N` lines each contain `N` integers: team A's map.

The following `N` lines each contain `N` integers: team B's map.

The next line contains an integer `M`.

The last line contains `M` distinct integers: the announced checkpoint numbers, in order.

## Output

Print one line:

- Team A reaches `K` lines first: print `A s`, where `s` is the announcement after which it happens
- Team B reaches `K` lines first: print `B s`
- Both teams reach `K` lines after the same announcement: print `Draw s`
- Neither team reaches `K` lines after all announcements: print `None`

## Constraints

- `3 ≤ N ≤ 8`
- `1 ≤ K ≤ 2N + 2`
- `1 ≤ M ≤ N × N`
- All numbers on the maps and in the announcements are between 1 and `N × N`, with no duplicates in any list
