/**
 * Gap-Filling and Inference
 * Infer missing gates from similar reasoning chains
 * Compute intensity/frequency metrics
 */

import { GateToken, rotGate, computeSpinRotation } from './gates';
import { Mat2x2, mat2x2Add, mat2x2Scale, mat2x2Identity } from './spinor';
import { Complex, complex, add, mul, scale, abs } from './complex';
import { WorldState, captureGlimpse, Glimpse, runReasoning } from './world';
import { Proposition, pYes, pNo } from './proposition';
import { FlavorPattern, allFlavorsPattern } from './quark';

// ============================================================
// Reasoning Chain (sequence of states with gates)
// ============================================================

export interface ReasoningChain {
  id: string;
  initial: WorldState;
  gates: (GateToken | null)[];  // null = hole/gap
  glimpses: Glimpse[];          // Captured states at each step
}

/** Create a new reasoning chain */
export function createChain(id: string, initial: WorldState): ReasoningChain {
  return {
    id,
    initial,
    gates: [],
    glimpses: [captureGlimpse(initial)],
  };
}

/** Add a gate to the chain (null for gaps) */
export function addToChain(chain: ReasoningChain, gate: GateToken | null, world: WorldState): ReasoningChain {
  return {
    ...chain,
    gates: [...chain.gates, gate],
    glimpses: [...chain.glimpses, captureGlimpse(world)],
  };
}

/** Simulate chain up to a gate index */
export function simulateUpTo(chain: ReasoningChain, gateIndex: number): WorldState {
  let world = chain.initial;
  
  for (let i = 0; i <= gateIndex && i < chain.gates.length; i++) {
    const gate = chain.gates[i];
    if (gate) {
      world = {
        ...world,
        gates: [gate],
      };
      world = runReasoning(world, 1);
    }
  }
  
  return world;
}

// ============================================================
// Unitary Averaging in SU(2)
// ============================================================

/**
 * Average multiple SU(2) matrices using Lie algebra approach
 * log(U) average then exponentiate back
 * For small rotations, this is approximately:
 * U_avg ≈ normalize(Σ U_i)
 */
export function averageUnitaries(matrices: Mat2x2[], weights?: number[]): Mat2x2 {
  if (matrices.length === 0) return mat2x2Identity();
  if (matrices.length === 1) return matrices[0];
  
  // Normalize weights
  const w = weights ?? matrices.map(() => 1);
  const wSum = w.reduce((a, b) => a + b, 0);
  const normWeights = w.map(x => x / wSum);
  
  // Weighted sum of matrices (approximate averaging)
  let sum: Mat2x2 = [
    [complex(0, 0), complex(0, 0)],
    [complex(0, 0), complex(0, 0)],
  ];
  
  for (let i = 0; i < matrices.length; i++) {
    const scaled = mat2x2Scale(matrices[i], complex(normWeights[i], 0));
    sum = mat2x2Add(sum, scaled);
  }
  
  // Project back to SU(2) via polar decomposition approximation
  // U = (A†A)^(-1/2) A for closest unitary
  // Simplified: just normalize the result
  return normalizeToUnitary(sum);
}

