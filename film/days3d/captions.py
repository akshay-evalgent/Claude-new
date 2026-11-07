"""Caption files. The film has no dialogue: English is SDH (sound cues plus the on-screen words);
the other languages translate the on-screen words only, so the film reads in each market.
The Short gets the same cues remapped to its cut.

  python3 captions.py out/final/captions
"""
import os
import sys

from score import START, SHORT

S = START
# (start, end, key) in master time
ON_SCREEN = [
    (S['s01_lock'] + 0.1, S['s01_lock'] + 6.0, 'time214'),
    (S['s01_lock'] + 0.6, S['s01_lock'] + 4.4, 'notif'),
    (S['s01_lock'] + 4.45, S['s01_lock'] + 5.95, 'reminder'),
    (S['s02_card1'] + 0.5, S['s02_card1'] + 6.0, 'days21236'),
    (S['s03_swipes'] + 0.3, S['s03_swipes'] + 9.0, 'swipe'),
    (S['s04_mom'] + 0.1, S['s04_mom'] + 3.1, 'mom'),
    (S['s04_mom'] + 3.1, S['s04_mom'] + 5.0, 'remind1h'),
    (S['s05_timelapse'] + 0.2, S['s05_timelapse'] + 14.0, 'years'),
    (S['s05_timelapse'] + 6.0, S['s05_timelapse'] + 7.6, 'later'),
    (S['s07_card2'] + 0.6, S['s07_card2'] + 7.0, 'days18250'),
    (S['s12_panic'] + 0.3, S['s12_panic'] + 11.4, 'days14600'),
    (S['s15_roof'] + 3.6, S['s15_roof'] + 11.2, 'tag_neighbour'),
    (S['s15_roof'] + 7.2, S['s15_roof'] + 15.0, 'tag_him'),
    (S['s17_comeback'] + 0.2, S['s17_comeback'] + 20.0, 'stars_bar'),
    (S['s17_comeback'] + 10.5, S['s17_comeback'] + 20.0, 'upload'),
    (S['s18_midnight'] + 0.0, S['s18_midnight'] + 8.0, 'time2359'),
    (S['s18_midnight'] + 8.0, S['s18_midnight'] + 10.0, 'spent'),
    (S['s20_flash'] + 0.0, S['s20_flash'] + 3.0, 'later50'),
    (S['s21_end'] + 0.3, S['s21_end'] + 5.0, 'line1'),
    (S['s21_end'] + 2.2, S['s21_end'] + 5.0, 'line2'),
    (S['s21_end'] + 5.4, S['s21_end'] + 9.0, 'title'),
]

SDH = [
    (S['s01_lock'] + 0.4, S['s01_lock'] + 2.0, '[phone buzzes]'), (S['s01_lock'] + 3.8, S['s01_lock'] + 4.4, '[tap]'),
    (S['s02_card1'] + 0.5, S['s02_card1'] + 5.5, '[soft piano]'), (S['s03_swipes'] + 0.6, S['s03_swipes'] + 4.0, '[a glass marble tinks with every swipe]'),
    (S['s04_mom'] + 0.2, S['s04_mom'] + 3.0, '[phone rings]'), (S['s05_timelapse'] + 0.3, S['s05_timelapse'] + 5.0, '[a clock ticks fast · music box]'),
    (S['s06_feed'] + 0.2, S['s06_feed'] + 5.6, '[notification pings pile up]'), (S['s08_reach'] + 5.6, S['s08_reach'] + 7.0, '[one guitar chord]'),
    (S['s09_dream'] + 0.3, S['s09_dream'] + 9.2, '[a band plays · a crowd cheers]'), (S['s10_eye'] + 0.3, S['s10_eye'] + 2.6, '[heartbeat]'),
    (S['s11_box'] + 0.9, S['s11_box'] + 2.0, '[a box slams shut]'), (S['s12_panic'] + 0.5, S['s12_panic'] + 6.0, '[drums · marbles pour · boxes crash]'),
    (S['s13_wake'] + 0.3, S['s13_wake'] + 1.2, '[a gasp]'), (S['s13_wake'] + 1.4, S['s13_wake'] + 3.0, '[a waltz through the ceiling]'),
    (S['s14_door'] + 0.5, S['s14_door'] + 2.0, '[a door creaks open]'), (S['s14_door'] + 2.0, S['s14_door'] + 5.0, '[an old gramophone waltz]'),
    (S['s16_choice'] + 1.4, S['s16_choice'] + 2.3, '[tape rips]'), (S['s17_comeback'] + 0.3, S['s17_comeback'] + 3.2, '[he plays guitar]'),
    (S['s17_comeback'] + 4.9, S['s17_comeback'] + 6.0, '[a rising chime]'), (S['s18_midnight'] + 2.6, S['s18_midnight'] + 6.8, '[a slow rising chime]'),
    (S['s19_sleep'] + 0.2, S['s19_sleep'] + 7.8, '[the theme on piano and strings]'),
]

