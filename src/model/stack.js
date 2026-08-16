import * as THREE from 'three';
import { buildBooster } from './booster.js';
import { buildShip } from './ship.js';
import { stampParts, freezeBasePositions, ring, R } from './helpers.js';
import { attachClipping } from './materials.js';

const HUMAN_HEIGHT = 1.8;

/**
 * Assembles the full stack and exposes the handful of state setters the UI
 * drives: exploded view, cutaway, stage separation and engine plumes.
 */
export function buildStack(version) {
  const root = new THREE.Group();

  const booster = buildBooster(version);
  const ship = buildShip(version);
  ship.position.y = booster.userData.top;
  root.add(booster, ship);

  const scaleRef = buildScaleReference();
  root.add(scaleRef);

  const plumes = buildPlumes(booster, ship);
  root.add(plumes.group);

  stampParts(root);
  freezeBasePositions(root);

  /* --------------------------------------------------------- part index --- */
  const index = new Map();
  root.traverse((o) => {
    if (!o.userData.isPart) return;
    const id = o.userData.partId;
    if (!index.has(id)) index.set(id, { id, groups: [], box: new THREE.Box3() });
    index.get(id).groups.push(o);
  });

  root.updateMatrixWorld(true);
  for (const entry of index.values()) {
    entry.box.makeEmpty();
    for (const g of entry.groups) entry.box.expandByObject(g);
    entry.center = entry.box.getCenter(new THREE.Vector3());
    entry.size = entry.box.getSize(new THREE.Vector3());
  }

  /* -------------------------------------------------------- interaction --- */
  const internals = [];
  root.traverse((o) => {
    if (o.userData.isPart && o.userData.internal) internals.push(o);
  });
  const setInternalsVisible = (visible) => {
    for (const g of internals) g.visible = visible;
  };
  setInternalsVisible(false);

  const frostGroups = [booster.userData.frost, ship.userData.frost].filter(Boolean);

  const shipBaseY = ship.position.y;

  const state = { explode: 0, separation: 0, liftoff: 0 };

  function applyTransforms() {
    const t = state.explode;
    root.traverse((o) => {
      if (!o.userData.isPart) return;
      const base = o.userData.basePosition;
      const e = o.userData.explode;
      o.position.set(base.x + e.x * t, base.y + e.y * t, base.z + e.z * t);
    });
    // the whole ship also lifts off the booster as the view explodes
    ship.position.y = shipBaseY + state.explode * 14 + state.separation * 42;
    // the stack rises so parts that explode downwards clear the ground, and
    // again once the engines light so the plumes are not buried in it
    root.position.y = state.explode * 14 + state.liftoff * 24;
    scaleRef.position.y = -root.position.y; // the person stays on the ground
    plumes.layout(state.separation);
  }

  applyTransforms();

  return {
    root,
    booster,
    ship,
    index,
    scaleRef,
    stackHeight: booster.userData.top + ship.userData.height,

    setExplode(t) {
      state.explode = t;
      applyTransforms();
    },
    setSeparation(t) {
      state.separation = t;
      applyTransforms();
    },
    setLiftoff(t) {
      if (t === state.liftoff) return;
      state.liftoff = t;
      applyTransforms();
    },
    /**
     * Bounds of the vehicle itself. Deliberately excludes the plume cones and
     * the scale figure, which otherwise drag the framing metres below ground.
     */
    contentBox(target = new THREE.Box3()) {
      target.makeEmpty();
      target.expandByObject(booster);
      target.expandByObject(ship);
      return target;
    },
    setInternalsVisible,
    setFrost(visible) {
      for (const g of frostGroups) g.visible = visible;
    },
    setPlumes: plumes.set,
    updatePlumes: plumes.update,
    dispose() {
      root.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m?.dispose?.();
        }
      });
    },
  };
}

/* ------------------------------------------------------------ scale ref --- */

function buildScaleReference() {
  const g = new THREE.Group();
  g.name = 'scale-reference';
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f2a36, roughness: 0.9, metalness: 0 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.85, 4, 12), mat);
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat);
  head.position.y = 1.62;
  for (const dx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), mat);
    leg.position.set(dx, 0.33, 0);
    g.add(leg);
  }
  g.add(body, head);
  g.position.set(R + 5.5, 0, 5.5);
  g.userData.label = `${HUMAN_HEIGHT} m person`;
  return g;
}

/* --------------------------------------------------------------- plumes --- */

function buildPlumes(booster, ship) {
  const group = new THREE.Group();
  group.name = 'plumes';

  const makePlume = (radius, length, tint) => {
    const geo = new THREE.ConeGeometry(radius, length, 20, 1, true);
    geo.translate(0, -length / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    attachClipping(mat);
    const m = new THREE.Mesh(geo, mat);
    m.userData.baseLength = length;
    return m;
  };

  // all 33 fire at liftoff; only the centre 3 stay lit through hot staging
  const boosterPlumes = [];
  const boosterRings = [
    [ring(3, 1.25, Math.PI / 2), true],
    [ring(10, 2.62, 0.15), false],
    [ring(20, 3.86, 0.08), false],
  ];
  for (const [positions, centre] of boosterRings) {
    for (const [x, z] of positions) {
      const p = makePlume(0.62, centre ? 16 : 14, 0x9fd4ff);
      p.position.set(x, booster.userData.engineExitY, z);
      p.userData.centre = centre;
      boosterPlumes.push(p);
      group.add(p);
    }
  }

  const shipPlumes = [];
  const shipBaseY = ship.position.y;
  for (const [x, z] of ring(3, 1.15, Math.PI / 2)) {
    const p = makePlume(0.6, 11, 0xbfe2ff);
    p.position.set(x, shipBaseY + 2.75, z);
    p.userData.offsetY = 2.75;
    shipPlumes.push(p);
    group.add(p);
  }
  for (const [x, z] of ring(3, 2.85, -Math.PI / 2)) {
    const p = makePlume(1.15, 15, 0xcfe9ff);
    p.position.set(x, shipBaseY + 0.6, z);
    p.userData.offsetY = 0.6;
    shipPlumes.push(p);
    group.add(p);
  }

  let strength = 0;
  let separation = 0;
  let time = 0;

  const setPlume = (p, mix, flicker) => {
    p.visible = mix > 0.01;
    if (!p.visible) return;
    p.material.opacity = 0.42 * mix * flicker;
    p.scale.y = mix * flicker;
    p.scale.x = p.scale.z = 0.8 + 0.25 * mix;
  };

  return {
    group,
    /** Keep the ship plumes attached as the ship translates away. */
    layout(sep) {
      separation = sep;
      for (const p of shipPlumes) p.position.y = ship.position.y + p.userData.offsetY;
    },
    set(on) {
      strength = on ? 1 : 0;
    },
    update(dt) {
      time += dt;
      const flicker = 0.86 + Math.sin(time * 34) * 0.06 + Math.sin(time * 19.3) * 0.05;
      // during hot staging only the booster's centre engines stay lit, while the
      // ship's six spin up over the first moments of separation
      const shipMix = separation > 0 ? Math.min(1, separation * 6) : strength;
      for (const p of boosterPlumes) {
        const mix = separation > 0 ? (p.userData.centre ? 1 : 0) : strength;
        setPlume(p, mix, flicker);
      }
      for (const p of shipPlumes) setPlume(p, shipMix, flicker);
    },
  };
}
