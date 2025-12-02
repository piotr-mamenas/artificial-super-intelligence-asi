/**
 * Core constants for the ontological simulation system.
 * These define fundamental parameters derived from the inversion-closure ontology.
 */

// Dimension of the base wave state Hilbert space
export const WAVE_DIMENSION = 16;

// KCBS pentagon has exactly 5 observables
export const KCBS_OBSERVABLE_COUNT = 5;

// Double inversion requires 720° for spinor identity
export const SPINOR_IDENTITY_ROTATION = 720;

// Thresholds for inversion guard
export const INVERSION_ERROR_THRESHOLD = 0.3;
export const INVERSION_UNCERTAINTY_THRESHOLD = 0.5;

// Black hole detection
export const BLACK_HOLE_MIN_FRAMES = 5;
export const BLACK_HOLE_PERSISTENCE_THRESHOLD = 0.8;

// Hadron stability
export const HADRON_MIN_STABILITY_SCORE = 0.7;
export const HADRON_CHANNEL_COUNT = 3; // R, U, C channels

// Time parameters
export const DEFAULT_TICK_INTERVAL_MS = 100;
export const MAX_NESTED_REALITY_DEPTH = 7;

// Wave focus/dispersion ranges
export const FOCUS_MIN = 0;
export const FOCUS_MAX = 1;
export const DISPERSION_MIN = 0;
export const DISPERSION_MAX = 1;

// Learning parameters
export const AUTOENCODER_LATENT_DIM = 8;
export const LEARNING_RATE = 0.01;

// Visualization
export const PENTAGRAM_RADIUS = 2;
export const WAVE_FIELD_RESOLUTION = 64;
