/**
 * HADRON TRIANGLES - Stable Bound States
 * 
 * A hadron is a triangle in phase space formed by three channel phases:
 *   R (Reference) - the chosen frame/viewpoint
 *   U (Update)    - how state evolves
 *   C (Closure)   - how state commits to memory
 * 
 * Each vertex has a quark assignment.
 * Stability = phase coherence + bounded area + historical persistence.
 */

import {
  PhasePoint,
  PhaseSpread,
  WaveState,
  WaveBlob,
  phaseDistance,
  phaseDiff,
  timeInversion,
  spaceInversion,
  fullInversion,
  addBlob,
  createEmptyWaveState,
} from './phase-space';

import {
  QuarkState,
  quarkToPhase,
  closureToSpread,
  fullInvertQuark,
  quarkStateToString,
  isColorNeutral,
} from './quark-flavors';

// ============================================
// CHANNEL TYPES
// ============================================

export type Channel = 'R' | 'U' | 'C';

export interface ChannelState {
  phase: PhasePoint;
  spread: PhaseSpread;
  quark: QuarkState;
}

// ============================================
// HADRON TRIANGLE
// ============================================

export interface HadronTriangle {
  id: string;
  
  // Three vertices (R, U, C channels)
  R: ChannelState;  // Reference
  U: ChannelState;  // Update
  C: ChannelState;  // Closure
  
  // Stability metrics
  area: number;           // Triangle area in phase space
  coherence: number;      // Phase coherence (0-1)
  persistence: number;    // Historical recurrence count
  
  // Metadata
  createdAt: number;
  lastSeen: number;
}

// ============================================
// TRIANGLE GEOMETRY
// ============================================

/**
 * Compute triangle area using cross product
 */
export function computeTriangleArea(R: PhasePoint, U: PhasePoint, C: PhasePoint): number {
  const RU = phaseDiff(U, R);
  const RC = phaseDiff(C, R);
  
  // 2D cross product magnitude = area of parallelogram / 2
  return Math.abs(RU.φ_t * RC.φ_s - RU.φ_s * RC.φ_t) / 2;
}

/**
 * Compute phase coherence of triangle
 * High coherence = small, regular triangle
 */
export function computeTriangleCoherence(h: HadronTriangle): number {
  // Average spread (lower = more coherent)
  const avgSpread = (
    h.R.spread.σ_t + h.R.spread.σ_s +
    h.U.spread.σ_t + h.U.spread.σ_s +
    h.C.spread.σ_t + h.C.spread.σ_s
  ) / 6;
  
  // Area penalty (larger = less coherent)
  const areaPenalty = h.area / (Math.PI * Math.PI);
  
  // Coherence inversely related to spread and area
  return 1 / (1 + avgSpread + areaPenalty);
}

/**
 * Check if triangle satisfies stability conditions
 */
export function isStableTriangle(h: HadronTriangle): boolean {
  // Condition 1: Area not too large
  const maxArea = Math.PI;  // ~half the phase plane
  if (h.area > maxArea) return false;
  
  // Condition 2: Coherence above threshold
  if (h.coherence < 0.1) return false;
  
  // Condition 3: Color neutrality (all three quarks together)
  const quarks = [h.R.quark, h.U.quark, h.C.quark];
  if (!isColorNeutral(quarks)) return false;
  
  return true;
}

// ============================================
// HADRON CREATION
// ============================================

let hadronCounter = 0;

function generateHadronId(): string {
  return `hadron_${++hadronCounter}_${Date.now()}`;
}

/**
 * Create a channel state from quark assignment
 */
export function createChannelState(quark: QuarkState): ChannelState {
  return {
    phase: quarkToPhase(quark),
    spread: closureToSpread(quark.closure),
    quark,
  };
}

/**
 * Create hadron from three quark assignments
 */
export function createHadron(
  rQuark: QuarkState,
  uQuark: QuarkState,
  cQuark: QuarkState
): HadronTriangle {
  const R = createChannelState(rQuark);
  const U = createChannelState(uQuark);
  const C = createChannelState(cQuark);
  
  const area = computeTriangleArea(R.phase, U.phase, C.phase);
  const now = Date.now();
  
  const hadron: HadronTriangle = {
    id: generateHadronId(),
    R, U, C,
    area,
    coherence: 0,  // Will be computed
    persistence: 1,
    createdAt: now,
    lastSeen: now,
  };
  
  hadron.coherence = computeTriangleCoherence(hadron);
  
  return hadron;
}

/**
 * Create random hadron (for initialization)
 */
export function createRandomHadron(): HadronTriangle {
  const timeQuarks = ['up', 'down'] as const;
  const spaceQuarks = ['charm', 'strange'] as const;
  const closureQuarks = ['top', 'bottom'] as const;
  
  const randomQuark = (): QuarkState => ({
    time: timeQuarks[Math.floor(Math.random() * 2)],
    space: spaceQuarks[Math.floor(Math.random() * 2)],
    closure: closureQuarks[Math.floor(Math.random() * 2)],
  });
  
  return createHadron(randomQuark(), randomQuark(), randomQuark());
}

// ============================================
// HADRON INVERSION
// ============================================

/**
 * Apply time inversion to hadron
 */
export function timeInvertHadron(h: HadronTriangle): HadronTriangle {
  const invertChannel = (ch: ChannelState): ChannelState => ({
    phase: timeInversion(ch.phase),
    spread: ch.spread,
    quark: { ...ch.quark, time: ch.quark.time === 'up' ? 'down' : 'up' },
  });
  
  return {
    ...h,
    id: generateHadronId(),
    R: invertChannel(h.R),
    U: invertChannel(h.U),
    C: invertChannel(h.C),
  };
}

