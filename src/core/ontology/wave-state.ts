/**
 * Wave state: the fundamental representation of quantum/ontological states.
 * 
 * Waves are complex-valued vectors in a Hilbert space that:
 * - Can be raised (superposed/dispersed)
 * - Can be collapsed (focused/measured)
 * - Undergo transformations via unitary operators
 */

import { v4 as uuidv4 } from 'uuid';
import { Complex, complex, packComplexArray, unpackComplexArray, normalize, innerProduct, magnitude, scale, add } from '../math/complex';
import { WAVE_DIMENSION } from '../../config/constants';

export interface WaveState {
  id: string;
  amplitudes: Float32Array;     // Complex encoded as [re0, im0, re1, im1, ...]
  dimension: number;
  createdAt: number;            // Timestamp
  metadata?: Record<string, unknown>;
}

export interface WaveRaise {
  id: string;
  sourceStateId: string;
  targetStateId: string;
  dispersalFactor: number;      // How much the wave spread
}

export interface WaveCollapse {
  id: string;
  sourceStateId: string;
  targetStateId: string;
  outcomeIndex: number;
  probability: number;
}

/**
 * Create a new wave state from complex amplitudes.
 */
export function createWaveState(
  amplitudes: Complex[],
  metadata?: Record<string, unknown>
): WaveState {
  const normalized = normalize(amplitudes);
  return {
    id: uuidv4(),
    amplitudes: packComplexArray(normalized),
    dimension: amplitudes.length,
    createdAt: Date.now(),
    metadata
  };
}

/**
 * Create the ground state |0⟩ = [1, 0, 0, ...]
 */
export function createGroundState(dimension: number = WAVE_DIMENSION): WaveState {
  const amplitudes: Complex[] = new Array(dimension).fill(null).map((_, i) => 
    i === 0 ? complex(1) : complex(0)
  );
  return createWaveState(amplitudes, { type: 'ground' });
}

/**
 * Create a uniform superposition state |+⟩ = [1/√n, 1/√n, ...]
 */
export function createSuperpositionState(dimension: number = WAVE_DIMENSION): WaveState {
  const amplitude = 1 / Math.sqrt(dimension);
  const amplitudes: Complex[] = new Array(dimension).fill(null).map(() => 
    complex(amplitude)
  );
  return createWaveState(amplitudes, { type: 'superposition' });
}

/**
 * Create a random normalized state.
 */
export function createRandomState(dimension: number = WAVE_DIMENSION): WaveState {
  const amplitudes: Complex[] = new Array(dimension).fill(null).map(() => 
    complex(Math.random() - 0.5, Math.random() - 0.5)
  );
  return createWaveState(amplitudes, { type: 'random' });
}

/**
 * Get complex amplitudes from wave state.
 */
export function getAmplitudes(state: WaveState): Complex[] {
  return unpackComplexArray(state.amplitudes);
}

/**
 * Calculate probability of being in basis state |i⟩.
 */
export function getProbability(state: WaveState, index: number): number {
  const amps = getAmplitudes(state);
  if (index < 0 || index >= amps.length) return 0;
  const amp = amps[index];
  return amp.re * amp.re + amp.im * amp.im;
}

/**
 * Get all probabilities (Born rule distribution).
 */
export function getProbabilities(state: WaveState): number[] {
  const amps = getAmplitudes(state);
  return amps.map(a => a.re * a.re + a.im * a.im);
}

/**
 * Calculate entropy of the wave state (von Neumann entropy approximation).
 */
