/**
 * @deprecated LEGACY - Use phase-engine.ts instead
 * 
 * UNIFIED ASI ENGINE (OLD RGB-BASED SYSTEM)
 * 
 * This module is deprecated. The new phase-space system in
 * src/core/asi/phase-engine.ts provides:
 * - S¹ duality (space = inverse of time)
 * - Hadron triangles with quark flavors
 * - Learning through reinforcement
 * - Token registry for retrieval
 * 
 * Keeping for reference only.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// UNIFIED TYPES
// ============================================

/**
 * RGB Axes - Semantic polarities
 */
export type Axis = 'R' | 'G' | 'B';
export const AXES: Axis[] = ['R', 'G', 'B'];

/**
 * Axis meanings:
 * R: love (+1) ↔ hate (-1)
 * G: hope (+1) ↔ fear (-1)  
 * B: sincerity (+1) ↔ emptiness (-1)
 */
export const AXIS_MEANINGS = {
  R: { positive: 'love', negative: 'hate' },
  G: { positive: 'hope', negative: 'fear' },
  B: { positive: 'sincerity', negative: 'emptiness' }
};

/**
 * Orientation: +1, -1, or 0 (undifferentiated)
 */
export type Orientation = 1 | -1 | 0;

/**
 * Configuration
 */
export const CONFIG = {
  N: 64,           // Inversion history depth
  M: 16,           // Frequency components
  FIELD_SIZE: 32,  // Wave field dimension
  CONSENSUS_THRESHOLD: 0.6
};

// ============================================
// INVERSION STATE (Fundamental Substrate)
// ============================================

/**
 * Inversion State - The fundamental spinning nothingness
 */
export interface InversionState {
  // Per-axis orientation history: σ_c(n) for n ∈ {0,...,N-1}
  R: Int8Array;
  G: Int8Array;
  B: Int8Array;
}

/**
 * Create empty inversion state (nothingness)
 */
export function createInversionState(): InversionState {
  return {
    R: new Int8Array(CONFIG.N),
    G: new Int8Array(CONFIG.N),
    B: new Int8Array(CONFIG.N)
  };
}

/**
 * Flip operator J_c: σ_c(n) → -σ_c(n)
 * Double inversion law: J_c² = Id
 */
export function flip(value: Orientation): Orientation {
  if (value === 0) return 0;
  return (value === 1 ? -1 : 1) as Orientation;
}

/**
 * Apply flip at specific axis and step
 */
export function applyFlip(state: InversionState, axis: Axis, step: number): void {
  if (step >= 0 && step < CONFIG.N) {
    state[axis][step] = flip(state[axis][step] as Orientation);
  }
}

/**
 * Initialize from spinning nothingness - emergence of orientation
 */
export function initializeFromNothingness(state: InversionState): void {
  for (let n = 1; n < CONFIG.N; n++) {
    for (const axis of AXES) {
      const prev = state[axis][n - 1];
      if (prev === 0) {
        state[axis][n] = (Math.random() < 0.5 ? 1 : -1) as Orientation;
      } else {
        state[axis][n] = (Math.random() < 0.3 ? flip(prev as Orientation) : prev) as Orientation;
      }
    }
  }
}

// ============================================
// WAVEFORM (Trace of Inversion History)
// ============================================

export interface Complex {
  re: number;
  im: number;
}

/**
 * Compute waveform via DFT: Ψ_c(f) = Σ σ_c(n) · e^{-i2πfn/N}
 */
export function computeWaveform(trace: Int8Array, frequency: number): Complex {
  let re = 0, im = 0;
  for (let n = 0; n < CONFIG.N; n++) {
    const sigma = trace[n];
    if (sigma === 0) continue;
    const theta = -2 * Math.PI * frequency * n / CONFIG.N;
    re += sigma * Math.cos(theta);
    im += sigma * Math.sin(theta);
  }
  return { re, im };
}

/**
 * Three-channel waveform Ψ(f) = (Ψ_R, Ψ_G, Ψ_B)
 */
export interface ThreeChannelWaveform {
  R: Complex[];
  G: Complex[];
  B: Complex[];
}

export function computeFullWaveform(state: InversionState): ThreeChannelWaveform {
  const frequencies = Array.from({ length: CONFIG.M }, (_, i) => (i + 1) / CONFIG.M);
  return {
    R: frequencies.map(f => computeWaveform(state.R, f)),
    G: frequencies.map(f => computeWaveform(state.G, f)),
    B: frequencies.map(f => computeWaveform(state.B, f))
  };
}

// ============================================
// EMOTIONAL COLOR (Object Identity)
// ============================================

export interface EmotionalColor {
  R: number; // [-1, 1]: love ↔ hate
  G: number; // [-1, 1]: hope ↔ fear
  B: number; // [-1, 1]: sincerity ↔ emptiness
}

