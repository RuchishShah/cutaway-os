import {
  VARIANTS,
  SOURCES,
  LAST_VERIFIED,
  vehicleOf,
  stageById,
  stagesTopDown,
  engineOf,
  totalEngines,
  partsForStage,
  partLabel,
  partSpecs,
  viewsFor,
} from './data/vehicle.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const GROUP_ORDER = ['Structure', 'Propellant', 'Propulsion', 'Aerodynamics', 'Thermal', 'Recovery'];

export function createUI(handlers) {
  /* -------------------------------------------------------- version tabs -- */
  const versionBar = $('.version-switch');
  for (const v of Object.values(VARIANTS)) {
    const b = el('button', null, `${v.short} · ${v.name}`);
    b.type = 'button';
    b.role = 'tab';
    b.dataset.version = v.id;
    b.title = `${v.name} (${v.years}) — ${v.tagline}`;
    b.addEventListener('click', () => handlers.onVersion(v.id));
    versionBar.appendChild(b);
  }

  /* ------------------------------------------------------ camera presets -- */
  const presetBar = $('#view-presets');
  let views = [];

  function renderPresets(variant) {
    views = viewsFor(variant);
    presetBar.replaceChildren();
    for (const view of views) {
      const b = el('button', 'preset-btn');
      b.type = 'button';
      b.dataset.view = view.id;
      b.append(view.label);
      b.appendChild(el('kbd', null, view.key));
      b.addEventListener('click', () => handlers.onPreset(view.id));
      presetBar.appendChild(b);
    }
  }

  /* ---------------------------------------------------------- part list --- */
  const listEl = $('#part-list');

  function renderPartList(variant, selectedId) {
    listEl.replaceChildren();
    for (const stage of stagesTopDown(variant)) {
      const h = el('div', 'stage-heading');
      h.append(stage.name, el('span', null, stage.sub));
      listEl.appendChild(h);

      const inStage = partsForStage(stage.id);
      const groups = [...new Set(inStage.map((p) => p.group))].sort(
        (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
      );

      for (const group of groups) {
        listEl.appendChild(el('div', 'group-heading', group));
        for (const p of inStage.filter((x) => x.group === group)) {
          const b = el('button', 'part-item');
          b.type = 'button';
          b.role = 'option';
          b.tabIndex = -1;
          b.dataset.part = p.id;
          b.dataset.internal = String(!!p.internal);
          b.setAttribute('aria-selected', String(p.id === selectedId));
          b.setAttribute('aria-current', String(p.id === selectedId));
          b.appendChild(el('span', 'dot'));
          b.appendChild(el('span', null, partLabel(p, variant)));
          if (p.internal) b.appendChild(el('span', 'tag', 'internal'));
          b.addEventListener('click', () => handlers.onSelect(p.id));
          listEl.appendChild(b);
        }
      }
    }
  }

  function setSelected(id) {
    for (const b of listEl.querySelectorAll('.part-item')) {
      const on = b.dataset.part === id;
      b.setAttribute('aria-current', String(on));
      b.setAttribute('aria-selected', String(on));
      if (on) {
        listEl.setAttribute('aria-activedescendant', b.id || (b.id = `part-opt-${id}`));
        b.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  /**
   * Arrow-key navigation over the component list. The 3D view cannot be driven
   * by keyboard in any meaningful way, so the list is the accessible route to
   * every part — it has to work properly.
   */
  listEl.addEventListener('keydown', (e) => {
    const items = [...listEl.querySelectorAll('.part-item')];
    if (!items.length) return;
    const current = items.findIndex((b) => b.getAttribute('aria-current') === 'true');
    let next = null;

    switch (e.key) {
      case 'ArrowDown': next = Math.min(items.length - 1, current + 1); break;
      case 'ArrowUp': next = Math.max(0, current - 1); break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      case 'Enter':
      case ' ':
        if (current >= 0) {
          e.preventDefault();
          handlers.onSelect(items[current].dataset.part);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    if (next === -1) next = 0;
    handlers.onSelect(items[next].dataset.part);
  });

  function setActiveVersion(id) {
    for (const b of versionBar.querySelectorAll('button')) {
      b.setAttribute('aria-selected', String(b.dataset.version === id));
    }
  }

  /* --------------------------------------------------------- info panel --- */
  const infoTitle = $('#info-title');
  const infoBody = $('#info-body');

  function showVehicle(variant) {
    const vehicle = vehicleOf(variant);
    const first = variant.stages[0];
    const engine = engineOf(first);

    infoTitle.textContent = `${variant.short} overview`;
    infoBody.replaceChildren();

    infoBody.appendChild(el('p', 'eyebrow', `${variant.name} · ${variant.years}`));
    infoBody.appendChild(el('h3', null, vehicle.fullName || vehicle.name));
    infoBody.appendChild(el('p', 'blurb', variant.tagline));

    const stats = el('div', 'stat-grid');
    const add = (value, label) => {
      const s = el('div', 'stat');
      s.appendChild(el('b', null, value));
      s.appendChild(el('span', null, label));
      stats.appendChild(s);
    };
    add(`${variant.height} m`, 'stack height');
    add(`${variant.diameter} m`, 'diameter');
    add(`${approx(variant.liftoffMassApprox)}${fmt(variant.liftoffMass)} t`, 'liftoff mass');
    add(`${variant.payloadLeo} t`, 'payload to LEO');
    add(`${approx(first.thrustApprox)}${first.thrust} MN`, 'liftoff thrust');
    add(`${totalEngines(variant)}`, `${engine.name.split(' ')[0].toLowerCase()} engines`);
    infoBody.appendChild(stats);

    infoBody.appendChild(specTable([
      ...variant.stages.map((s) => [`${s.name} height`, `${s.height} m`]),
      ...variant.stages.map((s) => [
        `${s.name} propellant`,
        `${approx(s.propellantApprox)}${fmt(s.propellant)} t`,
      ]),
      ['Propellants', vehicle.propellants],
      ['Engine', `${engine.name} · ${engine.cycle.toLowerCase()}`],
      ['Recovery', vehicle.recovery],
    ]));

    if (variant.notes?.length) {
      infoBody.appendChild(el('h3', null, 'What changed'));
      const ul = el('ul', 'note-list');
      for (const n of variant.notes) ul.appendChild(el('li', null, n));
      infoBody.appendChild(ul);
    }

    const hint = el('div', 'hint');
    hint.innerHTML =
      'Click any part in the 3D view to inspect it. Turn on <strong>Cutaway</strong> to see ' +
      'the tanks, bulkheads and downcomers inside.';
    infoBody.appendChild(hint);

    // the part list answers "what is this?"; the tours and the flight profile
    // answer "why is it like that?", so the overview is where to offer them
    const ctas = el('div', 'cta-row');
    for (const [label, fn] of [
      ['Take a guided tour →', handlers.onTours],
      ['Fly the mission →', handlers.onFlight],
    ]) {
      const b = el('button', 'tour-cta', label);
      b.type = 'button';
      b.addEventListener('click', () => fn());
      ctas.appendChild(b);
    }
    infoBody.appendChild(ctas);
  }

  function showPart(p, variant) {
    const stage = stageById(variant, p.stage);
    infoTitle.textContent = stage?.name ?? vehicleOf(variant).name;
    infoBody.replaceChildren();

    infoBody.appendChild(el('p', 'eyebrow', `${p.group}${p.internal ? ' · internal' : ''}`));
    infoBody.appendChild(el('h3', null, partLabel(p, variant)));
    infoBody.appendChild(el('p', 'blurb', p.blurb));

    const rows = partSpecs(p, variant);
    if (rows.length) infoBody.appendChild(specTable(rows));

    if (p.diagram === 'ffsc') {
      const fig = document.createElement('figure');
      fig.className = 'diagram';
      fig.innerHTML = ffscDiagram();
      infoBody.appendChild(fig);
    }

    if (p.internal) {
      const hint = el('div', 'hint');
      hint.innerHTML = 'This part sits inside the hull — it is only drawn while <strong>Cutaway</strong> is on.';
      infoBody.appendChild(hint);
    }
  }

  function specTable(rows) {
    const t = el('table', 'spec-table');
    const tb = el('tbody');
    for (const [k, v] of rows) {
      const tr = el('tr');
      tr.appendChild(el('td', null, k));
      tr.appendChild(el('td', null, v));
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    return t;
  }

  /* -------------------------------------------------------------- modal --- */
  const modal = $('#modal');
  const modalTitle = $('#modal-title');
  const modalBody = $('#modal-body');

  let lastFocus = null;

  function openModal(title, html) {
    lastFocus = document.activeElement;
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
    $('#modal-close').focus();
  }

  const closeModal = () => {
    modal.hidden = true;
    lastFocus?.focus?.();
    lastFocus = null;
  };

  // keep Tab inside the dialog while it is open
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  $('#modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  $('#btn-help').addEventListener('click', () =>
    openModal(
      'How to use',
      `<h3>Navigating</h3>
       <ul>
         <li>Drag to orbit, scroll or pinch to zoom, right-drag to pan.</li>
         <li>Click any surface to select that component.</li>
         <li>Use the camera presets to jump to a section of the vehicle.</li>
       </ul>
       <h3>Flying the profile</h3>
       <ul>
         <li><strong>Fly it</strong> opens the Flight 5 timeline — startup through the tower catch
             and the ship's landing burn, 66 minutes in fifteen events. Scrub it, or press play.</li>
         <li>The vehicle actually flies it: engines light and shut down in the right counts, the
             booster flips for the boostback burn, the ship holds its belly-first attitude through
             entry and stands up for the flip.</li>
         <li>Step with <kbd>→</kbd> and <kbd>←</kbd>, play or pause with <kbd>Space</kbd>. The
             exploded view, the engines toggle and the separation button belong to the profile
             while it is open.</li>
       </ul>
       <h3>Guided tours</h3>
       <ul>
         <li><strong>Tours</strong> walks you through one idea at a time — why it hot-stages, why
             it is steel, what is happening inside a Raptor, how both halves come back. The
             camera and the modes move with the text.</li>
         <li>Step with <kbd>→</kbd> and <kbd>←</kbd>, leave with <kbd>Esc</kbd>. You can orbit and
             click parts at any point without losing your place.</li>
         <li>Sharing while a tour is open links to that exact step.</li>
       </ul>
       <h3>Modes</h3>
       <ul>
         <li><strong>Cutaway</strong> slices the vehicle down its centreline and reveals the
             propellant tanks, common bulkheads, downcomers and nose header tanks.</li>
         <li><strong>Exploded</strong> pulls every assembly apart along its mounting axis.</li>
         <li><strong>Hot-stage separation</strong> plays the staging event: the ship lights its
             engines while still attached and flies off the booster.</li>
         <li><strong>Cryo frost</strong> shows the rime that forms wherever cryogenic propellant
             touches the wall — so the frost line is also a readout of where each tank sits.</li>
       </ul>
       <h3>Rendering</h3>
       <ul>
         <li><strong>Light</strong> moves the sun. The sky is a physical scattering model, and it
             is what the stainless steel reflects, so the time of day changes the whole look.</li>
         <li><strong>Quality</strong> trades detail for frame rate: mesh density, texture size,
             shadow resolution, ambient occlusion and bloom. It starts on a tier picked from your
             device, and switching rebuilds the model.</li>
       </ul>
       <h3>Keyboard</h3>
       ${views.map((v) => keyRow(v.key, v.label)).join('')}
       ${keyRow('X', 'Toggle cutaway')}
       ${keyRow('E', 'Toggle exploded view')}
       ${keyRow('L', 'Toggle labels')}
       ${keyRow('F', 'Toggle engines lit')}
       ${keyRow('G', 'Toggle cryo frost')}
       ${keyRow('Space', 'Play separation')}
       ${keyRow('← →', 'Step a tour or the flight profile')}
       ${keyRow('Esc', 'Deselect')}
       <h3>Sharing and embedding</h3>
       <ul>
         <li><strong>Share view</strong> copies a link that restores the part, the modes
             <em>and</em> the camera angle, so you can point someone at exactly what you are
             looking at.</li>
         <li>Add <code>&amp;embed=1</code> to any link to drop the interface and leave just the
             3D view — ready to drop into an <code>&lt;iframe&gt;</code> on your own page.</li>
         <li>Every component also has a plain reference page under <code>/parts/</code>, with the
             same text and figures, readable without WebGL.</li>
       </ul>
       <h3>Accuracy</h3>
       <p>The geometry is modelled procedurally from published dimensions, photographs and
       official renders. It is a faithful schematic, not an engineering drawing — proportions of
       major sections are to scale, small hardware is representative.</p>`
    )
  );

  $('#btn-sources').addEventListener('click', () =>
    openModal(
      'Sources',
      `<p>Every figure in this app comes from publicly available material. Numbers SpaceX has
        never formally published are shown with a “≈”.</p>
       <ul>${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join('')}</ul>
       <h3>Flight timeline</h3>
       <p>The times in <strong>Fly it</strong> are SpaceX's own published Flight 5 timeline
       (13 October 2024, the first tower catch). Altitude and speed at each event are approximate.
       The vehicle drawn is whichever generation you have selected, flying that profile.</p>
       <h3>Note</h3>
       <p>Figures last checked against these sources in <strong>${LAST_VERIFIED}</strong>.
       Starship is an actively evolving vehicle and public numbers shift between test flights, so
       treat these as the best published values at that date rather than certified specifications.
       If something here has gone stale, corrections are welcome.</p>
       <p>This project is not affiliated with or endorsed by SpaceX.</p>`
    )
  );

  /* ------------------------------------------------------ mobile drawers -- */
  const openPanel = (id, open) => {
    const p = document.getElementById(id);
    if (p) p.dataset.open = String(open);
  };
  $('#btn-parts').addEventListener('click', () => {
    const p = $('#panel-parts');
    openPanel('panel-parts', p.dataset.open !== 'true');
  });
  for (const b of document.querySelectorAll('[data-close]')) {
    b.addEventListener('click', () => openPanel(b.dataset.close, false));
  }

  /* -------------------------------------------------------------- toast --- */
  const toastEl = $('#toast');
  let toastTimer = null;

  function notify(message, ms = 5200) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), ms);
  }

  return {
    notify,
    renderPresets,
    renderPartList,
    setSelected,
    setActiveVersion,
    showVehicle,
    showPart,
    openModal,
    closeModal,
    isModalOpen: () => !modal.hidden,
    openInfoDrawer: () => openPanel('panel-info', true),
    views: () => views,
  };
}

/**
 * Flow diagram of the full-flow staged combustion cycle.
 *
 * The point the picture has to make is the one that distinguishes Raptor: both
 * propellants pass through a preburner and reach the chamber as gas, and no
 * turbine exhaust is thrown away. Drawn inline so it inherits the panel theme
 * and needs no assets.
 */
function ffscDiagram() {
  const ox = '#6fc3ff';
  const fu = '#ffb45c';
  const box = (x, y, w, h, label, sub, stroke) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"
          fill="rgba(255,255,255,0.04)" stroke="${stroke}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + (sub ? 15 : h / 2 + 4)}" class="d-lbl">${label}</text>
    ${sub ? `<text x="${x + w / 2}" y="${y + 28}" class="d-sub">${sub}</text>` : ''}`;

  const arrow = (x1, y1, x2, y2, stroke, dashed) => `
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${stroke}" stroke-width="1.6"
          fill="none" marker-end="url(#dArrow)" ${dashed ? 'stroke-dasharray="3 3"' : ''}/>`;

  return `
  <svg viewBox="0 0 300 236" role="img" aria-label="Full-flow staged combustion cycle: liquid oxygen and liquid methane each pass through their own turbopump and preburner, and both fully gasified streams meet in the main combustion chamber."
       xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="dArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
      </marker>
    </defs>
    <style>
      .d-lbl { font: 600 10.5px var(--font); fill: #dbe5f0; text-anchor: middle; }
      .d-sub { font: 9px var(--font); fill: #8b98a8; text-anchor: middle; }
    </style>

    ${box(6, 6, 128, 22, 'LIQUID OXYGEN', null, ox)}
    ${box(166, 6, 128, 22, 'LIQUID METHANE', null, fu)}

    ${box(6, 52, 128, 36, 'LOX turbopump', 'driven by ox-rich gas', ox)}
    ${box(166, 52, 128, 36, 'CH₄ turbopump', 'driven by fuel-rich gas', fu)}

    ${box(6, 112, 128, 36, 'Oxygen-rich', 'preburner', ox)}
    ${box(166, 112, 128, 36, 'Fuel-rich', 'preburner', fu)}

    ${box(56, 176, 188, 36, 'Main combustion chamber', 'both streams arrive as gas', '#9fb4c8')}

    <g color="${ox}">
      ${arrow(70, 28, 70, 50, ox)}
      ${arrow(70, 88, 70, 110, ox)}
      ${arrow(70, 148, 110, 174, ox)}
    </g>
    <g color="${fu}">
      ${arrow(230, 28, 230, 50, fu)}
      ${arrow(230, 88, 230, 110, fu)}
      ${arrow(230, 148, 190, 174, fu)}
    </g>

    <!-- each preburner's hot gas is what spins its own turbine -->
    <g color="${ox}">${arrow(20, 112, 20, 90, ox, true)}</g>
    <g color="${fu}">${arrow(280, 112, 280, 90, fu, true)}</g>
  </svg>
  <figcaption>
    Each propellant drives its own turbopump and then continues into the chamber — <em>no turbine
    exhaust is dumped overboard</em>. Burning all of both flows lets the turbines run cool, which
    is what allows the ≈330 bar chamber pressure.
  </figcaption>`;
}

function keyRow(key, label) {
  return `<div class="key-row"><span>${label}</span><kbd>${key}</kbd></div>`;
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

function approx(flag) {
  return flag ? '≈' : '';
}
