/**
 * PHASE ENGINE - Unified Quark-Hadron System
 * 
 * Integrates:
 * - Phase space (time/space axes)
 * - Quark flavors (Up/Down, Charm/Strange, Top/Bottom)
 * - Hadron triangles (R/U/C channels)
 * - KCBS pentagram (contextual measurement)
 * - Wave raise/collapse cycle
 * 
 * This replaces the simple orientation-based engine with
 * a proper phase-space foundation for the ASI.
 */

import {
  createFromNothingness,
  firstInversion,
  secondInversion,
  createPhasePoint,
} from './phase-space';

import {
  QuarkState,
  classifyTimeQuark,
  classifySpaceQuark,
} from './quark-flavors';

import {
  HadronTriangle,
  createHadron,
  fullInvertHadron,
  hadronSignature,
  isStableTriangle,
} from './hadron-triangle';

import {
  createKCBSPentagram,
  AgentPolicy,
  coherencePolicy,
} from './kcbs-pentagram';

import {
  WaveCycleState,
  CollapseResult,
  EmotionalState,
  BlackHoleRegion,
  executeWaveCycle,
  computeEmotionalState,
  detectBlackHoles,
} from './wave-collapse';

// ============================================
// PHASE ENGINE STATE
// ============================================

export interface PhaseEngineState {
  // Wave cycle state
  cycle: WaveCycleState;
  
  // Collapse history for learning
  collapseHistory: CollapseResult[];
  maxHistory: number;
  
  // Black hole regions
  blackHoles: BlackHoleRegion[];
  
  // Nested realities (spawned from black holes)
  nestedRealities: PhaseEngineState[];
  
  // Current emotional state
  emotion: EmotionalState;
  
  // Configuration
  policy: AgentPolicy;
}

// ============================================
// ENGINE CREATION
// ============================================

/**
 * Create phase engine from PURE NOTHINGNESS
 * No hardcoded values - everything emerges through inversions
 */
export function createPhaseEngine(policy: AgentPolicy = coherencePolicy): PhaseEngineState {
  // Start from nothingness - the only true starting point
  let wave = createFromNothingness();
  
  // First inversion: birth time axis (this is mathematical, not semantic)
  wave = firstInversion(wave);
  
  // Second inversion: birth space axis (this is mathematical, not semantic)
  wave = secondInversion(wave);
  
  // NO INITIAL HADRONS - they must emerge from inversion attempts
  // Structure arises from the algorithm, not from predefinition
  const hadrons: HadronTriangle[] = [];
  
  // Create KCBS pentagram - this is pure geometry, not semantic
  // The rotation and scale are mathematical structure
  const pentagram = createKCBSPentagram(0, 1);
  
  // Initial cycle state - all zeros, structure emerges
  const cycle: WaveCycleState = {
    hadrons,
    wave,  // Start with the raw nothingness wave
    pentagram,
    focus: 0,       // No focus yet - emerges through dynamics
    dispersion: 0,  // No dispersion yet - emerges through dynamics
    cycleCount: 0,
    totalCollapses: 0,
    successfulInversions: 0,
  };
  
  return {
    cycle,
    collapseHistory: [],
    maxHistory: 1000,
    blackHoles: [],
    nestedRealities: [],
    emotion: { R: 0, G: 0, B: 0, I: 0 },  // No emotion yet - emerges
    policy,
  };
}

// ============================================
// ENGINE OPERATIONS
// ============================================

/**
 * Execute one step of the engine
 */
export function stepPhaseEngine(state: PhaseEngineState): PhaseEngineState {
  // Execute wave cycle
  const { newState: newCycle, result } = executeWaveCycle(state.cycle, state.policy);
  
  // Update collapse history
  const newHistory = [...state.collapseHistory, result];
  if (newHistory.length > state.maxHistory) {
    newHistory.shift();
  }
  
  // Detect black holes periodically
  let blackHoles = state.blackHoles;
  if (newCycle.cycleCount % 100 === 0) {
    blackHoles = detectBlackHoles(newHistory);
  }
  
  // Compute emotional state
  const emotion = computeEmotionalState(newCycle);
  
  return {
    ...state,
    cycle: newCycle,
    collapseHistory: newHistory,
    blackHoles,
    emotion,
  };
}

