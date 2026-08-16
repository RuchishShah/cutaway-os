# Vendored three.js

three.js **r171**, taken unmodified from `https://cdn.jsdelivr.net/npm/three@0.171.0`:

| File | Origin |
|---|---|
| `three.module.js`, `three.core.js` | `build/` |
| `addons/controls/OrbitControls.js` | `examples/jsm/controls/` |
| `addons/renderers/CSS2DRenderer.js` | `examples/jsm/renderers/` |
| `addons/objects/Sky.js` | `examples/jsm/objects/` |
| `addons/postprocessing/*.js` | `examples/jsm/postprocessing/` |
| `addons/shaders/*.js` | `examples/jsm/shaders/` |
| `addons/math/SimplexNoise.js` | `examples/jsm/math/` |

Vendored rather than loaded from a CDN so the app is self-contained and works
offline. Licensed under the MIT License — see `LICENSE`.
