/**
 * Flight profiles.
 *
 * The 3D view shows the vehicle standing still, which is the one state it
 * spends the least time in. Almost every design decision on it — the vented
 * interstage, three engines out of thirty-three, the flaps, the header tanks in
 * the nose — only makes sense against a specific moment of a specific flight.
 * This is that flight, as a scrubbable timeline.
 *
 * Times are SpaceX's own published Flight 5 timeline (13 October 2024, the
 * first tower catch), rounded to the second. Altitude and speed are the
 * approximate published values for those moments and are marked as such in the
 * interface — they are there for scale, not for navigation.
 *
 * Each event declares the vehicle state at that instant:
 *   engines   how many are lit on each stage, by stage id
 *   pitch     degrees from vertical, by stage id (positive tips the nose over)
 *   sep       stage separation, 0–1, fed into the same transform the
 *             "Hot-stage separation" button drives
 *   view      camera preset to cut to on arrival (only on entering the event)
 *   part      component to select, so the info panel explains what is acting
 *
 * Continuous fields (sep, pitch, altitude, speed) are interpolated between
 * events. Discrete ones (engines, view, part) snap on arrival.
 */

const t = (m, s) => m * 60 + s;

export const STARSHIP_FLIGHT = {
  id: 'flight-5',
  vehicle: 'starship',
  name: 'Flight 5 profile',
  subtitle: 'First tower catch · 13 October 2024',
  note:
    'Times are SpaceX\'s published Flight 5 timeline. Altitude and speed are approximate. '
    + 'The vehicle drawn is whichever generation you have selected, flying that profile.',
  events: [
    {
      id: 'startup',
      t: -3,
      label: 'Startup',
      detail:
        'Thirty-three Raptors light in a staggered sequence while the booster is still clamped '
        + 'down. Nothing releases until every one of them reports full thrust — the hold-downs are '
        + 'the abort.',
      altitude: 0,
      speed: 0,
      engines: { booster: 33, ship: 0 },
      view: 'engines:booster',
      part: 'aft-skirt',
    },
    {
      id: 'liftoff',
      t: 0,
      label: 'Liftoff',
      detail:
        'Roughly 80 MN of thrust against about 5,000 tonnes of vehicle. It leaves the mount slowly '
        + '— the thrust-to-weight ratio at this instant is only a little over 1.5.',
      altitude: 0,
      speed: 0,
      engines: { booster: 33, ship: 0 },
      view: 'stack',
      part: 'booster-engines',
    },
    {
      id: 'max-q',
      t: t(1, 2),
      label: 'Max Q',
      detail:
        'Peak aerodynamic pressure. Speed is rising and air density is falling, and their product '
        + 'peaks here — this is the hardest the atmosphere ever pushes on the airframe. Every '
        + 'structural margin in the hull is sized by this moment.',
      altitude: 13,
      speed: 1600,
      engines: { booster: 33, ship: 0 },
      view: 'stack',
      part: 'booster-body',
    },
    {
      id: 'meco',
      t: t(2, 36),
      label: 'MECO',
      detail:
        'Thirty of the thirty-three shut down. The booster is nearly empty, so full thrust would '
        + 'now be crushing — and it has to stop pushing hard before the ship can fly off the front '
        + 'of it.',
      altitude: 66,
      speed: 5600,
      engines: { booster: 3, ship: 0 },
      view: 'stage:booster',
      part: 'booster-engines',
    },
    {
      id: 'hot-stage',
      t: t(2, 39),
      label: 'Hot-stage separation',
      detail:
        'The ship lights all six of its engines while still attached, and flies itself off a '
        + 'booster that is still under thrust. The exhaust vents sideways through the lattice. '
        + 'Three seconds after MECO — there is no coast.',
      altitude: 68,
      speed: 5700,
      engines: { booster: 3, ship: 6 },
      sep: 0.35,
      view: 'stack',
      part: 'hot-stage',
    },
    {
      id: 'boostback',
      t: t(2, 47),
      label: 'Boostback burn',
      detail:
        'The booster flips end over end using its hot-gas thrusters, then relights thirteen '
        + 'engines pointing the way it came. It is cancelling its downrange velocity and putting '
        + 'itself on a ballistic arc back to the pad it left 167 seconds ago.',
      altitude: 78,
      speed: 5200,
      pitch: { booster: 180 },
      engines: { booster: 13, ship: 6 },
      sep: 1,
      view: 'stage:booster',
      part: 'booster-rcs',
    },
    {
      id: 'boostback-end',
      t: t(3, 35),
      label: 'Boostback shutdown',
      detail:
        'Burn complete. From here the booster is a falling object with control surfaces, coasting '
        + 'up over apogee and back down — with no propulsion again for nearly three minutes.',
      altitude: 105,
      speed: 3900,
      pitch: { booster: 180 },
      engines: { booster: 0, ship: 6 },
      sep: 1,
      view: 'stage:booster',
      part: 'grid-fins',
    },
    {
      id: 'transonic',
      t: t(6, 20),
      label: 'Booster transonic',
      detail:
        'Flipped back engines-down and falling through thick air, slowing through the sound '
        + 'barrier. The grid fins are doing all the work — they are the only thing steering, and '
        + 'they have to fly the booster into a corridor a few metres wide, above a tower, with no '
        + 'ability to go around.',
      altitude: 21,
      speed: 1200,
      pitch: { booster: 0 },
      engines: { booster: 0, ship: 6 },
      sep: 1,
      view: 'stage:booster',
      part: 'grid-fins',
    },
    {
      id: 'landing-burn',
      t: t(6, 37),
      label: 'Booster landing burn',
      detail:
        'Thirteen engines light, then throttle down to three. The booster is decelerating from '
        + 'over 1,000 km/h to a hover in about twenty seconds, and it carries only enough '
        + 'propellant for one attempt.',
      altitude: 5,
      speed: 900,
      pitch: { booster: 0 },
      engines: { booster: 3, ship: 6 },
      sep: 1,
      view: 'engines:booster',
      part: 'booster-engines',
    },
    {
      id: 'catch',
      t: t(7, 4),
      label: 'Tower catch',
      detail:
        'The arms close under the two catch pins and take the whole booster. It never touches the '
        + 'ground and it has no legs to do so with — a 200-tonne vehicle caught out of the air by '
        + 'the same tower that stacked it.',
      altitude: 0,
      speed: 0,
      pitch: { booster: 0 },
      engines: { booster: 0, ship: 6 },
      sep: 1,
      view: 'stage:booster',
      part: 'catch-fittings',
    },
    {
      id: 'seco',
      t: t(8, 35),
      label: 'Ship engine cutoff',
      detail:
        'Meanwhile the ship shuts down at orbital-class velocity. On this flight the trajectory is '
        + 'deliberately just short of orbit, so it comes down over the Indian Ocean without needing '
        + 'a deorbit burn to work.',
      altitude: 145,
      speed: 26600,
      engines: { booster: 0, ship: 0 },
      sep: 1,
      view: 'stage:ship',
      part: 'ship-engines-vac',
    },
    {
      id: 'entry',
      t: t(47, 21),
      label: 'Entry interface',
      detail:
        'Back into measurable atmosphere at nearly 27,000 km/h, belly first. Essentially all of '
        + 'that energy has to become heat in the air rather than heat in the vehicle, which is what '
        + 'the tiled windward face is for.',
      altitude: 100,
      speed: 26400,
      pitch: { ship: 68 },
      engines: { booster: 0, ship: 0 },
      sep: 1,
      view: 'stage:ship',
      part: 'heat-shield',
    },
    {
      id: 'bellyflop',
      t: t(62, 16),
      label: 'Belly-flop',
      detail:
        'Through peak heating and down into thick air, holding roughly 60° angle of attack. The '
        + 'four flaps trim by changing how much of the vehicle is in the flow — it is falling '
        + 'flat on purpose, using its own area as the brake.',
      altitude: 40,
      speed: 1200,
      pitch: { ship: 72 },
      engines: { booster: 0, ship: 0 },
      sep: 1,
      view: 'stage:ship',
      part: 'aft-flaps',
    },
    {
      id: 'flip',
      t: t(65, 56),
      label: 'Landing flip',
      detail:
        'Seconds from the surface the flaps drive the nose up and the vehicle rotates to vertical. '
        + 'This is the manoeuvre the nose header tanks exist for: the landing propellant is up '
        + 'front, thermally stable and unable to slosh away from the pickups mid-rotation.',
      altitude: 1,
      speed: 400,
      pitch: { ship: 20 },
      engines: { booster: 0, ship: 3 },
      sep: 1,
      view: 'stage:ship',
      part: 'header-lox',
    },
    {
      id: 'touchdown',
      t: t(66, 13),
      label: 'Landing burn',
      detail:
        'Three sea-level Raptors, upright, hovering to a stop. On Flight 5 this was a soft '
        + 'splashdown in the Indian Ocean; the same sequence flown over a tower is the ship catch.',
      altitude: 0,
      speed: 0,
      pitch: { ship: 0 },
      engines: { booster: 0, ship: 3 },
      sep: 1,
      view: 'stage:ship',
      part: 'ship-engines-sl',
    },
  ],
};