/**
 * Apply space inversion to hadron
 */
export function spaceInvertHadron(h: HadronTriangle): HadronTriangle {
  const invertChannel = (ch: ChannelState): ChannelState => ({
    phase: spaceInversion(ch.phase),
    spread: ch.spread,
    quark: { ...ch.quark, space: ch.quark.space === 'charm' ? 'strange' : 'charm' },
  });
  
  return {
    ...h,
    id: generateHadronId(),
    R: invertChannel(h.R),
    U: invertChannel(h.U),
    C: invertChannel(h.C),
  };
}

/**
 * Apply full inversion to hadron
 */
export function fullInvertHadron(h: HadronTriangle, invertClosure: boolean = false): HadronTriangle {
  const invertChannel = (ch: ChannelState): ChannelState => ({
    phase: fullInversion(ch.phase),
    spread: ch.spread,
    quark: fullInvertQuark(ch.quark, invertClosure),
  });
  
  return {
    ...h,
    id: generateHadronId(),
    R: invertChannel(h.R),
    U: invertChannel(h.U),
    C: invertChannel(h.C),
  };
}

/**
 * Check if hadron is self-dual under full inversion
 */
export function isSelfDualHadron(h: HadronTriangle): boolean {
  const inverted = fullInvertHadron(h);
  
  // Check if all phases are close to their inverted versions
  const tolerance = 0.3;
  return (
    phaseDistance(h.R.phase, inverted.R.phase) < tolerance &&
    phaseDistance(h.U.phase, inverted.U.phase) < tolerance &&
    phaseDistance(h.C.phase, inverted.C.phase) < tolerance
  );
}

// ============================================
// WAVE RAISE FROM HADRONS
// ============================================

/**
 * Raise hadron to wave state
 * Creates blobs at each vertex
 */
export function raiseHadronToWave(h: HadronTriangle): WaveState {
  let state = createEmptyWaveState();
  
  // Add blob for each channel
  for (const channel of [h.R, h.U, h.C]) {
    const blob: WaveBlob = {
      center: channel.phase,
      spread: channel.spread,
      amplitude: h.coherence,
    };
    state = addBlob(state, blob);
  }
  
  return state;
}

/**
 * Raise multiple hadrons to superposed wave state
 */
export function raiseHadronsToWave(hadrons: HadronTriangle[]): WaveState {
  let state = createEmptyWaveState();
  
  for (const h of hadrons) {
    const hadronWave = raiseHadronToWave(h);
    for (const blob of hadronWave.blobs) {
      state = addBlob(state, blob);
    }
  }
  
  return state;
}

// ============================================
// HADRON MATCHING
// ============================================

/**
 * Compute similarity between two hadrons
 */
export function hadronSimilarity(a: HadronTriangle, b: HadronTriangle): number {
  // Distance between corresponding vertices
  const distR = phaseDistance(a.R.phase, b.R.phase);
  const distU = phaseDistance(a.U.phase, b.U.phase);
  const distC = phaseDistance(a.C.phase, b.C.phase);
  
  const totalDist = distR + distU + distC;
  
  // Similarity inversely related to distance
  return 1 / (1 + totalDist);
}

/**
 * Find most similar hadron in collection
 */
export function findSimilarHadron(
  target: HadronTriangle,
  candidates: HadronTriangle[]
): HadronTriangle | null {
  if (candidates.length === 0) return null;
  
  let best = candidates[0];
  let bestSim = hadronSimilarity(target, best);
  
  for (let i = 1; i < candidates.length; i++) {
    const sim = hadronSimilarity(target, candidates[i]);
    if (sim > bestSim) {
      bestSim = sim;
      best = candidates[i];
    }
  }
  
  return best;
}

// ============================================
// HADRON SIGNATURE
// ============================================

/**
 * Get compact string representation of hadron
 */
export function hadronSignature(h: HadronTriangle): string {
  const r = quarkStateToString(h.R.quark);
  const u = quarkStateToString(h.U.quark);
  const c = quarkStateToString(h.C.quark);
  return `[${r}|${u}|${c}]`;
}

/**
 * Standard hadron types (like proton = uud)
 */
export const STANDARD_HADRONS = {
  // Proton-like: mostly up-quarks, forward time
  proton: () => createHadron(
    { time: 'up', space: 'charm', closure: 'top' },
    { time: 'up', space: 'charm', closure: 'top' },
    { time: 'down', space: 'charm', closure: 'top' }
  ),
  
  // Neutron-like: balanced
  neutron: () => createHadron(
    { time: 'up', space: 'charm', closure: 'top' },
    { time: 'down', space: 'charm', closure: 'top' },
    { time: 'down', space: 'charm', closure: 'top' }
  ),
  
  // Strange hadron: has strange quark
  lambda: () => createHadron(
    { time: 'up', space: 'strange', closure: 'top' },
    { time: 'down', space: 'charm', closure: 'top' },
    { time: 'up', space: 'charm', closure: 'bottom' }
  ),
  
  // Heavy hadron: all bottom (soft closure)
  omega: () => createHadron(
    { time: 'down', space: 'strange', closure: 'bottom' },
    { time: 'down', space: 'strange', closure: 'bottom' },
    { time: 'down', space: 'strange', closure: 'bottom' }
  ),
};
