# vork on a Kaggle T4: result (8 November 2026)

**It does not run.** Kaggle's container exposes the GPU for compute only:

- `NVIDIA_DRIVER_CAPABILITIES=compute,utility` (no `graphics`), and there is no `/dev/dri`.
- The container ships NVIDIA's CUDA libraries but not its Vulkan/GLX libraries. Copying the matching driver's
  user-space Vulkan libraries in (driver 580.178.04, including `libnvidia-rtcore`) lets the Vulkan loader find the
  driver, but it refuses to start (`Could not get 'vkCreateInstance' via 'vk_icdGetInstanceProcAddr'`), because the
  graphics capability isn't granted to the container.
- vork 0.2.0 installs, but setup and rendering fail with "No supported GPU adapter found".

The capability is set by Kaggle's container runtime, outside anything a notebook can change.

Where vork can run: an Apple Silicon Mac (native, Metal), a Windows or Linux PC with an RTX-class NVIDIA GPU, or a
rented GPU whose container grants graphics capability (`NVIDIA_DRIVER_CAPABILITIES` including `graphics` or `all`).
Note that A100/H100-class GPUs lack the ray-tracing hardware vork needs.

`vork-t4-test.py` is the test, kept for re-checking if Kaggle changes its runtime.
