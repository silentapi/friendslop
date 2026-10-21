# Extract the real-city corridor around the level routes from data/downtown.json → game/assets/city.json
import json, math
m = json.load(open('data/downtown.json')); R = json.load(open('game/assets/routes.json'))
route_pts = [p for r in R.values() for p in r['pts']]
# densify for distance tests
dense = []
for r in R.values():
    ps = r['pts']
    for a, b in zip(ps, ps[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 10))
        for k in range(n): dense.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
def dist(p):
    return min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in dense)
def near(pts, d): return any(dist(p) < d for p in pts[:: max(1, len(pts) // 6)])
B = []
for b in m['buildings']:
    c = b['pts']
    if near(c, 150):
        B.append({'h': round(b['h'] or 0, 1), 'min': b.get('min', 0), 'kind': b.get('kind'), 'id': b.get('id'), 'name': b.get('name'), 'pts': [[round(x, 1), round(z, 1)] for x, z in c]})
roads = [{'w': r['w'], 'hw': r['hw'], 'surface': r.get('surface'), 'name': r.get('name'), 'pts': r['pts']} for r in m['roads'] if not r.get('bridge') and r['hw'] not in ('footway', 'cycleway', 'path', 'steps', 'pedestrian', 'service') and near(r['pts'], 120)]
parks = [p for p in m['parks'] if near(p['pts'], 160)]
trees = [t['p'] for t in m['trees'] if dist(t['p']) < 60]
rail = m['rail']
out = {'buildings': B, 'roads': roads, 'parks': parks, 'trees': trees, 'rail': [r for r in rail if near(r['pts'], 400)]}
json.dump(out, open('game/assets/city.json', 'w'), separators=(',', ':'))
print('buildings', len(B), 'roads', len(roads), 'parks', len(parks), 'trees', len(trees))
