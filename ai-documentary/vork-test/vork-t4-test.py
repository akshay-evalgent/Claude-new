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
sh("vulkaninfo --summary 2>&1 | head -40")
sh("vulkaninfo 2>/dev/null | grep -E 'VK_KHR_ray_query|VK_KHR_acceleration_structure|deviceName' | sort -u | head")
sh("curl -fL https://github.com/voyager-so/vork/releases/latest/download/install.sh -o /tmp/vork-install.sh && VORK_NO_MODIFY_PATH=1 sh /tmp/vork-install.sh", t=1500)
os.environ["PATH"] = os.path.expanduser("~/.local/bin") + ":" + os.environ["PATH"]
sh("vork --version")
os.chdir("/tmp"); sh("rm -rf my-shot; vork init my-shot")
os.chdir("/tmp/my-shot")
sh(f"vork render scene.json --profile std/draft --out {OUT}/vork-draft.png", t=1200)
sh(f"vork render scene.json --profile std/final --out {OUT}/vork-final.png", t=900)
sh(f"vork render scene.json --profile std/draft --frame-start 0 --frame-end 23 --out {OUT}/vork-clip.mp4", t=900)
print("\nRESULT files:", os.listdir(OUT), f"total {time.time() - T0:.0f}s")
