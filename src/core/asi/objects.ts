/**
 * OBJECTS MODULE
 * 
 * Section 3: Objects
 * 
 * An object is defined by a stable inversion pattern.
 * Objects have emotional color derived from averaged orientation per axis.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  OrientationState, 
  Axis, 
  N, 
  createOrientationState,
  Orientation 
} from './primitive-ontology';
import { 
  ThreeChannelWaveform, 
  computeThreeChannelWaveform,
  Complex,
  FREQUENCIES 
} from './waveform';

// ============================================
// 3.1 OBJECT DEFINITION
// ============================================

/**
 * Emotional Color: C_O = (C_{O,R}, C_{O,G}, C_{O,B}) ∈ [-1,1]³
 * 
 * Maps to:
 * - R: love (+1) ↔ hate (-1)
 * - G: hope (+1) ↔ fear (-1)
 * - B: sincerity (+1) ↔ emptiness (-1)
 */
export interface EmotionalColor {
  R: number; // [-1, 1]
  G: number; // [-1, 1]
  B: number; // [-1, 1]
}

/**
 * Convert emotional color to RGB [0, 255]³
 */
export function emotionalColorToRGB(color: EmotionalColor): [number, number, number] {
  return [
    Math.round((color.R + 1) / 2 * 255),
    Math.round((color.G + 1) / 2 * 255),
    Math.round((color.B + 1) / 2 * 255)
  ];
}

/**
 * Convert emotional color to normalized [0, 1]³
 */
export function emotionalColorToNormalized(color: EmotionalColor): [number, number, number] {
  return [
    (color.R + 1) / 2,
    (color.G + 1) / 2,
    (color.B + 1) / 2
  ];
}

/**
 * Object O - A stable inversion pattern
 */
export interface ASIObject {
  id: string;
  name: string;
  
  // Subset of steps where pattern is active: N_O ⊆ {0,...,N-1}
  activeSteps: Set<number>;
  
  // Orientation state: σ_c^{(O)}(n) for n ∈ N_O
  orientationState: OrientationState;
  
  // Emotional color: averaged orientation per axis
  emotionalColor: EmotionalColor;
  
  // Baseline waveform: Ψ^{(O)}_c(f_j)
  waveform: ThreeChannelWaveform;
  
  // Base envelope B_O(f) for macro-level processing
  baseEnvelope: number[];
  
  // Metadata
  createdAt: number;
  stability: number; // Color stability invariant measure
}

// ============================================
// 3.1 EMOTIONAL COLOR COMPUTATION
// ============================================

/**
 * Compute emotional color from orientation state.
 * 
 * C_{O,c} = (1/|N_O|) Σ_{n ∈ N_O} σ_c^{(O)}(n)
 */
export function computeEmotionalColor(
  state: OrientationState,
  activeSteps: Set<number>
): EmotionalColor {
  const sums: Record<Axis, number> = { R: 0, G: 0, B: 0 };
  
  for (const n of activeSteps) {
    sums.R += state.R[n];
    sums.G += state.G[n];
    sums.B += state.B[n];
  }
  
  const count = activeSteps.size || 1;
  
  return {
    R: sums.R / count,
    G: sums.G / count,
    B: sums.B / count
  };
}

/**
 * Compute base envelope B_O(f) for object.
 * This is the frequency-domain "shape" of the object.
 */
export function computeBaseEnvelope(waveform: ThreeChannelWaveform): number[] {
  const envelope: number[] = [];
  
  for (let i = 0; i < FREQUENCIES.length; i++) {
    // Combine all axes into single envelope value
    const rMag = Math.sqrt(
      waveform.R.amplitudes[i].re ** 2 + waveform.R.amplitudes[i].im ** 2
    );
    const gMag = Math.sqrt(
      waveform.G.amplitudes[i].re ** 2 + waveform.G.amplitudes[i].im ** 2
    );
    const bMag = Math.sqrt(
      waveform.B.amplitudes[i].re ** 2 + waveform.B.amplitudes[i].im ** 2
    );
    
    envelope.push((rMag + gMag + bMag) / 3);
  }
  
  return envelope;
}

