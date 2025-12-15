/**
 * Hadron structures: Baryons and Mesons
 * Color singlet composites that carry propositions
 */

import {
  QuarkIndex, AntiquarkIndex, Color, Flavor, Spin,
  leviCivita, quarkLabel, antiquarkLabel,
  FLAVOR_SYMBOLS, sameQuarkMode
} from './quark';

// ============================================================
// Hadron Types
// ============================================================

export enum HadronType {
  BARYON = 'BARYON',  // 3 quarks (qqq)
  MESON = 'MESON',    // quark + antiquark (qq̄)
}

// ============================================================
// Baryon Specification (3 quarks forming color singlet)
// ============================================================

export interface BaryonSpec {
  type: HadronType.BARYON;
  q1: QuarkIndex;
  q2: QuarkIndex;
  q3: QuarkIndex;
}

/**
 * Create a baryon from three quarks
 * Automatically assigns colors to form color singlet (r,g,b)
 * Throws if quarks would violate Pauli exclusion
 */
export function createBaryon(
  x1: number, s1: Spin, f1: Flavor,
  x2: number, s2: Spin, f2: Flavor,
  x3: number, s3: Spin, f3: Flavor
): BaryonSpec {
  const q1: QuarkIndex = { x: x1, s: s1, f: f1, c: Color.R };
  const q2: QuarkIndex = { x: x2, s: s2, f: f2, c: Color.G };
  const q3: QuarkIndex = { x: x3, s: s3, f: f3, c: Color.B };
  
  // Check Pauli exclusion: no two quarks in same mode
  if (sameQuarkMode(q1, q2) || sameQuarkMode(q2, q3) || sameQuarkMode(q1, q3)) {
    throw new Error('Pauli exclusion: cannot have two quarks in the same mode');
  }
  
  return { type: HadronType.BARYON, q1, q2, q3 };
}

/**
 * Create baryon with explicit quark indices
 */
export function baryonFromQuarks(q1: QuarkIndex, q2: QuarkIndex, q3: QuarkIndex): BaryonSpec {
  // Validate color singlet (must have all three colors)
  const colors = new Set([q1.c, q2.c, q3.c]);
  if (colors.size !== 3) {
    throw new Error('Baryon must have all three colors for color singlet');
  }
  
  // Validate Pauli exclusion
  if (sameQuarkMode(q1, q2) || sameQuarkMode(q2, q3) || sameQuarkMode(q1, q3)) {
    throw new Error('Pauli exclusion: cannot have two quarks in the same mode');
  }
  
  return { type: HadronType.BARYON, q1, q2, q3 };
}

/** Check if baryon is a valid color singlet */
export function isColorSingletBaryon(b: BaryonSpec): boolean {
  const colors = new Set([b.q1.c, b.q2.c, b.q3.c]);
  return colors.size === 3;
}

/** Get the Levi-Civita sign for the baryon's color configuration */
export function baryonColorSign(b: BaryonSpec): number {
  return leviCivita(b.q1.c, b.q2.c, b.q3.c);
}

/** Get all flavors in a baryon */
export function baryonFlavors(b: BaryonSpec): Flavor[] {
  return [b.q1.f, b.q2.f, b.q3.f];
}

/** Human-readable baryon label */
export function baryonLabel(b: BaryonSpec): string {
  const f1 = FLAVOR_SYMBOLS[b.q1.f];
  const f2 = FLAVOR_SYMBOLS[b.q2.f];
  const f3 = FLAVOR_SYMBOLS[b.q3.f];
  return `B(${f1}${f2}${f3})`;
}

/** Detailed baryon description */
export function baryonDescription(b: BaryonSpec): string {
  return `Baryon[\n  ${quarkLabel(b.q1)}\n  ${quarkLabel(b.q2)}\n  ${quarkLabel(b.q3)}\n]`;
}

// ============================================================
// Meson Specification (quark + antiquark)
// ============================================================

export interface MesonSpec {
  type: HadronType.MESON;
  q: QuarkIndex;      // quark
  qbar: AntiquarkIndex;  // antiquark
}

/**
 * Create a meson from quark and antiquark
 * Automatically ensures color singlet (quark color = antiquark anticolor)
 */
export function createMeson(
  x_q: number, s_q: Spin, f_q: Flavor,
  x_qbar: number, s_qbar: Spin, f_qbar: Flavor,
  color: Color = Color.R
): MesonSpec {
  const q: QuarkIndex = { x: x_q, s: s_q, f: f_q, c: color };
  // Antiquark has same color index (represents anticolor)
  const qbar: AntiquarkIndex = { x: x_qbar, s: s_qbar, f: f_qbar, c: color };
  
  return { type: HadronType.MESON, q, qbar };
}

/**
 * Create meson with explicit indices
 */
export function mesonFromQuarks(q: QuarkIndex, qbar: AntiquarkIndex): MesonSpec {
  // For color singlet: meson is superposition over colors, here we track one
  // In full treatment: |M⟩ = (1/√3) Σ_c |c,c̄⟩
  return { type: HadronType.MESON, q, qbar };
}

/** Check if meson forms color singlet (same color index = color-anticolor pair) */
export function isColorSingletMeson(m: MesonSpec): boolean {
  // In our representation, meson is singlet if q and qbar have matching color index
  return m.q.c === m.qbar.c;
}

