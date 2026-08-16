import * as THREE from 'three';
import { createViewer } from './scene.js';
import { buildStack } from './model/stack.js';
import {
  setCutaway,
  attachClipping,
  buildTextures,
  setTextureQuality,
} from './model/materials.js';
import { createUI } from './ui.js';
import { VERSIONS, DEFAULT_VERSION, PART_BY_ID } from './data/vehicle.js';
import { quality, setQuality, detectQuality, TIERS } from './quality.js';
import { TIME_PRESETS, DEFAULT_PRESET } from './environment.js';
import { readState, syncUrl, buildUrl } from './permalink.js';

const urlState = readState();
const URL_DEFAULTS = { version: DEFAULT_VERSION, light: DEFAULT_PRESET };

/** Give the browser two frames so the loading overlay is on screen. */
const paint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

const loadingNote = document.querySelector('#loading p');
const say = async (msg) => {
  if (loadingNote) loadingNote.textContent = msg;
  await paint();
};

await say('Generating surface textures…');
setQuality(TIERS[urlState.quality] ? urlState.quality : detectQuality());
setTextureQuality(quality.texture);
buildTextures();

await say('Building the vehicle…');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const viewport = document.getElementById('viewport');
const viewer = createViewer(viewport);
if (reducedMotion) viewer.setTweenScale(0.15);

/* ------------------------------------------------------------------ state -- */

const state = {
  versionId: DEFAULT_VERSION,
  selected: null,
  cutaway: false,
  explode: 0,
  labels: false,
  separation: 0,
  separating: false,
};

let stack = null;
let version = VERSIONS[state.versionId];
const labelObjects = new Map();
const highlighted = [];

const ui = createUI({
  onVersion: (id) => setVersion(id),
  onSelect: (id) => selectPart(id, { focus: true }),
  onPreset: (id) => applyPreset(id),
});

/* ------------------------------------------------------------ build cycle -- */

function setVersion(id) {
  if (id === state.versionId && stack) return;
  state.versionId = id;
  version = VERSIONS[id];
  rebuild();
  ui.setActiveVersion(id);
  ui.renderPartList(version, state.selected);
  if (state.selected && PART_BY_ID[state.selected]) ui.showPart(PART_BY_ID[state.selected], version);
  else ui.showVehicle(version);
}

function rebuild() {
  const keep = state.selected;
  if (stack) {
    viewer.scene.remove(stack.root);
    for (const obj of labelObjects.values()) obj.parent?.remove(obj);
    labelObjects.clear();
    highlighted.length = 0;
    stack.dispose();
  }

  stack = buildStack(version);
  viewer.scene.add(stack.root);

  viewer.environment.frameShadows(stack.stackHeight * 0.45, stack.stackHeight * 0.75);

  buildLabels();
  applyExplode(state.explode);
  applyCutaway(state.cutaway);
  stack.setPlumes(document.getElementById('tg-engines').checked);
  stack.setLiftoff(liftoff);
  stack.setFrost(document.getElementById('tg-frost').checked);
  stack.scaleRef.visible = document.getElementById('tg-scale').checked;
  viewer.grid.visible = document.getElementById('tg-scale').checked;
  stack.setSeparation(state.separation);

  if (keep && stack.index.has(keep)) applyHighlight(keep);
  else state.selected = keep && stack.index.has(keep) ? keep : state.selected;

  updateReadout();
}

/* ---------------------------------------------------------------- labels -- */

function buildLabels() {
  let i = 0;
  for (const entry of stack.index.values()) {
    const part = PART_BY_ID[entry.id];
    if (!part) continue;
    // fan successive pins out in reach and height so neighbours do not collide
    entry.labelReach = 4.5 + (i % 3) * 3.2;
    entry.labelLift = ((i % 4) - 1.5) * 1.6;
    i++;

    const div = document.createElement('div');
    div.className = 'pin muted';
    const body = document.createElement('span');
    body.className = 'pin-body';
    body.textContent = ui.resolveLabel(part, version);
    div.appendChild(body);

    // push the pin clear of the hull, radially outward from the vehicle axis
    const obj = viewer.makeLabel(div, new THREE.Vector3());
    obj.visible = false;
    stack.root.add(obj);
    labelObjects.set(entry.id, obj);
  }
  refreshLabels();
}

