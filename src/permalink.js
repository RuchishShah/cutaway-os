/**
 * URL state.
 *
 * Everything the viewer can be looking at is encoded in the query string, so a
 * screenshot someone posts can carry a link back to the exact view — the part,
 * the modes and the camera. Without this the app is a place you visit once;
 * with it, every share is a doorway.
 *
 * Written with replaceState so scrubbing a slider does not fill the back stack.
 */

const NUM = (v, digits = 2) => Number(v.toFixed(digits));

/** Read the current URL into a partial state object. Unknown keys are ignored. */
export function readState(search = window.location.search) {
  const q = new URLSearchParams(search);
  const bool = (k) => (q.has(k) ? q.get(k) !== '0' && q.get(k) !== 'false' : undefined);
  const num = (k) => (q.has(k) ? Number(q.get(k)) : undefined);

  const state = {
    version: q.get('v') || undefined,
    part: q.get('part') || undefined,
    tour: q.get('tour') || undefined,
    step: num('step'),
    flight: num('flight'),
    light: q.get('light') || undefined,
    quality: q.get('q') || undefined,
    cutaway: bool('cut'),
    labels: bool('labels'),
    frost: bool('frost'),
    engines: bool('engines'),
    explode: num('exp'),
    embed: bool('embed') ?? false,
    chrome: bool('chrome') ?? true,
  };

  // cam=<azimuth>,<elevation>,<distance>,<targetY>
  const cam = q.get('cam');
  if (cam) {
    const [azimuth, elevation, distance, targetY] = cam.split(',').map(Number);
    if ([azimuth, elevation, distance, targetY].every(Number.isFinite)) {
      state.cam = { azimuth, elevation, distance, targetY };
    }
  }
  return state;
}

/**
 * Serialise state to a query string. Only non-default values are written, so
 * the common case stays a clean bare URL and shared links stay readable.
 */
export function toQuery(state, defaults = {}) {
  const q = new URLSearchParams();
  const put = (k, v, def) => {
    if (v === undefined || v === null || v === def) return;
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  };

  put('v', state.version, defaults.version);
  put('part', state.part, undefined);
  put('tour', state.tour, undefined);
  // step 1 is implied by the tour id alone
  if (state.tour && state.step > 1) q.set('step', String(state.step));
  if (Number.isFinite(state.flight)) q.set('flight', String(NUM(state.flight, 2)));
  put('light', state.light, defaults.light);
  put('cut', state.cutaway, false);
  put('labels', state.labels, false);
  put('frost', state.frost, true);
  put('engines', state.engines, false);
  if (state.explode > 0.005) q.set('exp', String(Math.round(state.explode * 100)));
  if (state.embed) q.set('embed', '1');
  if (state.chrome === false) q.set('chrome', '0');

  if (state.cam) {
    const c = state.cam;
    q.set(
      'cam',
      [NUM(c.azimuth, 3), NUM(c.elevation, 3), NUM(c.distance, 1), NUM(c.targetY, 1)].join(',')
    );
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Absolute URL for the given state, suitable for pasting anywhere. */
export function buildUrl(state, defaults) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${toQuery(state, defaults)}`;
}

let pending = null;

/** Replace the address bar with the current state, coalesced to one write per frame. */
export function syncUrl(state, defaults) {
  clearTimeout(pending);
  pending = setTimeout(() => {
    const url = `${window.location.pathname}${toQuery(state, defaults)}`;
    try {
      history.replaceState(null, '', url);
    } catch {
      // file:// and sandboxed iframes reject replaceState; the app works regardless
    }
  }, 220);
}
