/**
 * Quark types: Spin, Flavor, Color
 * Defines the fundamental quantum numbers for QFT structure
 */

// ============================================================
// Spin (2-state: up/down, maps to YES/NO)
// ============================================================

export enum Spin {
  UP = 0,    // |↑⟩ - maps to logical YES
  DOWN = 1,  // |↓⟩ - maps to logical NO
}

export function spinLabel(s: Spin): string {
  return s === Spin.UP ? '↑' : '↓';
}

export function spinToLogical(s: Spin): 'YES' | 'NO' {
  return s === Spin.UP ? 'YES' : 'NO';
}

// ============================================================
// Flavor (6 types in 3 generations)
// ============================================================

export enum Flavor {
  U = 0,  // up      (1st gen, +2/3 charge)
  D = 1,  // down    (1st gen, -1/3 charge)
  C = 2,  // charm   (2nd gen, +2/3 charge)
  S = 3,  // strange (2nd gen, -1/3 charge)
  T = 4,  // top     (3rd gen, +2/3 charge)
  B = 5,  // bottom  (3rd gen, -1/3 charge)
}

export const FLAVOR_NAMES: Record<Flavor, string> = {
  [Flavor.U]: 'up',
  [Flavor.D]: 'down',
  [Flavor.C]: 'charm',
  [Flavor.S]: 'strange',
  [Flavor.T]: 'top',
  [Flavor.B]: 'bottom',
};

export const FLAVOR_SYMBOLS: Record<Flavor, string> = {
  [Flavor.U]: 'u',
  [Flavor.D]: 'd',
  [Flavor.C]: 'c',
  [Flavor.S]: 's',
  [Flavor.T]: 't',
  [Flavor.B]: 'b',
};

/** Weak isospin doublets */
export const FLAVOR_DOUBLETS: [Flavor, Flavor][] = [
  [Flavor.U, Flavor.D],  // 1st generation
  [Flavor.C, Flavor.S],  // 2nd generation
  [Flavor.T, Flavor.B],  // 3rd generation
];

/** Get generation (0, 1, 2) for a flavor */
export function flavorGeneration(f: Flavor): number {
  return Math.floor(f / 2);
}

/** Is this an up-type quark (+2/3 charge)? */
export function isUpType(f: Flavor): boolean {
  return f === Flavor.U || f === Flavor.C || f === Flavor.T;
}

/** Is this a down-type quark (-1/3 charge)? */
export function isDownType(f: Flavor): boolean {
  return f === Flavor.D || f === Flavor.S || f === Flavor.B;
}

/** Get the partner in the same doublet */
export function doubletPartner(f: Flavor): Flavor {
  if (isUpType(f)) return f + 1 as Flavor;
  return f - 1 as Flavor;
}

// ============================================================
// Color (3 types: r, g, b for SU(3))
// ============================================================

export enum Color {
  R = 0,  // red
  G = 1,  // green
  B = 2,  // blue
}

export const COLOR_NAMES: Record<Color, string> = {
  [Color.R]: 'red',
  [Color.G]: 'green',
  [Color.B]: 'blue',
};

export const COLOR_SYMBOLS: Record<Color, string> = {
  [Color.R]: 'r',
  [Color.G]: 'g',
  [Color.B]: 'b',
};

/** All colors for iteration */
export const ALL_COLORS: Color[] = [Color.R, Color.G, Color.B];

// ============================================================
// Quark Index (complete specification of a quark mode)
// ============================================================

export interface QuarkIndex {
  x: number;    // Position mode (0 to Nx-1)
  s: Spin;      // Spin state
  f: Flavor;    // Flavor type
  c: Color;     // Color charge
}

export function quarkIndex(x: number, s: Spin, f: Flavor, c: Color): QuarkIndex {
  return { x, s, f, c };
}

export function quarkLabel(q: QuarkIndex): string {
  return `|${q.x}, ${spinLabel(q.s)}, ${FLAVOR_SYMBOLS[q.f]}, ${COLOR_SYMBOLS[q.c]}⟩`;
}

/** Check if two quark indices are identical (same mode) */
export function sameQuarkMode(a: QuarkIndex, b: QuarkIndex): boolean {
  return a.x === b.x && a.s === b.s && a.f === b.f && a.c === b.c;
}

// ============================================================
// Antiquark Index (same structure, different interpretation)
// ============================================================

export type AntiquarkIndex = QuarkIndex;

export function antiquarkLabel(q: AntiquarkIndex): string {
  return `|${q.x}, ${spinLabel(q.s)}, ${FLAVOR_SYMBOLS[q.f]}̄, ${COLOR_SYMBOLS[q.c]}̄⟩`;
}

// ============================================================
// Levi-Civita Symbol for Color Singlets
// ============================================================

/**
 * Levi-Civita symbol ε_{abc}
 * Returns: +1 for even permutations (rgb, gbr, brg)
 *          -1 for odd permutations (rbg, bgr, grb)
 *           0 if any two indices are equal
 */
export function leviCivita(c1: Color, c2: Color, c3: Color): number {
  if (c1 === c2 || c2 === c3 || c1 === c3) return 0;
  
  // Even permutations of (0,1,2)
  if (c1 === 0 && c2 === 1 && c3 === 2) return 1;  // rgb
  if (c1 === 1 && c2 === 2 && c3 === 0) return 1;  // gbr
  if (c1 === 2 && c2 === 0 && c3 === 1) return 1;  // brg
  
  // Odd permutations
  return -1;  // rbg, bgr, grb
}

// ============================================================
// Flavor Pattern (for gate restrictions)
// ============================================================

export interface FlavorPattern {
  allowed: Set<Flavor>;
  generation?: number;  // If set, restricts to specific generation
  upTypeOnly?: boolean;
  downTypeOnly?: boolean;
}

export function allFlavorsPattern(): FlavorPattern {
  return { allowed: new Set([Flavor.U, Flavor.D, Flavor.C, Flavor.S, Flavor.T, Flavor.B]) };
}

export function generationPattern(gen: number): FlavorPattern {
  const flavors = FLAVOR_DOUBLETS[gen];
  return { allowed: new Set(flavors), generation: gen };
}

export function firstGenPattern(): FlavorPattern {
  return generationPattern(0);
}

export function lightQuarkPattern(): FlavorPattern {
  return { allowed: new Set([Flavor.U, Flavor.D, Flavor.S]) };
}

/** Check if all flavors in a set match the pattern */
export function flavorsMatchPattern(flavors: Flavor[], pattern: FlavorPattern): boolean {
  for (const f of flavors) {
    if (!pattern.allowed.has(f)) return false;
    if (pattern.generation !== undefined && flavorGeneration(f) !== pattern.generation) return false;
    if (pattern.upTypeOnly && !isUpType(f)) return false;
    if (pattern.downTypeOnly && !isDownType(f)) return false;
  }
  return true;
}
