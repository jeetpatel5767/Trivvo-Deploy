"""Trivvo product film soundtrack, synthesised from nothing (no samples).

    pip install numpy scipy && python3 audio.py      -> out/soundtrack.wav (48 kHz stereo, -14 LUFS)

120 BPM in F major. Cue times mirror index.html; change them together.
"""
import os
import json
import subprocess
import wave

import numpy as np
import scipy.signal as ss

SR = 48000
DUR = 60.0
N = int(SR * (DUR + 1.0))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
rng = np.random.default_rng(11)


# ---------------------------------------------------------------- primitives
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def ns(sec): return int(sec * SR)
def tt(n): return np.arange(n) / SR
def noise(n): return rng.standard_normal(n)
def att(n, a): return np.clip(tt(n) / a, 0, 1)
def nz(x): return x / (np.max(np.abs(x)) + 1e-12)


def sine(f, n, ph=0.0):
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * tt(n) + ph)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)


def filt(x, kind, f, order=2):
    return ss.sosfilt(ss.butter(order, f, kind, fs=SR, output='sos'), x)


def sweep_bp(x, f0, f1, q=1.4, chunk=256):
    out, zi, n = np.empty_like(x), None, len(x)
    for s in range(0, n, chunk):
        fc = f0 * (f1 / f0) ** (s / max(1, n - 1))
        bw = fc / q
        sos = ss.butter(2, [max(40, fc - bw / 2), min(SR / 2 - 500, fc + bw / 2)], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s:s + chunk], zi = ss.sosfilt(sos, x[s:s + chunk], zi=zi)
    return out


BUS = {k: np.zeros((2, N)) for k in ('pad', 'keys', 'bass', 'drums', 'sfx', 'rev')}
KICKS = []


def put(bus, t, sig, pan=0.0, gain=1.0, send=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        th = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
    j = min(N, i + sig.shape[1])
    seg = sig[:, :j - i] * gain
    BUS[bus][:, i:j] += seg
    if send:
        BUS['rev'][:, i:j] += seg * send


# ---------------------------------------------------------------- sound design
def s_drop(f0=520):
    """Water drop: a sine whose pitch springs upward as it decays."""
    n = ns(0.32); t = tt(n)
    f = f0 * (1 + 1.5 * (1 - np.exp(-t / 0.011)))
    a = (1 - np.exp(-t / 0.0015)) * np.exp(-t / 0.06)
    return nz((sine(f, n) + 0.18 * sine(2 * f, n)) * a)


def s_click():
    """Premium UI click: a low wooden thock with a tiny bright edge."""
    n = ns(0.08); t = tt(n)
    return nz(0.85 * sine(165, n) * np.exp(-t / 0.016) * att(n, 0.0008)
              + 0.3 * sine(2350, n) * np.exp(-t / 0.0035)
              + 0.2 * filt(noise(n), 'high', 1800) * np.exp(-t / 0.0012))


def s_marble(f0=2000):
    """Glass marble tap: inharmonic partials, a click transient and a small bounce."""
    n = ns(0.7); t = tt(n); out = np.zeros(n)
    for r, a, tau in ((1, 1, .16), (2.31, .42, .085), (3.98, .2, .05), (6.1, .09, .03)):
        out += a * sine(f0 * r, n, rng.uniform(0, 6.28)) * np.exp(-t / tau)
    out *= att(n, 0.0004)
    out += 0.3 * filt(noise(n), 'band', [2500, 9000]) * np.exp(-t / 0.0009)
    out += 0.45 * sine(f0 / 5.5, n) * np.exp(-t / 0.022)
    k = ns(0.021); out[k:] += out[:n - k].copy() * 0.3
    return nz(out)


def s_boom(f1=66, f2=40, tau=0.5):
    """Sub impact: a falling sine felt more than heard, plus a soft low thud."""
    n = ns(2.4); t = tt(n)
    f = f2 + (f1 - f2) * np.exp(-t / 0.22)
    s = sine(f, n) * att(n, 0.004) * np.exp(-t / tau) + 0.5 * filt(noise(n), 'low', 160) * np.exp(-t / 0.05)
    return nz(np.tanh(1.6 * s))


def s_whoosh(dur=0.7, f0=260, f1=2600, pan0=-0.6, pan1=0.6):
    n = ns(dur); t = tt(n) / dur
    y = sweep_bp(noise(n), f0, f1) * np.sin(np.pi * np.clip(t, 0, 1) ** 0.75) ** 2
    y = nz(y); th = (pan0 + (pan1 - pan0) * t + 1) * np.pi / 4
    return np.vstack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2)


