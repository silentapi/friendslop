#!/usr/bin/env python3
"""BIG CRUMB trailer soundtrack: cozy 120 BPM score + SFX + gibberish friend voices, all synthesised.

Reads trailer/cues.json (the same timing source the visuals use). Hits land audioLagFrames after their
visual cue. Usage: python3 audio.py out.wav
"""
import json
import os
import sys
import wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, 'cues.json')))
SR = 48000
FPS = CUES['fps']
LAG = CUES['audioLagFrames'] / FPS
SHOTS = CUES['shots']
START = {}
acc = 0.0
for s in SHOTS:
    START[s['name']] = acc
    acc += s['dur']
DUR = acc + 0.6
N = int(SR * DUR)
rng = np.random.default_rng(11)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
vox = np.zeros((N, 2))


def T(shot, cue=None, k=None):
    """Absolute time of a cue (seconds) + lag."""
    base = START[shot]
    if cue is None:
        return base
    v = SHOTS[[s['name'] for s in SHOTS].index(shot)]['cues'][cue]
    if isinstance(v, list):
        v = v[k or 0]
    return base + v + LAG


def S(key, default=0.6):
    return CUES['strength'].get(key, default)


# ------------------------------------------------------------------ dsp helpers
def tt(d):
    return np.arange(max(1, int(SR * d))) / SR


def place(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * 1.414
    r = np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[i:i + len(sig), 0] += sig * gain * l
    buf[i:i + len(sig), 1] += sig * gain * r


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=0.0):
    parts = [np.linspace(0, 1, max(1, int(a * SR))), np.linspace(1, s, max(1, int(d * SR))), np.full(max(0, int(hold * SR)), s), np.linspace(s, 0, max(1, int(r * SR)))]
    e = np.concatenate(parts)
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def expdec(d, k):
    return np.exp(-tt(d) * k)


def lowpass(x, fc, taps=129):
    m = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * m) * np.hamming(taps)
    return np.convolve(x, h / h.sum(), mode='same')


def highpass(x, fc, taps=129):
    return x - lowpass(x, fc, taps)


def band(x, lo, hi, taps=129):
    return lowpass(highpass(x, lo, taps), hi, taps)


def noise(d):
    return rng.standard_normal(int(SR * d))


def sweep(d, f0, f1, curve='exp'):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d) if curve == 'exp' else f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def nf(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pc, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pc] + 12 * (o + 1) - 69) / 12)


# ------------------------------------------------------------------ instruments (cozy: marimba, pizz, soft kick, glock, ocarina)
def marimba(f, d=0.5):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30) + 0.1 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)
    return s * np.exp(-t * 7) * 0.4


def pizz(f, d=0.35):
    t = tt(d)
    s = sum((1 / h) * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (8 + h * 3)) for h in range(1, 7))
    return s * env(len(t), 0.003, d * 0.9, 0, 0.02) * 0.35


def glock(f, d=0.8):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 14)
    return s * np.exp(-t * 5) * 0.28


def ocarina(f, d):
    t = tt(d)
    vib = 1 + 0.008 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 3, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = np.sin(ph) + 0.08 * np.sin(2 * ph) + highpass(noise(d), 2500, 33) * 0.015
    return s * env(len(t), 0.03, 0.05, 0.85, 0.08, max(0, d - 0.18)) * 0.3


def kick():
    d = 0.3
    return sweep(d, 120, 45) * expdec(d, 11) * 0.9


def snap():
    d = 0.15
    return band(noise(d), 1200, 5000, 65) * expdec(d, 35) * 0.45


def shaker():
    d = 0.06
    return highpass(noise(d), 5000, 33) * env(int(SR * d), 0.015, 0.045) * 0.15


def bass(f, d=0.24):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return s * env(len(t), 0.004, d * 0.8, 0, 0.03) * 0.5


def pad(freqs, d, level=0.15):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 1.003 * t) for i, f in enumerate(freqs))
    return s * env(len(t), 0.4, 0.2, 0.9, 0.6, max(0, d - 1.2)) * level / len(freqs)


