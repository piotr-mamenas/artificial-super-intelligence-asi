/**
 * QUARK FLAVORS - Phase Archetypes with Duality
 * 
 * CORRECTED: Space is the INVERSE of time.
 * This means time-quarks and space-quarks are DUAL PAIRS:
 * 
 *   Up (φ=0) ←DUAL→ Charm (φ_s=-0=0)
 *   Down (φ=π) ←DUAL→ Strange (φ_s=-π=π)
 * 
 * They are the SAME quark viewed from time vs space perspective!
 * 
 * Fundamental distinctions (3, not 6):
 *   1. Forward (up/charm at φ≈0) vs Reversed (down/strange at φ≈π)
 *   2. Closure: Top (tight) vs Bottom (wide)
 * 
 * We keep the 6-quark naming for compatibility but they are paired:
 *   Up = Charm (same position on circle)
 *   Down = Strange (antipodal position)
 */

import { 
  PhasePoint, 
  PhaseSpread, 
  normalizePhase,
  createPhasePoint,
} from './phase-space';

// ============================================
// QUARK TYPES
// ============================================

export type TimeQuark = 'up' | 'down';
export type SpaceQuark = 'charm' | 'strange';
export type ClosureQuark = 'top' | 'bottom';

export type QuarkFlavor = TimeQuark | SpaceQuark | ClosureQuark;

export interface QuarkState {
  time: TimeQuark;
  space: SpaceQuark;
  closure: ClosureQuark;
}

// ============================================
// ARCHETYPE PHASE VALUES
// ============================================

export const QUARK_PHASES = {
  // Time-phase archetypes
  up: 0,                    // φ_t = 0
  down: Math.PI,            // φ_t = π
  
  // Space-phase archetypes
  charm: 0,                 // φ_s = 0
  strange: Math.PI,         // φ_s = π
  
  // Closure spread archetypes
  top: 0.1,                 // Tight spread (decisive)
  bottom: 1.0,              // Wide spread (soft)
} as const;

// ============================================
// QUARK CLASSIFICATION
// ============================================

/**
 * Classify time-phase to quark flavor
 */
export function classifyTimeQuark(φ_t: number): TimeQuark {
  const normalized = normalizePhase(φ_t);
  // Closer to 0 → Up, closer to π → Down
  const distToUp = Math.min(normalized, 2 * Math.PI - normalized);
  const distToDown = Math.abs(normalized - Math.PI);
  return distToUp < distToDown ? 'up' : 'down';
}

/**
 * Classify space-phase to quark flavor
 * NOTE: Due to duality, this SHOULD match the time quark!
 * charm ↔ up (both at φ≈0)
 * strange ↔ down (both at φ≈π)
 */
export function classifySpaceQuark(φ_s: number): SpaceQuark {
  const normalized = normalizePhase(φ_s);
  const distToCharm = Math.min(normalized, 2 * Math.PI - normalized);
  const distToStrange = Math.abs(normalized - Math.PI);
  return distToCharm < distToStrange ? 'charm' : 'strange';
}

/**
 * Get the dual space quark for a time quark
 * Up ↔ Charm, Down ↔ Strange
 */
export function dualSpaceQuark(t: TimeQuark): SpaceQuark {
  return t === 'up' ? 'charm' : 'strange';
}

/**
 * Get the dual time quark for a space quark
 */
export function dualTimeQuark(s: SpaceQuark): TimeQuark {
  return s === 'charm' ? 'up' : 'down';
}

/**
 * Check if time and space quarks satisfy duality
 */
export function quarksAreDual(t: TimeQuark, s: SpaceQuark): boolean {
  return dualSpaceQuark(t) === s;
}

/**
 * Classify spread to closure quark
 */
export function classifyClosureQuark(spread: PhaseSpread): ClosureQuark {
  const avgSpread = (spread.σ_t + spread.σ_s) / 2;
  const threshold = (QUARK_PHASES.top + QUARK_PHASES.bottom) / 2;
  return avgSpread < threshold ? 'top' : 'bottom';
}

/**
 * Full quark classification from phase point and spread
 */
export function classifyQuarkState(point: PhasePoint, spread: PhaseSpread): QuarkState {
  return {
    time: classifyTimeQuark(point.φ_t),
    space: classifySpaceQuark(point.φ_s),
    closure: classifyClosureQuark(spread),
  };
}

