"""Trivvo film v2 soundtrack: v1's score and sound engine, with sound design re-cued to v2's picture.

    python3 v2/audio.py      -> v2/out/soundtrack.wav
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))

import audio as A  # noqa: E402
from audio import (count_ticks, mf, s_boom, s_chime, s_click, s_drop, s_marble, s_ping, s_riser,  # noqa: E402
                   s_shimmer, s_step, s_swish, s_thump, s_tick, s_tom, s_whoosh)

PENT = A.PENT


def roll_ticks(starts, lands, digits):
    """One soft ratchet tick each time an odometer column passes a digit (same easing as odo())."""
    out = []
    for k, d in enumerate(digits):
        fin, a, l = 20 + d, starts[k], lands[k]
        prev, t = 0, a
        while t < l:
            p = (t - a) / (l - a)
            pos = int(fin * (1 - (1 - p) ** 5))
            if pos != prev:
                out.append((t, k)); prev = pos
            t += 0.001
    return out


def wall_off(t):
    o = 260 * max(0, t - 4.5)
    if t > 7.2:
        u = min(1, (t - 7.2) / .8); o += 4000 * .8 * u ** 3 / 3
        if t > 8: o += 4000 * (t - 8)
    return o


def sfx2():
    S = lambda t, sig, g, pan=0.0, send=0.15: A.put('sfx', t, sig, pan, g, send)
    # 1 · the drop, the money
    S(0.7, s_drop(560), .6, 0, .4); S(0.78, s_drop(980), .14, -.3, .4); S(0.86, s_drop(1180), .1, .3, .4)
    S(0.95, s_boom(48, 30, .5), .55); S(0.95, s_whoosh(.9, 120, 900, -.2, .2), .2)
    S(1.0, s_swish(.3), .07)
    for tm, k in roll_ticks([1.15] * 3, [2.0, 2.25, 2.5], [1, 5, 0]):
        S(tm, s_tick(1700 + k * 260), .045, (k - 1) * .35)
    S(2.0, s_click(), .32, -.35); S(2.25, s_click(), .32, 0)
    S(2.5, s_boom(), .8); S(2.5, s_marble(1700), .45, .3, .3); S(2.55, s_chime(), .42, 0, .45)
    S(2.85, s_swish(.4), .07); S(3.8, s_swish(.3), .05); S(4.3, s_swish(.4), .07); S(4.3, s_drop(380), .45, 0, .3)
    S(4.55, s_whoosh(.85, 150, 3200), .38); S(5.3, s_thump(), .3)
    # 2 · the ad wall
    for i in range(5):
        S(5.5 + i * .11, s_whoosh(.35, 200, 900, -.2, .2), .1)
    prev, t = wall_off(4.6) // 250, 4.6
    while t < 9.1:
        k = wall_off(t) // 250
        if k != prev:
            S(t, s_tick(2300), .05 if t < 7.2 else .07, .5 if int(k) % 2 else .2); prev = k
        t += 0.001
    S(7.15, s_whoosh(.45, 300, 2600), .22); S(7.2, s_whoosh(1.1, 300, 5200, .4, .9), .28)
    for i in range(5):
        S(7.5 + i * .07, s_swish(.25), .06, .4)
    S(8.15, s_swish(.35), .14)
    S(9.0, s_whoosh(.75, 200, 1800, .6, -.2), .26)
    # 3 · the city
    for i in range(22):
        S(9.75 + i * .03, s_tick(1100 + (i % 5) * 90), .05, (i % 7) / 3.5 - 1)
    for i in range(10):
        S(10.0 + i * .26, s_step(), .2, (-.15, .15)[i % 2])
    for i in range(20):
        S(10.0 + i * .13, s_tick(2600), .025, -.6)
    S(10.05, s_thump(), .3); S(11.65, s_thump(), .3); S(12.1, s_swish(.35), .14); S(12.2, s_tom(92), .3, -.5)
    for tm in (13.80, 13.95, 14.07, 15.07, 15.28, 15.45):
        S(tm, s_thump(), .34)
    S(14.7, s_whoosh(.45, 1800, 250), .16); S(15.62, s_whoosh(.4, 1800, 250), .14)
    S(13.95, s_riser(2.0), .38, 0, .2); S(15.6, s_drop(1400), .12, 0, .3)
    S(16.0, s_boom(70, 30, .8), 1.0); S(16.0, s_drop(560), .5, 0, .4); S(16.0, s_marble(1300), .45, 0, .4)
    S(16.0, s_shimmer(84, 7, .6), .22, 0, .6)
    for r in range(22):
        S(16.1 + r * .035, s_drop(mf(PENT[min(r // 2, 13)]) / 1.7), .24, ((r * 7) % 11) / 5.5 - 1, .4)
    S(17.0, s_whoosh(.75, 150, 1800), .3)
    # 4 · pins become the logo
    S(17.15, s_whoosh(1.1, 400, 3000, -.5, .5), .2)
    for i in range(6):
        S(18.1 + i * .05, s_tick(2000 + i * 150), .06, (i - 2.5) / 3)
    S(18.25, s_marble(1500), .42, -.2, .35); S(18.45, s_marble(2000), .38, .2, .35)
    S(18.7, s_shimmer(88, 6, .4), .18, 0, .6); S(19.25, s_swish(.3), .08)
    S(20.25, s_whoosh(.85, 150, 3200), .38); S(21.0, s_thump(), .28)
    # 5 · the phone journey
    S(20.9, s_whoosh(.5, 300, 1500, -.7, -.2), .14); S(20.9, s_whoosh(.5, 300, 1500, .7, .2), .14)
    S(21.15, s_drop(480), .45, 0, .3); S(21.5, s_swish(.6), .06); S(21.8, s_swish(.4), .12)
    S(22.9, s_click(), .55, 0, .1); S(23.15, s_whoosh(.35, 400, 2600), .15)
    S(23.32, s_click(), .3, -.1); S(23.38, s_click(), .25, .1); S(23.5, s_whoosh(.8, 900, 2400), .09)
    S(24.45, s_drop(420), .45, 0, .3); S(24.55, s_marble(2200), .38, 0, .3); S(24.65, s_chime(), .24, 0, .4)
    for i in range(6):
        S(24.62 + i * .03, s_drop(700 + i * 120), .12, (i - 2.5) / 2.5, .3)
    for tsp in (25.65, 31.45):
        S(tsp, s_whoosh(.6, 300, 2800, -.8, .8), .32); S(tsp - .05, s_swish(.3), .08)
    for tin in (26.25, 32.05):
        S(tin, s_whoosh(.5, 300, 1500, -.7, -.2), .13); S(tin, s_whoosh(.5, 300, 1500, .7, .2), .13); S(tin + .1, s_thump(), .25)
    for i in range(3):
        S(26.3 + i * .1, s_click(), .16)
    for i, tk in enumerate((27.5, 28.5, 29.5)):
        S(tk, s_click(), .5); S(tk + .02, s_marble((1600, 1900, 2400)[i]), .36, 0, .3); S(tk + .03, s_drop(900), .1, .3, .3)
    S(30.15, s_shimmer(86, 6, .45), .2, 0, .6)
    S(32.35, s_boom(66, 32, .6), .7); S(32.35, s_marble(1500), .42, 0, .35)
    for tm, k in roll_ticks([32.6] * 3, [33.2, 33.4, 33.6], [1, 5, 0]):
        S(tm, s_tick(1700 + k * 260), .04, (k - 1) * .3)
    S(33.2, s_click(), .25, -.3); S(33.4, s_click(), .25)
    S(33.65, s_chime(big=True), .55, 0, .5); S(33.65, s_marble(2600), .3, 0, .3); S(33.65, s_boom(60, 34, .5), .45)
    S(34.0, s_swish(.3), .07)
    S(35.0, s_ping(84, .25), .3, 0, .4); S(35.09, s_ping(91, .3), .26, 0, .4); S(35.0, s_click(), .2)
    S(36.7, s_swish(.3), .08)
    S(37.35, s_whoosh(.6, 300, 2200, -.6, .6), .3); S(37.75, s_whoosh(.5, 150, 1200), .36); S(38.05, s_boom(55, 30, .5), .5)
    # 6 · for shops
    for tm in (38.49, 38.63, 38.70):
        S(tm, s_thump(), .4)
    S(39.45, s_whoosh(.5, 1800, 200), .2); S(39.85, s_click(), .25); S(39.9, s_whoosh(.7, 200, 1200), .2)
    S(40.5, s_drop(360), .45, -.3, .3)
    for trot, tland in ((41.1, 41.7), (42.2, 42.8)):
        S(trot, s_whoosh(.55, 300, 2200, .6, -.6), .24); S(tland, s_click(), .3)
    S(41.75, s_click(), .3); S(41.77, s_marble(1800), .22, 0, .2); S(41.95, s_click(), .3); S(41.97, s_marble(2300), .22, 0, .2)
    S(42.85, s_click(), .55); S(43.0, s_marble(2100), .38, 0, .3); S(43.05, s_shimmer(84, 4, .3), .12, 0, .5)
    S(43.25, s_swish(.4), .12); S(43.6, s_thump(), .35)
    for i, digits in enumerate(([4, 1, 2], [8, 6], [2, 4])):
        st = [43.7 + i * .1] * len(digits); ld = [44.3 + i * .12 + k * .08 for k in range(len(digits))]
        for tm, k in roll_ticks(st, ld, digits):
            S(tm, s_tick(1600 + i * 300), .03, (i - 1) * .6)
        S(ld[-1], s_click(), .28, (i - 1) * .6)
    S(45.0, s_swish(.35), .1)
    for i in range(5):
        S(45.25 + i * .07, s_swish(.25), .07, .4)
    S(45.85, s_whoosh(.22, 2500, 6000, -.4, .4), .14); S(46.05, s_whoosh(.55, 1600, 200, .3, .8), .22)
    S(46.2, s_swish(.3), .1); S(46.32, s_click(), .25); S(46.9, s_thump(), .35); S(47.1, s_click(), .22)
    S(47.7, s_whoosh(.75, 200, 2400), .3)
    # 7 · every place, and the drop comes home
    for i in range(12):
        S(48.05 + i * .04, s_drop(mf(PENT[i]) / 1.6), .26, ((i * 5) % 11) / 5.5 - 1, .3)
    S(49.1, s_thump(), .32)
    for i, tw in enumerate((49.6, 50.1, 50.6)):
        S(tw, s_marble((1600, 1900, 2250)[i]), .28, 0, .25); S(tw, s_click(), .2)
    S(51.3, s_swish(.3), .08); S(51.6, s_thump(), .4); S(52.25, s_swish(.35), .14)
    S(52.6, s_riser(1.4), .3, 0, .2); S(53.2, s_whoosh(.6, 3200, 250), .28); S(53.7, s_drop(1000), .2, 0, .3)
    S(54.0, s_boom(64, 28, .9), 1.0); S(54.0, s_drop(520), .5, 0, .4); S(54.0, s_shimmer(77, 7, .7), .2, 0, .7)
    S(54.1, s_marble(1300), .4, -.2, .4); S(54.3, s_marble(1750), .36, .2, .4); S(54.45, s_shimmer(89, 6, .35), .14, 0, .6)
    for i in range(3):
        S(55.25 + i * .5, s_marble((1500, 1800, 2250)[i]), .36, 0, .35); S(55.25 + i * .5, s_tom((98, 110, 131)[i]), .45)
    S(56.6, s_swish(.3), .07)
    S(57.45, s_boom(55, 30, 1.0), .6); S(57.45, s_chime(big=True), .55, 0, .6); S(57.5, s_shimmer(84, 8, .9), .16, 0, .7)


if __name__ == '__main__':
    A.main(os.path.join(HERE, 'out'), sfx2)
