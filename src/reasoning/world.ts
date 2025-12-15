/**
 * WorldState and Reasoning Engine
 * Core execution loop for QFT-structured reasoning
 */

import { Proposition, PropMode, copyProposition, normalizeProposition, pYes, pNo } from './proposition';
import { 
  GateToken, GateKind, HistoryEntry,
  applyGate, applySO, validateGate, isGateAllowed
} from './gates';
import { Mat2x2, spinorDistance, normalizeSpinor, applyProjector } from './spinor';
import { isColorSinglet } from './hadron';

// ============================================================
// Constraint Type
// ============================================================

export interface Constraint {
  id: string;
  on: string;         // Proposition ID
  P: Mat2x2;          // Projector matrix
  label?: string;     // Human-readable description
}

// ============================================================
// World State
// ============================================================

export interface WorldState {
  props: Map<string, Proposition>;       // Proposition ID -> Proposition
  hadronSpecs: Map<string, PropMode>;    // Proposition ID -> PropMode
  constraints: Constraint[];             // Active constraints
  gates: GateToken[];                    // Reasoning gates to apply
  history: HistoryEntry[];               // Execution history
  
  // Metadata
  logicalTime: number;                   // Current reasoning cycle
  epsilon: number;                       // Convergence threshold
  maxIterations: number;                 // Maximum fixed-point iterations
}

// ============================================================
// World State Creation
// ============================================================

export function createWorldState(epsilon: number = 1e-6, maxIterations: number = 100): WorldState {
  return {
    props: new Map(),
    hadronSpecs: new Map(),
    constraints: [],
    gates: [],
    history: [],
    logicalTime: 0,
    epsilon,
    maxIterations,
  };
}

/** Add a proposition to the world */
export function addProposition(world: WorldState, prop: Proposition): WorldState {
  const newProps = new Map(world.props);
  const newSpecs = new Map(world.hadronSpecs);
  
  newProps.set(prop.id, prop);
  newSpecs.set(prop.id, prop.mode);
  
  return {
    ...world,
    props: newProps,
    hadronSpecs: newSpecs,
  };
}

/** Add multiple propositions */
export function addPropositions(world: WorldState, props: Proposition[]): WorldState {
  let w = world;
  for (const p of props) {
    w = addProposition(w, p);
  }
  return w;
}

/** Add a constraint */
export function addConstraint(world: WorldState, constraint: Constraint): WorldState {
  return {
    ...world,
    constraints: [...world.constraints, constraint],
  };
}

/** Add a gate */
export function addGate(world: WorldState, gate: GateToken): WorldState {
  return {
    ...world,
    gates: [...world.gates, gate],
  };
}

/** Add multiple gates */
export function addGates(world: WorldState, gates: GateToken[]): WorldState {
  return {
    ...world,
    gates: [...world.gates, ...gates],
  };
}

// ============================================================
// World State Queries
// ============================================================

/** Get proposition by ID */
export function getProp(world: WorldState, id: string): Proposition | undefined {
  return world.props.get(id);
}

/** Get all proposition IDs */
export function getPropIds(world: WorldState): string[] {
  return Array.from(world.props.keys());
}

/** Get probability of YES for a proposition */
export function getProbYes(world: WorldState, id: string): number | undefined {
  const prop = world.props.get(id);
  return prop ? pYes(prop) : undefined;
}

/** Get probability of NO for a proposition */
export function getProbNo(world: WorldState, id: string): number | undefined {
  const prop = world.props.get(id);
  return prop ? pNo(prop) : undefined;
}

