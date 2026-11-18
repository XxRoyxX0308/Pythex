n, k = map(int, input().split())


def read_map():
    pos = {}
    for r in range(n):
        for c, v in enumerate(map(int, input().split())):
            pos[v] = (r, c)
    return pos


maps = [read_map(), read_map()]
m = int(input())
calls = list(map(int, input().split()))

marked = [[[False] * n for _ in range(n)] for _ in range(2)]
lines = [0, 0]


def new_lines(mark, r, c):
    """圈起 (r, c) 之後，經過這一格而新完成的連線數。"""
    cnt = 0
    if all(mark[r]):
        cnt += 1
    if all(mark[i][c] for i in range(n)):
        cnt += 1
    if r == c and all(mark[i][i] for i in range(n)):
        cnt += 1
    if r + c == n - 1 and all(mark[i][n - 1 - i] for i in range(n)):
        cnt += 1
    return cnt


result = "None"
for step, v in enumerate(calls, 1):
    done = []
    for t in range(2):
        r, c = maps[t][v]
        marked[t][r][c] = True
        lines[t] += new_lines(marked[t], r, c)
        done.append(lines[t] >= k)
    if done[0] and done[1]:
        result = f"Draw {step}"
        break
    if done[0]:
        result = f"A {step}"
        break
    if done[1]:
        result = f"B {step}"
        break

print(result)
