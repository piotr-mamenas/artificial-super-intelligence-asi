/**
 * OBSERVERS MODULE
 * 
 * Section 6: Observers and Epistemic Truth
 * 
 * Each observer has a filter tensor defining sensitivity to axes and frequencies.
 * Epistemic truth is relative - each observer has their own T_o(O,S).
 * Agreement between observers is derived, not primitive.
 */

import { v4 as uuidv4 } from 'uuid';
import { AXES } from './primitive-ontology';
import { 
  FREQUENCIES, 
  M,
  complexMagSquared 
} from './waveform';
import { ASIObject } from './objects';
import { Sentence, computeObjectSentenceWaveform } from './lexicon';

// ============================================
// 6.1 OBSERVER FILTERS
// ============================================

/**
 * Observer Filter Tensor: W_o : C × F → ℝ≥0
 * 
 * Specifies sensitivity to each axis and frequency.
 * W_o(c, f) encodes:
 * - Emotional biases (which axis matters)
 * - Arousal preferences (low vs high frequency)
 * - Learned coupling to object and sentence patterns
 */
export interface ObserverFilter {
  // Filter values W_o(c, f) stored as 2D array [axis][frequency]
  R: Float32Array; // Length = M (frequencies)
  G: Float32Array;
  B: Float32Array;
}

/**
 * ASI Observer - An entity that perceives and evaluates
 */
export interface ASIObserver {
  id: string;
  name: string;
  archetype: string;
  
  // Filter tensor W_o
  filter: ObserverFilter;
  
  // Learning state
  learningRate: number;
  accuracy: number; // Current accuracy on labeled data
  
  // Metadata
  createdAt: number;
}

/**
 * Create an empty filter (all zeros).
 */
export function createEmptyFilter(): ObserverFilter {
  return {
    R: new Float32Array(M),
    G: new Float32Array(M),
    B: new Float32Array(M)
  };
}

/**
 * Create a uniform filter (all ones).
 */
export function createUniformFilter(): ObserverFilter {
  return {
    R: new Float32Array(M).fill(1),
    G: new Float32Array(M).fill(1),
    B: new Float32Array(M).fill(1)
  };
}

/**
 * Create a random filter.
 */
export function createRandomFilter(): ObserverFilter {
  const filter = createEmptyFilter();
  for (let i = 0; i < M; i++) {
    filter.R[i] = Math.random();
    filter.G[i] = Math.random();
    filter.B[i] = Math.random();
  }
  return filter;
}

// ============================================
// ARCHETYPE FILTERS
// ============================================

/**
 * Archetype definitions - initial filter configurations.
 */
export type ArchetypeType = 
  | 'engineer'
  | 'anxious'
  | 'romantic'
  | 'scientist'
  | 'thrill-seeker'
  | 'pessimist'
  | 'optimist'
  | 'safety-scientist'
  | 'neutral';

/**
 * Create archetype-specific filter.
 */
export function createArchetypeFilter(archetype: ArchetypeType): ObserverFilter {
  const filter = createEmptyFilter();
  
  switch (archetype) {
    case 'engineer':
      // High B (sincerity), balanced R/G, prefers mid frequencies
      for (let i = 0; i < M; i++) {
        const f = FREQUENCIES[i];
        filter.R[i] = 0.5;
        filter.G[i] = 0.5;
        filter.B[i] = 1.0; // Values sincerity
        // Mid-frequency preference
        filter.R[i] *= Math.exp(-Math.pow(f - 0.5, 2) * 4);
        filter.G[i] *= Math.exp(-Math.pow(f - 0.5, 2) * 4);
        filter.B[i] *= Math.exp(-Math.pow(f - 0.5, 2) * 4);
      }
      break;
      
    case 'anxious':
      // High G sensitivity (fear axis), high frequency sensitivity
      for (let i = 0; i < M; i++) {
        const f = FREQUENCIES[i];
        filter.R[i] = 0.3;
        filter.G[i] = 1.0; // Fear-sensitive
        filter.B[i] = 0.4;
        // High frequency preference (rapid fluctuations)
        filter.G[i] *= f * 2;
      }
      break;
      
    case 'romantic':
      // High R sensitivity (love axis), low frequency preference
      for (let i = 0; i < M; i++) {
        const f = FREQUENCIES[i];
        filter.R[i] = 1.0; // Love-sensitive
        filter.G[i] = 0.7;
        filter.B[i] = 0.8;
        // Low frequency preference (slow emotional rhythms)
        filter.R[i] *= Math.exp(-f * 3);
      }
      break;
      
    case 'scientist':
      // Balanced, slight B preference, wide frequency range
      for (let i = 0; i < M; i++) {
        filter.R[i] = 0.6;
        filter.G[i] = 0.6;
        filter.B[i] = 0.9; // Sincerity matters
      }
      break;
      
    case 'thrill-seeker':
      // High frequency preference, all axes
      for (let i = 0; i < M; i++) {
        const f = FREQUENCIES[i];
        filter.R[i] = f * 1.5;
        filter.G[i] = f * 1.5;
        filter.B[i] = f * 1.0;
      }
      break;
      
    case 'pessimist':
      // Sensitive to negative (inverted love, high fear)
      for (let i = 0; i < M; i++) {
        filter.R[i] = 0.2; // Low love sensitivity
        filter.G[i] = 1.0; // High fear sensitivity
        filter.B[i] = 0.3; // Low sincerity expectation
      }
      break;
      
    case 'optimist':
      // High R and G positive sensitivity
      for (let i = 0; i < M; i++) {
        filter.R[i] = 1.0; // Love-sensitive
        filter.G[i] = 0.3; // Low fear sensitivity
        filter.B[i] = 0.8;
      }
      break;
      
    case 'safety-scientist':
      // Ground-truth aligned - balanced with B emphasis
      for (let i = 0; i < M; i++) {
        filter.R[i] = 0.7;
        filter.G[i] = 0.9; // Aware of fear/danger
        filter.B[i] = 1.0; // Values truth
      }
      break;
      
    default: // 'neutral'
      for (let i = 0; i < M; i++) {
        filter.R[i] = 1.0;
        filter.G[i] = 1.0;
        filter.B[i] = 1.0;
      }
  }
  
  return filter;
}

