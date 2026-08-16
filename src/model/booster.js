import * as THREE from 'three';
import { MATERIALS, makeSteel, makePropellant, makeFrost } from './materials.js';
import {
  R,
  part,
  cylinder,
  dome,
  raptor,
  gridFin,
  raceway,
  panel,
  ring,
  frostBands,
} from './helpers.js';
import { quality } from '../quality.js';

/**
 * Super Heavy. Origin sits at the nozzle exit plane; +Y is up.
 * Returns a group whose userData.top is the y of the hot-stage interface.
 */
export function buildBooster(v) {
  const b = v.booster;
  const H = b.height;
  const root = new THREE.Group();
  root.name = 'super-heavy';

  const ARC = 2 * Math.PI * R;
  const dark = MATERIALS.darkSteel();
  const pipe = MATERIALS.plumbing();
  const black = MATERIALS.black();

  /* ---------------------------------------------------------- geometry ---- */
  const skirtBottom = 1.3;
  const tankBottom = 6.2;
  const hotStageH = b.hotStage === 'integrated' ? 3.3 : 2.9;
  const hotStageBottom = H - hotStageH;

  const tankSpan = hotStageBottom - tankBottom - 2.2;
  const ch4H = tankSpan * 0.434; // volume split follows the ~3.6:1 mass ratio
  const loxH = tankSpan * 0.566;
  const ch4Top = tankBottom + ch4H;
  const loxTop = ch4Top + loxH;

  /* ------------------------------------------------------------ barrel ---- */
  const body = part('booster-body');
  {
    const barrelH = hotStageBottom - tankBottom;
    const barrel = cylinder(R, R, barrelH, makeSteel({ height: barrelH, arc: ARC }));
    barrel.position.y = (tankBottom + hotStageBottom) / 2;
    body.add(barrel);

    // reinforcement frames at the grid fin and catch-fitting stations
    for (const y of [H - 6.2, H - 8.6, ch4Top, tankBottom + 0.4]) {
      const frame = cylinder(R + 0.09, R + 0.09, 0.7, dark);
      frame.position.y = y;
      body.add(frame);
    }

    // vent and access panels
    for (const a of [Math.PI * 0.1, Math.PI * 0.9, Math.PI * 1.45]) {
      body.add(panel(1.6, 1.2, a, tankBottom + 3.4, dark, { depth: 0.16 }));
    }
    for (const [, , a] of ring(6, 1, 0.5)) {
      body.add(panel(0.55, 0.55, a, loxTop - 2.5, black, { depth: 0.1 }));
    }

    // forward dome, visible above the LOX tank
    const fwdDome = dome(R - 0.05, 2.6, makeSteel({ height: 3.4, arc: ARC }), 1);
    fwdDome.position.y = loxTop;
    body.add(fwdDome);
  }
  root.add(body);

  /* ------------------------------------------------------- aft structure -- */
  const skirt = part('aft-skirt', { explode: new THREE.Vector3(0, -6, 0) });
  {
    const skirtH = tankBottom - skirtBottom;
    const s = cylinder(R, R, skirtH, makeSteel({ height: skirtH, arc: ARC }));
    s.position.y = (skirtBottom + tankBottom) / 2;
    skirt.add(s);

    // thrust puck: the cone that funnels 33 engines into the tank dome
    const puck = dome(R - 0.25, 1.7, dark, -1);
    puck.position.y = tankBottom + 0.1;
    skirt.add(puck);

    // hold-down / chill vents around the base
    for (const [x, z, a] of ring(12, R - 0.05)) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.9), dark);
      vent.position.set(x, skirtBottom + 0.45, z);
      vent.rotation.y = -a;
      skirt.add(vent);
    }

    // pressurant bottles tucked inside the skirt
    for (const [x, z] of ring(6, R - 1.1, 0.3)) {
      const copv = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 6, 14), pipe);
      copv.position.set(x, tankBottom - 1.4, z);
      copv.castShadow = true;
      skirt.add(copv);
    }
  }
  root.add(skirt);

  /* ----------------------------------------------------------- engines ---- */
  const gen = b.engineName.includes('3') ? 3 : 2;
  const engines = part('booster-engines', { explode: new THREE.Vector3(0, -11, 0) });
  {
    const mountY = 2.2;
    // 3 gimballing centre engines
    for (const [x, z] of ring(3, 1.25, Math.PI / 2)) {
      const e = raptor({ gen, gimbal: true });
      e.position.set(x, mountY, z);
      engines.add(e);
    }
    // 10 gimballing middle engines
    for (const [x, z] of ring(10, 2.62, 0.15)) {
      const e = raptor({ gen, gimbal: quality.segments >= 128 });
      e.position.set(x, mountY, z);
      engines.add(e);
    }
    // 20 fixed outer engines
    for (const [x, z] of ring(20, 3.86, 0.08)) {
      const e = raptor({ gen });
      e.position.set(x, mountY, z);
      engines.add(e);
    }
  }
  root.add(engines);

  /* ------------------------------------------------------------- tanks ---- */
  const ch4 = part('booster-ch4-tank', { internal: true, explode: new THREE.Vector3(0, -2, 0) });
  {
    const mat = makePropellant('ch4');
    const wall = cylinder(R - 0.12, R - 0.12, ch4H, mat);
    wall.position.y = tankBottom + ch4H / 2;
    ch4.add(wall);
    const bottom = dome(R - 0.12, 1.9, mat, -1);
    bottom.position.y = tankBottom;
    ch4.add(bottom);
  }
  root.add(ch4);

  const bulkhead = part('booster-bulkhead', { internal: true, explode: new THREE.Vector3(0, 3, 0) });
  {
    const d = dome(R - 0.12, 1.9, makePropellant('ch4'), 1);
    d.position.y = ch4Top;
    bulkhead.add(d);
    const rim = cylinder(R - 0.1, R - 0.1, 0.3, dark);
    rim.position.y = ch4Top;
    bulkhead.add(rim);
  }
  root.add(bulkhead);

  const lox = part('booster-lox-tank', { internal: true, explode: new THREE.Vector3(0, 5, 0) });
  {
    const mat = makePropellant('lox');
    const wall = cylinder(R - 0.12, R - 0.12, loxH, mat);
    wall.position.y = ch4Top + loxH / 2;
    lox.add(wall);
    const top = dome(R - 0.12, 2.4, mat, 1);
    top.position.y = loxTop;
    lox.add(top);
  }
  root.add(lox);

  const downcomer = part('booster-downcomer', { internal: true, explode: new THREE.Vector3(0, 2, 0) });
  {
    const tube = cylinder(0.62, 0.62, ch4H + 2.4, pipe, { open: false, segments: 24 });
    tube.position.y = tankBottom + (ch4H + 2.4) / 2 - 1.2;
    downcomer.add(tube);
  }
  root.add(downcomer);

  /* --------------------------------------------------------- grid fins ---- */
  const finAzimuths =
    b.gridFins === 3 ? [Math.PI / 2, Math.PI, (3 * Math.PI) / 2] : [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const finY = H - 6.2;
  for (const a of finAzimuths) {
    const p = part('grid-fins', {
      explode: new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7),
    });
    const fin = gridFin({
      span: b.gridFinSpan,
      width: b.gridFins === 3 ? 4.6 : 3.9,
      depth: b.gridFins === 3 ? 0.7 : 0.55,
      cellsSpan: b.gridFins === 3 ? 7 : 6,
    });
    fin.position.set(Math.cos(a) * (R - 0.2), 0, Math.sin(a) * (R - 0.2));
    fin.rotation.y = -a;
    p.position.y = finY;
    p.add(fin);
    root.add(p);
  }

  /* ---------------------------------------------------- catch fittings ---- */
  for (const a of [0, Math.PI]) {
    const p = part('catch-fittings', {
      explode: new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5),
    });
    const g = new THREE.Group();
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 18), dark);
    pin.rotation.z = Math.PI / 2;
    pin.position.x = 0.6;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 1.6), dark);
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.4, 0.24), dark);
    gusset.position.x = 0.1;
    g.add(pin, base, gusset);
    g.position.set(Math.cos(a) * (R + 0.2), 0, Math.sin(a) * (R + 0.2));
    g.rotation.y = -a;
    p.position.y = H - 8.6;
    p.add(g);
    root.add(p);
  }

  /* --------------------------------------------------------- hot stage ---- */
  const hot = part('hot-stage', { explode: new THREE.Vector3(0, 9, 0) });
  {
    const integrated = b.hotStage === 'integrated';
    const outerR = integrated ? R : R + 0.14;
    const ventH = integrated ? 2.1 : 1.35;
    const solidH = hotStageH - ventH;

    const collar = cylinder(
      outerR,
      outerR,
      solidH,
      integrated ? makeSteel({ height: solidH, arc: 2 * Math.PI * outerR }) : dark
    );
    collar.position.y = hotStageBottom + ventH + solidH / 2;
    hot.add(collar);

    // vent openings: struts with gaps between them
    const struts = integrated ? 30 : 22;
    for (const [x, z, a] of ring(struts, outerR - 0.06)) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.24, ventH, integrated ? 0.32 : 0.42), dark);
      s.position.set(x, hotStageBottom + ventH / 2, z);
      s.rotation.y = -a;
      s.castShadow = true;
      hot.add(s);
      if (integrated) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, ventH * 1.05, 0.16), dark);
        d.position.set(x, hotStageBottom + ventH / 2, z);
        d.rotation.set(0, -a, 0.42);
        hot.add(d);
      }
    }

    // interface ring the ship sits on
    const lip = cylinder(outerR + 0.1, outerR + 0.1, 0.4, dark);
    lip.position.y = H - 0.2;
    hot.add(lip);
  }
  root.add(hot);

  /* ------------------------------------------------------------ raceways -- */
  const conduit = part('raceways', { explode: new THREE.Vector3(-8, 0, 0) });
  {
    const barrelH = hotStageBottom - tankBottom;
    const mid = (tankBottom + hotStageBottom) / 2;
    conduit.add(raceway(barrelH - 2, mid, Math.PI * 0.28, pipe));
    conduit.add(raceway(barrelH - 2, mid, Math.PI * 0.72, pipe, { width: 0.5, depth: 0.24 }));
  }
  root.add(conduit);

  /* -------------------------------------------------- hot-gas RCS thrusters */
  const rcs = part('booster-rcs', { explode: new THREE.Vector3(0, 5, 0) });
  {
    // high on the barrel, where the moment arm about the centre of mass is longest
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const cluster = new THREE.Group();
      for (const dy of [-0.5, 0.5]) {
        const nozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.24, 0.46, 14, 1, true),
          MATERIALS.engineHot()
        );
        nozzle.rotation.z = Math.PI / 2;
        nozzle.position.set(0.24, dy, 0);
        cluster.add(nozzle);
      }
      cluster.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.6, 0.9), dark));
      cluster.position.set(Math.cos(a) * (R + 0.06), H - 11.5, Math.sin(a) * (R + 0.06));
      cluster.rotation.y = -a;
      rcs.add(cluster);
    }
  }
  root.add(rcs);

  /* -------------------------------------------------------------- frost --- */
  const frost = new THREE.Group();
  frost.name = 'booster-frost';
  frost.add(frostBands(tankBottom - 0.8, ch4Top + 0.5, makeFrost, { arc: ARC }));
  frost.add(frostBands(ch4Top + 0.5, loxTop + 1.2, makeFrost, { arc: ARC, bands: 5 }));
  root.add(frost);

  root.userData.top = H;
  root.userData.height = H;
  root.userData.engineExitY = 0.35;
  root.userData.engineGroup = engines;
  root.userData.frost = frost;
  return root;
}
