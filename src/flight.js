import { profileFor, sampleProfile, clock } from './data/profile.js';

/**
 * The flight-profile scrubber.
 *
 * Like the tour controller, this owns the strip and the clock and nothing else
 * — every effect on the 3D view goes through `host.applySample`. The slider
 * runs over event index rather than seconds, so each phase of the mission gets
 * the same amount of travel regardless of how long it actually lasts.
 *
 * `host` must provide: applySample, onEnter, onExit, onChange.
 */

const STEPS = 100; // slider ticks per event, for smooth scrubbing
const SECONDS_PER_EVENT = 2.4; // playback pace

export function createFlight(host) {
  const root = document.getElementById('flight');
  const nameEl = document.getElementById('flight-name');
  const clockEl = document.getElementById('flight-clock');
  const teleEl = document.getElementById('flight-tele');
  const labelEl = document.getElementById('flight-label');
  const detailEl = document.getElementById('flight-detail');
  const scrub = document.getElementById('flight-scrub');
  const ticksEl = document.getElementById('flight-ticks');
  const playBtn = document.getElementById('flight-play');

  let profile = null;
  let position = 0;
  let lastIndex = -1;
  let playing = false;

  const isActive = () => profile !== null;
  const maxPosition = () => profile.events.length - 1;

  /* ---------------------------------------------------------- lifecycle --- */

  function open(variant, position0 = 0) {
    const next = profileFor(variant);
    if (!next) return false;
    profile = next;
    root.hidden = false;
    document.body.dataset.flight = profile.id;

    nameEl.textContent = `${profile.name} · ${profile.subtitle}`;
    nameEl.title = profile.note;
    scrub.max = String(maxPosition() * STEPS);
    renderTicks();

    host.onEnter();
    lastIndex = -1;
    setPosition(position0);
    setPlaying(false);
    return true;
  }

  function close() {
    if (!profile) return;
    setPlaying(false);
    profile = null;
    root.hidden = true;
    delete document.body.dataset.flight;
    host.onExit();
    host.onChange();
  }

  /* ------------------------------------------------------------ position -- */

  function setPosition(p) {
    position = Math.max(0, Math.min(maxPosition(), p));
    scrub.value = String(Math.round(position * STEPS));

    const sample = sampleProfile(profile, position);
    const entered = sample.index !== lastIndex;
    lastIndex = sample.index;

    host.applySample(sample, entered);
    render(sample);
    host.onChange();
  }

  function setPlaying(on) {
    playing = on && position < maxPosition();
    playBtn.dataset.playing = String(playing);
    playBtn.textContent = playing ? 'Pause' : position >= maxPosition() ? 'Replay' : 'Play';
    playBtn.setAttribute('aria-label', playing ? 'Pause the flight' : 'Play the flight');
  }

  /** Driven from the render loop so playback runs on real elapsed time. */
  function update(dt) {
    if (!playing) return;
    const next = position + dt / SECONDS_PER_EVENT;
    setPosition(next);
    if (next >= maxPosition()) setPlaying(false);
  }

  /* -------------------------------------------------------------- render -- */

  function renderTicks() {
    ticksEl.replaceChildren();
    profile.events.forEach((e, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'flight-tick';
      b.style.left = `${(i / maxPosition()) * 100}%`;
      b.title = `${clock(e.t)} — ${e.label}`;
      b.setAttribute('aria-label', `${clock(e.t)} ${e.label}`);
      b.addEventListener('click', () => {
        setPlaying(false);
        setPosition(i);
      });
      ticksEl.appendChild(b);
    });
  }

  function render(sample) {
    clockEl.textContent = clock(sample.t);
    const alt = sample.altitude >= 10 ? Math.round(sample.altitude) : sample.altitude.toFixed(1);
    teleEl.textContent = `≈${alt} km · ≈${Math.round(sample.speed).toLocaleString('en-US')} km/h`;
    labelEl.textContent = sample.event.label;
    detailEl.textContent = sample.event.detail;
    for (const [i, tick] of [...ticksEl.children].entries()) {
      tick.dataset.on = String(i === sample.index);
    }
  }

  /* ------------------------------------------------------------- wiring --- */

  scrub.addEventListener('input', () => {
    setPlaying(false);
    setPosition(Number(scrub.value) / STEPS);
  });
  playBtn.addEventListener('click', () => {
    if (!playing && position >= maxPosition()) setPosition(0);
    setPlaying(!playing);
  });
  document.getElementById('flight-exit').addEventListener('click', close);

  return {
    open,
    close,
    update,
    isActive,
    step(delta) {
      if (!profile) return;
      setPlaying(false);
      setPosition(Math.round(position) + delta);
    },
    togglePlay: () => isActive() && setPlaying(!playing),
    /** Re-apply the current instant — the model is rebuilt on a version change. */
    refresh: () => profile && setPosition(position),
    /** Position is in the URL so a shared link lands on the same moment. */
    state: () => (profile ? { flight: Math.round(position * STEPS) / STEPS } : {}),
  };
}
