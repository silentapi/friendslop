# Procedural score + SFX for the TIP BAIT trailer, keyed to trailer/cues.json.
# 150 BPM phonk: cowbell riff, 808 glide bass, trap hats. python3 tip-bait/tools/audio.py out.wav
import json, sys, os
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, '..', 'trailer', 'cues.json')))
START, t = {}, 0.0
for s in CUES['shots']:
    START[s['name']] = t; t += s['dur']
TOTAL = t
Q = {s['name']: s.get('cues', {}) for s in CUES['shots']}
def at(shot, cue=None): return START[shot] + (Q[shot][cue] if cue else 0)

N = int(TOTAL * SR)
music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.003, r=None, curve=6.0):
    x = tt(d); e = np.minimum(1, x / max(a, 1e-4))
    return e * np.exp(-curve * x / (r or d))
def add(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:N - i]
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    buf[i:i + len(sig), 0] += sig * gain * l * 1.414
    buf[i:i + len(sig), 1] += sig * gain * r * 1.414
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); H = np.ones_like(f)
    if lo: H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: H *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(X * H, len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def saw(f, d):
    ph = np.cumsum(np.broadcast_to(f, (int(d * SR),)) / SR) if np.ndim(f) else tt(d) * f
    return 2 * (ph % 1) - 1
def sq(f, d): return np.sign(np.sin(2 * np.pi * f * tt(d)))
def sine(f, d):
    if np.ndim(f): return np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.sin(2 * np.pi * f * tt(d))

# ------------------------------------------------------------------ instruments
def kick():
    d = 0.42; x = tt(d); f = 45 + 110 * np.exp(-x * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
    s += fft_filter(noise(d), lo=2000) * np.exp(-x * 120) * 0.3
    return np.tanh(s * 1.8)
def clap():
    d = 0.25; x = tt(d); n = fft_filter(noise(d), lo=900, hi=6000)
    e = np.exp(-x * 25) + sum(np.exp(-np.maximum(0, x - o) * 160) * (x >= o) for o in (0.0, 0.011, 0.022)) * 0.6
    return n * e * 0.6
def hat(open_=False):
    d = 0.22 if open_ else 0.045; x = tt(d)
    return fft_filter(noise(d), lo=7000) * np.exp(-x * (14 if open_ else 90)) * 0.35
def cowbell(f):
    d = 0.32; x = tt(d)
    s = sq(f, d) * 0.6 + sq(f * 1.48, d) * 0.4
    s = fft_filter(s, lo=f * 0.8, hi=f * 4)
    return s * np.exp(-x * 9) * 0.5
def bass808(f, d, glide_to=None):
    x = tt(d)
    ff = np.full(len(x), f) if glide_to is None else f + (glide_to - f) * np.clip((x - d * 0.6) / (d * 0.3), 0, 1)
    s = np.sin(2 * np.pi * np.cumsum(ff) / SR)
    e = np.minimum(1, x / 0.005) * np.clip((d - x) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-x * 4))
    return np.tanh(s * 2.2) * e * 0.55

# ------------------------------------------------------------------ arrangement (bars of 4 beats at 150 BPM)
B = 60 / CUES['bpm']
note = lambda n: 440 * 2 ** ((n - 69) / 12)
# F# minor phonk riff (MIDI), 16 sixteenths per bar, None = rest
RIFF = [78, None, 78, 81, None, 78, None, 76, 78, None, 73, None, 76, None, 74, None,
        78, None, 78, 81, None, 83, None, 81, 78, None, 76, None, 73, None, 71, None]
BASS = [(0, 42, 1.5, None), (1.5, 42, 0.5, None), (2.0, 45, 1.0, None), (3.0, 40, 1.0, 42),
        (4, 42, 1.5, None), (5.5, 42, 0.5, None), (6.0, 47, 1.0, None), (7.0, 45, 1.0, 40)]
DROP = at('hook', 'slam')
SCRATCH = at('elevator', 'sign')
KYLE = START['kyle']; ZERO = at('tip', 'zero'); END = START['end']

CRASH_STOP = (at('crash', 'freeze'), at('crash', 'cont'))
SLOWMO = (at('ramp', 'launch') + 0.08, at('ramp', 'land') - 0.08)
def section(t):
    if t < DROP: return 'intro'
    if CRASH_STOP[0] <= t < CRASH_STOP[1]: return 'stop'
    if SLOWMO[0] <= t < SLOWMO[1]: return 'half'
    if START['real'] <= t < START['real'] + 0.8: return 'half'
    if SCRATCH <= t < START['stairs']: return 'stop'
    if at('stairs', 'tired') <= t < at('stairs', 'top'): return 'half'
    if KYLE <= t < ZERO: return 'tense'
    if ZERO <= t < END: return 'sad'
    return 'full'

grid0 = DROP  # the downbeat lands on the slam
step = B / 4
k = -int(DROP / step)
while True:
    t0 = grid0 + k * step
    if t0 >= TOTAL - 0.3: break
    k += 1
    if t0 < 0: continue
    i16 = (k - 1) % 32; sec = section(t0)
    beat16 = i16 % 16
    if sec in ('stop', 'sad'): continue
    # cowbell riff
    n = RIFF[i16]
    if n is not None:
        g = {'intro': 0.5, 'full': 0.8, 'half': 0.5, 'tense': 0.0}[sec]
        if g: add(music, t0, cowbell(note(n)), g, pan=0.15)
    # hats
    if sec in ('full', 'half', 'tense', 'intro'):
        if beat16 % 2 == 0: add(music, t0, hat(), 0.55 if sec != 'tense' else 0.35, pan=-0.3)
        if sec == 'full' and beat16 in (13, 14, 15) and (k // 16) % 2 == 1:  # rolls
            for r in range(3): add(music, t0 + r * step / 3, hat(), 0.4, pan=-0.3)
        if sec == 'full' and beat16 == 10: add(music, t0, hat(True), 0.4, pan=-0.3)
    if sec == 'full':
        if beat16 in (0, 7, 10) or (beat16 == 3 and (k // 16) % 2): add(music, t0, kick(), 0.95)
        if beat16 in (4, 12): add(music, t0, clap(), 0.8)
    if sec == 'half' and beat16 == 0: add(music, t0, kick(), 0.9)
    # 808s
    if sec in ('full', 'tense', 'half'):
        bar_t = ((k - 1) % 32) * step / B  # beat position in the 8-beat loop
        for (bt, mn, dur, gl) in BASS:
            if abs(bar_t - bt) < 1e-6:
                add(music, t0, bass808(note(mn), dur * B * 0.95, note(gl) if gl else None), 0.9 if sec != 'tense' else 0.55)

# intro riser into the drop
d = DROP - 0.1
r = noise(d); seg_n = 20; out = np.zeros_like(r)
for s_ in range(seg_n):
    a, b = int(len(r) * s_ / seg_n), int(len(r) * (s_ + 1) / seg_n)
    out[a:b] = fft_filter(r[a:b], lo=300, hi=600 + 9000 * (s_ / seg_n) ** 2)
add(music, 0.1, out * np.linspace(0, 1, len(out)) ** 2, 0.25)
# tense drone under Kyle
d = ZERO - KYLE; x = tt(d)
add(music, KYLE, (sine(note(30), d) * 0.6 + sine(note(42) * 1.003, d) * 0.3) * np.minimum(1, x / 0.3) * 0.35)

# ------------------------------------------------------------------ SFX
def ding(f1=1318.5, f2=1760):
    d = 0.6; x = tt(d)
    a = (np.sin(2 * np.pi * f1 * x) + 0.3 * np.sin(2 * np.pi * f1 * 2 * x)) * np.exp(-x * 9)
    b = np.zeros_like(x); o = int(0.09 * SR); b[o:] = (np.sin(2 * np.pi * f2 * x[:-o]) + 0.3 * np.sin(2 * np.pi * f2 * 2 * x[:-o])) * np.exp(-x[:-o] * 7)
    return (a + b) * 0.35
def pop():
    d = 0.08; x = tt(d); f = 350 + 900 * x / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 40) * 0.5
def whoosh(d=0.45):
    x = tt(d); n = fft_filter(noise(d), lo=400, hi=5000)
    return n * np.sin(np.pi * x / d) ** 2 * 0.35
def boom(d=1.4):
    x = tt(d); f = 32 + 60 * np.exp(-x * 8)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3)
    s += fft_filter(noise(d), hi=1500) * np.exp(-x * 10) * 0.5
    return np.tanh(s * 1.5) * 0.8
def skid(d=0.45):
    x = tt(d); n = fft_filter(noise(d), lo=1800, hi=4500)
    return n * (1 + 0.5 * np.sin(2 * np.pi * 38 * x)) * np.minimum(1, x / 0.02) * np.exp(-x * 4) * 0.35
def horn(d=0.55, fs=(311, 370)):
    x = tt(d); s = sum(saw(f, d) for f in fs) / len(fs)
    s = fft_filter(np.tanh(s * 2), hi=2500)
    return s * np.minimum(1, x / 0.02) * np.clip((d - x) / 0.06, 0, 1) * 0.35
def bell():
    d = 0.7; x = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * x) for f, a in ((2093, 1), (2860, 0.6), (4180, 0.3)))
    s2 = np.zeros_like(s); o = int(0.16 * SR); s2[o:] = s[:-o]
    return (s + s2) * np.exp(-x * 6) * 0.18
