import * as THREE from 'three';
import { MATERIALS, makeSteel, makeHeatShield, makePropellant, makeFrost } from './materials.js';
import {
  R,
  part,
  cylinder,
  dome,
  ogive,
  raptor,
  flap,
  rootFairing,
  raceway,
  panel,
  ring,
  frostBands,
} from './helpers.js';
import { quality } from '../quality.js';
import { engineOf } from '../data/vehicle.js';

/**
 * The Starship upper stage. Origin sits at the base of the aft skirt.
 * Windward (heat-shielded) side faces +X. Aft flaps sit on ±Z.
 * `s` is the stage entry, `v` the variant it belongs to.
 * See builders.js for the userData contract this fulfils.
 */
export function buildStarshipUpper(s, v) {
  const H = s.height;
  const root = new THREE.Group();
  root.name = 'starship';

  const ARC = 2 * Math.PI * R;
  const dark = MATERIALS.darkSteel();
  const pipe = MATERIALS.plumbing();
  const black = MATERIALS.black();

  /* ---------------------------------------------------------- stations ---- */
  const skirtTop = 6.4;
  const noseH = 11.5;
  const noseBase = H - noseH;
  const bayH = 8.4;
  const bayBottom = noseBase - bayH;

  const tankSpan = bayBottom - skirtTop;
  const loxH = tankSpan * 0.566;
  const ch4H = tankSpan * 0.434;
  const loxTop = skirtTop + loxH;

  /* -------------------------------------------------------------- body ---- */
  const body = part('ship-body');
  {
    const skirt = cylinder(R, R, skirtTop, makeSteel({ height: skirtTop, arc: ARC }));
    skirt.position.y = skirtTop / 2;
    body.add(skirt);

    const barrelH = bayBottom - skirtTop;
    const barrel = cylinder(R, R, barrelH, makeSteel({ height: barrelH, arc: ARC }));
    barrel.position.y = (skirtTop + bayBottom) / 2;
    body.add(barrel);

    for (const y of [skirtTop, loxTop, bayBottom]) {
      const frame = cylinder(R + 0.07, R + 0.07, 0.55, dark);
      frame.position.y = y;
      body.add(frame);
    }


    // quick-disconnect / umbilical plate on the aft skirt
    body.add(panel(2.4, 1.8, Math.PI * 0.78, 3.4, dark, { depth: 0.2 }));
    body.add(panel(1.2, 0.9, Math.PI * 0.78, 1.6, black, { depth: 0.16 }));
    // vent ports around the skirt
    for (const [, , a] of ring(8, 1, 0.2)) {
      body.add(panel(0.5, 0.5, a, 5.5, black, { depth: 0.1 }));
    }
  }
  root.add(body);

  /* ------------------------------------------------------- payload bay ---- */
  const bay = part('payload-bay', { explode: new THREE.Vector3(0, 12, 0) });
  {
    const shell = cylinder(R, R, bayH, makeSteel({ height: bayH, arc: ARC }));
    shell.position.y = bayBottom + bayH / 2;
    bay.add(shell);

    // "PEZ dispenser": the long Starlink deployment slot on the leeward side
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.4, 2.6), black);
    slot.position.set(-(R - 0.12), bayBottom + bayH / 2, 0);
    bay.add(slot);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.8, 3.1), dark);
    rail.position.set(-(R - 0.02), bayBottom + bayH / 2, 0);
    bay.add(rail);
    // hinge line down one edge of the door
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.6, 10), pipe);
    hinge.position.set(-(R - 0.1), bayBottom + bayH / 2, 1.62);
    bay.add(hinge);
  }
  root.add(bay);

  /* ---------------------------------------------------------- nosecone ---- */
  const nose = part('nosecone', { explode: new THREE.Vector3(0, 20, 0) });
  {
    const cone = ogive(R, noseH, makeSteel({ height: noseH, arc: ARC }));
    cone.position.y = noseBase;
    nose.add(cone);

    const collar = cylinder(R + 0.07, R + 0.07, 0.5, dark);
    collar.position.y = noseBase;
    nose.add(collar);
  }
  root.add(nose);

  /* ------------------------------------------------------- heat shield ---- */
  const shield = part('heat-shield', { explode: new THREE.Vector3(11, 0, 0) });
  {
    const shellH = noseBase - 0.8;
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.09, R + 0.09, shellH, quality.segments, 1, true, 0, Math.PI),
      makeHeatShield({ height: shellH, arc: Math.PI * R })
    );
    shell.position.y = 0.8 + shellH / 2;
    shell.castShadow = shell.receiveShadow = true;
    shield.add(shell);

    // windward half of the nosecone is tiled too
    const noseTiles = ogive(R, noseH, makeHeatShield({ height: noseH, arc: Math.PI * R }), {
      phiStart: 0,
      phiLength: Math.PI,
      scale: 1.02,
    });
    noseTiles.position.y = noseBase;
    shield.add(noseTiles);

    // trim strip where the tiles meet bare steel
    for (const z of [R + 0.02, -(R + 0.02)]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, shellH, 0.22), black);
      edge.position.set(0, 0.8 + shellH / 2, z);
      shield.add(edge);
    }
  }
  root.add(shield);

  /* -------------------------------------------------------------- flaps --- */
  const tileMat = () => makeHeatShield({ metresUV: true });

  const aftFlapY = 10.5;
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const p = part('aft-flaps', {
      explode: new THREE.Vector3(Math.cos(a) * 8, 0, Math.sin(a) * 8),
    });
    const f = flap({ span: 7.2, rootChord: 9.2, tipChord: 5.4, thickness: 1.25 }, tileMat());
    f.position.set(Math.cos(a) * (R - 0.2), 0, Math.sin(a) * (R - 0.2));
    f.rotation.y = -a;
    f.rotation.z = -0.06;
    p.position.y = aftFlapY;
    p.add(f);

    // chine fairing blending the hinge into the barrel
    const fair = rootFairing({ length: 11.5, height: 4.2, bulge: 1.35 }, tileMat());
    fair.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    fair.rotation.y = -a;
    p.add(fair);
    root.add(p);
  }

  const fwdFlapY = noseBase - 2.6;
  const fwdAz = s.forwardFlap === 'leeward' ? (115 * Math.PI) / 180 : (68 * Math.PI) / 180;
  for (const a of [fwdAz, -fwdAz]) {
    const p = part('forward-flaps', {
      explode: new THREE.Vector3(Math.cos(a) * 8, 2, Math.sin(a) * 8),
    });
    const dims =
      s.forwardFlap === 'leeward'
        ? { span: 4.8, rootChord: 6.0, tipChord: 3.6, thickness: 0.95 }
        : { span: 5.6, rootChord: 6.8, tipChord: 4.0, thickness: 1.0 };
    const f = flap(dims, tileMat());
    f.position.set(Math.cos(a) * (R - 0.2), 0, Math.sin(a) * (R - 0.2));
    f.rotation.y = -a;
    f.rotation.z = 0.1;
    p.position.y = fwdFlapY;
    p.add(f);

    const fair = rootFairing({ length: dims.rootChord * 1.25, height: 3.0, bulge: 1.0 }, tileMat());
    fair.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    fair.rotation.y = -a;
    p.add(fair);
    root.add(p);
  }

  /* -------------------------------------------------------------- tanks --- */
  const lox = part('ship-lox-tank', { internal: true, explode: new THREE.Vector3(0, 1, 0) });
  {
    const mat = makePropellant('lox');
    const wall = cylinder(R - 0.12, R - 0.12, loxH, mat);
    wall.position.y = skirtTop + loxH / 2;
    lox.add(wall);
    const bottom = dome(R - 0.12, 1.7, mat, -1);
    bottom.position.y = skirtTop;
    lox.add(bottom);
  }
  root.add(lox);

  const bulkhead = part('ship-bulkhead', { internal: true, explode: new THREE.Vector3(0, 3.5, 0) });
  {
    // one shared wall: LOX below, methane above
    const d = dome(R - 0.12, 1.7, makePropellant('lox'), 1);
    d.position.y = loxTop;
    bulkhead.add(d);
    const rim = cylinder(R - 0.1, R - 0.1, 0.3, MATERIALS.darkSteel());
    rim.position.y = loxTop;
    bulkhead.add(rim);
  }
  root.add(bulkhead);

  const ch4 = part('ship-ch4-tank', { internal: true, explode: new THREE.Vector3(0, 6, 0) });
  {
    const mat = makePropellant('ch4');
    const wall = cylinder(R - 0.12, R - 0.12, ch4H, mat);
    wall.position.y = loxTop + ch4H / 2;
    ch4.add(wall);
    const top = dome(R - 0.12, 1.9, mat, 1);
    top.position.y = loxTop + ch4H;
    ch4.add(top);
  }
  root.add(ch4);

  const down = part('ship-downcomer', { internal: true, explode: new THREE.Vector3(0, 3, 0) });
  {
    const centre = cylinder(0.44, 0.44, loxH + 2.4, pipe, { open: false, segments: 20 });
    centre.position.y = skirtTop + loxH / 2 - 0.6;
    down.add(centre);
    for (const [x, z] of ring(3, 2.55, Math.PI / 6)) {
      const t = cylinder(0.26, 0.26, loxH + 1.6, pipe, { open: false, segments: 16 });
      t.position.set(x, skirtTop + loxH / 2 - 0.7, z);
      down.add(t);
    }
    for (const [x, z] of ring(2, 3.3, Math.PI / 3)) {
      const t = cylinder(0.16, 0.16, bayBottom - loxTop + bayH, pipe, { open: false, segments: 12 });
      t.position.set(x, loxTop + (bayBottom - loxTop + bayH) / 2, z);
      down.add(t);
    }
  }
  root.add(down);

  /* ------------------------------------------------------ header tanks ---- */
  const hLox = part('header-lox', { internal: true, explode: new THREE.Vector3(0, 24, 0) });
  {
    const mat = makePropellant('lox');
    const cap = ogive(R * 0.62, noseH * 0.55, mat);
    cap.position.y = noseBase + noseH * 0.42;
    hLox.add(cap);
    const sump = dome(R * 0.6, 1.2, mat, -1);
    sump.position.y = noseBase + noseH * 0.42;
    hLox.add(sump);
  }
  root.add(hLox);

  const hCh4 = part('header-ch4', { internal: true, explode: new THREE.Vector3(0, 18, 0) });
  {
    const mat = makePropellant('ch4');
    const drum = cylinder(2.0, 2.0, 2.6, mat);
    drum.position.y = noseBase + 2.4;
    hCh4.add(drum);
    const top = dome(2.0, 1.0, mat, 1);
    top.position.y = noseBase + 3.7;
    hCh4.add(top);
    const bot = dome(2.0, 1.0, mat, -1);
    bot.position.y = noseBase + 1.1;
    hCh4.add(bot);
  }
  root.add(hCh4);

  /* ------------------------------------------------------------ engines --- */
  const gen = engineOf(s).gen;
  const plumes = [];

  const sl = part('ship-engines-sl', { explode: new THREE.Vector3(0, -10, 0) });
  for (const [x, z] of ring(s.seaLevel, 1.15, Math.PI / 2)) {
    const e = raptor({ gen, gimbal: true });
    e.position.set(x, 4.6, z);
    sl.add(e);
    plumes.push({ x, y: 2.75, z, radius: 0.6, length: 11, tint: 0xbfe2ff });
  }
  root.add(sl);

  const vac = part('ship-engines-vac', { explode: new THREE.Vector3(0, -14, 0) });
  for (const [x, z] of ring(s.vacuum, 2.85, -Math.PI / 2)) {
    const e = raptor({ vacuum: true, gen });
    e.position.set(x, 4.1, z);
    vac.add(e);
    plumes.push({ x, y: 0.6, z, radius: 1.15, length: 15, tint: 0xcfe9ff });
  }
  root.add(vac);

  // engine bay shielding plate the nozzles poke through
  const shieldPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.15, R - 0.15, 0.3, quality.segments),
    dark
  );
  shieldPlate.position.y = 5.9;
  body.add(shieldPlate);

  /* ------------------------------------------------------------ raceways -- */
  const conduit = part('raceways', { explode: new THREE.Vector3(-7, 0, 0) });
  conduit.add(raceway(bayBottom - 3, (skirtTop + bayBottom) / 2, Math.PI, pipe, { width: 0.6, depth: 0.28 }));
  root.add(conduit);

  /* -------------------------------------------------- hot-gas RCS thrusters */
  const rcs = part('ship-rcs', { explode: new THREE.Vector3(0, 6, 0) });
  {
    // forward cluster on the nose and an aft pair by the engine bay
    for (const [y, azimuths] of [
      [noseBase - 6.5, [Math.PI * 0.35, Math.PI * 1.65]],
      [skirtTop + 1.6, [Math.PI * 0.45, Math.PI * 1.55]],
    ]) {
      for (const a of azimuths) {
        const cluster = new THREE.Group();
        for (const dy of [-0.55, 0.55]) {
          const nozzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.22, 0.42, 14, 1, true),
            MATERIALS.engineHot()
          );
          nozzle.rotation.z = Math.PI / 2;
          nozzle.position.set(0.22, dy, 0);
          cluster.add(nozzle);
        }
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.7, 0.85), dark);
        cluster.add(housing);
        cluster.position.set(Math.cos(a) * (R + 0.06), y, Math.sin(a) * (R + 0.06));
        cluster.rotation.y = -a;
        rcs.add(cluster);
      }
    }
  }
  root.add(rcs);

  /* ------------------------------------------- autogenous pressurisation --- */
  const press = part('ship-pressurisation', { internal: true, explode: new THREE.Vector3(0, 4, 0) });
  {
    // hot gas tapped at the engines and routed back up into each tank ullage
    for (const [x, z] of ring(2, 3.6, Math.PI * 0.75)) {
      const line = cylinder(0.13, 0.13, loxH + ch4H, pipe, { open: false, segments: 12 });
      line.position.set(x, skirtTop + (loxH + ch4H) / 2, z);
      press.add(line);
    }
    // diffusers spraying into the top of each tank
    for (const y of [loxTop - 1.2, loxTop + ch4H - 1.2]) {
      const diffuser = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 6, 24), pipe);
      diffuser.rotation.x = Math.PI / 2;
      diffuser.position.y = y;
      press.add(diffuser);
    }
  }
  root.add(press);

  /* -------------------------------------------------------------- frost --- */
  // Cryogenic frost forms wherever propellant touches the wall, so the frost
  // line is also a readout of how full the tanks are.
  const frost = new THREE.Group();
  frost.name = 'ship-frost';
  frost.add(frostBands(skirtTop - 0.6, loxTop + 0.4, makeFrost, { arc: ARC }));
  frost.add(frostBands(loxTop + 0.4, bayBottom - 0.6, makeFrost, { arc: ARC }));
  root.add(frost);

  root.userData.height = H;
  root.userData.noseBase = noseBase;
  root.userData.engineExitY = 0.6;
  root.userData.frost = frost;
  root.userData.plumes = plumes;
  return root;
}
