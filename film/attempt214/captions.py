"""Caption files. The film has no dialogue: English is SDH (sound cues plus the on-screen words);
the other languages translate the on-screen words only. The Short gets the same cues remapped to its cut.

  python3 captions.py out/final/captions
"""
import os
import sys

from score import START, SHORT, BAR

S = START
MONT = [2, 7, 15, 23, 40, 61, 88, 120, 150, 190]
ON_SCREEN = [(S['s02_tilt'] + 3.8, S['s03_first'] + 7.5, ('n', 1))]
ON_SCREEN += [(S['s04_montage'] + i * BAR, S['s04_montage'] + (i + 1) * BAR, ('n', n)) for i, n in enumerate(MONT)]
ON_SCREEN += [(S['s05_room'], S['s05_room'] + 10, ('range', '191 → 208')), (S['s06_213'], S['s08_sign'] + 10, ('n', 213)),
              (S['s09_climb'] + 9.0, S['s13_colour'] + 4.0, ('n', 214)), (S['s12_catch'] + 1.0, S['s12_catch'] + 3.0, ('plain', '214')),
              (S['s15_end'] + 0.6, S['s15_end'] + 5.2, ('line', None)), (S['s15_end'] + 6.0, S['s15_end'] + 12.5, ('title', None))]

SDH = [
    (S['s01_canvas'] + 0.2, S['s01_canvas'] + 2.6, '[a palette knife scrapes paint]'), (S['s01_canvas'] + 2.6, S['s01_canvas'] + 5.0, '[paper folding · bright notes]'),
    (S['s02_tilt'] + 1.2, S['s02_tilt'] + 4.8, '[a gentle piano melody]'), (S['s03_first'] + 1.6, S['s03_first'] + 3.4, '[a paper plane taps the wall]'),
    (S['s04_montage'] + 0.6, S['s04_montage'] + 5.0, '[plucked strings · each attempt rings one note higher]'), (S['s04_montage'] + 6.6, S['s04_montage'] + 8.0, '[children laughing]'),
    (S['s05_room'] + 0.5, S['s05_room'] + 6.0, '[a clock ticks · a lonely cello]'), (S['s06_213'] + 0.2, S['s06_213'] + 2.4, '[heavy rain]'),
    (S['s06_213'] + 2.5, S['s06_213'] + 3.2, '[splash]'), (S['s06_213'] + 3.2, S['s06_213'] + 5.6, '[children laughing]'),
    (S['s07_silence'] + 0.2, S['s07_silence'] + 1.9, '[silence]'), (S['s07_silence'] + 2.0, S['s07_silence'] + 3.0, '[a single drip]'),
    (S['s08_sign'] + 0.8, S['s08_sign'] + 4.6, '[birdsong · strings swell]'), (S['s09_climb'] + 0.6, S['s09_climb'] + 4.0, '[paper crunching underfoot · rising notes]'),
    (S['s10_throw'] + 1.0, S['s10_throw'] + 3.6, '[a held breath]'), (S['s11_flight'] + 0.4, S['s11_flight'] + 4.0, '[wind · the plane flutters · the orchestra rises]'),
    (S['s13_colour'] + 3.2, S['s13_colour'] + 7.0, '[the melody comes home · a harp sweeps up]'), (S['s15_end'] + 5.8, S['s15_end'] + 7.2, '[a palette knife scrapes]'),
]

ATTEMPT = {'en': 'ATTEMPT', 'hi': 'प्रयास', 'es': 'INTENTO', 'pt': 'TENTATIVA', 'id': 'PERCOBAAN', 'fr': 'ESSAI', 'de': 'VERSUCH'}
LINE = {'en': 'Most people stop at 213.', 'hi': 'ज़्यादातर लोग 213 पर रुक जाते हैं।', 'es': 'La mayoría se rinde en el 213.', 'pt': 'A maioria desiste na 213.',
        'id': 'Kebanyakan orang berhenti di 213.', 'fr': 'La plupart des gens s’arrêtent à 213.', 'de': 'Die meisten hören bei 213 auf.'}
TITLE_SUB = {'en': 'an animated short film · whatifgraphics', 'hi': 'एक एनिमेटेड शॉर्ट फ़िल्म · whatifgraphics', 'es': 'un cortometraje animado · whatifgraphics',
             'pt': 'um curta-metragem animado · whatifgraphics', 'id': 'film pendek animasi · whatifgraphics', 'fr': 'un court métrage d’animation · whatifgraphics', 'de': 'ein animierter Kurzfilm · whatifgraphics'}


def text(lang, k):
    kind, v = k
    if kind == 'n': return f'{ATTEMPT[lang]} {v}'
    if kind == 'range': return f'{ATTEMPT[lang]} {v}'
    if kind == 'plain': return v
    if kind == 'line': return LINE[lang]
    if kind == 'title': return f'{ATTEMPT[lang]} 214 · {TITLE_SUB[lang]}' if lang != 'en' else f'ATTEMPT 214 · {TITLE_SUB[lang]}'


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}'


def cues(lang, short=False):
    out = [(a, b, text(lang, k)) for a, b, k in ON_SCREEN]
    if lang == 'en': out += SDH
    if short:
        segs, t = [], 0.0
        for shot, a, b in SHORT: segs.append((S[shot] + a, S[shot] + b, t)); t += b - a
        mapped = []
        for a, b, s in out:
            for s0, s1, t0 in segs:
                lo, hi = max(a, s0), min(b, s1)
                if hi - lo > 0.5: mapped.append((t0 + lo - s0, t0 + hi - s0, s))
        out = mapped
    cuts = sorted({round(a, 3) for a, _, _ in out} | {round(b, 3) for _, b, _ in out})
    blocks = []
    for a, b in zip(cuts, cuts[1:]):
        act = [s_ for (x, y, s_) in sorted(out, key=lambda c: (0 if c[2].startswith('[') else 1, c[0])) if x <= a + 1e-6 and y >= b - 1e-6]
        if act and b - a > 0.05:
            txt = '\n'.join(act)
            if blocks and blocks[-1][2] == txt and abs(blocks[-1][1] - a) < 1e-6: blocks[-1] = (blocks[-1][0], b, txt)
            else: blocks.append((a, b, txt))
    return [(a, b, s_) for a, b, s_ in blocks if b - a > 0.15]


def write(lang, folder, short=False):
    path = os.path.join(folder, f"ATTEMPT_214{'_short' if short else ''}.{lang}.srt")
    with open(path, 'w', encoding='utf-8') as f:
        for i, (a, b, s) in enumerate(cues(lang, short), 1): f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{s}\n\n')
    return path


if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else 'out/final/captions'
    os.makedirs(folder, exist_ok=True)
    for lang in ATTEMPT: print(write(lang, folder))
    print(write('en', folder, short=True))
