"""The R read: is the film spreading (R > 1) or fading (R < 1), and roughly where will it land?

Export views over time from YouTube Studio (Advanced mode > Views > export CSV, hourly or daily)
or type them in: one number per period, oldest first.

  python3 r_read.py 1200 2600 3900 5200          # views per day for days 1..4
  python3 r_read.py --csv export.csv --col Views  # a Studio export

Model (film/viral-study): each period's views are R times the period before. Below 1 the
remaining views form a geometric series, so total ~ seen + last * R / (1 - R).
Skip the first period: notifications and the seed audience inflate it.
"""
import argparse
import csv
import math


def read(args):
    if args.csv:
        with open(args.csv, newline='', encoding='utf-8-sig') as f:
            rows = list(csv.DictReader(f))
        col = args.col or next(k for k in rows[0] if 'view' in k.lower())
        return [float(r[col] or 0) for r in rows if r.get(col) not in (None, '')]
    return [float(v) for v in args.views]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('views', nargs='*')
    ap.add_argument('--csv')
    ap.add_argument('--col')
    a = ap.parse_args()
    v = read(a)
    if len(v) < 3:
        raise SystemExit('need at least three periods')
    ratios = [v[i + 1] / v[i] for i in range(1, len(v) - 1) if v[i] > 0]
    last3 = ratios[-3:]
    R = math.exp(sum(math.log(max(r, 1e-6)) for r in last3) / len(last3))
    seen = sum(v)
    print('period  views   ratio to previous')
    for i, x in enumerate(v):
        r = '' if i < 2 or v[i - 1] == 0 else f'{x / v[i - 1]:.2f}'
        print(f'{i + 1:>6} {x:>8,.0f}   {r}')
    print(f'\nR (geometric mean of the last {len(last3)} ratios) = {R:.2f}')
    if R >= 1.0:
        print('Spreading. Leave the title and thumbnail alone; post the next Short to feed it.')
    else:
        rest = v[-1] * R / (1 - R)
        print(f'Fading. Expected total ~ {seen + rest:,.0f} views ({seen:,.0f} so far).')
        print('Levers that still move R: a new thumbnail in Test & Compare, a Short that links to it, a pinned comment that asks for a story.')


if __name__ == '__main__':
    main()