/** Approximate normalization to nearest unitary */
function normalizeToUnitary(m: Mat2x2): Mat2x2 {
  // For a 2x2 matrix, nearest unitary via polar decomposition
  // Simplified approach: Gram-Schmidt on columns
  
  // Get columns
  const c0: [Complex, Complex] = [m[0][0], m[1][0]];
  const c1: [Complex, Complex] = [m[0][1], m[1][1]];
  
  // Normalize first column
  const n0 = Math.sqrt(abs(c0[0]) ** 2 + abs(c0[1]) ** 2);
  if (n0 < 1e-10) return mat2x2Identity();
  
  const u0: [Complex, Complex] = [scale(c0[0], 1/n0), scale(c0[1], 1/n0)];
  
  // Orthogonalize second column
  const dot = add(mul(conj(u0[0]), c1[0]), mul(conj(u0[1]), c1[1]));
  const c1_orth: [Complex, Complex] = [
    add(c1[0], scale(mul(complex(-1, 0), dot), u0[0].re)),
    add(c1[1], scale(mul(complex(-1, 0), dot), u0[1].re)),
  ];
  
  // Normalize second column
  const n1 = Math.sqrt(abs(c1_orth[0]) ** 2 + abs(c1_orth[1]) ** 2);
  if (n1 < 1e-10) {
    // Second column is parallel to first, construct orthogonal
    return [
      [u0[0], complex(-u0[1].re, u0[1].im)],
      [u0[1], complex(u0[0].re, -u0[0].im)],
    ];
  }
  
  const u1: [Complex, Complex] = [scale(c1_orth[0], 1/n1), scale(c1_orth[1], 1/n1)];
  
  return [
    [u0[0], u1[0]],
    [u0[1], u1[1]],
  ];
}

function conj(c: Complex): Complex {
  return { re: c.re, im: -c.im };
}

// ============================================================
// Gap Inference
// ============================================================

export interface InferenceContext {
  chains: ReasoningChain[];
  flavorPatterns: FlavorPattern[];
}

/**
 * Infer a missing gate from similar chains
 * Uses KCBS-style contextual averaging
 */
export function inferMissingGate(
  ctx: InferenceContext,
  chainIndex: number,
  gateIndex: number,
  targetProp: string
): GateToken | null {
  const chain = ctx.chains[chainIndex];
  if (!chain) return null;
  
  // Collect candidate unitaries from other chains
  const candidates: Mat2x2[] = [];
  const weights: number[] = [];
  
  for (let i = 0; i < ctx.chains.length; i++) {
    if (i === chainIndex) continue;
    
    const otherChain = ctx.chains[i];
    if (gateIndex >= otherChain.gates.length) continue;
    
    const gate = otherChain.gates[gateIndex];
    if (!gate || gate.target !== targetProp) continue;
    
    // Get the unitary from this gate
    const U = computeSpinRotation(gate);
    candidates.push(U);
    
    // Weight by similarity of context (glimpse similarity)
    const similarity = computeGlimpseSimilarity(
      chain.glimpses[gateIndex] ?? chain.glimpses[chain.glimpses.length - 1],
      otherChain.glimpses[gateIndex] ?? otherChain.glimpses[otherChain.glimpses.length - 1]
    );
    weights.push(similarity);
  }
  
  if (candidates.length === 0) return null;
  
  // Average the unitaries
  const U_avg = averageUnitaries(candidates, weights);
  
  // Extract rotation parameters from averaged unitary
  const { axis, angle } = extractRotationParams(U_avg);
  
  // Quantize to nearest allowed gate
  return quantizeToGate(targetProp, axis, angle, ctx.flavorPatterns);
}

/** Compute similarity between two glimpses */
function computeGlimpseSimilarity(g1: Glimpse, g2: Glimpse): number {
  let totalDiff = 0;
  let count = 0;
  
  for (const [id, p1] of g1.props) {
    const p2 = g2.props.get(id);
    if (p2) {
      totalDiff += Math.abs(p1.pYes - p2.pYes);
      count++;
    }
  }
  
  if (count === 0) return 0;
  
  // Convert difference to similarity (0 to 1)
  return Math.exp(-totalDiff / count);
}

