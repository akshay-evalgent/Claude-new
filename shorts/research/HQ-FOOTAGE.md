# High-quality footage we can download directly (checked 2026-11-03)

All US government works (public domain). Keep the credit lines; never imply the agency endorses the channel.
Fetch any NOAA video into an episode with a `clips.json` entry `{"noaa_page": "<page url>", "start": s, "dur": s}` and
`python3 -m beatcut.fetch episodes/<name>`.

## NOAA Fisheries video portal (videos.fisheries.noaa.gov)

| Clip | Resolution / length | Story | Series fit | Credit |
|---|---|---|---|---|
| [B-roll: NOAA Disentanglement Efforts & Entangled Whales](https://videos.fisheries.noaa.gov/detail/video/5976357022001/b-roll:-noaa-disentanglement-efforts-and-entangled-whales) | **1920x1080**, 9:18 | crews cutting whales free: boat cams, drone, underwater | RESPECT | per section, below |
| [Dolphin calf disentangled and released in Florida](https://videos.fisheries.noaa.gov/detail/video/6013191155001/dolphin-calf-disentangled-and-released-in-florida) | **1920x1080**, 0:53 | March 2019: mother and calf caught, calf freed, both released | RESPECT | NOAA Fisheries (check the page) |
| [Entangled gray whale freed](https://videos.fisheries.noaa.gov/detail/video/6371576684112/entangled-gray-whale-freed) | 1280x720, 1:06 | helmet cam, the moment the team cuts the net and ropes | RESPECT, REAL OR AI? | check the page |
| [Humpback disentanglement near Dutch Harbor, 1st cut](https://videos.fisheries.noaa.gov/detail/video/6351187645112/humpback-whale-disentanglement-near-dutch-harbor---1st-cut) | 1280x720, 1:25 | April 5 2024, Alaska Dept of Fish and Game team frees a humpback | RESPECT | check the page |
| [B-roll: J35 with her dead calf J61 and newborn J62, Jan 1 2025](https://videos.fisheries.noaa.gov/detail/video/6366629285112/b-roll:-southern-resident-killer-whale-j35-with-her-dead-calf-j61-and-a-healthy-newborn-calf-j62-on-january-1-2025) | 1280x720, 3:31 | the orca whose 2018 "tour of grief" went viral, again carrying a calf | WHAT HAPPENED NEXT, REAL OR AI? | check the page |
| [B-roll: Waikīkī pup Pualani safely released at new home](https://videos.fisheries.noaa.gov/detail/video/6328962507112/b-roll:-waikīkī-pup-pualani-safely-released-at-new-home) | 1280x720, 1:23 | May 30 2023, monk seal pup moved from a busy beach | RESPECT | check the page |
| [Sea turtle cold-stun event in Texas 2021](https://videos.fisheries.noaa.gov/detail/video/6234782031001/sea-turtle-cold-stun-event-in-texas-2021) | 1280x720, 0:21 | turtles rescued during the 2021 Texas freeze | RESPECT | check the page |
| [Orphan orca: Saving Springer](https://videos.fisheries.noaa.gov/detail/video/1732219280001/orphan-orca:-saving-springer-5-min) | 640x480, 5:18 | 2002 orphaned orca rescued and reunited with her pod | WHAT HAPPENED NEXT | check the page |

Credit lines in the 1080p B-roll (read from its slates):

| B-roll section | Content | Credit |
|---|---|---|
| 0:08–1:57 | boat-cam disentanglement work | "NOAA Fisheries" |
| 2:00–3:48 | humpbacks near Hawaii | "Rescue activities performed and video taken pursuant to NMFS MMHSRP Permit #932-1489" |
| 3:51–5:05 | humpback, Unalaska Bay near Dutch Harbor, Alaska | "… pursuant to NMFS MMHSRP Permit #18786-03" |
| 5:08–6:19 | humpbacks, US West Coast | "… pursuant to NMFS MMHSRP Permit #18786-01" |
| 6:22–7:59 | gray whales, US West Coast | "… pursuant to NMFS MMHSRP Permit #18786-01" |
| 8:02–8:21 | entangled humpbacks, Hawaii | "Video taken under NMFS MMHSRP Permit #932-1489" |
| 8:24–9:18 | entangled humpbacks, US West Coast | "Video taken under NMFS MMHSRP Permit #18786-01" |

## NASA Image and Video Library
Up to 4K (launches, Earth from orbit, the Moon). Already wired into `beatcut.fetch` (`nasa_id`).

## Not reachable from this machine (and how to get it)

| Source | What's there | Why not | Route |
|---|---|---|---|
| YouTube | the Messi compilation in full quality, most viral clips | bot check | download on your computer: `yt-dlp -S "res,ext:mp4:m4a" --merge-output-format mp4 --download-sections "*29:42-30:17" --force-keyframes-at-cuts -o "messi_full.%(ext)s" "https://www.youtube.com/watch?v=unNo93gbor8"` |
| DVIDS (dvidshub.net) | HD Coast Guard rescues (dogs off cliffs, hikers, boaters), public domain | anti-bot challenge on the site | download in your browser from the video page, or create a free DVIDS API key and share it |
| defense.gov / uscg.mil / noaa.gov | mirrors of the same | blocked (403) | same as above |
| Wikimedia Commons | many DVIDS and NASA mirrors in HD | rate-limited at times | retry later |
