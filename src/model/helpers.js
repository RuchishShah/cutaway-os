import * as THREE from 'three';
import { MATERIALS } from './materials.js';
import { quality } from '../quality.js';

export const R = 4.5; // hull radius, metres

/** Radial segment count for hull-sized cylinders, scaled by the quality tier. */
const seg = () => quality.segments;
const segHalf = () => Math.max(24, Math.round(quality.segments / 2));

/**
 * Wrap geometry in a tagged group. Every descendant mesh inherits `partId` so a
 * raycast on any triangle resolves to the right catalogue entry.
 */
export function part(id, { explode, internal = false } = {}) {
  const g = new THREE.Group();
  g.name = `part:${id}`;
  g.userData.partId = id;
  g.userData.isPart = true;
  g.userData.internal = internal;
  g.userData.explode = explode ? explode.clone() : new THREE.Vector3();
  return g;
}

/** Stamp partId onto everything below a part group (called once after build). */
export function stampParts(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o;
    while (n && !n.userData.isPart) n = n.parent;
    if (n) {
      o.userData.partId = n.userData.partId;
      o.userData.partGroup = n;
    }
  });
}

/** Record each part group's authored position so explode/collapse can lerp. */
export function freezeBasePositions(root) {
  root.traverse((o) => {
    if (o.userData.isPart) o.userData.basePosition = o.position.clone();
  });
}

/* ------------------------------------------------------------ primitives -- */

export function cylinder(rTop, rBottom, height, material, { open = true, segments } = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, height, segments ?? seg(), 1, open);
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Elliptical tank dome. `dir` is +1 for a dome bulging up, -1 for down.
 * Returns a lathe mesh whose apex sits at y = dir * depth.
 */
export function dome(radius, depth, material, dir = 1, { segments = 32 } = {}) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = (t * Math.PI) / 2;
    pts.push(new THREE.Vector2(radius * Math.cos(a), dir * depth * Math.sin(a)));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg()), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Ogive nosecone profile as a lathe. Base sits at y=0, apex at y=height.
 * `blunt` rounds the very tip so it does not alias into a needle.
 */
export function ogive(
  radius,
  height,
  material,
  { segments = 48, blunt = 0.22, phiStart = 0, phiLength = Math.PI * 2, scale = 1 } = {}
) {
  const pts = [];
  const rho = (radius * radius + height * height) / (2 * radius);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * height * (1 - blunt * 0.02);
    // tangent-ogive radius at station y, measured up from the base:
    // r(0) = radius at the base, r(height) = 0 at the tip
    const inner = rho * rho - y * y;
    let r = Math.sqrt(Math.max(inner, 0)) + radius - rho;
    r = Math.max(r, 0.001);
    pts.push(new THREE.Vector2(r * scale, y));
  }
  pts[pts.length - 1].x = Math.max(pts[pts.length - 1].x, blunt);
  pts.push(new THREE.Vector2(0.0001, height + blunt * 0.4));

  const nSeg = phiLength < Math.PI * 1.5 ? segHalf() : seg();
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, nSeg, phiStart, phiLength), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* --------------------------------------------------------------- Raptor --- */

/**
 * One Raptor. Built pointing down: the throat is at y=0 and the nozzle exit at
 * y = -length. `vacuum` swaps in the tall, wide expansion bell.
 */