/**
 * Process input text through the phase engine
 * LEARNING: Reinforces existing similar hadrons, creates new if none match
 */
export function processTextInput(
  state: PhaseEngineState,
  text: string
): { state: PhaseEngineState; result: CollapseResult } {
  // Tokenize
  const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  
  // Track reinforcements (for debugging, not used in return)
  let _reinforced = 0;
  let _created = 0;
  
  // For each token, create or reinforce hadrons
  for (const token of tokens) {
    // Hash token to phase point
    const hash = hashToken(token);
    
    // DUALITY: Use createPhasePoint - space is derived from time
    const phase = createPhasePoint(hash.t % (2 * Math.PI));
    
    // Determine quarks from phase (space quark is dual of time quark)
    const timeQuark = classifyTimeQuark(phase.φ_t);
    const spaceQuark = classifySpaceQuark(phase.φ_s);
    
    // Check if similar hadron already exists
    const SIMILARITY_THRESHOLD = 0.5;  // Phase distance threshold
    let foundMatch = false;
    
    for (const hadron of state.cycle.hadrons) {
      // Check if R vertex is close to this token's phase
      const dist = Math.abs(hadron.R.phase.φ_t - phase.φ_t);
      const normalizedDist = Math.min(dist, 2 * Math.PI - dist);  // Handle wrap-around
      
      if (normalizedDist < SIMILARITY_THRESHOLD) {
        // REINFORCE existing hadron
        hadron.persistence = Math.min(10, hadron.persistence + 0.5);
        hadron.lastSeen = Date.now();
        foundMatch = true;
        _reinforced++;
        break;  // Only reinforce one match per token
      }
    }
    
    // If no match, create new hadron
    if (!foundMatch) {
      const tokenQuark: QuarkState = {
        time: timeQuark,
        space: spaceQuark,
        closure: 'top',
      };
      
      const newHadron = createHadron(
        tokenQuark,
        { ...tokenQuark, closure: 'bottom' },
        tokenQuark
      );
      
      if (isStableTriangle(newHadron)) {
        state.cycle.hadrons.push(newHadron);
        _created++;
      }
    }
  }
  
  // Execute wave cycle
  const { newState, result } = executeWaveCycle(state.cycle, state.policy);
  
  // Update history
  const newHistory = [...state.collapseHistory, result];
  if (newHistory.length > state.maxHistory) {
    newHistory.shift();
  }
  
  return {
    state: {
      ...state,
      cycle: newState,
      collapseHistory: newHistory,
      emotion: computeEmotionalState(newState),
    },
    result,
  };
}

/**
 * Hash token to phase coordinate
 * Uses better distribution across the circle
 */
function hashToken(token: string): { t: number; s: number } {
  // FNV-1a style hash for better distribution
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;  // Keep as 32-bit
  }
  
  // Map to phase circle [0, 2π)
  const t = (hash / 0xFFFFFFFF) * 2 * Math.PI;
  
  // s is derived from t by duality (but we return both for compatibility)
  return { t, s: (2 * Math.PI - t) % (2 * Math.PI) };
}

// ============================================
// INVERSION OPERATIONS
// ============================================

/**
 * Attempt time inversion on all hadrons
 */
export function attemptTimeInversion(state: PhaseEngineState): {
  success: boolean;
  error: number;
  newState: PhaseEngineState;
} {
  const invertedHadrons = state.cycle.hadrons.map(h => fullInvertHadron(h, false));
  
  // Check stability of inverted hadrons
  const stableCount = invertedHadrons.filter(h => isStableTriangle(h)).length;
  const success = stableCount === invertedHadrons.length;
  const error = 1 - stableCount / Math.max(1, invertedHadrons.length);
  
  const newCycle: WaveCycleState = {
    ...state.cycle,
    hadrons: success ? invertedHadrons : state.cycle.hadrons,
  };
  
  return {
    success,
    error,
    newState: { ...state, cycle: newCycle },
  };
}

