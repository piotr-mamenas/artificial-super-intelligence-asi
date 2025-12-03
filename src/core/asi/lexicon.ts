/**
 * LEXICON MODULE - Words and Sentences
 * 
 * Section 5: Words and Sentences
 * 
 * Words are inversion kernels that modify orientation states.
 * Sentences compose words via connection kernels.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  OrientationState, 
  AXES, 
  N, 
  createOrientationState,
  Orientation 
} from './primitive-ontology';
import { 
  ThreeChannelWaveform, 
  computeThreeChannelWaveform,
  Complex,
  FREQUENCIES,
  M,
  complexMul,
  complexAdd
} from './waveform';
import { ASIObject } from './objects';

// ============================================
// 5.1 WORDS AS INVERSION KERNELS
// ============================================

/**
 * Word Kernel: K_w : C × {0,...,N-1} → {+1, -1}
 * 
 * Describes how applying the word changes σ_c(n) over a local window.
 */
export interface WordKernel {
  id: string;
  word: string;
  
  // Kernel values: how word modifies each axis at each offset
  // K_w(c, δ) where δ is local offset from application point
  R: Int8Array; // Length = kernel width
  G: Int8Array;
  B: Int8Array;
  
  // Kernel width (how many steps affected)
  width: number;
  
  // Semantic metadata
  emotionalValence: number; // -1 (negative) to +1 (positive)
  intensity: number;        // 0 to 1
}

/**
 * Apply word kernel at position p in the inversion timeline.
 * 
 * For each axis c and local offset δ:
 *   σ_c(p+δ) ← σ_c(p+δ) · K_w(c, δ)
 */
export function applyWordKernel(
  state: OrientationState,
  kernel: WordKernel,
  position: number
): void {
  for (let delta = 0; delta < kernel.width; delta++) {
    const targetPos = position + delta;
    if (targetPos < 0 || targetPos >= N) continue;
    
    for (const axis of AXES) {
      const kernelValue = kernel[axis][delta];
      if (kernelValue !== 0) {
        // Multiply current state by kernel value
        const current = state[axis][targetPos] as Orientation;
        if (current !== 0) {
          state[axis][targetPos] = (current * kernelValue) as Orientation;
        } else {
          // If current is 0, kernel sets the value
          state[axis][targetPos] = kernelValue as Orientation;
        }
      }
    }
  }
}

/**
 * Create a word kernel from semantic properties.
 */
export function createWordKernel(
  word: string,
  emotionalEffect: { R: number; G: number; B: number }, // [-1, 1] per axis
  width: number = 4
): WordKernel {
  const R = new Int8Array(width);
  const G = new Int8Array(width);
  const B = new Int8Array(width);
  
  // Convert continuous effect to discrete kernel
  for (let i = 0; i < width; i++) {
    // Amplitude decreases from center
    const weight = 1 - Math.abs(i - width / 2) / (width / 2);
    
    R[i] = Math.sign(emotionalEffect.R) * (Math.random() < Math.abs(emotionalEffect.R) * weight ? 1 : 1) as Orientation;
    G[i] = Math.sign(emotionalEffect.G) * (Math.random() < Math.abs(emotionalEffect.G) * weight ? 1 : 1) as Orientation;
    B[i] = Math.sign(emotionalEffect.B) * (Math.random() < Math.abs(emotionalEffect.B) * weight ? 1 : 1) as Orientation;
  }
  
  // Ensure non-zero values
  for (let i = 0; i < width; i++) {
    if (R[i] === 0) R[i] = emotionalEffect.R >= 0 ? 1 : -1;
    if (G[i] === 0) G[i] = emotionalEffect.G >= 0 ? 1 : -1;
    if (B[i] === 0) B[i] = emotionalEffect.B >= 0 ? 1 : -1;
  }
  
  return {
    id: uuidv4(),
    word,
    R,
    G,
    B,
    width,
    emotionalValence: (emotionalEffect.R + emotionalEffect.G + emotionalEffect.B) / 3,
    intensity: Math.sqrt(
      emotionalEffect.R ** 2 + emotionalEffect.G ** 2 + emotionalEffect.B ** 2
    ) / Math.sqrt(3)
  };
}

// ============================================
// 5.2 CONNECTION KERNELS BETWEEN WORDS
// ============================================

/**
 * Connection Kernel: K_{ij} : F → ℂ
 * 
 * Encodes how w_i modulates the contribution of w_j at frequency f.
 * Examples: negation, contrast, conditional
 */
export interface ConnectionKernel {
  id: string;
  wordFrom: string;
  wordTo: string;
  
  // Complex modulation at each frequency
  modulations: Complex[];
  
