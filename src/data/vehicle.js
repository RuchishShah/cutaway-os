/**
 * Vehicle data for CutawayOS.
 *
 * Every number here comes from publicly published material (SpaceX's own
 * Starship page and user guide, Wikipedia's Starship / Super Heavy articles,
 * NASASpaceflight and Everyday Astronaut reporting). Figures SpaceX has never
 * formally published are marked `approx: true` and rendered with a "≈".
 *
 * All lengths are metres, masses tonnes, thrust meganewtons.
 */

export const SOURCES = [
  { label: 'SpaceX — Starship', url: 'https://www.spacex.com/vehicles/starship/' },
  { label: 'Wikipedia — SpaceX Starship', url: 'https://en.wikipedia.org/wiki/SpaceX_Starship' },
  { label: 'Wikipedia — SpaceX Super Heavy', url: 'https://en.wikipedia.org/wiki/SpaceX_Super_Heavy' },
  {
    label: 'Wikipedia — Starship (spacecraft)',
    url: 'https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)',
  },
  { label: 'Everyday Astronaut — Starship flight guides', url: 'https://everydayastronaut.com/' },
  { label: 'NASASpaceflight — Starship coverage', url: 'https://www.nasaspaceflight.com/' },
];

/**
 * The three flown/announced generations. Heights are chosen so that
 * booster + ship equals the published stack height exactly.
 */
export const VERSIONS = {
  v1: {
    id: 'v1',
    name: 'Block 1',
    short: 'V1',
    years: '2023 – 2024',
    tagline: 'The first integrated flight vehicles, IFT-1 through Flight 6.',
    stackHeight: 121.3,
    diameter: 9,
    liftoffMass: 5000,
    liftoffMassApprox: true,
    payloadLeo: 15,
    booster: {
      height: 71,
      propellant: 3400,
      propellantApprox: true,
      thrust: 73.5,
      engines: 33,
      engineName: 'Raptor 2',
      engineThrust: 230,
      gridFins: 4,
      gridFinSpan: 4.1,
      gridFinApprox: true,
      hotStage: 'bolt-on',
    },
    ship: {
      height: 50.3,
      propellant: 1200,
      thrust: 12.25,
      seaLevel: 3,
      vacuum: 3,
      engineName: 'Raptor 2 / RVac',
      dryMass: 100,
      dryMassApprox: true,
      forwardFlap: 'windward',
    },
    notes: [
      'Flight 1 flew with no hot-stage ring; it was added from Flight 2 onward.',
      'Forward flaps sat on the windward side, directly in the re-entry plasma flow.',
    ],
  },
  v2: {
    id: 'v2',
    name: 'Block 2',
    short: 'V2',
    years: '2025 – 2026',
    tagline: 'Taller tanks, redesigned forward flaps, first ship-catch hardware.',
    stackHeight: 123.1,
    diameter: 9,
    liftoffMass: 5300,
    liftoffMassApprox: true,
    payloadLeo: 35,
    booster: {
      height: 71,
      propellant: 3650,
      thrust: 76,
      thrustApprox: true,
      engines: 33,
      engineName: 'Raptor 2',
      engineThrust: 230,
      gridFins: 4,
      gridFinSpan: 4.1,
      gridFinApprox: true,
      hotStage: 'bolt-on',
    },
    ship: {
      height: 52.1,
      propellant: 1500,
      thrust: 15.69,
      seaLevel: 3,
      vacuum: 3,
      engineName: 'Raptor 2 / RVac',
      dryMass: 85,
      forwardFlap: 'leeward',
    },
    notes: [
      'Propellant load grew to 1,500 t on the ship — about 1,170 t LOX and 330 t liquid methane.',
      'Forward flaps were moved leeward and shrunk, cutting plasma exposure at the hinge line.',
      'Hot-stage ring became jettisonable to save booster landing mass.',
    ],
  },
  v3: {
    id: 'v3',
    name: 'Block 3',
    short: 'V3',
    years: '2026 –',
    tagline: 'Raptor 3, integrated hot-stage lattice, three oversized grid fins.',
    stackHeight: 124.4,
    diameter: 9,
    liftoffMass: 5250,
    payloadLeo: 100,
    booster: {
      height: 72.3,
      propellant: 4050,
      thrust: 80.8,
      engines: 33,
      engineName: 'Raptor 3',
      engineThrust: 250,
      gridFins: 3,
      gridFinSpan: 6.1,
      gridFinApprox: true,
      hotStage: 'integrated',
    },
    ship: {
      height: 52.1,
      propellant: 1600,
      thrust: 17.2,
      thrustApprox: true,
      seaLevel: 3,
      vacuum: 3,
      engineName: 'Raptor 3 / RVac 3',
      dryMass: 85,
      dryMassApprox: true,
      forwardFlap: 'leeward',
    },
    notes: [
      'Raptor 3 removes most external plumbing and shielding — the engine is its own heat shield.',
      'The hot-stage section is now structurally integrated as a vented lattice instead of a bolted-on ring.',
      'Reported grid fin change: three fins in a "T" layout, roughly 50% larger than Block 1/2 fins.',
      'A 9-engine ship (3 sea-level + 6 vacuum, ≈26.5 MN) is the announced next step for this generation.',
    ],
  },
};

