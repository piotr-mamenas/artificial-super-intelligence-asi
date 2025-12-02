/**
 * Nothingness and the emergence of first distinction.
 * 
 * From the ontology:
 * - Absolute nothingness cannot be fully actual (it cannot allow distinction)
 * - Referring to nothingness creates a self-referential configuration
 * - This minimal structure admits a transformation: inversion
 * - The first nontrivial act is an inversion operator
 */

import { Complex, complex, invert, doubleInvert, equals, fromPolar } from '../math/complex';

/**
 * Represents the primordial state before differentiation.
 * Not truly "nothing" but the potential for distinction.
 */
export interface PrimordialState {
  readonly isUndifferentiated: true;
  readonly potentialForDistinction: number; // 0 = maximally undifferentiated
}

/**
 * The first distinction: "pointing at nothing" vs "act of pointing"
 */
export interface FirstDistinction {
  readonly pointedAbsence: symbol;
  readonly actOfPointing: symbol;
}

/**
 * The minimal structure arising from self-reference of nothingness.
 */
export interface MinimalStructure {
  readonly reference: symbol;
  readonly referred: symbol;
  readonly isInverted: boolean;
}

// Symbols for the primordial distinction
const POINTED_ABSENCE = Symbol('pointed-absence');
const ACT_OF_POINTING = Symbol('act-of-pointing');

/**
 * Create the primordial undifferentiated state.
 */
export function createPrimordialState(): PrimordialState {
  return {
    isUndifferentiated: true,
    potentialForDistinction: 0
  };
}

/**
 * The moment nothingness is referred to, it becomes the first distinction.
 * This is the "spin of nothingness" - the minimal self-referential configuration.
 */
export function referToNothingness(): FirstDistinction {
  return {
    pointedAbsence: POINTED_ABSENCE,
    actOfPointing: ACT_OF_POINTING
  };
}

/**
 * From the first distinction, derive the minimal structure.
 */
export function deriveMinimalStructure(distinction: FirstDistinction): MinimalStructure {
  return {
    reference: distinction.actOfPointing,
    referred: distinction.pointedAbsence,
    isInverted: false
  };
}

/**
 * Apply inversion to the minimal structure.
 * This "flips" which side is primary in the relation.
 */
export function applyInversion(structure: MinimalStructure): MinimalStructure {
  return {
    reference: structure.referred,
    referred: structure.reference,
    isInverted: !structure.isInverted
  };
}

/**
 * Double inversion returns to identity - the fundamental closure.
 * This demonstrates (−)(−) = (+)
 */
export function applyDoubleInversion(structure: MinimalStructure): MinimalStructure {
  const once = applyInversion(structure);
  const twice = applyInversion(once);
  return twice; // Should have same reference/referred as original
}

/**
 * Verify the double inversion identity algebraically.
 * For any non-zero complex number z: 1/(1/z) = z
 */
export function verifyDoubleInversionIdentity(z: Complex): boolean {
  if (z.re === 0 && z.im === 0) return false; // Exclude zero
  const result = doubleInvert(z);
  return equals(z, result, 1e-10);
}

/**
 * The spinor representation of nothingness.
 * A spinor requires 720° rotation (double inversion) to return to identity.
 */
export interface SpinorState {
  amplitude: Complex;
  phase: number;      // 0 to 4π (720° = 4π radians)
  inversions: number; // Count of inversions applied
}

/**
 * Create a spinor from the primordial state.
 */
export function createSpinor(): SpinorState {
  return {
    amplitude: complex(1, 0),
    phase: 0,
    inversions: 0
  };
}

/**
 * Rotate spinor by given angle.
 * At 360°, spinor changes sign. At 720°, returns to original.
 */
export function rotateSpinor(spinor: SpinorState, angle: number): SpinorState {
  const newPhase = spinor.phase + angle;
  
  // Spinor transformation under rotation by θ:
  // |ψ⟩ → e^(iθ/2)|ψ⟩
  // At θ = 2π (360°), we get e^(iπ) = -1
  // At θ = 4π (720°), we get e^(2iπ) = 1
  const halfAngle = angle / 2;
  const rotationFactor = fromPolar(1, halfAngle);
  
  return {
    amplitude: {
      re: spinor.amplitude.re * rotationFactor.re - spinor.amplitude.im * rotationFactor.im,
      im: spinor.amplitude.re * rotationFactor.im + spinor.amplitude.im * rotationFactor.re
    },
    phase: newPhase % (4 * Math.PI), // Mod 720°
    inversions: spinor.inversions
  };
}

/**
 * Apply single inversion to spinor (equivalent to 360° rotation).
 */
export function invertSpinor(spinor: SpinorState): SpinorState {
  const rotated = rotateSpinor(spinor, 2 * Math.PI);
  return {
    ...rotated,
    inversions: spinor.inversions + 1
  };
}

/**
 * Check if spinor has returned to identity (after even number of inversions).
 */
export function isSpinorIdentity(spinor: SpinorState): boolean {
  return spinor.inversions % 2 === 0 && 
         Math.abs(spinor.phase % (4 * Math.PI)) < 1e-10;
}

/**
 * The emergence sequence: Nothing → Distinction → Inversion → Double Inversion → Identity
 */
export function emergenceSequence(): {
  primordial: PrimordialState;
  distinction: FirstDistinction;
  structure: MinimalStructure;
  inverted: MinimalStructure;
  closed: MinimalStructure;
} {
  const primordial = createPrimordialState();
  const distinction = referToNothingness();
  const structure = deriveMinimalStructure(distinction);
  const inverted = applyInversion(structure);
  const closed = applyDoubleInversion(structure);
  
  return { primordial, distinction, structure, inverted, closed };
}
