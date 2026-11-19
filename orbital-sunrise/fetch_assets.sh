#!/bin/bash
# Downloads the free assets the scene uses into assets/ (about 31 MB).
set -e
mkdir -p "$(dirname "$0")/assets" && cd "$(dirname "$0")/assets"
for f in 8k_earth_daymap.jpg 8k_earth_nightmap.jpg 8k_earth_clouds.jpg 8k_earth_normal_map.tif 8k_earth_specular_map.tif; do
  curl -fL -o "$f" "https://www.solarsystemscope.com/textures/download/$f"
done
curl -fL -o iss_b.glb "https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/international-space-station-(iss)-(b)/International%20Space%20Station%20(ISS)%20(B).glb"
