# CutawayOS

**[ruchishshah.github.io/cutaway-os](https://ruchishshah.github.io/cutaway-os/)**

*Take a rocket apart and see how it works.*

An interactive 3D cutaway of the vehicles that fly — starting with SpaceX. Today that is
**Starship** and **Super Heavy**; Falcon and Dragon are the next fleets. Everything is built
from publicly available information.

Orbit the stack, click any component to read what it does, slice the vehicle open to see the
propellant tanks, pull it apart in an exploded view, and compare Block 1, Block 2 and Block 3
side by side.

No build step, no bundler, no external services — open `index.html` and it runs.

## Running it

```bash
git clone https://github.com/RuchishShah/cutaway-os.git
cd cutaway-os

# any static file server works; ES modules need http(s), not file://
python3 -m http.server 8000
# then open http://localhost:8000/
```

There is nothing to install and nothing to build. Deployment is a GitHub Actions workflow that
uploads the repository as-is; set **Settings → Pages → Source** to *GitHub Actions* once and every
push to `main` publishes.

## What you can do

| | |
|---|---|
| **Guided tours** (`←` `→`) | Four narrated walks — why it hot-stages, why it is stainless steel, inside a Raptor, how both halves come back. The camera, the cutaway and the exploded view move with the text, and a shared link lands on the exact step. |
| **Orbit / zoom / pan** | Drag, scroll or pinch, right-drag. You can go under the vehicle to look up into the engine bay. |
| **Click a part** | Any surface in the 3D view, or any entry in the left-hand component list. The right panel shows what it is and its published figures. |
| **Cutaway** (`X`) | Slices the stack down its centreline: main LOX and methane tanks, common bulkheads, downcomers and the nose header tanks. |
| **Exploded** (`E`) | Separates every assembly along its mounting axis. |
| **Hot-stage separation** (`Space`) | Plays the staging event — the ship lights its engines while still attached and flies off the booster. |
| **Version switch** | Block 1 / 2 / 3. Heights, grid fin count and layout, hot-stage design, engine generation and all specs change with it. |
| **Camera presets** (`1`–`5`) | Full stack, then one per stage, then engine bay and nose — generated from the vehicle's stage list, not a fixed set. |
| **Cryo frost** (`G`) | Rime over the loaded tanks. The frost line is also a readout of where each tank sits. |
| **Light** | Golden hour / midday / dawn / blue hour. The sun moves and the whole scene relights. |
| **Quality** | Ultra / High / Balanced / Fast — mesh density, texture size, shadows, AO, bloom. Auto-picked from your device. |
| **Labels** (`L`), **Engines lit** (`F`), **Scale ref** | 1.8 m human figure and a measurement grid. |
| **Keyboard** | Tab to the component list, then `↑` `↓` `Home` `End` to walk every part with the camera following. |
| **Share view** | Copies a link that restores the part, the modes and the camera angle. |

## Sharing, embedding and being findable

Every view has an address. The part, the modes, the light and the camera are all encoded in the
query string and kept current as you explore, so a screenshot someone posts can carry a link back
to the exact thing they were looking at:

```
?v=v3&part=grid-fins&cut=1&light=golden&cam=0.86,0.22,180,62
```

Only non-default values are written, so ordinary links stay short and readable.

**Embed it.** Add `embed=1` to strip the interface down to the 3D view plus a caption strip that
names what is on screen and links back to the full app — ready for an `<iframe>` in a blog post or
lesson. `chrome=0` removes even that, which is how the link-preview cards in `share/` are rendered
from the app itself.

```html
<iframe src="https://…/cutaway-os/?embed=1&part=hot-stage&cut=1"
        width="100%" height="520" style="border:0" loading="lazy"></iframe>
```

**Be findable.** A `<canvas>` is invisible to search engines — nothing inside the 3D view could
ever be found by someone searching for "starship hot stage ring". So `tools/build-pages.mjs`
generates a plain HTML reference page for every component from the same data, each carrying the
real text and figures and linking into the 3D view at that part. Run it whenever the data changes:

```bash
node tools/build-pages.mjs   # defaults to the published base URL
```

It writes `parts/`, `sitemap.xml` and `robots.txt`, and takes `--base <url>` if the site moves.
One caveat while it is served from `<user>.github.io/cutaway-os/`: crawlers only honour
`robots.txt` at an origin root, so the sitemap needs submitting to Search Console directly rather
than being discovered. A custom domain removes that wrinkle.

## What is modelled

**Starship (upper stage)** — nosecone, LOX and methane header tanks in the nose, payload bay with
the PEZ-style Starlink dispenser slot, main methane and LOX tanks, the common bulkhead between
them, the four downcomers, the autogenous pressurisation system, forward and aft flaps (windward
on Block 1, leeward from Block 2), the hexagonal tile heat shield on the windward face, hot-gas
methalox RCS thrusters, three sea-level Raptors and three Raptor Vacuums.

Both stages also carry the details that sell the scale: flap root chines, hydraulic gimbal
actuators, external raceways with banding straps, umbilical and vent panels, pressurant bottles in
the skirt, and cryogenic frost over the loaded tanks.

**Super Heavy** — aft skirt and thrust puck, the 33-engine cluster in its 3 / 10 / 20 rings,
methane and LOX tanks with their common bulkhead and the LOX downcomer running through the methane
tank, grid fins (four at 90° on Block 1/2, three in a "T" on Block 3), hot-gas thrusters, tower
catch fittings, raceways, and the hot-stage section — a bolt-on ring on Block 1/2, an integrated
vented lattice on Block 3.

**Raptor** is modelled as real full-flow staged combustion hardware: an oxygen-rich preburner
driving the LOX turbopump, a fuel-rich preburner driving the methane turbopump, hot-gas ducts into
the injector dome, main valves, and the electric TVC actuators that replaced the hydraulic pack
from Raptor 2. Selecting either engine cluster also draws the cycle as a flow diagram.

## Accuracy

Every number in the app comes from published material — SpaceX's own Starship pages, the
Wikipedia articles on Starship and Super Heavy, and NASASpaceflight / Everyday Astronaut
reporting. Figures SpaceX has never formally published are shown with a **≈**, and the in-app
**Sources** dialog lists everything.

The geometry is a faithful *schematic*, not an engineering drawing. Section heights, diameters,
engine counts and layouts are to scale; tank proportions follow the ~3.6:1 LOX-to-methane mass
ratio; small hardware (plumbing, vents, pressurant bottles) is representative rather than exact.
Starship is an actively changing vehicle and public figures shift between test flights.

This project is not affiliated with or endorsed by SpaceX.

## Getting the look right

Stainless steel is close to a mirror, so most of what you see on Starship is a *reflection*. Three
things do the heavy lifting:

**A real sky.** The environment is a physical scattering model (three's `Sky`, Preetham) plus a
ground dome, baked into a PMREM probe every time the light changes. The key light's colour,
intensity and direction come from the same sun position, so the direct light and the reflections
always agree. Swapping a studio-style probe for an outdoor one is the single biggest difference
between "3D render" and "photograph".

**Surface relief, not painted detail.** Each surface gets a matching albedo / roughness / normal
set, all drawn in one pass from the same source so they stay registered. Weld beads are actually
raised, with a shrink groove either side and a rougher heat-affected zone. Every heat-shield
hexagon is a domed plateau with a chamfered edge and a recessed gap. The steel carries anisotropic
highlights aligned to the rolling direction, which is what smears reflections on rolled stainless.

**Contact shading.** Ground-truth ambient occlusion (GTAO) with a ~1 m world-space radius seats
parts into each other — between the 33 engine bells, under the grid fins, around the flap hinges.

## Accessibility and performance

The 3D view cannot be driven meaningfully by keyboard, so the component list is the accessible
route to every part: it is a real listbox with arrow-key navigation, `aria-activedescendant`, and
the camera following the cursor. Dialogs trap focus and restore it on close, `prefers-reduced-
motion` shortens camera moves and slows auto-rotate, and there is a visible focus ring throughout.

The renderer watches its own frame time. If a device sustains poor performance past the
shader-compilation warm-up, the quality tier steps down once and says so — choosing a tier by hand
disables that, on the assumption you meant it.

## How it is built

Plain ES modules and [three.js](https://threejs.org) (r171, vendored under `vendor/three/` —
MIT licensed). There are no model files and no image files: the whole vehicle is generated
procedurally at runtime from lathes, cylinders and extrusions, and every texture — stainless mill
finish, weld rings, hex tiles, cryo frost, concrete — is drawn to a canvas on load in about a
second.

```
index.html                 markup, import map, boot guard
.github/workflows/         GitHub Pages deployment
styles/main.css            layout and theme
src/
  main.js                  wiring: picking, selection, modes, animation loop
  scene.js                 renderer, ground, post-effect chain, camera framing
  environment.js           physical sky, PMREM probe, sun/fill/bounce, time of day
  quality.js               render tiers and device detection
  ui.js                    part list, info panel, modals, mobile drawers
  tour.js                  guided-tour controller (drives the viewer, knows no data)
  data/vehicle.js          vehicles, variants, stages, engines, parts — the source of truth
  data/tours.js            tour scripts, as pure data
  model/
    builders.js            stage id → geometry builder; the seam for new vehicles
    materials.js           procedural texture sets, PBR materials, cutaway plane
    helpers.js             shared primitives (ogive, dome, Raptor, grid fin, flap, frost)
    super-heavy.js         Super Heavy
    starship-upper.js      Starship upper stage
    stack.js               assembly, part index, explode / separation / plumes
  permalink.js             URL state: read, serialise, sync
parts/                     generated reference pages (build-pages.mjs)
share/                     generated link-preview cards
tools/build-pages.mjs      static page + sitemap generator
vendor/three/              three.js runtime, OrbitControls, CSS2DRenderer, Sky,
                           EffectComposer + GTAO / bloom / output passes
```

## Contributing

Corrections are genuinely welcome — Starship changes between test flights and these figures go
stale. Every number lives in `src/data/vehicle.js` alongside the prose that explains it, so a fix
is usually a one-line edit plus a source. Run `node tools/build-pages.mjs` afterwards so the static
reference pages match.

Adding a component means adding an entry to `src/data/vehicle.js` and tagging the geometry with the
same id via `part('my-id')` in a model builder — the list, picking, info panel, labels and the
generated page all key off that id.

## Licence

MIT — see [LICENSE](LICENSE). three.js is vendored under `vendor/three/` and is also MIT.
Not affiliated with or endorsed by SpaceX.

## Browser support

Needs WebGL 2. Tested in current Chromium; works on mobile Safari and Chrome with a touch-adapted
layout. The quality tier is auto-selected from pointer type, screen size and core count, and can
be changed at any time from the toolbar.