TEXT = {
    'en': dict(time214='2:14 a.m.', notif='30,000 DAYS · DAYS LEFT 21,236 · [Remind me later]', reminder='Reminder set: later', days21236='DAYS LEFT: 21,236',
               swipe='Every swipe costs a marble · DAYS LEFT 21,236 → 21,203', mom='Mom ♥ · incoming call · [Remind me later]', remind1h='Remind me in 1 hour',
               years='DAYS LEFT 21,226 → 18,262 · AGE 24 → 32', later='Later…', days18250='DAYS LEFT: 18,250', days14600='DAYS LEFT: 14,600',
               tag_neighbour='Neighbour · STARS 24,880 · DAYS LEFT 3', tag_him='Him · STARS 1,204 · DAYS LEFT 18,250', stars_bar='STARS (days well spent) 1,204 → 1,973',
               upload='first_song.mp3 · uploading', time2359='23:59', spent='0:00 · TODAY: SPENT ✓ · DAYS LEFT 17,329 · STARS 1,974', later50='50 years later',
               line1='You get about 30,000 days.', line2='Today is one of them.', title='30,000 DAYS · an animated short film · whatifgraphics'),
    'hi': dict(time214='रात 2:14', notif='30,000 दिन · बचे दिन 21,236 · [बाद में याद दिलाएँ]', reminder='रिमाइंडर सेट: बाद में', days21236='बचे दिन: 21,236',
               swipe='एक स्वाइप, एक कंचा · बचे दिन 21,236 → 21,203', mom='माँ ♥ · कॉल आ रही है · [बाद में याद दिलाएँ]', remind1h='1 घंटे में याद दिलाएँ',
               years='बचे दिन 21,226 → 18,262 · उम्र 24 → 32', later='बाद में…', days18250='बचे दिन: 18,250', days14600='बचे दिन: 14,600',
               tag_neighbour='पड़ोसी · सितारे 24,880 · बचे दिन 3', tag_him='वह · सितारे 1,204 · बचे दिन 18,250', stars_bar='सितारे (अच्छे से जिए दिन) 1,204 → 1,973',
               upload='first_song.mp3 · अपलोड हो रहा है', time2359='रात 11:59', spent='12:00 · आज: जिया ✓ · बचे दिन 17,329 · सितारे 1,974', later50='50 साल बाद',
               line1='तुम्हें लगभग 30,000 दिन मिलते हैं।', line2='आज उनमें से एक है।', title='30,000 दिन (30,000 DAYS) · एक एनिमेटेड शॉर्ट फ़िल्म · whatifgraphics'),
    'es': dict(time214='2:14 a. m.', notif='30.000 DÍAS · DÍAS RESTANTES 21.236 · [Recordármelo luego]', reminder='Recordatorio: luego', days21236='DÍAS RESTANTES: 21.236',
               swipe='Un deslizamiento, una canica · DÍAS 21.236 → 21.203', mom='Mamá ♥ · llamada entrante · [Recordármelo luego]', remind1h='Recordármelo en 1 hora',
               years='DÍAS RESTANTES 21.226 → 18.262 · EDAD 24 → 32', later='Luego…', days18250='DÍAS RESTANTES: 18.250', days14600='DÍAS RESTANTES: 14.600',
               tag_neighbour='Vecino · ESTRELLAS 24.880 · DÍAS RESTANTES 3', tag_him='Él · ESTRELLAS 1.204 · DÍAS RESTANTES 18.250', stars_bar='ESTRELLAS (días bien vividos) 1.204 → 1.973',
               upload='first_song.mp3 · subiendo', time2359='23:59', spent='0:00 · HOY: VIVIDO ✓ · DÍAS RESTANTES 17.329 · ESTRELLAS 1.974', later50='50 años después',
               line1='Tienes unos 30.000 días.', line2='Hoy es uno de ellos.', title='30.000 DÍAS (30,000 DAYS) · un cortometraje animado · whatifgraphics'),
    'pt': dict(time214='2h14', notif='30.000 DIAS · DIAS RESTANTES 21.236 · [Lembrar mais tarde]', reminder='Lembrete: mais tarde', days21236='DIAS RESTANTES: 21.236',
               swipe='Um deslize, uma bolinha de gude · DIAS 21.236 → 21.203', mom='Mãe ♥ · chamada recebida · [Lembrar mais tarde]', remind1h='Lembrar em 1 hora',
               years='DIAS RESTANTES 21.226 → 18.262 · IDADE 24 → 32', later='Depois…', days18250='DIAS RESTANTES: 18.250', days14600='DIAS RESTANTES: 14.600',
               tag_neighbour='Vizinho · ESTRELAS 24.880 · DIAS RESTANTES 3', tag_him='Ele · ESTRELAS 1.204 · DIAS RESTANTES 18.250', stars_bar='ESTRELAS (dias bem vividos) 1.204 → 1.973',
               upload='first_song.mp3 · enviando', time2359='23h59', spent='0h00 · HOJE: VIVIDO ✓ · DIAS RESTANTES 17.329 · ESTRELAS 1.974', later50='50 anos depois',
               line1='Você tem uns 30.000 dias.', line2='Hoje é um deles.', title='30.000 DIAS (30,000 DAYS) · um curta-metragem animado · whatifgraphics'),
    'id': dict(time214='02.14', notif='30.000 HARI · SISA HARI 21.236 · [Ingatkan nanti]', reminder='Pengingat: nanti', days21236='SISA HARI: 21.236',
               swipe='Satu geser, satu kelereng · SISA 21.236 → 21.203', mom='Ibu ♥ · panggilan masuk · [Ingatkan nanti]', remind1h='Ingatkan 1 jam lagi',
               years='SISA HARI 21.226 → 18.262 · UMUR 24 → 32', later='Nanti…', days18250='SISA HARI: 18.250', days14600='SISA HARI: 14.600',
               tag_neighbour='Tetangga · BINTANG 24.880 · SISA HARI 3', tag_him='Dia · BINTANG 1.204 · SISA HARI 18.250', stars_bar='BINTANG (hari yang dijalani) 1.204 → 1.973',
               upload='first_song.mp3 · mengunggah', time2359='23.59', spent='00.00 · HARI INI: DIJALANI ✓ · SISA HARI 17.329 · BINTANG 1.974', later50='50 tahun kemudian',
               line1='Kamu punya sekitar 30.000 hari.', line2='Hari ini salah satunya.', title='30.000 HARI (30,000 DAYS) · film pendek animasi · whatifgraphics'),
    'fr': dict(time214='2 h 14', notif='30 000 JOURS · JOURS RESTANTS 21 236 · [Me le rappeler plus tard]', reminder='Rappel : plus tard', days21236='JOURS RESTANTS : 21 236',
               swipe='Un swipe, une bille · JOURS 21 236 → 21 203', mom='Maman ♥ · appel entrant · [Me le rappeler plus tard]', remind1h='Me le rappeler dans 1 heure',
               years='JOURS RESTANTS 21 226 → 18 262 · ÂGE 24 → 32', later='Plus tard…', days18250='JOURS RESTANTS : 18 250', days14600='JOURS RESTANTS : 14 600',
               tag_neighbour='Le voisin · ÉTOILES 24 880 · JOURS RESTANTS 3', tag_him='Lui · ÉTOILES 1 204 · JOURS RESTANTS 18 250', stars_bar='ÉTOILES (jours bien vécus) 1 204 → 1 973',
               upload='first_song.mp3 · envoi en cours', time2359='23 h 59', spent='0 h 00 · AUJOURD’HUI : VÉCU ✓ · JOURS RESTANTS 17 329 · ÉTOILES 1 974', later50='50 ans plus tard',
               line1='On a environ 30 000 jours.', line2='Aujourd’hui en est un.', title='30 000 JOURS (30,000 DAYS) · un court métrage d’animation · whatifgraphics'),
    'de': dict(time214='2:14 Uhr', notif='30.000 TAGE · VERBLEIBENDE TAGE 21.236 · [Später erinnern]', reminder='Erinnerung: später', days21236='VERBLEIBENDE TAGE: 21.236',
               swipe='Ein Wisch, eine Murmel · TAGE 21.236 → 21.203', mom='Mama ♥ · eingehender Anruf · [Später erinnern]', remind1h='In 1 Stunde erinnern',
               years='VERBLEIBENDE TAGE 21.226 → 18.262 · ALTER 24 → 32', later='Später…', days18250='VERBLEIBENDE TAGE: 18.250', days14600='VERBLEIBENDE TAGE: 14.600',
               tag_neighbour='Nachbar · STERNE 24.880 · VERBLEIBENDE TAGE 3', tag_him='Er · STERNE 1.204 · VERBLEIBENDE TAGE 18.250', stars_bar='STERNE (gut gelebte Tage) 1.204 → 1.973',
               upload='first_song.mp3 · wird hochgeladen', time2359='23:59', spent='0:00 · HEUTE: GELEBT ✓ · VERBLEIBENDE TAGE 17.329 · STERNE 1.974', later50='50 Jahre später',
               line1='Man bekommt etwa 30.000 Tage.', line2='Heute ist einer davon.', title='30.000 TAGE (30,000 DAYS) · ein animierter Kurzfilm · whatifgraphics'),
}


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}'


