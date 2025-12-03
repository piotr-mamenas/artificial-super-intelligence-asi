/**
 * INFO-HADRONS AND INFO-LEPTONS
 * 
 * Section 4: Emergent Layer
 * 
 * Info-Hadrons: Stable emotional packets (localized loops in inversion history)
 * Info-Leptons: Transient modifiers (short-lived perturbations)
 */

import { v4 as uuidv4 } from 'uuid';
import { EmotionalColor } from './objects';

// ============================================
// 4.1 INFO-HADRONS (Stable Emotional Packets)
// ============================================

/**
 * Sensory weight vector: how much each sense contributes
 */
export interface SensoryWeight {
  vision: number;   // [0, 1]
  hearing: number;  // [0, 1]
  touch: number;    // [0, 1]
  taste: number;    // [0, 1]
  smell: number;    // [0, 1]
}

/**
 * Context reference for info-hadron
 */
export interface HadronContext {
  objectIds: string[];    // Referenced objects
  observerIds: string[];  // Observing entities
  timestamp: number;      // When created
  sourceWord?: string;    // Optional word that generated it
}

/**
 * Info-Hadron H = (R, G, B, I, f, S, context)
 * 
 * Corresponds to a localized, stable loop in inversion history
 * with persistent color.
 */
export interface InfoHadron {
  id: string;
  
  // Emotional color channels from C_O or interaction histories
  R: number;  // [0, 1]
  G: number;  // [0, 1]
  B: number;  // [0, 1]
  
  // Intensity: computed as norm of (R, G, B)
  I: number;  // [0, 1]
  
  // Dominant semantic frequency
  f: number;  // ℝ+
  
  // Sensory weight vector
  S: SensoryWeight;
  
  // Context references
  context: HadronContext;
  
  // Stability (how long-lived this hadron is)
  stability: number;
}

/**
 * Compute intensity from RGB.
 */
export function computeIntensity(R: number, G: number, B: number): number {
  return Math.sqrt(R * R + G * G + B * B) / Math.sqrt(3); // Normalized to [0, 1]
}

/**
 * Create an Info-Hadron from emotional color.
 */
export function createInfoHadron(
  color: EmotionalColor,
  dominantFrequency: number,
  sensoryWeights: Partial<SensoryWeight> = {},
  context: Partial<HadronContext> = {}
): InfoHadron {
  // Map from [-1, 1] to [0, 1]
  const R = (color.R + 1) / 2;
  const G = (color.G + 1) / 2;
  const B = (color.B + 1) / 2;
  
  return {
    id: uuidv4(),
    R,
    G,
    B,
    I: computeIntensity(R, G, B),
    f: dominantFrequency,
    S: {
      vision: sensoryWeights.vision ?? 0.5,
      hearing: sensoryWeights.hearing ?? 0.5,
      touch: sensoryWeights.touch ?? 0.5,
      taste: sensoryWeights.taste ?? 0.1,
      smell: sensoryWeights.smell ?? 0.1
    },
    context: {
      objectIds: context.objectIds ?? [],
      observerIds: context.observerIds ?? [],
      timestamp: context.timestamp ?? Date.now(),
      sourceWord: context.sourceWord
    },
    stability: 1.0
  };
}

// ============================================
// 4.2 INFO-LEPTONS (Transient Modifiers)
// ============================================

/**
 * Info-Lepton L = (ΔR, ΔG, ΔB, Δf, S, τ)
 * 
 * Short-lived modifier that perturbs hadrons.
 * At inversion-layer: short-range perturbations in σ_c(n)
 * that do not change long-term loop type (object identity).
 */
export interface InfoLepton {
  id: string;
  
  // Color perturbations (small)
  deltaR: number;
  deltaG: number;
  deltaB: number;
  
  // Frequency shift
  deltaF: number;
  
  // Sense weighting (typically taste/smell heavy)
  S: SensoryWeight;
  
  // Lifetime in steps
  tau: number;
  
  // Current age
  age: number;
}

/**
 * Create an Info-Lepton.
 */