/** Get flavors in meson */
export function mesonFlavors(m: MesonSpec): Flavor[] {
  return [m.q.f, m.qbar.f];
}

/** Human-readable meson label */
export function mesonLabel(m: MesonSpec): string {
  const fq = FLAVOR_SYMBOLS[m.q.f];
  const fqbar = FLAVOR_SYMBOLS[m.qbar.f];
  return `M(${fq}${fqbar}̄)`;
}

/** Detailed meson description */
export function mesonDescription(m: MesonSpec): string {
  return `Meson[\n  q: ${quarkLabel(m.q)}\n  q̄: ${antiquarkLabel(m.qbar)}\n]`;
}

// ============================================================
// Union Type for Any Hadron
// ============================================================

export type HadronSpec = BaryonSpec | MesonSpec;

export function isBaryon(h: HadronSpec): h is BaryonSpec {
  return h.type === HadronType.BARYON;
}

export function isMeson(h: HadronSpec): h is MesonSpec {
  return h.type === HadronType.MESON;
}

export function hadronLabel(h: HadronSpec): string {
  return isBaryon(h) ? baryonLabel(h) : mesonLabel(h);
}

export function hadronFlavors(h: HadronSpec): Flavor[] {
  return isBaryon(h) ? baryonFlavors(h) : mesonFlavors(h);
}

export function isColorSinglet(h: HadronSpec): boolean {
  return isBaryon(h) ? isColorSingletBaryon(h) : isColorSingletMeson(h);
}

// ============================================================
// Common Hadron Patterns (named particles)
// ============================================================

/** Proton: uud */
export function proton(x: number = 0): BaryonSpec {
  return createBaryon(
    x, Spin.UP, Flavor.U,
    x, Spin.DOWN, Flavor.U,
    x, Spin.UP, Flavor.D
  );
}

/** Neutron: udd */
export function neutron(x: number = 0): BaryonSpec {
  return createBaryon(
    x, Spin.UP, Flavor.U,
    x, Spin.DOWN, Flavor.D,
    x, Spin.UP, Flavor.D
  );
}

/** Pion+ (π+): ud̄ */
export function pionPlus(x: number = 0): MesonSpec {
  return createMeson(
    x, Spin.UP, Flavor.U,
    x, Spin.DOWN, Flavor.D
  );
}

/** Pion- (π-): dū */
export function pionMinus(x: number = 0): MesonSpec {
  return createMeson(
    x, Spin.UP, Flavor.D,
    x, Spin.DOWN, Flavor.U
  );
}

/** Kaon+ (K+): us̄ */
export function kaonPlus(x: number = 0): MesonSpec {
  return createMeson(
    x, Spin.UP, Flavor.U,
    x, Spin.DOWN, Flavor.S
  );
}

// ============================================================
// Fermionic Operations (occupation tracking)
// ============================================================

/**
 * Occupation state for a set of modes
 * Uses bitstring representation for efficiency
 */
export interface FockOccupation {
  quarkOccupied: Map<string, boolean>;     // mode string -> occupied
  antiquarkOccupied: Map<string, boolean>; // mode string -> occupied
}

function quarkModeKey(q: QuarkIndex): string {
  return `${q.x},${q.s},${q.f},${q.c}`;
}

export function createFockOccupation(): FockOccupation {
  return {
    quarkOccupied: new Map(),
    antiquarkOccupied: new Map(),
  };
}

/** Create quark (returns sign from fermionic ordering) */
export function createQuark(occ: FockOccupation, q: QuarkIndex): number {
  const key = quarkModeKey(q);
  if (occ.quarkOccupied.get(key)) {
    return 0; // Pauli exclusion: mode already occupied
  }
  
  // Count occupied modes before this one for fermionic sign
  let sign = 1;
  for (const [k, occupied] of occ.quarkOccupied) {
    if (occupied && k < key) sign *= -1;
  }
  
  occ.quarkOccupied.set(key, true);
  return sign;
}

/** Annihilate quark (returns sign from fermionic ordering) */
export function annihilateQuark(occ: FockOccupation, q: QuarkIndex): number {
  const key = quarkModeKey(q);
  if (!occ.quarkOccupied.get(key)) {
    return 0; // Mode not occupied
  }
  
  // Count occupied modes before this one for fermionic sign
  let sign = 1;
  for (const [k, occupied] of occ.quarkOccupied) {
    if (occupied && k < key) sign *= -1;
  }
  
  occ.quarkOccupied.set(key, false);
  return sign;
}

/** Create antiquark */
export function createAntiquark(occ: FockOccupation, q: AntiquarkIndex): number {
  const key = quarkModeKey(q);
  if (occ.antiquarkOccupied.get(key)) {
    return 0;
  }
  
  let sign = 1;
  for (const [k, occupied] of occ.antiquarkOccupied) {
    if (occupied && k < key) sign *= -1;
  }
  
  occ.antiquarkOccupied.set(key, true);
  return sign;
}

/** Annihilate antiquark */
export function annihilateAntiquark(occ: FockOccupation, q: AntiquarkIndex): number {
  const key = quarkModeKey(q);
  if (!occ.antiquarkOccupied.get(key)) {
    return 0;
  }
  
  let sign = 1;
  for (const [k, occupied] of occ.antiquarkOccupied) {
    if (occupied && k < key) sign *= -1;
  }
  
  occ.antiquarkOccupied.set(key, false);
  return sign;
}
