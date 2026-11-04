# Notes: karma at the wedding

Source: YouTube `zJh5ToHFvIA` (Popcorn Picks movie clip, 1920x1080 letterboxed to rows 139-941, channel logo bottom
left below y 0.79), used with the owner's permission. Reference: Short `JRzZ-iorXh0` (format, timing and music).
Neither file is committed. Put the source at `clips/source.mp4` and the reference's audio at `clips/music.m4a`
(`python3 -m beatcut.mirror analyze <reference.mp4> <episode>` extracts it).

## Story (from the scene)
At Al (Alexander Monroe) and Anastasia's wedding, a package reaches Jordan: Cassie's letter ("On July 23, I will be
going to Alexander Monroe's bachelor party, Cabin 57, Vernington Woods. In the event of my disappearance please deliver
this letter and package to the police."). Scheduled texts from "C" arrive at 6:00 PM ("You didn't think this was the
end, did you?" / "It is now." / "Enjoy the wedding!"). Police arrive and take the groom. The last text is signed
"Love, Cassie & Nina".

## Edit, shot by shot (seconds on the reference's soundtrack)
| t | Source | Picture | Caption |
|---|---|---|---|
| 0.00-2.00 | 2.0 | the aisle | THIS IS WHY **KARMA** NEVER MISSES A **WEDDING!** (typed) |
| 2.00-4.02 | 8.0 | vows, hands held | |
| 4.02-6.08 | 40.0 | groom and bride pose for the photographer; window punches to 1.27x | BUT THE GROOM WAS **HIDING** SOMETHING |
| 6.08-7.75 | 104.0 | letter: "ALEXANDER MONROE'S BACHELOR PARTY" (fit, whole lines) | **CASSIE** LEFT A **LETTER,** JUST IN CASE |
| 7.75-9.42 | 101.85 | letter: "IN THE EVENT OF MY DISAPPEARANCE ... TO THE POLICE" (fit) | |
| 9.42-11.10 | 112.0 | scheduled message pops in (fit) | THEN HER **SCHEDULED TEXTS** WENT OUT |
| 11.10-12.75 | 185.8 | "It is now." | |
| 12.75-15.20 | 187.8 at 0.9x | glitch into the police car | ON HIS WEDDING DAY, **THE POLICE** CAME |
| 15.20-17.72 | 190.1 at 0.78x | the couple turns, the bride's face | |
| 17.72-21.30 | 222.0 | police take the groom | **"ENJOY THE WEDDING!"** (red, streak reveal, glow pulses on the beats) |
| 21.30-23.60 | 233.4 | groom led away | |

Every crop stays inside the picture (zoom >= 1.33 hides the letterbox; focus x >= 0.34 or a fit region above y 0.79
keeps the logo out).

## QA
- 1080x1920, 30 fps, 23.6 s. Soundtrack peak-limited to -0.6 dBFS (the reference decodes at +1.6 dBFS), -11.2 LUFS.
- Window motion measured on the render with `mirror window`: 1.27 at 4.97 s, 1.0 at 6.37 s, swell at 12.85 s, the
  same keys as the reference.
- Checked frames: typing and cursor sparkle (0.2-0.9 s), window punch (4.1-6.5 s), glitch (12.6-13.5 s),
  punchline reveal and glow (17.6-19 s), last frame (23.5 s).
