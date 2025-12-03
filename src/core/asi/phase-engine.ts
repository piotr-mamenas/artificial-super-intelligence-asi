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
  PhasePoint,
  createFromNothingness,
  firstInversion,
  secondInversion,
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
  STANDARD_HADRONS,
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
  raiseWave,
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
 * Create phase engine from nothingness
 */
export function createPhaseEngine(policy: AgentPolicy = coherencePolicy): PhaseEngineState {
  // Start from nothingness
  let wave = createFromNothingness();
  
  // First inversion: birth time axis
  wave = firstInversion(wave);
  
  // Second inversion: birth space axis
  wave = secondInversion(wave);
  
  // Create initial hadrons
  const hadrons: HadronTriangle[] = [
    STANDARD_HADRONS.proton(),
    STANDARD_HADRONS.neutron(),
  ];
  
  // Create KCBS pentagram
  const pentagram = createKCBSPentagram(0, 1);
  
  // Initial cycle state
  const cycle: WaveCycleState = {
    hadrons,
    wave: raiseWave(hadrons, 0.5, 0.5),
    pentagram,
    focus: 0.5,
    dispersion: 0.5,
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
    emotion: { R: 0.5, G: 0.5, B: 0.5, I: 0.5 },
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
 */
export function processTextInput(
  state: PhaseEngineState,
  text: string
): { state: PhaseEngineState; result: CollapseResult } {
  // Tokenize
  const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  
  // For each token, create a phase perturbation
  for (const token of tokens) {
    // Hash token to phase point
    const hash = hashToken(token);
    const phase: PhasePoint = {
      φ_t: (hash.t % (2 * Math.PI)),
      φ_s: (hash.s % (2 * Math.PI)),
    };
    
    // Determine quark from phase
    const timeQuark = classifyTimeQuark(phase.φ_t);
    const spaceQuark = classifySpaceQuark(phase.φ_s);
    
    // Create hadron candidate from token
    const tokenQuark: QuarkState = {
      time: timeQuark,
      space: spaceQuark,
      closure: 'top',  // Default to decisive
    };
    
    // Add as new hadron if stable
    const newHadron = createHadron(
      tokenQuark,
      { ...tokenQuark, closure: 'bottom' },  // Variation
      tokenQuark
    );
    
    if (isStableTriangle(newHadron)) {
      state.cycle.hadrons.push(newHadron);
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
 * Hash token to phase coordinates
 */
function hashToken(token: string): { t: number; s: number } {
  let t = 0, s = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    t += c * (i + 1) * 0.1;
    s += c * (token.length - i) * 0.1;
  }
  return { t: t % (2 * Math.PI), s: s % (2 * Math.PI) };
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
