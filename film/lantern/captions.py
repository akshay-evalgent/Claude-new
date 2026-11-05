"""Caption files for the master. The film is wordless: English is SDH (sound cues plus the on-screen words);
the other languages translate the on-screen words only, so the film reads in each market.

  python3 captions.py out/final/captions
"""
import os
import sys

# (start, end, key) for every on-screen word, master timeline
ON_SCREEN = [
    (73.5, 75.3, 'dad_calling'), (76.5, 78.1, 'dad_calling'), (78.5, 80.25, 'missed'),
    (92.6, 97.3, 'count'),
    (140.25, 150.0, 'title'), (142.05, 150.0, 'line1'), (143.85, 150.0, 'line2'), (144.75, 150.0, 'calling'),
]

SDH = [
    (0.0, 2.2, '[a match strikes]'), (2.2, 3.7, '[a clock ticks]'), (5.4, 7.2, '[a door creaks shut]'),
    (7.5, 14.2, '[rain · a music-box lullaby]'), (27.9, 30.6, '[wind and heavy rain]'),
    (34.0, 39.6, '[children in a schoolyard]'), (52.7, 53.6, '[phone alarm]'), (55.0, 55.9, '[phone alarm]'),
    (57.2, 58.1, '[phone alarm]'), (60.3, 65.8, '[a marker squeaks · paper tears]'), (66.1, 73.3, '[a low hum]'),
    (82.4, 84.0, '[silence]'), (88.2, 89.6, '[a match strikes]'), (89.8, 92.5, '[a rising music box]'),
    (98.0, 102.0, '[a heartbeat drum]'), (110.3, 113.2, '[wind and heavy rain]'), (116.3, 126.6, '[birdsong · the lullaby on piano and strings]'),
    (127.5, 129.0, '[a match strikes]'), (136.4, 138.0, '[a lamp clicks on]'),
]

TEXT = {
    'en': dict(dad_calling='Dad · calling…', missed='Missed calls · Dad (2)', count='7,300', title='LANTERN',
               line1='He gave you 7,300 mornings.', line2='Give him one.', calling='Calling Dad…'),
    'hi': dict(dad_calling='पापा · कॉल आ रही है…', missed='मिस्ड कॉल · पापा (2)', count='7,300', title='लालटेन (LANTERN)',
               line1='उन्होंने तुम्हें 7,300 सुबहें दीं।', line2='एक सुबह उन्हें दे दो।', calling='पापा को कॉल कर रहे हैं…'),
    'es': dict(dad_calling='Papá · llamando…', missed='Llamadas perdidas · Papá (2)', count='7.300', title='LINTERNA (LANTERN)',
               line1='Te dio 7.300 mañanas.', line2='Dale una.', calling='Llamando a Papá…'),
    'pt': dict(dad_calling='Pai · chamando…', missed='Chamadas perdidas · Pai (2)', count='7.300', title='LAMPIÃO (LANTERN)',
               line1='Ele te deu 7.300 manhãs.', line2='Dê uma a ele.', calling='Ligando para o Pai…'),
    'id': dict(dad_calling='Ayah · memanggil…', missed='Panggilan tak terjawab · Ayah (2)', count='7.300', title='LENTERA (LANTERN)',
               line1='Dia memberimu 7.300 pagi.', line2='Berikan satu untuknya.', calling='Menelepon Ayah…'),
    'fr': dict(dad_calling='Papa · appel entrant…', missed='Appels manqués · Papa (2)', count='7 300', title='LANTERNE (LANTERN)',
               line1='Il t’a donné 7 300 matins.', line2='Donne-lui-en un.', calling='Appel en cours : Papa…'),
    'de': dict(dad_calling='Papa · ruft an…', missed='Verpasste Anrufe · Papa (2)', count='7.300', title='LATERNE (LANTERN)',
               line1='Er hat dir 7.300 Morgen geschenkt.', line2='Schenk ihm einen.', calling='Papa wird angerufen…'),
}


def ts(t):
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'


def cues(lang):
    out = []
    tx = TEXT[lang]
    for (a, b, k) in ON_SCREEN:
        out.append((a, b, tx[k]))
    if lang == 'en':
        out += SDH
    out.sort()
    # merge cues that overlap into one block per time span so players show them together
    merged = []
    for a, b, s in out:
        if merged and a < merged[-1][1] - 1e-6 and abs(a - merged[-1][0]) < 2.5:
            pa, pb, ps = merged[-1]
            merged[-1] = (pa, max(pb, b), ps + '\n' + s)
        else:
            merged.append((a, b, s))
    return merged


def write(lang, folder):
    path = os.path.join(folder, f'LANTERN.{lang}.srt')
    with open(path, 'w', encoding='utf-8') as f:
        for i, (a, b, s) in enumerate(cues(lang), 1):
            f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{s}\n\n')
    return path


if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else 'out/final/captions'
    os.makedirs(folder, exist_ok=True)
    for lang in TEXT:
        print(write(lang, folder))
