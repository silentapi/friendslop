#!/usr/bin/env python3
"""LAST MILE trailer soundtrack: 150 BPM phonk/trap score + city SFX, all synthesised (numpy only).

Reads trailer/cues.json (the same timing source as the visuals). Usage: python3 audio.py out.wav
Structure: tense intro (order ping) → beat in at the pickup → ride (cowbell phonk) → hard stop at OUT OF ORDER →
stairs double-time → slow-mo tape-stop in the slip → sad lowpass for Kyle + sad trombone → title drop → quiet stinger.
"""
import json
import os
import sys
import wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, 'cues.json')))
SR = 48000
SHOTS = CUES['shots']
START, DURS = {}, {}
acc = 0.0
for s in SHOTS:
    START[s['name']] = acc
    DURS[s['name']] = s['dur']
    acc += s['dur']
DUR = acc + 0.3
N = int(SR * DUR)
BEAT = 60 / CUES['bpm']
rng = np.random.default_rng(23)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def T(shot, cue=None, k=0):
    base = START[shot]
    if cue is None:
        return base
    v = [s for s in SHOTS if s['name'] == shot][0]['cues'][cue]
    return base + (v[k] if isinstance(v, list) else v)


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


def sweep(d, f0, f1):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def nf(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pc, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pc] + 12 * (o + 1) - 69) / 12)


def saw(f, d):
    t = tt(d)
    return 2 * ((f * t) % 1) - 1


def onepole(x, fc):
    # cheap time-varying-safe lowpass (fc scalar)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc_ = 0.0
    for i in range(len(x)):
        acc_ = (1 - a) * x[i] + a * acc_
        y[i] = acc_
    return y


def fft_conv(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:len(x)]


# ------------------------------------------------------------------ instruments
def kick808(f=50, d=0.45):
    t = tt(d)
    f_t = f + 160 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f_t) / SR)
    s = np.tanh(s * 2.2) * np.exp(-t * 7)
    click = highpass(noise(0.01), 2000, 33) * 0.3
    s[:len(click)] += click
    return s * 0.9


def bass808(f, d, glide_to=None):
    t = tt(d)
    ff = f if glide_to is None else f * (glide_to / f) ** np.clip((t - d * 0.55) / (d * 0.3), 0, 1)
    s = np.sin(2 * np.pi * np.cumsum(np.full(len(t), 1.0) * ff) / SR)
    s = np.tanh(s * 1.8)
    return s * env(len(t), 0.004, 0.05, 0.85, 0.06, max(0, d - 0.12)) * 0.6


def clap():
    d = 0.22
    n = band(noise(d), 900, 6000, 65)
    e = np.zeros(int(SR * d))
    for k, o in enumerate((0, 0.011, 0.022)):
        i = int(o * SR)
        e[i:] += np.exp(-np.arange(len(e) - i) / SR * (60 if k < 2 else 18)) * (0.6 if k < 2 else 1)
    return n * e * 0.5


def hat(open_=False):
    d = 0.18 if open_ else 0.045
    return highpass(noise(d), 7000, 33) * expdec(d, 14 if open_ else 70) * 0.22


def cowbell(f, d=0.28):
    # the phonk lead: two detuned squares through a band
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * f * t)) + np.sign(np.sin(2 * np.pi * f * 1.48 * t))
    s = band(s, 400, 4500, 65)
    return s * np.exp(-t * 11) * 0.22


def pad(freqs, d, level=0.12):
    t = tt(d)
    s = sum(saw(f, d) + saw(f * 1.005, d) for f in freqs) / (2 * len(freqs))
    s = lowpass(s, 1400, 129)
    return s * env(len(t), 0.5, 0.2, 0.9, 0.6, max(0, d - 1.3)) * level


def riser(d, f0=200, f1=2400):
    n = band(noise(d), 300, 8000, 65) * np.linspace(0, 1, int(SR * d)) ** 2
    return (n * 0.25 + sweep(d, f0, f1) * 0.1 * np.linspace(0, 1, int(SR * d)) ** 2)


def impact(d=1.6):
    t = tt(d)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.6)
    crack = lowpass(noise(d), 4000) * np.exp(-t * 16) * 0.5
    return np.tanh((sub + crack) * 1.6) * 0.8