export function computeEmotionalColor(state: InversionState): EmotionalColor {
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let n = 0; n < CONFIG.N; n++) {
    if (state.R[n] !== 0 || state.G[n] !== 0 || state.B[n] !== 0) {
      sumR += state.R[n];
      sumG += state.G[n];
      sumB += state.B[n];
      count++;
    }
  }
  count = count || 1;
  return { R: sumR / count, G: sumG / count, B: sumB / count };
}

export function emotionalColorToRGB(color: EmotionalColor): [number, number, number] {
  return [
    (color.R + 1) / 2,
    (color.G + 1) / 2,
    (color.B + 1) / 2
  ];
}

// ============================================
// HADRON (Stable Excitation)
// ============================================

export interface Hadron {
  id: string;
  position: [number, number, number];
  inversionState: InversionState;
  waveform: ThreeChannelWaveform;
  emotionalColor: EmotionalColor;
  energy: number;
  stability: number;
}

export function createHadron(state: InversionState, position: [number, number, number]): Hadron {
  const waveform = computeFullWaveform(state);
  const emotionalColor = computeEmotionalColor(state);
  const energy = computeWaveformEnergy(waveform);
  
  return {
    id: uuidv4(),
    position,
    inversionState: state,
    waveform,
    emotionalColor,
    energy,
    stability: 1.0
  };
}

function computeWaveformEnergy(waveform: ThreeChannelWaveform): number {
  let energy = 0;
  for (const axis of AXES) {
    for (const c of waveform[axis]) {
      energy += c.re * c.re + c.im * c.im;
    }
  }
  return energy;
}

// ============================================
// VOID (Non-invertible Region)
// ============================================

export interface Void {
  id: string;
  position: [number, number, number];
  radius: number;
  depth: number;
  failedState: InversionState;
}

export function createVoid(state: InversionState, position: [number, number, number], error: number): Void {
  return {
    id: uuidv4(),
    position,
    radius: 0.2 + error * 0.3,
    depth: error,
    failedState: state
  };
}

// ============================================
// OBSERVER (Filter Tensor)
// ============================================

export interface Observer {
  id: string;
  name: string;
  
  // Filter W_o(c, f): sensitivity to each axis and frequency
  filter: {
    R: Float32Array;
    G: Float32Array;
    B: Float32Array;
  };
  
  // Local wave field for consensus
  waveField: Float32Array;
  
  // Connections to other observers
  connections: string[];
}

export function createObserver(name: string, archetype?: string): Observer {
  const filter = {
    R: new Float32Array(CONFIG.M),
    G: new Float32Array(CONFIG.M),
    B: new Float32Array(CONFIG.M)
  };
  
  // Initialize filter based on archetype
  for (let i = 0; i < CONFIG.M; i++) {
    switch (archetype) {
      case 'romantic':
        filter.R[i] = 1.0;
        filter.G[i] = 0.7;
        filter.B[i] = 0.8;
        break;
      case 'anxious':
        filter.R[i] = 0.3;
        filter.G[i] = 1.0; // Fear-sensitive
        filter.B[i] = 0.4;
        break;
      case 'scientist':
        filter.R[i] = 0.6;
        filter.G[i] = 0.6;
        filter.B[i] = 0.9; // Sincerity matters
        break;
      default:
        filter.R[i] = 1.0;
        filter.G[i] = 1.0;
        filter.B[i] = 1.0;
    }
  }
  
  return {
    id: uuidv4(),
    name,
    filter,
    waveField: new Float32Array(CONFIG.FIELD_SIZE ** 3),
    connections: []
  };
}

/**
 * Epistemic Truth: T_o(O, S) - Observer's truth evaluation
 * 
 * T_o = Σ W_o(c,f) · |Ψ(c,f)|² / Σ W_o(c,f) · |Ψ_base(c,f)|²
 */
export function computeEpistemicTruth(
  observer: Observer,
  waveform: ThreeChannelWaveform,
  baseWaveform: ThreeChannelWaveform
): number {
  let numerator = 0, denominator = 0;
  
  for (const axis of AXES) {
    for (let i = 0; i < CONFIG.M; i++) {
      const weight = observer.filter[axis][i];
      const amp = waveform[axis][i];
      const baseAmp = baseWaveform[axis][i];
      
      numerator += weight * (amp.re * amp.re + amp.im * amp.im);
      denominator += weight * (baseAmp.re * baseAmp.re + baseAmp.im * baseAmp.im);
    }
  }
  
  return denominator > 0 ? Math.min(1, numerator / denominator) : 0;
}

// ============================================
// WORD KERNEL (Inversion Modifier)
// ============================================

