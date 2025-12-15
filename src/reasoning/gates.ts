/**
 * Reasoning Gates: QFT-structured operators for logical reasoning
 * All gates respect the spin/flavor/color structure
 */

import {
  Mat2x2, mat2x2Identity,
  Rx, Rz, Rn, mat2x2VecMul, normalizeSpinor,
  tensor2, controlledUnitary, mat4x4VecMul, factorizeVec4,
  applyProjector, PROJ_UP, PROJ_DOWN
} from './spinor';
import { FlavorPattern, flavorsMatchPattern, allFlavorsPattern } from './quark';
import { Proposition, propFlavors, pYes, pNo } from './proposition';

// ============================================================
// Gate Types
// ============================================================

export enum GateKind {
  ROT = 'ROT',         // General spin rotation
  NOT = 'NOT',         // Spin flip (π rotation about X)
  PHASE = 'PHASE',     // Z rotation (phase shift)
  IF_THEN = 'IF_THEN', // Controlled rotation (two-hadron interaction)
  UNLESS = 'UNLESS',   // Projector constraint
  SO = 'SO',           // Record measurement / observation
  BUT = 'BUT',         // Alternative branch storage
}

// ============================================================
// Gate Token (unified gate representation)
// ============================================================

export interface GateToken {
  kind: GateKind;
  target: string | null;      // Target proposition ID
  cond: string | null;        // Condition proposition ID (for IF_THEN)
  flavorPattern: FlavorPattern; // Allowed flavors for this gate
  
  // Rotation parameters
  axis?: [number, number, number];  // Rotation axis (nx, ny, nz)
  angle?: number;                    // Rotation angle θ
  
  // Phase parameters
  phi?: number;                      // Phase angle for PHASE gate
  
  // Projector for UNLESS
  projectorType?: 'up' | 'down' | 'custom';
  customProjector?: Mat2x2;
  
  // Metadata
  label?: string;                    // Human-readable label
  timestamp?: number;                // When this gate was created
}

// ============================================================
// Gate Constructors
// ============================================================

/** Create a general rotation gate */
export function rotGate(
  target: string,
  axis: [number, number, number],
  angle: number,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.ROT,
    target,
    cond: null,
    flavorPattern,
    axis,
    angle,
  };
}

/** Create NOT gate (spin flip) */
export function notGate(
  target: string,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.NOT,
    target,
    cond: null,
    flavorPattern,
    axis: [1, 0, 0],  // X axis
    angle: Math.PI,   // π rotation
  };
}

/** Create PHASE gate (Z rotation) */
export function phaseGate(
  target: string,
  phi: number,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.PHASE,
    target,
    cond: null,
    flavorPattern,
    phi,
  };
}

/** Create IF_THEN gate (controlled rotation) */
export function ifThenGate(
  cond: string,
  target: string,
  axis: [number, number, number] = [1, 0, 0],
  angle: number = Math.PI,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.IF_THEN,
    target,
    cond,
    flavorPattern,
    axis,
    angle,
  };
}

/** Create UNLESS gate (constraint projector) */
export function unlessGate(
  target: string,
  projectorType: 'up' | 'down' | 'custom' = 'up',
  customProjector?: Mat2x2,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.UNLESS,
    target,
    cond: null,
    flavorPattern,
    projectorType,
    customProjector,
  };
}

/** Create SO gate (observation/measurement) */
export function soGate(
  target: string,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.SO,
    target,
    cond: null,
    flavorPattern,
  };
}

/** Create BUT gate (alternative branch) */
export function butGate(
  target: string,
  axis: [number, number, number] = [0, 1, 0],
  angle: number = Math.PI / 2,
  flavorPattern: FlavorPattern = allFlavorsPattern()
): GateToken {
  return {
    kind: GateKind.BUT,
    target,
    cond: null,
    flavorPattern,
    axis,
    angle,
  };
}

// ============================================================
// Gate Validation
// ============================================================

/** Check if gate is allowed on proposition based on flavor pattern */
export function isGateAllowed(gate: GateToken, prop: Proposition): boolean {
  const flavors = propFlavors(prop);
  return flavorsMatchPattern(flavors, gate.flavorPattern);
}

/** Validate gate has required fields */
export function validateGate(gate: GateToken): string | null {
  switch (gate.kind) {
    case GateKind.ROT:
      if (!gate.target) return 'ROT gate requires target';
      if (!gate.axis || gate.angle === undefined) return 'ROT gate requires axis and angle';
      break;
    case GateKind.NOT:
      if (!gate.target) return 'NOT gate requires target';
      break;
    case GateKind.PHASE:
      if (!gate.target) return 'PHASE gate requires target';
      if (gate.phi === undefined) return 'PHASE gate requires phi';
      break;
    case GateKind.IF_THEN:
      if (!gate.target || !gate.cond) return 'IF_THEN gate requires target and cond';
      break;
    case GateKind.UNLESS:
      if (!gate.target) return 'UNLESS gate requires target';
      break;
    case GateKind.SO:
      if (!gate.target) return 'SO gate requires target';
      break;
    case GateKind.BUT:
      if (!gate.target) return 'BUT gate requires target';
      break;
  }
  return null;
}