export function raptor({ vacuum = false, gen = 2, gimbal = false } = {}) {
  const g = new THREE.Group();
  const bellMat = MATERIALS.engineBell();
  const hotMat = MATERIALS.engineHot();
  const pipeMat = MATERIALS.plumbing();
  const es = quality.engineSegments;

  const exitR = vacuum ? 1.2 : 0.65;
  const len = vacuum ? 3.5 : 1.85;
  const throatR = vacuum ? 0.17 : 0.16;

  // nozzle: bell curve from throat to exit, with a rolled lip at the exit
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = throatR + (exitR - throatR) * Math.pow(t, vacuum ? 0.62 : 0.72);
    pts.push(new THREE.Vector2(r, -t * len));
  }
  pts.push(new THREE.Vector2(exitR + 0.035, -len - 0.03));
  pts.push(new THREE.Vector2(exitR + 0.01, -len - 0.08));
  const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, es), bellMat);
  bell.castShadow = bell.receiveShadow = true;
  g.add(bell);

  // regenerative cooling channel ribs on the outside of the bell
  const ribCount = vacuum ? 4 : 2;
  for (let i = 1; i <= ribCount; i++) {
    const t = i / (ribCount + 1);
    const r = throatR + (exitR - throatR) * Math.pow(t, vacuum ? 0.62 : 0.72);
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(r + 0.015, 0.03, 6, Math.max(16, es)),
      pipeMat
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.y = -t * len;
    g.add(rib);
  }

  // combustion chamber + throat, heat-tinted
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, throatR, 0.62, Math.max(16, es), 1, false),
    hotMat
  );
  chamber.position.y = 0.31;
  g.add(chamber);

  // injector dome sitting on top of the chamber
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, es, 12, 0, Math.PI * 2, 0, Math.PI / 2), hotMat);
  dome.position.y = 0.62;
  g.add(dome);

  /* Full-flow staged combustion hardware: an oxygen-rich preburner driving the
     LOX turbopump on one side, a fuel-rich preburner driving the methane
     turbopump on the other, and two fat hot-gas ducts carrying both fully
     gasified streams into the injector. Nothing is dumped overboard, which is
     what separates this cycle from gas-generator engines. */
  const powerhead = new THREE.Group();
  powerhead.position.y = 0.95;

  const turbopump = (angle, radius, tint) => {
    const unit = new THREE.Group();
    // pump volute
    const volute = new THREE.Mesh(new THREE.SphereGeometry(radius, es, 12), tint);
    volute.scale.y = 0.78;
    unit.add(volute);
    // preburner stacked above the pump it drives
    const pb = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.72, 0.42, Math.max(12, es)),
      hotMat
    );
    pb.position.y = radius * 0.72;
    unit.add(pb);
    // hot-gas duct sweeping down into the injector dome
    const duct = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, 0.78, Math.max(10, es)),
      tint
    );
    duct.position.set(-radius * 0.55, -0.34, 0);
    duct.rotation.z = 0.62;
    unit.add(duct);
    // inlet elbow from the tank feed
    const inlet = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.075, 6, 14, Math.PI / 2), tint);
    inlet.position.set(radius * 0.55, 0.16, 0);
    inlet.rotation.set(Math.PI / 2, 0, -0.4);
    unit.add(inlet);

    unit.position.set(Math.cos(angle) * 0.44, 0, Math.sin(angle) * 0.44);
    unit.rotation.y = -angle;
    return unit;
  };

  // the oxygen side runs richer and hotter, so it gets the heat-tinted metal
  powerhead.add(turbopump(0.5, 0.26, hotMat));
  powerhead.add(turbopump(0.5 + Math.PI, 0.24, pipeMat));

  // main propellant valves
  for (const ang of [1.9, 4.4]) {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12), pipeMat);
    valve.position.set(Math.cos(ang) * 0.44, -0.2, Math.sin(ang) * 0.44);
    powerhead.add(valve);
  }
  g.add(powerhead);

  if (gen >= 3) {
    // Raptor 3 deletes almost all external plumbing and shielding: the
    // secondary flow paths are integrated into the castings, so what you see
    // from outside is a smooth jacket rather than a nest of pipes.
    const jacket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.36, 0.95, Math.max(20, es)),
      bellMat
    );
    jacket.position.y = 0.95;
    g.add(jacket);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 6, Math.max(18, es)), pipeMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.38;
    g.add(collar);
  } else {
    // Raptor 2 wears its plumbing on the outside
    for (const ang of [0.9, 2.5, 3.9, 5.6]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 8), pipeMat);
      line.position.set(Math.cos(ang) * 0.46, 0.5, Math.sin(ang) * 0.46);
      line.rotation.z = Math.cos(ang) * 0.12;
      g.add(line);
    }
  }

  // gimbal mount stub
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12), pipeMat);
  mount.position.y = 1.5;
  g.add(mount);

  // Electric TVC actuators. Raptor 2 replaced the hydraulic pack with electric
  // ones — lighter, fewer failure modes, no fluid to leak — which is why the
  // vehicle carries the batteries it does.
  if (gimbal) {
    for (const ang of [0.9, 0.9 + (2 * Math.PI) / 3]) {
      const act = new THREE.Group();
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 12), MATERIALS.black());
      motor.position.y = 0.42;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 10), pipeMat);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), bellMat);
      rod.position.y = -0.55;
      act.add(motor, barrel, rod);
      act.position.set(Math.cos(ang) * 0.76, 1.0, Math.sin(ang) * 0.76);
      act.rotation.z = Math.cos(ang) * -0.3;
      act.rotation.x = Math.sin(ang) * 0.3;
      g.add(act);
    }
  }

  g.userData.exitRadius = exitR;
  g.userData.length = len;
  return g;
}

/* ------------------------------------------------------------- grid fin --- */

/**
 * Lattice control surface. Built in local space with the vehicle axis along Y:
 * span runs +X (radially outward), width runs Z (tangential), and the open
 * cells run along Y so airflow passes straight through.
 */