BEAT = 60 / CUES['bpm']
PROG = [(['C4', 'E4', 'G4'], 'C2'), (['A3', 'C4', 'E4'], 'A1'), (['F3', 'A3', 'C4'], 'F1'), (['G3', 'B3', 'D4'], 'G1')]
MEL = [(0, 'E5', .5), (.5, 'G5', .5), (1, 'A5', .5), (1.5, 'G5', .5), (2, 'E5', 1), (3, 'C5', .5), (3.5, 'D5', .5),
       (4, 'E5', .5), (4.5, 'C5', .5), (5, 'A4', 1), (6.5, 'G4', .5), (7, 'A4', 1),
       (8, 'F5', .5), (8.5, 'A5', .5), (9, 'C6', .5), (9.5, 'A5', .5), (10, 'F5', 1), (11, 'E5', .5), (11.5, 'D5', .5),
       (12, 'G5', .5), (12.5, 'F5', .5), (13, 'E5', .5), (13.5, 'D5', .5), (14, 'C5', 2)]


def groove(t0, t1, lvl, layers, bar0=0):
    t, bar = t0, bar0
    while t < t1 - 0.01:
        ch, root = PROG[bar % 4]
        for b in range(4):
            bt = t + b * BEAT
            if bt >= t1:
                break
            if 'kick' in layers and b in (0, 2):
                place(music, bt, kick(), 0.8 * lvl)
            if 'snap' in layers and b in (1, 3):
                place(music, bt, snap(), 0.5 * lvl, 0.15)
            if 'bass' in layers:
                for off, mul in ((0, 1), (0.5, 1.5)):
                    if bt + off * BEAT < t1:
                        place(music, bt + off * BEAT, bass(nf(root) * mul * 2), 0.7 * lvl)
            if 'marimba' in layers:
                for k in range(2):
                    nn = ch[(b * 2 + k) % 3]
                    place(music, bt + k * BEAT / 2, marimba(nf(nn) * 2), 0.42 * lvl, -0.3 + k * 0.6)
            if 'pizz' in layers and b % 2 == 1:
                place(music, bt + BEAT / 2, pizz(nf(ch[0]) * 2), 0.5 * lvl, 0.3)
            if 'shake' in layers:
                for s in range(4):
                    place(music, bt + s * BEAT / 4, shaker(), (0.9 if s % 2 else 0.45) * lvl, -0.25)
        if 'mel' in layers or 'glock' in layers:
            pb = bar % 4
            for bo, nn, ln in MEL:
                if int(bo // 4) == pb:
                    st = t + (bo - pb * 4) * BEAT
                    if st < t1:
                        if 'mel' in layers:
                            place(music, st, ocarina(nf(nn), ln * BEAT * 0.95), 0.75 * lvl, 0.1)
                        if 'glock' in layers:
                            place(music, st, glock(nf(nn) * 2), 0.3 * lvl, -0.1)
        t += 4 * BEAT
        bar += 1


# ------------------------------------------------------------------ sfx library
def thud(f0=110, d=0.3):
    return sweep(d, f0, f0 * 0.45) * expdec(d, 14) * 0.9


def boom(d=1.2):
    return (sweep(d, 85, 30) * expdec(d, 3.5) + lowpass(noise(d), 400, 65) * expdec(d, 7) * 0.5) * 0.9


def pop(f0=500, f1=1200, d=0.09):
    return sweep(d, f0, f1) * expdec(d, 30) * 0.6


def whoosh(d=0.4, up=True):
    n = band(noise(d), 400, 4000, 65)
    e = np.sin(np.pi * np.linspace(0, 1, len(n))) ** (1.5 if up else 0.7)
    return n * e * 0.35


def splash(d=0.7):
    return band(noise(d), 600, 7000, 65) * expdec(d, 6) * 0.5


def patter(t0, t1, rate=0.045, gain=0.18, pan=0.0):
    t = t0
    while t < t1:
        c = band(noise(0.012), 2500, 9000, 33) * expdec(0.012, 260)
        place(sfx, t + rng.uniform(-0.008, 0.008), c, gain * rng.uniform(0.6, 1.0), pan + rng.uniform(-0.3, 0.3))
        t += rate


def sparkle(d=0.9, n=18):
    out = np.zeros(int(SR * d))
    for _ in range(n):
        i = int(rng.uniform(0, d - 0.25) * SR)
        f = rng.choice([2093, 2637, 3136, 3520, 4186])
        tk = tt(0.25)
        c = np.sin(2 * np.pi * f * tk) * np.exp(-tk * 16) * 0.16
        out[i:i + len(c)] += c[: len(out) - i]
    return out


def growl(d=1.4):
    t = tt(d)
    f = 48 + 14 * np.sin(2 * np.pi * 3.2 * t) + 8 * np.sin(2 * np.pi * 7.1 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    s += lowpass(noise(d), 220, 65) * 0.8
    return s * env(len(t), 0.08, 0.3, 0.8, 0.4, d - 0.8) * 0.8


def gulp():
    d = 0.5
    t = tt(d)
    f = 320 * np.exp(-t * 4) + 80
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.6 * np.sin(2 * np.pi * 18 * t))
    return s * env(len(t), 0.01, 0.3, 0.4, 0.15, 0.05) * 0.6


def slide_whistle(d, f0, f1):
    return sweep(d, f0, f1) * env(int(SR * d), 0.02, 0.05, 0.9, 0.08, d - 0.15) * 0.22


def creak(d=0.6):
    t = tt(d)
    f = 180 + 60 * np.sin(2 * np.pi * 1.3 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 37 * t))
    return band(s, 300, 2500, 65) * env(len(t), 0.05, 0.2, 0.6, 0.2, d - 0.45) * 0.18


