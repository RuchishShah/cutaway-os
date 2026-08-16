import * as THREE from 'three';

/**
 * Procedural materials.
 *
 * Everything is generated at runtime from canvases so the app ships with no
 * binary assets. The important part for realism is that each surface gets a
 * matching albedo / roughness / normal set: painted-on detail reads as a decal,
 * detail with real surface relief catches the light and reads as metal.
 */

const clipPlanes = [];

/** The single clipping plane shared by every material in cutaway mode. */
export const cutawayPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

const clippable = [];

function registerClippable(material) {
  clippable.push(material);
  material.clippingPlanes = clipPlanes;
  return material;
}

/** Opt a material (typically a runtime clone) into the shared cutaway plane. */
export function attachClipping(material) {
  return registerClippable(material);
}

export function setCutaway(enabled) {
  clipPlanes.length = 0;
  if (enabled) clipPlanes.push(cutawayPlane);
  for (const m of clippable) {
    m.clippingPlanes = clipPlanes;
    m.needsUpdate = true;
  }
}

/* --------------------------------------------------------------- quality -- */

let TEX = 1024; // texture edge length; raised on the Ultra tier

export function setTextureQuality(size) {
  TEX = size;
}

/* -------------------------------------------------------------- plumbing -- */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Sobel a height canvas into a tangent-space normal map. Doing this from the
 * same source that drew the albedo keeps the bumps registered with the paint.
 */
function heightToNormal(heightCanvas, strength = 2.2, maxSize = 1024) {
  // Sobel cost is quadratic in size, and a normal map carries far less detail
  // than an albedo, so downsample tall height maps before differencing them.
  let source = heightCanvas;
  if (heightCanvas.width > maxSize) {
    source = canvas(maxSize, maxSize);
    source.getContext('2d').drawImage(heightCanvas, 0, 0, maxSize, maxSize);
  }
  const size = source.width;
  const src = source.getContext('2d').getImageData(0, 0, size, size).data;
  const out = new ImageData(size, size);
  const at = (x, y) => src[((y & (size - 1)) * size + (x & (size - 1))) * 4];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));

      let nx = (dx / 1020) * strength;
      let ny = (dy / 1020) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      out.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  const c = canvas(size, size);
  c.getContext('2d').putImageData(out, 0, 0);
  return c;
}

