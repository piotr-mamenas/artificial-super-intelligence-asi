/**
 * PHASE SPACE - The Fundamental Circle with Duality
 * 
 * CORRECTED: Space is the INVERSE of time in Hilbert space.
 * Not two independent axes, but ONE circle S¹ with duality structure.
 * 
 *   φ ∈ [0, 2π): the single phase coordinate
 *   Time aspect: φ (forward direction)
 *   Space aspect: -φ (reflection = inverse)
 * 
 * Operators:
 *   T: φ → φ + π  (time inversion, half rotation)
 *   S: φ → -φ     (space inversion, reflection = T⁻¹ in duality)
 *   I: φ → -φ - π (full inversion = T ∘ S)
 * 
 * From nothingness, ONE inversion births the circle.
 * The DUALITY of time/space is recognized, not created.
 */

// ============================================
// PHASE COORDINATES (Single circle with duality)
// ============================================

/**
 * A point on the phase circle S¹
 * φ_t is the PRIMARY coordinate (time-phase)
 * φ_s is DERIVED: φ_s = -φ_t (space is inverse of time)
 */
export interface PhasePoint {
  φ_t: number;  // Primary phase ∈ [0, 2π) - the time aspect
  φ_s: number;  // Derived phase = -φ_t - the space aspect (CONSTRAINED)
}

/**
 * Spread on the circle
 * σ_s is constrained to equal σ_t (uncertainty principle)
 */
export interface PhaseSpread {
  σ_t: number;  // Spread in time-phase
  σ_s: number;  // Spread in space-phase (= σ_t by duality)
}

export interface WaveBlob {
  center: PhasePoint;
  spread: PhaseSpread;
  amplitude: number;
}

export interface WaveState {
  blobs: WaveBlob[];
  totalAmplitude: number;
}

// ============================================
// DUALITY CONSTRAINT
// ============================================

/**
 * Create a phase point from a single value
 * Space is automatically the inverse of time
 */
export function createPhasePoint(φ: number): PhasePoint {
  const normalized = normalizePhase(φ);
  return {
    φ_t: normalized,
    φ_s: normalizePhase(-normalized),  // Space = inverse of time
  };
}

/**
 * Check if a point satisfies the duality constraint
 */
export function satisfiesDuality(p: PhasePoint, tolerance: number = 0.01): boolean {
  const expected_s = normalizePhase(-p.φ_t);
  const diff = Math.abs(normalizePhase(p.φ_s - expected_s));
  return diff < tolerance || diff > (2 * Math.PI - tolerance);
}

/**
 * Enforce duality constraint on a point
 */
export function enforceDuality(p: PhasePoint): PhasePoint {
  return createPhasePoint(p.φ_t);
}

// ============================================
// PHASE ARITHMETIC (on the circle S¹)
// ============================================

const TWO_PI = 2 * Math.PI;

export function normalizePhase(φ: number): number {
  // Wrap to [0, 2π)
  return ((φ % TWO_PI) + TWO_PI) % TWO_PI;
}

export function phaseAdd(p: PhasePoint, delta: number): PhasePoint {
  // Add to primary phase, derive space automatically
  return createPhasePoint(p.φ_t + delta);
}

