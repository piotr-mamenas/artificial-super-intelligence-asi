/**
 * KCBS PENTAGRAM - Contextual Measurement Structure
 * 
 * 5 observables arranged in a pentagon.
 * Each edge (pair) is compatible; the full cycle is contextual.
 * 
 * The pentagram defines measurement contexts in phase space.
 * Agent chooses rotation angle to select which contexts are active.
 */

import {
  PhasePoint,
  WaveState,
  normalizePhase,
  evaluateWaveAt,
} from './phase-space';

// ============================================
// KCBS OBSERVABLE
// ============================================

export interface KCBSObservable {
  id: number;           // 0-4
  direction: PhasePoint; // Direction in phase plane
}

export interface KCBSContext {
  observables: [KCBSObservable, KCBSObservable];  // Compatible pair
  edgeIndex: number;    // 0-4 (which edge of pentagon)
}

export interface KCBSPentagram {
  observables: KCBSObservable[];  // 5 observables
  contexts: KCBSContext[];        // 5 contexts (edges)
  rotation: number;               // Current rotation angle
  scale: number;                  // Scale in phase space
}

// ============================================
// PENTAGRAM CREATION
// ============================================

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
const PENTAGON_ANGLE = (2 * Math.PI) / 5;

/**
 * Create KCBS pentagram at given rotation and scale
 */
export function createKCBSPentagram(rotation: number = 0, scale: number = 1): KCBSPentagram {
  const observables: KCBSObservable[] = [];
  
  // Create 5 observables at pentagon vertices
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i * PENTAGON_ANGLE;
    observables.push({
      id: i,
      direction: {
        φ_t: Math.cos(angle) * scale,
        φ_s: Math.sin(angle) * scale,
      },
    });
  }
  
  // Create 5 contexts (edges connecting adjacent observables)
  const contexts: KCBSContext[] = [];
  for (let i = 0; i < 5; i++) {
    contexts.push({
      observables: [observables[i], observables[(i + 1) % 5]],
      edgeIndex: i,
    });
  }
  
  return { observables, contexts, rotation, scale };
}

/**
 * Create nested pentagrams at different scales
 */
export function createNestedPentagrams(
  levels: number,
  baseRotation: number = 0,
  baseScale: number = 1,
  scaleRatio: number = GOLDEN_RATIO
): KCBSPentagram[] {
  const pentagrams: KCBSPentagram[] = [];
  
  for (let i = 0; i < levels; i++) {
    // Each level has different rotation and scale
    const rotation = baseRotation + i * PENTAGON_ANGLE / levels;
    const scale = baseScale / Math.pow(scaleRatio, i);
    pentagrams.push(createKCBSPentagram(rotation, scale));
  }
  
  return pentagrams;
}

// ============================================
// PENTAGRAM ROTATION
// ============================================

/**
 * Rotate pentagram by angle
 */
export function rotatePentagram(p: KCBSPentagram, angle: number): KCBSPentagram {
  const newRotation = normalizePhase(p.rotation + angle);
  return createKCBSPentagram(newRotation, p.scale);
}

/**
 * Compute which context is most "time-like"
 * (aligned with time-phase axis)
 */
export function findTimeLikeContext(p: KCBSPentagram): KCBSContext {
  let bestContext = p.contexts[0];
  let bestAlignment = 0;
  
  for (const ctx of p.contexts) {
    // Average direction of context
    const avgT = (ctx.observables[0].direction.φ_t + ctx.observables[1].direction.φ_t) / 2;
    // Time-like means high |φ_t| component
    const alignment = Math.abs(avgT);
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      bestContext = ctx;
    }
  }
  
  return bestContext;
}

/**
 * Compute which context is most "space-like"
 */
export function findSpaceLikeContext(p: KCBSPentagram): KCBSContext {
  let bestContext = p.contexts[0];
  let bestAlignment = 0;
  
  for (const ctx of p.contexts) {
    const avgS = (ctx.observables[0].direction.φ_s + ctx.observables[1].direction.φ_s) / 2;
    const alignment = Math.abs(avgS);
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      bestContext = ctx;
    }
  }
  
  return bestContext;
}

// ============================================
// WAVE PROJECTION ONTO CONTEXT
// ============================================

/**
 * Project wave state onto KCBS context
 * Returns probability distribution over context outcomes
 */
