/**
 * Fractal Pentagram: The generative core that drives reality observations.
 * 
 * Nested pentagrams (pentagram within pentagram within pentagram) following
 * the golden ratio are what generates observations at each scale of reality.
 * 
 * The golden ratio φ = (1+√5)/2 ≈ 1.618 is intrinsic to pentagram geometry:
 * - Each inner pentagram is scaled by 1/φ² relative to the outer
 * - The ratio of diagonal to side in a pentagon is φ
 * - This self-similarity drives the fractal observation cascade
 */

import { v4 as uuidv4 } from 'uuid';
import { Complex, complex, fromPolar, multiply, add, normalize, magnitude } from './complex';
import { WaveState, createWaveState } from '../ontology/wave-state';

// Golden ratio and related constants
export const PHI = (1 + Math.sqrt(5)) / 2;           // φ ≈ 1.618
export const PHI_INVERSE = 1 / PHI;                   // 1/φ ≈ 0.618
export const PHI_SQUARED = PHI * PHI;                 // φ² ≈ 2.618
export const PHI_INVERSE_SQUARED = 1 / PHI_SQUARED;   // 1/φ² ≈ 0.382

// Pentagram angular constants
export const PENTAGRAM_ANGLE = (2 * Math.PI) / 5;     // 72°
export const STAR_ANGLE = (4 * Math.PI) / 5;          // 144° (star point connections)

/**
 * A single vertex in the fractal pentagram.
 */
export interface PentagramVertex {
  index: number;          // 0-4 position in pentagon
  position: Complex;      // Position in complex plane
  amplitude: Complex;     // Quantum amplitude at this vertex
  phase: number;          // Current phase
}

/**
 * A single layer in the fractal pentagram hierarchy.
 */
export interface PentagramLayer {
  id: string;
  depth: number;          // 0 = outermost
  scale: number;          // Relative to unit circle (1, 1/φ², 1/φ⁴, ...)
  rotation: number;       // Rotation offset (alternates by 36° = π/5)
  vertices: PentagramVertex[];
  parent?: PentagramLayer;
  child?: PentagramLayer;
}

/**
 * The complete fractal pentagram structure.
 */
export interface FractalPentagram {
  id: string;
  layers: PentagramLayer[];
  maxDepth: number;
  currentTime: number;
  
  // Methods
  tick(dt: number): void;
  getObservation(depth: number): WaveState;
  propagateInward(): void;
  propagateOutward(): void;
  getVertexAmplitude(depth: number, vertex: number): Complex;
  setContextFocus(depth: number, edge: number): void;
}

/**
 * Create a fractal pentagram with nested layers.
 * Each inner pentagram is rotated by 36° and scaled by 1/φ².
 */
