#!/usr/bin/env python3
"""Procedural soundtrack for the OVER BUDGET trailer: score + SFX + gibberish voices.

Everything is synthesised with numpy (no samples), timed to the shot list in scenes.js.
Usage: python3 audio.py out.wav
"""
import sys
import wave
import numpy as np

SR = 44100
DUR = 54.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
vox = np.zeros((N, 2))


# ------------------------------------------------------------------ helpers
def tt(d):
    return np.arange(int(SR * d)) / SR


def place(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * gain * l * 1.414
    buf[i:i + len(sig), 1] += sig * gain * r * 1.414


def mixa(*arrs):
    n = max(len(a) for a in arrs)
    out = np.zeros(n)
    for a in arrs:
        out[: len(a)] += a
    return out


def env_adsr(n, a=0.005, d=0.1, s=0.0, r=0.05, sus_len=0.0):
    a_n, d_n, s_n, r_n = int(a * SR), int(d * SR), max(0, int(sus_len * SR)), int(r * SR)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)), np.full(s_n, s), np.linspace(s, 0, max(r_n, 1))])
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]


def expdec(d, k):
    return np.exp(-tt(d) * k)


def fir_lowpass(x, fc, taps=129):
    m = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * m) * np.hamming(taps)
    h /= h.sum()
    return np.convolve(x, h, mode='same')


def fir_highpass(x, fc, taps=129):
    return x - fir_lowpass(x, fc, taps)


def bandpass(x, lo, hi, taps=129):
    return fir_lowpass(fir_highpass(x, lo, taps), hi, taps)


def noise(d):
    return rng.standard_normal(int(SR * d))


def sine_sweep(d, f0, f1, curve='exp'):
    t = tt(d)
    if curve == 'exp':
        f = f0 * (f1 / f0) ** (t / d)
    else:
        f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def karplus(freq, d, decay=0.996, bright=0.5):
    n = int(SR * d)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    buf = fir_lowpass(np.concatenate([buf, buf]), 6000 * bright + 800, 31)[:p]
    out = np.zeros(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = decay * 0.5 * (buf[j] + buf[(j + 1) % p])
    return out


def note(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pc, octv = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pc] + 12 * (octv + 1) - 69) / 12)


# ------------------------------------------------------------------ instruments
KS_CACHE = {}


def pluck(freq, d=0.6):
    key = (round(freq, 2), d)
    if key not in KS_CACHE:
        KS_CACHE[key] = karplus(freq, d, 0.994, 0.6) * env_adsr(int(SR * d), 0.002, d * 0.9, 0, 0.05)
    return KS_CACHE[key]


def kick():
    d = 0.35
    s = sine_sweep(d, 140, 42) * expdec(d, 9)
    click = noise(0.01) * 0.3
    s[: len(click)] += click
    return s


def clap():
    d = 0.22
    n = bandpass(noise(d), 900, 4000, 65)
    e = np.zeros(len(n))
    for off in (0, 0.012, 0.024):
        i = int(off * SR)
        e[i:] += expdec(d, 30)[: len(e) - i]
    return n * e * 0.6


def hat(d=0.05):
    return fir_highpass(noise(d), 7000, 33) * expdec(d, 70) * 0.35


def shaker():
    d = 0.07
    return fir_highpass(noise(d), 5000, 33) * env_adsr(int(SR * d), 0.02, 0.05, 0, 0.0) * 0.18


def bass_note(freq, d=0.24):
    t = tt(d)
    saw = 2 * ((t * freq) % 1) - 1
    sq = np.sign(np.sin(2 * np.pi * freq * t))
    s = fir_lowpass(0.6 * saw + 0.4 * sq, 900, 65)
    return s * env_adsr(len(t), 0.004, d * 0.8, 0.0, 0.03) * 0.55


