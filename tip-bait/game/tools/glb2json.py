# GLB → self-contained glTF JSON (buffer embedded as a base64 data URI) so static hosts that only serve .json work.
import sys, json, struct, base64
for src in sys.argv[1:]:
    d = open(src, 'rb').read()
    assert d[:4] == b'glTF'
    off, j, binc = 12, None, b''
    while off < len(d):
        ln, ty = struct.unpack('<II', d[off:off + 8]); chunk = d[off + 8: off + 8 + ln]
        if ty == 0x4E4F534A: j = json.loads(chunk)
        elif ty == 0x004E4942: binc = chunk
        off += 8 + ln
    j['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binc).decode()
    out = src[:-4] + '.json'
    open(out, 'w').write(json.dumps(j, separators=(',', ':')))
    print(out, len(d) // 1024, '->', len(open(out).read()) // 1024, 'KB')