def s_swish(dur=0.3): return s_whoosh(dur, 1300, 5200, -0.3, 0.3)


def s_riser(dur):
    n = ns(dur); t = tt(n) / dur
    y = nz(sweep_bp(noise(n), 300, 7500, q=2.0) * t ** 2.4) + 0.3 * sine(110 * 8 ** t, n) * t ** 2.2
    y[-ns(0.012):] *= np.linspace(1, 0, ns(0.012))
    return nz(y)


def s_thump():
    n = ns(0.35); t = tt(n); f = 58 + 40 * np.exp(-t / 0.03)
    return nz(sine(f, n) * att(n, 0.002) * np.exp(-t / 0.09) + 0.35 * filt(noise(n), 'low', 260) * np.exp(-t / 0.018))


def s_tick(f=1900):
    n = ns(0.04); t = tt(n)
    return nz(0.6 * sine(f, n) * np.exp(-t / 0.003) + 0.4 * sine(f / 3, n) * np.exp(-t / 0.006))


def s_step():
    n = ns(0.15); t = tt(n)
    return nz(0.5 * filt(noise(n), 'low', 420) * np.exp(-t / 0.022) + 0.6 * sine(72, n) * np.exp(-t / 0.04) * att(n, 0.002))


def s_ping(m, tau=0.6):
    n = ns(tau * 5); t = tt(n); f = mf(m)
    return (sine(f, n) + 0.12 * sine(2 * f, n) * np.exp(-t / 0.1)) * att(n, 0.003) * np.exp(-t / tau)


def s_chime(big=False):
    """The app's reward chime (RewardMoment.tsx), optionally with an octave halo."""
    n = ns(2.4 if big else 1.2); out = np.zeros(n)
    for f, at in ((880, 0), (1318.5, 0.12)):
        k = ns(at); m = n - k; t = tt(m)
        fall = 0.9 if big else 0.5
        g = np.where(t < 0.02, 0.18 * t / 0.02, 0.18 * (0.0001 / 0.18) ** ((t - 0.02) / fall))
        out[k:] += g * sine(f, m)
        if big:
            out[k:] += 0.3 * g * sine(2 * f, m) * np.exp(-t / 0.3) + 0.3 * g * sine(f / 2, m)
    return nz(out)


def s_shimmer(base=84, count=6, spread=0.5):
    steps = [0, 2, 4, 7, 9, 12, 14, 16, 19]; n = ns(spread + 3); out = np.zeros(n)
    for i in range(count):
        k = ns(i * spread / count); p = s_ping(base + steps[i % len(steps)], 0.45)
        out[k:k + len(p)] += p[:n - k] * 0.9 ** i
    return nz(out)


def s_tom(f=96):
    n = ns(0.6); t = tt(n)
    return nz(sine(f * (1 + 0.5 * np.exp(-t / 0.05)), n) * att(n, 0.002) * np.exp(-t / 0.22))


# ---------------------------------------------------------------- instruments
def i_pad(midis, dur, cut=1800):
    n = ns(dur + 1.6); t = tt(n); L = np.zeros(n); R = np.zeros(n)
    for m in midis:
        f = mf(m)
        for cents, side in ((-8, 'L'), (0, 'C'), (8, 'R')):
            saw = 2 * ((f * 2 ** (cents / 1200) * t + rng.uniform()) % 1) - 1
            if side == 'L': L += saw
            elif side == 'R': R += saw
            else: L += 0.7 * saw; R += 0.7 * saw
    env = np.clip(t / 0.7, 0, 1) * np.clip((dur + 1.6 - t) / 1.6, 0, 1)
    return np.vstack([filt(L, 'low', cut) * env, filt(R, 'low', cut) * env]) / (len(midis) * 2)