export const DEFAULT_VERSION = 'v3';

/**
 * Raptor generations. Raptor is the first full-flow staged combustion engine to
 * fly: two preburners gasify *all* of both propellants before they reach the
 * main chamber, so the turbines run cooler and nothing is dumped overboard.
 */
export const RAPTOR = {
  1: {
    name: 'Raptor 1',
    thrust: 185,
    chamber: 250,
    isp: 350,
    mass: 2080,
    length: 3.1,
    diameter: 1.3,
    tvc: 'Hydraulic',
  },
  2: {
    name: 'Raptor 2',
    thrust: 230,
    chamber: 300,
    isp: 347,
    mass: 1630,
    length: 3.1,
    diameter: 1.3,
    tvc: 'Electric',
  },
  3: {
    name: 'Raptor 3',
    thrust: 250,
    chamber: 330,
    isp: 350,
    mass: 1525,
    length: 3.1,
    diameter: 1.3,
    tvc: 'Electric',
    note: 'Up to 280 tf demonstrated on the test stand',
  },
};

/** Which Raptor generation a version flies. */
export const raptorGen = (v) => (v.booster.engineName.includes('3') ? 3 : 2);

/** Shown in the Sources dialog so readers can judge how stale the figures are. */
export const LAST_VERIFIED = '2026-08';

/**
 * Part catalogue. `id` matches the id stamped onto mesh userData by the model
 * builders, so a raycast hit resolves straight into this table.
 *
 * `specs` entries may be a literal string, or a function of the active version.
 */
