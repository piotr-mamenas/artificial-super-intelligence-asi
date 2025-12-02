/**
 * Hadron: Stable tri-channel wavelength record across R, U, C channels.
 * 
 * From the ontology:
 * - Hadrons are stable, recurrent inversion-closure cycles
 * - They represent persistent entities that "continue to exist"
 * - Each hadron encodes information across three channels:
 *   R (Reference/Frame), U (Update/Transform), C (Closure/Commit)
 */

import { v4 as uuidv4 } from 'uuid';
import { HADRON_MIN_STABILITY_SCORE, HADRON_CHANNEL_COUNT } from '../../config/constants';

export type HadronChannel = 'R' | 'U' | 'C';

export interface Wavelength {
  frequency: number;    // Cycles per logical tick
  phase: number;        // Phase offset (0 to 2π)
  amplitude: number;    // Strength of this channel
  features?: Record<string, number>; // Additional spectral features
}

export interface Hadron {
  id: string;
  channels: Record<HadronChannel, Wavelength>;
  stabilityScore: number;           // 0 to 1, how stable this pattern is
  firstObservedAt: number;          // Logical tick
  lastObservedAt: number;           // Logical tick
  observationCount: number;         // How many times observed
  supportingTraceIds: string[];     // Evidence traces
  metadata?: Record<string, unknown>;
}

export interface HadronSignature {
  rFrequency: number;
  uFrequency: number;
  cFrequency: number;
  rPhase: number;
  uPhase: number;
  cPhase: number;
}

/**
 * Create a new hadron from channel wavelengths.
 */
export function createHadron(
  rWavelength: Wavelength,
  uWavelength: Wavelength,
  cWavelength: Wavelength,
  logicalTick: number,
  metadata?: Record<string, unknown>
): Hadron {
  return {
    id: uuidv4(),
    channels: {
      R: rWavelength,
      U: uWavelength,
      C: cWavelength
    },
    stabilityScore: 0.5, // Initial score
    firstObservedAt: logicalTick,
    lastObservedAt: logicalTick,
    observationCount: 1,
    supportingTraceIds: [],
    metadata
  };
}

/**
 * Create a wavelength specification.
 */
export function createWavelength(
  frequency: number,
  phase: number = 0,
  amplitude: number = 1,
  features?: Record<string, number>
): Wavelength {
  return { frequency, phase, amplitude, features };
}

/**
 * Extract signature from hadron for comparison.
 */
export function getHadronSignature(hadron: Hadron): HadronSignature {
  return {
    rFrequency: hadron.channels.R.frequency,
    uFrequency: hadron.channels.U.frequency,
    cFrequency: hadron.channels.C.frequency,
    rPhase: hadron.channels.R.phase,
    uPhase: hadron.channels.U.phase,
    cPhase: hadron.channels.C.phase
  };
}

/**
 * Calculate similarity between two hadron signatures.
 */
export function signatureSimilarity(sig1: HadronSignature, sig2: HadronSignature): number {
  // Weighted distance across all components
  const freqWeight = 0.6;
  const phaseWeight = 0.4;
  
  const freqDist = Math.sqrt(
    (sig1.rFrequency - sig2.rFrequency) ** 2 +
    (sig1.uFrequency - sig2.uFrequency) ** 2 +
    (sig1.cFrequency - sig2.cFrequency) ** 2
  );
  
  // Phase distance (circular)
  const phaseDist = Math.sqrt(
    angleDiff(sig1.rPhase, sig2.rPhase) ** 2 +
    angleDiff(sig1.uPhase, sig2.uPhase) ** 2 +
    angleDiff(sig1.cPhase, sig2.cPhase) ** 2
  );
  
  // Normalize and convert to similarity
  const totalDist = freqWeight * freqDist + phaseWeight * phaseDist;
  return Math.exp(-totalDist);
}

/**
 * Circular angle difference.
 */
function angleDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 2 * Math.PI - diff);
}

/**
 * Update hadron stability based on new observation.
 */
export function updateHadronStability(
  hadron: Hadron,
  newChannels: Record<HadronChannel, Wavelength>,
  logicalTick: number
): Hadron {
  // Calculate how close the new observation is to existing pattern
  const rMatch = channelMatch(hadron.channels.R, newChannels.R);
  const uMatch = channelMatch(hadron.channels.U, newChannels.U);
  const cMatch = channelMatch(hadron.channels.C, newChannels.C);
  
  const matchScore = (rMatch + uMatch + cMatch) / 3;
  
  // Update stability with exponential moving average
  const alpha = 0.1;
  const newStability = hadron.stabilityScore * (1 - alpha) + matchScore * alpha;
  
  // Merge channel information (weighted average)
  const mergeWeight = 0.2;
  const mergedChannels: Record<HadronChannel, Wavelength> = {
    R: mergeWavelength(hadron.channels.R, newChannels.R, mergeWeight),
    U: mergeWavelength(hadron.channels.U, newChannels.U, mergeWeight),
    C: mergeWavelength(hadron.channels.C, newChannels.C, mergeWeight)
  };
  
  return {
    ...hadron,
    channels: mergedChannels,
    stabilityScore: newStability,
    lastObservedAt: logicalTick,
    observationCount: hadron.observationCount + 1
  };
}

