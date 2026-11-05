# Notes: lust (Nirodh)

Source: YouTube `9KvBc82PfhY`, the Hindi short film "Nirodh" (Inhibition), 2018, Cutting Chai Pictures, on the Six Sigma
Films channel. 1920x1080 AV1, letterboxed to rows 138-941, "Six Sigma Films" badge top left (x <= 176, y 160-280),
burned-in English subtitles at rows ~781-853 (the last scene puts them top centre instead). Used at the user's request.
Format and music: the THIS IS WHY reference `JRzZ-iorXh0`, the same sound and timeline as `karma-wedding`.
Neither file is committed. The AV1 file is transcoded to H.264 (`clips/source.mp4`) because OpenCV can't decode AV1:
`ffmpeg -i source3.mp4 -an -c:v libx264 -crf 14 -preset veryfast -pix_fmt yuv420p clips/source.mp4`.

## Story (from the film's own English subtitles)
- Husband (white shirt) on the phone, 1:06-1:27: "don't worry Amma… very soon… you'll be a grandmother… please have some patience".
- His friend Madhav (yellow shirt): "My dear friend, I want you to have it first" (1:39-1:41); "I'll serve my friend with my own hands" (2:41-2:43).
- Madhav sings to the wife while filming her on his phone, 3:12-4:28 ("[Madhav singing] -Local song"; the lyric, from the
  audio: "Oh my beloved queen, I will make you fall in love with me").
- Night: the wife watches, Madhav undresses to his vest, the husband lies awake (4:47-4:57).
- The husband, in bed, 5:28-5:51: "If only, had I taken this precaution with the other woman that day.. I wouldn't be
  suffering from this fatal disease today... The remedy for this condition is quite bitter. But Amma... very soon...
  you'll be a grandmother."

Machine translation of the audio (faster-whisper `small`, task=translate) breaks down in the last scene; every caption is
taken from the subtitles above, not from it.

## Edit, shot by shot (seconds on the reference's soundtrack)
| t | Source | Picture | Grade | Caption |
|---|---|---|---|---|
| 0.00-2.00 | 239.6 at 0.8x | Madhav films himself singing | lust | THIS IS WHY **LUST** ALWAYS COSTS YOU! |
| 2.00-4.02 | 242.5 at 0.75x | the wife fixes her hair, looks up | lust | |
| 4.02-6.08 | 79.0 | husband on the phone to his mother; window punch | warm | HE PROMISED HIS MOTHER A **GRANDCHILD** |
| 6.08-7.75 | 102.7 | husband toasts his friend | warm | THEN HIS **BEST FRIEND** CAME OVER |
| 7.75-9.42 | 121.0 | Madhav stares | warm | |
| 9.42-11.10 | 211.0 | Madhav sings and films, the husband looks down | lust | AND SANG **LOVE SONGS** TO HIS WIFE |
| 11.10-12.75 | 233.9 at 0.7x | the wife looks up | lust | |
| 12.75-14.40 | 287.7 | glitch into the night: the wife watches | lust + lifted | HE HAD A **FATAL DISEASE** FROM ANOTHER WOMAN |
| 14.40-16.00 | 285.4 | Madhav undresses to his vest | lust + lifted | |
| 16.00-17.72 | 293.0 | the husband lies awake | cold | |
| 17.72-21.30 | 312.5 | the husband's face | cold | **"IF ONLY I'D TAKEN PRECAUTION"** (red, streak reveal) |
| 21.30-23.60 | 322.8 | the precaution in his hand | cold | |

Grades (`shots[].grade`): lust = tint [1.12, 0.9, 1.0], sat 1.15, contrast 1.08; warm = tint [1.04, 0.98, 0.95];
cold = tint [0.86, 0.96, 1.14], sat 0.55, contrast 1.1; night shots add gamma 1.3-1.5 to lift the shadows.

Crops: shots that carry a subtitle use zoom 1.72-1.80 with focus y 0.42, which puts the window's bottom edge above the
subtitle; shots without one use zoom 1.40-1.47 at focus y 0.5. Focus x >= 0.29 keeps the badge out.

## QA
- 1080x1920, 30 fps, 23.6 s; -11.2 LUFS, peak -0.6 dBFS.
- Checked frames: typing (0.3-1.0 s), window punch (4.6-5.0 s), glitch into the night (12.8-13.3 s), punchline reveal
  (17.8 s), last frame (23.4 s). No subtitle, letterbox or badge inside the window in any still.