def whistle(freq, d):
    t = tt(d)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4, 0, 1)
    ph = 2 * np.pi * np.cumsum(freq * vib) / SR
    s = np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    s += fir_highpass(noise(d), 3000, 33) * 0.02
    return s * env_adsr(len(t), 0.02, 0.05, 0.8, 0.06, max(0, d - 0.15)) * 0.35


def glock(freq, d=0.7):
    t = tt(d)
    s = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 14) + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 25)
    return s * np.exp(-t * 5) * 0.3


# ------------------------------------------------------------------ score
BPM = 120
BEAT = 60 / BPM
PROG = [('C', ['C4', 'E4', 'G4', 'C5'], 'C2'), ('A', ['A3', 'C4', 'E4', 'A4'], 'A1'), ('F', ['F3', 'A3', 'C4', 'F4'], 'F1'), ('G', ['G3', 'B3', 'D4', 'G4'], 'G1')]
MELODY = [  # (beat offset in 4-bar phrase, note, length in beats)
    (0, 'E5', 0.5), (0.5, 'G5', 0.5), (1, 'C6', 1), (2.5, 'A5', 0.5), (3, 'G5', 1),
    (4, 'A5', 0.5), (4.5, 'G5', 0.5), (5, 'E5', 1), (6, 'C5', 0.5), (6.5, 'D5', 0.5), (7, 'E5', 1),
    (8, 'F5', 0.5), (8.5, 'A5', 0.5), (9, 'C6', 1), (10.5, 'A5', 0.5), (11, 'F5', 1),
    (12, 'G5', 0.5), (12.5, 'A5', 0.5), (13, 'B5', 0.5), (13.5, 'D6', 0.5), (14, 'C6', 2),
]


def groove(t0, t1, level, layers):
    """Lay down bars of the groove from t0 to t1. layers: set of {'kick','clap','bass','pluck','hat','shake','mel','glock'}"""
    t = t0
    bar = 0
    while t < t1 - 0.01:
        ch = PROG[bar % 4]
        for b in range(4):
            bt = t + b * BEAT
            if bt >= t1:
                break
            if 'kick' in layers and (b in (0, 2) or ('hat' in layers and b == 3 and bar % 2 == 1)):
                place(music, bt, kick(), 0.9 * level)
            if 'clap' in layers and b in (1, 3):
                place(music, bt, clap(), 0.5 * level, 0.1)
            if 'bass' in layers:
                root = note(ch[2])
                for k, (off, mul) in enumerate([(0, 1), (0.5, 2), (0.75, 1)]):
                    if bt + off * BEAT < t1:
                        place(music, bt + off * BEAT, bass_note(root * (mul if b % 2 == 0 else (1.5 if k == 1 else 1)), 0.22), 0.8 * level)
            if 'pluck' in layers and b in (1, 3):
                for k, nn in enumerate(ch[1]):
                    place(music, bt + 0.5 * BEAT + k * 0.012, pluck(note(nn), 0.5), 0.33 * level, -0.3 + k * 0.2)
            if 'hat' in layers:
                for s in range(2):
                    place(music, bt + s * BEAT / 2 + BEAT / 2 * (s == 1) * 0, hat(), (0.6 if s == 1 else 0.35) * level, 0.3)
            if 'shake' in layers:
                for s in range(4):
                    place(music, bt + s * BEAT / 4, shaker(), (0.9 if s % 2 else 0.5) * level, -0.2)
        if 'mel' in layers or 'glock' in layers:
            phrase_bar = bar % 4
            for (bo, nn, ln) in MELODY:
                mb = bo / 4
                if phrase_bar == int(mb):
                    st = t + (bo - phrase_bar * 4) * BEAT
                    if st < t1:
                        if 'mel' in layers:
                            place(music, st, whistle(note(nn), ln * BEAT * 0.95), 0.7 * level, 0.15)
                        if 'glock' in layers:
                            place(music, st, glock(note(nn) * 2 if nn[-1] < '6' else note(nn)), 0.35 * level, -0.15)
        t += 4 * BEAT
        bar += 1


