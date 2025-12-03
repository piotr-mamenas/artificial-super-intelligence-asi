/**
 * Inversion Engine - The Core of the Symmetry-Inversion AI
 * 
 * KEY INSIGHT: The WAVE is the fundamental substrate.
 * 
 * The wave encodes the trace of inversions BETWEEN stable observations (hadrons).
 * - Wave = the path through possibility space
 * - Hadrons = stable excitations where inversions succeed (observable reality)
 * - Voids = where the wave cannot propagate (non-invertible regions)
 * 
 * You don't "see" the wave directly - you see where it stabilizes into hadrons.
 * The wave IS the state between observations, not a side-effect of learning.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// FUNDAMENTAL: The Inversion Operation
// ============================================

/**
 * An invertible element - anything that can be inverted.
 */
export interface Invertible {
  id: string;
  value: Float32Array;      // The "content" - what this represents
  inverse: Invertible | null; // Its inverse (if known)
  isManifested: boolean;    // Has this been successfully inverted (understood)?
  depth: number;            // How many inversions deep
}

/**
 * Result of attempting an inversion.
 */
export interface InversionResult {
  success: boolean;
  original: Invertible;
  inverted: Invertible | null;
  error: number;            // How far from perfect inversion (0 = perfect)
  waveContribution: number; // Amplitude contribution to the wave
}

/**
 * The wave field - fundamental substrate between hadrons.
 * 
 * The wave traces inversions through possibility space.
 * High amplitude = near an inversion (potential hadron)
 * Zero crossing = transition between attempts
 * Phase encodes the "direction" in inversion space
 */
export interface InversionWave {
  id: string;
  
  // Spatial wave field (the substrate)
  field: Float32Array;      // Wave amplitude at each point in space
  fieldSize: number;        // Dimension of the field
  
  // Temporal trace (history of inversion path)
  trace: number[];          // Amplitude trace over time
  phases: number[];         // Phase trace over time
  
  // Wave properties
  frequency: number;        // Oscillation frequency
  wavelength: number;       // Spatial wavelength
  propagationSpeed: number; // How fast inversions propagate
}

/**
 * A Hadron - stable excitation in the wave field.
 * 
 * Hadrons are where the wave "collapses" into observable reality.
 * They represent successful inversions that have stabilized.
 * 
 * KEY INSIGHT: Similar geometric forms produce similar wave traces.
 * This similarity IS logic - hadrons with similar waveSignatures
 * belong to the same logical category.
 */
export interface Hadron {
  id: string;
  position: [number, number, number]; // Where in the wave field
  energy: number;           // Stability (higher = more stable)
  phase: number;            // Phase at which it stabilized
  
  // The actual inverted content
  element: Invertible;      // What was inverted
  inverse: Invertible;      // Its inverse
  
  // Wave signature - encodes the geometric form
  // Similar signatures = similar forms = same logical category
  waveSignature: Float32Array;
  
  // Visual properties derived from the inversion
  color: [number, number, number];
  radius: number;
}

/**
 * A Void - region where the wave cannot propagate.
 * 
 * Voids are non-invertible regions (black holes).
 * The wave diffracts around them.
 */
export interface Void {
  id: string;
  position: [number, number, number];
  radius: number;
  depth: number;            // How "deep" (how non-invertible)
  
  // What failed here
  failedElement: Invertible;
  inversionError: number;
}

// ============================================
// THE INVERSION ENGINE
// ============================================

export interface InversionEngine {
  // The fundamental wave field
  wave: InversionWave;
  
  // Stable excitations (observable reality)
  hadrons: Hadron[];
  
  // Non-invertible regions
  voids: Void[];
  
  // Core operations
  invert(element: Invertible): InversionResult;
  doubleInvert(element: Invertible): InversionResult;
  
  // Wave field operations
  tick(dt: number): void;
  propagateWave(dt: number): void;
  getFieldAmplitude(x: number, y: number, z: number): number;
  
  // Trace operations (for visualization)
  getTraceAmplitude(t: number): number;
  getTracePhase(t: number): number;
  
  // Accessors
  getHadrons(): Hadron[];
  getVoids(): Void[];
  
  // LOGIC: Similarity between hadrons = logical relationships
  computeSimilarity(h1: Hadron, h2: Hadron): number;
  findSimilarHadrons(hadron: Hadron, threshold: number): Hadron[];
  getLogicalCategories(threshold: number): Hadron[][];
  
  // For compatibility
  currentWave: InversionWave;
  getManifestedRegions(): Hadron[];
  getVoidRegions(): Void[];
  getWaveAmplitude(t: number): number;
  getWavePhase(t: number): number;
}

