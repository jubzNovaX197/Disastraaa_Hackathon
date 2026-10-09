/**
 * Fictional exercise clock, shared by the server and browser bundles.
 * Fixtures must not read the wall clock at module load: each runtime imports
 * them at a different instant, which changes the initial SSR/hydration text.
 * Live observations and replay events continue to use their receipt timestamps.
 */
export const DEMO_REFERENCE_TIME = '2026-10-09T07:30:00.000Z';
export const DEMO_REFERENCE_EPOCH = Date.parse(DEMO_REFERENCE_TIME);
