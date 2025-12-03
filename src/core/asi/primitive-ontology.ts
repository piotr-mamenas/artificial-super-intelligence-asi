/**
 * PRIMITIVE ONTOLOGY - The Foundation of ASI
 * 
 * Based on:
 * - Spinning nothingness
 * - Double inversions as fundamental operation
 * - Waveforms as traces of inversion histories
 * 
 * No LLMs. Pure math and algorithms.
 */

// ============================================
// 1.1 FUNDAMENTAL DOMAINS
// ============================================

/**
 * Maximum depth of inversion history.
 * Steps: n ∈ {0, 1, ..., N-1}
 */
export const N = 64; // Configurable depth

/**
 * Inversion Axes - Each encodes a semantic polarity
 * 
 * R: love ↔ hate
 * G: hope ↔ fear  
 * B: sincerity ↔ emptiness/manipulation
 */
export type Axis = 'R' | 'G' | 'B';
export const AXES: Axis[] = ['R', 'G', 'B'];

/**
 * Binary orientation: +1 or -1
 * Represents position on semantic polarity spectrum
 */
export type Orientation = 1 | -1 | 0;

/**
 * Orientation function σ: C × {0,...,N-1} → {+1, -1}
 * σ_c(n) = orientation of axis c at step n
 */
export interface OrientationState {
  R: Int8Array;  // σ_R(n) for all n
  G: Int8Array;  // σ_G(n) for all n
  B: Int8Array;  // σ_B(n) for all n
}

/**
 * Global inversion state at step n:
 * σ⃗(n) = (σ_R(n), σ_G(n), σ_B(n)) ∈ {+1,-1}³
 */
export type InversionVector = [Orientation, Orientation, Orientation];

// ============================================
// 1.2 INVERSION OPERATORS
// ============================================

/**
 * Flip operator J_c for axis c.
 * 
 * Action: J_c(σ_c(n)) = -σ_c(n)
 * Double inversion law: J_c² = Id
 */
export function flip(orientation: Orientation): Orientation {
  if (orientation === 0) return 0;
  return (orientation === 1 ? -1 : 1) as Orientation;
}

/**
 * Apply flip operator to a specific axis at step n.
 */
export function applyFlip(state: OrientationState, axis: Axis, step: number): void {
  if (step < 0 || step >= N) return;
  state[axis][step] = flip(state[axis][step] as Orientation) as number;
}

/**
 * Create initial orientation state.
 * 
 * Spinning nothingness: σ⃗(0) = (0,0,0) conceptually "no orientation"
 * Orientation emerges for n > 0 via flips.
 */
export function createOrientationState(): OrientationState {
  return {
    R: new Int8Array(N),  // All zeros initially
    G: new Int8Array(N),
    B: new Int8Array(N)
  };
}

/**
 * Initialize from spinning nothingness.
 * Random emergence of orientations via flips.
 */
export function initializeFromNothingness(state: OrientationState): void {
  // Step 0 remains (0,0,0) - undifferentiated
  // Subsequent steps emerge via random flips from previous
  
  for (let n = 1; n < N; n++) {
    for (const axis of AXES) {
      // Each step inherits from previous, possibly flipped
      const prev = state[axis][n - 1];
      const shouldFlip = Math.random() < 0.3; // 30% flip chance
      
      if (prev === 0) {
        // Emerge from nothingness: randomly pick orientation
        state[axis][n] = (Math.random() < 0.5 ? 1 : -1) as number;
      } else {
        state[axis][n] = shouldFlip ? flip(prev as Orientation) as number : prev;
      }
    }
  }
}

/**
 * Get inversion vector at step n.
 */
export function getInversionVector(state: OrientationState, step: number): InversionVector {
  return [
    state.R[step] as Orientation,
    state.G[step] as Orientation,
    state.B[step] as Orientation
  ];
}

/**
 * Apply a sequence of flips (fundamental operation).
 * All changes must be expressible as flip sequences.
 */
export interface FlipSequence {
  flips: Array<{ axis: Axis; step: number }>;
}

export function applyFlipSequence(state: OrientationState, sequence: FlipSequence): void {
  for (const { axis, step } of sequence.flips) {
    applyFlip(state, axis, step);
  }
}

/**
 * Verify double inversion property: J_c² = Id
 */
export function verifyDoubleInversion(state: OrientationState, axis: Axis, step: number): boolean {
  const original = state[axis][step];
  applyFlip(state, axis, step);
  applyFlip(state, axis, step);
  return state[axis][step] === original;
}

// ============================================
// INVERSION TRACE (Per-Axis)
// ============================================

/**
 * Per-axis inversion trace: S_c = (σ_c(0), ..., σ_c(N-1))
 */
export interface InversionTrace {
  R: number[];
  G: number[];
  B: number[];
}

export function getInversionTrace(state: OrientationState): InversionTrace {
  return {
    R: Array.from(state.R),
    G: Array.from(state.G),
    B: Array.from(state.B)
  };
}