/** Extract rotation axis and angle from 2x2 unitary */
function extractRotationParams(U: Mat2x2): { axis: [number, number, number]; angle: number } {
  // For SU(2): U = cos(θ/2)I - i sin(θ/2)(n·σ)
  // Trace(U) = 2 cos(θ/2)
  const trace = add(U[0][0], U[1][1]);
  const cosHalfTheta = trace.re / 2;
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, cosHalfTheta)));
  
  if (Math.abs(angle) < 1e-10) {
    return { axis: [0, 0, 1], angle: 0 };
  }
  
  const sinHalfTheta = Math.sin(angle / 2);
  if (Math.abs(sinHalfTheta) < 1e-10) {
    return { axis: [0, 0, 1], angle };
  }
  
  // Extract axis from off-diagonal and diagonal differences
  // n_x = -Im(U[0][1]) / sin(θ/2)
  // n_y = Re(U[0][1]) / sin(θ/2)  (for specific representation)
  // n_z = -Im(U[0][0]) / sin(θ/2)
  
  const nx = -U[0][1].im / sinHalfTheta;
  const ny = -U[1][0].im / sinHalfTheta;
  const nz = (U[1][1].im - U[0][0].im) / (2 * sinHalfTheta);
  
  // Normalize axis
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-10) {
    return { axis: [0, 0, 1], angle };
  }
  
  return {
    axis: [nx / len, ny / len, nz / len],
    angle,
  };
}

/** Quantize rotation to allowed gate */
function quantizeToGate(
  target: string,
  axis: [number, number, number],
  angle: number,
  allowedPatterns: FlavorPattern[]
): GateToken {
  // Quantize angle to nearest π/4
  const quantizedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  
  // Use first allowed pattern or all flavors
  const pattern = allowedPatterns.length > 0 ? allowedPatterns[0] : allFlavorsPattern();
  
  return rotGate(target, axis, quantizedAngle, pattern);
}

// ============================================================
// Intensity & Frequency Metrics
// ============================================================

export interface PropositionMetrics {
  id: string;
  intensityYes: number;     // |ψ[0]|² - probability toward YES
  intensityNo: number;      // |ψ[1]|² - probability toward NO
  beliefStrength: number;   // How far from 50/50
  phase: number;            // Relative phase between components
}

/** Compute metrics for a proposition */
export function computeMetrics(prop: Proposition): PropositionMetrics {
  const py = pYes(prop);
  const pn = pNo(prop);
  
  // Compute relative phase
  const phase = Math.atan2(prop.psi[1].im, prop.psi[1].re) - 
                Math.atan2(prop.psi[0].im, prop.psi[0].re);
  
  return {
    id: prop.id,
    intensityYes: py,
    intensityNo: pn,
    beliefStrength: Math.abs(py - 0.5) * 2,
    phase: phase,
  };
}

/** Compute all proposition metrics for a world */
export function computeWorldMetrics(world: WorldState): Map<string, PropositionMetrics> {
  const metrics = new Map<string, PropositionMetrics>();
  
  for (const [id, prop] of world.props) {
    metrics.set(id, computeMetrics(prop));
  }
  
  return metrics;
}

// ============================================================
// Temporal Frequency (rate of change)
// ============================================================

export interface TemporalMetrics {
  propId: string;
  frequency: number;        // Rate of spinor change
  stability: number;        // 1 - frequency (how stable)
  trend: 'increasing' | 'decreasing' | 'stable';
}

/** Compute temporal metrics from glimpse history */
export function computeTemporalMetrics(
  glimpses: Glimpse[],
  propId: string
): TemporalMetrics {
  if (glimpses.length < 2) {
    return { propId, frequency: 0, stability: 1, trend: 'stable' };
  }
  
  let totalChange = 0;
  let lastPy: number | null = null;
  let increases = 0;
  let decreases = 0;
  
  for (const g of glimpses) {
    const p = g.props.get(propId);
    if (p) {
      if (lastPy !== null) {
        totalChange += Math.abs(p.pYes - lastPy);
        if (p.pYes > lastPy) increases++;
        else if (p.pYes < lastPy) decreases++;
      }
      lastPy = p.pYes;
    }
  }
  
  const frequency = totalChange / (glimpses.length - 1);
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (increases > decreases * 1.5) trend = 'increasing';
  else if (decreases > increases * 1.5) trend = 'decreasing';
  
  return {
    propId,
    frequency,
    stability: 1 - Math.min(1, frequency),
    trend,
  };
}

