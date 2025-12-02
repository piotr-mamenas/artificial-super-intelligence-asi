/**
 * KCBS Controller: Agent's selection of pentagram rotation and measurement context.
 * 
 * From the ontology:
 * - Agent chooses which KCBS context (edge) to measure
 * - Pentagram rotation determines the observable directions
 * - This is how the agent controls "what to look at"
 */

import { 
  KCBSPentagram, 
  KCBSPentagramRotation, 
  KCBSContext,
  rotatePentagram,
  getContextFromAngle,
  measureInContext,
  calculateKCBSValue
} from '../core/math/kcbs-graph';
import { SelfWorldFrame } from '../world/self-world-frame';
import { WaveState, getAmplitudes, getProbabilities } from '../core/ontology/wave-state';
import { Complex } from '../core/math/complex';
import { KCBS_ANGLE_SEPARATION } from '../config/kcbs-config';

export interface KCBSController {
  pentagram: KCBSPentagram;
  currentRotation: number;
  currentContextIndex: number;
  
  selectRotation(frame: SelfWorldFrame): KCBSPentagramRotation;
  selectContext(rotation: KCBSPentagramRotation, frame: SelfWorldFrame): KCBSContext;
  measure(state: WaveState, context: KCBSContext): MeasurementResult;
  getRotation(): number;
  getContext(): KCBSContext;
  setRotation(angle: number): void;
  setContext(index: number): void;
}

export interface MeasurementResult {
  contextId: string;
  observableIndex: number;
  outcome: number;
  probability: number;
  newState: WaveState;
  kcbsValue: number;
}

export interface ContextSelectionStrategy {
  name: string;
  select(rotation: KCBSPentagramRotation, frame: SelfWorldFrame): number;
}

/**
 * Create a KCBS controller for a given pentagram.
 */
export function createKCBSController(pentagram: KCBSPentagram): KCBSController {
  let currentRotation = 0;
  let currentContextIndex = 0;
  
  return {
    pentagram,
    currentRotation,
    currentContextIndex,
    
    selectRotation(frame: SelfWorldFrame): KCBSPentagramRotation {
      // Select rotation based on frame's reference state
      const amps = getAmplitudes(frame.referenceState);
      
      // Use dominant amplitude direction to guide rotation
      const dominantIndex = findDominantIndex(amps);
      const targetAngle = (dominantIndex / amps.length) * 2 * Math.PI;
      
      // Smooth rotation toward target
      const angleDiff = normalizeAngle(targetAngle - currentRotation);
      currentRotation = normalizeAngle(currentRotation + angleDiff * 0.3);
      
      return rotatePentagram(this.pentagram, currentRotation);
    },
    
    selectContext(rotation: KCBSPentagramRotation, frame: SelfWorldFrame): KCBSContext {
      // Select context that maximizes information gain
      const probs = getProbabilities(frame.updateState);
      const entropy = calculateEntropy(probs);
      
      // High entropy → explore (random context)
      // Low entropy → exploit (context aligned with dominant direction)
      if (entropy > 2.0) {
        // Exploration: rotate through contexts
        currentContextIndex = (currentContextIndex + 1) % 5;
      } else {
        // Exploitation: select context closest to peak
        const dominantIndex = findDominantIndex(getAmplitudes(frame.updateState));
        const targetAngle = (dominantIndex / probs.length) * 2 * Math.PI;
        currentContextIndex = Math.floor(targetAngle / KCBS_ANGLE_SEPARATION) % 5;
      }
      
      return this.pentagram.contexts[currentContextIndex];
    },
    
    measure(state: WaveState, context: KCBSContext): MeasurementResult {
      // Map wave state to 2D for KCBS measurement
      const amps = getAmplitudes(state);
      const state2D: Complex[] = [
        amps[0] ?? { re: 1, im: 0 },
        amps[1] ?? { re: 0, im: 0 }
      ];
      
      // Measure first observable in context
      const result = measureInContext(context, state2D, 0);
      
      // Calculate KCBS value for this state
      const kcbsValue = calculateKCBSValue(this.pentagram, state2D);
      
      // Reconstruct full wave state from 2D result
      const newAmps: Complex[] = amps.map((a, i) => {
        if (i < 2) return result.newState[i];
        return a;
      });
      
      const newState: WaveState = {
        id: `measured-${Date.now()}`,
        amplitudes: new Float32Array(newAmps.flatMap(c => [c.re, c.im])),
        dimension: amps.length,
        createdAt: Date.now(),
        metadata: { measured: true, contextId: context.id }
      };
      
      return {
        contextId: context.id,
        observableIndex: 0,
        outcome: result.outcome,
        probability: result.probability,
        newState,
        kcbsValue
      };
    },
    
    getRotation(): number {
      return currentRotation;
    },
    
    getContext(): KCBSContext {
      return this.pentagram.contexts[currentContextIndex];
    },
    
    setRotation(angle: number): void {
      currentRotation = normalizeAngle(angle);
    },
    
    setContext(index: number): void {
      currentContextIndex = index % 5;
    }
  };
}

