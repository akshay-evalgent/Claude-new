# Artemis I: to the Moon in 25 seconds — posting kit

## Upload

- File: `out/short_app_sound.mp4` (to add a trending sound in the app) or `out/short.mp4` (original placeholder track, rights-clear).
- Sound: pick from the Shorts editor's trending list. Start it 3 bars before the song's drop (start = drop − 12 × 60 / BPM; at 125 BPM that is drop − 5.76 s). Original sound at about 30 %.
- If the song is not near 125 BPM, re-render first: `python3 -m beatcut.render episodes/artemis-i --bpm <song bpm>`.

## Title (pick one)

1. Artemis I: to the Moon in 25 seconds
2. NASA sent this around the Moon with no one on board
3. 268,563 miles from home, and back

## Description

The whole Artemis I mission in 25 seconds: launch on Nov 16, 2022, the boosters letting go, a pass 81 miles above the Moon, Earth setting behind it, 268,563 miles out, and splashdown on Dec 11. No crew on board; it was the test flight for Artemis II.

Footage: NASA (public domain). NASA does not endorse this channel.

#Shorts #Artemis #NASA #Moon #space

## Pinned comment

Artemis II took four astronauts around the Moon in April 2026. Want part 2?

## Every on-screen fact, and where it comes from

| On screen | Source |
|---|---|
| Launch Nov 16, 2022 | [Wikipedia: Artemis I](https://en.wikipedia.org/wiki/Artemis_I) ("launched on November 16, 2022, at 1:47:44 am EST") |
| 8.8 million lbs of thrust | same ("39,000 kN (8,800,000 lbf) ... at liftoff") |
| 81 miles above the Moon, Nov 21 | same ("closest lunar approach of approximately 130 km (81 mi) above the surface") |
| 268,563 miles from home | same ("Orion reached a distance of 432,210 km (268,563 mi) from Earth", Nov 28, 2022) |
| Back in at 25,000 mph; heat shield 5,000°F | same ("travelling near 40,000 km/h (25,000 mph)"); [NASA: Artemis I](https://www.nasa.gov/reference/artemis-i-2/) and NASA heat shield pages (about 5,000°F at roughly 25,000 mph) |
| Splashdown Dec 11, 2022 | Wikipedia: Artemis I ("splashed down ... west of Baja California", Dec 11, 2022) |
| 25 days in space | Wikipedia: Artemis I infobox (25 days, 10 hours, 52 minutes) |
| No crew | same (a mannequin, "Commander Moonikin Campos", and two phantom torsos flew instead) |
| The next one carried 4 humans | Artemis II, crewed lunar flyby, splashdown April 10, 2026 ([KSL / AP](https://www.ksl.com/article/51481765/artemis-ii-returns-from-moon-with-splashdown-to-close-out-record-breaking-lunar-voyage)) |

Left out on purpose: the booster separation time (sources disagree: "about 2 minutes" vs a timeline table that conflicts with itself) and the total distance flown (NASA says 1.4 million miles, Wikipedia's infobox 1.3 million).

## Footage credits (NASA Image and Video Library)

| Shot | NASA ID |
|---|---|
| liftoff (4K slow motion) | KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595 |
| tower clear (4K tracking) | Artemis I Launch 2022 CU tracking from Press Site_compressed |
| climb, pad at night | KSC-20221116-MH-WEL01-0001-Artemis_I_Launch_Imagery-3319254 |
| booster separation | Artemis I - Rocket Camera Footage |
| next stop, Orion at the pad | Artemis I Launches to the Moon (Official NASA Recap) |
| 81 miles, Earthset | ART-SAW2_2022_325_1230B_SHARED_art001m1203251230B |
| 268,563 miles | ART-SAW1_2022_327_0328_SHARED_art001m1203270328 |
| one more flyby | FD 20 Artemis_I_Post-RPF_AOS_221205_1735031 |
| parachutes, splashdown | KSC-20221211-VP-MWC01-001-ARTEMIS-SPLASHDOWN-3296595 |

Details: `https://images.nasa.gov/details/<NASA ID>`. Exact seconds used are in `clips.json`.