export const PARTS = [
  // ---------------------------------------------------------------- SHIP ---
  {
    id: 'nosecone',
    stage: 'ship',
    label: 'Nosecone',
    group: 'Structure',
    internal: false,
    blurb:
      'A one-piece ogive cap welded from stainless steel gores. It carries the forward flap ' +
      'hinge loads, so the inside is heavily reinforced with longerons and ring frames around ' +
      'the attachment points. The very tip is not empty volume — the LOX header tank forms it.',
    specs: (v) => [
      ['Diameter at base', `${v.diameter} m`],
      ['Material', '30X-series stainless steel'],
      ['Contains', 'LOX + CH₄ header tanks, pressurant COPVs'],
      ['Windward face', 'Covered in hexagonal heat-shield tiles'],
    ],
  },
  {
    id: 'forward-flaps',
    stage: 'ship',
    label: 'Forward flaps',
    group: 'Aerodynamics',
    internal: false,
    blurb:
      'Two actuated flaps that let the ship hold a belly-first, roughly 60° angle of attack ' +
      'through re-entry — the "skydiver" descent. They trim pitch and roll by changing frontal ' +
      'area rather than by deflecting airflow like a conventional control surface.',
    specs: (v) => [
      ['Count', '2'],
      ['Position', v.ship.forwardFlap === 'leeward' ? 'Moved leeward (Block 2 onward)' : 'Windward face'],
      ['Actuation', 'Electric motors, battery powered'],
      ['Deflection', '≈140° of travel'],
      ['Function', 'Pitch + roll control during belly-flop descent'],
    ],
  },
  {
    id: 'payload-bay',
    stage: 'ship',
    label: 'Payload bay',
    group: 'Structure',
    internal: false,
    blurb:
      'The unpressurised volume between the nose and the methane tank. On operational flights ' +
      'it holds the "PEZ dispenser" — a long slot door that ejects flat-packed Starlink ' +
      'satellites sideways, one at a time, without needing a full clamshell fairing.',
    specs: (v) => [
      ['Usable diameter', '≈8 m'],
      ['Payload to LEO', `${v.payloadLeo} t (${v.name}, reusable)`],
      ['Deployment', 'PEZ-style slot dispenser'],
      ['Crew variant', 'Pressurised cabin replaces the bay'],
    ],
  },
  {
    id: 'header-lox',
    stage: 'ship',
    label: 'LOX header tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'A small dedicated oxygen tank in the very tip of the nose. Landing propellant lives here ' +
      'instead of in the main tanks so it stays thermally stable through the coast and so the ' +
      'ullage does not slosh during the flip. Putting it in the nose also shifts the centre of ' +
      'mass forward, which the flaps need for a stable belly-flop.',
    specs: () => [
      ['Location', 'Nose tip, above the CH₄ header'],
      ['Contents', 'Liquid oxygen for the landing burn'],
      ['Feed', 'Conical sump into a dedicated downcomer'],
      ['Why the nose', 'Centre-of-mass trim + slosh control'],
    ],
  },
  {
    id: 'header-ch4',
    stage: 'ship',
    label: 'CH₄ header tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'The methane counterpart to the LOX header, mounted directly below it inside the nose. ' +
      'Together the two headers carry only the few tonnes needed for the landing burn.',
    specs: () => [
      ['Location', 'Nose, below the LOX header'],
      ['Contents', 'Liquid methane for the landing burn'],
      ['Feed', 'Conical sump into a dedicated downcomer'],
    ],
  },
  {
    id: 'ship-ch4-tank',
    stage: 'ship',
    label: 'Main methane tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'The forward of the ship\'s two main tanks. Liquid methane is stored a few degrees below ' +
      'its boiling point ("densified") so more mass fits in the same volume. It sits above the ' +
      'LOX tank, separated only by a shared common bulkhead.',
    specs: (v) => [
      ['Propellant', 'Liquid methane (CH₄), sub-cooled'],
      ['Approx. load', `≈${Math.round(v.ship.propellant * 0.22)} t of ${v.ship.propellant} t total`],
      ['Separator', 'Common bulkhead shared with LOX tank'],
      ['Feed', 'Direct to engine manifold'],
    ],
  },
  {
    id: 'ship-lox-tank',
    stage: 'ship',
    label: 'Main LOX tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'The aft main tank, sitting directly on top of the engine bay. Oxygen is roughly 3.6× the ' +
      'methane mass, but far denser, so the LOX tank is the shorter of the two.',
    specs: (v) => [
      ['Propellant', 'Liquid oxygen (LOX), sub-cooled'],
      ['Approx. load', `≈${Math.round(v.ship.propellant * 0.78)} t of ${v.ship.propellant} t total`],
      ['Mixture ratio', '≈3.6 : 1 LOX to CH₄ by mass'],
      ['Position', 'Aft tank, directly above the engines'],
    ],
  },
  {
    id: 'ship-downcomer',
    stage: 'ship',
    label: 'Downcomers',
    group: 'Propellant',
    internal: true,
    blurb:
      'Pipes that carry methane from the forward tank straight down through the LOX tank to the ' +
      'engines. The published arrangement is four: a central line feeding the three sea-level ' +
      'Raptors, plus one dedicated line per vacuum engine.',
    specs: () => [
      ['Count', '4 (1 central + 3 vacuum-engine feeds)'],
      ['Routing', 'Through the LOX tank inside a sealed tunnel'],
      ['Also present', 'Separate header-tank downcomers from the nose'],
    ],
  },
  {
    id: 'aft-flaps',
    stage: 'ship',
    label: 'Aft flaps',
    group: 'Aerodynamics',
    internal: false,
    blurb:
      'The larger, lower pair of control surfaces, mounted across the LOX tank and engine bay. ' +
      'They carry most of the aerodynamic load in the belly-flop and drive the final flip to ' +
      'vertical before the landing burn.',
    specs: () => [
      ['Count', '2'],
      ['Position', 'Aft body, ≈180° apart'],
      ['Actuation', 'Electric, battery powered'],
      ['Function', 'Primary pitch authority + landing flip'],
    ],
  },
  {
    id: 'heat-shield',
    stage: 'ship',
    label: 'Heat shield',
    group: 'Thermal',
    internal: false,
    blurb:
      'About eighteen thousand hexagonal ceramic tiles cover the windward face. Hexagons are ' +
      'used so there is no continuous straight gap for plasma to run along. Tiles pin onto studs ' +
      'welded to the hull; since Flight 4 an ablative backup layer sits underneath in case one ' +
      'is lost.',
    specs: () => [
      ['Tile count', '≈18,000'],
      ['Shape', 'Hexagonal, ≈0.3 m across'],
      ['Rated to', '≈1,400 °C'],
      ['Backup', 'Secondary ablative layer beneath the tiles'],
      ['Coverage', 'Windward side only — leeward stays bare steel'],
    ],
  },
  {
    id: 'ship-engines-sl',
    stage: 'ship',
    label: 'Sea-level Raptors',
    group: 'Propulsion',
    internal: false,
    blurb:
      'Three gimballing Raptors at the centre of the engine bay. Their compact bells survive ' +
      'atmospheric flight, so these are the engines that perform the landing flip and burn. ' +
      'They are the only ship engines that can be relit in the atmosphere.',
    specs: (v) => {
      const r = RAPTOR[raptorGen(v)];
      return [
        ['Count', `${v.ship.seaLevel}`],
        ['Type', r.name],
        ['Cycle', 'Full-flow staged combustion'],
        ['Thrust each', `≈${r.thrust} tf at sea level`],
        ['Chamber pressure', `≈${r.chamber} bar`],
        ['Specific impulse', `≈${r.isp} s (sea level)`],
        ['Gimbal', `${r.tvc} TVC, ±15°`],
        ['Propellants', 'Sub-cooled CH₄ / LOX at 3.6 : 1'],
      ];
    },
    diagram: 'ffsc',
  },
  {
    id: 'ship-engines-vac',
    stage: 'ship',
    label: 'Raptor Vacuum',
    group: 'Propulsion',
    internal: false,
    blurb:
      'Three fixed engines with a much larger expansion nozzle, tuned for vacuum where the ' +
      'bigger bell extracts far more thrust from the same flow. They do the orbital insertion ' +
      'burn and are the reason the ship\'s skirt is as wide as it is.',
    specs: (v) => [
      ['Count', `${v.ship.vacuum}`],
      ['Type', v.ship.engineName.split(' / ')[1] || 'Raptor Vacuum'],
      ['Gimbal', 'No — fixed mount'],
      ['Ship total thrust', `${v.ship.thrustApprox ? '≈' : ''}${v.ship.thrust} MN`],
      ['Planned upgrade', '6 vacuum engines (9 total) on later Block 3'],
    ],
  },

  {
    id: 'ship-bulkhead',
    stage: 'ship',
    label: 'Common bulkhead',
    group: 'Propellant',
    internal: true,
    blurb:
      'One shared dome between the LOX and methane tanks instead of two separate ends with a ' +
      'gap. It removes a whole bulkhead and several metres of vehicle, but the wall now has ' +
      'liquid oxygen at −183 °C on one face and liquid methane at −162 °C on the other, and it ' +
      'has to carry the pressure difference between the two tanks in both directions.',
    specs: () => [
      ['Separates', 'CH₄ (above) from LOX (below)'],
      ['Shape', 'Elliptical dome, Block 2 onward'],
      ['ΔT across it', '≈21 °C between propellants'],
      ['Saves', 'One dome plus the intertank gap'],
    ],
  },
  {
    id: 'ship-rcs',
    stage: 'ship',
    label: 'Hot-gas thrusters',
    group: 'Propulsion',
    internal: false,
    blurb:
      'Attitude control in vacuum. Early prototypes used cold gas — nitrogen simply blown out of ' +
      'a nozzle — but that is weak and needs its own tank. These burn gaseous methane and oxygen ' +
      'tapped from the main tanks instead, which is roughly five times more efficient and reuses ' +
      'propellant the vehicle already carries.',
    specs: () => [
      ['Propellant', 'Gaseous CH₄ / LOX (methalox)'],
      ['Specific impulse', '≈300 s, against ≈60 s for cold gas'],
      ['Replaced', 'Cold-gas nitrogen thrusters'],
      ['Used for', 'Coast attitude, roll control, flip entry'],
    ],
  },
  {
    id: 'ship-pressurisation',
    stage: 'ship',
    label: 'Autogenous pressurisation',
    group: 'Propellant',
    internal: true,
    blurb:
      'As propellant drains, something has to fill the space or the tank collapses. Most rockets ' +
      'carry high-pressure helium to do it. Starship instead taps hot gas from the engines — ' +
      'gasified methane into the methane tank, gasified oxygen into the LOX tank. No helium, no ' +
      'COPVs full of it, and nothing that can run out independently of the propellant.',
    specs: () => [
      ['Method', 'Autogenous — self-pressurising'],
      ['CH₄ tank', 'Pressurised with gaseous methane'],
      ['LOX tank', 'Pressurised with gaseous oxygen'],
      ['Source', 'Tapped hot from the engine powerhead'],
      ['Eliminates', 'Helium and its storage bottles'],
    ],
  },

  // ------------------------------------------------------------- BOOSTER ---
  {
    id: 'hot-stage',
    stage: 'booster',
    label: 'Hot-stage section',
    group: 'Structure',
    internal: false,
    blurb:
      'A vented interstage that lets the ship light its engines while still attached. Hot ' +
      'staging keeps thrust on the stack through separation and buys performance, but the ' +
      'exhaust has to go somewhere — hence the open lattice.',
    specs: (v) => [
      ['Type', v.booster.hotStage === 'integrated' ? 'Integrated vented lattice' : 'Bolt-on ring'],
      ['Purpose', 'Vent ship exhaust during hot staging'],
      ['Jettison', v.booster.hotStage === 'integrated' ? 'Not jettisoned — part of the structure' : 'Jettisoned after separation (Block 2)'],
      ['During staging', 'Only the 3 centre booster engines stay lit'],
    ],
  },
  {
    id: 'grid-fins',
    stage: 'booster',
    label: 'Grid fins',
    group: 'Aerodynamics',
    internal: false,
    blurb:
      'Lattice control surfaces near the top of the booster. They stay fixed — unlike Falcon 9 ' +
      'they do not fold — and steer the booster back to the tower. Their high forward position ' +
      'gives a long moment arm about the centre of mass.',
    specs: (v) => [
      ['Count', `${v.booster.gridFins}`],
      ['Layout', v.booster.gridFins === 3 ? 'Three fins in a "T" arrangement' : 'Four fins, 90° apart'],
      ['Span', `≈${v.booster.gridFinSpan} m`],
      ['Stowing', 'None — permanently deployed'],
      ['Material', 'Stainless steel lattice'],
    ],
  },
  {
    id: 'catch-fittings',
    stage: 'booster',
    label: 'Catch fittings',
    group: 'Recovery',
    internal: false,
    blurb:
      'Two hardpoints just below the grid fins that the launch tower\'s arms close around. The ' +
      'booster has no landing legs at all — the entire vehicle mass hangs from these two pins, ' +
      'which is why they sit on a reinforced ring frame.',
    specs: () => [
      ['Count', '2'],
      ['Position', 'Forward barrel, below the grid fins'],
      ['Caught by', 'Tower "chopstick" arms'],
      ['Landing legs', 'None — mass saving'],
    ],
  },
  {
    id: 'booster-lox-tank',
    stage: 'booster',
    label: 'Booster LOX tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'The forward and by far the largest single volume in the whole stack. Liquid oxygen is ' +
      'roughly 78% of the booster\'s propellant mass, and it has to travel the full length of ' +
      'the vehicle to reach the engines.',
    specs: (v) => [
      ['Propellant', 'Liquid oxygen (LOX), sub-cooled'],
      ['Approx. load', `≈${Math.round(v.booster.propellant * 0.78)} t`],
      ['Position', 'Forward tank'],
      ['Feed', 'Central downcomer through the methane tank'],
    ],
  },
  {
    id: 'booster-ch4-tank',
    stage: 'booster',
    label: 'Booster methane tank',
    group: 'Propellant',
    internal: true,
    blurb:
      'The aft tank, sitting right on top of the thrust structure so the methane path to 33 ' +
      'engines is as short as possible. The LOX downcomer runs straight through the middle of ' +
      'it inside a sealed tunnel.',
    specs: (v) => [
      ['Propellant', 'Liquid methane (CH₄), sub-cooled'],
      ['Approx. load', `≈${Math.round(v.booster.propellant * 0.22)} t`],
      ['Position', 'Aft tank, above the thrust puck'],
      ['Penetrated by', 'The LOX downcomer tunnel'],
    ],
  },
  {
    id: 'booster-downcomer',
    stage: 'booster',
    label: 'LOX downcomer',
    group: 'Propellant',
    internal: true,
    blurb:
      'A single large pipe carrying liquid oxygen the length of the methane tank to the engine ' +
      'manifold. At full flow the booster consumes propellant faster than any machine ever ' +
      'built — over 20 tonnes every second across all 33 engines.',
    specs: (v) => [
      ['Runs through', 'The entire methane tank'],
      ['Feeds', `All ${v.booster.engines} engines`],
      ['Peak flow', '≈20 t of propellant per second (stack total)'],
    ],
  },
  {
    id: 'booster-engines',
    stage: 'booster',
    label: `Raptor engine cluster`,
    group: 'Propulsion',
    internal: false,
    blurb:
      'Thirty-three Raptors in three rings: an inner triangle of 3, a middle ring of 10, and an ' +
      'outer ring of 20. The inner 13 gimbal; the outer 20 are fixed. Only the centre 3 stay lit ' +
      'through hot staging, and only those 3 relight for the boostback and landing burns.',
    specs: (v) => {
      const r = RAPTOR[raptorGen(v)];
      return [
        ['Count', `${v.booster.engines}`],
        ['Type', r.name],
        ['Arrangement', '3 centre + 10 middle + 20 outer'],
        ['Gimballing', `13 (centre + middle rings), ${r.tvc.toLowerCase()} TVC`],
        ['Thrust each', `≈${r.thrust} tf at sea level`],
        ['Chamber pressure', `≈${r.chamber} bar`],
        ['Engine mass', `≈${r.mass.toLocaleString('en-US')} kg`],
        ['Total thrust', `${v.booster.thrustApprox ? '≈' : ''}${v.booster.thrust} MN`],
      ];
    },
    diagram: 'ffsc',
  },
  {
    id: 'aft-skirt',
    stage: 'booster',
    label: 'Aft skirt & thrust puck',
    group: 'Structure',
    internal: false,
    blurb:
      'The base of the booster. A conical thrust puck spreads the load of 33 engines into the ' +
      'tank wall, while the surrounding skirt carries the hold-down loads, the engine shielding ' +
      'and the plumbing manifolds.',
    specs: (v) => [
      ['Carries', `Thrust of ${v.booster.engines} engines into the tank dome`],
      ['Hold-downs', 'Clamps to the orbital launch mount until full thrust'],
      ['Contains', 'Manifolds, COPVs, engine shielding'],
    ],
  },
  {
    id: 'booster-body',
    stage: 'booster',
    label: 'Booster barrel',
    group: 'Structure',
    internal: false,
    blurb:
      'The tank wall is the airframe. Rings of stainless steel roughly 1.8 m tall are rolled, ' +
      'welded into barrels and stacked — the visible horizontal seams are those welds. Steel ' +
      'was chosen over carbon fibre because it keeps its strength when cryogenic and when hot.',
    specs: (v) => [
      ['Height', `${v.booster.height} m`],
      ['Diameter', `${v.diameter} m`],
      ['Wall', '30X-series stainless, ≈3–4 mm'],
      ['Ring height', '≈1.8 m per welded ring'],
    ],
  },
  {
    id: 'ship-body',
    stage: 'ship',
    label: 'Ship barrel',
    group: 'Structure',
    internal: false,
    blurb:
      'The ship uses the same 9 m stainless rings as the booster, with the tanks again doing ' +
      'double duty as the airframe. The leeward half is left as bare steel — it survives ' +
      're-entry without tiles because it never faces the plasma.',
    specs: (v) => [
      ['Height', `${v.ship.height} m`],
      ['Diameter', `${v.diameter} m`],
      ['Dry mass', `${v.ship.dryMassApprox ? '≈' : ''}${v.ship.dryMass} t`],
      ['Sections', 'Engine bay · LOX tank · CH₄ tank · payload bay'],
    ],
  },
];