function texture(c, { srgb = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------ stainless steel --- */

const RING_HEIGHT = 1.83; // one welded steel ring
const RINGS_PER_TILE = 8;
const TILE_HEIGHT_M = RING_HEIGHT * RINGS_PER_TILE;
const GORES_PER_TILE = 6;
const GORE_WIDTH_M = 1.8;

/**
 * Draws the three steel maps from one pass so the weld beads, the roughness
 * change in the heat-affected zone and the surface relief all line up.
 */
function buildSteelMaps() {
  const size = TEX;
  const col = canvas(size, size);
  const rough = canvas(size, size);
  const height = canvas(size, size);
  const c = col.getContext('2d');
  const r = rough.getContext('2d');
  const h = height.getContext('2d');

  c.fillStyle = '#b8bdc4';
  c.fillRect(0, 0, size, size);
  r.fillStyle = '#3c3c3c'; // fairly polished base
  r.fillRect(0, 0, size, size);
  h.fillStyle = '#808080'; // neutral height
  h.fillRect(0, 0, size, size);

  // rolling marks: fine circumferential streaks, the source of the anisotropy
  for (let i = 0; i < size * 2.5; i++) {
    const y = Math.random() * size;
    const len = size * (0.15 + Math.random() * 0.85);
    const x = Math.random() * size;
    const v = Math.random() < 0.5 ? 255 : 0;
    c.strokeStyle = `rgba(${v},${v},${v},${0.012 + Math.random() * 0.03})`;
    c.lineWidth = 0.5 + Math.random() * 1.6;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + len, y);
    c.stroke();
    r.strokeStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.025})`;
    r.lineWidth = c.lineWidth;
    r.beginPath();
    r.moveTo(x, y);
    r.lineTo(x + len, y);
    r.stroke();
  }

  // mill-finish blotching
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = (2 + Math.random() * 30) * (size / 1024);
    const v = 172 + Math.random() * 74;
    c.fillStyle = `rgba(${v},${v + 3},${v + 8},0.045)`;
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.fill();
    r.fillStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.028})`;
    r.beginPath();
    r.arc(x, y, rad, 0, Math.PI * 2);
    r.fill();
  }

  // circumferential weld seams every ring
  const step = size / RINGS_PER_TILE;
  const px = size / 1024;
  for (let i = 0; i < RINGS_PER_TILE; i++) {
    const y = Math.round(i * step);

    // the raised weld bead itself
    const bead = h.createLinearGradient(0, y - 3 * px, 0, y + 4 * px);
    bead.addColorStop(0, '#808080');
    bead.addColorStop(0.45, '#c8c8c8');
    bead.addColorStop(0.6, '#c0c0c0');
    bead.addColorStop(1, '#808080');
    h.fillStyle = bead;
    h.fillRect(0, y - 3 * px, size, 7 * px);
    // slight shrink groove either side of the bead
    h.fillStyle = 'rgba(0,0,0,0.16)';
    h.fillRect(0, y - 6 * px, size, 2 * px);
    h.fillRect(0, y + 4 * px, size, 2 * px);

    c.fillStyle = 'rgba(92,98,106,0.5)';
    c.fillRect(0, y, size, 2 * px);
    c.fillStyle = 'rgba(232,236,242,0.4)';
    c.fillRect(0, y + 2 * px, size, 1 * px);

    // heat-affected zone: rougher, faintly straw-tinted
    const haz = c.createLinearGradient(0, y - 9 * px, 0, y + 12 * px);
    haz.addColorStop(0, 'rgba(150,146,138,0)');
    haz.addColorStop(0.5, 'rgba(150,146,138,0.2)');
    haz.addColorStop(1, 'rgba(150,146,138,0)');
    c.fillStyle = haz;
    c.fillRect(0, y - 9 * px, size, 21 * px);
    r.fillStyle = 'rgba(255,255,255,0.5)';
    r.fillRect(0, y - 4 * px, size, 9 * px);
  }

  // vertical gore welds
  for (let i = 0; i < GORES_PER_TILE; i++) {
    const x = Math.round((i / GORES_PER_TILE) * size);
    c.fillStyle = 'rgba(112,118,126,0.28)';
    c.fillRect(x, 0, 1 * px, size);
    h.fillStyle = 'rgba(200,200,200,0.5)';
    h.fillRect(x, 0, 2 * px, size);
    r.fillStyle = 'rgba(255,255,255,0.3)';
    r.fillRect(x - px, 0, 3 * px, size);
  }

  return {
    map: texture(col, { srgb: true }),
    roughnessMap: texture(rough),
    normalMap: texture(heightToNormal(height, 1.5)),
  };
}

/* ---------------------------------------------------- heat shield tiles --- */

// the hex texture holds 26 tiles across and ~35 rows; at a 0.27 m tile that is
// 7.0 m of arc by 9.1 m of height per repeat
const HEX_TILE_ARC_M = 7.0;
const HEX_TILE_HEIGHT_M = 9.1;
const HEX_COLS = 26;

