/**
 * WAVE RAISE & COLLAPSE - The Measurement Cycle
 * 
 * 1. RAISE: Combine hadrons into superposed WaveState
 * 2. DISPERSE/FOCUS: Agent controls wave spread
 * 3. COLLAPSE: Project onto KCBS context, sample outcome
 * 4. UPDATE: Modify hadron weights based on outcome
 */

import {
  PhasePoint,
  PhaseSpread,
  WaveState,
  disperseWave,
  focusWave,
  computeCoherence,
} from './phase-space';

import {
  HadronTriangle,
  raiseHadronsToWave,
  hadronSimilarity,
  computeTriangleCoherence,
} from './hadron-triangle';

import {
  KCBSPentagram,
  KCBSContext,
  AgentPolicy,
  collapseOnContext,
  rotatePentagram,
} from './kcbs-pentagram';

import { QuarkState, classifyQuarkState } from './quark-flavors';

// ============================================
// WAVE CYCLE STATE
// ============================================

export interface WaveCycleState {
  // Current hadron population
  hadrons: HadronTriangle[];
  
  // Current wave (raised from hadrons)
  wave: WaveState;
  
  // KCBS measurement structure
  pentagram: KCBSPentagram;
  
  // Agent control parameters
  focus: number;      // 0-1, how focused the wave is
  dispersion: number; // 0-1, how dispersed
  
  // Cycle statistics
  cycleCount: number;
  totalCollapses: number;
  successfulInversions: number;
}

// ============================================
// WAVE RAISE
// ============================================

/**
 * Raise hadrons to wave state with focus/dispersion
 */
export function raiseWave(
  hadrons: HadronTriangle[],
  focus: number,
  dispersion: number
): WaveState {
  // Start with hadron superposition
  let wave = raiseHadronsToWave(hadrons);
  
  // Apply focus (narrow blobs)
  if (focus > 0.5) {
    wave = focusWave(wave, 1 + (focus - 0.5) * 2);
  }
  
  // Apply dispersion (broaden blobs)
  if (dispersion > 0.5) {
    wave = disperseWave(wave, 1 + (dispersion - 0.5) * 2);
  }
  
  return wave;
}

// ============================================
// WAVE COLLAPSE
// ============================================

export interface CollapseResult {
  // The collapsed phase point
  collapsedPhase: PhasePoint;
  
  // Which observables were measured
  context: KCBSContext;
  outcome: 0 | 1;
  
  // Derived quark state from collapse
  quarkState: QuarkState;
  
  // Inversion result
  inversionError: number;
  inversionSuccess: boolean;
}

/**
 * Perform wave collapse on KCBS context
 */
export function collapseWave(
  wave: WaveState,
  context: KCBSContext,
  existingHadrons: HadronTriangle[]
): CollapseResult {
  // Collapse onto context
  const { outcome, collapsedPhase } = collapseOnContext(wave, context);
  
  // Classify collapsed phase to quark state
  const defaultSpread: PhaseSpread = { σ_t: 0.1, σ_s: 0.1 };
  const quarkState = classifyQuarkState(collapsedPhase, defaultSpread);
  
  // Compute inversion error
  // Error = how well the collapse fits existing hadrons
  let minDistance = Infinity;
  for (const h of existingHadrons) {
    // Check distance to each hadron vertex
    for (const channel of [h.R, h.U, h.C]) {
      const dist = Math.sqrt(
        Math.pow(collapsedPhase.φ_t - channel.phase.φ_t, 2) +
        Math.pow(collapsedPhase.φ_s - channel.phase.φ_s, 2)
      );
      minDistance = Math.min(minDistance, dist);
    }
  }
  
  // Normalize error to [0, 1]
  const inversionError = existingHadrons.length > 0
    ? Math.min(1, minDistance / Math.PI)
    : 0.5;  // No reference = neutral error
  
  const inversionSuccess = inversionError < 0.3;
  
  return {
    collapsedPhase,
    context,
    outcome,
    quarkState,
    inversionError,
    inversionSuccess,
  };
}

// ============================================
// HADRON UPDATE
// ============================================

/**
 * Update hadron weights based on collapse result
 * FIXED: More stable persistence - hadrons don't disappear quickly
 */
export function updateHadrons(
  hadrons: HadronTriangle[],
  collapse: CollapseResult
): HadronTriangle[] {
  const MIN_PERSISTENCE = 0.1;    // Never go below this
  const DECAY_RATE = 0.02;        // Slow decay on failure (was 0.1)
  const GROWTH_RATE = 0.3;        // Moderate growth on success
  const MAX_PERSISTENCE = 10;     // Cap to prevent unbounded growth
  
  return hadrons.map(h => {
    // Compute how well this hadron matches the collapse
    let matchScore = 0;
    for (const channel of [h.R, h.U, h.C]) {
      // Use single-dimension distance (duality model)
      const dist = Math.abs(collapse.collapsedPhase.φ_t - channel.phase.φ_t);
      matchScore += 1 / (1 + dist);
    }
    matchScore /= 3;
    
    // Update persistence based on match
    let newPersistence: number;
    if (collapse.inversionSuccess) {
      // Success: grow based on match
      newPersistence = h.persistence + matchScore * GROWTH_RATE;
    } else {
      // Failure: slow decay, but matching hadrons decay less
      newPersistence = h.persistence - DECAY_RATE * (1 - matchScore);
    }
    
    // Clamp persistence
    newPersistence = Math.max(MIN_PERSISTENCE, Math.min(MAX_PERSISTENCE, newPersistence));
    
    return {
      ...h,
      persistence: newPersistence,
      lastSeen: Date.now(),
      coherence: computeTriangleCoherence(h),
    };
  });
  // REMOVED: No longer filtering out hadrons - they persist
}