export function gridFin({ span = 4.1, width = 4.0, depth = 0.55, cellsSpan = 6, cellsWide = 6 } = {}) {
  const g = new THREE.Group();
  const mat = MATERIALS.darkSteel();
  const wall = 0.055;

  const plate = (sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };

  plate(span, depth, wall * 2.4, span / 2, 0, width / 2);
  plate(span, depth, wall * 2.4, span / 2, 0, -width / 2);
  plate(wall * 2.4, depth, width, span, 0, 0);
  plate(wall * 2.4, depth, width, 0.05, 0, 0);

  for (let i = 1; i < cellsSpan; i++) {
    plate(wall, depth * 0.94, width, (i / cellsSpan) * span, 0, 0);
  }
  for (let i = 1; i < cellsWide; i++) {
    plate(span, depth * 0.94, wall, span / 2, 0, -width / 2 + (i / cellsWide) * width);
  }

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, width * 0.55, 20), mat);
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(-0.35, 0, 0);
  g.add(hinge);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 14), mat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(-1.0, 0, 0);
  g.add(shaft);

  return g;
}

/* ----------------------------------------------------------------- flap --- */

/**
 * Control flap. The leading edge is strongly swept while the trailing edge stays
 * close to square, which is what gives the real flaps their raked outline.
 * Built pointing +X (outboard) with the chord along Y.
 */
export function flap({ span = 8.5, rootChord = 8, tipChord = 5, thickness = 1.1 }, material) {
  const g = new THREE.Group();

  const le = rootChord / 2;
  const teRoot = -rootChord / 2;
  const sweep = rootChord * 0.42;
  const tipLE = le - sweep;
  const tipTE = tipLE - tipChord;

  const shape = new THREE.Shape();
  shape.moveTo(0, teRoot);
  shape.lineTo(0, le);
  shape.quadraticCurveTo(span * 0.5, le - sweep * 0.3, span * 0.9, tipLE);
  shape.quadraticCurveTo(span * 1.03, (tipLE + tipTE) / 2, span * 0.88, tipTE);
  shape.quadraticCurveTo(span * 0.45, tipTE - (tipTE - teRoot) * 0.35, 0, teRoot);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.3,
    bevelSize: thickness * 0.34,
    bevelSegments: quality.segments >= 128 ? 5 : 3,
    curveSegments: quality.segments >= 128 ? 20 : 12,
  });
  geo.translate(0, 0, -thickness / 2); // extrusion depth already runs along Z

  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  g.add(m);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness * 0.62, thickness * 0.62, rootChord * 0.42, 20),
    MATERIALS.darkSteel()
  );
  hinge.rotation.x = Math.PI / 2;
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0.1, 0, 0);
  g.add(hinge);

  return g;
}

/**
 * Root fairing ("chine") that blends a flap hinge into the hull. Modelled as a
 * squashed half-ellipsoid sitting proud of the barrel — a prominent feature on
 * the real vehicle and conspicuous by its absence when it is missing.
 */
export function rootFairing({ length = 11, height = 3.4, bulge = 1.15 }, material) {
  const s = Math.max(16, Math.round(quality.segments / 3));
  const geo = new THREE.SphereGeometry(1, s * 2, s);
  geo.scale(bulge, height / 2, length / 2);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ---------------------------------------------------------------- misc ----- */

/** Vertical external conduit running up the side of the hull. */
export function raceway(height, yCenter, azimuth, material, { width = 0.75, depth = 0.34 } = {}) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), material);
  box.castShadow = box.receiveShadow = true;
  g.add(box);

  // banding straps every few metres
  for (let y = -height / 2 + 2; y < height / 2; y += 4.2) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.08, 0.22, width + 0.1), material);
    strap.position.y = y;
    g.add(strap);
  }

  g.position.set(
    Math.cos(azimuth) * (R + depth / 2 - 0.02),
    yCenter,
    Math.sin(azimuth) * (R + depth / 2 - 0.02)
  );
  g.rotation.y = -azimuth;
  return g;
}

/** Flush access / umbilical panel set into the hull. */
export function panel(w, h, azimuth, y, material, { depth = 0.12 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(depth, h, w), material);
  m.position.set(Math.cos(azimuth) * (R - 0.02), y, Math.sin(azimuth) * (R - 0.02));
  m.rotation.y = -azimuth;
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Frost over a loaded tank, stacked as bands that thin out toward the top.
 * Cryogenic frost is heaviest where the liquid touches the wall and fades above
 * the ullage, so the frost line doubles as a readout of the propellant level.
 */
export function frostBands(y0, y1, makeFrost, { arc = 2 * Math.PI * R, bands = 4 } = {}) {
  const g = new THREE.Group();
  const total = y1 - y0;
  for (let i = 0; i < bands; i++) {
    const h = total / bands;
    const yb = y0 + i * h;
    const t = i / (bands - 1); // 0 at the bottom, 1 at the top
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.04, R + 0.04, h * 1.02, quality.segments, 1, true),
      makeFrost({ height: h, arc, opacity: 0.95 * (1 - t * 0.82) })
    );
    m.position.y = yb + h / 2;
    g.add(m);
  }
  return g;
}

/** Positions on a circle, returned as [x, z, angle] triples. */
export function ring(count, radius, phase = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    out.push([Math.cos(a) * radius, Math.sin(a) * radius, a]);
  }
  return out;
}