# ------------------------------------------------------------------ voices (gibberish, cozy-game style)
VOW = {'a': (800, 1200), 'e': (500, 1900), 'i': (320, 2300), 'o': (500, 900), 'u': (330, 850)}
PITCH = {'pip': 230, 'dot': 270, 'bean': 330, 'moss': 190, 'mom': 260}
PAN = {'pip': -0.35, 'dot': 0.3, 'bean': 0.15, 'moss': -0.15, 'mom': 0.0}


def syl(f0, d, v, glide=1.0, whisper=False):
    t = tt(d)
    F1, F2 = VOW[v]
    if whisper:
        n = noise(d)
        s = band(n, F1 * 0.8, F1 * 1.3, 65) + 0.6 * band(n, F2 * 0.85, F2 * 1.2, 65)
        return s * env(len(t), 0.01, d * 0.6, 0.5, 0.02, d * 0.3) * 0.25
    f = f0 * np.linspace(1, glide, len(t)) * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.zeros(len(t))
    for h in range(1, 22):
        fh = f0 * h
        if fh > 5500:
            break
        a = np.exp(-((fh - F1) / 220) ** 2) + 0.6 * np.exp(-((fh - F2) / 300) ** 2) + 0.05
        s += a * np.sin(h * ph) / h ** 0.3
    return s / 6 * env(len(t), 0.008, d * 0.6, 0.6, 0.02, d * 0.3)


def babble(t0, t1, text, who, gain=1.0, whisper=False):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return
    span = max(0.2, min(t1 - t0 - 0.1, len(letters) * 0.075))
    rate = span / len(letters)
    caps = sum(c.isupper() for c in letters) / len(letters)
    excited = 1.0 + 0.25 * caps
    base = PITCH.get(who, 240)
    t = t0
    for i, ch in enumerate(text):
        if not ch.isalpha():
            t += rate * (1.2 if ch in '.…?' else 0.5)
            continue
        v = ch.lower() if ch.lower() in 'aeiou' else 'aeiou'[ord(ch.lower()) % 5]
        f0 = base * excited * rng.uniform(0.88, 1.2) * (1.15 if i == len(text) - 1 and text.endswith('?') else 1)
        place(vox, t, syl(f0, rate * 0.95, v, rng.uniform(0.9, 1.12), whisper), 0.9 * gain, PAN.get(who, 0))
        t += rate


