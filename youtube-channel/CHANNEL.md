# Say It For Me: channel kit

Everything to turn the existing channel into **Say It For Me**. Copy each block into YouTube
Studio as it is.

## Name and handle

**Channel name:** Say It For Me

It's the reason people share the Shorts: a viewer sends one to their mom, dad or partner because
it says what they couldn't. It also works as a caption ("this one says it for me").

**Handle:** try these in order until one is free (YouTube shows availability as you type):

1. `@sayitforme`
2. `@sayitforme.voice`
3. `@sayitformeshorts`
4. `@sayitforme_notes`

YouTube limits how often you can change the name and handle (twice in 14 days), so decide before
you start typing.

## Images (in this folder)

| File | Where it goes | Size |
|---|---|---|
| `profile.png` | Customization → Branding → Picture | 800×800, shown as a circle |
| `banner.png` | Customization → Branding → Banner image | 2560×1440; text sits in the 1546×423 area every device shows |
| `watermark.png` | Customization → Branding → Video watermark | 300×300 transparent PNG (`watermark-150.png` if it asks for 150×150) |

For the watermark, choose **Display time: Entire video**. It shows on long videos; Shorts don't
display it.

## Description (Customization → Basic info → Description)

```
Tiny voice notes for the people you can't say it to.

Mom asking if you ate. Dad finally saying he's proud. The sorry you couldn't type. Your sister covering for you, again. Every Short is one small conversation almost everyone has had, from the people who love you most.

Seven voices, seven playlists:
Mom, Dad, Girlfriend, Boyfriend, Sister, Brother, Best Friend.

Found the one that says it for you? Send it to them.

A new voice note every day.

All characters are fictional. Voices are made with AI from the creator's own acted performances.
```

## Keywords (Settings → Channel → Basic info → Keywords)

```
pov, voice note, voice notes, mom, maa, dad, papa, girlfriend, boyfriend, sister, brother, best friend, family, relationship, emotional shorts, i miss you, proud of you, sorry, comfort, shorts
```

## Playlists (create all seven, Public)

| Title | Description |
|---|---|
| POV: Your Mom | Maa's voice notes: did you eat, call me back, I'm proud of you. For the mom who worries because she loves you. |
| POV: Your Dad | Papa doesn't say much. These are the things he means. For the dad who never says it. |
| POV: Your Girlfriend | Meera's late-night voice notes: the sorry, the miss-you, the proud-of-you. For the one you can't stop thinking about. |
| POV: Your Boyfriend | Arjun's voice notes: text me when you reach, you're enough, I was wrong. For the one who means it but can't say it. |
| POV: Your Sister | Didi's voice notes: half teasing, half love letter. For the sibling who always covers for you. |
| POV: Your Brother | Bhaiya's voice notes: bad at texting, great in a crisis. For the brother who shows love by showing up. |
| POV: Your Best Friend | Voice notes from the friend who stayed. For the one who noticed when you went quiet. |

## Upload defaults (Settings → Upload defaults)

So every upload starts correctly:

- **Description:**
  ```
  A tiny voice note, for the person you can't say it to.

  Fictional character, made with AI from the creator's own acted performance.
  #pov #shorts
  ```
- **Tags:** `pov, voice note, shorts`
- **Category:** People & Blogs
- **Video language:** English

`make_video.py` writes an `upload.txt` with the exact title, description, hashtags and pinned
comment for each Short. Paste that over these defaults.

## Convert the channel, step by step

Do these in YouTube Studio (studio.youtube.com) on a computer, or the YouTube Studio app.

1. **Hide the 4 old videos.** Go to **Content**, tick the four videos, then **Edit → Visibility →
   Private**. Private keeps them safe and lets you bring them back later. Old videos on another
   topic confuse new viewers and YouTube's sense of what the channel is about.
2. **Name, handle, description.** Go to **Customization → Basic info**. Change the name to
   *Say It For Me*, pick a handle from the list above, and paste the description. Click
   **Publish** (top right).
3. **Images.** Go to **Customization → Branding**. Upload `profile.png` as the picture,
   `banner.png` as the banner and `watermark.png` as the video watermark, adjusting the crop
   boxes if YouTube shows them (they should already fit). Click **Publish**.
4. **Audience.** Go to **Settings → Channel → Advanced settings** and choose **No, set this
   channel as not made for kids**. The themes (romance, family, sadness) are for teens and adults.
5. **Keywords and country.** In **Settings → Channel → Basic info**, set your country and paste
   the keywords.
6. **Upload defaults.** Fill in **Settings → Upload defaults** as above.
7. **Playlists.** Go to **Content → Playlists → New playlist** (or create them from the YouTube
   app) and make the seven playlists, each Public, with its description.
8. **Home page layout.** Go to **Customization → Layout** and add a section for each playlist, so
   visitors can pick their person straight away.

Then the first Short: upload it, tick **Altered or synthetic content: Yes**, add it to its
playlist, upload the `.srt` as subtitles, and pin the comment from `upload.txt`.