/**
 * Create an ASI Observer.
 */
export function createASIObserver(
  name: string,
  archetype: ArchetypeType = 'neutral'
): ASIObserver {
  return {
    id: uuidv4(),
    name,
    archetype,
    filter: createArchetypeFilter(archetype),
    learningRate: 0.1,
    accuracy: 0.5,
    createdAt: Date.now()
  };
}

// ============================================
// 6.2 EPISTEMIC TRUTH AS RESONANCE
// ============================================

/**
 * Compute resonance/"truth" score for observer.
 * 
 * T_o(O,S) = Σ_{c,f} W_o(c,f) · |Ψ_{O,S,c}(f)|² / Σ_{c,f} W_o(c,f) · |Ψ^{(O)}_c(f)|²
 * 
 * Epistemic truth is RELATIVE - each observer has their own T_o(O,S).
 */
export function computeEpistemicTruth(
  observer: ASIObserver,
  obj: ASIObject,
  sentence: Sentence
): number {
  // Compute object-sentence waveform
  const combinedWaveform = computeObjectSentenceWaveform(obj, sentence);
  
  let numerator = 0;
  let denominator = 0;
  
  for (const axis of AXES) {
    for (let i = 0; i < M; i++) {
      const weight = observer.filter[axis][i];
      
      // Numerator: W_o(c,f) · |Ψ_{O,S,c}(f)|²
      const combinedMag = complexMagSquared(combinedWaveform[axis].amplitudes[i]);
      numerator += weight * combinedMag;
      
      // Denominator: W_o(c,f) · |Ψ^{(O)}_c(f)|²
      const objMag = complexMagSquared(obj.waveform[axis].amplitudes[i]);
      denominator += weight * objMag;
    }
  }
  
  if (denominator === 0) return 0;
  
  // Normalize to [0, 1] range
  const rawTruth = numerator / denominator;
  return Math.min(1, Math.max(0, rawTruth));
}

/**
 * Compare two sentences about the same object.
 * Returns true if sentence1 is "more true" for this observer.
 */
export function compareSentences(
  observer: ASIObserver,
  obj: ASIObject,
  sentence1: Sentence,
  sentence2: Sentence
): boolean {
  const truth1 = computeEpistemicTruth(observer, obj, sentence1);
  const truth2 = computeEpistemicTruth(observer, obj, sentence2);
  return truth1 > truth2;
}

// ============================================
// OBSERVER CONSENSUS
// ============================================

/**
 * Compute agreement between observers on a statement.
 * Agreement is derived, not primitive.
 */
export function computeObserverAgreement(
  observers: ASIObserver[],
  obj: ASIObject,
  sentence: Sentence
): {
  meanTruth: number;
  variance: number;
  agreementLevel: number;
} {
  const truths = observers.map(o => computeEpistemicTruth(o, obj, sentence));
  
  const meanTruth = truths.reduce((a, b) => a + b, 0) / truths.length;
  
  const variance = truths.reduce((sum, t) => sum + (t - meanTruth) ** 2, 0) / truths.length;
  
  // Agreement level: inverse of variance, normalized
  const agreementLevel = 1 / (1 + variance * 10);
  
  return { meanTruth, variance, agreementLevel };
}

/**
 * Find which observers agree with each other.
 * Returns clusters of agreeing observers.
 */
export function findAgreementClusters(
  observers: ASIObserver[],
  obj: ASIObject,
  sentence: Sentence,
  threshold: number = 0.2
): ASIObserver[][] {
  const truths = observers.map(o => ({
    observer: o,
    truth: computeEpistemicTruth(o, obj, sentence)
  }));
  
  // Sort by truth value
  truths.sort((a, b) => a.truth - b.truth);
  
  // Cluster by proximity
  const clusters: ASIObserver[][] = [];
  let currentCluster: ASIObserver[] = [];
  let lastTruth = -Infinity;
  
  for (const { observer, truth } of truths) {
    if (truth - lastTruth > threshold && currentCluster.length > 0) {
      clusters.push(currentCluster);
      currentCluster = [];
    }
    currentCluster.push(observer);
    lastTruth = truth;
  }
  
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }
  
  return clusters;
}