def scream(t0, base=520, d=1.0, pan=0.0, gain=0.8):
    t = tt(d)
    f = base * np.linspace(1.15, 0.85, len(t)) * (1 + 0.05 * np.sin(2 * np.pi * 9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    F1, F2 = VOW['i']
    s = sum((np.exp(-((base * h - F1) / 260) ** 2) + 0.7 * np.exp(-((base * h - F2) / 320) ** 2) + 0.05) * np.sin(h * ph) / h ** 0.3 for h in range(1, 14))
    place(vox, t0, s / 4 * env(len(t), 0.02, 0.2, 0.85, 0.25, d - 0.5), gain, pan)


def group_cheer(t0, d=1.2, gain=0.8):
    for who in ('pip', 'dot', 'bean', 'moss'):
        babble(t0 + rng.uniform(0, 0.08), t0 + d, 'YEAAAHHH', who, gain * 0.6)


# ------------------------------------------------------------------ SCORE
st = lambda n: START[n]
# HOOK: groove from frame one (light), spin adds shaker
groove(0.0, st('spin'), 0.7, {'kick', 'bass', 'marimba', 'pizz'})
groove(st('spin'), st('hungry') - 0.12, 0.8, {'kick', 'bass', 'marimba', 'pizz', 'shake', 'snap'}, bar0=1)
# WHY: suck-out, low drone in the nest
place(music, st('hungry'), pad([nf('A2'), nf('E3'), nf('C3')], 3.0, 0.25), 1.0)
# JOURNEY: the theme (ocarina) — out → trek → hose → climb
groove(st('out'), st('kitchen'), 0.9, {'kick', 'bass', 'marimba', 'pizz', 'shake', 'snap', 'mel'})
# threshold: riser as they climb the cabinet, resolving as they crest the counter
place(music, st('kitchen'), highpass(noise(0.6), 1500, 65) * np.linspace(0, 1, int(SR * 0.6)) ** 2, 0.25)
# HEIST: awe pad + glock, then groove on the grab
place(music, T('kitchen', 'crest'), pad([nf('F3'), nf('A3'), nf('C4'), nf('E4')], 2.5, 0.35), 1.0)
for i, nn in enumerate(['C6', 'E6', 'G6', 'C7']):
    place(music, st('kitchen') + 1.6 + i * 0.08, glock(nf(nn)), 0.5, -0.3 + i * 0.2)
groove(st('grab'), st('freeze') + 0.55, 0.85, {'kick', 'bass', 'marimba', 'shake', 'snap'})
# TENSION: music cut on FREEZE; clock + heartbeat; she hums the theme, slow and off-key
fz = st('freeze') + 0.6 + LAG
tl = T('freeze', 'sneeze') - fz
for i in range(int(tl / 0.5) + 1):
    tick = highpass(noise(0.02), 2500, 33) * expdec(0.02, 200)
    place(sfx, fz + i * 0.5, tick, 0.5, 0.4 if i % 2 else -0.4)
    place(music, fz + i * 0.5 + 0.03, sweep(0.15, 70, 40) * expdec(0.15, 18), 0.6)
place(music, fz, pad([nf('D3'), nf('G#3')], tl, 0.25), 1.0)
for i, (nn, ln) in enumerate([('E4', .5), ('G4', .5), ('A4', .5), ('G4', .5), ('E4', 1.0)]):
    place(vox, fz + 0.3 + sum(l for _, l in [('E4', .5), ('G4', .5), ('A4', .5), ('G4', .5), ('E4', 1.0)][:i]) * 0.55, ocarina(nf(nn) * 0.5, ln * 0.5), 0.35, 0.2)
# CLIMAX (spotted → swat → fall → nope): double-time drums
groove(st('swat'), st('roll'), 1.0, {'kick', 'bass', 'marimba', 'shake', 'snap', 'pizz'})
for k in range(int((st('roll') - st('swat')) / (BEAT / 2))):
    place(music, st('swat') + k * BEAT / 2 + BEAT / 4, kick(), 0.35)
# REST: roll home — warm half-time reprise
groove(st('roll'), st('gulp') + 0.6, 0.8, {'bass', 'marimba', 'pizz', 'mel', 'glock'})
# PAYOFF: silence on the gulp, then the growl; sad slide for "again"
for i, nn in enumerate(['G4', 'F#4', 'F4', 'E4']):
    place(music, st('again') + 0.25 + i * 0.32, ocarina(nf(nn), 0.3 if i < 3 else 0.7), 0.6)
# TITLE: theme on the slam, chord sting
groove(T('title', 'slam') - LAG, st('button') - 0.1, 1.0, {'kick', 'bass', 'marimba', 'pizz', 'shake', 'snap', 'mel', 'glock'})
for k, nn in enumerate(['C3', 'G3', 'C4', 'E4', 'G4', 'C5']):
    place(music, T('title', 'sting') + k * 0.015, marimba(nf(nn), 1.6), 0.6, -0.4 + k * 0.16)
place(music, T('title', 'sting'), glock(nf('C6'), 1.4), 0.6)
# BUTTON: night crickets
for i in range(14):
    c = np.sin(2 * np.pi * 4400 * tt(0.05)) * (np.sin(2 * np.pi * 60 * tt(0.05)) > 0) * expdec(0.05, 30)
    place(music, st('button') + i * 0.18, c, 0.05, 0.6)

# ------------------------------------------------------------------ SFX
# donut + spin: tiny feet, strain, the fling
patter(0.05, st('spin') + T('spin', 'fling') - st('spin'), 0.04, 0.16)
place(sfx, T('spin', 'spin'), whoosh(1.0), 0.6)
place(sfx, T('spin', 'fling'), slide_whistle(0.6, 500, 1500), 0.8, 0.5)
place(sfx, T('spin', 'fling'), pop(300, 900, 0.12), 0.7, 0.4)
# hungry: the growl + dirt
place(sfx, T('hungry', 'growl'), growl(1.6), 1.1 * S('hungry.growl'))
for i in range(30):
    place(sfx, T('hungry', 'growl') + 0.3 + rng.uniform(0, 1.2), band(noise(0.02), 1500, 6000, 33) * expdec(0.02, 150), 0.25, rng.uniform(-0.6, 0.6))
# out: pops + card ping
for k in range(4):
    place(sfx, T('out', 'pops', k), pop(400 + k * 80, 1000 + k * 120), 0.7, -0.3 + k * 0.2)
    place(sfx, T('out', 'pops', k) + 0.33, thud(160, 0.12), 0.35)
place(sfx, T('out', 'card'), glock(nf('E6'), 0.9), 0.5)
patter(st('trek'), st('climb'), 0.04, 0.14)
place(sfx, T('trek', 'land'), thud(140, 0.2), 0.5 * S('trek.land') * 2)
place(sfx, T('hose', 'slip'), sweep(0.25, 600, 1400) * expdec(0.25, 6) * 0.3, 0.8)
sp = band(noise(0.8), 500, 7000, 65) * expdec(0.8, 5) * 0.55
place(sfx, T('hose', 'splash'), sp, 1.0 * S('hose.splash'))
place(sfx, T('hose', 'splash'), thud(80, 0.25), 0.6)
for i in range(6):
    place(sfx, T('hose', 'splash') + 0.5 + i * 0.12, pop(300, 700, 0.06), 0.15)  # bubbles
place(sfx, T('climb', 'slip'), sweep(0.25, 1600, 500) * 0.25, 0.8)
place(sfx, T('climb', 'catch'), thud(200, 0.15), 0.7)
patter(st('kitchen'), T('kitchen', 'crest') + 0.9, 0.04, 0.14)
place(sfx, T('kitchen', 'crest'), whoosh(0.5), 0.5)
place(sfx, T('kitchen', 'glint'), sparkle(0.6, 10), 1.0)
for k in range(4):
    place(sfx, T('grab', 'grabs', k), pop(500, 1300) * 0.6 + marimba(nf(['C5', 'E5', 'G5', 'C6'][k]), 0.3)[: int(SR * 0.09)], 0.9, -0.4 + k * 0.25)
place(sfx, T('grab', 'lift'), thud(120, 0.3), 0.8 * S('grab.lift'))
# freeze: giant footsteps, the freeze "tink", sneeze
for k in range(2):
    place(sfx, T('freeze', 'thumps', k), boom(0.8) * 0.8, 0.8 * S('freeze.thumps'))
place(sfx, T('freeze', 'freeze'), glock(nf('B6'), 0.4), 0.4)
place(sfx, T('freeze', 'sneeze') - 0.35, sweep(0.35, 300, 700) * env(int(SR * 0.35), 0.2, 0.1, 0.8, 0.05, 0.0) * 0.2, 0.8)
babble(T('freeze', 'sneeze'), T('freeze', 'sneeze') + 0.25, 'ACHOO', 'bean', 1.2)
# spotted: SCREAM (stopping all music for a beat)
scream(T('spotted', 'scream'), 560, 1.15, 0.0, 0.9)
place(sfx, T('spotted', 'scream'), boom(0.6) * 0.4, 0.6)
# swat / fall / nope
place(sfx, T('swat', 'hit') - 0.25, whoosh(0.3, True), 0.8)
place(sfx, T('swat', 'hit'), boom(1.0), 1.0 * S('swat.hit'))
place(sfx, T('swat', 'hit'), highpass(noise(0.08), 1500, 33) * expdec(0.08, 50), 0.8)
place(sfx, st('fall') + 0.1, slide_whistle(1.2, 1600, 300), 0.8)
place(sfx, T('fall', 'land'), boom(0.7), 0.9 * S('fall.land'))
for i in range(8):
    place(sfx, st('nope') + 0.05 + i * 0.17, boom(0.35) * 0.5, 0.5, -0.5 + i * 0.12)
# roll: rolling rumble + feet
rr_ = lowpass(noise(2.5), 300, 65) * 0.4 * (1 + 0.3 * np.sin(2 * np.pi * 4 * tt(2.5)))
place(sfx, st('roll'), rr_, 0.6)
patter(st('roll'), st('home'), 0.035, 0.12)
place(sfx, T('home', 'plop'), thud(100, 0.3) + pop(200, 120, 0.3)[: int(SR * 0.3)] * 0.5, 1.0 * S('home.plop'))
# gulp: tremble, GULP, silence, growl
place(sfx, T('gulp', 'pop'), band(noise(0.6), 100, 400, 65) * 0.25, 0.6)
place(sfx, T('gulp', 'gulp'), gulp(), 1.2 * S('gulp.gulp'))
place(sfx, T('gulp', 'gulp') + 0.4, pop(400, 900, 0.1), 0.5)
place(sfx, T('gulp', 'growl'), growl(1.5), 1.1 * S('gulp.growl'))
# title slam
place(sfx, T('title', 'slam'), boom(1.4), 0.9)
place(sfx, T('title', 'slam'), highpass(noise(0.12), 2000, 33) * expdec(0.12, 30), 0.5)
# button: creak, light hum, scream
place(sfx, T('button', 'open'), creak(0.7), 1.0)
place(sfx, T('button', 'light'), lowpass(noise(1.5), 120, 65) * 0.15, 0.5)
scream(T('button', 'scream'), 600, 0.9, 0.0, 0.9)

# ------------------------------------------------------------------ VOICES from the cue sheet
for c in CUES['chat']:
    t0 = START[c['shot']] + c['t0'] + LAG
    t1 = START[c['shot']] + c['t1']
    if c['who'] == 'everyone':
        for who in ('pip', 'dot', 'bean', 'moss'):
            babble(t0 + rng.uniform(0, 0.06), t1, c['text'], who, 0.55, c.get('whisper', False))
    else:
        g = 0.55 if c.get('muffled') else 1.0
        babble(t0, t1, c['text'], c['who'], g, c.get('whisper', False))

# ------------------------------------------------------------------ duck music under voices, mix, master
vl = np.abs(vox).sum(axis=1)
k = int(SR * 0.12)
envv = np.convolve(vl, np.ones(k) / k, mode='same')
duck = 1 - 0.45 * np.clip(envv / (envv.max() + 1e-9) * 4, 0, 1)
music *= duck[:, None]
# hard silences (the suck-outs): before the growl, at the freeze, at the gulp, after the button black
def silence(buf, t0, t1, fade=0.03):
    i0, i1 = int(t0 * SR), int(t1 * SR)
    f = int(fade * SR)
    buf[i0:i1] *= 0
    if i0 - f > 0:
        buf[i0 - f:i0] *= np.linspace(1, 0, f)[:, None]
    if i1 + f < N:
        buf[i1:i1 + f] *= np.linspace(0, 1, f)[:, None]
silence(music, T('spotted', 'scream') - 0.25, st('swat') - 0.02)
silence(music, T('gulp', 'gulp') - 0.05, st('again') + 0.2)
silence(music, T('button', 'black'), DUR)
mix = music * 0.6 + sfx * 0.85 + vox * 0.9
mix = lowpass(mix[:, 0], 16000, 33)[:, None] * np.array([1, 0]) + lowpass(mix[:, 1], 16000, 33)[:, None] * np.array([0, 1])
peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 1.4) * 0.89
out = sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('wrote', out, f'{DUR:.2f}s')