def whoosh(d=0.45):
    n = noise(d)
    lo = band(n, 300, 3000, 65)
    return lo * np.sin(np.linspace(0, np.pi, len(n))) ** 2 * 0.35


def ding(f=1318.5, d=0.9):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 8)) * np.exp(-t * 4) * 0.3


def phone_ping():
    a = ding(1568, 0.5)
    b = ding(2093, 0.6)
    out = np.zeros(int(SR * 0.75))
    out[:len(a)] += a
    out[int(0.09 * SR):int(0.09 * SR) + len(b)] += b
    return out


def buzz(d=0.5):
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * 170 * t)) * (np.sin(2 * np.pi * 9 * t) > -0.2)
    return lowpass(s, 600, 65) * 0.25 * env(len(t), 0.01, 0.1, 1, 0.05, d - 0.2)


def horn(d=0.55, f=(349, 440)):
    t = tt(d)
    s = sum(np.sign(np.sin(2 * np.pi * ff * t)) for ff in f) / len(f)
    return lowpass(s, 2500, 65) * env(len(t), 0.01, 0.05, 0.9, 0.08, d - 0.15) * 0.3


def train_horn(d=1.4):
    t = tt(d)
    dop = 1 + 0.04 * np.tanh((0.7 - t) * 4)
    s = sum(saw(1, d) * 0 + np.sin(2 * np.pi * np.cumsum(np.full(len(t), f) * dop) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(np.full(len(t), f) * dop) / SR) for f in (277, 330, 415))
    return np.tanh(s * 0.8) * env(len(t), 0.04, 0.1, 0.9, 0.2, d - 0.35) * 0.35


def crossing_bell(d):
    out = np.zeros(int(SR * d))
    k = 0.0
    while k < d:
        b = ding(1180, 0.35) * 0.7
        i = int(k * SR)
        out[i:i + len(b)] += b[:len(out) - i]
        k += 0.4
    return out


def rumble(d):
    n = lowpass(noise(d), 180, 129)
    return n * np.sin(np.linspace(0, np.pi, len(n))) * 1.4


def hiss(d=0.6):
    n = band(noise(d), 2500, 9000, 65)
    return n * env(len(n), 0.03, 0.1, 0.8, 0.2, d - 0.35) * 0.5


def honk(f=420, d=0.22):
    t = tt(d)
    s = np.tanh(np.sin(2 * np.pi * f * t) * 3) + 0.4 * np.sin(2 * np.pi * f * 2 * t)
    return band(s, 300, 3000, 65) * env(len(t), 0.01, 0.04, 0.8, 0.05, d - 0.1) * 0.3


def skid(d=0.5):
    n = band(noise(d), 1500, 5000, 65)
    t = tt(d)
    return n * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t)) * env(len(t), 0.02, 0.1, 0.8, 0.15, d - 0.3) * 0.4


def thump(f=90, d=0.25):
    return np.sin(2 * np.pi * np.cumsum(f + 60 * np.exp(-tt(d) * 40)) / SR) * expdec(d, 14) * 0.7


def knock():
    d = 0.12
    return (thump(140, d) * 0.6 + band(noise(d), 300, 2000, 33) * expdec(d, 50) * 0.4)


def scratch(d=0.35):
    t = tt(d)
    f = 300 + 1600 * np.abs(np.sin(2 * np.pi * 4 * t))
    s = band(noise(d), 400, 4000, 65) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    return s * env(len(t), 0.005, 0.05, 0.8, 0.05, d - 0.1) * 0.5


def step():
    d = 0.08
    return (thump(80, d) * 0.6 + band(noise(d), 200, 1500, 33) * expdec(d, 60) * 0.3)


def trombone(notes, dur):
    out = []
    for i, f in enumerate(notes):
        d = dur * (2.2 if i == len(notes) - 1 else 1)
        t = tt(d)
        vib = 1 + (0.02 * np.sin(2 * np.pi * 6 * t) * np.clip(t * 2, 0, 1) if i == len(notes) - 1 else 0)
        ff = f * np.ones(len(t)) * vib * (1 - (0.06 * t / d if i == len(notes) - 1 else 0))
        s = sum((1 / h) * np.sin(2 * np.pi * h * np.cumsum(ff) / SR) for h in range(1, 7))
        out.append(lowpass(s, 1800, 65) * env(len(t), 0.03, 0.05, 0.85, 0.08, d - 0.18) * 0.28)
    return np.concatenate(out)