function refreshLabels() {
  for (const [id, obj] of labelObjects) {
    const part = PART_BY_ID[id];
    const internalOk = !part.internal || state.cutaway || state.explode > 0.05;
    const selected = id === state.selected;
    obj.visible = internalOk && (state.labels || selected);
    obj.element.classList.toggle('muted', !selected);
  }
  syncLabelPositions();
}

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();

/** Re-anchor visible pins — parts move under explode and stage separation. */
function syncLabelPositions() {
  for (const [id, obj] of labelObjects) {
    if (!obj.visible) continue;
    const entry = stack.index.get(id);
    if (!entry) continue;
    _box.makeEmpty();
    for (const g of entry.groups) _box.expandByObject(g);
    if (_box.isEmpty()) continue;
    _box.getCenter(_center);
    _box.getSize(_size);
    const dx = _center.x;
    const dz = _center.z;
    const len = Math.hypot(dx, dz);
    const nx = len < 0.7 ? 0.94 : dx / len;
    const nz = len < 0.7 ? 0.33 : dz / len;
    const reach = Math.max(_size.x, _size.z) / 2 + (entry.labelReach ?? 4.5);
    obj.position.set(
      _center.x + nx * reach,
      _center.y + (entry.labelLift ?? 0),
      _center.z + nz * reach
    );
  }
}

/* ------------------------------------------------------------- highlight -- */

function makeHighlightVariant(src) {
  const m = src.clone();
  if (m.emissive) {
    m.emissive = new THREE.Color(0x1f8fc4);
    m.emissiveIntensity = 1.1;
  } else {
    m.color = new THREE.Color(0x4dd2ff);
  }
  attachClipping(m);
  return m;
}

function applyHighlight(id) {
  for (const m of highlighted) m.material = m.userData.origMaterial;
  highlighted.length = 0;
  if (!id) return;
  stack.root.traverse((o) => {
    if (!o.isMesh || o.userData.partId !== id) return;
    o.userData.origMaterial ??= o.material;
    o.userData.hlMaterial ??= makeHighlightVariant(o.userData.origMaterial);
    o.material = o.userData.hlMaterial;
    highlighted.push(o);
  });
}

/* ------------------------------------------------------------- selection -- */

function selectPart(id, { focus = false } = {}) {
  const part = id ? PART_BY_ID[id] : null;
  state.selected = part ? id : null;

  applyHighlight(state.selected);
  ui.setSelected(state.selected);
  refreshLabels();

  if (part) {
    ui.showPart(part, version);
    // internal parts are meaningless without the cutaway, so switch it on
    if (part.internal && !state.cutaway) {
      document.getElementById('tg-cutaway').checked = true;
      applyCutaway(true);
    }
    if (focus) focusOnPart(id);
    if (window.matchMedia('(max-width: 860px)').matches) ui.openInfoDrawer();
  } else {
    ui.showVehicle(version);
  }
  updateReadout();
}

function focusOnPart(id) {
  const entry = stack.index.get(id);
  if (!entry) return;
  const box = new THREE.Box3();
  for (const g of entry.groups) box.expandByObject(g);
  const size = box.getSize(new THREE.Vector3());
  // slim parts need extra padding or they fill the frame edge to edge
  const padding = size.y > 30 ? 1.08 : 1.5;
  viewer.frameBox(box, { padding, elevation: 0.22 });
}

/* ----------------------------------------------------------------- modes -- */