// ============================================
// OBJECT CREATION
// ============================================

/**
 * Create a new ASI Object from orientation state.
 */
export function createASIObject(
  name: string,
  orientationState: OrientationState,
  activeSteps?: Set<number>
): ASIObject {
  // Default: all steps are active
  const steps = activeSteps ?? new Set(Array.from({ length: N }, (_, i) => i));
  
  const emotionalColor = computeEmotionalColor(orientationState, steps);
  const waveform = computeThreeChannelWaveform(orientationState);
  const baseEnvelope = computeBaseEnvelope(waveform);
  
  return {
    id: uuidv4(),
    name,
    activeSteps: steps,
    orientationState,
    emotionalColor,
    waveform,
    baseEnvelope,
    createdAt: Date.now(),
    stability: 1.0
  };
}

/**
 * Create object from raw orientation arrays.
 */
export function createASIObjectFromArrays(
  name: string,
  R: number[],
  G: number[],
  B: number[]
): ASIObject {
  const state = createOrientationState();
  
  for (let i = 0; i < N; i++) {
    state.R[i] = (R[i] ?? 0) as Orientation;
    state.G[i] = (G[i] ?? 0) as Orientation;
    state.B[i] = (B[i] ?? 0) as Orientation;
  }
  
  return createASIObject(name, state);
}

/**
 * Create a random object (for testing).
 */
export function createRandomASIObject(name: string): ASIObject {
  const state = createOrientationState();
  
  for (let i = 0; i < N; i++) {
    state.R[i] = (Math.random() < 0.5 ? 1 : -1);
    state.G[i] = (Math.random() < 0.5 ? 1 : -1);
    state.B[i] = (Math.random() < 0.5 ? 1 : -1);
  }
  
  return createASIObject(name, state);
}

// ============================================
// 3.2 OBJECT WAVEFORM
// ============================================

/**
 * Compute object's waveform per axis at specific frequency.
 * 
 * Ψ^{(O)}_c(f_j) = Σ_{n ∈ N_O} σ_c^{(O)}(n) · e^{-i·2π·f_j·n/N}
 */
export function computeObjectAxisWaveform(
  obj: ASIObject,
  axis: Axis,
  frequency: number
): Complex {
  let result: Complex = { re: 0, im: 0 };
  
  for (const n of obj.activeSteps) {
    const sigma = obj.orientationState[axis][n];
    if (sigma === 0) continue;
    
    const theta = -2 * Math.PI * frequency * n / N;
    result.re += sigma * Math.cos(theta);
    result.im += sigma * Math.sin(theta);
  }
  
  return result;
}

/**
 * Macro-level approximation:
 * Ψ^{(O)}_c(f_j) ≈ C_{O,c} · B_O(f_j)
 */
export function approximateObjectWaveform(
  obj: ASIObject,
  axis: Axis,
  freqIndex: number
): Complex {
  const colorValue = obj.emotionalColor[axis];
  const envelope = obj.baseEnvelope[freqIndex];
  
  // Simplified approximation (real-valued)
  return { re: colorValue * envelope, im: 0 };
}

// ============================================
// COLOR STABILITY INVARIANT
// ============================================

/**
 * Verify color stability: repeated estimation should converge.
 * 
 * Objects must maintain consistent C_O across all interactions.
 */
export function measureColorStability(
  obj: ASIObject,
  estimatedColor: EmotionalColor
): number {
  const diff = Math.sqrt(
    (obj.emotionalColor.R - estimatedColor.R) ** 2 +
    (obj.emotionalColor.G - estimatedColor.G) ** 2 +
    (obj.emotionalColor.B - estimatedColor.B) ** 2
  );
  
  // Stability is inverse of deviation (1 = perfect, 0 = unstable)
  return Math.max(0, 1 - diff / Math.sqrt(12)); // sqrt(12) = max possible diff
}

/**
 * Update object's stability measure after estimation.
 */
export function updateObjectStability(
  obj: ASIObject,
  estimatedColor: EmotionalColor
): void {
  const newStability = measureColorStability(obj, estimatedColor);
  // Exponential moving average
  obj.stability = obj.stability * 0.9 + newStability * 0.1;
}