export function phaseDiff(a: PhasePoint, b: PhasePoint): number {
  // Shortest angular difference on the circle
  let d = a.φ_t - b.φ_t;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

export function phaseDistance(a: PhasePoint, b: PhasePoint): number {
  // Distance on the circle (not torus)
  return Math.abs(phaseDiff(a, b));
}

// ============================================
// INVERSION OPERATORS (on the circle)
// ============================================

/**
 * Time inversion T: φ → φ + π
 * Half rotation on the circle
 * Flips: Up ↔ Down
 */
export function timeInversion(p: PhasePoint): PhasePoint {
  return createPhasePoint(p.φ_t + Math.PI);
}

/**
 * Space inversion S: φ → -φ
 * Reflection on the circle (INVERSE of rotation)
 * Since space = -time, S is the inverse operation
 * Flips: Charm ↔ Strange
 */
export function spaceInversion(p: PhasePoint): PhasePoint {
  return createPhasePoint(-p.φ_t);
}

/**
 * Full inversion I = T ∘ S: φ → -(φ + π) = -φ - π
 * Rotation followed by reflection
 * This is the GLIDE REFLECTION on S¹
 */
export function fullInversion(p: PhasePoint): PhasePoint {
  return createPhasePoint(-p.φ_t - Math.PI);
}

/**
 * Verify: T² = Id, S² = Id, but (T∘S)² ≠ Id in general
 * (T∘S)²(φ) = (T∘S)(-φ - π) = -(-φ - π) - π = φ + π - π = φ ✓
 * So actually (T∘S)² = Id too! But T∘S ≠ Id.
 */
export function verifyInversionAxioms(φ: number): boolean {
  const p = createPhasePoint(φ);
  
  // T² = Id
  const T2 = timeInversion(timeInversion(p));
  const T2_ok = phaseDistance(p, T2) < 0.001;
  
  // S² = Id  
  const S2 = spaceInversion(spaceInversion(p));
  const S2_ok = phaseDistance(p, S2) < 0.001;
  
  // (T∘S)² = Id
  const TS = fullInversion(p);
  const TS2 = fullInversion(TS);
  const TS2_ok = phaseDistance(p, TS2) < 0.001;
  
  return T2_ok && S2_ok && TS2_ok;
}

/**
 * Check if point is at a fixed point of the full inversion
 * I(φ) = φ means -φ - π = φ, so 2φ = -π, φ = -π/2 or 3π/2
 */
export function isFixedPoint(p: PhasePoint, tolerance: number = 0.1): boolean {
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
 * Since we're on a circle now, only φ_t matters (φ_s is derived)
 */
export function evaluateWaveAt(state: WaveState, point: PhasePoint): number {
  let amplitude = 0;
  
  for (const blob of state.blobs) {
    const diff = phaseDiff(point, blob.center);
    // Single dimension on the circle
    const exponent = -(diff * diff) / (2 * blob.spread.σ_t * blob.spread.σ_t);
    amplitude += blob.amplitude * Math.exp(exponent);
  }
  
  return amplitude;
}

/**
 * Compute wave coherence (how focused the wave is)
 * On the circle, just use σ_t (σ_s is constrained equal)
 */
export function computeCoherence(state: WaveState): number {
  if (state.blobs.length === 0) return 0;
  
  let coherence = 0;
  for (const blob of state.blobs) {
    coherence += blob.amplitude / (1 + blob.spread.σ_t);
  }
  
  return coherence / state.totalAmplitude;
}

// ============================================
// NOTHINGNESS → FIRST INVERSION
// ============================================

/**
 * Create initial state from nothingness
 * Before any inversion: maximum uncertainty on S¹
 */
export function createFromNothingness(): WaveState {
  // Start with a single blob at origin with maximum uncertainty
  // Space is constrained to be inverse of time (φ_s = -0 = 0 initially)
  return {
    blobs: [{
      center: createPhasePoint(0),  // Use proper creation with duality
      spread: { σ_t: Math.PI, σ_s: Math.PI },  // Maximum spread (σ_s = σ_t by duality)
      amplitude: 1,
    }],
    totalAmplitude: 1,
  };
}

/**
 * First inversion: the ONLY inversion needed
 * Collapses uncertainty on the circle
 * Space uncertainty collapses SIMULTANEOUSLY (duality)
 */
export function firstInversion(state: WaveState): WaveState {
  return {
    blobs: state.blobs.map(b => ({
      ...b,
      center: enforceDuality(b.center),  // Ensure duality maintained
      spread: {
        σ_t: b.spread.σ_t / 2,  // Time becomes more defined
        σ_s: b.spread.σ_t / 2,  // Space MUST follow (duality constraint)
      },
    })),
    totalAmplitude: state.totalAmplitude,
  };
}

/**
 * Second inversion: RECOGNITION of duality
 * Not creating a new axis, but recognizing space = inverse of time
 * This is a conceptual shift, not a physical operation
 */
export function secondInversion(state: WaveState): WaveState {
  // The "second inversion" is recognizing duality, not a separate collapse
  // Just enforce the duality constraint explicitly
  return {
    blobs: state.blobs.map(b => ({
      ...b,
      center: enforceDuality(b.center),
      spread: {
        σ_t: b.spread.σ_t,
        σ_s: b.spread.σ_t,  // Constrained equal by duality
      },
    })),
    totalAmplitude: state.totalAmplitude,
  };
}
