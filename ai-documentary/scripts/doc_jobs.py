"""WanGP job files for an AI-footage documentary (run with science-of-fitness/scripts/video/run_on_kaggle.py --images).

    python3 ai-documentary/scripts/doc_jobs.py stills DOC_DIR OUT.json [--only 04C,09A] [--seed-offset 0]
    python3 ai-documentary/scripts/doc_jobs.py motion DOC_DIR OUT.json [--reroll 04C,09A] [--seed-offset 100]

stills: one Krea 2 Turbo still per shot (1536x864).
motion: Wan 2.2 5B clip (5 s, 1248x704) for every shot with a motion prompt, starting from DOC_DIR/stills/<id>.jpg.
        Shots in --reroll get a new still in the same run first, and their clip starts from it.
"""
import argparse, json, os

NEG = "cartoon, painting, cgi, 3d render, morphing, warping, flicker, jitter, fast camera, camera shake, text, watermark, blurry"


def still_task(s, seed):
    return {"settings_version": 2.83, "model_type": "krea2_turbo", "image_mode": 1, "prompt": s["still"],
            "resolution": "1536x864", "seed": seed, "batch_size": 1, "prompt_enhancer": "", "output_filename": s["id"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["stills", "motion"])
    ap.add_argument("doc"); ap.add_argument("out")
    ap.add_argument("--only", default=""); ap.add_argument("--reroll", default="")
    ap.add_argument("--seed-offset", type=int, default=0)
    a = ap.parse_args()
    spec = json.load(open(os.path.join(a.doc, "shots.json")))
    shots = spec["shots"]
    jobs, refs = [], []
    if a.mode == "stills":
        only = {x.strip() for x in a.only.split(",") if x.strip()}
        for i, s in enumerate(shots):
            if not only or s["id"] in only:
                jobs.append(still_task(s, 4000 + a.seed_offset + i))
    else:
        reroll = {x.strip() for x in a.reroll.split(",") if x.strip()}
        for i, s in enumerate(shots):
            if s["id"] in reroll:
                jobs.append(still_task(s, 4000 + a.seed_offset + i))  # new still, made first
        for i, s in enumerate(shots):
            if not s["motion"]:
                continue
            if s["id"] in reroll:
                start = "@" + s["id"]
            else:
                path = os.path.join(a.doc, "stills", s["id"] + ".jpg")
                assert os.path.exists(path), f"missing still {path}"
                refs.append(os.path.abspath(path)); start = s["id"] + ".jpg"
            jobs.append({"settings_version": 2.83, "model_type": "ti2v_2_2_fastwan", "prompt": s["motion"],
                         "negative_prompt": NEG, "image_prompt_type": "S", "image_start": start,
                         "resolution": "1248x704", "video_length": 121, "seed": 77 + i, "repeat_generation": 1,
                         "prompt_enhancer": "", "output_filename": f"clip_{s['id']}"})
    json.dump({"jobs": jobs, "refs": refs}, open(a.out, "w"), indent=1, ensure_ascii=False)
    print(f"{len(jobs)} jobs, {len(refs)} reference images -> {a.out}")


if __name__ == "__main__":
    main()