function buildTileMaps() {
  const size = TEX * 2; // tiles carry the closest-up detail in the whole model
  const col = canvas(size, size);
  const rough = canvas(size, size);
  const height = canvas(size, size);
  const c = col.getContext('2d');
  const r = rough.getContext('2d');
  const h = height.getContext('2d');

  // the gap between tiles: dark, deep, and slightly glossy where the
  // ablative backing shows
  c.fillStyle = '#0c0d10';
  c.fillRect(0, 0, size, size);
  r.fillStyle = '#c8c8c8';
  r.fillRect(0, 0, size, size);
  h.fillStyle = '#1e1e1e'; // gaps sit low
  h.fillRect(0, 0, size, size);

  const rad = size / HEX_COLS / 2;
  const hexW = Math.sqrt(3) * rad;
  const rowH = 1.5 * rad;
  const rows = Math.ceil(size / rowH) + 2;
  const inset = rad * 0.075; // the gap width

  const hexPath = (ctx, x, y, rr) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = x + rr * Math.cos(a);
      const py = y + rr * Math.sin(a);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  };

  for (let row = -1; row < rows; row++) {
    for (let colI = -1; colI < HEX_COLS + 2; colI++) {
      const x = colI * hexW + (row % 2 ? hexW / 2 : 0);
      const y = row * rowH;
      const rr = rad - inset;

      // albedo: matte black ceramic with per-tile firing variation
      const shade = 30 + Math.random() * 16;
      const warm = Math.random() * 5;
      c.fillStyle = `rgb(${shade + warm},${shade},${shade + 2})`;
      hexPath(c, x, y, rr);
      c.fill();

      // height: each tile is a slightly domed plateau with a chamfered edge
      h.fillStyle = '#9a9a9a';
      hexPath(h, x, y, rr);
      h.fill();
      h.fillStyle = '#c4c4c4';
      hexPath(h, x, y, rr * 0.82);
      h.fill();
      const dome = h.createRadialGradient(x, y, 0, x, y, rr);
      dome.addColorStop(0, 'rgba(255,255,255,0.35)');
      dome.addColorStop(1, 'rgba(255,255,255,0)');
      h.fillStyle = dome;
      hexPath(h, x, y, rr * 0.9);
      h.fill();

      // roughness: ceramic is matte, but tiles polish unevenly in the airstream
      const rv = 200 + Math.random() * 45;
      r.fillStyle = `rgb(${rv},${rv},${rv})`;
      hexPath(r, x, y, rr);
      r.fill();

      // occasional scorching and edge wear
      if (Math.random() < 0.09) {
        const g = c.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, 'rgba(74,62,52,0.5)');
        g.addColorStop(1, 'rgba(74,62,52,0)');
        c.fillStyle = g;
        hexPath(c, x, y, rr);
        c.fill();
      }
      if (Math.random() < 0.05) {
        c.fillStyle = 'rgba(150,146,140,0.16)';
        hexPath(c, x + rr * 0.2, y - rr * 0.25, rr * 0.3);
        c.fill();
      }
    }
  }

  return {
    map: texture(col, { srgb: true }),
    roughnessMap: texture(rough),
    normalMap: texture(heightToNormal(height, 2.6)),
  };
}

/* -------------------------------------------------------------- registry -- */

let steelMaps = null;
let tileMaps = null;
let frostMaps = null;