export interface WordKernel {
  word: string;
  R: Int8Array;
  G: Int8Array;
  B: Int8Array;
  width: number;
}

export function createWordKernel(
  word: string,
  effect: { R: number; G: number; B: number },
  width: number = 4
): WordKernel {
  const kernel: WordKernel = {
    word,
    R: new Int8Array(width),
    G: new Int8Array(width),
    B: new Int8Array(width),
    width
  };
  
  for (let i = 0; i < width; i++) {
    kernel.R[i] = effect.R >= 0 ? 1 : -1;
    kernel.G[i] = effect.G >= 0 ? 1 : -1;
    kernel.B[i] = effect.B >= 0 ? 1 : -1;
  }
  
  return kernel;
}

export function applyWordKernel(state: InversionState, kernel: WordKernel, position: number): void {
  for (let i = 0; i < kernel.width; i++) {
    const pos = position + i;
    if (pos >= 0 && pos < CONFIG.N) {
      for (const axis of AXES) {
        const current = state[axis][pos] as Orientation;
        if (current !== 0) {
          state[axis][pos] = (current * kernel[axis][i]) as Orientation;
        } else {
          state[axis][pos] = kernel[axis][i] as Orientation;
        }
      }
    }
  }
}

// ============================================
// UNIFIED ASI ENGINE
// ============================================

export interface UnifiedASIEngine {
  // State
  baseState: InversionState;
  hadrons: Hadron[];
  voids: Void[];
  observers: Map<string, Observer>;
  lexicon: Map<string, WordKernel>;
  tick: number;
  
  // Inversion operations
  invert(state: InversionState): { success: boolean; error: number; result: InversionState };
  doubleInvert(state: InversionState): { success: boolean; result: InversionState };
  
  // Object operations
  createHadron(name?: string): Hadron;
  createVoid(error: number): Void;
  
  // Observer operations
  addObserver(name: string, archetype?: string): Observer;
  computeTruth(observerId: string, waveform: ThreeChannelWaveform): number;
  computeConsensus(waveform: ThreeChannelWaveform): { agreement: number; mean: number };
  exchangeWaves(): void;
  
  // Word operations
  addWord(word: string, effect: { R: number; G: number; B: number }): WordKernel;
  applyWords(words: string[], baseState?: InversionState): InversionState;
  
  // Core loop
  step(dt?: number): void;
  
  // Getters
  getHadrons(): Hadron[];
  getVoids(): Void[];
  getWaveAmplitude(): number;
}

