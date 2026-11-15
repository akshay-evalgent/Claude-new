# Text-story Shorts: clips to download

## Batch 1 (still needed)

The stories, titles and kit are ready in `upload/UPLOAD_TS_1.md`. Upload the files to the Drive folder **`Fatal batch 1`**.

```bash
yt-dlp -f "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 --write-info-json -o "%(uploader)s - %(title)s [%(id)s].%(ext)s" https://www.youtube.com/watch?v=dYQ2IyMuPes https://www.youtube.com/watch?v=cvCjyWp3rEk https://www.youtube.com/watch?v=-77wtMxT3-M https://www.youtube.com/watch?v=lexz6cg_W04 https://www.youtube.com/watch?v=8pzFZqUVjb4 https://www.youtube.com/watch?v=XuAHZyqsvhI https://www.youtube.com/watch?v=oz8YP3SsE_c https://www.youtube.com/watch?v=inH_GkW02bk https://www.youtube.com/watch?v=zvx0N6m1Oo4 https://www.youtube.com/watch?v=qm0nlcmB3BU https://www.youtube.com/watch?v=5pv8V4SXfzY https://www.youtube.com/watch?v=rl382lAYAdI
```

## Batch 2: the next 10

These are picked from the categories that perform best on their channel (410 established Shorts): **soldiers, police and firefighters**, **funny**, **old people**, **dogs** and **🤝 sportsmanship**. Each one was checked against their 635 titles, and none of these stories is on their channel. Every story was fact-checked against at least two news sources. The kit is ready in `upload/UPLOAD_TS_2.md`.

| # | Title | Clip (+ backup) |
|---|---|---|
| 11_utah_car_lift | Strangers Lifted a Burning Car 🔥🤝 | `B-rCZjI3AFM` |
| 12_captain_tom | 100 Laps at 99 Years Old 💪❤️ | `OrKfFZEfElc` (+ backup `9rGmxlMI_1g`) |
| 13_tom_rice | The Paratrooper Jumped Again at 97 🪂💪 | `zkwX6jJQCtA` (+ backup `lrX1EWMuHhY`) |
| 14_chile_dog | The Dog Who Ran Into Traffic 🐕❤️ | `Y1u5VSYeJYM` (+ backup `LvL8dhPTgZQ`) |
| 15_vogel | The Runner Who Finished Last on Purpose 🏃🤝 | `fuzItapMT4I` (+ backup `IiQ4SNkx_Z8`) |
| 16_tucholsky | Carried Around the Bases by Rivals 🤝❤️ | `xVlKtI7yd_s` |
| 17_bbc_kids | The Kids Who Crashed the BBC 😂✨ | `IKxqy9SJ-0I` |
| 18_koala | The Firefighter and the Thirsty Koala 🐨❤️ | `FvkI8c9eALQ` (+ backup `-XSPx7S4jr4`) |
| 19_kabang | The Dog Who Gave Her Face for Two Girls 🐕❤️ | `kU4arZLI_xY` (+ backup `-OtoWlBwdog`) |
| 20_holets | The Officer Who Said I'll Take Her 👮❤️ | `XYRUWi8mBsA` (+ backup `NOt3ytc1A9w`) |

Upload the files to the Drive folder **`Fatal batch 2`**:

```bash
yt-dlp -f "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 --write-info-json -o "%(uploader)s - %(title)s [%(id)s].%(ext)s" https://www.youtube.com/watch?v=B-rCZjI3AFM https://www.youtube.com/watch?v=OrKfFZEfElc https://www.youtube.com/watch?v=9rGmxlMI_1g https://www.youtube.com/watch?v=zkwX6jJQCtA https://www.youtube.com/watch?v=lrX1EWMuHhY https://www.youtube.com/watch?v=Y1u5VSYeJYM https://www.youtube.com/watch?v=LvL8dhPTgZQ https://www.youtube.com/watch?v=fuzItapMT4I https://www.youtube.com/watch?v=IiQ4SNkx_Z8 https://www.youtube.com/watch?v=xVlKtI7yd_s https://www.youtube.com/watch?v=IKxqy9SJ-0I https://www.youtube.com/watch?v=FvkI8c9eALQ https://www.youtube.com/watch?v=-XSPx7S4jr4 https://www.youtube.com/watch?v=kU4arZLI_xY https://www.youtube.com/watch?v=-OtoWlBwdog https://www.youtube.com/watch?v=XYRUWi8mBsA https://www.youtube.com/watch?v=NOt3ytc1A9w
```

`--write-info-json` saves each clip's uploader and date, which goes into the credit line.

## Hanoi replacement clip

The Vietnam Plus clip is a phone filming a security-camera screen, so the catch can't be seen clearly. Download this clearer news clip and put it in **`Fatal batch 1`**:

```bash
yt-dlp -f "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 --write-info-json -o "%(uploader)s - %(title)s [%(id)s].%(ext)s" https://www.youtube.com/watch?v=y_01Au-TIi8
```
