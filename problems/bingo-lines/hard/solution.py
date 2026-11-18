import sys


def main():
    data = sys.stdin.read().split()
    p, n = int(data[0]), int(data[1])
    nn = n * n
    idx = 2

    # cell[i][v] = 號碼 v 在第 i 張卡的格子編號 r * n + c
    cell = []
    for _ in range(p):
        where = [0] * (nn + 1)
        for k in range(nn):
            where[int(data[idx + k])] = k
        idx += nn
        cell.append(where)

    m = int(data[idx])
    calls = [int(x) for x in data[idx + 1: idx + 1 + m]]

    rows = [[0] * n for _ in range(p)]
    cols = [[0] * n for _ in range(p)]
    diag = [0] * p
    anti = [0] * p
    first = [-1] * p
    active = list(range(p))

    for step, v in enumerate(calls, 1):
        still = []
        for i in active:
            r, c = divmod(cell[i][v], n)
            rows[i][r] += 1
            cols[i][c] += 1
            hit = rows[i][r] == n or cols[i][c] == n
            if r == c:
                diag[i] += 1
                hit = hit or diag[i] == n
            if r + c == n - 1:
                anti[i] += 1
                hit = hit or anti[i] == n
            if hit:
                first[i] = step
            else:
                still.append(i)
        active = still

    done = [s for s in first if s != -1]
    if done:
        s = min(done)
        print(s, *[i + 1 for i in range(p) if first[i] == s])
    else:
        print("No Bingo")
    print(*first)


main()