  // Semantic relationship type
  relationshipType: 'neutral' | 'negation' | 'contrast' | 'conditional' | 'amplification' | 'causation';
}

/**
 * Create a connection kernel between two words.
 */
export function createConnectionKernel(
  wordFrom: string,
  wordTo: string,
  relationshipType: ConnectionKernel['relationshipType']
): ConnectionKernel {
  const modulations: Complex[] = [];
  
  for (let i = 0; i < M; i++) {
    const f = FREQUENCIES[i];
    
    switch (relationshipType) {
      case 'negation':
        // Negate: multiply by -1 (phase shift of π)
        modulations.push({ re: -1, im: 0 });
        break;
        
      case 'contrast':
        // Contrast: frequency-dependent phase shift
        modulations.push({
          re: Math.cos(Math.PI * f),
          im: Math.sin(Math.PI * f)
        });
        break;
        
      case 'conditional':
        // Conditional: attenuate low frequencies, preserve high
        modulations.push({ re: f, im: 0 });
        break;
        
      case 'amplification':
        // Amplify: scale up
        modulations.push({ re: 1.5, im: 0 });
        break;
        
      case 'causation':
        // Causation: time-shift (phase gradient)
        modulations.push({
          re: Math.cos(2 * Math.PI * f * 0.1),
          im: -Math.sin(2 * Math.PI * f * 0.1)
        });
        break;
        
      default: // 'neutral'
        modulations.push({ re: 1, im: 0 });
    }
  }
  
  return {
    id: uuidv4(),
    wordFrom,
    wordTo,
    modulations,
    relationshipType
  };
}

// ============================================
// 5.3 SENTENCE CONSTRUCTION
// ============================================

/**
 * Sentence S = (w_1, ..., w_n)
 */
export interface Sentence {
  id: string;
  words: string[];
  kernels: WordKernel[];
  connections: ConnectionKernel[];
  
  // Resulting orientation state from composition
  orientationState: OrientationState;
  
  // Resulting waveform: Ψ_{S,c}(f)
  waveform: ThreeChannelWaveform;
  
  // Sentence-structure envelope G_S(f)
  structureEnvelope: Complex[];
}

/**
 * Construct sentence from word sequence.
 * 
 * 1. Initialize σ_c^{(S)}(n) from base object or neutral
 * 2. Sequentially apply kernels K_{w_k} and K_{w_k w_{k+1}}
 * 3. Compute resulting waveform
 */
export function constructSentence(
  words: string[],
  wordKernels: Map<string, WordKernel>,
  connectionKernels: Map<string, ConnectionKernel>,
  baseObject?: ASIObject
): Sentence {
  // Initialize from base or neutral
  const state = baseObject 
    ? { 
        R: new Int8Array(baseObject.orientationState.R),
        G: new Int8Array(baseObject.orientationState.G),
        B: new Int8Array(baseObject.orientationState.B)
      }
    : createOrientationState();
  
  // If starting neutral, set to +1
  if (!baseObject) {
    for (let i = 0; i < N; i++) {
      state.R[i] = 1;
      state.G[i] = 1;
      state.B[i] = 1;
    }
  }
  
  const usedKernels: WordKernel[] = [];
  const usedConnections: ConnectionKernel[] = [];
  
  // Apply word kernels sequentially
  let position = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const kernel = wordKernels.get(word);
    
    if (kernel) {
      applyWordKernel(state, kernel, position);
      usedKernels.push(kernel);
      position += Math.floor(kernel.width * 0.75); // Overlap slightly
      
      // Apply connection kernel to next word if exists
      if (i < words.length - 1) {
        const nextWord = words[i + 1];
        const connectionKey = `${word}->${nextWord}`;
        const connection = connectionKernels.get(connectionKey);
        if (connection) {
          usedConnections.push(connection);
        }
      }
    } else {
      position += 2; // Default spacing for unknown words
    }
  }
  
  // Compute sentence waveform
  const waveform = computeThreeChannelWaveform(state);
  
  // Compute structure envelope from connections
  const structureEnvelope = computeStructureEnvelope(usedConnections);
  
  return {
    id: uuidv4(),
    words,
    kernels: usedKernels,
    connections: usedConnections,
    orientationState: state,
    waveform,
    structureEnvelope
  };
}

/**
 * Compute sentence structure envelope G_S(f) from connection kernels.
 */
function computeStructureEnvelope(connections: ConnectionKernel[]): Complex[] {
  const envelope: Complex[] = FREQUENCIES.map(() => ({ re: 1, im: 0 }));
  
  // Multiply all connection modulations
  for (const conn of connections) {
    for (let i = 0; i < M; i++) {
      envelope[i] = complexMul(envelope[i], conn.modulations[i]);
    }
  }
  
  return envelope;
}