def thunder(d=2.4):
    x = tt(d); n = np.cumsum(noise(d)); n -= np.convolve(n, np.ones(2000) / 2000, 'same'); n /= np.abs(n).max()
    crack = fft_filter(noise(d), lo=800) * np.exp(-x * 25) * 0.6
    return (fft_filter(n, hi=300) * 2.2 * np.minimum(1, x / 0.05) * np.exp(-x * 1.4) + crack) * 0.9
def crossing_bells(d):
    out = np.zeros(int(d * SR))
    for j in range(int(d / 0.25)):
        f = 1240 if j % 2 else 1100; x = tt(0.25)
        s = (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * f * 2.7 * x)) * np.exp(-x * 12)
        a = int(j * 0.25 * SR); out[a:a + len(s)] += s[:len(out) - a]
    return out * 0.16
def scratch():
    d = 0.32; x = tt(d); f = 300 + 1700 * np.abs(np.sin(np.pi * x / d * 1.5))
    s = saw(f, d) * 0.4 + fft_filter(noise(d), lo=1500) * 0.4
    return s * np.minimum(1, x / 0.01) * np.exp(-x * 5) * 0.5
def creak(d=0.5):
    x = tt(d); f = 180 + 60 * np.sin(2 * np.pi * 3 * x)
    s = saw(f, d) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * x)) ** 4
    return fft_filter(s, lo=300, hi=2500) * np.sin(np.pi * x / d) * 0.25