PARTS.push(
  {
    id: 'booster-bulkhead',
    stage: 'booster',
    label: 'Common bulkhead',
    group: 'Propellant',
    internal: true,
    blurb:
      'The shared dome between the booster\'s LOX and methane tanks. Same trick as on the ship ' +
      'and the same problem: one wall, cryogenic oxygen on one side, cryogenic methane on the ' +
      'other, carrying pressure in both directions.',
    specs: () => [
      ['Separates', 'LOX (above) from CH₄ (below)'],
      ['Penetrated by', 'The LOX downcomer tunnel'],
      ['Shape', 'Elliptical dome'],
    ],
  },
  {
    id: 'booster-rcs',
    stage: 'booster',
    label: 'Hot-gas thrusters',
    group: 'Propulsion',
    internal: false,
    blurb:
      'Mounted near the top of the booster, where a long moment arm makes them effective. They ' +
      'flip the booster around after separation for the boostback burn and hold attitude through ' +
      'the coast — the job cold-gas nitrogen thrusters were too weak to do well on a vehicle ' +
      'this large.',
    specs: () => [
      ['Propellant', 'Gaseous CH₄ / LOX'],
      ['Position', 'Forward barrel, below the grid fins'],
      ['Used for', 'Post-separation flip, boostback attitude'],
      ['Specific impulse', '≈300 s'],
    ],
  },
  {
    id: 'raceways',
    stage: 'booster',
    label: 'Raceways',
    group: 'Structure',
    internal: false,
    blurb:
      'The conduits running the length of the hull. Because the tank wall *is* the airframe, ' +
      'there is no space between an inner structure and an outer skin to hide wiring in — so ' +
      'power, data and pressurisation lines run outside in these covers, strapped down at ' +
      'intervals and faired over.',
    specs: () => [
      ['Carries', 'Power, data, pressurant lines'],
      ['Why external', 'The tank wall is the airframe — no interstitial space'],
      ['Present on', 'Both stages'],
    ],
  }
);

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));

/** Camera framing presets. Values are resolved against the built model. */
export const VIEWS = [
  { id: 'stack', label: 'Full stack', key: '1' },
  { id: 'ship', label: 'Ship', key: '2' },
  { id: 'booster', label: 'Booster', key: '3' },
  { id: 'engines', label: 'Engine bay', key: '4' },
  { id: 'nose', label: 'Nose', key: '5' },
];