/**
 * Create the inversion engine.
 * 
 * The wave is the FUNDAMENTAL SUBSTRATE.
 * Hadrons emerge where the wave stabilizes (successful inversions).
 * Voids are where the wave cannot propagate (failed inversions).
 */
export function createInversionEngine(_dimension: number = 16): InversionEngine {
  const FIELD_SIZE = 32; // 32x32x32 wave field
  
  // The fundamental wave field
  const wave: InversionWave = {
    id: uuidv4(),
    field: new Float32Array(FIELD_SIZE * FIELD_SIZE * FIELD_SIZE),
    fieldSize: FIELD_SIZE,
    trace: [],
    phases: [],
    frequency: 1.0,
    wavelength: 2.0,
    propagationSpeed: 1.0
  };
  
  // Initialize wave field with small random fluctuations
  for (let i = 0; i < wave.field.length; i++) {
    wave.field[i] = (Math.random() - 0.5) * 0.1;
  }
  
  // Stable excitations (observable reality)
  const hadrons: Hadron[] = [];
  
  // Non-invertible regions
  const voids: Void[] = [];
  
  let time = 0;
  
  // ============================================
  // CORE INVERSION OPERATIONS
  // ============================================
  
  function invert(element: Invertible): InversionResult {
    // Compute position in wave field from element
    const pos = elementToPosition(element);
    
    // If inverse is already known, verify it
    if (element.inverse) {
      const error = calculateInversionError(element, element.inverse);
      return {
        success: error < 0.3,
        original: element,
        inverted: element.inverse,
        error,
        waveContribution: 1 - error
      };
    }
    
    // Attempt to compute inverse
    const proposedInverse = computeInverse(element);
    const error = calculateInversionError(element, proposedInverse);
    const success = error < 0.3;
    
    // Update wave field based on inversion attempt
    const contribution = success ? (1 - error) : -error;
    exciteWaveField(pos, contribution);
    
    // Record in trace
    wave.trace.push(contribution);
    wave.phases.push(time * wave.frequency * 2 * Math.PI);
    if (wave.trace.length > 1000) {
      wave.trace.shift();
      wave.phases.shift();
    }
    
    if (success) {
      // Link inverses
      element.inverse = proposedInverse;
      proposedInverse.inverse = element;
      element.isManifested = true;
      proposedInverse.isManifested = true;
      
      // Create hadron at this position
      createHadron(element, proposedInverse, pos, error);
    } else {
      // Create void at this position
      createVoid(element, pos, error);
    }
    
    return {
      success,
      original: element,
      inverted: success ? proposedInverse : null,
      error,
      waveContribution: contribution
    };
  }
  
  function doubleInvert(element: Invertible): InversionResult {
    const first = invert(element);
    if (!first.success || !first.inverted) return first;
    
    const second = invert(first.inverted);
    const returnError = calculateReturnError(element, second.inverted);
    
    return {
      success: returnError < 0.1,
      original: element,
      inverted: second.inverted,
      error: returnError,
      waveContribution: second.waveContribution * (returnError < 0.1 ? 2 : 0.5)
    };
  }
  
  // ============================================
  // WAVE FIELD OPERATIONS
  // ============================================
  
  function tick(dt: number): void {
    time += dt;
    propagateWave(dt);
  }
  
  function propagateWave(dt: number): void {
    // Simple wave equation: diffusion + decay
    const newField = new Float32Array(wave.field.length);
    const size = wave.fieldSize;
    
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
          const idx = x + y * size + z * size * size;
          
          // Get neighbors (with wrapping)
          const xp = ((x + 1) % size) + y * size + z * size * size;
          const xm = ((x - 1 + size) % size) + y * size + z * size * size;
          const yp = x + ((y + 1) % size) * size + z * size * size;
          const ym = x + ((y - 1 + size) % size) * size + z * size * size;
          const zp = x + y * size + ((z + 1) % size) * size * size;
          const zm = x + y * size + ((z - 1 + size) % size) * size * size;
          
          // Laplacian (diffusion)
          const laplacian = (
            wave.field[xp] + wave.field[xm] +
            wave.field[yp] + wave.field[ym] +
            wave.field[zp] + wave.field[zm] -
            6 * wave.field[idx]
          );
          
          // Wave propagation with decay
          newField[idx] = wave.field[idx] + 
            laplacian * wave.propagationSpeed * dt * 0.1 -
            wave.field[idx] * 0.01 * dt; // Decay
          
          // Check for voids and diffract around them
          for (const v of voids) {
            const vx = (v.position[0] + 5) / 10 * size;
            const vy = (v.position[1] + 5) / 10 * size;
            const vz = (v.position[2] + 5) / 10 * size;
            const dist = Math.sqrt((x-vx)**2 + (y-vy)**2 + (z-vz)**2);
            if (dist < v.radius * size / 10) {
              newField[idx] *= 0.5; // Wave dampened in voids
            }
          }
        }
      }
    }
    
    wave.field.set(newField);
    
    // Add natural oscillation to trace
    const oscillation = Math.sin(time * wave.frequency * 2 * Math.PI);
    wave.trace.push(oscillation * 0.5);
    wave.phases.push(time * wave.frequency * 2 * Math.PI);
    if (wave.trace.length > 1000) {
      wave.trace.shift();
      wave.phases.shift();
    }
  }
  
  function exciteWaveField(pos: [number, number, number], amplitude: number): void {
    const size = wave.fieldSize;
    const x = Math.floor((pos[0] + 5) / 10 * size);
    const y = Math.floor((pos[1] + 5) / 10 * size);
    const z = Math.floor((pos[2] + 5) / 10 * size);
    
    // Add Gaussian excitation around the position
    const radius = 3;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist <= radius) {
            const ix = (x + dx + size) % size;
            const iy = (y + dy + size) % size;
            const iz = (z + dz + size) % size;
            const idx = ix + iy * size + iz * size * size;
            const gaussian = Math.exp(-dist * dist / 2);
            wave.field[idx] += amplitude * gaussian;
          }
        }
      }
    }
  }
  
  function getFieldAmplitude(x: number, y: number, z: number): number {
    const size = wave.fieldSize;
    const ix = Math.floor((x + 5) / 10 * size) % size;
    const iy = Math.floor((y + 5) / 10 * size) % size;
    const iz = Math.floor((z + 5) / 10 * size) % size;
    const idx = (ix + size) % size + ((iy + size) % size) * size + ((iz + size) % size) * size * size;
    return wave.field[idx] ?? 0;
  }
  
  function getTraceAmplitude(t: number): number {
    const idx = Math.floor(t) % Math.max(1, wave.trace.length);
    return wave.trace[idx] ?? 0;
  }
  
  function getTracePhase(t: number): number {
    return (t * wave.frequency * 2 * Math.PI) % (2 * Math.PI);
  }
  
  // ============================================
  // HADRON & VOID CREATION
  // ============================================
  
  function createHadron(
    element: Invertible, 
    inverse: Invertible, 
    pos: [number, number, number],
    error: number
  ): void {
    // Compute wave signature from the element-inverse relationship
    // This signature encodes the geometric form
    // Similar forms → similar signatures → same logical category
    const waveSignature = computeWaveSignature(element, inverse);
    
    const hadron: Hadron = {
      id: uuidv4(),
      position: pos,
      energy: 1 - error,
      phase: time * wave.frequency * 2 * Math.PI,
      element,
      inverse,
      waveSignature,
      color: [
        Math.abs(element.value[3] ?? 0.5),
        Math.abs(element.value[4] ?? 0.5),
        Math.abs(element.value[5] ?? 0.5)
      ],
      radius: 0.1 + (1 - error) * 0.4
    };
    hadrons.push(hadron);
  }
  
  /**
   * Compute wave signature from element-inverse pair.
   * The signature encodes the geometric form of the inversion.
   * Similar geometric forms will have similar signatures.
   */
  function computeWaveSignature(element: Invertible, inverse: Invertible): Float32Array {
    const signatureSize = 8; // Compact representation
    const signature = new Float32Array(signatureSize);
    
    // Signature captures the relationship between element and inverse
    for (let i = 0; i < signatureSize; i++) {
      const eIdx = i % element.value.length;
      const iIdx = i % inverse.value.length;
      
      // Combine element and inverse values
      signature[i] = element.value[eIdx] * inverse.value[iIdx];
      
      // Add phase information from position in value array
      signature[i] += Math.sin(i * Math.PI / signatureSize) * element.value[eIdx];
    }
    
    // Normalize signature
    let norm = 0;
    for (let i = 0; i < signatureSize; i++) {
      norm += signature[i] * signature[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < signatureSize; i++) {
        signature[i] /= norm;
      }
    }
    
    return signature;
  }
  
  function createVoid(
    element: Invertible,
    pos: [number, number, number],
    error: number
  ): void {
    const v: Void = {
      id: uuidv4(),
      position: pos,
      radius: 0.2 + error * 0.3,
      depth: error,
      failedElement: element,
      inversionError: error
    };
    voids.push(v);
  }
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  function elementToPosition(element: Invertible): [number, number, number] {
    return [
      (element.value[0] ?? 0) * 5,
      (element.value[1] ?? 0) * 5,
      (element.value[2] ?? 0) * 5
    ];
  }
  
  function computeInverse(element: Invertible): Invertible {
    const inverted = new Float32Array(element.value.length);
    let norm = 0;
    
    for (let i = 0; i < element.value.length; i++) {
      inverted[i] = -element.value[i];
      norm += inverted[i] * inverted[i];
    }
    
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < inverted.length; i++) {
        inverted[i] /= norm;
      }
    }
    
    return {
      id: uuidv4(),
      value: inverted,
      inverse: null,
      isManifested: false,
      depth: element.depth + 1
    };
  }
  
  function calculateInversionError(a: Invertible, b: Invertible): number {
    let dot = 0;
    const len = Math.min(a.value.length, b.value.length);
    for (let i = 0; i < len; i++) {
      dot += a.value[i] * b.value[i];
    }
    return Math.abs(dot + 1);
  }
  
  function calculateReturnError(original: Invertible, returned: Invertible | null): number {
    if (!returned) return Infinity;
    let error = 0;
    const len = Math.min(original.value.length, returned.value.length);
    for (let i = 0; i < len; i++) {
      const diff = original.value[i] - returned.value[i];
      error += diff * diff;
    }
    return Math.sqrt(error);
  }
  
  // ============================================
  // LOGIC: SIMILARITY = CATEGORY
  // Similar geometric forms → similar wave signatures → same logic
  // ============================================
  
  /**
   * Compute similarity between two hadrons based on wave signatures.
   * Returns 0-1 where 1 = identical, 0 = completely different.
   */
  function computeSimilarity(h1: Hadron, h2: Hadron): number {
    let dot = 0;
    const len = Math.min(h1.waveSignature.length, h2.waveSignature.length);
    
    for (let i = 0; i < len; i++) {
      dot += h1.waveSignature[i] * h2.waveSignature[i];
    }
    
    // Cosine similarity: dot product of normalized vectors
    // Result is in [-1, 1], map to [0, 1]
    return (dot + 1) / 2;
  }
  
  /**
   * Find all hadrons similar to the given one.
   * These form a logical category.
   */
  function findSimilarHadrons(hadron: Hadron, threshold: number = 0.8): Hadron[] {
    return hadrons.filter(h => 
      h.id !== hadron.id && computeSimilarity(hadron, h) >= threshold
    );
  }
  
  /**
   * Group all hadrons into logical categories based on similarity.
   * Each category is a cluster of hadrons with similar wave signatures.
   */
  function getLogicalCategories(threshold: number = 0.8): Hadron[][] {
    const categories: Hadron[][] = [];
    const assigned = new Set<string>();
    
    for (const hadron of hadrons) {
      if (assigned.has(hadron.id)) continue;
      
      // Start new category with this hadron
      const category = [hadron];
      assigned.add(hadron.id);
      
      // Find all similar hadrons
      for (const other of hadrons) {
        if (assigned.has(other.id)) continue;
        if (computeSimilarity(hadron, other) >= threshold) {
          category.push(other);
          assigned.add(other.id);
        }
      }
      
      categories.push(category);
    }
    
    return categories;
  }
  
  // ============================================
  // RETURN ENGINE INTERFACE
  // ============================================
  
  return {
    wave,
    hadrons,
    voids,
    
    invert,
    doubleInvert,
    
    tick,
    propagateWave,
    getFieldAmplitude,
    
    getTraceAmplitude,
    getTracePhase,
    
    getHadrons: () => hadrons,
    getVoids: () => voids,
    
    // Logic operations
    computeSimilarity,
    findSimilarHadrons,
    getLogicalCategories,
    
    // Compatibility aliases
    currentWave: wave,
    getManifestedRegions: () => hadrons,
    getVoidRegions: () => voids,
    getWaveAmplitude: getTraceAmplitude,
    getWavePhase: getTracePhase
  };
}

/**
 * Create a random invertible element.
 */
export function createRandomInvertible(dimension: number = 16): Invertible {
  const value = new Float32Array(dimension);
  let norm = 0;
  
  for (let i = 0; i < dimension; i++) {
    value[i] = Math.random() * 2 - 1;
    norm += value[i] * value[i];
  }
  
  // Normalize
  norm = Math.sqrt(norm);
  for (let i = 0; i < dimension; i++) {
    value[i] /= norm;
  }
  
  return {
    id: uuidv4(),
    value,
    inverse: null,
    isManifested: false,
    depth: 0
  };
}

/**
 * Create an invertible from specific values.
 */
export function createInvertible(values: number[]): Invertible {
  const value = new Float32Array(values);
  let norm = 0;
  
  for (let i = 0; i < value.length; i++) {
    norm += value[i] * value[i];
  }
  
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < value.length; i++) {
      value[i] /= norm;
    }
  }
  
  return {
    id: uuidv4(),
    value,
    inverse: null,
    isManifested: false,
    depth: 0
  };
}