export function createFractalPentagram(maxDepth: number = 7): FractalPentagram {
  const id = uuidv4();
  const layers: PentagramLayer[] = [];
  
  // Build layers from outside in
  for (let depth = 0; depth < maxDepth; depth++) {
    const scale = Math.pow(PHI_INVERSE_SQUARED, depth);
    const rotation = depth * (Math.PI / 5); // Alternate by 36°
    
    const layer = createPentagramLayer(depth, scale, rotation);
    
    // Link to parent
    if (depth > 0) {
      layer.parent = layers[depth - 1];
      layers[depth - 1].child = layer;
    }
    
    layers.push(layer);
  }
  
  let currentTime = 0;
  let focusDepth = 0;
  let focusEdge = 0;
  
  return {
    id,
    layers,
    maxDepth,
    currentTime,
    
    tick(dt: number): void {
      currentTime += dt;
      
      // Rotate each layer at different speeds (golden ratio relationship)
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        // Inner layers rotate faster by φ ratio
        const angularVelocity = 0.1 * Math.pow(PHI, i);
        layer.rotation += angularVelocity * dt;
        
        // Update vertex positions based on rotation
        updateLayerVertices(layer);
        
        // Phase evolution - inner layers oscillate faster
        for (const vertex of layer.vertices) {
          vertex.phase += angularVelocity * dt * 2;
        }
      }
      
      // Propagate amplitudes through the hierarchy
      this.propagateInward();
    },
    
    getObservation(depth: number): WaveState {
      if (depth < 0 || depth >= layers.length) {
        depth = Math.max(0, Math.min(layers.length - 1, depth));
      }
      
      const layer = layers[depth];
      
      // Construct wave state from vertex amplitudes
      // The 5 vertices map to a 5-dimensional observation space
      // Extended to full wave dimension by golden ratio interpolation
      const amplitudes: Complex[] = [];
      
      for (let i = 0; i < 16; i++) {
        // Map 16 dimensions to 5 vertices using golden ratio weighting
        const vertexIndex = i % 5;
        const nextVertex = (i + 1) % 5;
        const t = (i / 16) * 5 - vertexIndex; // Interpolation parameter
        
        const v1 = layer.vertices[vertexIndex];
        const v2 = layer.vertices[nextVertex];
        
        // Golden ratio weighted interpolation
        const weight1 = Math.pow(PHI_INVERSE, t);
        const weight2 = 1 - weight1;
        
        const amp: Complex = {
          re: v1.amplitude.re * weight1 + v2.amplitude.re * weight2,
          im: v1.amplitude.im * weight1 + v2.amplitude.im * weight2
        };
        
        // Add phase modulation
        const phase = v1.phase * weight1 + v2.phase * weight2;
        const phaseFactor = fromPolar(1, phase);
        amplitudes.push(multiply(amp, phaseFactor));
      }
      
      return createWaveState(normalize(amplitudes), {
        type: 'pentagram-observation',
        depth,
        time: currentTime
      });
    },
    
    propagateInward(): void {
      // Information flows from outer to inner layers
      // Each inner layer receives transformed signal from parent
      for (let i = 1; i < layers.length; i++) {
        const parent = layers[i - 1];
        const child = layers[i];
        
        for (let v = 0; v < 5; v++) {
          // Star point connection: vertex v connects to vertex (v+2) mod 5
          const starConnection = (v + 2) % 5;
          const parentAmp = parent.vertices[starConnection].amplitude;
          
          // Golden ratio decay as information propagates inward
          const decayedAmp: Complex = {
            re: parentAmp.re * PHI_INVERSE,
            im: parentAmp.im * PHI_INVERSE
          };
          
          // Mix with existing amplitude
          child.vertices[v].amplitude = {
            re: child.vertices[v].amplitude.re * 0.8 + decayedAmp.re * 0.2,
            im: child.vertices[v].amplitude.im * 0.8 + decayedAmp.im * 0.2
          };
        }
      }
    },
    
    propagateOutward(): void {
      // Information flows from inner to outer layers (collapse/measurement)
      for (let i = layers.length - 2; i >= 0; i--) {
        const child = layers[i + 1];
        const parent = layers[i];
        
        for (let v = 0; v < 5; v++) {
          const starConnection = (v + 2) % 5;
          const childAmp = child.vertices[starConnection].amplitude;
          
          // Amplification as information propagates outward (φ ratio)
          const amplifiedAmp: Complex = {
            re: childAmp.re * PHI_INVERSE, // Attenuate to conserve
            im: childAmp.im * PHI_INVERSE
          };
          
          parent.vertices[v].amplitude = {
            re: parent.vertices[v].amplitude.re * 0.9 + amplifiedAmp.re * 0.1,
            im: parent.vertices[v].amplitude.im * 0.9 + amplifiedAmp.im * 0.1
          };
        }
      }
    },
    
    getVertexAmplitude(depth: number, vertex: number): Complex {
      if (depth < 0 || depth >= layers.length) return complex(0);
      if (vertex < 0 || vertex >= 5) return complex(0);
      return layers[depth].vertices[vertex].amplitude;
    },
    
    setContextFocus(depth: number, edge: number): void {
      focusDepth = Math.max(0, Math.min(layers.length - 1, depth));
      focusEdge = edge % 5;
      
      // Amplify the focused edge vertices
      const layer = layers[focusDepth];
      const v1 = focusEdge;
      const v2 = (focusEdge + 1) % 5;
      
      // Boost amplitudes at focused vertices
      layer.vertices[v1].amplitude = {
        re: layer.vertices[v1].amplitude.re * PHI,
        im: layer.vertices[v1].amplitude.im * PHI
      };
      layer.vertices[v2].amplitude = {
        re: layer.vertices[v2].amplitude.re * PHI,
        im: layer.vertices[v2].amplitude.im * PHI
      };
      
      // Normalize to prevent unbounded growth
      normalizeLayerAmplitudes(layer);
    }
  };
}

/**
 * Create a single pentagram layer.
 */
function createPentagramLayer(
  depth: number,
  scale: number,
  rotation: number
): PentagramLayer {
  const vertices: PentagramVertex[] = [];
  
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i * PENTAGRAM_ANGLE - Math.PI / 2; // Start from top
    const position = fromPolar(scale, angle);
    
    // Initialize with equal superposition, slight random phase
    const initialPhase = Math.random() * 2 * Math.PI;
    const amplitude = fromPolar(1 / Math.sqrt(5), initialPhase);
    
    vertices.push({
      index: i,
      position,
      amplitude,
      phase: initialPhase
    });
  }
  
  return {
    id: uuidv4(),
    depth,
    scale,
    rotation,
    vertices
  };
}