/**
 * Compute combined object-sentence waveform.
 * 
 * Ψ_{O,S,c}(f) ≈ C_{O,c} · G_S(f)
 */
export function computeObjectSentenceWaveform(
  obj: ASIObject,
  sentence: Sentence
): ThreeChannelWaveform {
  const result: ThreeChannelWaveform = {
    R: { amplitudes: [] },
    G: { amplitudes: [] },
    B: { amplitudes: [] }
  };
  
  for (let i = 0; i < M; i++) {
    const envelope = sentence.structureEnvelope[i];
    
    // Ψ_{O,S,c}(f) ≈ C_{O,c} · G_S(f)
    for (const axis of AXES) {
      const colorValue = obj.emotionalColor[axis];
      const baseAmp = obj.waveform[axis].amplitudes[i];
      const sentenceAmp = sentence.waveform[axis].amplitudes[i];
      
      // Combine: base object × sentence structure × sentence waveform
      let combined = complexMul(baseAmp, envelope);
      combined = complexAdd(combined, sentenceAmp);
      combined = { 
        re: combined.re * (1 + colorValue) / 2, 
        im: combined.im * (1 + colorValue) / 2 
      };
      
      result[axis].amplitudes.push(combined);
    }
  }
  
  return result;
}

// ============================================
// PREDEFINED WORD KERNELS
// ============================================

/**
 * Create standard lexicon with common words.
 */
export function createStandardLexicon(): Map<string, WordKernel> {
  const lexicon = new Map<string, WordKernel>();
  
  // Positive words
  lexicon.set('love', createWordKernel('love', { R: 1, G: 0.8, B: 0.9 }));
  lexicon.set('hope', createWordKernel('hope', { R: 0.5, G: 1, B: 0.7 }));
  lexicon.set('joy', createWordKernel('joy', { R: 0.9, G: 0.9, B: 0.8 }));
  lexicon.set('peace', createWordKernel('peace', { R: 0.6, G: 0.8, B: 1 }));
  lexicon.set('trust', createWordKernel('trust', { R: 0.7, G: 0.7, B: 1 }));
  
  // Negative words
  lexicon.set('hate', createWordKernel('hate', { R: -1, G: -0.5, B: -0.8 }));
  lexicon.set('fear', createWordKernel('fear', { R: -0.3, G: -1, B: -0.5 }));
  lexicon.set('anger', createWordKernel('anger', { R: -0.9, G: -0.7, B: -0.6 }));
  lexicon.set('despair', createWordKernel('despair', { R: -0.8, G: -1, B: -0.9 }));
  lexicon.set('deceit', createWordKernel('deceit', { R: -0.5, G: -0.3, B: -1 }));
  
  // Neutral/modifying words
  lexicon.set('not', createWordKernel('not', { R: -1, G: -1, B: -1 }, 2)); // Negation
  lexicon.set('very', createWordKernel('very', { R: 1, G: 1, B: 1 }, 2)); // Intensifier
  lexicon.set('maybe', createWordKernel('maybe', { R: 0, G: 0, B: 0.5 }, 2)); // Uncertainty
  
  // Objects/nouns (neutral base)
  lexicon.set('person', createWordKernel('person', { R: 0.5, G: 0.5, B: 0.5 }));
  lexicon.set('world', createWordKernel('world', { R: 0.3, G: 0.6, B: 0.4 }));
  lexicon.set('life', createWordKernel('life', { R: 0.7, G: 0.8, B: 0.6 }));
  
  return lexicon;
}

/**
 * Create standard connection kernels.
 */
export function createStandardConnections(): Map<string, ConnectionKernel> {
  const connections = new Map<string, ConnectionKernel>();
  
  // Negation connections
  connections.set('not->love', createConnectionKernel('not', 'love', 'negation'));
  connections.set('not->hate', createConnectionKernel('not', 'hate', 'negation'));
  connections.set('not->hope', createConnectionKernel('not', 'hope', 'negation'));
  connections.set('not->fear', createConnectionKernel('not', 'fear', 'negation'));
  
  // Intensifier connections
  connections.set('very->love', createConnectionKernel('very', 'love', 'amplification'));
  connections.set('very->hate', createConnectionKernel('very', 'hate', 'amplification'));
  connections.set('very->fear', createConnectionKernel('very', 'fear', 'amplification'));
  
  // Causation
  connections.set('fear->despair', createConnectionKernel('fear', 'despair', 'causation'));
  connections.set('hope->joy', createConnectionKernel('hope', 'joy', 'causation'));
  
  // Contrast
  connections.set('love->hate', createConnectionKernel('love', 'hate', 'contrast'));
  connections.set('hope->fear', createConnectionKernel('hope', 'fear', 'contrast'));
  
  return connections;
}