// ============================================
// QUARK TRANSFORMATIONS UNDER INVERSION
// ============================================

/**
 * Time inversion swaps Up ↔ Down
 */
export function timeInvertQuark(q: QuarkState): QuarkState {
  return {
    time: q.time === 'up' ? 'down' : 'up',
    space: q.space,
    closure: q.closure,
  };
}

/**
 * Space inversion swaps Charm ↔ Strange
 */
export function spaceInvertQuark(q: QuarkState): QuarkState {
  return {
    time: q.time,
    space: q.space === 'charm' ? 'strange' : 'charm',
    closure: q.closure,
  };
}

/**
 * Full inversion swaps both time and space quarks
 * Optionally also flips Top ↔ Bottom
 */
export function fullInvertQuark(q: QuarkState, invertClosure: boolean = false): QuarkState {
  return {
    time: q.time === 'up' ? 'down' : 'up',
    space: q.space === 'charm' ? 'strange' : 'charm',
    closure: invertClosure 
      ? (q.closure === 'top' ? 'bottom' : 'top')
      : q.closure,
  };
}

// ============================================
// QUARK PHASE GENERATION
// ============================================

/**
 * Generate phase point from quark state
 * Since space = inverse of time, only time quark determines position
 * Space quark is just the dual view (must match!)
 */
export function quarkToPhase(q: QuarkState, noise: number = 0.1): PhasePoint {
  // Time quark determines the phase
  const basePhase = q.time === 'up' ? QUARK_PHASES.up : QUARK_PHASES.down;
  
  // Use createPhasePoint to enforce duality
  return createPhasePoint(basePhase + (Math.random() - 0.5) * noise);
}

/**
 * Generate spread from closure quark
 */
export function closureToSpread(c: ClosureQuark, noise: number = 0.05): PhaseSpread {
  const base = c === 'top' ? QUARK_PHASES.top : QUARK_PHASES.bottom;
  const value = base + (Math.random() - 0.5) * noise;
  return {
    σ_t: Math.max(0.01, value),
    σ_s: Math.max(0.01, value),
  };
}

// ============================================
// QUARK COMPATIBILITY
// ============================================

/**
 * Check if two quark states are compatible
 * Compatible = can form stable bound state
 */
export function areQuarksCompatible(a: QuarkState, b: QuarkState): boolean {
  // Different time orientations can bind (like matter-antimatter)
  const timeCompatible = a.time !== b.time;
  
  // Different space orientations can bind
  const spaceCompatible = a.space !== b.space;
  
  // At least one axis must be compatible for binding
  return timeCompatible || spaceCompatible;
}

/**
 * Compute quark "color charge" as a 2D vector
 * Used for color neutrality checks
 */
export function quarkColorCharge(q: QuarkState): { t: number; s: number } {
  return {
    t: q.time === 'up' ? +1 : -1,
    s: q.space === 'charm' ? +1 : -1,
  };
}

/**
 * Check if a set of quarks is color-neutral
 * Color-neutral = charges sum to zero (or cancel)
 */
export function isColorNeutral(quarks: QuarkState[]): boolean {
  let sumT = 0, sumS = 0;
  for (const q of quarks) {
    const charge = quarkColorCharge(q);
    sumT += charge.t;
    sumS += charge.s;
  }
  // Neutral if both sums are close to zero (mod 3 for baryons)
  return (sumT % 3 === 0) && (sumS % 3 === 0);
}

// ============================================
// QUARK STRING REPRESENTATIONS
// ============================================

export function quarkStateToString(q: QuarkState): string {
  const t = q.time === 'up' ? 'u' : 'd';
  const s = q.space === 'charm' ? 'c' : 's';
  const c = q.closure === 'top' ? 't' : 'b';
  return `${t}${s}${c}`;
}

export function stringToQuarkState(s: string): QuarkState | null {
  if (s.length !== 3) return null;
  
  const time: TimeQuark = s[0] === 'u' ? 'up' : s[0] === 'd' ? 'down' : null as any;
  const space: SpaceQuark = s[1] === 'c' ? 'charm' : s[1] === 's' ? 'strange' : null as any;
  const closure: ClosureQuark = s[2] === 't' ? 'top' : s[2] === 'b' ? 'bottom' : null as any;
  
  if (!time || !space || !closure) return null;
  return { time, space, closure };
}