def slurp(d=0.55):
    x = tt(d); n = fft_filter(noise(d), lo=500, hi=2500)
    return n * (0.5 + 0.5 * np.sin(2 * np.pi * 16 * x + 3 * x)) ** 2 * np.sin(np.pi * x / d) * 0.45
def sad_trombone():
    notes = [(0.0, 0.32, 233.1), (0.36, 0.32, 220.0), (0.72, 0.32, 207.7), (1.08, 1.1, 196.0)]
    out = np.zeros(int(2.3 * SR))
    for a, d, f in notes:
        x = tt(d); vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * x) * np.clip((x - 0.2) / 0.3, 0, 1) if d > 0.5 else 0)
        s = saw(f * vib, d) * 0.6 + saw(f * 2 * vib, d) * 0.2
        wah = np.clip(x / 0.06, 0, 1) * np.clip((d - x) / 0.08, 0, 1)
        s = fft_filter(s, hi=900 + 900 * np.mean(wah)) * wah
        i = int(a * SR); out[i:i + len(s)] += s
    return np.tanh(out * 1.4) * 0.5
def steps(d, rate=6.5):
    out = np.zeros(int(d * SR))
    for j in range(int(d * rate)):
        x = tt(0.08); s = fft_filter(noise(0.08), hi=900) * np.exp(-x * 60)
        a = int(j / rate * SR); out[a:a + len(s)] += s[:len(out) - a]
    return out * 0.6

