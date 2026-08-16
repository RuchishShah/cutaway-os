import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment } from './environment.js';
import { MATERIALS } from './model/materials.js';
import { quality } from './quality.js';

/** Tiling concrete: aggregate speckle, expansion joints, patch staining. */
function padTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#9d968a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 30000; i++) {
    const v = 130 + Math.random() * 110;
    ctx.fillStyle = `rgba(${v},${v - 5},${v - 14},0.28)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
  }
  // broad pour-to-pour tonal variation, kept subtle so it does not read as relief
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 130;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() < 0.5;
    g.addColorStop(0, dark ? 'rgba(88,84,78,0.07)' : 'rgba(205,200,192,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // one slab per texture tile: the repeat sets the real-world slab size
  ctx.strokeStyle = 'rgba(72,68,62,0.4)';
  ctx.lineWidth = 7;
  ctx.strokeRect(0, 0, size, size);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

/** Soft scorch decal laid over the pad directly beneath the vehicle. */
function scorchTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.04, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(14,12,11,0.88)');
  g.addColorStop(0.3, 'rgba(26,23,20,0.62)');
  g.addColorStop(0.62, 'rgba(44,39,34,0.28)');
  g.addColorStop(1, 'rgba(60,55,48,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // streaked blast marks radiating outward
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * Math.PI * 2;
    const r0 = size * (0.12 + Math.random() * 0.3);
    const r1 = r0 + size * (0.03 + Math.random() * 0.14);
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.16})`;
    ctx.lineWidth = 2 + Math.random() * 9;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * r0, size / 2 + Math.sin(a) * r0);
    ctx.lineTo(size / 2 + Math.cos(a) * r1, size / 2 + Math.sin(a) * r1);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createViewer(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2c3346, 620, 2500);

  const camera = new THREE.PerspectiveCamera(
    34,
    container.clientWidth / container.clientHeight,
    0.35,
    4000
  );
  camera.position.set(150, 78, 175);

  const renderer = new THREE.WebGLRenderer({
    antialias: quality.msaa === 0,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const environment = createEnvironment(renderer, scene);

  /* --------------------------------------------------------------- ground -- */
  const ground = new THREE.Group();

  // distant terrain, tinted to the current light and faded out by fog so the
  // horizon meets the sky instead of ending on a hard rim
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x8a8474, roughness: 1, metalness: 0 });
  const terrain = new THREE.Mesh(new THREE.CircleGeometry(2600, 64), terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.08;
  ground.add(terrain);

  const padMap = padTexture();
  padMap.repeat.set(32, 32); // 320 m radius disc → ≈20 m concrete slabs
  const padMat = MATERIALS.concrete();
  padMat.color.setHex(0xffffff); // the map carries the albedo
  padMat.map = padMap;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(320, 96), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.02;
  pad.receiveShadow = true;
  ground.add(pad);

  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(34, 64),
    new THREE.MeshStandardMaterial({
      map: scorchTexture(),
      transparent: true,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.y = 0.02;
  scorch.receiveShadow = true;
  ground.add(scorch);

  // measurement grid: an explicit diagram overlay, off unless asked for
  const grid = new THREE.PolarGridHelper(200, 12, 8, 96, 0x4a5568, 0x3a4454);
  grid.position.y = 0.05;
  grid.material.transparent = true;
  grid.material.opacity = 0.3;
  grid.visible = false;
  ground.add(grid);
  scene.add(ground);

  // keep the terrain in step with the light preset
  environment.onChange = (preset) => {
    terrainMat.color.setHex(preset.groundColor);
    padMat.color.setHex(preset.padTint);
    scorch.material.color.setHex(preset.padTint);
  };
  environment.onChange(environment.preset);

  /* ------------------------------------------------------------- controls -- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 5;
  controls.maxDistance = 700;
  // let the user get under the vehicle to look up into the engine bay
  controls.maxPolarAngle = Math.PI * 0.86;
  controls.target.set(0, 62, 0);
  controls.update();

  /* --------------------------------------------------------- post effects -- */
  let composer = null;
  let gtaoPass = null;
  let bloomPass = null;

  function buildComposer() {
    composer?.dispose();
    composer = null;
    gtaoPass = null;
    bloomPass = null;
    if (!quality.ao && !quality.bloom) return;

    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: quality.msaa,
    });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));

    if (quality.ao) {
      gtaoPass = new GTAOPass(scene, camera, w, h);
      // radius is in world units: ~1 m of contact darkening on a 9 m vehicle
      gtaoPass.updateGtaoMaterial({
        radius: 1.1,
        distanceExponent: 1.2,
        thickness: 1.6,
        scale: 1.05,
        samples: quality.aoSamples,
        distanceFallOff: 1,
        screenSpaceRadius: false,
      });
      gtaoPass.updatePdMaterial({ lumaPhi: 8, depthPhi: 2.5, normalPhi: 4, radius: 3, samples: 12 });
      gtaoPass.blendIntensity = 1.0;
      composer.addPass(gtaoPass);
    }

    if (quality.bloom) {
      bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.75, 0.92);
      composer.addPass(bloomPass);
    }

    composer.addPass(new OutputPass());
  }
  buildComposer();

  /* ------------------------------------------------------ camera framing -- */
  let tween = null;
  // the last app-driven framing, kept so a layout change can re-fit; cleared as
  // soon as the user takes the camera over themselves
  let lastFrame = null;
  // scaled down when the user prefers reduced motion, so camera moves are near-instant
  let tweenScale = 1;
  controls.addEventListener('start', () => (lastFrame = null));

  const _corner = new THREE.Vector3();
  const _offset = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _viewDir = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  /**
   * Move the camera so the whole box is on screen.
   *
   * Fitting a bounding *sphere* is the usual shortcut, but it under-frames a
   * 124 m vehicle viewed from a tilted angle in a portrait viewport — the
   * asymmetry pushes the base out of frame. So project all eight corners onto
   * the camera basis and take the distance that satisfies every one of them, in
   * both axes.
   */
  function frameBox(box, { padding = 1.08, azimuth = null, elevation = 0.28, duration = 0.85 } = {}) {
    const center = box.getCenter(new THREE.Vector3());

    const az =
      azimuth !== null
        ? azimuth
        : Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);

    // unit vector from the target towards where the camera will sit
    _viewDir
      .set(Math.cos(az) * Math.cos(elevation), Math.sin(elevation), Math.sin(az) * Math.cos(elevation))
      .normalize();
    _right.crossVectors(WORLD_UP, _viewDir).normalize();
    if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0); // straight overhead
    _up.crossVectors(_viewDir, _right).normalize();

    const tanY = Math.tan(((camera.fov * Math.PI) / 180) / 2);
    const tanX = tanY * Math.max(camera.aspect, 0.2);

    let dist = 0;
    for (let i = 0; i < 8; i++) {
      _corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      );
      _offset.subVectors(_corner, center);
      const along = _offset.dot(_viewDir);
      dist = Math.max(
        dist,
        along + Math.abs(_offset.dot(_up)) / tanY,
        along + Math.abs(_offset.dot(_right)) / tanX
      );
    }
    dist = Math.max(dist * padding, camera.near * 4, 3);

    // remember it so a later layout change can re-fit for the new aspect ratio
    lastFrame = { box: box.clone(), opts: { padding, azimuth: az, elevation } };

    const to = new THREE.Vector3().copy(center).addScaledVector(_viewDir, dist);

    tween = {
      t: 0,
      duration: Math.max(duration * tweenScale, 0.001),
      fromPos: camera.position.clone(),
      toPos: to,
      fromTarget: controls.target.clone(),
      toTarget: center.clone(),
    };
  }

  function updateTween(dt) {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dt / tween.duration);
    const k = tween.t < 0.5 ? 2 * tween.t * tween.t : 1 - Math.pow(-2 * tween.t + 2, 2) / 2;
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    if (tween.t >= 1) tween = null;
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    gtaoPass?.setSize(w, h);
    labelRenderer.setSize(w, h);

    // a narrower or shorter viewport needs a different distance to still fit
    if (lastFrame) frameBox(lastFrame.box, { ...lastFrame.opts, duration: 0.001 });
  }
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(container);

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    environment,
    grid,
    sun: environment.sun,
    ground,

    frameBox,
    updateTween,
    resize,
    setTweenScale(s) {
      tweenScale = s;
    },

    /** Camera as shareable spherical coordinates about the orbit target. */
    getCamera() {
      const dx = camera.position.x - controls.target.x;
      const dy = camera.position.y - controls.target.y;
      const dz = camera.position.z - controls.target.z;
      const distance = Math.hypot(dx, dy, dz);
      return {
        azimuth: Math.atan2(dz, dx),
        elevation: Math.asin(distance ? dy / distance : 0),
        distance,
        targetY: controls.target.y,
      };
    },

    /** Restore a camera from those coordinates, without animating. */
    setCamera({ azimuth, elevation, distance, targetY }) {
      tween = null;
      lastFrame = null;
      const d = THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance);
      controls.target.set(0, targetY, 0);
      camera.position.set(
        Math.cos(azimuth) * Math.cos(elevation) * d,
        targetY + Math.sin(elevation) * d,
        Math.sin(azimuth) * Math.cos(elevation) * d
      );
      camera.lookAt(controls.target);
      controls.update();
    },

    /** Re-read the quality tier: pixel ratio, shadow map, post-effect chain. */
    applyQuality() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
      environment.setShadowQuality(quality.shadow);
      buildComposer();
      resize();
    },

    makeLabel(el, position) {
      const obj = new CSS2DObject(el);
      obj.position.copy(position);
      return obj;
    },

    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    },
  };
}