# main groove: starts when the van arrives (3.0) through the montage (35.0)
groove(3.0, 7.0, 0.75, {'kick', 'bass', 'pluck', 'clap'})
groove(7.0, 10.5, 0.85, {'kick', 'bass', 'pluck', 'clap', 'shake'})
groove(10.5, 18.0, 0.85, {'kick', 'bass', 'pluck', 'clap', 'shake', 'mel'})
groove(18.0, 19.6, 0.45, {'pluck'})  # sneaky tiptoe: thin
groove(19.6, 27.0, 0.9, {'kick', 'bass', 'pluck', 'clap', 'shake', 'mel'})
groove(27.0, 35.0, 1.0, {'kick', 'bass', 'pluck', 'clap', 'shake', 'hat', 'mel', 'glock'})
# payday reprise + title outro
groove(45.0, 48.5, 0.95, {'kick', 'bass', 'pluck', 'clap', 'shake', 'hat', 'glock'})
groove(48.5, 52.5, 0.9, {'kick', 'bass', 'pluck', 'clap', 'shake', 'mel', 'glock'})
# final chord sting
for k, nn in enumerate(['C3', 'G3', 'C4', 'E4', 'G4', 'C5']):
    place(music, 52.5 + k * 0.015, karplus(note(nn), 1.6, 0.997, 0.7) * env_adsr(int(SR * 1.6), 0.002, 1.5, 0, 0.1), 0.45, -0.4 + k * 0.16)
place(music, 52.5, glock(note('C6'), 1.4), 0.5)
place(music, 52.5, kick(), 1.0)

# sneaky pizzicato for the tiptoe (18.0 - 19.6)
for i, nn in enumerate(['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'B4', 'C5', 'G4', 'E4', 'D4', 'C4']):
    place(music, 18.0 + i * 0.125, pluck(note(nn), 0.25), 0.55, -0.2 if i % 2 else 0.2)

# tension section (35.0 - 38.5): drone + ticking + heartbeat + riser
td = 3.5
t = tt(td)
drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)) * np.linspace(0.15, 0.5, len(t))
place(music, 35.0, drone, 0.5)
for i in range(int(td / 0.5)):
    tick = fir_highpass(noise(0.02), 2500, 33) * expdec(0.02, 200)
    place(sfx, 35.0 + i * 0.5, tick, 0.6, 0.4 if i % 2 else -0.4)
    hb = sine_sweep(0.15, 70, 40) * expdec(0.15, 18)
    place(music, 35.0 + i * 0.5 + 0.02, hb, 0.6)
ris = fir_highpass(noise(2.4), 1500, 65) * np.linspace(0, 1, int(SR * 2.4)) ** 2
place(music, 36.1, ris, 0.25)
place(music, 36.1, sine_sweep(2.4, 200, 1200) * np.linspace(0, 1, int(SR * 2.4)) ** 2, 0.08)

# ------------------------------------------------------------------ sfx
def boom(d=1.4):
    s = sine_sweep(d, 90, 30) * expdec(d, 3.2)
    n = fir_lowpass(noise(d), 500, 65) * expdec(d, 6)
    return mixa(s * 0.9, n * 0.6)


def splash(d):
    n = bandpass(noise(d), 600, 7000, 65)
    am = 0.7 + 0.3 * np.abs(fir_lowpass(rng.standard_normal(len(n)), 30, 65)) * 6
    return n * am * env_adsr(len(n), 0.02, 0.1, 0.7, 0.4, max(0, d - 0.5)) * 0.4


def flush():
    d = 1.0
    n = fir_lowpass(noise(d), 1800, 65)
    swirl = 0.6 + 0.4 * np.sin(2 * np.pi * np.linspace(3, 9, len(n)) * tt(d))
    return n * swirl * env_adsr(len(n), 0.05, 0.2, 0.6, 0.5, 0.3) * 0.5


