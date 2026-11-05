"""Package only the newly made posts into their own folder and zip.

Usage: python3 scripts/make_batch.py <batch-name> <slug> [<slug> ...]
Output: upload-kit/batches/<batch-name>/  and  dist/batches/founder-signal-<batch-name>.zip
"""
import os, sys, shutil
sys.path.insert(0, os.path.dirname(__file__))
from build_posts import POSTS, ROOT, write_post

def main():
    name, slugs = sys.argv[1], sys.argv[2:]
    by_slug = {p["slug"]: p for p in POSTS}
    missing = [s for s in slugs if s not in by_slug]
    if missing: sys.exit(f"unknown slugs: {missing}")
    folder = f"founder-signal-{name}"
    out = os.path.join(ROOT, "upload-kit", "batches", folder)
    if os.path.exists(out): shutil.rmtree(out)
    os.makedirs(out)
    rows = ["# Posts in this batch, in posting order\n", "| # | When (IST) | Pillar | Folder |", "|---|---|---|---|"]
    for i, s in enumerate(slugs, 1):
        rows.append(write_post(by_slug[s], i, out))
    rows += ["", "Each folder has: image.png (portrait, use this), image-square.png (alternative),",
             "caption.txt (paste into the post), first-comment.txt (post right after, then pin it),",
             "how-to-post.txt (the clicks). Never post a [bracket]: replace it or delete the line."]
    with open(os.path.join(out, "00-READ-ME-FIRST.md"), "w") as f: f.write("\n".join(rows) + "\n")
    dist = os.path.join(ROOT, "dist", "batches"); os.makedirs(dist, exist_ok=True)
    z = shutil.make_archive(os.path.join(dist, folder), "zip", os.path.dirname(out), folder)
    print(z)

if __name__ == "__main__":
    main()