// ============================================================
// Spin Rotation Computation
// ============================================================

/** Compute SU(2) rotation matrix from gate parameters */
export function computeSpinRotation(gate: GateToken): Mat2x2 {
  if (gate.kind === GateKind.PHASE && gate.phi !== undefined) {
    return Rz(gate.phi);
  }
  
  if (gate.axis && gate.angle !== undefined) {
    const [nx, ny, nz] = gate.axis;
    return Rn(nx, ny, nz, gate.angle);
  }
  
  // Default: identity (no rotation)
  return mat2x2Identity();
}

/** Get projector matrix for UNLESS gate */
export function getProjector(gate: GateToken): Mat2x2 {
  if (gate.projectorType === 'custom' && gate.customProjector) {
    return gate.customProjector;
  }
  return gate.projectorType === 'down' ? PROJ_DOWN : PROJ_UP;
}

// ============================================================
// Gate Application Functions
// ============================================================

export interface GateResult {
  success: boolean;
  error?: string;
  updatedProps: Map<string, Proposition>;
  historyEntry?: HistoryEntry;
}

export interface HistoryEntry {
  type: string;
  prop?: string;
  cond?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/** Apply ROT gate: general spin rotation */
export function applyROT(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'ROT requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  // Check flavor pattern
  if (!isGateAllowed(gate, P)) {
    return { success: false, error: `Gate not allowed on ${gate.target} due to flavor pattern`, updatedProps: updated };
  }
  
  const U = computeSpinRotation(gate);
  const newPsi = normalizeSpinor(mat2x2VecMul(U, P.psi));
  
  updated.set(gate.target, { ...P, psi: newPsi });
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'ROT',
      prop: gate.target,
      data: { axis: gate.axis, angle: gate.angle },
      timestamp: Date.now(),
    },
  };
}

/** Apply NOT gate: spin flip (π rotation about X) */
export function applyNOT(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'NOT requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  if (!isGateAllowed(gate, P)) {
    return { success: false, error: `Gate not allowed on ${gate.target}`, updatedProps: updated };
  }
  
  const U_not = Rx(Math.PI);
  const newPsi = normalizeSpinor(mat2x2VecMul(U_not, P.psi));
  
  updated.set(gate.target, { ...P, psi: newPsi });
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'NOT',
      prop: gate.target,
      timestamp: Date.now(),
    },
  };
}

/** Apply PHASE gate: Z rotation */
export function applyPHASE(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'PHASE requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  if (!isGateAllowed(gate, P)) {
    return { success: false, error: `Gate not allowed on ${gate.target}`, updatedProps: updated };
  }
  
  const phi = gate.phi ?? 0;
  const U = Rz(phi);
  const newPsi = normalizeSpinor(mat2x2VecMul(U, P.psi));
  
  updated.set(gate.target, { ...P, psi: newPsi });
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'PHASE',
      prop: gate.target,
      data: { phi },
      timestamp: Date.now(),
    },
  };
}

/** Apply IF_THEN gate: controlled rotation (two-hadron interaction) */
export function applyIF_THEN(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target || !gate.cond) {
    return { success: false, error: 'IF_THEN requires target and cond', updatedProps: updated };
  }
  
  const A = updated.get(gate.cond);
  const B = updated.get(gate.target);
  
  if (!A) {
    return { success: false, error: `Condition ${gate.cond} not found`, updatedProps: updated };
  }
  if (!B) {
    return { success: false, error: `Target ${gate.target} not found`, updatedProps: updated };
  }
  
  // Build joint state |A⟩ ⊗ |B⟩
  const Psi = tensor2(A.psi, B.psi);
  
  // Build controlled unitary: if A is |1⟩ (DOWN/NO), apply U to B
  // We use: |0⟩⟨0| ⊗ U + |1⟩⟨1| ⊗ I (apply U when condition is YES/UP)
  const U_spin = computeSpinRotation(gate);
  const U_ctrl = controlledUnitary(U_spin);
  
  // Apply controlled unitary
  const Psi_new = mat4x4VecMul(U_ctrl, Psi);
  
  // Extract factorized states (approximate for entangled states)
  const [newPsiA, newPsiB] = factorizeVec4(Psi_new);
  
  updated.set(gate.cond, { ...A, psi: newPsiA });
  updated.set(gate.target, { ...B, psi: newPsiB });
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'IF_THEN',
      prop: gate.target,
      cond: gate.cond,
      data: { axis: gate.axis, angle: gate.angle },
      timestamp: Date.now(),
    },
  };
}

