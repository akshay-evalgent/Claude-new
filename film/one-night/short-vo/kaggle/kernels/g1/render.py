# Render one slice of "One Night" on a Kaggle machine and encode it as a near-lossless video segment.
# The slice bounds and whether to try the GPU are filled in by kaggle/make_kernels.py.
import os, subprocess, glob, shutil, time, json
FROM, TO, TRY_GPU = 0, 786, True
OUT = "/kaggle/working"; FR = "/tmp/frames"; os.makedirs(FR, exist_ok=True)
T0 = time.time()
def sh(cmd, t=3600):
    print(f"\n$ {cmd}", flush=True)
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=t)
        out = r.stdout + r.stderr; print(out[-3000:], flush=True); return r.returncode, out
    except subprocess.TimeoutExpired:
        print("[timeout]", flush=True); return 124, ""
src = glob.glob("/kaggle/input/**/index.html", recursive=True)[0]
print("page:", src, os.path.getsize(src), flush=True)
sh("nproc; free -g | head -2; nvidia-smi --query-gpu=name,driver_version --format=csv,noheader 2>&1 | head -2")
sh("pip install -q playwright 2>&1 | tail -2", t=900)
sh("playwright install --with-deps chromium 2>&1 | tail -3", t=1800)
if shutil.which("ffmpeg") is None: sh("apt-get -qq update && apt-get -qq install -y ffmpeg >/dev/null 2>&1; which ffmpeg", t=900)

SWIFT = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
args = SWIFT
if TRY_GPU:
    # Kaggle mounts only NVIDIA's compute libraries. Unpack the matching driver and add the EGL / GL ones.
    ver = subprocess.run("nvidia-smi --query-gpu=driver_version --format=csv,noheader", shell=True, capture_output=True, text=True).stdout.split()[0]
    run = f"/tmp/NVIDIA-{ver}.run"
    for url in (f"https://us.download.nvidia.com/tesla/{ver}/NVIDIA-Linux-x86_64-{ver}.run",
                f"https://us.download.nvidia.com/XFree86/Linux-x86_64/{ver}/NVIDIA-Linux-x86_64-{ver}.run"):
        if sh(f"curl -sfL -o {run} {url} && ls -la {run}", t=900)[0] == 0: break
    sh(f"rm -rf /tmp/nv && sh {run} -x --target /tmp/nv >/dev/null && ls /tmp/nv | grep -i -E 'egl|glx|glcore|gpucomp|tls|glsi' | head -40", t=900)
    libdir = "/usr/lib/x86_64-linux-gnu"; added = []
    for f in sorted(glob.glob(f"/tmp/nv/*.so.{ver}")):
        name = os.path.basename(f)
        if any(k in name for k in ("EGL_nvidia", "nvidia-eglcore", "nvidia-glcore", "nvidia-glsi", "nvidia-tls", "GLX_nvidia",
                                   "GLESv2_nvidia", "GLESv1_CM_nvidia", "nvidia-gpucomp", "nvidia-glvkspirv", "nvidia-rtcore", "nvidia-allocator")):
            dst = os.path.join(libdir, name)
            if not os.path.exists(dst): shutil.copy2(f, dst); added.append(name)
        base = name.split(".so")[0] + ".so"
        for link in (os.path.join(libdir, base + ".0"), os.path.join(libdir, base + ".1"), os.path.join(libdir, base + ".2")):
            pass
    for stem in ("libEGL_nvidia", "libGLX_nvidia", "libGLESv2_nvidia", "libGLESv1_CM_nvidia"):
        so = glob.glob(f"{libdir}/{stem}.so.{ver}")
        for n in ("0", "1", "2"):
            ln = f"{libdir}/{stem}.so.{n}"
            if so and not os.path.exists(ln): os.symlink(so[0], ln)
    print("added:", added, flush=True)
    sh("ldconfig 2>/dev/null; true")
    os.makedirs("/usr/share/glvnd/egl_vendor.d", exist_ok=True)
    open("/usr/share/glvnd/egl_vendor.d/10_nvidia.json", "w").write('{"file_format_version":"1.0.0","ICD":{"library_path":"libEGL_nvidia.so.0"}}')
    os.makedirs("/usr/share/vulkan/icd.d", exist_ok=True)
    open("/usr/share/vulkan/icd.d/nvidia_icd.json", "w").write('{"file_format_version":"1.0.0","ICD":{"library_path":"libGLX_nvidia.so.0","api_version":"1.3"}}')
    os.environ["NVIDIA_DRIVER_CAPABILITIES"] = "all"
    sh("apt-get -qq install -y libegl1 libgles2 libvulkan1 mesa-utils-extra >/dev/null 2>&1; eglinfo 2>&1 | grep -i -E 'vendor|renderer|version' | head -12", t=900)
    from playwright.sync_api import sync_playwright
    cands = [["--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist", "--enable-gpu"],
             ["--use-gl=egl", "--ignore-gpu-blocklist", "--enable-gpu"],
             ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--enable-gpu"]]
    for c in cands:
        try:
            with sync_playwright() as p:
                b = p.chromium.launch(args=c); pg = b.new_page()
                r = pg.evaluate("""() => { const g = document.createElement('canvas').getContext('webgl2'); if(!g) return 'none';
                  const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); }""")
                b.close()
            print("renderer with", c, "->", r, flush=True)
            if "nvidia" in r.lower() or "tesla" in r.lower():
                args = c; break
        except Exception as e:
            print("failed", c, e, flush=True)
print("USING", args, flush=True)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=args)
    pg = b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
    pg.goto("file://" + src + "?render=1&k=0&scale=1.0&kbase=4&khi=6")
    pg.wait_for_function("window.__ready === true || window.__error", timeout=900000)
    err = pg.evaluate("window.__error")
    if err: print("PAGE ERROR", err); raise SystemExit(1)
    t1 = time.time()
    for i in range(FROM, TO):
        pg.evaluate("t => window.__seek(t)", (i + 0.5)/24)
        pg.screenshot(path=f"{FR}/f{i:04d}.png", timeout=0)
        if (i - FROM) % 12 == 0: print(f"frame {i}  {(time.time() - t1)/(i - FROM + 1):.1f}s/frame  elapsed {time.time() - T0:.0f}s", flush=True)
    b.close()
seg = f"{OUT}/seg_{FROM:04d}_{TO:04d}.mp4"
sh(f"ffmpeg -y -loglevel error -framerate 24 -start_number {FROM} -i {FR}/f%04d.png -frames:v {TO - FROM} -c:v libx264 -preset slow -crf 8 -pix_fmt yuv420p {seg} && ls -la {seg}", t=3600)
shutil.copy(f"{FR}/f{FROM:04d}.png", f"{OUT}/first_{FROM:04d}.png")
print("DONE", FROM, TO, f"{time.time() - T0:.0f}s", flush=True)
