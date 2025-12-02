/**
 * KCBS (Klyachko-Can-Binicioglu-Shumovsky) graph structures.
 * Models contextual quantum observables forming a pentagram.
 * 
 * The KCBS inequality demonstrates quantum contextuality:
 * Classical systems satisfy: Σ⟨AᵢAᵢ₊₁⟩ ≥ -3
 * Quantum systems can violate: down to -√5 ≈ -2.236
 */

import { v4 as uuidv4 } from 'uuid';
import { Complex, complex, normalize, innerProduct } from './complex';
import { Matrix, fromArray, matrixVectorMultiply, projector } from './linear-algebra';
import { generateKCBSDirections, KCBS_CONTEXT_EDGES, KCBS_ANGLE_SEPARATION } from '../../config/kcbs-config';

export interface KCBSObservable {
  id: string;
  direction: Float32Array;  // Unit vector in abstract space
  projector?: Matrix;       // Projection operator for this observable
}

export interface KCBSContext {
  id: string;
  observables: [KCBSObservable, KCBSObservable]; // Compatible pair (edge)
  edgeIndex: number;
}

export interface KCBSPentagram {
  id: string;
  observables: KCBSObservable[]; // length 5
  contexts: KCBSContext[];       // length 5, forming a cycle
  layer: number;                 // For nested pentagrams
}

export interface KCBSPentagramRotation {
  angle: number;                 // Rotation parameter (0 to 2π)
  pentagram: KCBSPentagram;
  rotatedDirections: Float32Array[];
}

/**
 * Create a KCBS pentagram with standard geometry.
 */
export function createKCBSPentagram(layer: number = 0): KCBSPentagram {
  const id = uuidv4();
  const directions = generateKCBSDirections();
  
  // Create observables
  const observables: KCBSObservable[] = directions.map((dir, i) => ({
    id: `${id}-obs-${i}`,
    direction: dir,
    projector: createObservableProjector(dir)
  }));
  
  // Create contexts (edges of pentagon)
  const contexts: KCBSContext[] = KCBS_CONTEXT_EDGES.map(([i, j], idx) => ({
    id: `${id}-ctx-${idx}`,
    observables: [observables[i], observables[j]],
    edgeIndex: idx
  }));
  
  return { id, observables, contexts, layer };
}

/**
 * Create projector from a direction in abstract space.
 * Maps 3D direction to a 2x2 projector using stereographic projection.
 */
function createObservableProjector(direction: Float32Array): Matrix {
  const [nx, ny, nz] = direction;
  
  // Projector P = (I + n·σ)/2 where σ are Pauli matrices
  // P = [[1+nz, nx-i*ny], [nx+i*ny, 1-nz]] / 2
  return fromArray([
    [complex((1 + nz) / 2), complex(nx / 2, -ny / 2)],
    [complex(nx / 2, ny / 2), complex((1 - nz) / 2)]
  ]);
}

/**
 * Rotate all observables in a pentagram by given angle.
 */
export function rotatePentagram(pentagram: KCBSPentagram, angle: number): KCBSPentagramRotation {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const rotatedDirections = pentagram.observables.map(obs => {
    const [x, y, z] = obs.direction;
    return new Float32Array([
      x * cos - y * sin,
      x * sin + y * cos,
      z
    ]);
  });
  
  return { angle, pentagram, rotatedDirections };
}

/**
 * Create nested pentagrams (multiple layers at different scales/rotations).
 */
export function createNestedPentagrams(
  numLayers: number,
  baseRotationOffset: number = Math.PI / 5
): KCBSPentagram[] {
  const pentagrams: KCBSPentagram[] = [];
  
  for (let layer = 0; layer < numLayers; layer++) {
    const pentagram = createKCBSPentagram(layer);
    
    // Rotate each layer by increasing offset
    const layerRotation = layer * baseRotationOffset;
    const rotated = rotatePentagram(pentagram, layerRotation);
    
    // Update directions in pentagram
    pentagram.observables.forEach((obs, i) => {
      obs.direction = rotated.rotatedDirections[i];
      obs.projector = createObservableProjector(obs.direction);
    });
    
    pentagrams.push(pentagram);
  }
  
  return pentagrams;
}

/**
 * Calculate KCBS value for a given quantum state.
 * KCBS = Σ⟨ψ|Pᵢ⊗Pᵢ₊₁|ψ⟩ - Σ⟨ψ|Pᵢ|ψ⟩
 */
export function calculateKCBSValue(pentagram: KCBSPentagram, state: Complex[]): number {
  let sum = 0;
  
  for (let i = 0; i < 5; i++) {
    const obs = pentagram.observables[i];
    if (!obs.projector) continue;
    
    // ⟨ψ|P|ψ⟩
    const projected = matrixVectorMultiply(obs.projector, state);
    const expectation = innerProduct(state, projected);
    sum -= expectation.re;
  }
  
  return sum;
}

/**
 * Find the optimal KCBS violation state (ground state of KCBS operator).
 */
export function findOptimalKCBSState(pentagram: KCBSPentagram): Complex[] {
  // For 2D Hilbert space, optimal state is roughly aligned with pentagram center
  // This is an approximation - exact solution requires numerical optimization
  const theta = Math.PI / 4; // Superposition angle
  return [
    complex(Math.cos(theta)),
    complex(Math.sin(theta))
  ];
}

/**
 * Measure in a given KCBS context (pair of compatible observables).
 */
export function measureInContext(
  context: KCBSContext,
  state: Complex[],
  whichObservable: 0 | 1
): { outcome: number; newState: Complex[]; probability: number } {
  const obs = context.observables[whichObservable];
  if (!obs.projector) {
    return { outcome: 0, newState: state, probability: 1 };
  }
  
  // Apply projector
  const projected = matrixVectorMultiply(obs.projector, state);
  const prob = innerProduct(projected, projected).re;
  
  // Collapse
  if (prob > 1e-10) {
    const collapsed = normalize(projected);
    return { outcome: 1, newState: collapsed, probability: prob };
  } else {
    // Project onto orthogonal subspace
    const orthoState: Complex[] = state.map((s, i) => ({
      re: s.re - projected[i].re,
      im: s.im - projected[i].im
    }));
    const collapsed = normalize(orthoState);
    return { outcome: 0, newState: collapsed, probability: 1 - prob };
  }
}

/**
 * Get context by rotation angle (maps continuous angle to discrete context).
 */
export function getContextFromAngle(pentagram: KCBSPentagram, angle: number): KCBSContext {
  // Map angle to context index (0-4)
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const index = Math.floor(normalizedAngle / KCBS_ANGLE_SEPARATION) % 5;
  return pentagram.contexts[index];
}

/**
 * Calculate contextuality witness value.
 * Negative values indicate quantum contextuality.
 */
export function contextualityWitness(
  pentagram: KCBSPentagram,
  measurementResults: number[]
): number {
  if (measurementResults.length !== 5) {
    throw new Error('Need exactly 5 measurement results');
  }
  
  // KCBS witness: Σ(1 - AᵢAᵢ₊₁)/2 where Aᵢ ∈ {-1, +1}
  let witness = 0;
  for (let i = 0; i < 5; i++) {
    const ai = measurementResults[i] === 0 ? -1 : 1;
    const aj = measurementResults[(i + 1) % 5] === 0 ? -1 : 1;
    witness += (1 - ai * aj) / 2;
  }
  
  // Classical bound: ≥ 2
  // Quantum bound: can reach √5 - 1 ≈ 1.236
  return witness;
}

export { generateKCBSDirections, KCBS_CONTEXT_EDGES };
