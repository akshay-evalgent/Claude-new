"""Write one Kaggle notebook folder per slice."""
import json, pathlib
here = pathlib.Path(__file__).resolve().parent
code = (here/'render_slice.py').read_text()
slices = [('a', 571, 786, True), ('b', 786, 1048, False), ('c', 1048, 1190, False), ('d', 1190, 1267, False), ('e', 1267, 1573, False)]
for tag, a, b, gpu in slices:
    d = here/'kernels'/tag; d.mkdir(parents=True, exist_ok=True)
    (d/'render.py').write_text(code.replace('__FROM__', str(a)).replace('__TO__', str(b)).replace('__GPU__', 'True' if gpu else 'False'))
    meta = {"id": f"akkikmr/one-night-render-{tag}", "title": f"one-night-render-{tag}", "code_file": "render.py", "language": "python",
            "kernel_type": "script", "is_private": True, "enable_gpu": gpu, "enable_tpu": False, "enable_internet": True,
            "dataset_sources": ["akkikmr/one-night-render"], "kernel_sources": [], "competition_sources": [], "model_sources": []}
    if gpu: meta["machine_shape"] = "NvidiaTeslaT4"
    (d/'kernel-metadata.json').write_text(json.dumps(meta, indent=1))
    print(tag, a, b, 'gpu' if gpu else 'cpu')