/**
 * Find index of dominant (highest magnitude) amplitude.
 */
function findDominantIndex(amps: Complex[]): number {
  let maxMag = 0;
  let maxIdx = 0;
  
  for (let i = 0; i < amps.length; i++) {
    const mag = amps[i].re * amps[i].re + amps[i].im * amps[i].im;
    if (mag > maxMag) {
      maxMag = mag;
      maxIdx = i;
    }
  }
  
  return maxIdx;
}

/**
 * Normalize angle to [0, 2π).
 */
function normalizeAngle(angle: number): number {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/**
 * Calculate Shannon entropy.
 */
function calculateEntropy(probs: number[]): number {
  let entropy = 0;
  for (const p of probs) {
    if (p > 1e-10) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Context selection strategies.
 */
export const CONTEXT_STRATEGIES: Record<string, ContextSelectionStrategy> = {
  sequential: {
    name: 'Sequential',
    select: (rotation, frame) => {
      // Simply cycle through contexts
      return Math.floor(Date.now() / 1000) % 5;
    }
  },
  
  entropyBased: {
    name: 'Entropy-Based',
    select: (rotation, frame) => {
      const probs = getProbabilities(frame.updateState);
      const entropy = calculateEntropy(probs);
      // Higher entropy → higher context index
      return Math.floor(entropy) % 5;
    }
  },
  
  amplitudeAligned: {
    name: 'Amplitude-Aligned',
    select: (rotation, frame) => {
      const amps = getAmplitudes(frame.referenceState);
      const dominantIdx = findDominantIndex(amps);
      return dominantIdx % 5;
    }
  },
  
  random: {
    name: 'Random',
    select: () => Math.floor(Math.random() * 5)
  },
  
  contextual: {
    name: 'Contextual',
    select: (rotation, frame) => {
      // Use KCBS violation as guide
      const amps = getAmplitudes(frame.closureState);
      const state2D: Complex[] = [amps[0], amps[1] ?? { re: 0, im: 0 }];
      const value = calculateKCBSValue(rotation.pentagram, state2D);
      
      // More negative value → more contextual → explore more
      if (value < -2) {
        return Math.floor(Math.random() * 5);
      } else {
        return findDominantIndex(amps) % 5;
      }
    }
  }
};

/**
 * Create controller with specific strategy.
 */
export function createStrategicController(
  pentagram: KCBSPentagram,
  strategy: ContextSelectionStrategy
): KCBSController {
  const base = createKCBSController(pentagram);
  
  return {
    ...base,
    selectContext(rotation: KCBSPentagramRotation, frame: SelfWorldFrame): KCBSContext {
      const index = strategy.select(rotation, frame);
      base.setContext(index);
      return pentagram.contexts[index];
    }
  };
}
