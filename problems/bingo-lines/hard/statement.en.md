## Description

The community center is hosting a bingo night with `P` residents, numbered 1 to `P`. Each resident gets an `N × N` bingo card containing the numbers 1 to `N × N`, each exactly once.

The host draws `M` numbers one by one. After each draw, everyone circles that number on their card. A resident completes a line as soon as **an entire row**, **an entire column**, or **one of the two diagonals** on their card is fully circled.

Unlike regular bingo, tonight's game **does not end when someone completes a line**. The host draws all `M` numbers and records, for each resident, the draw at which they **first** completed a line.

Find the residents who completed a line earliest (there may be more than one), and report when each resident first completed a line.

## Input

The first line contains two integers `P N`.

Then come `P` cards, in order of resident number 1 to `P`. Each card takes `N` lines of `N` integers.

The next line contains an integer `M`.

The last line contains `M` distinct integers: the drawn numbers, in order.

## Output

Print two lines.

Line 1: if no resident ever completes a line, print `No Bingo`. Otherwise print the earliest draw index `s` at which someone completed a line, followed by the numbers of all residents who completed a line at draw `s` in increasing order, all separated by spaces.

Line 2: `P` integers. The `i`-th is the draw at which resident `i` first completed a line, or `-1` if they never did.

## Constraints

- `2 ≤ P ≤ 80`
- `3 ≤ N ≤ 30`
- `1 ≤ M ≤ N × N`
- All numbers on the cards and in the draws are between 1 and `N × N`, with no duplicates in any list

## Notes

The largest input has 80 cards of size `30 × 30`. Re-checking every row and column of every card after each draw is too slow.