// ============================================================
// Spatial Frequency (variation across propositions)
// ============================================================

export interface SpatialMetrics {
  avgIntensityYes: number;
  avgIntensityNo: number;
  variance: number;         // How much intensities vary across props
  coherence: number;        // Agreement between propositions
}

/** Compute spatial metrics across all propositions */
export function computeSpatialMetrics(world: WorldState): SpatialMetrics {
  const props = Array.from(world.props.values());
  if (props.length === 0) {
    return { avgIntensityYes: 0.5, avgIntensityNo: 0.5, variance: 0, coherence: 1 };
  }
  
  let sumYes = 0;
  let sumNo = 0;
  
  for (const p of props) {
    sumYes += pYes(p);
    sumNo += pNo(p);
  }
  
  const avgYes = sumYes / props.length;
  const avgNo = sumNo / props.length;
  
  // Compute variance
  let variance = 0;
  for (const p of props) {
    variance += (pYes(p) - avgYes) ** 2;
  }
  variance /= props.length;
  
  // Coherence: 1 if all props agree, 0 if maximally varied
  const coherence = 1 - Math.sqrt(variance) * 2;
  
  return {
    avgIntensityYes: avgYes,
    avgIntensityNo: avgNo,
    variance,
    coherence: Math.max(0, coherence),
  };
}

// ============================================================
// KCBS Contextuality Check
// ============================================================

/**
 * Check for KCBS-style contextuality in a set of propositions
 * Returns violation amount (> 0 indicates non-classical correlations)
 */
export function checkKCBSViolation(
  world: WorldState,
  propIds: [string, string, string, string, string]  // 5 propositions in pentagram
): number {
  // KCBS inequality: Σ P(A_i ∧ A_{i+1}) ≤ 2 (classical)
  // Quantum: can exceed 2
  
  let sum = 0;
  
  for (let i = 0; i < 5; i++) {
    const id1 = propIds[i];
    const id2 = propIds[(i + 1) % 5];
    
    const p1 = world.props.get(id1);
    const p2 = world.props.get(id2);
    
    if (p1 && p2) {
      // Approximate joint probability (product for independent)
      // In reality, would need full density matrix
      const joint = pYes(p1) * pYes(p2);
      sum += joint;
    }
  }
  
  // Classical bound is 2, quantum can reach ~2.236
  return sum - 2;
}

// ============================================================
// Inference Safety Assessment
// ============================================================

export interface SafetyAssessment {
  safe: boolean;
  confidence: number;
  reason: string;
}

/** Assess whether gap-filling is safe in a region */
export function assessInferenceSafety(
  chain: ReasoningChain,
  gateIndex: number
): SafetyAssessment {
  // Safe if:
  // 1. Surrounding states are stable (low temporal frequency)
  // 2. Context is smooth (low spatial frequency variation)
  
  const startIdx = Math.max(0, gateIndex - 2);
  const endIdx = Math.min(chain.glimpses.length - 1, gateIndex + 2);
  const relevantGlimpses = chain.glimpses.slice(startIdx, endIdx + 1);
  
  if (relevantGlimpses.length < 2) {
    return { safe: false, confidence: 0, reason: 'Insufficient context' };
  }
  
  // Check temporal stability
  let maxFreq = 0;
  for (const [propId] of relevantGlimpses[0].props) {
    const metrics = computeTemporalMetrics(relevantGlimpses, propId);
    if (metrics.frequency > maxFreq) maxFreq = metrics.frequency;
  }
  
  if (maxFreq > 0.3) {
    return {
      safe: false,
      confidence: 1 - maxFreq,
      reason: `High temporal frequency (${maxFreq.toFixed(3)})`,
    };
  }
  
  // Safe region
  return {
    safe: true,
    confidence: 1 - maxFreq,
    reason: 'Stable context',
  };
}