/**
 * Update vertex positions based on current rotation.
 */
function updateLayerVertices(layer: PentagramLayer): void {
  for (let i = 0; i < 5; i++) {
    const angle = layer.rotation + i * PENTAGRAM_ANGLE - Math.PI / 2;
    layer.vertices[i].position = fromPolar(layer.scale, angle);
  }
}

/**
 * Normalize amplitudes in a layer to unit total probability.
 */
function normalizeLayerAmplitudes(layer: PentagramLayer): void {
  let totalMagSq = 0;
  for (const v of layer.vertices) {
    totalMagSq += v.amplitude.re ** 2 + v.amplitude.im ** 2;
  }
  
  if (totalMagSq > 0) {
    const normFactor = 1 / Math.sqrt(totalMagSq);
    for (const v of layer.vertices) {
      v.amplitude = {
        re: v.amplitude.re * normFactor,
        im: v.amplitude.im * normFactor
      };
    }
  }
}

/**
 * Inject an observation into the outermost layer.
 * This is how external input enters the pentagram hierarchy.
 */
export function injectObservation(
  pentagram: FractalPentagram,
  observation: WaveState
): void {
  const outerLayer = pentagram.layers[0];
  const amps = Array.from(observation.amplitudes);
  
  // Map wave amplitudes to pentagram vertices
  for (let i = 0; i < 5; i++) {
    const ampIndex = (i * 3) % Math.min(16, amps.length / 2);
    outerLayer.vertices[i].amplitude = {
      re: amps[ampIndex * 2] ?? 0,
      im: amps[ampIndex * 2 + 1] ?? 0
    };
  }
  
  normalizeLayerAmplitudes(outerLayer);
}

/**
 * Collapse observation at a specific depth (measurement).
 * Returns the collapsed wave state and propagates change outward.
 */
export function collapseAtDepth(
  pentagram: FractalPentagram,
  depth: number
): { outcome: number; waveState: WaveState } {
  const layer = pentagram.layers[Math.min(depth, pentagram.layers.length - 1)];
  
  // Calculate probabilities from amplitudes
  const probs: number[] = [];
  for (const v of layer.vertices) {
    probs.push(v.amplitude.re ** 2 + v.amplitude.im ** 2);
  }
  
  // Normalize
  const total = probs.reduce((a, b) => a + b, 0);
  const normalizedProbs = probs.map(p => p / total);
  
  // Sample outcome
  const r = Math.random();
  let cumulative = 0;
  let outcome = 0;
  for (let i = 0; i < 5; i++) {
    cumulative += normalizedProbs[i];
    if (r < cumulative) {
      outcome = i;
      break;
    }
  }
  
  // Collapse to outcome vertex
  for (let i = 0; i < 5; i++) {
    if (i === outcome) {
      layer.vertices[i].amplitude = complex(1, 0);
    } else {
      layer.vertices[i].amplitude = complex(0, 0);
    }
  }
  
  // Propagate collapse outward
  pentagram.propagateOutward();
  
  return {
    outcome,
    waveState: pentagram.getObservation(depth)
  };
}

/**
 * Calculate the total "energy" in the pentagram hierarchy.
 * Based on golden ratio weighted sum of amplitudes.
 */
export function calculatePentagramEnergy(pentagram: FractalPentagram): number {
  let energy = 0;
  
  for (let d = 0; d < pentagram.layers.length; d++) {
    const layer = pentagram.layers[d];
    const depthWeight = Math.pow(PHI, -d); // Outer layers contribute more
    
    for (const v of layer.vertices) {
      const ampMag = Math.sqrt(v.amplitude.re ** 2 + v.amplitude.im ** 2);
      energy += ampMag * depthWeight;
    }
  }
  
  return energy;
}

/**
 * Get the star points (inner vertices) of a pentagram layer.
 * These are where the star edges intersect.
 */
export function getStarPoints(layer: PentagramLayer): Complex[] {
  const starPoints: Complex[] = [];
  const innerScale = layer.scale * PHI_INVERSE_SQUARED;
  
  for (let i = 0; i < 5; i++) {
    // Star points are rotated 36° from vertices
    const angle = layer.rotation + i * PENTAGRAM_ANGLE + PENTAGRAM_ANGLE / 2 - Math.PI / 2;
    starPoints.push(fromPolar(innerScale, angle));
  }
  
  return starPoints;
}