# hook: card pops, hold-to-accept, slam
add(sfx, at('hook', 'card'), ding(), 0.9)
add(sfx, at('hook', 'slam'), boom(), 0.9)
add(sfx, at('hook', 'slam') - 0.2, whoosh(0.25), 0.8)
# closed
add(sfx, START['closed'] - 0.15, whoosh(), 0.7)
add(sfx, at('closed', 'brake'), skid(), 0.9, pan=-0.2)
add(sfx, at('closed', 'reroute'), ding(1046.5, 1318.5), 0.7)
# boost: pad chime, riser, kick
add(sfx, START['boost'] - 0.15, whoosh(), 0.7)
add(sfx, START['boost'] + 0.05, ding(1318.5, 1568), 0.6)
add(sfx, at('boost', 'pad') + 0.1, pop(), 0.8)
r = noise(0.5); r = fft_filter(r, lo=2000) * np.linspace(0, 1, len(r)) ** 2
add(sfx, at('boost', 'kick') - 0.5, r, 0.5)
add(sfx, at('boost', 'kick'), boom(1.0), 0.9)
add(sfx, at('boost', 'kick'), whoosh(1.2), 1.1)
# dodge
add(sfx, at('dodge', 'chat'), pop(), 0.8)
add(sfx, at('dodge', 'bus') + 0.2, horn(0.8), 1.0, pan=0.4)
add(sfx, at('dodge', 'miss') - 0.1, whoosh(0.4), 1.0, pan=0.4)
# crash: skid, crunch, flips, thud, freeze, ad, continue
def crunch():
    d = 0.5; x = tt(d)
    n = fft_filter(noise(d), lo=300, hi=7000) * np.exp(-x * 14)
    clank = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((1870, 9), (2630, 12), (3410, 15))) * 0.25
    return n * 0.8 + clank + boom(d) * 0.7
def jingle():
    out = np.zeros(int(1.1 * SR))
    for k, n in enumerate([72, 76, 79, 84, 79, 84]):
        x = tt(0.22); s_ = (np.sin(2 * np.pi * note(n) * x) + 0.4 * np.sin(4 * np.pi * note(n) * x)) * np.exp(-x * 10)
        a_ = int(k * 0.16 * SR); out[a_:a_ + len(s_)] += s_[:len(out) - a_]
    return out * 0.35
add(sfx, START['crash'] - 0.1, whoosh(), 0.6)
add(sfx, at('crash', 'brake'), skid(0.35), 1.0)
add(sfx, at('crash', 'hit'), crunch(), 1.1)
add(sfx, at('crash', 'hit') + 0.05, whoosh(0.5), 0.8)
add(sfx, at('crash', 'land'), boom(0.5), 0.9)
add(sfx, at('crash', 'freeze') - 0.02, scratch(), 1.0)
add(sfx, at('crash', 'freeze') + 0.05, boom(0.9) * 0.7, 0.8)
add(sfx, at('crash', 'adbtn'), pop(), 0.9)
add(sfx, at('crash', 'tap'), pop(), 1.0)
add(sfx, at('crash', 'ad'), jingle(), 1.0)
add(sfx, at('crash', 'cont'), ding(1046.5, 1568), 1.0)
add(sfx, at('crash', 'cont'), whoosh(0.4), 0.8)
# storm
add(sfx, at('storm', 'flash'), thunder(), 1.0)
d = START['ramp'] - START['storm']; x = tt(d)
add(sfx, START['storm'], fft_filter(noise(d), lo=1200, hi=9000) * np.minimum(1, x / 0.15) * np.clip((d - x) / 0.2, 0, 1) * 0.16)
# ramp over the SunRail: bells, launch, slow-mo, landing, train blasts through behind
add(sfx, START['ramp'], crossing_bells(2.6), 1.0, pan=-0.3)
add(sfx, at('ramp', 'launch') - 0.05, whoosh(0.4), 1.0)
d = SLOWMO[1] - SLOWMO[0]; x = tt(d)
add(sfx, SLOWMO[0], fft_filter(noise(d), hi=400) * np.sin(np.pi * x / d) * 0.9, 0.9)
add(sfx, at('ramp', 'land'), boom(0.6), 0.9)
add(sfx, START['ramp'] + 1.45, horn(1.2, (311, 392, 466)), 1.1, pan=-0.1)
add(sfx, START['ramp'] + 2.3, whoosh(0.6), 1.3, pan=0.2)
add(sfx, at('ramp', 'land') + 0.15, pop(), 0.8)
# real: impact on the split + wipe
add(sfx, START['real'], boom(1.0), 0.7)
add(sfx, at('real', 'wipe'), whoosh(0.6), 0.6)
# arrive
add(sfx, START['arrive'] - 0.1, whoosh(), 0.6)
add(sfx, at('arrive', 'chat'), pop(), 0.8)
add(sfx, at('arrive', 'stop') - 0.25, skid(0.5), 0.9)
add(sfx, at('arrive', 'run'), steps(0.5, 7), 0.6)
# stairs
# elevator: jog in, beep, the sign (scratch + bwomp), silence, the stare
add(sfx, START['elevator'], steps(at('elevator', 'press') - 0.15, 7), 0.6)
add(sfx, at('elevator', 'press'), ding(1760, 1760), 0.35)
add(sfx, at('elevator', 'sign') - 0.05, scratch(), 1.0)
d = 1.1; x = tt(d); f = 220 * np.exp(-x * 0.9)
add(sfx, at('elevator', 'sign') + 0.1, np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-x * 2.2) * 0.35, 0.9)
d = START['stairs'] - at('elevator', 'sign'); x = tt(d)
add(sfx, at('elevator', 'sign'), (np.sin(2 * np.pi * 60 * x) * 0.5 + fft_filter(noise(d), hi=300) * 0.4) * 0.06, 1.0)
add(sfx, at('elevator', 'line'), boom(0.7) * 0.5, 0.7)
# stairs: pounding steps, wheezing at 14, Kyle's texts, last flight, ding at 20
add(sfx, START['stairs'], steps(at('stairs', 'tired'), 8.5), 0.9)
def breath(d):
    out = np.zeros(int(d * SR))
    for j in range(int(d * 2.6)):
        x = tt(0.3); b_ = fft_filter(noise(0.3), lo=500, hi=3000) * np.sin(np.pi * x / 0.3) ** 2
        a_ = int(j / 2.6 * SR); out[a_:a_ + len(b_)] += b_[:len(out) - a_]
    return out * 0.5
