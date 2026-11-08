# Does vork (voyager-so/vork) run on a Kaggle T4? Each step logs and the script keeps going on failure.
import os, subprocess, glob, shutil, time
OUT = "/kaggle/working"
T0 = time.time()
def sh(cmd, t=900):
    print(f"\n$ {cmd}", flush=True)
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=t)
        out = (r.stdout + r.stderr)[-4000:]
        print(out, flush=True); print(f"[exit {r.returncode}, {time.time() - T0:.0f}s]", flush=True)
        return r.returncode, out
    except subprocess.TimeoutExpired:
        print("[timeout]"); return 124, ""

sh("nvidia-smi --query-gpu=name,driver_version --format=csv,noheader")
sh("cat /etc/os-release | head -3; ldd --version | head -1")
sh("apt-get -qq update && apt-get -qq install -y libvulkan1 vulkan-tools libgomp1 ffmpeg >/dev/null 2>&1; echo apt done")
sh("ls /usr/share/vulkan/icd.d /etc/vulkan/icd.d 2>&1; ls /usr/lib/x86_64-linux-gnu/ | grep -i -E 'nvidia|GLX' | head -20")
# NVIDIA's Vulkan driver lives in libGLX_nvidia; containers often lack the ICD file that points to it
icd = "/usr/share/vulkan/icd.d/nvidia_icd.json"
libs = glob.glob("/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0") + glob.glob("/usr/lib64/libGLX_nvidia.so.0")
if not os.path.exists(icd) and libs:
    os.makedirs(os.path.dirname(icd), exist_ok=True)
    open(icd, "w").write('{"file_format_version":"1.0.0","ICD":{"library_path":"%s","api_version":"1.3"}}' % libs[0])
    print("wrote", icd, "->", libs[0])

# Workaround: Kaggle ships only NVIDIA's compute libraries. Unpack the matching NVIDIA driver package and copy
# in the missing user-space Vulkan libraries (never overwriting what the host mounted), then register the ICD.
ver = subprocess.run("nvidia-smi --query-gpu=driver_version --format=csv,noheader", shell=True, capture_output=True, text=True).stdout.split()[0]
run = f"/tmp/NVIDIA-{ver}.run"
for url in (f"https://us.download.nvidia.com/tesla/{ver}/NVIDIA-Linux-x86_64-{ver}.run",
            f"https://us.download.nvidia.com/XFree86/Linux-x86_64/{ver}/NVIDIA-Linux-x86_64-{ver}.run"):
    if sh(f"curl -sfL -o {run} {url} && ls -la {run}", t=600)[0] == 0:
        break
sh(f"rm -rf /tmp/nv && sh {run} -x --target /tmp/nv >/dev/null && ls /tmp/nv | head -80", t=600)
libdir = "/usr/lib/x86_64-linux-gnu"
added = []
for f in sorted(glob.glob(f"/tmp/nv/*.so.{ver}")):
    name = os.path.basename(f)
    if any(k in name for k in ("GLX_nvidia", "nvidia-glcore", "nvidia-glvkspirv", "nvidia-gpucomp", "nvidia-rtcore",
                               "nvidia-tls", "nvidia-glsi", "EGL_nvidia", "nvidia-eglcore", "nvidia-vksc", "nvidia-present")):
        dst = os.path.join(libdir, name)
        if not os.path.exists(dst):
            shutil.copy2(f, dst); added.append(name)
print("added libs:", added)
for so in glob.glob(f"{libdir}/libGLX_nvidia.so.{ver}"):
    os.symlink(so, f"{libdir}/libGLX_nvidia.so.0") if not os.path.exists(f"{libdir}/libGLX_nvidia.so.0") else None
sh("ldconfig")
os.makedirs("/usr/share/vulkan/icd.d", exist_ok=True)
src_icd = "/tmp/nv/nvidia_icd.json"
txt = open(src_icd).read().replace("__NV_VK_ICD__", "libGLX_nvidia.so.0") if os.path.exists(src_icd) else \
      '{"file_format_version":"1.0.0","ICD":{"library_path":"libGLX_nvidia.so.0","api_version":"1.3"}}'
open("/usr/share/vulkan/icd.d/nvidia_icd.json", "w").write(txt)
print(txt)

sh("vulkaninfo --summary 2>&1 | head -40")
sh("vulkaninfo 2>/dev/null | grep -E 'VK_KHR_ray_query|VK_KHR_acceleration_structure|deviceName' | sort -u | head")
sh("curl -fL https://github.com/voyager-so/vork/releases/latest/download/install.sh -o /tmp/vork-install.sh && VORK_NO_MODIFY_PATH=1 sh /tmp/vork-install.sh", t=1500)
os.environ["PATH"] = os.path.expanduser("~/.local/bin") + ":" + os.environ["PATH"]
sh("vork setup", t=1500)
os.environ["PATH"] = os.path.expanduser("~/.local/bin") + ":" + os.environ["PATH"]
sh("vork --version")
os.chdir("/tmp"); sh("rm -rf my-shot; vork init my-shot")
os.chdir("/tmp/my-shot")
sh(f"vork render scene.json --profile std/draft --out {OUT}/vork-draft.png", t=1200)
sh(f"vork render scene.json --profile std/final --out {OUT}/vork-final.png", t=900)
sh(f"vork render scene.json --profile std/draft --frame-start 0 --frame-end 23 --out {OUT}/vork-clip.mp4", t=900)
print("\nRESULT files:", os.listdir(OUT), f"total {time.time() - T0:.0f}s")