def heartbeat():
    out = np.zeros(int(SR * 0.5))
    a = thump(55, 0.18)
    out[:len(a)] += a
    out[int(0.18 * SR):int(0.18 * SR) + len(a)] += a * 0.7
    return out


# ------------------------------------------------------------------ the beat
ROOTS = ['A1', 'A1', 'F1', 'G1']  # Am – Am – F – G, one root per bar
COW = [(0, 'A5'), (0.75, 'A5'), (1.5, 'C6'), (2, 'A5'), (2.75, 'G5'), (3.5, 'E5'),
       (4, 'A5'), (4.75, 'A5'), (5.5, 'C6'), (6, 'D6'), (6.75, 'C6'), (7.25, 'G5'), (7.5, 'E5')]


def beat(t0, t1, layers, lvl=1.0, bar0=0):
    bar = bar0
    t = t0
    while t < t1 - 1e-3:
        root = nf(ROOTS[bar % 4])
        for b in range(8):  # eighths
            bt = t + b * BEAT / 2
            if bt >= t1:
                break
            if 'kick' in layers and b in (0, 3, 5) and not (b == 5 and bar % 2):
                place(music, bt, kick808(), 0.9 * lvl)
            if 'clap' in layers and b in (4,):
                place(music, bt, clap(), 0.8 * lvl, 0.05)
            if 'hat' in layers:
                place(music, bt, hat(), 0.7 * lvl, 0.3)
                if 'roll' in layers and b in (6, 7):
                    for r in range(1, 3):
                        place(music, bt + r * BEAT / 6, hat(), 0.45 * lvl, 0.3)
                if 'double' in layers:
                    place(music, bt + BEAT / 4, hat(), 0.5 * lvl, 0.3)
            if 'open' in layers and b == 2:
                place(music, bt, hat(True), 0.6 * lvl, -0.3)
        if '808' in layers:
            glide = nf(ROOTS[(bar + 1) % 4]) if bar % 4 == 3 else None
            place(music, t, bass808(root * 2, BEAT * 3.5, glide and glide * 2), 0.9 * lvl)
        if 'cow' in layers:
            half = (bar % 2) * 4
            for off, n in COW:
                if half <= off < half + 4:
                    st = t + (off - half) * BEAT
                    if st < t1:
                        place(music, st, cowbell(nf(n)), 0.8 * lvl, 0.15 if off % 1 else -0.15)
        t += 4 * BEAT
        bar += 1


# ---- 1. PING: tense intro
place(music, T('ping'), pad([nf('A2'), nf('C3'), nf('E3')], DURS['ping'] + 0.3, 0.18))
place(sfx, T('ping', 'buzz'), buzz(0.55), 0.9)
place(sfx, T('ping', 'card'), phone_ping(), 0.9)
place(music, T('ping', 'card'), riser(T('ping', 'slam') - T('ping', 'card')), 0.8)
for k in range(4):
    place(music, T('ping') + 0.4 + k * BEAT * 2, kick808(45, 0.3), 0.35 + k * 0.08)