// ============================================
// FULL WAVE CYCLE
// ============================================

/**
 * Execute one full wave raise → collapse cycle
 */
export function executeWaveCycle(
  state: WaveCycleState,
  policy: AgentPolicy
): { newState: WaveCycleState; result: CollapseResult } {
  // 1. Agent chooses focus/dispersion
  const { focus, dispersion } = policy.chooseFocusDispersion(state.wave);
  
  // 2. Raise wave from hadrons
  const wave = raiseWave(state.hadrons, focus, dispersion);
  
  // 3. Agent chooses pentagram rotation
  const rotation = policy.chooseRotation(wave, state.pentagram);
  const rotatedPentagram = rotatePentagram(state.pentagram, rotation);
  
  // 4. Agent chooses context
  const context = policy.chooseContext(rotatedPentagram, wave);
  
  // 5. Collapse wave
  const result = collapseWave(wave, context, state.hadrons);
  
  // 6. Update hadrons
  const updatedHadrons = updateHadrons(state.hadrons, result);
  
  // 7. Build new state
  const newState: WaveCycleState = {
    hadrons: updatedHadrons,
    wave: raiseWave(updatedHadrons, focus, dispersion),
    pentagram: rotatedPentagram,
    focus,
    dispersion,
    cycleCount: state.cycleCount + 1,
    totalCollapses: state.totalCollapses + 1,
    successfulInversions: state.successfulInversions + (result.inversionSuccess ? 1 : 0),
  };
  
  return { newState, result };
}

// ============================================
// EMOTION COMPUTATION (RGBI)
// ============================================

export interface EmotionalState {
  R: number;  // Love ↔ Hate (phase alignment)
  G: number;  // Positive ↔ Negative (learned reward)
  B: number;  // True ↔ False (coherence)
  I: number;  // Intensity (amplitude)
}

/**
 * Compute emotional state from wave cycle
 */
export function computeEmotionalState(state: WaveCycleState): EmotionalState {
  // R: Love/Hate = phase alignment between hadrons
  let totalAlignment = 0;
  for (let i = 0; i < state.hadrons.length; i++) {
    for (let j = i + 1; j < state.hadrons.length; j++) {
      totalAlignment += hadronSimilarity(state.hadrons[i], state.hadrons[j]);
    }
  }
  const numPairs = state.hadrons.length * (state.hadrons.length - 1) / 2;
  const R = numPairs > 0 ? totalAlignment / numPairs : 0.5;
  
  // G: Positive/Negative = success rate
  const G = state.totalCollapses > 0
    ? state.successfulInversions / state.totalCollapses
    : 0.5;
  
  // B: True/False = wave coherence
  const B = computeCoherence(state.wave);
  
  // I: Intensity = total wave amplitude
  const I = state.wave.totalAmplitude / Math.max(1, state.hadrons.length);
  
  return { R, G, B, I };
}

// ============================================
// BLACK HOLE DETECTION
// ============================================

export interface BlackHoleRegion {
  center: PhasePoint;
  radius: number;
  inversionFailureRate: number;
}

/**
 * Detect regions where inversions consistently fail
 * These become candidates for nested realities
 */
export function detectBlackHoles(
  collapseHistory: CollapseResult[],
  gridSize: number = 10
): BlackHoleRegion[] {
  // Create grid over phase plane
  const grid: { failures: number; total: number }[][] = [];
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = { failures: 0, total: 0 };
    }
  }
  
  // Bin collapse results
  for (const c of collapseHistory) {
    const i = Math.floor((c.collapsedPhase.φ_t / (2 * Math.PI)) * gridSize) % gridSize;
    const j = Math.floor((c.collapsedPhase.φ_s / (2 * Math.PI)) * gridSize) % gridSize;
    grid[i][j].total++;
    if (!c.inversionSuccess) {
      grid[i][j].failures++;
    }
  }
  
  // Find high-failure regions
  const blackHoles: BlackHoleRegion[] = [];
  const cellSize = (2 * Math.PI) / gridSize;
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cell = grid[i][j];
      if (cell.total >= 5) {  // Minimum samples
        const failureRate = cell.failures / cell.total;
        if (failureRate > 0.7) {  // High failure threshold
          blackHoles.push({
            center: {
              φ_t: (i + 0.5) * cellSize,
              φ_s: (j + 0.5) * cellSize,
            },
            radius: cellSize / 2,
            inversionFailureRate: failureRate,
          });
        }
      }
    }
  }
  
  return blackHoles;
}