def whoosh(d=0.35, up=True):
    n = noise(d)
    lo = fir_lowpass(n, 700, 65)
    hi = fir_highpass(n, 2500, 65)
    m = np.linspace(0, 1, len(n)) if up else np.linspace(1, 0, len(n))
    e = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 1.5
    return (lo * (1 - m) + hi * m) * e * 0.5


def thud(f0=110, d=0.3):
    return mixa(sine_sweep(d, f0, 40) * expdec(d, 12) * 0.9, fir_lowpass(noise(d), 300, 65) * expdec(d, 25) * 0.5)


def slap():
    d = 0.18
    n = fir_highpass(noise(d), 1200, 33) * expdec(d, 45)
    crack = noise(0.006) * 1.5
    n[: len(crack)] += crack
    return mixa(n * 0.9, thud(160, 0.15) * 0.4)


def ding(freqs=(2093.0, 2637.0), d=0.8):
    t = tt(d)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (4 + i * 2)) for i, f in enumerate(freqs)) * 0.25


def kaching():
    s = ding((1568.0, 2093.0, 3136.0), 0.9)
    n = fir_highpass(noise(0.12), 3000, 33) * expdec(0.12, 30) * 0.4
    s[: len(n)] += n
    return s


def coins_scatter(d=1.2, count=18):
    out = np.zeros(int(SR * d))
    for _ in range(count):
        tc = rng.uniform(0, d - 0.15)
        f = rng.uniform(3000, 5200)
        tk = tt(0.12)
        c = np.sin(2 * np.pi * f * tk) * np.exp(-tk * 40) * rng.uniform(0.2, 0.5)
        i = int(tc * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    return out


def pop(f0=500, f1=1100):
    return sine_sweep(0.09, f0, f1) * env_adsr(int(SR * 0.09), 0.002, 0.08, 0, 0.005) * 0.5


def ratchet(d):
    out = np.zeros(int(SR * d))
    for k in range(int(d / 0.11)):
        c = bandpass(noise(0.015), 1500, 6000, 33) * expdec(0.015, 150)
        i = int(k * 0.11 * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    return out * 0.8


def clonk():
    d = 0.6
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for a, f, k in [(1, 380, 9), (0.6, 1030, 14), (0.4, 1730, 20), (0.25, 2650, 28)])
    return s * 0.4


def creak(d=0.5):
    t = tt(d)
    f = 95 + 25 * np.sin(2 * np.pi * 2.2 * t)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    am = (np.abs(np.sin(2 * np.pi * 37 * t)) > 0.3).astype(float) * 0.7 + 0.3
    return bandpass(saw * am, 300, 2500, 65) * env_adsr(len(t), 0.05, 0.1, 0.8, 0.1, d - 0.25) * 0.4


def scratch():
    d = 0.45
    t = tt(d)
    f = 900 * (1 + 0.8 * np.sin(2 * np.pi * 7 * t)) * np.linspace(1.4, 0.4, len(t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    n = bandpass(noise(d), 800, 5000, 65) * 0.5
    return (s * 0.4 + n) * env_adsr(len(t), 0.005, 0.1, 0.8, 0.1, 0.25) * 0.8


def rewind(d=1.2):
    t = tt(d)
    out = np.zeros(len(t))
    for k in range(5):
        f = (600 + k * 260) * (1 + 1.2 * t / d) * (1 + 0.1 * np.sin(2 * np.pi * 13 * t + k))
        out += np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12
    out *= 0.6 + 0.4 * np.sin(2 * np.pi * 21 * t)
    out += bandpass(noise(d), 2000, 8000, 33) * 0.15
    return out * env_adsr(len(t), 0.05, 0.1, 0.9, 0.15, d - 0.3)


def engine(d, f0=48, f1=70):
    t = tt(d)
    f = np.linspace(f0, f1, len(t))
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) + 0.5 * (2 * ((ph * 2) % 1) - 1)
    s = fir_lowpass(s, 600, 65) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))
    return s * env_adsr(len(t), 0.2, 0.1, 0.9, 0.4, d - 0.7) * 0.5