place(sfx, T('ping', 'accept'), ding(2093, 0.4), 0.6)
place(music, T('ping', 'slam'), impact(), 1.0)
# ---- 2–8: the ride
beat(T('pickup'), T('launch'), ['kick', 'hat', '808'], 0.8)
place(sfx, T('pickup', 'grab'), thump(220, 0.1), 0.5)
place(sfx, T('pickup', 'turn'), whoosh(0.5), 1.0)
beat(T('launch'), T('elevator'), ['kick', 'clap', 'hat', 'roll', 'open', '808', 'cow'], 1.0)
place(sfx, T('launch', 'kick'), thump(70, 0.3), 0.8)
place(sfx, T('launch', 'whoosh') - 0.2, whoosh(0.6), 1.3, 0.3)
place(music, T('skyline') - 0.4, riser(0.4, 400, 3000), 0.5)
# traffic: horn + near-miss whoosh; music dips during slow-mo
place(sfx, T('traffic', 'horn'), horn(0.7), 0.9, -0.3)
place(sfx, T('traffic', 'miss') - 0.25, whoosh(0.7), 1.3)
# train: bell, horn, rumble + whoosh on the pass
place(sfx, T('train'), crossing_bell(DURS['train']), 0.55, 0.35)
place(sfx, T('train', 'horn'), train_horn(1.5), 1.0, -0.2)
place(sfx, T('train', 'train') - 0.2, rumble(1.8), 1.0)
place(sfx, T('train', 'train') - 0.15, whoosh(0.8), 1.2)
# eola: fountain wash, swan honk + hiss, swerve whoosh
place(sfx, T('eola'), lowpass(noise(DURS['eola']), 2500) * 0.08, 1.0, 0.4)
place(sfx, T('eola', 'swan'), honk(), 0.9, 0.2)
place(sfx, T('eola', 'hiss'), hiss(0.7), 1.0, 0.2)
place(sfx, T('eola', 'swerve'), whoosh(0.5), 1.0, -0.3)
# towers: a hit on every cut
for k in range(4):
    place(sfx, T('towers', 'cuts', k), impact(0.6), 0.55)
    place(sfx, T('towers', 'cuts', k), whoosh(0.3), 0.6)
# arrive: skid + stop
place(sfx, T('arrive', 'cutB'), whoosh(0.4), 0.8)
place(sfx, T('arrive', 'brake'), skid(0.5), 1.0)
place(sfx, T('arrive', 'stop'), thump(90, 0.25), 0.7)
for k in range(4):
    place(sfx, T('arrive', 'run') + k * 0.13, step(), 0.6)
# ---- 10. ELEVATOR: ding... record scratch, silence
music[int(T('elevator', 'scratch') * SR):int(T('stairs') * SR)] = 0
place(sfx, T('elevator', 'ding'), ding(1318.5, 0.6) + np.pad(ding(1046.5, 0.8), (int(0.18 * SR), 0))[:int(SR * 0.6)], 0.8)
place(sfx, T('elevator', 'scratch'), scratch(), 1.0)
place(sfx, T('elevator', 'scratch') + 0.3, lowpass(noise(0.8), 300) * 0.05, 1.0)
# ---- 11. STAIRS: double-time hats, steps on every eighth, riser to the landing
beat(T('stairs'), T('slip'), ['kick', 'clap', 'hat', 'double', '808', 'cow'], 1.0)
for k in range(int(DURS['stairs'] / (BEAT / 2))):
    place(sfx, T('stairs') + k * BEAT / 2, step(), 0.45, 0.2 if k % 2 else -0.2)
place(music, T('stairs') + 0.8, riser(1.2, 300, 3500), 0.6)
place(sfx, T('stairs') + 2.0, impact(0.5), 0.5)
# ---- 12. SLIP: run, trip, tape-stop into slow-mo, heartbeat, the catch
beat(T('slip'), T('slip', 'trip'), ['kick', 'hat', '808'], 1.0)
for k in range(3):
    place(sfx, T('slip') + k * 0.12, step(), 0.5)
place(sfx, T('slip', 'trip'), thump(160, 0.12), 0.8)
ts = np.arange(int(0.35 * SR))
tape = np.sin(2 * np.pi * np.cumsum(110 * (1 - ts / len(ts)) ** 1.5) / SR) * np.linspace(1, 0, len(ts)) * 0.4
place(sfx, T('slip', 'trip'), tape, 1.0)
place(sfx, T('slip', 'slowIn'), pad([nf('A2'), nf('E3')], T('slip', 'slowOut') - T('slip', 'slowIn') + 0.2, 0.15))
for k in range(3):
    place(sfx, T('slip', 'slowIn') + 0.1 + k * 0.42, heartbeat(), 0.8)
