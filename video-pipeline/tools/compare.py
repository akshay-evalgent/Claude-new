#!/usr/bin/env python3
"""Compare our video's measurements with the references'.

    python3 compare.py --ref REF/measure.json [--ref ...] --out OUT/measure.json \
        [--ref-palette REF/palette.json ...] [--out-palette OUT/palette.json] \
        [--benchmarks benchmarks.json] \
        [--ref-transcript REF/transcript.json ...] [--out-transcript OUT/transcript.json] \
        --write OUT/compare.json

Each row is PASS, WARN or FAIL. With several references the target is the span
they cover, widened by a tolerance. Exit code is 0 even when rows fail: the
quality-checker agent decides what a failure means for this film.
"""
import argparse
import json
from pathlib import Path


def load(p):
    return json.loads(Path(p).read_text())


def span(vals, tol, absolute=0.0, floor=0.0):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    lo, hi = min(vals), max(vals)
    lo = lo - abs(lo) * tol - absolute
    return (lo if floor is None else max(lo, floor)), hi + abs(hi) * tol + absolute


def band(name, ours, refs, tol, wide, unit="", absolute=0.0, note="", floor=0.0):
    """PASS inside the tolerance band, WARN inside the wide band, else FAIL."""
    inner, outer = span(refs, tol, absolute, floor), span(refs, wide, absolute * 2, floor)
    ref_txt = fmt_refs(refs, unit)
    if inner is None:
        return row(name, "SKIP", ours, ref_txt, "no reference value")
    if ours is None:
        return row(name, "FAIL", "none", ref_txt, "missing in our video")
    status = "PASS" if inner[0] <= ours <= inner[1] else "WARN" if outer[0] <= ours <= outer[1] else "FAIL"
    side = "" if status == "PASS" else ("below" if ours < inner[0] else "above") + \
        f" the target {inner[0]:.2f} to {inner[1]:.2f}{unit}"
    if note and status != "PASS" and ours < inner[0]:      # the note explains a shortfall only
        side += ". " + note
    return row(name, status, f"{ours:g}{unit}", ref_txt, side)


def fmt_refs(refs, unit=""):
    refs = [r for r in refs if r is not None]
    if not refs:
        return "-"
    return f"{refs[0]:g}{unit}" if len(set(refs)) == 1 else f"{min(refs):g}-{max(refs):g}{unit}"


def row(name, status, ours, ref, detail=""):
    return {"check": name, "status": status, "ours": str(ours), "reference": str(ref), "detail": detail}


def rgb(hexs):
    hexs = hexs.lstrip("#")
    return tuple(int(hexs[i:i + 2], 16) for i in (0, 2, 4))