def i_keys(m, vel=1.0, length=None):
    n = ns(2.4); t = tt(n); f = mf(m)
    s = (sine(f, n) * np.exp(-t / 1.1) + 0.3 * sine(2 * f, n) * np.exp(-t / 0.35) + 0.08 * sine(3 * f, n) * np.exp(-t / 0.12)) * att(n, 0.004)
    s += 0.05 * filt(noise(n), 'low', 1500) * np.exp(-t / 0.004)
    if length:
        s *= np.clip((length + 0.08 - t) / 0.08, 0, 1)
    return s * vel


def i_marimba(m, vel=1.0):
    n = ns(1.3); t = tt(n); f = mf(m)
    return vel * (sine(f, n) * np.exp(-t / 0.38) + 0.3 * sine(3.93 * f, n) * np.exp(-t / 0.05)
                  + 0.07 * sine(9.2 * f, n) * np.exp(-t / 0.018)) * att(n, 0.0015)


def i_bass(m, dur, vel=1.0):
    n = ns(dur + 0.08); t = tt(n); f = mf(m)
    env = att(n, 0.006) * (0.72 + 0.28 * np.exp(-t / 0.12)) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return vel * np.tanh(1.7 * (sine(f, n) + 0.22 * sine(2 * f, n)) * env) / np.tanh(1.7)


KICK = (lambda n: np.tanh(1.5 * (sine(50 + 120 * np.exp(-tt(n) / 0.034), n) * att(n, 0.001) * np.exp(-tt(n) / 0.24)
                                 + 0.22 * filt(noise(n), 'low', 3200) * np.exp(-tt(n) / 0.002))))(ns(0.6))
KICK_SOFT = filt(KICK, 'low', 260)


def _snap():
    n = ns(0.4); t = tt(n); env = np.zeros(n)
    for d in (0, 0.009, 0.018):
        k = ns(d); env[k:] += np.exp(-tt(n - k) / 0.004) * 0.6
    env += np.exp(-t / 0.085) * att(n, 0.019) * 0.9
    return nz(filt(noise(n), 'band', [1200, 5200]) * env + 0.3 * sine(205, n) * np.exp(-t / 0.03))


SNAP = _snap()
SHAKER = nz(filt(noise(ns(0.09)), 'high', 5500) * att(ns(0.09), 0.006) * np.exp(-tt(ns(0.09)) / 0.028))


def kick(t, vel=1.0, soft=False):
    put('drums', t, KICK_SOFT if soft else KICK, gain=vel)
    if not soft:
        KICKS.append((t, vel))


# ---------------------------------------------------------------- music
BAR = 2.0
CH = {'Fmaj7': [57, 60, 64, 67], 'Fmaj9': [57, 60, 64, 67, 72], 'Dm9': [53, 57, 60, 64], 'Bbmaj7': [53, 57, 60, 62],
      'Bbmaj9': [53, 57, 60, 62, 65], 'C6': [52, 55, 57, 62], 'Gm9': [53, 57, 58, 62], 'A7sus': [57, 62, 64, 67]}
ROOT = {'Fmaj7': 41, 'Fmaj9': 41, 'Dm9': 38, 'Bbmaj7': 34, 'Bbmaj9': 34, 'C6': 36, 'Gm9': 31, 'A7sus': 33}
MAIN = ['Fmaj7', 'Dm9', 'Bbmaj7', 'C6']
HOOK = [(0, 81), (0.75, 84), (1.5, 81), (2, 79), (2.5, 77), (3.5, 72), (4, 74), (4.75, 77), (5.5, 81), (6.5, 79), (7, 77),
        (8, 77), (8.75, 81), (9.5, 84), (10, 86), (10.5, 84), (11.5, 81), (12, 79), (12.75, 81), (13.5, 79), (14, 76), (15, 72)]
BASS_MAIN = [(0, .22, 0), (.375, .12, 0), (.75, .22, 12), (1.0, .22, 0), (1.375, .12, 0), (1.75, .2, 7)]


def pad(t, name, dur=BAR, cut=1800, gain=1.0, extra=()):
    put('pad', t, i_pad(CH[name] + list(extra), dur, cut), gain=gain, send=0.22)


