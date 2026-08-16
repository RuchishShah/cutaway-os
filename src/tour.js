import { TOUR_BY_ID, toursFor } from './data/tours.js';

/**
 * Runs a guided tour over the viewer.
 *
 * The controller owns no vehicle knowledge at all — it walks the step list
 * from data/tours.js and calls back into the host for everything that touches
 * the 3D view. That keeps "what the tour says" and "how the viewer works" in
 * different files, and means a tour is reviewable as prose.
 *
 * `host` must provide: selectPart, applyPreset, setCamera, setModes,
 * playSeparation, stopSeparation, ui, onChange.
 */
export function createTours(host) {
  const root = document.getElementById('tour');
  const nameEl = document.getElementById('tour-name');
  const countEl = document.getElementById('tour-count');
  const titleEl = document.getElementById('tour-title');
  const bodyEl = document.getElementById('tour-body');
  const dotsEl = document.getElementById('tour-dots');
  const prevBtn = document.getElementById('tour-prev');
  const nextBtn = document.getElementById('tour-next');

  let tour = null;
  let index = 0;

  const isActive = () => tour !== null;

  /* ------------------------------------------------------------ launcher -- */

  function openLauncher(variant) {
    const list = toursFor(variant);
    host.ui.openModal(
      'Guided tours',
      `<p>Six or so steps each. The view drives itself — the camera, the cutaway and the
        exploded view move with the text, and you can stop and look around at any point.</p>
       <div class="tour-menu">
         ${list
           .map(
             (t) => `
           <button class="tour-card" type="button" data-tour="${t.id}">
             <strong>${t.title}</strong>
             <span>${t.blurb}</span>
             <em>${t.steps.length} steps</em>
           </button>`
           )
           .join('')}
       </div>`
    );
    for (const b of document.querySelectorAll('#modal-body [data-tour]')) {
      b.addEventListener('click', () => {
        host.ui.closeModal();
        start(b.dataset.tour);
      });
    }
  }

  /* --------------------------------------------------------------- steps -- */

  function start(id, step = 0) {
    const next = TOUR_BY_ID[id];
    if (!next) return false;
    tour = next;
    root.hidden = false;
    document.body.dataset.tour = id;
    goto(step);
    return true;
  }

  function goto(i) {
    if (!tour) return;
    index = Math.max(0, Math.min(tour.steps.length - 1, i));
    const step = tour.steps[index];

    // a step that does not ask for staging should not inherit it from the last
    if (step.play !== 'separation') host.stopSeparation();
    if (step.set) host.setModes(step.set);

    if (step.part) {
      host.selectPart(step.part, { focus: !step.cam });
    } else {
      host.selectPart(null);
      if (step.view) host.applyPreset(step.view);
    }
    if (step.cam) host.setCamera(step.cam);
    if (step.play === 'separation') host.playSeparation();

    // the text container is aria-live, so screen readers get the new step
    render();
    host.onChange();
  }

  const next = () => (index >= tour.steps.length - 1 ? exit() : goto(index + 1));
  const prev = () => goto(index - 1);

  function exit() {
    if (!tour) return;
    tour = null;
    root.hidden = true;
    delete document.body.dataset.tour;
    host.stopSeparation();
    host.onChange();
  }

  function render() {
    const n = tour.steps.length;
    const step = tour.steps[index];
    nameEl.textContent = tour.short || tour.title;
    countEl.textContent = `${index + 1} / ${n}`;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === n - 1 ? 'Finish' : 'Next →';

    dotsEl.replaceChildren();
    for (let i = 0; i < n; i++) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'tour-dot';
      d.dataset.on = String(i === index);
      d.setAttribute('aria-label', `Step ${i + 1}`);
      d.addEventListener('click', () => goto(i));
      dotsEl.appendChild(d);
    }
  }

  /* ------------------------------------------------------------- wiring --- */

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', () => next());
  document.getElementById('tour-exit').addEventListener('click', exit);

  return {
    openLauncher,
    start,
    exit,
    next: () => isActive() && next(),
    prev: () => isActive() && prev(),
    isActive,
    /** What the URL should carry, so a tour step is as shareable as a part. */
    state: () => (tour ? { tour: tour.id, step: index + 1 } : {}),
  };
}