def colour_gap(a, b):
    return sum((x - y) ** 2 for x, y in zip(rgb(a), rgb(b))) ** 0.5


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", action="append", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ref-palette", action="append", default=[])
    ap.add_argument("--out-palette")
    ap.add_argument("--benchmarks", help="benchmarks.json: its format.duration_s, where set, is the length target")
    ap.add_argument("--ref-transcript", action="append", default=[], help="a reference's transcript.json")
    ap.add_argument("--out-transcript", help="our transcript.json")
    ap.add_argument("--write", required=True)
    args = ap.parse_args()

    refs = [load(p) for p in args.ref]
    ours = load(args.out)
    rows = []
    g = lambda m, *keys: _get(m, keys)

    # format
    rv, ov = [r["video"] for r in refs], ours["video"]
    same_orient = all(r["orientation"] == ov["orientation"] for r in rv)
    rows.append(row("orientation", "PASS" if same_orient else "FAIL", ov["orientation"],
                    "/".join(sorted({r["orientation"] for r in rv}))))
    rows.append(band("aspect ratio", ov["aspect"], [r["aspect"] for r in rv], 0.02, 0.08))
    min_h = min(r["height"] for r in rv)
    rows.append(row("resolution", "PASS" if ov["height"] >= min_h else "WARN" if ov["height"] >= 0.66 * min_h else "FAIL",
                    f"{ov['width']}x{ov['height']}", "/".join(sorted({f"{r['width']}x{r['height']}" for r in rv}))))
    min_fps = min(r["fps"] for r in rv)
    rows.append(row("frame rate", "PASS" if ov["fps"] >= min_fps - 1 else "WARN", f"{ov['fps']:g} fps",
                    fmt_refs([r["fps"] for r in rv], " fps")))
    want = None
    if args.benchmarks:
        want = (load(args.benchmarks).get("format") or {}).get("duration_s")
    if isinstance(want, list) and len(want) == 2:
        lo, hi = want
        d = ov["duration"]
        rows.append(row("duration", "PASS" if lo - 0.25 <= d <= hi + 0.25 else "WARN" if lo * 0.8 <= d <= hi * 1.2 else "FAIL",
                        f"{d:g} s", f"{lo:g}-{hi:g} s asked for", "the references run " + fmt_refs([r["duration"] for r in rv], " s")))
    else:
        rows.append(band("duration", ov["duration"], [r["duration"] for r in rv], 0.25, 0.5, " s"))

    # edit
    S = lambda m, k: g(m, "shot_stats", k)
    rows.append(band("mean shot length", S(ours, "mean_s"), [S(r, "mean_s") for r in refs], 0.3, 0.6, " s"))
    rows.append(band("cuts per 10 s", S(ours, "cuts_per_10s"), [S(r, "cuts_per_10s") for r in refs], 0.3, 0.6))
    rows.append(band("longest shot", S(ours, "max_s"), [S(r, "max_s") for r in refs], 0.35, 0.7, " s"))
    rows.append(band("final shot share", S(ours, "final_shot_share"), [S(r, "final_shot_share") for r in refs],
                     0.3, 0.6, absolute=0.03))
    fc = [g(r, "hook", "first_cut_s") for r in refs]
    ofc = g(ours, "hook", "first_cut_s")
    if any(v is not None for v in fc):
        limit = max(v for v in fc if v is not None)
        rows.append(row("first cut", "PASS" if ofc is not None and ofc <= limit * 1.3 + 0.3
                        else "WARN" if ofc is not None and ofc <= limit * 2 + 0.5 else "FAIL",
                        f"{ofc} s", fmt_refs(fc, " s"),
                        "" if ofc is not None and ofc <= limit * 1.3 + 0.3 else "our opening shot runs longer than the references'"))

    # movement
    rows.append(band("motion (mean frame change)", g(ours, "motion", "mean"), [g(r, "motion", "mean") for r in refs],
                     0.5, 1.0, absolute=0.3))
    rows.append(band("motion in first 3 s", g(ours, "hook", "motion_mean"), [g(r, "hook", "motion_mean") for r in refs],
                     0.5, 1.0, absolute=0.3))
    max_still = max(r["still_share"] for r in refs)
    rows.append(row("still picture share", "PASS" if ours["still_share"] <= max_still + 0.08
                    else "WARN" if ours["still_share"] <= max_still + 0.2 else "FAIL",
                    f"{ours['still_share']:.0%}", fmt_refs([round(r['still_share'] * 100) for r in refs], "%"),
                    "" if ours["still_share"] <= max_still + 0.08 else "more frozen picture than any reference"))
    longest = lambda m: max([s["dur"] for s in m["stills"]], default=0.0)
    ref_long = max(longest(r) for r in refs)
    rows.append(row("longest frozen stretch", "PASS" if longest(ours) <= ref_long + 0.4
                    else "WARN" if longest(ours) <= ref_long + 1.2 else "FAIL",
                    f"{longest(ours):g} s", fmt_refs([longest(r) for r in refs], " s")))
    max_hold = max(r["end_hold_s"] for r in refs)
    rows.append(row("end hold", "PASS" if ours["end_hold_s"] <= max_hold + 0.3
                    else "WARN" if ours["end_hold_s"] <= max_hold + 1.0 else "FAIL",
                    f"{ours['end_hold_s']:g} s", fmt_refs([r["end_hold_s"] for r in refs], " s")))
    rows.append(row("empty frames", "PASS" if not ours["flat_runs"] else "FAIL",
                    f"{len(ours['flat_runs'])} runs", f"{max(len(r['flat_runs']) for r in refs)} runs",
                    "" if not ours["flat_runs"] else f"blank picture at {ours['flat_runs']}"))

    # sound
    ref_audio = [r["audio"] for r in refs if r.get("audio")]
    oa = ours.get("audio")
    if ref_audio:
        if not oa:
            rows.append(row("sound", "FAIL", "none", "present", "the references have sound and ours has none"))
        else:
            rows.append(row("sound", "PASS", "present", "present"))
            rows.append(band("loudness", oa["integrated_lufs"], [a["integrated_lufs"] for a in ref_audio],
                             0.0, 0.0, " LUFS", absolute=1.5, floor=None))
            peak = oa["true_peak_dbtp"]
            rows.append(row("true peak", "PASS" if peak is not None and peak <= -1.0 else "WARN" if peak is not None and peak <= -0.3 else "FAIL",
                            f"{peak} dBTP", fmt_refs([a["true_peak_dbtp"] for a in ref_audio], " dBTP"),
                            "" if peak is not None and peak <= -1.0 else "will clip after platform re-encoding"))
            min_aud = min(a["audible_share"] for a in ref_audio)
            rows.append(row("audible share", "PASS" if oa["audible_share"] >= min_aud - 0.1
                            else "WARN" if oa["audible_share"] >= min_aud - 0.3 else "FAIL",
                            f"{oa['audible_share']:.0%}", fmt_refs([round(a['audible_share'] * 100) for a in ref_audio], "%")))
            rows.append(band("sound events per second", oa["onsets_per_s"], [a["onsets_per_s"] for a in ref_audio],
                             0.4, 0.8, absolute=0.2,
                             note="a voice produces 1.5-3 a second; far fewer usually means no voice-over"))
            rs = [r["sync"]["share_on_sound"] for r in refs if r.get("sync")]
            if rs:
                os_ = ours["sync"]["share_on_sound"] if ours.get("sync") else None
                rows.append(row("cuts landing on a sound", "FAIL" if os_ is None else "PASS" if os_ >= min(rs) - 0.15
                                else "WARN" if os_ >= min(rs) - 0.35 else "FAIL",
                                "none" if os_ is None else f"{os_:.0%}", fmt_refs([round(v * 100) for v in rs], "%")))

    # voice
    if args.ref_transcript and args.out_transcript:
        rt = [load(p)["stats"] for p in args.ref_transcript]
        rt = [t for t in rt if t.get("words")]
        ot = load(args.out_transcript)["stats"]
        if rt and not ot.get("words"):
            rows.append(row("voice", "FAIL", "no speech found", "speech", "the references are narrated and ours is not"))
        elif rt:
            rows.append(band("first word", ot["first_word_s"], [t["first_word_s"] for t in rt], 0.0, 0.0, " s",
                             absolute=0.4))
            rows.append(band("words a minute, whole run", ot["words_per_minute"], [t["words_per_minute"] for t in rt],
                             0.15, 0.3))
            rows.append(band("words a minute, while speaking", ot["speaking_rate_wpm"],
                             [t["speaking_rate_wpm"] for t in rt], 0.12, 0.25))
            rows.append(band("voice running, share of run", ot["speech_share"], [t["speech_share"] for t in rt],
                             0.15, 0.35))

    # colour
    if args.ref_palette and args.out_palette:
        rp, op = [load(p) for p in args.ref_palette], load(args.out_palette)
        gap = min(colour_gap(op["ground"], p["ground"]) for p in rp)
        rows.append(row("ground colour", "PASS" if gap <= 30 else "WARN" if gap <= 60 else "FAIL",
                        op["ground"], "/".join(p["ground"] for p in rp), f"distance {gap:.0f} of 441"))
        rows.append(band("brightness", op["luminance_mean"], [p["luminance_mean"] for p in rp], 0.1, 0.25))
        rows.append(band("saturation", op["saturation_mean"], [p["saturation_mean"] for p in rp], 0.3, 0.7, absolute=0.03))
        rows.append(band("dark ink share", op["dark_share"], [p["dark_share"] for p in rp], 0.5, 1.0, absolute=0.01))
        ra = [p["accent"] for p in rp if p.get("accent")]
        if ra:
            if not op.get("accent"):
                rows.append(row("accent colour", "FAIL", "none", "/".join(a["hex"] for a in ra),
                                "the references carry an accent colour and ours has none"))
            else:
                hue = min(abs(((op["accent"]["hue_deg"] - a["hue_deg"] + 180) % 360) - 180) for a in ra)
                rows.append(row("accent colour", "PASS" if hue <= 15 else "WARN" if hue <= 35 else "FAIL",
                                op["accent"]["hex"], "/".join(a["hex"] for a in ra), f"hue {hue:.0f} degrees apart"))
        elif op.get("accent"):
            rows.append(row("accent colour", "WARN", op["accent"]["hex"], "none",
                            "ours has a strong colour the references do not"))
        rows.append(row("colour character", "PASS" if op["colourfulness"] in {p["colourfulness"] for p in rp} else "WARN",
                        op["colourfulness"], "/".join(sorted({p["colourfulness"] for p in rp}))))

    counts = {s: sum(1 for r in rows if r["status"] == s) for s in ("PASS", "WARN", "FAIL", "SKIP")}
    result = {"references": args.ref, "ours": args.out, "counts": counts, "rows": rows}
    Path(args.write).parent.mkdir(parents=True, exist_ok=True)
    Path(args.write).write_text(json.dumps(result, indent=1))

    print("| Check | Result | Ours | Reference | Note |")
    print("|---|---|---|---|---|")
    for r in rows:
        print(f"| {r['check']} | {r['status']} | {r['ours']} | {r['reference']} | {r['detail']} |")
    print(f"\n{counts['PASS']} pass, {counts['WARN']} warn, {counts['FAIL']} fail. wrote {args.write}")


def _get(m, keys):
    for k in keys:
        if m is None:
            return None
        m = m.get(k)
    return m


if __name__ == "__main__":
    main()