add(sfx, at('stairs', 'tired'), breath(at('stairs', 'top') - at('stairs', 'tired')), 1.0)
add(sfx, at('stairs', 'text'), pop(), 0.9)
add(sfx, at('stairs', 'text') + 0.35, pop(), 0.9)
add(sfx, at('stairs', 'top'), steps(at('stairs', 'twenty') - at('stairs', 'top'), 9), 0.9)
add(sfx, at('stairs', 'twenty'), ding(1318.5, 1760), 0.9)
# kyle
add(sfx, at('kyle', 'open') - 0.05, creak(), 0.9)
add(sfx, at('kyle', 'open') + 0.15, ding(1318.5, 1568), 0.6)
add(sfx, at('kyle', 'sip') - 0.15, slurp(), 1.0)
add(sfx, at('kyle', 'close'), boom(0.6) * 0.6, 0.8)
# tip
add(sfx, at('tip', 'notif'), ding(), 1.0)
add(sfx, at('tip', 'zero'), sad_trombone(), 1.0)
add(sfx, at('tip', 'zero'), boom(0.8), 0.6)
# end
add(sfx, END, boom(1.6), 1.0)
add(sfx, END - 0.25, whoosh(0.3), 0.8)
add(sfx, END + Q['end']['cta'], pop(), 0.7)
add(sfx, START['end'] + CUES['shots'][-1]['dur'] - 1.4, ding(), 1.0)

# ------------------------------------------------------------------ mix: sidechain music under the big SFX moments
duck = np.ones(N)
for t0, depth, d in [(at('tip', 'zero'), 0.0, 1.9), (at('kyle', 'sip') - 0.15, 0.6, 0.5), (at('storm', 'flash'), 0.5, 0.8), (at('crash', 'hit'), 0.5, 0.6)]:
    a = int(t0 * SR); b = min(N, a + int(d * SR)); duck[a:b] = np.minimum(duck[a:b], depth)
duck = np.convolve(duck, np.ones(1500) / 1500, 'same')
mix = music * duck[:, None] * 0.8 + sfx
mix = fft_filter(mix[:, 0], lo=25)[:, None] * [1, 0] + fft_filter(mix[:, 1], lo=25)[:, None] * [0, 1]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.abs(mix).max() / 0.95
x = np.arange(N) / SR; mix *= np.clip((TOTAL - 0.05 - x) / 0.4, 0, 1)[:, None]
out = (mix * 32767).astype('<i2')
import wave
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('wrote', TOTAL, 's')