def cues(lang, short=False):
    out = [(a, b, TEXT[lang][k]) for a, b, k in ON_SCREEN]
    if lang == 'en':
        out += SDH
    if short:   # remap to the Short's cut
        segs, t = [], 0.0
        for shot, a, b in SHORT:
            segs.append((S[shot] + a, S[shot] + b, t)); t += b - a
        mapped = []
        for a, b, s in out:
            for s0, s1, t0 in segs:
                lo, hi = max(a, s0), min(b, s1)
                if hi - lo > 0.5:
                    mapped.append((t0 + lo - s0, t0 + hi - s0, s))
        out = mapped
    # split at every boundary so blocks never overlap; each block shows every cue active in it
    cuts = sorted({round(a, 3) for a, _, _ in out} | {round(b, 3) for _, b, _ in out})
    blocks = []
    for a, b in zip(cuts, cuts[1:]):
        act = [s_ for (x, y, s_) in sorted(out) if x <= a + 1e-6 and y >= b - 1e-6]
        if act and b - a > 0.05:
            txt = '\n'.join(act)
            if blocks and blocks[-1][2] == txt and abs(blocks[-1][1] - a) < 1e-6:
                blocks[-1] = (blocks[-1][0], b, txt)
            else:
                blocks.append((a, b, txt))
    return [(a, b, s_) for a, b, s_ in blocks if b - a > 0.15]


def write(lang, folder, short=False):
    name = '30000DAYS_short' if short else '30000DAYS'
    path = os.path.join(folder, f'{name}.{lang}.srt')
    with open(path, 'w', encoding='utf-8') as f:
        for i, (a, b, s) in enumerate(cues(lang, short), 1):
            f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{s}\n\n')
    return path


if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else 'out/final/captions'
    os.makedirs(folder, exist_ok=True)
    for lang in TEXT:
        print(write(lang, folder))
    print(write('en', folder, short=True))