export function createInfoLepton(
  deltas: { R: number; G: number; B: number; f: number },
  lifetime: number,
  sensoryWeights: Partial<SensoryWeight> = {}
): InfoLepton {
  return {
    id: uuidv4(),
    deltaR: deltas.R,
    deltaG: deltas.G,
    deltaB: deltas.B,
    deltaF: deltas.f,
    S: {
      vision: sensoryWeights.vision ?? 0.1,
      hearing: sensoryWeights.hearing ?? 0.1,
      touch: sensoryWeights.touch ?? 0.2,
      taste: sensoryWeights.taste ?? 0.5,  // Taste-heavy
      smell: sensoryWeights.smell ?? 0.5   // Smell-heavy
    },
    tau: lifetime,
    age: 0
  };
}

// ============================================
// COMPOSITION RULES
// ============================================

/**
 * Composition rule: H' = H + L (component-wise; clipped to valid ranges)
 * 
 * Apply lepton to hadron, producing modified hadron.
 */
export function applyLeptonToHadron(hadron: InfoHadron, lepton: InfoLepton): InfoHadron {
  // Clip function to [0, 1]
  const clip = (x: number) => Math.max(0, Math.min(1, x));
  
  const newR = clip(hadron.R + lepton.deltaR);
  const newG = clip(hadron.G + lepton.deltaG);
  const newB = clip(hadron.B + lepton.deltaB);
  
  return {
    ...hadron,
    id: uuidv4(), // New hadron
    R: newR,
    G: newG,
    B: newB,
    I: computeIntensity(newR, newG, newB),
    f: Math.max(0, hadron.f + lepton.deltaF),
    // Blend sensory weights
    S: {
      vision: (hadron.S.vision + lepton.S.vision) / 2,
      hearing: (hadron.S.hearing + lepton.S.hearing) / 2,
      touch: (hadron.S.touch + lepton.S.touch) / 2,
      taste: (hadron.S.taste + lepton.S.taste) / 2,
      smell: (hadron.S.smell + lepton.S.smell) / 2
    }
  };
}

/**
 * Tick a lepton forward in time.
 * Returns null if lepton has expired.
 */
export function tickLepton(lepton: InfoLepton): InfoLepton | null {
  lepton.age++;
  if (lepton.age >= lepton.tau) {
    return null; // Expired
  }
  return lepton;
}

/**
 * Check if lepton is still alive.
 */
export function isLeptonAlive(lepton: InfoLepton): boolean {
  return lepton.age < lepton.tau;
}

// ============================================
// HADRON INTERACTIONS
// ============================================

/**
 * Compute similarity between two hadrons.
 */
export function hadronSimilarity(h1: InfoHadron, h2: InfoHadron): number {
  // Color similarity
  const colorDiff = Math.sqrt(
    (h1.R - h2.R) ** 2 +
    (h1.G - h2.G) ** 2 +
    (h1.B - h2.B) ** 2
  );
  const colorSim = 1 - colorDiff / Math.sqrt(3);
  
  // Frequency similarity (exponential decay)
  const freqDiff = Math.abs(h1.f - h2.f);
  const freqSim = Math.exp(-freqDiff);
  
  // Combined similarity
  return colorSim * 0.7 + freqSim * 0.3;
}

/**
 * Merge two similar hadrons into one.
 */
export function mergeHadrons(h1: InfoHadron, h2: InfoHadron): InfoHadron {
  const R = (h1.R + h2.R) / 2;
  const G = (h1.G + h2.G) / 2;
  const B = (h1.B + h2.B) / 2;
  
  return {
    id: uuidv4(),
    R,
    G,
    B,
    I: computeIntensity(R, G, B),
    f: (h1.f + h2.f) / 2,
    S: {
      vision: (h1.S.vision + h2.S.vision) / 2,
      hearing: (h1.S.hearing + h2.S.hearing) / 2,
      touch: (h1.S.touch + h2.S.touch) / 2,
      taste: (h1.S.taste + h2.S.taste) / 2,
      smell: (h1.S.smell + h2.S.smell) / 2
    },
    context: {
      objectIds: [...new Set([...h1.context.objectIds, ...h2.context.objectIds])],
      observerIds: [...new Set([...h1.context.observerIds, ...h2.context.observerIds])],
      timestamp: Date.now()
    },
    stability: (h1.stability + h2.stability) / 2
  };
}