function applyCutaway(on) {
  state.cutaway = on;
  setCutaway(on);
  stack.setInternalsVisible(on || state.explode > 0.05);
  refreshLabels();
  updateReadout();
}

function applyExplode(t) {
  state.explode = t;
  stack.setExplode(t);
  stack.setInternalsVisible(state.cutaway || t > 0.05);
  refreshLabels();
  updateReadout();
}

function applyPreset(id) {
  const box = new THREE.Box3();
  const b = stack.booster;
  const s = stack.ship;

  switch (id) {
    case 'ship':
      box.setFromObject(s);
      viewer.frameBox(box, { padding: 1.08, elevation: 0.12 });
      break;
    case 'booster':
      box.setFromObject(b);
      viewer.frameBox(box, { padding: 1.08, elevation: 0.12 });
      break;
    case 'engines': {
      box.setFromObject(b.userData.engineGroup);
      viewer.frameBox(box, { padding: 1.15, elevation: -0.42 });
      break;
    }
    case 'nose': {
      const noseEntry = stack.index.get('nosecone');
      if (noseEntry) {
        box.makeEmpty();
        for (const g of noseEntry.groups) box.expandByObject(g);
        viewer.frameBox(box, { padding: 1.25, elevation: 0.2 });
      }
      break;
    }
    default:
      stack.contentBox(box);
      viewer.frameBox(box, { padding: 1.06, elevation: 0.16 });
  }
}

/* --------------------------------------------------------- engines lit ---- */

// the stack climbs a little when the engines light, so the exhaust plumes are
// not buried in the ground
let liftoff = 0;
let liftoffTarget = 0;

function setEnginesLit(on) {
  liftoffTarget = on ? 1 : 0;
  stack.setPlumes(on);
}

/* ------------------------------------------------------------- separation -- */

let sepT = 0;
function playSeparation() {
  if (state.separating) {
    state.separating = false;
    sepT = 0;
    state.separation = 0;
    stack.setSeparation(0);
    document.getElementById('btn-separate').dataset.active = 'false';
    document.getElementById('btn-separate').textContent = 'Hot-stage separation';
    updateReadout();
    return;
  }
  state.separating = true;
  sepT = 0;
  document.getElementById('btn-separate').dataset.active = 'true';
  document.getElementById('btn-separate').textContent = 'Stop separation';

  // frame the whole staging event: booster top through where the ship ends up
  const box = stack.contentBox();
  const mid = stack.booster.userData.top;
  box.min.y = mid - 55;
  box.max.y = mid + stack.ship.userData.height + 46;
  viewer.frameBox(box, { padding: 1.05, elevation: 0.08 });
}

/* ---------------------------------------------------------------- embed --- */

function updateEmbedTitle() {
  if (!urlState.embed) return;
  const el = document.getElementById('embed-title');
  const link = document.getElementById('embed-link');
  const part = state.selected ? PART_BY_ID[state.selected] : null;
  el.textContent = part
    ? `${ui.resolveLabel(part, version)} — Starship ${version.short}`
    : `Starship / Super Heavy — ${version.name}`;
  link.href = buildUrl({ ...currentState(), embed: false }, URL_DEFAULTS);
}

/* ------------------------------------------------------------ permalink --- */

/** The shareable state of the viewer, as the URL will encode it. */
function currentState({ camera = true } = {}) {
  return {
    version: state.versionId,
    part: state.selected || undefined,
    light: selTime?.value,
    quality: quality.id === detectQuality() ? undefined : quality.id,
    cutaway: state.cutaway,
    labels: state.labels,
    frost: tgFrost?.checked ?? true,
    engines: tgEngines?.checked ?? false,
    explode: state.explode,
    embed: urlState.embed,
    cam: camera ? viewer.getCamera() : undefined,
  };
}

let urlReady = false;

/** Keep the address bar in step, minus the camera — that changes every frame. */
function pushUrl() {
  if (!urlReady) return;
  syncUrl(currentState({ camera: false }), URL_DEFAULTS);
}

