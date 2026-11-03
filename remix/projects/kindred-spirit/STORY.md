# Kindred Spirit

**Logline.** A lone dragon hunter is sent after a dragon that is tearing a
city apart. The dragon turns out to be a woman who was left behind, and the
thing that stops her is an apology, not a blade.

**The new perspective.** In *Tears of Steel* the giant robot is the villain.
In *Sintel* the dragon is the monster the heroine kills before she sees who
it really is. This cut puts the two together: the monster is someone who
was loved and then forgotten, and the hunter (who has "been alone for as long
as she can remember") recognises herself in it. The gatekeeper's line
"You've only failed to see" becomes the turn of the story.

Running time 1:43, 16:9 with every source letterboxed to 2.39:1.

## Beats

| # | Beat | Picture | Sound |
|---|---|---|---|
| 1 | Cold open | ruined Amsterdam (ToS) | Proog, the tour guide (ED): "Everything is safe. Perfectly safe." |
| 2 | Hard cut | the robot in the street (ToS) | "That's nice. Nothing to worry about." rings into the title |
| 3 | The hunter | the hut (Sintel) | "This blade has a dark past." / "So, what brings you to the land of the gatekeepers?" |
| 4 | | Sintel looking over a city | "I'm searching for someone." |
| 5 | | the hut | "Someone very dear? A kindred spirit?" / "A dragon." |
| 6 | Reveal | the robot in the church (ToS) | machine sound |
| 7 | | Sintel's grim close-up | "A dangerous quest for a lone hunter." / "I've been alone for as long as I can remember" |
| 8 | The dragon speaks | robot close-up (ToS) | "You're a jerk, Thom!" in Celia's voice |
| 9 | | Sintel, shocked (Sintel) | |
| 10 | The dragon is Celia | the robot's face becomes hers (ToS) | |
| 11 | The real fight | Celia and Thom (ToS) | "You broke my heart." "I know." "You forgot me on earth." "I know." "I should just crush you." |
| 12 | The hunter raises her blade | Sintel (Sintel) | |
| 13 | | Celia, close (ToS) | |
| 14 | ...and can't | Sintel, mirrored to look back at Celia | |
| 15 | Seeing | the hut | "I have failed." / "You've only failed to see." |
| 16 | | Barley coaching Thom (ToS) | "Be tender to her. Be honest. Remind her what love is." |
| 17 | | Thom (ToS) | "I'm sorry." |
| 18 | | Celia, his hand on her face (ToS) | |
| 19 | | Thom, young / old (ToS) | "The world's changed, Celia." / "Maybe we can too." |
| 20 | | the hut | "These are Dragonlands, Sintel. You are closer than you know." |
| 21 | Ending | Sintel walks into the flowers (Sintel) | the score carries over the end card |
| 22 | Stinger | Barley (ToS) | "You know, there's a lesson to be learned from this." "Could have gone worse." |

## Editing notes

- **Eyelines.** Sintel faces screen-right in her close-ups and Celia faces
  screen-left, so they can share a scene without flipping. The one
  exception is Sintel's hesitation shot, mirrored (`flip: true`) so she
  looks back toward Celia.
- **Voices over other pictures.** "I'm searching for someone" plays over
  her looking at a city, and "A dangerous quest" over her resolve, because
  the original pictures under those lines are a flashback and a black frame.
- **Three lines cut by waveform, not transcript.** Whisper mistimed "A
  dragon", "I have failed" and "The world's changed", so those clips use
  explicit times read from the audio energy, with caption overrides.
- **Levels.** Sintel's soundtrack is mixed about 15 dB below Tears of Steel.
  The renderer measures each spoken line and levels it to -20 LUFS before
  the final -16 LUFS master, so the two films sit at the same volume.

## Sources and credits

All three films are by the Blender Foundation, licensed CC BY:

- *Sintel* (2010), durian.blender.org — CC BY 3.0
- *Tears of Steel* (2012), mango.blender.org — CC BY 3.0
- *Elephants Dream* (2006), orange.blender.org — CC BY 2.5

Rebuild: `./fetch_demo.sh` then `python3 render.py projects/kindred-spirit/edit.yaml --verify`.
