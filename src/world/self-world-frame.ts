/**
 * Self-World Frame: Combined view of internal symmetry and external observations.
 * 
 * From the ontology:
 * - The frame captures the current state of the R/U/C channels
 * - R (Reference): What counts as a distinction
 * - U (Update): What transformations are active
 * - C (Closure): What has been committed/observed
 */

import { v4 as uuidv4 } from 'uuid';
import { SymmetryPair, createSymmetryPair } from '../core/ontology/symmetry-pair';
import { WaveState, createGroundState, superpose, calculateFidelity } from '../core/ontology/wave-state';
import { HorizonWaveEvent } from './horizon';
import { LogicalTime } from '../core/ontology/time';

export interface SelfWorldFrame {
  id: string;
  selfSymmetry: SymmetryPair;
  worldEvents: HorizonWaveEvent[];
  logicalTime: LogicalTime;
  
  // R/U/C channel states
  referenceState: WaveState;    // R: Current frame/basis
  updateState: WaveState;       // U: Current transformation accumulator
  closureState: WaveState;      // C: Latest committed state
  
  metadata?: Record<string, unknown>;
}

export interface FrameTransition {
  fromFrameId: string;
  toFrameId: string;
  transitionType: 'observation' | 'action' | 'internal' | 'closure';
  deltaR: number;  // Change in reference state
  deltaU: number;  // Change in update state
  deltaC: number;  // Change in closure state
}

/**
 * Create a new self-world frame.
 */
export function createSelfWorldFrame(
  selfWave: WaveState,
  worldEvents: HorizonWaveEvent[],
  logicalTime: LogicalTime
): SelfWorldFrame {
  const selfSymmetry = createSymmetryPair(selfWave);
  
  // Initialize R/U/C from self wave
  const referenceState = selfWave;
  const updateState = createGroundState(selfWave.dimension);
  const closureState = selfWave;
  
  return {
    id: uuidv4(),
    selfSymmetry,
    worldEvents,
    logicalTime,
    referenceState,
    updateState,
    closureState
  };
}

/**
 * Update frame with new world events.
 */
export function updateFrameWithEvents(
  frame: SelfWorldFrame,
  newEvents: HorizonWaveEvent[],
  newLogicalTime: LogicalTime
): SelfWorldFrame {
  // Combine new events with existing
  const allEvents = [...frame.worldEvents, ...newEvents];
  
  // Update U channel: accumulate transformations from events
  let newUpdateState = frame.updateState;
  for (const event of newEvents) {
    newUpdateState = superpose(newUpdateState, event.wave, 0.7);
  }
  
  return {
    ...frame,
    id: uuidv4(),
    worldEvents: allEvents,
    logicalTime: newLogicalTime,
    updateState: newUpdateState
  };
}

/**
 * Apply closure to frame: commit current state.
 */
export function closeFrame(frame: SelfWorldFrame): SelfWorldFrame {
  // C channel becomes the superposition of R and U
  const newClosureState = superpose(frame.referenceState, frame.updateState, 0.5);
  
  // R channel updates to include closure
  const newReferenceState = superpose(frame.referenceState, newClosureState, 0.8);
  
  // U channel resets
  const newUpdateState = createGroundState(frame.updateState.dimension);
  
  return {
    ...frame,
    id: uuidv4(),
    referenceState: newReferenceState,
    updateState: newUpdateState,
    closureState: newClosureState,
    worldEvents: [], // Clear events after closure
    metadata: { ...frame.metadata, closedAt: frame.logicalTime.tick }
  };
}

/**
 * Calculate frame stability: how coherent are the R/U/C channels.
 */
export function calculateFrameStability(frame: SelfWorldFrame): number {
  // Stability based on alignment between channels
  const ruFidelity = calculateFidelity(frame.referenceState, frame.updateState);
  const ucFidelity = calculateFidelity(frame.updateState, frame.closureState);
  const rcFidelity = calculateFidelity(frame.referenceState, frame.closureState);
  
  // High fidelity between R and C, low between U and others = stable
  return rcFidelity * 0.5 + (1 - ruFidelity) * 0.25 + (1 - ucFidelity) * 0.25;
}

/**
 * Calculate frame transition metrics.
 */
export function calculateFrameTransition(
  from: SelfWorldFrame,
  to: SelfWorldFrame,
  transitionType: FrameTransition['transitionType']
): FrameTransition {
  const deltaR = 1 - calculateFidelity(from.referenceState, to.referenceState);
  const deltaU = 1 - calculateFidelity(from.updateState, to.updateState);
  const deltaC = 1 - calculateFidelity(from.closureState, to.closureState);
  
  return {
    fromFrameId: from.id,
    toFrameId: to.id,
    transitionType,
    deltaR,
    deltaU,
    deltaC
  };
}

/**
 * Extract the dominant world signal from frame events.
 */
export function extractWorldSignal(frame: SelfWorldFrame): WaveState | null {
  if (frame.worldEvents.length === 0) return null;
  
  // Combine all event waves
  let combined = frame.worldEvents[0].wave;
  for (let i = 1; i < frame.worldEvents.length; i++) {
    combined = superpose(combined, frame.worldEvents[i].wave, 0.5);
  }
  
  return combined;
}

/**
 * Calculate self-world divergence in the frame.
 */
export function calculateSelfWorldDivergence(frame: SelfWorldFrame): number {
  const worldSignal = extractWorldSignal(frame);
  if (!worldSignal) return 0;
  
  // Divergence between self (positive branch) and world signal
  return 1 - calculateFidelity(frame.selfSymmetry.positive, worldSignal);
}

/**
 * Create a compressed representation of the frame for storage.
 */
export function compressFrame(frame: SelfWorldFrame): {
  id: string;
  tick: number;
  rHash: string;
  uHash: string;
  cHash: string;
  eventCount: number;
} {
  // Simple hash based on first few amplitudes
  const hashWave = (w: WaveState): string => {
    const amps = Array.from(w.amplitudes.slice(0, 8));
    return amps.map(a => a.toFixed(3)).join(',');
  };
  
  return {
    id: frame.id,
    tick: frame.logicalTime.tick,
    rHash: hashWave(frame.referenceState),
    uHash: hashWave(frame.updateState),
    cHash: hashWave(frame.closureState),
    eventCount: frame.worldEvents.length
  };
}
