import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class SceneManager {
  constructor(canvas, cssContainer) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.cssRenderer = new CSS2DRenderer({ element: cssContainer });
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 120, 350);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 60, 50);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.42;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 160;
    this.controls.panSpeed = 1.2;

    this._setupLights();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
    sun.position.set(40, 80, 30);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688cc, 0.3);
    fill.position.set(-30, 40, -20);
    this.scene.add(fill);
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
    this.camera.position.set(x + 10, 30, z + 25);
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
