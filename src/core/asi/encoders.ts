/**
 * DOMAIN ENCODERS
 * 
 * Convert real-world data into inversion states.
 * This is the INPUT layer of the ASI system.
 * 
 * Encoding principle:
 * - Map data features to RGB semantic axes
 * - Distribute across inversion history steps
 * - Preserve structure through encoding
 */

import { OrientationState, createOrientationState, N, Orientation } from './primitive-ontology';
import { WordKernel, applyWordKernel } from './lexicon';

// ============================================
// TEXT ENCODER
// ============================================

/**
 * Encode text into inversion state using word kernels.
 */
export function encodeText(
  text: string,
  lexicon: Map<string, WordKernel>
): OrientationState {
  const state = createOrientationState();
  
  // Initialize with neutral orientation
  for (let i = 0; i < N; i++) {
    state.R[i] = 1;
    state.G[i] = 1;
    state.B[i] = 1;
  }
  
  // Tokenize and apply word kernels
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  let position = 0;
  
  for (const word of words) {
    const kernel = lexicon.get(word);
    if (kernel) {
      applyWordKernel(state, kernel, position);
      position += kernel.width;
    } else {
      // Unknown word: small perturbation based on hash
      const hash = simpleHash(word);
      const offset = position % N;
      state.R[offset] = ((hash & 1) ? 1 : -1) as Orientation;
      state.G[offset] = ((hash & 2) ? 1 : -1) as Orientation;
      state.B[offset] = ((hash & 4) ? 1 : -1) as Orientation;
      position += 2;
    }
    
    if (position >= N) position = position % N;
  }
  
  return state;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ============================================
// NUMERIC ENCODER
// ============================================

/**
 * Encode numeric array into inversion state.
 * Maps value ranges to RGB orientations.
 */
export function encodeNumeric(
  values: number[],
  config: {
    rRange?: [number, number]; // Value range for R axis
    gRange?: [number, number]; // Value range for G axis
    bRange?: [number, number]; // Value range for B axis
  } = {}
): OrientationState {
  const state = createOrientationState();
  
  const rRange = config.rRange ?? [-1, 1];
  const gRange = config.gRange ?? [-1, 1];
  const bRange = config.bRange ?? [-1, 1];
  
  for (let i = 0; i < Math.min(values.length, N); i++) {
    const v = values[i];
    
    // Map to R axis
    state.R[i] = (v >= (rRange[0] + rRange[1]) / 2 ? 1 : -1) as Orientation;
    
    // Map to G axis (shifted by 1/3 of array)
    const gIdx = Math.floor(i + values.length / 3) % values.length;
    const gv = values[gIdx] ?? v;
    state.G[i] = (gv >= (gRange[0] + gRange[1]) / 2 ? 1 : -1) as Orientation;
    
    // Map to B axis (shifted by 2/3 of array)
    const bIdx = Math.floor(i + 2 * values.length / 3) % values.length;
    const bv = values[bIdx] ?? v;
    state.B[i] = (bv >= (bRange[0] + bRange[1]) / 2 ? 1 : -1) as Orientation;
  }
  
  return state;
}

// ============================================
// CATEGORICAL ENCODER
// ============================================

/**
 * Predefined category mappings to RGB.
 */
export const CATEGORY_COLORS: Record<string, { R: Orientation; G: Orientation; B: Orientation }> = {
  // Sentiment
  'positive': { R: 1, G: 1, B: 1 },
  'negative': { R: -1, G: -1, B: -1 },
  'neutral': { R: 0, G: 0, B: 0 },
  
  // Safety
  'safe': { R: 1, G: 1, B: 1 },
  'dangerous': { R: -1, G: -1, B: -1 },
  'unknown': { R: 0, G: -1, B: 0 },
  
  // Truth
  'true': { R: 1, G: 1, B: 1 },
  'false': { R: -1, G: -1, B: -1 },
  'uncertain': { R: 0, G: 0, B: -1 },
  
  // Emotion
  'happy': { R: 1, G: 1, B: 1 },
  'sad': { R: -1, G: -1, B: 1 },
  'angry': { R: -1, G: -1, B: -1 },
  'fearful': { R: -1, G: -1, B: 0 },
  'loving': { R: 1, G: 1, B: 1 },
  'hopeful': { R: 1, G: 1, B: 1 }
};

/**
 * Encode categorical label into inversion state.
 */
export function encodeCategory(
  category: string,
  intensity: number = 1.0
): OrientationState {
  const state = createOrientationState();
  const colors = CATEGORY_COLORS[category.toLowerCase()] ?? { R: 0, G: 0, B: 0 };
  
  // Fill state with category color, varying by intensity
  const activeSteps = Math.floor(N * intensity);
  
  for (let i = 0; i < activeSteps; i++) {
    state.R[i] = colors.R;
    state.G[i] = colors.G;
    state.B[i] = colors.B;
  }
  
  return state;
}

// ============================================
// STRUCTURED DATA ENCODER
// ============================================

/**
 * Encode structured record into inversion state.
 */
export function encodeRecord(
  record: Record<string, unknown>,
  schema: {
    rFields: string[];  // Fields that map to R axis
    gFields: string[];  // Fields that map to G axis
    bFields: string[];  // Fields that map to B axis
  }
): OrientationState {
  const state = createOrientationState();
  
  // Process R fields
  let rIdx = 0;
  for (const field of schema.rFields) {
    const value = record[field];
    const orientation = valueToOrientation(value);
    if (rIdx < N) {
      state.R[rIdx++] = orientation;
    }
  }
  
  // Process G fields
  let gIdx = 0;
  for (const field of schema.gFields) {
    const value = record[field];
    const orientation = valueToOrientation(value);
    if (gIdx < N) {
      state.G[gIdx++] = orientation;
    }
  }
  
  // Process B fields
  let bIdx = 0;
  for (const field of schema.bFields) {
    const value = record[field];
    const orientation = valueToOrientation(value);
    if (bIdx < N) {
      state.B[bIdx++] = orientation;
    }
  }
  
  return state;
}

function valueToOrientation(value: unknown): Orientation {
  if (typeof value === 'boolean') {
    return value ? 1 : -1;
  }
  if (typeof value === 'number') {
    return value >= 0 ? 1 : -1;
  }
  if (typeof value === 'string') {
    // Positive words
    if (['yes', 'true', 'good', 'positive', 'safe'].includes(value.toLowerCase())) {
      return 1;
    }
    // Negative words
    if (['no', 'false', 'bad', 'negative', 'dangerous'].includes(value.toLowerCase())) {
      return -1;
    }
  }
  return 0;
}

// ============================================
// COMBINED ENCODER
// ============================================

export type EncodableData = 
  | { type: 'text'; content: string }
  | { type: 'numeric'; values: number[] }
  | { type: 'category'; label: string }
  | { type: 'record'; data: Record<string, unknown>; schema: { rFields: string[]; gFields: string[]; bFields: string[] } };

/**
 * Universal encoder - dispatches to appropriate encoder.
 */
export function encode(
  data: EncodableData,
  lexicon?: Map<string, WordKernel>
): OrientationState {
  switch (data.type) {
    case 'text':
      return encodeText(data.content, lexicon ?? new Map());
    case 'numeric':
      return encodeNumeric(data.values);
    case 'category':
      return encodeCategory(data.label);
    case 'record':
      return encodeRecord(data.data, data.schema);
    default:
      return createOrientationState();
  }
}