// ============================================================
// Validation
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate entire world state */
export function validateWorld(world: WorldState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate propositions: normalized spinors
  for (const [id, prop] of world.props) {
    const norm = Math.sqrt(
      prop.psi[0].re ** 2 + prop.psi[0].im ** 2 +
      prop.psi[1].re ** 2 + prop.psi[1].im ** 2
    );
    if (Math.abs(norm - 1) > 1e-6) {
      warnings.push(`Proposition ${id}: spinor not normalized (norm=${norm.toFixed(6)})`);
    }
  }
  
  // Validate hadron specs: must be color singlets
  for (const [id, mode] of world.hadronSpecs) {
    if (!isColorSinglet(mode.hadron)) {
      errors.push(`Proposition ${id}: hadron is not a color singlet`);
    }
  }
  
  // Validate gates: target props must exist and match flavor patterns
  for (let i = 0; i < world.gates.length; i++) {
    const gate = world.gates[i];
    const gateError = validateGate(gate);
    if (gateError) {
      errors.push(`Gate ${i}: ${gateError}`);
      continue;
    }
    
    if (gate.target && !world.props.has(gate.target)) {
      errors.push(`Gate ${i}: target ${gate.target} not found`);
    }
    
    if (gate.cond && !world.props.has(gate.cond)) {
      errors.push(`Gate ${i}: condition ${gate.cond} not found`);
    }
    
    // Check flavor pattern
    if (gate.target) {
      const prop = world.props.get(gate.target);
      if (prop && !isGateAllowed(gate, prop)) {
        warnings.push(`Gate ${i}: flavor pattern mismatch for ${gate.target}`);
      }
    }
  }
  
  // Validate constraints: target props must exist
  for (let i = 0; i < world.constraints.length; i++) {
    const c = world.constraints[i];
    if (!world.props.has(c.on)) {
      errors.push(`Constraint ${i}: target ${c.on} not found`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Normalize all proposition spinors */
export function normalizeWorld(world: WorldState): WorldState {
  const newProps = new Map<string, Proposition>();
  
  for (const [id, prop] of world.props) {
    newProps.set(id, normalizeProposition(prop));
  }
  
  return { ...world, props: newProps };
}

// ============================================================
// Constraint Application
// ============================================================

/** Apply a single constraint (projector) */
export function applyConstraint(world: WorldState, constraint: Constraint): WorldState {
  const prop = world.props.get(constraint.on);
  if (!prop) return world;
  
  const newPsi = applyProjector(constraint.P, prop.psi);
  
  // Check if projection annihilated the state
  const norm = Math.sqrt(
    newPsi[0].re ** 2 + newPsi[0].im ** 2 +
    newPsi[1].re ** 2 + newPsi[1].im ** 2
  );
  
  if (norm < 1e-10) {
    // Contradiction - log it but don't modify
    const newHistory = [...world.history, {
      type: 'CONSTRAINT_CONTRADICTION',
      prop: constraint.on,
      data: { constraintId: constraint.id },
      timestamp: Date.now(),
    }];
    return { ...world, history: newHistory };
  }
  
  const newProps = new Map(world.props);
  newProps.set(constraint.on, { ...prop, psi: normalizeSpinor(newPsi) });
  
  return { ...world, props: newProps };
}

/** Apply all constraints */
export function applyConstraints(world: WorldState): WorldState {
  let w = world;
  for (const c of world.constraints) {
    w = applyConstraint(w, c);
  }
  return w;
}

// ============================================================
// Gate Sweep
// ============================================================

/** Apply all non-commit gates (excludes SO, UNLESS handled via constraints) */
export function sweepGates(world: WorldState): WorldState {
  let props = world.props;
  const newHistory = [...world.history];
  
  for (const gate of world.gates) {
    // Skip commit-phase gates
    if (gate.kind === GateKind.SO) continue;
    // UNLESS handled via constraints
    if (gate.kind === GateKind.UNLESS) continue;
    
    const result = applyGate(props, gate);
    if (result.success) {
      props = result.updatedProps;
      if (result.historyEntry) {
        newHistory.push(result.historyEntry);
      }
    } else {
      newHistory.push({
        type: 'GATE_ERROR',
        prop: gate.target ?? undefined,
        data: { error: result.error, gateKind: gate.kind },
        timestamp: Date.now(),
      });
    }
  }
  
  return { ...world, props, history: newHistory };
}

// ============================================================
// Fixed-Point Loop
// ============================================================

/** Compute maximum spinor distance between two world states */
export function maxSpinorDiff(oldWorld: WorldState, newWorld: WorldState): number {
  let maxDiff = 0;
  
  for (const [id, oldProp] of oldWorld.props) {
    const newProp = newWorld.props.get(id);
    if (newProp) {
      const diff = spinorDistance(oldProp.psi, newProp.psi);
      if (diff > maxDiff) maxDiff = diff;
    }
  }
  
  return maxDiff;
}

/** Deep copy world state for comparison */
export function copyWorld(world: WorldState): WorldState {
  const newProps = new Map<string, Proposition>();
  for (const [id, prop] of world.props) {
    newProps.set(id, copyProposition(prop));
  }
  
  return {
    ...world,
    props: newProps,
    history: [...world.history],
  };
}

/** Run fixed-point iteration until convergence */
export function fixedPoint(world: WorldState): WorldState {
  let w = world;
  let iterations = 0;
  
  while (iterations < world.maxIterations) {
    const oldWorld = copyWorld(w);
    
    // Normalize
    w = normalizeWorld(w);
    
    // Apply constraints
    w = applyConstraints(w);
    
    // Sweep gates
    w = sweepGates(w);
    
    // Check convergence
    const delta = maxSpinorDiff(oldWorld, w);
    if (delta < world.epsilon) {
      break;
    }
    
    iterations++;
  }
  
  // Log fixed-point completion
  w = {
    ...w,
    history: [...w.history, {
      type: 'FIXED_POINT_COMPLETE',
      data: { iterations },
      timestamp: Date.now(),
    }],
  };
  
  return w;
}

// ============================================================
// Commit Phase
// ============================================================

/** Execute commit phase (SO gates - record observations) */
export function commit(world: WorldState): WorldState {
  let props = world.props;
  const newHistory = [...world.history];
  
  for (const gate of world.gates) {
    if (gate.kind === GateKind.SO) {
      const result = applySO(props, gate);
      if (result.success && result.historyEntry) {
        newHistory.push(result.historyEntry);
      }
    }
  }
  
  return { ...world, props, history: newHistory };
}

// ============================================================
// Top-Level Reasoning
// ============================================================

/** Execute one reasoning step (one fixed-point cycle) */
export function reasoningStep(world: WorldState): WorldState {
  let w = { ...world, logicalTime: world.logicalTime + 1 };
  
  // Log step start
  w = {
    ...w,
    history: [...w.history, {
      type: 'STEP_START',
      data: { logicalTime: w.logicalTime },
      timestamp: Date.now(),
    }],
  };
  
  // Run fixed-point
  w = fixedPoint(w);
  
  // Commit observations
  w = commit(w);
  
  // Log step end
  w = {
    ...w,
    history: [...w.history, {
      type: 'STEP_END',
      data: { logicalTime: w.logicalTime },
      timestamp: Date.now(),
    }],
  };
  
  return w;
}

/** Run reasoning for N steps */
export function runReasoning(world: WorldState, steps: number = 1): WorldState {
  let w = world;
  for (let i = 0; i < steps; i++) {
    w = reasoningStep(w);
  }
  return w;
}

// ============================================================
// State Snapshots (Glimpses)
// ============================================================

export interface Glimpse {
  props: Map<string, { pYes: number; pNo: number }>;
  gates: GateToken[];
  logicalTime: number;
  timestamp: number;
}

/** Capture current state as a glimpse */
export function captureGlimpse(world: WorldState): Glimpse {
  const propsSnapshot = new Map<string, { pYes: number; pNo: number }>();
  
  for (const [id, prop] of world.props) {
    propsSnapshot.set(id, {
      pYes: pYes(prop),
      pNo: pNo(prop),
    });
  }
  
  return {
    props: propsSnapshot,
    gates: [...world.gates],
    logicalTime: world.logicalTime,
    timestamp: Date.now(),
  };
}

// ============================================================
// History Queries
// ============================================================

/** Get history entries of a specific type */
export function getHistoryByType(world: WorldState, type: string): HistoryEntry[] {
  return world.history.filter(h => h.type === type);
}

/** Get all SO (observation) results */
export function getObservations(world: WorldState): Array<{ prop: string; pYes: number; pNo: number }> {
  return world.history
    .filter(h => h.type === 'SO')
    .map(h => ({
      prop: h.prop!,
      pYes: (h.data as { p_yes: number }).p_yes,
      pNo: (h.data as { p_no: number }).p_no,
    }));
}

/** Get history summary */
export function historySummary(world: WorldState): string {
  const counts = new Map<string, number>();
  for (const h of world.history) {
    counts.set(h.type, (counts.get(h.type) || 0) + 1);
  }
  
  const lines: string[] = [`History (${world.history.length} entries):`];
  for (const [type, count] of counts) {
    lines.push(`  ${type}: ${count}`);
  }
  return lines.join('\n');
}

// ============================================================
// World State Summary
// ============================================================

export function worldSummary(world: WorldState): string {
  const lines: string[] = [
    `=== World State (t=${world.logicalTime}) ===`,
    `Propositions: ${world.props.size}`,
    `Gates: ${world.gates.length}`,
    `Constraints: ${world.constraints.length}`,
    '',
    'Propositions:',
  ];
  
  for (const [id, prop] of world.props) {
    const py = (pYes(prop) * 100).toFixed(1);
    const pn = (pNo(prop) * 100).toFixed(1);
    lines.push(`  ${id}: YES=${py}%, NO=${pn}%`);
  }
  
  return lines.join('\n');
}
