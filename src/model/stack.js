import * as THREE from 'three';
import { buildStage } from './builders.js';
import { stampParts, freezeBasePositions, R } from './helpers.js';
import { attachClipping } from './materials.js';

const HUMAN_HEIGHT = 1.8;

/**
 * Assembles a variant's stages into a stack and exposes the handful of state
 * setters the UI drives: exploded view, cutaway, stage separation and engine
 * plumes.
 *
 * Stages are listed bottom-first in the data and stacked in that order, each
 * sitting on the interface the one below reports. Nothing here knows how many
 * there are or what they are called.
 */
export function buildStack(variant) {
  const root = new THREE.Group();

  const stages = [];
  const byStageId = new Map();
  let interfaceY = 0;
  for (const stage of variant.stages) {
    const group = buildStage(stage, variant);
    group.position.y = interfaceY;
    interfaceY += group.userData.top;
    stages.push(group);
    byStageId.set(stage.id, group);
    root.add(group);
  }
  const top = stages[stages.length - 1];
  const stackHeight = top.position.y + top.userData.height;

  const scaleRef = buildScaleReference();
  root.add(scaleRef);

  const plumes = buildPlumes(stages);
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

  const frostGroups = stages.map((g) => g.userData.frost).filter(Boolean);

  const stageBaseY = stages.map((g) => g.position.y);

  const state = { explode: 0, separation: 0, liftoff: 0 };

  function applyTransforms() {
    const t = state.explode;
    root.traverse((o) => {
      if (!o.userData.isPart) return;
      const base = o.userData.basePosition;
      const e = o.userData.explode;
      o.position.set(base.x + e.x * t, base.y + e.y * t, base.z + e.z * t);
    });
    // each stage also lifts clear of the one below it — a gap per interface, so
    // the spacing stays even however many stages the vehicle has
    stages.forEach((g, i) => {
      g.position.y = stageBaseY[i] + i * (state.explode * 14 + state.separation * 42);
    });
    // the stack rises so parts that explode downwards clear the ground, and
    // again once the engines light so the plumes are not buried in it
    root.position.y = state.explode * 14 + state.liftoff * 24;
    scaleRef.position.y = -root.position.y; // the person stays on the ground
    plumes.setSeparation(state.separation);
    plumes.layout();
  }

  applyTransforms();

  return {
    root,
    stages,
    stage: (id) => byStageId.get(id),
    /** Bottom and top stages — what "separation" happens between. */
    lower: stages[0],
    upper: stages[stages.length - 1],
    index,
    scaleRef,
    stackHeight,

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
      for (const g of stages) target.expandByObject(g);
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

/**
 * Exhaust plumes, driven entirely by the emitters each stage builder declares.
 * They live in their own group rather than under the stage so the framing box
 * does not have to reason about cones that hang metres below the nozzles.
 */
function buildPlumes(stages) {
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

  const plumes = [];
  stages.forEach((stageGroup, stageIndex) => {
    for (const e of stageGroup.userData.plumes || []) {
      const p = makePlume(e.radius, e.length, e.tint);
      p.position.set(e.x, stageGroup.position.y + e.y, e.z);
      p.userData.owner = stageGroup;
      p.userData.offsetY = e.y;
      p.userData.stageIndex = stageIndex;
      // `hold` marks the engines that stay lit once staging begins
      p.userData.hold = !!e.hold;
      plumes.push(p);
      group.add(p);
    }
  });

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
    /** Keep every plume under its nozzles as the stages translate apart. */
    layout() {
      for (const p of plumes) p.position.y = p.userData.owner.position.y + p.userData.offsetY;
    },
    set(on) {
      strength = on ? 1 : 0;
    },
    setSeparation(t) {
      separation = t;
    },
    update(dt) {
      time += dt;
      const flicker = 0.86 + Math.sin(time * 34) * 0.06 + Math.sin(time * 19.3) * 0.05;
      for (const p of plumes) {
        let mix = strength;
        if (separation > 0) {
          // once staging starts the departing stages light — spinning up over
          // the first moments — while the one below keeps only its hold engines
          mix = p.userData.stageIndex === 0
            ? (p.userData.hold ? 1 : 0)
            : Math.min(1, separation * 6);
        }
        setPlume(p, mix, flicker);
      }
    },
  };
}