def skid(d):
    n = bandpass(noise(d), 1200, 3500, 65)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt(d))
    return n * am * env_adsr(len(n), 0.05, 0.1, 0.8, 0.2, d - 0.35) * 0.45


def blower(d):
    t = tt(d)
    ph = np.cumsum(np.full(len(t), 140.0)) / SR
    s = fir_lowpass(2 * (ph % 1) - 1, 1200, 65) * 0.4 + bandpass(noise(d), 400, 3000, 65) * 0.6
    return s * env_adsr(len(t), 0.08, 0.1, 0.9, 0.2, d - 0.4) * 0.5


def doorbell(f):
    t = tt(1.6)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t) + 0.12 * np.sin(2 * np.pi * f * 3 * t)) * np.exp(-t * 2.2) * 0.45


def party_horn():
    d = 0.7
    t = tt(d)
    f = np.concatenate([np.linspace(300, 620, int(SR * 0.15)), 620 + 30 * np.sin(2 * np.pi * 9 * t[: len(t) - int(SR * 0.15)])])
    ph = np.cumsum(f) / SR
    s = fir_lowpass(2 * (ph % 1) - 1, 3000, 33)
    return s * env_adsr(len(t), 0.02, 0.05, 0.9, 0.15, d - 0.25) * 0.35


