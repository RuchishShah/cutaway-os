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
  // degrees from vertical, per stage — the flight profile drives these
  const tilt = stages.map(() => 0);

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
      const lift = stageBaseY[i] + i * (state.explode * 14 + state.separation * 42);
      // a stage's origin is at its base, so rotating it there would swing the
      // whole vehicle through an arc. Pivot about its mid-height instead, which
      // is roughly where a real one rotates about anyway.
      const a = tilt[i];
      const half = g.userData.height / 2;
      g.rotation.z = a;
      g.position.set(Math.sin(a) * half, lift + half * (1 - Math.cos(a)), 0);
      g.updateMatrix();
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
    /**
     * `staging: false` means the caller is driving the engines itself (the
     * flight profile does), so the plumes should not be forced into the
     * hot-staging pattern just because the stages are apart.
     */
    setSeparation(t, { staging = true } = {}) {
      state.separation = t;
      plumes.setStaging(staging && t > 0);
      applyTransforms();
    },
    setLiftoff(t) {
      if (t === state.liftoff) return;
      state.liftoff = t;
      applyTransforms();
    },
    /** Tip a stage away from vertical, in radians. */
    setStageAttitude(id, radians) {
      const i = stages.findIndex((g) => g.userData.stageId === id);
      if (i < 0 || tilt[i] === radians) return;
      tilt[i] = radians;
      applyTransforms();
    },
    /**
     * Light the first `count` engines of a stage. Builders declare their
     * emitters centre-outwards, so 3 of 33 is the centre three that actually
     * relight, and 3 of 6 on the ship is its sea-level trio.
     */
    setStageEngines(id, count) {
      const i = stages.findIndex((g) => g.userData.stageId === id);
      if (i >= 0) plumes.setStageEngines(i, count);
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
  const byStage = stages.map(() => []);
  stages.forEach((stageGroup, stageIndex) => {
    for (const e of stageGroup.userData.plumes || []) {
      const p = makePlume(e.radius, e.length, e.tint);
      p.userData.owner = stageGroup;
      p.userData.offset = new THREE.Vector3(e.x, e.y, e.z);
      p.userData.stageIndex = stageIndex;
      // `hold` marks the engines that stay lit once staging begins
      p.userData.hold = !!e.hold;
      plumes.push(p);
      byStage[stageIndex].push(p);
      group.add(p);
    }
  });

  // how many engines each stage is running, set either by the "Engines lit"
  // toggle (all or none) or by the flight profile (a specific count)
  const lit = stages.map(() => 0);
  const holdCount = byStage.map((ps) => ps.filter((p) => p.userData.hold).length);
  let separation = 0;
  let staging = false;
  let time = 0;
  const _v = new THREE.Vector3();

  const setPlume = (p, mix, flicker) => {
    p.visible = mix > 0.01;
    if (!p.visible) return;
    p.material.opacity = 0.42 * mix * flicker;
    p.scale.y = mix * flicker;
    p.scale.x = p.scale.z = 0.8 + 0.25 * mix;
  };

  return {
    group,
    /**
     * Re-seat every plume under its nozzles. Taken through the owning stage's
     * matrix rather than its y alone, so a plume still points along the vehicle
     * when the flight profile has the stage flipped for a boostback burn.
     */
    layout() {
      for (const p of plumes) {
        const owner = p.userData.owner;
        p.position.copy(_v.copy(p.userData.offset).applyMatrix4(owner.matrix));
        p.rotation.z = owner.rotation.z;
      }
    },
    set(on) {
      byStage.forEach((ps, i) => (lit[i] = on ? ps.length : 0));
    },
    setStageEngines(i, count) {
      lit[i] = Math.max(0, Math.min(byStage[i].length, count));
    },
    setSeparation(t) {
      separation = t;
    },
    setStaging(on) {
      staging = on;
    },
    update(dt) {
      time += dt;
      const flicker = 0.86 + Math.sin(time * 34) * 0.06 + Math.sin(time * 19.3) * 0.05;
      byStage.forEach((ps, i) => {
        let count = lit[i];
        let intensity = 1;
        // the staging animation overrides: below the interface only the hold
        // engines stay lit, above it the departing stage spins up
        if (staging) {
          count = i === 0 ? holdCount[i] : ps.length;
          if (i > 0) intensity = Math.min(1, separation * 6);
        }
        ps.forEach((p, j) => setPlume(p, j < count ? intensity : 0, flicker));
      });
    },
  };
}