/**
 * Calculate match score between two wavelengths.
 */
function channelMatch(w1: Wavelength, w2: Wavelength): number {
  const freqMatch = 1 - Math.abs(w1.frequency - w2.frequency) / Math.max(w1.frequency, w2.frequency, 0.001);
  const phaseMatch = 1 - angleDiff(w1.phase, w2.phase) / Math.PI;
  const ampMatch = 1 - Math.abs(w1.amplitude - w2.amplitude) / Math.max(w1.amplitude, w2.amplitude, 0.001);
  
  return (freqMatch + phaseMatch + ampMatch) / 3;
}

/**
 * Merge two wavelengths with given weight.
 */
function mergeWavelength(w1: Wavelength, w2: Wavelength, weight: number): Wavelength {
  return {
    frequency: w1.frequency * (1 - weight) + w2.frequency * weight,
    phase: circularMean(w1.phase, w2.phase, weight),
    amplitude: w1.amplitude * (1 - weight) + w2.amplitude * weight,
    features: mergeFeatures(w1.features, w2.features, weight)
  };
}

/**
 * Circular mean of two angles.
 */
function circularMean(a: number, b: number, weight: number): number {
  const x = Math.cos(a) * (1 - weight) + Math.cos(b) * weight;
  const y = Math.sin(a) * (1 - weight) + Math.sin(b) * weight;
  return Math.atan2(y, x);
}

/**
 * Merge feature dictionaries.
 */
function mergeFeatures(
  f1?: Record<string, number>,
  f2?: Record<string, number>,
  weight: number = 0.5
): Record<string, number> | undefined {
  if (!f1 && !f2) return undefined;
  if (!f1) return f2;
  if (!f2) return f1;
  
  const merged: Record<string, number> = {};
  const keys = new Set([...Object.keys(f1), ...Object.keys(f2)]);
  
  for (const key of keys) {
    const v1 = f1[key] ?? 0;
    const v2 = f2[key] ?? 0;
    merged[key] = v1 * (1 - weight) + v2 * weight;
  }
  
  return merged;
}

/**
 * Check if hadron is stable enough to be considered persistent.
 */
export function isStableHadron(hadron: Hadron): boolean {
  return hadron.stabilityScore >= HADRON_MIN_STABILITY_SCORE &&
         hadron.observationCount >= 3;
}

/**
 * Calculate hadron "mass" - total energy in all channels.
 */
export function calculateHadronMass(hadron: Hadron): number {
  return Object.values(hadron.channels).reduce(
    (sum, w) => sum + w.amplitude * w.frequency,
    0
  );
}

/**
 * Calculate hadron "charge" - asymmetry between channels.
 */
export function calculateHadronCharge(hadron: Hadron): number {
  const rAmp = hadron.channels.R.amplitude;
  const uAmp = hadron.channels.U.amplitude;
  const cAmp = hadron.channels.C.amplitude;
  
  // Charge is the signed deviation from balance
  const avg = (rAmp + uAmp + cAmp) / 3;
  return (rAmp - avg) - (cAmp - avg); // R-bias minus C-bias
}

/**
 * Calculate hadron "spin" - rotational aspect of phase relationships.
 */
export function calculateHadronSpin(hadron: Hadron): number {
  const rPhase = hadron.channels.R.phase;
  const uPhase = hadron.channels.U.phase;
  const cPhase = hadron.channels.C.phase;
  
  // Spin is the winding number around the R-U-C cycle
  const winding = (uPhase - rPhase) + (cPhase - uPhase) + (rPhase - cPhase);
  return winding / (2 * Math.PI);
}

/**
 * Decay hadron (reduce stability over time without observation).
 */
export function decayHadron(hadron: Hadron, currentTick: number, decayRate: number = 0.01): Hadron {
  const timeSinceObserved = currentTick - hadron.lastObservedAt;
  const decayFactor = Math.exp(-decayRate * timeSinceObserved);
  
  return {
    ...hadron,
    stabilityScore: hadron.stabilityScore * decayFactor
  };
}

/**
 * Find matching hadron in a collection.
 */
export function findMatchingHadron(
  newSignature: HadronSignature,
  hadrons: Hadron[],
  threshold: number = 0.8
): Hadron | null {
  let bestMatch: Hadron | null = null;
  let bestScore = threshold;
  
  for (const hadron of hadrons) {
    const sig = getHadronSignature(hadron);
    const similarity = signatureSimilarity(newSignature, sig);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = hadron;
    }
  }
  
  return bestMatch;
}