place(sfx, T('slip', 'slowIn'), whoosh(1.1) * 0.6, 1.0)
place(sfx, T('slip', 'catch'), impact(0.9), 0.9)
place(sfx, T('slip', 'catch'), thump(60, 0.3), 0.8)
beat(T('slip', 'slowOut'), T('deliver'), ['kick', 'hat', '808'], 0.9)
# ---- 13. DELIVER: knock, creak, two stars, tip gone, sad trombone, slam
place(sfx, T('deliver'), lowpass(saw(nf('A1'), DURS['deliver']) * 0.3 + saw(nf('A2'), DURS['deliver']) * 0.1, 400, 65) * env(int(SR * DURS['deliver']), 0.2, 0.1, 0.8, 0.4, DURS['deliver'] - 0.8), 0.6)
for k in range(3):
    place(sfx, T('deliver', 'knock') + k * 0.13, knock(), 0.9, 0.2)
place(sfx, T('deliver', 'open'), band(noise(0.4), 600, 2500, 65) * np.sin(np.linspace(0, np.pi, int(0.4 * SR))) * 0.12, 1.0)
place(sfx, T('deliver', 'stars'), ding(1760, 0.3), 0.5)
place(sfx, T('deliver', 'stars') + 0.07, ding(1760, 0.3), 0.5)
place(sfx, T('deliver', 'stars') + 0.3, thump(70, 0.2), 0.5)
place(sfx, T('deliver', 'tip'), phone_ping(), 0.8)
place(sfx, T('deliver', 'zero') - 0.05, trombone([nf('D4'), nf('C#4'), nf('C4'), nf('B3')], 0.22), 1.0)
place(sfx, T('deliver', 'slam'), thump(70, 0.35), 1.4)
place(sfx, T('deliver', 'slam'), band(noise(0.2), 200, 3000, 33) * expdec(0.2, 30), 0.5)
# ---- 14. TITLE: the drop
place(music, T('title') - 0.6, riser(0.6, 300, 4000), 0.7)
place(music, T('title', 'drop'), impact(2.2), 1.2)
beat(T('title'), T('stinger'), ['kick', 'clap', 'hat', 'roll', 'open', '808', 'cow'], 1.1)
place(music, T('title', 'drop'), pad([nf('A3'), nf('C4'), nf('E4'), nf('A4')], DURS['title'] + 0.4, 0.14))
place(sfx, T('title', 'cta'), ding(2637, 0.5), 0.35)
# ---- 15. STINGER: quiet hallway, ping, the groan
i0 = int(T('stinger') * SR)
music[i0:] *= np.clip(1 - np.arange(N - i0) / (0.12 * SR), 0, 1)[:, None]
place(music, T('stinger'), lowpass(noise(DURS['stinger']), 200) * 0.03, 1.0)
place(sfx, T('stinger', 'ping'), phone_ping(), 0.9)
place(music, T('stinger', 'look'), bass808(nf('A1') * 2, 0.9), 0.8)
place(sfx, T('stinger', 'groan'), lowpass(saw(95, 0.8) * np.linspace(1, 0.6, int(0.8 * SR)), 500, 65) * env(int(0.8 * SR), 0.1, 0.1, 0.8, 0.3, 0.3) * 0.6, 1.0)

# ------------------------------------------------------------------ mix: duck music under the slow-mo / Kyle, short room reverb, master
duck = np.ones(N)
for a, b, lv in ((T('traffic', 'miss') - 0.3, T('traffic', 'miss') + 0.3, 0.35), (T('slip', 'slowIn'), T('slip', 'slowOut'), 0.0), (T('deliver'), T('title') - 0.6, 0.25)):
    i0, i1 = int(a * SR), int(b * SR)
    ramp = int(0.04 * SR)
    duck[i0:i1] = lv
    duck[max(0, i0 - ramp):i0] = np.linspace(1, lv, len(duck[max(0, i0 - ramp):i0]))
    duck[i1:i1 + ramp] = np.linspace(lv, 1, len(duck[i1:i1 + ramp]))
# (the slow-mo pad, Kyle bed and trombone live on the sfx bus, so the duck leaves them alone)
music *= duck[:, None]
ir = rng.standard_normal(int(0.9 * SR)) * np.exp(-np.arange(int(0.9 * SR)) / SR * 5.5) * 0.05
mix = music * 0.85 + sfx * 0.9
for c in range(2):
    mix[:, c] += fft_conv(mix[:, c], ir) * 0.35
mix = np.tanh(mix * 1.1) * 0.9
mix /= max(1e-6, np.abs(mix).max()) / 0.95
out = sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'wrote {out} {DUR:.1f}s')