export function calculateEntropy(state: WaveState): number {
  const probs = getProbabilities(state);
  let entropy = 0;
  for (const p of probs) {
    if (p > 1e-10) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Calculate overlap (fidelity) between two states: |⟨ψ|φ⟩|²
 */
export function calculateFidelity(state1: WaveState, state2: WaveState): number {
  const amps1 = getAmplitudes(state1);
  const amps2 = getAmplitudes(state2);
  
  if (amps1.length !== amps2.length) {
    throw new Error('State dimensions must match');
  }
  
  const overlap = innerProduct(amps1, amps2);
  return overlap.re * overlap.re + overlap.im * overlap.im;
}

/**
 * Raise (disperse) a wave state - spread it across basis states.
 * This is the first inversion: creating spatial distinction.
 */
export function raiseWave(state: WaveState, dispersalFactor: number): { raised: WaveState; raise: WaveRaise } {
  const amps = getAmplitudes(state);
  const n = amps.length;
  
  // Mix current state with uniform superposition based on dispersal factor
  const uniformAmp = 1 / Math.sqrt(n);
  const raisedAmps: Complex[] = amps.map(a => ({
    re: a.re * (1 - dispersalFactor) + uniformAmp * dispersalFactor,
    im: a.im * (1 - dispersalFactor)
  }));
  
  const normalized = normalize(raisedAmps);
  const raised = createWaveState(normalized, { 
    type: 'raised', 
    dispersalFactor,
    parentId: state.id 
  });
  
  const raise: WaveRaise = {
    id: uuidv4(),
    sourceStateId: state.id,
    targetStateId: raised.id,
    dispersalFactor
  };
  
  return { raised, raise };
}

/**
 * Collapse a wave state - select a definite outcome.
 * This is the second inversion: closing the distinction.
 */
export function collapseWave(state: WaveState): { collapsed: WaveState; collapse: WaveCollapse } {
  const probs = getProbabilities(state);
  
  // Sample according to Born rule
  const r = Math.random();
  let cumulative = 0;
  let outcomeIndex = 0;
  
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) {
      outcomeIndex = i;
      break;
    }
  }
  
  // Collapse to basis state |i⟩
  const collapsedAmps: Complex[] = new Array(probs.length).fill(null).map((_, i) =>
    i === outcomeIndex ? complex(1) : complex(0)
  );
  
  const collapsed = createWaveState(collapsedAmps, {
    type: 'collapsed',
    outcomeIndex,
    parentId: state.id
  });
  
  const collapse: WaveCollapse = {
    id: uuidv4(),
    sourceStateId: state.id,
    targetStateId: collapsed.id,
    outcomeIndex,
    probability: probs[outcomeIndex]
  };
  
  return { collapsed, collapse };
}

/**
 * Apply focus to a wave state - sharpen distribution around peak.
 * Focus is the inverse of dispersion.
 */
export function focusWave(state: WaveState, focusFactor: number): WaveState {
  const amps = getAmplitudes(state);
  const probs = getProbabilities(state);
  
  // Find maximum probability index
  let maxIdx = 0;
  let maxProb = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxProb) {
      maxProb = probs[i];
      maxIdx = i;
    }
  }
  
  // Sharpen distribution towards maximum
  const focusedAmps: Complex[] = amps.map((a, i) => {
    if (i === maxIdx) {
      // Increase amplitude at peak
      const boost = 1 + focusFactor;
      return scale(a, boost);
    } else {
      // Decrease amplitude elsewhere
      const reduce = 1 - focusFactor * 0.5;
      return scale(a, reduce);
    }
  });
  
  return createWaveState(normalize(focusedAmps), {
    type: 'focused',
    focusFactor,
    parentId: state.id
  });
}

/**
 * Linear combination of two wave states.
 */
export function superpose(state1: WaveState, state2: WaveState, weight1: number = 0.5): WaveState {
  const amps1 = getAmplitudes(state1);
  const amps2 = getAmplitudes(state2);
  
  if (amps1.length !== amps2.length) {
    throw new Error('State dimensions must match');
  }
  
  const weight2 = 1 - weight1;
  const superposedAmps: Complex[] = amps1.map((a, i) => 
    add(scale(a, Math.sqrt(weight1)), scale(amps2[i], Math.sqrt(weight2)))
  );
  
  return createWaveState(normalize(superposedAmps), {
    type: 'superposed',
    weight1,
    parent1Id: state1.id,
    parent2Id: state2.id
  });
}

/**
 * Distance between two wave states (trace distance approximation).
 */
export function waveDistance(state1: WaveState, state2: WaveState): number {
  const fidelity = calculateFidelity(state1, state2);
  return Math.sqrt(1 - fidelity);
}