/** Cryogenic frost: patchy white rime that forms over loaded tank sections. */
function buildFrostMaps() {
  const size = TEX;
  const col = canvas(size, size);
  const height = canvas(size, size);
  const c = col.getContext('2d');
  const h = height.getContext('2d');
  c.fillStyle = '#000000';
  c.fillRect(0, 0, size, size);
  h.fillStyle = '#000000';
  h.fillRect(0, 0, size, size);

  const px = size / 1024;

  // clumped rime: many small crystals rather than a few soft clouds
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rr = (1.5 + Math.random() * 11) * px;
    const a = 0.1 + Math.random() * 0.45;
    for (const ctx of [c, h]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.6, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // vertical run marks where condensate sheets down the wall
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = (20 + Math.random() * 190) * px;
    const w = (1 + Math.random() * 4) * px;
    for (const ctx of [c, h]) {
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.3, `rgba(255,255,255,${0.1 + Math.random() * 0.22})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, len);
    }
  }

  return { alphaMap: texture(col), normalMap: texture(heightToNormal(height, 1.4)) };
}

/** Build (or rebuild, after a quality change) every shared texture. */
export function buildTextures() {
  disposeTextures();
  steelMaps = buildSteelMaps();
  tileMaps = buildTileMaps();
  frostMaps = buildFrostMaps();
}

export function disposeTextures() {
  for (const set of [steelMaps, tileMaps, frostMaps]) {
    if (!set) continue;
    for (const t of Object.values(set)) t?.dispose?.();
  }
  steelMaps = tileMaps = frostMaps = null;
}

function cloneSet(set, repeatX, repeatY) {
  const out = {};
  for (const [k, tex] of Object.entries(set)) {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(repeatX, repeatY);
    out[k] = t;
  }
  return out;
}

/* ------------------------------------------------------------ materials --- */

/**
 * Steel for a specific piece of hull. Passing the real height and arc length in
 * metres keeps weld seams and gore lines the same physical size everywhere.
 *
 * `anisotropy` stretches highlights along the rolling direction, which is what
 * gives rolled stainless its characteristic smeared reflections.
 */
export function makeSteel({ height = TILE_HEIGHT_M, arc = 2 * Math.PI * 4.5, roughness = 0.24 } = {}) {
  const repeatY = Math.max(height / TILE_HEIGHT_M, 0.08);
  const repeatX = Math.max(1, Math.round(arc / (GORES_PER_TILE * GORE_WIDTH_M)));
  const maps = cloneSet(steelMaps, repeatX, repeatY);

  return registerClippable(
    new THREE.MeshPhysicalMaterial({
      color: 0xeef2f6,
      ...maps,
      normalScale: new THREE.Vector2(0.85, 0.85),
      metalness: 1,
      roughness,
      anisotropy: 0.5,
      anisotropyRotation: Math.PI / 2, // along the circumference
      envMapIntensity: 1,
      side: THREE.DoubleSide,
    })
  );
}

/** Heat-shield tiles. `metresUV` is for ExtrudeGeometry, whose UVs are in model units. */
export function makeHeatShield({
  height = HEX_TILE_HEIGHT_M,
  arc = Math.PI * 4.5,
  metresUV = false,
} = {}) {
  const repeatX = metresUV ? 1 / HEX_TILE_ARC_M : Math.max(1, Math.round(arc / HEX_TILE_ARC_M));
  const repeatY = metresUV ? 1 / HEX_TILE_HEIGHT_M : Math.max(height / HEX_TILE_HEIGHT_M, 0.1);
  const maps = cloneSet(tileMaps, repeatX, repeatY);

  return registerClippable(
    new THREE.MeshPhysicalMaterial({
      color: 0xc6ccd4,
      ...maps,
      normalScale: new THREE.Vector2(1.3, 1.3),
      metalness: 0.02,
      roughness: 1,
      envMapIntensity: 0.85,
      side: THREE.DoubleSide,
    })
  );
}

/**
 * A frost shell drawn just outside the hull over a loaded tank. Also doubles as
 * a readout: the frost line is exactly where the propellant reaches.
 */
export function makeFrost({ height = 20, arc = 2 * Math.PI * 4.5, opacity = 0.92 } = {}) {
  // one texture tile ≈ 4.5 m of hull, so individual crystals land around 2–5 cm
  const maps = cloneSet(frostMaps, Math.max(2, Math.round(arc / 4.5)), Math.max(1, height / 4.5));
  return registerClippable(
    new THREE.MeshPhysicalMaterial({
      color: 0xe8f2ff,
      alphaMap: maps.alphaMap,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      transparent: true,
      opacity,
      metalness: 0,
      roughness: 0.82,
      envMapIntensity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
}

export const MATERIALS = {
  /** Machined/painted structure: skirts, frames, grid fins, hinges. */
  darkSteel: () =>
    registerClippable(
      new THREE.MeshPhysicalMaterial({
        color: 0x7d828a,
        metalness: 0.92,
        roughness: 0.44,
        envMapIntensity: 0.95,
        side: THREE.DoubleSide,
      })
    ),
  engineBell: () =>
    registerClippable(
      new THREE.MeshPhysicalMaterial({
        color: 0xb2b6bd,
        metalness: 1,
        roughness: 0.26,
        anisotropy: 0.4,
        envMapIntensity: 1,
        side: THREE.DoubleSide,
      })
    ),
  /** Heat-tinted inconel around the chamber and throat. */
  engineHot: () =>
    registerClippable(
      new THREE.MeshPhysicalMaterial({
        color: 0x8a7563,
        metalness: 0.95,
        roughness: 0.42,
        iridescence: 0.35,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [180, 520],
        envMapIntensity: 0.9,
      })
    ),
  plumbing: () =>
    registerClippable(
      new THREE.MeshPhysicalMaterial({
        color: 0x969ba3,
        metalness: 1,
        roughness: 0.34,
        envMapIntensity: 1,
      })
    ),
  black: () =>
    registerClippable(
      new THREE.MeshPhysicalMaterial({ color: 0x141519, metalness: 0.3, roughness: 0.85 })
    ),
  concrete: () =>
    new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95, metalness: 0 }),
};

/** Translucent volumes used for the cut-open propellant tanks. */
export function makePropellant(kind) {
  const cfg =
    kind === 'lox'
      ? { color: 0x6fc3ff, emissive: 0x0d3f63 }
      : kind === 'ch4'
        ? { color: 0xffb45c, emissive: 0x5a3208 }
        : { color: 0xc8ccd2, emissive: 0x111318 };
  return registerClippable(
    new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.55,
      metalness: 0.05,
      roughness: 0.35,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}