def strum(t, notes, vel, gap=0.016, length=None):
    for k, m in enumerate(notes):
        put('keys', t + k * gap, i_keys(m, vel, length), pan=-0.25 + 0.5 * k / max(1, len(notes) - 1), send=0.3)


def groove(t0, t1, four=False):
    t = t0
    while t < t1 - 1e-6:
        b = int(round((t - 16) / BAR))
        hits = (0, .5, 1.0, 1.5) if four else ((0, 1.0, 1.375, 1.75) if b % 2 else (0, 1.0, 1.375))
        for h in hits:
            kick(t + h, 0.95 if h in (0, 1.0) else 0.7)
        for h in (.5, 1.5):
            put('drums', t + h, SNAP, gain=0.42, send=0.35)
        for k in range(16):
            put('drums', t + k * .125, SHAKER, pan=0.35, gain=(.08, .03, .12, .03)[k % 4])
        t += BAR


def bassline(t0, names, pattern=BASS_MAIN, vel=0.85, eighths=False):
    for i, nm in enumerate(names):
        r = ROOT[nm]; tb = t0 + i * BAR
        if eighths:
            for k in range(8):
                put('bass', tb + k * .25, i_bass(r + (12 if k % 2 else 0), .18, vel * (1 if k % 2 == 0 else .55)))
        else:
            for st, d, iv in pattern:
                put('bass', tb + st, i_bass(r + iv, d, vel))


def music():
    # intro: the pink fills the screen, the number counts
    pad(0.9, 'Fmaj9', 2.9, cut=1900, gain=.8)
    pad(3.8, 'Bbmaj9', 2.4, cut=1800, gain=.75)
    put('bass', 0.95, i_bass(41, 2.7, .5)); put('bass', 3.8, i_bass(34, 2.1, .45))
    strum(2.65, [65, 69, 72, 76], .32); strum(4.5, [62, 65, 69, 72], .26)
    # the problem: darker, a muffled heartbeat
    for k, nm in enumerate(['Dm9', 'Bbmaj7', 'Gm9', 'Dm9']):
        pad(6 + k * BAR, nm, cut=1300, gain=.85)
    pad(14, 'A7sus', 1.9, cut=1600, gain=.85)
    for b in range(4):
        tb = 6 + b * BAR
        kick(tb, .55, soft=True); kick(tb + .25, .35, soft=True)
        for k in range(8):
            put('bass', tb + k * .25, i_bass(ROOT[['Dm9', 'Bbmaj7', 'Gm9', 'Dm9'][b]], .16, .32 if k % 2 else .42))
    for k in range(8):
        put('bass', 14 + k * .25, i_bass(33, .16, .3 + .05 * k))
    # the drop: full groove from the turn to the end of the hunter chapters
    for k in range(11):
        pad(16 + k * BAR, MAIN[k % 4], cut=2600 if k < 2 else 3200, gain=.75)
    groove(16, 38)
    bassline(16, [MAIN[k % 4] for k in range(11)])
    for ph in (20, 28, 36):
        for beat, m in HOOK:
            tm = ph + beat * .5
            if tm < 38:
                put('keys', tm, i_marimba(m, .55), pan=.2, send=.3)
    for k in range(6):  # off-beat stabs under "do the task" and "get paid"
        tb = 26 + k * BAR; nm = MAIN[(k + 1) % 4]
        for h in (.75, 1.75):
            strum(tb + h, [x + 12 for x in CH[nm][:3]], .14, gap=.006, length=.18)
    # businesses: darker and driving
    biz = ['Dm9', 'Bbmaj7', 'Gm9', 'C6', 'Dm9']
    for k, nm in enumerate(biz):
        pad(38 + k * BAR, nm, cut=2000, gain=.75)
    groove(38, 48, four=True)
    bassline(38, biz, eighths=True, vel=.8)
    for k, nm in enumerate(biz):
        tones = CH[nm]
        for j in range(16):
            put('keys', 38 + k * BAR + j * .125, i_marimba(tones[j % len(tones)] + 12, .16), pan=(-.35, .35)[j % 2], send=.25)
    # every place: bright again, a break before the end card
    icons = ['Fmaj7', 'C6', 'Bbmaj9']
    for k, nm in enumerate(icons):
        pad(48 + k * BAR, nm, BAR if k < 2 else 1.5, cut=3200, gain=.75)
    groove(48, 53.5)
    bassline(48, icons[:2]); bassline(52, ['Bbmaj9'], pattern=BASS_MAIN[:4])
    # end card
    pad(54, 'Fmaj9', 5.2, cut=2400, gain=.9)
    put('bass', 54.0, i_bass(41, 3.4, .6))
    pad(57.45, 'Fmaj9', 2.2, cut=2600, gain=.55, extra=(76, 79))
    strum(57.45, [65, 69, 72, 76, 81], .3, gap=.03)


