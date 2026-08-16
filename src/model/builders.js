import { buildSuperHeavy } from './super-heavy.js';
import { buildStarshipUpper } from './starship-upper.js';

/**
 * Geometry builders, keyed by the `builder` field on a stage.
 *
 * This is the seam between data and geometry: adding Falcon 9 means adding its
 * stage entries to data/vehicle.js and registering their builders here, and
 * nothing in stack.js, main.js or ui.js has to know about it.
 *
 * Every builder takes `(stage, variant)` and returns a THREE.Group whose
 * userData carries the contract the assembler relies on:
 *
 *   height       total height of the stage, metres
 *   top          y of the interface the next stage sits on (defaults to height)
 *   frost        optional group of cryo-frost decals, toggled together
 *   engineGroup  optional group used by the "engine bay" camera preset
 *   plumes       optional [{ x, y, z, radius, length, tint, hold }] exhaust
 *                emitters, in stage-local coordinates. `hold` marks the engines
 *                that stay lit through staging.
 */
export const BUILDERS = {
  'super-heavy': buildSuperHeavy,
  'starship-upper': buildStarshipUpper,
};

export function buildStage(stage, variant) {
  const build = BUILDERS[stage.builder];
  if (!build) throw new Error(`No geometry builder registered for "${stage.builder}"`);

  const group = build(stage, variant);
  group.userData.stageId = stage.id;
  group.userData.stage = stage;
  group.userData.height ??= stage.height;
  group.userData.top ??= group.userData.height;
  group.userData.plumes ??= [];
  return group;
}
