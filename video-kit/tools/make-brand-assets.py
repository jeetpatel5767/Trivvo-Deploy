"""Builds the video kit's logo SVGs and reward chime from the app's own source of truth.

    pip install fonttools uharfbuzz
    python3 make-brand-assets.py

Geometry comes from frontend/src/components/Logo.tsx, the chime from
frontend/src/components/RewardMoment.tsx (playChime). Re-run this if either changes.
"""
import math
import os
import struct
import wave

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(HERE, '..', 'brand')
FONT = os.path.join(BRAND, 'fonts', 'PlusJakartaSans-ExtraBold.ttf')

INK, BONE, PINK = '#10231C', '#F4F1EA', '#FF85C7'

# Logo.tsx: "do not alter paths, rotation or stroke width"
MARK_G = (
    '<g transform="translate(-3 2) rotate(12 50 50)" fill="none" stroke-width="16" '
    'stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M16 34 L50 76 L84 34" stroke="{outer}"/>'
    '<path d="M33 23 L50 44 L67 23" stroke="{inner}"/>'
    '</g>'
)
VARIANTS = {
    'default': (INK, PINK, INK),    # outer, inner, wordmark colour
    'reversed': (BONE, PINK, BONE),  # for Ink backgrounds
    'on-pink': (BONE, INK, INK),     # for pink backgrounds
    'mono': (INK, INK, INK),         # below 20px, or single-colour use
}


def wordmark_path(size, x0, box_h):
    """'Trivvo' in ExtraBold at `size`, tracked -0.045em, centred in a box_h-tall line like CSS flex."""
    blob = hb.Blob.from_file_path(FONT)
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str('Trivvo')
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})

    tt = TTFont(FONT)
    upem = tt['head'].unitsPerEm
    scale = size / upem
    asc, desc = tt['hhea'].ascent, tt['hhea'].descent
    # line-height: 1 -> a size-tall inline box; the font's ascent+descent is centred inside it
    baseline = (box_h - size) / 2 + (size - (asc - desc) * scale) / 2 + asc * scale

    glyphs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    pen = SVGPathPen(glyphs)
    x = x0
    tracking = -0.045 * size
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        t = TransformPen(pen, (scale, 0, 0, -scale, x + pos.x_offset * scale, baseline - pos.y_offset * scale))
        glyphs[name].draw(t)
        x += pos.x_advance * scale + tracking
    return pen.getCommands(), x - tracking  # no trailing tracking after the last letter


def svg(w, h, body, label='Trivvo'):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}" '
        f'role="img" aria-label="{label}">{body}</svg>\n'
    )


def write(name, text):
    with open(os.path.join(BRAND, 'logo', name), 'w') as f:
        f.write(text)


def logos():
    for variant, (outer, inner, word) in VARIANTS.items():
        mark = MARK_G.format(outer=outer, inner=inner)
        write(f'mark-{variant}.svg', svg(100, 100, mark))
        # Logo.tsx lockup: gap = 25% of mark width, wordmark at 75% of mark size
        d, end = wordmark_path(75, 125, 100)
        write(f'lockup-{variant}.svg', svg(math.ceil(end) + 2, 100, mark + f'<path d="{d}" fill="{word}"/>'))
    # Stacked lockup, as on the splash screen: mark 84 above wordmark 46, gap 18
    d, end = wordmark_path(46, 0, 46)
    w = math.ceil(end)
    stacked = (
        f'<g transform="translate({(w - 84) / 2:g} 0) scale(0.84)">{MARK_G.format(outer=BONE, inner=PINK)}</g>'
        f'<g transform="translate(0 {84 + 18})"><path d="{d}" fill="{BONE}"/></g>'
    )
    write('lockup-stacked-reversed.svg', svg(w, 84 + 18 + 46, stacked))


def chime():
    """playChime(): two sine notes, 880 Hz then 1318.5 Hz 120 ms later, each a 20 ms attack to
    0.18 and an exponential fall to 0.0001 at 500 ms. Peak-normalised to -1 dBFS for editing."""
    rate, dur = 48000, 1.0
    n = int(rate * dur)
    out = [0.0] * n
    for freq, at in ((880.0, 0.0), (1318.5, 0.12)):
        for i in range(int(at * rate), min(n, int((at + 0.55) * rate))):
            t = i / rate - at
            if t < 0.02:
                g = 0.18 * t / 0.02
            else:
                g = 0.18 * (0.0001 / 0.18) ** ((t - 0.02) / (0.5 - 0.02))
            out[i] += g * math.sin(2 * math.pi * freq * t)
    peak = max(abs(s) for s in out)
    k = 10 ** (-1 / 20) / peak
    with wave.open(os.path.join(BRAND, 'sound', 'reward-chime.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b''.join(struct.pack('<h', int(s * k * 32767)) for s in out))


if __name__ == '__main__':
    os.makedirs(os.path.join(BRAND, 'logo'), exist_ok=True)
    os.makedirs(os.path.join(BRAND, 'sound'), exist_ok=True)
    logos()
    chime()
    print('ok')
