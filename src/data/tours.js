/**
 * Guided tours.
 *
 * A part list answers "what is this?" one component at a time. It never
 * answers "why is it like that?", because the answer always spans several
 * parts at once — hot staging is the interstage *and* the engine cluster *and*
 * the separation event. A tour is an ordered walk that drives the viewer's
 * camera and modes for you, so the argument arrives in the right order.
 *
 * Steps are pure data. Each one may:
 *   part   select and frame a component (the info panel follows along)
 *   view   use a camera preset instead — ids come from viewsFor()
 *   set    force modes: cutaway, explode (0–1), engines, frost, labels
 *   play   'separation', to run the staging animation on arrival
 *
 * Anything a step does not mention is left exactly as the reader had it.
 */

export const TOURS = [
  {
    id: 'hot-staging',
    vehicle: 'starship',
    short: 'Hot staging',
    title: 'Why the ship lights its engines first',
    blurb: 'Hot staging, the vented lattice it needs, and what happens to the 33 engines below.',
    steps: [
      {
        title: 'The moment two vehicles become one problem',
        body:
          'At separation the stack is doing several thousand km/h and is still under thrust. Cut '
          + 'the engines, let the stages drift apart, then light the upper stage, and for those few '
          + 'seconds nothing is pushing — the vehicle coasts, gravity keeps pulling, and the '
          + 'performance is simply gone. Hot staging refuses to accept that pause.',
        view: 'stack',
        set: { cutaway: false, explode: 0, engines: false, labels: false },
      },
      {
        title: 'Light the upper stage while it is still attached',
        body:
          'The ship lights its engines before it has left the booster. Thrust never drops to zero, '
          + 'so the stack keeps accelerating straight through the handover. The cost is that six '
          + 'Raptors now fire directly into the top of a full booster.',
        part: 'hot-stage',
      },
      {
        title: 'So the interstage is mostly holes',
        body:
          'That exhaust has to escape sideways, immediately. The hot-stage section is a vented '
          + 'lattice — structure only where load has to pass, open everywhere else. Block 1 and 2 '
          + 'bolted a separate ring on and threw it away after staging to save landing mass. Block '
          + '3 builds the vents into the structure and keeps it.',
        part: 'hot-stage',
        set: { cutaway: false, explode: 0.25 },
      },
      {
        title: 'Below, thirty of thirty-three shut down',
        body:
          'The booster cannot hold full thrust through staging — it would run straight into the '
          + 'ship. Thirty engines cut. Only the centre three stay lit, and they are the same three '
          + 'that will relight for the boostback burn and again to fly the booster onto the tower '
          + 'arms. Everything about the recovery depends on those three.',
        part: 'booster-engines',
        set: { explode: 0, engines: true },
      },
      {
        title: 'Watch it happen',
        body:
          'Three engines below, six above, and the ship flying itself off a booster that is still '
          + 'pushing. The whole exchange takes a couple of seconds.',
        view: 'stack',
        set: { explode: 0, engines: false },
        play: 'separation',
      },
    ],
  },

  {
    id: 'stainless',
    vehicle: 'starship',
    short: 'Stainless steel',
    title: 'Why it is made of stainless steel',
    blurb: 'The material choice that decided the shape, the heat shield and the welds you can see.',
    steps: [
      {
        title: 'The counterintuitive choice',
        body:
          'Every serious launch vehicle of the last thirty years reached for aluminium-lithium or '
          + 'carbon fibre, because rockets are won on mass. Starship is steel, which is heavier per '
          + 'unit of room-temperature strength — and that comparison turns out to be the wrong one.',
        view: 'stack',
        set: { cutaway: false, explode: 0, engines: false, frost: true },
      },
      {
        title: 'Steel gets stronger when it gets cold',
        body:
          'Fill these tanks with liquid oxygen at −183 °C and the steel gains roughly half again '
          + 'its strength. The tank is coldest exactly when it is fullest and most heavily loaded, '
          + 'so the material is at its best precisely when the vehicle needs it to be.',
        part: 'booster-body',
      },
      {
        title: 'And it survives being hot',
        body:
          'At the other end, steel holds useful strength past 800 °C where aluminium is long gone '
          + 'and carbon composite has delaminated. That raises the temperature the structure itself '
          + 'can take, which means the thermal protection on top of it can be thinner — and it '
          + 'means a lost tile is a bad day rather than the end of the vehicle.',
        part: 'heat-shield',
      },
      {
        title: 'Which is why half the ship is bare',
        body:
          'Only the windward face is tiled. The leeward half flies through re-entry as exposed '
          + 'steel, because it never meets the plasma and steel can take what does reach it. On an '
          + 'aluminium vehicle every square metre would need covering.',
        part: 'ship-body',
      },
      {
        title: 'You can read the tanks off the outside',
        body:
          'Turn on cryo frost. Rime forms wherever cryogenic propellant is touching the wall, so '
          + 'the frost line on a real vehicle is a live gauge of what is inside it — one more thing '
          + 'the bare, unpainted, uninsulated steel hull gives you for free.',
        view: 'stack',
        set: { frost: true, cutaway: false },
      },
      {
        title: 'And you can build it in a field',
        body:
          'The visible horizontal seams are welds. Rings about 1.8 m tall are rolled from sheet, '
          + 'welded into barrels and stacked. Steel is roughly fifty times cheaper than aerospace '
          + 'carbon fibre and needs no autoclave, no clean room and no cure cycle — which is what '
          + 'makes it plausible to build these at the rate the plan requires.',
        part: 'booster-body',
        set: { explode: 0 },
      },
    ],
  },

  {
    id: 'raptor',
    vehicle: 'starship',
    short: 'Inside a Raptor',
    title: 'Inside a Raptor',
    blurb: 'Full-flow staged combustion, and the plumbing decisions that fall out of it.',
    steps: [
      {
        title: 'Thirty-three of them, in three rings',
        body:
          'An inner triangle of three, a ring of ten, a ring of twenty. The inner thirteen gimbal '
          + 'for steering; the outer twenty are bolted straight down. At full throttle this cluster '
          + 'swallows more than 20 tonnes of propellant every second.',
        view: 'engines',
        set: { cutaway: false, explode: 0, engines: true },
      },
      {
        title: 'Nothing is thrown away',
        body:
          'Raptor is the first full-flow staged combustion engine to fly. Two preburners — one '
          + 'oxygen-rich, one fuel-rich — gasify all of both propellants before they reach the main '
          + 'chamber. Every other cycle either dumps turbine exhaust overboard or runs one turbine '
          + 'far hotter than it wants to. The diagram in the panel is the whole argument.',
        part: 'booster-engines',
        set: { engines: false },
      },
      {
        title: 'Cool turbines buy chamber pressure',
        body:
          'Because both turbines are driven by gas that is going into the chamber anyway, neither '
          + 'has to run at a temperature that destroys it. That headroom is what allows ≈330 bar in '
          + 'the chamber on Raptor 3 — roughly triple a Merlin, and the highest of any flown engine.',
        part: 'booster-engines',
      },
      {
        title: 'The same engine with a bigger bell',
        body:
          'In vacuum there is no atmosphere pushing back, so a much larger expansion ratio extracts '
          + 'more thrust from the same flow. Those nozzles would collapse in the lower atmosphere, '
          + 'which is why the ship also carries three compact sea-level Raptors — and why the skirt '
          + 'is as wide as it is.',
        part: 'ship-engines-vac',
      },
      {
        title: 'No helium anywhere on the vehicle',
        body:
          'As propellant drains, something must fill the space or the tank crushes itself. Most '
          + 'rockets carry high-pressure helium to do it. Raptor taps its own hot gas instead — '
          + 'gasified methane into the methane tank, gasified oxygen into the oxygen tank. No '
          + 'helium, no bottles of it, and nothing that can run out independently of the propellant.',
        part: 'ship-pressurisation',
        set: { cutaway: true },
      },
      {
        title: 'And a pipe the length of the vehicle',
        body:
          'The oxygen tank sits above the methane tank, but the engines are at the bottom. So the '
          + 'oxygen has to travel the entire length of the methane tank to reach them, inside a '
          + 'sealed tunnel running straight through the middle of it.',
        part: 'booster-downcomer',
        set: { cutaway: true },
      },
    ],
  },

  {
    id: 'coming-back',
    vehicle: 'starship',
    short: 'Coming back',
    title: 'How both halves come back',
    blurb: 'Grid fins, catch pins, the belly-flop and the flip — the hardware that makes it reusable.',
    steps: [
      {
        title: 'Nothing is expendable',
        body:
          'Both halves of this vehicle are meant to fly again, and neither of them lands on legs. '
          + 'That single decision shapes most of the hardware you can see from the outside.',
        view: 'stack',
        set: { cutaway: false, explode: 0, engines: false },
      },
      {
        title: 'Steering with a lattice',
        body:
          'Grid fins work in the thin, hypersonic air where a normal fin stalls, and they sit high '
          + 'on the booster for a long moment arm about the centre of mass. Unlike Falcon 9\'s they '
          + 'never fold — the mechanism to stow them costs more mass than the drag of leaving them '
          + 'out.',
        part: 'grid-fins',
      },
      {
        title: 'Two pins, no legs',
        body:
          'The booster is caught. The tower\'s arms close under these two hardpoints and the entire '
          + 'vehicle hangs from them. Landing legs strong enough for a 200-tonne booster would be '
          + 'several tonnes of structure carried all the way to staging and back — so the legs live '
          + 'on the ground instead, and get reused too.',
        part: 'catch-fittings',
      },
      {
        title: 'The ship falls sideways on purpose',
        body:
          'The ship comes back from orbital velocity, so it has vastly more energy to shed. It '
          + 'holds a belly-first attitude at roughly 60° — presenting the widest possible area to '
          + 'the air and bleeding speed aerodynamically instead of with propellant.',
        part: 'aft-flaps',
      },
      {
        title: 'Flaps that trim by area, not by lift',
        body:
          'In that attitude a conventional control surface is useless. These move to change how '
          + 'much of the vehicle is in the flow on each side — pull one in, push one out, and the '
          + 'vehicle rotates. The forward pair moved leeward on Block 2 specifically to get the '
          + 'hinge line out of the worst of the plasma.',
        part: 'forward-flaps',
      },
      {
        title: 'Then it stands up',
        body:
          'Seconds from the ground the three sea-level Raptors light and flip the ship upright. '
          + 'Their propellant does not come from the main tanks — it comes from small header tanks '
          + 'in the nose, kept separate so the landing supply cannot slosh or boil off during the '
          + 'coast, and placed forward because the belly-flop needs the mass up there.',
        part: 'header-lox',
        set: { cutaway: true },
      },
    ],
  },
];

export const TOUR_BY_ID = Object.fromEntries(TOURS.map((t) => [t.id, t]));

/** Tours that apply to the vehicle currently on screen. */
export const toursFor = (variant) => TOURS.filter((t) => t.vehicle === variant.vehicle);