export function projectWaveOntoContext(
  wave: WaveState,
  context: KCBSContext
): { prob0: number; prob1: number } {
  // Compute wave amplitude along each observable direction
  const amp0 = evaluateWaveAt(wave, context.observables[0].direction);
  const amp1 = evaluateWaveAt(wave, context.observables[1].direction);
  
  const total = amp0 + amp1;
  if (total === 0) {
    return { prob0: 0.5, prob1: 0.5 };
  }
  
  return {
    prob0: amp0 / total,
    prob1: amp1 / total,
  };
}

/**
 * Collapse wave onto context, sampling an outcome
 */
export function collapseOnContext(
  wave: WaveState,
  context: KCBSContext
): { outcome: 0 | 1; collapsedPhase: PhasePoint } {
  const probs = projectWaveOntoContext(wave, context);
  
  // Sample outcome
  const outcome: 0 | 1 = Math.random() < probs.prob0 ? 0 : 1;
  
  // Collapsed phase is the direction of chosen observable
  const collapsedPhase = context.observables[outcome].direction;
  
  return { outcome, collapsedPhase };
}

// ============================================
// CONTEXTUALITY MEASURE
// ============================================

/**
 * Compute KCBS contextuality violation
 * In quantum mechanics, this can exceed classical bounds
 */
export function computeContextuality(
  wave: WaveState,
  pentagram: KCBSPentagram
): number {
  // Sum of correlations around the pentagon
  let correlationSum = 0;
  
  for (const ctx of pentagram.contexts) {
    const probs = projectWaveOntoContext(wave, ctx);
    // Correlation = difference in probabilities
    const correlation = Math.abs(probs.prob0 - probs.prob1);
    correlationSum += correlation;
  }
  
  // Classical bound is 3, quantum can reach ~3.944
  // We normalize to [0, 1] where 0 = classical, 1 = max quantum
  const classicalBound = 3;
  const quantumMax = 4 * Math.cos(Math.PI / 5);  // ≈ 3.236
  
  const violation = Math.max(0, correlationSum - classicalBound);
  return violation / (quantumMax - classicalBound);
}

// ============================================
// AGENT POLICY INTERFACE
// ============================================

export interface AgentPolicy {
  // Choose pentagram rotation based on current state
  chooseRotation(wave: WaveState, pentagram: KCBSPentagram): number;
  
  // Choose focus vs dispersion
  chooseFocusDispersion(wave: WaveState): { focus: number; dispersion: number };
  
  // Choose which context to measure
  chooseContext(pentagram: KCBSPentagram, wave: WaveState): KCBSContext;
}

/**
 * Default agent policy: random exploration
 */
export const randomPolicy: AgentPolicy = {
  chooseRotation: () => Math.random() * 2 * Math.PI,
  
  chooseFocusDispersion: () => ({
    focus: Math.random(),
    dispersion: Math.random(),
  }),
  
  chooseContext: (pentagram) => 
    pentagram.contexts[Math.floor(Math.random() * 5)],
};

/**
 * Coherence-seeking policy: maximize wave coherence
 */
export const coherencePolicy: AgentPolicy = {
  chooseRotation: (wave, pentagram) => {
    // Try to align pentagram with wave peaks
    let bestRotation = 0;
    let bestAmplitude = 0;
    
    for (let r = 0; r < 2 * Math.PI; r += 0.1) {
      const rotated = rotatePentagram(pentagram, r);
      let totalAmp = 0;
      for (const obs of rotated.observables) {
        totalAmp += evaluateWaveAt(wave, obs.direction);
      }
      if (totalAmp > bestAmplitude) {
        bestAmplitude = totalAmp;
        bestRotation = r;
      }
    }
    
    return bestRotation;
  },
  
  chooseFocusDispersion: (wave) => {
    // If wave is spread, focus more; if concentrated, disperse
    const coherence = wave.blobs.reduce((sum, b) => 
      sum + 1 / (1 + b.spread.σ_t + b.spread.σ_s), 0
    ) / Math.max(1, wave.blobs.length);
    
    return {
      focus: coherence < 0.5 ? 0.8 : 0.2,
      dispersion: coherence > 0.5 ? 0.8 : 0.2,
    };
  },
  
  chooseContext: (pentagram, wave) => {
    // Choose context with highest wave amplitude
    let bestContext = pentagram.contexts[0];
    let bestAmp = 0;
    
    for (const ctx of pentagram.contexts) {
      const amp = evaluateWaveAt(wave, ctx.observables[0].direction) +
                  evaluateWaveAt(wave, ctx.observables[1].direction);
      if (amp > bestAmp) {
        bestAmp = amp;
        bestContext = ctx;
      }
    }
    
    return bestContext;
  },
};
