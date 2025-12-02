/**
 * Temporal structure emerging from the double inversion loop.
 * 
 * From the ontology:
 * - A sequence of operations (inversion → inversion) implies proto-temporality
 * - Time corresponds to the second inversion (closure)
 * - Time is the closure operation on what space has differentiated
 * - Time is not opposite to space but its second-stage inversion
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Logical time: discrete ticks of the inversion-closure loop.
 * This is the fundamental temporal unit before numeric time emerges.
 */
export interface LogicalTime {
  tick: number;
  realityId: string;
}

/**
 * A temporal moment: the state of a closure at a logical tick.
 */
export interface TemporalMoment {
  id: string;
  logicalTime: LogicalTime;
  closureState: ClosureState;
  parentMomentId?: string;
  childMomentIds: string[];
}

/**
 * Closure state: tracks whether a loop has completed.
 */
export enum ClosureState {
  UNDETERMINED = 'undetermined',  // Before first inversion
  INVERTED = 'inverted',          // After first inversion (spatial distinction)
  CLOSING = 'closing',            // Second inversion in progress
  CLOSED = 'closed',              // Loop complete (temporal settlement)
  REOPENED = 'reopened'           // New cycle beginning
}

/**
 * Temporal arrow: the direction of closure sequences.
 */
export interface TemporalArrow {
  direction: 'forward' | 'backward';
  strength: number; // 0 to 1, how strongly directed
  entropy: number;  // Disorder measure
}

/**
 * Clock: tracks logical time progression within a reality.
 */
export class Clock {
  private tick: number = 0;
  private realityId: string;
  private moments: Map<number, TemporalMoment> = new Map();
  
  constructor(realityId: string) {
    this.realityId = realityId;
  }
  
  getCurrentTime(): LogicalTime {
    return { tick: this.tick, realityId: this.realityId };
  }
  
  advance(): LogicalTime {
    this.tick++;
    return this.getCurrentTime();
  }
  
  getTick(): number {
    return this.tick;
  }
  
  recordMoment(closureState: ClosureState, parentId?: string): TemporalMoment {
    const moment: TemporalMoment = {
      id: uuidv4(),
      logicalTime: this.getCurrentTime(),
      closureState,
      parentMomentId: parentId,
      childMomentIds: []
    };
    
    this.moments.set(this.tick, moment);
    
    // Update parent's children
    if (parentId) {
      for (const m of this.moments.values()) {
        if (m.id === parentId) {
          m.childMomentIds.push(moment.id);
          break;
        }
      }
    }
    
    return moment;
  }
  
  getMomentAt(tick: number): TemporalMoment | undefined {
    return this.moments.get(tick);
  }
  
  getHistory(fromTick: number, toTick: number): TemporalMoment[] {
    const history: TemporalMoment[] = [];
    for (let t = fromTick; t <= toTick; t++) {
      const moment = this.moments.get(t);
      if (moment) history.push(moment);
    }
    return history;
  }
}

/**
 * Time dilation factor based on closure difficulty.
 * Regions where closure is harder experience slower time.
 */
export function calculateTimeDilation(closureDifficulty: number): number {
  // Lorentz-like factor: γ = 1/√(1 - v²/c²)
  // Here: difficulty plays role of v²/c²
  const clampedDifficulty = Math.max(0, Math.min(0.99, closureDifficulty));
  return 1 / Math.sqrt(1 - clampedDifficulty);
}

/**
 * Temporal interval between two moments.
 */
export interface TemporalInterval {
  startTick: number;
  endTick: number;
  duration: number;
  dilationFactor: number;
  properTime: number; // Duration adjusted for dilation
}

export function calculateInterval(
  start: TemporalMoment,
  end: TemporalMoment,
  avgClosureDifficulty: number
): TemporalInterval {
  const duration = end.logicalTime.tick - start.logicalTime.tick;
  const dilation = calculateTimeDilation(avgClosureDifficulty);
  
  return {
    startTick: start.logicalTime.tick,
    endTick: end.logicalTime.tick,
    duration,
    dilationFactor: dilation,
    properTime: duration / dilation
  };
}

/**
 * Check temporal ordering: is moment A before moment B?
 */
export function isBefore(a: TemporalMoment, b: TemporalMoment): boolean {
  if (a.logicalTime.realityId !== b.logicalTime.realityId) {
    // Different realities may not have well-defined ordering
    return false;
  }
  return a.logicalTime.tick < b.logicalTime.tick;
}

/**
 * Find common ancestor of two temporal moments.
 */
export function findCommonAncestor(
  a: TemporalMoment,
  b: TemporalMoment,
  moments: Map<string, TemporalMoment>
): TemporalMoment | null {
  const aAncestors = new Set<string>();
  
  // Collect all ancestors of a
  let current: TemporalMoment | undefined = a;
  while (current) {
    aAncestors.add(current.id);
    current = current.parentMomentId 
      ? moments.get(current.parentMomentId) 
      : undefined;
  }
  
  // Find first ancestor of b that is also ancestor of a
  current = b;
  while (current) {
    if (aAncestors.has(current.id)) {
      return current;
    }
    current = current.parentMomentId 
      ? moments.get(current.parentMomentId) 
      : undefined;
  }
  
  return null;
}

/**
 * Calculate temporal entropy: measure of closure irreversibility.
 */
export function calculateTemporalEntropy(history: TemporalMoment[]): number {
  if (history.length === 0) return 0;
  
  // Count state transitions
  const transitions: Record<string, number> = {};
  for (let i = 1; i < history.length; i++) {
    const key = `${history[i-1].closureState}->${history[i].closureState}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  
  // Shannon entropy of transition distribution
  const total = history.length - 1;
  let entropy = 0;
  for (const count of Object.values(transitions)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  
  return entropy;
}