/* ----------------------------------------------------------------- HUD ---- */

const readout = document.getElementById('readout');
function updateReadout() {
  pushUrl();
  updateEmbedTitle();
  const sel = state.selected ? ui.resolveLabel(PART_BY_ID[state.selected], version) : '—';
  const modes = [
    state.cutaway ? 'cutaway' : null,
    state.explode > 0.005 ? `exploded ${Math.round(state.explode * 100)}%` : null,
    state.separating ? 'staging' : null,
  ].filter(Boolean);
  readout.innerHTML =
    `<div><b>${version.short}</b> · ${version.stackHeight} m · ${version.diameter} m dia.</div>` +
    `<div><b>Selected</b> ${escapeHtml(sel)}</div>` +
    (modes.length ? `<div><b>Mode</b> ${modes.join(' · ')}</div>` : '') +
    `<div><b>Render</b> ${escapeHtml(viewer.environment.preset.label)} · ${escapeHtml(TIERS[quality.id].label)}</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* -------------------------------------------------------------- picking --- */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

viewer.renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
});

viewer.renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 5) return; // that was an orbit drag, not a click
  const hit = pick(e);
  selectPart(hit ? hit.userData.partId : null);
});

viewer.renderer.domElement.addEventListener('pointermove', (e) => {
  if (downAt) return;
  const hit = pick(e);
  viewer.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
});

function pick(e) {
  const rect = viewer.renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, viewer.camera);
  const hits = raycaster.intersectObject(stack.root, true);
  for (const h of hits) {
    const o = h.object;
    if (!o.visible || !o.userData.partId) continue;
    // ignore geometry that the cutaway plane has sliced away
    if (state.cutaway && h.point.z > 0.02) continue;
    return o;
  }
  return null;
}

/* --------------------------------------------------------------- controls -- */

const tgCutaway = document.getElementById('tg-cutaway');
const tgLabels = document.getElementById('tg-labels');
const tgEngines = document.getElementById('tg-engines');
const tgScale = document.getElementById('tg-scale');
const tgSpin = document.getElementById('tg-spin');
const slExplode = document.getElementById('sl-explode');
const outExplode = document.getElementById('out-explode');

tgCutaway.addEventListener('change', () => applyCutaway(tgCutaway.checked));
tgLabels.addEventListener('change', () => {
  state.labels = tgLabels.checked;
  refreshLabels();
});
tgEngines.addEventListener('change', () => setEnginesLit(tgEngines.checked));
const tgFrost = document.getElementById('tg-frost');
tgFrost.addEventListener('change', () => stack.setFrost(tgFrost.checked));
tgScale.addEventListener('change', () => {
  stack.scaleRef.visible = tgScale.checked;
  viewer.grid.visible = tgScale.checked;
});
tgSpin.addEventListener('change', () => (viewer.controls.autoRotate = tgSpin.checked));
viewer.controls.autoRotateSpeed = reducedMotion ? 0.2 : 0.5;

slExplode.addEventListener('input', () => {
  const t = Number(slExplode.value) / 100;
  outExplode.textContent = `${slExplode.value}%`;
  applyExplode(t);
});

/* ------------------------------------------------- lighting and quality --- */

const selTime = document.getElementById('sel-time');
for (const p of TIME_PRESETS) {
  const o = document.createElement('option');
  o.value = p.id;
  o.textContent = p.label;
  selTime.appendChild(o);
}
selTime.value = DEFAULT_PRESET;
selTime.addEventListener('change', () => {
  viewer.environment.setPreset(selTime.value);
  updateReadout();
});

const selQuality = document.getElementById('sel-quality');
for (const [id, tier] of Object.entries(TIERS)) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = tier.label;
  selQuality.appendChild(o);
}
selQuality.value = quality.id;
selQuality.addEventListener('change', async () => {
  perfChecked = true; // the user has chosen; stop auto-adjusting
  const previousTexture = quality.texture;
  setQuality(selQuality.value);
  viewer.applyQuality();
  // textures and geometry are both baked at the quality in force, so a tier
  // change means rebuilding them
  if (quality.texture !== previousTexture) {
    await showBusy(() => {
      setTextureQuality(quality.texture);
      buildTextures();
    });
  }
  rebuild();
  updateReadout();
});

/** Run a blocking rebuild with the loading overlay actually painted first. */
async function showBusy(work) {
  const el = document.getElementById('loading');
  el.hidden = false;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  work();
  el.hidden = true;
}

/** Copy a link to exactly what is on screen, camera included. */
document.getElementById('btn-share').addEventListener('click', async () => {
  const url = buildUrl(currentState(), URL_DEFAULTS);
  try {
    await navigator.clipboard.writeText(url);
    ui.notify('Link to this exact view copied to the clipboard.');
  } catch {
    // clipboard is blocked outside a secure context; show the URL to copy by hand
    ui.openModal(
      'Share this view',
      `<p>Copy this link — it restores the part, the modes and the camera angle.</p>
       <p><input class="share-input" readonly value="${url.replace(/"/g, '&quot;')}" /></p>
       <h3>Embed it</h3>
       <p>Add <code>&amp;embed=1</code> to drop the interface and leave just the 3D view,
       ready for an <code>&lt;iframe&gt;</code>.</p>`
    );
    document.querySelector('.share-input')?.select();
  }
});

document.getElementById('btn-separate').addEventListener('click', playSeparation);

document.getElementById('btn-reset').addEventListener('click', () => {
  slExplode.value = '0';
  outExplode.textContent = '0%';
  applyExplode(0);
  tgCutaway.checked = false;
  applyCutaway(false);
  tgEngines.checked = false;
  setEnginesLit(false);
  if (state.separating) playSeparation();
  selectPart(null);
  applyPreset('stack');
});

/* -------------------------------------------------------------- keyboard -- */

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (ui.isModalOpen() && e.key !== 'Escape') return;

  const presets = { 1: 'stack', 2: 'ship', 3: 'booster', 4: 'engines', 5: 'nose' };
  if (presets[e.key]) return applyPreset(presets[e.key]);

  switch (e.key.toLowerCase()) {
    case 'x':
      tgCutaway.checked = !tgCutaway.checked;
      applyCutaway(tgCutaway.checked);
      break;
    case 'e': {
      const to = state.explode > 0.05 ? 0 : 1;
      slExplode.value = String(to * 100);
      outExplode.textContent = `${to * 100}%`;
      applyExplode(to);
      break;
    }
    case 'l':
      tgLabels.checked = !tgLabels.checked;
      state.labels = tgLabels.checked;
      refreshLabels();
      break;
    case 'f':
      tgEngines.checked = !tgEngines.checked;
      setEnginesLit(tgEngines.checked);
      break;
    case 'g':
      tgFrost.checked = !tgFrost.checked;
      stack.setFrost(tgFrost.checked);
      break;
    case ' ':
      e.preventDefault();
      playSeparation();
      break;
    case 'escape':
      if (ui.isModalOpen()) ui.closeModal();
      else selectPart(null);
      break;
  }
});

/* ------------------------------------------------- adaptive quality drop --- */

// Mid-range phones can pick a tier their GPU cannot actually sustain. Watch the
// real frame time and step down once rather than letting the app crawl.
const DOWNGRADE = { ultra: 'high', high: 'balanced', balanced: 'fast' };
let slowFrames = 0;
let perfChecked = false;
let warmup = 0;

function watchPerformance(dt) {
  if (perfChecked) return;
  // ignore the first couple of seconds: shader compilation dominates
  if (warmup < 2.5) {
    warmup += dt;
    return;
  }
  slowFrames = dt > 0.055 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
  if (slowFrames < 180) return;

  perfChecked = true;
  const next = DOWNGRADE[quality.id];
  if (!next) return;
  setQuality(next);
  selQuality.value = next;
  viewer.applyQuality();
  rebuild();
  updateReadout();
  ui.notify(`Rendering was struggling, so quality dropped to ${TIERS[next].label}.`);
}

/* ------------------------------------------------------------------ loop -- */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  // clamped so a backgrounded tab does not jump on return, but generous enough
  // that animations still complete at low frame rates (software renderers)
  const dt = Math.min(clock.getDelta(), 0.25);

  if (state.separating && sepT < 1) {
    sepT = Math.min(1, sepT + dt / 5.5);
    // ease in: the ship accelerates away rather than sliding at constant speed
    state.separation = sepT * sepT;
    stack.setSeparation(state.separation);
    syncLabelPositions();
    if (sepT >= 1) updateReadout();
  }

  if (liftoff !== liftoffTarget) {
    const step = dt / 1.6;
    liftoff = liftoffTarget > liftoff ? Math.min(liftoffTarget, liftoff + step) : Math.max(liftoffTarget, liftoff - step);
    stack.setLiftoff(liftoff * liftoff * (3 - 2 * liftoff));
    syncLabelPositions();
  }

  watchPerformance(dt);
  stack.updatePlumes(dt);
  viewer.updateTween(dt);
  // drop the ground away when the camera goes under the vehicle
  viewer.ground.visible = viewer.camera.position.y > 0.6;
  viewer.controls.update();
  viewer.render();
}

/* ------------------------------------------------------------------ boot -- */

// Restore whatever the URL asked for before the first frame, so a shared link
// lands on its view rather than animating into it from the default.
if (urlState.embed) {
  document.body.dataset.embed = '1';
  // chrome=0 drops even the caption strip, for rendering share cards
  document.getElementById('embed-bar').hidden = urlState.chrome === false;
  if (urlState.chrome === false) {
    document.querySelector('.hud').style.display = 'none';
    document.querySelector('.label-layer').style.display = 'none';
  }
}

setVersion(VERSIONS[urlState.version] ? urlState.version : DEFAULT_VERSION);
ui.setActiveVersion(state.versionId);

if (urlState.light && TIME_PRESETS.some((t) => t.id === urlState.light)) {
  selTime.value = urlState.light;
  viewer.environment.setPreset(urlState.light);
}
selQuality.value = quality.id;

if (urlState.cutaway) {
  tgCutaway.checked = true;
  applyCutaway(true);
}
if (urlState.labels) {
  tgLabels.checked = true;
  state.labels = true;
}
if (urlState.frost === false) {
  tgFrost.checked = false;
  stack.setFrost(false);
}
if (urlState.engines) {
  tgEngines.checked = true;
  setEnginesLit(true);
}
if (Number.isFinite(urlState.explode) && urlState.explode > 0) {
  const t = Math.min(100, Math.max(0, urlState.explode));
  slExplode.value = String(t);
  outExplode.textContent = `${Math.round(t)}%`;
  applyExplode(t / 100);
}

const wantedPart = urlState.part && PART_BY_ID[urlState.part] ? urlState.part : null;
if (wantedPart) selectPart(wantedPart, { focus: !urlState.cam });
else ui.showVehicle(version);

if (urlState.cam) viewer.setCamera(urlState.cam);
else if (!wantedPart) applyPreset('stack');

updateEmbedTitle();
animate();

// only start writing the URL once the restore is finished, so we never
// overwrite a shared link with the defaults on the way in
urlReady = true;
pushUrl();

document.body.dataset.booted = '1';
document.getElementById('loading').hidden = true;

// small debug handle — handy from the console, harmless in production
window.starshipExplorer = {
  viewer,
  state,
  get stack() {
    return stack;
  },
  select: (id) => selectPart(id, { focus: true }),
  preset: applyPreset,
};
