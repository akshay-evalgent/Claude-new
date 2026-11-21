// A "city" of bars: every Short a channel posted, in rows (oldest in front), real view counts as heights.
import * as THREE from 'three';

export class Chart3D {
  constructor(parent, views, o = {}) {
    const p = this.o = Object.assign({ cols: 23, sp: 1.5, minH: 0.3, w: 1080, h: 1920, maxH: 40 }, o);
    this.views = views; this.N = views.length; this.unit = p.maxH / Math.max(...views);
    const cv = this.cv = document.createElement('canvas'); cv.width = p.w; cv.height = p.h; parent.appendChild(cv);
    const g2 = this.g2 = document.createElement('canvas'); g2.width = p.w / 4; g2.height = p.h / 4;
    g2.style.cssText = `width:${p.w}px;height:${p.h}px;filter:blur(12px) brightness(1.2);mix-blend-mode:screen;opacity:.6`;
    parent.appendChild(g2); this.g2c = g2.getContext('2d');
    const r = this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(p.w, p.h, false);
    const s = this.scene = new THREE.Scene(); this.bgCol = new THREE.Color(0x0c0c10); s.background = this.bgCol;
    this.fog = new THREE.FogExp2(0x0c0c10, 0.011); s.fog = this.fog;
    this.camera = new THREE.PerspectiveCamera(55, p.w / p.h, 0.1, 600);
    s.add(new THREE.HemisphereLight(0xc8d4ff, 0x0c0c12, 1.25));
    const d = new THREE.DirectionalLight(0xffffff, 1.9); d.position.set(-10, 24, 14); s.add(d);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.95 }));
    this.ground.rotation.x = -Math.PI / 2; s.add(this.ground);
    this.grid = new THREE.GridHelper(600, 400, 0x2a2a36, 0x1b1b24); this.grid.position.set(p.sp / 2, 0.01, p.sp / 2); s.add(this.grid);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    this.grey = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x7a7a88, roughness: 0.55, metalness: 0.15 }), this.N);
    this.green = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x25b866, emissive: 0x0d5a30, emissiveIntensity: 0.5, roughness: 0.5 }), this.N);
    this.hot = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x7dffb0, emissive: 0x3dff88, emissiveIntensity: 1.0, roughness: 0.3 }), this.N);
    this.mark = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 1.25), new THREE.MeshBasicMaterial({ color: 0x3dff88, transparent: true, opacity: 0 }));
    s.add(this.grey, this.green, this.hot, this.mark);
    this.hh = new Float32Array(this.N); this.gg = new Uint8Array(this.N); this._m = new THREE.Matrix4();
    this.commit();
  }
  // row-major, each row filled from the centre outwards so a new row starts in the middle
  pos(i) {
    const { cols, sp } = this.o; const row = Math.floor(i / cols), j = i % cols;
    const c = j % 2 ? -(j + 1) / 2 : j / 2;
    return [c * sp, -row * sp];
  }
  height(i) { return Math.max(this.o.minH, this.views[i] * this.unit); }
  set(i, h, level) { this.hh[i] = h; this.gg[i] = level === true ? 2 : (level | 0); }     // 0 grey, 1 green (1M+), 2 hot
  commit() {
    const m = this._m, w = 0.86;
    for (let i = 0; i < this.N; i++) {
      const [x, z] = this.pos(i), h = Math.max(this.hh[i], 1e-4), g = this.gg[i];
      [this.grey, this.green, this.hot].forEach((mesh, lv) => {  // a bar lives in one mesh; in the others it is scaled to nothing
        const a = g === lv ? 1 : 0; m.makeScale(w * a, h * a, w * a); m.setPosition(x, 0, z); mesh.setMatrixAt(i, m);
      });
    }
    [this.grey, this.green, this.hot].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  cam(p, l, fov = 55) {
    this.camera.fov = fov; this.camera.position.set(...p); this.camera.lookAt(...l); this.camera.updateProjectionMatrix();
  }
  render() {
    const s = this.scene;
    // glow pass: only the green bars on black, copied to a small blurred canvas that is screened on top
    this.ground.visible = this.grid.visible = this.grey.visible = this.green.visible = false; s.fog = null; s.background = new THREE.Color(0x000000);
    this.r.render(s, this.camera);
    this.g2c.clearRect(0, 0, this.g2.width, this.g2.height); this.g2c.drawImage(this.cv, 0, 0, this.g2.width, this.g2.height);
    this.ground.visible = this.grid.visible = this.grey.visible = this.green.visible = true; s.fog = this.fog; s.background = this.bgCol;
    this.r.render(s, this.camera);
  }
  marker(i, opacity) { const [x, z] = this.pos(i); this.mark.position.set(x, 0.04, z); this.mark.material.opacity = opacity; this.mark.visible = opacity > 0; }
  project(i, h) {
    const [x, z] = this.pos(i); const v = new THREE.Vector3(x, h, z).project(this.camera);
    return [(v.x + 1) / 2 * this.o.w, (1 - v.y) / 2 * this.o.h, v.z];
  }
}
