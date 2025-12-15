/**
 * QFT-Structured Reasoning Module
 * 
 * Mathematical backbone based on Quantum Field Theory:
 * - Single-quark Hilbert space: H_q = H_pos ⊗ H_spin ⊗ H_flavor ⊗ H_color
 * - Fermionic Fock space with Pauli exclusion
 * - Hadrons as color singlets (baryons: qqq, mesons: qq̄)
 * - Propositions as spin states of hadrons (YES/NO = UP/DOWN)
 * - Gates as QFT-structured operators respecting flavor/color
 * 
 * Usage:
 * ```typescript
 * import { 
 *   createWorldState, addProposition, addGate, runReasoning,
 *   propYes, proton, notGate, ifThenGate
 * } from './reasoning';
 * 
 * // Create world with propositions
 * let world = createWorldState();
 * world = addProposition(world, propYes('rain', proton(0)));
 * world = addProposition(world, propNo('umbrella', proton(1)));
 * 
 * // Add reasoning gates
 * world = addGate(world, ifThenGate('rain', 'umbrella'));
 * 
 * // Run reasoning
 * world = runReasoning(world, 1);
 * ```
 */

// ============================================================
// Complex Numbers
// ============================================================
export type { Complex } from './complex';
export {
  complex,
  add, sub, mul, div, scale, neg,
  conj, abs, abs2, arg,
  expI, exp, sqrt,
  eq, isZero,
  toString as complexToString,
  ZERO, ONE, I,
} from './complex';

// ============================================================
// Spinor & Matrix Operations
// ============================================================
export type { Spinor, Mat2x2, Mat4x4, Vec4 } from './spinor';
export {
  // Spinor operations
  spinor, spinorUp, spinorDown,
  spinorNorm, normalizeSpinor,
  spinorAdd, spinorScale,
  spinorInnerProduct, spinorDistance,
  probUp, probDown,
  
  // Pauli matrices
  PAULI_I, PAULI_X, PAULI_Y, PAULI_Z,
  
  // Matrix operations
  mat2x2Identity, mat2x2Zero,
  mat2x2Add, mat2x2Scale, mat2x2Mul,
  mat2x2VecMul, mat2x2Adjoint,
  mat2x2Trace, mat2x2Det,
  
  // SU(2) rotations
  Rx, Ry, Rz, Rn,
  
  // Projectors
  PROJ_UP, PROJ_DOWN,
  projector, applyProjector,
  
  // 4D operations
  tensor2, tensorMat2x2,
  mat4x4Identity, mat4x4VecMul,
  controlledUnitary,
  partialTraceFirst, factorizeVec4,
} from './spinor';

// ============================================================
// Quark Types
// ============================================================
export type { QuarkIndex, AntiquarkIndex, FlavorPattern } from './quark';
export {
  // Enums
  Spin, Flavor, Color,
  
  // Labels and names
  spinLabel, spinToLogical,
  FLAVOR_NAMES, FLAVOR_SYMBOLS, FLAVOR_DOUBLETS,
  COLOR_NAMES, COLOR_SYMBOLS, ALL_COLORS,
  
  // Flavor utilities
  flavorGeneration, isUpType, isDownType, doubletPartner,
  
  // Quark index
  quarkIndex, quarkLabel, antiquarkLabel,
  sameQuarkMode,
  
  // Levi-Civita
  leviCivita,
  
  // Flavor patterns
  allFlavorsPattern, generationPattern, firstGenPattern, lightQuarkPattern,
  flavorsMatchPattern,
} from './quark';

// ============================================================
// Hadron Structures
// ============================================================
export type { HadronSpec, BaryonSpec, MesonSpec, FockOccupation } from './hadron';
export {
  // Types
  HadronType,
  
  // Baryon operations
  createBaryon, baryonFromQuarks,
  isColorSingletBaryon, baryonColorSign,
  baryonFlavors, baryonLabel, baryonDescription,
  
  // Meson operations
  createMeson, mesonFromQuarks,
  isColorSingletMeson,
  mesonFlavors, mesonLabel, mesonDescription,
  
  // Generic hadron
  isBaryon, isMeson,
  hadronLabel, hadronFlavors, isColorSinglet,
  
  // Named particles
  proton, neutron, pionPlus, pionMinus, kaonPlus,
  
  // Fock space
  createFockOccupation,
  createQuark, annihilateQuark,
  createAntiquark, annihilateAntiquark,
} from './hadron';

// ============================================================
// Propositions
// ============================================================
export type { PropMode, Proposition } from './proposition';
export {
  // Creation
  createPropMode,
  propYes, propNo, propSuperposition,
  propWithProbability, propUncertain,
  
  // Queries
  pYes, pNo,
  isDefiniteYes, isDefiniteNo, isInSuperposition,
  beliefStrength, beliefDirection,
  
  // Metadata
  propFlavors, propLabel, propDescription, propInterpretation,
  
  // Operations
  copyProposition, withSpinor, normalizeProposition,
} from './proposition';

// ============================================================
// Gates
// ============================================================
export type { GateToken, HistoryEntry, GateResult } from './gates';
export {
  // Types
  GateKind,
  
  // Gate constructors
  rotGate, notGate, phaseGate,
  ifThenGate, unlessGate, soGate, butGate,
  
  // Validation
  isGateAllowed, validateGate,
  
  // Computation
  computeSpinRotation, getProjector,
  
  // Application
  applyROT, applyNOT, applyPHASE,
  applyIF_THEN, applyUNLESS, applySO, applyBUT,
  applyGate,
  
  // Utilities
  composeRotations, inverseGate, gateToString,
} from './gates';

// ============================================================
// World State & Engine
// ============================================================
export type { Constraint, WorldState, Glimpse, ValidationResult } from './world';
export {
  // Creation
  createWorldState,
  addProposition, addPropositions,
  addConstraint, addGate, addGates,
  
  // Queries
  getProp, getPropIds, getProbYes, getProbNo,
  
  // Validation
  validateWorld, normalizeWorld,
  
  // Engine
  applyConstraint, applyConstraints,
  sweepGates,
  maxSpinorDiff, copyWorld,
  fixedPoint,
  commit,
  reasoningStep, runReasoning,
  
  // Glimpses
  captureGlimpse,
  
  // History
  getHistoryByType, getObservations, historySummary,
  
  // Summary
  worldSummary,
} from './world';

// ============================================================
// Inference & Metrics
// ============================================================
export type {
  ReasoningChain,
  InferenceContext,
  PropositionMetrics,
  TemporalMetrics,
  SpatialMetrics,
  SafetyAssessment,
} from './inference';
export {
  // Reasoning chains
  createChain, addToChain, simulateUpTo,
  
  // Unitary averaging
  averageUnitaries,
  
  // Gap inference
  inferMissingGate,
  
  // Proposition metrics
  computeMetrics, computeWorldMetrics,
  
  // Temporal metrics
  computeTemporalMetrics,
  
  // Spatial metrics
  computeSpatialMetrics,
  
  // KCBS
  checkKCBSViolation,
  
  // Safety
  assessInferenceSafety,
} from './inference';