/** Apply UNLESS gate: projector constraint */
export function applyUNLESS(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'UNLESS requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  const projMat = getProjector(gate);
  const newPsi = applyProjector(projMat, P.psi);
  
  // Check if projection annihilated the state
  const norm = Math.sqrt(newPsi[0].re ** 2 + newPsi[0].im ** 2 + 
                         newPsi[1].re ** 2 + newPsi[1].im ** 2);
  
  if (norm < 1e-10) {
    // State was orthogonal to projector - contradiction
    return {
      success: true,
      updatedProps: updated,
      historyEntry: {
        type: 'UNLESS_CONTRADICTION',
        prop: gate.target,
        data: { projectorType: gate.projectorType },
        timestamp: Date.now(),
      },
    };
  }
  
  updated.set(gate.target, { ...P, psi: newPsi });
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'UNLESS',
      prop: gate.target,
      data: { projectorType: gate.projectorType },
      timestamp: Date.now(),
    },
  };
}

/** Apply SO gate: record measurement (don't force collapse) */
export function applySO(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'SO requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  const p_yes = pYes(P);
  const p_no = pNo(P);
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'SO',
      prop: gate.target,
      data: { p_yes, p_no },
      timestamp: Date.now(),
    },
  };
}

/** Apply BUT gate: store alternative branch */
export function applyBUT(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const updated = new Map(props);
  
  if (!gate.target) {
    return { success: false, error: 'BUT requires target', updatedProps: updated };
  }
  
  const P = updated.get(gate.target);
  if (!P) {
    return { success: false, error: `Proposition ${gate.target} not found`, updatedProps: updated };
  }
  
  // Compute alternative state without modifying current
  const U = computeSpinRotation(gate);
  const altPsi = normalizeSpinor(mat2x2VecMul(U, P.psi));
  
  return {
    success: true,
    updatedProps: updated,
    historyEntry: {
      type: 'BUT',
      prop: gate.target,
      data: { 
        alt_state: { re0: altPsi[0].re, im0: altPsi[0].im, re1: altPsi[1].re, im1: altPsi[1].im },
        axis: gate.axis,
        angle: gate.angle,
      },
      timestamp: Date.now(),
    },
  };
}

// ============================================================
// Unified Gate Application
// ============================================================

/** Apply any gate to propositions */
export function applyGate(
  props: Map<string, Proposition>,
  gate: GateToken
): GateResult {
  const validationError = validateGate(gate);
  if (validationError) {
    return { success: false, error: validationError, updatedProps: new Map(props) };
  }
  
  switch (gate.kind) {
    case GateKind.ROT:
      return applyROT(props, gate);
    case GateKind.NOT:
      return applyNOT(props, gate);
    case GateKind.PHASE:
      return applyPHASE(props, gate);
    case GateKind.IF_THEN:
      return applyIF_THEN(props, gate);
    case GateKind.UNLESS:
      return applyUNLESS(props, gate);
    case GateKind.SO:
      return applySO(props, gate);
    case GateKind.BUT:
      return applyBUT(props, gate);
    default:
      return { success: false, error: `Unknown gate kind: ${gate.kind}`, updatedProps: new Map(props) };
  }
}

// ============================================================
// Gate Composition
// ============================================================

/** Compose two rotation gates (multiply their unitaries) */
export function composeRotations(g1: GateToken, g2: GateToken): GateToken {
  // This is approximate - exact composition would require matrix multiplication
  // For now, return g2 with combined angle (assumes same axis)
  const angle1 = g1.angle ?? 0;
  const angle2 = g2.angle ?? 0;
  
  return {
    ...g2,
    angle: angle1 + angle2,
  };
}

/** Create inverse gate (for undoing operations) */
export function inverseGate(gate: GateToken): GateToken {
  return {
    ...gate,
    angle: gate.angle !== undefined ? -gate.angle : undefined,
    phi: gate.phi !== undefined ? -gate.phi : undefined,
  };
}

// ============================================================
// Gate Serialization
// ============================================================

export function gateToString(gate: GateToken): string {
  const parts: string[] = [gate.kind];
  if (gate.target) parts.push(`target=${gate.target}`);
  if (gate.cond) parts.push(`cond=${gate.cond}`);
  if (gate.angle !== undefined) parts.push(`θ=${gate.angle.toFixed(3)}`);
  if (gate.phi !== undefined) parts.push(`φ=${gate.phi.toFixed(3)}`);
  return `Gate(${parts.join(', ')})`;
}
