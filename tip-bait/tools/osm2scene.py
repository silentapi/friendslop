#!/usr/bin/env python3
"""OpenStreetMap (.osm XML from api.openstreetmap.org) -> data/downtown.json for the engine.

Origin = Citi Tower (OSM way 615948622). Axes: x = east, z = south, metres.
Usage: python3 osm2scene.py out.json in1.osm [in2.osm ...]
Map data © OpenStreetMap contributors (ODbL).
"""
import json, math, sys
import xml.etree.ElementTree as ET

LAT0, LON0 = 28.5409328, -81.3725695
KX = math.cos(math.radians(LAT0)) * 111320.0
KZ = 110540.0


def xy(lat, lon):
    return [round((lon - LON0) * KX, 2), round((LAT0 - lat) * KZ, 2)]


nodes, ways, rels = {}, {}, []
for f in sys.argv[2:]:
    r = ET.parse(f).getroot()
    for n in r.findall('node'):
        nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')), {t.get('k'): t.get('v') for t in n.findall('tag')})
    for w in r.findall('way'):
        ways[w.get('id')] = ({t.get('k'): t.get('v') for t in w.findall('tag')}, [nd.get('ref') for nd in w.findall('nd')])
    for rel in r.findall('relation'):
        rels.append(({t.get('k'): t.get('v') for t in rel.findall('tag')}, [(m.get('type'), m.get('ref'), m.get('role')) for m in rel.findall('member')]))


def pts(refs):
    return [xy(nodes[r][0], nodes[r][1]) for r in refs if r in nodes]


def height(t):
    for k in ('height', 'building:height'):
        if k in t:
            try:
                return float(t[k].split()[0].replace('m', ''))
            except ValueError:
                pass
    if 'building:levels' in t:
        try:
            return float(t['building:levels']) * 3.3
        except ValueError:
            pass
    return None


ROAD_W = {'motorway': 22, 'trunk': 18, 'primary': 16, 'secondary': 14, 'tertiary': 12, 'residential': 10, 'unclassified': 9, 'service': 6, 'living_street': 8,
          'motorway_link': 8, 'primary_link': 8, 'secondary_link': 8, 'tertiary_link': 7, 'footway': 3, 'pedestrian': 6, 'cycleway': 2.5, 'path': 2}
out = {'origin': [LAT0, LON0], 'buildings': [], 'roads': [], 'water': [], 'parks': [], 'rail': [], 'pois': [], 'trees': [], 'lamps': [], 'signals': []}
used_outer = set()
for t, mem in rels:
    if t.get('type') == 'multipolygon' and ('building' in t or t.get('natural') == 'water' or t.get('leisure') == 'park'):
        for typ, ref, role in mem:
            if typ == 'way' and role == 'outer' and ref in ways:
                p = pts(ways[ref][1])
                if len(p) > 2:
                    if 'building' in t:
                        out['buildings'].append({'id': ref, 'name': t.get('name'), 'h': height(t) or height(ways[ref][0]), 'kind': t.get('building'), 'pts': p})
                    elif t.get('natural') == 'water':
                        out['water'].append({'name': t.get('name'), 'pts': p})
                    else:
                        out['parks'].append({'name': t.get('name'), 'pts': p})
                    used_outer.add(ref)
for wid, (t, refs) in ways.items():
    p = pts(refs)
    if len(p) < 2 or wid in used_outer:
        continue
    if 'building' in t or 'building:part' in t:
        if len(p) > 2:
            out['buildings'].append({'id': wid, 'name': t.get('name'), 'h': height(t), 'min': float(t.get('min_height', 0) or 0), 'kind': t.get('building') or 'part', 'part': 'building:part' in t,
                                     'colour': t.get('building:colour'), 'mat': t.get('building:material'), 'roof': t.get('roof:shape'), 'addr': (t.get('addr:housenumber', '') + ' ' + t.get('addr:street', '')).strip() or None, 'pts': p})
    elif 'highway' in t and t['highway'] in ROAD_W:
        lanes = t.get('lanes')
        w = ROAD_W[t['highway']]
        if lanes and lanes.isdigit() and t['highway'] not in ('footway', 'path', 'cycleway'):
            w = max(6.5, int(lanes) * 3.4 + 1.5)
        out['roads'].append({'name': t.get('name'), 'hw': t['highway'], 'w': w, 'surface': t.get('surface'), 'oneway': t.get('oneway') == 'yes', 'bridge': t.get('bridge') == 'yes', 'layer': t.get('layer'), 'pts': p})
    elif t.get('natural') == 'water' and len(p) > 2:
        out['water'].append({'name': t.get('name'), 'pts': p})
    elif t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass',):
        out['parks'].append({'name': t.get('name'), 'pts': p})
    elif t.get('railway') in ('rail', 'light_rail'):
        out['rail'].append({'name': t.get('name'), 'pts': p})
for nid, (lat, lon, t) in nodes.items():
    if t.get('natural') == 'tree':
        out['trees'].append({'p': xy(lat, lon), 'genus': t.get('genus') or t.get('species') or t.get('leaf_type')})
    if t.get('highway') == 'street_lamp':
        out['lamps'].append(xy(lat, lon))
    if t.get('highway') == 'traffic_signals':
        out['signals'].append(xy(lat, lon))
    if t.get('name') and (t.get('amenity') or t.get('shop') or t.get('tourism') or t.get('leisure') or t.get('railway') == 'station'):
        out['pois'].append({'name': t['name'], 'kind': t.get('amenity') or t.get('shop') or t.get('tourism') or t.get('leisure') or 'station', 'p': xy(lat, lon)})
# dedupe buildings by id
seen, bl = set(), []
for b in out['buildings']:
    if b['id'] in seen:
        continue
    seen.add(b['id'])
    bl.append(b)
out['buildings'] = bl
json.dump(out, open(sys.argv[1], 'w'), separators=(',', ':'))
print({k: len(v) for k, v in out.items() if isinstance(v, list)})
