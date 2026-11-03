# Little Messi: respect

A 27-second edit of the plastic-bag-shirt story (Murtaza Ahmadi and Lionel Messi), cut to the soundtrack of the reference Short
(https://www.youtube.com/shorts/kyzbJFn98EE) in the same style. Footage: source compilation https://www.youtube.com/watch?v=unNo93gbor8,
29:42 to 30:17.

## What was matched from the reference (measured, not guessed)

| Reference | Here |
|---|---|
| 1080x1350 (4:5) | same |
| transitions at 0.73 (white flash), 2.34 (TV-off), 4.57 / 6.61 / 10.24 / 14.85 / 19.89 / 21.99 (cyan light leaks), 12.35 / 13.68 / 24.66 (hard cuts), 25.33 (pixel-stretch glitch), fade out 26.69 to 27.13 | same times, all within 20 ms (under one frame) |
| beat drop at 12.95 s, music stops near 5.8 to 6.3 and 12.4 to 12.9 | same soundtrack, so they land on the same shots |
| typed neon captions, one colour per word, quotes around the key phrase, ~15 letters/s | `story.py` NeonCaption, Poppins ExtraBold |
| red arrow on the first close-up | arrow on the bag shirt |
| push-ins accelerating into transitions, handheld shake after the drop, alternate-frame flicker | `zoom_keys`, `handheld`, `flicker` |
| ending: mending-heart emoji grows in over the hero, ghost-flashes out, settles as a small heart above "RESPECT"; sparkles | same, on Messi's portrait |

Left out on purpose: the reference editor's watermark. ESPN logos and a "Mente Millonaria" watermark in the source footage are cropped out of frame.

## Story and facts

Caption sequence: "LITTLE MESSI" / "HIS SHIRT" WAS A PLASTIC BAG / HIS BROTHER MADE IT FOR HIM / THE PHOTO WENT VIRAL / THEN MESSI SAW IT /
HE SENT HIM SIGNED SHIRTS / "FINALLY" HE MET HIS HERO / "A DREAM CAME TRUE" / SALUTE TO THIS LEGEND / "RESPECT".

Sources: his older brother made the shirt from a blue-striped plastic bag and wrote Messi and 10 on it; Messi sent signed Barcelona and
Argentina shirts (UNICEF, Feb 2016); they met in Doha in December 2016 and walked out together
([Fox News](https://www.foxnews.com/world/its-a-dream-afghan-boy-finally-meets-idol-lionel-messi),
[Rappler](https://www.rappler.com/sports/155476-afghan-boy-plastic-bag-jersey-meets-idol-messi/),
[Vice](https://www.vice.com/en/article/53xvwb/kid-who-made-a-messi-jersey-out-of-a-plastic-bag-finally-meets-his-hero-and-wont-let-go)).

## Rebuild

Not in git (other people's media): `clips/messi.mp4` (source 29:42 to 30:17), `clips/music.m4a` (the reference Short's audio), `out/`.

Full-quality clip (Windows cmd):

    yt-dlp -S "res,ext:mp4:m4a" --merge-output-format mp4 --download-sections "*29:42-30:17" --force-keyframes-at-cuts -o "messi_full.%(ext)s" "https://www.youtube.com/watch?v=unNo93gbor8"

Save it as `clips/messi.mp4`, keep `clips/music.m4a`, then:

    python3 -m beatcut.story episodes/messi-respect --stills
    python3 -m beatcut.story episodes/messi-respect