/**
 * Attempt full inversion (time + space)
 */
export function attemptFullInversion(state: PhaseEngineState): {
  success: boolean;
  error: number;
  newState: PhaseEngineState;
} {
  const invertedHadrons = state.cycle.hadrons.map(h => fullInvertHadron(h, true));
  
  const stableCount = invertedHadrons.filter(h => isStableTriangle(h)).length;
  const success = stableCount === invertedHadrons.length;
  const error = 1 - stableCount / Math.max(1, invertedHadrons.length);
  
  // Update successful inversions count
  const newCycle: WaveCycleState = {
    ...state.cycle,
    hadrons: success ? invertedHadrons : state.cycle.hadrons,
    successfulInversions: state.cycle.successfulInversions + (success ? 1 : 0),
  };
  
  return {
    success,
    error,
    newState: { ...state, cycle: newCycle },
  };
}

// ============================================
// RESPONSE GENERATION
// ============================================

/**
 * Generate response from current phase state
 */
export function generatePhaseResponse(state: PhaseEngineState): string {
  const { cycle, emotion, collapseHistory } = state;
  
  // Get recent successful collapses
  const recentSuccess = collapseHistory
    .slice(-10)
    .filter(c => c.inversionSuccess);
  
  if (recentSuccess.length === 0) {
    // No successful patterns yet
    return `[phase: ${cycle.hadrons.length} hadrons | emotion: R=${emotion.R.toFixed(2)} G=${emotion.G.toFixed(2)} B=${emotion.B.toFixed(2)}]`;
  }
  
  // Build response from hadron signatures
  const signatures = cycle.hadrons
    .filter(h => h.persistence > 0.5)
    .slice(0, 5)
    .map(h => hadronSignature(h));
  
  if (signatures.length === 0) {
    return `[${cycle.cycleCount} cycles | ${emotion.I.toFixed(2)} intensity]`;
  }
  
  return signatures.join(' ');
}

// ============================================
// STATISTICS
// ============================================

export interface PhaseEngineStats {
  hadronCount: number;
  stableHadronCount: number;
  totalCycles: number;
  successRate: number;
  blackHoleCount: number;
  emotion: EmotionalState;
  dominantQuarks: {
    time: 'up' | 'down';
    space: 'charm' | 'strange';
  };
}

export function getPhaseEngineStats(state: PhaseEngineState): PhaseEngineStats {
  const { cycle, blackHoles, emotion } = state;
  
  // Count quark types
  let upCount = 0, downCount = 0, charmCount = 0, strangeCount = 0;
  for (const h of cycle.hadrons) {
    for (const ch of [h.R, h.U, h.C]) {
      if (ch.quark.time === 'up') upCount++; else downCount++;
      if (ch.quark.space === 'charm') charmCount++; else strangeCount++;
    }
  }
  
  return {
    hadronCount: cycle.hadrons.length,
    stableHadronCount: cycle.hadrons.filter(h => isStableTriangle(h)).length,
    totalCycles: cycle.cycleCount,
    successRate: cycle.totalCollapses > 0
      ? cycle.successfulInversions / cycle.totalCollapses
      : 0,
    blackHoleCount: blackHoles.length,
    emotion,
    dominantQuarks: {
      time: upCount >= downCount ? 'up' : 'down',
      space: charmCount >= strangeCount ? 'charm' : 'strange',
    },
  };
}

// ============================================
// EXPORT ENGINE FACTORY
// ============================================

// Re-export types
export type {
  PhasePoint,
  WaveState,
} from './phase-space';

export type { QuarkState } from './quark-flavors';

export type { HadronTriangle } from './hadron-triangle';

export type { KCBSPentagram, AgentPolicy } from './kcbs-pentagram';

export type {
  CollapseResult,
  EmotionalState,
  BlackHoleRegion,
} from './wave-collapse';

// Re-export values
export { randomPolicy, coherencePolicy } from './kcbs-pentagram';
export { STANDARD_HADRONS, createRandomHadron } from './hadron-triangle';
