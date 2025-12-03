/**
 * PHASE SPACE - The Fundamental Substrate
 * 
 * From nothingness:
 * 1. First inversion → time-phase axis (S¹_t)
 * 2. Second inversion → space-phase axis (S¹_s)
 * 3. Together → phase torus (S¹_t × S¹_s)
 * 
 * All structure emerges from this 2D phase plane.
 */

// ============================================
// PHASE COORDINATES
// ============================================

export interface PhasePoint {
  φ_t: number;  // Time-phase ∈ [0, 2π)
  φ_s: number;  // Space-phase ∈ [0, 2π)
}

export interface PhaseSpread {
  σ_t: number;  // Spread in time-phase
  σ_s: number;  // Spread in space-phase
}

export interface WaveBlob {
  center: PhasePoint;
  spread: PhaseSpread;
  amplitude: number;  // Wave amplitude at this blob
}

export interface WaveState {
  blobs: WaveBlob[];  // Superposition of phase blobs
  totalAmplitude: number;
}

// ============================================
// PHASE ARITHMETIC (on the torus)
// ============================================

const TWO_PI = 2 * Math.PI;

export function normalizePhase(φ: number): number {
  // Wrap to [0, 2π)
  return ((φ % TWO_PI) + TWO_PI) % TWO_PI;
}

export function phaseAdd(p: PhasePoint, delta: PhasePoint): PhasePoint {
  return {
    φ_t: normalizePhase(p.φ_t + delta.φ_t),
    φ_s: normalizePhase(p.φ_s + delta.φ_s),
  };
}

export function phaseDiff(a: PhasePoint, b: PhasePoint): PhasePoint {
  // Shortest angular difference
  let d_t = a.φ_t - b.φ_t;
  let d_s = a.φ_s - b.φ_s;
  
  // Wrap to [-π, π)
  if (d_t > Math.PI) d_t -= TWO_PI;
  if (d_t < -Math.PI) d_t += TWO_PI;
  if (d_s > Math.PI) d_s -= TWO_PI;
  if (d_s < -Math.PI) d_s += TWO_PI;
  
  return { φ_t: d_t, φ_s: d_s };
}

export function phaseDistance(a: PhasePoint, b: PhasePoint): number {
  const diff = phaseDiff(a, b);
  return Math.sqrt(diff.φ_t * diff.φ_t + diff.φ_s * diff.φ_s);
}

// ============================================
// INVERSION OPERATORS
// ============================================

/**
 * Time inversion T: (φ_t, φ_s) → (φ_t + π, φ_s)
 * Flips temporal orientation: Up ↔ Down
 */
export function timeInversion(p: PhasePoint): PhasePoint {
  return {
    φ_t: normalizePhase(p.φ_t + Math.PI),
    φ_s: p.φ_s,
  };
}

/**
 * Space inversion S: (φ_t, φ_s) → (φ_t, φ_s + π)
 * Flips spatial orientation: Charm ↔ Strange
 */
export function spaceInversion(p: PhasePoint): PhasePoint {
  return {
    φ_t: p.φ_t,
    φ_s: normalizePhase(p.φ_s + Math.PI),
  };
}

/**
 * Full inversion I = T ∘ S: (φ_t, φ_s) → (φ_t + π, φ_s + π)
 * Complete phase flip
 */
export function fullInversion(p: PhasePoint): PhasePoint {
  return {
    φ_t: normalizePhase(p.φ_t + Math.PI),
    φ_s: normalizePhase(p.φ_s + Math.PI),
  };
}

/**
 * Check if point is self-dual under full inversion
 * (invariant points are at the center of the torus)
 */
export function isSelfDual(p: PhasePoint, tolerance: number = 0.1): boolean {
  const inverted = fullInversion(p);
  return phaseDistance(p, inverted) < tolerance;
}

// ============================================
// WAVE STATE OPERATIONS
// ============================================

export function createEmptyWaveState(): WaveState {
  return { blobs: [], totalAmplitude: 0 };
}

export function addBlob(state: WaveState, blob: WaveBlob): WaveState {
  return {
    blobs: [...state.blobs, blob],
    totalAmplitude: state.totalAmplitude + blob.amplitude,
  };
}

/**
 * Dispersion: broaden all blobs (increase spread)
 */
export function disperseWave(state: WaveState, factor: number): WaveState {
  return {
    blobs: state.blobs.map(b => ({
      ...b,
      spread: {
        σ_t: b.spread.σ_t * factor,
        σ_s: b.spread.σ_s * factor,
      },
    })),
    totalAmplitude: state.totalAmplitude,
  };
}

/**
 * Focus: narrow all blobs (decrease spread)
 */
export function focusWave(state: WaveState, factor: number): WaveState {
  return disperseWave(state, 1 / factor);
}

/**
 * Evaluate wave amplitude at a point
 */
export function evaluateWaveAt(state: WaveState, point: PhasePoint): number {
  let amplitude = 0;
  
  for (const blob of state.blobs) {
    const diff = phaseDiff(point, blob.center);
    const exponent = -(
      (diff.φ_t * diff.φ_t) / (2 * blob.spread.σ_t * blob.spread.σ_t) +
      (diff.φ_s * diff.φ_s) / (2 * blob.spread.σ_s * blob.spread.σ_s)
    );
    amplitude += blob.amplitude * Math.exp(exponent);
  }
  
  return amplitude;
}

/**
 * Compute wave coherence (how focused the wave is)
 */
export function computeCoherence(state: WaveState): number {
  if (state.blobs.length === 0) return 0;
  
  // Average inverse spread (higher = more coherent)
  let coherence = 0;
  for (const blob of state.blobs) {
    const avgSpread = (blob.spread.σ_t + blob.spread.σ_s) / 2;
    coherence += blob.amplitude / (1 + avgSpread);
  }
  
  return coherence / state.totalAmplitude;
}

// ============================================
// NOTHINGNESS → FIRST → SECOND INVERSION
// ============================================

/**
 * Create initial state from nothingness
 * The first distinction creates time-phase
 * The second creates space-phase
 */
export function createFromNothingness(): WaveState {
  // Start with a single blob at origin with maximum uncertainty
  return {
    blobs: [{
      center: { φ_t: 0, φ_s: 0 },
      spread: { σ_t: Math.PI, σ_s: Math.PI },  // Maximum spread
      amplitude: 1,
    }],
    totalAmplitude: 1,
  };
}

/**
 * First inversion: collapse time-phase axis
 * Reduces uncertainty in φ_t
 */
export function firstInversion(state: WaveState): WaveState {
  return {
    blobs: state.blobs.map(b => ({
      ...b,
      spread: {
        σ_t: b.spread.σ_t / 2,  // Time becomes more defined
        σ_s: b.spread.σ_s,      // Space still uncertain
      },
    })),
    totalAmplitude: state.totalAmplitude,
  };
}

/**
 * Second inversion: collapse space-phase axis
 * Reduces uncertainty in φ_s
 */
export function secondInversion(state: WaveState): WaveState {
  return {
    blobs: state.blobs.map(b => ({
      ...b,
      spread: {
        σ_t: b.spread.σ_t,      // Time already defined
        σ_s: b.spread.σ_s / 2,  // Space becomes more defined
      },
    })),
    totalAmplitude: state.totalAmplitude,
  };
}
