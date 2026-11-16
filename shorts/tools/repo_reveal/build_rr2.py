"""Clip specs for Repo Reveal batch 2 (edits_bd/06-15): builds every source clip with fx_clips.py / cards.py.

    RR_WORK=/path/to/workdir python3 tools/repo_reveal/build_rr2.py [clip names...]

RR_WORK holds the cloned repos (repos/), downloaded demo media (dl/) and our model outputs
(esr_out/ from esr_run.py, da2_out/ from da2_run.py, fw/ from fw_run.py, kokoro/, ta/ from ta_rec.js).
"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
S = os.environ.get("RR_WORK", "/path/to/workdir")   ; R = S + "/repos"; D = S + "/dl"; SH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SPEC, SRC = S + "/rr2_spec", S + "/rr2_src"
FP = D + "/fp/"; SAM = D + "/sam2meta/"; TR = D + "/tr1/"; IOP = R + "/IOPaint/assets/"; RB = R + "/rembg/examples/"
ESR_IN = R + "/Real-ESRGAN/inputs/"; ESR = S + "/esr_out/"; DA = S + "/da2_out/"; DAP = D + "/da2/compare_sd__"
fw = json.load(open(S + "/fw/apollo.json"))
fw_lines = [f"{s['start']:6.2f}-{s['end']:6.2f} {s['text']}" for s in fw["segments"]]
HOW = "fx"
C = []   # (tool, kind, name, spec)
def fx(kind, _n, **spec): C.append(("fx_clips.py", kind, _n, spec))
def card(kind, _n, **spec): C.append(("cards.py", kind, _n, spec))
SQ = [0, 68, 1080, 1012]          # square 1080 demo -> card aspect
# ---- 06 FramePack
fx("img2vid", "fp_burger", image=FP+"250413_163713_287_6141.png", video=FP+"250413_163713_287_6141_37.mp4", dur=4.8)
fx("img2vid", "fp_statue", image=FP+"250413_175839_722_4670.png", video=FP+"250413_175839_722_4670_37.mp4", dur=4.8)
fx("img2vid", "fp_penguin", image=FP+"250413_171501_349_5557.png", video=FP+"250413_171501_349_5557_37.mp4", dur=4.8)
fx("img2vid", "fp_baby", image=FP+"250413_181002_054_8480.png", video=FP+"250413_181002_054_8480_37.mp4", dur=4.8)
card("prompt", "fp_how", label="HOW · free (Windows one-click)", dur=9, text="1. github.com/lllyasviel/FramePack\n2. Download the one-click package\n3. Run update.bat, then run.bat\n4. Upload a photo + describe the motion\n5. Click Start Generation\n\nNeeds an NVIDIA RTX 30/40/50 GPU\nwith 6 GB+ (laptops work)")
fx("img2vid", "fp_minute", image=FP+"250415_182916_672_932.png", video=FP+"250415_182916_672_932_451.mp4", dur=5.0, speed=12, timer=True, timer_total="1:00", speed_tag=True)
fx("img2vid", "fp_dj", image=FP+"250415_192014_068_6988.png", video=FP+"250415_192014_068_6988_451.mp4", **{"in": 20}, dur=5.0)
# ---- 07 SAM 2
fx("crop", "sam_juggle", video=SAM+"s6.mp4", box=SQ, dur=5.0, **{"in": 0.3})
fx("crop", "sam_coffee", video=SAM+"s3.mp4", box=SQ, dur=6.0, **{"in": 2.6})
fx("crop", "sam_bird", video=SAM+"s7.mp4", box=SQ, dur=4.0, **{"in": 1.8})
fx("crop", "sam_bird2", video=SAM+"s7.mp4", box=SQ, dur=4.0, **{"in": 7.0})
card("prompt", "sam_how", label="HOW · free, in your browser", dur=8, text="1. Open sam2.metademolab.com\n2. Pick a sample or upload a video\n3. Click the object you want\n4. Hit \"Track objects\"\n5. Add an effect, then download\n\nRun it yourself (Apache-2.0):\ngithub.com/facebookresearch/sam2")
fx("crop", "sam_skate", video=SAM+"s9.mp4", box=[0, 0, 1920, 1080], fit="contain", dur=8.6, **{"in": 0.8})
# ---- 08 Depth Anything V2
fx("wipe", "da_room", before=DAP+"room_img.jpg", after=DA+"room_color.png", dur=3.4, hold=0.6, label_before="PHOTO", label_after="DEPTH")
fx("wipe", "da_cats", before=DAP+"demo17_img.jpg", after=DA+"cats_color.png", dur=4.0, hold=0.6, label_before="PHOTO", label_after="DEPTH")
fx("wipe", "da_painting", before=DAP+"landscape_painting_img.jpg", after=DA+"painting_color.png", dur=3.2, hold=0.5, label_before="PAINTING", label_after="DEPTH")
fx("wipe", "da_sketch", before=DAP+"sketch_img.jpg", after=DA+"sketch_color.png", dur=3.2, hold=0.5, label_before="SKETCH", label_after="DEPTH")
card("prompt", "da_how", label="HOW · free, in your browser", dur=8, text="1. Open huggingface.co/spaces/\n   depth-anything/Depth-Anything-V2\n2. Upload any photo\n3. Download the depth map\n\nFor a 3D camera move: use the depth\nmap as displacement in Blender or\nAfter Effects")
fx("wipe", "da_apollo_w", before=S+"/dl/nasa/as11-40-5903.jpg", after=DA+"apollo_color.png", crop=[0, 0, 1920, 1680], dur=2.6, hold=0.4, label_before="1969 PHOTO", label_after="DEPTH")
fx("parallax", "da_apollo", image=S+"/dl/nasa/as11-40-5903.jpg", depth=DA+"apollo.npy", box=[0, 0, 1920, 1680], dur=6.0, amp=0.07, zoom=0.08, turns=1.0, focus=0.4, margin=0.16)
fx("parallax", "da_cats3d", image=DAP+"demo17_img.jpg", depth=DA+"cats.npy", dur=4.5, amp=0.06, zoom=0.06, turns=0.8, focus=0.4)
# ---- 09 IOPaint
fx("wipe", "iop_person", before=IOP+"unwant_person.jpg", after=IOP+"unwant_person_clean.jpg", dur=3.4, hold=0.6, fit="contain")
fx("wipe", "iop_object", before=IOP+"unwant_object.jpg", after=IOP+"unwant_object_clean.jpg", dur=3.6, hold=0.6, fit="contain")
fx("wipe", "iop_old", before=IOP+"old_photo.jpg", after=IOP+"old_photo_clean.jpg", dur=3.0, hold=0.5, fit="contain")
fx("wipe", "iop_manga", before=IOP+"manga.png", after=IOP+"manga_clean.png", crop=[0, 0, 900, 1010], dur=3.0, hold=0.5, fit="contain")
card("prompt", "iop_how", label="HOW · free, runs on your laptop", dur=8, text="pip3 install iopaint\niopaint start --model=lama\n  --device=cpu --port=8080\n\nOpen localhost:8080 in your browser\nand brush over what you want gone.\n\nNo install: huggingface.co/spaces/\nSanster/iopaint-lama")
fx("wipe", "iop_dog", before=IOP+"dog.jpg", after=IOP+"fox.jpg", dur=3.6, hold=0.6, fit="contain", label_before="BEFORE", label_after="AFTER")
# ---- 10 rembg
fx("cutout", "rb_lion", image=RB+"animal-3.jpg", cut=RB+"animal-3.out.png", dur=3.2, hold=0.4, scan=1.0)
fx("cutout", "rb_car", image=RB+"car-2.jpg", cut=RB+"car-2.out.png", dur=3.4, hold=0.4, scan=1.0)
fx("cutout", "rb_anime", image=RB+"anime-girl-3.jpg", cut=RB+"anime-girl-3.out.png", dur=3.0, hold=0.3, scan=0.9)
fx("cutout", "rb_food", image=RB+"food-1.jpg", cut=S+"/rb_extra/food-1.out.png", dur=3.0, hold=0.3, scan=0.9)
card("prompt", "rb_how", label="HOW · free, offline", dur=8, text="pip install \"rembg[cpu,cli]\"\n\nOne photo:\nrembg i photo.jpg cutout.png\n\nA whole folder:\nrembg p photos/ cutouts/\n\ngithub.com/danielgatis/rembg")
pairs = [[RB+f"{n}.jpg", RB+f"{n}.out.png"] for n in ["animal-1", "animal-2", "animal-3", "car-1", "car-2", "car-3", "girl-1", "girl-2", "girl-3", "anime-girl-1", "anime-girl-2"]] + [[RB+"food-1.jpg", S+"/rb_extra/food-1.out.png"]]
fx("grid", "rb_grid", pairs=pairs, cols=4, dur=4.2, start=0.5, stagger=0.16)
fx("cutout", "rb_moon", image=RB+"girl-1.jpg", cut=RB+"girl-1.out.png", bg=S+"/dl/nasa/earthrise_crop.jpg", dur=4.0, hold=0.3, scan=0.9)
# ---- 11 Real-ESRGAN
fx("wipe", "esr_eyes", before=ESR_IN+"wolf_gray.jpg", after=ESR+"wolf_gray.png", crop=[300, 500, 780, 860], dur=3.2, hold=0.5)
fx("wipe", "esr_wolf", before=ESR_IN+"wolf_gray.jpg", after=ESR+"wolf_gray.png", fit="contain", dur=4.0, hold=0.6)
fx("wipe", "esr_anime", before=ESR_IN+"0030.jpg", after=ESR+"0030.png", crop=[160, 40, 720, 560], dur=3.0, hold=0.4)
fx("wipe", "esr_beach", before=ESR_IN+"ADE_val_00000114.jpg", after=ESR+"ADE_val_00000114.png", crop=[0, 300, 1024, 1000], dur=3.0, hold=0.4)
card("prompt", "esr_how", label="HOW · free, no install", dur=8, text="1. github.com/xinntao/Real-ESRGAN\n   → portable app (Windows/Mac/Linux)\n   works with Intel, AMD, NVIDIA GPUs\n2. Unzip, then run:\n\nrealesrgan-ncnn-vulkan -i photo.jpg\n  -o big.png -n realesrgan-x4plus")
fx("wipe", "esr_cartoon", before=ESR_IN+"0014.jpg", after=ESR+"0014.png", fit="contain", before_resample="nearest", dur=4.2, hold=0.7, label_before="179 px", label_after="4x AI")
# ---- 12 Kokoro
K = S + "/kokoro/"
fx("voice", "ko_heart", wav=K+"af_heart.wav", name="af_heart", desc="American English · female", text="\"None of us are real people.\"")
fx("voice", "ko_george", wav=K+"bm_george.wav", name="bm_george", desc="British English · male", text="\"We're all one free AI model.\"")
fx("voice", "ko_bella", wav=K+"af_bella.wav", name="af_bella", desc="American English · female", text="\"Just eighty-two million parameters.\"")
fx("voice", "ko_fenrir", wav=K+"am_fenrir.wav", name="am_fenrir", desc="American English · male", text="\"Running on a normal laptop.\"")
fx("voice", "ko_emma", wav=K+"bf_emma.wav", name="bf_emma", desc="British English · female", text="\"No internet. No subscription.\"")
card("prompt", "ko_how", label="HOW · free", dur=8, text="Try it in your browser:\nhuggingface.co/spaces/hexgrad/Kokoro-TTS\n\nOr on your laptop:\npip install kokoro soundfile\n(+ espeak-ng)\n\nEnglish, Spanish, French, Hindi,\nItalian, Japanese, Portuguese, Chinese")
fx("voice", "ko_michael", wav=K+"am_michael_twist.wav", name="am_michael", desc="the narrator of this video", text="\"And the last voice? It's me. I've been Kokoro this whole time.\"")
# ---- 13 faster-whisper
V = S + "/tech_src/nasa_apollo11_descent.mp4"; W = S + "/fw/apollo.json"
fx("subs", "fw_open", video=V, words=W, dur=6.0, tag="AUTO-SUBTITLES · OFFLINE", **{"in": 0.2})
card("terminal", "fw_term", title="~/apollo11", dur=7, commands=[{"cmd": "python3 fw_run.py apollo.wav apollo.json", "output": "load 9.1s transcribe 21.7s for 75.0s audio\n" + "\n".join(fw_lines[:3])}])
fx("subs", "fw_alarm", video=V, words=W, dur=7.0, tag="AUTO-SUBTITLES · OFFLINE", **{"in": 9.6})
card("prompt", "fw_how", label="HOW · free, offline", dur=9, text="pip install faster-whisper\n\nfrom faster_whisper import WhisperModel\nm = WhisperModel(\"small.en\",\n      compute_type=\"int8\")\nsegs, info = m.transcribe(\"video.mp4\")\nfor s in segs:\n    print(s.start, s.end, s.text)")
fx("subs", "fw_landing", video=V, words=W, dur=11.0, tag="AUTO-SUBTITLES · OFFLINE", **{"in": 56.2})
# ---- 14 TRELLIS
fx("img2vid", "tr_dragon", image=TR+"loong.png", video=TR+"loong.mp4", layout="side", dur=4.0, bg=[18, 18, 22])
fx("img2vid", "tr_mushroom", image=TR+"mushroom.png", video=TR+"mushroom.mp4", layout="side", dur=5.0, **{"in": 1.0})
fx("img2vid", "tr_ship", image=TR+"ship.png", video=TR+"ship.mp4", layout="side", dur=3.0, **{"in": 2.0})
fx("img2vid", "tr_monkey", image=TR+"monkey_astronaut.png", video=TR+"monkey_astronaut.mp4", layout="side", dur=4.0, **{"in": 1.0})
card("prompt", "tr_how", label="HOW · free, in your browser", dur=8, text="1. huggingface.co/spaces/\n   microsoft/TRELLIS.2\n2. Upload one image\n3. Generate, then download the\n   3D file (.glb)\n\nRun it yourself (MIT):\ngithub.com/microsoft/TRELLIS.2\n(needs a 24 GB NVIDIA GPU)")
fx("crop", "tr2_mermaid", video=D+"/trellis/trellis2.mp4", box=[560, 0, 1796, 1080], dur=2.6, speed=0.65, **{"in": 16.3})
fx("crop", "tr2_grid", video=D+"/trellis/trellis2.mp4", box=[342, 0, 1578, 1080], dur=2.6, speed=0.8, **{"in": 50.8})
# ---- 15 textarea.my
T = S + "/ta/steps.json"
fx("browser", "ta_tease", steps=T, **{"from": -1}, last_hold=3.0)
fx("browser", "ta_type", steps=T, **{"from": 0, "to": -1}, each=0.11, last_hold=1.0)
card("terminal", "ta_decode", title="~/what-is-in-the-link", dur=7, commands=[{"cmd": "python3 decode_link.py \"$URL\"", "output": "# Note to future me\n\nThis whole note lives in the link.\nNo account. No server. No app.\n\nSend the link = send the note."}])
card("prompt", "ta_how", label="HOW · free, no sign-up", dur=9, text="1. Open textarea.my\n2. Type (start with # Title)\n3. Copy the link from the address bar.\n   That link IS your note.\n\nCtrl+S saves it as an HTML file.\nNo passwords: anyone with the link\ncan read it.")
fx("browser", "ta_reopen", steps=T, **{"from": -1}, last_hold=3.5, reopen_tag="BRAND-NEW BROWSER")

only = set(sys.argv[1:])
def go(c):
    tool, kind, name, spec = c
    if only and name not in only: return name + " skip"
    sp = f"{SPEC}/{name}.json"; json.dump(spec, open(sp, "w"))
    r = subprocess.run(["python3", f"{SH}/{tool}", kind, sp, f"{SRC}/{name}.mp4"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    return name + (" ok" if r.returncode == 0 else " FAIL " + r.stderr[-600:])
with ThreadPoolExecutor(3) as ex:
    for res in ex.map(go, C): print(res, flush=True)
