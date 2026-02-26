import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class SceneManager {
  constructor(canvas, cssContainer) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.cssRenderer = new CSS2DRenderer({ element: cssContainer });
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2744);
    this.scene.fog = new THREE.FogExp2(0x1a2744, 0.004);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 600);
    this.camera.position.set(0, 50, 40);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = Math.PI * 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 200;
    this.controls.panSpeed = 1.5;
    this.controls.zoomSpeed = 1.0;

    this._setupLights();
    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xb0c4de, 0.55));

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(60, 120, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6090cc, 0.35);
    fill.position.set(-40, 60, -30);
    this.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5a3a, 0.3);
    this.scene.add(hemi);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
  }

  lookAt(x, z) {
    this.controls.target.set(x, 0, z);
    this.camera.position.set(x + 5, 30, z + 22);
    this.controls.update();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }

  get raycaster() {
    if (!this._ray) this._ray = new THREE.Raycaster();
    return this._ray;
  }
}
