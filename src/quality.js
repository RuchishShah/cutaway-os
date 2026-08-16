/**
 * Render quality tiers. Everything expensive reads from `quality` at build
 * time, so changing tier rebuilds the model and the textures with new numbers.
 */

export const TIERS = {
  ultra: {
    label: 'Ultra',
    segments: 192,
    engineSegments: 40,
    texture: 1024,
    shadow: 4096,
    ao: true,
    aoSamples: 16,
    bloom: true,
    frost: true,
    maxPixelRatio: 2,
    msaa: 4,
  },
  high: {
    label: 'High',
    segments: 128,
    engineSegments: 32,
    texture: 1024,
    shadow: 2048,
    ao: true,
    aoSamples: 8,
    bloom: true,
    frost: true,
    maxPixelRatio: 1.75,
    msaa: 4,
  },
  balanced: {
    label: 'Balanced',
    segments: 80,
    engineSegments: 24,
    texture: 512,
    shadow: 1024,
    ao: false,
    aoSamples: 8,
    bloom: true,
    frost: true,
    maxPixelRatio: 1.4,
    msaa: 4,
  },
  fast: {
    label: 'Fast',
    segments: 48,
    engineSegments: 16,
    texture: 512,
    shadow: 1024,
    ao: false,
    aoSamples: 4,
    bloom: false,
    frost: false,
    maxPixelRatio: 1,
    msaa: 0,
  },
};

export const quality = { id: 'high', ...TIERS.high };

export function setQuality(id) {
  const tier = TIERS[id];
  if (!tier) return quality;
  Object.assign(quality, tier, { id });
  return quality;
}

/**
 * Pick a starting tier. Mobile GPUs and small screens get less; anything else
 * starts at High and the user can move up to Ultra.
 */
export function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse && small) return 'balanced';
  if (coarse || cores <= 4) return 'balanced';
  return 'high';
}