def sparkle(d=1.0):
    out = np.zeros(int(SR * d))
    for _ in range(26):
        tc = rng.uniform(0, d - 0.2)
        f = rng.choice([2093, 2349, 2637, 3136, 3520, 4186])
        tk = tt(0.25)
        c = np.sin(2 * np.pi * f * tk) * np.exp(-tk * 18) * 0.18
        i = int(tc * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    return out


def footsteps(t0, t1, step=0.18, gain=0.35):
    t = t0
    k = 0
    while t < t1:
        st = thud(rng.uniform(140, 180), 0.08) * 0.5
        st[: int(SR * 0.03)] += fir_highpass(noise(0.03), 1500, 33) * expdec(0.03, 80) * 0.2
        place(sfx, t, st, gain, 0.2 if k % 2 else -0.2)
        t += step
        k += 1


# ------------------------------------------------------------------ voices (gibberish, Animal Crossing style)
VOWELS = {'a': (800, 1200), 'e': (500, 1900), 'i': (320, 2300), 'o': (500, 900), 'u': (330, 850)}


def syllable(f0, d, vowel, glide=1.0):
    t = tt(d)
    F1, F2 = VOWELS[vowel]
    f = f0 * np.linspace(1, glide, len(t)) * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.zeros(len(t))
    for h in range(1, 24):
        fh = f0 * h
        if fh > 5000:
            break
        a = np.exp(-((fh - F1) / 220) ** 2) + 0.6 * np.exp(-((fh - F2) / 300) ** 2) + 0.05
        s += a * np.sin(h * ph) / h ** 0.3
    return s / 6 * env_adsr(len(t), 0.008, d * 0.6, 0.6, 0.02, max(0, d * 0.3))


def babble(t0, text, base, pan=0.0, gain=1.0, rate=0.075, excited=1.0):
    t = t0
    for ch in text:
        if ch in ' .,…':
            t += rate * 0.8
            continue
        v = 'aeiou'[ord(ch.lower()) % 5] if ch.lower() not in 'aeiou' else ch.lower()
        f0 = base * rng.uniform(0.85, 1.25) * excited
        place(vox, t, syllable(f0, rate * 0.95, v, rng.uniform(0.9, 1.1)), 0.9 * gain, pan)
        t += rate


def scream(t0, base, d=0.9, pan=0.0):
    t = tt(d)
    f = base * np.linspace(1.25, 0.8, len(t)) * (1 + 0.04 * np.sin(2 * np.pi * 9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    F1, F2 = VOWELS['a']
    s = np.zeros(len(t))
    for h in range(1, 18):
        fh = base * h
        a = np.exp(-((fh - F1) / 260) ** 2) + 0.6 * np.exp(-((fh - F2) / 320) ** 2) + 0.05
        s += a * np.sin(h * ph) / h ** 0.3
    place(vox, t0, s / 5 * env_adsr(len(t), 0.02, 0.2, 0.8, 0.25, d - 0.5), 0.7, pan)


def chorus_gus(t0, d=1.95):
    t = tt(d)
    out = np.zeros(len(t))
    for k, base in enumerate([150, 190, 235, 290]):
        f = base * np.linspace(1.08, 0.86, len(t)) * (1 + 0.012 * np.sin(2 * np.pi * (5 + k * 0.4) * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        F1, F2 = VOWELS['u']
        for h in range(1, 20):
            fh = base * h
            a = np.exp(-((fh - F1) / 200) ** 2) + 0.5 * np.exp(-((fh - F2) / 260) ** 2) + 0.04
            out += a * np.sin(h * ph) / h ** 0.3
    out = out / 14 * env_adsr(len(t), 0.06, 0.2, 0.85, 0.25, d - 0.5)
    g = bandpass(noise(0.06), 300, 2000, 33) * expdec(0.06, 40) * 0.4
    place(vox, t0, g, 1.0)
    place(vox, t0 + 0.04, out, 1.1)
    place(vox, t0 + d - 0.15, fir_highpass(noise(0.35), 4500, 33) * env_adsr(int(SR * 0.35), 0.03, 0.1, 0.7, 0.15, 0.1) * 0.25, 1.0)


# ------------------------------------------------------------------ timeline (absolute seconds)
S = dict(cold=0, arrive=3, job=7, fp=10.5, drywall=15, hammer=16.5, sab=18, slap=23, tumble=25, tub=27, wall=28.6,
         blower=30.2, potty=31.8, gold=33.4, car=35, oops=37, bell=38.5, payoff=40, payday=45, title=48.5)

# cold open
place(sfx, S['cold'] + 0.2, flush(), 0.8)
place(sfx, S['cold'] + 0.55, boom(), 1.0)
place(sfx, S['cold'] + 0.55, splash(1.0), 0.9)
for k, (b, p) in enumerate([(420, -0.5), (520, 0.4), (360, 0.1), (600, 0.6)]):
    scream(S['cold'] + 0.62 + k * 0.05, b, 0.85, p)
place(sfx, S['cold'] + 1.55, scratch(), 1.0)
place(sfx, S['cold'] + 1.75, rewind(1.2), 0.7)

# arrival
place(sfx, S['arrive'], engine(1.6, 45, 80), 0.9, -0.5)
place(sfx, S['arrive'] + 0.7, skid(0.7), 0.8, 0.0)
place(sfx, S['arrive'] + 1.45, whoosh(0.3, False), 0.4)
for k, t0 in enumerate([1.95 + 0.45, 2.15 + 0.45, 2.35 + 0.45]):
    place(sfx, S['arrive'] + t0, thud(150, 0.15), 0.5, -0.3 + k * 0.3)
place(sfx, S['arrive'] + 2.45, whoosh(0.4), 0.5)
place(sfx, S['arrive'] + 2.95, thud(90, 0.4), 1.0)
babble(S['arrive'] + 2.47, 'who drove', 230, -0.2)
babble(S['arrive'] + 3.27, 'me', 165, 0.1, rate=0.12)

# the job: marker pops
for i in range(10):
    place(sfx, S['job'] + 0.35 + i * 0.17, pop(450 + i * 45, 1000 + i * 80), 0.55, -0.6 + i * 0.13)
place(sfx, S['job'] + 0.7, whoosh(0.3), 0.5)
footsteps(S['job'], S['job'] + 3.5, 0.16, 0.2)

# first-person fix
place(sfx, S['fp'] + 0.3, ratchet(2.3), 0.6, 0.3)
place(sfx, S['fp'] + 2.6, kaching(), 0.9)
place(sfx, S['fp'] + 2.62, coins_scatter(1.3), 0.7)
place(sfx, S['fp'] + 2.6, sparkle(0.6), 0.6)
place(sfx, S['fp'] + 2.8, whoosh(0.3), 0.5)

# drywall + hammer
footsteps(S['drywall'], S['drywall'] + 0.55, 0.16, 0.3)
place(sfx, S['drywall'] + 0.6, thud(120, 0.2), 0.9)
place(sfx, S['drywall'] + 0.62, fir_lowpass(noise(0.25), 1500, 65) * expdec(0.25, 14), 0.6)
place(sfx, S['drywall'] + 0.7, ding(), 0.6)
for t0 in (0.36, 0.73, 1.1):
    place(sfx, S['hammer'] + t0, mixa(clonk() * 0.5, thud(200, 0.6) * 0.5), 0.8)
place(sfx, S['hammer'] + 1.0, ding(), 0.6)

# sabotage
footsteps(S['sab'] + 0.1, S['sab'] + 1.6, 0.29, 0.15)
ch = mixa(fir_highpass(noise(1.15), 2000, 65) * np.linspace(0, 1, int(SR * 1.15)) ** 2 * 0.25, sine_sweep(1.15, 180, 700) * np.linspace(0, 1, len(sine_sweep(1.15, 180, 700))) * 0.12)
place(sfx, S['sab'] + 1.65, ch, 0.8)
place(sfx, S['sab'] + 2.8, boom(), 1.0)
place(sfx, S['sab'] + 2.8, splash(2.2), 0.8)
place(sfx, S['sab'] + 2.85, coins_scatter(1.4, 26), 0.8)
place(sfx, S['sab'] + 3.0, whoosh(0.3), 0.5)
babble(S['sab'] + 3.0, 'hehehe', 180, 0.3, 0.6, 0.06)
babble(S['sab'] + 3.9, 'GUUUUS', 260, -0.3, 1.2, 0.13, 1.1)

# slap + tumble
footsteps(S['slap'], S['slap'] + 0.55, 0.12, 0.35)
place(sfx, S['slap'] + 0.62, slap(), 1.0)
place(sfx, S['slap'] + 0.66, whoosh(0.5), 0.6)
place(sfx, S['slap'] + 0.6, splash(1.4), 0.4)
babble(S['slap'] + 1.05, 'that was my toilet', 220, -0.2, 0.9)
for t0 in (0.15, 0.45, 0.75, 1.05):
    place(sfx, S['tumble'] + t0, thud(rng.uniform(100, 140), 0.25), 0.9, rng.uniform(-0.3, 0.3))
place(sfx, S['tumble'] + 1.35, thud(80, 0.4), 1.0)
place(sfx, S['tumble'] + 1.4, kaching(), 0.6)
babble(S['tumble'] + 1.15, 'thanks gus', 240, 0.2, 0.9)

# montage
footsteps(S['tub'], S['tub'] + 0.7, 0.16, 0.3)
place(sfx, S['tub'] + 0.75, clonk(), 1.0)
place(sfx, S['tub'] + 0.85, thud(100, 0.3), 0.8)
babble(S['tub'] + 0.85, 'oof', 200, 0.0, 0.8, 0.09)
place(sfx, S['wall'] + 0.4, creak(0.55), 0.8)
place(sfx, S['wall'] + 0.95, boom(0.8), 0.8)
place(sfx, S['wall'] + 0.95, fir_lowpass(noise(0.4), 900, 65) * expdec(0.4, 8), 0.6)
place(sfx, S['blower'], blower(1.5), 0.7, -0.3)
place(sfx, S['blower'] + 0.35, whoosh(0.8), 0.6, 0.3)
scream(S['blower'] + 0.4, 480, 0.8, 0.4)
place(sfx, S['blower'] + 1.25, thud(110, 0.3), 0.7)
place(sfx, S['potty'], creak(0.3), 0.7)
place(sfx, S['potty'] + 0.35, whoosh(0.6), 0.5)
place(sfx, S['potty'] + 0.95, boom(0.7), 0.8)
place(sfx, S['potty'] + 0.95, clonk(), 0.4)
babble(S['potty'] + 1.05, 'guys', 210, 0.0, 0.5, 0.11)
place(sfx, S['gold'], sparkle(1.1), 0.7)
footsteps(S['gold'], S['gold'] + 1.0, 0.1, 0.3)
place(sfx, S['gold'] + 1.08, boom(0.6), 0.6)
place(sfx, S['gold'] + 1.08, slap(), 0.6)
place(sfx, S['gold'] + 1.1, coins_scatter(1.0, 20), 0.6)
for k in range(4):
    scream(S['gold'] + 0.8 + k * 0.03, 380 + k * 70, 0.45, -0.6 + k * 0.4)

# tension + doorbell
place(sfx, S['car'], engine(1.9, 40, 30), 0.7, 0.6)
babble(S['car'] + 0.8, 'shes here shes here', 300, 0.0, 1.0, 0.065, 1.15)
babble(S['oops'] + 0.75, 'oops', 140, 0.2, 0.9, 0.16)
place(sfx, S['bell'] + 0.3, doorbell(659.25), 0.9, -0.2)
place(sfx, S['bell'] + 0.65, doorbell(523.25), 0.9, 0.2)

# payoff
footsteps(S['payoff'], S['payoff'] + 1.1, 0.24, 0.25)
place(sfx, S['payoff'] + 1.3, flush(), 0.8)
place(sfx, S['payoff'] + 1.6, boom(), 1.0)
place(sfx, S['payoff'] + 1.6, splash(3.0), 0.8)
for k, (b, p) in enumerate([(420, -0.5), (520, 0.4), (360, 0.1), (600, 0.6)]):
    scream(S['payoff'] + 1.67 + k * 0.05, b, 0.8, p)
place(sfx, S['payoff'] + 2.55, boom(0.9), 0.9)
place(sfx, S['payoff'] + 2.57, fir_highpass(noise(0.08), 800, 33) * expdec(0.08, 40), 0.8)
chorus_gus(S['payoff'] + 3.0, 1.95)

# payday + title
place(sfx, S['payday'] + 0.05, party_horn(), 0.8, 0.3)
for k in range(10):
    place(sfx, S['payday'] + rng.uniform(0, 1.5), pop(900, 1600) * 0.5, 0.4, rng.uniform(-0.7, 0.7))
place(sfx, S['title'] + 0.25, boom(1.6), 1.0)
cym = fir_highpass(noise(2.5), 4000, 65) * expdec(2.5, 1.6) * 0.35
place(sfx, S['title'] + 0.25, cym, 0.8)
place(sfx, S['title'] + 0.25, glock(note('C6'), 1.2), 0.6)

# ------------------------------------------------------------------ mix
# duck music under voices and big hits
venv = fir_lowpass(np.abs(vox[:, 0]) + np.abs(vox[:, 1]), 8, 513)
venv = np.clip(venv / (venv.max() + 1e-9) * 6, 0, 1)
duck = 1 - 0.45 * venv
mix = music * duck[:, None] * 0.55 + sfx * 0.75 + vox * 0.9
# silence the music bed during the doorbell beat (38.5-40.0) except sfx
fade = np.ones(N)
a, b = int(38.5 * SR), int(40.0 * SR)
fade[a:b] = 0
mix = music * duck[:, None] * 0.55 * fade[:, None] + sfx * 0.75 + vox * 0.9
# end fade
e0 = int(53.4 * SR)
mix[e0:] *= np.linspace(1, 0, N - e0)[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.abs(mix).max() / 0.92

out = sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s')
