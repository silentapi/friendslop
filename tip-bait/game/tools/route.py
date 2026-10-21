# Level routes along real OSM street centerlines (data/downtown.json), chained by street with filleted corners.
# Writes game/assets/routes.json: { name: { pts: [[x,z]...], streets: [{name, s0, s1, w, surface}], length } }
import json, math
m = json.load(open('data/downtown.json'))
def street(name, axis, a, b):
    """points of the named street with axis coordinate between a and b, ordered from a to b"""
    ax = 0 if axis == 'x' else 1
    pts, ws, surf = [], [], None
    for r in m['roads']:
        if r.get('name') != name: continue
        for p in r['pts']:
            if min(a, b) - 1 <= p[ax] <= max(a, b) + 1: pts.append(p); ws.append(r['w']); surf = surf or r.get('surface')
    pts = sorted(set(map(tuple, pts)), key=lambda p: p[ax], reverse=a > b)
    # one clean centerline: streets with parallel carriageways or side branches zig-zag when sorted, so bin
    # along the street's axis every 8 m and average the cross coordinate (dropping outliers > 6 m off the median)
    bins = {}
    for p in pts: bins.setdefault(round(p[ax] / 8), []).append(p)
    out = []
    keys = sorted(bins, reverse=a > b)
    for k in keys:
        q = bins[k]; oc = sorted(x[1 - ax] for x in q); med = oc[len(oc) // 2]
        q = [x for x in q if abs(x[1 - ax] - med) < 6] or q
        c = [0, 0]; c[ax] = sum(x[ax] for x in q) / len(q); c[1 - ax] = sum(x[1 - ax] for x in q) / len(q)
        out.append(tuple(c))
    # moving median (5 bins) then mean (3) on the cross coordinate: no kinks from stray branches
    cr = [p[1 - ax] for p in out]
    med = [sorted(cr[max(0, i - 2): i + 3])[len(cr[max(0, i - 2): i + 3]) // 2] for i in range(len(cr))]
    sm = [sum(med[max(0, i - 1): i + 2]) / len(med[max(0, i - 1): i + 2]) for i in range(len(med))]
    out = [tuple([p[0], sm[i]] if ax == 0 else [sm[i], p[1]]) for i, p in enumerate(out)]
    return out, max(ws), surf
def build(legs):
    pts, streets, s = [], [], 0.0
    for leg in legs:
        name = leg[0]
        if isinstance(leg[1], str): p, w, surf = street(*leg)
        else: p, w, surf = [tuple(x) for x in leg[1]], leg[2], leg[3]  # explicit points (short end stub)
        if pts:  # fillet the corner: trim 7 m off both sides and bridge with a quarter-curve
            last = pts[-1]
            while len(pts) > 1 and math.hypot(pts[-1][0] - last[0], pts[-1][1] - last[1]) < 7: pts.pop()
            q = [x for x in p if math.hypot(x[0] - last[0], x[1] - last[1]) > 7]
            c0, c1 = pts[-1], q[0]
            for k in range(1, 6):
                t = k / 6; u = 1 - t
                pts.append((u * u * c0[0] + 2 * u * t * last[0] + t * t * c1[0], u * u * c0[1] + 2 * u * t * last[1] + t * t * c1[1]))
            p = q
        s0 = s if not pts else s
        for x in p:
            if pts: s += math.hypot(x[0] - pts[-1][0], x[1] - pts[-1][1])
            pts.append(x)
        streets.append({'name': name, 's1': round(s, 1), 'w': w, 'surface': surf})
    for i, st in enumerate(streets): st['s0'] = streets[i - 1]['s1'] if i else 0
    return {'pts': [[round(x, 2), round(z, 2)] for x, z in pts], 'streets': streets, 'length': round(s, 1)}
ROUTES = {
    # Order 1: pick up at Starbucks 325 S Orange Ave, north on Orange, right on Church St, left on Lake Ave to Citi Tower
    'orange': build([('South Orange Avenue', 'z', 226, 64), ('East Church Street', 'x', -631, -34), ('Lake Avenue', [(-31.0, 46), (-30.6, 40), (-29.6, 30), (-28.6, 22)], 10, 'bricks')]),
    # Order 2: from west of the SunRail tracks, east on Church St across the crossing at Church Street Station
    'sunrail': build([('West Church Street', 'x', -900, -632), ('East Church Street', 'x', -631, -34), ('Lake Avenue', [(-31.0, 46), (-30.6, 40), (-29.6, 30), (-28.6, 22)], 10, 'bricks')]),
}
json.dump(ROUTES, open('game/assets/routes.json', 'w'))
for k, r in ROUTES.items(): print(k, r['length'], len(r['pts']), [(s['name'], s['s0'], s['s1'], s['w'], s['surface']) for s in r['streets']], r['pts'][:2], r['pts'][-2:])