export function createUnifiedASIEngine(): UnifiedASIEngine {
  const baseState = createInversionState();
  initializeFromNothingness(baseState);
  
  const hadrons: Hadron[] = [];
  const voids: Void[] = [];
  const observers = new Map<string, Observer>();
  const lexicon = new Map<string, WordKernel>();
  let tick = 0;
  
  // Initialize standard lexicon
  const standardWords = [
    { word: 'love', effect: { R: 1, G: 0.8, B: 0.9 } },
    { word: 'hate', effect: { R: -1, G: -0.5, B: -0.8 } },
    { word: 'hope', effect: { R: 0.5, G: 1, B: 0.7 } },
    { word: 'fear', effect: { R: -0.3, G: -1, B: -0.5 } },
    { word: 'truth', effect: { R: 0.6, G: 0.6, B: 1 } },
    { word: 'deceit', effect: { R: -0.5, G: -0.3, B: -1 } },
    { word: 'not', effect: { R: -1, G: -1, B: -1 } }
  ];
  
  for (const { word, effect } of standardWords) {
    lexicon.set(word, createWordKernel(word, effect));
  }
  
  /**
   * Attempt inversion: Find X⁻¹ such that X · X⁻¹ ≈ Identity
   */
  function invert(state: InversionState): { success: boolean; error: number; result: InversionState } {
    const result = createInversionState();
    
    // Inversion: negate all orientations
    for (const axis of AXES) {
      for (let n = 0; n < CONFIG.N; n++) {
        result[axis][n] = flip(state[axis][n] as Orientation);
      }
    }
    
    // Compute error: how close is X · X⁻¹ to identity?
    let error = 0;
    for (const axis of AXES) {
      for (let n = 0; n < CONFIG.N; n++) {
        const product = state[axis][n] * result[axis][n];
        // For perfect inversion, product should be -1 (which when added gives 0)
        // Or we can interpret identity differently based on context
        error += Math.abs(product + 1) / 2; // 0 if perfect inverse
      }
    }
    error /= (CONFIG.N * 3);
    
    const success = error < 0.3;
    
    return { success, error, result };
  }
  
  /**
   * Double inversion: X⁻¹⁻¹ = X (true knowledge)
   */
  function doubleInvert(state: InversionState): { success: boolean; result: InversionState } {
    const first = invert(state);
    const second = invert(first.result);
    
    // Check if we returned to original
    let matches = 0;
    for (const axis of AXES) {
      for (let n = 0; n < CONFIG.N; n++) {
        if (state[axis][n] === second.result[axis][n]) {
          matches++;
        }
      }
    }
    
    const success = matches / (CONFIG.N * 3) > 0.95;
    return { success, result: second.result };
  }
  
  function createHadronFn(_name?: string): Hadron {
    const state = createInversionState();
    initializeFromNothingness(state);
    
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    ];
    
    const hadron = createHadron(state, position);
    hadrons.push(hadron);
    return hadron;
  }
  
  function createVoidFn(error: number): Void {
    const state = createInversionState();
    initializeFromNothingness(state);
    
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    ];
    
    const v = createVoid(state, position, error);
    voids.push(v);
    return v;
  }
  
  function addObserver(name: string, archetype?: string): Observer {
    const observer = createObserver(name, archetype);
    observers.set(observer.id, observer);
    
    // Connect to all existing observers
    for (const [id, other] of observers) {
      if (id !== observer.id) {
        observer.connections.push(id);
        other.connections.push(observer.id);
      }
    }
    
    return observer;
  }
  
  function computeTruth(observerId: string, waveform: ThreeChannelWaveform): number {
    const observer = observers.get(observerId);
    if (!observer) return 0;
    
    const baseWaveform = computeFullWaveform(baseState);
    return computeEpistemicTruth(observer, waveform, baseWaveform);
  }
  
  function computeConsensus(waveform: ThreeChannelWaveform): { agreement: number; mean: number } {
    if (observers.size === 0) return { agreement: 0, mean: 0 };
    
    const truths: number[] = [];
    const baseWaveform = computeFullWaveform(baseState);
    
    for (const observer of observers.values()) {
      truths.push(computeEpistemicTruth(observer, waveform, baseWaveform));
    }
    
    const mean = truths.reduce((a, b) => a + b, 0) / truths.length;
    const variance = truths.reduce((sum, t) => sum + (t - mean) ** 2, 0) / truths.length;
    const agreement = 1 / (1 + variance * 10);
    
    return { agreement, mean };
  }
  
  function exchangeWaves(): void {
    // Each observer influences connected observers
    for (const observer of observers.values()) {
      for (const connectedId of observer.connections) {
        const other = observers.get(connectedId);
        if (other) {
          // Blend wave fields: 80% local, 20% incoming
          for (let i = 0; i < observer.waveField.length; i++) {
            const blend = observer.waveField[i] * 0.8 + other.waveField[i] * 0.2;
            observer.waveField[i] = blend;
          }
        }
      }
    }
  }
  
  function addWord(word: string, effect: { R: number; G: number; B: number }): WordKernel {
    const kernel = createWordKernel(word, effect);
    lexicon.set(word, kernel);
    return kernel;
  }
  
  function applyWords(words: string[], base?: InversionState): InversionState {
    const state = base ? {
      R: new Int8Array(base.R),
      G: new Int8Array(base.G),
      B: new Int8Array(base.B)
    } : createInversionState();
    
    if (!base) {
      // Start with positive orientation
      for (let i = 0; i < CONFIG.N; i++) {
        state.R[i] = 1;
        state.G[i] = 1;
        state.B[i] = 1;
      }
    }
    
    let position = 0;
    for (const word of words) {
      const kernel = lexicon.get(word);
      if (kernel) {
        applyWordKernel(state, kernel, position);
        position += Math.floor(kernel.width * 0.75);
      } else {
        position += 2;
      }
    }
    
    return state;
  }
  
  function step(_dt: number = 1): void {
    tick++;
    
    // Exchange waves between observers
    exchangeWaves();
    
    // Decay hadron stability
    for (const hadron of hadrons) {
      hadron.stability *= 0.999;
    }
    
    // Remove very unstable hadrons
    for (let i = hadrons.length - 1; i >= 0; i--) {
      if (hadrons[i].stability < 0.01) {
        hadrons.splice(i, 1);
      }
    }
  }
  
  function getWaveAmplitude(): number {
    const waveform = computeFullWaveform(baseState);
    return Math.sqrt(computeWaveformEnergy(waveform)) / CONFIG.M;
  }
  
  return {
    baseState,
    hadrons,
    voids,
    observers,
    lexicon,
    tick,
    
    invert,
    doubleInvert,
    
    createHadron: createHadronFn,
    createVoid: createVoidFn,
    
    addObserver,
    computeTruth,
    computeConsensus,
    exchangeWaves,
    
    addWord,
    applyWords,
    
    step,
    
    getHadrons: () => hadrons,
    getVoids: () => voids,
    getWaveAmplitude
  };
}