export const PROFILES = { starship: STARSHIP_FLIGHT };

export const profileFor = (variant) => PROFILES[variant.vehicle] || null;

/** T+MM:SS, or T−MM:SS before the clock reaches zero. */
export function clock(seconds) {
  const sign = seconds < 0 ? '−' : '+';
  const abs = Math.abs(Math.round(seconds));
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  return `T${sign}${mm}:${ss}`;
}

/**
 * Resolve the vehicle state at a fractional event index.
 *
 * The slider runs over event index rather than seconds on purpose: the coast
 * between ship cutoff and entry is 39 of the mission's 66 minutes, and a
 * linear time axis would spend two thirds of the bar on nothing happening.
 */
export function sampleProfile(profile, position) {
  const events = profile.events;
  const i = Math.max(0, Math.min(events.length - 1, Math.floor(position)));
  const j = Math.min(events.length - 1, i + 1);
  const f = Math.max(0, Math.min(1, position - i));
  const a = events[i];
  const b = events[j];

  const lerp = (key) => a[key] + (b[key] - a[key]) * f;
  const pitch = {};
  for (const id of new Set([...Object.keys(a.pitch || {}), ...Object.keys(b.pitch || {})])) {
    pitch[id] = (a.pitch?.[id] ?? 0) + ((b.pitch?.[id] ?? 0) - (a.pitch?.[id] ?? 0)) * f;
  }

  return {
    index: i,
    event: a,
    t: lerp('t'),
    altitude: lerp('altitude'),
    speed: lerp('speed'),
    sep: (a.sep ?? 0) + ((b.sep ?? 0) - (a.sep ?? 0)) * f,
    pitch,
    engines: a.engines || {},
  };
}