# ---------------------------------------------------------------- sound effects, on the picture's cues
def count_ticks(a, d, to, step):
    return [(a + (1 - (1 - k * step / to) ** (1 / 3)) * d, k) for k in range(1, int(to // step) + 1)]


def feed_off(t):
    o = 140 * max(0, t - 6)
    if t > 7.6:
        u = min(1, t - 7.6); o += 2460 * u ** 3 / 3
        if t > 8.6: o += 2460 * (t - 8.6)
    return o


PENT = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96]


def sfx():
    S = lambda t, sig, g, pan=0.0, send=0.15: put('sfx', t, sig, pan, g, send)
    # A: cold open
    S(0.58, s_drop(560), .55, 0, .35)
    S(0.95, s_boom(48, 30, .5), .55); S(0.95, s_whoosh(.8, 120, 900, -.2, .2), .18)
    for tm, k in count_ticks(1.35, 1.3, 150, 10):
        S(tm, s_tick(1500 + k * 60), .16, (k % 2) * .2 - .1)
    S(2.65, s_boom(), .8); S(2.65, s_marble(1700), .45, 0, .3); S(2.7, s_chime(), .42, 0, .45)
    S(3.0, s_swish(.35), .08); S(4.3, s_swish(.25), .06)
    S(4.48, s_drop(380), .5, .1, .3)
    S(5.8, s_whoosh(.75, 200, 2400), .32)
    # B: shops
    S(6.4, s_thump(), .35)
    prev, t = feed_off(6.2) // PITCH_PX, 6.2
    while t < 9.2:
        k = feed_off(t) // PITCH_PX
        if k != prev:
            S(t, s_tick(2400), .07 if t < 7.6 else .1, .45); prev = k
        t += 0.001
    S(7.55, s_whoosh(1.2, 300, 4000, .5, .8), .25); S(8.0, s_thump(), .32); S(8.5, s_swish(.35), .14)
    S(9.2, s_whoosh(.5, 400, 1500, .4, .9), .14)
    # C: people
    for i in range(22):
        S(9.7 + i * .03, s_tick(1100 + (i % 5) * 90), .06, (i % 7) / 3.5 - 1)
    for i in range(10):
        S(10.0 + i * .25, s_step(), .2, (-.15, .15)[i % 2])
    S(10.05, s_thump(), .3); S(11.65, s_thump(), .3); S(12.1, s_swish(.35), .14)
    # D: the gap
    S(12.4, s_whoosh(.6, 200, 2000), .28); S(12.75, s_thump(), .38); S(14.15, s_thump(), .38)
    S(13.95, s_riser(2.0), .38, 0, .2)
    # E: the turn
    S(16.0, s_boom(70, 30, .8), 1.0); S(16.0, s_marble(1300), .5, 0, .4); S(16.0, s_shimmer(84, 7, .6), .22, 0, .6)
    for r in range(22):
        S(16.21 + r * .04, s_drop(mf(PENT[min(r // 2, 13)]) / 1.7), .26, ((r * 7) % 11) / 5.5 - 1, .4)
    S(17.15, s_whoosh(.7, 150, 1800), .3)
    S(17.45, s_marble(1500), .42, -.2, .35); S(17.65, s_marble(2000), .38, .2, .35)
    S(17.85, s_shimmer(88, 6, .4), .18, 0, .6); S(18.45, s_swish(.3), .08)
    S(19.65, s_whoosh(.7, 220, 2400), .3)
    # F: 01 show up
    S(20.15, s_click(), .35); S(20.1, s_whoosh(.7, 150, 1200, .4, .2), .2)
    S(20.5, s_drop(480), .45, .3, .3); S(21.0, s_swish(.6), .06, .3); S(21.35, s_swish(.4), .12, .3)
    S(22.55, s_click(), .55, .3, .1)
    S(22.8, s_whoosh(.35, 400, 2600, .2, .4), .15)
    S(22.98, s_click(), .3, .1); S(23.04, s_click(), .25, .5)
    S(23.2, s_whoosh(.8, 900, 2400, .1, .5), .09)
    S(24.2, s_drop(420), .45, .3, .3); S(24.35, s_marble(2200), .38, .3, .3); S(24.45, s_chime(), .22, .3, .4)
    S(25.75, s_whoosh(.7, 220, 2400), .28)
    # G: 02 do the task
    S(26.2, s_click(), .3); S(26.3, s_thump(), .3)
    for i in range(3):
        S(26.5 + i * .12, s_click(), .18, .4)
    for i, tk in enumerate((27.5, 28.5, 29.5)):
        S(tk, s_click(), .5, .35); S(tk + .02, s_marble((1600, 1900, 2400)[i]), .36, .35, .3)
    S(30.15, s_shimmer(86, 6, .45), .2, .3, .6)
    S(31.3, s_whoosh(.55, 1800, 300, .3, -.3), .22)
    # H: 03 get paid
    S(32.15, s_click(), .3); S(32.25, s_thump(), .3)
    S(32.6, s_boom(66, 32, .6), .8); S(32.6, s_marble(1500), .42, .3, .35)
    for tm, k in count_ticks(32.9, 1.0, 150, 10):
        S(tm, s_tick(1500 + k * 60), .14, .3)
    S(33.9, s_chime(big=True), .55, .25, .5); S(33.9, s_marble(2600), .3, .25, .3)
    S(34.35, s_swish(.3), .07)
    S(35.1, s_ping(84, .25), .3, .4, .4); S(35.19, s_ping(91, .3), .26, .4, .4); S(35.1, s_click(), .2, .4)
    S(36.9, s_swish(.3), .08, .4)
    S(37.4, s_whoosh(.75, 120, 1500), .36); S(37.4, s_boom(55, 30, .5), .45)
    # I: businesses
    S(38.15, s_thump(), .45)
    S(39.55, s_swish(.35), .1); S(39.8, s_click(), .25)
    for i in range(3):
        S(39.95 + i * .25, s_thump(), .2, (i - 1) * .5)
    S(40.95, s_drop(360), .45, -.5, .3)
    S(41.4, s_click(), .32); S(41.42, s_marble(1800), .22, 0, .2); S(41.65, s_click(), .32); S(41.67, s_marble(2300), .22, 0, .2)
    S(42.3, s_click(), .55, .5); S(42.45, s_marble(2100), .38, .5, .3); S(42.5, s_shimmer(84, 4, .3), .12, .5, .5)
    S(43.15, s_swish(.4), .12)
    S(43.45, s_thump(), .35)
    for tm, k in count_ticks(43.5, 1.1, 412, 34):
        S(tm, s_tick(1600 + k * 40), .1)
    S(44.85, s_swish(.35), .1)
    S(45.0, s_thump(), .4); S(45.7, s_whoosh(.22, 2500, 6000, -.4, .4), .14); S(45.95, s_thump(), .4); S(46.8, s_click(), .25)
    S(47.5, s_whoosh(.65, 200, 2400), .3)
    # J: every place
    for i in range(12):
        S(48.125 + i * .125, s_drop(mf(PENT[i]) / 1.6), .3, ((i * 5) % 11) / 5.5 - 1, .3)
    for i, tw in enumerate((49.6, 50.1, 50.6, 51.1)):
        S(tw, s_marble((1500, 1700, 1900, 2250)[i]), .26, 0, .25)
    S(51.9, s_swish(.3), .08); S(52.25, s_thump(), .4); S(52.85, s_swish(.35), .14)
    S(52.6, s_riser(1.4), .3, 0, .2); S(53.4, s_whoosh(.6, 200, 2000), .25)
    # K: end card
    S(54.0, s_boom(64, 28, .9), 1.0); S(54.0, s_shimmer(77, 7, .7), .2, 0, .7)
    S(54.1, s_marble(1300), .4, -.2, .4); S(54.3, s_marble(1750), .36, .2, .4); S(54.45, s_shimmer(89, 6, .35), .14, 0, .6)
    for i in range(3):
        S(55 + i * .5, s_marble((1500, 1800, 2250)[i]), .36, 0, .35); S(55 + i * .5, s_tom((98, 110, 131)[i]), .45)
    S(56.6, s_swish(.3), .07)
    S(57.45, s_boom(55, 30, 1.0), .6); S(57.45, s_chime(big=True), .55, 0, .6); S(57.5, s_shimmer(84, 8, .9), .16, 0, .7)


PITCH_PX = 270


# ---------------------------------------------------------------- mix
def rms_db(x, a, b):
    seg = x[:, ns(a):ns(b)]
    return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)


def main(out_dir=OUT, sfx_fn=None):
    music(); (sfx_fn or sfx)()
    # sidechain: pads, keys and bass breathe with the kick
    env = np.zeros(N)
    for t, v in KICKS:
        i = ns(t); n = min(N - i, ns(0.5)); x = tt(n)
        env[i:i + n] = np.maximum(env[i:i + n], v * np.exp(-x / 0.16) * np.clip(x / 0.005, 0, 1))
    duck = 1 - 0.45 * np.clip(env, 0, 1)
    BUS['pad'] *= duck; BUS['keys'] *= 1 - 0.25 * np.clip(env, 0, 1); BUS['bass'] *= 1 - 0.55 * np.clip(env, 0, 1)

    # balance by level in the main section, relative to the drums
    targets = {'drums': -17.0, 'bass': -20.5, 'pad': -24.5, 'keys': -24.0}
    for k, db in targets.items():
        BUS[k] *= 10 ** ((db - rms_db(BUS[k], 16, 38)) / 20)
    BUS['sfx'] *= 1.15 * np.max(np.abs(BUS['drums'])) / np.max(np.abs(BUS['sfx']))

    # reverb: a 2.6 s decorrelated noise tail, darkened, with 18 ms pre-delay
    n = ns(2.6); x = tt(n); ir = []
    for _ in range(2):
        h = filt(noise(n) * np.exp(-x / 0.55), 'low', 5500); h[:ns(0.018)] = 0; ir.append(h / np.sqrt(np.sum(h ** 2)))
    wet = np.vstack([ss.fftconvolve(BUS['rev'][c], ir[c])[:N] for c in range(2)])
    wet = np.vstack([filt(filt(w, 'high', 180), 'low', 8000) for w in wet])
    wet *= 0.5 * np.max(np.abs(BUS['drums'])) / (np.max(np.abs(wet)) + 1e-12)

    m = BUS['pad'] + BUS['keys'] + BUS['bass'] + BUS['drums'] + BUS['sfx'] + wet
    # tone: trim the felt-not-heard sub, open up the top so clicks and taps cut through
    m = np.vstack([filt(c, 'high', 40) for c in m])
    m = m + 0.75 * np.vstack([filt(c, 'high', 2500) for c in m]) + 0.6 * np.vstack([filt(c, 'high', 7000) for c in m])
    m = np.tanh(1.25 * m / np.max(np.abs(m)))       # gentle soft clip on the loudest peaks
    fade = np.ones(N); a, b = ns(59.0), ns(60.0); fade[a:b] = np.linspace(1, 0, b - a) ** 2; fade[b:] = 0
    m = m * fade * (0.89 / np.max(np.abs(m)))

    os.makedirs(out_dir, exist_ok=True)
    raw = os.path.join(out_dir, 'soundtrack-raw.wav')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(m.T, -1, 1) * 32767).astype('<i2').tobytes())

    # two-pass loudness normalisation to streaming level
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    meas = json.loads(p.stderr[p.stderr.rfind('{'):p.stderr.rfind('}') + 1])
    af = ('loudnorm=I=-14:TP=-1.0:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:'
          'measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}').format(**meas)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-t', str(DUR),
                    os.path.join(out_dir, 'soundtrack.wav')], check=True)
    print('input loudness', meas['input_i'], 'LUFS, peak', meas['input_tp'], 'dBTP')


if __name__ == '__main__':
    main()
