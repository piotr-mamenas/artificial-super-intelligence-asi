/**
 * Symmetry Pair: Two inverse views over the same wave.
 * 
 * From the ontology:
 * - A symmetry pair represents the duality of perspectives
 * - Positive branch: self / prediction / internal view
 * - Negative branch: world / residual / external view
 * - Together they form a complete picture via inversion
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveState, createWaveState, getAmplitudes, waveDistance, superpose } from './wave-state';
import { Complex, complex, negate, normalize, add, scale } from '../math/complex';

export interface SymmetryPair {
  id: string;
  positive: WaveState;          // Self / prediction branch
  negative: WaveState;          // World / residual branch
  createdAt: number;
  coherence: number;            // How well the pair maintains complementarity
  metadata?: Record<string, unknown>;
}

export interface SymmetryTransformation {
  id: string;
  pairId: string;
  type: 'flip' | 'rotate' | 'mix' | 'collapse';
  parameter?: number;
}

/**
 * Create a symmetry pair from a single wave state.
 * The negative branch is derived by phase inversion.
 */
export function createSymmetryPair(
  wave: WaveState,
  metadata?: Record<string, unknown>
): SymmetryPair {
  const amps = getAmplitudes(wave);
  
  // Negative branch: complex conjugate with phase flip
  const negativeAmps: Complex[] = amps.map(a => negate(a));
  const negative = createWaveState(normalize(negativeAmps), {
    type: 'negative-branch',
    parentId: wave.id
  });
  
  return {
    id: uuidv4(),
    positive: wave,
    negative,
    createdAt: Date.now(),
    coherence: 1.0, // Perfect coherence initially
    metadata
  };
}

/**
 * Create a symmetry pair from two explicit wave states.
 */
export function createSymmetryPairFromWaves(
  positive: WaveState,
  negative: WaveState,
  metadata?: Record<string, unknown>
): SymmetryPair {
  // Calculate coherence based on orthogonality
  // Perfect coherence: positive and negative are orthogonal
  const posAmps = getAmplitudes(positive);
  const negAmps = getAmplitudes(negative);
  
  let overlap = complex(0);
  for (let i = 0; i < posAmps.length; i++) {
    overlap = add(overlap, {
      re: posAmps[i].re * negAmps[i].re + posAmps[i].im * negAmps[i].im,
      im: posAmps[i].re * negAmps[i].im - posAmps[i].im * negAmps[i].re
    });
  }
  const overlapMag = Math.sqrt(overlap.re * overlap.re + overlap.im * overlap.im);
  const coherence = 1 - overlapMag; // 1 when orthogonal, 0 when identical
  
  return {
    id: uuidv4(),
    positive,
    negative,
    createdAt: Date.now(),
    coherence,
    metadata
  };
}

/**
 * Flip the symmetry pair: swap positive and negative branches.
 * This is a single inversion operation.
 */
export function flipSymmetryPair(pair: SymmetryPair): SymmetryPair {
  return {
    ...pair,
    id: uuidv4(),
    positive: pair.negative,
    negative: pair.positive,
    metadata: { ...pair.metadata, flipped: true }
  };
}

/**
 * Double flip: returns to original (demonstrates (−)(−) = (+))
 */
export function doubleFlipSymmetryPair(pair: SymmetryPair): SymmetryPair {
  return flipSymmetryPair(flipSymmetryPair(pair));
}

/**
 * Mix the branches with given weight.
 * Weight 0.5 = equal mixing, approaching decoherence.
 */
export function mixSymmetryPair(pair: SymmetryPair, mixFactor: number): SymmetryPair {
  const mixed = superpose(pair.positive, pair.negative, mixFactor);
  const antimixed = superpose(pair.negative, pair.positive, mixFactor);
  
  return {
    id: uuidv4(),
    positive: mixed,
    negative: antimixed,
    createdAt: Date.now(),
    coherence: pair.coherence * (1 - mixFactor), // Mixing reduces coherence
    metadata: { ...pair.metadata, mixed: mixFactor }
  };
}

/**
 * Rotate the symmetry pair in the internal space.
 * Angle in radians determines rotation in positive/negative space.
 */
export function rotateSymmetryPair(pair: SymmetryPair, angle: number): SymmetryPair {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const posAmps = getAmplitudes(pair.positive);
  const negAmps = getAmplitudes(pair.negative);
  
  // Rotate in the 2D space spanned by positive and negative
  const rotatedPosAmps: Complex[] = posAmps.map((a, i) => ({
    re: a.re * cos - negAmps[i].re * sin,
    im: a.im * cos - negAmps[i].im * sin
  }));
  
  const rotatedNegAmps: Complex[] = posAmps.map((a, i) => ({
    re: a.re * sin + negAmps[i].re * cos,
    im: a.im * sin + negAmps[i].im * cos
  }));
  
  return {
    id: uuidv4(),
    positive: createWaveState(normalize(rotatedPosAmps)),
    negative: createWaveState(normalize(rotatedNegAmps)),
    createdAt: Date.now(),
    coherence: pair.coherence, // Rotation preserves coherence
    metadata: { ...pair.metadata, rotated: angle }
  };
}

/**
 * Calculate the self-world divergence of the pair.
 * High divergence = strong distinction between self and world views.
 */
export function calculateDivergence(pair: SymmetryPair): number {
  return waveDistance(pair.positive, pair.negative);
}

/**
 * Calculate symmetry breaking: how much the pair deviates from perfect symmetry.
 */
export function calculateSymmetryBreaking(pair: SymmetryPair): number {
  const posAmps = getAmplitudes(pair.positive);
  const negAmps = getAmplitudes(pair.negative);
  
  // Perfect symmetry: |pos[i]| = |neg[i]| for all i
  let breaking = 0;
  for (let i = 0; i < posAmps.length; i++) {
    const posMag = Math.sqrt(posAmps[i].re ** 2 + posAmps[i].im ** 2);
    const negMag = Math.sqrt(negAmps[i].re ** 2 + negAmps[i].im ** 2);
    breaking += Math.abs(posMag - negMag);
  }
  
  return breaking / posAmps.length;
}

/**
 * Reconstruct a unified wave from a symmetry pair.
 * This "collapses" the duality back into a single perspective.
 */
export function reconstructFromPair(pair: SymmetryPair, weight: number = 0.5): WaveState {
  return superpose(pair.positive, pair.negative, weight);
}

/**
 * Split a wave into self/world components based on a splitting function.
 * The splitter determines what goes to positive vs negative branch.
 */
export function splitWave(
  wave: WaveState,
  splitter: (index: number) => number // Returns weight for positive branch
): SymmetryPair {
  const amps = getAmplitudes(wave);
  
  const posAmps: Complex[] = amps.map((a, i) => {
    const w = splitter(i);
    return scale(a, Math.sqrt(w));
  });
  
  const negAmps: Complex[] = amps.map((a, i) => {
    const w = 1 - splitter(i);
    return scale(a, Math.sqrt(w));
  });
  
  const positive = createWaveState(normalize(posAmps), { type: 'split-positive' });
  const negative = createWaveState(normalize(negAmps), { type: 'split-negative' });
  
  return createSymmetryPairFromWaves(positive, negative, { type: 'split' });
}

/**
 * Check if pair satisfies complementarity constraint.
 */
export function isComplementary(pair: SymmetryPair, threshold: number = 0.9): boolean {
  const divergence = calculateDivergence(pair);
  return divergence > threshold;
}
