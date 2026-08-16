import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/**
 * Outdoor lighting environment.
 *
 * Stainless steel is close to a perfect mirror, so what the vehicle reflects is
 * most of what you see. A studio-style environment map is the single biggest
 * reason a metal render reads as CG. This builds a physical sky (Preetham
 * scattering) plus a ground dome, bakes both into a PMREM probe for reflections,
 * and derives the key light's colour and intensity from the same sun position so
 * the direct light and the reflections agree.
 */

export const TIME_PRESETS = [
  {
    id: 'golden',
    label: 'Golden hour',
    elevation: 5.5,
    azimuth: 86,
    turbidity: 5.2,
    rayleigh: 2.6,
    mie: 0.006,
    mieG: 0.86,
    sunColor: 0xffd0a0,
    sunIntensity: 4.2,
    fillColor: 0x8fb4e8,
    fillIntensity: 0.5,
    envIntensity: 1.15,
    exposure: 0.46,
    padTint: 0xdfd6c8,
    groundColor: 0x6b6558,
    fogColor: 0xb9a898,
  },
  {
    id: 'day',
    label: 'Midday',
    elevation: 58,
    azimuth: 62,
    turbidity: 3.4,
    rayleigh: 1.1,
    mie: 0.004,
    mieG: 0.8,
    sunColor: 0xfff6e8,
    sunIntensity: 4.6,
    fillColor: 0xaecdf5,
    fillIntensity: 0.55,
    envIntensity: 1.0,
    exposure: 0.3,
    padTint: 0xffffff,
    groundColor: 0x8a8474,
    fogColor: 0x9fb6cf,
  },
  {
    id: 'dawn',
    label: 'Dawn',
    elevation: 1.4,
    azimuth: 78,
    turbidity: 7.5,
    rayleigh: 3.2,
    mie: 0.009,
    mieG: 0.88,
    sunColor: 0xffb27a,
    sunIntensity: 2.8,
    fillColor: 0x6f8fd0,
    fillIntensity: 0.6,
    envIntensity: 1.3,
    exposure: 0.5,
    padTint: 0x9e968e,
    groundColor: 0x4e4c48,
    fogColor: 0x7d7488,
  },
  {
    id: 'dusk',
    label: 'Blue hour',
    elevation: -1.2,
    azimuth: 286,
    turbidity: 9,
    rayleigh: 3.6,
    mie: 0.012,
    mieG: 0.9,
    sunColor: 0x9ab4e8,
    sunIntensity: 0.8,
    fillColor: 0x5a79c4,
    fillIntensity: 0.75,
    envIntensity: 1.7,
    exposure: 0.85,
    padTint: 0x6e7482,
    groundColor: 0x2f3340,
    fogColor: 0x3d4a66,
  },
];

export const DEFAULT_PRESET = 'golden';

export function createEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  /* ------------------------------------------------------- visible sky ---- */
  const sky = new Sky();
  sky.scale.setScalar(1800);
  sky.renderOrder = -1;
  scene.add(sky);

  /* ------------------------------------- offscreen scene baked into IBL ---- */
  // The probe needs the ground too: half the vehicle's reflections come from
  // below, and bare sky in the lower hemisphere makes the underside glow blue.
  const probeScene = new THREE.Scene();
  const probeSky = new Sky();
  probeSky.scale.setScalar(1800);
  probeScene.add(probeSky);

  const groundMat = new THREE.MeshBasicMaterial({ color: 0x6b6558, side: THREE.BackSide });
  const groundDome = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    groundMat
  );
  probeScene.add(groundDome);

  /* ------------------------------------------------------------ lights ---- */
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);

  // opposite-side fill standing in for sky bounce that a single probe under-reads
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(fill);

  const bounce = new THREE.HemisphereLight(0xffffff, 0x59544a, 0.5);
  scene.add(bounce);

  const sunDirection = new THREE.Vector3();
  let envTexture = null;
  let current = null;

  function apply(preset) {
    current = preset;

    const phi = THREE.MathUtils.degToRad(90 - preset.elevation);
    const theta = THREE.MathUtils.degToRad(preset.azimuth);
    sunDirection.setFromSphericalCoords(1, phi, theta);

    for (const s of [sky, probeSky]) {
      const u = s.material.uniforms;
      u.turbidity.value = preset.turbidity;
      u.rayleigh.value = preset.rayleigh;
      u.mieCoefficient.value = preset.mie;
      u.mieDirectionalG.value = preset.mieG;
      u.sunPosition.value.copy(sunDirection);
    }
    groundMat.color.setHex(preset.groundColor);

    // rebake the reflection probe from the new sky
    envTexture?.dispose();
    envTexture = pmrem.fromScene(probeScene, 0, 1, 4000).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = preset.envIntensity;

    sun.color.setHex(preset.sunColor);
    sun.intensity = preset.sunIntensity;
    sun.position.copy(sunDirection).multiplyScalar(400);

    fill.color.setHex(preset.fillColor);
    fill.intensity = preset.fillIntensity;
    fill.position.set(-sunDirection.x, Math.abs(sunDirection.y) * 0.5 + 0.25, -sunDirection.z).multiplyScalar(400);

    bounce.groundColor.setHex(preset.groundColor);

    renderer.toneMappingExposure = preset.exposure;

    if (scene.fog) scene.fog.color.setHex(preset.fogColor);
    api.onChange?.(preset);
  }

  /** Keep the shadow frustum tight around whatever is currently on screen. */
  function frameShadows(centerY, radius) {
    sun.target.position.set(0, centerY, 0);
    sun.target.updateMatrixWorld();
    sun.position.copy(sunDirection).multiplyScalar(Math.max(radius * 2.2, 300));
    sun.position.y += centerY;
    const cam = sun.shadow.camera;
    cam.left = -radius;
    cam.right = radius;
    cam.top = radius;
    cam.bottom = -radius;
    cam.near = 10;
    cam.far = Math.max(radius * 5, 900);
    cam.updateProjectionMatrix();
  }

  const api = {
    /** Set by the viewer to keep scene-side colours in step with the light. */
    onChange: null,
    sun,
    fill,
    sky,
    sunDirection,
    get preset() {
      return current;
    },
    setPreset(id) {
      const p = TIME_PRESETS.find((x) => x.id === id);
      if (p && p !== current) apply(p);
      return p;
    },
    frameShadows,
    setShadowQuality(size) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    },
    dispose() {
      envTexture?.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      probeSky.geometry.dispose();
      probeSky.material.dispose();
      groundDome.geometry.dispose();
      groundMat.dispose();
    },
  };

  apply(TIME_PRESETS.find((p) => p.id === DEFAULT_PRESET));
  return api;
}
